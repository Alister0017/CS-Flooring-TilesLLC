// requests.js

function toggleFlooringDropdown() {
    const dropdown = document.getElementById("flooringDropdown");
    const toggleText = document.querySelector(".dropdown-summary-toggle");

    if (!dropdown) return;

    dropdown.classList.toggle("open");

    if (toggleText) {
        toggleText.textContent = dropdown.classList.contains("open")
            ? "Hide options"
            : "Show options";
    }
}

function getSelectedFlooringTypes() {
    const checkedBoxes = document.querySelectorAll(
        'input[name="flooringType"]:checked'
    );

    return Array.from(checkedBoxes).map(box => box.value);
}

function updateSelectedFlooringDisplay() {
    const selected = getSelectedFlooringTypes();
    const display = document.getElementById("selectedFlooringDisplay");

    if (!display) return;

    if (selected.length === 0) {
        display.innerHTML = `<span class="empty-selection">No flooring work selected.</span>`;
        return;
    }

    display.innerHTML = selected
        .map(item => `<span class="selected-tag">${item}</span>`)
        .join("");
}

async function submitRequest() {
    const selectedFlooringTypes = getSelectedFlooringTypes();

    if (selectedFlooringTypes.length === 0) {
        showMessage("Please select at least one type of flooring work.");
        return;
    }

    const request = {
        customer_name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        phone: document.getElementById("phone").value,
        address: document.getElementById("address").value,
        flooring_type: selectedFlooringTypes,
        preferred_measurement_date: document.getElementById("preferredDate").value || null,
        description: document.getElementById("description").value,
        status: "Measurement Requested"
    };

    const { error } = await db
        .from("measurement_requests")
        .insert([request]);

    if (error) {
        console.error(error);
        showMessage("There was an error submitting the request.");
        return;
    }

    showMessage("Measurement request submitted successfully. All measurements and estimates are free.");

    clearForm("requestForm");
    updateSelectedFlooringDisplay();
}