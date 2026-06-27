// main.js

window.onload = function () {
    console.log("CS Flooring Loaded");

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

    if (document.getElementById("calendar") && typeof loadCalendar === "function") {
        loadCalendar();
    }

    if (typeof loadDashboardCounts === "function") {
        loadDashboardCounts();
    }

    protectAdminPage();
};