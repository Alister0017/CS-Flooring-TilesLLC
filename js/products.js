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

  applyCategoryFromUrl();
  filterProducts();
}

function applyCategoryFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const categoryFromUrl = params.get("category");

  if (categoryFromUrl) {
    selectedCategory = decodeURIComponent(categoryFromUrl);
  }

  updateCategoryUI();
}

function setCategory(category) {
  selectedCategory = category;
  updateCategoryUI();
  filterProducts();

  const url = new URL(window.location);
  if (category === "All") {
    url.searchParams.delete("category");
  } else {
    url.searchParams.set("category", category);
  }

  window.history.replaceState({}, "", url);
}

function updateCategoryUI() {
  const title = document.getElementById("categoryTitle");
  const buttons = document.querySelectorAll(".category-pill");

  if (title) {
    title.textContent = selectedCategory === "All" ? "All Products" : selectedCategory;
  }

  buttons.forEach(button => {
    const buttonCategory = button.dataset.category;

    if (buttonCategory === selectedCategory) {
      button.classList.add("active");
    } else {
      button.classList.remove("active");
    }
  });
}

function filterProducts() {
  const searchInput = document.getElementById("productSearch");
  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : "";

  const filteredProducts = allProducts.filter(product => {
    const name = product.item_name ? product.item_name.toLowerCase() : "";
    const category = product.category ? product.category.toLowerCase() : "";
    const description = product.description ? product.description.toLowerCase() : "";
    const manufacturer = product.manufacturer ? product.manufacturer.toLowerCase() : "";
    const price = product.unit_price ? String(product.unit_price) : "";

    const matchesCategory =
      selectedCategory === "All" ||
      product.category === selectedCategory;

    const matchesSearch =
      searchTerm === "" ||
      name.includes(searchTerm) ||
      category.includes(searchTerm) ||
      description.includes(searchTerm) ||
      manufacturer.includes(searchTerm) ||
      price.includes(searchTerm);

    return matchesCategory && matchesSearch;
  });

  renderProducts(filteredProducts);
}

function renderProducts(products) {
  const grid = document.getElementById("productGrid");
  const count = document.getElementById("productCount");

  if (!grid) return;

  grid.innerHTML = "";

  if (count) {
    const label = products.length === 1 ? "product" : "products";
    count.textContent = `${products.length} ${label} found`;
  }

  if (!products || products.length === 0) {
    grid.innerHTML = `
      <div class="empty-products">
        <h3>No products matched your search.</h3>
        <p>Try clearing the search or choosing another flooring category.</p>
        <button onclick="clearProductFilters()">Clear Filters</button>
      </div>
    `;
    return;
  }

  products.forEach(product => {
    const div = document.createElement("div");
    div.className = "product-card-v2";

    const imageHTML = product.image_url
      ? `<img src="${product.image_url}" alt="${product.item_name}" class="product-image-v2">`
      : `<div class="product-image-placeholder">Product Image</div>`;

    const category = product.category || "Flooring Product";
    const price = product.unit_price ? formatMoney(product.unit_price) : "Price provided after measurement";

    div.innerHTML = `
      <div class="product-image-wrap">
        ${imageHTML}
        <span class="product-badge">Available</span>
      </div>

      <div class="product-card-body">
        <p class="product-category">${category}</p>
        <h3>${product.item_name}</h3>

        <div class="product-meta">
          <div>
            <span>Category</span>
            <strong>${category}</strong>
          </div>

          <div>
            <span>Product Price</span>
            <strong>${price}</strong>
          </div>
        </div>

        <p class="product-description">
          ${product.description || "Final installation pricing is determined after the free measurement."}
        </p>

        <a class="card-link product-request-link" href="request.html">
          Request Measurement
        </a>
      </div>
    `;

    grid.appendChild(div);
  });
}

function clearProductFilters() {
  const searchInput = document.getElementById("productSearch");

  if (searchInput) {
    searchInput.value = "";
  }

  selectedCategory = "All";
  updateCategoryUI();
  filterProducts();

  const url = new URL(window.location);
  url.searchParams.delete("category");
  window.history.replaceState({}, "", url);
}