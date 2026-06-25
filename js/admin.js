// admin.js

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
        const div = document.createElement("div");
        div.className = "card";

        const flooringTypes = Array.isArray(request.flooring_type)
            ? request.flooring_type.join(", ")
            : request.flooring_type;

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

function acceptRequest(requestId) {
    showMessage("Accepting requests into Supabase jobs is the next step. This button is not connected yet.");
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

function loadJobs() {
    const jobs = getJobs();
    const container = document.getElementById("jobs");

    if (!container) return;

    container.innerHTML = "";

    if (jobs.length === 0) {
        container.innerHTML = "<p>No accepted jobs found.</p>";
        return;
    }

    jobs.forEach(job => {
        const div = document.createElement("div");
        div.className = "card";

        div.innerHTML = `
            <h3>${job.jobNumber}</h3>
            <p><strong>Customer:</strong> ${job.customerName}</p>
            <p><strong>Email:</strong> ${job.email}</p>
            <p><strong>Phone:</strong> ${job.phone}</p>
            <p><strong>Address:</strong> ${job.address}</p>
            <p><strong>Requested Work:</strong> ${job.flooringType}</p>
            <p><strong>Measurement Date:</strong> ${job.measurementDate || "Not scheduled"}</p>
            <p><strong>Description:</strong> ${job.description}</p>
            <p><strong>Status:</strong> ${job.status}</p>
            <p><strong>Install Price:</strong> ${job.installPrice ? formatMoney(job.installPrice) : "Not set"}</p>

            <label>
                Update Status
                <select onchange="updateJobStatus('${job.jobNumber}', this.value)">
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
                <input type="number" step="0.01" placeholder="Install price" id="price-${job.jobNumber}">
            </label>

            <button onclick="setInstallPrice('${job.jobNumber}')">Save Price</button>
            <button onclick="deleteJob('${job.jobNumber}')">Delete Job</button>
        `;

        container.appendChild(div);
    });
}

function setInstallPrice(jobNumber) {
    const input = document.getElementById(`price-${jobNumber}`);

    if (!input || input.value === "") {
        showMessage("Please enter an install price.");
        return;
    }

    const jobs = getJobs();
    const job = jobs.find(j => j.jobNumber === jobNumber);

    if (!job) {
        showMessage("Job not found.");
        return;
    }

    job.installPrice = Number(input.value);
    job.status = "Estimate Generated";

    updateJobs(jobs);

    showMessage("Install price saved.");

    loadJobs();
}

function deleteJob(jobNumber) {
    const jobs = getJobs();
    const updatedJobs = jobs.filter(job => job.jobNumber !== jobNumber);

    updateJobs(updatedJobs);

    showMessage("Job deleted.");

    loadJobs();
}

function loadCustomers() {
    const customers = getCustomers();
    const container = document.getElementById("customers");

    if (!container) return;

    container.innerHTML = "";

    if (customers.length === 0) {
        container.innerHTML = "<p>No customers found.</p>";
        return;
    }

    customers.forEach(customer => {
        const div = document.createElement("div");
        div.className = "card";

        div.innerHTML = `
            <h3>${customer.name}</h3>
            <p><strong>Email:</strong> ${customer.email}</p>
            <p><strong>Phone:</strong> ${customer.phone}</p>
            <p><strong>Address:</strong> ${customer.address}</p>
            <p><strong>Active:</strong> ${customer.active ? "Yes" : "No"}</p>

            <button onclick="toggleCustomerActive('${customer.customerId}')">
                ${customer.active ? "Mark Inactive" : "Mark Active"}
            </button>
        `;

        container.appendChild(div);
    });
}

function toggleCustomerActive(customerId) {
    const customers = getCustomers();
    const customer = customers.find(c => c.customerId === customerId);

    if (!customer) return;

    customer.active = !customer.active;

    updateCustomers(customers);

    loadCustomers();
}

async function loadDashboardCounts() {
    const requestCount = document.getElementById("requestCount");
    const jobCount = document.getElementById("jobCount");
    const inventoryCount = document.getElementById("inventoryCount");
    const customerCount = document.getElementById("customerCount");

    if (requestCount && typeof db !== "undefined") {
        const { count, error } = await db
            .from("measurement_requests")
            .select("*", { count: "exact", head: true });

        if (!error) {
            requestCount.textContent = count;
        }
    }

    if (jobCount) jobCount.textContent = getJobs().length;
    if (inventoryCount) inventoryCount.textContent = getInventory().length;
    if (customerCount) {
        customerCount.textContent = getCustomers().filter(customer => customer.active).length;
    }
}