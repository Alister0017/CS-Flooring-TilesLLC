// calendar.js

let currentCalendarDate = new Date();
let calendarEvents = [];

async function loadCalendar() {
    await loadCalendarEvents();
    renderCalendar();
    renderUpcomingEvents();
}

async function loadCalendarEvents() {
    const { data, error } = await db
        .from("jobs")
        .select(`
            *,
            customers (
                customer_name,
                email,
                phone,
                address
            )
        `)
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        calendarEvents = [];
        return;
    }

    calendarEvents = [];

    data.forEach(job => {
        if (job.measurement_date) {
            calendarEvents.push({
                type: "Measurement",
                date: job.measurement_date,
                jobNumber: job.job_number,
                customerName: job.customers?.customer_name || "No customer listed",
                status: job.status
            });
        }

        if (job.install_start_date) {
            calendarEvents.push({
                type: "Install",
                date: job.install_start_date,
                jobNumber: job.job_number,
                customerName: job.customers?.customer_name || "No customer listed",
                status: job.status
            });
        }
    });
}

function renderCalendar() {
    const grid = document.getElementById("calendarGrid");
    const title = document.getElementById("calendarMonthTitle");

    if (!grid || !title) return;

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    title.textContent = currentCalendarDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric"
    });

    grid.innerHTML = "";

    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    for (let i = 0; i < 42; i++) {
        const day = new Date(startDate);
        day.setDate(startDate.getDate() + i);

        const dateString = formatDateForDB(day);
        const dayEvents = calendarEvents.filter(event => event.date === dateString);

        const dayCell = document.createElement("div");
        dayCell.className = "calendar-day";

        if (day.getMonth() !== month) {
            dayCell.classList.add("muted-day");
        }

        const today = new Date();
        if (formatDateForDB(today) === dateString) {
            dayCell.classList.add("today-cell");
        }

        dayCell.innerHTML = `
            <div class="calendar-day-number">${day.getDate()}</div>
            <div class="calendar-event-list"></div>
        `;

        const eventList = dayCell.querySelector(".calendar-event-list");

        dayEvents.forEach(event => {
            const eventButton = document.createElement("button");

            eventButton.className =
                event.type === "Install"
                    ? "calendar-event install-event"
                    : "calendar-event measurement-event";

            eventButton.innerHTML = `
                <span>${event.jobNumber}</span>
                <small>${event.type}</small>
            `;

            eventButton.onclick = function () {
                openJob(event.jobNumber);
            };

            eventList.appendChild(eventButton);
        });

        grid.appendChild(dayCell);
    }
}

function renderUpcomingEvents() {
    const container = document.getElementById("upcomingEvents");

    if (!container) return;

    const today = formatDateForDB(new Date());

    const upcoming = calendarEvents
        .filter(event => event.date >= today)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 8);

    container.innerHTML = "";

    if (upcoming.length === 0) {
        container.innerHTML = "<p class='empty-panel'>No upcoming events.</p>";
        return;
    }

    upcoming.forEach(event => {
        const div = document.createElement("div");
        div.className = "upcoming-event";

        div.innerHTML = `
            <p><strong>${formatReadableDate(event.date)}</strong></p>
            <h4>${event.jobNumber}</h4>
            <p>${event.customerName}</p>
            <span class="${event.type === "Install" ? "install-badge" : "measurement-badge"}">
                ${event.type}
            </span>
        `;

        div.onclick = function () {
            openJob(event.jobNumber);
        };

        container.appendChild(div);
    });
}

function changeMonth(direction) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + direction);
    renderCalendar();
    renderUpcomingEvents();
}

function goToToday() {
    currentCalendarDate = new Date();
    renderCalendar();
    renderUpcomingEvents();
}

function openJob(jobNumber) {
    localStorage.setItem("selectedJobNumber", jobNumber);
    window.location.href = "admin-jobs.html";
}

function formatDateForDB(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function formatReadableDate(dateString) {
    const date = new Date(dateString + "T00:00:00");

    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}