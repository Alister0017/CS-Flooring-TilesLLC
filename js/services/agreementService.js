// agreementService.js

const AgreementService = {

  /* ==========================================================
     GET AGREEMENTS
  ========================================================== */

  async getAgreements() {
    const { data, error } = await db
      .from(TABLES.AGREEMENTS)
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
        ),
        estimates (
          estimate_id,
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

  async getAgreement(agreementId) {
    const { data, error } = await db
      .from(TABLES.AGREEMENTS)
      .select(`
        *,
        agreement_signatures (*),
        jobs (
          job_number,
          status,
          description,
          flooring_type,
          measurement_date,
          install_start_date,
          install_end_date,
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
          subtotal,
          tax_amount,
          discount,
          deposit,
          total,
          balance_due,
          status
        )
      `)
      .eq("agreement_id", agreementId)
      .single();

    return {
      data,
      error
    };
  },

  async getAgreementByJob(jobNumber) {
    const { data, error } = await db
      .from(TABLES.AGREEMENTS)
      .select(`
        *,
        agreement_signatures (*)
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

  async createAgreement(agreement) {
    const payload = {
      job_number: agreement.job_number,
      customer_id: agreement.customer_id || null,
      estimate_id: agreement.estimate_id || null,
      scope_of_work: agreement.scope_of_work || null,
      terms: agreement.terms || null,
      warranty: agreement.warranty || null,
      total: Number(agreement.total) || 0,
      deposit: Number(agreement.deposit) || 0,
      balance_due: Number(agreement.balance_due) || 0,
      status: agreement.status || AGREEMENT.DEFAULT_STATUS
    };

    const { data, error } = await db
      .from(TABLES.AGREEMENTS)
      .insert([payload])
      .select()
      .single();

    if (error) {
      return {
        data: null,
        error
      };
    }

    const { error: jobUpdateError } = await JobService.linkAgreement(
      agreement.job_number,
      data.agreement_id
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

  async createAgreementFromEstimate(estimateId) {
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

    const scopeOfWork = this.buildDefaultScopeOfWork(job, estimate);

    return await this.createAgreement({
      job_number: estimate.job_number,
      customer_id: customer.customer_id || estimate.customer_id || null,
      estimate_id: estimate.estimate_id,
      scope_of_work: scopeOfWork,
      terms: this.getDefaultTerms(),
      warranty: this.getDefaultWarranty(),
      total: estimate.total,
      deposit: estimate.deposit,
      balance_due: estimate.balance_due,
      status: AGREEMENT.DEFAULT_STATUS
    });
  },

  /* ==========================================================
     UPDATE
  ========================================================== */

  async updateAgreement(agreementId, updates) {
    const { data, error } = await db
      .from(TABLES.AGREEMENTS)
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq("agreement_id", agreementId)
      .select()
      .single();

    return {
      data,
      error
    };
  },

  async updateAgreementStatus(agreementId, status) {
    return await this.updateAgreement(agreementId, {
      status
    });
  },

  async markAgreementSigned(agreementId) {
    return await this.updateAgreement(agreementId, {
      status: JOB_STATUS.AGREEMENT_SIGNED,
      signed_at: new Date().toISOString()
    });
  },

  /* ==========================================================
     SIGNATURES
  ========================================================== */

  async addSignature(agreementId, signerName, signatureData) {
    const { data, error } = await db
      .from(TABLES.AGREEMENT_SIGNATURES)
      .insert([{
        agreement_id: agreementId,
        signer_name: signerName || null,
        signature_data: signatureData || null,
        signed_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      return {
        data: null,
        error
      };
    }

    const { error: agreementError } = await this.markAgreementSigned(
      agreementId
    );

    if (agreementError) {
      return {
        data,
        error: agreementError
      };
    }

    return {
      data,
      error: null
    };
  },

  /* ==========================================================
     DELETE
  ========================================================== */

  async deleteAgreement(agreementId, jobNumber = null) {
    const { error } = await db
      .from(TABLES.AGREEMENTS)
      .delete()
      .eq("agreement_id", agreementId);

    if (error) {
      return {
        error
      };
    }

    if (jobNumber) {
      await JobService.updateJob(jobNumber, {
        agreement_id: null
      });
    }

    return {
      error: null
    };
  },

  /* ==========================================================
     DEFAULT TEXT HELPERS
  ========================================================== */

  buildDefaultScopeOfWork(job, estimate) {
    const flooringTypes = Array.isArray(job.flooring_type)
      ? job.flooring_type.join(", ")
      : job.flooring_type || "flooring work";

    return `CS-Flooring & Tile LLC agrees to complete the requested ${flooringTypes} work for this project. The scope of work will follow the estimate associated with this job.`;
  },

  getDefaultTerms() {
    return "Customer agrees to the listed project price, deposit requirements, and remaining balance due upon completion unless otherwise stated in writing.";
  },

  getDefaultWarranty() {
    return "Workmanship warranty details will be reviewed and finalized before the agreement is signed.";
  }

};