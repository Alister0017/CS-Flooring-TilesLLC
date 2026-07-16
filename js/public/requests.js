// requests.js

document.addEventListener("DOMContentLoaded", () => {
    initializeRequestPage();
});

async function initializeRequestPage() {
    populateFlooringTypes();
    initializeMinimumDate();
}

function initializeMinimumDate() {
    const dateInput = document.getElementById("preferredDate");

    if (!dateInput) return;

    const today = new Date().toISOString().split("T")[0];
    dateInput.min = today;
}

function populateFlooringTypes() {
    const container = document.getElementById("flooringTypeGrid");

    if (!container) return;

    container.innerHTML = "";

    FLOORING_TYPES.forEach(type => {
        const label = document.createElement("label");
        label.className = "project-type-card";

        label.innerHTML = `
            <input
                type="checkbox"
                value="${type}"
                onchange="updateFlooringSelection()">

            <span>${type}</span>
        `;

        container.appendChild(label);
    });

    updateFlooringSelection();
}

function updateFlooringSelection() {

    const display = document.getElementById("selectedFlooringDisplay");

    if (!display) return;

    const checked = [
        ...document.querySelectorAll(
            "#flooringTypeGrid input:checked"
        )
    ].map(cb => cb.value);

    if (!checked.length) {

        display.innerHTML =
            `<span class="empty-selection">
                No flooring work selected.
            </span>`;

        return;
    }

    display.innerHTML = checked
        .map(type => `<span class="selected-tag">${type}</span>`)
        .join(" ");
}

async function submitRequest() {

    const submitButton = document.querySelector(
        ".request-submit-row button"
    );

    try {

        submitButton.disabled = true;
        submitButton.textContent = "Submitting...";

        const flooringTypes = [
            ...document.querySelectorAll(
                "#flooringTypeGrid input:checked"
            )
        ].map(cb => cb.value);

        if (flooringTypes.length === 0) {
            alert("Please select at least one flooring type.");
            return;
        }

        const preferredTime =
            document.querySelector(
                "input[name='preferredTime']:checked"
            )?.value || null;

        const request = {

            customer_name:
                document.getElementById("name").value.trim(),

            email:
                document.getElementById("email").value.trim(),

            phone:
                document.getElementById("phone").value.trim(),

            address:
                document.getElementById("address").value.trim(),

            //flooring_type:
                //flooringTypes,

            preferred_measurement_date:
                document.getElementById("preferredDate").value || null,

            preferred_measurement_time:
                preferredTime,

            description:
                document.getElementById("description").value.trim()

        };

        const { error } =
            await RequestService.createRequest(request);

        if (error)
            throw error;

        alert(
            "Thank you! Your measurement request has been submitted. We will contact you shortly."
        );

        document.getElementById("requestForm").reset();

        updateFlooringSelection();

    }
    catch (error) {

        console.error(error);

        alert(
            "There was a problem submitting your request. Please try again."
        );

    }
    finally {

        submitButton.disabled = false;
        submitButton.textContent =
            "Request Free Measurement";

    }

}