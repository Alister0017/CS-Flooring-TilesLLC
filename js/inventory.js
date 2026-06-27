// inventory.js

async function uploadInventoryImage(file) {
    const fileExt = file.name.split(".").pop();
    const fileName = `products/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    const { error: uploadError } = await db.storage
        .from("product-images")
        .upload(fileName, file);

    if (uploadError) {
        console.error(uploadError);
        throw uploadError;
    }

    const { data } = db.storage
        .from("product-images")
        .getPublicUrl(fileName);

    return data.publicUrl;
}

async function addInventoryItem() {
    const fileInput = document.getElementById("productFile");
    const file = fileInput.files[0];

    let imageUrl = null;

    if (file) {
        try {
            imageUrl = await uploadInventoryImage(file);
        } catch (error) {
            showMessage("Could not upload product image.");
            return;
        }
    }

    const item = {
        item_name: document.getElementById("itemName").value,
        category: document.getElementById("itemType").value,
        unit_price: Number(document.getElementById("unitPrice").value),
        quantity: Number(document.getElementById("quantity").value),
        available: true,
        image_url: imageUrl
    };

    const { error } = await db
        .from("inventory")
        .insert([item]);

    if (error) {
        console.error(error);
        showMessage("Could not add inventory item.");
        return;
    }

    showMessage("Inventory item added.");

    clearForm("inventoryForm");

    loadInventory();

    if (typeof loadDashboardCounts === "function") {
        loadDashboardCounts();
    }
}

async function loadInventory() {
    const container = document.getElementById("inventory");

    if (!container) return;

    container.innerHTML = "<p>Loading inventory...</p>";

    const { data, error } = await db
        .from("inventory")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        container.innerHTML = "<p>Error loading inventory.</p>";
        return;
    }

    container.innerHTML = "";

    if (!data || data.length === 0) {
        container.innerHTML = "<p>No inventory found.</p>";
        return;
    }

    data.forEach(item => {
        const div = document.createElement("div");
        div.className = "card";

        const imageHTML = item.image_url
            ? `<img src="${item.image_url}" alt="${item.item_name}" class="gallery-photo">`
            : `<div class="placeholder-img">No Image</div>`;

        div.innerHTML = `
            ${imageHTML}
            <h3>${item.item_name}</h3>
            <p><strong>Category:</strong> ${item.category}</p>
            <p><strong>Unit Price:</strong> ${formatMoney(item.unit_price)}</p>
            <p><strong>Quantity:</strong> ${item.quantity}</p>
            <p><strong>Available:</strong> ${item.available ? "Yes" : "No"}</p>

            <button onclick="toggleInventoryAvailable('${item.inventory_id}', ${item.available})">
                ${item.available ? "Mark Unavailable" : "Mark Available"}
            </button>

            <button onclick="deleteInventoryItem('${item.inventory_id}')">
                Delete
            </button>
        `;

        container.appendChild(div);
    });
}

async function toggleInventoryAvailable(itemId, currentStatus) {
    const { error } = await db
        .from("inventory")
        .update({
            available: !currentStatus
        })
        .eq("inventory_id", itemId);

    if (error) {
        console.error(error);
        showMessage("Could not update inventory item.");
        return;
    }

    loadInventory();

    if (typeof loadDashboardCounts === "function") {
        loadDashboardCounts();
    }
}

async function deleteInventoryItem(itemId) {
    const { error } = await db
        .from("inventory")
        .delete()
        .eq("inventory_id", itemId);

    if (error) {
        console.error(error);
        showMessage("Could not delete inventory item.");
        return;
    }

    showMessage("Inventory item deleted.");

    loadInventory();

    if (typeof loadDashboardCounts === "function") {
        loadDashboardCounts();
    }
}