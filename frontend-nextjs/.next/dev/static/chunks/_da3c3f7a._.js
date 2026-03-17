(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/lib/auth.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * ============================================================
 * STORE DE AUTENTICACIÓN (lib/auth.ts)
 * ============================================================
 * Estado global de autenticación usando Zustand.
 * Persiste token y usuario en localStorage.
 */ __turbopack_context__.s([
    "canDelete",
    ()=>canDelete,
    "canEditAudits",
    ()=>canEditAudits,
    "isSupervisorLevel",
    ()=>isSupervisorLevel,
    "useAuth",
    ()=>useAuth
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zustand/esm/react.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$middleware$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zustand/esm/middleware.mjs [app-client] (ecmascript)");
'use client';
;
;
const useAuth = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["create"])()((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$middleware$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["persist"])((set, get)=>({
        user: null,
        token: null,
        isAuthenticated: false,
        login: async (email, password)=>{
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email,
                        password
                    })
                });
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Login failed');
                }
                const data = await response.json();
                // Store token in localStorage for socket auth
                localStorage.setItem('token', data.token);
                // Store token in cookie for middleware auth
                document.cookie = `token=${data.token}; path=/; max-age=86400; SameSite=Lax`;
                set({
                    user: data.user,
                    token: data.token,
                    isAuthenticated: true
                });
                return data; // Return data for redirect logic
            } catch (error) {
                console.error('Login error:', error);
                throw error;
            }
        },
        register: async (userData)=>{
            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(userData)
                });
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || error.errors?.[0] || 'Error en el registro');
                }
            // Opcional: Auto-login tras registro o redirigir a login
            } catch (error) {
                console.error('Register error:', error);
                throw error;
            }
        },
        recoverPassword: async (email)=>{
            try {
                const response = await fetch('/api/auth/forgot-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email
                    })
                });
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Error al solicitar recuperación');
                }
            } catch (error) {
                console.error('Recover password error:', error);
                throw error;
            }
        },
        logout: ()=>{
            localStorage.removeItem('token');
            // Clear cookie
            document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            set({
                user: null,
                token: null,
                isAuthenticated: false
            });
        },
        setUser: (user, token)=>{
            localStorage.setItem('token', token);
            set({
                user,
                token,
                isAuthenticated: true
            });
        },
        updateUser: (userData)=>{
            const currentUser = get().user;
            if (currentUser) {
                set({
                    user: {
                        ...currentUser,
                        ...userData
                    }
                });
            }
        }
    }), {
    name: 'auth-storage'
}));
const isSupervisorLevel = (role)=>{
    if (!role) return false;
    const normalizedRole = role.toLowerCase();
    return normalizedRole === 'supervisor' || normalizedRole === 'encargado';
};
const canEditAudits = (role)=>{
    if (!role) return false;
    const normalizedRole = role.toLowerCase();
    return [
        'gerencia',
        'auditor',
        'supervisor',
        'encargado'
    ].includes(normalizedRole);
};
const canDelete = (role)=>{
    if (!role) return false;
    return role.toLowerCase() === 'gerencia';
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/utils.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "cn",
    ()=>cn
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/clsx/dist/clsx.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/tailwind-merge/dist/bundle-mjs.mjs [app-client] (ecmascript)");
;
;
function cn(...inputs) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["twMerge"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clsx"])(inputs));
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/dashboard/theme-provider.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * ============================================================
 * PROVEEDOR DE TEMA (theme-provider.tsx)
 * ============================================================
 * Context provider para manejo de tema claro/oscuro.
 * Controla acceso al modo oscuro por usuario permitido.
 */ __turbopack_context__.s([
    "ThemeProvider",
    ()=>ThemeProvider,
    "useTheme",
    ()=>useTheme
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
"use client";
;
const ThemeContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])(undefined);
/* Email del único usuario permitido para usar modo oscuro */ const ALLOWED_DARK_MODE_EMAIL = "ing.danielfandino@gmail.com";
function ThemeProvider({ children }) {
    _s();
    const [theme, setTheme] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("light");
    const [mounted, setMounted] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [canUseDarkMode, setCanUseDarkMode] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ThemeProvider.useEffect": ()=>{
            setMounted(true);
            // Verificar si el usuario puede usar modo oscuro
            // Zustand guarda en 'auth-storage' por el nombre configurado en persist
            const authStorageStr = localStorage.getItem('auth-storage');
            console.log('🔍 [THEME] Verificando permiso de dark mode...');
            if (authStorageStr) {
                try {
                    const authStorage = JSON.parse(authStorageStr);
                    const userEmail = authStorage?.state?.user?.email;
                    console.log('🔍 [THEME] Email del usuario:', userEmail);
                    console.log('🔍 [THEME] Email permitido:', ALLOWED_DARK_MODE_EMAIL);
                    const allowed = userEmail === ALLOWED_DARK_MODE_EMAIL;
                    setCanUseDarkMode(allowed);
                    console.log('🔍 [THEME] Puede usar dark mode?:', allowed);
                    if (allowed) {
                        // Solo cargar el tema guardado si el usuario tiene permiso
                        const savedTheme = localStorage.getItem("theme");
                        if (savedTheme) {
                            setTheme(savedTheme);
                            console.log('🔍 [THEME] Tema cargado desde localStorage:', savedTheme);
                        }
                    } else {
                        // Forzar tema claro para usuarios no autorizados
                        setTheme("light");
                        localStorage.setItem("theme", "light");
                        console.log('🔍 [THEME] Forzando tema claro (usuario sin permiso)');
                    }
                } catch (e) {
                    console.error('🔍 [THEME] Error parseando auth-storage:', e);
                    setTheme("light");
                }
            } else {
                console.log('🔍 [THEME] No hay auth-storage, usando tema claro');
                setTheme("light");
            }
        }
    }["ThemeProvider.useEffect"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ThemeProvider.useEffect": ()=>{
            if (mounted) {
                document.documentElement.classList.toggle("dark", theme === "dark");
                if (canUseDarkMode) {
                    localStorage.setItem("theme", theme);
                } else {
                    // Asegurar que siempre esté en light si no tiene permiso
                    if (theme !== "light") {
                        setTheme("light");
                    }
                }
            }
        }
    }["ThemeProvider.useEffect"], [
        theme,
        mounted,
        canUseDarkMode
    ]);
    const toggleTheme = ()=>{
        // Solo permitir toggle si el usuario tiene permiso
        if (canUseDarkMode) {
            setTheme((prev)=>prev === "dark" ? "light" : "dark");
        }
    };
    if (!mounted) {
        return null;
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ThemeContext.Provider, {
        value: {
            theme,
            toggleTheme,
            canUseDarkMode
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/components/dashboard/theme-provider.tsx",
        lineNumber: 101,
        columnNumber: 10
    }, this);
}
_s(ThemeProvider, "xbCWz/3xjNswrAMXsJJC0XpTUQk=");
_c = ThemeProvider;
function useTheme() {
    _s1();
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}
_s1(useTheme, "b9L3QQ+jgeyIrH0NfHrJ8nn7VMU=");
var _c;
__turbopack_context__.k.register(_c, "ThemeProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/dashboard/theme-toggle.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ThemeToggle",
    ()=>ThemeToggle
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$moon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Moon$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/moon.js [app-client] (ecmascript) <export default as Moon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sun$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sun$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/sun.js [app-client] (ecmascript) <export default as Sun>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$dashboard$2f$theme$2d$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/dashboard/theme-provider.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
function ThemeToggle() {
    _s();
    const { theme, toggleTheme, canUseDarkMode } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$dashboard$2f$theme$2d$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTheme"])();
    // No mostrar el botón si el usuario no tiene permiso para modo oscuro
    if (!canUseDarkMode) {
        return null;
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex items-center justify-between px-4 w-full",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600"),
                children: theme === "dark" ? "Modo oscuro" : "Modo claro"
            }, void 0, false, {
                fileName: "[project]/components/dashboard/theme-toggle.tsx",
                lineNumber: 17,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                onClick: toggleTheme,
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("relative w-14 h-7 rounded-full transition-all duration-300 flex items-center", theme === "dark" ? "bg-gradient-to-r from-purple-600/50 to-blue-600/50 border border-white/10" : "bg-gradient-to-r from-[#0078A0]/20 to-[#00C794]/20 border border-[#0078A0]/20"),
                "aria-label": "Toggle theme",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("absolute w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 shadow-md", theme === "dark" ? "left-1.5 bg-gradient-to-br from-purple-500 to-blue-500" : "left-7 bg-gradient-to-br from-[#0078A0] to-[#00C794]"),
                    children: theme === "dark" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$moon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Moon$3e$__["Moon"], {
                        className: "w-3 h-3 text-white"
                    }, void 0, false, {
                        fileName: "[project]/components/dashboard/theme-toggle.tsx",
                        lineNumber: 38,
                        columnNumber: 31
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sun$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sun$3e$__["Sun"], {
                        className: "w-3 h-3 text-white"
                    }, void 0, false, {
                        fileName: "[project]/components/dashboard/theme-toggle.tsx",
                        lineNumber: 38,
                        columnNumber: 73
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/components/dashboard/theme-toggle.tsx",
                    lineNumber: 30,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/dashboard/theme-toggle.tsx",
                lineNumber: 20,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/dashboard/theme-toggle.tsx",
        lineNumber: 16,
        columnNumber: 5
    }, this);
}
_s(ThemeToggle, "7QZNi6HOX1+CFdZSR+x0k2vIcE0=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$dashboard$2f$theme$2d$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTheme"]
    ];
});
_c = ThemeToggle;
var _c;
__turbopack_context__.k.register(_c, "ThemeToggle");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/api.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * ============================================================
 * CLIENTE API (lib/api.ts)
 * ============================================================
 * Cliente Axios configurado con interceptores para auth.
 * Centraliza todas las llamadas al backend.
 */ __turbopack_context__.s([
    "API_URL",
    ()=>API_URL,
    "api",
    ()=>api,
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/axios/lib/axios.js [app-client] (ecmascript)");
'use client';
;
/* ========== CONFIGURACIÓN BASE ========== */ const API_BASE_URL = ("TURBOPACK compile-time value", "/api") || '/api';
/* ========== INSTANCIA AXIOS ========== */ const apiClient = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});
/* Interceptor de request - agrega token de autenticación */ apiClient.interceptors.request.use((config)=>{
    if ("TURBOPACK compile-time truthy", 1) {
        const token = localStorage.getItem('token');
        if (token && token !== 'null' && token !== 'undefined') {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
}, (error)=>Promise.reject(error));
/* Interceptor de response - maneja errores 401 y 403 (suspensión) */ apiClient.interceptors.response.use((response)=>response, (error)=>{
    if (error.response?.status === 401) {
        if ("TURBOPACK compile-time truthy", 1) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }
    }
    // ✅ Manejo de suspensión de cuenta
    if (error.response?.status === 403 && error.response?.data?.code === 'ACCOUNT_SUSPENDED') {
        if ("TURBOPACK compile-time truthy", 1) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('auth-storage');
            document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            const message = error.response.data.message || 'Tu cuenta se encuentra suspendida temporalmente.';
            // Guardar mensaje para mostrar en login
            sessionStorage.setItem('suspensionMessage', message);
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login?suspended=true';
            }
        }
    }
    return Promise.reject(error);
});
const api = {
    /* Jobs de Envío (Campañas) */ sendJobs: {
        list: ()=>apiClient.get('/send-jobs'),
        get: (id)=>apiClient.get(`/send-jobs/${id}`),
        start: (data)=>apiClient.post('/send-jobs/start', data),
        pause: (id)=>apiClient.post(`/send-jobs/${id}/pause`),
        resume: (id)=>apiClient.post(`/send-jobs/${id}/resume`),
        cancel: (id)=>apiClient.delete(`/send-jobs/${id}/cancel`),
        export: (id)=>apiClient.get(`/send-jobs/${id}/export`, {
                responseType: 'blob'
            }),
        exportAutoResponses: (id)=>apiClient.get(`/send-jobs/${id}/autoresponse-report`, {
                responseType: 'blob'
            })
    },
    /* Auditorías */ audits: {
        list: (params)=>apiClient.get('/audits', {
                params
            }),
        getByDate: (params)=>apiClient.get('/audits', {
                params
            }),
        getById: (id)=>apiClient.get(`/audits/${id}`),
        create: (data)=>apiClient.post('/audits', data),
        update: (id, data)=>apiClient.patch(`/audits/${id}`, data),
        updateStatus: (id, data)=>apiClient.patch(`/audits/${id}/status`, data),
        delete: (id)=>apiClient.delete(`/audits/${id}`),
        uploadMultimedia: (id, formData)=>apiClient.post(`/audits/${id}/multimedia`, formData),
        export: (params)=>apiClient.get('/audits/export', {
                params
            }),
        recalculateSupervisors: (data)=>apiClient.post('/audits/recalculate-supervisors', data),
        bulkUpload: (file)=>{
            const formData = new FormData();
            formData.append('file', file);
            return apiClient.post('/audits/bulk-upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
        },
        bulkImport: (data)=>apiClient.post('/audits/bulk-import', data),
        getAvailableSlots: (date)=>apiClient.get('/audits/available-slots', {
                params: {
                    date
                }
            }),
        getSalesStats: (date)=>apiClient.get('/audits/sales-stats', {
                params: {
                    date
                }
            }),
        getSupervisorStats: ()=>apiClient.get('/audits/stats/supervisors'),
        getObraSocialStats: ()=>apiClient.get('/audits/stats/obras-sociales'),
        markRevision: (id, data)=>apiClient.patch(`/audits/${id}/revision`, data),
        getReventa: ()=>apiClient.get('/audits/reventa'),
        exportReventa: ()=>apiClient.get('/audits/reventa/export', {
                responseType: 'blob'
            }),
        toggleEnProceso: (id)=>apiClient.patch(`/audits/${id}/toggle-en-proceso`)
    },
    /* Recuperaciones */ recovery: {
        list: (params)=>apiClient.get('/recovery', {
                params
            }),
        create: (data)=>apiClient.post('/recovery', data),
        update: (id, data)=>apiClient.put(`/recovery/${id}`, data),
        delete: (id)=>apiClient.delete(`/recovery/${id}`)
    },
    /* Liquidación */ liquidation: {
        list: (params)=>apiClient.get('/liquidacion', {
                params
            }),
        listByTipo: (params)=>apiClient.get('/liquidacion/by-tipo', {
                params
            }),
        statsMonthly: (params)=>apiClient.get('/liquidacion/stats-monthly', {
                params
            }),
        export: (params)=>apiClient.post('/liquidacion/export', params, {
                responseType: 'blob'
            }),
        exportDirect: (params)=>apiClient.post('/liquidacion/export-direct', params, {
                responseType: 'blob'
            })
    },
    /* Empleados (RR.HH.) */ employees: {
        list: ()=>apiClient.get('/employees'),
        get: (id)=>apiClient.get(`/employees/${id}`),
        create: (data)=>apiClient.post('/employees', data),
        update: (id, data)=>apiClient.put(`/employees/${id}`, data),
        deactivate: (id, data)=>apiClient.put(`/employees/${id}/deactivate`, data),
        reactivate: (id)=>apiClient.put(`/employees/${id}/reactivate`),
        delete: (id)=>apiClient.delete(`/employees/${id}`),
        uploadDNI: (file)=>{
            const formData = new FormData();
            formData.append('fotoDNI', file);
            return apiClient.post('/employees/upload-dni', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
        }
    },
    /* Usuarios */ users: {
        list: (query)=>apiClient.get(`/users${query ? `?${query}` : ''}`),
        getSupervisors: ()=>apiClient.get('/users?role=supervisor'),
        get: (id)=>apiClient.get(`/users/${id}`),
        create: (data)=>apiClient.post('/users', data),
        update: (id, data)=>apiClient.put(`/users/${id}`, data),
        delete: (id)=>apiClient.delete(`/users/${id}`),
        changePassword: (id, data)=>apiClient.put(`/users/${id}/password`, data),
        /* Gestión de Historial de Equipos */ addTeamChange: (id, data)=>apiClient.post(`/users/${id}/team-change`, data),
        editTeamPeriod: (id, periodId, data)=>apiClient.put(`/users/${id}/team-history/${periodId}`, data),
        deleteTeamPeriod: (id, periodId)=>apiClient.delete(`/users/${id}/team-history/${periodId}`),
        /* Suspensión temporal de cuentas */ suspend: (id, data)=>apiClient.post(`/users/${id}/suspend`, data),
        cancelSuspension: (id)=>apiClient.delete(`/users/${id}/suspend`)
    },
    /* Grupos */ groups: {
        list: ()=>apiClient.get('/groups'),
        get: (id)=>apiClient.get(`/groups/${id}`),
        create: (data)=>apiClient.post('/groups', data),
        update: (id, data)=>apiClient.put(`/groups/${id}`, data),
        delete: (id)=>apiClient.delete(`/groups/${id}`)
    },
    /* Afiliados */ affiliates: {
        list: (params)=>apiClient.get('/affiliates', {
                params
            }),
        create: (data)=>apiClient.post('/affiliates', data),
        update: (id, data)=>apiClient.put(`/affiliates/${id}`, data),
        delete: (id)=>apiClient.delete(`/affiliates/${id}`),
        upload: (file)=>{
            const formData = new FormData();
            formData.append('file', file);
            return apiClient.post('/affiliates/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
        },
        export: (params)=>apiClient.post('/affiliates/export', params, {
                responseType: 'blob'
            }),
        stats: ()=>apiClient.get('/affiliates/stats'),
        listExports: ()=>apiClient.get('/affiliates/exports'),
        downloadExport: (filename)=>apiClient.get(`/affiliates/download-export/${filename}`, {
                responseType: 'blob'
            }),
        saveExportConfig: (config)=>apiClient.post('/affiliates/export-config', config),
        getExportConfig: ()=>apiClient.get('/affiliates/export-config'),
        getObrasSociales: ()=>apiClient.get('/affiliates/obras-sociales'),
        getStockByObraSocial: (obraSocial)=>apiClient.get(`/affiliates/stock-by-obra-social?obraSocial=${encodeURIComponent(obraSocial)}`),
        /* Gestión de Leads */ getFreshData: (params)=>apiClient.get('/affiliates/fresh-data', {
                params
            }),
        getReusableData: (params)=>apiClient.get('/affiliates/reusable', {
                params
            }),
        getFresh: ()=>apiClient.get('/affiliates/fresh'),
        distribute: (data)=>apiClient.post('/affiliates/distribute', data),
        cancelExports: (type)=>apiClient.post('/affiliates/cancel-exports', {
                type
            }),
        cleanupFresh: ()=>apiClient.post('/affiliates/cleanup-fresh'),
        getAssigned: (params)=>apiClient.get('/affiliates/assigned', {
                params
            }),
        updateStatus: (id, data)=>apiClient.put(`/affiliates/${id}/status`, data),
        getFailed: (params)=>apiClient.get('/affiliates/failed', {
                params
            }),
        getSupervisorStats: ()=>apiClient.get('/affiliates/supervisor-stats'),
        exportAll: ()=>apiClient.get('/affiliates/export-all', {
                responseType: 'blob'
            })
    },
    /* Plantillas */ templates: {
        list: ()=>apiClient.get('/templates'),
        get: (id)=>apiClient.get(`/templates/${id}`),
        create: (data)=>apiClient.post('/templates', data),
        update: (id, data)=>apiClient.put(`/templates/${id}`, data),
        delete: (id)=>apiClient.delete(`/templates/${id}`)
    },
    /* WhatsApp */ whatsapp: {
        status: ()=>apiClient.get('/whatsapp/me/status'),
        qr: ()=>apiClient.get('/whatsapp/me/qr'),
        relink: ()=>apiClient.post('/whatsapp/me/relink'),
        logout: ()=>apiClient.post('/whatsapp/me/logout')
    },
    /* Contactos */ contacts: {
        upload: (file)=>{
            const formData = new FormData();
            formData.append('file', file);
            return apiClient.post('/contacts/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
        },
        list: (params)=>apiClient.get('/contacts', {
                params
            }),
        downloadRejected: (logId)=>apiClient.get(`/contacts/import-logs/${logId}/download-txt`, {
                responseType: 'blob'
            })
    },
    /* Auto-respuestas */ autoResponses: {
        list: ()=>apiClient.get('/autoresponses'),
        create: (data)=>apiClient.post('/autoresponses', data),
        update: (id, data)=>apiClient.put(`/autoresponses/${id}`, data),
        delete: (id)=>apiClient.delete(`/autoresponses/${id}`),
        toggle: (id)=>apiClient.patch(`/autoresponses/${id}/toggle`)
    },
    /* Mensajería Interna */ internalMessages: {
        getInbox: (params)=>apiClient.get('/internal-messages/inbox', {
                params
            }),
        getSent: (params)=>apiClient.get('/internal-messages/sent', {
                params
            }),
        getStarred: (params)=>apiClient.get('/internal-messages/starred', {
                params
            }),
        getUnreadCount: ()=>apiClient.get('/internal-messages/unread-count'),
        getRecipients: (q)=>apiClient.get('/internal-messages/recipients', {
                params: {
                    q
                }
            }),
        getById: (id)=>apiClient.get(`/internal-messages/${id}`),
        send: (formData)=>apiClient.post('/internal-messages', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            }),
        delete: (id)=>apiClient.delete(`/internal-messages/${id}`),
        deleteAll: ()=>apiClient.delete('/internal-messages'),
        toggleStarred: (id)=>apiClient.patch(`/internal-messages/${id}/starred`),
        markAsRead: (id, read)=>apiClient.patch(`/internal-messages/${id}/read`, {
                read
            }),
        downloadAttachment: (messageId, attachmentId)=>apiClient.get(`/internal-messages/${messageId}/attachments/${attachmentId}`, {
                responseType: 'blob'
            })
    },
    /* Métricas */ metrics: {
        dashboard: ()=>apiClient.get('/metrics/dashboard'),
        campaigns: (params)=>apiClient.get('/metrics/campaigns', {
                params
            })
    },
    /* Mensajes */ messages: {
        preview: (data)=>apiClient.post('/messages/preview', data)
    },
    /* Palabras Prohibidas */ bannedWords: {
        list: ()=>apiClient.get('/banned-words'),
        stats: ()=>apiClient.get('/banned-words/stats'),
        create: (data)=>apiClient.post('/banned-words', data),
        update: (id, data)=>apiClient.put(`/banned-words/${id}`, data),
        delete: (id)=>apiClient.delete(`/banned-words/${id}`),
        detections: (params)=>apiClient.get('/banned-words/detections', {
                params
            }),
        resolveDetection: (id)=>apiClient.put(`/banned-words/detections/${id}/resolve`)
    },
    /* Asignaciones */ assignments: {
        distribute: (data)=>apiClient.post('/assignments/distribute', data),
        getMyLeads: ()=>apiClient.get('/assignments/my-leads'),
        updateStatus: (id, data)=>apiClient.patch(`/assignments/${id}/status`, data),
        logInteraction: (id, data)=>apiClient.post(`/assignments/${id}/interaction`, data),
        sendWhatsApp: (id, data)=>apiClient.post(`/assignments/${id}/whatsapp`, data),
        reschedule: (id, data)=>apiClient.post(`/assignments/${id}/reschedule`, data),
        reassign: (id, data)=>apiClient.post(`/assignments/${id}/reassign`, data),
        exportMyLeads: ()=>apiClient.get('/assignments/my-leads/export', {
                responseType: 'blob'
            })
    },
    /* Teléfonos Corporativos (RR.HH.) */ phones: {
        list: (filters)=>{
            const params = new URLSearchParams();
            if (filters?.supervisor) params.append('supervisor', filters.supervisor);
            if (filters?.asesor) params.append('asesor', filters.asesor);
            if (filters?.numeroTelefono) params.append('numeroTelefono', filters.numeroTelefono);
            if (filters?.estado) params.append('estado', filters.estado);
            const qs = params.toString();
            return apiClient.get(`/phones${qs ? `?${qs}` : ''}`);
        },
        get: (id)=>apiClient.get(`/phones/${id}`),
        create: (data)=>apiClient.post('/phones', data),
        update: (id, data)=>apiClient.put(`/phones/${id}`, data),
        delete: (id)=>apiClient.delete(`/phones/${id}`),
        addRecharge: (id, data)=>apiClient.post(`/phones/${id}/recharges`, data),
        deleteRecharge: (id, rechargeId)=>apiClient.delete(`/phones/${id}/recharges/${rechargeId}`),
        getAsesoresByEquipo: (numeroEquipo)=>apiClient.get(`/phones/asesores/${numeroEquipo}`),
        getIndependientes: ()=>apiClient.get('/phones/independientes'),
        getAsesoresForFilter: ()=>apiClient.get('/phones/asesores-filter'),
        getStats: ()=>apiClient.get('/phones/stats')
    },
    /* Bajo Rendimiento (RR.HH.) */ lowPerformance: {
        getAll: ()=>apiClient.get('/low-performance'),
        getStats: ()=>apiClient.get('/low-performance/stats'),
        getCurrentPeriod: ()=>apiClient.get('/low-performance/current-period'),
        getSupervisorHistory: (supervisorId)=>apiClient.get(`/low-performance/history/${supervisorId}`),
        evaluate: (data)=>apiClient.post('/low-performance/evaluate', data),
        evaluateHistorical: (data)=>apiClient.post('/low-performance/evaluate-historical', data),
        delete: (id)=>apiClient.delete(`/low-performance/${id}`)
    },
    /* Bajas y Liquidaciones (RR.HH.) */ separations: {
        list: (params)=>apiClient.get('/separations', {
                params
            }),
        get: (id)=>apiClient.get(`/separations/${id}`),
        markPaid: (id)=>apiClient.patch(`/separations/${id}/mark-paid`),
        updateMotivoBaja: (id, motivoBajaNormalizado)=>apiClient.patch(`/separations/${id}/motivo-baja`, {
                motivoBajaNormalizado
            })
    },
    /* Control de Privilegios */ privileges: {
        getStructure: ()=>apiClient.get('/privileges/structure'),
        getMyPermissions: ()=>apiClient.get('/privileges/my-permissions'),
        getByRole: (role)=>apiClient.get(`/privileges/role/${encodeURIComponent(role)}`),
        upsert: (data)=>apiClient.post('/privileges', data),
        getAuditLog: (params)=>apiClient.get('/privileges/audit-log', {
                params
            }),
        getCacheStatus: ()=>apiClient.get('/privileges/cache/status'),
        flushCache: ()=>apiClient.post('/privileges/cache/flush')
    },
    /* Aportes ARCA */ affiliateContributions: {
        run: (data)=>apiClient.post('/affiliate-contributions/run', data || {}),
        getStats: ()=>apiClient.get('/affiliate-contributions/stats')
    },
    /* Cliente raw para requests personalizados */ client: apiClient
};
const API_URL = API_BASE_URL;
const __TURBOPACK__default__export__ = apiClient;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/dashboard/sidebar.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * ============================================================
 * SIDEBAR DE NAVEGACIÓN (sidebar.tsx)
 * ============================================================
 * Menú lateral con navegación por secciones.
 * Muestra opciones según rol del usuario.
 */ __turbopack_context__.s([
    "Sidebar",
    ()=>Sidebar
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$column$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__BarChart3$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chart-column.js [app-client] (ecmascript) <export default as BarChart3>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$message$2d$square$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MessageSquare$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/message-square.js [app-client] (ecmascript) <export default as MessageSquare>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Users$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/users.js [app-client] (ecmascript) <export default as Users>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShieldAlert$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/shield-alert.js [app-client] (ecmascript) <export default as ShieldAlert>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clipboard$2d$list$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ClipboardList$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/clipboard-list.js [app-client] (ecmascript) <export default as ClipboardList>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2d$cog$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__UserCog$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/user-cog.js [app-client] (ecmascript) <export default as UserCog>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$log$2d$out$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__LogOut$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/log-out.js [app-client] (ecmascript) <export default as LogOut>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2d$round$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__UsersRound$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/users-round.js [app-client] (ecmascript) <export default as UsersRound>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chevron-down.js [app-client] (ecmascript) <export default as ChevronDown>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$pie$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChartPie$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chart-pie.js [app-client] (ecmascript) <export default as ChartPie>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/settings.js [app-client] (ecmascript) <export default as Settings>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/settings-2.js [app-client] (ecmascript) <export default as Settings2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$list$2d$ordered$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ListOrdered$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/list-ordered.js [app-client] (ecmascript) <export default as ListOrdered>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$upload$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Upload$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/upload.js [app-client] (ecmascript) <export default as Upload>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Shield$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/shield.js [app-client] (ecmascript) <export default as Shield>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/triangle-alert.js [app-client] (ecmascript) <export default as AlertTriangle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/search.js [app-client] (ecmascript) <export default as Search>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2d$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CalendarPlus$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/calendar-plus.js [app-client] (ecmascript) <export default as CalendarPlus>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$dollar$2d$sign$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__DollarSign$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/dollar-sign.js [app-client] (ecmascript) <export default as DollarSign>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2d$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__UserPlus$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/user-plus.js [app-client] (ecmascript) <export default as UserPlus>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__UserCheck$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/user-check.js [app-client] (ecmascript) <export default as UserCheck>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2d$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__UserX$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/user-x.js [app-client] (ecmascript) <export default as UserX>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/sparkles.js [app-client] (ecmascript) <export default as Sparkles>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$recycle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Recycle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/recycle.js [app-client] (ecmascript) <export default as Recycle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$phone$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Phone$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/phone.js [app-client] (ecmascript) <export default as Phone>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__XCircle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-x.js [app-client] (ecmascript) <export default as XCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$building$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Building2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/building-2.js [app-client] (ecmascript) <export default as Building2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/file-text.js [app-client] (ecmascript) <export default as FileText>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$archive$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileArchive$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/file-archive.js [app-client] (ecmascript) <export default as FileArchive>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$key$2d$round$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__KeyRound$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/key-round.js [app-client] (ecmascript) <export default as KeyRound>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Clock$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/clock.js [app-client] (ecmascript) <export default as Clock>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileCheck$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/file-check.js [app-client] (ecmascript) <export default as FileCheck>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$banknote$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Banknote$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/banknote.js [app-client] (ecmascript) <export default as Banknote>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$wallet$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Wallet$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/wallet.js [app-client] (ecmascript) <export default as Wallet>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$dashboard$2f$theme$2d$toggle$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/dashboard/theme-toggle.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$dashboard$2f$theme$2d$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/dashboard/theme-provider.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/api.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
;
const menuItems = [
    {
        id: "herramientas-contacto",
        label: "Herramientas de contacto",
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$phone$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Phone$3e$__["Phone"],
        submenu: [
            {
                id: "contactar-afiliados-administracion",
                label: "Administración de datos",
                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings2$3e$__["Settings2"]
            },
            {
                id: "contactar-afiliados-datos-dia",
                label: "Datos del día",
                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$list$2d$ordered$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ListOrdered$3e$__["ListOrdered"]
            },
            {
                id: "mensajeria-masiva",
                label: "Mensajería Masiva",
                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$message$2d$square$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MessageSquare$3e$__["MessageSquare"]
            },
            {
                id: "reportes-globales",
                label: "Reportes de Mensajería",
                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$column$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__BarChart3$3e$__["BarChart3"]
            }
        ]
    },
    {
        id: "base-afiliados",
        label: "Base de Afiliados",
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Users$3e$__["Users"],
        submenu: [
            {
                id: "base-afiliados-estadistica",
                label: "Estadísticas",
                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$pie$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChartPie$3e$__["ChartPie"]
            },
            {
                id: "base-afiliados-lista",
                label: "Lista de afiliados",
                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Users$3e$__["Users"]
            },
            {
                id: "base-afiliados-exitosas",
                label: "Afiliaciones exitosas",
                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__UserCheck$3e$__["UserCheck"]
            },
            {
                id: "base-afiliados-fallidas",
                label: "Afiliaciones fallidas",
                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2d$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__UserX$3e$__["UserX"]
            },
            {
                id: "base-afiliados-frescos",
                label: "Datos frescos",
                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__["Sparkles"]
            },
            {
                id: "base-afiliados-reutilizables",
                label: "Datos reutilizables",
                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$recycle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Recycle$3e$__["Recycle"]
            },
            {
                id: "base-afiliados-cargar",
                label: "Cargar archivo",
                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$upload$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Upload$3e$__["Upload"]
            },
            {
                id: "base-afiliados-configuracion",
                label: "Configuración de envíos",
                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings2$3e$__["Settings2"]
            }
        ]
    },
    {
        id: "auditorias",
        label: "Auditorías",
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clipboard$2d$list$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ClipboardList$3e$__["ClipboardList"],
        submenu: [
            {
                id: "auditorias-seguimiento",
                label: "Seguimiento",
                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__["Search"]
            },
            {
                id: "auditorias-falta-clave",
                label: "Falta clave",
                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$key$2d$round$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__KeyRound$3e$__["KeyRound"]
            },
            {
                id: "auditorias-pendiente",
                label: "Pendiente",
                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Clock$3e$__["Clock"]
            },
            {
                id: "auditorias-rechazada",
                label: "Rechazada",
                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__XCircle$3e$__["XCircle"]
            },
            {
                id: "auditorias-crear-turno",
                label: "Crear turno",
                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2d$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CalendarPlus$3e$__["CalendarPlus"]
            },
            {
                id: "auditorias-liquidacion",
                label: "Liquidación",
                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$dollar$2d$sign$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__DollarSign$3e$__["DollarSign"]
            },
            {
                id: "auditorias-afip-padron",
                label: "AFIP y Padrón",
                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileCheck$3e$__["FileCheck"]
            },
            {
                id: "auditorias-reventa",
                label: "Disponibles para reventa",
                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$recycle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Recycle$3e$__["Recycle"]
            }
        ]
    },
    {
        id: "administracion",
        label: "Administración",
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$building$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Building2$3e$__["Building2"],
        submenu: [
            {
                id: "administracion-registro-ventas",
                label: "Registro de ventas",
                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__["FileText"]
            },
            {
                id: "administracion-evidencias",
                label: "Evidencias",
                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$archive$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileArchive$3e$__["FileArchive"]
            }
        ]
    },
    {
        id: "recursos-humanos",
        label: "Recursos Humanos",
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2d$round$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__UsersRound$3e$__["UsersRound"],
        submenu: [
            {
                id: "rrhh-agregar",
                label: "Añadir empleado",
                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2d$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__UserPlus$3e$__["UserPlus"]
            },
            {
                id: "rrhh-activos",
                label: "Activos",
                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__UserCheck$3e$__["UserCheck"]
            },
            {
                id: "rrhh-bajas-liquidaciones",
                label: "Bajas y liquidaciones",
                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$banknote$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Banknote$3e$__["Banknote"]
            },
            {
                id: "rrhh-bajo-rendimiento",
                label: "Bajo rendimiento",
                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__["AlertTriangle"]
            },
            {
                id: "rrhh-estadisticas",
                label: "Estadísticas",
                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$pie$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChartPie$3e$__["ChartPie"]
            },
            {
                id: "rrhh-inactivos",
                label: "Inactivos",
                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2d$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__UserX$3e$__["UserX"]
            },
            {
                id: "rrhh-telefonos",
                label: "Teléfonos",
                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$phone$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Phone$3e$__["Phone"]
            }
        ]
    },
    {
        id: "contabilidad",
        label: "Contabilidad",
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$wallet$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Wallet$3e$__["Wallet"]
    },
    {
        id: "configuracion-sistema",
        label: "Configuración de sistema",
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__["Settings"],
        submenu: [
            {
                id: "configuracion-privilegios",
                label: "Control de privilegios",
                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Shield$3e$__["Shield"]
            },
            {
                id: "gestion-usuarios",
                label: "Gestión de Usuarios",
                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2d$cog$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__UserCog$3e$__["UserCog"]
            },
            {
                id: "palabras-prohibidas-mensajeria",
                label: "Palabras prohibidas para mensajería",
                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShieldAlert$3e$__["ShieldAlert"]
            }
        ]
    }
];
/** Applies dynamic permission overrides on top of the static filtered list.
 *  Rules per interface:
 *   - dynamic acceder=true  → always show (even if static hides it)
 *   - dynamic acceder=false → always hide (even if static shows it)
 *   - no dynamic entry      → follow static result
 */ function applyDynamicPermissions(staticItems, dynamicMap) {
    if (Object.keys(dynamicMap).length === 0) return staticItems;
    const staticIfaceIds = new Set();
    for (const item of staticItems){
        if (!item.submenu) {
            staticIfaceIds.add(item.id);
        } else {
            for (const sub of item.submenu)staticIfaceIds.add(sub.id);
        }
    }
    return menuItems.filter((item)=>{
        if (!item.submenu) {
            const d = dynamicMap[item.id];
            if (d === true) return true;
            if (d === false) return false;
            return staticIfaceIds.has(item.id);
        }
        return item.submenu.some((sub)=>{
            const d = dynamicMap[sub.id];
            if (d === true) return true;
            if (d === false) return false;
            return staticIfaceIds.has(sub.id);
        });
    }).map((item)=>{
        if (!item.submenu) return item;
        return {
            ...item,
            submenu: item.submenu.filter((sub)=>{
                const d = dynamicMap[sub.id];
                if (d === true) return true;
                if (d === false) return false;
                return staticIfaceIds.has(sub.id);
            })
        };
    });
}
function Sidebar({ activeSection, onSectionChange, isMobileOpen, onClose, onLogout }) {
    _s();
    const { theme } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$dashboard$2f$theme$2d$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTheme"])();
    const { user } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"])();
    const [dynamicPermsMap, setDynamicPermsMap] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({});
    const [dynamicPermsLoaded, setDynamicPermsLoaded] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Sidebar.useEffect": ()=>{
            const role = user?.role?.toLowerCase();
            if (!role || role === 'desarrollador' || role === 'gerencia') {
                setDynamicPermsLoaded(true);
                return;
            }
            setDynamicPermsLoaded(false);
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].privileges.getMyPermissions().then({
                "Sidebar.useEffect": (res)=>{
                    if (res.data?.fullAccess) {
                        setDynamicPermsMap({});
                        setDynamicPermsLoaded(true);
                        return;
                    }
                    const records = res.data?.permissions || [];
                    const map = {};
                    for (const r of records){
                        if (r.permissions) map[r.interfaceId] = r.permissions.acceder ?? false;
                    }
                    setDynamicPermsMap(map);
                    setDynamicPermsLoaded(true);
                }
            }["Sidebar.useEffect"]).catch({
                "Sidebar.useEffect": ()=>setDynamicPermsLoaded(true)
            }["Sidebar.useEffect"]);
        }
    }["Sidebar.useEffect"], [
        user?.role
    ]);
    // Filter menu items based on user role
    const getFilteredMenuItems = ()=>{
        const role = user?.role?.toLowerCase();
        // Desarrollador bypasses all privilege checks — full access
        if (role === 'desarrollador') {
            return menuItems;
        }
        if (role === 'gerencia') {
            return menuItems // Gerencia sees everything
            ;
        }
        if (role === 'asesor') {
            return menuItems.filter((item)=>{
                if (item.id === 'mensajeria-interna') return true;
                if (item.id === 'auditorias') return true;
                if (item.id === 'herramientas-contacto') return true;
                return false;
            }).map((item)=>{
                if (item.id === 'auditorias' && item.submenu) {
                    return {
                        ...item,
                        submenu: item.submenu.filter((sub)=>sub.id === 'auditorias-seguimiento' || sub.id === 'auditorias-crear-turno' || sub.id === 'auditorias-liquidacion')
                    };
                }
                if (item.id === 'herramientas-contacto' && item.submenu) {
                    return {
                        ...item,
                        submenu: item.submenu.filter((sub)=>sub.id === 'contactar-afiliados-datos-dia' || sub.id === 'mensajeria-masiva' || sub.id === 'reportes-globales')
                    };
                }
                return item;
            });
        }
        if (role === 'independiente') {
            return menuItems.filter((item)=>{
                if (item.id === 'mensajeria-interna') return true;
                if (item.id === 'auditorias') return true;
                if (item.id === 'herramientas-contacto') return true;
                return false;
            }).map((item)=>{
                if (item.id === 'auditorias' && item.submenu) {
                    return {
                        ...item,
                        submenu: item.submenu.filter((sub)=>sub.id === 'auditorias-seguimiento' || sub.id === 'auditorias-crear-turno' || sub.id === 'auditorias-liquidacion' || sub.id === 'auditorias-falta-clave' || sub.id === 'auditorias-rechazada' || sub.id === 'auditorias-pendiente' || sub.id === 'auditorias-afip-padron')
                    };
                }
                if (item.id === 'herramientas-contacto' && item.submenu) {
                    return {
                        ...item,
                        submenu: item.submenu.filter((sub)=>sub.id === 'contactar-afiliados-datos-dia' || sub.id === 'mensajeria-masiva' || sub.id === 'reportes-globales')
                    };
                }
                return item;
            });
        }
        if (role === 'supervisor') {
            return menuItems.filter((item)=>{
                if (item.id === 'mensajeria-interna') return true;
                if (item.id === 'auditorias') return true;
                if (item.id === 'herramientas-contacto') return true;
                if (item.id === 'base-afiliados') return true;
                if (item.id === 'recursos-humanos') return true;
                return false;
            }).map((item)=>{
                if (item.id === 'auditorias' && item.submenu) {
                    return {
                        ...item,
                        submenu: item.submenu.filter((sub)=>sub.id === 'auditorias-seguimiento' || sub.id === 'auditorias-crear-turno' || sub.id === 'auditorias-liquidacion' || sub.id === 'auditorias-falta-clave' || sub.id === 'auditorias-rechazada' || sub.id === 'auditorias-pendiente' || sub.id === 'auditorias-afip-padron' || sub.id === 'auditorias-reventa')
                    };
                }
                if (item.id === 'base-afiliados' && item.submenu) {
                    return {
                        ...item,
                        submenu: item.submenu.filter((sub)=>sub.id === 'base-afiliados-estadistica' || sub.id === 'base-afiliados-configuracion')
                    };
                }
                if (item.id === 'herramientas-contacto' && item.submenu) {
                    return {
                        ...item,
                        submenu: item.submenu.filter((sub)=>sub.id === 'contactar-afiliados-administracion' || sub.id === 'contactar-afiliados-datos-dia' || sub.id === 'mensajeria-masiva' || sub.id === 'reportes-globales')
                    };
                }
                if (item.id === 'recursos-humanos' && item.submenu) {
                    return {
                        ...item,
                        submenu: item.submenu.filter((sub)=>sub.id === 'rrhh-estadisticas' || sub.id === 'rrhh-activos' || sub.id === 'rrhh-inactivos' || sub.id === 'rrhh-agregar' || sub.id === 'rrhh-telefonos')
                    };
                }
                return item;
            });
        }
        if (role === 'administrativo') {
            return menuItems.filter((item)=>{
                if (item.id === 'mensajeria-interna') return true;
                if (item.id === 'auditorias') return true;
                if (item.id === 'administracion') return true;
                return false;
            }).map((item)=>{
                if (item.id === 'auditorias' && item.submenu) {
                    return {
                        ...item,
                        submenu: item.submenu.filter((sub)=>sub.id === 'auditorias-seguimiento' || sub.id === 'auditorias-liquidacion' || sub.id === 'auditorias-falta-clave' || sub.id === 'auditorias-rechazada' || sub.id === 'auditorias-pendiente' || sub.id === 'auditorias-afip-padron')
                    };
                }
                return item;
            });
        }
        if (role === 'auditor') {
            const hasTeam = !!user?.numeroEquipo;
            return menuItems.filter((item)=>{
                if (!hasTeam) {
                    // Case 1.1: Only Seguimiento (hija de Auditorías)
                    if (item.id === 'auditorias') {
                        return true;
                    }
                    return false;
                } else {
                    // Case 1.2: Reportes, Mensajería, Seguimiento, Crear turno, Herramientas de contacto
                    if (item.id === 'mensajeria-interna') return true;
                    if (item.id === 'auditorias') return true;
                    if (item.id === 'herramientas-contacto') return true;
                    return false;
                }
            }).map((item)=>{
                if (item.id === 'auditorias' && item.submenu) {
                    const hasTeam = !!user?.numeroEquipo;
                    if (!hasTeam) {
                        // Seguimiento + Liquidación
                        return {
                            ...item,
                            submenu: item.submenu.filter((sub)=>sub.id === 'auditorias-seguimiento' || sub.id === 'auditorias-liquidacion')
                        };
                    } else {
                        // Seguimiento, Crear turno y Liquidación (auditor con equipo)
                        return {
                            ...item,
                            submenu: item.submenu.filter((sub)=>sub.id === 'auditorias-seguimiento' || sub.id === 'auditorias-crear-turno' || sub.id === 'auditorias-liquidacion' // ✅ Auditor con equipo ve Liquidación
                            )
                        };
                    }
                }
                // ✅ Auditor con equipo ve "Datos del día", "Mensajería Masiva", "Reportes"
                if (item.id === 'herramientas-contacto' && item.submenu) {
                    return {
                        ...item,
                        submenu: item.submenu.filter((sub)=>sub.id === 'contactar-afiliados-datos-dia' || sub.id === 'mensajeria-masiva' || sub.id === 'reportes-globales')
                    };
                }
                return item;
            });
        }
        if (role === 'rr.hh') {
            return menuItems.filter((item)=>item.id === 'recursos-humanos' || item.id === 'mensajeria-interna').map((item)=>{
                // RR.HH. no ve "Bajas y liquidaciones" (exclusivo de Gerencia)
                if (item.id === 'recursos-humanos' && item.submenu) {
                    return {
                        ...item,
                        submenu: item.submenu.filter((sub)=>sub.id !== 'rrhh-bajas-liquidaciones')
                    };
                }
                return item;
            });
        }
        // ✅ NUEVO: Rol Encargado - Supervisor de Supervisores
        // Acceso transversal a edición de ventas, pero NUNCA puede borrar
        if (role === 'encargado') {
            return menuItems.filter((item)=>{
                // Acceso a Herramientas de contacto
                if (item.id === 'herramientas-contacto') return true;
                // Acceso completo a Auditorías (todas las interfaces hijas)
                if (item.id === 'auditorias') return true;
                // Acceso a Base de Afiliados (igual que Supervisor)
                if (item.id === 'base-afiliados') return true;
                // Acceso a Recursos Humanos (incluye Bajo rendimiento y Bajas y liquidaciones)
                if (item.id === 'recursos-humanos') return true;
                // Acceso a Contabilidad
                if (item.id === 'contabilidad') return true;
                return false;
            }).map((item)=>{
                // Auditorías: TODAS las interfaces hijas (sin filtrar)
                if (item.id === 'auditorias' && item.submenu) {
                    return item // Acceso completo
                    ;
                }
                // Herramientas de contacto: igual que Supervisor + mensajería
                if (item.id === 'herramientas-contacto' && item.submenu) {
                    return {
                        ...item,
                        submenu: item.submenu.filter((sub)=>sub.id === 'contactar-afiliados-administracion' || sub.id === 'contactar-afiliados-datos-dia' || sub.id === 'mensajeria-masiva' || sub.id === 'reportes-globales')
                    };
                }
                // Base de Afiliados: igual que Supervisor
                if (item.id === 'base-afiliados' && item.submenu) {
                    return {
                        ...item,
                        submenu: item.submenu.filter((sub)=>sub.id === 'base-afiliados-estadistica' || sub.id === 'base-afiliados-configuracion')
                    };
                }
                // Recursos Humanos: Supervisor base + Bajo rendimiento + Bajas y liquidaciones
                if (item.id === 'recursos-humanos' && item.submenu) {
                    return {
                        ...item,
                        submenu: item.submenu.filter((sub)=>sub.id === 'rrhh-estadisticas' || sub.id === 'rrhh-bajo-rendimiento' || sub.id === 'rrhh-activos' || sub.id === 'rrhh-bajas-liquidaciones' || sub.id === 'rrhh-inactivos' || sub.id === 'rrhh-agregar' || sub.id === 'rrhh-telefonos')
                    };
                }
                return item;
            });
        }
        if (role === 'recuperador') {
            return menuItems.filter((item)=>{
                // Acceso a Herramientas de contacto
                if (item.id === 'herramientas-contacto') return true;
                // Acceso a Auditorías (Seguimiento solo lectura + interfaces de recuperación + Liquidación + Crear turno)
                if (item.id === 'auditorias') return true;
                return false;
            }).map((item)=>{
                if (item.id === 'herramientas-contacto' && item.submenu) {
                    return {
                        ...item,
                        submenu: item.submenu.filter((sub)=>sub.id === 'mensajeria-masiva' || sub.id === 'reportes-globales')
                    };
                }
                if (item.id === 'auditorias' && item.submenu) {
                    // Recuperador: Seguimiento (lectura), Crear turno, Falta clave, Rechazada, Pendiente, AFIP y Padrón, Liquidación
                    return {
                        ...item,
                        submenu: item.submenu.filter((sub)=>sub.id === 'auditorias-seguimiento' || sub.id === 'auditorias-crear-turno' || // ✅ Recuperador puede crear turnos
                            sub.id === 'auditorias-falta-clave' || sub.id === 'auditorias-rechazada' || sub.id === 'auditorias-pendiente' || sub.id === 'auditorias-afip-padron' || sub.id === 'auditorias-liquidacion')
                    };
                }
                return item;
            });
        }
        // Default: show nothing if role is not recognized
        return [];
    };
    const filteredMenuItems = dynamicPermsLoaded ? applyDynamicPermissions(getFilteredMenuItems(), dynamicPermsMap) : getFilteredMenuItems();
    const getInitialExpandedMenu = ()=>{
        if (activeSection.startsWith("base-afiliados")) return "base-afiliados";
        if (activeSection.startsWith("palabras-prohibidas") || activeSection === "gestion-usuarios" || activeSection === "configuracion-privilegios") return "configuracion-sistema";
        if (activeSection.startsWith("auditorias")) return "auditorias";
        if (activeSection.startsWith("rrhh")) return "recursos-humanos";
        if (activeSection.startsWith("administracion")) return "administracion";
        if ([
            "contactar-afiliados-administracion",
            "contactar-afiliados-datos-dia",
            "mensajeria-masiva",
            "reportes-globales"
        ].includes(activeSection)) return "herramientas-contacto";
        return null;
    };
    const [expandedMenu, setExpandedMenu] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(getInitialExpandedMenu());
    const handleMenuClick = (item)=>{
        if (item.submenu) {
            // Toggle submenu expansion
            setExpandedMenu(expandedMenu === item.id ? null : item.id);
            // Navigate to first submenu item when clicking parent
            onSectionChange(item.submenu[0].id);
        } else {
            setExpandedMenu(null);
            onSectionChange(item.id);
        }
    };
    const isItemActive = (itemId, submenu)=>{
        if (submenu) {
            return submenu.some((sub)=>sub.id === activeSection);
        }
        return activeSection === itemId;
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("aside", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("min-h-screen backdrop-blur-xl border-r flex flex-col", theme === "dark" ? "bg-gradient-to-b from-[#1a1333]/90 to-[#0f0a1e]/90 border-white/5" : "bg-gradient-to-b from-[#FAF7F2]/95 to-[#F5F0E8]/95 border-purple-200/30", "lg:w-72 lg:relative lg:translate-x-0", "fixed top-0 left-0 w-72 h-full z-40 transition-transform duration-300 ease-out", isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0", "pt-16 lg:pt-0"),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                onClick: onClose,
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("absolute top-20 right-4 w-8 h-8 rounded-lg flex items-center justify-center transition-all lg:hidden", theme === "dark" ? "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10" : "bg-purple-100/50 text-purple-400 hover:text-purple-600 hover:bg-purple-100"),
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                    className: "w-4 h-4"
                }, void 0, false, {
                    fileName: "[project]/components/dashboard/sidebar.tsx",
                    lineNumber: 614,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/dashboard/sidebar.tsx",
                lineNumber: 605,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "p-6 items-center gap-3 hidden lg:flex",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "relative",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-12 h-12 rounded-xl flex items-center justify-center", theme === "dark" ? "bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 animate-pulse-glow" : "bg-gradient-to-br from-[#00C794] to-[#0078A0] shadow-lg shadow-[#00C794]/30"),
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-white font-bold text-xl",
                                children: "+"
                            }, void 0, false, {
                                fileName: "[project]/components/dashboard/sidebar.tsx",
                                lineNumber: 628,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/components/dashboard/sidebar.tsx",
                            lineNumber: 620,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/dashboard/sidebar.tsx",
                        lineNumber: 619,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                className: "font-bold text-lg",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: theme === "dark" ? "text-cyan-400" : "text-[#00C794]",
                                        children: "DANN"
                                    }, void 0, false, {
                                        fileName: "[project]/components/dashboard/sidebar.tsx",
                                        lineNumber: 633,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: theme === "dark" ? "text-purple-400" : "text-[#0078A0]",
                                        children: "+"
                                    }, void 0, false, {
                                        fileName: "[project]/components/dashboard/sidebar.tsx",
                                        lineNumber: 634,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: theme === "dark" ? "text-white" : "text-gray-700",
                                        children: "SALUD"
                                    }, void 0, false, {
                                        fileName: "[project]/components/dashboard/sidebar.tsx",
                                        lineNumber: 635,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/dashboard/sidebar.tsx",
                                lineNumber: 632,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-[10px] tracking-[0.3em] uppercase", theme === "dark" ? "text-gray-400" : "text-gray-500"),
                                children: "Online"
                            }, void 0, false, {
                                fileName: "[project]/components/dashboard/sidebar.tsx",
                                lineNumber: 637,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/dashboard/sidebar.tsx",
                        lineNumber: 631,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/dashboard/sidebar.tsx",
                lineNumber: 618,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("px-6 py-4 border-t lg:border-t", theme === "dark" ? "border-white/5" : "border-[#00C794]/20"),
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center gap-3",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm", theme === "dark" ? "bg-gradient-to-br from-purple-500 to-pink-500" : "bg-gradient-to-br from-[#00C794] to-[#0078A0]"),
                            children: user?.nombre ? user.nombre.substring(0, 2).toUpperCase() : "U"
                        }, void 0, false, {
                            fileName: "[project]/components/dashboard/sidebar.tsx",
                            lineNumber: 653,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("font-medium text-sm", theme === "dark" ? "text-white" : "text-gray-700"),
                                    children: user?.nombre || "Usuario"
                                }, void 0, false, {
                                    fileName: "[project]/components/dashboard/sidebar.tsx",
                                    lineNumber: 664,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-xs", theme === "dark" ? "text-gray-400" : "text-gray-500"),
                                    children: user?.role || "Usuario"
                                }, void 0, false, {
                                    fileName: "[project]/components/dashboard/sidebar.tsx",
                                    lineNumber: 667,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/dashboard/sidebar.tsx",
                            lineNumber: 663,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/dashboard/sidebar.tsx",
                    lineNumber: 652,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/dashboard/sidebar.tsx",
                lineNumber: 649,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                className: "flex-1 px-4 py-6 space-y-1 overflow-y-auto",
                children: filteredMenuItems.map((item)=>{
                    const Icon = item.icon;
                    const isActive = isItemActive(item.id, item.submenu);
                    const isExpanded = expandedMenu === item.id;
                    const hasSubmenu = !!item.submenu;
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>handleMenuClick(item),
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 group", isActive ? theme === "dark" ? "bg-gradient-to-r from-purple-600/80 to-blue-600/80 text-white shadow-lg shadow-purple-500/20" : "bg-gradient-to-r from-[#00C794] to-[#009e74] text-white shadow-lg shadow-[#00C794]/30" : theme === "dark" ? "text-gray-400 hover:text-white hover:bg-white/5" : "text-gray-600 hover:text-[#00C794] hover:bg-[#00C794]/10"),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Icon, {
                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-5 h-5 transition-transform duration-300", isActive ? "text-white" : theme === "dark" ? "text-gray-500 group-hover:text-purple-400" : "text-gray-400 group-hover:text-[#00C794]", "group-hover:scale-110")
                                    }, void 0, false, {
                                        fileName: "[project]/components/dashboard/sidebar.tsx",
                                        lineNumber: 697,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "flex-1 text-left",
                                        children: item.label
                                    }, void 0, false, {
                                        fileName: "[project]/components/dashboard/sidebar.tsx",
                                        lineNumber: 708,
                                        columnNumber: 17
                                    }, this),
                                    hasSubmenu && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__["ChevronDown"], {
                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-4 h-4 transition-transform duration-300", isExpanded && "rotate-180")
                                    }, void 0, false, {
                                        fileName: "[project]/components/dashboard/sidebar.tsx",
                                        lineNumber: 710,
                                        columnNumber: 19
                                    }, this),
                                    isActive && !hasSubmenu && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "w-2 h-2 rounded-full bg-white animate-pulse"
                                    }, void 0, false, {
                                        fileName: "[project]/components/dashboard/sidebar.tsx",
                                        lineNumber: 714,
                                        columnNumber: 45
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/dashboard/sidebar.tsx",
                                lineNumber: 684,
                                columnNumber: 15
                            }, this),
                            hasSubmenu && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("overflow-hidden transition-all duration-300 ease-out", isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"),
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mt-1 ml-4 pl-4 border-l-2 space-y-1",
                                    style: {
                                        borderColor: theme === "dark" ? "rgba(168, 85, 247, 0.3)" : "rgba(168, 85, 247, 0.2)"
                                    },
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "ml-9 mt-1 space-y-1",
                                        children: item.submenu.map((subItem)=>{
                                            const isSubActive = activeSection === subItem.id;
                                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: ()=>{
                                                    if (onSectionChange) onSectionChange(subItem.id);
                                                },
                                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-full flex items-center justify-start text-left gap-3 px-4 py-2 rounded-lg text-sm transition-all duration-300 group/sub relative", isSubActive ? theme === "dark" ? "text-white bg-white/10" : "text-emerald-600 bg-emerald-50 font-medium" : theme === "dark" ? "text-gray-500 hover:text-gray-300" : "text-gray-500 hover:text-emerald-600"),
                                                children: [
                                                    isSubActive && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full", theme === "dark" ? "bg-purple-500" : "bg-emerald-400")
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/dashboard/sidebar.tsx",
                                                        lineNumber: 751,
                                                        columnNumber: 31
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-1.5 h-1.5 rounded-full transition-colors", isSubActive ? theme === "dark" ? "bg-purple-400" : "bg-emerald-500" : theme === "dark" ? "bg-gray-600 group-hover/sub:bg-gray-400" : "bg-gray-300 group-hover/sub:bg-emerald-300")
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/dashboard/sidebar.tsx",
                                                        lineNumber: 758,
                                                        columnNumber: 29
                                                    }, this),
                                                    subItem.label
                                                ]
                                            }, subItem.id, true, {
                                                fileName: "[project]/components/dashboard/sidebar.tsx",
                                                lineNumber: 734,
                                                columnNumber: 27
                                            }, this);
                                        })
                                    }, void 0, false, {
                                        fileName: "[project]/components/dashboard/sidebar.tsx",
                                        lineNumber: 730,
                                        columnNumber: 21
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/components/dashboard/sidebar.tsx",
                                    lineNumber: 724,
                                    columnNumber: 19
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/components/dashboard/sidebar.tsx",
                                lineNumber: 718,
                                columnNumber: 17
                            }, this)
                        ]
                    }, item.id, true, {
                        fileName: "[project]/components/dashboard/sidebar.tsx",
                        lineNumber: 683,
                        columnNumber: 13
                    }, this);
                })
            }, void 0, false, {
                fileName: "[project]/components/dashboard/sidebar.tsx",
                lineNumber: 675,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("px-4 py-3 border-t", theme === "dark" ? "border-white/5" : "border-purple-200/30"),
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$dashboard$2f$theme$2d$toggle$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ThemeToggle"], {}, void 0, false, {
                    fileName: "[project]/components/dashboard/sidebar.tsx",
                    lineNumber: 785,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/dashboard/sidebar.tsx",
                lineNumber: 784,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("p-4 border-t space-y-2", theme === "dark" ? "border-white/5" : "border-purple-200/30"),
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                    onClick: onLogout,
                    className: "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-300 group",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$log$2d$out$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__LogOut$3e$__["LogOut"], {
                            className: "w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300"
                        }, void 0, false, {
                            fileName: "[project]/components/dashboard/sidebar.tsx",
                            lineNumber: 794,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            children: "Cerrar Sesión"
                        }, void 0, false, {
                            fileName: "[project]/components/dashboard/sidebar.tsx",
                            lineNumber: 795,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/dashboard/sidebar.tsx",
                    lineNumber: 790,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/dashboard/sidebar.tsx",
                lineNumber: 789,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/dashboard/sidebar.tsx",
        lineNumber: 593,
        columnNumber: 5
    }, this);
}
_s(Sidebar, "B4yVZlCus4Egc7O0g4NBODrv9Pk=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$dashboard$2f$theme$2d$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTheme"],
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"]
    ];
});
_c = Sidebar;
var _c;
__turbopack_context__.k.register(_c, "Sidebar");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/dashboard/mobile-header.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * ============================================================
 * ENCABEZADO MÓVIL (mobile-header.tsx)
 * ============================================================
 * Header para vista móvil con botón de menú hamburguesa.
 * Controla apertura/cierre del sidebar en dispositivos móviles.
 */ __turbopack_context__.s([
    "MobileHeader",
    ()=>MobileHeader
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$menu$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Menu$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/menu.js [app-client] (ecmascript) <export default as Menu>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$dashboard$2f$theme$2d$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/dashboard/theme-provider.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
function MobileHeader({ isSidebarOpen, onToggleSidebar }) {
    _s();
    const { theme } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$dashboard$2f$theme$2d$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTheme"])();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("fixed top-0 left-0 right-0 h-16 backdrop-blur-xl border-b z-40 lg:hidden flex items-center justify-between px-4", theme === "dark" ? "bg-gradient-to-r from-[#1a1333]/95 to-[#0f0a1e]/95 border-white/5" : "bg-gradient-to-r from-[#FAF7F2]/95 to-[#F5F0E8]/95 border-purple-200/30"),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center gap-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-10 h-10 rounded-lg flex items-center justify-center", theme === "dark" ? "bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600" : "bg-gradient-to-br from-purple-400 to-pink-400"),
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "text-white font-bold text-lg",
                            children: "+"
                        }, void 0, false, {
                            fileName: "[project]/components/dashboard/mobile-header.tsx",
                            lineNumber: 42,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/dashboard/mobile-header.tsx",
                        lineNumber: 34,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                            className: "font-bold text-sm",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: theme === "dark" ? "text-cyan-400" : "text-purple-500",
                                    children: "DANN"
                                }, void 0, false, {
                                    fileName: "[project]/components/dashboard/mobile-header.tsx",
                                    lineNumber: 46,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: theme === "dark" ? "text-purple-400" : "text-pink-400",
                                    children: "+"
                                }, void 0, false, {
                                    fileName: "[project]/components/dashboard/mobile-header.tsx",
                                    lineNumber: 47,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: theme === "dark" ? "text-white" : "text-gray-700",
                                    children: "SALUD"
                                }, void 0, false, {
                                    fileName: "[project]/components/dashboard/mobile-header.tsx",
                                    lineNumber: 48,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/dashboard/mobile-header.tsx",
                            lineNumber: 45,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/dashboard/mobile-header.tsx",
                        lineNumber: 44,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/dashboard/mobile-header.tsx",
                lineNumber: 33,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                onClick: onToggleSidebar,
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300", isSidebarOpen ? theme === "dark" ? "bg-purple-500/20 text-purple-400" : "bg-purple-200/50 text-purple-500" : theme === "dark" ? "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10" : "bg-purple-50 text-gray-600 hover:text-purple-600 hover:bg-purple-100"),
                children: isSidebarOpen ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                    className: "w-5 h-5"
                }, void 0, false, {
                    fileName: "[project]/components/dashboard/mobile-header.tsx",
                    lineNumber: 67,
                    columnNumber: 26
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$menu$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Menu$3e$__["Menu"], {
                    className: "w-5 h-5"
                }, void 0, false, {
                    fileName: "[project]/components/dashboard/mobile-header.tsx",
                    lineNumber: 67,
                    columnNumber: 54
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/dashboard/mobile-header.tsx",
                lineNumber: 54,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/dashboard/mobile-header.tsx",
        lineNumber: 24,
        columnNumber: 5
    }, this);
}
_s(MobileHeader, "JkSxfi8+JQlqgIgDOc3wQN+nVIw=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$dashboard$2f$theme$2d$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTheme"]
    ];
});
_c = MobileHeader;
var _c;
__turbopack_context__.k.register(_c, "MobileHeader");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/ui/sonner.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Toaster",
    ()=>Toaster
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$themes$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next-themes/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/sonner/dist/index.mjs [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
const Toaster = ({ ...props })=>{
    _s();
    const { theme = 'system' } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$themes$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTheme"])();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Toaster"], {
        theme: theme,
        className: "toaster group",
        style: {
            '--normal-bg': 'var(--popover)',
            '--normal-text': 'var(--popover-foreground)',
            '--normal-border': 'var(--border)'
        },
        ...props
    }, void 0, false, {
        fileName: "[project]/components/ui/sonner.tsx",
        lineNumber: 10,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_s(Toaster, "bbCbBsvL7+LiaR8ofHlkcwveh/Y=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$themes$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTheme"]
    ];
});
_c = Toaster;
;
var _c;
__turbopack_context__.k.register(_c, "Toaster");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/socket.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * ============================================================
 * CLIENTE SOCKET.IO (lib/socket.ts)
 * ============================================================
 * Conexión WebSocket para eventos en tiempo real.
 * Maneja reconexiones y autenticación automática.
 */ __turbopack_context__.s([
    "connectSocket",
    ()=>connectSocket,
    "disconnectSocket",
    ()=>disconnectSocket,
    "getSocket",
    ()=>getSocket,
    "socket",
    ()=>socket,
    "useSocket",
    ()=>useSocket
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$socket$2e$io$2d$client$2f$build$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/socket.io-client/build/esm/index.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
'use client';
;
const SOCKET_URL = ("TURBOPACK compile-time value", "http://100.65.25.95:5001") || ("TURBOPACK compile-time value", "/api") || 'http://localhost:5001';
let socket = null;
function getSocket() {
    if (!socket) {
        socket = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$socket$2e$io$2d$client$2f$build$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["io"])(SOCKET_URL, {
            autoConnect: false,
            transports: [
                'polling',
                'websocket'
            ],
            /* Polling primero para mayor confiabilidad */ upgrade: true,
            /* Permite upgrade a WebSocket después de establecer polling */ timeout: 10000,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000
        });
        /* Logs de depuración */ socket.on('connect', ()=>{
            console.log('✅ Socket conectado:', socket?.id);
            console.log('[Socket] Transport:', socket?.io?.engine?.transport?.name);
            console.log('[Socket] URL:', SOCKET_URL);
        });
        socket.on('disconnect', (reason)=>{
            console.log('🔌 Socket desconectado:', reason);
            console.log('[Socket] Disconnect details:', {
                connected: socket?.connected,
                id: socket?.id,
                transport: socket?.io?.engine?.transport?.name
            });
        });
        socket.on('connect_error', (err)=>{
            console.error('❌ Error de conexión de Socket:', err.message);
            console.error('[Socket] Error details:', {
                type: err.type,
                description: err.description,
                context: err.context
            });
        });
        socket.on('error', (err)=>{
            console.error('❌ Socket error:', err);
        });
        socket.io.on('reconnect', (attempt)=>{
            console.log(`🔄 Socket reconectado después de ${attempt} intentos`);
        });
        socket.io.on('reconnect_error', (err)=>{
            console.error('❌ Error de reconexión:', err.message);
        });
        socket.io.on('reconnect_failed', ()=>{
            console.error('❌ Reconexión fallida - máximo de intentos alcanzado');
        });
    }
    return socket;
}
function connectSocket() {
    const socket = getSocket();
    if (!socket.connected) {
        /* Configurar token de auth antes de conectar */ const token = localStorage.getItem('token');
        if (token) {
            socket.auth = {
                token
            };
            console.log('[Socket] Conectando con token de autenticación');
        } else {
            console.warn('[Socket] Conectando sin token de autenticación');
        }
        socket.connect();
    }
    return socket;
}
function disconnectSocket() {
    if (socket?.connected) {
        socket.disconnect();
    }
}
;
;
function useSocket() {
    _s();
    const [socketInstance, setSocketInstance] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useSocket.useEffect": ()=>{
            const socket = connectSocket();
            setSocketInstance(socket);
        }
    }["useSocket.useEffect"], []);
    return socketInstance;
}
_s(useSocket, "3HzENX2wn8q35Dv0fMfkv4rug+M=");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/app/dashboard/layout.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * ============================================================
 * LAYOUT DEL DASHBOARD (app/dashboard/layout.tsx)
 * ============================================================
 * Estructura principal del panel de control.
 * Incluye sidebar, header móvil, tema y notificaciones.
 */ __turbopack_context__.s([
    "default",
    ()=>DashboardLayout
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$dashboard$2f$sidebar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/dashboard/sidebar.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$dashboard$2f$mobile$2d$header$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/dashboard/mobile-header.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$dashboard$2f$theme$2d$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/dashboard/theme-provider.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$sonner$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/sonner.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$socket$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/socket.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
;
;
;
function DashboardLayout({ children }) {
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const { logout } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"])();
    const [isMobileOpen, setIsMobileOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [activeSection, setActiveSection] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('reportes-globales');
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"])();
    /* Mapeo de sección a ruta */ const routeMap = {
        'reportes-globales': '/dashboard/reports',
        'mensajeria-masiva': '/dashboard/send',
        'mensajeria-interna': '/dashboard/messages',
        'base-afiliados-estadistica': '/dashboard/affiliates/stats',
        'base-afiliados-exitosas': '/dashboard/affiliates/success',
        'base-afiliados-exportaciones': '/dashboard/affiliates/exports',
        'base-afiliados-configuracion': '/dashboard/affiliates/config',
        'base-afiliados-lista': '/dashboard/affiliates/list',
        'base-afiliados-cargar': '/dashboard/affiliates/upload',
        'base-afiliados-frescos': '/dashboard/affiliates/fresh',
        'base-afiliados-reutilizables': '/dashboard/affiliates/reusable',
        'base-afiliados-fallidas': '/dashboard/affiliates/failed',
        'herramientas-contacto': '/dashboard/contact/admin',
        'contactar-afiliados-administracion': '/dashboard/contact/admin',
        'contactar-afiliados-datos-dia': '/dashboard/contact/today',
        'palabras-prohibidas-mensajeria': '/dashboard/banned-words',
        'auditorias-seguimiento': '/dashboard/audits/follow-up',
        'auditorias-crear-turno': '/dashboard/audits/create',
        'auditorias-liquidacion': '/dashboard/audits/liquidation',
        'auditorias-falta-clave': '/dashboard/audits/falta-clave',
        'auditorias-rechazada': '/dashboard/audits/rechazada',
        'auditorias-pendiente': '/dashboard/audits/pendiente',
        'auditorias-afip-padron': '/dashboard/audits/afip-padron',
        'auditorias-reventa': '/dashboard/audits/reventa',
        'rrhh-estadisticas': '/dashboard/hr/stats',
        'rrhh-bajo-rendimiento': '/dashboard/hr/low-performance',
        'rrhh-activos': '/dashboard/hr/active',
        'rrhh-bajas-liquidaciones': '/dashboard/hr/separations',
        'rrhh-inactivos': '/dashboard/hr/inactive',
        'rrhh-agregar': '/dashboard/hr/add',
        'rrhh-telefonos': '/dashboard/hr/phones',
        'administracion-registro-ventas': '/dashboard/admin/sales-record',
        'administracion-evidencias': '/dashboard/admin/evidencias',
        'gestion-usuarios': '/dashboard/users',
        'contabilidad': '/dashboard/contabilidad',
        'configuracion-privilegios': '/dashboard/config/privileges'
    };
    /* Sincronizar activeSection con pathname */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "DashboardLayout.useEffect": ()=>{
            const entry = Object.entries(routeMap).find({
                "DashboardLayout.useEffect.entry": ([_, route])=>route === pathname
            }["DashboardLayout.useEffect.entry"]);
            if (entry) {
                setActiveSection(entry[0]);
            }
        }
    }["DashboardLayout.useEffect"], [
        pathname
    ]);
    const handleSectionChange = (section)=>{
        console.log("Layout: handleSectionChange called with section:", section);
        setActiveSection(section);
        setIsMobileOpen(false);
        const route = routeMap[section];
        console.log("Layout: mapped route:", route);
        if (route) {
            router.push(route);
        } else {
            console.warn("Layout: No route found for section:", section);
        }
    };
    /* Inicializar conexión socket para todas las páginas del dashboard */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "DashboardLayout.useEffect": ()=>{
            if ("TURBOPACK compile-time truthy", 1) {
                const token = localStorage.getItem('token');
                if (token) {
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$socket$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["connectSocket"])();
                }
            }
        }
    }["DashboardLayout.useEffect"], []);
    const handleLogout = ()=>{
        logout();
        router.push('/login');
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$dashboard$2f$theme$2d$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ThemeProvider"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex min-h-screen bg-background",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$dashboard$2f$sidebar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Sidebar"], {
                        activeSection: activeSection,
                        onSectionChange: handleSectionChange,
                        isMobileOpen: isMobileOpen,
                        onClose: ()=>setIsMobileOpen(false),
                        onLogout: handleLogout
                    }, void 0, false, {
                        fileName: "[project]/app/dashboard/layout.tsx",
                        lineNumber: 109,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex-1 flex flex-col",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$dashboard$2f$mobile$2d$header$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MobileHeader"], {
                                isSidebarOpen: isMobileOpen,
                                onToggleSidebar: ()=>setIsMobileOpen(!isMobileOpen)
                            }, void 0, false, {
                                fileName: "[project]/app/dashboard/layout.tsx",
                                lineNumber: 118,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                                className: "flex-1 p-4 pt-20 lg:pt-8 lg:p-8 overflow-auto",
                                children: children
                            }, void 0, false, {
                                fileName: "[project]/app/dashboard/layout.tsx",
                                lineNumber: 122,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/dashboard/layout.tsx",
                        lineNumber: 117,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/dashboard/layout.tsx",
                lineNumber: 108,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$sonner$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Toaster"], {}, void 0, false, {
                fileName: "[project]/app/dashboard/layout.tsx",
                lineNumber: 127,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/dashboard/layout.tsx",
        lineNumber: 107,
        columnNumber: 9
    }, this);
}
_s(DashboardLayout, "4N8H5tjJX0OOsmBAsPMv9gvvsN8=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"],
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"]
    ];
});
_c = DashboardLayout;
var _c;
__turbopack_context__.k.register(_c, "DashboardLayout");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_da3c3f7a._.js.map