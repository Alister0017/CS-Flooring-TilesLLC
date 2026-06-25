// products.js

let selectedCategory = "All";

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

    const cards = document.querySelectorAll(".product-card");

    cards.forEach(card => {
        const category = card.dataset.category;
        const keywords = card.dataset.keywords.toLowerCase();
        const text = card.textContent.toLowerCase();

        const matchesCategory =
            selectedCategory === "All" ||
            category === selectedCategory;

        const matchesSearch =
            searchTerm === "" ||
            text.includes(searchTerm) ||
            keywords.includes(searchTerm);

        if (matchesCategory && matchesSearch) {
            card.style.display = "block";
        } else {
            card.style.display = "none";
        }
    });
}