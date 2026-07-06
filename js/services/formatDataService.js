const FormDataService = {

  /* ===========================
     CUSTOMERS
  ============================ */

  async getCustomerOptions() {
    const customers = await CustomerService.getCustomers();

    return customers
      .sort((a, b) =>
        (a.customer_name || "").localeCompare(b.customer_name || "")
      )
      .map(customer => ({
        value: customer.customer_id,
        text: `${customer.customer_name} (${customer.customer_id})`,
        data: customer
      }));
  },

  /* ===========================
     JOBS
  ============================ */

  async getJobOptions(customerId = null) {
    let jobs = await JobService.getJobs();

    if (customerId) {
      jobs = jobs.filter(job => job.customer_id === customerId);
    }

    return jobs
      .sort((a, b) =>
        (a.job_number || "").localeCompare(b.job_number || "")
      )
      .map(job => ({
        value: job.job_number,
        text: `${job.job_number} • ${job.description || "No Description"}`,
        data: job
      }));
  },

  /* ===========================
     PRODUCTS / INVENTORY
  ============================ */

  async getProductOptions() {
    const products = await InventoryService.getInventory();

    return products
      .filter(product => product.active !== false)
      .sort((a, b) =>
        (a.material_name || "").localeCompare(b.material_name || "")
      )
      .map(product => ({
        value: product.inventory_id,
        text: `${product.material_name} - $${Number(product.unit_cost || 0).toFixed(2)}`,
        data: product
      }));
  },

  /* ===========================
     ESTIMATES
  ============================ */

  async getEstimateOptions() {
    const estimates = await EstimateService.getEstimates();

    return estimates.map(estimate => ({
      value: estimate.estimate_id,
      text: `${estimate.job_number} • Estimate #${estimate.estimate_id}`,
      data: estimate
    }));
  },

  /* ===========================
     AGREEMENTS
  ============================ */

  async getAgreementOptions() {
    const agreements = await AgreementService.getAgreements();

    return agreements.map(agreement => ({
      value: agreement.agreement_id,
      text: `${agreement.job_number} • Agreement #${agreement.agreement_id}`,
      data: agreement
    }));
  },

  /* ===========================
     INVOICES
  ============================ */

  async getInvoiceOptions() {
    const invoices = await InvoiceService.getInvoices();

    return invoices.map(invoice => ({
      value: invoice.invoice_id,
      text: `${invoice.job_number} • Invoice #${invoice.invoice_id}`,
      data: invoice
    }));
  },

  /* ===========================
     HELPER
  ============================ */

  async populateSelect(selectElement, options, placeholder = "-- Select --") {

    if (!selectElement) return;

    selectElement.innerHTML = "";

    const placeholderOption = document.createElement("option");
    placeholderOption.value = "";
    placeholderOption.textContent = placeholder;
    selectElement.appendChild(placeholderOption);

    options.forEach(option => {

      const element = document.createElement("option");

      element.value = option.value;
      element.textContent = option.text;

      selectElement.appendChild(element);

    });

  }

};