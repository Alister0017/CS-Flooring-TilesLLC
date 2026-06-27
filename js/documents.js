// documents.js

async function addEstimate() {
    const materialCost = Number(document.getElementById("materialCost").value);
    const laborCost = Number(document.getElementById("laborCost").value);
    const installPrice = Number(document.getElementById("installPrice").value);
    const total = materialCost + laborCost + installPrice;
    const jobNumber = document.getElementById("estimateJobNumber").value.trim();

    const estimate = {
        job_number: jobNumber,
        material_cost: materialCost,
        labor_cost: laborCost,
        install_price: installPrice,
        total: total
    };

    const { data: createdEstimate, error } = await db
        .from("estimates")
        .insert([estimate])
        .select()
        .single();

    if (error) {
        console.error(error);
        showMessage("Could not save estimate.");
        return;
    }

    await updateJobEstimateStatus(
        jobNumber,
        installPrice,
        createdEstimate.estimate_id
    );

    showMessage("Owner estimate saved.");

    clearForm("estimateForm");

    loadEstimates();

    if (typeof loadDashboardCounts === "function") {
        loadDashboardCounts();
    }
}

async function updateJobEstimateStatus(jobNumber, installPrice, estimateId) {
    const { error } = await db
        .from("jobs")
        .update({
            install_price: installPrice,
            estimate_id: estimateId,
            status: "Estimate Generated"
        })
        .eq("job_number", jobNumber);

    if (error) {
        console.error(error);
    }
}

async function loadEstimates() {
    const container = document.getElementById("estimates");

    if (!container) return;

    container.innerHTML = "<p>Loading estimates...</p>";

    const { data, error } = await db
        .from("estimates")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        container.innerHTML = "<p>Error loading estimates.</p>";
        return;
    }

    container.innerHTML = "";

    if (!data || data.length === 0) {
        container.innerHTML = "<p>No owner estimates found.</p>";
        return;
    }

    data.forEach(estimate => {
        const div = document.createElement("div");
        div.className = "card";

        div.innerHTML = `
            <h3>${estimate.job_number}</h3>
            <p><strong>Material Cost:</strong> ${formatMoney(estimate.material_cost)}</p>
            <p><strong>Labor Cost:</strong> ${formatMoney(estimate.labor_cost)}</p>
            <p><strong>Install Price:</strong> ${formatMoney(estimate.install_price)}</p>
            <p><strong>Total:</strong> ${formatMoney(estimate.total)}</p>
            <p><strong>Created:</strong> ${new Date(estimate.created_at).toLocaleString()}</p>
        `;

        container.appendChild(div);
    });
}

async function addAgreement() {
    const jobNumber = document.getElementById("agreementJobNumber").value.trim();

    const agreement = {
        job_number: jobNumber,
        notes: document.getElementById("agreementNotes").value,
        signed: false
    };

    const { data: createdAgreement, error } = await db
        .from("agreements")
        .insert([agreement])
        .select()
        .single();

    if (error) {
        console.error(error);
        showMessage("Could not save agreement.");
        return;
    }

    await updateJobAgreementStatus(
        jobNumber,
        createdAgreement.agreement_id
    );

    showMessage("Agreement saved.");

    clearForm("agreementForm");

    loadAgreements();
}

async function updateJobAgreementStatus(jobNumber, agreementId) {
    const { error } = await db
        .from("jobs")
        .update({
            agreement_id: agreementId
        })
        .eq("job_number", jobNumber);

    if (error) {
        console.error(error);
    }
}

async function loadAgreements() {
    const container = document.getElementById("agreements");

    if (!container) return;

    container.innerHTML = "<p>Loading agreements...</p>";

    const { data, error } = await db
        .from("agreements")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        container.innerHTML = "<p>Error loading agreements.</p>";
        return;
    }

    container.innerHTML = "";

    if (!data || data.length === 0) {
        container.innerHTML = "<p>No agreements found.</p>";
        return;
    }

    data.forEach(agreement => {
        const div = document.createElement("div");
        div.className = "card";

        div.innerHTML = `
            <h3>${agreement.job_number}</h3>
            <p><strong>Notes:</strong> ${agreement.notes}</p>
            <p><strong>Signed:</strong> ${agreement.signed ? "Yes" : "No"}</p>
            <p><strong>Created:</strong> ${new Date(agreement.created_at).toLocaleString()}</p>

            <button onclick="toggleAgreementSigned('${agreement.agreement_id}', ${agreement.signed})">
                ${agreement.signed ? "Mark Unsigned" : "Mark Signed"}
            </button>
        `;

        container.appendChild(div);
    });
}

async function toggleAgreementSigned(agreementId, currentStatus) {
    const { error } = await db
        .from("agreements")
        .update({
            signed: !currentStatus
        })
        .eq("agreement_id", agreementId);

    if (error) {
        console.error(error);
        showMessage("Could not update agreement.");
        return;
    }

    loadAgreements();
}

async function lookupCustomerDocuments() {
    const jobNumber = document.getElementById("documentJobNumber").value.trim();
    const contactInfo = document.getElementById("documentContactInfo").value.trim().toLowerCase();
    const result = document.getElementById("documentResult");

    if (!result) return;

    result.innerHTML = "<p>Loading documents...</p>";

    const { data: job, error: jobError } = await db
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

    if (jobError || !job) {
        console.error(jobError);
        result.innerHTML = "<p>Job not found. Please check your job number and contact information.</p>";
        return;
    }

    const customer = job.customers;

    if (!customer) {
        result.innerHTML = "<p>Customer information could not be found for this job.</p>";
        return;
    }

    const emailMatches =
        customer.email &&
        customer.email.toLowerCase() === contactInfo;

    const phoneMatches =
        customer.phone &&
        customer.phone.replace(/\D/g, "") === contactInfo.replace(/\D/g, "");

    if (!emailMatches && !phoneMatches) {
        result.innerHTML = "<p>Job not found. Please check your job number and contact information.</p>";
        return;
    }

    const { data: estimates, error: estimateError } = await db
        .from("estimates")
        .select("*")
        .eq("job_number", jobNumber)
        .order("created_at", { ascending: false });

    const { data: agreements, error: agreementError } = await db
        .from("agreements")
        .select("*")
        .eq("job_number", jobNumber)
        .order("created_at", { ascending: false });

    if (estimateError || agreementError) {
        console.error(estimateError || agreementError);
        result.innerHTML = "<p>There was an error loading your documents.</p>";
        return;
    }

    const latestEstimate = estimates && estimates.length > 0 ? estimates[0] : null;
    const latestAgreement = agreements && agreements.length > 0 ? agreements[0] : null;

    const flooringTypes = Array.isArray(job.flooring_type)
        ? job.flooring_type.join(", ")
        : job.flooring_type;

    result.innerHTML = `
        <h2>${job.job_number}</h2>
        <p><strong>Customer:</strong> ${customer.customer_name}</p>
        <p><strong>Status:</strong> ${job.status}</p>
        <p><strong>Requested Work:</strong> ${flooringTypes || "Not listed"}</p>

        <h3>Estimate</h3>
        ${
            latestEstimate
                ? `
                    <p><strong>Material Cost:</strong> ${formatMoney(latestEstimate.material_cost)}</p>
                    <p><strong>Labor Cost:</strong> ${formatMoney(latestEstimate.labor_cost)}</p>
                    <p><strong>Install Price:</strong> ${formatMoney(latestEstimate.install_price)}</p>
                    <p><strong>Total:</strong> ${formatMoney(latestEstimate.total)}</p>
                  `
                : `<p>No estimate has been created yet.</p>`
        }

        <h3>Agreement</h3>
        ${
            latestAgreement
                ? `
                    <p><strong>Notes:</strong> ${latestAgreement.notes}</p>
                    <p><strong>Signed:</strong> ${latestAgreement.signed ? "Yes" : "No"}</p>
                  `
                : `<p>No agreement has been created yet.</p>`
        }
    `;
}