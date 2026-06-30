// photos.js

let allAdminPhotos=[];
let allGalleryPhotos=[];
let selectedGalleryCategory="All";

window.addEventListener("load",()=>{
  if(document.getElementById("photos"))loadPhotos();
  if(document.getElementById("galleryGrid"))loadGalleryPhotos();

  const form=document.getElementById("photoForm");
  if(form){
    form.addEventListener("submit",event=>{
      event.preventDefault();
      addPhoto();
    });
  }

  const gallerySearch=document.getElementById("gallerySearch");
  if(gallerySearch)gallerySearch.addEventListener("input",filterGalleryPhotos);
});

/* ==========================================================
   ADMIN: LOAD PHOTOS
========================================================== */

async function loadPhotos(){
  const container=document.getElementById("photos");
  if(!container)return;

  container.innerHTML=`<div class="admin-empty-state">Loading photos...</div>`;

  const{data,error}=await PhotoService.getPhotos();

  if(error){
    console.error(error);
    container.innerHTML=`<div class="admin-empty-state">Could not load photos.</div>`;
    return;
  }

  allAdminPhotos=data||[];
  renderAdminPhotos(allAdminPhotos);
}

/* ==========================================================
   ADMIN: ADD PHOTO
========================================================== */

async function addPhoto(){
  const submitButton=document.querySelector("#photoForm button[type='submit']");
  if(submitButton){
    submitButton.disabled=true;
    submitButton.textContent="Saving...";
  }

  try{
    const fileInput=document.getElementById("photoFile");
    const file=fileInput?.files?.[0]||null;

    if(!file){
      showMessage("Please choose an image.");
      return;
    }

    const{data:imageData,error:uploadError}=await PhotoService.uploadPhotoImage(file);

    if(uploadError){
      console.error(uploadError);
      showMessage("Could not upload image.");
      return;
    }

    const photo={
      job_number:document.getElementById("photoJobNumber")?.value.trim(),
      category:document.getElementById("photoCategory")?.value,
      caption:document.getElementById("photoCaption")?.value.trim()||null,
      photo_url:imageData.photo_url,
      storage_path:imageData.storage_path,
      show_in_gallery:document.getElementById("showInGallery")?.checked||false,
      is_cover_photo:document.getElementById("isCoverPhoto")?.checked||false,
      notes:document.getElementById("photoNotes")?.value.trim()||null,
      sort_order:0
    };

    if(!photo.job_number){
      showMessage("Please enter a job number.");
      return;
    }

    if(!photo.category){
      showMessage("Please select a category.");
      return;
    }

    const{error}=await PhotoService.createPhoto(photo);

    if(error){
      console.error(error);
      showMessage("Could not save photo.");
      return;
    }

    showMessage("Photo saved.");

    const form=document.getElementById("photoForm");
    if(form)form.reset();

    await loadPhotos();

    if(typeof loadDashboardCounts==="function")loadDashboardCounts();

  }finally{
    if(submitButton){
      submitButton.disabled=false;
      submitButton.textContent="Save Photo";
    }
  }
}

/* ==========================================================
   ADMIN: RENDER PHOTOS
========================================================== */

function renderAdminPhotos(photos){
  const container=document.getElementById("photos");
  if(!container)return;

  if(!photos||photos.length===0){
    container.innerHTML=`
      <div class="admin-empty-state">
        <h3>No photos found.</h3>
        <p>Upload job photos to build the project gallery.</p>
      </div>
    `;
    return;
  }

  container.innerHTML=photos.map(photo=>renderAdminPhotoCard(photo)).join("");
}

function renderAdminPhotoCard(photo){
  const customerName=photo.jobs?.customers?.customer_name||"Customer not listed";
  const jobNumber=photo.job_number||photo.jobs?.job_number||"No job number";

  return`
    <article class="photo-admin-card">
      <div class="photo-admin-image-wrap">
        ${
          photo.photo_url
            ?`<img src="${photo.photo_url}" alt="${photo.caption||"Job photo"}" class="photo-admin-image">`
            :`<div class="photo-admin-placeholder">No Image</div>`
        }

        <span class="photo-admin-category">
          ${photo.category||"Photo"}
        </span>
      </div>

      <div class="photo-admin-body">
        <div class="photo-admin-header">
          <div>
            <p class="eyebrow">${jobNumber}</p>
            <h3>${photo.caption||"Job Photo"}</h3>
          </div>

          <span class="admin-status-pill ${photo.show_in_gallery?"active":"pending"}">
            ${photo.show_in_gallery?"Gallery":"Internal"}
          </span>
        </div>

        <div class="photo-admin-details">
          <div>
            <span>Customer</span>
            <strong>${customerName}</strong>
          </div>

          <div>
            <span>Category</span>
            <strong>${photo.category||"Not listed"}</strong>
          </div>

          <div>
            <span>Cover Photo</span>
            <strong>${photo.is_cover_photo?"Yes":"No"}</strong>
          </div>

          <div>
            <span>Created</span>
            <strong>${formatPhotoDate(photo.created_at)||"Not listed"}</strong>
          </div>
        </div>

        ${photo.notes?`
          <div class="photo-admin-notes">
            <span>Notes</span>
            <p>${photo.notes}</p>
          </div>
        `:""}

        <div class="photo-admin-actions">
          <button class="btn secondary" type="button" onclick="toggleGalleryPhoto('${photo.photo_id}',${!photo.show_in_gallery})">
            ${photo.show_in_gallery?"Hide from Gallery":"Show in Gallery"}
          </button>

          ${photo.job_number?`
            <button class="btn secondary" type="button" onclick="setCoverPhoto('${photo.photo_id}','${photo.job_number}')">
              Set Cover
            </button>
          `:""}

          <button class="btn danger" type="button" onclick="deletePhoto('${photo.photo_id}')">
            Delete
          </button>
        </div>
      </div>
    </article>
  `;
}

/* ==========================================================
   ADMIN: PHOTO ACTIONS
========================================================== */

async function toggleGalleryPhoto(photoId,show){
  const{error}=await PhotoService.toggleGalleryPhoto(photoId,show);
  if(error){
    console.error(error);
    showMessage("Could not update gallery setting.");
    return;
  }
  showMessage(show?"Photo added to gallery.":"Photo hidden from gallery.");
  await loadPhotos();
}

async function setCoverPhoto(photoId,jobNumber){
  const{error}=await PhotoService.setCoverPhoto(photoId,jobNumber);
  if(error){
    console.error(error);
    showMessage("Could not set cover photo.");
    return;
  }
  showMessage("Cover photo updated.");
  await loadPhotos();
}

async function deletePhoto(photoId){
  const confirmed=confirm("Delete this photo? This cannot be undone.");
  if(!confirmed)return;

  const{error}=await PhotoService.deletePhoto(photoId);
  if(error){
    console.error(error);
    showMessage("Could not delete photo.");
    return;
  }

  showMessage("Photo deleted.");
  await loadPhotos();
}

/* ==========================================================
   PUBLIC GALLERY
========================================================== */

async function loadGalleryPhotos(){
  const container=document.getElementById("galleryGrid");
  if(!container)return;

  container.innerHTML=`<div class="empty-state">Loading completed work...</div>`;

  const{data,error}=await PhotoService.getGalleryPhotos();
  if(error){
    console.error(error);
    container.innerHTML=`<div class="empty-state">Could not load gallery photos.</div>`;
    return;
  }

  allGalleryPhotos=data||[];
  applyGalleryCategoryFromUrl();
  filterGalleryPhotos();
}

function applyGalleryCategoryFromUrl(){
  const params=new URLSearchParams(window.location.search);
  const categoryFromUrl=params.get("category");
  if(categoryFromUrl)selectedGalleryCategory=decodeURIComponent(categoryFromUrl);
  updateGalleryCategoryUI();
}

function setGalleryCategory(category){
  selectedGalleryCategory=category;
  updateGalleryCategoryUI();
  filterGalleryPhotos();

  const url=new URL(window.location);
  if(category==="All")url.searchParams.delete("category");
  else url.searchParams.set("category",category);
  window.history.replaceState({},"",url);
}

function updateGalleryCategoryUI(){
  const title=document.getElementById("galleryCategoryTitle");
  const buttons=document.querySelectorAll(".gallery-category-pill");

  if(title){
    title.textContent=selectedGalleryCategory==="All"
      ?"All Completed Work"
      :selectedGalleryCategory;
  }

  buttons.forEach(button=>{
    button.classList.toggle("active",button.dataset.category===selectedGalleryCategory);
  });
}

function filterGalleryPhotos(){
  const searchInput=document.getElementById("gallerySearch");
  const searchTerm=searchInput?searchInput.value.toLowerCase().trim():"";

  const filteredPhotos=allGalleryPhotos.filter(photo=>{
    const caption=photo.caption?photo.caption.toLowerCase():"";
    const category=photo.category?photo.category.toLowerCase():"";
    const notes=photo.notes?photo.notes.toLowerCase():"";

    const matchesCategory=
      selectedGalleryCategory==="All"||
      photo.category===selectedGalleryCategory;

    const matchesSearch=
      searchTerm===""||
      caption.includes(searchTerm)||
      category.includes(searchTerm)||
      notes.includes(searchTerm);

    return matchesCategory&&matchesSearch;
  });

  renderGalleryPhotos(filteredPhotos);
}

function renderGalleryPhotos(photos){
  const container=document.getElementById("galleryGrid");
  const count=document.getElementById("galleryCount");
  if(!container)return;

  if(count){
    const label=photos.length===1?"project":"projects";
    count.textContent=`${photos.length} ${label} shown`;
  }

  if(!photos||photos.length===0){
    container.innerHTML=`
      <div class="empty-state">
        <h3>No completed work matched your search.</h3>
        <p>Try clearing the search or choosing another category.</p>
        <button class="btn secondary" type="button" onclick="clearGalleryFilters()">Clear Filters</button>
      </div>
    `;
    return;
  }

  container.innerHTML=photos.map(photo=>{
    const category=photo.category||"Completed Work";
    const title=photo.caption||"Flooring Project";

    return`
      <article class="showcase-card">
        <div class="showcase-image-wrap">
          ${
            photo.photo_url
              ?`<img src="${photo.photo_url}" alt="${title}" class="showcase-image">`
              :`<div class="showcase-placeholder">Project Photo</div>`
          }
          <span class="showcase-category">${category}</span>
        </div>

        <div class="showcase-body">
          <p class="showcase-type">${category}</p>
          <h3 class="showcase-title">${title}</h3>
          ${photo.notes?`<p class="showcase-description">${photo.notes}</p>`:""}
        </div>
      </article>
    `;
  }).join("");
}

function clearGalleryFilters(){
  const searchInput=document.getElementById("gallerySearch");
  if(searchInput)searchInput.value="";

  selectedGalleryCategory="All";
  updateGalleryCategoryUI();
  filterGalleryPhotos();

  const url=new URL(window.location);
  url.searchParams.delete("category");
  window.history.replaceState({},"",url);
}

/* ==========================================================
   HELPERS
========================================================== */

function formatPhotoDate(dateString){
  if(!dateString)return"";

  const date=new Date(dateString);
  if(Number.isNaN(date.getTime()))return"";

  return date.toLocaleDateString(JOB.DATE_FORMAT,{
    month:"short",
    day:"numeric",
    year:"numeric"
  });
}