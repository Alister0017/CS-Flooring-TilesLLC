// requestService.js

const RequestService = {

  /* ==========================================================
     GET REQUESTS
  ========================================================== */

  async getPendingRequests() {
    const { data, error } = await db
      .from(TABLES.MEASUREMENT_REQUESTS)
      .select("*")
      .order("created_at", { ascending: false });

    return {
      data: data || [],
      error
    };
  },

  async getRequest(requestId) {
    const { data, error } = await db
      .from(TABLES.MEASUREMENT_REQUESTS)
      .select("*")
      .eq("request_id", requestId)
      .single();

    return {
      data,
      error
    };
  },

  /* ==========================================================
     CREATE
  ========================================================== */

  async createRequest(request) {
    const payload = {
      customer_name: request.customer_name,
      phone: request.phone || null,
      email: request.email || null,
      address: request.address || null,

      flooring_type: Array.isArray(request.flooring_type)
        ? request.flooring_type
        : request.flooring_type
          ? [request.flooring_type]
          : [],

      preferred_measurement_date:
        request.preferred_measurement_date || null,

      description: request.description || null,

      status: request.status || REQUEST.DEFAULT_STATUS
    };

    const { data, error } = await db
      .from(TABLES.MEASUREMENT_REQUESTS)
      .insert([payload])
      .select()
      .single();

    return {
      data,
      error
    };
  },

  /* ==========================================================
     ACCEPT REQUEST
  ========================================================== */

  async acceptRequest(requestId) {
    const { data: request, error: requestError } =
      await this.getRequest(requestId);

    if (requestError || !request) {
      return {
        data: null,
        error: requestError || new Error("Request not found.")
      };
    }

    const { data: existingCustomer, error: searchError } =
      await CustomerService.findExistingCustomer({
        email: request.email,
        phone: request.phone
      });

    if (searchError) {
      return {
        data: null,
        error: searchError
      };
    }

    let customerId = null;

    if (existingCustomer) {
      customerId = existingCustomer.customer_id;

      await CustomerService.updateCustomer(customerId, {
        customer_name: request.customer_name || existingCustomer.customer_name,
        phone: request.phone || existingCustomer.phone,
        email: request.email || existingCustomer.email,
        address: request.address || existingCustomer.address,
        active: CUSTOMER.DEFAULT_ACTIVE
      });
    } else {
      const { data: newCustomer, error: customerError } =
        await CustomerService.createCustomer({
          customer_name: request.customer_name,
          phone: request.phone,
          email: request.email,
          address: request.address
        });

      if (customerError) {
        return {
          data: null,
          error: customerError
        };
      }

      customerId = newCustomer.customer_id;
    }

    const { data: newJob, error: jobError } =
      await JobService.createJob({
        customer_id: customerId,

        flooring_type: Array.isArray(request.flooring_type)
          ? request.flooring_type
          : request.flooring_type
            ? [request.flooring_type]
            : [],

        description: request.description,

        measurement_date:
          request.preferred_measurement_date || null,

        status: JOB_STATUS.MEASUREMENT_SCHEDULED
      });

    if (jobError) {
      return {
        data: null,
        error: jobError
      };
    }

    const { error: deleteError } = await this.deleteRequest(requestId);

    if (deleteError) {
      return {
        data: newJob,
        error: deleteError
      };
    }

    return {
      data: newJob,
      error: null
    };
  },

  /* ==========================================================
     DECLINE / DELETE
  ========================================================== */

  async declineRequest(requestId) {
    return await this.deleteRequest(requestId);
  },

  async deleteRequest(requestId) {
    const { error } = await db
      .from(TABLES.MEASUREMENT_REQUESTS)
      .delete()
      .eq("request_id", requestId);

    return {
      error
    };
  },

  /* ==========================================================
     COUNTS
  ========================================================== */

  async getPendingRequestCount() {
    const { count, error } = await db
      .from(TABLES.MEASUREMENT_REQUESTS)
      .select("*", {
        count: "exact",
        head: true
      });

    return {
      count: count || 0,
      error
    };
  }

};