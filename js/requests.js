// requests.js

function submitRequest() {
    const request = {
        id: generateId("REQ"),
        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        phone: document.getElementById("phone").value,
        address: document.getElementById("address").value,
        flooringType: document.getElementById("flooringType").value,
        squareFootage: document.getElementById("squareFootage").value,
        preferredDate: document.getElementById("preferredDate").value,
        description: document.getElementById("description").value,
        status: "Measurement Requested",
        createdAt: new Date().toLocaleString()
    };

    saveRequest(request);

    showMessage("Measurement request submitted successfully. All measurements and estimates are free.");

    clearForm("requestForm");
}