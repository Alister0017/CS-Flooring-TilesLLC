// estimates.js

let estimateItems = [];
let estimateCustomers = [];
let estimateJobs = [];
let estimateProducts = [];

let selectedEstimateCustomer = null;
let selectedEstimateJob = null;

/* ==========================================================
   INITIALIZE
========================================================== */

window.addEventListener("load", async () => {
  await initializeEstimatePage();
});

async function initializeEstimatePage() {
  await Promise.all([
    loadEstimateCustomers(),
    loadEstimateProducts()
  ]);

  addEstimateItemRow();
  applyEstimateUrlContext();

  await loadEstimates();
}

/* ==========================================================
   LOAD FORM DATA
========================================================== */

async function loadEstimateCustomers() {
  const select = document.getElementById("estimateCustomerSelect");

  if (!select) return;

  const options = await FormDataService.getCustomerOptions();

  estimateCustomers = options.map(option => option.data);

  FormDataService.populateSelect(
    select,
    options,
    "Select Customer"
  );
}

async function loadEstimateProducts() {
  const options = await FormDataService.getProductOptions();

  estimateProducts = options.map(option => option.data);
}

async function loadEstimateJobs(customerId = null) {
  const select = document.getElementById("estimateJobSelect");

  if (!select) return;

  const options = await FormDataService.getJobOptions(customerId);

  estimateJobs = options.map(option => option.data);

  FormDataService.populateSelect(
    select,
    options,
    customerId
      ? "Select Job for Customer"
      : "Select Job"
  );
}

/* ==========================================================
   CUSTOMER / JOB CASCADING SELECTION
========================================================== */

async function handleEstimateCustomerChange() {
  const customerId =
    document.getElementById("estimateCustomerSelect")?.value || "";

  selectedEstimateCustomer =
    estimateCustomers.find(customer =>
      String(customer.customer_id) === String(customerId)
    ) || null;

  selectedEstimateJob = null;

  clearEstimateJobContext();

  if (!customerId) {
    await loadEstimateJobs();
    updateEstimateContextPanel();
    return;
  }

  await loadEstimateJobs(customerId);

  updateEstimateContextPanel();
}

function handleEstimateJobChange() {
  const jobNumber =
    document.getElementById("estimateJobSelect")?.value || "";

  selectedEstimateJob =
    estimateJobs.find(job =>
      String(job.job_number) === String(jobNumber)
    ) || null;

  if (!selectedEstimateJob) {
    clearEstimateJobContext();
    updateEstimateContextPanel();
    return;
  }

  const jobNumberInput =
    document.getElementById("estimateJobNumber");

  if (jobNumberInput) {
    jobNumberInput.value = selectedEstimateJob.job_number || "";
  }

  /*
    If the job has an embedded customer object, prefer it.
    Otherwise retain the customer selected in the dropdown.
  */

  if (selectedEstimateJob.customers) {
    selectedEstimateCustomer = selectedEstimateJob.customers;

    const customerSelect =
      document.getElementById("estimateCustomerSelect");

    if (customerSelect && selectedEstimateCustomer.customer_id) {
      customerSelect.value =
        selectedEstimateCustomer.customer_id;
    }
  }

  updateEstimateContextPanel();
}

/* ==========================================================
   CONTEXT PANEL
========================================================== */

function updateEstimateContextPanel() {
  setText(
    "estimateContextCustomer",
    selectedEstimateCustomer?.customer_name || "None selected"
  );

  setText(
    "estimateContextJob",
    selectedEstimateJob?.job_number || "None selected"
  );

  setText(
    "estimateContextWork",
    formatEstimateFlooringTypes(
      selectedEstimateJob?.flooring_type
    ) || "Not available"
  );

  setText(
    "estimateContextAddress",
    selectedEstimateJob?.customers?.address ||
    selectedEstimateCustomer?.address ||
    "Not available"
  );
}

function clearEstimateJobContext() {
  selectedEstimateJob = null;

  const jobNumberInput =
    document.getElementById("estimateJobNumber");

  if (jobNumberInput) {
    jobNumberInput.value = "";
  }
}

/* ==========================================================
   LINE ITEMS
========================================================== */

function addEstimateItemRow(prefill = {}) {
  const item = {
    local_id: crypto.randomUUID(),
    inventory_id: prefill.inventory_id || "",
    room_name: prefill.room_name || "",
    item_type: prefill.item_type || "Material",
    description: prefill.description || "",
    quantity: Number(prefill.quantity || 1),
    unit: prefill.unit || "each",
    unit_price: Number(prefill.unit_price || 0)
  };

  estimateItems.push(item);

  renderEstimateItems();
}

function removeEstimateItemRow(localId) {
  estimateItems =
    estimateItems.filter(item => item.local_id !== localId);

  if (!estimateItems.length) {
    addEstimateItemRow();
    return;
  }

  renderEstimateItems();
}

function renderEstimateItems() {
  const container = document.getElementById("estimateItems");

  if (!container) return;

  container.innerHTML = estimateItems.map((item, index) => `
    <div class="estimate-item-row" data-item-id="${item.local_id}">

      <div class="admin-form-field">
        <label>Product / Inventory Item</label>

        <select
          onchange="handleEstimateProductChange(
            '${item.local_id}',
            this.value
          )">

          <option value="">
            Custom Line Item
          </option>

          ${estimateProducts.map(product => `
            <option
              value="${product.inventory_id}"
              ${String(item.inventory_id) ===
      String(product.inventory_id)
      ? "selected"
      : ""
    }>
              ${escapeEstimateHtml(
      product.material_name || "Unnamed Product"
    )}
              -
              $${formatEstimateMoney(
      getEstimateProductPrice(product)
    )}
              /
              ${escapeEstimateHtml(product.unit || "each")}
            </option>
          `).join("")}

        </select>
      </div>

      <div class="admin-form-field">
        <label>Room / Area</label>

        <input
          type="text"
          value="${escapeEstimateHtml(item.room_name)}"
          placeholder="Example: Kitchen, Bedroom 1"
          oninput="updateEstimateItem(
            '${item.local_id}',
            'room_name',
            this.value
          )">
      </div>

      <div class="admin-form-field">
        <label>Item Type</label>

        <select
          onchange="updateEstimateItem(
            '${item.local_id}',
            'item_type',
            this.value
          )">

          ${[
      "Material",
      "Labor",
      "Removal",
      "Preparation",
      "Delivery",
      "Equipment",
      "Other"
    ].map(type => `
            <option
              value="${type}"
              ${item.item_type === type ? "selected" : ""}>
              ${type}
            </option>
          `).join("")}

        </select>
      </div>

      <div class="admin-form-field full-width">
        <label>Description</label>

        <input
          type="text"
          value="${escapeEstimateHtml(item.description)}"
          placeholder="Describe the product, labor, preparation, removal, or other charge"
          oninput="updateEstimateItem(
            '${item.local_id}',
            'description',
            this.value
          )">
      </div>

      <div class="admin-form-field">
        <label>Quantity</label>

        <input
          type="number"
          min="0"
          step="0.01"
          value="${item.quantity}"
          placeholder="Amount of units"
          oninput="updateEstimateItem(
            '${item.local_id}',
            'quantity',
            this.value
          )">
      </div>

      <div class="admin-form-field">
        <label>Unit of Measurement</label>

        <select
          onchange="updateEstimateItem(
            '${item.local_id}',
            'unit',
            this.value
          )">

          ${[
      "each",
      "sq ft",
      "sq yd",
      "linear ft",
      "hour",
      "day",
      "flat rate"
    ].map(unit => `
            <option
              value="${unit}"
              ${item.unit === unit ? "selected" : ""}>
              ${unit}
            </option>
          `).join("")}

        </select>
      </div>

      <div class="admin-form-field">
        <label>Unit Price ($ per selected unit)</label>

        <input
          type="number"
          min="0"
          step="0.01"
          value="${item.unit_price}"
          placeholder="Price charged for one unit"
          oninput="updateEstimateItem(
            '${item.local_id}',
            'unit_price',
            this.value
          )">
      </div>

      <div class="estimate-item-total">
        <span>Line Total ($)</span>

        <strong>
          $${formatEstimateMoney(
      calculateEstimateLineTotal(item)
    )}
        </strong>
      </div>

      <div class="estimate-item-actions">
        <button
          class="btn secondary"
          type="button"
          onclick="removeEstimateItemRow('${item.local_id}')">
          Remove
        </button>
      </div>

    </div>
  `).join("");

  calculateEstimateTotals();
}

function handleEstimateProductChange(localId, inventoryId) {
  const item =
    estimateItems.find(item => item.local_id === localId);

  if (!item) return;

  item.inventory_id = inventoryId || "";

  if (!inventoryId) {
    renderEstimateItems();
    return;
  }

  const product =
    estimateProducts.find(product =>
      String(product.inventory_id) === String(inventoryId)
    );

  if (!product) return;

  item.description =
    product.material_name ||
    product.description ||
    "";

  item.unit =
    product.unit ||
    "each";

  item.unit_price =
    getEstimateProductPrice(product);

  item.item_type = "Material";

  renderEstimateItems();
}

function updateEstimateItem(localId, field, value) {
  const item =
    estimateItems.find(item => item.local_id === localId);

  if (!item) return;

  if (["quantity", "unit_price"].includes(field)) {
    item[field] = Number(value || 0);
  } else {
    item[field] = value;
  }

  calculateEstimateTotals();

  const row =
    document.querySelector(`[data-item-id="${localId}"]`);

  if (row) {
    const totalElement =
      row.querySelector(".estimate-item-total strong");

    if (totalElement) {
      totalElement.textContent =
        `$${formatEstimateMoney(
          calculateEstimateLineTotal(item)
        )}`;
    }
  }
}

/* ==========================================================
   CALCULATIONS
========================================================== */

function calculateEstimateLineTotal(item) {
  return (
    Number(item.quantity || 0) *
    Number(item.unit_price || 0)
  );
}

function calculateEstimateTotals() {
  const subtotal = estimateItems.reduce(
    (sum, item) =>
      sum + calculateEstimateLineTotal(item),
    0
  );

  const taxRate =
    Number(
      document.getElementById("estimateTaxRate")?.value || 0
    );

  const discount =
    Number(
      document.getElementById("estimateDiscount")?.value || 0
    );

  const deposit =
    Number(
      document.getElementById("estimateDeposit")?.value || 0
    );

  const taxableAmount = Math.max(subtotal - discount, 0);

  const taxAmount =
    taxableAmount * (taxRate / 100);

  const total =
    taxableAmount + taxAmount;

  const balanceDue =
    Math.max(total - deposit, 0);

  setText(
    "estimateSubtotal",
    `$${formatEstimateMoney(subtotal)}`
  );

  setText(
    "estimateTax",
    `$${formatEstimateMoney(taxAmount)}`
  );

  setText(
    "estimateTotal",
    `$${formatEstimateMoney(total)}`
  );

  setText(
    "estimateBalance",
    `$${formatEstimateMoney(balanceDue)}`
  );

  return {
    subtotal,
    taxRate,
    taxAmount,
    discount,
    deposit,
    total,
    balanceDue
  };
}

/* ==========================================================
   SAVE ESTIMATE
========================================================== */

async function saveEstimate() {
  const jobNumber =
    document.getElementById("estimateJobNumber")?.value.trim();

  const notes =
    document.getElementById("estimateNotes")?.value.trim();

  if (!jobNumber) {
    showMessage("Select a job or enter a job number.");
    return;
  }

  const validItems =
    estimateItems.filter(item =>
      item.description.trim() &&
      Number(item.quantity) > 0
    );

  if (!validItems.length) {
    showMessage("Add at least one valid estimate line item.");
    return;
  }

  const totals = calculateEstimateTotals();

  const customerId =
    selectedEstimateCustomer?.customer_id ||
    selectedEstimateJob?.customer_id ||
    selectedEstimateJob?.customers?.customer_id ||
    null;

  const estimatePayload = {
    job_number: jobNumber,
    customer_id: customerId,
    subtotal: totals.subtotal,
    tax_rate: totals.taxRate,
    tax_amount: totals.taxAmount,
    discount: totals.discount,
    deposit: totals.deposit,
    total: totals.total,
    balance_due: totals.balanceDue,
    notes: notes || null,
    status: "Draft"
  };

  const itemPayloads =
    validItems.map((item, index) => ({
      room_name: item.room_name || null,
      item_type: item.item_type || "Line Item",
      description: item.description,
      quantity: Number(item.quantity || 0),
      unit: item.unit || "each",
      unit_price: Number(item.unit_price || 0),
      line_total: calculateEstimateLineTotal(item),
      sort_order: index
    }));

  const {
    data: createdEstimate,
    error
  } = await EstimateService.createEstimateWithItems(
    estimatePayload,
    itemPayloads
  );

  if (error) {
    console.error(error);
    showMessage("Could not save estimate.");
    return;
  }

  if (
    createdEstimate?.estimate_id &&
    selectedEstimateJob?.job_number
  ) {
    await JobService.updateJob(
      selectedEstimateJob.job_number,
      {
        estimate_id: createdEstimate.estimate_id
      }
    );
  }

  showMessage("Estimate saved.");

  resetEstimateForm();

  await loadEstimates();
}

/* ==========================================================
   RESET FORM
========================================================== */

function resetEstimateForm() {
  const form = document.getElementById("estimateForm");

  if (form) {
    form.reset();
  }

  selectedEstimateCustomer = null;
  selectedEstimateJob = null;

  estimateItems = [];

  const taxRate =
    document.getElementById("estimateTaxRate");

  if (taxRate) {
    taxRate.value = "6.35";
  }

  loadEstimateJobs();

  addEstimateItemRow();

  updateEstimateContextPanel();
}

/* ==========================================================
   LOAD SAVED ESTIMATES
========================================================== */

async function loadEstimates() {
  const container = document.getElementById("estimates");

  if (!container) return;

  container.innerHTML = `
    <div class="admin-empty-state">
      Loading estimates...
    </div>
  `;

  const { data, error } =
    await EstimateService.getEstimates();

  if (error) {
    console.error(error);

    container.innerHTML = `
      <div class="admin-empty-state">
        Could not load estimates.
      </div>
    `;

    return;
  }

  const estimates = data || [];

  if (!estimates.length) {
    container.innerHTML = `
      <div class="admin-empty-state">
        No estimates found.
      </div>
    `;

    return;
  }

  container.innerHTML = estimates.map(estimate => {
    const customer =
      estimate.jobs?.customers ||
      estimate.customers ||
      {};

    return `
      <article class="estimate-card">

        <div class="estimate-card-header">
          <div>
            <p class="eyebrow">
              ${escapeEstimateHtml(
      estimate.job_number || "No Job"
    )}
            </p>

            <h3>
              ${escapeEstimateHtml(
      customer.customer_name ||
      "No customer listed"
    )}
            </h3>
          </div>

          <span class="admin-status-pill">
            ${escapeEstimateHtml(
      estimate.status || "Draft"
    )}
          </span>
        </div>

        <div class="estimate-card-details">
          <div>
            <span>Total</span>
            <strong>
              $${formatEstimateMoney(estimate.total)}
            </strong>
          </div>

          <div>
            <span>Deposit</span>
            <strong>
              $${formatEstimateMoney(estimate.deposit)}
            </strong>
          </div>

          <div>
            <span>Balance Due</span>
            <strong>
              $${formatEstimateMoney(estimate.balance_due)}
            </strong>
          </div>
        </div>

      </article>
    `;
  }).join("");
}

/* ==========================================================
   URL CONTEXT
========================================================== */

async function applyEstimateUrlContext() {
  const params = new URLSearchParams(window.location.search);

  const customerId = params.get("customer_id");
  const jobNumber = params.get("job_number");

  if (customerId) {
    const customerSelect =
      document.getElementById("estimateCustomerSelect");

    if (customerSelect) {
      customerSelect.value = customerId;
    }

    await handleEstimateCustomerChange();
  } else {
    await loadEstimateJobs();
  }

  if (jobNumber) {
    const matchingJob =
      estimateJobs.find(job =>
        String(job.job_number) === String(jobNumber)
      );

    if (matchingJob) {
      const jobSelect =
        document.getElementById("estimateJobSelect");

      if (jobSelect) {
        jobSelect.value = matchingJob.job_number;
      }

      handleEstimateJobChange();
    } else {
      const jobNumberInput =
        document.getElementById("estimateJobNumber");

      if (jobNumberInput) {
        jobNumberInput.value = jobNumber;
      }
    }
  }
}

/* ==========================================================
   EVENT LISTENERS
========================================================== */

document
  .getElementById("estimateTaxRate")
  ?.addEventListener("input", calculateEstimateTotals);

document
  .getElementById("estimateDiscount")
  ?.addEventListener("input", calculateEstimateTotals);

document
  .getElementById("estimateDeposit")
  ?.addEventListener("input", calculateEstimateTotals);

/* ==========================================================
   HELPERS
========================================================== */

function getEstimateProductPrice(product) {
  return Number(
    product.price_per_unit ??
    product.unit_cost ??
    0
  );
}

function formatEstimateFlooringTypes(flooringType) {
  if (Array.isArray(flooringType)) {
    return flooringType.join(", ");
  }

  return flooringType || "";
}

function formatEstimateMoney(value) {
  return Number(value || 0).toFixed(2);
}

function escapeEstimateHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}