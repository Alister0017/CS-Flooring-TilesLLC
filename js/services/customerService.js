// customerService.js

const CustomerService = {

  /* ==========================================================
     GET CUSTOMERS
  ========================================================== */

  async getActiveCustomers() {
    const { data, error } = await db
      .from(TABLES.CUSTOMERS)
      .select("*")
      .eq("active", CUSTOMER.DEFAULT_ACTIVE)
      .order("customer_name", { ascending: true });

    return {
      data: data || [],
      error
    };
  },

  async getCustomerById(customerId) {
    const { data, error } = await db
      .from(TABLES.CUSTOMERS)
      .select(`
        *,
        jobs (
          job_number,
          flooring_type,
          description,
          measurement_date,
          install_start_date,
          install_end_date,
          install_price,
          status,
          created_at,
          estimate_id,
          agreement_id,
          invoice_id,
          notes
        )
      `)
      .eq("customer_id", customerId)
      .single();

    return {
      data,
      error
    };
  },

  /* ==========================================================
     CREATE
  ========================================================== */

  async createCustomer(customer) {
    const { data, error } = await db
      .from(TABLES.CUSTOMERS)
      .insert([{
        customer_name: customer.customer_name,
        phone: customer.phone || null,
        email: customer.email || null,
        address: customer.address || null,
        notes: customer.notes || null,
        active: CUSTOMER.DEFAULT_ACTIVE
      }])
      .select()
      .single();

    return {
      data,
      error
    };
  },

  /* ==========================================================
     UPDATE
  ========================================================== */

  async updateCustomer(customerId, updates) {
    const { data, error } = await db
      .from(TABLES.CUSTOMERS)
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq("customer_id", customerId)
      .select()
      .single();

    return {
      data,
      error
    };
  },

  async archiveCustomer(customerId) {
    return await this.updateCustomer(customerId, {
      active: false
    });
  },

  async restoreCustomer(customerId) {
    return await this.updateCustomer(customerId, {
      active: true
    });
  },

  /* ==========================================================
     FIND / MATCH
  ========================================================== */

  async findExistingCustomer({ email, phone }) {
    const cleanEmail = this.normalizeEmail(email);
    const cleanPhone = this.normalizePhone(phone);

    if (!cleanEmail && !cleanPhone) {
      return {
        data: null,
        error: null
      };
    }

    const { data, error } = await db
      .from(TABLES.CUSTOMERS)
      .select("*");

    if (error) {
      return {
        data: null,
        error
      };
    }

    const existingCustomer = (data || []).find(customer => {
      const customerEmail = this.normalizeEmail(customer.email);
      const customerPhone = this.normalizePhone(customer.phone);

      return (
        (cleanEmail && customerEmail === cleanEmail) ||
        (cleanPhone && customerPhone === cleanPhone)
      );
    });

    return {
      data: existingCustomer || null,
      error: null
    };
  },

  /* ==========================================================
     COUNTS
  ========================================================== */

  async getActiveCustomerCount() {
    const { count, error } = await db
      .from(TABLES.CUSTOMERS)
      .select("*", {
        count: "exact",
        head: true
      })
      .eq("active", CUSTOMER.DEFAULT_ACTIVE);

    return {
      count: count || 0,
      error
    };
  },

  /* ==========================================================
     HELPERS
  ========================================================== */

  normalizeEmail(email) {
    return email
      ? email.trim().toLowerCase()
      : "";
  },

  normalizePhone(phone) {
    return phone
      ? phone.replace(/\D/g, "")
      : "";
  }

};