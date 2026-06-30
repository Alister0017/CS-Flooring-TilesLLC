// job.js

let currentJob = null;

window.addEventListener("load", loadJobDetail);

/* ==========================================================
   LOAD JOB
========================================================== */

async function loadJobDetail() {
  const params = new URLSearchParams(window.location.search);
  const jobNumber = params.get("id");
  const container = document.getElementById("jobDetail");
  if (!container) return;
  if (!jobNumber) {
    container.innerHTML = `<div class="admin-empty-state"><h3>No job selected.</h3><p>Return to the job list and choose a job.</p></div>`;
    return;
  }
  const { data: job, error } = await JobService.getJob(jobNumber);
  if (error || !job) {
    console.error(error);
    container.innerHTML = `<div class="admin-empty-state"><h3>Job not found.</h3><p>This job may have been deleted or the link may be incorrect.</p></div>`;
    return;
  }
  currentJob = job;
  updateJobHeader(job);
  renderJobDetail(job);
}

function updateJobHeader(job) {
  const title = document.getElementById("jobPageTitle");
  const breadcrumb = document.getElementById("jobBreadcrumbName");
  if (title) title.textContent = job.job_number || "Job Details";
  if (breadcrumb) breadcrumb.textContent = job.job_number || "Job";
}

/* ==========================================================
   RENDER JOB DETAIL
========================================================== */

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
          <div class="detail-item"><span>Status</span><strong>${status}</strong></div>
          <div class="detail-item"><span>Customer</span><strong>${customer.customer_name || "Not listed"}</strong></div>
          <div class="detail-item"><span>Requested Work</span><strong>${flooringTypes || "Not listed"}</strong></div>
          <div class="detail-item"><span>Created</span><strong>${formatJobDetailDate(job.created_at) || "Not available"}</strong></div>
          <div class="detail-item full-width"><span>Description</span><strong>${job.description || "No description provided."}</strong></div>
        </div>
      </div>

      <div class="detail-card">
        <p class="eyebrow">Project Status</p>
        <h2>Overview</h2>
        <div class="detail-stat-grid">
          <div class="detail-stat"><span>Status</span><strong>${status}</strong></div>
          <div class="detail-stat"><span>Install Price</span><strong>${job.install_price ? formatMoney(job.install_price) : "Not Set"}</strong></div>
          <div class="detail-stat"><span>Estimate</span><strong>${job.estimate_id ? "Created" : "Not Created"}</strong></div>
          <div class="detail-stat"><span>Agreement</span><strong>${job.agreement_id ? "Created" : "Not Created"}</strong></div>
        </div>
      </div>
    </section>

    <section class="detail-section">
      <div class="detail-section-header"><h2>Project Progress</h2></div>
      <div class="job-progress-grid">${renderJobProgress(job)}</div>
    </section>

    <section class="detail-section">
      <div class="detail-section-header"><h2>Command Center</h2></div>
      <div class="job-command-grid">
        <button class="job-command-card" type="button" onclick="openEditJobModal()"><strong>Edit Job</strong><span>Update job details and status.</span></button>
        <a class="job-command-card" href="${ROUTES.ESTIMATES}?job=${job.job_number}"><strong>Create Estimate</strong><span>Build or view the job estimate.</span></a>
        <a class="job-command-card" href="${ROUTES.AGREEMENTS}?job=${job.job_number}"><strong>Generate Agreement</strong><span>Create a plain-language agreement.</span></a>
        <a class="job-command-card" href="${ROUTES.PHOTOS}?job=${job.job_number}"><strong>Upload Photos</strong><span>Add before, progress, or after photos.</span></a>
        <button class="job-command-card" type="button" onclick="scheduleMeasurementPlaceholder()"><strong>Schedule Measurement</strong><span>Add or update the measurement date.</span></button>
        <button class="job-command-card" type="button" onclick="scheduleInstallPlaceholder()"><strong>Schedule Installation</strong><span>Add install start and end dates.</span></button>
        <button class="job-command-card" type="button" onclick="markJobComplete('${job.job_number}')"><strong>Mark Complete</strong><span>Move this job to completed status.</span></button>
        <button class="job-command-card danger" type="button" onclick="deleteJob('${job.job_number}')"><strong>Delete Job</strong><span>Permanently remove this job.</span></button>
      </div>
    </section>
        <section class="detail-section">
      <div class="detail-section-header">
        <h2>Customer</h2>
        ${customer.customer_id ? `<a href="${ROUTES.CUSTOMER}?id=${customer.customer_id}">View Customer</a>` : ""}
      </div>
      <div class="detail-grid">
        <div class="detail-item"><span>Name</span><strong>${customer.customer_name || "Not listed"}</strong></div>
        <div class="detail-item"><span>Phone</span><strong>${customer.phone || "Not listed"}</strong></div>
        <div class="detail-item"><span>Email</span><strong>${customer.email || "Not listed"}</strong></div>
        <div class="detail-item full-width"><span>Address</span><strong>${customer.address || "Not listed"}</strong></div>
      </div>
    </section>

    <section class="detail-section">
      <div class="detail-section-header"><h2>Schedule</h2></div>
      <div class="detail-grid">
        <div class="detail-item"><span>Measurement Date</span><strong>${formatDateForDisplay(job.measurement_date) || "Not scheduled"}</strong></div>
        <div class="detail-item"><span>Install Start Date</span><strong>${formatDateForDisplay(job.install_start_date) || "Not scheduled"}</strong></div>
        <div class="detail-item"><span>Install End Date</span><strong>${formatDateForDisplay(job.install_end_date) || "Not scheduled"}</strong></div>
        <div class="detail-item"><span>Status</span><strong>${status}</strong></div>
      </div>
    </section>

    <section class="detail-section">
      <div class="detail-section-header"><h2>Documents</h2></div>
      <div class="detail-list">
        <a class="detail-row" href="${ROUTES.ESTIMATES}?job=${job.job_number}">
          <div class="detail-row-left">
            <strong>Estimate</strong>
            <span>${job.estimate_id ? "Estimate created" : "No estimate created yet"}</span>
          </div>
          <span class="admin-status-pill ${job.estimate_id ? "active" : "pending"}">${job.estimate_id ? "Created" : "Needed"}</span>
        </a>

        <a class="detail-row" href="${ROUTES.AGREEMENTS}?job=${job.job_number}">
          <div class="detail-row-left">
            <strong>Agreement</strong>
            <span>${job.agreement_id ? "Agreement created" : "No agreement generated yet"}</span>
          </div>
          <span class="admin-status-pill ${job.agreement_id ? "active" : "pending"}">${job.agreement_id ? "Created" : "Needed"}</span>
        </a>

        <a class="detail-row" href="${ROUTES.PHOTOS}?job=${job.job_number}">
          <div class="detail-row-left">
            <strong>Photos</strong>
            <span>View or upload before, progress, and after photos.</span>
          </div>
          <span class="admin-status-pill pending">Open</span>
        </a>
      </div>
    </section>

    <section class="detail-section">
      <div class="detail-section-header"><h2>Timeline</h2></div>
      <div class="detail-timeline">${renderJobDetailTimeline(job)}</div>
    </section>

    <section class="detail-section">
      <div class="detail-section-header"><h2>Notes</h2></div>
      <div class="detail-notes job-notes">
        <textarea id="jobNotesField" placeholder="Add internal job notes...">${job.notes || ""}</textarea>
        <button class="btn" type="button" onclick="saveJobNotes('${job.job_number}')">Save Notes</button>
      </div>
    </section>
  `;
}

/* ==========================================================
   PROJECT PROGRESS
========================================================== */

function renderJobProgress(job) {
  const status = normalizeJobDetailStatus(job.status);
  const steps = [
    { label: JOB_STATUS.MEASUREMENT_SCHEDULED, complete: Boolean(job.measurement_date) || statusOrder(status) >= statusOrder(JOB_STATUS.MEASUREMENT_SCHEDULED) },
    { label: JOB_STATUS.MEASUREMENT_COMPLETED, complete: statusOrder(status) >= statusOrder(JOB_STATUS.MEASUREMENT_COMPLETED) },
    { label: JOB_STATUS.ESTIMATE_CREATED, complete: Boolean(job.estimate_id) || statusOrder(status) >= statusOrder(JOB_STATUS.ESTIMATE_SENT) },
    { label: JOB_STATUS.DEPOSIT_RECEIVED, complete: statusOrder(status) >= statusOrder(JOB_STATUS.DEPOSIT_RECEIVED) },
    { label: JOB_STATUS.AGREEMENT_CREATED, complete: Boolean(job.agreement_id) },
    { label: JOB_STATUS.INSTALLATION_SCHEDULED, complete: Boolean(job.install_start_date) || statusOrder(status) >= statusOrder(JOB_STATUS.INSTALLATION_SCHEDULED) },
    { label: JOB_STATUS.INSTALLATION_IN_PROGRESS, complete: statusOrder(status) >= statusOrder(JOB_STATUS.INSTALLATION_IN_PROGRESS) },
    { label: JOB_STATUS.COMPLETED, complete: [JOB_STATUS.COMPLETED, JOB_STATUS.CLOSED].includes(status) }
  ];

  return steps.map(step => `
    <div class="job-progress-item ${step.complete ? "complete" : ""}">
      <span class="job-progress-icon">${step.complete ? "✓" : "○"}</span>
      <strong>${step.label}</strong>
    </div>
  `).join("");
}

function statusOrder(status) {
  const order = {
    [JOB_STATUS.MEASUREMENT_SCHEDULED]: 1,
    [JOB_STATUS.MEASUREMENT_COMPLETED]: 2,
    [JOB_STATUS.ESTIMATE_CREATED]: 3,
    [JOB_STATUS.ESTIMATE_SENT]: 3,
    [JOB_STATUS.AGREEMENT_CREATED]: 4,
    [JOB_STATUS.AGREEMENT_SIGNED]: 4,
    [JOB_STATUS.DEPOSIT_RECEIVED]: 5,
    [JOB_STATUS.MATERIALS_ORDERED]: 6,
    [JOB_STATUS.INSTALLATION_SCHEDULED]: 7,
    [JOB_STATUS.INSTALLATION_IN_PROGRESS]: 8,
    [JOB_STATUS.FINAL_WALKTHROUGH]: 9,
    [JOB_STATUS.COMPLETED]: 10,
    [JOB_STATUS.CLOSED]: 10,
    [JOB_STATUS.CANCELLED]: 0
  };
  return order[normalizeJobDetailStatus(status)] || 0;
}

/* ==========================================================
   EDIT JOB
========================================================== */

function openEditJobModal() {
  if (!currentJob) {
    showMessage("No job loaded.");
    return;
  }

  const currentFlooringType = Array.isArray(currentJob.flooring_type)
    ? currentJob.flooring_type[0]
    : currentJob.flooring_type || "";

  openAdminModal({
    title: `Edit ${currentJob.job_number}`,
    subtitle: "Edit Job",
    wide: true,
    body: `
      <div class="admin-modal-grid">
        <div class="admin-modal-field">
          <label for="editJobStatus">Status</label>
          <select id="editJobStatus">${renderStatusOptions(currentJob.status)}</select>
        </div>

        <div class="admin-modal-field">
          <label for="editFlooringType">Flooring Type</label>
          <select id="editFlooringType">${renderFlooringOptions(currentFlooringType)}</select>
        </div>

        <div class="admin-modal-field">
          <label for="editMeasurementDate">Measurement Date</label>
          <input id="editMeasurementDate" type="date" value="${formatDateForInput(currentJob.measurement_date)}">
        </div>

        <div class="admin-modal-field">
          <label for="editInstallStartDate">Install Start Date</label>
          <input id="editInstallStartDate" type="date" value="${formatDateForInput(currentJob.install_start_date)}">
        </div>

        <div class="admin-modal-field">
          <label for="editInstallEndDate">Install End Date</label>
          <input id="editInstallEndDate" type="date" value="${formatDateForInput(currentJob.install_end_date)}">
        </div>

        <div class="admin-modal-field">
          <label for="editInstallPrice">Install Price</label>
          <input id="editInstallPrice" type="number" min="0" step="0.01" value="${currentJob.install_price || ""}">
        </div>

        <div class="admin-modal-field full-width">
          <label for="editJobDescription">Job Description</label>
          <textarea id="editJobDescription">${currentJob.description || ""}</textarea>
        </div>
      </div>
    `,
    footer: `
      <button class="btn secondary" type="button" onclick="closeAdminModal()">Cancel</button>
      <button class="btn" type="button" onclick="saveJobEdits()">Save Changes</button>
    `
  });
}

function renderStatusOptions(currentStatus) {
  return JOB_STATUS_GROUPS_FOR_DETAIL().map(status => `
    <option value="${status}" ${normalizeJobDetailStatus(currentStatus) === status ? "selected" : ""}>${status}</option>
  `).join("");
}

function renderFlooringOptions(currentFlooringType) {
  return `
    <option value="">Select flooring type</option>
    ${FLOORING_TYPES.map(type => `
      <option value="${type}" ${currentFlooringType === type ? "selected" : ""}>${type}</option>
    `).join("")}
  `;
}

async function saveJobEdits() {
  if (!currentJob) {
    showMessage("No job loaded.");
    return;
  }

  const status = document.getElementById("editJobStatus")?.value;
  const flooringType = document.getElementById("editFlooringType")?.value;
  const measurementDate = document.getElementById("editMeasurementDate")?.value || null;
  const installStartDate = document.getElementById("editInstallStartDate")?.value || null;
  const installEndDate = document.getElementById("editInstallEndDate")?.value || null;
  const installPriceValue = document.getElementById("editInstallPrice")?.value;
  const description = document.getElementById("editJobDescription")?.value.trim();

  if (!status) {
    showMessage("Please select a status.");
    return;
  }

  if (!flooringType) {
    showMessage("Please select a flooring type.");
    return;
  }

  const { error } = await JobService.updateJob(currentJob.job_number, {
    status,
    flooring_type: [flooringType],
    measurement_date: measurementDate,
    install_start_date: installStartDate,
    install_end_date: installEndDate,
    install_price: installPriceValue ? Number(installPriceValue) : null,
    description
  });

  if (error) {
    console.error(error);
    showMessage("Could not update job.");
    return;
  }

  closeAdminModal();
  showMessage("Job updated.");
  await loadJobDetail();
}

/* ==========================================================
   NOTES
========================================================== */

async function saveJobNotes(jobNumber) {
  const notes = document.getElementById("jobNotesField")?.value || "";
  const { error } = await JobService.saveNotes(jobNumber, notes);

  if (error) {
    console.error(error);
    showMessage("Could not save notes.");
    return;
  }

  showMessage("Notes saved.");
}

/* ==========================================================
   TIMELINE
========================================================== */

function renderJobDetailTimeline(job) {
  const items = [];

  if (job.created_at) items.push({ title: "Job Created", date: job.created_at });
  if (job.measurement_date) items.push({ title: "Measurement Scheduled", date: job.measurement_date });
  if (job.estimate_id) items.push({ title: "Estimate Created", date: job.updated_at || job.created_at });
  if (job.agreement_id) items.push({ title: "Agreement Created", date: job.updated_at || job.created_at });
  if (job.install_start_date) items.push({ title: "Installation Scheduled", date: job.install_start_date });
  if (job.install_end_date) items.push({ title: "Installation End Date", date: job.install_end_date });

  if (!items.length) {
    return `<div class="admin-empty-state">No timeline activity yet.</div>`;
  }

  return items.sort((a, b) => new Date(b.date) - new Date(a.date)).map(item => `
    <div class="detail-timeline-item">
      <div class="detail-timeline-dot"></div>
      <div class="detail-timeline-content">
        <strong>${item.title}</strong>
        <span>${formatJobDetailDate(item.date)}</span>
      </div>
    </div>
  `).join("");
}

/* ==========================================================
   COMMAND ACTIONS
========================================================== */

async function markJobComplete(jobNumber) {
  const confirmed = confirm("Mark this job as completed?");
  if (!confirmed) return;

  const { error } = await JobService.updateStatus(jobNumber, JOB_STATUS.COMPLETED);

  if (error) {
    console.error(error);
    showMessage("Could not mark job complete.");
    return;
  }

  showMessage("Job marked complete.");
  await loadJobDetail();
}

async function deleteJob(jobNumber) {
  const confirmed = confirm("Delete this job permanently? This cannot be undone.");
  if (!confirmed) return;

  const { error } = await JobService.deleteJob(jobNumber);

  if (error) {
    console.error(error);
    showMessage("Could not delete job.");
    return;
  }

  showMessage("Job deleted.");
  window.location.href = ROUTES.JOBS;
}

function scheduleMeasurementPlaceholder() {
  openEditJobModal();
}

function scheduleInstallPlaceholder() {
  openEditJobModal();
}

/* ==========================================================
   HELPERS
========================================================== */

function JOB_STATUS_GROUPS_FOR_DETAIL() {
  return [
    JOB_STATUS.MEASUREMENT_SCHEDULED,
    JOB_STATUS.MEASUREMENT_COMPLETED,
    JOB_STATUS.ESTIMATE_CREATED,
    JOB_STATUS.ESTIMATE_SENT,
    JOB_STATUS.AGREEMENT_CREATED,
    JOB_STATUS.AGREEMENT_SIGNED,
    JOB_STATUS.DEPOSIT_RECEIVED,
    JOB_STATUS.MATERIALS_ORDERED,
    JOB_STATUS.INSTALLATION_SCHEDULED,
    JOB_STATUS.INSTALLATION_IN_PROGRESS,
    JOB_STATUS.FINAL_WALKTHROUGH,
    JOB_STATUS.COMPLETED,
    JOB_STATUS.CLOSED,
    JOB_STATUS.CANCELLED
  ];
}

function normalizeJobDetailStatus(status) {
  const aliases = {
    "Measurement Complete": JOB_STATUS.MEASUREMENT_COMPLETED,
    "Estimate Generated": JOB_STATUS.ESTIMATE_SENT,
    "Ready To Schedule": JOB_STATUS.DEPOSIT_RECEIVED,
    "Scheduled": JOB_STATUS.INSTALLATION_SCHEDULED,
    "In Progress": JOB_STATUS.INSTALLATION_IN_PROGRESS,
    "Closed": JOB_STATUS.CLOSED
  };

  return aliases[status] || status || JOB_STATUS.MEASUREMENT_SCHEDULED;
}

function formatJobDetailFlooringTypes(flooringType) {
  if (Array.isArray(flooringType)) return flooringType.join(", ");
  return flooringType || "";
}

function formatJobDetailDate(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString(JOB.DATE_FORMAT, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function formatDateForDisplay(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString + "T00:00:00");
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString(JOB.DATE_FORMAT, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function formatDateForInput(dateString) {
  if (!dateString) return "";
  return String(dateString).split("T")[0];
}