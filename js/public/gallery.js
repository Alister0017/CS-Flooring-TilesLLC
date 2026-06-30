// gallery.js

let allGalleryPhotos = [];
let filteredGalleryPhotos = [];
let activeGalleryCategory = "All Projects";

document.addEventListener("DOMContentLoaded", () => {
    initializeGalleryPage();
});

/* ==========================================================
   INITIALIZE
========================================================== */

async function initializeGalleryPage() {

    await loadGalleryPhotos();

    buildGalleryCategoryButtons();

    filterGallery();

}

/* ==========================================================
   LOAD PHOTOS
========================================================== */

async function loadGalleryPhotos() {

    const grid = document.getElementById("galleryGrid");

    if (!grid) return;

    grid.innerHTML = "<p>Loading gallery...</p>";

    const { data, error } =
        await PhotoService.getGalleryPhotos();

    if (error) {

        console.error(error);

        grid.innerHTML =
            "<p>Unable to load gallery photos.</p>";

        return;

    }

    allGalleryPhotos = data || [];
    filteredGalleryPhotos = [...allGalleryPhotos];

}

/* ==========================================================
   CATEGORY BUTTONS
========================================================== */

function buildGalleryCategoryButtons() {

    const container =
        document.getElementById("galleryCategoryButtons");

    if (!container) return;

    container.innerHTML = "";

    const categories = [
        "All Projects",
        ...new Set(
            allGalleryPhotos
                .map(photo => photo.photo_category)
                .filter(Boolean)
        )
    ];

    categories.forEach(category => {

        const button = document.createElement("button");

        button.className =
            category === activeGalleryCategory
                ? "category-pill active"
                : "category-pill";

        button.textContent = category;

        button.onclick = () => {

            activeGalleryCategory = category;

            buildGalleryCategoryButtons();

            filterGallery();

        };

        container.appendChild(button);

    });

}

/* ==========================================================
   FILTER
========================================================== */

function filterGallery() {

    const searchInput =
        document.getElementById("gallerySearch");

    const search =
        searchInput
            ? searchInput.value.trim().toLowerCase()
            : "";

    filteredGalleryPhotos = allGalleryPhotos.filter(photo => {

        const categoryMatch =
            activeGalleryCategory === "All Projects" ||
            photo.photo_category === activeGalleryCategory;

        const searchMatch = [
            photo.photo_category,
            photo.caption,
            photo.notes
        ]
            .join(" ")
            .toLowerCase()
            .includes(search);

        return categoryMatch && searchMatch;

    });

    renderGallery();

}

/* ==========================================================
   RENDER
========================================================== */

function renderGallery() {

    const grid =
        document.getElementById("galleryGrid");

    const count =
        document.getElementById("galleryCount");

    const title =
        document.getElementById("galleryTitle");

    if (!grid) return;

    if (title) {
        title.textContent = activeGalleryCategory;
    }

    if (count) {
        count.textContent =
            `${filteredGalleryPhotos.length} Project${filteredGalleryPhotos.length === 1 ? "" : "s"}`;
    }

    if (!filteredGalleryPhotos.length) {

        grid.innerHTML = `
            <div class="empty-gallery">
                <h3>No Projects Found</h3>
                <p>
                    Try changing your search or selecting another category.
                </p>
            </div>
        `;

        return;

    }

    grid.innerHTML = filteredGalleryPhotos.map(photo => `

        <article class="showcase-card">

            <div class="showcase-image-wrap">

                <img
                    class="showcase-image"
                    src="${photo.photo_url}"
                    alt="${photo.caption || "Completed flooring project"}">

                <span class="showcase-category">
                    ${photo.photo_category || "Project"}
                </span>

            </div>

            <div class="showcase-body">

                <p class="showcase-type">
                    ${photo.photo_category || "Completed Work"}
                </p>

                <h3 class="showcase-title">
                    ${photo.caption || "Flooring Project"}
                </h3>

                ${photo.notes ? `
                    <p class="showcase-description">
                        ${photo.notes}
                    </p>
                ` : ""}

            </div>

        </article>

    `).join("");

}