// products.js

let selectedCategory = "All";
let allProducts = [];

window.addEventListener("load", loadProducts);

async function loadProducts() {
    const grid = document.getElementById("productGrid");

    if (!grid) return;

    grid.innerHTML = "<p>Loading products...</p>";

    const { data, error } = await db
        .from("inventory")
        .select("*")
        .eq("available", true)
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        grid.innerHTML = "<p>Error loading products.</p>";
        return;
    }

    allProducts = data || [];

    renderProducts(allProducts);
}

function setCategory(category) {
    selectedCategory = category;

    const title = document.getElementById("categoryTitle");

    if (title) {
        title.textContent =
            category === "All" ? "All Products" : category;
    }

    filterProducts();
}

function filterProducts() {
    const searchInput = document.getElementById("productSearch");
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";

    const filteredProducts = allProducts.filter(product => {
        const name = product.item_name ? product.item_name.toLowerCase() : "";
        const category = product.category || "";
        const price = product.unit_price ? String(product.unit_price) : "";

        const matchesCategory =
            selectedCategory === "All" ||
            category === selectedCategory;

        const matchesSearch =
            searchTerm === "" ||
            name.includes(searchTerm) ||
            category.toLowerCase().includes(searchTerm) ||
            price.includes(searchTerm);

        return matchesCategory && matchesSearch;
    });

    renderProducts(filteredProducts);
}

function renderProducts(products) {
    const grid = document.getElementById("productGrid");

    if (!grid) return;

    grid.innerHTML = "";

    if (!products || products.length === 0) {
        grid.innerHTML = "<p>No products found.</p>";
        return;
    }

    products.forEach(product => {
        const div = document.createElement("div");
        div.className = "card product-card";

        const imageHTML = product.image_url
            ? `<img src="${product.image_url}" alt="${product.item_name}" class="product-image">`
            : `<div class="placeholder-img">Image</div>`;

        div.innerHTML = `
            ${imageHTML}
            <h3>${product.item_name}</h3>
            <p><strong>Category:</strong> ${product.category}</p>
            <p><strong>Unit Price:</strong> ${formatMoney(product.unit_price)}</p>
            <p><strong>Available Quantity:</strong> ${product.quantity}</p>
            <p>
              Final install pricing is determined after the free measurement.
            </p>
        `;

        grid.appendChild(div);
    });
}