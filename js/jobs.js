// job.js

window.addEventListener("load", loadJobDetail);

async function loadJobDetail() {
  const params = new URLSearchParams(window.location.search);
  const jobNumber = params.get("id");
  const container = document.getElementById("jobDetail");

  if (!container) return;

  if (!jobNumber) {
    container.innerHTML = `
      <div class="admin-empty-state">
        <h3>No job selected.</h3>
        <p>Return to the job list and choose a job.</p>
      </div>
    `;
    return;
  }

  const { data: job, error } = await db
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
    .eq("job_number", jobNumber)
    .single();

  if (error || !job) {
    console.error(error);
    container.innerHTML = `
      <div class="admin-empty-state">
        <h3>Job not found.</h3>
        <p>This job may have been deleted or the link may be incorrect.</p>
      </div>
    `;
    return;
  }

  updateJobHeader(job);
  renderJobDetail(job);
}

function updateJobHeader(job) {
  const title = document.getElementById("jobPageTitle");
  const breadcrumb = document.getElementById("jobBreadcrumbName");

  if (title) {
    title.textContent = job.job_number || "Job Details";
  }

  if (breadcrumb) {
    breadcrumb.textContent = job.job_number || "Job";
  }
}

function renderJobDetail(job) {
  const container = document.getElementById("jobDetail");
  if (!container) return;

  const customer = job.customers || {};
  const flooringTypes = formatJobDetailFlooringTypes(job.flooring_type);
  const status = normalizeJobDetailStatus(job.status);

  container.innerHTML = `
    <section class="detail-summary job-summary">
      <div class="detail-card">
        <p class="eyebrow">Job Summary</p>
        <h2>${job.job_number || "Job Details"}</h2>

        <div class="detail-grid">
          <div class="detail-item">
            <span>Status</span>
            <strong>${status}</strong>
          </div>

          <div class="detail-item">
            <span>Customer</span>
            <strong>${customer.customer_name || "Not listed"}</strong>
          </div>

          <div class="detail-item">
            <span>Requested Work</span>
            <strong>${flooringTypes || "Not listed"}</strong>
          </div>

          <div class="detail-item">
            <span>Created</span>
            <strong>${formatJobDetailDate(job.created_at) || "Not available"}</strong>
          </div>

          <div class="detail-item full-width">
            <span>Description</span>
            <strong>${job.description || "No description provided."}</strong>
          </div>
        </div>
      </div>

      <div class="detail-card">
        <p class="eyebrow">Project Status</p>
        <h2>Overview</h2>

        <div class="detail-stat-grid">
          <div class="detail-stat">
            <span>Status</span>
            <strong>${status}</strong>
          </div>

          <div class="detail-stat">
            <span>Install Price</span>
            <strong>${job.install_price ? formatMoney(job.install_price) : "Not Set"}</strong>
          </div>

          <div class="detail-stat">
            <span>Estimate</span>
            <strong>${job.estimate_id ? "Created" : "Not Created"}</strong>
          </div>

          <div class="detail-stat">
            <span>Agreement</span>
            <strong>${job.agreement_id ? "Created" : "Not Created"}</strong>
          </div>
        </div>
      </div>
    </section>

    <section class="detail-section">
      <div class="detail-section-header">
        <h2>Command Center</h2>
      </div>

      <div class="job-command-grid">
        <button class="job-command-card" type="button" onclick="editJobPlaceholder()">
          <strong>Edit Job</strong>
          <span>Update job details and status.</span>
        </button>

        <a class="job-command-card" href="admin-estimates.html?job=${job.job_number}">
          <strong>Create Estimate</strong>
          <span>Build or view the job estimate.</span>
        </a>

        <a class="job-command-card" href="admin-agreements.html?job=${job.job_number}">
          <strong>Generate Agreement</strong>
          <span>Create a plain-language agreement.</span>
        </a>

        <a class="job-command-card" href="admin-photos.html?job=${job.job_number}">
          <strong>Upload Photos</strong>
          <span>Add before, progress, or after photos.</span>
        </a>

        <button class="job-command-card" type="button" onclick="scheduleMeasurementPlaceholder()">
          <strong>Schedule Measurement</strong>
          <span>Add or update the measurement date.</span>
        </button>

        <button class="job-command-card" type="button" onclick="scheduleInstallPlaceholder()">
          <strong>Schedule Installation</strong>
          <span>Add install start and end dates.</span>
        </button>

        <button class="job-command-card" type="button" onclick="markJobComplete('${job.job_number}')">
          <strong>Mark Complete</strong>
          <span>Move this job to completed status.</span>
        </button>

        <button class="job-command-card danger" type="button" onclick="deleteJob('${job.job_number}')">
          <strong>Delete Job</strong>
          <span>Permanently remove this job.</span>
        </button>
      </div>
    </section>

    <section class="detail-section">
      <div class="detail-section-header">
        <h2>Customer</h2>
        ${customer.customer_id
      ? `<a href="admin-customer.html?id=${customer.customer_id}">View Customer</a>`
      : ""
    }
      </div>

      <div class="detail-grid">
        <div class="detail-item">
          <span>Name</span>
          <strong>${customer.customer_name || "Not listed"}</strong>
        </div>

        <div class="detail-item">
          <span>Phone</span>
          <strong>${customer.phone || "Not listed"}</strong>
        </div>

        <div class="detail-item">
          <span>Email</span>
          <strong>${customer.email || "Not listed"}</strong>
        </div>

        <div class="detail-item full-width">
          <span>Address</span>
          <strong>${customer.address || "Not listed"}</strong>
        </div>
      </div>
    </section>

    <section class="detail-section">
      <div class="detail-section-header">
        <h2>Schedule</h2>
      </div>

      <div class="detail-grid">
        <div class="detail-item">
          <span>Measurement Date</span>
          <strong>${formatJobDetailDate(job.measurement_date) || "Not scheduled"}</strong>
        </div>

        <div class="detail-item">
          <span>Install Start Date</span>
          <strong>${formatJobDetailDate(job.install_start_date) || "Not scheduled"}</strong>
        </div>

        <div class="detail-item">
          <span>Install End Date</span>
          <strong>${formatJobDetailDate(job.install_end_date) || "Not scheduled"}</strong>
        </div>

        <div class="detail-item">
          <span>Status</span>
          <strong>${status}</strong>
        </div>
      </div>
    </section>

    <section class="detail-section">
      <div class="detail-section-header">
        <h2>Documents</h2>
      </div>

      <div class="detail-list">
        <a class="detail-row" href="admin-estimates.html?job=${job.job_number}">
          <div class="detail-row-left">
            <strong>Estimate</strong>
            <span>${job.estimate_id ? "Estimate created" : "No estimate created yet"}</span>
          </div>
          <span class="admin-status-pill ${job.estimate_id ? "active" : "pending"}">
            ${job.estimate_id ? "Created" : "Needed"}
          </span>
        </a>

        <a class="detail-row" href="admin-agreements.html?job=${job.job_number}">
          <div class="detail-row-left">
            <strong>Agreement</strong>
            <span>${job.agreement_id ? "Agreement created" : "No agreement generated yet"}</span>
          </div>
          <span class="admin-status-pill ${job.agreement_id ? "active" : "pending"}">
            ${job.agreement_id ? "Created" : "Needed"}
          </span>
        </a>
      </div>
    </section>

    <section class="detail-section">
      <div class="detail-section-header">
        <h2>Timeline</h2>
      </div>

      <div class="detail-timeline">
        ${renderJobDetailTimeline(job)}
      </div>
    </section>

    <section class="detail-section">
      <div class="detail-section-header">
        <h2>Notes</h2>
      </div>

      <div class="detail-notes job-notes">
        <textarea placeholder="Job notes will be saved here later.">${job.notes || ""}</textarea>
      </div>
    </section>
  `;
}

function renderJobDetailTimeline(job) {
  const items = [];

  if (job.created_at) {
    items.push({
      title: "Job Created",
      date: job.created_at
    });
  }

  if (job.measurement_date) {
    items.push({
      title: "Measurement Scheduled",
      date: job.measurement_date
    });
  }

  if (job.install_start_date) {
    items.push({
      title: "Installation Scheduled",
      date: job.install_start_date
    });
  }

  if (job.install_end_date) {
    items.push({
      title: "Installation End Date",
      date: job.install_end_date
    });
  }

  if (items.length === 0) {
    return `<div class="admin-empty-state">No timeline activity yet.</div>`;
  }

  return items
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(item => `
      <div class="detail-timeline-item">
        <div class="detail-timeline-dot"></div>
        <div class="detail-timeline-content">
          <strong>${item.title}</strong>
          <span>${formatJobDetailDate(item.date)}</span>
        </div>
      </div>
    `)
    .join("");
}

async function markJobComplete(jobNumber) {
  const confirmed = confirm("Mark this job as completed?");
  if (!confirmed) return;

  const { error } = await db
    .from("jobs")
    .update({ status: "Completed" })
    .eq("job_number", jobNumber);

  if (error) {
    console.error(error);
    showMessage("Could not mark job complete.");
    return;
  }

  showMessage("Job marked complete.");
  loadJobDetail();
}

function editJobPlaceholder() {
  alert("Edit Job workflow will be added later.");
}

function scheduleMeasurementPlaceholder() {
  alert("Schedule Measurement workflow will be added later.");
}

function scheduleInstallPlaceholder() {
  alert("Schedule Installation workflow will be added later.");
}

function normalizeJobDetailStatus(status) {
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

function formatJobDetailFlooringTypes(flooringType) {
  if (Array.isArray(flooringType)) {
    return flooringType.join(", ");
  }

  return flooringType || "";
}

function formatJobDetailDate(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

async function deleteJob(jobNumber) {
  const confirmed = confirm(
    "Delete this job permanently? This cannot be undone."
  );

  if (!confirmed) return;

  const { error } = await db
    .from("jobs")
    .delete()
    .eq("job_number", jobNumber);

  if (error) {
    console.error(error);
    showMessage("Could not delete job.");
    return;
  }

  showMessage("Job deleted.");
  window.location.href = "admin-jobList.html";
}