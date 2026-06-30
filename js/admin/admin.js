// admin.js
// Dashboard + shared admin helper functions

window.addEventListener("load", () => {
  initializeAdminDashboard();
});

/* ==========================================================
   INITIALIZE
========================================================== */

async function initializeAdminDashboard() {
  setAdminCurrentDate();

  await loadDashboardCounts();
  await loadDashboardMeasurements();
  await loadDashboardInstallations();
  await loadDashboardActivity();
}

/* ==========================================================
   MOBILE ADMIN NAV
========================================================== */

function toggleAdminNav() {
  document.body.classList.toggle("admin-nav-open");
}

function closeAdminNav() {
  document.body.classList.remove("admin-nav-open");
}

/* ==========================================================
   DATE
========================================================== */

function setAdminCurrentDate() {
  const dateElement = document.getElementById("adminCurrentDate");

  if (!dateElement) return;

  const today = new Date();

  dateElement.textContent = today.toLocaleDateString(JOB.DATE_FORMAT, {
    weekday: "long",
    month: "long",
    day: "numeric"
  });
}

/* ==========================================================
   DASHBOARD COUNTS
========================================================== */

async function loadDashboardCounts() {
  await setPendingRequestCount("requestCount");
  await setPendingRequestCount("overviewPendingCount");

  await setActiveJobCount("activeJobCount");
  await setActiveJobCount("overviewActiveJobCount");

  await setCompletedJobCount("completedJobCount");
  await setCompletedJobCount("overviewCompletedCount");

  await setActiveCustomerCount("customerCount");
  await setActiveCustomerCount("overviewCustomerCount");
}

async function setPendingRequestCount(elementId) {
  const element = document.getElementById(elementId);

  if (!element) return;

  const { count, error } =
    await RequestService.getPendingRequestCount();

  setDashboardCountElement(element, count, error);
}

async function setActiveJobCount(elementId) {
  const element = document.getElementById(elementId);

  if (!element) return;

  const { count, error } =
    await JobService.getActiveJobCount();

  setDashboardCountElement(element, count, error);
}

async function setCompletedJobCount(elementId) {
  const element = document.getElementById(elementId);

  if (!element) return;

  const { count, error } =
    await JobService.getCompletedJobCount();

  setDashboardCountElement(element, count, error);
}

async function setActiveCustomerCount(elementId) {
  const element = document.getElementById(elementId);

  if (!element) return;

  const { count, error } =
    await CustomerService.getActiveCustomerCount();

  setDashboardCountElement(element, count, error);
}

function setDashboardCountElement(element, count, error) {
  if (error) {
    console.error(error);
    element.textContent = "—";
    return;
  }

  element.textContent = count || 0;
}

/* ==========================================================
   UPCOMING MEASUREMENTS
========================================================== */

async function loadDashboardMeasurements() {
  const container = document.getElementById("dashboardMeasurements");

  if (!container) return;

  const { data, error } =
    await JobService.getUpcomingMeasurements(PAGINATION.DASHBOARD_RECENT);

  if (error) {
    console.error(error);
    container.innerHTML = `
      <div class="dashboard-empty">
        Could not load measurements.
      </div>
    `;
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `
      <div class="dashboard-empty">
        No upcoming measurements yet.
      </div>
    `;
    return;
  }

  container.innerHTML = data.map(job => `
    <a class="dashboard-list-item" href="${ROUTES.JOB}?id=${job.job_number}">
      <div class="dashboard-list-time">
        ${formatAdminDate(job.measurement_date)}
      </div>

      <div class="dashboard-list-main">
        <strong>
          ${job.customers?.customer_name || "Customer"}
        </strong>

        <span>
          ${formatAdminFlooringTypes(job.flooring_type) || "Measurement"}
          ·
          ${job.customers?.address || "No address"}
        </span>
      </div>

      <span class="${getAdminStatusClass(job.status)}">
        ${job.status || JOB_STATUS.MEASUREMENT_SCHEDULED}
      </span>
    </a>
  `).join("");
}

/* ==========================================================
   UPCOMING INSTALLATIONS
========================================================== */

async function loadDashboardInstallations() {
  const container = document.getElementById("dashboardInstallations");

  if (!container) return;

  const { data, error } =
    await JobService.getUpcomingInstallations(PAGINATION.DASHBOARD_RECENT);

  if (error) {
    console.error(error);
    container.innerHTML = `
      <div class="dashboard-empty">
        Could not load installations.
      </div>
    `;
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `
      <div class="dashboard-empty">
        No upcoming installations yet.
      </div>
    `;
    return;
  }

  container.innerHTML = data.map(job => `
    <a class="dashboard-list-item" href="${ROUTES.JOB}?id=${job.job_number}">
      <div class="dashboard-list-time">
        ${formatAdminDate(job.install_start_date)}
      </div>

      <div class="dashboard-list-main">
        <strong>
          ${job.customers?.customer_name || "Customer"}
        </strong>

        <span>
          ${formatAdminFlooringTypes(job.flooring_type) || "Installation"}
          ·
          ${job.customers?.address || "No address"}
        </span>
      </div>

      <span class="${getAdminStatusClass(job.status)}">
        ${job.status || JOB_STATUS.INSTALLATION_SCHEDULED}
      </span>
    </a>
  `).join("");
}

/* ==========================================================
   RECENT ACTIVITY
========================================================== */

async function loadDashboardActivity() {
  const container = document.getElementById("dashboardActivity");

  if (!container) return;

  const { data, error } =
    await JobService.getRecentJobs(PAGINATION.DASHBOARD_RECENT);

  if (error) {
    console.error(error);
    container.innerHTML = `
      <div class="dashboard-empty">
        Could not load recent activity.
      </div>
    `;
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `
      <div class="dashboard-empty">
        Recent activity will appear here as work is completed.
      </div>
    `;
    return;
  }

  container.innerHTML = data.map(job => `
    <a class="dashboard-activity-item" href="${ROUTES.JOB}?id=${job.job_number}">
      <span class="dashboard-activity-icon">
        ✓
      </span>

      <div>
        <strong>
          ${job.job_number}
        </strong>

        <span>
          ${job.customers?.customer_name || "Customer"}
          ·
          ${job.status || "Job created"}
          ·
          ${formatAdminDate(job.created_at)}
        </span>
      </div>
    </a>
  `).join("");
}

/* ==========================================================
   HELPERS
========================================================== */

function formatAdminDate(dateString) {
  if (!dateString) return "Not set";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }

  return date.toLocaleDateString(JOB.DATE_FORMAT, {
    month: "short",
    day: "numeric"
  });
}

function formatAdminFlooringTypes(flooringType) {
  if (Array.isArray(flooringType)) {
    return flooringType.join(", ");
  }

  return flooringType || "";
}

function getAdminStatusClass(status) {
  if (!status) return "admin-status-pill";

  const normalizedStatus = String(status).toLowerCase();

  if (normalizedStatus.includes("progress")) {
    return "admin-status-pill in-progress";
  }

  if (
    normalizedStatus.includes("complete") ||
    normalizedStatus.includes("closed")
  ) {
    return "admin-status-pill completed";
  }

  if (normalizedStatus.includes("cancel")) {
    return "admin-status-pill danger";
  }

  if (
    normalizedStatus.includes("scheduled") ||
    normalizedStatus.includes("estimate") ||
    normalizedStatus.includes("measurement")
  ) {
    return "admin-status-pill pending";
  }

  return "admin-status-pill";
}