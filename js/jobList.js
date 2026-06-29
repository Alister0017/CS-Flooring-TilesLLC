// jobList.js

let allJobs = [];

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
  loadJobList();

  const searchInput = document.getElementById("jobSearch");
  const statusFilter = document.getElementById("jobStatusFilter");
  const sortSelect = document.getElementById("jobSort");
  const newJobButton = document.getElementById("newJobButton");

  if (searchInput) searchInput.addEventListener("input", renderFilteredJobs);
  if (statusFilter) statusFilter.addEventListener("change", renderFilteredJobs);
  if (sortSelect) sortSelect.addEventListener("change", renderFilteredJobs);

  if (newJobButton) {
    newJobButton.addEventListener("click", () => {
      alert("New Job workflow will be added next.");
    });
  }
});

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
        <h3>No jobs found.</h3>
        <p>Try changing your search or status filter.</p>
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
          <span class="${getJobStatusClass(normalizedStatus)}">${normalizedStatus}</span>
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