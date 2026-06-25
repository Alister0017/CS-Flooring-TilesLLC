// photos.js

function addPhoto() {
    const photo = {
        photoId: generateId("PHOTO"),
        title: document.getElementById("photoTitle").value,
        imageUrl: document.getElementById("photoUrl").value,
        description: document.getElementById("photoDescription").value,
        createdAt: new Date().toLocaleString()
    };

    savePhoto(photo);

    showMessage("Photo saved.");

    clearForm("photoForm");

    loadPhotos();
}

function loadPhotos() {
    const photos = getPhotos();
    const container = document.getElementById("photos");

    if (!container) return;

    container.innerHTML = "";

    if (photos.length === 0) {
        container.innerHTML = "<p>No photos found.</p>";
        return;
    }

    photos.forEach(photo => {
        const div = document.createElement("div");
        div.className = "card";

        div.innerHTML = `
            <h3>${photo.title}</h3>
            <p>${photo.description || "No description provided."}</p>
            <p><strong>Image URL:</strong> ${photo.imageUrl}</p>
        `;

        container.appendChild(div);
    });
}