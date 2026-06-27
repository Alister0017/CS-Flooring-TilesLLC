// customers.js

async function loadCustomers() {
    const container = document.getElementById("customers");

    if (!container) return;

    container.innerHTML = "<p>Loading customers...</p>";

    const { data, error } = await db
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        container.innerHTML = "<p>Error loading customers.</p>";
        return;
    }

    container.innerHTML = "";

    if (!data || data.length === 0) {
        container.innerHTML = "<p>No customers found.</p>";
        return;
    }

    data.forEach(customer => {
        const div = document.createElement("div");
        div.className = "card";

        div.innerHTML = `
            <h3>${customer.customer_name}</h3>
            <p><strong>Email:</strong> ${customer.email}</p>
            <p><strong>Phone:</strong> ${customer.phone}</p>
            <p><strong>Address:</strong> ${customer.address || "No address listed"}</p>
            <p><strong>Active:</strong> ${customer.active ? "Yes" : "No"}</p>

            <button onclick="toggleCustomerActive('${customer.customer_id}', ${customer.active})">
                ${customer.active ? "Mark Inactive" : "Mark Active"}
            </button>
        `;

        container.appendChild(div);
    });
}

async function toggleCustomerActive(customerId, currentStatus) {
    const { error } = await db
        .from("customers")
        .update({
            active: !currentStatus
        })
        .eq("customer_id", customerId);

    if (error) {
        console.error(error);
        showMessage("Could not update customer.");
        return;
    }

    loadCustomers();

    if (typeof loadDashboardCounts === "function") {
        loadDashboardCounts();
    }
}