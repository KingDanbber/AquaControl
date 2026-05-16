import {
    applyTheme,
    getSavedTheme,
    toggleTheme,
    showToast,
    setButtonLoading,
    clearLocalSession,
    formatCurrency,
    formatDate
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
        src="./assets/logo-aquacontrol.png"
        alt="AquaControl Logo"
        class="w-20 h-20 object-contain mb-3"
        onerror="this.style.display='none'"
        />

        <h1 class="text-3xl font-bold tracking-tight text-white">AquaControl</h1>

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
        AquaControl · Versión inicial
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
        Accede a AquaControl con tu correo y contraseña.
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
        Registra un administrador para usar AquaControl.
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

    /* =========================
   DASHBOARD TEMPORAL
========================= */

    function renderDashboardPlaceholder(profile = null, activeBusiness = null, businesses = []) {
        const app = document.querySelector("#app");

        app.innerHTML = `
        <section class="has-bottom-nav min-h-screen bg-transparent px-4 py-6">
        <div class="max-w-5xl mx-auto space-y-4">

        <header class="aqua-card p-5 space-y-4">

        <div class="flex items-start justify-between gap-4">
        <div>
        <p class="text-sm text-slate-500 dark:text-slate-400">
        AquaControl
        </p>

        <h1 class="text-3xl font-black leading-tight">
        ${activeBusiness?.businesses?.name || "AquaControl"}
        </h1>
        </div>

        <div class="flex items-center gap-2">
        <button
        id="theme-toggle-dashboard"
        class="icon-action-button"
        title="Cambiar tema"
        >
        <img src="./assets/icons/theme.svg" alt="Tema">
        </button>

        <button
        id="btn-logout"
        class="icon-action-button danger"
        title="Cerrar sesión"
        >
        <img src="./assets/icons/logout.svg" alt="Salir">
        </button>
        </div>
        </div>

        <div class="dashboard-user-info">
        <p class="text-sm text-slate-500 dark:text-slate-400">
        Bienvenido, ${profile?.full_name || "Usuario"}
        </p>

        <p id="dashboard-current-date" class="dashboard-info-line">
        —
        </p>

        <p id="dashboard-weather" class="dashboard-info-line">
        <span id="weather-icon">🌡️</span>
        <span id="weather-temp">--°C</span>
        <span id="weather-desc">Cargando clima...</span>
        </p>

        <p class="dashboard-role-badge">
        Rol: ${profile?.role || "admin"}
        </p>
        </div>

        </header>

        <section class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="aqua-card p-5">
        <p class="text-sm text-slate-500 dark:text-slate-400">Ventas hoy</p>
        <h2 id="dashboard-sales-today" class="text-2xl font-bold mt-1">$0.00</h2>
        </div>

        <div class="aqua-card p-5">
        <p class="text-sm text-slate-500 dark:text-slate-400">Pedidos</p>
        <h2 id="dashboard-orders-today" class="text-2xl font-bold mt-1">0</h2>
        </div>

        <div class="aqua-card p-5">
        <p class="text-sm text-slate-500 dark:text-slate-400">Gastos mes</p>
        <h2 id="dashboard-expenses-month" class="text-2xl font-bold mt-1">$0.00</h2>
        </div>
        </section>

        <section class="grid grid-cols-2 gap-4">

        <button id="quick-orders" class="aqua-card p-5 text-left active:scale-[0.98]">
        <p class="text-sm text-slate-500 dark:text-slate-400">Pedidos</p>
        <h2 class="text-xl font-bold mt-2">Registrar</h2>
        <p id="quick-orders-count" class="text-sm text-sky-600 dark:text-sky-400 font-bold mt-2">
        0 pedidos hoy
        </p>
        </button>

        <button id="quick-products" class="aqua-card p-5 text-left active:scale-[0.98]">
        <p class="text-sm text-slate-500 dark:text-slate-400">Productos</p>
        <h2 class="text-xl font-bold mt-2">Inventario</h2>
        <p id="quick-products-count" class="text-sm text-sky-600 dark:text-sky-400 font-bold mt-2">
        0 productos
        </p>
        </button>

        <button id="quick-expenses" class="aqua-card p-5 text-left active:scale-[0.98]">
        <p class="text-sm text-slate-500 dark:text-slate-400">Gastos</p>
        <h2 class="text-xl font-bold mt-2">Registrar</h2>
        <p id="quick-expenses-total" class="text-sm text-sky-600 dark:text-sky-400 font-bold mt-2">
        $0.00 este mes
        </p>
        </button>

        <button id="quick-reports" class="aqua-card p-5 text-left active:scale-[0.98]">
        <p class="text-sm text-slate-500 dark:text-slate-400">Reportes</p>
        <h2 class="text-xl font-bold mt-2">Mensuales</h2>
        <p id="quick-reports-profit" class="text-sm text-sky-600 dark:text-sky-400 font-bold mt-2">
        $0.00 ganancia
        </p>
        </button>

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

        <section class="aqua-card p-5">
        <div class="flex items-center justify-between gap-3 mb-4">
        <div>
        <p class="text-sm text-slate-500 dark:text-slate-400">
        Actividad
        </p>

        <h2 class="text-xl font-bold">
        Últimos movimientos
        </h2>
        </div>
        </div>

        <div id="dashboard-recent-movements" class="space-y-3">
        <p class="text-sm text-slate-500 dark:text-slate-400">
        Cargando movimientos...
        </p>
        </div>
        </section>

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

    /* =================
    Función Sección Productos
    ================== */

    async function renderProductsView(profile, activeBusiness) {
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
        </header>

        <section id="products-list" class="space-y-3">
        <div class="aqua-card p-5">
        <p class="text-sm text-slate-500 dark:text-slate-400">Cargando productos...</p>
        </div>
        </section>

        ${renderBottomNav("products")}
        </div>
        </section>
        `;

        bindBottomNav(profile, activeBusiness);
        document.querySelector("#btn-new-product")?.addEventListener("click", () => {
            renderProductForm(profile, activeBusiness);
        });

        await loadProducts(profile, activeBusiness, activeBusiness?.businesses?.id);
    }

    // Función Cargar Productos

    async function loadProducts(profile, activeBusiness, businessId) {
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
            <div class="aqua-card p-5 text-center">
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

            return `
            <article class="aqua-card product-card p-5">

            <div class="flex items-start justify-between gap-4">

            <div class="min-w-0">
            <p class="text-xs font-bold uppercase tracking-wide text-sky-600 dark:text-sky-400">
            ${product.category || "Sin categoría"} · ${product.presentation || "—"}
            </p>

            <h2 class="text-2xl font-bold mt-2 leading-tight">
            ${product.brand ? `<span class="text-slate-500 dark:text-slate-400">${product.brand}</span> · `: ""}
            ${product.name}
            </h2>
            </div>

            </div>

            <div class="grid grid-cols-2 gap-3 mt-5">
            <div class="product-price-box">
            <p class="text-xs text-slate-500 dark:text-slate-400">Compra</p>
            <p class="text-lg font-bold">${formatCurrency(product.cost_price)}</p>
            </div>

            <div class="product-price-box">
            <p class="text-xs text-slate-500 dark:text-slate-400">Venta</p>
            <p class="text-lg font-bold">${formatCurrency(product.sale_price)}</p>
            </div>
            </div>

            <div class="mt-4 grid grid-cols-2 gap-3 text-sm">

            <!-- STOCK INICIAL -->
            <div class="
            rounded-2xl
            bg-sky-100/90
            border border-sky-200
            p-3
            shadow-sm
            dark:bg-sky-900/30
            dark:border-sky-800
            ">
            <p class="
            text-xs
            font-semibold
            text-sky-700
            dark:text-sky-300
            ">
            Stock inicial
            </p>

            <p class="
            mt-1
            text-2xl
            font-black
            text-slate-800
            dark:text-white
            ">
            ${product.initial_stock || 0}
            </p>
            </div>

            <!-- STOCK ACTUAL -->
            <div class="
            rounded-2xl
            bg-emerald-100/90
            border border-emerald-200
            p-3
            shadow-sm
            dark:bg-emerald-900/30
            dark:border-emerald-800
            ">
            <p class="
            text-xs
            font-semibold
            text-emerald-700
            dark:text-emerald-300
            ">
            Stock actual
            </p>

            <p class="
            mt-1
            text-2xl
            font-black
            text-slate-800
            dark:text-white
            ">
            ${product.stock || 0}
            </p>
            </div>

            </div>

            <div class="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span>Stock mínimo: ${product.min_stock || 0}</span>
            <span>${isLowStock ? "⚠️ Inventario bajo": "✅ Disponible"}</span>
            </div>

            <button
            type="button"
            class="btn-restock-product w-full mt-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl py-3 font-semibold"
            data-product-id="${product.id}"
            data-product-name="${product.name}"
            data-product-brand="${product.brand || ""}"
            data-product-presentation="${product.presentation || ""}"
            data-product-stock="${product.stock || 0}"
            data-product-initial-stock="${product.initial_stock || 0}"
            >
            + Reabastecer
            </button>

            </article>
            `;
        }).join("");

        document.querySelectorAll(".btn-restock-product").forEach(button => {
            button.addEventListener("click", () => {
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
                is_active: true
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

    // Función Sección Pedidos

    async function renderOrdersView(profile,
        activeBusiness) {
        const app = document.querySelector("#app");

        app.innerHTML = `
        <section class="has-bottom-nav min-h-screen bg-slate-100 bg-transparent px-4 py-6">
        <div class="max-w-5xl mx-auto space-y-4">

        <header class="aqua-card p-5 flex flex-col gap-4">
        <div>
        <p class="text-sm text-slate-500 dark:text-slate-400">Módulo</p>
        <h1 class="text-2xl font-bold">Pedidos</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
        Registro y tabla de pedidos del negocio.
        </p>
        </div>

        <button
        id="btn-new-order"
        class="w-full bg-sky-600 hover:bg-sky-500 text-white rounded-2xl py-3 font-semibold"
        >
        + Nuevo pedido
        </button>
        <button
        id="btn-download-orders-pdf"
        class="w-full bg-white/80 dark:bg-slate-900 border border-sky-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl py-3 font-semibold flex items-center justify-center gap-2"
        >
        <img src="./assets/icons/download-file.svg" class="w-6 h-6" alt="Descargar">
        Descargar PDF de pedidos
        </button>
        </header>

        <section class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="aqua-card p-5">
        <p class="text-sm text-slate-500 dark:text-slate-400">Pedidos hoy</p>
        <h2 id="orders-today-count" class="text-2xl font-bold mt-1">0</h2>
        </div>

        <div class="aqua-card p-5">
        <p class="text-sm text-slate-500 dark:text-slate-400">Ventas pedidos</p>
        <h2 id="orders-total-sale" class="text-2xl font-bold mt-1">$0.00</h2>
        </div>

        <div class="aqua-card p-5">
        <p class="text-sm text-slate-500 dark:text-slate-400">Ganancia</p>
        <h2 id="orders-total-profit" class="text-2xl font-bold mt-1">$0.00</h2>
        </div>
        </section>

        <section class="aqua-card p-5">
        <div class="flex items-center justify-between gap-3 mb-4">
        <div>
        <h2 class="text-lg font-bold">Tabla de pedidos</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400">
        Aquí aparecerán los pedidos registrados.
        </p>
        </div>
        </div>

        <div class="aqua-table-wrapper">
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

        await loadOrders(activeBusiness?.businesses?.id);
    }

    // Función Cargar pedidos

    async function loadOrders(businessId) {
        const tbody = document.querySelector("#orders-table-body");

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

    function renderOrderForm(profile, activeBusiness) {
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

        bindBottomNav(profile, activeBusiness);

        loadClientsForOrder(activeBusiness?.businesses?.id);

        document.querySelector("#back-orders")?.addEventListener("click", () => {
            renderOrdersView(profile, activeBusiness);
        });

        let orderItems = [];

        document.querySelector("#btn-add-order-item")?.addEventListener("click", async () => {
            await addOrderItemRow(activeBusiness?.businesses?.id, orderItems);
        });

        document.querySelector("#order-form")?.addEventListener("submit", async (event) => {
            event.preventDefault();

            await saveOrder(profile, activeBusiness);
        });
    }

    // Función Agregar Productos Pedidos

    async function addOrderItemRow(businessId, orderItems) {
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
                const newStock = item.stock - item.quantity;

                const {
                    error: stockError
                } = await supabaseClient
                .from("products")
                .update({
                    stock: newStock
                })
                .eq("id", item.product_id);

                if (stockError) throw stockError;

                const {
                    error: movementError
                } = await supabaseClient
                .from("inventory_movements")
                .insert({
                    business_id: businessId,
                    product_id: item.product_id,
                    user_id: profile.id,
                    movement_type: "salida",
                    quantity: item.quantity,
                    reason: `Salida por pedido #${order.order_number || ""}`
                });

                if (movementError) throw movementError;
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

    // Cargar Datos Dashboard

    async function loadDashboardStats(businessId) {
        if (!businessId) return;

        const today = new Date().toISOString().slice(0, 10);
        const currentMonth = new Date().toISOString().slice(0, 7);

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

            document.querySelector("#dashboard-sales-today").textContent = formatCurrency(salesToday);
            document.querySelector("#dashboard-orders-today").textContent = ordersToday.length;

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

        await loadRecentMovements(businessId);
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
            <div class="movement-card movement-order">
            <div class="movement-icon">📦</div>

            <div class="flex-1 min-w-0">
            <p class="font-bold text-slate-900 dark:text-white">
            Pedido #${String(order.order_number || 0).padStart(4, "0")}
            </p>

            <p class="text-sm text-slate-500 dark:text-slate-400 truncate">
            Cliente: ${order.clients?.name || "Sin cliente"}
            </p>
            </div>

            <div class="text-right">
            <p class="font-black text-sky-600 dark:text-sky-400">
            ${formatCurrency(order.total_sale || 0)}
            </p>

            <p class="movement-date">
            ${formatDate(order.created_at)}
            </p>
            </div>
            </div>
            `
        }));

        const expenseMovements = (expenses || []).map(expense => ({
            type: "expense",
            date: expense.created_at,
            html: `
            <div class="movement-card movement-expense">
            <div class="movement-icon">💸</div>

            <div class="flex-1 min-w-0">
            <p class="font-bold text-slate-900 dark:text-white">
            Gasto #${String(expense.expense_number || 0).padStart(4, "0")}
            </p>

            <p class="text-sm text-slate-500 dark:text-slate-400 truncate">
            ${expense.category || "Sin categoría"}
            </p>
            </div>

            <div class="text-right">
            <p class="font-black text-rose-600 dark:text-rose-400">
            ${formatCurrency(expense.total_amount || 0)}
            </p>

            <p class="movement-date">
            ${formatDate(expense.created_at)}
            </p>
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
            <p class="text-sm text-slate-500 dark:text-slate-400">
            Sin movimientos recientes.
            </p>
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

                await supabaseClient
                .from("inventory_movements")
                .insert({
                    business_id: businessId,
                    product_id: product.id,
                    user_id: profile.id,
                    movement_type: "entrada",
                    quantity,
                    reason: "Reabastecimiento de producto"
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

    // Añadir Logo al PDF
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

        const businessName = activeBusiness?.businesses?.name || "AquaControl";
        const adminName = profile?.full_name || "Administrador";
        const month = document.querySelector("#report-month")?.value || "";

        const sales = document.querySelector("#report-total-sales")?.textContent || "$0.00";
        const expenses = document.querySelector("#report-total-expenses")?.textContent || "$0.00";
        const profit = document.querySelector("#report-net-profit")?.textContent || "$0.00";
        const orders = document.querySelector("#report-orders-count")?.textContent || "0";
        const averageTicket = document.querySelector("#report-average-ticket")?.textContent || "$0.00";

        let logoBase64 = null;

        try {
            logoBase64 = await loadImageAsBase64("./assets/logo-aquacontrol.png");
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
        doc.text("AquaControl", titleX, 16);

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
                `AquaControl - Página ${i} de ${pageCount}`,
                16,
                270
            );
        }

        const fileName = `Reporte-AquaControl-${month || "mensual"}.pdf`;

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
        const businessName = activeBusiness?.businesses?.name || "AquaControl";
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
            logoBase64 = await loadImageAsBase64("./assets/logo-aquacontrol.png");
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
        doc.text("AquaControl", titleX, 14);

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
            doc.text(`AquaControl - Página ${i} de ${pageCount}`, 14, 205);
        }

        doc.save(`Pedidos-AquaControl-${new Date().toISOString().slice(0, 10)}.pdf`);
    }


});