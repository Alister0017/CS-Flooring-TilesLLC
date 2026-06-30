// estimateService.js

const EstimateService = {
  /* ==========================================================
     GET ESTIMATES
  ========================================================== */

  async getEstimates() {
    const { data, error } = await db
      .from("estimates")
      .select(`
        *,
        jobs (
          job_number,
          status,
          customers (
            customer_id,
            customer_name,
            phone,
            email,
            address
          )
        )
      `)
      .order("created_at", { ascending: false });

    return { data: data || [], error };
  },

  async getEstimate(estimateId) {
    const { data, error } = await db
      .from("estimates")
      .select(`
        *,
        estimate_items (*),
        jobs (
          job_number,
          status,
          description,
          flooring_type,
          customers (
            customer_id,
            customer_name,
            phone,
            email,
            address
          )
        )
      `)
      .eq("estimate_id", estimateId)
      .single();

    return { data, error };
  },

  async getEstimateByJob(jobNumber) {
    const { data, error } = await db
      .from("estimates")
      .select(`
        *,
        estimate_items (*)
      `)
      .eq("job_number", jobNumber)
      .maybeSingle();

    return { data, error };
  },

  /* ==========================================================
     CREATE / UPDATE
  ========================================================== */

  async createEstimate(estimate) {
    const totals = this.calculateTotals(estimate.items || [], {
      tax_rate: estimate.tax_rate || 0,
      discount: estimate.discount || 0,
      deposit: estimate.deposit || 0
    });

    const { data, error } = await db
      .from("estimates")
      .insert([{
        job_number: estimate.job_number,
        customer_id: estimate.customer_id || null,
        subtotal: totals.subtotal,
        tax_rate: estimate.tax_rate || 0,
        tax_amount: totals.taxAmount,
        discount: estimate.discount || 0,
        deposit: estimate.deposit || 0,
        total: totals.total,
        balance_due: totals.balanceDue,
        notes: estimate.notes || null,
        status: estimate.status || "Draft"
      }])
      .select()
      .single();

    if (error) return { data: null, error };

    const estimateId = data.estimate_id;

    if (estimate.items && estimate.items.length > 0) {
      const { error: itemError } = await this.replaceEstimateItems(
        estimateId,
        estimate.items
      );

      if (itemError) return { data, error: itemError };
    }

    await JobService.updateJob(estimate.job_number, {
      estimate_id: estimateId,
      status: "Estimate Sent"
    });

    return { data, error: null };
  },

  async updateEstimate(estimateId, updates) {
    const totals = this.calculateTotals(updates.items || [], {
      tax_rate: updates.tax_rate || 0,
      discount: updates.discount || 0,
      deposit: updates.deposit || 0
    });

    const { data, error } = await db
      .from("estimates")
      .update({
        subtotal: totals.subtotal,
        tax_rate: updates.tax_rate || 0,
        tax_amount: totals.taxAmount,
        discount: updates.discount || 0,
        deposit: updates.deposit || 0,
        total: totals.total,
        balance_due: totals.balanceDue,
        notes: updates.notes || null,
        status: updates.status || "Draft"
      })
      .eq("estimate_id", estimateId)
      .select()
      .single();

    if (error) return { data: null, error };

    if (updates.items) {
      const { error: itemError } = await this.replaceEstimateItems(
        estimateId,
        updates.items
      );

      if (itemError) return { data, error: itemError };
    }

    return { data, error: null };
  },

  /* ==========================================================
     ITEMS
  ========================================================== */

  async replaceEstimateItems(estimateId, items) {
    const { error: deleteError } = await db
      .from("estimate_items")
      .delete()
      .eq("estimate_id", estimateId);

    if (deleteError) return { error: deleteError };

    if (!items || items.length === 0) {
      return { error: null };
    }

    const rows = items.map(item => ({
      estimate_id: estimateId,
      item_type: item.item_type || "Line Item",
      description: item.description,
      quantity: Number(item.quantity) || 0,
      unit: item.unit || "each",
      unit_price: Number(item.unit_price) || 0,
      line_total:
        (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
    }));

    const { error } = await db
      .from("estimate_items")
      .insert(rows);

    return { error };
  },

  /* ==========================================================
     DELETE
  ========================================================== */

  async deleteEstimate(estimateId, jobNumber = null) {
    const { error } = await db
      .from("estimates")
      .delete()
      .eq("estimate_id", estimateId);

    if (error) return { error };

    if (jobNumber) {
      await JobService.updateJob(jobNumber, {
        estimate_id: null
      });
    }

    return { error: null };
  },

  /* ==========================================================
     CALCULATIONS
  ========================================================== */

  calculateTotals(items = [], options = {}) {
    const subtotal = items.reduce((sum, item) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unit_price) || 0;
      return sum + quantity * unitPrice;
    }, 0);

    const taxRate = Number(options.tax_rate) || 0;
    const discount = Number(options.discount) || 0;
    const deposit = Number(options.deposit) || 0;

    const taxAmount = subtotal * (taxRate / 100);
    const total = Math.max(subtotal + taxAmount - discount, 0);
    const balanceDue = Math.max(total - deposit, 0);

    return {
      subtotal,
      taxAmount,
      total,
      balanceDue
    };
  }
};