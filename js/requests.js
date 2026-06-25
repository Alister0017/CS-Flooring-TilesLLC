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

function submitRequest() {
    const selectedFlooringTypes = getSelectedFlooringTypes();

    if (selectedFlooringTypes.length === 0) {
        showMessage("Please select at least one type of flooring work.");
        return;
    }

    const request = {
        id: generateId("REQ"),
        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        phone: document.getElementById("phone").value,
        address: document.getElementById("address").value,
        flooringType: selectedFlooringTypes.join(", "),
        preferredDate: document.getElementById("preferredDate").value,
        description: document.getElementById("description").value,
        status: "Measurement Requested",
        createdAt: new Date().toLocaleString()
    };

    saveRequest(request);

    showMessage("Measurement request submitted successfully. All measurements and estimates are free.");

    clearForm("requestForm");
    updateSelectedFlooringDisplay();

    const dropdown = document.getElementById("flooringDropdown");
    const toggleText = document.querySelector(".dropdown-summary-toggle");

    if (dropdown) {
        dropdown.classList.remove("open");
    }

    if (toggleText) {
        toggleText.textContent = "Show options";
    }
}