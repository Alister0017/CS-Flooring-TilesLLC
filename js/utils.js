// utils.js

function generateId(prefix = "ID") {
    return `${prefix}-${Date.now()}`;
}

function generateJobNumber() {
    const jobs = getJobs();
    const next = jobs.length + 1;

    return `CS-2026-${String(next).padStart(4, "0")}`;
}

function showMessage(message) {
    alert(message);
}

function formatMoney(amount) {
    return `$${Number(amount).toFixed(2)}`;
}

function clearForm(formId) {
    const form = document.getElementById(formId);

    if (form) {
        form.reset();
    }
}