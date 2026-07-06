// invoices.js

let invoiceItems = [];

let invoiceCustomers = [];
let invoiceJobs = [];
let invoiceEstimates = [];
let invoiceAgreements = [];

let invoiceAllEstimates = [];
let invoiceAllAgreements = [];

let selectedInvoiceCustomer = null;
let selectedInvoiceJob = null;
let selectedInvoiceEstimate = null;
let selectedInvoiceAgreement = null;

/* ==========================================================
   INITIALIZE
========================================================== */

window.addEventListener("load", async () => {
  await initializeInvoicePage();
});

async function initializeInvoicePage() {
  await Promise.all([
    loadInvoiceCustomers(),
    loadInvoiceEstimates(),
    loadInvoiceAgreements()
  ]);

  await loadInvoiceJobs();
  addInvoiceItemRow();
  applyInvoiceUrlContext();

  await loadInvoices();
}

/* ==========================================================
   LOAD FORM DATA
========================================================== */

async function loadInvoiceCustomers() {
  const select = document.getElementById("invoiceCustomerSelect");
  if (!select) return;

  const options = await FormDataService.getCustomerOptions();
  invoiceCustomers = options.map(option => option.data);

  FormDataService.populateSelect(select, options, "Select Customer");
}

async function loadInvoiceJobs(customerId = null) {
  const select = document.getElementById("invoiceJobSelect");
  if (!select) return;

  const options = await FormDataService.getJobOptions(customerId);
  invoiceJobs = options.map(option => option.data);

  FormDataService.populateSelect(
    select,
    options,
    customerId ? "Select Job for Customer" : "Select Job"
  );
}

async function loadInvoiceEstimates() {
  const select = document.getElementById("invoiceEstimateSelect");
  if (!select) return;

  const options = await FormDataService.getEstimateOptions();
  invoiceAllEstimates = options.map(option => option.data);
  invoiceEstimates = invoiceAllEstimates;

  FormDataService.populateSelect(
    select,
    options,
    "Optional: Select Estimate"
  );
}

async function loadInvoiceAgreements() {
  const select = document.getElementById("invoiceAgreementSelect");
  if (!select) return;

  const options = await FormDataService.getAgreementOptions();
  invoiceAllAgreements = options.map(option => option.data);
  invoiceAgreements = invoiceAllAgreements;

  FormDataService.populateSelect(
    select,
    options,
    "Optional: Select Agreement"
  );
}

function loadInvoiceEstimatesForJob(jobNumber = null) {
  const select = document.getElementById("invoiceEstimateSelect");
  if (!select) return;

  const filtered = jobNumber
    ? invoiceAllEstimates.filter(estimate =>
        String(estimate.job_number) === String(jobNumber)
      )
    : invoiceAllEstimates;

  invoiceEstimates = filtered;

  const options = filtered.map(estimate => ({
    value: estimate.estimate_id,
    text: `${estimate.job_number || "No Job"} • $${formatInvoiceMoney(estimate.total)} total`,
    data: estimate
  }));

  FormDataService.populateSelect(
    select,
    options,
    jobNumber ? "Optional: Select Estimate for Job" : "Optional: Select Estimate"
  );
}

function loadInvoiceAgreementsForJob(jobNumber = null) {
  const select = document.getElementById("invoiceAgreementSelect");
  if (!select) return;

  const filtered = jobNumber
    ? invoiceAllAgreements.filter(agreement =>
        String(agreement.job_number) === String(jobNumber)
      )
    : invoiceAllAgreements;

  invoiceAgreements = filtered;

  const options = filtered.map(agreement => ({
    value: agreement.agreement_id,
    text: `${agreement.job_number || "No Job"} • $${formatInvoiceMoney(agreement.total)} total`,
    data: agreement
  }));

  FormDataService.populateSelect(
    select,
    options,
    jobNumber ? "Optional: Select Agreement for Job" : "Optional: Select Agreement"
  );
}

/* ==========================================================
   CUSTOMER / JOB / DOCUMENT SELECTION
========================================================== */

async function handleInvoiceCustomerChange() {
  const customerId =
    document.getElementById("invoiceCustomerSelect")?.value || "";

  selectedInvoiceCustomer =
    invoiceCustomers.find(customer =>
      String(customer.customer_id) === String(customerId)
    ) || null;

  selectedInvoiceJob = null;
  selectedInvoiceEstimate = null;
  selectedInvoiceAgreement = null;

  clearInvoiceJobFields();
  clearInvoiceDocumentFields();

  if (!customerId) {
    await loadInvoiceJobs();
    loadInvoiceEstimatesForJob();
    loadInvoiceAgreementsForJob();
    updateInvoiceContextPanel();
    return;
  }

  await loadInvoiceJobs(customerId);
  loadInvoiceEstimatesForJob();
  loadInvoiceAgreementsForJob();
  updateInvoiceContextPanel();
}

function handleInvoiceJobChange() {
  const jobNumber =
    document.getElementById("invoiceJobSelect")?.value || "";

  selectedInvoiceJob =
    invoiceJobs.find(job =>
      String(job.job_number) === String(jobNumber)
    ) || null;

  selectedInvoiceEstimate = null;
  selectedInvoiceAgreement = null;

  clearInvoiceDocumentFields();

  if (!selectedInvoiceJob) {
    clearInvoiceJobFields();
    loadInvoiceEstimatesForJob();
    loadInvoiceAgreementsForJob();
    updateInvoiceContextPanel();
    return;
  }

  const jobNumberInput = document.getElementById("invoiceJobNumber");
  if (jobNumberInput) jobNumberInput.value = selectedInvoiceJob.job_number || "";

  if (selectedInvoiceJob.customers) {
    selectedInvoiceCustomer = selectedInvoiceJob.customers;

    const customerSelect = document.getElementById("invoiceCustomerSelect");
    if (customerSelect && selectedInvoiceCustomer.customer_id) {
      customerSelect.value = selectedInvoiceCustomer.customer_id;
    }
  }

  loadInvoiceEstimatesForJob(selectedInvoiceJob.job_number);
  loadInvoiceAgreementsForJob(selectedInvoiceJob.job_number);
  updateInvoiceContextPanel();
}

function handleInvoiceEstimateChange() {
  const estimateId =
    document.getElementById("invoiceEstimateSelect")?.value || "";

  selectedInvoiceEstimate =
    invoiceEstimates.find(estimate =>
      String(estimate.estimate_id) === String(estimateId)
    ) || null;

  if (!selectedInvoiceEstimate) {
    const estimateInput = document.getElementById("invoiceEstimateId");
    if (estimateInput) estimateInput.value = "";
    updateInvoiceContextPanel();
    return;
  }

  const estimateInput = document.getElementById("invoiceEstimateId");
  if (estimateInput) estimateInput.value = selectedInvoiceEstimate.estimate_id;

  const jobNumberInput = document.getElementById("invoiceJobNumber");
  if (jobNumberInput && selectedInvoiceEstimate.job_number) {
    jobNumberInput.value = selectedInvoiceEstimate.job_number;
  }

  if (selectedInvoiceEstimate.job_number && !selectedInvoiceJob) {
    const matchingJob = invoiceJobs.find(job =>
      String(job.job_number) === String(selectedInvoiceEstimate.job_number)
    );

    if (matchingJob) {
      selectedInvoiceJob = matchingJob;

      const jobSelect = document.getElementById("invoiceJobSelect");
      if (jobSelect) jobSelect.value = matchingJob.job_number;
    }
  }

  autofillInvoiceFromEstimate();
  updateInvoiceContextPanel();
}

function handleInvoiceAgreementChange() {
  const agreementId =
    document.getElementById("invoiceAgreementSelect")?.value || "";

  selectedInvoiceAgreement =
    invoiceAgreements.find(agreement =>
      String(agreement.agreement_id) === String(agreementId)
    ) || null;

  if (!selectedInvoiceAgreement) {
    const agreementInput = document.getElementById("invoiceAgreementId");
    if (agreementInput) agreementInput.value = "";
    updateInvoiceContextPanel();
    return;
  }

  const agreementInput = document.getElementById("invoiceAgreementId");
  if (agreementInput) agreementInput.value = selectedInvoiceAgreement.agreement_id;

  const jobNumberInput = document.getElementById("invoiceJobNumber");
  if (jobNumberInput && selectedInvoiceAgreement.job_number) {
    jobNumberInput.value = selectedInvoiceAgreement.job_number;
  }

  if (selectedInvoiceAgreement.job_number && !selectedInvoiceJob) {
    const matchingJob = invoiceJobs.find(job =>
      String(job.job_number) === String(selectedInvoiceAgreement.job_number)
    );

    if (matchingJob) {
      selectedInvoiceJob = matchingJob;

      const jobSelect = document.getElementById("invoiceJobSelect");
      if (jobSelect) jobSelect.value = matchingJob.job_number;
    }
  }

  autofillInvoiceFromAgreement();
  updateInvoiceContextPanel();
}

/* ==========================================================
   AUTOFILL
========================================================== */

function autofillInvoiceFromEstimate() {
  if (!selectedInvoiceEstimate) return;

  const taxInput = document.getElementById("invoiceTaxAmount");
  const discountInput = document.getElementById("invoiceDiscount");
  const paidInput = document.getElementById("invoiceAmountPaid");
  const notesInput = document.getElementById("invoiceNotes");

  if (taxInput) taxInput.value = Number(selectedInvoiceEstimate.tax_amount || 0).toFixed(2);
  if (discountInput) discountInput.value = Number(selectedInvoiceEstimate.discount || 0).toFixed(2);
  if (paidInput) paidInput.value = Number(selectedInvoiceEstimate.deposit || 0).toFixed(2);

  if (notesInput && !notesInput.value.trim()) {
    notesInput.value = selectedInvoiceEstimate.notes || "";
  }

  const estimateItems = selectedInvoiceEstimate.estimate_items || [];

  if (estimateItems.length) {
    invoiceItems = estimateItems.map(item => ({
      local_id: crypto.randomUUID(),
      description: item.description || "",
      quantity: Number(item.quantity || 0),
      unit: item.unit || "each",
      unit_price: Number(item.unit_price || 0)
    }));
  } else {
    invoiceItems = [{
      local_id: crypto.randomUUID(),
      description: `Invoice for estimate ${selectedInvoiceEstimate.estimate_id}`,
      quantity: 1,
      unit: "flat rate",
      unit_price: Number(selectedInvoiceEstimate.total || 0)
    }];
  }

  renderInvoiceItems();
}

function autofillInvoiceFromAgreement() {
  if (!selectedInvoiceAgreement) return;

  const agreementInput = document.getElementById("invoiceAgreementId");
  if (agreementInput) agreementInput.value = selectedInvoiceAgreement.agreement_id;

  const paidInput = document.getElementById("invoiceAmountPaid");
  if (paidInput) paidInput.value = Number(selectedInvoiceAgreement.deposit || 0).toFixed(2);

  invoiceItems = [{
    local_id: crypto.randomUUID(),
    description: selectedInvoiceAgreement.scope_of_work ||
      `Invoice for agreement ${selectedInvoiceAgreement.agreement_id}`,
    quantity: 1,
    unit: "flat rate",
    unit_price: Number(selectedInvoiceAgreement.total || 0)
  }];

  renderInvoiceItems();
}

/* ==========================================================
   CLEAR / CONTEXT
========================================================== */

function clearInvoiceJobFields() {
  selectedInvoiceJob = null;

  const jobNumberInput = document.getElementById("invoiceJobNumber");
  if (jobNumberInput) jobNumberInput.value = "";
}

function clearInvoiceDocumentFields() {
  selectedInvoiceEstimate = null;
  selectedInvoiceAgreement = null;

  const estimateInput = document.getElementById("invoiceEstimateId");
  const agreementInput = document.getElementById("invoiceAgreementId");
  const estimateSelect = document.getElementById("invoiceEstimateSelect");
  const agreementSelect = document.getElementById("invoiceAgreementSelect");

  if (estimateInput) estimateInput.value = "";
  if (agreementInput) agreementInput.value = "";
  if (estimateSelect) estimateSelect.value = "";
  if (agreementSelect) agreementSelect.value = "";
}

function updateInvoiceContextPanel() {
  setText(
    "invoiceContextCustomer",
    selectedInvoiceCustomer?.customer_name || "None selected"
  );

  setText(
    "invoiceContextJob",
    selectedInvoiceJob?.job_number ||
    document.getElementById("invoiceJobNumber")?.value ||
    "None selected"
  );

  setText(
    "invoiceContextEstimate",
    selectedInvoiceEstimate?.estimate_id ||
    document.getElementById("invoiceEstimateId")?.value ||
    "None selected"
  );

  setText(
    "invoiceContextAgreement",
    selectedInvoiceAgreement?.agreement_id ||
    document.getElementById("invoiceAgreementId")?.value ||
    "None selected"
  );
}

/* ==========================================================
   LINE ITEMS
========================================================== */

function addInvoiceItemRow(prefill = {}) {
  invoiceItems.push({
    local_id: crypto.randomUUID(),
    description: prefill.description || "",
    quantity: Number(prefill.quantity || 1),
    unit: prefill.unit || "each",
    unit_price: Number(prefill.unit_price || 0)
  });

  renderInvoiceItems();
}

function removeInvoiceItemRow(localId) {
  invoiceItems = invoiceItems.filter(item => item.local_id !== localId);

  if (!invoiceItems.length) {
    addInvoiceItemRow();
    return;
  }

  renderInvoiceItems();
}

function renderInvoiceItems() {
  const container = document.getElementById("invoiceItems");
  if (!container) return;

  container.innerHTML = invoiceItems.map(item => `
    <div class="invoice-item-row" data-item-id="${item.local_id}">

      <div class="admin-form-field full-width">
        <label>Description</label>
        <input
          type="text"
          value="${escapeInvoiceHtml(item.description)}"
          placeholder="Describe product, labor, deposit, balance, or invoice charge"
          oninput="updateInvoiceItem('${item.local_id}','description',this.value)">
      </div>

      <div class="admin-form-field">
        <label>Quantity</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value="${item.quantity}"
          placeholder="Amount of units"
          oninput="updateInvoiceItem('${item.local_id}','quantity',this.value)">
      </div>

      <div class="admin-form-field">
        <label>Unit of Measurement</label>
        <select onchange="updateInvoiceItem('${item.local_id}','unit',this.value)">
          ${[
            "each",
            "sq ft",
            "sq yd",
            "linear ft",
            "hour",
            "day",
            "flat rate"
          ].map(unit => `
            <option value="${unit}" ${item.unit === unit ? "selected" : ""}>
              ${unit}
            </option>
          `).join("")}
        </select>
      </div>

      <div class="admin-form-field">
        <label>Unit Price ($ per selected unit)</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value="${item.unit_price}"
          placeholder="Price charged for one unit"
          oninput="updateInvoiceItem('${item.local_id}','unit_price',this.value)">
      </div>

      <div class="invoice-line-total">
        <span>Line Total ($)</span>
        <strong>$${formatInvoiceMoney(calculateInvoiceLineTotal(item))}</strong>
      </div>

      <div class="invoice-item-actions">
        <button class="btn secondary" type="button" onclick="removeInvoiceItemRow('${item.local_id}')">
          Remove
        </button>
      </div>

    </div>
  `).join("");

  calculateInvoiceTotals();
}

function updateInvoiceItem(localId, field, value) {
  const item = invoiceItems.find(item => item.local_id === localId);
  if (!item) return;

  if (["quantity", "unit_price"].includes(field)) {
    item[field] = Number(value || 0);
  } else {
    item[field] = value;
  }

  calculateInvoiceTotals();

  const row = document.querySelector(`[data-item-id="${localId}"]`);
  if (row) {
    const totalElement = row.querySelector(".invoice-line-total strong");
    if (totalElement) {
      totalElement.textContent =
        `$${formatInvoiceMoney(calculateInvoiceLineTotal(item))}`;
    }
  }
}

/* ==========================================================
   CALCULATIONS
========================================================== */

function calculateInvoiceLineTotal(item) {
  return Number(item.quantity || 0) * Number(item.unit_price || 0);
}

function calculateInvoiceTotals() {
  const subtotal = invoiceItems.reduce(
    (sum, item) => sum + calculateInvoiceLineTotal(item),
    0
  );

  const taxAmount =
    Number(document.getElementById("invoiceTaxAmount")?.value || 0);

  const discount =
    Number(document.getElementById("invoiceDiscount")?.value || 0);

  const amountPaid =
    Number(document.getElementById("invoiceAmountPaid")?.value || 0);

  const total = Math.max(subtotal + taxAmount - discount, 0);
  const balanceDue = Math.max(total - amountPaid, 0);

  setText("invoiceSubtotal", `$${formatInvoiceMoney(subtotal)}`);
  setText("invoiceTotal", `$${formatInvoiceMoney(total)}`);
  setText("invoicePaid", `$${formatInvoiceMoney(amountPaid)}`);
  setText("invoiceBalance", `$${formatInvoiceMoney(balanceDue)}`);

  return {
    subtotal,
    taxAmount,
    discount,
    amountPaid,
    total,
    balanceDue
  };
}

/* ==========================================================
   SAVE INVOICE
========================================================== */

async function saveInvoice() {
  const jobNumber = document.getElementById("invoiceJobNumber")?.value.trim();
  const estimateId = document.getElementById("invoiceEstimateId")?.value.trim() || null;
  const agreementId = document.getElementById("invoiceAgreementId")?.value.trim() || null;
  const dueDate = document.getElementById("invoiceDueDate")?.value || null;
  const notes = document.getElementById("invoiceNotes")?.value.trim() || null;

  if (!jobNumber) {
    showMessage("Select a job or enter a job number.");
    return;
  }

  const validItems = invoiceItems.filter(item =>
    item.description.trim() &&
    Number(item.quantity) > 0
  );

  if (!validItems.length) {
    showMessage("Add at least one valid invoice line item.");
    return;
  }

  const totals = calculateInvoiceTotals();

  const customerId =
    selectedInvoiceCustomer?.customer_id ||
    selectedInvoiceJob?.customer_id ||
    selectedInvoiceJob?.customers?.customer_id ||
    selectedInvoiceEstimate?.customer_id ||
    selectedInvoiceEstimate?.jobs?.customer_id ||
    selectedInvoiceAgreement?.customer_id ||
    selectedInvoiceAgreement?.jobs?.customer_id ||
    null;

  const payload = {
    job_number: jobNumber,
    customer_id: customerId,
    estimate_id: estimateId,
    agreement_id: agreementId,
    subtotal: totals.subtotal,
    tax_amount: totals.taxAmount,
    discount: totals.discount,
    total: totals.total,
    amount_paid: totals.amountPaid,
    balance_due: totals.balanceDue,
    due_date: dueDate,
    notes,
    status: totals.balanceDue <= 0 ? "Paid" : INVOICE.DEFAULT_STATUS
  };

  const itemPayloads = validItems.map((item, index) => ({
    description: item.description,
    quantity: Number(item.quantity || 0),
    unit: item.unit || "each",
    unit_price: Number(item.unit_price || 0),
    line_total: calculateInvoiceLineTotal(item),
    sort_order: index
  }));

  const { data: createdInvoice, error } =
    await InvoiceService.createInvoiceWithItems(payload, itemPayloads);

  if (error) {
    console.error(error);
    showMessage("Could not save invoice.");
    return;
  }

  if (createdInvoice?.invoice_id) {
    await JobService.updateJob(jobNumber, {
      invoice_id: createdInvoice.invoice_id
    });
  }

  showMessage("Invoice saved.");
  resetInvoiceForm();
  await loadInvoices();
}

/* ==========================================================
   RESET
========================================================== */

function resetInvoiceForm() {
  const form = document.getElementById("invoiceForm");
  if (form) form.reset();

  selectedInvoiceCustomer = null;
  selectedInvoiceJob = null;
  selectedInvoiceEstimate = null;
  selectedInvoiceAgreement = null;

  invoiceItems = [];

  loadInvoiceJobs();
  loadInvoiceEstimatesForJob();
  loadInvoiceAgreementsForJob();

  addInvoiceItemRow();
  updateInvoiceContextPanel();
}

/* ==========================================================
   LOAD / RENDER INVOICES
========================================================== */

async function loadInvoices() {
  const container = document.getElementById("invoices");
  if (!container) return;

  container.innerHTML = `<div class="admin-empty-state">Loading invoices...</div>`;

  const { data, error } = await InvoiceService.getInvoices();

  if (error) {
    console.error(error);
    container.innerHTML = `<div class="admin-empty-state">Could not load invoices.</div>`;
    return;
  }

  const invoices = data || [];

  if (!invoices.length) {
    container.innerHTML = `
      <div class="admin-empty-state">
        <h3>No invoices yet.</h3>
        <p>Saved invoices will appear here.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = invoices.map(invoice => renderInvoiceCard(invoice)).join("");
}

function renderInvoiceCard(invoice) {
  const job = invoice.jobs || {};
  const customer = job.customers || invoice.customers || {};

  return `
    <article class="invoice-card">
      <div class="invoice-card-header">
        <div>
          <p class="eyebrow">${escapeInvoiceHtml(invoice.job_number || "Invoice")}</p>
          <h3>${escapeInvoiceHtml(customer.customer_name || "Customer not listed")}</h3>
        </div>

        <span class="${getInvoiceStatusClass(invoice.status)}">
          ${escapeInvoiceHtml(invoice.status || INVOICE.DEFAULT_STATUS)}
        </span>
      </div>

      <div class="invoice-card-details">
        <div>
          <span>Total</span>
          <strong>$${formatInvoiceMoney(invoice.total || 0)}</strong>
        </div>

        <div>
          <span>Paid</span>
          <strong>$${formatInvoiceMoney(invoice.amount_paid || 0)}</strong>
        </div>

        <div>
          <span>Balance</span>
          <strong>$${formatInvoiceMoney(invoice.balance_due || 0)}</strong>
        </div>

        <div>
          <span>Due</span>
          <strong>${formatInvoiceDate(invoice.due_date)}</strong>
        </div>
      </div>

      ${invoice.notes ? `
        <div class="invoice-card-notes">
          <span>Notes</span>
          <p>${escapeInvoiceHtml(invoice.notes)}</p>
        </div>
      ` : ""}

      <div class="invoice-card-actions">
        <button class="btn secondary" type="button" onclick="viewInvoice('${invoice.invoice_id}')">
          View
        </button>

        <button class="btn secondary" type="button" onclick="openPaymentModal('${invoice.invoice_id}')">
          Add Payment
        </button>

        <button class="btn danger" type="button" onclick="deleteInvoice('${invoice.invoice_id}','${invoice.job_number || ""}')">
          Delete
        </button>
      </div>
    </article>
  `;
}

/* ==========================================================
   VIEW INVOICE
========================================================== */

async function viewInvoice(invoiceId) {
  const { data: invoice, error } = await InvoiceService.getInvoice(invoiceId);

  if (error || !invoice) {
    console.error(error);
    showMessage("Could not load invoice.");
    return;
  }

  const job = invoice.jobs || {};
  const customer = job.customers || invoice.customers || {};
  const items = invoice.invoice_items || [];
  const payments = invoice.invoice_payments || [];

  openAdminModal({
    title: `Invoice ${invoice.invoice_id}`,
    subtitle: customer.customer_name || invoice.job_number || "Invoice",
    wide: true,
    body: `
      <div class="invoice-modal-summary">
        <div><span>Job</span><strong>${escapeInvoiceHtml(invoice.job_number || "Not listed")}</strong></div>
        <div><span>Total</span><strong>$${formatInvoiceMoney(invoice.total || 0)}</strong></div>
        <div><span>Paid</span><strong>$${formatInvoiceMoney(invoice.amount_paid || 0)}</strong></div>
        <div><span>Balance</span><strong>$${formatInvoiceMoney(invoice.balance_due || 0)}</strong></div>
      </div>

      <div class="invoice-modal-section">
        <h3>Customer</h3>
        <p>
          <strong>${escapeInvoiceHtml(customer.customer_name || "Not listed")}</strong><br>
          ${escapeInvoiceHtml(customer.phone || "No phone")}<br>
          ${escapeInvoiceHtml(customer.email || "No email")}<br>
          ${escapeInvoiceHtml(customer.address || "No address")}
        </p>
      </div>

      <div class="invoice-modal-section">
        <h3>Invoice Items</h3>

        <div class="invoice-modal-items">
          ${
            items.length
              ? items.map(item => `
                <div class="invoice-modal-item">
                  <strong>${escapeInvoiceHtml(item.description || "Line Item")}</strong>
                  <span>${Number(item.quantity || 0)} ${escapeInvoiceHtml(item.unit || "each")} × $${formatInvoiceMoney(item.unit_price || 0)}</span>
                  <span>$${formatInvoiceMoney(item.line_total || 0)}</span>
                </div>
              `).join("")
              : `<div class="admin-empty-state">No invoice items listed.</div>`
          }
        </div>
      </div>

      <div class="invoice-modal-section">
        <h3>Payments</h3>

        <div class="invoice-payment-list">
          ${
            payments.length
              ? payments.map(payment => `
                <div class="invoice-payment-row">
                  <strong>$${formatInvoiceMoney(payment.amount || 0)}</strong>
                  <span>
                    ${escapeInvoiceHtml(payment.payment_method || "Payment")}
                    ·
                    ${formatInvoiceDate(payment.payment_date)}
                  </span>
                </div>
              `).join("")
              : `<div class="admin-empty-state">No payments recorded yet.</div>`
          }
        </div>
      </div>

      ${invoice.notes ? `
        <div class="invoice-modal-section">
          <h3>Notes</h3>
          <p>${escapeInvoiceHtml(invoice.notes)}</p>
        </div>
      ` : ""}
    `,
    footer: `
      <button class="btn secondary" type="button" onclick="closeAdminModal()">Close</button>
      <button class="btn" type="button" onclick="openPaymentModal('${invoice.invoice_id}')">Add Payment</button>
    `
  });
}

/* ==========================================================
   PAYMENTS
========================================================== */

function openPaymentModal(invoiceId) {
  openAdminModal({
    title: "Add Payment",
    subtitle: `Invoice ${invoiceId}`,
    wide: false,
    body: `
      <div class="admin-modal-grid">
        <div class="admin-modal-field">
          <label for="paymentAmount">Payment Amount ($)</label>
          <input id="paymentAmount" type="number" step="0.01" min="0" placeholder="Dollar amount received" required>
        </div>

        <div class="admin-modal-field">
          <label for="paymentMethod">Payment Method</label>
          <select id="paymentMethod">
            <option value="">Select Method</option>
            <option>Cash</option>
            <option>Check</option>
            <option>Credit Card</option>
            <option>Debit Card</option>
            <option>Bank Transfer</option>
            <option>Other</option>
          </select>
        </div>

        <div class="admin-modal-field">
          <label for="paymentDate">Payment Date</label>
          <input id="paymentDate" type="date" value="${new Date().toISOString().split("T")[0]}">
        </div>

        <div class="admin-modal-field full-width">
          <label for="paymentNotes">Payment Notes</label>
          <textarea id="paymentNotes" placeholder="Optional note about this payment..."></textarea>
        </div>
      </div>
    `,
    footer: `
      <button class="btn secondary" type="button" onclick="closeAdminModal()">Cancel</button>
      <button class="btn" type="button" onclick="saveInvoicePayment('${invoiceId}')">Save Payment</button>
    `
  });
}

async function saveInvoicePayment(invoiceId) {
  const amount =
    Number(document.getElementById("paymentAmount")?.value || 0);

  const payment_method =
    document.getElementById("paymentMethod")?.value || null;

  const payment_date =
    document.getElementById("paymentDate")?.value ||
    new Date().toISOString().split("T")[0];

  const notes =
    document.getElementById("paymentNotes")?.value.trim() || null;

  if (amount <= 0) {
    showMessage("Enter a payment amount greater than $0.");
    return;
  }

  const { error } = await InvoiceService.addPayment(invoiceId, {
    amount,
    payment_method,
    payment_date,
    notes
  });

  if (error) {
    console.error(error);
    showMessage("Could not save payment.");
    return;
  }

  showMessage("Payment saved.");
  closeAdminModal();
  await loadInvoices();
}

/* ==========================================================
   DELETE
========================================================== */

async function deleteInvoice(invoiceId, jobNumber) {
  const confirmed = confirm("Delete this invoice? This cannot be undone.");
  if (!confirmed) return;

  const { error } = await InvoiceService.deleteInvoice(
    invoiceId,
    jobNumber || null
  );

  if (error) {
    console.error(error);
    showMessage("Could not delete invoice.");
    return;
  }

  showMessage("Invoice deleted.");
  await loadInvoices();
}

/* ==========================================================
   URL CONTEXT
========================================================== */

async function applyInvoiceUrlContext() {
  const params = new URLSearchParams(window.location.search);

  const customerId = params.get("customer_id");
  const jobNumber = params.get("job_number");
  const estimateId = params.get("estimate_id");
  const agreementId = params.get("agreement_id");

  if (customerId) {
    const customerSelect = document.getElementById("invoiceCustomerSelect");
    if (customerSelect) customerSelect.value = customerId;
    await handleInvoiceCustomerChange();
  }

  if (jobNumber) {
    const jobNumberInput = document.getElementById("invoiceJobNumber");
    if (jobNumberInput) jobNumberInput.value = jobNumber;

    const jobSelect = document.getElementById("invoiceJobSelect");
    const matchingJob = invoiceJobs.find(job =>
      String(job.job_number) === String(jobNumber)
    );

    if (matchingJob && jobSelect) {
      jobSelect.value = matchingJob.job_number;
      handleInvoiceJobChange();
    }
  }

  if (estimateId) {
    const estimateSelect = document.getElementById("invoiceEstimateSelect");
    const matchingEstimate = invoiceAllEstimates.find(estimate =>
      String(estimate.estimate_id) === String(estimateId)
    );

    if (matchingEstimate && estimateSelect) {
      loadInvoiceEstimatesForJob(matchingEstimate.job_number);
      estimateSelect.value = matchingEstimate.estimate_id;
      handleInvoiceEstimateChange();
    }
  }

  if (agreementId) {
    const agreementSelect = document.getElementById("invoiceAgreementSelect");
    const matchingAgreement = invoiceAllAgreements.find(agreement =>
      String(agreement.agreement_id) === String(agreementId)
    );

    if (matchingAgreement && agreementSelect) {
      loadInvoiceAgreementsForJob(matchingAgreement.job_number);
      agreementSelect.value = matchingAgreement.agreement_id;
      handleInvoiceAgreementChange();
    }
  }

  updateInvoiceContextPanel();
}

/* ==========================================================
   EVENT LISTENERS
========================================================== */

document
  .getElementById("invoiceTaxAmount")
  ?.addEventListener("input", calculateInvoiceTotals);

document
  .getElementById("invoiceDiscount")
  ?.addEventListener("input", calculateInvoiceTotals);

document
  .getElementById("invoiceAmountPaid")
  ?.addEventListener("input", calculateInvoiceTotals);

/* ==========================================================
   HELPERS
========================================================== */

function getInvoiceStatusClass(status) {
  const lower = String(status || "").toLowerCase();

  if (lower.includes("paid")) {
    return "admin-status-pill completed";
  }

  if (lower.includes("overdue") || lower.includes("cancel")) {
    return "admin-status-pill danger";
  }

  if (
    lower.includes("sent") ||
    lower.includes("draft") ||
    lower.includes("open") ||
    lower.includes("unpaid")
  ) {
    return "admin-status-pill pending";
  }

  return "admin-status-pill";
}

function formatInvoiceMoney(value) {
  return Number(value || 0).toFixed(2);
}

function formatInvoiceDate(dateString) {
  if (!dateString) return "Not listed";

  const normalized = String(dateString).includes("T")
    ? dateString
    : dateString + "T00:00:00";

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "Not listed";

  return date.toLocaleDateString(JOB.DATE_FORMAT, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function escapeInvoiceHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}