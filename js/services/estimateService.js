// estimateService.js

const EstimateService = {

  /* ==========================================================
     GET ESTIMATES
  ========================================================== */

  async getEstimates() {
    const { data, error } = await db
      .from(TABLES.ESTIMATES)
      .select(`
        *,
       jobs!estimates_job_number_fkey (
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

    return {
      data: data || [],
      error
    };
  },

  async getEstimate(estimateId) {
    const { data, error } = await db
      .from(TABLES.ESTIMATES)
      .select(`
        *,
        estimate_items (*),
        jobs!estimates_job_number_fkey (
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

    return {
      data,
      error
    };
  },

  async getEstimateByJob(jobNumber) {
    const { data, error } = await db
      .from(TABLES.ESTIMATES)
      .select(`
        *,
        estimate_items (*)
      `)
      .eq("job_number", jobNumber)
      .maybeSingle();

    return {
      data,
      error
    };
  },

  /* ==========================================================
     CREATE
  ========================================================== */

  async createEstimate(estimate) {
    const items = estimate.items || [];

    const totals = this.calculateTotals(items, {
      tax_rate: estimate.tax_rate ?? ESTIMATE.DEFAULT_TAX_RATE,
      discount: estimate.discount || 0,
      deposit: estimate.deposit || 0
    });

    const { data, error } = await db
      .from(TABLES.ESTIMATES)
      .insert([{
        job_number: estimate.job_number,
        customer_id: estimate.customer_id || null,
        subtotal: totals.subtotal,
        tax_rate: estimate.tax_rate ?? ESTIMATE.DEFAULT_TAX_RATE,
        tax_amount: totals.taxAmount,
        discount: estimate.discount || 0,
        deposit: estimate.deposit || 0,
        total: totals.total,
        balance_due: totals.balanceDue,
        notes: estimate.notes || null,
        status: estimate.status || ESTIMATE.DEFAULT_STATUS
      }])
      .select()
      .single();

    if (error) {
      return {
        data: null,
        error
      };
    }

    const estimateId = data.estimate_id;

    if (items.length > 0) {
      const { error: itemError } = await this.replaceEstimateItems(
        estimateId,
        items
      );

      if (itemError) {
        return {
          data,
          error: itemError
        };
      }
    }

    const { error: jobUpdateError } = await JobService.linkEstimate(
      estimate.job_number,
      estimateId
    );

    if (jobUpdateError) {
      return {
        data,
        error: jobUpdateError
      };
    }

    return {
      data,
      error: null
    };
  },

  /* ==========================================================
     UPDATE
  ========================================================== */

  async updateEstimate(estimateId, updates) {
    const items = updates.items || [];

    const totals = this.calculateTotals(items, {
      tax_rate: updates.tax_rate ?? ESTIMATE.DEFAULT_TAX_RATE,
      discount: updates.discount || 0,
      deposit: updates.deposit || 0
    });

    const { data, error } = await db
      .from(TABLES.ESTIMATES)
      .update({
        subtotal: totals.subtotal,
        tax_rate: updates.tax_rate ?? ESTIMATE.DEFAULT_TAX_RATE,
        tax_amount: totals.taxAmount,
        discount: updates.discount || 0,
        deposit: updates.deposit || 0,
        total: totals.total,
        balance_due: totals.balanceDue,
        notes: updates.notes || null,
        status: updates.status || ESTIMATE.DEFAULT_STATUS,
        updated_at: new Date().toISOString()
      })
      .eq("estimate_id", estimateId)
      .select()
      .single();

    if (error) {
      return {
        data: null,
        error
      };
    }

    if (updates.items) {
      const { error: itemError } = await this.replaceEstimateItems(
        estimateId,
        updates.items
      );

      if (itemError) {
        return {
          data,
          error: itemError
        };
      }
    }

    return {
      data,
      error: null
    };
  },

  async updateEstimateStatus(estimateId, status) {
    const { data, error } = await db
      .from(TABLES.ESTIMATES)
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq("estimate_id", estimateId)
      .select()
      .single();

    return {
      data,
      error
    };
  },

  /* ==========================================================
     ITEMS
  ========================================================== */

  async replaceEstimateItems(estimateId, items) {
    const { error: deleteError } = await db
      .from(TABLES.ESTIMATE_ITEMS)
      .delete()
      .eq("estimate_id", estimateId);

    if (deleteError) {
      return {
        error: deleteError
      };
    }

    if (!items || items.length === 0) {
      return {
        error: null
      };
    }

    const rows = items.map((item, index) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unit_price) || 0;

      return {
        estimate_id: estimateId,
        room_name: item.room_name || null,
        item_type: item.item_type || "Line Item",
        description: item.description,
        quantity,
        unit: item.unit || "each",
        unit_price: unitPrice,
        line_total: quantity * unitPrice,
        sort_order: item.sort_order ?? index
      };
    });

    const { error } = await db
      .from(TABLES.ESTIMATE_ITEMS)
      .insert(rows);

    return {
      error
    };
  },

  /* ==========================================================
     DELETE
  ========================================================== */

  async deleteEstimate(estimateId, jobNumber = null) {
    const { error } = await db
      .from(TABLES.ESTIMATES)
      .delete()
      .eq("estimate_id", estimateId);

    if (error) {
      return {
        error
      };
    }

    if (jobNumber) {
      await JobService.updateJob(jobNumber, {
        estimate_id: null
      });
    }

    return {
      error: null
    };
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