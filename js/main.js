// main.js

window.onload = async function () {
    console.log("CS Flooring Loaded");

    if (document.body.classList.contains("admin-body") && typeof protectAdminPage === "function") {
        await protectAdminPage();
    }

    if (document.getElementById("requestCount") && typeof loadDashboardCounts === "function") {
        loadDashboardCounts();
    }

    if (document.getElementById("requests") && typeof loadRequests === "function") {
        loadRequests();
    }

    if (document.getElementById("jobs") && typeof loadJobs === "function") {
        loadJobs();
    }

    if (document.getElementById("customers") && typeof loadCustomers === "function") {
        loadCustomers();
    }

    if (document.getElementById("inventory") && typeof loadInventory === "function") {
        loadInventory();
    }

    if (document.getElementById("estimates") && typeof loadEstimates === "function") {
        loadEstimates();
    }

    if (document.getElementById("agreements") && typeof loadAgreements === "function") {
        loadAgreements();
    }

    if (document.getElementById("photos") && typeof loadPhotos === "function") {
        loadPhotos();
    }

    if (document.getElementById("calendarGrid") && typeof loadCalendar === "function") {
        loadCalendar();
    }
};