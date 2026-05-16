/* =========================
   AQUACONTROL CONFIG
========================= */

export const APP_CONFIG = {
  name: "AquaControl",
  version: "0.1.0",
  logo: "./assets/logo-aquacontrol.png",

  storageKeys: {
    theme: "aquacontrol_theme",
    activeBusiness: "aquacontrol_active_business",
    sessionProfile: "aquacontrol_profile",
  },

  defaultTheme: "light",
};

/* =========================
   FORMATOS
========================= */

export function formatCurrency(value = 0) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(Number(value) || 0);
}

export function formatDate(dateValue) {
  if (!dateValue) return "—";

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateValue));
}

export function formatDateTime(dateValue) {
  if (!dateValue) return "—";

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateValue));
}

/* =========================
   TEMA CLARO / OSCURO
========================= */

export function getSavedTheme() {
  return localStorage.getItem(APP_CONFIG.storageKeys.theme) || APP_CONFIG.defaultTheme;
}

export function applyTheme(theme) {
  const html = document.documentElement;

  if (theme === "dark") {
    html.classList.add("dark");
  } else {
    html.classList.remove("dark");
  }

  localStorage.setItem(APP_CONFIG.storageKeys.theme, theme);
}

export function toggleTheme() {
  const currentTheme = getSavedTheme();
  const nextTheme = currentTheme === "dark" ? "light" : "dark";

  applyTheme(nextTheme);

  return nextTheme;
}

/* =========================
   HELPERS UI
========================= */

export function showToast(message, type = "info") {
  const toast = document.createElement("div");

  const styles = {
    info: "bg-sky-600",
    success: "bg-emerald-600",
    warning: "bg-amber-600",
    error: "bg-red-600",
  };

  toast.className = `
    fixed bottom-5 left-1/2 -translate-x-1/2 z-50
    ${styles[type] || styles.info}
    text-white text-sm font-semibold
    px-4 py-3 rounded-2xl shadow-xl
    max-w-[90%] text-center fade-in
  `;

  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translate(-50%, 8px)";
  }, 2500);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

export function setButtonLoading(button, isLoading, loadingText = "Cargando...") {
  if (!button) return;

  if (isLoading) {
    button.dataset.originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `
      <span class="inline-flex items-center justify-center gap-2">
        <span class="loading-spinner"></span>
        ${loadingText}
      </span>
    `;
  } else {
    button.disabled = false;
    button.innerHTML = button.dataset.originalText || button.innerHTML;
  }
}

/* =========================
   BUSINESS
========================= */

export function saveActiveBusinessId(businessId) {
  localStorage.setItem(APP_CONFIG.storageKeys.activeBusiness, businessId);
}

export function getActiveBusinessId() {
  return localStorage.getItem(APP_CONFIG.storageKeys.activeBusiness);
}

export function clearLocalSession() {
  localStorage.removeItem(APP_CONFIG.storageKeys.sessionProfile);
  localStorage.removeItem(APP_CONFIG.storageKeys.activeBusiness);
}