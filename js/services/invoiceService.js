// invoiceService.js

const InvoiceService = {

  /* ==========================================================
     GET INVOICES
  ========================================================== */

  async getInvoices() {
    const { data, error } = await db
      .from(TABLES.INVOICES)
      .select(`
        *,
        jobs!invoices_job_number_fkey (
          job_number,
          status,
          customers (
            customer_id,
            customer_name,
            phone,
            email,
            address
          )
        ),
        estimates (
          estimate_id,
          total,
          deposit,
          balance_due,
          status
        ),
        agreements (
          agreement_id,
          total,
          deposit,
          balance_due,
          status
        )
      `)
      .order("created_at", { ascending: false });

    return {
      data: data || [],
      error
    };
  },

  async getInvoice(invoiceId) {
    const { data, error } = await db
      .from(TABLES.INVOICES)
      .select(`
        *,
        invoice_items (*),
        invoice_payments (*),
        jobs!invoices_job_number_fkey (
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
        ),
        estimates (*),
        agreements (*)
      `)
      .eq("invoice_id", invoiceId)
      .single();

    return {
      data,
      error
    };
  },

  async getInvoiceByJob(jobNumber) {
    const { data, error } = await db
      .from(TABLES.INVOICES)
      .select(`
        *,
        invoice_items (*),
        invoice_payments (*)
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

  async createInvoice(invoice) {
    const items = invoice.items || [];

    const totals = this.calculateTotals(items, {
      tax_amount: invoice.tax_amount || 0,
      discount: invoice.discount || 0,
      amount_paid: invoice.amount_paid || 0
    });

    const payload = {
      job_number: invoice.job_number,
      customer_id: invoice.customer_id || null,
      estimate_id: invoice.estimate_id || null,
      agreement_id: invoice.agreement_id || null,
      subtotal: totals.subtotal,
      tax_amount: Number(invoice.tax_amount) || 0,
      discount: Number(invoice.discount) || 0,
      total: totals.total,
      amount_paid: Number(invoice.amount_paid) || 0,
      balance_due: totals.balanceDue,
      status: invoice.status || INVOICE.DEFAULT_STATUS,
      due_date: invoice.due_date || null,
      notes: invoice.notes || null
    };

    const { data, error } = await db
      .from(TABLES.INVOICES)
      .insert([payload])
      .select()
      .single();

    if (error) {
      return {
        data: null,
        error
      };
    }

    if (items.length > 0) {
      const { error: itemError } = await this.replaceInvoiceItems(
        data.invoice_id,
        items
      );

      if (itemError) {
        return {
          data,
          error: itemError
        };
      }
    }

    const { error: jobUpdateError } = await JobService.linkInvoice(
      invoice.job_number,
      data.invoice_id
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

  async createInvoiceFromEstimate(estimateId) {
    const { data: estimate, error: estimateError } =
      await EstimateService.getEstimate(estimateId);

    if (estimateError || !estimate) {
      return {
        data: null,
        error: estimateError || new Error("Estimate not found.")
      };
    }

    const job = estimate.jobs || {};
    const customer = job.customers || {};

    const items = (estimate.estimate_items || []).map(item => ({
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price,
      sort_order: item.sort_order || 0
    }));

    return await this.createInvoice({
      job_number: estimate.job_number,
      customer_id: customer.customer_id || estimate.customer_id || null,
      estimate_id: estimate.estimate_id,
      agreement_id: job.agreement_id || null,
      items,
      tax_amount: estimate.tax_amount || 0,
      discount: estimate.discount || 0,
      amount_paid: estimate.deposit || 0,
      due_date: null,
      notes: estimate.notes || null,
      status: INVOICE.DEFAULT_STATUS
    });
  },

  /* ==========================================================
     UPDATE
  ========================================================== */

  async updateInvoice(invoiceId, updates) {
    const items = updates.items || [];

    const totals = this.calculateTotals(items, {
      tax_amount: updates.tax_amount || 0,
      discount: updates.discount || 0,
      amount_paid: updates.amount_paid || 0
    });

    const { data, error } = await db
      .from(TABLES.INVOICES)
      .update({
        subtotal: totals.subtotal,
        tax_amount: Number(updates.tax_amount) || 0,
        discount: Number(updates.discount) || 0,
        total: totals.total,
        amount_paid: Number(updates.amount_paid) || 0,
        balance_due: totals.balanceDue,
        status: updates.status || INVOICE.DEFAULT_STATUS,
        due_date: updates.due_date || null,
        notes: updates.notes || null,
        updated_at: new Date().toISOString()
      })
      .eq("invoice_id", invoiceId)
      .select()
      .single();

    if (error) {
      return {
        data: null,
        error
      };
    }

    if (updates.items) {
      const { error: itemError } = await this.replaceInvoiceItems(
        invoiceId,
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

  async updateInvoiceStatus(invoiceId, status) {
    const { data, error } = await db
      .from(TABLES.INVOICES)
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq("invoice_id", invoiceId)
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

  async replaceInvoiceItems(invoiceId, items) {
    const { error: deleteError } = await db
      .from(TABLES.INVOICE_ITEMS)
      .delete()
      .eq("invoice_id", invoiceId);

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
        invoice_id: invoiceId,
        description: item.description,
        quantity,
        unit: item.unit || "each",
        unit_price: unitPrice,
        line_total: quantity * unitPrice,
        sort_order: item.sort_order ?? index
      };
    });

    const { error } = await db
      .from(TABLES.INVOICE_ITEMS)
      .insert(rows);

    return {
      error
    };
  },

  /* ==========================================================
     PAYMENTS
  ========================================================== */

  async addPayment(invoiceId, payment) {
    const { data, error } = await db
      .from(TABLES.INVOICE_PAYMENTS)
      .insert([{
        invoice_id: invoiceId,
        amount: Number(payment.amount) || 0,
        payment_method: payment.payment_method || null,
        payment_date: payment.payment_date || new Date().toISOString().split("T")[0],
        notes: payment.notes || null
      }])
      .select()
      .single();

    if (error) {
      return {
        data: null,
        error
      };
    }

    const { data: invoice } = await this.getInvoice(invoiceId);

    if (invoice) {
      const totalPaid = (invoice.invoice_payments || []).reduce((sum, item) => {
        return sum + (Number(item.amount) || 0);
      }, 0);

      const amountPaid = totalPaid + Number(payment.amount || 0);
      const balanceDue = Math.max((Number(invoice.total) || 0) - amountPaid, 0);

      await this.updateInvoiceStatus(
        invoiceId,
        balanceDue <= 0 ? "Paid" : INVOICE.DEFAULT_STATUS
      );

      await db
        .from(TABLES.INVOICES)
        .update({
          amount_paid: amountPaid,
          balance_due: balanceDue,
          updated_at: new Date().toISOString()
        })
        .eq("invoice_id", invoiceId);
    }

    return {
      data,
      error: null
    };
  },

  /* ==========================================================
     DELETE
  ========================================================== */

  async deleteInvoice(invoiceId, jobNumber = null) {
    const { error } = await db
      .from(TABLES.INVOICES)
      .delete()
      .eq("invoice_id", invoiceId);

    if (error) {
      return {
        error
      };
    }

    if (jobNumber) {
      await JobService.updateJob(jobNumber, {
        invoice_id: null
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

    const taxAmount = Number(options.tax_amount) || 0;
    const discount = Number(options.discount) || 0;
    const amountPaid = Number(options.amount_paid) || 0;

    const total = Math.max(subtotal + taxAmount - discount, 0);
    const balanceDue = Math.max(total - amountPaid, 0);

    return {
      subtotal,
      total,
      balanceDue
    };
  }

};