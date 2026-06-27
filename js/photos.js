// photos.js

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
        description: document.getElementById("photoDescription").value || null
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

    container.innerHTML = "";

    if (!data || data.length === 0) {
        container.innerHTML = "<p>No completed work photos have been added yet.</p>";
        return;
    }

    data.forEach(photo => {
        const div = document.createElement("div");
        div.className = "card gallery-card";

        div.innerHTML = `
            <img src="${photo.image_url}" alt="${photo.title}" class="gallery-photo">
            <h3>${photo.title}</h3>
            <p>${photo.description || ""}</p>
        `;

        container.appendChild(div);
    });
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