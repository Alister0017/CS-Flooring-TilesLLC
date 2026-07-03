const BASE_PATH = window.location.hostname.includes("github.io")
  ? "/CS-Flooring-TilesLLC/"
  : "";

const ADMIN_BASE = `${BASE_PATH}admin/`;

const ROUTES = Object.freeze({
  HOME: `${BASE_PATH}index.html`,
  PRODUCTS: `${BASE_PATH}products.html`,
  GALLERY: `${BASE_PATH}gallery.html`,
  REQUEST: `${BASE_PATH}request.html`,
  JOB_STATUS: `${BASE_PATH}job-status.html`,
  CONTACT: `${BASE_PATH}contact.html`,

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