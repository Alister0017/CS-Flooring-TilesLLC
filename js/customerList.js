// customerList.js

let allCustomers = [];

window.addEventListener("load", () => {
  loadCustomerList();

  const searchInput = document.getElementById("customerSearch");
  const sortSelect = document.getElementById("customerSort");
  const newJobButton = document.getElementById("newCustomerButton");

  if (searchInput) {
    searchInput.addEventListener("input", renderFilteredCustomers);
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", renderFilteredCustomers);
  }

  if (newJobButton) {
    newJobButton.addEventListener("click", () => {
      window.location.href = "admin-jobList.html";
    });
  }
});

async function loadCustomerList() {
  const grid = document.getElementById("customerGrid");
  if (!grid) return;

  grid.innerHTML = `<div class="admin-empty-state">Loading customers...</div>`;

  const { data, error } = await db
    .from("customers")
    .select(`
      *,
      jobs (
        job_number,
        status,
        created_at
      )
    `)
    .eq("active", true)
    .order("customer_name", { ascending: true });

  if (error) {
    console.error(error);
    grid.innerHTML = `<div class="admin-empty-state">Could not load customers.</div>`;
    return;
  }

  allCustomers = data || [];
  renderFilteredCustomers();
}

function renderFilteredCustomers() {
  const searchInput = document.getElementById("customerSearch");
  const sortSelect = document.getElementById("customerSort");

  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : "";
  const sortBy = sortSelect ? sortSelect.value : "name";

  let customers = allCustomers.filter(customer => {
    const name = customer.customer_name ? customer.customer_name.toLowerCase() : "";
    const email = customer.email ? customer.email.toLowerCase() : "";
    const phone = customer.phone ? customer.phone.toLowerCase() : "";
    const address = customer.address ? customer.address.toLowerCase() : "";

    return (
      searchTerm === "" ||
      name.includes(searchTerm) ||
      email.includes(searchTerm) ||
      phone.includes(searchTerm) ||
      address.includes(searchTerm)
    );
  });

  customers = sortCustomers(customers, sortBy);
  renderCustomerCards(customers);
}

function sortCustomers(customers, sortBy) {
  const sorted = [...customers];

  if (sortBy === "recent") {
    sorted.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }

  if (sortBy === "jobs") {
    sorted.sort((a, b) => (b.jobs?.length || 0) - (a.jobs?.length || 0));
  }

  if (sortBy === "name") {
    sorted.sort((a, b) => {
      const nameA = a.customer_name || "";
      const nameB = b.customer_name || "";
      return nameA.localeCompare(nameB);
    });
  }

  return sorted;
}

function renderCustomerCards(customers) {
  const grid = document.getElementById("customerGrid");
  if (!grid) return;

  grid.innerHTML = "";

  if (!customers || customers.length === 0) {
    grid.innerHTML = `
      <div class="admin-empty-state">
        <h3>No customers found.</h3>
        <p>Try changing your search or creating a job from a measurement request.</p>
      </div>
    `;
    return;
  }

  customers.forEach(customer => {
    const jobs = customer.jobs || [];
    const activeJobs = jobs.filter(job => !isCompletedStatus(job.status));
    const lastActivity = getLastCustomerActivity(customer, jobs);

    const card = document.createElement("article");
    card.className = "customer-card";
    card.onclick = () => {
      window.location.href = `admin-customer.html?id=${customer.customer_id}`;
    };

    card.innerHTML = `
      <div class="customer-card-header">
        <div>
          <p class="eyebrow">Customer</p>
          <h2>${customer.customer_name || "Unnamed Customer"}</h2>
        </div>
        <span class="admin-status-pill ${activeJobs.length > 0 ? "active" : "completed"}">
          ${activeJobs.length > 0 ? "Active" : "No Active Jobs"}
        </span>
      </div>

      <div class="customer-contact-grid">
        <div class="admin-info-item">
          <span>Phone</span>
          <strong>${customer.phone || "Not listed"}</strong>
        </div>

        <div class="admin-info-item">
          <span>Email</span>
          <strong>${customer.email || "Not listed"}</strong>
        </div>

        <div class="admin-info-item customer-address-item">
          <span>Address</span>
          <strong>${customer.address || "Not listed"}</strong>
        </div>
      </div>

      <div class="customer-card-stats">
        <div>
          <span>Active Jobs</span>
          <strong>${activeJobs.length}</strong>
        </div>

        <div>
          <span>Total Jobs</span>
          <strong>${jobs.length}</strong>
        </div>

        <div>
          <span>Last Activity</span>
          <strong>${lastActivity}</strong>
        </div>
      </div>

      <div class="customer-card-footer">
        <span>View Customer</span>
        <strong>→</strong>
      </div>
    `;

    grid.appendChild(card);
  });
}

function isCompletedStatus(status) {
  const completedStatuses = ["Completed", "Closed", "Cancelled"];
  return completedStatuses.includes(status);
}

function getLastCustomerActivity(customer, jobs) {
  const jobDates = jobs
    .map(job => job.created_at)
    .filter(Boolean)
    .map(date => new Date(date));

  const customerDate = customer.created_at ? new Date(customer.created_at) : null;

  const allDates = customerDate ? [customerDate, ...jobDates] : jobDates;

  if (allDates.length === 0) return "Not available";

  const latestDate = new Date(Math.max(...allDates.map(date => date.getTime())));

  return latestDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}