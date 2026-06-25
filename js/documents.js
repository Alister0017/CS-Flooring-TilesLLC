// documents.js

function addEstimate() {
    const estimate = {
        estimateId: generateId("EST"),
        jobNumber: document.getElementById("estimateJobNumber").value,
        materialCost: Number(document.getElementById("materialCost").value),
        laborCost: Number(document.getElementById("laborCost").value),
        installPrice: Number(document.getElementById("installPrice").value),
        total: 0,
        createdAt: new Date().toLocaleString()
    };

    estimate.total = estimate.materialCost + estimate.laborCost + estimate.installPrice;

    saveEstimate(estimate);

    updateJobEstimateStatus(estimate.jobNumber, estimate.installPrice, estimate.estimateId);

    showMessage("Owner estimate saved.");

    clearForm("estimateForm");

    loadEstimates();
}

function updateJobEstimateStatus(jobNumber, installPrice, estimateId) {
    const jobs = getJobs();
    const job = jobs.find(j => j.jobNumber === jobNumber);

    if (!job) return;

    job.installPrice = installPrice;
    job.estimateId = estimateId;
    job.status = "Estimate Generated";

    updateJobs(jobs);
}

function loadEstimates() {
    const estimates = getEstimates();
    const container = document.getElementById("estimates");

    if (!container) return;

    container.innerHTML = "";

    if (estimates.length === 0) {
        container.innerHTML = "<p>No owner estimates found.</p>";
        return;
    }

    estimates.forEach(estimate => {
        const div = document.createElement("div");
        div.className = "card";

        div.innerHTML = `
            <h3>${estimate.jobNumber}</h3>
            <p><strong>Material Cost:</strong> ${formatMoney(estimate.materialCost)}</p>
            <p><strong>Labor Cost:</strong> ${formatMoney(estimate.laborCost)}</p>
            <p><strong>Install Price:</strong> ${formatMoney(estimate.installPrice)}</p>
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