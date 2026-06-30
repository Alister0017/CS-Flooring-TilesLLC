// customer.js

let currentCustomer=null;

window.addEventListener("load",loadCustomerProfile);

/* ==========================================================
   LOAD CUSTOMER
========================================================== */

async function loadCustomerProfile(){
  const params=new URLSearchParams(window.location.search);
  const customerId=params.get("id");
  const container=document.getElementById("customerProfile");
  if(!container)return;

  if(!customerId){
    container.innerHTML=`
      <div class="admin-empty-state">
        <h3>No customer selected.</h3>
        <p>Return to the customer list and choose a customer profile.</p>
      </div>
    `;
    return;
  }

  const{data:customer,error}=await CustomerService.getCustomerById(customerId);

  if(error||!customer){
    console.error(error);
    container.innerHTML=`
      <div class="admin-empty-state">
        <h3>Customer not found.</h3>
        <p>This customer may have been deleted or the link may be incorrect.</p>
      </div>
    `;
    return;
  }

  currentCustomer=customer;
  updateCustomerHeader(customer);
  renderCustomerProfile(customer);
}

function updateCustomerHeader(customer){
  const title=document.getElementById("customerPageTitle");
  const breadcrumb=document.getElementById("customerBreadcrumbName");
  if(title)title.textContent=customer.customer_name||"Customer Profile";
  if(breadcrumb)breadcrumb.textContent=customer.customer_name||"Customer";
}

/* ==========================================================
   RENDER CUSTOMER PROFILE
========================================================== */

function renderCustomerProfile(customer){
  const container=document.getElementById("customerProfile");
  if(!container)return;

  const jobs=customer.jobs||[];
  const activeJobs=jobs.filter(job=>!isCompletedCustomerJob(job.status));
  const completedJobs=jobs.filter(job=>isCompletedCustomerJob(job.status));
  const lastActivity=getCustomerLastActivity(customer,jobs);

  container.innerHTML=`
    <section class="customer-summary">
      <div class="customer-contact-card">
        <p class="eyebrow">Customer Information</p>
        <h2>${customer.customer_name||"Unnamed Customer"}</h2>

        <div class="customer-info-grid">
          <div class="customer-info-item">
            <span>Phone</span>
            <strong>${customer.phone||"Not listed"}</strong>
          </div>

          <div class="customer-info-item">
            <span>Email</span>
            <strong>${customer.email||"Not listed"}</strong>
          </div>

          <div class="customer-info-item">
            <span>Address</span>
            <strong>${customer.address||"Not listed"}</strong>
          </div>

          <div class="customer-info-item full-width">
            <span>Notes</span>
            <strong>${customer.notes||"No customer notes yet."}</strong>
          </div>
        </div>
      </div>

      <div class="customer-stats-card">
        <p class="eyebrow">Customer Summary</p>
        <h2>Overview</h2>

        <div class="customer-stat-grid">
          <div class="customer-stat">
            <span>Total Jobs</span>
            <strong>${jobs.length}</strong>
          </div>

          <div class="customer-stat">
            <span>Active Jobs</span>
            <strong>${activeJobs.length}</strong>
          </div>

          <div class="customer-stat">
            <span>Completed Jobs</span>
            <strong>${completedJobs.length}</strong>
          </div>

          <div class="customer-stat">
            <span>Last Activity</span>
            <strong>${lastActivity}</strong>
          </div>
        </div>
      </div>
    </section>

    <section class="customer-section">
      <div class="customer-section-header">
        <h2>Jobs</h2>
        <a href="${ROUTES.JOBS}">View All Jobs</a>
      </div>

      <div class="customer-job-list">
        ${renderCustomerJobs(jobs)}
      </div>
    </section>

    <section class="customer-section">
      <div class="customer-section-header">
        <h2>Estimates</h2>
        <a href="${ROUTES.ESTIMATES}?customer=${customer.customer_id}">
          Create Estimate
        </a>
      </div>

      <div class="admin-empty-state">
        Estimates connected to this customer will appear here.
      </div>
    </section>

    <section class="customer-section">
      <div class="customer-section-header">
        <h2>Agreements</h2>
        <a href="${ROUTES.AGREEMENTS}?customer=${customer.customer_id}">
          Create Agreement
        </a>
      </div>

      <div class="admin-empty-state">
        Agreements connected to this customer will appear here.
      </div>
    </section>

    <section class="customer-section">
      <div class="customer-section-header">
        <h2>Notes</h2>
      </div>

      <div class="customer-notes">
        <textarea id="customerNotesField" placeholder="Add internal customer notes...">${customer.notes||""}</textarea>
        <button class="btn" type="button" onclick="saveCustomerNotes('${customer.customer_id}')">
          Save Notes
        </button>
      </div>
    </section>

    <section class="customer-section">
      <div class="customer-section-header">
        <h2>Timeline</h2>
      </div>

      <div class="customer-timeline">
        ${renderCustomerTimeline(customer,jobs)}
      </div>
    </section>
  `;
}

/* ==========================================================
   CUSTOMER JOBS
========================================================== */

function renderCustomerJobs(jobs){
  if(!jobs||jobs.length===0){
    return`
      <div class="admin-empty-state">
        No jobs connected to this customer yet.
      </div>
    `;
  }

  return jobs
    .sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0))
    .map(job=>{
      const flooringTypes=formatCustomerFlooringTypes(job.flooring_type);

      return`
        <article class="customer-job-card" onclick="window.location.href='${ROUTES.JOB}?id=${job.job_number}'">
          <div class="customer-job-header">
            <div>
              <p class="eyebrow">Job</p>
              <h3>${job.job_number}</h3>
            </div>

            <span class="${getCustomerJobStatusClass(job.status)}">
              ${job.status||"Status Not Set"}
            </span>
          </div>

          <div class="customer-job-meta">
            <div>
              <span>Requested Work</span>
              <strong>${flooringTypes||"Not listed"}</strong>
            </div>

            <div>
              <span>Measurement Date</span>
              <strong>${formatCustomerDate(job.measurement_date)||"Not scheduled"}</strong>
            </div>

            <div>
              <span>Install Start</span>
              <strong>${formatCustomerDate(job.install_start_date)||"Not scheduled"}</strong>
            </div>

            <div>
              <span>Install Price</span>
              <strong>${job.install_price?formatMoney(job.install_price):"Not set"}</strong>
            </div>
          </div>

          <div class="customer-job-footer">
            Open Job →
          </div>
        </article>
      `;
    })
    .join("");
}

/* ==========================================================
   CUSTOMER TIMELINE
========================================================== */

function renderCustomerTimeline(customer,jobs){
  const timelineItems=[];

  if(customer.created_at){
    timelineItems.push({
      title:"Customer Created",
      date:customer.created_at
    });
  }

  jobs.forEach(job=>{
    if(job.created_at){
      timelineItems.push({
        title:`Job Created: ${job.job_number}`,
        date:job.created_at
      });
    }

    if(job.measurement_date){
      timelineItems.push({
        title:`Measurement Scheduled: ${job.job_number}`,
        date:job.measurement_date
      });
    }

    if(job.install_start_date){
      timelineItems.push({
        title:`Installation Scheduled: ${job.job_number}`,
        date:job.install_start_date
      });
    }

    if(job.install_end_date){
      timelineItems.push({
        title:`Installation End Date: ${job.job_number}`,
        date:job.install_end_date
      });
    }
  });

  if(timelineItems.length===0){
    return`<div class="admin-empty-state">No timeline activity yet.</div>`;
  }

  return timelineItems
    .filter(item=>item.date)
    .sort((a,b)=>new Date(b.date)-new Date(a.date))
    .map(item=>`
      <div class="customer-timeline-item">
        <div class="customer-timeline-dot"></div>

        <div class="customer-timeline-content">
          <strong>${item.title}</strong>
          <span>${formatCustomerDate(item.date)}</span>
        </div>
      </div>
    `)
    .join("");
}

/* ==========================================================
   NOTES
========================================================== */

async function saveCustomerNotes(customerId){
  const notes=document.getElementById("customerNotesField")?.value||"";

  const{error}=await CustomerService.updateCustomer(customerId,{
    notes
  });

  if(error){
    console.error(error);
    showMessage("Could not save customer notes.");
    return;
  }

  showMessage("Customer notes saved.");
  await loadCustomerProfile();
}

/* ==========================================================
   HELPERS
========================================================== */

function isCompletedCustomerJob(status){
  return[
    JOB_STATUS.COMPLETED,
    JOB_STATUS.CLOSED,
    JOB_STATUS.CANCELLED
  ].includes(status);
}

function getCustomerJobStatusClass(status){
  if(!status)return"admin-status-pill";

  const lower=String(status).toLowerCase();

  if(lower.includes("progress")){
    return"admin-status-pill in-progress";
  }

  if(lower.includes("complete")||lower.includes("closed")){
    return"admin-status-pill completed";
  }

  if(lower.includes("cancel")){
    return"admin-status-pill danger";
  }

  if(lower.includes("scheduled")||lower.includes("estimate")||lower.includes("measurement")){
    return"admin-status-pill pending";
  }

  return"admin-status-pill";
}

function getCustomerLastActivity(customer,jobs){
  const dates=[];

  if(customer.created_at){
    dates.push(new Date(customer.created_at));
  }

  jobs.forEach(job=>{
    if(job.created_at){
      dates.push(new Date(job.created_at));
    }

    if(job.updated_at){
      dates.push(new Date(job.updated_at));
    }

    if(job.measurement_date){
      dates.push(new Date(job.measurement_date+"T00:00:00"));
    }

    if(job.install_start_date){
      dates.push(new Date(job.install_start_date+"T00:00:00"));
    }
  });

  const validDates=dates.filter(date=>!Number.isNaN(date.getTime()));

  if(validDates.length===0)return"N/A";

  const latestDate=new Date(Math.max(...validDates.map(date=>date.getTime())));

  return latestDate.toLocaleDateString(JOB.DATE_FORMAT,{
    month:"short",
    day:"numeric"
  });
}

function formatCustomerFlooringTypes(flooringType){
  if(Array.isArray(flooringType)){
    return flooringType.join(", ");
  }

  return flooringType||"";
}

function formatCustomerDate(dateString){
  if(!dateString)return"";

  const normalized=String(dateString).includes("T")
    ?dateString
    :dateString+"T00:00:00";

  const date=new Date(normalized);

  if(Number.isNaN(date.getTime())){
    return"";
  }

  return date.toLocaleDateString(JOB.DATE_FORMAT,{
    month:"short",
    day:"numeric",
    year:"numeric"
  });
}