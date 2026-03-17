(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/components/dashboard/auditorias-recuperacion-base.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * ============================================================
 * AUDITORÍAS RECUPERACIÓN BASE (auditorias-recuperacion-base.tsx)
 * ============================================================
 * Componente base reutilizable para las interfaces de recuperación:
 * - Falta clave
 * - Rechazada
 * - Pendiente
 * - AFIP y Padrón
 * 
 * Permisos:
 * - Borrar → solo Gerencia
 * - Editar → Recuperador y Gerencia
 */ __turbopack_context__.s([
    "AuditoriasRecuperacionBase",
    ()=>AuditoriasRecuperacionBase
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$dom$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-dom/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$dashboard$2f$theme$2d$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/dashboard/theme-provider.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$filter$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Filter$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/filter.js [app-client] (ecmascript) <export default as Filter>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$download$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Download$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/download.js [app-client] (ecmascript) <export default as Download>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$pencil$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Pencil$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/pencil.js [app-client] (ecmascript) <export default as Pencil>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/trash-2.js [app-client] (ecmascript) <export default as Trash2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chevron-down.js [app-client] (ecmascript) <export default as ChevronDown>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$refresh$2d$cw$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__RefreshCw$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/refresh-cw.js [app-client] (ecmascript) <export default as RefreshCw>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2d$big$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-check-big.js [app-client] (ecmascript) <export default as CheckCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/api.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/sonner/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/xlsx/xlsx.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$dashboard$2f$audit$2d$edit$2d$modal$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/dashboard/audit-edit-modal.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$socket$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/socket.ts [app-client] (ecmascript)");
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
;
;
;
;
const INTERFACE_CONFIG = {
    "falta-clave": {
        title: "Falta Clave",
        description: "Ventas con problemas de clave",
        statusFilters: [
            "Falta clave",
            "Falta clave (por ARCA)",
            "Aprobada, pero no reconoce clave",
            "El afiliado cambió la clave"
        ],
        defaultSort: "asc"
    },
    "rechazada": {
        title: "Rechazada",
        description: "Ventas con estado 'Rechazada'",
        statusFilters: [
            "Rechazada"
        ],
        defaultSort: "desc"
    },
    "pendiente": {
        title: "Pendiente",
        description: "Ventas con estado 'Pendiente' o 'Falta documentación'",
        statusFilters: [
            "Pendiente",
            "Falta documentación"
        ],
        defaultSort: "desc"
    },
    "afip-padron": {
        title: "AFIP y Padrón",
        description: "Ventas con estado 'AFIP' o 'Padrón' disponibles para venta",
        statusFilters: [
            "AFIP",
            "Padrón"
        ],
        defaultSort: "desc",
        requireDisponibleParaVenta: true
    }
};
/* Funciones auxiliares */ const formatDateTime = (value)=>{
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    const formattedDate = date.toLocaleDateString("es-AR");
    const formattedTime = date.toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    });
    return `${formattedDate} ${formattedTime}`;
};
const getStatusColor = (status, theme)=>{
    const statusLower = (status || "").toLowerCase();
    const colors = {
        "falta clave": {
            light: "bg-orange-100 text-orange-800",
            dark: "bg-orange-500/20 text-orange-400"
        },
        "falta clave (por arca)": {
            light: "bg-orange-100 text-orange-800",
            dark: "bg-orange-500/20 text-orange-400"
        },
        "rechazada": {
            light: "bg-red-100 text-red-700",
            dark: "bg-red-500/20 text-red-400"
        },
        "pendiente": {
            light: "bg-gray-200 text-gray-700",
            dark: "bg-gray-500/20 text-gray-400"
        },
        "falta documentación": {
            light: "bg-orange-100 text-orange-800",
            dark: "bg-orange-500/20 text-orange-400"
        },
        "afip": {
            light: "bg-blue-100 text-blue-800",
            dark: "bg-blue-500/20 text-blue-400"
        },
        "padrón": {
            light: "bg-indigo-100 text-indigo-800",
            dark: "bg-indigo-500/20 text-indigo-400"
        },
        "completa": {
            light: "bg-lime-600 text-white",
            dark: "bg-lime-500/30 text-lime-300"
        },
        "reprogramada": {
            light: "bg-violet-100 text-violet-800",
            dark: "bg-violet-500/20 text-violet-400"
        },
        "caída": {
            light: "bg-red-600 text-white",
            dark: "bg-red-500/30 text-red-300"
        }
    };
    const color = colors[statusLower] || {
        light: "bg-gray-100 text-gray-700",
        dark: "bg-gray-500/20 text-gray-400"
    };
    return theme === "dark" ? color.dark : color.light;
};
const getObraVendidaClass = (obra, theme)=>{
    const v = (obra || "").toLowerCase();
    if (v === "binimed") return theme === "dark" ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-800";
    if (v === "meplife" || v === "meplife ") return theme === "dark" ? "bg-green-500/20 text-green-400" : "bg-green-200 text-green-800";
    if (v === "turf") return theme === "dark" ? "bg-purple-500/20 text-purple-400" : "bg-purple-100 text-purple-800";
    return theme === "dark" ? "bg-gray-500/20 text-gray-400" : "bg-gray-100 text-gray-700";
};
const getSupervisorName = (audit)=>{
    if (audit.supervisorSnapshot?.nombre) {
        return audit.supervisorSnapshot.nombre;
    }
    if (audit.asesor?.supervisor?.nombre) {
        return audit.asesor.supervisor.nombre;
    }
    return "-";
};
const getSupervisorColor = (supervisorName, theme)=>{
    if (!supervisorName || supervisorName === "-") {
        return theme === "dark" ? "bg-gray-500/20 text-gray-400" : "bg-gray-100 text-gray-700";
    }
    const nombreLower = supervisorName.toLowerCase();
    if (nombreLower.includes('nahuel') && nombreLower.includes('sanchez') || nombreLower.includes('nahia') && nombreLower.includes('avellaneda') || nombreLower.includes('santiago') && nombreLower.includes('goldsztein') || nombreLower.includes('facundo') && nombreLower.includes('tevez')) {
        return theme === "dark" ? "bg-red-900 text-red-200" : "bg-red-100 text-red-800";
    }
    if (nombreLower.includes('abigail') && nombreLower.includes('vera')) {
        return theme === "dark" ? "bg-fuchsia-900 text-fuchsia-200" : "bg-fuchsia-100 text-fuchsia-800";
    }
    if (nombreLower.includes('mateo') && nombreLower.includes('viera')) {
        return theme === "dark" ? "bg-blue-900 text-blue-200" : "bg-blue-100 text-blue-800";
    }
    const colors = [
        {
            light: "bg-teal-100 text-teal-800",
            dark: "bg-teal-900 text-teal-200"
        },
        {
            light: "bg-cyan-100 text-cyan-800",
            dark: "bg-cyan-900 text-cyan-200"
        },
        {
            light: "bg-emerald-100 text-emerald-800",
            dark: "bg-emerald-900 text-emerald-200"
        }
    ];
    let hash = 0;
    for(let i = 0; i < supervisorName.length; i++){
        hash = supervisorName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    const color = colors[index];
    return theme === "dark" ? color.dark : color.light;
};
const getRowBackgroundByStatus = (status, theme)=>{
    if (!status) return "";
    const statusLower = status.toLowerCase();
    const colorMap = {
        "falta clave": {
            light: "bg-orange-50 hover:bg-orange-100",
            dark: "bg-orange-900/20 hover:bg-orange-900/30"
        },
        "falta clave (por arca)": {
            light: "bg-orange-50 hover:bg-orange-100",
            dark: "bg-orange-900/20 hover:bg-orange-900/30"
        },
        "rechazada": {
            light: "bg-red-50 hover:bg-red-100",
            dark: "bg-red-900/20 hover:bg-red-900/30"
        },
        "pendiente": {
            light: "bg-gray-100 hover:bg-gray-200",
            dark: "bg-gray-700/30 hover:bg-gray-700/40"
        },
        "falta documentación": {
            light: "bg-orange-50 hover:bg-orange-100",
            dark: "bg-orange-900/20 hover:bg-orange-900/30"
        },
        "afip": {
            light: "bg-blue-50 hover:bg-blue-100",
            dark: "bg-blue-900/20 hover:bg-blue-900/30"
        },
        "padrón": {
            light: "bg-indigo-50 hover:bg-indigo-100",
            dark: "bg-indigo-900/20 hover:bg-indigo-900/30"
        }
    };
    const colors = colorMap[statusLower];
    if (!colors) return "";
    return theme === "dark" ? colors.dark : colors.light;
};
function AuditoriasRecuperacionBase({ type }) {
    _s();
    const { theme } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$dashboard$2f$theme$2d$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTheme"])();
    const { user } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"])();
    const config = INTERFACE_CONFIG[type];
    /* Estado principal */ const [audits, setAudits] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [sortOrder, setSortOrder] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(config.defaultSort);
    /* Estados de filtros */ const [filters, setFilters] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        afiliado: "",
        cuil: ""
    });
    const [dateFrom, setDateFrom] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [dateTo, setDateTo] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    /* Estados de selección múltiple */ const [selectedSupervisores, setSelectedSupervisores] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [selectedAsesores, setSelectedAsesores] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [supervisorFilterInitialized, setSupervisorFilterInitialized] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    /* Estados de dropdowns */ const [isSupervisorDropdownOpen, setIsSupervisorDropdownOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [isAsesorDropdownOpen, setIsAsesorDropdownOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    /* Listas para dropdowns */ const [asesoresList, setAsesoresList] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [supervisoresList, setSupervisoresList] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    /* Estados de modales */ const [selectedAudit, setSelectedAudit] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [editModalOpen, setEditModalOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    /* Estado del popover de revisión */ const [revisionPopoverId, setRevisionPopoverId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const revisionPopoverRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    /* Referencias para detectar clicks externos */ const supervisorFilterRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const asesorFilterRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    /* Obtener rol del usuario actual */ const userRole = user?.role?.toLowerCase();
    const isGerencia = userRole === 'gerencia';
    const isRecuperador = userRole === 'recuperador';
    const isEncargado = userRole === 'encargado';
    const isSupervisor = userRole === 'supervisor';
    const isIndependiente = userRole === 'independiente';
    const isAdministrativo = userRole === 'administrativo';
    const canEdit = isGerencia || isRecuperador || isEncargado;
    const canDelete = isGerencia;
    const canMarkRevision = isGerencia || isRecuperador || isEncargado || isSupervisor || isIndependiente || isAdministrativo;
    /* Filtrar asesores por supervisor seleccionado */ const filteredAsesoresList = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "AuditoriasRecuperacionBase.useMemo[filteredAsesoresList]": ()=>{
            if (selectedSupervisores.length === 0) return asesoresList;
            const equiposSupervisores = new Set();
            selectedSupervisores.forEach({
                "AuditoriasRecuperacionBase.useMemo[filteredAsesoresList]": (supName)=>{
                    const sup = supervisoresList.find({
                        "AuditoriasRecuperacionBase.useMemo[filteredAsesoresList].sup": (s)=>s.nombre === supName
                    }["AuditoriasRecuperacionBase.useMemo[filteredAsesoresList].sup"]);
                    if (sup?.numeroEquipo) equiposSupervisores.add(sup.numeroEquipo);
                }
            }["AuditoriasRecuperacionBase.useMemo[filteredAsesoresList]"]);
            if (equiposSupervisores.size === 0) return asesoresList;
            return asesoresList.filter({
                "AuditoriasRecuperacionBase.useMemo[filteredAsesoresList]": (a)=>a.numeroEquipo && equiposSupervisores.has(a.numeroEquipo)
            }["AuditoriasRecuperacionBase.useMemo[filteredAsesoresList]"]);
        }
    }["AuditoriasRecuperacionBase.useMemo[filteredAsesoresList]"], [
        asesoresList,
        selectedSupervisores,
        supervisoresList
    ]);
    /* Funciones auxiliares de selección */ const toggleSelection = (value, setFn)=>{
        const normalized = (value || "").trim();
        if (!normalized) return;
        setFn((prev)=>{
            if (prev.includes(normalized)) {
                return prev.filter((item)=>item !== normalized);
            }
            return [
                ...prev,
                normalized
            ];
        });
    };
    const formatMultiLabel = (selected, placeholder, pluralWord)=>{
        if (selected.length === 0) return placeholder;
        if (selected.length === 1) return selected[0];
        return `${selected.length} ${pluralWord}`;
    };
    const buildParams = ()=>{
        const params = {
            ...filters
        };
        // Filtrar por estados específicos de esta interfaz
        params.estado = config.statusFilters.join(",");
        // ✅ CRÍTICO: Ignorar filtro de fecha por defecto para ver todo el historial
        // Las interfaces de Auditorías deben ver TODOS los registros con el estado correspondiente
        params.ignoreDate = 'true';
        if (selectedAsesores.length > 0) {
            params.asesor = selectedAsesores.map((a)=>a.trim()).filter(Boolean).join(",");
        }
        if (selectedSupervisores.length > 0) {
            params.supervisor = selectedSupervisores.map((s)=>s.trim()).filter(Boolean).join(",");
        }
        // Lógica de fecha (solo si el usuario especifica un rango)
        if (filters.cuil && filters.cuil.trim() !== "") {
            delete params.dateFrom;
            delete params.dateTo;
        } else {
            if (dateFrom && dateTo) {
                // Si hay rango de fechas, desactivar ignoreDate para aplicar el filtro
                delete params.ignoreDate;
                params.dateFrom = dateFrom;
                params.dateTo = dateTo;
            } else if (dateFrom) {
                delete params.ignoreDate;
                params.dateFrom = dateFrom;
            } else if (dateTo) {
                delete params.ignoreDate;
                params.dateTo = dateTo;
            }
        }
        Object.keys(params).forEach((k)=>{
            if (params[k] === "" || params[k] === null || params[k] === undefined) {
                delete params[k];
            }
        });
        return params;
    };
    const fetchAudits = async ()=>{
        try {
            setLoading(true);
            const params = buildParams();
            const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].audits.list(params);
            let auditsArray = Array.isArray(data) ? data : [];
            // Filtrar por disponibleParaVenta si es requerido
            if (config.requireDisponibleParaVenta) {
                auditsArray = auditsArray.filter((audit)=>audit.status?.toLowerCase() === 'afip' || audit.disponibleParaVenta === true);
            }
            // Ordenar según configuración
            auditsArray.sort((a, b)=>{
                const dateA = new Date(a.createdAt).getTime();
                const dateB = new Date(b.createdAt).getTime();
                return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
            });
            setAudits(auditsArray);
        } catch (err) {
            console.error(err);
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error("Error al cargar auditorías");
            setAudits([]);
        } finally{
            setLoading(false);
        }
    };
    const fetchFilterOptions = async ()=>{
        try {
            const asesoresRes = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].users.list("includeAllAuditors=true");
            const asesoresData = Array.isArray(asesoresRes.data) ? asesoresRes.data : [];
            const asesoresFiltered = asesoresData.filter((u)=>{
                const isActive = u?.active !== false;
                const isAsesorRole = u.role === "asesor" || u.role === "Asesor";
                const isAuditorWithTeam = (u.role === "auditor" || u.role === "Auditor") && u.numeroEquipo;
                return isActive && (isAsesorRole || isAuditorWithTeam) && u.nombre;
            }).sort((a, b)=>a.nombre.localeCompare(b.nombre));
            setAsesoresList(asesoresFiltered);
            const supervisoresData = asesoresData.filter((u)=>{
                const isActive = u?.active !== false;
                const role = u.role?.toLowerCase();
                return isActive && (role === "supervisor" || role === "gerencia" || role === "encargado") && u.nombre;
            }).sort((a, b)=>a.nombre.localeCompare(b.nombre));
            setSupervisoresList(supervisoresData);
        } catch (err) {
            console.error("Error al cargar opciones de filtros:", err);
        }
    };
    const handleMarkRevision = async (auditId, listaParaReventa)=>{
        try {
            const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].audits.markRevision(auditId, {
                lista_para_reventa: listaParaReventa
            });
            setAudits((prev)=>prev.map((a)=>a._id === auditId ? {
                        ...a,
                        ultima_revision: data.ultima_revision,
                        lista_para_reventa: data.lista_para_reventa,
                        revisado_por: data.revisado_por
                    } : a));
            setRevisionPopoverId(null);
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success(listaParaReventa ? "Marcado como revisado y listo para reventa" : "Marcado como revisado");
        } catch (err) {
            console.error(err);
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error("Error al marcar revisión");
        }
    };
    const handleExportXLSX = ()=>{
        if (!audits || audits.length === 0) {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].info("No hay datos para exportar");
            return;
        }
        const rows = audits.map((a)=>({
                "Fecha de creación": formatDateTime(a.createdAt),
                Afiliado: a.nombre || "-",
                CUIL: a.cuil || "-",
                Teléfono: a.telefono || "-",
                "Obra Social Vendida": a.obraSocialVendida || "-",
                Asesor: a.asesor?.nombre || "-",
                Supervisor: getSupervisorName(a),
                Grupo: a.asesor?.numeroEquipo || "-",
                Administrativo: a.administrador?.nombre || "-",
                Estado: a.status || "-",
                "Última rev.": a.ultima_revision ? `${formatDateTime(a.ultima_revision)}${a.revisado_por?.nombre ? ` — ${a.revisado_por.nombre}` : ''}` : "Sin revisión",
                "Reventa": a.lista_para_reventa ? "Sí" : "No"
            }));
        const ws = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["utils"].json_to_sheet(rows);
        const wb = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["utils"].book_new();
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["utils"].book_append_sheet(wb, ws, config.title);
        const today = new Date().toISOString().slice(0, 10);
        const filename = `${type}_${today}.xlsx`;
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["writeFile"](wb, filename);
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success("Exportado correctamente");
    };
    const handleFilterChange = (field, value)=>{
        setFilters((prev)=>({
                ...prev,
                [field]: value
            }));
    };
    const clearFilters = ()=>{
        setFilters({
            afiliado: "",
            cuil: ""
        });
        setDateFrom("");
        setDateTo("");
        // Los supervisores NO pueden limpiar su propio filtro
        if (!isSupervisor) {
            setSelectedSupervisores([]);
        }
        setSelectedAsesores([]);
    };
    const handleDeleteAudit = async (auditId)=>{
        if (!canDelete) {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error("No tienes permisos para eliminar auditorías");
            return;
        }
        if (!confirm("¿Estás seguro de eliminar esta auditoría?")) return;
        try {
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].audits.delete(auditId);
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success("Auditoría eliminada");
            fetchAudits();
        } catch (error) {
            console.error("Error deleting audit:", error);
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error("Error al eliminar auditoría");
        }
    };
    const openEditModal = (audit)=>{
        if (!canEdit) {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error("No tienes permisos para editar auditorías");
            return;
        }
        setSelectedAudit(audit);
        setEditModalOpen(true);
    };
    /* Efectos */ /* Cargar opciones de filtros primero */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AuditoriasRecuperacionBase.useEffect": ()=>{
            fetchFilterOptions();
        }
    }["AuditoriasRecuperacionBase.useEffect"], []);
    /* Auto-seleccionar supervisor actual si el usuario es supervisor */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AuditoriasRecuperacionBase.useEffect": ()=>{
            if (isSupervisor && user?.nombre && supervisoresList.length > 0) {
                const supervisorActual = supervisoresList.find({
                    "AuditoriasRecuperacionBase.useEffect.supervisorActual": (s)=>s._id === user._id || s.nombre === user.nombre
                }["AuditoriasRecuperacionBase.useEffect.supervisorActual"]);
                if (supervisorActual && !selectedSupervisores.includes(supervisorActual.nombre)) {
                    setSelectedSupervisores([
                        supervisorActual.nombre
                    ]);
                }
                setSupervisorFilterInitialized(true);
            } else if (!isSupervisor) {
                // Si no es supervisor, marcar como inicializado inmediatamente
                setSupervisorFilterInitialized(true);
            }
        }
    }["AuditoriasRecuperacionBase.useEffect"], [
        isSupervisor,
        user,
        supervisoresList
    ]);
    /* Carga inicial de auditorías - solo después de inicializar filtro de supervisor */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AuditoriasRecuperacionBase.useEffect": ()=>{
            if (!supervisorFilterInitialized) return;
            fetchAudits();
            const socket = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$socket$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["connectSocket"])();
            socket.emit("audits:subscribeAll");
            const handleAuditUpdate = {
                "AuditoriasRecuperacionBase.useEffect.handleAuditUpdate": (updatedAudit)=>{
                    setAudits({
                        "AuditoriasRecuperacionBase.useEffect.handleAuditUpdate": (prev)=>{
                            const index = prev.findIndex({
                                "AuditoriasRecuperacionBase.useEffect.handleAuditUpdate.index": (a)=>a._id === updatedAudit._id
                            }["AuditoriasRecuperacionBase.useEffect.handleAuditUpdate.index"]);
                            if (index === -1) return prev;
                            const updated = [
                                ...prev
                            ];
                            updated[index] = {
                                ...prev[index],
                                ...updatedAudit
                            };
                            return updated;
                        }
                    }["AuditoriasRecuperacionBase.useEffect.handleAuditUpdate"]);
                }
            }["AuditoriasRecuperacionBase.useEffect.handleAuditUpdate"];
            const handleAuditDeleted = {
                "AuditoriasRecuperacionBase.useEffect.handleAuditDeleted": (data)=>{
                    setAudits({
                        "AuditoriasRecuperacionBase.useEffect.handleAuditDeleted": (prev)=>prev.filter({
                                "AuditoriasRecuperacionBase.useEffect.handleAuditDeleted": (a)=>a._id !== data._id
                            }["AuditoriasRecuperacionBase.useEffect.handleAuditDeleted"])
                    }["AuditoriasRecuperacionBase.useEffect.handleAuditDeleted"]);
                    if (selectedAudit && selectedAudit._id === data._id) {
                        setEditModalOpen(false);
                        setSelectedAudit(null);
                    }
                }
            }["AuditoriasRecuperacionBase.useEffect.handleAuditDeleted"];
            socket.on("audit:update", handleAuditUpdate);
            socket.on("audit:deleted", handleAuditDeleted);
            return ({
                "AuditoriasRecuperacionBase.useEffect": ()=>{
                    socket.off("audit:update", handleAuditUpdate);
                    socket.off("audit:deleted", handleAuditDeleted);
                    socket.emit("audits:unsubscribeAll");
                }
            })["AuditoriasRecuperacionBase.useEffect"];
        }
    }["AuditoriasRecuperacionBase.useEffect"], [
        supervisorFilterInitialized
    ]);
    /* Recargar cuando cambian los filtros */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AuditoriasRecuperacionBase.useEffect": ()=>{
            if (!supervisorFilterInitialized) return;
            fetchAudits();
        }
    }["AuditoriasRecuperacionBase.useEffect"], [
        filters,
        selectedSupervisores,
        selectedAsesores,
        dateFrom,
        dateTo,
        sortOrder,
        supervisorFilterInitialized
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AuditoriasRecuperacionBase.useEffect": ()=>{
            const handleClickOutside = {
                "AuditoriasRecuperacionBase.useEffect.handleClickOutside": (event)=>{
                    if (supervisorFilterRef.current && !supervisorFilterRef.current.contains(event.target)) {
                        setIsSupervisorDropdownOpen(false);
                    }
                    if (asesorFilterRef.current && !asesorFilterRef.current.contains(event.target)) {
                        setIsAsesorDropdownOpen(false);
                    }
                    if (revisionPopoverRef.current && !revisionPopoverRef.current.contains(event.target)) {
                        setRevisionPopoverId(null);
                    }
                }
            }["AuditoriasRecuperacionBase.useEffect.handleClickOutside"];
            document.addEventListener("mousedown", handleClickOutside);
            return ({
                "AuditoriasRecuperacionBase.useEffect": ()=>document.removeEventListener("mousedown", handleClickOutside)
            })["AuditoriasRecuperacionBase.useEffect"];
        }
    }["AuditoriasRecuperacionBase.useEffect"], [
        revisionPopoverId
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-6 animate-fade-in-up",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("rounded-2xl border p-6 backdrop-blur-sm relative z-20", theme === "dark" ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10" : "bg-white border-gray-200 shadow-sm"),
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center justify-between mb-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$filter$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Filter$3e$__["Filter"], {
                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-5 h-5", theme === "dark" ? "text-purple-400" : "text-purple-500")
                                    }, void 0, false, {
                                        fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                        lineNumber: 633,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("font-semibold", theme === "dark" ? "text-white" : "text-gray-800"),
                                        children: config.title
                                    }, void 0, false, {
                                        fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                        lineNumber: 634,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                lineNumber: 632,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-500"),
                                children: config.description
                            }, void 0, false, {
                                fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                lineNumber: 638,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                        lineNumber: 631,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "text",
                                placeholder: "Buscar afiliado",
                                value: filters.afiliado,
                                onChange: (e)=>handleFilterChange("afiliado", e.target.value),
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-white/5 border-white/10 text-white placeholder-gray-500" : "bg-white border-gray-200 text-gray-800 placeholder-gray-400")
                            }, void 0, false, {
                                fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                lineNumber: 645,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "text",
                                placeholder: "Buscar CUIL",
                                value: filters.cuil,
                                onChange: (e)=>handleFilterChange("cuil", e.target.value),
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-white/5 border-white/10 text-white placeholder-gray-500" : "bg-white border-gray-200 text-gray-800 placeholder-gray-400")
                            }, void 0, false, {
                                fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                lineNumber: 657,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "date",
                                value: dateFrom,
                                onChange: (e)=>setDateFrom(e.target.value),
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"),
                                placeholder: "Desde"
                            }, void 0, false, {
                                fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                lineNumber: 671,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "date",
                                value: dateTo,
                                onChange: (e)=>setDateTo(e.target.value),
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"),
                                placeholder: "Hasta"
                            }, void 0, false, {
                                fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                lineNumber: 683,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "relative",
                                ref: supervisorFilterRef,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>!isSupervisor && setIsSupervisorDropdownOpen(!isSupervisorDropdownOpen),
                                        disabled: isSupervisor,
                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800", isSupervisor && "opacity-60 cursor-not-allowed"),
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "truncate",
                                                children: formatMultiLabel(selectedSupervisores, "Supervisor", "supervisores")
                                            }, void 0, false, {
                                                fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                lineNumber: 705,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__["ChevronDown"], {
                                                className: "w-4 h-4"
                                            }, void 0, false, {
                                                fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                lineNumber: 706,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                        lineNumber: 696,
                                        columnNumber: 13
                                    }, this),
                                    isSupervisorDropdownOpen && !isSupervisor && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-lg shadow-lg border bg-white dark:bg-gray-800 dark:border-gray-700",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        type: "button",
                                                        onClick: ()=>setSelectedSupervisores(supervisoresList.map((s)=>s.nombre)),
                                                        className: "text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400",
                                                        children: "Seleccionar todos"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                        lineNumber: 711,
                                                        columnNumber: 19
                                                    }, this),
                                                    selectedSupervisores.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        type: "button",
                                                        onClick: ()=>setSelectedSupervisores([]),
                                                        className: "text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400",
                                                        children: "Limpiar"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                        lineNumber: 719,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                lineNumber: 710,
                                                columnNumber: 17
                                            }, this),
                                            supervisoresList.map((s)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "checkbox",
                                                            checked: selectedSupervisores.includes(s.nombre),
                                                            onChange: ()=>toggleSelection(s.nombre, setSelectedSupervisores),
                                                            className: "accent-blue-600"
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                            lineNumber: 730,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "dark:text-gray-200",
                                                            children: s.nombre
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                            lineNumber: 736,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, s._id, true, {
                                                    fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                    lineNumber: 729,
                                                    columnNumber: 19
                                                }, this))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                        lineNumber: 709,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                lineNumber: 695,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "relative",
                                ref: asesorFilterRef,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>setIsAsesorDropdownOpen(!isAsesorDropdownOpen),
                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"),
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "truncate",
                                                children: formatMultiLabel(selectedAsesores, "Asesor", "asesores")
                                            }, void 0, false, {
                                                fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                lineNumber: 752,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__["ChevronDown"], {
                                                className: "w-4 h-4"
                                            }, void 0, false, {
                                                fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                lineNumber: 753,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                        lineNumber: 745,
                                        columnNumber: 13
                                    }, this),
                                    isAsesorDropdownOpen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-lg shadow-lg border bg-white dark:bg-gray-800 dark:border-gray-700",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        type: "button",
                                                        onClick: ()=>setSelectedAsesores(filteredAsesoresList.map((a)=>a.nombre)),
                                                        className: "text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400",
                                                        children: "Seleccionar todos"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                        lineNumber: 758,
                                                        columnNumber: 19
                                                    }, this),
                                                    selectedAsesores.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        type: "button",
                                                        onClick: ()=>setSelectedAsesores([]),
                                                        className: "text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400",
                                                        children: "Limpiar"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                        lineNumber: 766,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                lineNumber: 757,
                                                columnNumber: 17
                                            }, this),
                                            filteredAsesoresList.map((a)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "checkbox",
                                                            checked: selectedAsesores.includes(a.nombre),
                                                            onChange: ()=>toggleSelection(a.nombre, setSelectedAsesores),
                                                            className: "accent-blue-600"
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                            lineNumber: 777,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "dark:text-gray-200",
                                                            children: a.nombre
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                            lineNumber: 783,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, a._id, true, {
                                                    fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                    lineNumber: 776,
                                                    columnNumber: 19
                                                }, this))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                        lineNumber: 756,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                lineNumber: 744,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                        lineNumber: 644,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-wrap items-center gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: clearFilters,
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors", theme === "dark" ? "bg-white/10 text-gray-300 hover:bg-white/20" : "bg-gray-100 text-gray-600 hover:bg-gray-200"),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                        className: "w-4 h-4"
                                    }, void 0, false, {
                                        fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                        lineNumber: 802,
                                        columnNumber: 13
                                    }, this),
                                    "Limpiar"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                lineNumber: 793,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: fetchAudits,
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors", theme === "dark" ? "bg-purple-600 text-white hover:bg-purple-700" : "bg-purple-500 text-white hover:bg-purple-600"),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$refresh$2d$cw$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__RefreshCw$3e$__["RefreshCw"], {
                                        className: "w-4 h-4"
                                    }, void 0, false, {
                                        fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                        lineNumber: 814,
                                        columnNumber: 13
                                    }, this),
                                    "Actualizar"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                lineNumber: 805,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: handleExportXLSX,
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors", theme === "dark" ? "bg-green-600 text-white hover:bg-green-700" : "bg-green-500 text-white hover:bg-green-600"),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$download$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Download$3e$__["Download"], {
                                        className: "w-4 h-4"
                                    }, void 0, false, {
                                        fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                        lineNumber: 826,
                                        columnNumber: 13
                                    }, this),
                                    "Exportar Excel"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                lineNumber: 817,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setSortOrder(sortOrder === "asc" ? "desc" : "asc"),
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors", theme === "dark" ? "bg-white/10 text-gray-300 hover:bg-white/20" : "bg-gray-100 text-gray-600 hover:bg-gray-200"),
                                children: sortOrder === "asc" ? "📅 Más antiguas primero" : "📅 Más recientes primero"
                            }, void 0, false, {
                                fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                lineNumber: 829,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                        lineNumber: 792,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                lineNumber: 623,
                columnNumber: 7
            }, this),
            audits.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("rounded-xl border p-3", theme === "dark" ? "bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border-blue-700/30" : "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200"),
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex flex-wrap items-center gap-2 text-sm",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("font-bold", theme === "dark" ? "text-gray-200" : "text-gray-800"),
                        children: [
                            "Total: ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: theme === "dark" ? "text-blue-400" : "text-blue-600",
                                children: audits.length
                            }, void 0, false, {
                                fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                lineNumber: 853,
                                columnNumber: 22
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                        lineNumber: 852,
                        columnNumber: 13
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                    lineNumber: 851,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                lineNumber: 845,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("rounded-2xl border overflow-hidden", theme === "dark" ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10" : "bg-white border-gray-200 shadow-sm"),
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "overflow-x-auto",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                        className: "w-full text-xs",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-left font-semibold uppercase tracking-wider sticky top-0 z-10", theme === "dark" ? "bg-gray-900 text-gray-300" : "bg-gray-50 text-gray-600"),
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            className: "px-2 py-2 w-[120px]",
                                            children: "Fecha creación"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                            lineNumber: 875,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            className: "px-2 py-2 min-w-[150px]",
                                            children: "Afiliado"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                            lineNumber: 876,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            className: "px-2 py-2 w-[100px]",
                                            children: "CUIL"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                            lineNumber: 877,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            className: "px-2 py-2 w-[100px]",
                                            children: "Teléfono"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                            lineNumber: 878,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            className: "px-2 py-2 w-[80px]",
                                            children: "O.S. Ven"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                            lineNumber: 879,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            className: "px-2 py-2 min-w-[100px]",
                                            children: "Asesor"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                            lineNumber: 880,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            className: "px-2 py-2 min-w-[100px]",
                                            children: "Supervisor"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                            lineNumber: 881,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            className: "px-2 py-2 w-[60px]",
                                            children: "Grupo"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                            lineNumber: 882,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            className: "px-2 py-2 min-w-[100px]",
                                            children: "Admin"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                            lineNumber: 883,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            className: "px-2 py-2 min-w-[100px]",
                                            children: "Estado"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                            lineNumber: 884,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            className: "px-2 py-2 w-[100px]",
                                            children: "Última rev."
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                            lineNumber: 885,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            className: "px-2 py-2 w-[70px] text-center",
                                            children: "Reventa"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                            lineNumber: 886,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            className: "px-2 py-2 w-[100px] text-center",
                                            children: "Acciones"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                            lineNumber: 887,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                    lineNumber: 874,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                lineNumber: 870,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                className: "divide-y divide-gray-200 dark:divide-white/5",
                                children: loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                        colSpan: 13,
                                        className: "px-4 py-8 text-center opacity-50",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex justify-center items-center gap-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$refresh$2d$cw$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__RefreshCw$3e$__["RefreshCw"], {
                                                    className: "w-4 h-4 animate-spin"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                    lineNumber: 895,
                                                    columnNumber: 23
                                                }, this),
                                                "Cargando auditorías..."
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                            lineNumber: 894,
                                            columnNumber: 21
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                        lineNumber: 893,
                                        columnNumber: 19
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                    lineNumber: 892,
                                    columnNumber: 17
                                }, this) : audits.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                        colSpan: 13,
                                        className: "px-4 py-8 text-center opacity-50",
                                        children: "No se encontraron auditorías"
                                    }, void 0, false, {
                                        fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                        lineNumber: 902,
                                        columnNumber: 19
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                    lineNumber: 901,
                                    columnNumber: 17
                                }, this) : audits.map((item, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("transition-colors group", getRowBackgroundByStatus(item.status, theme) || (idx % 2 === 0 ? "" : theme === "dark" ? "bg-white/[0.02]" : "bg-gray-50/50")),
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("px-3 py-2.5 text-center", theme === "dark" ? "text-gray-400" : "text-gray-600"),
                                                children: formatDateTime(item.createdAt)
                                            }, void 0, false, {
                                                fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                lineNumber: 916,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "px-2 py-1.5 text-center font-medium truncate max-w-[150px]",
                                                title: item.nombre,
                                                children: item.nombre
                                            }, void 0, false, {
                                                fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                lineNumber: 919,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "px-2 py-1.5 text-center font-mono opacity-70 truncate",
                                                children: item.cuil || "-"
                                            }, void 0, false, {
                                                fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                lineNumber: 922,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "px-2 py-1.5 text-center font-mono opacity-70 truncate",
                                                children: item.telefono || "-"
                                            }, void 0, false, {
                                                fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                lineNumber: 925,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "px-2 py-1.5 text-center",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium truncate max-w-[80px]", getObraVendidaClass(item.obraSocialVendida, theme)),
                                                    children: item.obraSocialVendida
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                    lineNumber: 929,
                                                    columnNumber: 23
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                lineNumber: 928,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("px-3 py-3 text-center", theme === "dark" ? "text-gray-300" : "text-gray-700"),
                                                children: item.asesor?.nombre || '-'
                                            }, void 0, false, {
                                                fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                lineNumber: 936,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "px-2 py-1.5 text-center",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("px-2 py-0.5 rounded text-[10px] font-medium truncate max-w-[120px] inline-block", getSupervisorColor(getSupervisorName(item), theme)),
                                                    title: getSupervisorName(item),
                                                    children: getSupervisorName(item)
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                    lineNumber: 940,
                                                    columnNumber: 23
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                lineNumber: 939,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "px-2 py-1.5 text-center",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold truncate max-w-[60px]", theme === "dark" ? "bg-indigo-900 text-indigo-200" : "bg-indigo-100 text-indigo-800"),
                                                    children: item.asesor?.numeroEquipo || "-"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                    lineNumber: 948,
                                                    columnNumber: 23
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                lineNumber: 947,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("px-3 py-3 text-center", theme === "dark" ? "text-gray-400" : "text-gray-600"),
                                                children: item.administrador?.nombre || '-'
                                            }, void 0, false, {
                                                fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                lineNumber: 955,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "px-2 py-1.5 text-center",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium truncate max-w-[120px]", getStatusColor(item.status, theme)),
                                                    title: item.status,
                                                    children: item.status
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                    lineNumber: 959,
                                                    columnNumber: 23
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                lineNumber: 958,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("px-2 py-1.5 text-center", theme === "dark" ? "text-gray-400" : "text-gray-600"),
                                                children: item.ultima_revision ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    title: item.revisado_por?.nombre || '',
                                                    children: [
                                                        formatDateTime(item.ultima_revision),
                                                        item.revisado_por?.nombre && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("block text-[9px]", theme === "dark" ? "text-gray-500" : "text-gray-400"),
                                                            children: item.revisado_por.nombre
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                            lineNumber: 971,
                                                            columnNumber: 29
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                    lineNumber: 968,
                                                    columnNumber: 25
                                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "opacity-40",
                                                    children: "Sin revisión"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                    lineNumber: 977,
                                                    columnNumber: 25
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                lineNumber: 966,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "px-2 py-1.5 text-center",
                                                children: item.lista_para_reventa ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold", theme === "dark" ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-700"),
                                                    children: "Sí"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                    lineNumber: 982,
                                                    columnNumber: 25
                                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium", theme === "dark" ? "bg-gray-500/20 text-gray-400" : "bg-gray-100 text-gray-500"),
                                                    children: "No"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                    lineNumber: 987,
                                                    columnNumber: 25
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                lineNumber: 980,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "px-2 py-1.5 text-center",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex items-center justify-center gap-1 transition-opacity relative",
                                                    children: [
                                                        canMarkRevision && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "relative",
                                                            ref: revisionPopoverId === item._id ? revisionPopoverRef : undefined,
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                    onClick: ()=>setRevisionPopoverId(revisionPopoverId === item._id ? null : item._id),
                                                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("p-1 rounded", item.ultima_revision ? "hover:bg-green-100 text-green-600 dark:hover:bg-green-900/30 dark:text-green-400" : "hover:bg-gray-100 text-gray-400 dark:hover:bg-gray-700 dark:text-gray-500"),
                                                                    title: "Marcar revisión",
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2d$big$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle$3e$__["CheckCircle"], {
                                                                        className: "w-3.5 h-3.5"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                                        lineNumber: 1007,
                                                                        columnNumber: 31
                                                                    }, this)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                                    lineNumber: 997,
                                                                    columnNumber: 29
                                                                }, this),
                                                                revisionPopoverId === item._id && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("absolute right-0 bottom-full mb-1 z-50 w-48 rounded-lg shadow-lg border p-2 space-y-1", theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"),
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                            onClick: ()=>handleMarkRevision(item._id, false),
                                                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-full text-left px-2 py-1.5 rounded text-xs font-medium transition-colors", theme === "dark" ? "hover:bg-gray-700 text-gray-200" : "hover:bg-gray-100 text-gray-700"),
                                                                            children: "Revisado"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                                            lineNumber: 1014,
                                                                            columnNumber: 33
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                            onClick: ()=>handleMarkRevision(item._id, true),
                                                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-full text-left px-2 py-1.5 rounded text-xs font-medium transition-colors", theme === "dark" ? "hover:bg-green-900/30 text-green-400" : "hover:bg-green-50 text-green-700"),
                                                                            children: "Revisado + Reventa"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                                            lineNumber: 1023,
                                                                            columnNumber: 33
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                                    lineNumber: 1010,
                                                                    columnNumber: 31
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                            lineNumber: 996,
                                                            columnNumber: 27
                                                        }, this),
                                                        canEdit && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                            onClick: ()=>openEditModal(item),
                                                            className: "p-1 hover:bg-blue-100 text-blue-600 rounded dark:hover:bg-blue-900/30 dark:text-blue-400",
                                                            title: "Editar",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$pencil$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Pencil$3e$__["Pencil"], {
                                                                className: "w-3 h-3"
                                                            }, void 0, false, {
                                                                fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                                lineNumber: 1042,
                                                                columnNumber: 29
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                            lineNumber: 1037,
                                                            columnNumber: 27
                                                        }, this),
                                                        canDelete && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                            onClick: ()=>handleDeleteAudit(item._id),
                                                            className: "p-1 hover:bg-red-100 text-red-600 rounded dark:hover:bg-red-900/30 dark:text-red-400",
                                                            title: "Eliminar",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__["Trash2"], {
                                                                className: "w-3 h-3"
                                                            }, void 0, false, {
                                                                fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                                lineNumber: 1051,
                                                                columnNumber: 29
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                            lineNumber: 1046,
                                                            columnNumber: 27
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                    lineNumber: 994,
                                                    columnNumber: 23
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                                lineNumber: 993,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, item._id, true, {
                                        fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                        lineNumber: 908,
                                        columnNumber: 19
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                                lineNumber: 890,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                        lineNumber: 869,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                    lineNumber: 868,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                lineNumber: 860,
                columnNumber: 7
            }, this),
            selectedAudit && editModalOpen && ("TURBOPACK compile-time value", "object") !== "undefined" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$dom$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createPortal"])(/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$dashboard$2f$audit$2d$edit$2d$modal$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AuditEditModal"], {
                isOpen: editModalOpen,
                onClose: ()=>{
                    setEditModalOpen(false);
                    setSelectedAudit(null);
                },
                audit: selectedAudit,
                onSave: (updated)=>{
                    setAudits((prev)=>prev.map((a)=>a._id === updated._id ? updated : a));
                    setEditModalOpen(false);
                    setSelectedAudit(null);
                }
            }, void 0, false, {
                fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
                lineNumber: 1066,
                columnNumber: 9
            }, this), document.body)
        ]
    }, void 0, true, {
        fileName: "[project]/components/dashboard/auditorias-recuperacion-base.tsx",
        lineNumber: 621,
        columnNumber: 5
    }, this);
}
_s(AuditoriasRecuperacionBase, "OmkIYL5tQiSckDvzRXzqBpssXIU=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$dashboard$2f$theme$2d$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTheme"],
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"]
    ];
});
_c = AuditoriasRecuperacionBase;
var _c;
__turbopack_context__.k.register(_c, "AuditoriasRecuperacionBase");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=components_dashboard_auditorias-recuperacion-base_tsx_d6c4f097._.js.map