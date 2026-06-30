// jobService.js

const JobService = {

  /* ==========================================================
     GET JOBS
  ========================================================== */

  async getJobs() {
    const { data, error } = await db
      .from("jobs")
      .select(`
        *,
        customers (
          customer_id,
          customer_name,
          phone,
          email,
          address
        )
      `)
      .order("created_at", { ascending: false });

    return {
      data: data || [],
      error
    };
  },

  async getJob(jobNumber) {
    const { data, error } = await db
      .from("jobs")
      .select(`
        *,
        customers (
          customer_id,
          customer_name,
          phone,
          email,
          address
        )
      `)
      .eq("job_number", jobNumber)
      .single();

    return {
      data,
      error
    };
  },

  async getJobsByCustomer(customerId) {
    const { data, error } = await db
      .from("jobs")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    return {
      data: data || [],
      error
    };
  },

  /* ==========================================================
     CREATE
  ========================================================== */

  async createJob(job) {

    const jobNumber =
      job.job_number ||
      (typeof generateSupabaseJobNumber === "function"
        ? await generateSupabaseJobNumber()
        : `CS-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`);

    const payload = {
      job_number: jobNumber,
      customer_id: job.customer_id,
      flooring_type: job.flooring_type || [],
      description: job.description || null,
      measurement_date: job.measurement_date || null,
      install_start_date: job.install_start_date || null,
      install_end_date: job.install_end_date || null,
      install_price: job.install_price || null,
      status: job.status || "Measurement Scheduled",
      estimate_id: job.estimate_id || null,
      agreement_id: job.agreement_id || null,
      notes: job.notes || null
    };

    const { data, error } = await db
      .from("jobs")
      .insert([payload])
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

  async updateJob(jobNumber, updates) {

    const { data, error } = await db
      .from("jobs")
      .update(updates)
      .eq("job_number", jobNumber)
      .select()
      .single();

    return {
      data,
      error
    };
  },

  async updateStatus(jobNumber, status) {

    return await this.updateJob(jobNumber, {
      status
    });

  },

  async saveNotes(jobNumber, notes) {

    return await this.updateJob(jobNumber, {
      notes
    });

  },

  /* ==========================================================
     DELETE
  ========================================================== */

  async deleteJob(jobNumber) {

    const { error } = await db
      .from("jobs")
      .delete()
      .eq("job_number", jobNumber);

    return { error };

  },

  /* ==========================================================
     DASHBOARD
  ========================================================== */

  async getUpcomingMeasurements(limit = 5) {

    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await db
      .from("jobs")
      .select(`
        job_number,
        measurement_date,
        status,
        flooring_type,
        customers (
          customer_name,
          address
        )
      `)
      .gte("measurement_date", today)
      .neq("status", "Completed")
      .order("measurement_date", {
        ascending: true
      })
      .limit(limit);

    return {
      data: data || [],
      error
    };

  },

  async getUpcomingInstallations(limit = 5) {

    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await db
      .from("jobs")
      .select(`
        job_number,
        install_start_date,
        status,
        flooring_type,
        customers (
          customer_name,
          address
        )
      `)
      .gte("install_start_date", today)
      .not("status", "in", '("Completed","Closed","Cancelled")')
      .order("install_start_date", {
        ascending: true
      })
      .limit(limit);

    return {
      data: data || [],
      error
    };

  },

  /* ==========================================================
     COUNTS
  ========================================================== */

  async getActiveJobCount() {

    const { count, error } = await db
      .from("jobs")
      .select("*", {
        count: "exact",
        head: true
      })
      .not("status", "in", '("Completed","Closed","Cancelled")');

    return {
      count: count || 0,
      error
    };

  },

  async getCompletedJobCount() {

    const { count, error } = await db
      .from("jobs")
      .select("*", {
        count: "exact",
        head: true
      })
      .in("status", [
        "Completed",
        "Closed"
      ]);

    return {
      count: count || 0,
      error
    };

  },

  /* ==========================================================
     TIMELINE
  ========================================================== */

  async getRecentJobs(limit = 10) {

    const { data, error } = await db
      .from("jobs")
      .select(`
        job_number,
        status,
        created_at,
        customers (
          customer_name
        )
      `)
      .order("created_at", {
        ascending: false
      })
      .limit(limit);

    return {
      data: data || [],
      error
    };

  }

};