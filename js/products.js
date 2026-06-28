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
    button.classList.toggle("active", button.dataset.category === selectedCategory);
  });
}

function filterProducts() {
  const searchInput = document.getElementById("productSearch");
  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : "";

  const filteredProducts = allProducts.filter(product => {
    const floorType = product.category ? product.category.toLowerCase() : "";
    const styleName = product.item_name ? product.item_name.toLowerCase() : "";
    const tags = product.tags ? String(product.tags).toLowerCase() : "";
    const description = product.description ? product.description.toLowerCase() : "";
    const price = product.unit_price ? String(product.unit_price) : "";

    const matchesCategory =
      selectedCategory === "All" ||
      product.category === selectedCategory;

    const matchesSearch =
      searchTerm === "" ||
      floorType.includes(searchTerm) ||
      styleName.includes(searchTerm) ||
      tags.includes(searchTerm) ||
      description.includes(searchTerm) ||
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

    const floorType = product.category || "Flooring Product";
    const styleName = product.item_name || "Unnamed Product";
    const price = product.unit_price ? `${formatMoney(product.unit_price)} / sq ft` : "Price available after measurement";
    const tagList = normalizeProductTags(product.tags);

    const imageHTML = product.image_url
      ? `<img src="${product.image_url}" alt="${styleName}" class="product-image-v2">`
      : `<div class="product-image-placeholder">Product Image</div>`;

    div.innerHTML = `
      <div class="product-image-wrap">
        ${imageHTML}
        <span class="product-badge">Available</span>
      </div>

      <div class="product-card-body">
        <p class="product-category">${floorType}</p>
        <h3>${styleName}</h3>

        <div class="product-info-list">
          <div>
            <span>Type of Floor</span>
            <strong>${floorType}</strong>
          </div>

          <div>
            <span>Style Name</span>
            <strong>${styleName}</strong>
          </div>

          <div>
            <span>Price Per Sq Ft</span>
            <strong>${price}</strong>
          </div>
        </div>

        ${
          tagList.length > 0
            ? `<div class="product-tag-row">${tagList.map(tag => `<span>${tag}</span>`).join("")}</div>`
            : `<div class="product-tag-row empty-tag-row"><span>No tags listed</span></div>`
        }
      </div>
    `;

    grid.appendChild(div);
  });
}

function normalizeProductTags(tags) {
  if (!tags) return [];

  if (Array.isArray(tags)) {
    return tags.filter(Boolean);
  }

  return String(tags)
    .split(",")
    .map(tag => tag.trim())
    .filter(Boolean);
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