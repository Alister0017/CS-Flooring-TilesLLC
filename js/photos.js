// photos.js

let selectedGalleryCategory = "All";
let allGalleryPhotos = [];

async function uploadImageToBucket(file, bucketName, folderName) {
  const fileExt = file.name.split(".").pop();
  const fileName = `${folderName}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

  const { error: uploadError } = await db.storage
    .from(bucketName)
    .upload(fileName, file);

  if (uploadError) {
    console.error(uploadError);
    throw uploadError;
  }

  const { data } = db.storage
    .from(bucketName)
    .getPublicUrl(fileName);

  return data.publicUrl;
}

async function addPhoto() {
  const fileInput = document.getElementById("photoFile");
  const file = fileInput.files[0];

  if (!file) {
    showMessage("Please choose an image.");
    return;
  }

  let imageUrl;

  try {
    imageUrl = await uploadImageToBucket(file, "gallery-images", "completed-work");
  } catch (error) {
    showMessage("Could not upload image.");
    return;
  }

  const photo = {
    title: document.getElementById("photoTitle").value,
    image_url: imageUrl,
    description: document.getElementById("photoDescription").value || null,
    category: document.getElementById("photoCategory") ? document.getElementById("photoCategory").value : null,
    tags: document.getElementById("photoTags") ? document.getElementById("photoTags").value : null
  };

  const { error } = await db
    .from("photos")
    .insert([photo]);

  if (error) {
    console.error(error);
    showMessage("Could not save photo.");
    return;
  }

  showMessage("Photo saved.");
  clearForm("photoForm");
  loadPhotos();
}

async function loadPhotos() {
  const container = document.getElementById("photos");

  if (!container) return;

  container.innerHTML = "<p>Loading photos...</p>";

  const { data, error } = await db
    .from("photos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    container.innerHTML = "<p>Error loading photos.</p>";
    return;
  }

  container.innerHTML = "";

  if (!data || data.length === 0) {
    container.innerHTML = "<p>No photos found.</p>";
    return;
  }

  data.forEach(photo => {
    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <img src="${photo.image_url}" alt="${photo.title}" class="gallery-photo">
      <h3>${photo.title}</h3>
      <p><strong>Category:</strong> ${photo.category || "Not listed"}</p>
      <p><strong>Tags:</strong> ${photo.tags || "No tags listed"}</p>
      <p>${photo.description || "No description provided."}</p>
      <button onclick="deletePhoto('${photo.photo_id}')">Delete Photo</button>
    `;

    container.appendChild(div);
  });
}

async function loadGalleryPhotos() {
  const container = document.getElementById("galleryGrid");

  if (!container) return;

  container.innerHTML = "<p>Loading completed work...</p>";

  const { data, error } = await db
    .from("photos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    container.innerHTML = "<p>Error loading gallery photos.</p>";
    return;
  }

  allGalleryPhotos = data || [];
  applyGalleryCategoryFromUrl();
  filterGalleryPhotos();
}

function applyGalleryCategoryFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const categoryFromUrl = params.get("category");

  if (categoryFromUrl) {
    selectedGalleryCategory = decodeURIComponent(categoryFromUrl);
  }

  updateGalleryCategoryUI();
}

function setGalleryCategory(category) {
  selectedGalleryCategory = category;
  updateGalleryCategoryUI();
  filterGalleryPhotos();

  const url = new URL(window.location);

  if (category === "All") {
    url.searchParams.delete("category");
  } else {
    url.searchParams.set("category", category);
  }

  window.history.replaceState({}, "", url);
}

function updateGalleryCategoryUI() {
  const title = document.getElementById("galleryCategoryTitle");
  const buttons = document.querySelectorAll(".gallery-category-pill");

  if (title) {
    title.textContent = selectedGalleryCategory === "All" ? "All Completed Work" : selectedGalleryCategory;
  }

  buttons.forEach(button => {
    button.classList.toggle("active", button.dataset.category === selectedGalleryCategory);
  });
}

function filterGalleryPhotos() {
  const searchInput = document.getElementById("gallerySearch");
  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : "";

  const filteredPhotos = allGalleryPhotos.filter(photo => {
    const title = photo.title ? photo.title.toLowerCase() : "";
    const category = photo.category ? photo.category.toLowerCase() : "";
    const tags = photo.tags ? String(photo.tags).toLowerCase() : "";

    const matchesCategory =
      selectedGalleryCategory === "All" ||
      photo.category === selectedGalleryCategory;

    const matchesSearch =
      searchTerm === "" ||
      title.includes(searchTerm) ||
      category.includes(searchTerm) ||
      tags.includes(searchTerm);

    return matchesCategory && matchesSearch;
  });

  renderGalleryPhotos(filteredPhotos);
}

function renderGalleryPhotos(photos) {
  const container = document.getElementById("galleryGrid");
  const count = document.getElementById("galleryCount");

  if (!container) return;

  container.innerHTML = "";

  if (count) {
    const label = photos.length === 1 ? "project" : "projects";
    count.textContent = `${photos.length} ${label} shown`;
  }

  if (!photos || photos.length === 0) {
    container.innerHTML = `
      <div class="empty-gallery">
        <h3>No completed work matched your search.</h3>
        <p>Try clearing the search or choosing another category.</p>
        <button onclick="clearGalleryFilters()">Clear Filters</button>
      </div>
    `;
    return;
  }

  photos.forEach(photo => {
    const div = document.createElement("article");
    div.className = "showcase-card";

    const category = photo.category || "Completed Work";
    const title = photo.title || "Flooring Project";
    const tagList = normalizeGalleryTags(photo.tags);

    const imageHTML = photo.image_url
      ? `<img src="${photo.image_url}" alt="${title}" class="showcase-image">`
      : `<div class="showcase-placeholder">Project Photo</div>`;

    div.innerHTML = `
      <div class="showcase-image-wrap">
        ${imageHTML}
        <span class="showcase-category">${category}</span>
      </div>
      <div class="showcase-body">
        <p class="showcase-type">${category}</p>
        <h3 class="showcase-title">${title}</h3>
        ${photo.description ? `<p class="showcase-description">${photo.description}</p>` : ""}
        ${
          tagList.length > 0
            ? `<div class="showcase-tags">${tagList.map(tag => `<span>${tag}</span>`).join("")}</div>`
            : `<div class="showcase-tags"><span>No tags listed</span></div>`
        }
      </div>
    `;

    container.appendChild(div);
  });
}

function normalizeGalleryTags(tags) {
  if (!tags) return [];

  if (Array.isArray(tags)) {
    return tags.filter(Boolean);
  }

  return String(tags)
    .split(",")
    .map(tag => tag.trim())
    .filter(Boolean);
}

function clearGalleryFilters() {
  const searchInput = document.getElementById("gallerySearch");

  if (searchInput) {
    searchInput.value = "";
  }

  selectedGalleryCategory = "All";
  updateGalleryCategoryUI();
  filterGalleryPhotos();

  const url = new URL(window.location);
  url.searchParams.delete("category");
  window.history.replaceState({}, "", url);
}

async function deletePhoto(photoId) {
  const { error } = await db
    .from("photos")
    .delete()
    .eq("photo_id", photoId);

  if (error) {
    console.error(error);
    showMessage("Could not delete photo.");
    return;
  }

  showMessage("Photo deleted.");
  loadPhotos();
}