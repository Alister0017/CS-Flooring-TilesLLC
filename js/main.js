// main.js

function toggleMobileMenu() {
  const nav = document.getElementById("siteNav");

  if (!nav) return;

  nav.classList.toggle("open");
}

window.addEventListener("load", async () => {
  console.log("CS Flooring Loaded");

  const isAdminPage = document.body.classList.contains("admin-body");

  if (isAdminPage && typeof protectAdminPage === "function") {
    await protectAdminPage();
  }

  const requestCount = document.getElementById("requestCount");
  if (requestCount && typeof loadDashboardCounts === "function") {
    loadDashboardCounts();
  }

  const requestsContainer = document.getElementById("requests");
  if (requestsContainer && typeof loadRequests === "function") {
    loadRequests();
  }

  const jobsContainer = document.getElementById("jobs");
  if (jobsContainer && typeof loadJobs === "function") {
    loadJobs();
  }

  const customersContainer = document.getElementById("customers");
  if (customersContainer && typeof loadCustomers === "function") {
    loadCustomers();
  }

  const inventoryContainer = document.getElementById("inventory");
  if (inventoryContainer && typeof loadInventory === "function") {
    loadInventory();
  }

  const estimatesContainer = document.getElementById("estimates");
  if (estimatesContainer && typeof loadEstimates === "function") {
    loadEstimates();
  }

  const agreementsContainer = document.getElementById("agreements");
  if (agreementsContainer && typeof loadAgreements === "function") {
    loadAgreements();
  }

  const photosContainer = document.getElementById("photos");
  if (photosContainer && typeof loadPhotos === "function") {
    loadPhotos();
  }

  const calendarGrid = document.getElementById("calendarGrid");
  if (calendarGrid && typeof loadCalendar === "function") {
    loadCalendar();
  }
});