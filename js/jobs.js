// jobs.js

function lookupJob() {
    const jobNumber = document.getElementById("jobNumber").value.trim();
    const contactInfo = document.getElementById("contactInfo").value.trim().toLowerCase();

    const jobs = getJobs();

    const job = jobs.find(j =>
        j.jobNumber === jobNumber &&
        (
            j.email.toLowerCase() === contactInfo ||
            j.phone === contactInfo
        )
    );

    const result = document.getElementById("result");

    if (!job) {
        result.innerHTML = "<p>Job not found. Please check your job number and contact information.</p>";
        return;
    }

    result.innerHTML = `
        <h2>${job.jobNumber}</h2>
        <p><strong>Customer:</strong> ${job.customerName}</p>
        <p><strong>Status:</strong> ${job.status}</p>
        <p><strong>Requested Work:</strong> ${job.flooringType}</p>
        <p><strong>Description:</strong> ${job.description}</p>
        <p><strong>Measurement Date:</strong> ${job.measurementDate || "Not scheduled yet"}</p>
        <p><strong>Install Price:</strong> ${job.installPrice ? formatMoney(job.installPrice) : "Not available yet"}</p>
        <p><strong>Start Date:</strong> ${job.startDate || "Not scheduled yet"}</p>
        <p><strong>End Date:</strong> ${job.endDate || "Not scheduled yet"}</p>
    `;
}

function updateJobStatus(jobNumber, newStatus) {
    if (!newStatus) return;

    const jobs = getJobs();
    const job = jobs.find(j => j.jobNumber === jobNumber);

    if (!job) {
        showMessage("Job not found.");
        return;
    }

    job.status = newStatus;

    updateJobs(jobs);

    showMessage("Job status updated.");

    loadJobs();
}