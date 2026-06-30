// admin.js
// Dashboard + shared admin helper functions

window.addEventListener("load", () => {
  setAdminCurrentDate();
  loadDashboardCounts();
  loadDashboardMeasurements();
  loadDashboardInstallations();
  loadDashboardActivity();
});

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

  dateElement.textContent = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric"
  });
}

/* ==========================================================
   DASHBOARD COUNTS
========================================================== */

async function loadDashboardCounts() {
  await setCount("requestCount", "measurement_requests");
  await setCount("overviewPendingCount", "measurement_requests");

  await setActiveJobCount("activeJobCount");
  await setActiveJobCount("overviewActiveJobCount");

  await setCompletedJobCount("completedJobCount");
  await setCompletedJobCount("overviewCompletedCount");

  await setCount("customerCount", "customers", query => query.eq("active", true));
  await setCount("overviewCustomerCount", "customers", query => query.eq("active", true));
}

async function setCount(elementId, tableName, modifier) {
  const element = document.getElementById(elementId);
  if (!element) return;

  let query = db.from(tableName).select("*", { count: "exact", head: true });

  if (typeof modifier === "function") {
    query = modifier(query);
  }

  const { count, error } = await query;

  if (error) {
    console.error(error);
    element.textContent = "—";
    return;
  }

  element.textContent = count || 0;
}

async function setActiveJobCount(elementId) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const { count, error } = await db
    .from("jobs")
    .select("*", { count: "exact", head: true })
    .not("status", "in", '("Completed","Closed","Cancelled")');

  if (error) {
    console.error(error);
    element.textContent = "—";
    return;
  }

  element.textContent = count || 0;
}

async function setCompletedJobCount(elementId) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const { count, error } = await db
    .from("jobs")
    .select("*", { count: "exact", head: true })
    .in("status", ["Completed", "Closed"]);

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

  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await db
    .from("jobs")
    .select(`
      job_number,
      status,
      measurement_date,
      flooring_type,
      customers (
        customer_name,
        address
      )
    `)
    .gte("measurement_date", today)
    .neq("status", "Completed")
    .order("measurement_date", { ascending: true })
    .limit(5);

  if (error) {
    console.error(error);
    container.innerHTML = `<div class="dashboard-empty">Could not load measurements.</div>`;
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `<div class="dashboard-empty">No upcoming measurements yet.</div>`;
    return;
  }

  container.innerHTML = data.map(job => `
    <a class="dashboard-list-item" href="admin-job.html?id=${job.job_number}">
      <div class="dashboard-list-time">${formatAdminDate(job.measurement_date)}</div>

      <div class="dashboard-list-main">
        <strong>${job.customers?.customer_name || "Customer"}</strong>
        <span>${formatAdminFlooringTypes(job.flooring_type) || "Measurement"} · ${job.customers?.address || "No address"}</span>
      </div>

      <span class="admin-status-pill pending">${job.status || "Scheduled"}</span>
    </a>
  `).join("");
}

/* ==========================================================
   UPCOMING INSTALLATIONS
========================================================== */

async function loadDashboardInstallations() {
  const container = document.getElementById("dashboardInstallations");
  if (!container) return;

  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await db
    .from("jobs")
    .select(`
      job_number,
      status,
      install_start_date,
      flooring_type,
      customers (
        customer_name,
        address
      )
    `)
    .gte("install_start_date", today)
    .not("status", "in", '("Completed","Closed","Cancelled")')
    .order("install_start_date", { ascending: true })
    .limit(5);

  if (error) {
    console.error(error);
    container.innerHTML = `<div class="dashboard-empty">Could not load installations.</div>`;
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `<div class="dashboard-empty">No upcoming installations yet.</div>`;
    return;
  }

  container.innerHTML = data.map(job => `
    <a class="dashboard-list-item" href="admin-job.html?id=${job.job_number}">
      <div class="dashboard-list-time">${formatAdminDate(job.install_start_date)}</div>

      <div class="dashboard-list-main">
        <strong>${job.customers?.customer_name || "Customer"}</strong>
        <span>${formatAdminFlooringTypes(job.flooring_type) || "Installation"} · ${job.customers?.address || "No address"}</span>
      </div>

      <span class="${getAdminStatusClass(job.status)}">${job.status || "Scheduled"}</span>
    </a>
  `).join("");
}

/* ==========================================================
   RECENT ACTIVITY
========================================================== */

async function loadDashboardActivity() {
  const container = document.getElementById("dashboardActivity");
  if (!container) return;

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
    .order("created_at", { ascending: false })
    .limit(6);

  if (error) {
    console.error(error);
    container.innerHTML = `<div class="dashboard-empty">Could not load recent activity.</div>`;
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `<div class="dashboard-empty">Recent activity will appear here as work is completed.</div>`;
    return;
  }

  container.innerHTML = data.map(job => `
    <a class="dashboard-activity-item" href="admin-job.html?id=${job.job_number}">
      <span class="dashboard-activity-icon">✓</span>

      <div>
        <strong>${job.job_number}</strong>
        <span>${job.customers?.customer_name || "Customer"} · ${job.status || "Job created"} · ${formatAdminDate(job.created_at)}</span>
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

  return date.toLocaleDateString("en-US", {
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

  const lower = status.toLowerCase();

  if (lower.includes("progress")) return "admin-status-pill in-progress";
  if (lower.includes("complete") || lower.includes("closed")) return "admin-status-pill completed";
  if (lower.includes("cancel")) return "admin-status-pill danger";
  if (lower.includes("scheduled") || lower.includes("estimate")) return "admin-status-pill pending";

  return "admin-status-pill";
}