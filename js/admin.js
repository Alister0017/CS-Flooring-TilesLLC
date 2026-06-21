// admin.js

function loadRequests() {
    const requests = getRequests();
    const container = document.getElementById("requests");

    if (!container) return;

    container.innerHTML = "";

    if (requests.length === 0) {
        container.innerHTML = "<p>No requests found.</p>";
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
            <p><strong>Flooring Type:</strong> ${request.flooringType}</p>
            <p><strong>Square Footage:</strong> ${request.squareFootage}</p>
            <p><strong>Preferred Date:</strong> ${request.preferredDate}</p>
            <p><strong>Description:</strong> ${request.description}</p>
            <p><strong>Status:</strong> ${request.status}</p>

            <button onclick="acceptRequest('${request.id}')">Accept</button>
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
        squareFootage: request.squareFootage,
        preferredDate: request.preferredDate,
        description: request.description,
        status: "Accepted",
        startDate: "",
        endDate: "",
        estimateId: "",
        agreementId: "",
        createdAt: new Date().toLocaleString()
    };

    saveJob(job);

    const updatedRequests = requests.filter(r => r.id !== requestId);
    updateRequests(updatedRequests);

    showMessage(`Job created: ${job.jobNumber}`);

    loadRequests();
}

function declineRequest(requestId) {
    const requests = getRequests();
    const updatedRequests = requests.filter(r => r.id !== requestId);

    updateRequests(updatedRequests);

    showMessage("Request declined.");

    loadRequests();
}

function loadJobs() {
    const jobs = getJobs();
    const container = document.getElementById("jobs");

    if (!container) return;

    container.innerHTML = "";

    if (jobs.length === 0) {
        container.innerHTML = "<p>No jobs found.</p>";
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
            <p><strong>Flooring Type:</strong> ${job.flooringType}</p>
            <p><strong>Square Footage:</strong> ${job.squareFootage}</p>
            <p><strong>Description:</strong> ${job.description}</p>
            <p><strong>Status:</strong> ${job.status}</p>

            <select onchange="updateJobStatus('${job.jobNumber}', this.value)">
                <option value="">Change Status</option>
                <option value="Accepted">Accepted</option>
                <option value="Estimate Sent">Estimate Sent</option>
                <option value="Scheduled">Scheduled</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Closed">Closed</option>
            </select>

            <button onclick="deleteJob('${job.jobNumber}')">Delete Job</button>
        `;

        container.appendChild(div);
    });
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

function addInventoryItem() {
    const item = {
        itemId: generateId("ITEM"),
        name: document.getElementById("itemName").value,
        type: document.getElementById("itemType").value,
        unitPrice: Number(document.getElementById("unitPrice").value),
        quantity: Number(document.getElementById("quantity").value),
        available: true
    };

    saveInventoryItem(item);

    showMessage("Inventory item added.");

    clearForm("inventoryForm");

    loadInventory();
}

function loadInventory() {
    const inventory = getInventory();
    const container = document.getElementById("inventory");

    if (!container) return;

    container.innerHTML = "";

    if (inventory.length === 0) {
        container.innerHTML = "<p>No inventory found.</p>";
        return;
    }

    inventory.forEach(item => {
        const div = document.createElement("div");
        div.className = "card";

        div.innerHTML = `
            <h3>${item.name}</h3>
            <p><strong>Type:</strong> ${item.type}</p>
            <p><strong>Unit Price:</strong> ${formatMoney(item.unitPrice)}</p>
            <p><strong>Quantity:</strong> ${item.quantity}</p>
            <p><strong>Available:</strong> ${item.available ? "Yes" : "No"}</p>

            <button onclick="toggleInventoryAvailable('${item.itemId}')">
                Toggle Available
            </button>

            <button onclick="deleteInventoryItem('${item.itemId}')">
                Delete
            </button>
        `;

        container.appendChild(div);
    });
}

function toggleInventoryAvailable(itemId) {
    const inventory = getInventory();

    const item = inventory.find(i => i.itemId === itemId);

    if (!item) return;

    item.available = !item.available;

    updateInventory(inventory);

    loadInventory();
}

function deleteInventoryItem(itemId) {
    const inventory = getInventory();
    const updatedInventory = inventory.filter(item => item.itemId !== itemId);

    updateInventory(updatedInventory);

    loadInventory();
}

function addEstimate() {
    const estimate = {
        estimateId: generateId("EST"),
        jobNumber: document.getElementById("estimateJobNumber").value,
        materialCost: Number(document.getElementById("materialCost").value),
        laborCost: Number(document.getElementById("laborCost").value),
        total: 0,
        createdAt: new Date().toLocaleString()
    };

    estimate.total = estimate.materialCost + estimate.laborCost;

    saveEstimate(estimate);

    showMessage("Estimate saved.");

    clearForm("estimateForm");

    loadEstimates();
}

function loadEstimates() {
    const estimates = getEstimates();
    const container = document.getElementById("estimates");

    if (!container) return;

    container.innerHTML = "";

    if (estimates.length === 0) {
        container.innerHTML = "<p>No estimates found.</p>";
        return;
    }

    estimates.forEach(estimate => {
        const div = document.createElement("div");
        div.className = "card";

        div.innerHTML = `
            <h3>${estimate.jobNumber}</h3>
            <p><strong>Material Cost:</strong> ${formatMoney(estimate.materialCost)}</p>
            <p><strong>Labor Cost:</strong> ${formatMoney(estimate.laborCost)}</p>
            <p><strong>Total:</strong> ${formatMoney(estimate.total)}</p>
        `;

        container.appendChild(div);
    });
}

function addAgreement() {
    const agreement = {
        agreementId: generateId("AGR"),
        jobNumber: document.getElementById("agreementJobNumber").value,
        notes: document.getElementById("agreementNotes").value,
        signed: false,
        createdAt: new Date().toLocaleString()
    };

    saveAgreement(agreement);

    showMessage("Agreement saved.");

    clearForm("agreementForm");

    loadAgreements();
}

function loadAgreements() {
    const agreements = getAgreements();
    const container = document.getElementById("agreements");

    if (!container) return;

    container.innerHTML = "";

    if (agreements.length === 0) {
        container.innerHTML = "<p>No agreements found.</p>";
        return;
    }

    agreements.forEach(agreement => {
        const div = document.createElement("div");
        div.className = "card";

        div.innerHTML = `
            <h3>${agreement.jobNumber}</h3>
            <p><strong>Notes:</strong> ${agreement.notes}</p>
            <p><strong>Signed:</strong> ${agreement.signed ? "Yes" : "No"}</p>
            <button onclick="toggleAgreementSigned('${agreement.agreementId}')">Toggle Signed</button>
        `;

        container.appendChild(div);
    });
}

function toggleAgreementSigned(agreementId) {
    const agreements = getAgreements();

    const agreement = agreements.find(a => a.agreementId === agreementId);

    if (!agreement) return;

    agreement.signed = !agreement.signed;

    setData("agreements", agreements);

    loadAgreements();
}

function addPhoto() {
    const photo = {
        photoId: generateId("PHOTO"),
        title: document.getElementById("photoTitle").value,
        imageUrl: document.getElementById("photoUrl").value,
        description: document.getElementById("photoDescription").value,
        createdAt: new Date().toLocaleString()
    };

    savePhoto(photo);

    showMessage("Photo saved.");

    clearForm("photoForm");

    loadPhotos();
}

function loadPhotos() {
    const photos = getPhotos();
    const container = document.getElementById("photos");

    if (!container) return;

    container.innerHTML = "";

    if (photos.length === 0) {
        container.innerHTML = "<p>No photos found.</p>";
        return;
    }

    photos.forEach(photo => {
        const div = document.createElement("div");
        div.className = "card";

        div.innerHTML = `
            <h3>${photo.title}</h3>
            <p>${photo.description}</p>
            <p><strong>Image URL:</strong> ${photo.imageUrl}</p>
        `;

        container.appendChild(div);
    });
}

function loadCalendar() {
    const jobs = getJobs();
    const container = document.getElementById("calendar");

    if (!container) return;

    container.innerHTML = "";

    const scheduledJobs = jobs.filter(job =>
        job.preferredDate || job.startDate
    );

    if (scheduledJobs.length === 0) {
        container.innerHTML = "<p>No scheduled jobs found.</p>";
        return;
    }

    scheduledJobs.forEach(job => {
        const div = document.createElement("div");
        div.className = "card";

        div.innerHTML = `
            <h3>${job.jobNumber}</h3>
            <p><strong>Customer:</strong> ${job.customerName}</p>
            <p><strong>Date:</strong> ${job.startDate || job.preferredDate}</p>
            <p><strong>Status:</strong> ${job.status}</p>
        `;

        container.appendChild(div);
    });
}