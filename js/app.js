import {
    applyTheme,
    getSavedTheme,
    toggleTheme,
    showToast,
    setButtonLoading,
    clearLocalSession,
    formatCurrency,
    formatDate,
    formatDateTime,
    getRelativeTime
} from "./config.js";

import {
    supabaseClient,
    getCurrentSession,
    getMyProfile,
    getMyBusinesses
} from "./supabase.js";

/* =========================
   INIT
========================= */

document.addEventListener("DOMContentLoaded", async () => {
    applyTheme(getSavedTheme());

    const session = await getCurrentSession();

    async function loadDashboard() {
        const profile = await getMyProfile();
        const businesses = await getMyBusinesses();

        if (!profile) {
            showToast("No se pudo cargar el perfil.", "error");
            return;
        }

        const activeBusiness = businesses.find(
            item => item.business_id === profile.active_business_id
        ) || businesses[0];

        renderDashboardPlaceholder(profile, activeBusiness, businesses);
    }

    if (session) {
        await loadDashboard();
    } else {
        renderWelcome();
    }

    /* =========================
   WELCOME
========================= */

    function renderWelcome() {
        const app = document.querySelector("#app");

        app.innerHTML = `
        <section class="min-h-screen flex items-center justify-center px-4 py-8">
        <div class="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 fade-in">

        <div class="flex flex-col items-center text-center mb-6">
        <img
        src="./assets/logo-oasis-puro.png"
        alt="Oasis Puro Logo"
        class="w-20 h-20 object-contain mb-3"
        onerror="this.style.display='none'"
        />

        <h1 class="text-3xl font-bold tracking-tight text-white">Oasis Puro</h1>

        <p class="text-sm text-slate-500 dark:text-slate-400 mt-2">
        Administración de pedidos, ventas, gastos e inventario.
        </p>
        </div>

        <div class="space-y-4">
        <button
        id="btn-login-view"
        class="w-full bg-sky-600 hover:bg-sky-500 active:scale-[0.99] transition rounded-2xl py-3 font-semibold text-white"
        >
        Iniciar sesión
        </button>

        <button
        id="btn-register-view"
        class="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white active:scale-[0.99] transition rounded-2xl py-3 font-semibold text-white dark:text-slate-900"
        >
        Crear cuenta administrador
        </button>

        <button
        id="theme-toggle"
        class="w-full border border-slate-300 dark:border-slate-700 rounded-2xl py-3 font-semibold text-slate-700 dark:text-slate-200"
        >
        Cambiar tema
        </button>
        </div>

        <p class="text-center text-xs text-slate-400 mt-6">
        Oasis Puro · Versión inicial
        </p>
        </div>
        </section>
        `;

        document.querySelector("#btn-login-view")?.addEventListener("click", renderLogin);
        document.querySelector("#btn-register-view")?.addEventListener("click", renderRegister);

        document.querySelector("#theme-toggle")?.addEventListener("click", () => {
            const theme = toggleTheme();
            showToast(theme === "dark" ? "Tema oscuro activado.": "Tema claro activado.", "success");
        });
    }

    /* =========================
   LOGIN
========================= */

    function renderLogin() {
        const app = document.querySelector("#app");

        app.innerHTML = `
        <section class="auth-page">
        <form id="login-form" class="auth-card fade-in">

        <button type="button" id="back-welcome" class="auth-link mb-6">
        ← Volver
        </button>

        <div class="mb-6">
        <h1 class="auth-title">Iniciar sesión</h1>
        <p class="auth-subtitle">
        Accede a Oasis Puro con tu correo y contraseña.
        </p>
        </div>

        <div class="space-y-4">
        <label class="block">
        <span class="form-label">Correo</span>
        <input
        id="login-email"
        type="email"
        required
        class="form-control"
        placeholder="correo@ejemplo.com"
        />
        </label>

        <label class="block">
        <span class="form-label">Contraseña</span>

        <div class="auth-input-wrapper">
        <input
        id="login-password"
        type="password"
        required
        class="form-control pr-12"
        placeholder="••••••••"
        />

        <button
        id="toggle-login-password"
        type="button"
        class="auth-password-toggle"
        aria-label="Mostrar contraseña"
        >
        👁️
        </button>
        </div>
        </label>

        <div class="flex justify-end">
        <button
        id="forgot-password"
        type="button"
        class="auth-link"
        >
        ¿Olvidaste la contraseña?
        </button>
        </div>

        <button
        id="btn-login-submit"
        type="submit"
        class="w-full bg-sky-600 hover:bg-sky-500 rounded-2xl py-3 font-semibold text-white"
        >
        Entrar
        </button>
        </div>
        </form>
        </section>
        `;

        document.querySelector("#back-welcome")?.addEventListener("click", renderWelcome);
        document.querySelector("#login-form")?.addEventListener("submit", handleLogin);

        document.querySelector("#toggle-login-password")?.addEventListener("click", () => {
            const input = document.querySelector("#login-password");
            const button = document.querySelector("#toggle-login-password");

            const isPassword = input.type === "password";
            input.type = isPassword ? "text": "password";
            button.textContent = isPassword ? "🙈": "👁️";
        });

        document.querySelector("#forgot-password")?.addEventListener("click", async () => {
            const email = document.querySelector("#login-email").value.trim();

            if (!email) {
                showToast("Escribe tu correo primero.", "warning");
                return;
            }

            const {
                error
            } = await supabaseClient.auth.resetPasswordForEmail(email);

            if (error) {
                showToast(error.message || "No se pudo enviar recuperación.", "error");
                return;
            }

            showToast("Revisa tu correo para recuperar la contraseña.", "success");
        });
    }

    async function handleLogin(event) {
        event.preventDefault();

        const button = document.querySelector("#btn-login-submit");
        const email = document.querySelector("#login-email").value.trim();
        const password = document.querySelector("#login-password").value.trim();

        if (!email || !password) {
            showToast("Completa correo y contraseña.", "warning");
            return;
        }

        try {
            setButtonLoading(button, true, "Entrando...");

            const {
                error
            } = await supabaseClient.auth.signInWithPassword({
                    email,
                    password,
                });

            if (error) throw error;

            showToast("Inicio de sesión correcto.", "success");
            await loadDashboard();

        } catch (error) {
            console.error(error);
            showToast(error.message || "No se pudo iniciar sesión.", "error");
        } finally {
            setButtonLoading(button, false);
        }
    }

    /* =========================
   REGISTER
========================= */

    function renderRegister() {
        const app = document.querySelector("#app");

        app.innerHTML = `
        <section class="auth-page">
        <form id="register-form" class="auth-card fade-in">

        <button type="button" id="back-welcome" class="auth-link mb-6">
        ← Volver
        </button>

        <div class="mb-6">
        <h1 class="auth-title">Crear cuenta</h1>
        <p class="auth-subtitle">
        Registra un administrador para usar Oasis Puro.
        </p>
        </div>

        <div class="space-y-4">
        <label class="block">
        <span class="form-label">Nombre completo</span>
        <input
        id="register-name"
        type="text"
        required
        class="form-control"
        placeholder="Ejem: Angel Daniel Guzmán Díaz"
        />
        </label>

        <label class="block">
        <span class="form-label">WhatsApp</span>
        <input
        id="register-whatsapp"
        type="tel"
        class="form-control"
        placeholder="8710000000"
        />
        </label>

        <label class="block">
        <span class="form-label">Correo</span>
        <input
        id="register-email"
        type="email"
        required
        class="form-control"
        placeholder="correo@ejemplo.com"
        />
        </label>

        <label class="block">
        <span class="form-label">Contraseña</span>

        <div class="auth-input-wrapper">
        <input
        id="register-password"
        type="password"
        required
        minlength="6"
        class="form-control pr-12"
        placeholder="Mínimo 6 caracteres"
        />

        <button
        id="toggle-register-password"
        type="button"
        class="auth-password-toggle"
        aria-label="Mostrar contraseña"
        >
        👁️
        </button>
        </div>
        </label>

        <button
        id="btn-register-submit"
        type="submit"
        class="w-full bg-sky-600 hover:bg-sky-500 rounded-2xl py-3 font-semibold text-white"
        >
        Crear cuenta
        </button>
        </div>
        </form>
        </section>
        `;

        document.querySelector("#back-welcome")?.addEventListener("click", renderWelcome);
        document.querySelector("#register-form")?.addEventListener("submit", handleRegister);

        document.querySelector("#toggle-register-password")?.addEventListener("click", () => {
            const input = document.querySelector("#register-password");
            const button = document.querySelector("#toggle-register-password");

            const isPassword = input.type === "password";
            input.type = isPassword ? "text": "password";
            button.textContent = isPassword ? "🙈": "👁️";
        });
    }

    async function handleRegister(event) {
        event.preventDefault();

        const button = document.querySelector("#btn-register-submit");

        const fullName = document.querySelector("#register-name").value.trim();
        const whatsapp = document.querySelector("#register-whatsapp").value.trim();
        const email = document.querySelector("#register-email").value.trim();
        const password = document.querySelector("#register-password").value.trim();

        if (!fullName || !email || !password) {
            showToast("Completa nombre, correo y contraseña.", "warning");
            return;
        }

        try {
            setButtonLoading(button, true, "Creando cuenta...");

            const {
                error
            } = await supabaseClient.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                            whatsapp,
                        },
                    },
                });

            if (error) throw error;

            showToast("Cuenta creada. Ahora inicia sesión.", "success");
            renderLogin();

        } catch (error) {
            console.error(error);
            showToast(error.message || "No se pudo crear la cuenta.", "error");
        } finally {
            setButtonLoading(button, false);
        }
    }

    const DAILY_SALES_GOAL = 500;
    const MONTHLY_PROFIT_GOAL = 5000;


    /* =========================
   DASHBOARD
========================= */

    function renderDashboardPlaceholder(profile = null, activeBusiness = null, businesses = []) {
        const app = document.querySelector("#app");

        app.innerHTML = `
        <section class="has-bottom-nav min-h-screen bg-transparent px-4 py-6">
        <div class="max-w-5xl mx-auto space-y-4">

        <header class="aqua-card dashboard-hero p-5">

        <div class="dashboard-hero-top">

        <div class="dashboard-brand">
        <div class="dashboard-logo">
        <img src="./assets/logo-oasis-puro.png" alt="Oasis Puro">
        </div>

        <div>
        <p>Oasis Puro</p>
        <h1>${activeBusiness?.businesses?.name || "Oasis Puro"}</h1>
        </div>
        </div>

        <div class="header-actions">
        <button
        id="theme-toggle-dashboard"
        class="header-icon-btn"
        title="Cambiar tema"
        >
        <img src="./assets/icons/theme.svg" alt="Tema">
        </button>

        <button
        id="btn-logout"
        class="header-icon-btn logout-btn"
        title="Cerrar sesión"
        >
        <img src="./assets/icons/logout.svg" alt="Salir">
        </button>
        </div>

        </div>

        <div class="dashboard-hero-divider"></div>

        <div class="dashboard-hero-info">

        <div>
        <p class="dashboard-welcome">
        Bienvenido, ${profile?.full_name || "Usuario"}
        </p>

        <p id="dashboard-current-date" class="dashboard-date">
        —
        </p>
        </div>

        <div id="dashboard-status-banner"
        class="dashboard-status-banner">

        ✨ Cargando estado...

        </div>

        <div id="dashboard-weather" class="dashboard-weather-pill">
        <span id="weather-icon">🌡️</span>
        <span id="weather-temp">--°C</span>
        <span id="weather-desc">Clima</span>
        </div>



        </div>

        <div class="dashboard-role-row">
        <span class="dashboard-role-badge">
        Rol: ${profile?.role || "admin"}
        </span>
        </div>

        </header>

        <section class="dashboard-kpi-grid">

        <div class="dashboard-kpi-card kpi-sales">
        <div class="dashboard-kpi-icon">💵</div>
        <p>Ventas hoy</p>
        <h2 id="dashboard-sales-today">$0.00</h2>
        </div>

        <div class="dashboard-kpi-card kpi-orders">
        <div class="dashboard-kpi-icon">📦</div>
        <p>Pedidos</p>
        <h2 id="dashboard-orders-today">0</h2>
        </div>

        <div class="dashboard-kpi-card kpi-expenses">
        <div class="dashboard-kpi-icon">💸</div>
        <p>Gastos mes</p>
        <h2 id="dashboard-expenses-month">$0.00</h2>
        </div>

        <div class="dashboard-kpi-card kpi-profit">
        <div class="dashboard-kpi-icon">📈</div>
        <p>Ganancia</p>
        <h2 id="dashboard-profit-month">$0.00</h2>
        </div>

        </section>

        <section class="aqua-card business-health-card p-5">

        <div class="flex items-center justify-between gap-3">
        <div>
        <p class="text-sm text-slate-500 dark:text-slate-400">
        Estado general
        </p>

        <h2 class="text-xl font-black">
        Salud del negocio
        </h2>
        </div>

        <div class="business-health-score">
        <span id="business-health-score">--%</span>
        </div>
        </div>

        <div class="business-health-bar mt-5">
        <div id="business-health-fill" class="business-health-fill" style="width: 0%;"></div>
        </div>

        <div class="business-health-details mt-4">
        <div>
        <span class="health-dot health-good"></span>
        <span id="health-sales-label">Ventas pendientes</span>
        </div>

        <div>
        <span class="health-dot health-good"></span>
        <span id="health-expenses-label">Gastos pendientes</span>
        </div>

        <div>
        <span class="health-dot health-warning"></span>
        <span id="health-stock-label">Stock pendiente</span>
        </div>
        </div>

        </section>

        <section class="aqua-card smart-tip-card p-5">

        <div class="smart-tip-icon" id="smart-tip-icon">
        💡
        </div>

        <div class="min-w-0">
        <p class="text-sm text-slate-500 dark:text-slate-400">
        Recomendación
        </p>

        <h2 id="smart-tip-title" class="text-xl font-black">
        Analizando negocio...
        </h2>

        <p id="smart-tip-message" class="smart-tip-message">
        Revisando ventas, gastos e inventario.
        </p>
        </div>

        </section>

        <section class="aqua-card monthly-chart-card p-5">

        <div class="flex items-center justify-between gap-3 mb-4">
        <div>
        <p class="text-sm text-slate-500 dark:text-slate-400">
        Resumen
        </p>

        <h2 class="text-xl font-black">
        Movimiento mensual
        </h2>
        </div>

        <span class="monthly-chart-badge">
        Este mes
        </span>
        </div>

        <div class="monthly-chart-list">

        <div class="monthly-chart-item">
        <div class="monthly-chart-top">
        <span>Ventas</span>
        <strong id="monthly-chart-sales">$0.00</strong>
        </div>
        <div class="monthly-chart-track">
        <div id="monthly-chart-sales-bar" class="monthly-chart-fill sales" style="width:0%;"></div>
        </div>
        </div>

        <div class="monthly-chart-item">
        <div class="monthly-chart-top">
        <span>Gastos</span>
        <strong id="monthly-chart-expenses">$0.00</strong>
        </div>
        <div class="monthly-chart-track">
        <div id="monthly-chart-expenses-bar" class="monthly-chart-fill expenses" style="width:0%;"></div>
        </div>
        </div>

        <div class="monthly-chart-item">
        <div class="monthly-chart-top">
        <span>Ganancia</span>
        <strong id="monthly-chart-profit">$0.00</strong>
        </div>
        <div class="monthly-chart-track">
        <div id="monthly-chart-profit-bar" class="monthly-chart-fill profit" style="width:0%;"></div>
        </div>
        </div>

        </div>

        </section>

        <section id="dashboard-trend-section" class="aqua-card p-5 hidden">

        <div class="flex justify-between items-start mb-4">

        <div>
        <p class="text-sm text-slate-500 dark:text-slate-400">
        Comparativa
        </p>

        <h2 class="text-2xl font-black">
        Tendencia mensual
        </h2>

        <p
        id="trend-period"
        class="text-sm text-slate-500 mt-1"
        >
        vs mes anterior
        </p>

        </div>

        <div
        id="trend-status"
        class="badge badge-success"
        >
        —
        </div>

        </div>


        <div class="space-y-4">

        <div class="trend-row">

        <span>📈 Ventas</span>

        <div>
        <span id="trend-sales">
        —
        </span>
        </div>

        </div>


        <div class="trend-row">

        <span>📉 Gastos</span>

        <div>
        <span id="trend-expenses">
        —
        </span>
        </div>

        </div>


        <div class="trend-row">

        <span>📈 Ganancia</span>

        <div>
        <span id="trend-profit">
        —
        </span>
        </div>

        </div>

        </div>

        </section>

        <section class="aqua-card goals-card p-5">

        <div class="flex items-center justify-between gap-3 mb-4">
        <div>
        <p class="text-sm text-slate-500 dark:text-slate-400">
        Objetivos
        </p>

        <h2 class="text-xl font-black">
        Metas de venta
        </h2>
        </div>

        <button
        id="btn-edit-goals"
        type="button"
        class="goals-edit-btn"
        >
        ⚙️ Ajustar metas
        </button>
        </div>

        <div class="goals-list">

        <div class="goal-item">
        <div class="goal-top">
        <span>Meta del día</span>
        <strong id="goal-today-text">$0.00 / $500.00</strong>
        </div>

        <div class="goal-track">
        <div id="goal-today-fill" class="goal-fill today" style="width:0%;"></div>
        </div>
        <p id="goal-today-status" class="goal-status-text">
        —
        </p>
        </div>

        <div class="goal-item">
        <div class="goal-top">
        <span>Meta mensual</span>
        <strong id="goal-month-text">$0.00 / $5,000.00</strong>
        </div>

        <div class="goal-track">
        <div id="goal-month-fill" class="goal-fill month" style="width:0%;"></div>
        </div>
        <p id="goal-month-status" class="goal-status-text">
        —
        </p>
        </div>

        </div>

        </section>

        <section class="quick-actions-section aqua-card p-5">

        <div class="flex items-center justify-between gap-3 mb-4">
        <div>
        <p class="text-sm text-slate-500 dark:text-slate-400">
        Accesos
        </p>

        <h2 class="text-xl font-black">
        Acciones rápidas
        </h2>
        </div>

        <span class="quick-actions-badge">
        4 accesos
        </span>
        </div>

        <div class="quick-actions-grid">

        <button id="quick-orders" class="quick-action-card quick-action-orders">
        <div class="quick-action-icon">
        <img src="./assets/icons/orders.svg" alt="Pedidos">
        </div>

        <div>
        <p>Nuevo pedido</p>
        <span id="quick-orders-count">0 pedidos hoy</span>
        </div>
        </button>

        <button id="quick-products" class="quick-action-card quick-action-products">
        <div class="quick-action-icon">
        <img src="./assets/icons/products.svg" alt="Productos">
        </div>

        <div>
        <p>Inventario</p>
        <span id="quick-products-count">0 productos</span>
        </div>
        </button>

        <button id="quick-expenses" class="quick-action-card quick-action-expenses">
        <div class="quick-action-icon">
        <img src="./assets/icons/expenses.svg" alt="Gastos">
        </div>

        <div>
        <p>Nuevo gasto</p>
        <span id="quick-expenses-total">$0.00 este mes</span>
        </div>
        </button>

        <button id="quick-reports" class="quick-action-card quick-action-reports">
        <div class="quick-action-icon">
        <img src="./assets/icons/download-file.svg" alt="Reportes">
        </div>

        <div>
        <p>Reportes</p>
        <span id="quick-reports-profit">$0.00 ganancia</span>
        </div>
        </button>

        </div>

        </section>

        <section class="aqua-card inventory-summary-card p-5">

        <div class="flex items-center justify-between gap-3 mb-4">
        <div>
        <p class="text-sm text-slate-500 dark:text-slate-400">
        Inventario
        </p>

        <h2 class="text-xl font-black">
        Resumen de stock
        </h2>
        </div>

        <span class="inventory-summary-total" id="inventory-summary-total">
        0 productos
        </span>
        </div>

        <div class="inventory-summary-grid">

        <div class="inventory-summary-item">
        <span class="inventory-summary-dot high"></span>
        <div>
        <p>Stock alto</p>
        <strong id="inventory-high-count">0</strong>
        </div>
        </div>

        <div class="inventory-summary-item">
        <span class="inventory-summary-dot medium"></span>
        <div>
        <p>Stock medio</p>
        <strong id="inventory-medium-count">0</strong>
        </div>
        </div>

        <div class="inventory-summary-item">
        <span class="inventory-summary-dot low"></span>
        <div>
        <p>Stock bajo</p>
        <strong id="inventory-low-count">0</strong>
        </div>
        </div>

        <div class="inventory-summary-item">
        <span class="inventory-summary-dot empty"></span>
        <div>
        <p>Sin stock</p>
        <strong id="inventory-empty-count">0</strong>
        </div>
        </div>

        </div>

        </section>

        <section id="dashboard-low-stock-section" class="aqua-card p-5 hidden">
        <div class="flex items-center justify-between gap-3 mb-3">
        <div>
        <p class="text-sm text-slate-500 dark:text-slate-400">Alerta</p>
        <h2 class="text-xl font-bold">Inventario bajo</h2>
        </div>

        <span id="dashboard-low-stock-count" class="badge badge-warning">
        0 productos
        </span>
        </div>

        <div id="dashboard-low-stock-list" class="space-y-2"></div>
        </section>

        <section class="aqua-card dashboard-timeline-card p-5">

        <div class="flex items-center justify-between gap-3 mb-4">
        <div>
        <p class="text-sm text-slate-500 dark:text-slate-400">
        Actividad
        </p>

        <h2 class="text-xl font-black">
        Últimos movimientos
        </h2>
        </div>

        <span class="timeline-badge">
        En vivo
        </span>
        </div>

        <div id="dashboard-recent-movements" class="dashboard-timeline">
        <p class="text-sm text-slate-500 dark:text-slate-400">
        Cargando movimientos...
        </p>
        </div>

        </section>

        <div class="dashboard-fab-wrapper">

        <button id="dashboard-fab" class="dashboard-fab" type="button">
        +
        </button>

        <div id="dashboard-fab-menu" class="dashboard-fab-menu hidden">

        <button id="fab-new-order" type="button">
        <span>📦</span>
        Nuevo pedido
        </button>

        <button id="fab-new-product" type="button">
        <span>🧊</span>
        Nuevo producto
        </button>

        <button id="fab-new-expense" type="button">
        <span>💸</span>
        Nuevo gasto
        </button>

        </div>

        </div>

        ${renderBottomNav("home")}

        </div>
        </section>
        `;


        // Acción Botones

        document.querySelector("#theme-toggle-dashboard")?.addEventListener("click", () => {
            const theme = toggleTheme();
            showToast(theme === "dark" ? "Tema oscuro activado.": "Tema claro activado.", "success");
        });

        document.querySelector("#btn-logout")?.addEventListener("click", async () => {
            await supabaseClient.auth.signOut();
            clearLocalSession();
            showToast("Sesión cerrada.", "success");
            renderWelcome();
        });


        bindBottomNav(profile, activeBusiness);

        loadDashboardStats(activeBusiness?.businesses?.id);

        loadCurrentDate();
        loadCurrentWeather();

        document.querySelector("#quick-products")?.addEventListener("click", () => {
            renderProductsView(profile, activeBusiness);
        });

        document.querySelector("#quick-orders")?.addEventListener("click", () => {
            renderOrdersView(profile, activeBusiness);
        });

        document.querySelector("#quick-expenses")?.addEventListener("click", () => {
            renderExpensesView(profile, activeBusiness);
        });

        document.querySelector("#quick-reports")?.addEventListener("click", () => {
            renderReportsView(profile, activeBusiness);
        });

        document.querySelector("#dashboard-fab")?.addEventListener("click", () => {
            document.querySelector("#dashboard-fab-menu")?.classList.toggle("hidden");
        });

        document.querySelector("#fab-new-order")?.addEventListener("click", () => {
            renderOrdersView(profile, activeBusiness);
        });

        document.querySelector("#fab-new-product")?.addEventListener("click", () => {
            renderProductForm(profile, activeBusiness);
        });

        document.querySelector("#fab-new-expense")?.addEventListener("click", () => {
            renderExpensesView(profile, activeBusiness);
        });

        document.querySelector("#btn-edit-goals")?.addEventListener("click", () => {
            openGoalsModal(activeBusiness?.businesses?.id);
        });

    }

    function renderBottomNav(active = "home") {
        return `
        <nav class="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">

        <div class="max-w-5xl mx-auto grid grid-cols-5">

        <button id="nav-home"
        class="nav-item flex flex-col items-center justify-center gap-1 py-2 transition-all duration-200 ${active === "home" ? "text-sky-600 dark:text-sky-400": "text-slate-500"}">
        <img src="./assets/icons/home.svg" class="nav-icon" alt="Inicio">
        <span class="text-[11px]">Inicio</span>
        </button>

        <button id="nav-orders"
        class="nav-item flex flex-col items-center justify-center gap-1 py-2 transition-all duration-200 ${active === "orders" ? "text-sky-600 dark:text-sky-400": "text-slate-500"}">
        <img src="./assets/icons/orders.svg" class="nav-icon" alt="Pedidos">
        <span class="text-[11px]">Pedidos</span>
        </button>

        <button id="nav-products"
        class="nav-item flex flex-col items-center justify-center gap-1 py-2 transition-all duration-200 ${active === "products" ? "text-sky-600 dark:text-sky-400": "text-slate-500"}">
        <img src="./assets/icons/products.svg" class="nav-icon" alt="Productos">
        <span class="text-[11px]">Productos</span>
        </button>

        <button id="nav-expenses"
        class="nav-item flex flex-col items-center justify-center gap-1 py-2 transition-all duration-200 ${active === "expenses" ? "text-sky-600 dark:text-sky-400": "text-slate-500"}">
        <img src="./assets/icons/expenses.svg" class="nav-icon" alt="Gastos">
        <span class="text-[11px]">Gastos</span>
        </button>

        <button id="nav-more"
        class="nav-item flex flex-col items-center justify-center gap-1 py-2 transition-all duration-200 ${active === "more" ? "text-sky-600 dark:text-sky-400": "text-slate-500"}">
        <img src="./assets/icons/more.svg" class="nav-icon" alt="Más">
        <span class="text-[11px]">Más</span>
        </button>

        </div>

        </nav>
        `;
    }

    function bindBottomNav(profile, activeBusiness) {

        document.querySelector("#nav-home")?.addEventListener("click", async () => {
            await loadDashboard();
        });

        document.querySelector("#nav-products")?.addEventListener("click", async () => {
            renderProductsView(profile, activeBusiness);
        });

        document.querySelector("#nav-orders")?.addEventListener("click", () => {
            renderOrdersView(profile, activeBusiness);
        });

        document.querySelector("#nav-expenses")?.addEventListener("click", () => {
            renderExpensesView(profile, activeBusiness);
        });

        document.querySelector("#nav-more")?.addEventListener("click", () => {
            renderMoreView(profile, activeBusiness);
        });

    }

    // Editar Ventas mensuales
    async function openGoalsModal(businessId) {
        if (!businessId) {
            showToast("No se encontró negocio activo.", "error");
            return;
        }

        let dailyGoal = DAILY_SALES_GOAL;
        let monthlyGoal = MONTHLY_PROFIT_GOAL;
        let goalMode = "manual";

        const {
            data
        } = await supabaseClient
        .from("business_goals")
        .select("*")
        .eq("business_id", businessId)
        .maybeSingle();

        if (data) {
            dailyGoal = Number(data.daily_sales_goal || DAILY_SALES_GOAL);
            monthlyGoal = Number(data.monthly_profit_goal || MONTHLY_PROFIT_GOAL);
            goalMode = data.goal_mode || "manual";
        }

        const modal = document.createElement("div");
        modal.id = "goals-modal";
        modal.className = "goals-modal-backdrop";

        modal.innerHTML = `
        <div class="goals-modal-card">

        <div class="goals-modal-header">
        <div>
        <p>Objetivos</p>
        <h2>Ajustar metas</h2>
        </div>

        <button id="close-goals-modal" type="button">
        ×
        </button>
        </div>

        <form id="goals-form" class="goals-form">

        <label>
        <span>Meta diaria de ventas</span>
        <input
        id="goal-daily-input"
        type="number"
        min="0"
        step="1"
        value="${dailyGoal}"
        />
        </label>

        <label>
        <span>Meta mensual de ganancia</span>
        <input
        id="goal-monthly-input"
        type="number"
        min="0"
        step="1"
        value="${monthlyGoal}"
        />
        </label>

        <label>
        <span>Modo de metas</span>
        <select id="goal-mode-input">
        <option value="manual" ${goalMode === "manual" ? "selected": ""}>
        Manual
        </option>
        <option value="auto" ${goalMode === "auto" ? "selected": ""}>
        Automático
        </option>
        </select>
        </label>

        <button id="btn-save-goals" type="submit">
        Guardar metas
        </button>

        </form>

        </div>
        `;

        document.body.appendChild(modal);

        document.querySelector("#close-goals-modal")?.addEventListener("click", () => {
            modal.remove();
        });

        modal.addEventListener("click", (event) => {
            if (event.target.id === "goals-modal") {
                modal.remove();
            }
        });

        document.querySelector("#goals-form")?.addEventListener("submit",
            async (event) => {
                event.preventDefault();

                const button = document.querySelector("#btn-save-goals");

                const payload = {
                    business_id: businessId,
                    daily_sales_goal: Number(document.querySelector("#goal-daily-input").value) || 0,
                    monthly_profit_goal: Number(document.querySelector("#goal-monthly-input").value) || 0,
                    goal_mode: document.querySelector("#goal-mode-input").value,
                    updated_at: new Date().toISOString()
                };

                try {
                    setButtonLoading(button, true, "Guardando...");

                    const {
                        error
                    } = await supabaseClient
                    .from("business_goals")
                    .upsert(payload, {
                        onConflict: "business_id"
                    });

                    if (error) throw error;

                    showToast("Metas actualizadas correctamente.", "success");
                    modal.remove();

                    await loadDashboardStats(businessId);

                } catch (error) {
                    console.error(error);
                    showToast(error.message || "No se pudieron guardar las metas.", "error");
                } finally {
                    setButtonLoading(button, false);
                }
            });
    }

    // Lectura Metas Mensuales desde DB
    async function getBusinessGoals(businessId) {
        const defaultGoals = {
            daily_sales_goal: DAILY_SALES_GOAL,
            monthly_profit_goal: MONTHLY_PROFIT_GOAL,
            goal_mode: "manual"
        };

        if (!businessId) return defaultGoals;

        const {
            data,
            error
        } = await supabaseClient
        .from("business_goals")
        .select("daily_sales_goal, monthly_profit_goal, goal_mode")
        .eq("business_id", businessId)
        .maybeSingle();

        if (error) {
            console.error(error);
            return defaultGoals;
        }

        return {
            daily_sales_goal: Number(data?.daily_sales_goal || DAILY_SALES_GOAL),
            monthly_profit_goal: Number(data?.monthly_profit_goal || MONTHLY_PROFIT_GOAL),
            goal_mode: data?.goal_mode || "manual"
        };
    }

    /* =================
    Función Sección Productos
    ================== */

    async function renderProductsView(profile,
        activeBusiness) {
        const app = document.querySelector("#app");
        const businessId = activeBusiness?.businesses?.id;

        app.innerHTML = `
        <section class="has-bottom-nav min-h-screen bg-slate-100 bg-transparent px-4 py-6">
        <div class="max-w-5xl mx-auto space-y-4">

        <header class="aqua-card p-5 flex flex-col gap-4">
        <div>
        <p class="text-sm text-slate-500 dark:text-slate-400">Módulo</p>
        <h1 class="text-2xl font-bold">Productos</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
        Agrega precios, costos y stock por negocio.
        </p>
        </div>

        <button
        id="btn-new-product"
        class="w-full bg-sky-600 hover:bg-sky-500 text-white rounded-2xl py-3 font-semibold"
        >
        + Agregar producto
        </button>

        <button
        id="btn-history"
        class="w-full bg-white/80 dark:bg-slate-900 border border-sky-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl py-3 font-semibold flex items-center justify-center gap-2"
        >

        <img
        src="./assets/icons/archivo.svg"
        class="w-6 h-6"
        alt="Historial"
        >

        Historial

        </button>

        <button
        id="btn-products-pdf"
        class="w-full bg-white/80 dark:bg-slate-900 border border-sky-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl py-3 font-semibold flex items-center justify-center gap-2"
        >
        <img src="./assets/icons/download-file.svg" class="w-6 h-6" alt="Descargar">
        PDF Productos
        </button>
        </header>

        <section id="products-list" class="products-catalog-grid">
        <div class="aqua-card p-5 col-span-2 md:col-span-3">
        <p class="text-sm text-slate-500 dark:text-slate-400">Cargando productos...</p>
        </div>
        </section>

        ${renderBottomNav("products")}
        </div>
        </section>
        `;

        bindBottomNav(profile,
            activeBusiness);

        document.querySelector("#btn-new-product")?.addEventListener("click",
            () => {
                renderProductForm(profile, activeBusiness);
            });
        document.querySelector("#btn-products-pdf")?.addEventListener("click",
            async () => {
                await downloadProductsPDF(activeBusiness?.businesses?.id);
            });

        document
        .querySelector(
            "#btn-history"
        )
        ?.addEventListener(
            "click",
            ()=> {
                renderInventoryHistoryView(
                    profile,
                    activeBusiness
                );
            });

        await loadProducts(profile,
            activeBusiness,
            activeBusiness?.businesses?.id);
    }

    // Función Cargar Productos

    async function loadProducts(profile,
        activeBusiness,
        businessId) {
        const container = document.querySelector("#products-list");

        if (!businessId) {
            container.innerHTML = `
            <div class="aqua-card p-5">
            <p class="text-sm text-red-500 font-semibold">
            No se encontró negocio activo.
            </p>
            </div>
            `;
            return;
        }

        const {
            data,
            error
        } = await supabaseClient
        .from("products")
        .select("*")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .order("created_at", {
            ascending: false
        });

        if (error) {
            console.error(error);
            container.innerHTML = `
            <div class="aqua-card p-5">
            <p class="text-sm text-red-500 font-semibold">
            Error al cargar productos.
            </p>
            </div>
            `;
            return;
        }

        if (!data || data.length === 0) {
            container.innerHTML = `
            <div class="aqua-card p-5 text-center col-span-2 md:col-span-3">
            <h2 class="text-lg font-bold">Sin productos</h2>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Agrega tu primer producto con precio de compra, precio de venta y stock.
            </p>
            </div>
            `;
            return;
        }

        container.innerHTML = data.map(product => {
            const isLowStock = Number(product.stock) <= Number(product.min_stock);
            const inventoryBadge = getInventoryBadge(product);
            const categoryIcon = getProductCategoryIcon(product.category);
            const categoryLabel = getProductCategoryLabel(product.category);

            return `
            <article class="aqua-card product-card p-3 overflow-hidden border border-white/50 dark:border-slate-800 shadow-xl shadow-sky-900/10">

            <button
            type="button"
            class="btn-view-product-image product-image-wrapper relative w-full aspect-square rounded-[2rem] overflow-hidden bg-white/80 dark:bg-slate-900 flex items-center justify-center active:scale-95 transition shadow-inner border border-white/70 dark:border-slate-800"
            data-image-url="${product.image_url || ""}"
            data-product-name="${product.name || "Producto"}"
            ${!product.image_url ? "disabled": ""}
            >
            ${product.image_url
            ? `
            <div class="product-image-skeleton absolute inset-0 animate-pulse bg-slate-300 dark:bg-slate-700 transition-opacity duration-300"></div>

            <img
            src="${getCloudinaryImage(product.image_url, {
                width: 500
            })}"
            class="w-full h-full object-cover opacity-0 transition-opacity duration-300"
            alt="${product.name}"
            loading="lazy"
            onload="handleProductImageLoad(this)"
            >
            `: `<span class="text-5xl">💧</span>`
            }
            </button>

            <div class="mt-3 space-y-2">
            <p class="text-[11px] font-black uppercase tracking-wide text-sky-600 dark:text-sky-400 truncate">
            <span class="inline-flex items-center gap-1.5">
            <img src="${categoryIcon}" class="w-4 h-4 object-contain" alt="${categoryLabel}">
            <span>${categoryLabel}</span>
            <span>·</span>
            <span>${product.presentation || "—"}</span>
            </span>
            </p>

            <h2 class="text-base font-black leading-tight line-clamp-2 min-h-[42px] text-slate-900 dark:text-white">
            ${product.brand ? `<span class="text-slate-500 dark:text-slate-400">${product.brand}</span> · `: ""}
            ${product.name}
            </h2>

            <div class="grid grid-cols-2 gap-2">
            <div class="rounded-2xl bg-white white:bg-slate-900/50 p-2 border border-white/50 dark:border-slate-800">
            <p class="text-[10px] text-slate-500 dark:text-slate-400">Compra</p>
            <p class="text-sm font-black">${formatCurrency(product.cost_price)}</p>
            </div>

            <div class="rounded-2xl bg-white white:bg-slate-900/50 p-2 border border-white/50 dark:border-slate-800">
            <p class="text-[10px] text-slate-500 dark:text-slate-400">Venta</p>
            <p class="text-sm font-black">${formatCurrency(product.sale_price)}</p>
            </div>
            </div>

            <div class="grid grid-cols-2 gap-2">
            <div class="rounded-2xl bg-sky-100/90 border border-sky-200 p-2 dark:bg-sky-900/30 dark:border-sky-800">
            <p class="text-[10px] font-semibold text-sky-700 dark:text-sky-300">Inicial</p>
            <p class="text-lg font-black">${product.initial_stock || 0}</p>
            </div>

            <div class="rounded-2xl bg-emerald-100/90 border border-emerald-200 p-2 dark:bg-emerald-900/30 dark:border-emerald-800">
            <p class="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">Actual</p>
            <p class="text-lg font-black">${product.stock || 0}</p>
            </div>
            </div>

            <div class="flex items-center justify-between gap-2">
            <span class="text-[10px] text-slate-500 dark:text-slate-400">
            Mín: ${product.min_stock || 0}
            </span>

            <span class="inventory-badge ${inventoryBadge.className}">
            <span class="inventory-badge-dot">${inventoryBadge.icon}</span>
            <span>${inventoryBadge.text}</span>
            </span>
            </div>

            <div class="grid grid-cols-2 gap-2 mt-3">

            <button
            type="button"
            class="btn-restock-product flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl py-2.5 text-xs font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition"
            data-product-id="${product.id}"
            data-product-name="${product.name}"
            data-product-brand="${product.brand || ""}"
            data-product-presentation="${product.presentation || ""}"
            data-product-stock="${product.stock || 0}"
            data-product-initial-stock="${product.initial_stock || 0}"
            >
            <img src="assets/icons/agregar-producto.svg" class="w-5 h-5 brightness-0 invert" alt="">
            <span>Stock</span>
            </button>

            <button
            type="button"
            class="btn-upload-product-image flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl py-2.5 text-xs font-black shadow-lg shadow-slate-900/20 active:scale-95 transition dark:bg-slate-700 dark:hover:bg-slate-600"
            data-product-id="${product.id}"
            >
            <img src="assets/icons/subir-imagen.svg" class="w-5 h-5 brightness-0 invert" alt="">
            <span>Foto</span>
            </button>

            </div>
            </div>

            </article>
            `;
        }).join("");

        document.querySelectorAll(".btn-view-product-image").forEach(button => {
            button.addEventListener("click", () => {
                const imageUrl = button.dataset.imageUrl;
                const productName = button.dataset.productName;

                if (!imageUrl) return;

                openProductImageModal(imageUrl, productName);
            });
        });

        document.querySelectorAll(".btn-restock-product").forEach(button => {
            button.addEventListener("click",
                () => {
                    renderRestockProductForm(profile, activeBusiness, {
                        id: button.dataset.productId,
                        name: button.dataset.productName,
                        brand: button.dataset.productBrand,
                        presentation: button.dataset.productPresentation,
                        stock: Number(button.dataset.productStock) || 0,
                        initial_stock: Number(button.dataset.productInitialStock) || 0
                    });
                });
        });

        document.querySelectorAll(".btn-upload-product-image").forEach(button => {
            button.addEventListener("click",
                async () => {
                    const productId = button.dataset.productId;

                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/*";

                    input.addEventListener("change", async () => {
                        const file = input.files?.[0];

                        if (!file) return;

                        try {
                            setButtonLoading(button, true, "Subiendo...");

                            const imageUrl = await uploadProductImageToCloudinary(file);

                            const {
                                error
                            } = await supabaseClient
                            .from("products")
                            .update({
                                image_url: imageUrl
                            })
                            .eq("id", productId);

                            if (error) throw error;

                            showToast("Imagen actualizada correctamente.", "success");

                            await loadProducts(profile, activeBusiness, businessId);

                        } catch (error) {
                            console.error(error);
                            showToast(error.message || "No se pudo actualizar la imagen.", "error");
                        } finally {
                            setButtonLoading(button, false);
                        }
                    });

                    input.click();
                });
        });
    }

    // Función Visual Stock
    function getInventoryBadge(product) {
        const stock = Number(product.stock) || 0;
        const minStock = Number(product.min_stock) || 0;

        if (stock <= 0) {
            return {
                text: "Sin stock",
                icon: "⚫",
                className: "inventory-badge-empty"
            };
        }

        if (stock <= minStock) {
            return {
                text: "Stock bajo",
                icon: "🔴",
                className: "inventory-badge-low"
            };
        }

        if (minStock > 0 && stock <= minStock * 2) {
            return {
                text: "Stock medio",
                icon: "🟡",
                className: "inventory-badge-medium"
            };
        }

        return {
            text: "Stock alto",
            icon: "🟢",
            className: "inventory-badge-high"
        };
    }

    // Función Categoría por Iconos
    function getProductCategoryIcon(category) {
        const icons = {
            agua: "assets/icons/botella-de-agua.svg",
            hielo: "assets/icons/glaciares.svg",
            relleno: "assets/icons/gota-de-agua.svg",
            insumo: "assets/icons/caja.svg",
            otro: "assets/icons/products.svg"
        };

        return icons[category] || icons.otro;
    }

    function getProductCategoryLabel(category) {
        const labels = {
            agua: "Agua",
            hielo: "Hielo",
            relleno: "Relleno",
            insumo: "Insumo",
            otro: "Otro"
        };

        return labels[category] || "Otro";
    }

    // Guardar Productos

    function renderProductForm(profile, activeBusiness) {
        const app = document.querySelector("#app");
        const businessId = activeBusiness?.businesses?.id;

        app.innerHTML = `
        <section class="has-bottom-nav min-h-screen bg-slate-100 bg-transparent px-4 py-6">
        <div class="max-w-2xl mx-auto space-y-4">

        <form id="product-form" class="aqua-card p-5 space-y-4">

        <div>
        <button type="button" id="back-products" class="text-sm text-sky-600 dark:text-sky-400 font-semibold mb-4">
        ← Volver a productos
        </button>

        <h1 class="text-2xl font-bold">Agregar producto</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
        Registra precio de compra, precio de venta y stock.
        </p>
        </div>

        <label class="block">
        <span class="form-label">Marca</span>

        <input
        id="product-brand"
        type="text"
        placeholder="OasisPura"
        class="form-control"
        />
        </label>

        <label class="block">
        <span class="text-sm font-semibold">Producto</span>
        <input
        id="product-name"
        type="text"
        required
        placeholder="Botella de Agua"
        class="form-control"
        />
        </label>

        <label class="block">
        <span class="text-sm font-semibold">Categoría</span>
        <select
        id="product-category"
        required
        class="form-control"
        >
        <option value="">Seleccionar</option>
        <option value="agua">Agua</option>
        <option value="hielo">Hielo</option>
        <option value="relleno">Relleno de garrafón</option>
        <option value="insumo">Insumo</option>
        <option value="otro">Otro</option>
        </select>
        </label>

        <label class="block">
        <span class="text-sm font-semibold">Presentación</span>
        <input
        id="product-presentation"
        type="text"
        placeholder="1 L, 1.5 L, 20 L, 3 Kg, 5 Kg"
        class="form-control"
        />
        </label>

        <label class="block">
        <span class="form-label">Fecha y hora de compra</span>

        <input
        id="product-purchase-at"
        type="datetime-local"
        class="form-control"
        />

        <p class="text-xs text-slate-500 dark:text-slate-400 mt-2">
        Si lo dejas vacío, se usará la fecha y hora actual.
        </p>
        </label>

        <div class="form-grid form-grid-2">

        <label class="block">
        <span class="form-label">Precio compra</span>

        <input
        id="product-cost"
        type="number"
        min="0"
        step="0.01"
        required
        placeholder="0.00"
        class="form-control"
        />
        </label>

        <label class="block">
        <span class="form-label">Precio venta</span>

        <input
        id="product-sale"
        type="number"
        min="0"
        step="0.01"
        required
        placeholder="0.00"
        class="form-control"
        />
        </label>

        </div>

        <div class="form-grid form-grid-2">

        <label class="block">
        <span class="form-label">Stock inicial</span>

        <input
        id="product-stock"
        type="number"
        min="0"
        step="1"
        required
        placeholder="0"
        class="form-control"
        />
        </label>

        <label class="block">
        <span class="form-label">Stock mínimo</span>

        <input
        id="product-min-stock"
        type="number"
        min="0"
        step="1"
        placeholder="0"
        class="form-control"
        />
        </label>

        </div>

        <label class="block">
        <span class="form-label">Imagen del producto</span>

        <input
        id="product-image"
        type="file"
        accept="image/*"
        class="form-control"
        />

        <p class="text-xs text-slate-500 dark:text-slate-400 mt-2">
        Opcional. Puedes agregar una imagen ahora o después.
        </p>
        </label>

        <button
        id="btn-save-product"
        type="submit"
        class="w-full bg-sky-600 hover:bg-sky-500 text-white rounded-2xl py-3 font-semibold"
        >
        Guardar producto
        </button>

        </form>

        ${renderBottomNav("products")}

        </div>
        </section>
        `;

        bindBottomNav(profile, activeBusiness);

        document.querySelector("#back-products")?.addEventListener("click", () => {
            renderProductsView(profile, activeBusiness);
        });

        document.querySelector("#product-form")?.addEventListener("submit", async (event) => {
            event.preventDefault();

            const button = document.querySelector("#btn-save-product");
            const imageFile = document.querySelector("#product-image")?.files?.[0] || null;

            let imageUrl = null;

            const payload = {
                business_id: businessId,
                brand: document.querySelector("#product-brand").value.trim(),
                name: document.querySelector("#product-name").value.trim(),
                category: document.querySelector("#product-category").value,
                presentation: document.querySelector("#product-presentation").value.trim(),
                cost_price: Number(document.querySelector("#product-cost").value) || 0,
                sale_price: Number(document.querySelector("#product-sale").value) || 0,
                initial_stock: Number(document.querySelector("#product-stock").value) || 0,
                stock: Number(document.querySelector("#product-stock").value) || 0,
                min_stock: Number(document.querySelector("#product-min-stock").value) || 0,
                purchase_at: document.querySelector("#product-purchase-at").value
                ? new Date(document.querySelector("#product-purchase-at").value).toISOString(): new Date().toISOString(),
                is_active: true,
                image_url: imageUrl
            };

            if (!payload.business_id) {
                showToast("No se encontró negocio activo.", "error");
                return;
            }

            if (!payload.name || !payload.category) {
                showToast("Completa producto y categoría.", "warning");
                return;
            }

            try {
                setButtonLoading(button, true, "Guardando...");

                if (imageFile) {
                    setButtonLoading(button, true, "Subiendo imagen...");
                    imageUrl = await uploadProductImageToCloudinary(imageFile);
                    payload.image_url = imageUrl;
                    setButtonLoading(button, true, "Guardando...");
                }

                const {
                    data: existingProducts,
                    error: duplicateError
                } = await supabaseClient
                .from("products")
                .select("*")
                .eq("business_id", payload.business_id)
                .eq("is_active", true)
                .ilike("brand", payload.brand)
                .ilike("name", payload.name)
                .ilike("presentation", payload.presentation);

                if (duplicateError) throw duplicateError;

                if (existingProducts && existingProducts.length > 0) {
                    const existingProduct = existingProducts[0];

                    const confirmRestock = confirm(
                        `Ya existe este producto:\n\n${existingProduct.brand || ""} ${existingProduct.name} ${existingProduct.presentation || ""}\n\n¿Deseas reabastecer el producto existente?`
                    );

                    if (confirmRestock) {
                        renderRestockProductForm(profile, activeBusiness, existingProduct);
                        return;
                    }

                    showToast("Producto duplicado no agregado.", "warning");
                    return;
                }

                const {
                    error
                } = await supabaseClient
                .from("products")
                .insert(payload);

                if (error) throw error;

                showToast("Producto agregado correctamente.", "success");
                renderProductsView(profile, activeBusiness);

            } catch (error) {
                console.error(error);
                showToast(error.message || "No se pudo guardar el producto.", "error");
            } finally {
                setButtonLoading(button, false);
            }
        });
    }

    // Agregar Imagen a Productos
    async function uploadProductImageToCloudinary(file) {
        const cloudName = "dzh0gjzet";
        const uploadPreset = "Aquacontrol";

        const formData = new FormData();
        formData.append("file",
            file);
        formData.append("upload_preset",
            uploadPreset);

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
            {
                method: "POST",
                body: formData
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error(data);
            throw new Error("No se pudo subir la imagen a Cloudinary.");
        }

        return data.secure_url;
    }

    function getCloudinaryImage(url, options = {}) {
        if (!url) return "";

        const {
            width = 500,
            quality = "auto",
            format = "auto",
            crop = "fill"
        } = options;

        return url.replace(
            "/upload/",
            `/upload/f_${format},q_${quality},c_${crop},w_${width}/`
        );
    }

    // Agrandar Imagen Producto
    function openProductImageModal(imageUrl, productName = "Producto") {
        if (!imageUrl) return;

        const optimizedImage = getCloudinaryImage(imageUrl, {
            width: 1000,
            crop: "fit"
        });

        const modal = document.createElement("div");
        modal.id = "product-image-modal";
        modal.className = "fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4";

        modal.innerHTML = `
        <div class="relative w-full max-w-md">
        <button
        type="button"
        id="close-product-image-modal"
        class="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/20 text-white text-2xl font-bold flex items-center justify-center"
        >
        ×
        </button>

        <div class="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl">
        <div class="relative bg-white min-h-[260px] flex items-center justify-center">
        <div class="product-modal-skeleton absolute inset-0 animate-pulse bg-slate-200 transition-opacity duration-300"></div>

        <img
        src="${optimizedImage}"
        alt="${productName}"
        class="product-modal-img w-full max-h-[75vh] object-contain bg-white opacity-0 transition-opacity duration-300"
        onload="
        this.classList.remove('opacity-0');
        const skeleton = this.parentElement.querySelector('.product-modal-skeleton');
        if (skeleton) {
        skeleton.classList.add('opacity-0');
        setTimeout(() => skeleton.remove(), 300);
        }
        "
        />
        </div>

        <div class="p-4">
        <h3 class="text-lg font-bold text-slate-900 dark:text-white">
        ${productName}
        </h3>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
        Toca fuera de la imagen para cerrar.
        </p>
        </div>
        </div>
        </div>
        `;

        document.body.appendChild(modal);

        modal.addEventListener("click", (event) => {
            if (event.target.id === "product-image-modal") {
                modal.remove();
            }
        });

        document.querySelector("#close-product-image-modal")?.addEventListener("click",
            () => {
                modal.remove();
            });
    }

    // Skeleton mientras carga imagen
    window.handleProductImageLoad = function(img) {
        const wrapper = img.closest(".product-image-wrapper");
        const skeleton = wrapper?.querySelector(".product-image-skeleton");

        if (skeleton) {
            skeleton.classList.add("opacity-0");
            setTimeout(() => {
                skeleton.remove();
            }, 300);
        }

        img.classList.remove("opacity-0");
    }

    // Función Sección Pedidos

    async function renderOrdersView(profile,
        activeBusiness) {
        const app = document.querySelector("#app");

        app.innerHTML = `
        <section class="has-bottom-nav min-h-screen bg-slate-100 bg-transparent px-4 py-6">
        <div class="max-w-5xl mx-auto space-y-4">

        <header class="aqua-card orders-hero p-5">

        <div class="orders-hero-top">

        <div>
        <p class="orders-eyebrow">Módulo</p>
        <h1>Pedidos</h1>
        <p class="orders-subtitle">
        Registro y control de pedidos del negocio.
        </p>
        </div>

        <div class="orders-hero-icon">
        <img src="./assets/icons/orders.svg" alt="Pedidos">
        </div>

        </div>

        <div class="orders-actions-grid">

        <button
        id="btn-new-order"
        class="orders-primary-btn"
        >
        <span>+</span>
        Nuevo pedido
        </button>

        <button
        id="btn-download-orders-pdf"
        class="orders-secondary-btn"
        >
        <img src="./assets/icons/download-file.svg" alt="Descargar">
        PDF Pedidos
        </button>

        </div>

        </header>

        <section class="orders-kpi-grid">

        <div class="orders-kpi-card">
        <div class="orders-kpi-icon orders-kpi-orders">📦</div>
        <p>Pedidos hoy</p>
        <h2 id="orders-today-count">0</h2>
        </div>

        <div class="orders-kpi-card">
        <div class="orders-kpi-icon orders-kpi-sales">💵</div>
        <p>Ventas pedidos</p>
        <h2 id="orders-total-sale">$0.00</h2>
        </div>

        <div class="orders-kpi-card">
        <div class="orders-kpi-icon orders-kpi-profit">📈</div>
        <p>Ganancia</p>
        <h2 id="orders-total-profit">$0.00</h2>
        </div>

        </section>

        <section class="aqua-card orders-list-card p-5">

        <div class="flex items-center justify-between gap-3 mb-4">
        <div>
        <p class="text-sm text-slate-500 dark:text-slate-400">
        Historial
        </p>

        <h2 class="text-2xl font-black">
        Pedidos registrados
        </h2>

        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
        Consulta ventas, clientes y ganancias.
        </p>
        </div>
        </div>

        <div id="orders-mobile-list" class="orders-mobile-list">
        <p class="text-sm text-slate-500 dark:text-slate-400">
        Cargando pedidos...
        </p>
        </div>

        <div class="aqua-table-wrapper orders-desktop-table">
        <table class="aqua-table">
        <thead>
        <tr>
        <th># Pedido</th>
        <th>Fecha</th>
        <th>Cliente</th>
        <th>Vendedor</th>
        <th>Productos</th>
        <th>Venta</th>
        <th>Costo</th>
        <th>Ganancia</th>
        <th>Status</th>
        </tr>
        </thead>

        <tbody id="orders-table-body">
        <tr>
        <td colspan="9" class="text-center text-slate-500">
        Sin pedidos registrados.
        </td>
        </tr>
        </tbody>
        </table>
        </div>

        </section>

        ${renderBottomNav("orders")}

        </div>
        </section>
        <div
        id="order-actions-sheet"
        class="order-sheet hidden"
        >

        <div class="order-sheet-backdrop"></div>

        <div class="order-sheet-content">

        <div class="order-sheet-handle"></div>

        <div class="order-sheet-header">

        <div>

        <p class="sheet-label">
        Pedido seleccionado
        </p>

        <h2
        id="sheet-order-client"
        class="sheet-title"
        >
        —
        </h2>

        <p
        id="sheet-order-summary"
        class="sheet-subtitle"
        >
        —
        </p>

        </div>

        </div>

        <button id="sheet-edit" class="order-sheet-action action-edit">
        ✏️ Editar pedido
        </button>

        <button id="sheet-whatsapp" class="order-sheet-action action-whatsapp">
        📲 Compartir WhatsApp
        </button>

        <button id="sheet-pdf" class="order-sheet-action action-pdf">
        🧾 Generar PDF
        </button>

        <button id="sheet-status" class="order-sheet-action action-status">
        🔁 Cambiar estatus
        </button>

        <button id="sheet-cancel" class="order-sheet-action action-cancel">
        ❌ Cancelar pedido
        </button>

        </div>

        </div>
        `;

        bindBottomNav(profile,
            activeBusiness);

        document.querySelector("#btn-new-order")?.addEventListener("click",
            () => {
                renderOrderForm(profile, activeBusiness);
            });

        document.querySelector("#btn-download-orders-pdf")?.addEventListener("click",
            async () => {
                await downloadOrdersPDF(profile, activeBusiness);
            });

        document.querySelector("#sheet-edit")?.addEventListener("click", () => {
            closeOrderSheet();
            renderEditOrderForm(selectedOrder, profile, activeBusiness);
        });

        document.querySelector("#sheet-whatsapp")?.addEventListener("click", () => {
            closeOrderSheet();
            shareOrderWhatsapp(selectedOrder);
        });

        document.querySelector("#sheet-pdf")?.addEventListener("click", () => {
            closeOrderSheet();
            downloadSingleOrderPDF(selectedOrder);
        });

        document.querySelector("#sheet-status")?.addEventListener("click", () => {
            closeOrderSheet();
            openOrderStatusModal(selectedOrder, activeBusiness?.businesses?.id);
        });

        document.querySelector("#sheet-cancel")?.addEventListener("click", () => {
            closeOrderSheet();
            cancelOrder(selectedOrder, activeBusiness?.businesses?.id);
        });

        await loadOrders(activeBusiness?.businesses?.id);
    }

    // Función Cargar pedidos

    async function loadOrders(businessId) {
        const tbody = document.querySelector("#orders-table-body");
        const mobileList = document.querySelector("#orders-mobile-list");

        if (!businessId) {
            tbody.innerHTML = `
            <tr>
            <td colspan="9" class="text-center text-red-500 font-semibold">
            No se encontró negocio activo.
            </td>
            </tr>
            `;
            return;
        }

        const {
            data,
            error
        } = await supabaseClient
        .from("orders")
        .select(`
            id,
            order_number,
            status,
            total_sale,
            total_cost,
            total_profit,
            created_at,
            clients (
            name,
            whatsapp,
            address
            ),
            profiles (
            full_name
            ),
            order_items (
            product_name,
            quantity
            )
            `)
        .eq("business_id", businessId)
        .order("created_at", {
            ascending: false
        });

        if (error) {
            console.error(error);

            tbody.innerHTML = `
            <tr>
            <td colspan="9" class="text-center text-red-500 font-semibold">
            Error al cargar pedidos.
            </td>
            </tr>
            `;
            return;
        }

        if (!data || data.length === 0) {
            document.querySelector("#orders-today-count").textContent = "0";
            document.querySelector("#orders-total-sale").textContent = formatCurrency(0);
            document.querySelector("#orders-total-profit").textContent = formatCurrency(0);
            tbody.innerHTML = `
            <tr>
            <td colspan="9" class="text-center text-slate-500">
            Sin pedidos registrados.
            </td>
            </tr>
            `;
            return;
        }

        const today = new Date().toISOString().slice(0, 10);

        const ordersToday = data.filter(order => {
            return order.created_at?.slice(0, 10) === today;
        });

        const totalSale = data.reduce((sum, order) => {
            return sum + Number(order.total_sale || 0);
        }, 0);

        const totalProfit = data.reduce((sum, order) => {
            return sum + Number(order.total_profit || 0);
        }, 0);

        document.querySelector("#orders-today-count").textContent = ordersToday.length;
        document.querySelector("#orders-total-sale").textContent = formatCurrency(totalSale);
        document.querySelector("#orders-total-profit").textContent = formatCurrency(totalProfit);

        tbody.innerHTML = data.map(order => {
            const productsText = order.order_items?.length
            ? order.order_items
            .map(item => `${item.product_name} x${item.quantity}`)
            .join(", "): "—";

            if (mobileList) {
                mobileList.innerHTML = `
                <div class="orders-empty-state">
                <div>📦</div>
                <p>Sin pedidos registrados.</p>
                <span>Cuando registres pedidos aparecerán aquí.</span>
                </div>
                `;
            }

            if (mobileList) {
                mobileList.innerHTML = `
                <div class="orders-empty-state">
                <div>⚠️</div>
                <p>Error al cargar pedidos.</p>
                <span>Intenta recargar la sección.</span>
                </div>
                `;
            }

            return `
            <tr>
            <td>#${String(order.order_number).padStart(4, "0")}</td>
            <td>${formatDate(order.created_at)}</td>
            <td>${order.clients?.name || "—"}</td>
            <td>${order.profiles?.full_name || "—"}</td>
            <td>${productsText}</td>
            <td>${formatCurrency(order.total_sale)}</td>
            <td>${formatCurrency(order.total_cost)}</td>
            <td>${formatCurrency(order.total_profit)}</td>
            <td>
            <span class="badge ${getOrderStatusClass(order.status)}">
            ${getOrderStatusLabel(order.status)}
            </span>
            </td>
            </tr>
            `;
        }).join("");

        if (mobileList) {
            mobileList.innerHTML = data.map(order => {
                const productsHTML = order.order_items?.length
                ? order.order_items.map(item => {

                    const icon =
                    item.product_name
                    .toLowerCase()
                    .includes("agua")

                    ? "🧴": item.product_name
                    .toLowerCase()
                    .includes("hielo")

                    ? "🧊": "📦";

                    return `
                    <div class="product-chip">

                    <span class="product-chip-icon">
                    ${icon}
                    </span>

                    <span class="product-chip-text">
                    ${item.product_name}
                    </span>

                    <span class="product-chip-qty">
                    ×${item.quantity}
                    </span>

                    </div>
                    `;

                }).join(""): `
                <div class="product-chip-empty">
                Sin productos
                </div>
                `;

                const orderId = order.id;
                const orderNumber = String(order.order_number || 0).padStart(4, "0");

                return `
                <article
                class="
                order-mobile-card
                order-accordion-card
                "

                data-order-id="${order.id}"

                data-client="${order.clients?.name}"

                data-number="${order.order_number}"

                data-total="${formatCurrency(order.total_sale)}"

                data-status="${getOrderStatusLabel(order.status)}"

                data-status-raw="${order.status || "pendiente"}"

                data-whatsapp="${order.clients?.whatsapp || ""}"
                data-address="${order.clients?.address || ""}"
                >

                <button
                type="button"
                class="order-accordion-toggle"
                data-order-id="${orderId}"
                >

                <div class="order-mobile-header">
                <div class="order-mobile-icon"><div class="client-avatar">

                ${getClientInitials(
                    order.clients?.name
                )}

                </div></div>

                <div class="min-w-0">
                <p class="order-mobile-eyebrow">
                Pedido #${orderNumber}
                </p>

                <h3>
                ${order.clients?.name || "Sin cliente"}
                </h3>

                <p class="order-mobile-date">
                ${formatDate(order.created_at)}
                </p>
                </div>

                <div class="order-accordion-right">
                <span class="badge ${getOrderStatusClass(order.status)}">
                ${getOrderStatusLabel(order.status)}
                </span>

                <strong>
                ${formatCurrency(order.total_sale)}
                </strong>

                <span class="order-chevron">
                ▼
                </span>
                <div class="order-progress">
                <div
                class="order-progress-fill ${getOrderProgressClass(order.status)}"
                style="width: ${getOrderProgress(order.status)}%;"
                ></div>
                </div>
                <p class="order-progress-text">
                ${getOrderStage(order.status)}
                </p>
                </div>
                </div>

                </button>

                <div
                id="order-detail-${orderId}"
                class="order-accordion-detail hidden"
                >

                <div class="order-mobile-products">
                ${productsHTML}
                </div>

                <div class="order-mobile-totals">
                <div>
                <span>Venta</span>
                <strong>${formatCurrency(order.total_sale)}</strong>
                </div>

                <div>
                <span>Costo</span>
                <strong>${formatCurrency(order.total_cost)}</strong>
                </div>

                <div>
                <span>Ganancia</span>
                <strong>${formatCurrency(order.total_profit)}</strong>
                </div>
                </div>

                <div class="order-detail-grid">
                <div>
                <span>Vendedor</span>
                <strong>${order.profiles?.full_name || "—"}</strong>
                </div>

                <div>
                <span>Fecha</span>
                <strong>${formatDate(order.created_at)}</strong>
                </div>
                </div>

                </div>

                </article>
                `;
            }).join("");

            enableOrderActions();

            document.querySelectorAll(".order-accordion-toggle").forEach(button => {
                button.addEventListener("click", () => {
                    const orderId = button.dataset.orderId;
                    const detail = document.querySelector(`#order-detail-${orderId}`);
                    const card = button.closest(".order-accordion-card");

                    detail?.classList.toggle("hidden");
                    card?.classList.toggle("is-open");
                });
            });
        }
    }

    // Cancelar Pedidos
    async function cancelOrder(orderId, businessId) {

        const card =
        document.querySelector(
            `[data-order-id="${orderId}"]`
        );

        if (!card) {

            showToast(
                "No se encontró el pedido.",
                "error"
            );

            return;

        }

        const client =
        card.dataset.client ||
        "Cliente";

        const number =
        String(
            card.dataset.number ||
            ""
        )
        .padStart(
            4,
            "0"
        );

        const modal =
        document.createElement(
            "div"
        );

        modal.className =
        "cancel-order-backdrop";

        modal.innerHTML =
        `
        <div class="cancel-order-modal">

        <div class="cancel-order-icon">
        ❌
        </div>

        <h2>
        Cancelar pedido
        </h2>

        <p>
        Pedido #${number}
        <br>
        ${client}
        </p>

        <div class="cancel-order-buttons">

        <button
        class="
        cancel-order-close
        "
        >

        Volver

        </button>

        <button
        class="
        cancel-order-confirm
        "
        >

        Confirmar

        </button>

        </div>

        </div>
        `;

        document.body.appendChild(
            modal
        );

        modal
        .querySelector(
            ".cancel-order-close"
        )
        .onclick =
        ()=> {

            modal.remove();

        };

        modal
        .querySelector(
            ".cancel-order-confirm"
        )
        .onclick =
        async()=> {

            try {

                await restoreInventoryFromCancelledOrder(orderId, businessId, profile);

                const {
                    error
                } =
                await supabaseClient
                .from(
                    "orders"
                )
                .update({

                    status:
                    "cancelado"

                })
                .eq(
                    "id",
                    orderId
                );

                if (error)
                    throw error;

                modal.remove();

                showToast(
                    "Pedido cancelado.",
                    "success"
                );

                if (
                    businessId
                ) {

                    await loadOrders(
                        businessId
                    );

                }

            }catch(
                error
            ) {

                console.error(
                    error
                );

                showToast(
                    "No se pudo cancelar.",
                    "error"
                );

            }

        };

    }

    //Cambiar Status Pedidos
    function openOrderStatusModal(orderId, businessId) {
        const card = document.querySelector(`[data-order-id="${orderId}"]`);

        if (!card) {
            showToast("No se encontró el pedido.", "error");
            return;
        }

        const currentStatus = card.dataset.statusRaw || "pendiente";
        const client = card.dataset.client || "Cliente";
        const number = String(card.dataset.number || "").padStart(4, "0");

        const modal = document.createElement("div");
        modal.className = "order-status-modal-backdrop";

        modal.innerHTML = `
        <div class="order-status-modal">

        <div class="order-status-modal-header">
        <div>
        <p>Pedido #${number}</p>
        <h2>${client}</h2>
        </div>

        <button type="button" id="close-order-status-modal">
        ×
        </button>
        </div>

        <div class="order-status-options">

        ${[
            ["pendiente",
                "🟡",
                "Pendiente"],
            ["en_proceso",
                "🔵",
                "En proceso"],
            ["entregado",
                "🟢",
                "Entregado"],
            ["pagado",
                "✅",
                "Pagado"],
            ["cancelado",
                "🔴",
                "Cancelado"]
        ].map(([value, icon, label]) => `
            <button
            type="button"
            class="order-status-option ${currentStatus === value ? "is-active": ""}"
            data-status="${value}"
            >
            <span>${icon}</span>
            ${label}
            </button>
            `).join("")}

        </div>

        </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector("#close-order-status-modal")?.addEventListener("click", () => {
            modal.remove();
        });

        modal.addEventListener("click", (event) => {
            if (event.target === modal) {
                modal.remove();
            }
        });

        modal.querySelectorAll(".order-status-option").forEach(button => {
            button.addEventListener("click", async () => {
                const newStatus = button.dataset.status;

                try {
                    const {
                        error
                    } = await supabaseClient
                    .from("orders")
                    .update({
                        status: newStatus
                    })
                    .eq("id", orderId);

                    if (error) throw error;

                    showToast("Estatus actualizado.", "success");
                    modal.remove();

                    if (businessId) {
                        await loadOrders(businessId);
                    } else {
                        await loadDashboard();
                    }

                } catch (error) {
                    console.error(error);
                    showToast(error.message || "No se pudo actualizar el estatus.", "error");
                }
            });
        });
    }

    // Acciones Pedidos
    // ======================
    // Acciones rápidas pedidos
    // ======================

    let selectedOrder = null;

    function enableOrderActions() {

        document
        .querySelectorAll(
            ".order-accordion-card"
        )
        .forEach(card => {

            let timer;

            card.addEventListener(
                "touchstart",
                ()=> {

                    timer =
                    setTimeout(()=> {

                        selectedOrder =
                        card.dataset.orderId;

                        openOrderSheet();

                    }, 500);

                });

            card.addEventListener(
                "touchend",
                ()=> {

                    clearTimeout(
                        timer
                    );

                });

        });

    }

    function openOrderSheet() {

        const card =
        document.querySelector(
            `[data-order-id="${selectedOrder}"]`
        );

        if (card) {

            document
            .querySelector(
                "#sheet-order-client"
            )
            .textContent =
            card.dataset.client;

            document
            .querySelector(
                "#sheet-order-summary"
            )
            .textContent =
            `
            Pedido #${card.dataset.number}
            •
            ${card.dataset.total}
            •
            ${card.dataset.status}
            `;

        }

        document
        .querySelector(
            "#order-actions-sheet"
        )
        .classList
        .remove(
            "hidden"
        );

    }

    function closeOrderSheet() {

        document
        .querySelector(
            "#order-actions-sheet"
        )
        ?.classList
        .add(
            "hidden"
        );

    }

    document
    .addEventListener(
        "click",
        (event)=> {

            if (
                event.target
                .classList
                .contains(
                    "order-sheet-backdrop"
                )
            ) {

                closeOrderSheet();

            }

        });

    // Compartir Pedido WhatsApp
    function shareOrderWhatsapp(orderId) {
        const card = document.querySelector(`[data-order-id="${orderId}"]`);

        if (!card) {
            showToast("No se encontró el pedido.", "error");
            return;
        }

        const client = card.dataset.client || "Cliente";
        const number = String(card.dataset.number || "").padStart(4, "0");
        const total = card.dataset.total || "$0.00";
        const status = card.dataset.status || "Pendiente";
        const whatsapp = card.dataset.whatsapp || "";

        const message = `
        Hola ${client}, tu pedido #${number} fue registrado correctamente.

        Total: ${total}
        Estatus: ${status}

        Gracias por tu compra.
        Oasis Puro
        `.trim();

        const cleanPhone = whatsapp.replace(/\D/g, "");

        const url = cleanPhone
        ? `https://wa.me/52${cleanPhone}?text=${encodeURIComponent(message)}`: `https://wa.me/?text=${encodeURIComponent(message)}`;

        window.open(url, "_blank");
    }

    // Barra Progreso Estatus Pedidos
    function getOrderProgress(status) {
        const progress = {
            pendiente: 25,
            en_proceso: 60,
            entregado: 90,
            pagado: 100,
            cancelado: 0
        };

        return progress[status] ?? 25;
    }

    function getOrderProgressClass(status) {
        const classes = {
            pendiente: "order-progress-warning",
            en_proceso: "order-progress-info",
            entregado: "order-progress-success",
            pagado: "order-progress-success",
            cancelado: "order-progress-danger"
        };

        return classes[status] || "order-progress-warning";
    }

    //Mapeo Estatus Pedidos
    function getOrderStage(status) {

        const stages = {
            pendiente: "Preparando",
            en_proceso: "En ruta",
            entregado: "Entregado",
            pagado: "Finalizado",
            cancelado: "Cancelado"
        };

        return stages[status] || "Pendiente";

    }

    // Función Estatus de Pedidos

    function getOrderStatusLabel(status) {
        const labels = {
            pendiente: "Pendiente",
            en_proceso: "En proceso",
            entregado: "Entregado",
            pagado: "Pagado",
            cancelado: "Cancelado"
        };

        return labels[status] || status || "—";
    }

    function getOrderStatusClass(status) {
        const classes = {
            pendiente: "badge-warning",
            en_proceso: "badge-warning",
            entregado: "badge-success",
            pagado: "badge-success",
            cancelado: "badge-danger"
        };

        return classes[status] || "badge-warning";
    }

    //Funcion Forma Agregar Pedidos

    function renderOrderForm(profile,
        activeBusiness) {
        const app = document.querySelector("#app");

        app.innerHTML = `
        <section class="has-bottom-nav min-h-screen bg-slate-100 bg-transparent px-4 py-6">
        <div class="max-w-2xl mx-auto space-y-4">

        <form id="order-form" class="aqua-card p-5 space-y-4">

        <div>
        <button type="button" id="back-orders" class="text-sm text-sky-600 dark:text-sky-400 font-semibold mb-4">
        ← Volver a pedidos
        </button>

        <h1 class="text-2xl font-bold">Nuevo pedido</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
        Registra venta con uno o varios productos.
        </p>
        </div>

        <label class="block">
        <span class="form-label">Cliente</span>
        <select
        id="order-client-select"
        required
        class="form-control"
        >
        <option value="">Cargando clientes...</option>
        </select>
        </label>

        <div class="grid grid-cols-1 gap-3">
        <div class="order-total-box">
        <p>WhatsApp cliente</p>
        <p id="order-client-whatsapp-view">—</p>
        </div>

        <div class="order-total-box">
        <p>Domicilio</p>
        <p id="order-client-address-view">—</p>
        </div>
        </div>

        <label class="block">
        <span class="form-label">Fecha y hora del pedido</span>
        <input
        id="order-created-at"
        type="datetime-local"
        class="form-control"
        />
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-2">
        Si lo dejas vacío, se usará la fecha y hora actual.
        </p>
        </label>

        <div class="rounded-3xl bg-sky-100 border border-sky-200 p-5">

        <p class="text-sm font-medium text-sky-700">
        Vendedor automático
        </p>

        <h3 class="text-2xl font-bold text-slate-900 mt-1">
        ${profile?.full_name || "Sin vendedor"}
        </h3>

        <p class="text-xs text-slate-500 mt-2">
        Se asigna automáticamente al administrador logeado.
        </p>

        </div>

        <label class="block">
        <span class="form-label">Status</span>
        <select id="order-status" class="form-control">
        <option value="pendiente">Pendiente</option>
        <option value="en_proceso">En proceso</option>
        <option value="entregado">Entregado</option>
        <option value="pagado">Pagado</option>
        </select>
        </label>

        <section class="space-y-3">
        <div class="flex items-center justify-between gap-3">
        <div>
        <h2 class="text-lg font-bold">Productos del pedido</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400">
        Agrega uno o más productos.
        </p>
        </div>
        </div>

        <div id="order-items-container" class="space-y-3"></div>

        <button
        id="btn-add-order-item"
        type="button"
        class="
        w-full
        rounded-3xl
        border-2 border-dashed border-sky-400
        bg-sky-50
        blue:bg-slate-900
        dark:border-sky-500
        p-5
        flex
        items-center
        justify-center
        gap-3
        transition
        active:scale-[0.98]
        hover:bg-sky-100
        blue:hover:bg-slate-800
        "
        >

        <span class="
        w-10 h-10
        rounded-2xl
        bg-sky-500
        text-white
        flex items-center justify-center
        text-2xl font-bold
        shadow-lg
        ">
        +
        </span>

        <div class="text-left">
        <p class="text-lg font-bold text-slate-900 dark:text-white">
        Agregar producto
        </p>

        <p class="text-sm text-slate-500 dark:text-slate-400">
        Añade uno o más productos al pedido
        </p>
        </div>

        </button>
        </section>

        <section class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="order-total-box">
        <p>Venta total</p>
        <p id="order-total-sale">$0.00</p>
        </div>

        <div class="order-total-box">
        <p>Costo total</p>
        <p id="order-total-cost">$0.00</p>
        </div>

        <div class="order-total-box">
        <p>Ganancia</p>
        <p id="order-total-profit">$0.00</p>
        </div>
        </section>

        <button
        id="btn-save-order"
        type="submit"
        class="w-full bg-sky-600 hover:bg-sky-500 text-white rounded-2xl py-3 font-semibold"
        >
        Guardar pedido
        </button>

        </form>

        ${renderBottomNav("orders")}

        </div>
        </section>
        `;

        bindBottomNav(profile,
            activeBusiness);

        loadClientsForOrder(activeBusiness?.businesses?.id);

        document.querySelector("#back-orders")?.addEventListener("click",
            () => {
                renderOrdersView(profile, activeBusiness);
            });

        let orderItems = [];

        document.querySelector("#btn-add-order-item")?.addEventListener("click",
            async () => {
                await addOrderItemRow(activeBusiness?.businesses?.id, orderItems);
            });

        document.querySelector("#order-form")?.addEventListener("submit",
            async (event) => {
                event.preventDefault();

                await saveOrder(profile, activeBusiness);
            });
    }

    //Función Editar Pedido Modal
    async function renderEditOrderForm(orderId, profile, activeBusiness) {
        const app = document.querySelector("#app");
        const businessId = activeBusiness?.businesses?.id;

        if (!orderId || !businessId) {
            showToast("No se encontró el pedido.", "error");
            return;
        }

        const {
            data: order,
            error
        } = await supabaseClient
        .from("orders")
        .select(`
            id,
            client_id,
            status,
            created_at,
            order_number,
            total_sale,
            total_cost,
            total_profit,
            clients (
            name,
            whatsapp,
            address
            ),
            order_items (
            id,
            product_id,
            product_name,
            quantity,
            sale_price,
            cost_price
            )
            `)
        .eq("id", orderId)
        .maybeSingle();

        if (error || !order) {
            console.error(error);
            showToast("No se pudo cargar el pedido.", "error");
            return;
        }

        const originalOrderItems = order.order_items || [];

        app.innerHTML = `
        <section class="has-bottom-nav min-h-screen bg-slate-100 bg-transparent px-4 py-6">
        <div class="max-w-2xl mx-auto space-y-4">

        <form id="edit-order-form" class="aqua-card p-5 space-y-4">

        <div>
        <button type="button" id="back-orders" class="text-sm text-sky-600 dark:text-sky-400 font-semibold mb-4">
        ← Volver a pedidos
        </button>

        <p class="text-sm text-slate-500 dark:text-slate-400">
        Editar pedido
        </p>

        <h1 class="text-2xl font-black">
        Pedido #${String(order.order_number || 0).padStart(4, "0")}
        </h1>

        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
        Actualiza cliente, fecha o estatus del pedido.
        </p>
        </div>

        <label class="block">
        <span class="form-label">Cliente</span>
        <select
        id="edit-order-client-select"
        required
        class="form-control"
        >
        <option value="">Cargando clientes...</option>
        </select>
        </label>

        <div class="grid grid-cols-1 gap-3">
        <div class="order-total-box">
        <p>WhatsApp cliente</p>
        <p id="edit-order-client-whatsapp-view">${order.clients?.whatsapp || "—"}</p>
        </div>

        <div class="order-total-box">
        <p>Domicilio</p>
        <p id="edit-order-client-address-view">${order.clients?.address || "—"}</p>
        </div>
        </div>

        <label class="block">
        <span class="form-label">Fecha y hora del pedido</span>
        <input
        id="edit-order-created-at"
        type="datetime-local"
        value="${toDateTimeLocalValue(order.created_at)}"
        class="form-control"
        />
        </label>

        <label class="block">
        <span class="form-label">Status</span>
        <select id="edit-order-status" class="form-control">
        <option value="pendiente" ${order.status === "pendiente" ? "selected": ""}>Pendiente</option>
        <option value="en_proceso" ${order.status === "en_proceso" ? "selected": ""}>En proceso</option>
        <option value="entregado" ${order.status === "entregado" ? "selected": ""}>Entregado</option>
        <option value="pagado" ${order.status === "pagado" ? "selected": ""}>Pagado</option>
        <option value="cancelado" ${order.status === "cancelado" ? "selected": ""}>Cancelado</option>
        </select>
        </label>

        <section class="edit-order-products-section">

        <div class="flex items-center justify-between gap-3">
        <div>
        <p class="text-sm text-slate-500 dark:text-slate-400">
        Productos
        </p>

        <h2 class="text-xl font-black">
        Productos del pedido
        </h2>
        </div>
        </div>

        <div id="edit-order-items-container" class="space-y-3 mt-4"></div>

        <button
        id="btn-edit-add-product"
        type="button"
        class="w-full rounded-3xl border-2 border-dashed border-sky-400 bg-sky-50 dark:bg-slate-900 dark:border-sky-500 p-5 flex items-center justify-center gap-3 active:scale-[0.98]"
        >
        <span class="w-10 h-10 rounded-2xl bg-sky-500 text-white flex items-center justify-center text-2xl font-bold">
        +
        </span>

        <div class="text-left">
        <p class="text-lg font-bold text-slate-900 dark:text-white">
        Agregar producto
        </p>
        <p class="text-sm text-slate-500 dark:text-slate-400">
        Añade otro producto al pedido
        </p>
        </div>
        </button>

        </section>

        <section class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="order-total-box">
        <p>Venta total</p>
        <p id="edit-order-total-sale">${formatCurrency(order.total_sale || 0)}</p>
        </div>

        <div class="order-total-box">
        <p>Costo total</p>
        <p id="edit-order-total-cost">${formatCurrency(order.total_cost || 0)}</p>
        </div>

        <div class="order-total-box">
        <p>Ganancia</p>
        <p id="edit-order-total-profit">${formatCurrency(order.total_profit || 0)}</p>
        </div>
        </section>

        <button
        id="btn-update-order"
        type="submit"
        class="w-full bg-sky-600 hover:bg-sky-500 text-white rounded-2xl py-3 font-semibold"
        >
        Guardar cambios
        </button>

        </form>

        ${renderBottomNav("orders")}

        </div>
        </section>
        `;

        bindBottomNav(profile, activeBusiness);

        document.querySelector("#back-orders")?.addEventListener("click", () => {
            renderOrdersView(profile, activeBusiness);
        });

        await loadClientsForEditOrder(
            businessId,
            order.client_id,
            order.clients
        );

        await renderEditOrderItems(
            businessId,
            order.order_items || []
        );

        document.querySelector("#btn-edit-add-product")?.addEventListener("click", async () => {
            await addEditOrderItemRow(businessId);
        });

        document.querySelector("#edit-order-form")?.addEventListener("submit", async (event) => {
            event.preventDefault();

            const button = document.querySelector("#btn-update-order");

            try {
                setButtonLoading(button, true, "Guardando...");

                const totals = recalculateEditOrderTotals();

                const payload = {
                    client_id: document.querySelector("#edit-order-client-select").value,
                    status: document.querySelector("#edit-order-status").value,
                    created_at: document.querySelector("#edit-order-created-at").value
                    ? new Date(document.querySelector("#edit-order-created-at").value).toISOString(): order.created_at,
                    total_sale: totals.totalSale,
                    total_cost: totals.totalCost,
                    total_profit: totals.totalProfit
                };

                const {
                    error: updateError
                } = await supabaseClient
                .from("orders")
                .update(payload)
                .eq("id", orderId);

                if (updateError) throw updateError;

                const newItems = [...document.querySelectorAll(".edit-order-item-row")].map(row => {
                    const select = row.querySelector(".edit-order-product-select");
                    const quantity = Number(row.querySelector(".edit-order-quantity").value) || 1;
                    const selectedOption = select.options[select.selectedIndex];

                    const salePrice = Number(selectedOption?.dataset?.sale) || 0;
                    const costPrice = Number(selectedOption?.dataset?.cost) || 0;

                    return {
                        order_id: orderId,
                        product_id: select.value,
                        product_name: selectedOption?.dataset?.name || "Producto",
                        quantity,
                        sale_price: salePrice,
                        cost_price: costPrice
                    };
                }).filter(item => item.product_id);

                await updateInventoryAfterEditOrder(
                    businessId,
                    orderId,
                    originalOrderItems,
                    newItems,
                    profile
                );

                const {
                    error: deleteItemsError
                } = await supabaseClient
                .from("order_items")
                .delete()
                .eq("order_id", orderId);

                if (deleteItemsError) throw deleteItemsError;

                if (newItems.length > 0) {
                    const {
                        error: insertItemsError
                    } = await supabaseClient
                    .from("order_items")
                    .insert(newItems);

                    if (insertItemsError) throw insertItemsError;
                }

                showToast("Pedido actualizado correctamente.", "success");
                renderOrdersView(profile, activeBusiness);

            } catch (error) {
                console.error(error);
                showToast(error.message || "No se pudo actualizar el pedido.", "error");
            } finally {
                setButtonLoading(button, false);
            }
        });
    }

    // Actualizar Inventario Después de Editar Pedido Modal
    async function updateInventoryAfterEditOrder(
        businessId,
        orderId,
        originalItems,
        newItems,
        profile = null
    ) {
        if (!businessId) {
            throw new Error("No se encontró negocio activo.");
        }

        const productIds = [
            ...new Set([
                ...originalItems.map(item => item.product_id).filter(Boolean),
                ...newItems.map(item => item.product_id).filter(Boolean)
            ])
        ];

        if (productIds.length === 0) return;

        const {
            data: products,
            error
        } = await supabaseClient
        .from("products")
        .select("id, name, stock")
        .eq("business_id", businessId)
        .in("id", productIds);

        if (error) throw error;

        const productsMap = new Map(
            (products || []).map(product => [
                product.id,
                {
                    ...product,
                    stock: Number(product.stock || 0)
                }])
        );

        const originalMap = new Map();

        originalItems.forEach(item => {
            if (!item.product_id) return;

            originalMap.set(
                item.product_id,
                (originalMap.get(item.product_id) || 0) + Number(item.quantity || 0)
            );
        });

        const newMap = new Map();

        newItems.forEach(item => {
            if (!item.product_id) return;

            newMap.set(
                item.product_id,
                (newMap.get(item.product_id) || 0) + Number(item.quantity || 0)
            );
        });

        const updates = [];

        for (const productId of productIds) {
            const product = productsMap.get(productId);

            if (!product) continue;

            const originalQty = originalMap.get(productId) || 0;
            const newQty = newMap.get(productId) || 0;

            const difference = newQty - originalQty;

            if (difference === 0) continue;

            const newStock = product.stock - difference;

            if (newStock < 0) {
                throw new Error(
                    `Stock insuficiente para "${product.name}". Disponible: ${product.stock}, solicitado extra: ${difference}.`
                );
            }

            updates.push({
                id: productId,
                difference,
                stockBefore: product.stock,
                stockAfter: newStock
            });
        }

        for (const item of updates) {
            const {
                error: updateError
            } = await supabaseClient
            .from("products")
            .update({
                stock: item.stockAfter
            })
            .eq("id", item.id)
            .eq("business_id", businessId);

            if (updateError) throw updateError;

            await registerInventoryMovement( {
                businessId,
                userId: profile?.id,
                productId: item.id,
                movementType: item.difference > 0 ? "salida": "entrada",
                quantity: Math.abs(item.difference),
                stockBefore: item.stockBefore,
                stockAfter: item.stockAfter,
                referenceType: "order",
                referenceId: orderId,
                notes: item.difference > 0
                ? "Salida por aumento en edición de pedido": "Devolución por disminución en edición de pedido"
            });
        }
    }

    // Vista Editar Productos Modal Pedidos
    async function renderEditOrderItems(businessId,
        items = []) {
        const container = document.querySelector("#edit-order-items-container");

        if (!container) return;

        container.innerHTML = "";

        if (!items.length) {
            container.innerHTML = `
            <div class="rounded-3xl bg-slate-100 dark:bg-slate-900 p-5 text-center">
            <p class="text-sm text-slate-500 dark:text-slate-400">
            Este pedido no tiene productos.
            </p>
            </div>
            `;
            return;
        }

        for (const item of items) {
            await addEditOrderItemRow(businessId, item);
        }

        recalculateEditOrderTotals();
    }

    // Agregar Producto Vista Editar Pedido Modal Pedidos
    async function addEditOrderItemRow(businessId, existingItem = null) {
        const container = document.querySelector("#edit-order-items-container");

        if (!container || !businessId) return;

        const {
            data: products,
            error
        } = await supabaseClient
        .from("products")
        .select("id, brand, name, presentation, cost_price, sale_price, stock")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .order("name", {
            ascending: true
        });

        if (error) {
            console.error(error);
            showToast("No se pudieron cargar productos.", "error");
            return;
        }

        const rowId = existingItem?.id || crypto.randomUUID();

        const html = `
        <article
        class="edit-order-item-row aqua-card p-4 space-y-3"
        data-row-id="${rowId}"
        data-existing-id="${existingItem?.id || ""}"
        >

        <div class="flex items-center justify-between gap-3">
        <h3 class="font-bold">Producto</h3>

        <button
        type="button"
        class="btn-remove-edit-order-item text-red-500 font-bold"
        >
        Eliminar
        </button>
        </div>

        <label class="block">
        <span class="form-label">Producto</span>

        <select class="form-control edit-order-product-select">
        <option value="">Seleccionar producto</option>

        ${(products || []).map(product => `
            <option
            value="${product.id}"
            data-name="${product.name}"
            data-cost="${product.cost_price}"
            data-sale="${product.sale_price}"
            data-stock="${product.stock}"
            ${existingItem?.product_id === product.id ? "selected": ""}
            >
            ${product.brand ? product.brand + " · ": ""}${product.name} · ${product.presentation || ""}
            </option>
            `).join("")}

        </select>
        </label>

        <label class="block">
        <span class="form-label">Cantidad</span>
        <input
        type="number"
        min="1"
        step="1"
        value="${existingItem?.quantity || 1}"
        class="form-control edit-order-quantity"
        />
        </label>

        <div class="grid grid-cols-3 gap-3">
        <div class="order-total-box">
        <p>Venta</p>
        <p class="edit-item-sale">$0.00</p>
        </div>

        <div class="order-total-box">
        <p>Costo</p>
        <p class="edit-item-cost">$0.00</p>
        </div>

        <div class="order-total-box">
        <p>Ganancia</p>
        <p class="edit-item-profit">$0.00</p>
        </div>
        </div>

        </article>
        `;

        container.insertAdjacentHTML("beforeend", html);

        bindEditOrderItemEvents();
        recalculateEditOrderTotals();
    }

    // Helper Editar Modal Pedidos
    function bindEditOrderItemEvents() {
        document.querySelectorAll(".edit-order-product-select, .edit-order-quantity").forEach(input => {
            input.onchange = recalculateEditOrderTotals;
            input.oninput = recalculateEditOrderTotals;
        });

        document.querySelectorAll(".btn-remove-edit-order-item").forEach(button => {
            button.onclick = () => {
                button.closest(".edit-order-item-row")?.remove();
                recalculateEditOrderTotals();
            };
        });
    }

    // Recalcular Totales Editar Pedido Modal Pedidos
    function recalculateEditOrderTotals() {
        let totalSale = 0;
        let totalCost = 0;
        let totalProfit = 0;

        document.querySelectorAll(".edit-order-item-row").forEach(row => {
            const select = row.querySelector(".edit-order-product-select");
            const quantityInput = row.querySelector(".edit-order-quantity");

            const selectedOption = select.options[select.selectedIndex];

            const quantity = Number(quantityInput.value) || 0;
            const salePrice = Number(selectedOption?.dataset?.sale) || 0;
            const costPrice = Number(selectedOption?.dataset?.cost) || 0;

            const itemSale = quantity * salePrice;
            const itemCost = quantity * costPrice;
            const itemProfit = itemSale - itemCost;

            row.querySelector(".edit-item-sale").textContent = formatCurrency(itemSale);
            row.querySelector(".edit-item-cost").textContent = formatCurrency(itemCost);
            row.querySelector(".edit-item-profit").textContent = formatCurrency(itemProfit);

            totalSale += itemSale;
            totalCost += itemCost;
            totalProfit += itemProfit;
        });

        document.querySelector("#edit-order-total-sale").textContent = formatCurrency(totalSale);
        document.querySelector("#edit-order-total-cost").textContent = formatCurrency(totalCost);
        document.querySelector("#edit-order-total-profit").textContent = formatCurrency(totalProfit);

        return {
            totalSale,
            totalCost,
            totalProfit
        };
    }

    //Helper Fecha Local
    function toDateTimeLocalValue(dateString) {
        if (!dateString) return "";

        const date = new Date(dateString);
        const offset = date.getTimezoneOffset();

        const localDate = new Date(date.getTime() - offset * 60000);

        return localDate.toISOString().slice(0, 16);
    }

    // Función Cargar Clientes Editar Pedido
    async function loadClientsForEditOrder(businessId, selectedClientId, currentClient = null) {
        const select = document.querySelector("#edit-order-client-select");
        const whatsappView = document.querySelector("#edit-order-client-whatsapp-view");
        const addressView = document.querySelector("#edit-order-client-address-view");

        if (!select || !businessId) return;

        const {
            data,
            error
        } = await supabaseClient
        .from("clients")
        .select("id, name, whatsapp, address")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .order("name", {
            ascending: true
        });

        if (error) {
            console.error(error);
            select.innerHTML = `<option value="">Error al cargar clientes</option>`;
            return;
        }

        select.innerHTML = `
        <option value="">Seleccionar cliente</option>
        ${(data || []).map(client => `
            <option
            value="${client.id}"
            data-whatsapp="${client.whatsapp || ""}"
            data-address="${client.address || ""}"
            ${client.id === selectedClientId ? "selected": ""}
            >
            ${client.name}
            </option>
            `).join("")}
        `;

        const updateClientPreview = () => {
            const option = select.options[select.selectedIndex];

            whatsappView.textContent = option?.dataset?.whatsapp || "—";
            addressView.textContent = option?.dataset?.address || "—";
        };

        select.addEventListener("change", updateClientPreview);
        updateClientPreview();
    }

    // Función Agregar Productos Pedidos

    async function addOrderItemRow(businessId,
        orderItems) {
        const container = document.querySelector("#order-items-container");

        if (!businessId) {
            showToast("No se encontró negocio activo.", "error");
            return;
        }

        const {
            data: products,
            error
        } = await supabaseClient
        .from("products")
        .select("*")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .order("name", {
            ascending: true
        });

        if (error) {
            console.error(error);
            showToast("No se pudieron cargar productos.", "error");
            return;
        }

        if (!products || products.length === 0) {
            showToast("Primero agrega productos al inventario.", "warning");
            return;
        }

        const itemId = crypto.randomUUID();

        const itemHTML = `
        <article class="order-item-row aqua-card p-4 space-y-3" data-item-id="${itemId}">

        <div class="flex items-center justify-between gap-3">
        <h3 class="font-bold">Producto del pedido</h3>

        <button
        type="button"
        class="btn-remove-order-item text-red-500 font-bold"
        data-item-id="${itemId}"
        >
        Eliminar
        </button>
        </div>

        <label class="block">
        <span class="form-label">Producto</span>
        <select class="form-control order-product-select" data-item-id="${itemId}">
        <option value="">Seleccionar producto</option>
        ${products.map(product => `
            <option
            value="${product.id}"
            data-name="${product.name}"
            data-cost="${product.cost_price}"
            data-sale="${product.sale_price}"
            data-stock="${product.stock}"
            >
            ${product.brand ? product.brand + " · ": ""}${product.name} · ${product.presentation || ""}
            </option>
            `).join("")}
        </select>
        </label>

        <label class="block">
        <span class="form-label">Cantidad</span>
        <input
        type="number"
        min="1"
        step="1"
        value="1"
        class="form-control order-product-quantity"
        data-item-id="${itemId}"
        />
        </label>

        <div class="grid grid-cols-3 gap-3">
        <div class="order-total-box">
        <p>Venta</p>
        <p class="item-sale">$0.00</p>
        </div>

        <div class="order-total-box">
        <p>Costo</p>
        <p class="item-cost">$0.00</p>
        </div>

        <div class="order-total-box">
        <p>Ganancia</p>
        <p class="item-profit">$0.00</p>
        </div>
        </div>

        </article>
        `;

        container.insertAdjacentHTML("beforeend", itemHTML);

        bindOrderItemEvents(orderItems);
    }

    // Función Vista Agregar Productos Pedidos

    function bindOrderItemEvents(orderItems) {
        document.querySelectorAll(".order-product-select, .order-product-quantity").forEach(input => {
            input.onchange = () => recalculateOrderTotals(orderItems);
            input.oninput = () => recalculateOrderTotals(orderItems);
        });

        document.querySelectorAll(".btn-remove-order-item").forEach(button => {
            button.onclick = () => {
                const itemId = button.dataset.itemId;
                document.querySelector(`[data-item-id="${itemId}"]`)?.remove();
                recalculateOrderTotals(orderItems);
            };
        });
    }

    // Función Recalcular Total Productos Pedidos

    function recalculateOrderTotals(orderItems) {
        let totalSale = 0;
        let totalCost = 0;
        let totalProfit = 0;

        document.querySelectorAll(".order-item-row").forEach(row => {
            const select = row.querySelector(".order-product-select");
            const quantityInput = row.querySelector(".order-product-quantity");

            const selectedOption = select.options[select.selectedIndex];

            const quantity = Number(quantityInput.value) || 0;
            const salePrice = Number(selectedOption?.dataset?.sale) || 0;
            const costPrice = Number(selectedOption?.dataset?.cost) || 0;

            const itemSale = quantity * salePrice;
            const itemCost = quantity * costPrice;
            const itemProfit = itemSale - itemCost;

            row.querySelector(".item-sale").textContent = formatCurrency(itemSale);
            row.querySelector(".item-cost").textContent = formatCurrency(itemCost);
            row.querySelector(".item-profit").textContent = formatCurrency(itemProfit);

            totalSale += itemSale;
            totalCost += itemCost;
            totalProfit += itemProfit;
        });

        document.querySelector("#order-total-sale").textContent = formatCurrency(totalSale);
        document.querySelector("#order-total-cost").textContent = formatCurrency(totalCost);
        document.querySelector("#order-total-profit").textContent = formatCurrency(totalProfit);
    }

    // Función Vista Más

    function renderMoreView(profile, activeBusiness) {
        const app = document.querySelector("#app");

        app.innerHTML = `
        <section class="has-bottom-nav min-h-screen bg-transparent px-4 py-6">
        <div class="max-w-5xl mx-auto space-y-4">

        <header class="aqua-card p-5">
        <p class="text-sm text-slate-500 dark:text-slate-400">Menú</p>
        <h1 class="text-2xl font-bold">Más opciones</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
        Clientes, configuración y herramientas.
        </p>
        </header>

        <section class="space-y-3">

        <button
        id="btn-open-clients"
        class="aqua-card p-5 w-full text-left active:scale-[0.98]"
        >
        <p class="text-sm text-slate-500 dark:text-slate-400">Administración</p>
        <h2 class="text-xl font-bold mt-1">Clientes</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
        Agrega o edita clientes para usarlos en pedidos.
        </p>
        </button>

        <button
        class="aqua-card p-5 w-full text-left opacity-60"
        disabled
        >
        <p class="text-sm text-slate-500 dark:text-slate-400">Sistema</p>
        <h2 class="text-xl font-bold mt-1">Configuración</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
        Próximamente.
        </p>
        </button>

        </section>

        ${renderBottomNav("more")}

        </div>
        </section>
        `;

        bindBottomNav(profile, activeBusiness);

        document.querySelector("#btn-open-clients")?.addEventListener("click", () => {
            renderClientsView(profile, activeBusiness);
        });
    }

    // Función Vista Clientes

    async function renderClientsView(profile, activeBusiness) {
        const app = document.querySelector("#app");

        app.innerHTML = `
        <section class="has-bottom-nav min-h-screen bg-transparent px-4 py-6">
        <div class="max-w-5xl mx-auto space-y-4">

        <header class="aqua-card p-5 flex flex-col gap-4">
        <div>
        <button type="button" id="back-more" class="text-sm text-sky-600 dark:text-sky-400 font-semibold mb-4">
        ← Volver a Más
        </button>

        <p class="text-sm text-slate-500 dark:text-slate-400">Módulo</p>
        <h1 class="text-2xl font-bold">Clientes</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
        Guarda nombre, WhatsApp y domicilio del cliente.
        </p>
        </div>

        <button
        id="btn-new-client"
        class="w-full bg-sky-600 hover:bg-sky-500 text-white rounded-2xl py-3 font-semibold"
        >
        + Agregar cliente
        </button>
        </header>

        <section id="clients-list" class="space-y-3">
        <div class="aqua-card p-5">
        <p class="text-sm text-slate-500 dark:text-slate-400">Cargando clientes...</p>
        </div>
        </section>

        ${renderBottomNav("more")}

        </div>
        </section>
        `;

        bindBottomNav(profile, activeBusiness);

        document.querySelector("#back-more")?.addEventListener("click", () => {
            renderMoreView(profile, activeBusiness);
        });

        document.querySelector("#btn-new-client")?.addEventListener("click", () => {
            renderClientForm(profile, activeBusiness);
        });

        await loadClients(
            profile,
            activeBusiness,
            activeBusiness.businesses.id
        );
    }

    // Cargar Clientes

    async function loadClients(profile, activeBusiness, businessId) {
        const container = document.querySelector("#clients-list");

        if (!businessId) {
            container.innerHTML = `
            <div class="aqua-card p-5">
            <p class="text-sm text-red-500 font-semibold">
            No se encontró negocio activo.
            </p>
            </div>
            `;
            return;
        }

        const {
            data,
            error
        } = await supabaseClient
        .from("clients")
        .select("*")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .order("name", {
            ascending: true
        });

        if (error) {
            console.error(error);
            container.innerHTML = `
            <div class="aqua-card p-5">
            <p class="text-sm text-red-500 font-semibold">
            Error al cargar clientes.
            </p>
            </div>
            `;
            return;
        }

        if (!data || data.length === 0) {
            container.innerHTML = `
            <div class="aqua-card p-5 text-center">
            <h2 class="text-lg font-bold">Sin clientes</h2>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Agrega tu primer cliente para usarlo en pedidos.
            </p>
            </div>
            `;
            return;
        }

        container.innerHTML = data.map(client => `
            <article class="aqua-card p-5">
            <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
            <p class="text-xs uppercase tracking-wide text-sky-600 dark:text-sky-400 font-bold">
            Cliente
            </p>

            <h2 class="text-xl font-bold mt-1">
            ${client.name}
            </h2>

            <p class="text-sm text-slate-500 dark:text-slate-400 mt-2">
            WhatsApp: ${client.whatsapp || "—"}
            </p>

            <p class="text-sm text-slate-500 dark:text-slate-400">
            Domicilio: ${client.address || "—"}
            </p>
            </div>

            <button
            type="button"
            class="btn-edit-client icon-action-button"
            data-client-id="${client.id}"
            data-client-name="${client.name || ""}"
            data-client-whatsapp="${client.whatsapp || ""}"
            data-client-address="${client.address || ""}"
            >
            <img src="./assets/icons/edit-client.svg" alt="Editar">
            </button>
            </div>
            </article>
            `).join("");

        document.querySelectorAll(".btn-edit-client").forEach(button => {
            button.addEventListener("click", () => {
                renderClientForm(profile, activeBusiness, {
                    id: button.dataset.clientId,
                    name: button.dataset.clientName,
                    whatsapp: button.dataset.clientWhatsapp,
                    address: button.dataset.clientAddress
                });
            });
        });
    }

    // Formulario Nuevo Cliente

    function renderClientForm(profile, activeBusiness, clientToEdit = null) {
        const app = document.querySelector("#app");
        const businessId = activeBusiness?.businesses?.id;

        app.innerHTML = `
        <section class="has-bottom-nav min-h-screen bg-transparent px-4 py-6">
        <div class="max-w-2xl mx-auto space-y-4">

        <form id="client-form" class="aqua-card p-5 space-y-4">

        <div>
        <button type="button" id="back-clients" class="text-sm text-sky-600 dark:text-sky-400 font-semibold mb-4">
        ← Volver a clientes
        </button>

        <h1 class="text-2xl font-bold">
        ${clientToEdit ? "Editar cliente": "Agregar cliente"}
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
        Guarda los datos del cliente para usarlos en pedidos.
        </p>
        </div>

        <label class="block">
        <span class="form-label">Nombre completo</span>
        <input
        id="client-name"
        type="text"
        required
        placeholder="Nombre del cliente"
        class="form-control"
        />
        </label>

        <label class="block">
        <span class="form-label">WhatsApp</span>
        <input
        id="client-whatsapp"
        type="tel"
        placeholder="8710000000"
        class="form-control"
        />
        </label>

        <label class="block">
        <span class="form-label">Domicilio</span>
        <input
        id="client-address"
        type="text"
        placeholder="Domicilio del cliente"
        class="form-control"
        />
        </label>

        <button
        id="btn-save-client"
        type="submit"
        class="w-full bg-sky-600 hover:bg-sky-500 text-white rounded-2xl py-3 font-semibold"
        >
        ${clientToEdit ? "Actualizar cliente": "Guardar cliente"}
        </button>

        </form>

        ${renderBottomNav("more")}

        </div>
        </section>
        `;

        if (clientToEdit) {
            document.querySelector("#client-name").value = clientToEdit.name || "";
            document.querySelector("#client-whatsapp").value = clientToEdit.whatsapp || "";
            document.querySelector("#client-address").value = clientToEdit.address || "";
        }

        bindBottomNav(profile, activeBusiness);

        document.querySelector("#back-clients")?.addEventListener("click", () => {
            renderClientsView(profile, activeBusiness);
        });

        document.querySelector("#client-form")?.addEventListener("submit", async (event) => {
            event.preventDefault();

            const button = document.querySelector("#btn-save-client");

            const payload = {
                business_id: businessId,
                name: document.querySelector("#client-name").value.trim(),
                whatsapp: document.querySelector("#client-whatsapp").value.trim(),
                address: document.querySelector("#client-address").value.trim(),
                is_active: true
            };

            if (!payload.business_id) {
                showToast("No se encontró negocio activo.", "error");
                return;
            }

            if (!payload.name) {
                showToast("Escribe el nombre del cliente.", "warning");
                return;
            }

            try {
                setButtonLoading(button, true, "Guardando...");

                const query = clientToEdit
                ? supabaseClient
                .from("clients")
                .update(payload)
                .eq("id", clientToEdit.id): supabaseClient
                .from("clients")
                .insert(payload);

                const {
                    error
                } = await query;

                if (error) throw error;

                showToast(
                    clientToEdit ? "Cliente actualizado correctamente.": "Cliente agregado correctamente.",
                    "success"
                );
                renderClientsView(profile, activeBusiness);

            } catch (error) {
                console.error(error);
                showToast(error.message || "No se pudo guardar el cliente.", "error");
            } finally {
                setButtonLoading(button, false);
            }
        });
    }

    // Cargar Clientes para Pedidos

    async function loadClientsForOrder(businessId) {
        const select = document.querySelector("#order-client-select");

        if (!select) return;

        if (!businessId) {
            select.innerHTML = `<option value="">No se encontró negocio activo</option>`;
            return;
        }

        const {
            data,
            error
        } = await supabaseClient
        .from("clients")
        .select("id, name, whatsapp, address")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .order("name", {
            ascending: true
        });

        if (error) {
            console.error(error);
            select.innerHTML = `<option value="">Error al cargar clientes</option>`;
            return;
        }

        if (!data || data.length === 0) {
            select.innerHTML = `<option value="">Sin clientes registrados</option>`;
            return;
        }

        select.innerHTML = `
        <option value="">Selecciona un cliente</option>
        ${data.map(client => `
            <option
            value="${client.id}"
            data-whatsapp="${client.whatsapp || ""}"
            data-address="${client.address || ""}"
            >
            ${client.name}
            </option>
            `).join("")}
        `;

        select.addEventListener("change", () => {
            const option = select.options[select.selectedIndex];

            document.querySelector("#order-client-whatsapp-view").textContent =
            option?.dataset?.whatsapp || "—";

            document.querySelector("#order-client-address-view").textContent =
            option?.dataset?.address || "—";
        });
    }

    // Función Guardar Pedidos

    async function saveOrder(profile, activeBusiness) {
        const button = document.querySelector("#btn-save-order");
        const businessId = activeBusiness?.businesses?.id;

        const clientId = document.querySelector("#order-client-select")?.value;
        const status = document.querySelector("#order-status")?.value || "pendiente";

        const createdAtInput = document.querySelector("#order-created-at")?.value;

        if (!businessId) {
            showToast("No se encontró negocio activo.", "error");
            return;
        }

        if (!clientId) {
            showToast("Selecciona un cliente.", "warning");
            return;
        }

        const rows = [...document.querySelectorAll(".order-item-row")];

        if (rows.length === 0) {
            showToast("Agrega al menos un producto.", "warning");
            return;
        }

        const items = [];

        for (const row of rows) {
            const select = row.querySelector(".order-product-select");
            const quantityInput = row.querySelector(".order-product-quantity");
            const option = select.options[select.selectedIndex];

            const productId = select.value;
            const quantity = Number(quantityInput.value) || 0;
            const availableStock = Number(option.dataset.stock) || 0;

            if (quantity > availableStock) {
                showToast(`Stock insuficiente. Disponible: ${availableStock}`, "warning");
                return;
            }

            if (!productId || quantity <= 0) {
                showToast("Revisa productos y cantidades.", "warning");
                return;
            }

            items.push({
                product_id: productId,
                product_name: option.dataset.name,
                quantity,
                sale_price: Number(option.dataset.sale) || 0,
                cost_price: Number(option.dataset.cost) || 0,
                stock: availableStock
            });
        }

        try {
            setButtonLoading(button, true, "Guardando pedido...");

            const {
                data: order,
                error: orderError
            } = await supabaseClient
            .from("orders")
            .insert({
                business_id: businessId,
                client_id: clientId,
                seller_id: profile.id,
                status,
                created_at: createdAtInput
                ? new Date(createdAtInput).toISOString(): new Date().toISOString()
            })
            .select()
            .single();

            if (orderError) throw orderError;

            const orderItemsPayload = items.map(item => ({
                order_id: order.id,
                product_id: item.product_id,
                product_name: item.product_name,
                quantity: item.quantity,
                sale_price: item.sale_price,
                cost_price: item.cost_price
            }));

            const {
                error: itemsError
            } = await supabaseClient
            .from("order_items")
            .insert(orderItemsPayload);

            if (itemsError) throw itemsError;

            for (const item of items) {

                const currentStock =
                Number(item.stock || 0);

                const newStock =
                currentStock - item.quantity;

                /* Actualizar stock */

                const {
                    error: stockError
                } =
                await supabaseClient
                .from("products")
                .update({
                    stock: newStock
                })
                .eq(
                    "id",
                    item.product_id
                );

                if (stockError)
                    throw stockError;


                /* Registrar historial */

                await registerInventoryMovement( {

                    businessId,

                    userId:
                    profile.id,

                    productId:
                    item.product_id,

                    movementType:
                    "salida",

                    quantity:
                    item.quantity,

                    stockBefore:
                    currentStock,

                    stockAfter:
                    newStock,

                    referenceType:
                    "order",

                    referenceId:
                    order.id,

                    notes:
                    `Salida automática por creación pedido #${order.order_number || order.id}`

                });

            }


            showToast("Pedido guardado correctamente.", "success");
            renderOrdersView(profile, activeBusiness);

        } catch (error) {
            console.error(error);
            showToast(error.message || "No se pudo guardar el pedido.", "error");
        } finally {
            setButtonLoading(button, false);
        }
    }

    // Vista Sección Gastos

    async function renderExpensesView(profile, activeBusiness) {
        const app = document.querySelector("#app");

        app.innerHTML = `
        <section class="has-bottom-nav min-h-screen bg-transparent px-4 py-6">
        <div class="max-w-5xl mx-auto space-y-4">

        <header class="aqua-card p-5 flex flex-col gap-4">
        <div>
        <p class="text-sm text-slate-500 dark:text-slate-400">Módulo</p>
        <h1 class="text-2xl font-bold">Gastos</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
        Registra gastos generales del negocio.
        </p>
        </div>

        <button
        id="btn-new-expense"
        class="w-full bg-sky-600 hover:bg-sky-500 text-white rounded-2xl py-3 font-semibold"
        >
        + Nuevo gasto
        </button>
        <button
        id="btn-download-expenses-pdf"
        class="w-full bg-white/80 dark:bg-slate-900 border border-sky-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl py-3 font-semibold flex items-center justify-center gap-2"
        >
        <img src="./assets/icons/download-file.svg" class="w-6 h-6" alt="Descargar">
        PDF Gastos
        </button>
        </header>

        <section class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="aqua-card p-5">
        <p class="text-sm text-slate-500 dark:text-slate-400">Gastos hoy</p>
        <h2 id="expenses-today-count" class="text-2xl font-bold mt-1">0</h2>
        </div>

        <div class="aqua-card p-5">
        <p class="text-sm text-slate-500 dark:text-slate-400">Total gastos</p>
        <h2 id="expenses-total-amount" class="text-2xl font-bold mt-1">$0.00</h2>
        </div>

        <div class="aqua-card p-5">
        <p class="text-sm text-slate-500 dark:text-slate-400">Este mes</p>
        <h2 id="expenses-month-amount" class="text-2xl font-bold mt-1">$0.00</h2>
        </div>
        </section>

        <section class="aqua-card p-5">
        <h2 class="text-lg font-bold mb-2">Tabla de gastos</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Aquí aparecerán los gastos registrados.
        </p>

        <div class="aqua-table-wrapper">
        <table class="aqua-table">
        <thead>
        <tr>
        <th># Gasto</th>
        <th>Fecha</th>
        <th>Admin/Vendedor</th>
        <th>Categoría</th>
        <th>Conceptos</th>
        <th>Total</th>
        <th>Notas</th>
        </tr>
        </thead>

        <tbody id="expenses-table-body">
        <tr>
        <td colspan="7" class="text-center text-slate-500">
        Sin gastos registrados.
        </td>
        </tr>
        </tbody>
        </table>
        </div>
        </section>

        ${renderBottomNav("expenses")}

        </div>
        </section>
        `;

        bindBottomNav(profile, activeBusiness);

        document.querySelector("#btn-new-expense")?.addEventListener("click", () => {
            renderExpenseForm(profile, activeBusiness);
        });

        document.querySelector("#btn-download-expenses-pdf")?.addEventListener("click", async () => {
            await downloadExpensesPDF(profile, activeBusiness);
        });

        await loadExpenses(activeBusiness?.businesses?.id);
    }

    // Cargar Gastos

    async function loadExpenses(businessId) {
        const tbody = document.querySelector("#expenses-table-body");

        if (!businessId) {
            tbody.innerHTML = `
            <tr>
            <td colspan="7" class="text-center text-red-500 font-semibold">
            No se encontró negocio activo.
            </td>
            </tr>
            `;
            return;
        }

        const {
            data,
            error
        } = await supabaseClient
        .from("expenses")
        .select(`
            id,
            expense_number,
            category,
            total_amount,
            notes,
            created_at,
            profiles (
            full_name
            ),
            expense_items (
            concept,
            quantity
            )
            `)
        .eq("business_id", businessId)
        .order("created_at", {
            ascending: false
        });

        if (error) {
            console.error(error);
            tbody.innerHTML = `
            <tr>
            <td colspan="7" class="text-center text-red-500 font-semibold">
            Error al cargar gastos.
            </td>
            </tr>
            `;
            return;
        }

        if (!data || data.length === 0) {
            document.querySelector("#expenses-today-count").textContent = "0";
            document.querySelector("#expenses-total-amount").textContent = formatCurrency(0);
            document.querySelector("#expenses-month-amount").textContent = formatCurrency(0);

            tbody.innerHTML = `
            <tr>
            <td colspan="7" class="text-center text-slate-500">
            Sin gastos registrados.
            </td>
            </tr>
            `;
            return;
        }

        const today = new Date().toISOString().slice(0, 10);
        const currentMonth = new Date().toISOString().slice(0, 7);

        const expensesToday = data.filter(expense => {
            return expense.created_at?.slice(0, 10) === today;
        });

        const totalAmount = data.reduce((sum, expense) => {
            return sum + Number(expense.total_amount || 0);
        }, 0);

        const monthAmount = data
        .filter(expense => expense.created_at?.slice(0, 7) === currentMonth)
        .reduce((sum, expense) => {
            return sum + Number(expense.total_amount || 0);
        }, 0);

        document.querySelector("#expenses-today-count").textContent = expensesToday.length;
        document.querySelector("#expenses-total-amount").textContent = formatCurrency(totalAmount);
        document.querySelector("#expenses-month-amount").textContent = formatCurrency(monthAmount);

        tbody.innerHTML = data.map(expense => {
            const conceptsText = expense.expense_items?.length
            ? expense.expense_items
            .map(item => `${item.concept} x${item.quantity}`)
            .join(", "): "—";

            return `
            <tr>
            <td>#${String(expense.expense_number).padStart(4, "0")}</td>
            <td>${formatDate(expense.created_at)}</td>
            <td>${expense.profiles?.full_name || "—"}</td>
            <td>${expense.category || "—"}</td>
            <td>${conceptsText}</td>
            <td>${formatCurrency(expense.total_amount)}</td>
            <td>${expense.notes || "—"}</td>
            </tr>
            `;
        }).join("");
    }

    // Vista Agregar Nuevo Gasto

    function renderExpenseForm(profile, activeBusiness) {
        const app = document.querySelector("#app");

        app.innerHTML = `
        <section class="has-bottom-nav min-h-screen bg-transparent px-4 py-6">
        <div class="max-w-2xl mx-auto space-y-4">

        <form id="expense-form" class="aqua-card p-5 space-y-4">

        <div>
        <button type="button" id="back-expenses" class="text-sm text-sky-600 dark:text-sky-400 font-semibold mb-4">
        ← Volver a gastos
        </button>

        <h1 class="text-2xl font-bold">Nuevo gasto</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
        Registra gastos generales con uno o varios conceptos.
        </p>
        </div>

        <label class="block">
        <span class="form-label">Fecha y hora del gasto</span>
        <input
        id="expense-created-at"
        type="datetime-local"
        class="form-control"
        />
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-2">
        Si lo dejas vacío, se usará la fecha y hora actual.
        </p>
        </label>

        <div class="rounded-3xl bg-sky-100 blue:bg-slate-900 border border-sky-200 dark:border-slate-700 p-5">
        <p class="text-sm font-medium text-sky-700 dark:text-sky-300">
        Administrador automático
        </p>

        <h3 class="text-2xl font-bold text-slate-900 text-dark mt-1">
        ${profile?.full_name || "Sin administrador"}
        </h3>
        </div>

        <label class="block">
        <span class="form-label">Categoría</span>
        <select id="expense-category" class="form-control">
        <option value="">Seleccionar categoría</option>
        <option value="Insumos">Insumos</option>
        <option value="Gasolina">Gasolina</option>
        <option value="Mantenimiento">Mantenimiento</option>
        <option value="Botellas">Botellas</option>
        <option value="Tapas">Tapas</option>
        <option value="Otro">Otro</option>
        </select>
        </label>

        <section class="space-y-3">
        <div>
        <h2 class="text-lg font-bold">Conceptos del gasto</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400">
        Agrega uno o varios conceptos.
        </p>
        </div>

        <div id="expense-items-container" class="space-y-3"></div>

        <button
        id="btn-add-expense-item"
        type="button"
        class="w-full rounded-3xl border-2 border-dashed border-sky-400 bg-sky-50 blue:bg-slate-900 dark:border-sky-500 p-5 flex items-center justify-center gap-3 transition active:scale-[0.98]"
        >
        <span class="w-10 h-10 rounded-2xl bg-sky-500 text-white flex items-center justify-center text-2xl font-bold shadow-lg">
        +
        </span>

        <div class="text-left">
        <p class="text-lg font-bold text-slate-900 dark:text-white">
        Agregar concepto
        </p>
        <p class="text-sm text-slate-500 dark:text-slate-400">
        Ej. tapas, gasolina, botellas, mantenimiento
        </p>
        </div>
        </button>
        </section>

        <div class="order-total-box">
        <p>Total gasto</p>
        <p id="expense-total-amount">$0.00</p>
        </div>

        <label class="block">
        <span class="form-label">Notas</span>
        <textarea
        id="expense-notes"
        rows="3"
        placeholder="Notas opcionales"
        class="form-control"
        ></textarea>
        </label>

        <button
        id="btn-save-expense"
        type="submit"
        class="w-full bg-sky-600 hover:bg-sky-500 text-white rounded-2xl py-3 font-semibold"
        >
        Guardar gasto
        </button>

        </form>

        ${renderBottomNav("expenses")}

        </div>
        </section>
        `;

        bindBottomNav(profile, activeBusiness);

        document.querySelector("#back-expenses")?.addEventListener("click", () => {
            renderExpensesView(profile, activeBusiness);
        });

        document.querySelector("#btn-add-expense-item")?.addEventListener("click", () => {
            addExpenseItemRow();
        });

        document.querySelector("#expense-form")?.addEventListener("submit", async (event) => {
            event.preventDefault();

            await saveExpense(profile, activeBusiness);
        });
    }

    // Agregar Conceptos Gastos

    function addExpenseItemRow() {
        const container = document.querySelector("#expense-items-container");
        const itemId = crypto.randomUUID();

        const itemHTML = `
        <article class="expense-item-row aqua-card p-4 space-y-3" data-expense-item-id="${itemId}">

        <div class="flex items-center justify-between gap-3">
        <h3 class="font-bold">Concepto del gasto</h3>

        <button
        type="button"
        class="btn-remove-expense-item text-red-500 font-bold"
        data-expense-item-id="${itemId}"
        >
        Eliminar
        </button>
        </div>

        <label class="block">
        <span class="form-label">Concepto</span>
        <input
        type="text"
        class="form-control expense-concept"
        placeholder="Ej. Tapas desechables"
        />
        </label>

        <div class="form-grid form-grid-2">
        <label class="block">
        <span class="form-label">Cantidad</span>
        <input
        type="number"
        min="1"
        step="1"
        value="1"
        class="form-control expense-quantity"
        />
        </label>

        <label class="block">
        <span class="form-label">Costo unitario</span>
        <input
        type="number"
        min="0"
        step="0.01"
        placeholder="0.00"
        class="form-control expense-unit-cost"
        />
        </label>
        </div>

        <div class="order-total-box">
        <p>Subtotal</p>
        <p class="expense-item-subtotal">$0.00</p>
        </div>

        </article>
        `;

        container.insertAdjacentHTML("beforeend", itemHTML);
        bindExpenseItemEvents();
        recalculateExpenseTotal();
    }

    function bindExpenseItemEvents() {
        document.querySelectorAll(".expense-quantity, .expense-unit-cost").forEach(input => {
            input.oninput = recalculateExpenseTotal;
        });

        document.querySelectorAll(".btn-remove-expense-item").forEach(button => {
            button.onclick = () => {
                const itemId = button.dataset.expenseItemId;
                document.querySelector(`[data-expense-item-id="${itemId}"]`)?.remove();
                recalculateExpenseTotal();
            };
        });
    }

    function recalculateExpenseTotal() {
        let total = 0;

        document.querySelectorAll(".expense-item-row").forEach(row => {
            const quantity = Number(row.querySelector(".expense-quantity")?.value) || 0;
            const unitCost = Number(row.querySelector(".expense-unit-cost")?.value) || 0;
            const subtotal = quantity * unitCost;

            row.querySelector(".expense-item-subtotal").textContent = formatCurrency(subtotal);

            total += subtotal;
        });

        document.querySelector("#expense-total-amount").textContent = formatCurrency(total);
    }

    // Guardar Gastos

    async function saveExpense(profile, activeBusiness) {
        const button = document.querySelector("#btn-save-expense");
        const businessId = activeBusiness?.businesses?.id;

        const category = document.querySelector("#expense-category")?.value || "Otro";
        const notes = document.querySelector("#expense-notes")?.value.trim() || "";
        const createdAtInput = document.querySelector("#expense-created-at")?.value;

        if (!businessId) {
            showToast("No se encontró negocio activo.", "error");
            return;
        }

        const rows = [...document.querySelectorAll(".expense-item-row")];

        if (rows.length === 0) {
            showToast("Agrega al menos un concepto.", "warning");
            return;
        }

        const items = [];

        for (const row of rows) {
            const concept = row.querySelector(".expense-concept")?.value.trim();
            const quantity = Number(row.querySelector(".expense-quantity")?.value) || 0;
            const unitCost = Number(row.querySelector(".expense-unit-cost")?.value) || 0;

            if (!concept || quantity <= 0 || unitCost < 0) {
                showToast("Revisa conceptos, cantidades y costos.", "warning");
                return;
            }

            items.push({
                concept,
                quantity,
                unit_cost: unitCost
            });
        }

        try {
            setButtonLoading(button, true, "Guardando gasto...");

            const {
                data: expense,
                error: expenseError
            } = await supabaseClient
            .from("expenses")
            .insert({
                business_id: businessId,
                user_id: profile.id,
                category,
                notes,
                created_at: createdAtInput
                ? new Date(createdAtInput).toISOString(): new Date().toISOString()
            })
            .select()
            .single();

            if (expenseError) throw expenseError;

            const expenseItemsPayload = items.map(item => ({
                expense_id: expense.id,
                concept: item.concept,
                quantity: item.quantity,
                unit_cost: item.unit_cost
            }));

            const {
                error: itemsError
            } = await supabaseClient
            .from("expense_items")
            .insert(expenseItemsPayload);

            if (itemsError) throw itemsError;

            showToast("Gasto guardado correctamente.", "success");
            renderExpensesView(profile, activeBusiness);

        } catch (error) {
            console.error(error);
            showToast(error.message || "No se pudo guardar el gasto.", "error");
        } finally {
            setButtonLoading(button, false);
        }
    }

    // Actualización Estado Negocio Header
    function updateDashboardHeroStatus( {
        salesToday = 0,
        lowStock = 0,
        monthProfit = 0
    }) {

        const role =
        document.querySelector(
            ".dashboard-role-badge"
        );

        if (role) {

            role.style.display =
            salesToday === 0 ||
            lowStock > 0
            ? "none": "inline-flex";

        }

        const el =
        document.querySelector(
            "#dashboard-status-banner"
        );

        if (!el) return;

        if (salesToday === 0) {

            el.className =
            "dashboard-status-banner warning";

            el.innerHTML =
            "📦 Primer pedido del día pendiente";

            return;

        }

        if (lowStock > 0) {

            el.className =
            "dashboard-status-banner danger";

            el.innerHTML =
            `⚠️ ${lowStock} producto(s) necesitan reabastecimiento`;

            return;

        }

        if (monthProfit > 1000) {

            el.className =
            "dashboard-status-banner success";

            el.innerHTML =
            "🚀 Excelente ritmo este mes";

            return;

        }

        el.className =
        "dashboard-status-banner good";

        el.innerHTML =
        "✨ Todo funcionando correctamente";


    }

    // Cargar Datos Dashboard

    async function loadDashboardStats(businessId) {
        if (!businessId) return;

        const today = new Date().toISOString().slice(0, 10);
        const currentMonth = new Date().toISOString().slice(0, 7);

        let salesTodayValue = 0;
        let ordersTodayValue = 0;
        let expensesMonthValue = 0;
        let monthProfitValue = 0;
        let lowStockCountValue = 0;
        let salesMonthValue = 0;

        // PEDIDOS
        const {
            data: orders,
            error: ordersError
        } = await supabaseClient
        .from("orders")
        .select("created_at, total_sale, total_profit")
        .eq("business_id", businessId);

        if (!ordersError && orders) {
            const ordersToday = orders.filter(order =>
                order.created_at?.slice(0, 10) === today
            );

            const salesToday = ordersToday.reduce((sum, order) =>
                sum + Number(order.total_sale || 0), 0
            );

            const monthProfit = orders
            .filter(order => order.created_at?.slice(0, 7) === currentMonth)
            .reduce((sum, order) =>
                sum + Number(order.total_profit || 0), 0
            );

            const salesMonth = orders
            .filter(order => order.created_at?.slice(0, 7) === currentMonth)
            .reduce((sum, order) =>
                sum + Number(order.total_sale || 0), 0
            );

            salesMonthValue = salesMonth;

            salesTodayValue = salesToday;
            ordersTodayValue = ordersToday.length;
            monthProfitValue = monthProfit;

            document.querySelector("#dashboard-sales-today").textContent = formatCurrency(salesToday);
            document.querySelector("#dashboard-orders-today").textContent = ordersToday.length;

            document.querySelector("#dashboard-profit-month").textContent = formatCurrency(monthProfit);

            document.querySelector("#quick-orders-count").textContent =
            `${ordersToday.length} pedido${ordersToday.length === 1 ? "": "s"} hoy`;

            document.querySelector("#quick-reports-profit").textContent =
            `${formatCurrency(monthProfit)} ganancia`;
        }

        // GASTOS
        const {
            data: expenses,
            error: expensesError
        } = await supabaseClient
        .from("expenses")
        .select(`
            created_at,
            total_amount,
            expense_items (
            quantity,
            unit_cost
            )
            `)
        .eq("business_id", businessId);

        if (!expensesError && expenses) {
            const expensesMonth = expenses
            .filter(expense => expense.created_at?.slice(0, 7) === currentMonth)
            .reduce((sum, expense) => {
                const directTotal = Number(expense.total_amount || 0);


                if (directTotal > 0) {
                    return sum + directTotal;
                }

                const itemsTotal = expense.expense_items?.reduce((itemSum, item) => {
                    return itemSum + ((Number(item.quantity) || 0) * (Number(item.unit_cost) || 0));
                }, 0) || 0;

                return sum + itemsTotal;
            },
                0);

            expensesMonthValue = expensesMonth;

            document.querySelector("#dashboard-expenses-month").textContent =
            formatCurrency(expensesMonth);

            document.querySelector("#quick-expenses-total").textContent =
            `${formatCurrency(expensesMonth)} este mes`;
        }

        // PRODUCTOS
        const {
            data: products, error: productsError
        } = await supabaseClient
        .from("products")
        .select("id, name, brand, presentation, stock, min_stock")
        .eq("business_id",
            businessId)
        .eq("is_active",
            true);

        if (!productsError && products) {
            document.querySelector("#quick-products-count").textContent =
            `${products.length} producto${products.length === 1 ? "": "s"}`;

            const lowStock = products.filter(product => {
                return Number(product.stock || 0) <= Number(product.min_stock || 0);
            });

            lowStockCountValue = lowStock.length;

            updateDashboardHeroStatus( {
                salesToday: salesTodayValue,
                lowStock: lowStock.length,
                monthProfit: monthProfitValue
            });

            const section = document.querySelector("#dashboard-low-stock-section");
            const count = document.querySelector("#dashboard-low-stock-count");
            const list = document.querySelector("#dashboard-low-stock-list");

            if (section && count && list) {
                if (lowStock.length > 0) {
                    section.classList.remove("hidden");
                    count.textContent = `${lowStock.length} producto${lowStock.length === 1 ? "": "s"}`;

                    list.innerHTML = lowStock.map(product => `
                        <div class="rounded-2xl bg-amber-50 border border-amber-200 p-3 dark:bg-amber-950/30 dark:border-amber-800">
                        <p class="font-bold text-slate-900 dark:text-white">
                        ${product.brand ? product.brand + " · ": ""}${product.name}
                        </p>
                        <p class="text-sm text-amber-700 dark:text-amber-300">
                        Stock actual: ${product.stock} · mínimo: ${product.min_stock} · ${product.presentation || ""}
                        </p>
                        </div>
                        `).join("");
                } else {
                    section.classList.add("hidden");
                }
            }
        }

        let highStock = 0;
        let mediumStock = 0;
        let lowStockCount = 0;
        let emptyStock = 0;

        products.forEach(product => {
            const stock = Number(product.stock) || 0;
            const minStock = Number(product.min_stock) || 0;

            if (stock <= 0) {
                emptyStock++;
            } else if (stock <= minStock) {
                lowStockCount++;
            } else if (minStock > 0 && stock <= minStock * 2) {
                mediumStock++;
            } else {
                highStock++;
            }
        });

        document.querySelector("#inventory-summary-total").textContent =
        `${products.length} producto${products.length === 1 ? "": "s"}`;

        document.querySelector("#inventory-high-count").textContent = highStock;
        document.querySelector("#inventory-medium-count").textContent = mediumStock;
        document.querySelector("#inventory-low-count").textContent = lowStockCount;
        document.querySelector("#inventory-empty-count").textContent = emptyStock;

        updateBusinessHealth( {
            salesToday: salesTodayValue,
            ordersToday: ordersTodayValue,
            expensesMonth: expensesMonthValue,
            monthProfit: monthProfitValue,
            lowStockCount: lowStockCountValue
        });

        updateSmartTip( {
            salesToday: salesTodayValue,
            ordersToday: ordersTodayValue,
            expensesMonth: expensesMonthValue,
            monthProfit: monthProfitValue,
            lowStockCount: lowStockCountValue
        });

        updateMonthlyChart( {
            salesMonth: salesMonthValue,
            expensesMonth: expensesMonthValue,
            monthProfit: monthProfitValue
        });

        const goals = await getBusinessGoals(businessId);

        updateGoalsCard( {
            salesToday: salesTodayValue,
            monthProfit: monthProfitValue,
            dailyGoal: goals.daily_sales_goal,
            monthlyGoal: goals.monthly_profit_goal
        });

        await loadRecentMovements(businessId);
        await loadMonthlyTrend(
            businessId
        );
    }

    // Calcular Vs Tendencias Anteriores
    async function loadMonthlyTrend(
        businessId
    ) {

        if (!businessId) return;

        const currentMonth =
        new Date()
        .toISOString()
        .slice(0, 7);

        const prevDate =
        new Date();

        prevDate.setMonth(
            prevDate.getMonth()-1
        );

        const previousMonth =
        prevDate
        .toISOString()
        .slice(0, 7);


        const {
            data: orders
        } =
        await supabaseClient
        .from("orders")
        .select(`
            created_at,
            total_sale,
            total_profit
            `)
        .eq(
            "business_id",
            businessId
        );


        const {
            data: expenses
        } =
        await supabaseClient
        .from("expenses")
        .select(`
            created_at,
            total_amount
            `)
        .eq(
            "business_id",
            businessId
        );


        const currentSales =
        (orders || [])
        .filter(x =>
            x.created_at?.startsWith(currentMonth)
        )
        .reduce(
            (s, x)=>
            s+Number(
                x.total_sale || 0
            ),
            0
        );


        const previousSales =
        (orders || [])
        .filter(x =>
            x.created_at?.startsWith(previousMonth)
        )
        .reduce(
            (s, x)=>
            s+Number(
                x.total_sale || 0
            ),
            0
        );


        const currentProfit =
        (orders || [])
        .filter(x =>
            x.created_at?.startsWith(currentMonth)
        )
        .reduce(
            (s, x)=>
            s+Number(
                x.total_profit || 0
            ),
            0
        );


        const previousProfit =
        (orders || [])
        .filter(x =>
            x.created_at?.startsWith(previousMonth)
        )
        .reduce(
            (s, x)=>
            s+Number(
                x.total_profit || 0
            ),
            0
        );


        const currentExpenses =
        (expenses || [])
        .filter(x =>
            x.created_at?.startsWith(currentMonth)
        )
        .reduce(
            (s, x)=>
            s+Number(
                x.total_amount || 0
            ),
            0
        );


        const previousExpenses =
        (expenses || [])
        .filter(x =>
            x.created_at?.startsWith(previousMonth)
        )
        .reduce(
            (s, x)=>
            s+Number(
                x.total_amount || 0
            ),
            0
        );


        function diff(now, before) {

            if (before === 0) {

                return 0;

            }

            return (
                (
                    now-before
                )
                /
                before
            )
            *
            100;

        }


        const previousTotal =
        previousSales
        +
        previousExpenses
        +
        previousProfit;


        if (
            previousTotal === 0
        ) {

            document
            .querySelector(
                "#trend-period"
            )
            .innerHTML =
            `
            🆕 Primer mes registrado
            `;

            document
            .querySelector(
                "#trend-sales"
            )
            .innerHTML =
            `
            <span class="trend-up">
            Primer registro
            </span>
            `;

            document
            .querySelector(
                "#trend-expenses"
            )
            .innerHTML =
            `
            <span class="trend-neutral">
            Sin comparación
            </span>
            `;

            document
            .querySelector(
                "#trend-profit"
            )
            .innerHTML =
            `
            <span class="trend-up">
            Construyendo historial
            </span>
            `;

            document
            .querySelector(
                "#trend-status"
            )
            .textContent =
            "✨ Nuevo";

            document
            .querySelector(
                "#trend-status"
            )
            .className =
            "badge trend-new-badge";


        } else {

            paintTrend(
                "#trend-sales",
                diff(
                    currentSales,
                    previousSales
                )
            );

            paintTrend(
                "#trend-expenses",
                diff(
                    currentExpenses,
                    previousExpenses
                )
            );

            paintTrend(
                "#trend-profit",
                diff(
                    currentProfit,
                    previousProfit
                )
            );

        }


        const score =
        (
            currentSales > previousSales
            ?1: 0
        )
        +
        (
            currentProfit >
            previousProfit
            ?1: 0
        )
        +
        (
            currentExpenses <
            previousExpenses
            ?1: 0
        );


        document
        .querySelector(
            "#trend-status"
        )
        .textContent =
        score >= 2
        ?
        "🟢 Mejor":
        "🟡 Similar";


        document
        .querySelector(
            "#trend-period"
        )
        .textContent =
        `vs ${formatMonthYear(
            previousMonth
        )}`;


        document
        .querySelector(
            "#dashboard-trend-section"
        )
        .classList
        .remove(
            "hidden"
        );

    }

    // Helpers Vs Tendencias Anteriores
    function paintTrend(
        selector,
        value
    ) {

        const el =
        document
        .querySelector(
            selector
        );

        if (!el) return;

        const sign =
        value > 0
        ?
        "+":
        "";


        el.textContent =
        `${sign}${value.toFixed(0)}%`;


        el.className =
        value > 0
        ?
        "trend-up":
        value < 0
        ?
        "trend-down":
        "trend-neutral";

    }

    // Función Iniciales Avatar Cliente
    function getClientInitials(name) {

        if (!name) return "CL";

        return name
        .trim()
        .split(" ")
        .slice(0, 2)
        .map(word => word[0])
        .join("")
        .toUpperCase();

    }

    // Función Formato Meses
    function formatMonthYear(monthString) {

        if (!monthString) {

            return "Mes anterior";

        }

        const [
            year,
            month
        ] =
        monthString
        .split("-");


        const months = [
            "Enero",
            "Febrero",
            "Marzo",
            "Abril",
            "Mayo",
            "Junio",
            "Julio",
            "Agosto",
            "Septiembre",
            "Octubre",
            "Noviembre",
            "Diciembre"
        ];

        return `${months[
            Number(month)-1
        ]} ${year}`;

    }

    // Actualizaciones Salud Negocio
    function updateBusinessHealth( {
        salesToday = 0,
        ordersToday = 0,
        expensesMonth = 0,
        monthProfit = 0,
        lowStockCount = 0
    }) {
        let score = 100;

        if (ordersToday <= 0) score -= 15;
        if (salesToday <= 0) score -= 15;
        if (expensesMonth > monthProfit && monthProfit > 0) score -= 20;
        if (monthProfit <= 0) score -= 20;
        if (lowStockCount > 0) score -= Math.min(lowStockCount * 10, 30);

        score = Math.max(0, Math.min(100, score));

        const scoreEl = document.querySelector("#business-health-score");
        const fillEl = document.querySelector("#business-health-fill");
        const salesLabel = document.querySelector("#health-sales-label");
        const expensesLabel = document.querySelector("#health-expenses-label");
        const stockLabel = document.querySelector("#health-stock-label");

        if (scoreEl) scoreEl.textContent = `${score}%`;
        if (fillEl) fillEl.style.width = `${score}%`;

        if (salesLabel) {
            salesLabel.textContent = salesToday > 0
            ? "Ventas activas hoy": "Sin ventas hoy";
        }

        if (expensesLabel) {
            expensesLabel.textContent = expensesMonth <= monthProfit
            ? "Gastos controlados": "Gastos altos";
        }

        if (stockLabel) {
            stockLabel.textContent = lowStockCount > 0
            ? `${lowStockCount} producto(s) bajo stock`: "Inventario saludable";
        }
    }

    // Tips Inteligentes
    function updateSmartTip( {
        salesToday = 0,
        ordersToday = 0,
        expensesMonth = 0,
        monthProfit = 0,
        lowStockCount = 0
    }) {
        const icon = document.querySelector("#smart-tip-icon");
        const title = document.querySelector("#smart-tip-title");
        const message = document.querySelector("#smart-tip-message");

        if (!icon || !title || !message) return;

        if (lowStockCount > 0) {
            icon.textContent = "⚠️";
            title.textContent = "Inventario por revisar";
            message.textContent = `Tienes ${lowStockCount} producto(s) con stock bajo. Conviene reabastecer antes de quedarte sin venta.`;
            return;
        }

        if (ordersToday <= 0) {
            icon.textContent = "📦";
            title.textContent = "Aún no hay pedidos hoy";
            message.textContent = "Puedes registrar un nuevo pedido desde acciones rápidas o revisar productos disponibles.";
            return;
        }

        if (expensesMonth > monthProfit && monthProfit > 0) {
            icon.textContent = "💸";
            title.textContent = "Gastos elevados";
            message.textContent = "Los gastos del mes están altos frente a la ganancia. Revisa compras e insumos.";
            return;
        }

        if (monthProfit > 0) {
            icon.textContent = "✅";
            title.textContent = "Buen ritmo";
            message.textContent = "Tu negocio muestra ganancia positiva y el inventario se ve saludable.";
            return;
        }

        icon.textContent = "💡";
        title.textContent = "Listo para operar";
        message.textContent = "Cuando registres pedidos, gastos o productos, Oasis Puro actualizará este resumen.";
    }

    // Grafica Visual Estado Negocio
    function updateMonthlyChart( {
        salesMonth = 0,
        expensesMonth = 0,
        monthProfit = 0
    }) {
        const maxValue = Math.max(salesMonth, expensesMonth, monthProfit, 1);

        const salesPercent = Math.round((salesMonth / maxValue) * 100);
        const expensesPercent = Math.round((expensesMonth / maxValue) * 100);
        const profitPercent = Math.round((monthProfit / maxValue) * 100);

        document.querySelector("#monthly-chart-sales").textContent = formatCurrency(salesMonth);
        document.querySelector("#monthly-chart-expenses").textContent = formatCurrency(expensesMonth);
        document.querySelector("#monthly-chart-profit").textContent = formatCurrency(monthProfit);

        document.querySelector("#monthly-chart-sales-bar").style.width = `${salesPercent}%`;
        document.querySelector("#monthly-chart-expenses-bar").style.width = `${expensesPercent}%`;
        document.querySelector("#monthly-chart-profit-bar").style.width = `${profitPercent}%`;
    }

    // Metas del Mes
    function getGoalStatus(current, goal, type = "daily") {
        const safeCurrent = Number(current) || 0;
        const safeGoal = Number(goal) || 0;

        if (safeGoal <= 0) {
            return {
                text: "Meta no configurada",
                className: "goal-status-neutral"
            };
        }

        const percent = (safeCurrent / safeGoal) * 100;
        const missing = Math.max(safeGoal - safeCurrent, 0);
        const extra = Math.max(safeCurrent - safeGoal, 0);

        if (percent >= 100) {
            return {
                text: `🎉 Objetivo superado por ${formatCurrency(extra)}`,
                className: "goal-status-success"
            };
        }

        if (percent >= 75) {
            return {
                text: `🟢 Muy cerca · faltan ${formatCurrency(missing)}`,
                className: "goal-status-success"
            };
        }

        if (percent >= 40) {
            return {
                text: `🟡 En ritmo · faltan ${formatCurrency(missing)}`,
                className: "goal-status-warning"
            };
        }

        if (percent > 0) {
            return {
                text: `🟠 Avance inicial · faltan ${formatCurrency(missing)}`,
                className: "goal-status-warning"
            };
        }

        return {
            text: type === "daily"
            ? `🔴 Sin avance hoy · faltan ${formatCurrency(missing)}`: `🔴 Sin avance mensual · faltan ${formatCurrency(missing)}`,
            className: "goal-status-danger"
        };
    }

    function updateGoalsCard( {
        salesToday = 0,
        monthProfit = 0,
        dailyGoal = DAILY_SALES_GOAL,
        monthlyGoal = MONTHLY_PROFIT_GOAL
    }) {
        const todayPercent = dailyGoal > 0
        ? Math.min((salesToday / dailyGoal) * 100, 100): 0;

        const monthPercent = monthlyGoal > 0
        ? Math.min((monthProfit / monthlyGoal) * 100, 100): 0;

        document.querySelector("#goal-today-text").textContent =
        `${formatCurrency(salesToday)} / ${formatCurrency(dailyGoal)}`;

        document.querySelector("#goal-month-text").textContent =
        `${formatCurrency(monthProfit)} / ${formatCurrency(monthlyGoal)}`;

        document.querySelector("#goal-today-fill").style.width = `${todayPercent}%`;
        document.querySelector("#goal-month-fill").style.width = `${monthPercent}%`;

        const todayStatus = getGoalStatus(salesToday, dailyGoal, "daily");
        const monthStatus = getGoalStatus(monthProfit, monthlyGoal, "monthly");

        const todayStatusEl = document.querySelector("#goal-today-status");
        const monthStatusEl = document.querySelector("#goal-month-status");

        if (todayStatusEl) {
            todayStatusEl.textContent = todayStatus.text;
            todayStatusEl.className = `goal-status-text ${todayStatus.className}`;
        }

        if (monthStatusEl) {
            monthStatusEl.textContent = monthStatus.text;
            monthStatusEl.className = `goal-status-text ${monthStatus.className}`;
        }
    }

    // Hora y Temperatura Actual Dashboard
    function loadCurrentDate() {
        const dateElement = document.querySelector("#dashboard-current-date");
        if (!dateElement) return;

        const date = new Date();

        const formattedDate = new Intl.DateTimeFormat("es-MX", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric"
        }).format(date);

        const cleanDate = formattedDate
        .replace(",", "")
        .replace(/^./, char => char.toUpperCase());

        dateElement.textContent = cleanDate;
    }

    const WEATHER_ICONS = {
        clear: "☀️",
        sunny: "☀️",
        despejado: "☀️",
        cloud: "☁️",
        nublado: "☁️",
        overcast: "☁️",
        partly: "⛅",
        parcialmente: "⛅",
        rain: "🌧️",
        lluvia: "🌧️",
        drizzle: "🌦️",
        snow: "🌨️",
        nieve: "🌨️",
        thunder: "⛈️",
        tormenta: "⛈️",
        fog: "🌫️",
        niebla: "🌫️",
        mist: "🌫️",
        wind: "💨",
        viento: "💨",
    };

    const WEATHER_TRANSLATIONS = {
        "sunny": "Soleado",
        "clear": "Despejado",
        "cloudy": "Nublado",
        "overcast": "Muy nublado",
        "mist": "Neblina",
        "fog": "Niebla",
        "rain": "Lluvia",
        "light rain": "Lluvia ligera",
        "moderate rain": "Lluvia moderada",
        "heavy rain": "Lluvia intensa",
        "drizzle": "Llovizna",
        "thunderstorm": "Tormenta",
        "snow": "Nieve",
        "patchy rain nearby": "Lluvia cercana",
        "partly cloudy": "Parcialmente nublado"
    };

    function getWeatherEmoji(desc = "") {
        const d = desc.toLowerCase();

        for (const [key, icon] of Object.entries(WEATHER_ICONS)) {
            if (d.includes(key)) return icon;
        }

        return "🌡️";
    }

    function translateWeather(desc = "") {
        const lower = desc.toLowerCase();

        for (const [english, spanish] of Object.entries(WEATHER_TRANSLATIONS)) {
            if (lower.includes(english)) {
                return spanish;
            }
        }

        return desc;
    }

    async function loadCurrentWeather() {
        const tempElement = document.querySelector("#weather-temp");
        const descElement = document.querySelector("#weather-desc");
        const iconElement = document.querySelector("#weather-icon");

        if (!tempElement || !descElement || !iconElement) return;

        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 5000);

            const response = await fetch("https://wttr.in/?format=j1", {
                signal: controller.signal,
            });

            clearTimeout(timer);

            if (!response.ok) throw new Error("No se pudo cargar clima");

            const data = await response.json();
            const current = data.current_condition?.[0];

            const tempC = current?.temp_C;
            const rawDesc =
            current?.lang_es?.[0]?.value ||
            current?.weatherDesc?.[0]?.value ||
            "Clima actual";

            const desc = translateWeather(rawDesc);

            tempElement.textContent = `${tempC}°C`;
            descElement.textContent = desc;
            iconElement.textContent = getWeatherEmoji(desc);

        } catch (error) {
            console.error(error);

            tempElement.textContent = "--°C";
            descElement.textContent = "Clima no disponible";
            iconElement.textContent = "🌡️";
        }
    }

    // Vista Sección Reportes

    async function renderReportsView(profile, activeBusiness) {
        const app = document.querySelector("#app");

        app.innerHTML = `
        <section class="has-bottom-nav min-h-screen bg-transparent px-4 py-6">
        <div class="max-w-5xl mx-auto space-y-4">

        <header class="aqua-card p-5">
        <button type="button" id="back-dashboard" class="text-sm text-sky-600 dark:text-sky-400 font-semibold mb-4">
        ← Volver a inicio
        </button>

        <p class="text-sm text-slate-500 dark:text-slate-400">Módulo</p>
        <h1 class="text-2xl font-bold">Reportes mensuales</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
        Resumen general de ventas, gastos y ganancias.
        </p>
        </header>

        <div class="flex gap-3">

        <button
        id="btn-download-report-pdf"
        class="flex-1 bg-sky-600 hover:bg-sky-500 text-white rounded-2xl py-3 font-semibold"
        >
        Descargar PDF
        </button>

        </div>

        <section class="aqua-card p-5">
        <label class="block">
        <span class="form-label">Seleccionar mes</span>
        <input
        id="report-month"
        type="month"
        class="form-control"
        />
        </label>
        </section>

        <section class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="aqua-card p-5">
        <p class="text-sm text-slate-500 dark:text-slate-400">Ventas del mes</p>
        <h2 id="report-total-sales" class="text-2xl font-bold mt-1">$0.00</h2>
        </div>

        <div class="aqua-card p-5">
        <p class="text-sm text-slate-500 dark:text-slate-400">Gastos del mes</p>
        <h2 id="report-total-expenses" class="text-2xl font-bold mt-1">$0.00</h2>
        </div>

        <div class="aqua-card p-5">
        <p class="text-sm text-slate-500 dark:text-slate-400">Ganancia neta</p>
        <h2 id="report-net-profit" class="text-2xl font-bold mt-1">$0.00</h2>
        </div>
        </section>

        <section class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="aqua-card p-5">
        <p class="text-sm text-slate-500 dark:text-slate-400">Pedidos del mes</p>
        <h2 id="report-orders-count" class="text-2xl font-bold mt-1">0</h2>
        </div>

        <div class="aqua-card p-5">
        <p class="text-sm text-slate-500 dark:text-slate-400">Ticket promedio</p>
        <h2 id="report-average-ticket" class="text-2xl font-bold mt-1">$0.00</h2>
        </div>
        </section>

        <section class="aqua-card p-5">
        <h2 class="text-lg font-bold mb-3">Productos vendidos</h2>
        <div id="report-products-list" class="space-y-2">
        <p class="text-sm text-slate-500 dark:text-slate-400">Cargando...</p>
        </div>
        </section>

        <section class="aqua-card p-5">
        <h2 class="text-lg font-bold mb-3">Gastos por categoría</h2>
        <div id="report-expenses-list" class="space-y-2">
        <p class="text-sm text-slate-500 dark:text-slate-400">Cargando...</p>
        </div>
        </section>

        <section class="aqua-card p-5">
        <div class="mb-4">
        <h2 class="text-lg font-bold">Comparativo mensual</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400">
        Ventas, gastos y ganancia neta.
        </p>
        </div>

        <div class="report-chart space-y-4">
        <div>
        <div class="flex justify-between text-sm font-semibold mb-1">
        <span>Ventas</span>
        <span id="chart-sales-label">$0.00</span>
        </div>
        <div class="chart-track">
        <div id="chart-sales-bar" class="chart-bar chart-sales" style="width:0%"></div>
        </div>
        </div>

        <div>
        <div class="flex justify-between text-sm font-semibold mb-1">
        <span>Gastos</span>
        <span id="chart-expenses-label">$0.00</span>
        </div>
        <div class="chart-track">
        <div id="chart-expenses-bar" class="chart-bar chart-expenses" style="width:0%"></div>
        </div>
        </div>

        <div>
        <div class="flex justify-between text-sm font-semibold mb-1">
        <span>Ganancia neta</span>
        <span id="chart-profit-label">$0.00</span>
        </div>
        <div class="chart-track">
        <div id="chart-profit-bar" class="chart-bar chart-profit" style="width:0%"></div>
        </div>
        </div>
        </div>
        </section>

        ${renderBottomNav("home")}

        </div>
        </section>
        `;

        bindBottomNav(profile, activeBusiness);

        document.querySelector("#btn-download-report-pdf")?.addEventListener("click", async () => {
            try {
                await downloadMonthlyReportPDF(profile, activeBusiness);
            } catch (error) {
                console.error("Error PDF:", error);
                showToast("No se pudo generar el PDF. Revisa consola.", "error");
            }
        });

        document.querySelector("#back-dashboard")?.addEventListener("click", () => {
            renderDashboardPlaceholder(profile, activeBusiness);
        });

        const monthInput = document.querySelector("#report-month");
        monthInput.value = new Date().toISOString().slice(0, 7);

        monthInput.addEventListener("change", () => {
            loadMonthlyReport(activeBusiness?.businesses?.id, monthInput.value);
        });

        await loadMonthlyReport(activeBusiness?.businesses?.id, monthInput.value);
    }

    // Cargar Reportes Mensuales

    async function loadMonthlyReport(businessId, monthValue) {
        if (!businessId || !monthValue) return;

        const {
            data: orders,
            error: ordersError
        } = await supabaseClient
        .from("orders")
        .select(`
            id,
            created_at,
            total_sale,
            total_profit,
            order_items (
            product_name,
            quantity,
            sale_price
            )
            `)
        .eq("business_id", businessId);

        const {
            data: expenses,
            error: expensesError
        } = await supabaseClient
        .from("expenses")
        .select(`
            created_at,
            category,
            total_amount,
            expense_items (
            quantity,
            unit_cost
            )
            `)
        .eq("business_id", businessId);

        if (ordersError || expensesError) {
            console.error(ordersError || expensesError);
            showToast("Error al cargar reporte.", "error");
            return;
        }

        const monthOrders = (orders || []).filter(order =>
            order.created_at?.slice(0, 7) === monthValue
        );

        const monthExpenses = (expenses || []).filter(expense =>
            expense.created_at?.slice(0, 7) === monthValue
        );

        const totalSales = monthOrders.reduce((sum, order) =>
            sum + Number(order.total_sale || 0), 0
        );

        const totalProfit = monthOrders.reduce((sum, order) =>
            sum + Number(order.total_profit || 0), 0
        );

        const totalExpenses = monthExpenses.reduce((sum, expense) => {
            const directTotal = Number(expense.total_amount || 0);

            if (directTotal > 0) return sum + directTotal;

            const itemsTotal = expense.expense_items?.reduce((itemSum, item) => {
                return itemSum + ((Number(item.quantity) || 0) * (Number(item.unit_cost) || 0));
            }, 0) || 0;

            return sum + itemsTotal;
        },
            0);

        const netProfit = totalProfit - totalExpenses;
        const averageTicket = monthOrders.length > 0 ? totalSales / monthOrders.length: 0;

        document.querySelector("#report-total-sales").textContent = formatCurrency(totalSales);
        document.querySelector("#report-total-expenses").textContent = formatCurrency(totalExpenses);
        document.querySelector("#report-net-profit").textContent = formatCurrency(netProfit);
        document.querySelector("#report-orders-count").textContent = monthOrders.length;
        document.querySelector("#report-average-ticket").textContent = formatCurrency(averageTicket);
        updateReportChart(totalSales,
            totalExpenses,
            netProfit);

        const productMap = {};

        monthOrders.forEach(order => {
            order.order_items?.forEach(item => {
                const key = item.product_name || "Producto";

                if (!productMap[key]) {
                    productMap[key] = {
                        quantity: 0,
                        total: 0
                    };
                }

                productMap[key].quantity += Number(item.quantity || 0);
                productMap[key].total += Number(item.quantity || 0) * Number(item.sale_price || 0);
            });
        });

        const productsList = document.querySelector("#report-products-list");
        const productsArray = Object.entries(productMap);

        productsList.innerHTML = productsArray.length
        ? productsArray.map(([name,
            item]) => `
            <div class="rounded-2xl bg-sky-50 border border-sky-200 p-3 dark:bg-sky-950/30 dark:border-sky-800">
            <p class="font-bold">${name}</p>
            <p class="text-sm text-slate-500 dark:text-slate-400">
            Cantidad: ${item.quantity} · Total: ${formatCurrency(item.total)}
            </p>
            </div>
            `).join(""): `<p class="text-sm text-slate-500 dark:text-slate-400">Sin productos vendidos en este mes.</p>`;

        const expenseCategoryMap = {};

        monthExpenses.forEach(expense => {
            const category = expense.category || "Sin categoría";
            const directTotal = Number(expense.total_amount || 0);

            const itemsTotal = directTotal > 0
            ? directTotal: expense.expense_items?.reduce((itemSum, item) => {
                return itemSum + ((Number(item.quantity) || 0) * (Number(item.unit_cost) || 0));
            },
                0) || 0;

            expenseCategoryMap[category] = (expenseCategoryMap[category] || 0) + itemsTotal;
        });

        const expensesList = document.querySelector("#report-expenses-list");
        const expensesArray = Object.entries(expenseCategoryMap);

        expensesList.innerHTML = expensesArray.length
        ? expensesArray.map(([category,
            amount]) => `
            <div class="rounded-2xl bg-emerald-50 border border-emerald-200 p-3 dark:bg-emerald-950/30 dark:border-emerald-800">
            <p class="font-bold">${category}</p>
            <p class="text-sm text-slate-500 dark:text-slate-400">
            Total: ${formatCurrency(amount)}
            </p>
            </div>
            `).join(""): `<p class="text-sm text-slate-500 dark:text-slate-400">Sin gastos registrados en este mes.</p>`;
    }

    // Actualizaciones Gráfica Reporte

    function updateReportChart(totalSales, totalExpenses, netProfit) {
        const maxValue = Math.max(totalSales, totalExpenses, Math.abs(netProfit), 1);

        const salesPercent = Math.min((totalSales / maxValue) * 100, 100);
        const expensesPercent = Math.min((totalExpenses / maxValue) * 100, 100);
        const profitPercent = Math.min((Math.abs(netProfit) / maxValue) * 100, 100);

        document.querySelector("#chart-sales-label").textContent = formatCurrency(totalSales);
        document.querySelector("#chart-expenses-label").textContent = formatCurrency(totalExpenses);
        document.querySelector("#chart-profit-label").textContent = formatCurrency(netProfit);

        document.querySelector("#chart-sales-bar").style.width = `${salesPercent}%`;
        document.querySelector("#chart-expenses-bar").style.width = `${expensesPercent}%`;
        document.querySelector("#chart-profit-bar").style.width = `${profitPercent}%`;
    }

    // Últimos Movimientos
    async function loadRecentMovements(businessId) {
        const container = document.querySelector("#dashboard-recent-movements");

        if (!container || !businessId) return;

        const {
            data: orders
        } = await supabaseClient
        .from("orders")
        .select(`
            id,
            order_number,
            total_sale,
            created_at,
            clients (
            name
            )
            `)
        .eq("business_id", businessId)
        .order("created_at", {
            ascending: false
        })
        .limit(5);

        const {
            data: expenses
        } = await supabaseClient
        .from("expenses")
        .select(`
            id,
            expense_number,
            total_amount,
            category,
            created_at
            `)
        .eq("business_id", businessId)
        .order("created_at", {
            ascending: false
        })
        .limit(5);

        const orderMovements = (orders || []).map(order => ({
            type: "order",
            date: order.created_at,
            html: `
            <div class="timeline-item timeline-order">

            <div class="timeline-dot">
            📦
            </div>

            <div class="timeline-content">
            <p class="timeline-title">
            Pedido #${String(order.order_number || 0).padStart(4, "0")}
            </p>

            <p class="timeline-subtitle">
            Cliente: ${order.clients?.name || "Sin cliente"}
            </p>
            </div>

            <div class="timeline-meta">
            <p>${formatCurrency(order.total_sale || 0)}</p>
            <span>${formatDate(order.created_at)}</span>
            </div>

            </div>
            `
        }));

        const expenseMovements = (expenses || []).map(expense => ({
            type: "expense",
            date: expense.created_at,
            html: `
            <div class="timeline-item timeline-expense">

            <div class="timeline-dot">
            💸
            </div>

            <div class="timeline-content">
            <p class="timeline-title">
            Gasto #${String(expense.expense_number || 0).padStart(4, "0")}
            </p>

            <p class="timeline-subtitle">
            ${expense.category || "Sin categoría"}
            </p>
            </div>

            <div class="timeline-meta">
            <p>${formatCurrency(expense.total_amount || 0)}</p>
            <span>${formatDate(expense.created_at)}</span>
            </div>

            </div>
            `
        }));

        const merged = [
            ...orderMovements,
            ...expenseMovements
        ]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 8);

        if (merged.length === 0) {
            container.innerHTML = `
            <div class="timeline-empty">
            <div>🧾</div>
            <p>Sin movimientos recientes.</p>
            <span>Cuando registres pedidos o gastos, aparecerán aquí.</span>
            </div>
            `;
            return;
        }

        container.innerHTML = merged.map(item => item.html).join("");
    }

    // Vista Reabastecer Producto
    function renderRestockProductForm(profile, activeBusiness, product) {
        const app = document.querySelector("#app");
        const businessId = activeBusiness?.businesses?.id;

        app.innerHTML = `
        <section class="has-bottom-nav min-h-screen bg-transparent px-4 py-6">
        <div class="max-w-2xl mx-auto space-y-4">

        <form id="restock-form" class="aqua-card p-5 space-y-4">

        <div>
        <button type="button" id="back-products" class="text-sm text-sky-600 dark:text-sky-400 font-semibold mb-4">
        ← Volver a productos
        </button>

        <h1 class="text-2xl font-bold">Reabastecer producto</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
        Suma nueva mercancía al inventario existente.
        </p>
        </div>

        <div class="rounded-3xl bg-sky-100/90 border border-sky-200 p-4 dark:bg-blue-900/30 dark:border-sky-800">
        <p class="text-sm text-slate-500 dark:text-slate-400">Producto</p>
        <h2 class="text-xl font-bold">
        ${product.brand ? product.brand + " · ": ""}${product.name}
        </h2>
        <p class="text-sm text-slate-500 dark:text-slate-400">
        ${product.presentation || "Sin presentación"}
        </p>
        </div>

        <div class="form-grid form-grid-2">
        <div class="rounded-2xl bg-slate-100 dark:bg-sky-900/30 p-4">
        <p class="text-xs text-slate-500 dark:text-slate-400">Stock actual</p>
        <p class="text-2xl font-black">${product.stock}</p>
        </div>

        <div class="rounded-2xl bg-slate-100 dark:bg-emerald-900/30 p-4">
        <p class="text-xs text-slate-500 dark:text-slate-400">Stock acumulado</p>
        <p class="text-2xl font-black">${product.initial_stock}</p>
        </div>
        </div>

        <label class="block">
        <span class="form-label">Cantidad a reabastecer</span>
        <input
        id="restock-quantity"
        type="number"
        min="1"
        step="1"
        required
        placeholder="50"
        class="form-control"
        />
        </label>

        <label class="block">
        <span class="form-label">Nuevo precio compra</span>
        <input
        id="restock-cost-price"
        type="number"
        min="0"
        step="0.01"
        placeholder="Opcional"
        class="form-control"
        />
        </label>

        <label class="block">
        <span class="form-label">Fecha y hora de compra</span>
        <input
        id="restock-purchase-at"
        type="datetime-local"
        class="form-control"
        />
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-2">
        Si lo dejas vacío, se usará la fecha y hora actual.
        </p>
        </label>

        <button
        id="btn-save-restock"
        type="submit"
        class="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl py-3 font-semibold"
        >
        Guardar reabastecimiento
        </button>

        </form>

        ${renderBottomNav("products")}

        </div>
        </section>
        `;

        bindBottomNav(profile, activeBusiness);

        document.querySelector("#back-products")?.addEventListener("click", () => {
            renderProductsView(profile, activeBusiness);
        });

        document.querySelector("#restock-form")?.addEventListener("submit", async (event) => {
            event.preventDefault();

            const button = document.querySelector("#btn-save-restock");
            const quantity = Number(document.querySelector("#restock-quantity").value) || 0;
            const newCostPrice = Number(document.querySelector("#restock-cost-price").value) || null;

            if (!businessId || quantity <= 0) {
                showToast("Revisa la cantidad.", "warning");
                return;
            }

            try {
                setButtonLoading(button, true, "Guardando...");

                const updatePayload = {
                    stock: Number(product.stock || 0) + quantity,
                    initial_stock: Number(product.initial_stock || 0) + quantity,
                    purchase_at: document.querySelector("#restock-purchase-at").value
                    ? new Date(document.querySelector("#restock-purchase-at").value).toISOString(): new Date().toISOString()
                };

                if (newCostPrice !== null && newCostPrice > 0) {
                    updatePayload.cost_price = newCostPrice;
                }

                const {
                    error: updateError
                } = await supabaseClient
                .from("products")
                .update(updatePayload)
                .eq("id", product.id);

                if (updateError) throw updateError;

                await registerInventoryMovement( {
                    businessId,
                    productId: product.id,
                    movementType: "entrada",
                    quantity,
                    stockBefore: Number(product.stock || 0),
                    stockAfter: updatePayload.stock,
                    referenceType: "product",
                    referenceId: product.id,
                    notes: "Entrada por reabastecimiento de producto"
                });

                showToast("Producto reabastecido correctamente.", "success");
                renderProductsView(profile, activeBusiness);

            } catch (error) {
                console.error(error);
                showToast(error.message || "No se pudo reabastecer.", "error");
            } finally {
                setButtonLoading(button, false);
            }
        });
    }

    // Añadir Logo PDF
    async function loadImageAsBase64(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";

            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;

                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0);

                resolve(canvas.toDataURL("image/png"));
            };

            img.onerror = reject;
            img.src = url;
        });
    }

    // Crear PDF Reporte Mensual
    async function downloadMonthlyReportPDF(profile,
        activeBusiness) {
        if (!window.jspdf) {
            showToast("jsPDF no está cargado.", "error");
            return;
        }
        const {
            jsPDF
        } = window.jspdf;
        const doc = new jsPDF("p",
            "mm",
            "letter");

        if (typeof doc.autoTable !== "function") {
            showToast("autoTable no está cargado.", "error");
            return;
        }

        const businessName = activeBusiness?.businesses?.name || "Oasis Puro";
        const adminName = profile?.full_name || "Administrador";
        const month = document.querySelector("#report-month")?.value || "";

        const sales = document.querySelector("#report-total-sales")?.textContent || "$0.00";
        const expenses = document.querySelector("#report-total-expenses")?.textContent || "$0.00";
        const profit = document.querySelector("#report-net-profit")?.textContent || "$0.00";
        const orders = document.querySelector("#report-orders-count")?.textContent || "0";
        const averageTicket = document.querySelector("#report-average-ticket")?.textContent || "$0.00";

        let logoBase64 = null;

        try {
            logoBase64 = await loadImageAsBase64("./assets/logo-oasis-puro.png");
        } catch (error) {
            console.warn("No se pudo cargar el logo para el PDF:",
                error);
        }

        doc.setFillColor(14,
            165,
            233);
        doc.rect(0,
            0,
            216,
            38,
            "F");

        if (logoBase64) {
            doc.addImage(
                logoBase64,
                "PNG",
                16,
                8,
                18,
                18
            );
        }

        const titleX = logoBase64 ? 40: 16;

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text("Oasis Puro", titleX, 16);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Reporte mensual administrativo", titleX, 23);

        doc.setTextColor(15,
            23,
            42);
        doc.setFont("helvetica",
            "bold");
        doc.setFontSize(16);
        doc.text(businessName,
            16,
            47);

        doc.setFont("helvetica",
            "normal");
        doc.setFontSize(10);
        doc.text(`Administrador: ${adminName}`,
            16,
            55);
        doc.text(`Mes: ${month}`,
            16,
            61);
        doc.text(`Generado: ${new Date().toLocaleString("es-MX")}`,
            16,
            67);

        doc.autoTable({
            startY: 78,
            head: [["Concepto",
                "Valor"]],
            body: [
                ["Ventas del mes",
                    sales],
                ["Gastos del mes",
                    expenses],
                ["Ganancia neta",
                    profit],
                ["Pedidos del mes",
                    orders],
                ["Ticket promedio",
                    averageTicket],
            ],
            theme: "grid",
            headStyles: {
                fillColor: [14,
                    165,
                    233],
                textColor: 255,
                fontStyle: "bold",
            },
            styles: {
                fontSize: 10,
                cellPadding: 4,
            },
        });

        const productsRows = [...document.querySelectorAll("#report-products-list > div")]
        .map(div => {
            const title = div.querySelector("p:nth-child(1)")?.textContent?.trim() || "";
            const detail = div.querySelector("p:nth-child(2)")?.textContent?.trim() || "";
            return [title,
                detail];
        });

        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 10,
            head: [["Productos vendidos",
                "Detalle"]],
            body: productsRows.length ? productsRows: [["Sin productos vendidos",
                "—"]],
            theme: "striped",
            headStyles: {
                fillColor: [16,
                    185,
                    129],
                textColor: 255,
            },
            styles: {
                fontSize: 9,
                cellPadding: 3,
            },
        });

        const expensesRows = [...document.querySelectorAll("#report-expenses-list > div")]
        .map(div => {
            const title = div.querySelector("p:nth-child(1)")?.textContent?.trim() || "";
            const detail = div.querySelector("p:nth-child(2)")?.textContent?.trim() || "";
            return [title,
                detail];
        });

        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 10,
            head: [["Gastos por categoría",
                "Detalle"]],
            body: expensesRows.length ? expensesRows: [["Sin gastos registrados",
                "—"]],
            theme: "striped",
            headStyles: {
                fillColor: [244,
                    63,
                    94],
                textColor: 255,
            },
            styles: {
                fontSize: 9,
                cellPadding: 3,
            },
        });

        const pageCount = doc.internal.getNumberOfPages();

        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text(
                `Oasis Puro - Página ${i} de ${pageCount}`,
                16,
                270
            );
        }

        const fileName = `Reporte-Oasis Puro-${month || "mensual"}.pdf`;

        try {
            doc.save(fileName);
            showToast("PDF generado correctamente.", "success");
        } catch (error) {
            console.error(error);

            const pdfBlob = doc.output("blob");
            const pdfUrl = URL.createObjectURL(pdfBlob);

            window.open(pdfUrl, "_blank");

            showToast("PDF abierto en nueva pestaña.", "success");
        }
    }

    // Descargar PDF Pedidos
    async function downloadOrdersPDF(profile, activeBusiness) {
        if (!window.jspdf) {
            showToast("jsPDF no está cargado.", "error");
            return;
        }

        const {
            jsPDF
        } = window.jspdf;
        const doc = new jsPDF("l", "mm", "letter");

        if (typeof doc.autoTable !== "function") {
            showToast("autoTable no está cargado.", "error");
            return;
        }

        const businessId = activeBusiness?.businesses?.id;
        const businessName = activeBusiness?.businesses?.name || "Oasis Puro";
        const adminName = profile?.full_name || "Administrador";

        if (!businessId) {
            showToast("No se encontró negocio activo.", "error");
            return;
        }

        const {
            data,
            error
        } = await supabaseClient
        .from("orders")
        .select(`
            order_number,
            status,
            total_sale,
            total_cost,
            total_profit,
            created_at,
            clients (
            name
            ),
            profiles (
            full_name
            ),
            order_items (
            product_name,
            quantity
            )
            `)
        .eq("business_id", businessId)
        .order("created_at", {
            ascending: false
        });

        if (error) {
            console.error(error);
            showToast("No se pudieron cargar pedidos.", "error");
            return;
        }

        let logoBase64 = null;

        try {
            logoBase64 = await loadImageAsBase64("./assets/logo-oasis-puro.png");
        } catch (error) {
            console.warn("No se pudo cargar logo:", error);
        }

        doc.setFillColor(14, 165, 233);
        doc.rect(0, 0, 280, 34, "F");

        if (logoBase64) {
            doc.addImage(logoBase64, "PNG", 14, 7, 18, 18);
        }

        const titleX = logoBase64 ? 38: 14;

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(17);
        doc.text("Oasis Puro", titleX, 14);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text("Reporte de tabla de pedidos", titleX, 22);

        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(15);
        doc.text(businessName, 14, 45);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(`Administrador: ${adminName}`, 14, 52);
        doc.text(`Generado: ${new Date().toLocaleString("es-MX")}`, 14, 58);

        const rows = (data || []).map(order => {
            const productsText = order.order_items?.length
            ? order.order_items.map(item => `${item.product_name} x${item.quantity}`).join(", "): "—";

            return [
                `#${String(order.order_number || 0).padStart(4, "0")}`,
                formatDate(order.created_at),
                order.clients?.name || "—",
                order.profiles?.full_name || "—",
                productsText,
                formatCurrency(order.total_sale || 0),
                formatCurrency(order.total_cost || 0),
                formatCurrency(order.total_profit || 0),
                getOrderStatusLabel(order.status)
            ];
        });

        doc.autoTable({
            startY: 68,
            head: [[
                "# Pedido",
                "Fecha",
                "Cliente",
                "Vendedor",
                "Productos",
                "Venta",
                "Costo",
                "Ganancia",
                "Status"
            ]],
            body: rows.length ? rows: [[
                "—", "—", "Sin pedidos registrados", "—", "—", "—", "—", "—", "—"
            ]],
            theme: "grid",
            headStyles: {
                fillColor: [14, 165, 233],
                textColor: 255,
                fontStyle: "bold",
                fontSize: 8
            },
            styles: {
                fontSize: 7,
                cellPadding: 2,
                overflow: "linebreak"
            },
            columnStyles: {
                0: {
                    cellWidth: 18
                },
                1: {
                    cellWidth: 28
                },
                2: {
                    cellWidth: 32
                },
                3: {
                    cellWidth: 32
                },
                4: {
                    cellWidth: 58
                },
                5: {
                    cellWidth: 22
                },
                6: {
                    cellWidth: 22
                },
                7: {
                    cellWidth: 24
                },
                8: {
                    cellWidth: 24
                }
            }
        });

        const pageCount = doc.internal.getNumberOfPages();

        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text(`Oasis Puro - Página ${i} de ${pageCount}`, 14, 205);
        }

        doc.save(`Pedidos-Oasis Puro-${new Date().toISOString().slice(0, 10)}.pdf`);
    }

    // Descargar PDF Gastos
    async function downloadExpensesPDF(profile, activeBusiness) {
        if (!window.jspdf) {
            showToast("jsPDF no está cargado.", "error");
            return;
        }

        const {
            jsPDF
        } = window.jspdf;
        const doc = new jsPDF("p", "mm", "letter");

        if (typeof doc.autoTable !== "function") {
            showToast("autoTable no está cargado.", "error");
            return;
        }

        const businessId = activeBusiness?.businesses?.id;
        const businessName = activeBusiness?.businesses?.name || "Oasis Puro";
        const adminName = profile?.full_name || "Administrador";

        if (!businessId) {
            showToast("No se encontró negocio activo.", "error");
            return;
        }

        const {
            data,
            error
        } = await supabaseClient
        .from("expenses")
        .select(`
            expense_number,
            category,
            total_amount,
            notes,
            created_at,
            profiles (
            full_name
            ),
            expense_items (
            concept,
            quantity,
            unit_cost
            )
            `)
        .eq("business_id", businessId)
        .order("created_at", {
            ascending: true
        });

        if (error) {
            console.error(error);
            showToast("No se pudieron cargar gastos.", "error");
            return;
        }

        let logoBase64 = null;

        try {
            logoBase64 = await loadImageAsBase64("./assets/logo-oasis-puro.png");
        } catch (error) {
            console.warn("No se pudo cargar logo:", error);
        }

        doc.setFillColor(14, 165, 233);
        doc.rect(0, 0, 216, 34, "F");

        if (logoBase64) {
            doc.addImage(logoBase64, "PNG", 14, 7, 18, 18);
        }

        const titleX = logoBase64 ? 38: 14;

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(17);
        doc.text("Oasis Puro", titleX, 14);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text("Reporte de gastos por mes", titleX, 22);

        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(15);
        doc.text(businessName, 14, 45);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(`Administrador: ${adminName}`, 14, 52);
        doc.text(`Generado: ${new Date().toLocaleString("es-MX")}`, 14, 58);

        const expenses = data || [];

        if (expenses.length === 0) {
            doc.autoTable({
                startY: 70,
                head: [["Mensaje"]],
                body: [["Sin gastos registrados."]],
                theme: "grid",
                headStyles: {
                    fillColor: [14, 165, 233],
                    textColor: 255
                }
            });

            doc.save(`Gastos-Oasis Puro-${new Date().toISOString().slice(0, 10)}.pdf`);
            return;
        }

        const groupedByMonth = {};

        expenses.forEach(expense => {
            const monthKey = expense.created_at?.slice(0, 7) || "Sin fecha";

            if (!groupedByMonth[monthKey]) {
                groupedByMonth[monthKey] = [];
            }

            groupedByMonth[monthKey].push(expense);
        });

        let startY = 72;

        Object.entries(groupedByMonth).forEach(([monthKey, monthExpenses], index) => {
            if (index > 0) {
                doc.addPage();
                startY = 20;
            }

            const monthTotal = monthExpenses.reduce((sum, expense) => {
                const directTotal = Number(expense.total_amount || 0);

                if (directTotal > 0) return sum + directTotal;

                const itemsTotal = expense.expense_items?.reduce((itemSum, item) => {
                    return itemSum + ((Number(item.quantity) || 0) * (Number(item.unit_cost) || 0));
                }, 0) || 0;

                return sum + itemsTotal;
            },
                0);

            doc.setFont("helvetica",
                "bold");
            doc.setFontSize(13);
            doc.setTextColor(15,
                23,
                42);
            const [year, month] = monthKey.split("-");

            const monthNames = [
                "Enero",
                "Febrero",
                "Marzo",
                "Abril",
                "Mayo",
                "Junio",
                "Julio",
                "Agosto",
                "Septiembre",
                "Octubre",
                "Noviembre",
                "Diciembre"
            ];

            const formattedMonth = `${monthNames[Number(month) - 1]}, ${year}`;

            doc.text(`${formattedMonth}`,
                14,
                startY);

            doc.setFont("helvetica",
                "normal");
            doc.setFontSize(10);
            doc.text(`Total del mes: ${formatCurrency(monthTotal)}`,
                14,
                startY + 7);

            const rows = monthExpenses.map(expense => {
                const conceptsText = expense.expense_items?.length
                ? expense.expense_items
                .map(item => `${item.concept} x${item.quantity} (${formatCurrency(item.unit_cost)})`)
                .join(", "): "—";

                const directTotal = Number(expense.total_amount || 0);
                const calculatedTotal = directTotal > 0
                ? directTotal: expense.expense_items?.reduce((itemSum, item) => {
                    return itemSum + ((Number(item.quantity) || 0) * (Number(item.unit_cost) || 0));
                }, 0) || 0;

                return [
                    `#${String(expense.expense_number || 0).padStart(4, "0")}`,
                    formatDate(expense.created_at),
                    expense.profiles?.full_name || "—",
                    expense.category || "—",
                    conceptsText,
                    formatCurrency(calculatedTotal),
                    expense.notes || "—"
                ];
            });

            doc.autoTable({
                startY: startY + 13,
                head: [[
                    "# Gasto",
                    "Fecha",
                    "Admin",
                    "Categoría",
                    "Conceptos",
                    "Total",
                    "Notas"
                ]],
                body: rows,
                theme: "grid",
                headStyles: {
                    fillColor: [14,
                        165,
                        233],
                    textColor: 255,
                    fontStyle: "bold",
                    fontSize: 8
                },
                styles: {
                    fontSize: 7,
                    cellPadding: 2,
                    overflow: "linebreak"
                },
                columnStyles: {
                    0: {
                        cellWidth: 18
                    },
                    1: {
                        cellWidth: 26
                    },
                    2: {
                        cellWidth: 28
                    },
                    3: {
                        cellWidth: 24
                    },
                    4: {
                        cellWidth: 58
                    },
                    5: {
                        cellWidth: 22
                    },
                    6: {
                        cellWidth: 36
                    }
                }
            });
        });

        const pageCount = doc.internal.getNumberOfPages();

        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text(`Oasis Puro - Página ${i} de ${pageCount}`, 14, 270);
        }

        doc.save(`Gastos-Oasis Puro-${new Date().toISOString().slice(0, 10)}.pdf`);
    }

    // Convertir URL cloudinary a Base64
    async function imageUrlToBase64(url) {
        if (!url) return null;

        try {
            const response = await fetch(url);
            const blob = await response.blob();

            return await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error("Error cargando imagen:", error);
            return null;
        }
    }

    // Función PDF Productos
    async function downloadProductsPDF(businessId) {
        if (!businessId) {
            showToast("No se encontró negocio activo.", "error");
            return;
        }

        const {
            data: products,
            error
        } = await supabaseClient
        .from("products")
        .select("*")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .order("category", {
            ascending: true
        })
        .order("name", {
            ascending: true
        });

        if (error) {
            console.error(error);
            showToast("No se pudieron cargar los productos.", "error");
            return;
        }

        if (!products || products.length === 0) {
            showToast("No hay productos para generar PDF.", "warning");
            return;
        }

        const {
            jsPDF
        } = window.jspdf;
        const doc = new jsPDF("p", "mm", "a4");
        let logoBase64 = null;

        try {
            logoBase64 = await loadImageAsBase64("./assets/logo-oasis-puro.png");
        } catch (error) {
            console.warn("No se pudo cargar el logo para el PDF:", error);
        }

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        let y = 18;

        doc.setFillColor(14, 165, 233);
        doc.rect(0, 0, pageWidth, 36, "F");

        if (logoBase64) {
            doc.addImage(
                logoBase64,
                "PNG",
                14,
                8,
                18,
                18
            );
        }

        const titleX = logoBase64 ? 38: 14;

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text("Oasis Puro", titleX, 15);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text("Catálogo de productos", titleX, 22);

        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(`Generado: ${new Date().toLocaleString("es-MX")}`, 14, 45);

        y = 55;

        for (const product of products) {
            if (y > pageHeight - 45) {
                doc.addPage();
                y = 18;
            }

            const imageUrl = product.image_url
            ? getCloudinaryImage(product.image_url, {
                width: 300, crop: "fit"
            }): null;

            const imageBase64 = await imageUrlToBase64(imageUrl);

            doc.setDrawColor(220, 230, 240);
            doc.roundedRect(14, y, pageWidth - 28, 38, 4, 4);

            if (imageBase64) {
                doc.addImage(imageBase64, "JPEG", 18, y + 4, 28, 28);
            } else {
                doc.setFontSize(18);
                doc.text("💧", 27, y + 22);
            }

            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.text(
                `${product.brand ? product.brand + " · ": ""}${product.name}`,
                52,
                y + 10,
                {
                    maxWidth: 130
                }
            );

            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.text(
                `${getProductCategoryLabel(product.category)} · ${product.presentation || "—"}`,
                52,
                y + 17
            );

            doc.text(`Compra: ${formatCurrency(product.cost_price)}`, 52, y + 25);
            doc.text(`Venta: ${formatCurrency(product.sale_price)}`, 100, y + 25);

            doc.setFont("helvetica", "bold");
            doc.text(`Stock: ${product.stock || 0}`, 150, y + 25);

            doc.setFont("helvetica", "normal");
            doc.text(`Mín: ${product.min_stock || 0}`, 150, y + 32);

            y += 44;
        }

        doc.save("catalogo-productos-Oasis Puro.pdf");
    }


    //PDF Individual Pedidos
    async function downloadSingleOrderPDF(orderId) {
        if (!window.jspdf) {
            showToast("jsPDF no está cargado.", "error");
            return;
        }

        const {
            jsPDF
        } = window.jspdf;
        const doc = new jsPDF("p", "mm", "letter");

        if (typeof doc.autoTable !== "function") {
            showToast("autoTable no está cargado.", "error");
            return;
        }

        const {
            data: order,
            error
        } = await supabaseClient
        .from("orders")
        .select(`
            id,
            order_number,
            status,
            total_sale,
            total_cost,
            total_profit,
            created_at,
            clients (
            name,
            whatsapp,
            address
            ),
            profiles (
            full_name
            ),
            order_items (
            product_name,
            quantity,
            sale_price,
            cost_price
            )
            `)
        .eq("id", orderId)
        .maybeSingle();

        if (error || !order) {
            console.error(error);
            showToast("No se pudo cargar el pedido.", "error");
            return;
        }

        let logoBase64 = null;

        try {
            logoBase64 = await loadImageAsBase64("./assets/logo-oasis-puro.png");
        } catch (error) {
            console.warn("No se pudo cargar el logo para el PDF:", error);

            showToast(
                "Logo no encontrado",
                "warning"
            );

        }

        doc.setFillColor(14, 165, 233);
        doc.rect(0, 0, 216, 38, "F");

        if (logoBase64) {
            doc.addImage(logoBase64, "PNG", 16, 8, 18, 18);
        }

        const titleX = logoBase64 ? 40: 16;

        const statusLabels = {
            pendiente: "Pendiente",
            en_proceso: "En proceso",
            entregado: "Entregado",
            pagado: "Pagado",
            cancelado: "Cancelado"
        };

        const statusLabel =
        statusLabels[
            order.status
        ] || order.status || "—";

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text("Oasis Puro", titleX, 16);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Comprobante de pedido", titleX, 23);

        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text(`Pedido #${String(order.order_number || 0).padStart(4, "0")}`, 16, 50);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(`Cliente: ${order.clients?.name || "Sin cliente"}`, 16, 60);
        doc.text(`WhatsApp: ${order.clients?.whatsapp || "—"}`, 16, 66);
        doc.text(`Domicilio: ${order.clients?.address || "—"}`, 16, 72);
        doc.text(`Vendedor: ${order.profiles?.full_name || "—"}`, 16, 78);
        doc.text(`Fecha: ${formatDate(order.created_at)}`, 16, 84);
        doc.text(
            `Estatus: ${statusLabel}`,
            16,
            90
        );

        const rows = (order.order_items || []).map(item => {
            const quantity = Number(item.quantity || 0);
            const salePrice = Number(item.sale_price || 0);
            const subtotalSale = quantity * salePrice;

            return [
                item.product_name || "Producto",
                quantity,
                formatCurrency(salePrice),
                formatCurrency(subtotalSale),
            ];
        });

        doc.autoTable({
            startY: 100,
            head: [["Producto", "Cantidad", "Precio", "Subtotal"]],
            body: rows.length ? rows: [["Sin productos", "—", "—", "—"]],
            theme: "grid",
            headStyles: {
                fillColor: [14, 165, 233],
                textColor: 255,
                fontStyle: "bold",
            },
            styles: {
                fontSize: 9,
                cellPadding: 3,
            },
        });

        const finalY = doc.lastAutoTable.finalY + 10;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("Resumen", 16, finalY);

        doc.autoTable({
            startY: finalY + 5,
            body: [
                ["Venta total", formatCurrency(order.total_sale || 0)],
                ["Costo total", formatCurrency(order.total_cost || 0)],
                ["Ganancia", formatCurrency(order.total_profit || 0)],
            ],
            theme: "plain",
            styles: {
                fontSize: 11,
                cellPadding: 3,
            },
            columnStyles: {
                0: {
                    fontStyle: "bold"
                },
                1: {
                    halign: "right"
                },
            },
        });

        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text("Generado por Oasis Puro", 16, 270);

        const fileName =
        `Pedido-Oasis Puro-${
        String(
            order.order_number || 0
        ).padStart(4, "0")
        }.pdf`;

        const pdfBlob =
        doc.output(
            "blob"
        );

        await sharePDFToWhatsApp(
            pdfBlob,
            fileName,
            order
        );
    }

    // Helper Compartir PDF WhatsApp
    async function sharePDFToWhatsApp(blob, fileName, order) {
        const rawPhone = order.clients?.whatsapp || "";
        const cleanPhone = rawPhone.replace(/\D/g, "");

        if (!cleanPhone) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");

            a.href = url;
            a.download = fileName;
            a.click();

            setTimeout(() => URL.revokeObjectURL(url), 1000);

            showToast("Cliente sin WhatsApp. PDF descargado.", "warning");
            return;
        }

        const file = new File([blob], fileName, {
            type: "application/pdf"
        });

        const message = `🧾 Pedido #${String(order.order_number || 0).padStart(4, "0")}

        Cliente: ${order.clients?.name || "Cliente"}
        Total: ${formatCurrency(order.total_sale || 0)}

        Te comparto el comprobante de tu pedido.`;

        const whatsappUrl = `https://wa.me/52${cleanPhone}?text=${encodeURIComponent(message)}`;

        window.open(whatsappUrl, "_blank");

        if (navigator.canShare && navigator.canShare({
            files: [file]
        })) {
            showSharePDFModal(file, message);
            return;
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");

        a.href = url;
        a.download = fileName;
        a.click();

        setTimeout(() => URL.revokeObjectURL(url), 1000);

        showToast("WhatsApp abierto. PDF descargado para adjuntarlo.", "warning");
    }

    // Modal Compartir PDF WhatsApp
    function showSharePDFModal(file, message) {
        const modal = document.createElement("div");

        modal.className = "cancel-order-backdrop";

        modal.innerHTML = `
        <div class="cancel-order-modal">
        <div class="cancel-order-icon">🧾</div>

        <h2>PDF listo</h2>

        <p>
        El comprobante ya fue generado.
        <br>
        Toca compartir para enviarlo por WhatsApp.
        </p>

        <div class="cancel-order-buttons">
        <button class="cancel-order-close">
        Cerrar
        </button>

        <button class="cancel-order-confirm">
        Compartir
        </button>
        </div>
        </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector(".cancel-order-close").onclick = () => {
            modal.remove();
        };

        modal.querySelector(".cancel-order-confirm").onclick = async () => {
            try {
                await navigator.share({
                    title: "Pedido Oasis Puro",
                    text: message,
                    files: [file]
                });

                modal.remove();
                showToast("PDF compartido.", "success");

            } catch (error) {
                console.error(error);
                showToast("No se pudo compartir.", "error");
            }
        };
    }

    // Registrar Movimientos Inventario
    async function registerInventoryMovement( {
        businessId,
        userId = null,
        productId,
        movementType,
        quantity,
        stockBefore,
        stockAfter,
        referenceType = null,
        referenceId = null,
        notes = null
    }) {
        const {
            data: authData
        } = await supabaseClient.auth.getUser();

        const finalUserId =
        userId ||
        authData?.user?.id ||
        null;

        console.log("MOVIMIENTO INVENTARIO:", {
            movementType,
            quantity,
            stockBefore,
            stockAfter
        });

        const {
            error
        } = await supabaseClient
        .from("inventory_movements")
        .insert({
            business_id: businessId,
            user_id: finalUserId,
            product_id: productId,
            movement_type: movementType,
            quantity,
            stock_before: stockBefore,
            stock_after: stockAfter,
            reference_type: referenceType,
            reference_id: referenceId,
            notes
        });

        if (error) throw error;
    }

    // Historial Movimiento Cancelar Pedido
    async function restoreInventoryFromCancelledOrder(orderId, businessId, profile) {
        const {
            data: orderItems,
            error
        } = await supabaseClient
        .from("order_items")
        .select("product_id, product_name, quantity")
        .eq("order_id", orderId);

        if (error) throw error;

        if (!orderItems || orderItems.length === 0) return;

        const productIds = orderItems
        .map(item => item.product_id)
        .filter(Boolean);

        const {
            data: products,
            error: productsError
        } = await supabaseClient
        .from("products")
        .select("id, stock")
        .eq("business_id", businessId)
        .in("id", productIds);

        if (productsError) throw productsError;

        const productsMap = new Map(
            (products || []).map(product => [
                product.id,
                Number(product.stock || 0)
            ])
        );

        for (const item of orderItems) {
            const stockBefore = productsMap.get(item.product_id) || 0;
            const quantity = Number(item.quantity || 0);
            const stockAfter = stockBefore + quantity;

            const {
                error: updateError
            } = await supabaseClient
            .from("products")
            .update({
                stock: stockAfter
            })
            .eq("id", item.product_id)
            .eq("business_id", businessId);

            if (updateError) throw updateError;

            await registerInventoryMovement( {
                businessId,
                userId: profile?.id,
                productId: item.product_id,
                movementType: "entrada",
                quantity,
                stockBefore,
                stockAfter,
                referenceType: "order",
                referenceId: orderId,
                notes: "Inventario restaurado por cancelación de pedido"
            });
        }
    }


    // Vista Historial Inventario
    async function renderInventoryHistoryView(profile, activeBusiness) {

        const app = document.querySelector("#app");
        const businessId = activeBusiness?.businesses?.id;

        app.innerHTML = `
        <section class="has-bottom-nav min-h-screen bg-transparent px-4 py-6">
        <div class="max-w-5xl mx-auto space-y-4">

        <header class="aqua-card inventory-history-header p-5 space-y-4">

        <button
        id="back-products"
        type="button"
        class="history-back-btn"
        >
        ← Volver a productos
        </button>


        <div class="inventory-history-hero-icon">
        <img src="./assets/icons/archivo.svg" alt="Historial">
        </div>

        <div class="inventory-history-title-row">
        <div>
        <p class="text-sm text-slate-500 dark:text-slate-400">
        Inventario
        </p>

        <h1 class="text-3xl font-black leading-tight">
        Historial de movimientos
        </h1>

        <p class="text-sm text-slate-500 dark:text-slate-400 mt-2">
        Entradas, salidas, ventas y ajustes de stock.
        </p>
        </div>
        </div>

        <div class="inventory-history-filters">
        <select id="inventory-filter" class="form-control">
        <option value="">Todos</option>
        <option value="entrada">Entradas</option>
        <option value="salida">Salidas</option>
        <option value="ajuste">Ajustes</option>
        </select>

        <div
        id="inventory-global-summary"
        class="inventory-global-summary"
        >
        </div>

        <input
        id="inventory-search"
        class="form-control"
        placeholder="Buscar producto..."
        />
        </div>

        </header>

        <section class="aqua-card p-5">
        <div id="inventory-history-list" class="space-y-3">
        Cargando...
        </div>
        </section>

        ${renderBottomNav("products")}

        </div>
        </section>
        `;

        bindBottomNav(profile, activeBusiness);

        document
        .querySelector("#back-products")
        ?.addEventListener(
            "click",
            () => renderProductsView(profile, activeBusiness)
        );

        await loadInventoryHistory(
            businessId
        );

        document
        .querySelector("#inventory-filter")
        ?.addEventListener(
            "change",
            () =>
            loadInventoryHistory(
                businessId
            )
        );

        document
        .querySelector("#inventory-search")
        ?.addEventListener(
            "input",
            () =>
            loadInventoryHistory(
                businessId
            )
        );

        document.querySelectorAll(".inventory-movement-card").forEach(card => {
            card.addEventListener("click", () => {
                const movementId = card.dataset.movementId;
                const movement = inventoryMovementsCache.find(item => item.id === movementId);

                if (movement) {
                    openInventoryMovementModal(movement);
                }
            });
        });
    }

    let inventoryMovementsCache = [];

    //Cargar Historial Inventario
    async function loadInventoryHistory(
        businessId
    ) {

        const container =
        document.querySelector(
            "#inventory-history-list"
        );

        try {

            const filter =
            document.querySelector(
                "#inventory-filter"
            )?.value;

            const search =
            document.querySelector(
                "#inventory-search"
            )?.value
            ?.trim()
            ?.toLowerCase();

            let query =
            supabaseClient
            .from(
                "inventory_movements"
            )
            .select(`
                *,
                products (
                name,
                brand,
                presentation
                ),
                profiles (
                full_name
                )
                `)
            .eq(
                "business_id",
                businessId
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );

            if (filter) {
                query =
                query.eq(
                    "movement_type",
                    filter
                );
            }

            const {
                data,
                error
            } =
            await query;

            if (error)
                throw error;

            inventoryMovementsCache = data || [];

            const filtered =
            (data || [])
            .filter(item => {

                if (!search)
                    return true;

                return (
                    item.products
                    ?.name
                    ?.toLowerCase()
                    ?.includes(
                        search
                    )
                );

            });

            const summaryContainer = document.querySelector("#inventory-global-summary");

            if (summaryContainer) {
                summaryContainer.innerHTML = renderInventoryGlobalSummary(filtered);
            }

            if (
                filtered.length === 0
            ) {

                container.innerHTML =
                `
                <div class="text-center text-slate-400 py-10">
                Sin movimientos
                </div>
                `;

                return;

            }

            const grouped = groupMovementsByDate(filtered);

            container.innerHTML = Object.entries(grouped)
            .map(([dateKey, movements]) => {

                const totalEntries = movements
                .filter(item => item.movement_type === "entrada")
                .reduce((sum, item) => sum + Math.abs(Number(item.quantity || 0)), 0);

                const totalExits = movements
                .filter(item => item.movement_type === "salida")
                .reduce((sum, item) => sum + Math.abs(Number(item.quantity || 0)), 0);

                const totalAdjustments = movements
                .filter(item => item.movement_type === "ajuste")
                .length;

                let timelineStatusClass = "timeline-balanced";

                if (totalEntries > totalExits) {
                    timelineStatusClass = "timeline-entry-day";
                } else if (totalExits > totalEntries) {
                    timelineStatusClass = "timeline-exit-day";
                } else if (totalEntries === 0 && totalExits === 0 && totalAdjustments > 0) {
                    timelineStatusClass = "timeline-adjust-day";
                }

                return `
                <section class="inventory-timeline-group ${timelineStatusClass}">

                <div class="inventory-timeline-date">
                <span>${formatTimelineDate(dateKey)}</span>
                <small>${movements.length} movimientos</small>
                </div>

                <div class="timeline-date-summary">

                <span class="timeline-summary-entry">
                <img src="./assets/icons/abajo.svg">
                +${totalEntries}
                </span>

                <span class="timeline-summary-exit">
                <img src="./assets/icons/arriba.svg">
                -${totalExits}
                </span>

                ${totalAdjustments > 0 ? `
                <span class="timeline-summary-adjust">
                <img src="./assets/icons/ajuste.svg">
                ${totalAdjustments}
                </span>
                `: ""}

                </div>

                <div class="inventory-timeline-list">
                ${movements.map(item => renderInventoryMovementCard(item)).join("")}
                </div>

                </section>
                `;

            })
            .join("");

        }

        catch (
            error
        ) {

            console.error(
                error
            );

            container.innerHTML =
            `
            Error al cargar.
            `;

        }

    }

    // Helper Timeline Historial de Inventario
    function formatTimelineDate(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date();

        yesterday.setDate(today.getDate() - 1);

        const dateKey = date.toISOString().slice(0,
            10);
        const todayKey = today.toISOString().slice(0,
            10);
        const yesterdayKey = yesterday.toISOString().slice(0,
            10);

        if (dateKey === todayKey) return "Hoy";
        if (dateKey === yesterdayKey) return "Ayer";

        return date.toLocaleDateString("es-MX", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    }

    function groupMovementsByDate(movements) {
        return movements.reduce((groups, item) => {
            const key = item.created_at?.slice(0, 10) || "sin-fecha";

            if (!groups[key]) {
                groups[key] = [];
            }

            groups[key].push(item);

            return groups;
        },
            {});
    }

    // Pintado Tarjetas Historial Inventario
    function renderInventoryMovementCard(item) {
        const isEntrada = item.movement_type === "entrada";
        const isSalida = item.movement_type === "salida";

        const movementLabel = isEntrada
        ? "Entrada": isSalida
        ? "Salida": "Ajuste";

        const movementClass = isEntrada
        ? "movement-entry": isSalida
        ? "movement-sale": "movement-edit";

        const movementIcon = isEntrada
        ? "./assets/icons/abajo.svg": isSalida
        ? "./assets/icons/arriba.svg": "./assets/icons/ajuste.svg";

        const movementSign = isEntrada ? "+": isSalida ? "-": "±";

        const originLabel = getMovementOriginLabel(item);

        const originClass = getMovementOriginClass(originLabel);

        const userName =
        item.profiles?.full_name || "Usuario no disponible";

        const stockText =
        item.stock_before !== null && item.stock_after !== null
        ? `<p>Stock: ${item.stock_before} → ${item.stock_after}</p>`: `
        <span class="inventory-history-empty">
        🕘 Stock histórico no disponible
        </span>
        `;

        return `
        <div class="inventory-movement-card" data-movement-id="${item.id}">

        <div class="inventory-movement-top">

        <div>
        <span class="movement-chip ${movementClass}">
        <img
        src="${movementIcon}"
        class="movement-chip-icon"
        alt=""
        >
        ${movementLabel}
        </span>

        <h3 class="inventory-movement-product">
        ${item.products?.brand || ""} ${item.products?.name || "-"}
        </h3>

        <p class="inventory-movement-presentation">
        ${item.products?.presentation || ""}
        </p>
        </div>


        </div>

        <div class="inventory-movement-footer">
        ${stockText}

        <div class="movement-meta-under-stock">
        <div class="movement-origin ${originClass}">
        <span>${getMovementOriginIcon(originLabel)}</span>
        <strong>${originLabel}</strong>
        </div>

        <div class="movement-user movement-user-under-date">
        <span>👤</span>
        <span>${userName}</span>
        </div>
        </div>

        <p class="movement-time">
        <div class="movement-date">
        ${formatDateTime(item.created_at)}
        </div>

        <div class="movement-relative-time">
        ⏱ ${getRelativeTime(item.created_at)}
        </div>

        </p>
        </div>

        </div>
        `;
    }

    // Modal Historial de Movimientos
    function openInventoryMovementModal(item) {
        const isEntrada = item.movement_type === "entrada";
        const isSalida = item.movement_type === "salida";

        const movementLabel = isEntrada ? "Entrada": isSalida ? "Salida": "Ajuste";
        const movementSign = isEntrada ? "+": isSalida ? "-": "±";

        const originLabel = getMovementOriginLabel(item);
        const userName = item.profiles?.full_name || "Usuario no disponible";

        const productName = `${item.products?.brand || ""} ${item.products?.name || "Producto"}`.trim();
        const presentation = item.products?.presentation || "—";

        const stockBefore = item.stock_before ?? "—";
        const stockAfter = item.stock_after ?? "—";

        const modal = document.createElement("div");
        modal.className = "inventory-detail-modal-backdrop";

        modal.innerHTML = `
        <div class="inventory-detail-modal">
        <button class="inventory-detail-close" type="button">×</button>

        <p class="text-sm text-slate-500 dark:text-slate-400">Detalle de movimiento</p>

        <h2>${productName}</h2>
        <p class="inventory-detail-presentation">${presentation}</p>

        <div class="inventory-detail-main ${isEntrada ? "movement-entry": isSalida ? "movement-sale": "movement-edit"}">
        ${movementSign}${item.quantity}
        </div>

        <div class="inventory-detail-grid">
        <div>
        <span>Tipo</span>
        <strong>${movementLabel}</strong>
        </div>

        <div>
        <span>Stock</span>
        <strong>${stockBefore} → ${stockAfter}</strong>
        </div>

        <div>
        <span>Origen</span>
        <strong>${originLabel}</strong>
        </div>

        <div>
        <span>Usuario</span>
        <strong>${userName}</strong>
        </div>

        <div>
        <span>Fecha</span>
        <strong>${formatDateTime(item.created_at)}</strong>
        </div>

        <div>
        <span>Hace</span>
        <strong>${getRelativeTime(item.created_at)}</strong>
        </div>
        </div>

        ${item.notes ? `
        <div class="inventory-detail-notes">
        <span>Notas</span>
        <p>${item.notes}</p>
        </div>
        `: ""}
        </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector(".inventory-detail-close").addEventListener("click",
            () => {
                modal.remove();
            });

        modal.addEventListener("click",
            event => {
                if (event.target === modal) {
                    modal.remove();
                }
            });
    }

    // Etiqueta Origen Movimiento
    function getMovementOriginLabel(item) {
        const notes = (item.notes || "").toLowerCase();
        const referenceType = item.reference_type;

        if (referenceType === "order") {
            if (notes.includes("cancel")) {
                return "Cancelación de pedido";
            }

            if (notes.includes("edición") || notes.includes("edicion")) {
                return "Edición de pedido";
            }

            return "Pedido";
        }

        if (referenceType === "product") {
            return "Reabastecimiento";
        }

        if (referenceType === "adjustment") {
            return "Ajuste manual";
        }

        if (notes.includes("reabaste")) {
            return "Reabastecimiento";
        }

        if (notes.includes("pedido")) {
            return "Pedido";
        }

        return "Movimiento manual";
    }

    // Función Colorido Movimientos
    function getMovementOriginClass(originLabel) {
        const origin = (originLabel || "").toLowerCase();

        if (origin.includes("pedido") && origin.includes("edición")) {
            return "origin-edit";
        }

        if (origin.includes("edición") || origin.includes("edicion")) {
            return "origin-edit";
        }

        if (origin.includes("cancel")) {
            return "origin-cancel";
        }

        if (origin.includes("reabaste")) {
            return "origin-restock";
        }

        if (origin.includes("ajuste")) {
            return "origin-adjust";
        }

        if (origin.includes("pedido")) {
            return "origin-order";
        }

        return "origin-manual";
    }

    // Funcion Helper Iconos
    function getMovementOriginIcon(originLabel) {
        const origin = (originLabel || "").toLowerCase();

        if (origin.includes("edición") || origin.includes("edicion")) return "✏️";
        if (origin.includes("cancel")) return "↩️";
        if (origin.includes("reabaste")) return "📥";
        if (origin.includes("ajuste")) return "⚙️";
        if (origin.includes("pedido")) return "📦";

        return "📝";
    }

    function renderInventoryGlobalSummary(movements) {
        const totalMovements = movements.length;

        const totalEntries = movements
        .filter(item => item.movement_type === "entrada")
        .reduce((sum, item) => sum + Math.abs(Number(item.quantity || 0)),
            0);

        const totalExits = movements
        .filter(item => item.movement_type === "salida")
        .reduce((sum, item) => sum + Math.abs(Number(item.quantity || 0)),
            0);

        const totalAdjustments = movements
        .filter(item => item.movement_type === "ajuste")
        .length;
        return `
        <div class="inventory-summary-card">
        <span>Movimientos</span>
        <strong>${totalMovements}</strong>
        </div>

        <div class="inventory-summary-card summary-entry">
        <span>Entradas</span>
        <strong>+${totalEntries}</strong>
        </div>

        <div class="inventory-summary-card summary-exit">
        <span>Salidas</span>
        <strong>-${totalExits}</strong>
        </div>

        <div class="inventory-summary-card summary-adjust">
        <span>Ajustes</span>
        <strong>${totalAdjustments}</strong>
        </div>
        `;
    }

});