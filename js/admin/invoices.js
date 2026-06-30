// invoices.js

let invoiceItems=[];

window.addEventListener("load",()=>{
  initializeInvoicesPage();
});

/* ==========================================================
   INITIALIZE
========================================================== */

async function initializeInvoicesPage(){
  setupInvoiceForm();
  applyInvoiceParamsFromUrl();
  addInvoiceItemRow();
  await loadInvoices();
}

function setupInvoiceForm(){
  ["invoiceTaxAmount","invoiceDiscount","invoiceAmountPaid"].forEach(id=>{
    const el=document.getElementById(id);
    if(el)el.addEventListener("input",updateInvoiceTotals);
  });
}

function applyInvoiceParamsFromUrl(){
  const params=new URLSearchParams(window.location.search);
  const jobNumber=params.get("job");
  const estimateId=params.get("estimate");
  const agreementId=params.get("agreement");

  if(jobNumber&&document.getElementById("invoiceJobNumber")){
    document.getElementById("invoiceJobNumber").value=jobNumber;
  }

  if(estimateId&&document.getElementById("invoiceEstimateId")){
    document.getElementById("invoiceEstimateId").value=estimateId;
  }

  if(agreementId&&document.getElementById("invoiceAgreementId")){
    document.getElementById("invoiceAgreementId").value=agreementId;
  }
}

/* ==========================================================
   LINE ITEMS
========================================================== */

function addInvoiceItemRow(){
  const id=Date.now()+Math.random();
  invoiceItems.push({
    id,
    description:"",
    quantity:1,
    unit:"each",
    unit_price:0
  });
  renderInvoiceItemRows();
}

function removeInvoiceItemRow(id){
  invoiceItems=invoiceItems.filter(item=>String(item.id)!==String(id));
  renderInvoiceItemRows();
}

function renderInvoiceItemRows(){
  const container=document.getElementById("invoiceItems");
  if(!container)return;

  container.innerHTML=invoiceItems.map((item,index)=>`
    <div class="invoice-item-row" data-id="${item.id}">
      <div class="invoice-item-field description-field">
        <label>Description</label>
        <input type="text" value="${item.description||""}" oninput="updateInvoiceItem(${index},'description',this.value)">
      </div>

      <div class="invoice-item-field">
        <label>Qty</label>
        <input type="number" min="0" step="0.01" value="${item.quantity||0}" oninput="updateInvoiceItem(${index},'quantity',this.value)">
      </div>

      <div class="invoice-item-field">
        <label>Unit</label>
        <input type="text" value="${item.unit||"each"}" oninput="updateInvoiceItem(${index},'unit',this.value)">
      </div>

      <div class="invoice-item-field">
        <label>Unit Price</label>
        <input type="number" min="0" step="0.01" value="${item.unit_price||0}" oninput="updateInvoiceItem(${index},'unit_price',this.value)">
      </div>

      <div class="invoice-line-total">
        <span>Total</span>
        <strong>${formatMoney((Number(item.quantity)||0)*(Number(item.unit_price)||0))}</strong>
      </div>

      <button class="btn danger" type="button" onclick="removeInvoiceItemRow('${item.id}')">Remove</button>
    </div>
  `).join("");

  updateInvoiceTotals();
}

function updateInvoiceItem(index,field,value){
  if(!invoiceItems[index])return;

  if(field==="quantity"||field==="unit_price"){
    invoiceItems[index][field]=Number(value)||0;
  }else{
    invoiceItems[index][field]=value;
  }

  updateInvoiceTotals();

  const row=document.querySelectorAll(".invoice-item-row")[index];
  if(row){
    const total=row.querySelector(".invoice-line-total strong");
    if(total){
      total.textContent=formatMoney(
        (Number(invoiceItems[index].quantity)||0)*
        (Number(invoiceItems[index].unit_price)||0)
      );
    }
  }
}

/* ==========================================================
   TOTALS
========================================================== */

function getInvoiceOptions(){
  return{
    tax_amount:Number(document.getElementById("invoiceTaxAmount")?.value)||0,
    discount:Number(document.getElementById("invoiceDiscount")?.value)||0,
    amount_paid:Number(document.getElementById("invoiceAmountPaid")?.value)||0
  };
}

function updateInvoiceTotals(){
  const totals=InvoiceService.calculateTotals(invoiceItems,getInvoiceOptions());

  setInvoiceText("invoiceSubtotal",formatMoney(totals.subtotal));
  setInvoiceText("invoiceTotal",formatMoney(totals.total));
  setInvoiceText("invoicePaid",formatMoney(getInvoiceOptions().amount_paid));
  setInvoiceText("invoiceBalance",formatMoney(totals.balanceDue));
}

function setInvoiceText(id,value){
  const el=document.getElementById(id);
  if(el)el.textContent=value;
}

/* ==========================================================
   SAVE INVOICE
========================================================== */

async function saveInvoice(){
  const jobNumber=document.getElementById("invoiceJobNumber")?.value.trim();
  const estimateId=document.getElementById("invoiceEstimateId")?.value.trim()||null;
  const agreementId=document.getElementById("invoiceAgreementId")?.value.trim()||null;
  const dueDate=document.getElementById("invoiceDueDate")?.value||null;
  const notes=document.getElementById("invoiceNotes")?.value.trim()||null;

  if(!jobNumber){
    showMessage("Please enter a job number.");
    return;
  }

  const validItems=invoiceItems.filter(item=>item.description&&Number(item.quantity)>0);

  if(!validItems.length){
    showMessage("Please add at least one invoice item with a description.");
    return;
  }

  const invoice={
    job_number:jobNumber,
    estimate_id:estimateId,
    agreement_id:agreementId,
    tax_amount:Number(document.getElementById("invoiceTaxAmount")?.value)||0,
    discount:Number(document.getElementById("invoiceDiscount")?.value)||0,
    amount_paid:Number(document.getElementById("invoiceAmountPaid")?.value)||0,
    due_date:dueDate,
    notes,
    status:INVOICE.DEFAULT_STATUS,
    items:validItems
  };

  const{error}=await InvoiceService.createInvoice(invoice);

  if(error){
    console.error(error);
    showMessage("Could not save invoice.");
    return;
  }

  showMessage("Invoice saved.");

  document.getElementById("invoiceForm")?.reset();
  invoiceItems=[];
  addInvoiceItemRow();

  await loadInvoices();

  if(typeof loadDashboardCounts==="function")loadDashboardCounts();
}

/* ==========================================================
   LOAD / RENDER INVOICES
========================================================== */

async function loadInvoices(){
  const container=document.getElementById("invoices");
  if(!container)return;

  container.innerHTML=`<div class="admin-empty-state">Loading invoices...</div>`;

  const{data,error}=await InvoiceService.getInvoices();

  if(error){
    console.error(error);
    container.innerHTML=`<div class="admin-empty-state">Could not load invoices.</div>`;
    return;
  }

  renderInvoices(data||[]);
}

function renderInvoices(invoices){
  const container=document.getElementById("invoices");
  if(!container)return;

  if(!invoices.length){
    container.innerHTML=`
      <div class="admin-empty-state">
        <h3>No invoices yet.</h3>
        <p>Saved invoices will appear here.</p>
      </div>
    `;
    return;
  }

  container.innerHTML=invoices.map(invoice=>renderInvoiceCard(invoice)).join("");
}

function renderInvoiceCard(invoice){
  const job=invoice.jobs||{};
  const customer=job.customers||{};

  return`
    <article class="invoice-card">
      <div class="invoice-card-header">
        <div>
          <p class="eyebrow">${invoice.job_number||"Invoice"}</p>
          <h3>${customer.customer_name||"Customer not listed"}</h3>
        </div>

        <span class="${getInvoiceStatusClass(invoice.status)}">
          ${invoice.status||INVOICE.DEFAULT_STATUS}
        </span>
      </div>

      <div class="invoice-card-details">
        <div><span>Total</span><strong>${formatMoney(invoice.total||0)}</strong></div>
        <div><span>Paid</span><strong>${formatMoney(invoice.amount_paid||0)}</strong></div>
        <div><span>Balance</span><strong>${formatMoney(invoice.balance_due||0)}</strong></div>
        <div><span>Due</span><strong>${formatInvoiceDate(invoice.due_date)}</strong></div>
      </div>

      ${invoice.notes?`
        <div class="invoice-card-notes">
          <span>Notes</span>
          <p>${invoice.notes}</p>
        </div>
      `:""}

      <div class="invoice-card-actions">
        <button class="btn secondary" type="button" onclick="viewInvoice('${invoice.invoice_id}')">View</button>
        <button class="btn secondary" type="button" onclick="openPaymentModal('${invoice.invoice_id}')">Add Payment</button>
        <button class="btn danger" type="button" onclick="deleteInvoice('${invoice.invoice_id}','${invoice.job_number||""}')">Delete</button>
      </div>
    </article>
  `;
}

/* ==========================================================
   VIEW INVOICE
========================================================== */

async function viewInvoice(invoiceId){
  const{data:invoice,error}=await InvoiceService.getInvoice(invoiceId);

  if(error||!invoice){
    console.error(error);
    showMessage("Could not load invoice.");
    return;
  }

  const job=invoice.jobs||{};
  const customer=job.customers||{};
  const items=invoice.invoice_items||[];
  const payments=invoice.invoice_payments||[];

  openAdminModal({
    title:`Invoice ${invoice.invoice_id}`,
    subtitle:customer.customer_name||invoice.job_number||"Invoice",
    wide:true,
    body:`
      <div class="invoice-modal-summary">
        <div><span>Job</span><strong>${invoice.job_number||"Not listed"}</strong></div>
        <div><span>Total</span><strong>${formatMoney(invoice.total||0)}</strong></div>
        <div><span>Paid</span><strong>${formatMoney(invoice.amount_paid||0)}</strong></div>
        <div><span>Balance</span><strong>${formatMoney(invoice.balance_due||0)}</strong></div>
      </div>

      <div class="invoice-modal-section">
        <h3>Invoice Items</h3>
        <div class="invoice-modal-items">
          ${
            items.length
              ?items.map(item=>`
                <div class="invoice-modal-item">
                  <strong>${item.description}</strong>
                  <span>${item.quantity} ${item.unit||"each"} × ${formatMoney(item.unit_price||0)}</span>
                  <span>${formatMoney(item.line_total||0)}</span>
                </div>
              `).join("")
              :`<div class="admin-empty-state">No invoice items listed.</div>`
          }
        </div>
      </div>

      <div class="invoice-modal-section">
        <h3>Payments</h3>
        <div class="invoice-payment-list">
          ${
            payments.length
              ?payments.map(payment=>`
                <div class="invoice-payment-row">
                  <strong>${formatMoney(payment.amount||0)}</strong>
                  <span>${payment.payment_method||"Payment"} · ${formatInvoiceDate(payment.payment_date)}</span>
                </div>
              `).join("")
              :`<div class="admin-empty-state">No payments recorded yet.</div>`
          }
        </div>
      </div>

      ${invoice.notes?`
        <div class="invoice-modal-section">
          <h3>Notes</h3>
          <p>${invoice.notes}</p>
        </div>
      `:""}
    `,
    footer:`
      <button class="btn secondary" type="button" onclick="closeAdminModal()">Close</button>
      <button class="btn" type="button" onclick="openPaymentModal('${invoice.invoice_id}')">Add Payment</button>
    `
  });
}

/* ==========================================================
   PAYMENTS
========================================================== */

function openPaymentModal(invoiceId){
  openAdminModal({
    title:"Add Payment",
    subtitle:`Invoice ${invoiceId}`,
    wide:false,
    body:`
      <div class="admin-modal-grid">
        <div class="admin-modal-field">
          <label for="paymentAmount">Payment Amount</label>
          <input id="paymentAmount" type="number" step="0.01" min="0" required>
        </div>

        <div class="admin-modal-field">
          <label for="paymentMethod">Payment Method</label>
          <select id="paymentMethod">
            <option value="">Select Method</option>
            <option>Cash</option>
            <option>Check</option>
            <option>Credit Card</option>
            <option>Debit Card</option>
            <option>Bank Transfer</option>
            <option>Other</option>
          </select>
        </div>

        <div class="admin-modal-field">
          <label for="paymentDate">Payment Date</label>
          <input id="paymentDate" type="date" value="${new Date().toISOString().split("T")[0]}">
        </div>

        <div class="admin-modal-field full-width">
          <label for="paymentNotes">Notes</label>
          <textarea id="paymentNotes" placeholder="Optional payment notes..."></textarea>
        </div>
      </div>
    `,
    footer:`
      <button class="btn secondary" type="button" onclick="closeAdminModal()">Cancel</button>
      <button class="btn" type="button" onclick="saveInvoicePayment('${invoiceId}')">Save Payment</button>
    `
  });
}

async function saveInvoicePayment(invoiceId){
  const amount=Number(document.getElementById("paymentAmount")?.value)||0;
  const payment_method=document.getElementById("paymentMethod")?.value||null;
  const payment_date=document.getElementById("paymentDate")?.value||new Date().toISOString().split("T")[0];
  const notes=document.getElementById("paymentNotes")?.value.trim()||null;

  if(amount<=0){
    showMessage("Please enter a payment amount.");
    return;
  }

  const{error}=await InvoiceService.addPayment(invoiceId,{
    amount,
    payment_method,
    payment_date,
    notes
  });

  if(error){
    console.error(error);
    showMessage("Could not save payment.");
    return;
  }

  showMessage("Payment saved.");
  closeAdminModal();
  await loadInvoices();
}

/* ==========================================================
   DELETE
========================================================== */

async function deleteInvoice(invoiceId,jobNumber){
  const confirmed=confirm("Delete this invoice? This cannot be undone.");
  if(!confirmed)return;

  const{error}=await InvoiceService.deleteInvoice(invoiceId,jobNumber||null);

  if(error){
    console.error(error);
    showMessage("Could not delete invoice.");
    return;
  }

  showMessage("Invoice deleted.");
  await loadInvoices();
}

/* ==========================================================
   HELPERS
========================================================== */

function getInvoiceStatusClass(status){
  const lower=String(status||"").toLowerCase();

  if(lower.includes("paid")){
    return"admin-status-pill completed";
  }

  if(lower.includes("overdue")||lower.includes("cancel")){
    return"admin-status-pill danger";
  }

  if(lower.includes("sent")||lower.includes("draft")||lower.includes("open")){
    return"admin-status-pill pending";
  }

  return"admin-status-pill";
}

function formatInvoiceDate(dateString){
  if(!dateString)return"Not listed";

  const normalized=String(dateString).includes("T")
    ?dateString
    :dateString+"T00:00:00";

  const date=new Date(normalized);
  if(Number.isNaN(date.getTime()))return"Not listed";

  return date.toLocaleDateString(JOB.DATE_FORMAT,{
    month:"short",
    day:"numeric",
    year:"numeric"
  });
}