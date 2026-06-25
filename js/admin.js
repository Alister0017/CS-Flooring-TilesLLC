// admin.js

function loadRequests() {
    const requests = getRequests();
    const container = document.getElementById("requests");

    if (!container) return;

    container.innerHTML = "";

    if (requests.length === 0) {
        container.innerHTML = "<p>No measurement requests found.</p>";
        return;
    }

    requests.forEach(request => {
        const div = document.createElement("div");
        div.className = "card";

        div.innerHTML = `
            <h3>${request.name}</h3>
            <p><strong>Email:</strong> ${request.email}</p>
            <p><strong>Phone:</strong> ${request.phone}</p>
            <p><strong>Address:</strong> ${request.address}</p>
            <p><strong>Requested Work:</strong> ${request.flooringType}</p>
            <p><strong>Preferred Measurement Date:</strong> ${request.preferredDate || "Not provided"}</p>
            <p><strong>Description:</strong> ${request.description}</p>
            <p><strong>Status:</strong> ${request.status}</p>

            <button onclick="acceptRequest('${request.id}')">Accept Measurement Request</button>
            <button onclick="declineRequest('${request.id}')">Decline</button>
        `;

        container.appendChild(div);
    });
}

function acceptRequest(requestId) {
    const requests = getRequests();
    const request = requests.find(r => r.id === requestId);

    if (!request) {
        showMessage("Request not found.");
        return;
    }

    const customerId = generateId("CUST");

    const customer = {
        customerId: customerId,
        name: request.name,
        email: request.email,
        phone: request.phone,
        address: request.address,
        active: true,
        createdAt: new Date().toLocaleString()
    };

    saveCustomer(customer);

    const job = {
        jobId: generateId("JOB"),
        jobNumber: generateJobNumber(),
        customerId: customerId,
        customerName: request.name,
        email: request.email,
        phone: request.phone,
        address: request.address,
        flooringType: request.flooringType,
        preferredDate: request.preferredDate,
        description: request.description,
        status: "Measurement Scheduled",
        measurementDate: request.preferredDate || "",
        startDate: "",
        endDate: "",
        installPrice: "",
        estimateId: "",
        agreementId: "",
        createdAt: new Date().toLocaleString()
    };

    saveJob(job);

    const updatedRequests = requests.filter(r => r.id !== requestId);
    updateRequests(updatedRequests);

    showMessage(`Job created: ${job.jobNumber}`);

    loadRequests();

    if (document.getElementById("jobs")) {
        loadJobs();
    }
}

function declineRequest(requestId) {
    const requests = getRequests();
    const updatedRequests = requests.filter(r => r.id !== requestId);

    updateRequests(updatedRequests);

    showMessage("Measurement request declined.");

    loadRequests();
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

function loadDashboardCounts() {
    const requestCount = document.getElementById("requestCount");
    const jobCount = document.getElementById("jobCount");
    const inventoryCount = document.getElementById("inventoryCount");
    const customerCount = document.getElementById("customerCount");

    if (requestCount) requestCount.textContent = getRequests().length;
    if (jobCount) jobCount.textContent = getJobs().length;
    if (inventoryCount) inventoryCount.textContent = getInventory().length;
    if (customerCount) {
        customerCount.textContent = getCustomers().filter(customer => customer.active).length;
    }
}