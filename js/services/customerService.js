// customerService.js

const CustomerService = {
  async getActiveCustomers() {
    const { data, error } = await db
      .from("customers")
      .select("*")
      .eq("active", true)
      .order("customer_name", { ascending: true });

    return { data: data || [], error };
  },

  async getCustomerById(customerId) {
    const { data, error } = await db
      .from("customers")
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
          agreement_id
        )
      `)
      .eq("customer_id", customerId)
      .single();

    return { data, error };
  },

  async createCustomer(customer) {
    const { data, error } = await db
      .from("customers")
      .insert([{
        customer_name: customer.customer_name,
        phone: customer.phone || null,
        email: customer.email || null,
        address: customer.address || null,
        active: true
      }])
      .select()
      .single();

    return { data, error };
  },

  async updateCustomer(customerId, updates) {
    const { data, error } = await db
      .from("customers")
      .update(updates)
      .eq("customer_id", customerId)
      .select()
      .single();

    return { data, error };
  },

  async findExistingCustomer({ email, phone }) {
    const cleanEmail = email ? email.trim().toLowerCase() : "";
    const cleanPhone = phone ? phone.replace(/\D/g, "") : "";

    if (!cleanEmail && !cleanPhone) {
      return { data: null, error: null };
    }

    const { data, error } = await db
      .from("customers")
      .select("*");

    if (error) return { data: null, error };

    const existingCustomer = (data || []).find(customer => {
      const customerEmail = customer.email
        ? customer.email.trim().toLowerCase()
        : "";

      const customerPhone = customer.phone
        ? customer.phone.replace(/\D/g, "")
        : "";

      return (
        (cleanEmail && customerEmail === cleanEmail) ||
        (cleanPhone && customerPhone === cleanPhone)
      );
    });

    return { data: existingCustomer || null, error: null };
  }
};