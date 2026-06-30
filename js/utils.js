// utils.js

function generateId(prefix = "ID") {
  return `${prefix}-${crypto.randomUUID()}`;
}

async function generateSupabaseJobNumber() {
  const year = new Date().getFullYear();

  const { count, error } = await db
    .from("jobs")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error(error);
    return `CS-${year}-${String(Date.now()).slice(-4)}`;
  }

  const next = (count || 0) + 1;
  return `CS-${year}-${String(next).padStart(4, "0")}`;
}

function showMessage(message) {
  if (typeof showSuccessModal === "function") {
    showSuccessModal("Message", message);
    return;
  }

  alert(message);
}

function formatMoney(amount) {
  const value = Number(amount) || 0;

  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD"
  });
}

function formatDate(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString + "T00:00:00");

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function clearForm(formId) {
  const form = document.getElementById(formId);

  if (form) {
    form.reset();
  }
}