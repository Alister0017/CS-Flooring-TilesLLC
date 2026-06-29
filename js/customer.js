// customer.js

window.addEventListener("load", loadCustomerProfile);

async function loadCustomerProfile() {
  const params = new URLSearchParams(window.location.search);
  const customerId = params.get("id");
  const container = document.getElementById("customerProfile");

  if (!container) return;

  if (!customerId) {
    container.innerHTML = `
      <div class="admin-empty-state">
        <h3>No customer selected.</h3>
        <p>Return to the customer list and choose a customer profile.</p>
      </div>
    `;
    return;
  }

  const { data: customer, error } = await db
    .from("customers")
    .select(`
      *,
      jobs (
        job_number,
        flooring_type,
        description,
        measurement_date,
        install_start_date,
        install_end_date,
        install_price,
        status,
        created_at
      )
    `)
    .eq("customer_id", customerId)
    .single();

  if (error || !customer) {
    console.error(error);
    container.innerHTML = `
      <div class="admin-empty-state">
        <h3>Customer not found.</h3>
        <p>This customer may have been deleted or the link may be incorrect.</p>
      </div>
    `;
    return;
  }

  updateCustomerHeader(customer);
  renderCustomerProfile(customer);
}

function updateCustomerHeader(customer) {
  const title = document.getElementById("customerPageTitle");
  const breadcrumb = document.getElementById("customerBreadcrumbName");

  if (title) {
    title.textContent = customer.customer_name || "Customer Profile";
  }

  if (breadcrumb) {
    breadcrumb.textContent = customer.customer_name || "Customer";
  }
}

function renderCustomerProfile(customer) {
  const container = document.getElementById("customerProfile");
  if (!container) return;

  const jobs = customer.jobs || [];
  const activeJobs = jobs.filter(job => !isCompletedCustomerJob(job.status));
  const completedJobs = jobs.filter(job => isCompletedCustomerJob(job.status));
  const lastActivity = getCustomerLastActivity(customer, jobs);

  container.innerHTML = `
    <section class="customer-summary">
      <div class="customer-contact-card">
        <p class="eyebrow">Customer Information</p>
        <h2>${customer.customer_name || "Unnamed Customer"}</h2>

        <div class="customer-info-grid">
          <div class="customer-info-item">
            <span>Phone</span>
            <strong>${customer.phone || "Not listed"}</strong>
          </div>

          <div class="customer-info-item">
            <span>Email</span>
            <strong>${customer.email || "Not listed"}</strong>
          </div>

          <div class="customer-info-item">
            <span>Address</span>
            <strong>${customer.address || "Not listed"}</strong>
          </div>
        </div>
      </div>

      <div class="customer-stats-card">
        <p class="eyebrow">Customer Summary</p>
        <h2>Overview</h2>

        <div class="customer-stat-grid">
          <div class="customer-stat">
            <span>Total Jobs</span>
            <strong>${jobs.length}</strong>
          </div>

          <div class="customer-stat">
            <span>Active Jobs</span>
            <strong>${activeJobs.length}</strong>
          </div>

          <div class="customer-stat">
            <span>Completed Jobs</span>
            <strong>${completedJobs.length}</strong>
          </div>

          <div class="customer-stat">
            <span>Last Activity</span>
            <strong>${lastActivity}</strong>
          </div>
        </div>
      </div>
    </section>

    <section class="customer-section">
      <div class="customer-section-header">
        <h2>Jobs</h2>
        <a href="admin-jobList.html">View All Jobs</a>
      </div>

      <div class="customer-job-list">
        ${renderCustomerJobs(jobs)}
      </div>
    </section>

    <section class="customer-section">
      <div class="customer-section-header">
        <h2>Estimates</h2>
        <a href="admin-estimates.html">Create Estimate</a>
      </div>

      <div class="admin-empty-state">
        Estimates connected to this customer will appear here.
      </div>
    </section>

    <section class="customer-section">
      <div class="customer-section-header">
        <h2>Agreements</h2>
        <a href="admin-agreements.html">Create Agreement</a>
      </div>

      <div class="admin-empty-state">
        Agreements connected to this customer will appear here.
      </div>
    </section>

    <section class="customer-section">
      <div class="customer-section-header">
        <h2>Notes</h2>
      </div>

      <div class="customer-notes">
        <textarea placeholder="Customer notes will be saved here later."></textarea>
      </div>
    </section>

    <section class="customer-section">
      <div class="customer-section-header">
        <h2>Timeline</h2>
      </div>

      <div class="customer-timeline">
        ${renderCustomerTimeline(customer, jobs)}
      </div>
    </section>
  `;
}

function renderCustomerJobs(jobs) {
  if (!jobs || jobs.length === 0) {
    return `
      <div class="admin-empty-state">
        No jobs connected to this customer yet.
      </div>
    `;
  }

  return jobs
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .map(job => {
      const flooringTypes = formatCustomerFlooringTypes(job.flooring_type);

      return `
        <article class="customer-job-card" onclick="window.location.href='admin-job.html?id=${job.job_number}'">
          <div class="customer-job-header">
            <div>
              <p class="eyebrow">Job</p>
              <h3>${job.job_number}</h3>
            </div>

            <span class="${getCustomerJobStatusClass(job.status)}">
              ${job.status || "Status Not Set"}
            </span>
          </div>

          <div class="customer-job-meta">
            <div>
              <span>Requested Work</span>
              <strong>${flooringTypes || "Not listed"}</strong>
            </div>

            <div>
              <span>Measurement Date</span>
              <strong>${formatCustomerDate(job.measurement_date) || "Not scheduled"}</strong>
            </div>

            <div>
              <span>Install Price</span>
              <strong>${job.install_price ? formatMoney(job.install_price) : "Not set"}</strong>
            </div>
          </div>

          <div class="customer-job-footer">
            Open Job →
          </div>
        </article>
      `;
    })
    .join("");
}

function renderCustomerTimeline(customer, jobs) {
  const timelineItems = [];

  if (customer.created_at) {
    timelineItems.push({
      title: "Customer Created",
      date: customer.created_at
    });
  }

  jobs.forEach(job => {
    timelineItems.push({
      title: `Job Created: ${job.job_number}`,
      date: job.created_at
    });

    if (job.measurement_date) {
      timelineItems.push({
        title: `Measurement Scheduled: ${job.job_number}`,
        date: job.measurement_date
      });
    }

    if (job.install_start_date) {
      timelineItems.push({
        title: `Installation Scheduled: ${job.job_number}`,
        date: job.install_start_date
      });
    }
  });

  if (timelineItems.length === 0) {
    return `<div class="admin-empty-state">No timeline activity yet.</div>`;
  }

  return timelineItems
    .filter(item => item.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(item => `
      <div class="customer-timeline-item">
        <div class="customer-timeline-dot"></div>
        <div class="customer-timeline-content">
          <strong>${item.title}</strong>
          <span>${formatCustomerDate(item.date)}</span>
        </div>
      </div>
    `)
    .join("");
}

function isCompletedCustomerJob(status) {
  return ["Completed", "Closed", "Cancelled"].includes(status);
}

function getCustomerJobStatusClass(status) {
  if (!status) return "admin-status-pill";

  const lower = status.toLowerCase();

  if (lower.includes("progress")) {
    return "admin-status-pill in-progress";
  }

  if (lower.includes("complete") || lower.includes("closed")) {
    return "admin-status-pill completed";
  }

  if (lower.includes("cancel")) {
    return "admin-status-pill danger";
  }

  if (lower.includes("scheduled") || lower.includes("estimate")) {
    return "admin-status-pill pending";
  }

  return "admin-status-pill";
}

function getCustomerLastActivity(customer, jobs) {
  const dates = [];

  if (customer.created_at) {
    dates.push(new Date(customer.created_at));
  }

  jobs.forEach(job => {
    if (job.created_at) {
      dates.push(new Date(job.created_at));
    }
  });

  if (dates.length === 0) return "N/A";

  const latestDate = new Date(Math.max(...dates.map(date => date.getTime())));

  return latestDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
}

function formatCustomerFlooringTypes(flooringType) {
  if (Array.isArray(flooringType)) {
    return flooringType.join(", ");
  }

  return flooringType || "";
}

function formatCustomerDate(dateString) {
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