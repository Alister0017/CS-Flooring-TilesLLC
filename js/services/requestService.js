// requestService.js

const RequestService = {

  /* ==========================================================
     GET REQUESTS
  ========================================================== */

  async getPendingRequests() {

    const { data, error } = await db
      .from("measurement_requests")
      .select("*")
      .order("created_at", { ascending: false });

    return {
      data: data || [],
      error
    };

  },

  async getRequest(requestId) {

    const { data, error } = await db
      .from("measurement_requests")
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

    const { data, error } = await db
      .from("measurement_requests")
      .insert([request])
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

    // Get request
    const { data: request, error: requestError } =
      await this.getRequest(requestId);

    if (requestError || !request) {
      return {
        error: requestError || new Error("Request not found.")
      };
    }

    /* ------------------------------------------
       Find existing customer
    ------------------------------------------ */

    const { data: existingCustomer } =
      await CustomerService.findExistingCustomer({

        email: request.email,
        phone: request.phone

      });

    let customerId;

    /* ------------------------------------------
       Existing customer
    ------------------------------------------ */

    if (existingCustomer) {

      customerId = existingCustomer.customer_id;

    }

    /* ------------------------------------------
       Create customer
    ------------------------------------------ */

    else {

      const { data: newCustomer, error: customerError } =
        await CustomerService.createCustomer({

          customer_name: request.customer_name,
          phone: request.phone,
          email: request.email,
          address: request.address

        });

      if (customerError) {

        return {
          error: customerError
        };

      }

      customerId = newCustomer.customer_id;

    }

    /* ------------------------------------------
       Create Job
    ------------------------------------------ */

    const { data: newJob, error: jobError } =
      await JobService.createJob({

        customer_id: customerId,

        flooring_type: Array.isArray(request.flooring_type)
          ? request.flooring_type
          : [request.flooring_type],

        description: request.description,

        measurement_date:
          request.preferred_measurement_date || null,

        status: "Measurement Scheduled"

      });

    if (jobError) {

      return {
        error: jobError
      };

    }

    /* ------------------------------------------
       Delete Request
    ------------------------------------------ */

    const { error: deleteError } = await db
      .from("measurement_requests")
      .delete()
      .eq("request_id", requestId);

    if (deleteError) {

      return {
        error: deleteError
      };

    }

    return {
      data: newJob,
      error: null
    };

  },

  /* ==========================================================
     DECLINE REQUEST
  ========================================================== */

  async declineRequest(requestId) {

    const { error } = await db
      .from("measurement_requests")
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
      .from("measurement_requests")
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