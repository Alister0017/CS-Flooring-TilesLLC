/* ==========================================================
   ADMIN MODAL SYSTEM
   Reusable modal framework
========================================================== */

let adminModalRoot = null;

function initializeAdminModal() {
    if (adminModalRoot) return;

    adminModalRoot = document.createElement("div");
    adminModalRoot.className = "admin-modal-root";
    adminModalRoot.id = "adminModalRoot";

    document.body.appendChild(adminModalRoot);
}

function openAdminModal({
    title = "",
    subtitle = "",
    body = "",
    footer = "",
    wide = false,
    closeOnBackdrop = true
}) {

    initializeAdminModal();

    adminModalRoot.innerHTML = `
        <div class="admin-modal-backdrop"></div>

        <div class="admin-modal-panel ${wide ? "wide" : ""}">

            <div class="admin-modal-header">

                <div>
                    ${subtitle ? `<p class="eyebrow">${subtitle}</p>` : ""}
                    <h2>${title}</h2>
                </div>

                <button
                    class="admin-modal-close"
                    type="button"
                    onclick="closeAdminModal()">
                    ×
                </button>

            </div>

            <div class="admin-modal-body">
                ${body}
            </div>

            ${footer ? `
            <div class="admin-modal-footer">
                ${footer}
            </div>
            ` : ""}

        </div>
    `;

    adminModalRoot.classList.add("open");

    document.body.style.overflow = "hidden";

    if (closeOnBackdrop) {

        adminModalRoot
            .querySelector(".admin-modal-backdrop")
            .addEventListener("click", closeAdminModal);

    }

    document.addEventListener("keydown", escCloseModal);
}

function closeAdminModal() {

    if (!adminModalRoot) return;

    adminModalRoot.classList.remove("open");

    adminModalRoot.innerHTML = "";

    document.body.style.overflow = "";

    document.removeEventListener("keydown", escCloseModal);

}

function escCloseModal(e) {

    if (e.key === "Escape") {
        closeAdminModal();
    }

}

/* ==========================================================
   COMMON MODALS
========================================================== */

function showSuccessModal(title, message) {

    openAdminModal({

        title,

        subtitle: "Success",

        body: `
            <p>${message}</p>
        `,

        footer: `
            <button
                class="btn"
                onclick="closeAdminModal()">
                OK
            </button>
        `
    });

}

function showErrorModal(title, message) {

    openAdminModal({

        title,

        subtitle: "Error",

        body: `
            <p>${message}</p>
        `,

        footer: `
            <button
                class="btn"
                onclick="closeAdminModal()">
                Close
            </button>
        `
    });

}

function showConfirmModal({

    title,

    message,

    confirmText = "Confirm",

    cancelText = "Cancel",

    onConfirm

}) {

    openAdminModal({

        title,

        subtitle: "Confirmation",

        body: `
            <p>${message}</p>
        `,

        footer: `
            <button
                class="btn secondary"
                onclick="closeAdminModal()">
                ${cancelText}
            </button>

            <button
                class="btn"
                id="confirmModalButton">
                ${confirmText}
            </button>
        `
    });

    document
        .getElementById("confirmModalButton")
        .addEventListener("click", () => {

            closeAdminModal();

            if (typeof onConfirm === "function") {
                onConfirm();
            }

        });

}