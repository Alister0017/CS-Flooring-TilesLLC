// main.js

window.onload = function () {
    console.log("CS Flooring Loaded");

    if (document.getElementById("requests")) {
        loadRequests();
    }

    if (document.getElementById("jobs")) {
        loadJobs();
    }

    if (document.getElementById("customers")) {
        loadCustomers();
    }

    if (document.getElementById("inventory")) {
        loadInventory();
    }

    if (document.getElementById("estimates")) {
        loadEstimates();
    }

    if (document.getElementById("agreements")) {
        loadAgreements();
    }

    if (document.getElementById("photos")) {
        loadPhotos();
    }

    if (document.getElementById("calendar")) {
        loadCalendar();
    }
};