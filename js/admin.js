// admin.js
// Dashboard-only functions

async function loadDashboardCounts() {
    const requestCount = document.getElementById("requestCount");
    const jobCount = document.getElementById("jobCount");
    const inventoryCount = document.getElementById("inventoryCount");
    const customerCount = document.getElementById("customerCount");

    if (requestCount) {
        const { count, error } = await db
            .from("measurement_requests")
            .select("*", { count: "exact", head: true });

        if (!error) requestCount.textContent = count;
    }

    if (jobCount) {
        const { count, error } = await db
            .from("jobs")
            .select("*", { count: "exact", head: true });

        if (!error) jobCount.textContent = count;
    }

    if (inventoryCount) {
        const { count, error } = await db
            .from("inventory")
            .select("*", { count: "exact", head: true });

        if (!error) inventoryCount.textContent = count;
    }

    if (customerCount) {
        const { count, error } = await db
            .from("customers")
            .select("*", { count: "exact", head: true })
            .eq("active", true);

        if (!error) customerCount.textContent = count;
    }
}

function toggleAdminNav() {
  document.body.classList.toggle("admin-nav-open");
}

function closeAdminNav() {
  document.body.classList.remove("admin-nav-open");
}