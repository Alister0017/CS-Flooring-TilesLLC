// calendar.js

let currentCalendarDate=new Date();
let calendarEvents=[];

window.addEventListener("load",loadCalendar);

/* ==========================================================
   LOAD CALENDAR
========================================================== */

async function loadCalendar(){
  await loadCalendarEvents();
  renderCalendar();
  renderUpcomingEvents();
}

async function loadCalendarEvents(){
  const{data,error}=await JobService.getJobs();

  if(error){
    console.error(error);
    calendarEvents=[];
    return;
  }

  calendarEvents=[];

  (data||[]).forEach(job=>{
    const customer=job.customers||{};

    if(job.measurement_date){
      calendarEvents.push({
        type:"Measurement",
        date:job.measurement_date,
        jobNumber:job.job_number,
        customerName:customer.customer_name||"No customer listed",
        address:customer.address||"",
        status:job.status||JOB_STATUS.MEASUREMENT_SCHEDULED
      });
    }

    if(job.install_start_date){
      calendarEvents.push({
        type:"Install",
        date:job.install_start_date,
        jobNumber:job.job_number,
        customerName:customer.customer_name||"No customer listed",
        address:customer.address||"",
        status:job.status||JOB_STATUS.INSTALLATION_SCHEDULED
      });
    }
  });
}

/* ==========================================================
   RENDER MONTH
========================================================== */

function renderCalendar(){
  const grid=document.getElementById("calendarGrid");
  const title=document.getElementById("calendarMonthTitle");
  if(!grid||!title)return;

  const year=currentCalendarDate.getFullYear();
  const month=currentCalendarDate.getMonth();

  title.textContent=currentCalendarDate.toLocaleDateString(JOB.DATE_FORMAT,{
    month:"long",
    year:"numeric"
  });

  grid.innerHTML="";

  const firstDay=new Date(year,month,1);
  const startDate=new Date(firstDay);
  startDate.setDate(startDate.getDate()-firstDay.getDay());

  for(let i=0;i<42;i++){
    const day=new Date(startDate);
    day.setDate(startDate.getDate()+i);

    const dateString=formatCalendarDateForDB(day);
    const dayEvents=calendarEvents.filter(event=>event.date===dateString);

    const dayCell=document.createElement("div");
    dayCell.className="calendar-day";

    if(day.getMonth()!==month)dayCell.classList.add("muted-day");
    if(formatCalendarDateForDB(new Date())===dateString)dayCell.classList.add("today-cell");

    dayCell.innerHTML=`
      <div class="calendar-day-number">${day.getDate()}</div>
      <div class="calendar-event-list"></div>
    `;

    const eventList=dayCell.querySelector(".calendar-event-list");

    dayEvents.forEach(event=>{
      const eventButton=document.createElement("button");
      eventButton.className=event.type==="Install"
        ?"calendar-event install-event"
        :"calendar-event measurement-event";

      eventButton.innerHTML=`
        <span>${event.jobNumber}</span>
        <small>${event.type}</small>
      `;

      eventButton.onclick=()=>openCalendarJob(event.jobNumber);
      eventList.appendChild(eventButton);
    });

    grid.appendChild(dayCell);
  }
}

/* ==========================================================
   UPCOMING EVENTS
========================================================== */

function renderUpcomingEvents(){
  const container=document.getElementById("upcomingEvents");
  if(!container)return;

  const today=formatCalendarDateForDB(new Date());

  const upcoming=calendarEvents
    .filter(event=>event.date>=today)
    .sort((a,b)=>new Date(a.date)-new Date(b.date))
    .slice(0,8);

  if(!upcoming.length){
    container.innerHTML=`<p class="empty-panel">No upcoming events.</p>`;
    return;
  }

  container.innerHTML=upcoming.map(event=>`
    <div class="upcoming-event" onclick="openCalendarJob('${event.jobNumber}')">
      <p><strong>${formatCalendarReadableDate(event.date)}</strong></p>
      <h4>${event.jobNumber}</h4>
      <p>${event.customerName}</p>
      ${event.address?`<p>${event.address}</p>`:""}
      <span class="${event.type==="Install"?"install-badge":"measurement-badge"}">
        ${event.type}
      </span>
    </div>
  `).join("");
}

/* ==========================================================
   NAVIGATION
========================================================== */

function changeMonth(direction){
  currentCalendarDate.setMonth(currentCalendarDate.getMonth()+direction);
  renderCalendar();
  renderUpcomingEvents();
}

function goToToday(){
  currentCalendarDate=new Date();
  renderCalendar();
  renderUpcomingEvents();
}

function openCalendarJob(jobNumber){
  window.location.href=`${ROUTES.JOB}?id=${jobNumber}`;
}

/* ==========================================================
   HELPERS
========================================================== */

function formatCalendarDateForDB(date){
  const year=date.getFullYear();
  const month=String(date.getMonth()+1).padStart(2,"0");
  const day=String(date.getDate()).padStart(2,"0");
  return`${year}-${month}-${day}`;
}

function formatCalendarReadableDate(dateString){
  const date=new Date(dateString+"T00:00:00");

  if(Number.isNaN(date.getTime()))return"";

  return date.toLocaleDateString(JOB.DATE_FORMAT,{
    month:"short",
    day:"numeric",
    year:"numeric"
  });
}