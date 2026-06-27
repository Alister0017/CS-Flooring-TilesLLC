// jobs.js

async function lookupJob() {
    const jobNumber = document.getElementById("jobNumber").value.trim();
    const contactInfo = document.getElementById("contactInfo").value.trim().toLowerCase();
    const result = document.getElementById("result");

    result.innerHTML = "<p>Loading job information...</p>";

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
        result.innerHTML = "<p>Job not found. Please check your job number and contact information.</p>";
        return;
    }

    const customer = data.customers;

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

    const flooringTypes = Array.isArray(data.flooring_type)
        ? data.flooring_type.join(", ")
        : data.flooring_type;

    result.innerHTML = `
        <h2>${data.job_number}</h2>
        <p><strong>Customer:</strong> ${customer.customer_name}</p>
        <p><strong>Status:</strong> ${data.status}</p>
        <p><strong>Requested Work:</strong> ${flooringTypes || "Not listed"}</p>
        <p><strong>Description:</strong> ${data.description || "No description provided"}</p>
        <p><strong>Measurement Date:</strong> ${data.measurement_date || "Not scheduled yet"}</p>
        <p><strong>Install Price:</strong> ${data.install_price ? formatMoney(data.install_price) : "Not available yet"}</p>
        <p><strong>Install Start Date:</strong> ${data.install_start_date || "Not scheduled yet"}</p>
        <p><strong>Install End Date:</strong> ${data.install_end_date || "Not scheduled yet"}</p>
    `;
}

async function updateJobStatus(jobNumber, newStatus) {
    if (!newStatus) return;

    const { error } = await db
        .from("jobs")
        .update({
            status: newStatus
        })
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