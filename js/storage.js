// storage.js

function getData(key) {
    return JSON.parse(localStorage.getItem(key)) || [];
}

function setData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// Requests
function getRequests() {
    return getData("requests");
}

function saveRequest(request) {
    const requests = getRequests();
    requests.push(request);
    setData("requests", requests);
}

function updateRequests(requests) {
    setData("requests", requests);
}

// Jobs
function getJobs() {
    return getData("jobs");
}

function saveJob(job) {
    const jobs = getJobs();
    jobs.push(job);
    setData("jobs", jobs);
}

function updateJobs(jobs) {
    setData("jobs", jobs);
}

// Customers
function getCustomers() {
    return getData("customers");
}

function saveCustomer(customer) {
    const customers = getCustomers();
    customers.push(customer);
    setData("customers", customers);
}

function updateCustomers(customers) {
    setData("customers", customers);
}

// Inventory
function getInventory() {
    return getData("inventory");
}

function saveInventoryItem(item) {
    const inventory = getInventory();
    inventory.push(item);
    setData("inventory", inventory);
}

function updateInventory(inventory) {
    setData("inventory", inventory);
}

// Estimates
function getEstimates() {
    return getData("estimates");
}

function saveEstimate(estimate) {
    const estimates = getEstimates();
    estimates.push(estimate);
    setData("estimates", estimates);
}

// Agreements
function getAgreements() {
    return getData("agreements");
}

function saveAgreement(agreement) {
    const agreements = getAgreements();
    agreements.push(agreement);
    setData("agreements", agreements);
}

// Photos
function getPhotos() {
    return getData("photos");
}

function savePhoto(photo) {
    const photos = getPhotos();
    photos.push(photo);
    setData("photos", photos);
}