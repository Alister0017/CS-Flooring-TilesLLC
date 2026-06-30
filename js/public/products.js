// products.js

let allProducts = [];
let filteredProducts = [];
let activeCategory = "All Products";

document.addEventListener("DOMContentLoaded", () => {
    initializeProductsPage();
});

/* ==========================================================
   INITIALIZE
========================================================== */

async function initializeProductsPage() {

    await loadProducts();

    buildCategoryButtons();

    filterProducts();

}

/* ==========================================================
   LOAD PRODUCTS
========================================================== */

async function loadProducts() {

    const grid = document.getElementById("productGrid");

    grid.innerHTML = "<p>Loading products...</p>";

    const { data, error } =
        await InventoryService.getInventory();

    if (error) {

        console.error(error);

        grid.innerHTML =
            "<p>Unable to load products.</p>";

        return;

    }

    allProducts = (data || []).filter(product =>
        product.show_on_website === true
    );

    filteredProducts = [...allProducts];

}

/* ==========================================================
   CATEGORY BUTTONS
========================================================== */

function buildCategoryButtons() {

    const container =
        document.getElementById("productCategoryButtons");

    container.innerHTML = "";

    const categories = [
        "All Products",
        ...new Set(
            allProducts.map(product => product.category)
        )
    ];

    categories.forEach(category => {

        const button = document.createElement("button");

        button.className =
            category === activeCategory
                ? "category-btn active"
                : "category-btn";

        button.textContent = category;

        button.onclick = () => {

            activeCategory = category;

            buildCategoryButtons();

            filterProducts();

        };

        container.appendChild(button);

    });

}

/* ==========================================================
   FILTER
========================================================== */

function filterProducts() {

    const search =
        document
            .getElementById("productSearch")
            .value
            .trim()
            .toLowerCase();

    filteredProducts = allProducts.filter(product => {

        const categoryMatch =
            activeCategory === "All Products" ||
            product.category === activeCategory;

        const searchMatch = [

            product.material_name,

            product.manufacturer,

            product.category,

            product.description,

            product.color,

            product.style

        ]
            .join(" ")
            .toLowerCase()
            .includes(search);

        return categoryMatch && searchMatch;

    });

    renderProducts();

}

/* ==========================================================
   RENDER
========================================================== */

function renderProducts() {

    const grid =
        document.getElementById("productGrid");

    const count =
        document.getElementById("productCount");

    const title =
        document.getElementById("categoryTitle");

    title.textContent = activeCategory;

    count.textContent =
        `${filteredProducts.length} Product${filteredProducts.length === 1 ? "" : "s"}`;

    if (!filteredProducts.length) {

        grid.innerHTML = `
            <div class="empty-state">
                <h3>No Products Found</h3>
                <p>
                    Try changing your search or category.
                </p>
            </div>
        `;

        return;

    }

    grid.innerHTML = filteredProducts.map(product => `

        <article class="product-card">

            <div class="product-image">

                <img
                    src="${product.photo_url || "images/product-placeholder.jpg"}"
                    alt="${product.material_name}">

            </div>

            <div class="product-body">

                <span class="product-category">
                    ${product.category}
                </span>

                <h3>
                    ${product.material_name}
                </h3>

                <p class="product-description">
                    ${product.description || ""}
                </p>

                ${product.manufacturer ? `
                    <p>
                        <strong>Manufacturer:</strong>
                        ${product.manufacturer}
                    </p>
                ` : ""}

                ${product.color ? `
                    <p>
                        <strong>Color:</strong>
                        ${product.color}
                    </p>
                ` : ""}

                ${product.style ? `
                    <p>
                        <strong>Style:</strong>
                        ${product.style}
                    </p>
                ` : ""}

                ${product.price_per_unit ? `
                    <div class="product-price">
                        $${Number(product.price_per_unit).toFixed(2)}
                        <small> / ${product.unit || "sq ft"}</small>
                    </div>
                ` : ""}

            </div>

        </article>

    `).join("");

}