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
        customers (
          customer_id,
          customer_name,
          phone,
          email,
          address
        ),
        jobs!invoices_job_number_fkey (
          job_number,
          customer_id,
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
        estimates (
          estimate_id,
          job_number,
          total,
          deposit,
          balance_due,
          status
        ),
        agreements (
          agreement_id,
          job_number,
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
        customers (
          customer_id,
          customer_name,
          phone,
          email,
          address
        ),
        invoice_items (*),
        invoice_payments (*),
        jobs!invoices_job_number_fkey (
          job_number,
          customer_id,
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
      subtotal: invoice.subtotal !== undefined ? Number(invoice.subtotal) || 0 : totals.subtotal,
      tax_amount: Number(invoice.tax_amount) || 0,
      discount: Number(invoice.discount) || 0,
      total: invoice.total !== undefined ? Number(invoice.total) || 0 : totals.total,
      amount_paid: Number(invoice.amount_paid) || 0,
      balance_due: invoice.balance_due !== undefined ? Number(invoice.balance_due) || 0 : totals.balanceDue,
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

    if (invoice.job_number && data?.invoice_id) {
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
    }

    return {
      data,
      error: null
    };
  },

  async createInvoiceWithItems(invoiceData, items = []) {
    const payload = {
      ...invoiceData,
      items
    };

    return await this.createInvoice(payload);
  },
    /* ==========================================================
     UPDATE
  ========================================================== */

  async updateInvoice(invoiceId, updates) {

    const payload = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await db
      .from(TABLES.INVOICES)
      .update(payload)
      .eq("invoice_id", invoiceId)
      .select()
      .single();

    return {
      data,
      error
    };

  },

  async updateInvoiceStatus(invoiceId, status) {

    return await this.updateInvoice(invoiceId, {
      status
    });

  },

  /* ==========================================================
     INVOICE ITEMS
  ========================================================== */

  async replaceInvoiceItems(invoiceId, items = []) {

    await db
      .from(TABLES.INVOICE_ITEMS)
      .delete()
      .eq("invoice_id", invoiceId);

    if (!items.length) {
      return { data: [], error: null };
    }

    const payload = items.map((item, index) => ({
      invoice_id: invoiceId,
      description: item.description || "",
      quantity: Number(item.quantity || 0),
      unit: item.unit || "each",
      unit_price: Number(item.unit_price || 0),
      line_total:
        item.line_total ??
        Number(item.quantity || 0) *
        Number(item.unit_price || 0),
      sort_order: index
    }));

    const { data, error } = await db
      .from(TABLES.INVOICE_ITEMS)
      .insert(payload)
      .select();

    return {
      data,
      error
    };

  },

  /* ==========================================================
     PAYMENTS
  ========================================================== */

  async addPayment(invoiceId, payment) {

    const { data: invoice, error: invoiceError } =
      await this.getInvoice(invoiceId);

    if (invoiceError) {
      return {
        data: null,
        error: invoiceError
      };
    }

    const paymentAmount =
      Number(payment.amount || 0);

    const newAmountPaid =
      Number(invoice.amount_paid || 0) +
      paymentAmount;

    const balanceDue =
      Math.max(
        Number(invoice.total || 0) - newAmountPaid,
        0
      );

    const newStatus =
      balanceDue <= 0
        ? INVOICE.STATUS_PAID
        : INVOICE.STATUS_PARTIALLY_PAID;

    const { data, error } = await db
      .from(TABLES.INVOICE_PAYMENTS)
      .insert([{
        invoice_id: invoiceId,
        amount: paymentAmount,
        payment_method: payment.payment_method || null,
        payment_date:
          payment.payment_date ||
          new Date().toISOString(),
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

    await this.updateInvoice(invoiceId, {
      amount_paid: newAmountPaid,
      balance_due: balanceDue,
      status: newStatus
    });

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
      return { error };
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
     TOTALS
  ========================================================== */

  calculateTotals(items = [], options = {}) {

    const subtotal = items.reduce(
      (sum, item) =>
        sum +
        (
          Number(item.quantity || 0) *
          Number(item.unit_price || 0)
        ),
      0
    );

    const tax =
      Number(options.tax_amount || 0);

    const discount =
      Number(options.discount || 0);

    const paid =
      Number(options.amount_paid || 0);

    const total =
      subtotal + tax - discount;

    const balanceDue =
      Math.max(total - paid, 0);

    return {
      subtotal,
      total,
      balanceDue
    };

  }

};