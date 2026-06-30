// estimates.js

let estimateItems=[];

window.addEventListener("load",()=>{
  initializeEstimatesPage();
});

async function initializeEstimatesPage(){
  setupEstimateForm();
  applyEstimateJobFromUrl();
  addEstimateItemRow();
  await loadEstimates();
}

function setupEstimateForm(){
  ["estimateTaxRate","estimateDiscount","estimateDeposit"].forEach(id=>{
    const el=document.getElementById(id);
    if(el)el.addEventListener("input",updateEstimateTotals);
  });
}

function applyEstimateJobFromUrl(){
  const params=new URLSearchParams(window.location.search);
  const jobNumber=params.get("job");
  const input=document.getElementById("estimateJobNumber");
  if(jobNumber&&input)input.value=jobNumber;
}

/* ==========================================================
   LINE ITEMS
========================================================== */

function addEstimateItemRow(){
  const id=Date.now()+Math.random();
  estimateItems.push({id,room_name:"",item_type:"Line Item",description:"",quantity:1,unit:"each",unit_price:0});
  renderEstimateItemRows();
}

function removeEstimateItemRow(id){
  estimateItems=estimateItems.filter(item=>String(item.id)!==String(id));
  renderEstimateItemRows();
}

function renderEstimateItemRows(){
  const container=document.getElementById("estimateItems");
  if(!container)return;

  container.innerHTML=estimateItems.map((item,index)=>`
    <div class="estimate-item-row" data-id="${item.id}">
      <div class="estimate-item-field">
        <label>Room</label>
        <input type="text" value="${item.room_name||""}" oninput="updateEstimateItem(${index},'room_name',this.value)">
      </div>

      <div class="estimate-item-field">
        <label>Type</label>
        <select onchange="updateEstimateItem(${index},'item_type',this.value)">
          <option ${item.item_type==="Line Item"?"selected":""}>Line Item</option>
          <option ${item.item_type==="Material"?"selected":""}>Material</option>
          <option ${item.item_type==="Labor"?"selected":""}>Labor</option>
          <option ${item.item_type==="Removal"?"selected":""}>Removal</option>
          <option ${item.item_type==="Trim"?"selected":""}>Trim</option>
          <option ${item.item_type==="Other"?"selected":""}>Other</option>
        </select>
      </div>

      <div class="estimate-item-field description-field">
        <label>Description</label>
        <input type="text" value="${item.description||""}" oninput="updateEstimateItem(${index},'description',this.value)">
      </div>

      <div class="estimate-item-field">
        <label>Qty</label>
        <input type="number" min="0" step="0.01" value="${item.quantity||0}" oninput="updateEstimateItem(${index},'quantity',this.value)">
      </div>

      <div class="estimate-item-field">
        <label>Unit</label>
        <input type="text" value="${item.unit||"each"}" oninput="updateEstimateItem(${index},'unit',this.value)">
      </div>

      <div class="estimate-item-field">
        <label>Unit Price</label>
        <input type="number" min="0" step="0.01" value="${item.unit_price||0}" oninput="updateEstimateItem(${index},'unit_price',this.value)">
      </div>

      <div class="estimate-line-total">
        <span>Total</span>
        <strong>${formatMoney((Number(item.quantity)||0)*(Number(item.unit_price)||0))}</strong>
      </div>

      <button class="btn danger" type="button" onclick="removeEstimateItemRow('${item.id}')">Remove</button>
    </div>
  `).join("");

  updateEstimateTotals();
}

function updateEstimateItem(index,field,value){
  if(!estimateItems[index])return;

  if(field==="quantity"||field==="unit_price"){
    estimateItems[index][field]=Number(value)||0;
  }else{
    estimateItems[index][field]=value;
  }

  updateEstimateTotals();
  const row=document.querySelectorAll(".estimate-item-row")[index];
  if(row){
    const total=row.querySelector(".estimate-line-total strong");
    if(total){
      total.textContent=formatMoney(
        (Number(estimateItems[index].quantity)||0)*
        (Number(estimateItems[index].unit_price)||0)
      );
    }
  }
}

/* ==========================================================
   TOTALS
========================================================== */

function getEstimateOptions(){
  return{
    tax_rate:Number(document.getElementById("estimateTaxRate")?.value)||0,
    discount:Number(document.getElementById("estimateDiscount")?.value)||0,
    deposit:Number(document.getElementById("estimateDeposit")?.value)||0
  };
}

function updateEstimateTotals(){
  const totals=EstimateService.calculateTotals(estimateItems,getEstimateOptions());

  setText("estimateSubtotal",formatMoney(totals.subtotal));
  setText("estimateTax",formatMoney(totals.taxAmount));
  setText("estimateTotal",formatMoney(totals.total));
  setText("estimateBalance",formatMoney(totals.balanceDue));
}

function setText(id,value){
  const el=document.getElementById(id);
  if(el)el.textContent=value;
}

/* ==========================================================
   SAVE ESTIMATE
========================================================== */

async function saveEstimate(){
  const jobNumber=document.getElementById("estimateJobNumber")?.value.trim();
  const notes=document.getElementById("estimateNotes")?.value.trim()||null;

  if(!jobNumber){
    showMessage("Please enter a job number.");
    return;
  }

  const validItems=estimateItems.filter(item=>item.description&&Number(item.quantity)>0);

  if(!validItems.length){
    showMessage("Please add at least one estimate item with a description.");
    return;
  }

  const estimate={
    job_number:jobNumber,
    tax_rate:Number(document.getElementById("estimateTaxRate")?.value)||0,
    discount:Number(document.getElementById("estimateDiscount")?.value)||0,
    deposit:Number(document.getElementById("estimateDeposit")?.value)||0,
    notes,
    status:ESTIMATE.DEFAULT_STATUS,
    items:validItems
  };

  const{error}=await EstimateService.createEstimate(estimate);

  if(error){
    console.error(error);
    showMessage("Could not save estimate.");
    return;
  }

  showMessage("Estimate saved.");

  document.getElementById("estimateForm")?.reset();
  estimateItems=[];
  addEstimateItemRow();

  await loadEstimates();

  if(typeof loadDashboardCounts==="function")loadDashboardCounts();
}

/* ==========================================================
   LOAD / RENDER SAVED ESTIMATES
========================================================== */

async function loadEstimates(){
  const container=document.getElementById("estimates");
  if(!container)return;

  container.innerHTML=`<div class="admin-empty-state">Loading estimates...</div>`;

  const{data,error}=await EstimateService.getEstimates();

  if(error){
    console.error(error);
    container.innerHTML=`<div class="admin-empty-state">Could not load estimates.</div>`;
    return;
  }

  renderEstimates(data||[]);
}

function renderEstimates(estimates){
  const container=document.getElementById("estimates");
  if(!container)return;

  if(!estimates.length){
    container.innerHTML=`
      <div class="admin-empty-state">
        <h3>No estimates yet.</h3>
        <p>Saved estimates will appear here.</p>
      </div>
    `;
    return;
  }

  container.innerHTML=estimates.map(estimate=>renderEstimateCard(estimate)).join("");
}

function renderEstimateCard(estimate){
  const job=estimate.jobs||{};
  const customer=job.customers||{};

  return`
    <article class="estimate-card">
      <div class="estimate-card-header">
        <div>
          <p class="eyebrow">${estimate.job_number||"Estimate"}</p>
          <h3>${customer.customer_name||"Customer not listed"}</h3>
        </div>
        <span class="admin-status-pill pending">${estimate.status||ESTIMATE.DEFAULT_STATUS}</span>
      </div>

      <div class="estimate-card-details">
        <div><span>Total</span><strong>${formatMoney(estimate.total||0)}</strong></div>
        <div><span>Deposit</span><strong>${formatMoney(estimate.deposit||0)}</strong></div>
        <div><span>Balance</span><strong>${formatMoney(estimate.balance_due||0)}</strong></div>
        <div><span>Created</span><strong>${formatEstimateDate(estimate.created_at)}</strong></div>
      </div>

      ${estimate.notes?`
        <div class="estimate-card-notes">
          <span>Notes</span>
          <p>${estimate.notes}</p>
        </div>
      `:""}

      <div class="estimate-card-actions">
        <button class="btn secondary" type="button" onclick="viewEstimate('${estimate.estimate_id}')">View</button>
        <button class="btn secondary" type="button" onclick="markEstimateSent('${estimate.estimate_id}')">Mark Sent</button>
        <button class="btn danger" type="button" onclick="deleteEstimate('${estimate.estimate_id}','${estimate.job_number||""}')">Delete</button>
      </div>
    </article>
  `;
}

/* ==========================================================
   ACTIONS
========================================================== */

async function viewEstimate(estimateId){
  const{data:estimate,error}=await EstimateService.getEstimate(estimateId);

  if(error||!estimate){
    console.error(error);
    showMessage("Could not load estimate.");
    return;
  }

  const items=estimate.estimate_items||[];
  const job=estimate.jobs||{};
  const customer=job.customers||{};

  openAdminModal({
    title:`Estimate ${estimate.estimate_id}`,
    subtitle:customer.customer_name||estimate.job_number||"Estimate",
    wide:true,
    body:`
      <div class="estimate-modal-summary">
        <div><span>Job</span><strong>${estimate.job_number}</strong></div>
        <div><span>Total</span><strong>${formatMoney(estimate.total||0)}</strong></div>
        <div><span>Deposit</span><strong>${formatMoney(estimate.deposit||0)}</strong></div>
        <div><span>Balance</span><strong>${formatMoney(estimate.balance_due||0)}</strong></div>
      </div>

      <div class="estimate-modal-items">
        ${items.map(item=>`
          <div class="estimate-modal-item">
            <strong>${item.description}</strong>
            <span>${item.quantity} ${item.unit||"each"} × ${formatMoney(item.unit_price||0)}</span>
            <span>${formatMoney(item.line_total||0)}</span>
          </div>
        `).join("")}
      </div>

      ${estimate.notes?`<p>${estimate.notes}</p>`:""}
    `,
    footer:`
      <button class="btn secondary" type="button" onclick="closeAdminModal()">Close</button>
    `
  });
}

async function markEstimateSent(estimateId){
  const{error}=await EstimateService.updateEstimateStatus(estimateId,ESTIMATE.STATUS_SENT||"Sent");

  if(error){
    console.error(error);
    showMessage("Could not update estimate.");
    return;
  }

  showMessage("Estimate marked sent.");
  await loadEstimates();
}

async function deleteEstimate(estimateId,jobNumber){
  const confirmed=confirm("Delete this estimate? This cannot be undone.");
  if(!confirmed)return;

  const{error}=await EstimateService.deleteEstimate(estimateId,jobNumber||null);

  if(error){
    console.error(error);
    showMessage("Could not delete estimate.");
    return;
  }

  showMessage("Estimate deleted.");
  await loadEstimates();
}

/* ==========================================================
   HELPERS
========================================================== */

function formatEstimateDate(dateString){
  if(!dateString)return"Not listed";
  const date=new Date(dateString);
  if(Number.isNaN(date.getTime()))return"Not listed";

  return date.toLocaleDateString(JOB.DATE_FORMAT,{
    month:"short",
    day:"numeric",
    year:"numeric"
  });
}