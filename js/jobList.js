// jobList.js

let allJobs = [];
let allPendingRequests = [];
let allCustomersForWizard = [];

let selectedRequestId = null;
let newJobMode = "existing";
let selectedWizardCustomerId = null;

const JOB_STATUS_GROUPS = [
  "Measurement Scheduled",
  "Measurement Completed",
  "Estimate Sent",
  "Deposit Received",
  "Installation Scheduled",
  "Installation In Progress",
  "Final Walkthrough",
  "Completed"
];

window.addEventListener("load", () => {
  loadJobListPage();

  const searchInput = document.getElementById("jobSearch");
  const statusFilter = document.getElementById("jobStatusFilter");
  const sortSelect = document.getElementById("jobSort");
  const newJobButton = document.getElementById("newJobButton");

  if (searchInput) searchInput.addEventListener("input", renderFilteredJobs);
  if (statusFilter) statusFilter.addEventListener("change", renderFilteredJobs);
  if (sortSelect) sortSelect.addEventListener("change", renderFilteredJobs);

  if (newJobButton) {
    newJobButton.addEventListener("click", openNewJobWizard);
  }

  applyJobListUrlFilters();
});

async function loadJobListPage() {
  await Promise.all([
    loadPendingMeasurementRequests(),
    loadJobList()
  ]);
}

/* ==========================================================
   PENDING REQUESTS
========================================================== */

async function loadPendingMeasurementRequests() {
  const container = document.getElementById("pendingRequests");
  const count = document.getElementById("pendingRequestCount");

  if (!container) return;

  container.innerHTML = `<div class="admin-empty-state">Loading measurement requests...</div>`;

  const { data, error } = await db
    .from("measurement_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    container.innerHTML = `<div class="admin-empty-state">Could not load measurement requests.</div>`;
    if (count) count.textContent = "0";
    return;
  }

  allPendingRequests = data || [];
  if (count) count.textContent = allPendingRequests.length;

  renderPendingRequests();
}

function renderPendingRequests() {
  const container = document.getElementById("pendingRequests");
  if (!container) return;

  container.innerHTML = "";

  if (!allPendingRequests.length) {
    container.innerHTML = `<div class="admin-empty-state">No pending measurement requests.</div>`;
    return;
  }

  allPendingRequests.forEach(request => {
    const flooringTypes = formatJobFlooringTypes(request.flooring_type);

    const card = document.createElement("article");
    card.className = "pending-request-card";

    card.innerHTML = `
      <div class="pending-request-body">
        <div class="pending-request-header">
          <div>
            <p class="eyebrow">Measurement Request</p>
            <h3>${request.customer_name || "Unnamed Customer"}</h3>
          </div>
          <span class="admin-status-pill pending">Pending</span>
        </div>

        <div class="pending-request-details">
          <div class="pending-request-item">
            <span>Requested Work</span>
            <strong>${flooringTypes || "Not listed"}</strong>
          </div>

          <div class="pending-request-item">
            <span>Phone</span>
            <strong>${request.phone || "Not listed"}</strong>
          </div>

          <div class="pending-request-item">
            <span>Preferred Measurement Date</span>
            <strong>${formatJobDate(request.preferred_measurement_date) || "Not provided"}</strong>
          </div>

          <div class="pending-request-item">
            <span>Description Preview</span>
            <strong>${request.description ? truncateText(request.description, 90) : "No description provided."}</strong>
          </div>
        </div>
      </div>

      <div class="pending-request-footer">
        <button class="btn" type="button" onclick="openRequestDetails('${request.request_id}')">
          View Details
        </button>
      </div>
    `;

    container.appendChild(card);
  });
}

function openRequestDetails(requestId) {
  const request = allPendingRequests.find(item => String(item.request_id) === String(requestId));

  if (!request) {
    showMessage("Could not find request details.");
    return;
  }

  selectedRequestId = requestId;

  const flooringTypes = formatJobFlooringTypes(request.flooring_type);

  openAdminModal({
    title: request.customer_name || "Unnamed Customer",
    subtitle: "Pending Measurement Request",
    wide: true,
    body: `
      <section class="request-review-section">
        <h3>Contact Information</h3>

        <div class="request-review-grid">
          <div class="pending-request-item">
            <span>Phone</span>
            <strong>${request.phone || "Not listed"}</strong>
          </div>

          <div class="pending-request-item">
            <span>Email</span>
            <strong>${request.email || "Not listed"}</strong>
          </div>

          <div class="pending-request-item full-width">
            <span>Address</span>
            <strong>${request.address || "Not listed"}</strong>
          </div>
        </div>
      </section>

      <section class="request-review-section">
        <h3>Project Information</h3>

        <div class="request-review-grid">
          <div class="pending-request-item">
            <span>Requested Flooring</span>
            <strong>${flooringTypes || "Not listed"}</strong>
          </div>

          <div class="pending-request-item">
            <span>Preferred Measurement Date</span>
            <strong>${formatJobDate(request.preferred_measurement_date) || "Not provided"}</strong>
          </div>

          <div class="pending-request-item full-width">
            <span>Project Description</span>
            <strong>${request.description || "No description provided."}</strong>
          </div>
        </div>
      </section>

      <section class="request-review-section">
        <h3>Reference Photos</h3>
        <div class="admin-empty-state">
          Customer photo uploads will appear here later.
        </div>
      </section>
    `,
    footer: `
      <button class="btn secondary" type="button" onclick="closeAdminModal()">
        Close
      </button>

      <button class="btn secondary" type="button" onclick="declineRequestFromModal()">
        Decline Request
      </button>

      <button class="btn" type="button" onclick="acceptRequestFromModal()">
        Accept Request
      </button>
    `
  });
}

async function acceptRequestFromModal() {
  if (!selectedRequestId) {
    showMessage("No request selected.");
    return;
  }

  await acceptPendingRequest(selectedRequestId);
  selectedRequestId = null;
  closeAdminModal();
}

async function declineRequestFromModal() {
  if (!selectedRequestId) {
    showMessage("No request selected.");
    return;
  }

  await declinePendingRequest(selectedRequestId);
  selectedRequestId = null;
  closeAdminModal();
}

async function acceptPendingRequest(requestId) {
  if (typeof acceptRequest !== "function") {
    showMessage("Accept request function not found.");
    return;
  }

  await acceptRequest(requestId);
  await loadJobListPage();

  if (typeof loadDashboardCounts === "function") {
    loadDashboardCounts();
  }
}

async function declinePendingRequest(requestId) {
  if (!confirm("Decline this measurement request?")) return;

  if (typeof declineRequest === "function") {
    await declineRequest(requestId);
    await loadJobListPage();
    return;
  }

  const { error } = await db
    .from("measurement_requests")
    .delete()
    .eq("request_id", requestId);

  if (error) {
    console.error(error);
    showMessage("Could not decline measurement request.");
    return;
  }

  showMessage("Measurement request declined.");
  await loadJobListPage();
}

/* ==========================================================
   NEW JOB WIZARD
========================================================== */

async function openNewJobWizard() {
  newJobMode = "existing";
  selectedWizardCustomerId = null;

  const { data, error } = await db
    .from("customers")
    .select("*")
    .eq("active", true)
    .order("customer_name", { ascending: true });

  if (error) {
    console.error(error);
    showErrorModal("Unable to Load Customers", "Could not load customer list.");
    return;
  }

  allCustomersForWizard = data || [];
  renderNewJobStepOne();
}

function renderNewJobStepOne() {
  openAdminModal({
    title: "Create New Job",
    subtitle: "Step 1 of 2",
    wide: true,
    body: `
      <div class="admin-modal-choice-grid">
        <div class="admin-modal-choice active" id="choiceExistingCustomer" onclick="setNewJobMode('existing')">
          <strong>Existing Customer</strong>
          <span>Create a new job under an existing customer profile.</span>
        </div>

        <div class="admin-modal-choice" id="choiceNewCustomer" onclick="setNewJobMode('new')">
          <strong>New Customer</strong>
          <span>Create a customer profile and attach the new job.</span>
        </div>
      </div>

      <div id="newJobCustomerArea">
        ${renderExistingCustomerSelector()}
      </div>
    `,
    footer: `
      <button class="btn secondary" onclick="closeAdminModal()">Cancel</button>
      <button class="btn" onclick="goToNewJobStepTwo()">Continue</button>
    `
  });
}

function setNewJobMode(mode) {
  newJobMode = mode;
  selectedWizardCustomerId = null;

  const existingChoice = document.getElementById("choiceExistingCustomer");
  const newChoice = document.getElementById("choiceNewCustomer");
  const area = document.getElementById("newJobCustomerArea");

  if (existingChoice) existingChoice.classList.toggle("active", mode === "existing");
  if (newChoice) newChoice.classList.toggle("active", mode === "new");

  if (!area) return;

  area.innerHTML = mode === "existing"
    ? renderExistingCustomerSelector()
    : renderNewCustomerFields();
}

function renderExistingCustomerSelector() {
  return `
    <div class="admin-modal-field full-width" style="margin-top:18px;">
      <label for="newJobCustomerSearch">Search Customers</label>
      <input id="newJobCustomerSearch" type="search" placeholder="Search by name, phone, email, or address..." oninput="filterWizardCustomers()">
    </div>

    <div id="wizardCustomerList" class="admin-modal-list" style="margin-top:14px;">
      ${renderWizardCustomerList(allCustomersForWizard)}
    </div>
  `;
}

function renderWizardCustomerList(customers) {
  if (!customers.length) {
    return `<div class="admin-empty-state">No customers found.</div>`;
  }

  return customers.map(customer => `
    <div class="admin-modal-list-item" onclick="selectWizardCustomer('${customer.customer_id}', this)">
      <strong>${customer.customer_name || "Unnamed Customer"}</strong>
      <span>${customer.phone || "No phone"} · ${customer.email || "No email"}</span>
      <span>${customer.address || "No address"}</span>
    </div>
  `).join("");
}

function filterWizardCustomers() {
  const input = document.getElementById("newJobCustomerSearch");
  const list = document.getElementById("wizardCustomerList");

  if (!input || !list) return;

  const searchTerm = input.value.toLowerCase().trim();

  const filtered = allCustomersForWizard.filter(customer => {
    const name = customer.customer_name?.toLowerCase() || "";
    const phone = customer.phone?.toLowerCase() || "";
    const email = customer.email?.toLowerCase() || "";
    const address = customer.address?.toLowerCase() || "";

    return (
      name.includes(searchTerm) ||
      phone.includes(searchTerm) ||
      email.includes(searchTerm) ||
      address.includes(searchTerm)
    );
  });

  list.innerHTML = renderWizardCustomerList(filtered);
}

function selectWizardCustomer(customerId, element) {
  selectedWizardCustomerId = customerId;

  document.querySelectorAll(".admin-modal-list-item").forEach(item => {
    item.classList.remove("active");
  });

  element.classList.add("active");
}

function renderNewCustomerFields() {
  return `
    <div class="admin-modal-grid" style="margin-top:18px;">
      <div class="admin-modal-field">
        <label for="wizardCustomerName">Customer Name</label>
        <input id="wizardCustomerName" type="text" placeholder="Customer name">
      </div>

      <div class="admin-modal-field">
        <label for="wizardCustomerPhone">Phone</label>
        <input id="wizardCustomerPhone" type="tel" placeholder="Phone number">
      </div>

      <div class="admin-modal-field">
        <label for="wizardCustomerEmail">Email</label>
        <input id="wizardCustomerEmail" type="email" placeholder="Email address">
      </div>

      <div class="admin-modal-field">
        <label for="wizardCustomerAddress">Address</label>
        <input id="wizardCustomerAddress" type="text" placeholder="Job/customer address">
      </div>
    </div>
  `;
}

function goToNewJobStepTwo() {
  if (newJobMode === "existing" && !selectedWizardCustomerId) {
    showMessage("Please select a customer.");
    return;
  }

  if (newJobMode === "new") {
    const name = document.getElementById("wizardCustomerName")?.value.trim();

    if (!name) {
      showMessage("Please enter the customer name.");
      return;
    }
  }

  renderNewJobStepTwo();
}

function renderNewJobStepTwo() {
  openAdminModal({
    title: "Create New Job",
    subtitle: "Step 2 of 2",
    wide: true,
    body: `
      <div class="admin-modal-grid">
        <div class="admin-modal-field">
          <label for="wizardFlooringType">Flooring Type</label>
          <select id="wizardFlooringType">
            <option value="">Select flooring type</option>
            <option value="Hardwood">Hardwood</option>
            <option value="Luxury Vinyl Plank">Luxury Vinyl Plank</option>
            <option value="Laminate">Laminate</option>
            <option value="Tile">Tile</option>
            <option value="Carpet Removal">Carpet Removal</option>
            <option value="Repair">Repair</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div class="admin-modal-field">
          <label for="wizardMeasurementDate">Measurement Date</label>
          <input id="wizardMeasurementDate" type="date">
        </div>

        <div class="admin-modal-field">
          <label for="wizardJobStatus">Status</label>
          <select id="wizardJobStatus">
            <option value="Measurement Scheduled">Measurement Scheduled</option>
            <option value="Measurement Completed">Measurement Completed</option>
            <option value="Estimate Sent">Estimate Sent</option>
            <option value="Deposit Received">Deposit Received</option>
            <option value="Installation Scheduled">Installation Scheduled</option>
            <option value="Installation In Progress">Installation In Progress</option>
            <option value="Final Walkthrough">Final Walkthrough</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        <div class="admin-modal-field full-width">
          <label for="wizardJobDescription">Job Description</label>
          <textarea id="wizardJobDescription" placeholder="Describe the work being requested..."></textarea>
        </div>
      </div>
    `,
    footer: `
      <button class="btn secondary" onclick="renderNewJobStepOne()">Back</button>
      <button class="btn secondary" onclick="closeAdminModal()">Cancel</button>
      <button class="btn" onclick="createJobFromWizard()">Create Job</button>
    `
  });
}

async function createJobFromWizard() {
  const flooringType = document.getElementById("wizardFlooringType")?.value;
  const measurementDate = document.getElementById("wizardMeasurementDate")?.value || null;
  const status = document.getElementById("wizardJobStatus")?.value || "Measurement Scheduled";
  const description = document.getElementById("wizardJobDescription")?.value.trim();

  if (!flooringType) {
    showMessage("Please select a flooring type.");
    return;
  }

  let customerId = selectedWizardCustomerId;

  if (newJobMode === "new") {
    const customerName = document.getElementById("wizardCustomerName")?.value.trim();
    const phone = document.getElementById("wizardCustomerPhone")?.value.trim();
    const email = document.getElementById("wizardCustomerEmail")?.value.trim();
    const address = document.getElementById("wizardCustomerAddress")?.value.trim();

    const { data: createdCustomer, error: customerError } = await db
      .from("customers")
      .insert([{
        customer_name: customerName,
        phone,
        email,
        address,
        active: true
      }])
      .select()
      .single();

    if (customerError) {
      console.error(customerError);
      showErrorModal("Unable to Create Customer", "The customer could not be created.");
      return;
    }

    customerId = createdCustomer.customer_id;
  }

  const jobNumber = typeof generateSupabaseJobNumber === "function"
    ? await generateSupabaseJobNumber()
    : `CS-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;

  const { error: jobError } = await db
    .from("jobs")
    .insert([{
      job_number: jobNumber,
      customer_id: customerId,
      flooring_type: [flooringType],
      description,
      measurement_date: measurementDate,
      install_start_date: null,
      install_end_date: null,
      install_price: null,
      status,
      estimate_id: null,
      agreement_id: null
    }]);

  if (jobError) {
    console.error(jobError);
    showErrorModal("Unable to Create Job", "The job could not be created.");
    return;
  }

  closeAdminModal();
  window.location.href = `admin-job.html?id=${jobNumber}`;
}

/* ==========================================================
   ACCEPTED JOBS
========================================================== */

async function loadJobList() {
  const container = document.getElementById("jobListGroups");
  if (!container) return;

  container.innerHTML = `<div class="admin-empty-state">Loading jobs...</div>`;

  const { data, error } = await db
    .from("jobs")
    .select(`
      *,
      customers (
        customer_id,
        customer_name,
        email,
        phone,
        address
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    container.innerHTML = `<div class="admin-empty-state">Could not load jobs.</div>`;
    return;
  }

  allJobs = data || [];
  renderFilteredJobs();
}

function renderFilteredJobs() {
  const searchInput = document.getElementById("jobSearch");
  const statusFilter = document.getElementById("jobStatusFilter");
  const sortSelect = document.getElementById("jobSort");

  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : "";
  const selectedStatus = statusFilter ? statusFilter.value : "All";

  const params = new URLSearchParams(window.location.search);
  const urlStatus = params.get("status");
  const sortBy = sortSelect ? sortSelect.value : "recent";

  let jobs = allJobs.filter(job => {
    const jobNumber = job.job_number ? job.job_number.toLowerCase() : "";
    const status = job.status ? job.status.toLowerCase() : "";
    const customerName = job.customers?.customer_name ? job.customers.customer_name.toLowerCase() : "";
    const address = job.customers?.address ? job.customers.address.toLowerCase() : "";
    const flooringTypes = formatJobFlooringTypes(job.flooring_type).toLowerCase();

    const matchesSearch =
      searchTerm === "" ||
      jobNumber.includes(searchTerm) ||
      status.includes(searchTerm) ||
      customerName.includes(searchTerm) ||
      address.includes(searchTerm) ||
      flooringTypes.includes(searchTerm);

    const normalizedJobStatus = normalizeJobStatus(job.status);

    const matchesStatus =
      urlStatus === "active"
        ? !["Completed", "Closed", "Cancelled"].includes(normalizedJobStatus)
        : selectedStatus === "All" || normalizedJobStatus === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  jobs = sortJobs(jobs, sortBy);
  renderJobGroups(jobs, selectedStatus);
}

function sortJobs(jobs, sortBy) {
  const sorted = [...jobs];

  if (sortBy === "recent") {
    sorted.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }

  if (sortBy === "jobNumber") {
    sorted.sort((a, b) => String(a.job_number || "").localeCompare(String(b.job_number || "")));
  }

  if (sortBy === "customer") {
    sorted.sort((a, b) => {
      const nameA = a.customers?.customer_name || "";
      const nameB = b.customers?.customer_name || "";
      return nameA.localeCompare(nameB);
    });
  }

  if (sortBy === "status") {
    sorted.sort((a, b) => normalizeJobStatus(a.status).localeCompare(normalizeJobStatus(b.status)));
  }

  return sorted;
}

function renderJobGroups(jobs, selectedStatus) {
  const container = document.getElementById("jobListGroups");
  if (!container) return;

  container.innerHTML = "";

  if (!jobs.length) {
    container.innerHTML = `
      <div class="admin-empty-state">
        <h3>No accepted jobs found.</h3>
        <p>Accepted measurement requests will appear here as jobs.</p>
      </div>
    `;
    return;
  }

  const groupsToShow =
    selectedStatus === "All"
      ? JOB_STATUS_GROUPS
      : [selectedStatus];

  groupsToShow.forEach(status => {
    const groupJobs = jobs.filter(job => normalizeJobStatus(job.status) === status);

    if (!groupJobs.length) return;

    const section = document.createElement("section");
    section.className = "job-group";

    section.innerHTML = `
      <div class="job-group-header">
        <div class="job-group-title">
          <h2>${status}</h2>
          <span class="job-count">${groupJobs.length}</span>
        </div>
      </div>

      <div class="job-grid">
        ${groupJobs.map(job => renderJobCard(job)).join("")}
      </div>
    `;

    container.appendChild(section);
  });
}

function renderJobCard(job) {
  const customer = job.customers || {};
  const customerName = customer.customer_name || "No customer listed";
  const address = customer.address || "No address listed";
  const flooringTypes = formatJobFlooringTypes(job.flooring_type);
  const normalizedStatus = normalizeJobStatus(job.status);

  return `
    <article class="job-card" onclick="window.location.href='admin-job.html?id=${job.job_number}'">
      <div class="job-card-body">
        <div class="job-card-header">
          <div>
            <p class="job-number">${job.job_number || "No Job Number"}</p>
            <h3>${customerName}</h3>
          </div>

          <span class="${getJobStatusClass(normalizedStatus)}">
            ${normalizedStatus}
          </span>
        </div>

        <div class="job-card-details">
          <div class="job-detail">
            <span>Requested Work</span>
            <strong>${flooringTypes || "Not listed"}</strong>
          </div>

          <div class="job-detail">
            <span>Address</span>
            <strong>${address}</strong>
          </div>

          <div class="job-detail">
            <span>Measurement Date</span>
            <strong>${formatJobDate(job.measurement_date) || "Not scheduled"}</strong>
          </div>

          <div class="job-detail">
            <span>Install Start</span>
            <strong>${formatJobDate(job.install_start_date) || "Not scheduled"}</strong>
          </div>
        </div>
      </div>

      <div class="job-card-footer">
        <span>Open Job</span>
        <strong>→</strong>
      </div>
    </article>
  `;
}

/* ==========================================================
   HELPERS
========================================================== */

function normalizeJobStatus(status) {
  const aliases = {
    "Measurement Complete": "Measurement Completed",
    "Estimate Generated": "Estimate Sent",
    "Ready To Schedule": "Deposit Received",
    "Scheduled": "Installation Scheduled",
    "In Progress": "Installation In Progress",
    "Closed": "Completed"
  };

  return aliases[status] || status || "Measurement Scheduled";
}

function getJobStatusClass(status) {
  const lower = status.toLowerCase();

  if (lower.includes("progress")) return "admin-status-pill in-progress";
  if (lower.includes("complete")) return "admin-status-pill completed";
  if (lower.includes("cancel")) return "admin-status-pill danger";
  if (lower.includes("scheduled") || lower.includes("estimate")) return "admin-status-pill pending";

  return "admin-status-pill";
}

function formatJobFlooringTypes(flooringType) {
  if (Array.isArray(flooringType)) return flooringType.join(", ");
  return flooringType || "";
}

function formatJobDate(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString + "T00:00:00");
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function truncateText(text, maxLength) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength).trim()}...`;
}

function applyJobListUrlFilters() {
  const params = new URLSearchParams(window.location.search);
  const status = params.get("status");
  const view = params.get("view");

  const statusFilter = document.getElementById("jobStatusFilter");

  if (statusFilter && status) {
    if (status === "active") {
      statusFilter.value = "All";
    } else {
      statusFilter.value = status;
    }
  }

  if (view === "pending") {
    setTimeout(() => {
      document.querySelector(".job-request-panel")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 400);
  }

  if (status === "Completed") {
    setTimeout(() => {
      document.getElementById("jobStatusFilter")?.dispatchEvent(new Event("change"));
    }, 300);
  }
}