// agreements.js

let allAgreements=[];

window.addEventListener("load",()=>{
  initializeAgreementsPage();
});

/* ==========================================================
   INITIALIZE
========================================================== */

async function initializeAgreementsPage(){
  applyAgreementParamsFromUrl();
  fillAgreementDefaults();
  await loadAgreements();
}

function applyAgreementParamsFromUrl(){
  const params=new URLSearchParams(window.location.search);
  const jobNumber=params.get("job");
  const estimateId=params.get("estimate");

  const jobInput=document.getElementById("agreementJobNumber");
  const estimateInput=document.getElementById("agreementEstimateId");

  if(jobNumber&&jobInput)jobInput.value=jobNumber;
  if(estimateId&&estimateInput)estimateInput.value=estimateId;
}

function fillAgreementDefaults(){
  const terms=document.getElementById("agreementTerms");
  const warranty=document.getElementById("agreementWarranty");

  if(terms&&!terms.value){
    terms.value=AgreementService.getDefaultTerms();
  }

  if(warranty&&!warranty.value){
    warranty.value=AgreementService.getDefaultWarranty();
  }
}

/* ==========================================================
   SAVE AGREEMENT
========================================================== */

async function saveAgreement(){
  const jobNumber=document.getElementById("agreementJobNumber")?.value.trim();
  const estimateId=document.getElementById("agreementEstimateId")?.value.trim()||null;
  const scope=document.getElementById("agreementScope")?.value.trim()||null;
  const terms=document.getElementById("agreementTerms")?.value.trim()||null;
  const warranty=document.getElementById("agreementWarranty")?.value.trim()||null;
  const total=Number(document.getElementById("agreementTotal")?.value)||0;
  const deposit=Number(document.getElementById("agreementDeposit")?.value)||0;
  const balance=Number(document.getElementById("agreementBalance")?.value)||0;

  if(!jobNumber){
    showMessage("Please enter a job number.");
    return;
  }

  const submitButton=document.querySelector("#agreementForm button[type='submit']");
  if(submitButton){
    submitButton.disabled=true;
    submitButton.textContent="Saving...";
  }

  try{
    let result;

    if(estimateId&&!scope&&!total){
      result=await AgreementService.createAgreementFromEstimate(estimateId);
    }else{
      result=await AgreementService.createAgreement({
        job_number:jobNumber,
        estimate_id:estimateId,
        scope_of_work:scope,
        terms,
        warranty,
        total,
        deposit,
        balance_due:balance,
        status:AGREEMENT.DEFAULT_STATUS
      });
    }

    if(result.error){
      console.error(result.error);
      showMessage("Could not save agreement.");
      return;
    }

    showMessage("Agreement saved.");

    document.getElementById("agreementForm")?.reset();
    fillAgreementDefaults();

    await loadAgreements();

    if(typeof loadDashboardCounts==="function")loadDashboardCounts();

  }finally{
    if(submitButton){
      submitButton.disabled=false;
      submitButton.textContent="Save Agreement";
    }
  }
}

/* ==========================================================
   LOAD AGREEMENTS
========================================================== */

async function loadAgreements(){
  const container=document.getElementById("agreements");
  if(!container)return;

  container.innerHTML=`<div class="admin-empty-state">Loading agreements...</div>`;

  const{data,error}=await AgreementService.getAgreements();

  if(error){
    console.error(error);
    container.innerHTML=`<div class="admin-empty-state">Could not load agreements.</div>`;
    return;
  }

  allAgreements=data||[];
  renderAgreements(allAgreements);
}

/* ==========================================================
   RENDER AGREEMENTS
========================================================== */

function renderAgreements(agreements){
  const container=document.getElementById("agreements");
  if(!container)return;

  if(!agreements.length){
    container.innerHTML=`
      <div class="admin-empty-state">
        <h3>No agreements yet.</h3>
        <p>Saved customer agreements will appear here.</p>
      </div>
    `;
    return;
  }

  container.innerHTML=agreements.map(agreement=>renderAgreementCard(agreement)).join("");
}

function renderAgreementCard(agreement){
  const job=agreement.jobs||{};
  const customer=job.customers||{};
  const estimate=agreement.estimates||{};

  return`
    <article class="agreement-card">
      <div class="agreement-card-header">
        <div>
          <p class="eyebrow">${agreement.job_number||"Agreement"}</p>
          <h3>${customer.customer_name||"Customer not listed"}</h3>
        </div>

        <span class="${getAgreementStatusClass(agreement.status)}">
          ${agreement.status||AGREEMENT.DEFAULT_STATUS}
        </span>
      </div>

      <div class="agreement-card-details">
        <div>
          <span>Total</span>
          <strong>${formatMoney(agreement.total||estimate.total||0)}</strong>
        </div>

        <div>
          <span>Deposit</span>
          <strong>${formatMoney(agreement.deposit||estimate.deposit||0)}</strong>
        </div>

        <div>
          <span>Balance</span>
          <strong>${formatMoney(agreement.balance_due||estimate.balance_due||0)}</strong>
        </div>

        <div>
          <span>Created</span>
          <strong>${formatAgreementDate(agreement.created_at)}</strong>
        </div>
      </div>

      <div class="agreement-card-actions">
        <button class="btn secondary" type="button" onclick="viewAgreement('${agreement.agreement_id}')">
          View
        </button>

        <button class="btn secondary" type="button" onclick="markAgreementSigned('${agreement.agreement_id}')">
          Mark Signed
        </button>

        <button class="btn danger" type="button" onclick="deleteAgreement('${agreement.agreement_id}','${agreement.job_number||""}')">
          Delete
        </button>
      </div>
    </article>
  `;
}

/* ==========================================================
   VIEW AGREEMENT
========================================================== */

async function viewAgreement(agreementId){
  const{data:agreement,error}=await AgreementService.getAgreement(agreementId);

  if(error||!agreement){
    console.error(error);
    showMessage("Could not load agreement.");
    return;
  }

  const job=agreement.jobs||{};
  const customer=job.customers||{};
  const estimate=agreement.estimates||{};
  const signatures=agreement.agreement_signatures||[];

  openAdminModal({
    title:`Agreement ${agreement.agreement_id}`,
    subtitle:customer.customer_name||agreement.job_number||"Agreement",
    wide:true,
    body:`
      <div class="agreement-modal-summary">
        <div><span>Job</span><strong>${agreement.job_number||"Not listed"}</strong></div>
        <div><span>Customer</span><strong>${customer.customer_name||"Not listed"}</strong></div>
        <div><span>Total</span><strong>${formatMoney(agreement.total||estimate.total||0)}</strong></div>
        <div><span>Status</span><strong>${agreement.status||AGREEMENT.DEFAULT_STATUS}</strong></div>
      </div>

      <div class="agreement-modal-section">
        <h3>Scope of Work</h3>
        <p>${agreement.scope_of_work||"No scope of work listed."}</p>
      </div>

      <div class="agreement-modal-section">
        <h3>Terms</h3>
        <p>${agreement.terms||"No terms listed."}</p>
      </div>

      <div class="agreement-modal-section">
        <h3>Warranty</h3>
        <p>${agreement.warranty||"No warranty details listed."}</p>
      </div>

      <div class="agreement-modal-summary">
        <div><span>Deposit</span><strong>${formatMoney(agreement.deposit||estimate.deposit||0)}</strong></div>
        <div><span>Balance Due</span><strong>${formatMoney(agreement.balance_due||estimate.balance_due||0)}</strong></div>
        <div><span>Estimate</span><strong>${agreement.estimate_id||"Not linked"}</strong></div>
        <div><span>Signed</span><strong>${agreement.signed_at?formatAgreementDate(agreement.signed_at):"Not signed"}</strong></div>
      </div>

      <div class="agreement-modal-section">
        <h3>Signatures</h3>
        ${
          signatures.length
            ?signatures.map(signature=>`
              <div class="agreement-signature-row">
                <strong>${signature.signer_name||"Signer"}</strong>
                <span>${formatAgreementDate(signature.signed_at)}</span>
              </div>
            `).join("")
            :`<p>No signatures recorded yet.</p>`
        }
      </div>
    `,
    footer:`
      <button class="btn secondary" type="button" onclick="closeAdminModal()">Close</button>
      <button class="btn" type="button" onclick="markAgreementSigned('${agreement.agreement_id}')">Mark Signed</button>
    `
  });
}

/* ==========================================================
   ACTIONS
========================================================== */

async function markAgreementSigned(agreementId){
  const{error}=await AgreementService.markAgreementSigned(agreementId);

  if(error){
    console.error(error);
    showMessage("Could not mark agreement signed.");
    return;
  }

  showMessage("Agreement marked signed.");
  closeAdminModal();
  await loadAgreements();
}

async function deleteAgreement(agreementId,jobNumber){
  const confirmed=confirm("Delete this agreement? This cannot be undone.");
  if(!confirmed)return;

  const{error}=await AgreementService.deleteAgreement(agreementId,jobNumber||null);

  if(error){
    console.error(error);
    showMessage("Could not delete agreement.");
    return;
  }

  showMessage("Agreement deleted.");
  await loadAgreements();
}

/* ==========================================================
   HELPERS
========================================================== */

function getAgreementStatusClass(status){
  const lower=String(status||"").toLowerCase();

  if(lower.includes("signed")||lower.includes("complete")){
    return"admin-status-pill completed";
  }

  if(lower.includes("sent")||lower.includes("created")||lower.includes("draft")){
    return"admin-status-pill pending";
  }

  if(lower.includes("cancel")){
    return"admin-status-pill danger";
  }

  return"admin-status-pill";
}

function formatAgreementDate(dateString){
  if(!dateString)return"Not listed";

  const date=new Date(dateString);
  if(Number.isNaN(date.getTime()))return"Not listed";

  return date.toLocaleDateString(JOB.DATE_FORMAT,{
    month:"short",
    day:"numeric",
    year:"numeric"
  });
}