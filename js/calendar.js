// calendar.js

function loadCalendar() {
    const jobs = getJobs();
    const container = document.getElementById("calendar");

    if (!container) return;

    container.innerHTML = "";

    const scheduledJobs = jobs.filter(job =>
        job.measurementDate ||
        job.startDate ||
        job.preferredDate
    );

    if (scheduledJobs.length === 0) {
        container.innerHTML = "<p>No scheduled measurements or jobs found.</p>";
        return;
    }

    scheduledJobs.forEach(job => {
        const div = document.createElement("div");
        div.className = "card";

        div.innerHTML = `
            <h3>${job.jobNumber}</h3>
            <p><strong>Customer:</strong> ${job.customerName}</p>
            <p><strong>Measurement Date:</strong> ${job.measurementDate || job.preferredDate || "Not scheduled"}</p>
            <p><strong>Install Start Date:</strong> ${job.startDate || "Not scheduled"}</p>
            <p><strong>Status:</strong> ${job.status}</p>
        `;

        container.appendChild(div);
    });
}