// jobList.js

let allJobs = [];
let allPendingRequests = [];
let selectedRequestId = null;

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
    newJobButton.addEventListener("click", () => {
      alert("New Job workflow will be added later.");
    });
  }
});

async function loadJobListPage() {
  await Promise.all([
    loadPendingMeasurementRequests(),
    loadJobList()
  ]);
}

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

  if (count) {
    count.textContent = allPendingRequests.length;
  }

  renderPendingRequests();
}

function renderPendingRequests() {
  const container = document.getElementById("pendingRequests");
  if (!container) return;

  container.innerHTML = "";

  if (!allPendingRequests || allPendingRequests.length === 0) {
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

  let modal = document.getElementById("requestReviewModal");

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "requestReviewModal";
    modal.className = "request-review-modal";
    document.body.appendChild(modal);
  }

  const flooringTypes = formatJobFlooringTypes(request.flooring_type);

  modal.innerHTML = `
    <div class="request-review-backdrop" onclick="closeRequestDetails()"></div>

    <div class="request-review-panel">
      <div class="request-review-header">
        <div>
          <p class="eyebrow">Pending Measurement Request</p>
          <h2>${request.customer_name || "Unnamed Customer"}</h2>
        </div>

        <button class="request-review-close" type="button" onclick="closeRequestDetails()">
          ×
        </button>
      </div>

      <div class="request-review-content">
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
      </div>

      <div class="request-review-actions">
        <button class="btn secondary" type="button" onclick="closeRequestDetails()">
          Close
        </button>

        <button class="btn secondary" type="button" onclick="declineRequestFromModal()">
          Decline Request
        </button>

        <button class="btn" type="button" onclick="acceptRequestFromModal()">
          Accept Request
        </button>
      </div>
    </div>
  `;

  document.body.classList.add("request-review-open");
}

function closeRequestDetails() {
  document.body.classList.remove("request-review-open");
  selectedRequestId = null;

  const modal = document.getElementById("requestReviewModal");

  if (modal) {
    modal.innerHTML = "";
  }
}

async function acceptRequestFromModal() {
  if (!selectedRequestId) {
    showMessage("No request selected.");
    return;
  }

  await acceptPendingRequest(selectedRequestId);
  closeRequestDetails();
}

async function declineRequestFromModal() {
  if (!selectedRequestId) {
    showMessage("No request selected.");
    return;
  }

  await declinePendingRequest(selectedRequestId);
  closeRequestDetails();
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

    const matchesStatus =
      selectedStatus === "All" ||
      normalizeJobStatus(job.status) === selectedStatus;

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

  if (!jobs || jobs.length === 0) {
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

    if (groupJobs.length === 0) return;

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

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.substring(0, maxLength).trim()}...`;
}