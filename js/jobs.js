// jobs.js
// Customer job lookup + admin job/request management

const CUSTOMER_STATUS_STEPS = [
  {
    label: "Request Submitted",
    description: "Your request has been received."
  },
  {
    label: "Measurement Scheduled",
    description: "A measurement appointment has been scheduled."
  },
  {
    label: "Measurement Completed",
    description: "The space has been measured and reviewed."
  },
  {
    label: "Estimate Sent",
    description: "Your estimate has been prepared or sent for review."
  },
  {
    label: "Deposit Received",
    description: "Your deposit has been received and the project is moving forward."
  },
  {
    label: "Installation Scheduled",
    description: "Your installation has been scheduled."
  },
  {
    label: "Installation In Progress",
    description: "Installation work is currently underway."
  },
  {
    label: "Final Walkthrough",
    description: "The project is being reviewed for final completion."
  },
  {
    label: "Completed",
    description: "Your flooring project has been completed."
  }
];

const STATUS_ALIASES = {
  "Request Submitted": "Request Submitted",
  "Pending": "Request Submitted",
  "Measurement Scheduled": "Measurement Scheduled",
  "Measurement Complete": "Measurement Completed",
  "Measurement Completed": "Measurement Completed",
  "Estimate Generated": "Estimate Sent",
  "Estimate Sent": "Estimate Sent",
  "Ready To Schedule": "Deposit Received",
  "Deposit Received": "Deposit Received",
  "Scheduled": "Installation Scheduled",
  "Installation Scheduled": "Installation Scheduled",
  "In Progress": "Installation In Progress",
  "Installation In Progress": "Installation In Progress",
  "Final Walkthrough": "Final Walkthrough",
  "Completed": "Completed",
  "Closed": "Completed"
};

async function generateSupabaseJobNumber() {
  const year = new Date().getFullYear();
  const { count, error } = await db
    .from("jobs")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error(error);
    return `CS-${year}-${String(Date.now()).slice(-4)}`;
  }

  const next = (count || 0) + 1;
  return `CS-${year}-${String(next).padStart(4, "0")}`;
}

async function loadRequests() {
  const container = document.getElementById("requests");
  if (!container) return;

  container.innerHTML = "<p>Loading measurement requests...</p>";

  const { data, error } = await db
    .from("measurement_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    container.innerHTML = "<p>Error loading measurement requests.</p>";
    return;
  }

  container.innerHTML = "";

  if (!data || data.length === 0) {
    container.innerHTML = "<p>No measurement requests found.</p>";
    return;
  }

  data.forEach(request => {
    const flooringTypes = Array.isArray(request.flooring_type)
      ? request.flooring_type.join(", ")
      : request.flooring_type;

    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <h3>${request.customer_name}</h3>
      <p><strong>Email:</strong> ${request.email}</p>
      <p><strong>Phone:</strong> ${request.phone}</p>
      <p><strong>Address:</strong> ${request.address}</p>
      <p><strong>Requested Work:</strong> ${flooringTypes}</p>
      <p><strong>Preferred Measurement Date:</strong> ${request.preferred_measurement_date || "Not provided"}</p>
      <p><strong>Description:</strong> ${request.description || "No description provided"}</p>
      <p><strong>Status:</strong> ${request.status}</p>
      <button onclick="acceptRequest('${request.request_id}')">Accept Measurement Request</button>
      <button onclick="declineRequest('${request.request_id}')">Decline</button>
    `;

    container.appendChild(div);
  });
}

async function acceptRequest(requestId) {
  const { data: request, error: requestError } = await db
    .from("measurement_requests")
    .select("*")
    .eq("request_id", requestId)
    .single();

  if (requestError || !request) {
    console.error(requestError);
    showMessage("Request not found.");
    return;
  }

  const cleanEmail = request.email ? request.email.trim().toLowerCase() : "";
  const cleanPhone = request.phone ? request.phone.replace(/\D/g, "") : "";

  let existingCustomer = null;

  if (cleanEmail || cleanPhone) {
    const { data: customers, error: findCustomerError } = await db
      .from("customers")
      .select("*")
      .or(`email.eq.${cleanEmail},phone.eq.${request.phone}`);

    if (findCustomerError) {
      console.error(findCustomerError);
      showMessage("Could not check existing customers.");
      return;
    }

    existingCustomer = customers?.find(customer => {
      const customerEmail = customer.email ? customer.email.trim().toLowerCase() : "";
      const customerPhone = customer.phone ? customer.phone.replace(/\D/g, "") : "";

      return (
        (cleanEmail && customerEmail === cleanEmail) ||
        (cleanPhone && customerPhone === cleanPhone)
      );
    });
  }

  let customerId;

  if (existingCustomer) {
    customerId = existingCustomer.customer_id;

    await db
      .from("customers")
      .update({
        customer_name: request.customer_name || existingCustomer.customer_name,
        email: request.email || existingCustomer.email,
        phone: request.phone || existingCustomer.phone,
        address: request.address || existingCustomer.address,
        active: true
      })
      .eq("customer_id", customerId);
  } else {
    const customer = {
      customer_name: request.customer_name,
      email: request.email,
      phone: request.phone,
      address: request.address,
      active: true
    };

    const { data: createdCustomer, error: customerError } = await db
      .from("customers")
      .insert([customer])
      .select()
      .single();

    if (customerError) {
      console.error(customerError);
      showMessage("Could not create customer.");
      return;
    }

    customerId = createdCustomer.customer_id;
  }

  const jobNumber = await generateSupabaseJobNumber();

  const job = {
    job_number: jobNumber,
    customer_id: customerId,
    flooring_type: request.flooring_type,
    description: request.description,
    measurement_date: request.preferred_measurement_date || null,
    install_start_date: null,
    install_end_date: null,
    install_price: null,
    status: "Measurement Scheduled",
    estimate_id: null,
    agreement_id: null
  };

  const { error: jobError } = await db
    .from("jobs")
    .insert([job]);

  if (jobError) {
    console.error(jobError);
    showMessage("Could not create job.");
    return;
  }

  const { error: deleteError } = await db
    .from("measurement_requests")
    .delete()
    .eq("request_id", requestId);

  if (deleteError) {
    console.error(deleteError);
    showMessage("Job created, but request could not be removed.");
  } else {
    showMessage(
      existingCustomer
        ? `Job created for existing customer: ${jobNumber}`
        : `Job created for new customer: ${jobNumber}`
    );
  }

  loadRequests();
  loadJobs();

  if (typeof loadDashboardCounts === "function") {
    loadDashboardCounts();
  }
}

async function declineRequest(requestId) {
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
  loadRequests();

  if (typeof loadDashboardCounts === "function") {
    loadDashboardCounts();
  }
}

async function loadJobs() {
  const container = document.getElementById("jobs");
  if (!container) return;

  container.innerHTML = "<p>Loading accepted jobs...</p>";

  const { data, error } = await db
    .from("jobs")
    .select(`
      *,
      customers (
        customer_name,
        email,
        phone,
        address
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    container.innerHTML = "<p>Error loading jobs.</p>";
    return;
  }

  container.innerHTML = "";

  if (!data || data.length === 0) {
    container.innerHTML = "<p>No accepted jobs found.</p>";
    return;
  }

  data.forEach(job => {
    const flooringTypes = Array.isArray(job.flooring_type)
      ? job.flooring_type.join(", ")
      : job.flooring_type;

    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <h3>${job.job_number}</h3>
      <p><strong>Customer:</strong> ${job.customers?.customer_name || "No customer listed"}</p>
      <p><strong>Email:</strong> ${job.customers?.email || "No email listed"}</p>
      <p><strong>Phone:</strong> ${job.customers?.phone || "No phone listed"}</p>
      <p><strong>Address:</strong> ${job.customers?.address || "No address listed"}</p>
      <p><strong>Requested Work:</strong> ${flooringTypes || "Not listed"}</p>
      <p><strong>Measurement Date:</strong> ${job.measurement_date || "Not scheduled"}</p>
      <p><strong>Description:</strong> ${job.description || "No description provided"}</p>
      <p><strong>Status:</strong> ${job.status}</p>
      <p><strong>Install Price:</strong> ${job.install_price ? formatMoney(job.install_price) : "Not set"}</p>

      <label>
        Update Status
        <select onchange="updateJobStatus('${job.job_number}', this.value)">
          <option value="">Change Status</option>
          <option value="Measurement Scheduled">Measurement Scheduled</option>
          <option value="Measurement Complete">Measurement Complete</option>
          <option value="Estimate Generated">Estimate Generated</option>
          <option value="Ready To Schedule">Ready To Schedule</option>
          <option value="Scheduled">Scheduled</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
          <option value="Closed">Closed</option>
        </select>
      </label>

      <label>
        Set Install Price
        <input type="number" step="0.01" placeholder="Install price" id="price-${job.job_number}">
      </label>

      <button onclick="setInstallPrice('${job.job_number}')">Save Price</button>
      <button onclick="deleteJob('${job.job_number}')">Delete Job</button>
    `;

    container.appendChild(div);
  });
}

async function setInstallPrice(jobNumber) {
  const input = document.getElementById(`price-${jobNumber}`);

  if (!input || input.value === "") {
    showMessage("Please enter an install price.");
    return;
  }

  const { error } = await db
    .from("jobs")
    .update({
      install_price: Number(input.value),
      status: "Estimate Generated"
    })
    .eq("job_number", jobNumber);

  if (error) {
    console.error(error);
    showMessage("Could not save install price.");
    return;
  }

  showMessage("Install price saved.");
  loadJobs();
}

async function deleteJob(jobNumber) {
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
  loadJobs();
}

async function updateJobStatus(jobNumber, newStatus) {
  if (!newStatus) return;

  const { error } = await db
    .from("jobs")
    .update({ status: newStatus })
    .eq("job_number", jobNumber);

  if (error) {
    console.error(error);
    showMessage("Could not update job status.");
    return;
  }

  showMessage("Job status updated.");

  if (typeof loadJobs === "function") {
    loadJobs();
  }
}

async function lookupJob() {
  const jobNumber = document.getElementById("jobNumber").value.trim();
  const contactInfo = document.getElementById("contactInfo").value.trim().toLowerCase();
  const result = document.getElementById("result");

  if (!result) return;

  result.innerHTML = `
    <div class="job-status-empty">
      <h3>Loading project information...</h3>
      <p>Please wait while we verify your job number and contact information.</p>
    </div>
  `;

  const { data, error } = await db
    .from("jobs")
    .select(`
      *,
      customers (
        customer_name,
        email,
        phone,
        address
      )
    `)
    .eq("job_number", jobNumber)
    .single();

  if (error || !data) {
    console.error(error);
    result.innerHTML = renderJobError();
    return;
  }

  const customer = data.customers;

  const emailMatches =
    customer.email &&
    customer.email.toLowerCase() === contactInfo;

  const phoneMatches =
    customer.phone &&
    customer.phone.replace(/\D/g, "") === contactInfo.replace(/\D/g, "");

  if (!emailMatches && !phoneMatches) {
    result.innerHTML = renderJobError();
    return;
  }

  result.innerHTML = renderCustomerJobStatus(data, customer);
}

function renderJobError() {
  return `
    <div class="job-status-error">
      <h3>Job not found.</h3>
      <p>Please check your job number and the email or phone number connected to the project.</p>
    </div>
  `;
}

function renderCustomerJobStatus(job, customer) {
  const normalizedStatus = normalizeCustomerStatus(job.status);
  const statusIndex = getCustomerStatusIndex(normalizedStatus);
  const progress = calculateCustomerProgress(statusIndex);
  const flooringTypes = formatFlooringTypes(job.flooring_type);

  return `
    <div class="job-result-layout">
      <section class="job-result-card">
        <div class="job-result-header">
          <div>
            <p class="eyebrow">Project Status</p>
            <h2>${customer.customer_name || "Customer Project"}</h2>
            <span class="job-number-pill">${job.job_number}</span>
          </div>
          <span class="${getStatusPillClass(normalizedStatus)}">${normalizedStatus}</span>
        </div>

        <div class="job-progress-card">
          <div class="progress-topline">
            <h3>Project Progress</h3>
            <span class="progress-percent">${progress}% Complete</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width:${progress}%"></div>
          </div>
        </div>

        <div class="job-timeline">
          ${renderCustomerTimeline(statusIndex)}
        </div>
      </section>

      <aside>
        <section class="job-summary-card">
          <p class="eyebrow">Project Summary</p>
          <h2>Job Details</h2>
          <div class="job-summary-grid">
            <div class="summary-item">
              <span>Customer</span>
              <strong>${customer.customer_name || "Not listed"}</strong>
            </div>
            <div class="summary-item">
              <span>Requested Work</span>
              <strong>${flooringTypes || "Not listed"}</strong>
            </div>
            <div class="summary-item">
              <span>Measurement Date</span>
              <strong>${formatDisplayDate(job.measurement_date) || "Not scheduled yet"}</strong>
            </div>
            <div class="summary-item">
              <span>Install Start Date</span>
              <strong>${formatDisplayDate(job.install_start_date) || "Not scheduled yet"}</strong>
            </div>
            <div class="summary-item">
              <span>Install End Date</span>
              <strong>${formatDisplayDate(job.install_end_date) || "Not scheduled yet"}</strong>
            </div>
            <div class="summary-item">
              <span>Install Price</span>
              <strong>${job.install_price ? formatMoney(job.install_price) : "Not available yet"}</strong>
            </div>
          </div>
        </section>

        <section class="job-update-card">
          <p class="eyebrow">Latest Update</p>
          <h3>${normalizedStatus}</h3>
          <p>${getCustomerStatusMessage(normalizedStatus)}</p>
        </section>
      </aside>
    </div>
  `;
}

function renderCustomerTimeline(currentIndex) {
  return CUSTOMER_STATUS_STEPS.map((step, index) => {
    let stepClass = "future";

    if (index < currentIndex) {
      stepClass = "complete";
    } else if (index === currentIndex) {
      stepClass = "current";
    }

    return `
      <div class="timeline-step ${stepClass}">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <h4>${step.label}</h4>
          <p>${step.description}</p>
        </div>
      </div>
    `;
  }).join("");
}

function normalizeCustomerStatus(status) {
  return STATUS_ALIASES[status] || status || "Request Submitted";
}

function getCustomerStatusIndex(status) {
  const index = CUSTOMER_STATUS_STEPS.findIndex(step => step.label === status);
  return index >= 0 ? index : 0;
}

function calculateCustomerProgress(statusIndex) {
  const totalSteps = CUSTOMER_STATUS_STEPS.length - 1;
  if (statusIndex <= 0) return 5;
  return Math.round((statusIndex / totalSteps) * 100);
}

function getStatusPillClass(status) {
  const lower = status.toLowerCase();

  if (lower.includes("progress")) {
    return "status-pill in-progress";
  }

  if (lower.includes("completed") || lower.includes("complete")) {
    return "status-pill completed";
  }

  if (lower.includes("hold")) {
    return "status-pill hold";
  }

  if (lower.includes("cancel")) {
    return "status-pill cancelled";
  }

  return "status-pill";
}

function getCustomerStatusMessage(status) {
  const messages = {
    "Request Submitted": "Your request has been received and is waiting to be reviewed.",
    "Measurement Scheduled": "Your measurement appointment has been scheduled.",
    "Measurement Completed": "Your measurement has been completed and the project is being reviewed.",
    "Estimate Sent": "Your estimate has been prepared or sent for review.",
    "Deposit Received": "Your deposit has been received and the project is ready to move forward.",
    "Installation Scheduled": "Your installation has been scheduled.",
    "Installation In Progress": "Your flooring installation is currently in progress.",
    "Final Walkthrough": "Your project is being reviewed for final completion.",
    "Completed": "Your flooring project has been completed."
  };

  return messages[status] || "Your project status has been updated.";
}

function formatFlooringTypes(flooringType) {
  if (Array.isArray(flooringType)) {
    return flooringType.join(", ");
  }

  return flooringType || "";
}

function formatDisplayDate(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString + "T00:00:00");

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}