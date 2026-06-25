// inventory.js

function addInventoryItem() {
    const item = {
        itemId: generateId("ITEM"),
        name: document.getElementById("itemName").value,
        type: document.getElementById("itemType").value,
        unitPrice: Number(document.getElementById("unitPrice").value),
        quantity: Number(document.getElementById("quantity").value),
        available: true,
        createdAt: new Date().toLocaleString()
    };

    saveInventoryItem(item);

    showMessage("Inventory item added.");

    clearForm("inventoryForm");

    loadInventory();
}

function loadInventory() {
    const inventory = getInventory();
    const container = document.getElementById("inventory");

    if (!container) return;

    container.innerHTML = "";

    if (inventory.length === 0) {
        container.innerHTML = "<p>No inventory found.</p>";
        return;
    }

    inventory.forEach(item => {
        const div = document.createElement("div");
        div.className = "card";

        div.innerHTML = `
            <h3>${item.name}</h3>
            <p><strong>Category:</strong> ${item.type}</p>
            <p><strong>Unit Price:</strong> ${formatMoney(item.unitPrice)}</p>
            <p><strong>Quantity:</strong> ${item.quantity}</p>
            <p><strong>Available:</strong> ${item.available ? "Yes" : "No"}</p>

            <button onclick="toggleInventoryAvailable('${item.itemId}')">
                ${item.available ? "Mark Unavailable" : "Mark Available"}
            </button>

            <button onclick="deleteInventoryItem('${item.itemId}')">
                Delete
            </button>
        `;

        container.appendChild(div);
    });
}

function toggleInventoryAvailable(itemId) {
    const inventory = getInventory();
    const item = inventory.find(i => i.itemId === itemId);

    if (!item) return;

    item.available = !item.available;

    updateInventory(inventory);

    loadInventory();
}

function deleteInventoryItem(itemId) {
    const inventory = getInventory();
    const updatedInventory = inventory.filter(item => item.itemId !== itemId);

    updateInventory(updatedInventory);

    loadInventory();
}