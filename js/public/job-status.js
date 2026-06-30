// job-status.js

async function lookupJob() {
  const jobNumberInput = document.getElementById("jobNumber");
  const contactInput = document.getElementById("contactInfo");
  const result = document.getElementById("result");

  if (!jobNumberInput || !contactInput || !result) return;

  const jobNumber = jobNumberInput.value.trim();
  const contactInfo = contactInput.value.trim();

  if (!jobNumber || !contactInfo) {
    renderJobStatusError("Please enter both your job number and contact information.");
    return;
  }

  result.innerHTML = `
    <div class="job-status-empty">
      <h3>Looking up your project...</h3>
      <p>Please wait while we verify your information.</p>
    </div>
  `;

  const { data: job, error } = await JobService.getJob(jobNumber);

  if (error || !job) {
    renderJobStatusError("We could not find a project with that job number.");
    return;
  }

  const customer = job.customers || {};

  if (!doesContactMatch(customer, contactInfo)) {
    renderJobStatusError("The contact information entered does not match this project.");
    return;
  }

  renderJobStatus(job);
}

/* ==========================================================
   VALIDATION
========================================================== */

function doesContactMatch(customer, contactInfo) {
  const enteredEmail = normalizeEmailForLookup(contactInfo);
  const enteredPhone = normalizePhoneForLookup(contactInfo);

  const customerEmail = normalizeEmailForLookup(customer.email);
  const customerPhone = normalizePhoneForLookup(customer.phone);

  return (
    (enteredEmail && customerEmail && enteredEmail === customerEmail) ||
    (enteredPhone && customerPhone && enteredPhone === customerPhone)
  );
}

function normalizeEmailForLookup(email) {
  return email
    ? email.trim().toLowerCase()
    : "";
}

function normalizePhoneForLookup(phone) {
  return phone
    ? phone.replace(/\D/g, "")
    : "";
}

/* ==========================================================
   RENDER
========================================================== */

function renderJobStatus(job) {
  const result = document.getElementById("result");
  const customer = job.customers || {};
  const progress = getJobProgress(job.status);

  result.innerHTML = `
    <div class="job-result-layout">
      <section class="job-result-card">
        <div class="job-result-header">
          <div>
            <p class="eyebrow">Project Status</p>
            <h2>${customer.customer_name || "Your Flooring Project"}</h2>
            <span class="job-number-pill">${job.job_number}</span>
          </div>

          <span class="${getStatusPillClass(job.status)}">
            ${job.status || JOB_STATUS.MEASUREMENT_SCHEDULED}
          </span>
        </div>

        <div class="job-progress-card">
          <div class="progress-topline">
            <h3>Project Progress</h3>
            <span class="progress-percent">${progress.percent}%</span>
          </div>

          <div class="progress-bar">
            <div class="progress-fill" style="width:${progress.percent}%"></div>
          </div>
        </div>

        <div class="job-timeline">
          ${renderTimeline(job.status)}
        </div>
      </section>

      <aside>
        <section class="job-summary-card">
          <p class="eyebrow">Project Details</p>
          <h3>Summary</h3>

          <div class="job-summary-grid">
            <div class="summary-item">
              <span>Requested Work</span>
              <strong>${formatFlooringTypes(job.flooring_type) || "Not listed"}</strong>
            </div>

            <div class="summary-item">
              <span>Measurement Date</span>
              <strong>${formatDate(job.measurement_date) || "Not scheduled"}</strong>
            </div>

            <div class="summary-item">
              <span>Install Start</span>
              <strong>${formatDate(job.install_start_date) || "Not scheduled"}</strong>
            </div>

            <div class="summary-item">
              <span>Install End</span>
              <strong>${formatDate(job.install_end_date) || "Not scheduled"}</strong>
            </div>

            <div class="summary-item">
              <span>Project Address</span>
              <strong>${customer.address || "Not listed"}</strong>
            </div>
          </div>
        </section>

        <section class="job-update-card">
          <h3>Questions?</h3>
          <p>
            If you have questions about your project, please contact CS Flooring & Tile LLC directly.
          </p>
          <a class="btn secondary" href="contact.html">Contact Us</a>
        </section>
      </aside>
    </div>
  `;
}

function renderJobStatusError(message) {
  const result = document.getElementById("result");

  if (!result) return;

  result.innerHTML = `
    <div class="job-status-error">
      <h3>Unable to Find Project</h3>
      <p>${message}</p>
      <a class="btn secondary" href="contact.html">Contact Us</a>
    </div>
  `;
}

/* ==========================================================
   TIMELINE
========================================================== */

function renderTimeline(currentStatus) {
  const steps = getTimelineSteps();
  const currentIndex = getCurrentStepIndex(currentStatus);

  return steps.map((step, index) => {
    let className = "timeline-step future";

    if (index < currentIndex) {
      className = "timeline-step complete";
    }

    if (index === currentIndex) {
      className = "timeline-step current";
    }

    return `
      <div class="${className}">
        <div class="timeline-dot"></div>

        <div class="timeline-content">
          <h4>${step.label}</h4>
          <p>${step.description}</p>
        </div>
      </div>
    `;
  }).join("");
}

function getTimelineSteps() {
  return [
    {
      status: JOB_STATUS.MEASUREMENT_SCHEDULED,
      label: "Measurement Scheduled",
      description: "Your measurement has been scheduled or is being prepared."
    },
    {
      status: JOB_STATUS.MEASUREMENT_COMPLETED,
      label: "Measurement Completed",
      description: "The space has been measured and project details are being reviewed."
    },
    {
      status: JOB_STATUS.ESTIMATE_SENT,
      label: "Estimate Sent",
      description: "Your estimate has been prepared and sent for review."
    },
    {
      status: JOB_STATUS.DEPOSIT_RECEIVED,
      label: "Deposit Received",
      description: "Your project has moved forward after deposit confirmation."
    },
    {
      status: JOB_STATUS.INSTALLATION_SCHEDULED,
      label: "Installation Scheduled",
      description: "Your installation date has been scheduled."
    },
    {
      status: JOB_STATUS.INSTALLATION_IN_PROGRESS,
      label: "Installation In Progress",
      description: "Installation work is currently underway."
    },
    {
      status: JOB_STATUS.FINAL_WALKTHROUGH,
      label: "Final Walkthrough",
      description: "The project is being reviewed for final completion."
    },
    {
      status: JOB_STATUS.COMPLETED,
      label: "Completed",
      description: "Your flooring project has been completed."
    }
  ];
}

function getCurrentStepIndex(status) {
  const steps = getTimelineSteps();
  const normalizedStatus = normalizeStatusForTimeline(status);

  const index = steps.findIndex(step => step.status === normalizedStatus);

  return index >= 0 ? index : 0;
}

function normalizeStatusForTimeline(status) {
  if (status === JOB_STATUS.REQUESTED) {
    return JOB_STATUS.MEASUREMENT_SCHEDULED;
  }

  if (status === JOB_STATUS.ESTIMATE_CREATED) {
    return JOB_STATUS.ESTIMATE_SENT;
  }

  if (status === JOB_STATUS.AGREEMENT_CREATED || status === JOB_STATUS.AGREEMENT_SIGNED) {
    return JOB_STATUS.DEPOSIT_RECEIVED;
  }

  if (status === JOB_STATUS.MATERIALS_ORDERED) {
    return JOB_STATUS.INSTALLATION_SCHEDULED;
  }

  if (status === JOB_STATUS.CLOSED) {
    return JOB_STATUS.COMPLETED;
  }

  return status || JOB_STATUS.MEASUREMENT_SCHEDULED;
}

function getJobProgress(status) {
  const steps = getTimelineSteps();
  const currentIndex = getCurrentStepIndex(status);

  const percent = Math.round(
    ((currentIndex + 1) / steps.length) * 100
  );

  return {
    currentIndex,
    percent
  };
}

/* ==========================================================
   HELPERS
========================================================== */

function getStatusPillClass(status) {
  const normalizedStatus = normalizeStatusForTimeline(status);

  if (
    normalizedStatus === JOB_STATUS.COMPLETED ||
    normalizedStatus === JOB_STATUS.CLOSED
  ) {
    return "status-pill completed";
  }

  if (
    normalizedStatus === JOB_STATUS.INSTALLATION_IN_PROGRESS ||
    normalizedStatus === JOB_STATUS.FINAL_WALKTHROUGH
  ) {
    return "status-pill in-progress";
  }

  if (normalizedStatus === JOB_STATUS.CANCELLED) {
    return "status-pill cancelled";
  }

  return "status-pill";
}

function formatFlooringTypes(flooringTypes) {
  if (Array.isArray(flooringTypes)) {
    return flooringTypes.join(", ");
  }

  return flooringTypes || "";
}