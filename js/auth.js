// auth.js

async function loginAdmin() {
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    const { error } = await db.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        console.error(error);
        alert("Login failed. Check your email and password.");
        return;
    }

    window.location.href = ROUTES.DASHBOARD;
}

async function protectAdminPage() {
    const { data, error } = await db.auth.getSession();

    if (error || !data.session) {
        window.location.href = ROUTES.LOGIN;
    }
}

async function logoutAdmin() {
    await db.auth.signOut();
    window.location.href = ROUTES.LOGIN;
}