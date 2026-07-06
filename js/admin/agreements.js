// agreements.js

let agreementCustomers = [];
let agreementJobs = [];
let agreementEstimates = [];
let agreementAllEstimates = [];

let selectedAgreementCustomer = null;
let selectedAgreementJob = null;
let selectedAgreementEstimate = null;

/* ==========================================================
   INITIALIZE
========================================================== */

window.addEventListener("load", async () => {
  await initializeAgreementPage();
});

async function initializeAgreementPage() {
  await Promise.all([
    loadAgreementCustomers(),
    loadAgreementEstimates()
  ]);

  fillAgreementDefaults();
  applyAgreementUrlContext();

  await loadAgreements();
}

/* ==========================================================
   LOAD FORM DATA
========================================================== */

async function loadAgreementCustomers() {
  const select = document.getElementById("agreementCustomerSelect");
  if (!select) return;

  const options = await FormDataService.getCustomerOptions();
  agreementCustomers = options.map(option => option.data);

  FormDataService.populateSelect(select, options, "Select Customer");
}

async function loadAgreementJobs(customerId = null) {
  const select = document.getElementById("agreementJobSelect");
  if (!select) return;

  const options = await FormDataService.getJobOptions(customerId);
  agreementJobs = options.map(option => option.data);

  FormDataService.populateSelect(
    select,
    options,
    customerId ? "Select Job for Customer" : "Select Job"
  );
}

async function loadAgreementEstimates() {
  const select = document.getElementById("agreementEstimateSelect");
  if (!select) return;

  const options = await FormDataService.getEstimateOptions();
  agreementAllEstimates = options.map(option => option.data);
  agreementEstimates = agreementAllEstimates;

  FormDataService.populateSelect(
    select,
    options,
    "Optional: Select Estimate"
  );
}

function loadAgreementEstimatesForJob(jobNumber = null) {
  const select = document.getElementById("agreementEstimateSelect");
  if (!select) return;

  const filtered = jobNumber
    ? agreementAllEstimates.filter(estimate =>
        String(estimate.job_number) === String(jobNumber)
      )
    : agreementAllEstimates;

  agreementEstimates = filtered;

  const options = filtered.map(estimate => ({
    value: estimate.estimate_id,
    text: `${estimate.job_number || "No Job"} • ${formatAgreementMoney(estimate.total)} total`,
    data: estimate
  }));

  FormDataService.populateSelect(
    select,
    options,
    jobNumber ? "Optional: Select Estimate for Job" : "Optional: Select Estimate"
  );
}

/* ==========================================================
   CUSTOMER / JOB / ESTIMATE SELECTION
========================================================== */

async function handleAgreementCustomerChange() {
  const customerId =
    document.getElementById("agreementCustomerSelect")?.value || "";

  selectedAgreementCustomer =
    agreementCustomers.find(customer =>
      String(customer.customer_id) === String(customerId)
    ) || null;

  selectedAgreementJob = null;
  selectedAgreementEstimate = null;

  clearAgreementJobFields();
  clearAgreementEstimateFields();

  if (!customerId) {
    await loadAgreementJobs();
    loadAgreementEstimatesForJob();
    updateAgreementContextPanel();
    return;
  }

  await loadAgreementJobs(customerId);
  loadAgreementEstimatesForJob();
  updateAgreementContextPanel();
}

function handleAgreementJobChange() {
  const jobNumber =
    document.getElementById("agreementJobSelect")?.value || "";

  selectedAgreementJob =
    agreementJobs.find(job =>
      String(job.job_number) === String(jobNumber)
    ) || null;

  selectedAgreementEstimate = null;
  clearAgreementEstimateFields();

  if (!selectedAgreementJob) {
    clearAgreementJobFields();
    loadAgreementEstimatesForJob();
    updateAgreementContextPanel();
    return;
  }

  const jobNumberInput = document.getElementById("agreementJobNumber");
  if (jobNumberInput) jobNumberInput.value = selectedAgreementJob.job_number || "";

  if (selectedAgreementJob.customers) {
    selectedAgreementCustomer = selectedAgreementJob.customers;

    const customerSelect = document.getElementById("agreementCustomerSelect");
    if (customerSelect && selectedAgreementCustomer.customer_id) {
      customerSelect.value = selectedAgreementCustomer.customer_id;
    }
  }

  loadAgreementEstimatesForJob(selectedAgreementJob.job_number);
  autoFillScopeFromJob();

  updateAgreementContextPanel();
}

function handleAgreementEstimateChange() {
  const estimateId =
    document.getElementById("agreementEstimateSelect")?.value || "";

  selectedAgreementEstimate =
    agreementEstimates.find(estimate =>
      String(estimate.estimate_id) === String(estimateId)
    ) || null;

  if (!selectedAgreementEstimate) {
    clearAgreementEstimateFields();
    updateAgreementContextPanel();
    return;
  }

  const estimateInput = document.getElementById("agreementEstimateId");
  if (estimateInput) estimateInput.value = selectedAgreementEstimate.estimate_id;

  const totalInput = document.getElementById("agreementTotal");
  const depositInput = document.getElementById("agreementDeposit");
  const balanceInput = document.getElementById("agreementBalance");

  if (totalInput) totalInput.value = Number(selectedAgreementEstimate.total || 0).toFixed(2);
  if (depositInput) depositInput.value = Number(selectedAgreementEstimate.deposit || 0).toFixed(2);
  if (balanceInput) balanceInput.value = Number(selectedAgreementEstimate.balance_due || 0).toFixed(2);

  if (!selectedAgreementJob && selectedAgreementEstimate.job_number) {
    const jobSelect = document.getElementById("agreementJobSelect");
    const matchingJob = agreementJobs.find(job =>
      String(job.job_number) === String(selectedAgreementEstimate.job_number)
    );

    if (matchingJob) {
      selectedAgreementJob = matchingJob;
      if (jobSelect) jobSelect.value = matchingJob.job_number;

      const jobNumberInput = document.getElementById("agreementJobNumber");
      if (jobNumberInput) jobNumberInput.value = matchingJob.job_number;
    } else {
      const jobNumberInput = document.getElementById("agreementJobNumber");
      if (jobNumberInput) jobNumberInput.value = selectedAgreementEstimate.job_number;
    }
  }

  autoFillScopeFromEstimate();
  updateAgreementContextPanel();
}

/* ==========================================================
   DEFAULTS / AUTOFILL
========================================================== */

function fillAgreementDefaults() {
  const terms = document.getElementById("agreementTerms");
  const warranty = document.getElementById("agreementWarranty");

  if (terms && !terms.value) {
    terms.value = AgreementService.getDefaultTerms();
  }

  if (warranty && !warranty.value) {
    warranty.value = AgreementService.getDefaultWarranty();
  }
}

function autoFillScopeFromJob() {
  const scope = document.getElementById("agreementScope");
  if (!scope || scope.value.trim()) return;

  if (selectedAgreementJob) {
    scope.value = AgreementService.buildDefaultScopeOfWork(
      selectedAgreementJob,
      selectedAgreementEstimate || {}
    );
  }
}

function autoFillScopeFromEstimate() {
  const scope = document.getElementById("agreementScope");

  if (!scope || scope.value.trim()) return;

  const job =
    selectedAgreementEstimate?.jobs ||
    selectedAgreementJob ||
    {};

  scope.value = AgreementService.buildDefaultScopeOfWork(
    job,
    selectedAgreementEstimate || {}
  );
}

/* ==========================================================
   CLEAR / CONTEXT
========================================================== */

function clearAgreementJobFields() {
  selectedAgreementJob = null;

  const jobNumberInput = document.getElementById("agreementJobNumber");
  if (jobNumberInput) jobNumberInput.value = "";
}

function clearAgreementEstimateFields() {
  selectedAgreementEstimate = null;

  const estimateInput = document.getElementById("agreementEstimateId");
  if (estimateInput) estimateInput.value = "";

  const estimateSelect = document.getElementById("agreementEstimateSelect");
  if (estimateSelect) estimateSelect.value = "";
}

function updateAgreementContextPanel() {
  setText(
    "agreementContextCustomer",
    selectedAgreementCustomer?.customer_name || "None selected"
  );

  setText(
    "agreementContextJob",
    selectedAgreementJob?.job_number ||
    document.getElementById("agreementJobNumber")?.value ||
    "None selected"
  );

  setText(
    "agreementContextEstimate",
    selectedAgreementEstimate?.estimate_id ||
    document.getElementById("agreementEstimateId")?.value ||
    "None selected"
  );

  setText(
    "agreementContextWork",
    formatAgreementFlooringTypes(
      selectedAgreementJob?.flooring_type ||
      selectedAgreementEstimate?.jobs?.flooring_type
    ) || "Not available"
  );
}

/* ==========================================================
   SAVE AGREEMENT
========================================================== */

async function saveAgreement() {
  const jobNumber = document.getElementById("agreementJobNumber")?.value.trim();
  const estimateId = document.getElementById("agreementEstimateId")?.value.trim() || null;
  const scope = document.getElementById("agreementScope")?.value.trim() || null;
  const terms = document.getElementById("agreementTerms")?.value.trim() || null;
  const warranty = document.getElementById("agreementWarranty")?.value.trim() || null;
  const total = Number(document.getElementById("agreementTotal")?.value || 0);
  const deposit = Number(document.getElementById("agreementDeposit")?.value || 0);
  const balance = Number(document.getElementById("agreementBalance")?.value || 0);

  if (!jobNumber) {
    showMessage("Select a job or enter a job number.");
    return;
  }

  const customerId =
    selectedAgreementCustomer?.customer_id ||
    selectedAgreementJob?.customer_id ||
    selectedAgreementJob?.customers?.customer_id ||
    selectedAgreementEstimate?.customer_id ||
    selectedAgreementEstimate?.jobs?.customer_id ||
    null;

  const payload = {
    job_number: jobNumber,
    customer_id: customerId,
    estimate_id: estimateId,
    scope_of_work: scope,
    terms,
    warranty,
    total,
    deposit,
    balance_due: balance,
    status: AGREEMENT.DEFAULT_STATUS
  };

  const { data: createdAgreement, error } =
    await AgreementService.createAgreement(payload);

  if (error) {
    console.error(error);
    showMessage("Could not save agreement.");
    return;
  }

  if (createdAgreement?.agreement_id) {
    await JobService.updateJob(jobNumber, {
      agreement_id: createdAgreement.agreement_id
    });
  }

  showMessage("Agreement saved.");
  resetAgreementForm();
  await loadAgreements();
}

/* ==========================================================
   RESET
========================================================== */

function resetAgreementForm() {
  const form = document.getElementById("agreementForm");
  if (form) form.reset();

  selectedAgreementCustomer = null;
  selectedAgreementJob = null;
  selectedAgreementEstimate = null;

  loadAgreementJobs();
  loadAgreementEstimatesForJob();
  fillAgreementDefaults();
  updateAgreementContextPanel();
}

/* ==========================================================
   LOAD / RENDER AGREEMENTS
========================================================== */

async function loadAgreements() {
  const container = document.getElementById("agreements");
  if (!container) return;

  container.innerHTML = `<div class="admin-empty-state">Loading agreements...</div>`;

  const { data, error } = await AgreementService.getAgreements();

  if (error) {
    console.error(error);
    container.innerHTML = `<div class="admin-empty-state">Could not load agreements.</div>`;
    return;
  }

  const agreements = data || [];

  if (!agreements.length) {
    container.innerHTML = `
      <div class="admin-empty-state">
        <h3>No agreements yet.</h3>
        <p>Saved customer agreements will appear here.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = agreements.map(agreement => renderAgreementCard(agreement)).join("");
}

function renderAgreementCard(agreement) {
  const job = agreement.jobs || {};
  const customer = job.customers || agreement.customers || {};
  const estimate = agreement.estimates || {};

  return `
    <article class="agreement-card">
      <div class="agreement-card-header">
        <div>
          <p class="eyebrow">${escapeAgreementHtml(agreement.job_number || "Agreement")}</p>
          <h3>${escapeAgreementHtml(customer.customer_name || "Customer not listed")}</h3>
        </div>

        <span class="${getAgreementStatusClass(agreement.status)}">
          ${escapeAgreementHtml(agreement.status || AGREEMENT.DEFAULT_STATUS)}
        </span>
      </div>

      <div class="agreement-card-details">
        <div>
          <span>Total</span>
          <strong>$${formatAgreementMoney(agreement.total || estimate.total || 0)}</strong>
        </div>

        <div>
          <span>Deposit</span>
          <strong>$${formatAgreementMoney(agreement.deposit || estimate.deposit || 0)}</strong>
        </div>

        <div>
          <span>Balance</span>
          <strong>$${formatAgreementMoney(agreement.balance_due || estimate.balance_due || 0)}</strong>
        </div>

        <div>
          <span>Created</span>
          <strong>${formatAgreementDate(agreement.created_at)}</strong>
        </div>
      </div>

      <div class="agreement-card-actions">
        <button class="btn secondary" type="button" onclick="viewAgreement('${agreement.agreement_id}')">
          View
        </button>

        <button class="btn secondary" type="button" onclick="markAgreementSigned('${agreement.agreement_id}')">
          Mark Signed
        </button>

        <button class="btn danger" type="button" onclick="deleteAgreement('${agreement.agreement_id}','${agreement.job_number || ""}')">
          Delete
        </button>
      </div>
    </article>
  `;
}

/* ==========================================================
   VIEW AGREEMENT
========================================================== */

async function viewAgreement(agreementId) {
  const { data: agreement, error } =
    await AgreementService.getAgreement(agreementId);

  if (error || !agreement) {
    console.error(error);
    showMessage("Could not load agreement.");
    return;
  }

  const job = agreement.jobs || {};
  const customer = job.customers || agreement.customers || {};
  const estimate = agreement.estimates || {};
  const signatures = agreement.agreement_signatures || [];

  openAdminModal({
    title: `Agreement ${agreement.agreement_id}`,
    subtitle: customer.customer_name || agreement.job_number || "Agreement",
    wide: true,
    body: `
      <div class="agreement-modal-summary">
        <div><span>Job</span><strong>${escapeAgreementHtml(agreement.job_number || "Not listed")}</strong></div>
        <div><span>Customer</span><strong>${escapeAgreementHtml(customer.customer_name || "Not listed")}</strong></div>
        <div><span>Total</span><strong>$${formatAgreementMoney(agreement.total || estimate.total || 0)}</strong></div>
        <div><span>Status</span><strong>${escapeAgreementHtml(agreement.status || AGREEMENT.DEFAULT_STATUS)}</strong></div>
      </div>

      <div class="agreement-modal-section">
        <h3>Scope of Work</h3>
        <p>${escapeAgreementHtml(agreement.scope_of_work || "No scope of work listed.")}</p>
      </div>

      <div class="agreement-modal-section">
        <h3>Terms</h3>
        <p>${escapeAgreementHtml(agreement.terms || "No terms listed.")}</p>
      </div>

      <div class="agreement-modal-section">
        <h3>Warranty</h3>
        <p>${escapeAgreementHtml(agreement.warranty || "No warranty details listed.")}</p>
      </div>

      <div class="agreement-modal-summary">
        <div><span>Deposit</span><strong>$${formatAgreementMoney(agreement.deposit || estimate.deposit || 0)}</strong></div>
        <div><span>Balance Due</span><strong>$${formatAgreementMoney(agreement.balance_due || estimate.balance_due || 0)}</strong></div>
        <div><span>Estimate</span><strong>${escapeAgreementHtml(agreement.estimate_id || "Not linked")}</strong></div>
        <div><span>Signed</span><strong>${agreement.signed_at ? formatAgreementDate(agreement.signed_at) : "Not signed"}</strong></div>
      </div>

      <div class="agreement-modal-section">
        <h3>Signatures</h3>
        ${
          signatures.length
            ? signatures.map(signature => `
              <div class="agreement-signature-row">
                <strong>${escapeAgreementHtml(signature.signer_name || "Signer")}</strong>
                <span>${formatAgreementDate(signature.signed_at)}</span>
              </div>
            `).join("")
            : `<p>No signatures recorded yet.</p>`
        }
      </div>
    `,
    footer: `
      <button class="btn secondary" type="button" onclick="closeAdminModal()">Close</button>
      <button class="btn" type="button" onclick="markAgreementSigned('${agreement.agreement_id}')">Mark Signed</button>
    `
  });
}

/* ==========================================================
   ACTIONS
========================================================== */

async function markAgreementSigned(agreementId) {
  const { error } = await AgreementService.markAgreementSigned(agreementId);

  if (error) {
    console.error(error);
    showMessage("Could not mark agreement signed.");
    return;
  }

  showMessage("Agreement marked signed.");
  closeAdminModal();
  await loadAgreements();
}

async function deleteAgreement(agreementId, jobNumber) {
  const confirmed = confirm("Delete this agreement? This cannot be undone.");
  if (!confirmed) return;

  const { error } = await AgreementService.deleteAgreement(
    agreementId,
    jobNumber || null
  );

  if (error) {
    console.error(error);
    showMessage("Could not delete agreement.");
    return;
  }

  showMessage("Agreement deleted.");
  await loadAgreements();
}

/* ==========================================================
   URL CONTEXT
========================================================== */

async function applyAgreementUrlContext() {
  await loadAgreementJobs();

  const params = new URLSearchParams(window.location.search);
  const customerId = params.get("customer_id");
  const jobNumber = params.get("job_number");
  const estimateId = params.get("estimate_id");

  if (customerId) {
    const customerSelect = document.getElementById("agreementCustomerSelect");
    if (customerSelect) customerSelect.value = customerId;
    await handleAgreementCustomerChange();
  }

  if (jobNumber) {
    const jobNumberInput = document.getElementById("agreementJobNumber");
    if (jobNumberInput) jobNumberInput.value = jobNumber;

    const jobSelect = document.getElementById("agreementJobSelect");
    const matchingJob = agreementJobs.find(job =>
      String(job.job_number) === String(jobNumber)
    );

    if (matchingJob && jobSelect) {
      jobSelect.value = matchingJob.job_number;
      handleAgreementJobChange();
    }
  }

  if (estimateId) {
    const estimateSelect = document.getElementById("agreementEstimateSelect");
    const matchingEstimate = agreementAllEstimates.find(estimate =>
      String(estimate.estimate_id) === String(estimateId)
    );

    if (matchingEstimate && estimateSelect) {
      loadAgreementEstimatesForJob(matchingEstimate.job_number);
      estimateSelect.value = matchingEstimate.estimate_id;
      handleAgreementEstimateChange();
    }
  }

  updateAgreementContextPanel();
}

/* ==========================================================
   HELPERS
========================================================== */

function getAgreementStatusClass(status) {
  const lower = String(status || "").toLowerCase();

  if (lower.includes("signed") || lower.includes("complete")) {
    return "admin-status-pill completed";
  }

  if (lower.includes("sent") || lower.includes("created") || lower.includes("draft")) {
    return "admin-status-pill pending";
  }

  if (lower.includes("cancel")) {
    return "admin-status-pill danger";
  }

  return "admin-status-pill";
}

function formatAgreementFlooringTypes(flooringType) {
  if (Array.isArray(flooringType)) return flooringType.join(", ");
  return flooringType || "";
}

function formatAgreementMoney(value) {
  return Number(value || 0).toFixed(2);
}

function formatAgreementDate(dateString) {
  if (!dateString) return "Not listed";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Not listed";

  return date.toLocaleDateString(JOB.DATE_FORMAT, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function escapeAgreementHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}