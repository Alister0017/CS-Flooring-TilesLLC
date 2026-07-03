const ADMIN_BASE = window.location.pathname.includes("/admin/")
  ? ""
  : "admin/";

const ROUTES = Object.freeze({
  HOME: "index.html",
  PRODUCTS: "products.html",
  GALLERY: "gallery.html",
  REQUEST: "request.html",
  JOB_STATUS: "job-status.html",
  CONTACT: "contact.html",

  LOGIN: `${ADMIN_BASE}admin-login.html`,
  DASHBOARD: `${ADMIN_BASE}admin-dashboard.html`,
  CUSTOMERS: `${ADMIN_BASE}admin-customerList.html`,
  CUSTOMER: `${ADMIN_BASE}admin-customer.html`,
  JOBS: `${ADMIN_BASE}admin-jobList.html`,
  JOB: `${ADMIN_BASE}admin-job.html`,
  ESTIMATES: `${ADMIN_BASE}admin-estimates.html`,
  AGREEMENTS: `${ADMIN_BASE}admin-agreements.html`,
  INVENTORY: `${ADMIN_BASE}admin-inventory.html`,
  CALENDAR: `${ADMIN_BASE}admin-calendar.html`,
  PHOTOS: `${ADMIN_BASE}admin-photos.html`,
  INVOICES: `${ADMIN_BASE}admin-invoices.html`,
  MATERIAL_CALCULATOR: `${ADMIN_BASE}admin-materialCalc.html`
});