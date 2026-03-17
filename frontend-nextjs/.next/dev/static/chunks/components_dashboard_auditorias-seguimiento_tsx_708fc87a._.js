(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/components/dashboard/auditorias-seguimiento.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * ============================================================
 * SEGUIMIENTO DE AUDITORÍAS (auditorias-seguimiento.tsx)
 * ============================================================
 * Vista principal para seguimiento de auditorías.
 * Permite filtrar, buscar, editar y exportar auditorías.
 */ __turbopack_context__.s([
    "AuditoriasSeguimiento",
    ()=>AuditoriasSeguimiento
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$dom$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-dom/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$dashboard$2f$theme$2d$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/dashboard/theme-provider.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$filter$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Filter$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/filter.js [app-client] (ecmascript) <export default as Filter>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$download$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Download$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/download.js [app-client] (ecmascript) <export default as Download>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Calendar$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/calendar.js [app-client] (ecmascript) <export default as Calendar>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$column$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__BarChart3$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chart-column.js [app-client] (ecmascript) <export default as BarChart3>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$pencil$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Pencil$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/pencil.js [app-client] (ecmascript) <export default as Pencil>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Eye$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/eye.js [app-client] (ecmascript) <export default as Eye>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/trash-2.js [app-client] (ecmascript) <export default as Trash2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chevron-down.js [app-client] (ecmascript) <export default as ChevronDown>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$refresh$2d$cw$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__RefreshCw$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/refresh-cw.js [app-client] (ecmascript) <export default as RefreshCw>");
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
/* Constantes: Obras sociales argentinas */ const ARGENTINE_OBRAS_SOCIALES = [
    "OSDE",
    "OSDEPYM",
    "IOMA",
    "OSSEG",
    "OSDE 210",
    "OSFATUN",
    "OSDE GBA",
    "OSECAC (126205)",
    "OSPRERA",
    "OMINT",
    "OSSEGUR",
    "OSPR",
    "OSUTHGRA (108803)",
    "OSBLYCA",
    "UOM",
    "OSPM",
    "OSPECON (105408)",
    "Elevar (114307)",
    "OSCHOCA (105804)",
    "OSPEP (113908)",
    "OSPROTURA",
    "OSPSIP (119708)",
    "OSEIV (122401)",
    "OSPIF (108100)",
    "OSIPA (114208)",
    "OSPESESGYPE (107206)",
    "OSTCARA (126007)",
    "OSPIT (121002)",
    "OSMP (111209)",
    "OSPECA (103709)",
    "OSPIQYP (118705)",
    "OSBLYCA (102904)",
    "VIASANO (2501)",
    "OSPCYD (103402)",
    "OSUOMRA (112103)",
    "OSAMOC (3405)",
    "OSPAGA (101000)",
    "OSPF (107404)",
    "OSPIP (116006)",
    "OSPIC",
    "OSG (109202)",
    "OSPERYH (106500)",
    "OSPCRA (104009)",
    "OSPMA (700108)",
    "HOMINIS (901501)",
    "OSCTCP (121606)",
    "OSMA (112509)"
];
const OBRAS_VENDIDAS = [
    "Binimed",
    "Meplife",
    "TURF"
];
const STATUS_OPTIONS = [
    "Sin estado",
    "Mensaje enviado",
    "En videollamada",
    "Rechazada",
    "Falta documentación",
    "Falta clave",
    "Falta clave (por ARCA)",
    "Reprogramada",
    "Reprogramada (falta confirmar hora)",
    "Reprogramada (solo clave)",
    "Completa",
    "No atendió",
    "Tiene dudas",
    "Falta clave y documentación",
    "No le llegan los mensajes",
    "Cortó",
    "Autovinculación",
    "Caída",
    "Rehacer vídeo",
    "Pendiente",
    "QR hecho",
    "QR hecho pero pendiente de aprobación",
    "AFIP",
    "Baja laboral con nueva alta",
    "Baja laboral sin nueva alta",
    "Padrón",
    "En revisión",
    "Remuneración no válida",
    "Cargada",
    "Aprobada",
    "Aprobada, pero no reconoce clave",
    "El afiliado cambió la clave"
];
const TIPO_VENTA = [
    "Alta",
    "Cambio"
];
/* Funciones auxiliares */ const formatDateTime = (value)=>{
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    /* Usar zona horaria local del navegador para consistencia */ const formattedDate = date.toLocaleDateString("es-AR");
    const formattedTime = date.toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    });
    return `${formattedDate} ${formattedTime}`;
};
// ✅ Para fechas puras (sin hora específica) - evita problemas de zona horaria
const formatDateOnly = (value)=>{
    if (!value) return "-";
    /* Extraer solo la parte de fecha del ISO string para evitar conversión de zona horaria */ const dateStr = value.split('T')[0];
    if (!dateStr) return "-";
    const [year, month, day] = dateStr.split('-');
    if (!year || !month || !day) return "-";
    return `${day}/${month}/${year}`;
};
const getCurrentArgentinaDate = ()=>{
    const now = new Date();
    const argentinaTime = new Date(now.toLocaleString("en-US", {
        timeZone: "America/Argentina/Buenos_Aires"
    }));
    const hours = argentinaTime.getHours();
    const minutes = argentinaTime.getMinutes();
    if (hours === 23 && minutes >= 1 || hours > 23) {
        argentinaTime.setDate(argentinaTime.getDate() + 1);
    }
    const year = argentinaTime.getFullYear();
    const month = String(argentinaTime.getMonth() + 1).padStart(2, "0");
    const day = String(argentinaTime.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};
const getStatusColor = (status, theme)=>{
    const statusLower = (status || "").toLowerCase();
    const colors = {
        "mensaje enviado": {
            light: "bg-cyan-100 text-cyan-800",
            dark: "bg-cyan-500/20 text-cyan-400"
        },
        "en videollamada": {
            light: "bg-blue-600 text-white",
            dark: "bg-blue-500/30 text-blue-300"
        },
        "falta documentación": {
            light: "bg-orange-100 text-orange-800",
            dark: "bg-orange-500/20 text-orange-400"
        },
        "falta clave": {
            light: "bg-orange-100 text-orange-800",
            dark: "bg-orange-500/20 text-orange-400"
        },
        "falta clave (por arca)": {
            light: "bg-indigo-100 text-indigo-800",
            dark: "bg-indigo-500/20 text-indigo-400"
        },
        "reprogramada": {
            light: "bg-violet-100 text-violet-800",
            dark: "bg-violet-500/20 text-violet-400"
        },
        "reprogramada (falta confirmar hora)": {
            light: "bg-violet-100 text-violet-800",
            dark: "bg-violet-500/20 text-violet-400"
        },
        "reprogramada (solo clave)": {
            light: "bg-violet-100 text-violet-800",
            dark: "bg-violet-500/20 text-violet-400"
        },
        "completa": {
            light: "bg-lime-600 text-white",
            dark: "bg-lime-500/30 text-lime-300"
        },
        "qr hecho": {
            light: "bg-green-600 text-white",
            dark: "bg-green-500/30 text-green-300"
        },
        "qr hecho pero pendiente de aprobación": {
            light: "bg-emerald-100 text-emerald-800",
            dark: "bg-emerald-500/20 text-emerald-400"
        },
        "qr hecho (temporal)": {
            light: "bg-green-200 text-green-800",
            dark: "bg-green-500/20 text-green-400"
        },
        "hacer qr": {
            light: "bg-gray-200 text-gray-700",
            dark: "bg-gray-500/20 text-gray-400"
        },
        "aprobada": {
            light: "bg-teal-600 text-white",
            dark: "bg-teal-500/30 text-teal-300"
        },
        "cargada": {
            light: "bg-sky-100 text-sky-800",
            dark: "bg-sky-500/20 text-sky-400"
        },
        "no atendió": {
            light: "bg-yellow-100 text-yellow-800",
            dark: "bg-yellow-500/20 text-yellow-400"
        },
        "tiene dudas": {
            light: "bg-pink-100 text-pink-800",
            dark: "bg-pink-500/20 text-pink-400"
        },
        "falta clave y documentación": {
            light: "bg-orange-100 text-orange-800",
            dark: "bg-orange-500/20 text-orange-400"
        },
        "no le llegan los mensajes": {
            light: "bg-purple-100 text-purple-800",
            dark: "bg-purple-500/20 text-purple-400"
        },
        "cortó": {
            light: "bg-yellow-100 text-yellow-800",
            dark: "bg-yellow-500/20 text-yellow-400"
        },
        "autovinculación": {
            light: "bg-pink-100 text-pink-700",
            dark: "bg-pink-500/30 text-pink-300"
        },
        "caída": {
            light: "bg-red-600 text-white",
            dark: "bg-red-500/30 text-red-300"
        },
        "pendiente": {
            light: "bg-gray-200 text-gray-700",
            dark: "bg-gray-500/20 text-gray-400"
        },
        "rehacer vídeo": {
            light: "bg-red-300 text-red-900",
            dark: "bg-red-500/20 text-red-400"
        },
        "rechazada": {
            light: "bg-red-100 text-red-700",
            dark: "bg-red-500/20 text-red-400"
        },
        "aprobada, pero no reconoce clave": {
            light: "bg-yellow-100 text-yellow-800",
            dark: "bg-yellow-500/20 text-yellow-400"
        },
        "afip": {
            light: "bg-indigo-600 text-white",
            dark: "bg-indigo-500/30 text-indigo-300"
        },
        "baja laboral con nueva alta": {
            light: "bg-blue-100 text-blue-800",
            dark: "bg-blue-500/20 text-blue-400"
        },
        "baja laboral sin nueva alta": {
            light: "bg-slate-100 text-slate-800",
            dark: "bg-slate-500/20 text-slate-400"
        },
        "padrón": {
            light: "bg-fuchsia-100 text-fuchsia-800",
            dark: "bg-fuchsia-500/20 text-fuchsia-400"
        },
        "en revisión": {
            light: "bg-amber-100 text-amber-800",
            dark: "bg-amber-500/20 text-amber-400"
        },
        "remuneración no válida": {
            light: "bg-rose-100 text-rose-800",
            dark: "bg-rose-500/20 text-rose-400"
        },
        "el afiliado cambió la clave": {
            light: "bg-orange-200 text-orange-900",
            dark: "bg-orange-500/20 text-orange-400"
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
// ✅ Helper para obtener el nombre del supervisor (prioriza snapshot)
const getSupervisorName = (audit)=>{
    // 1. Prioridad: supervisorSnapshot
    if (audit.supervisorSnapshot?.nombre) {
        return audit.supervisorSnapshot.nombre;
    }
    // 2. Fallback: asesor.supervisor (para ventas antiguas)
    if (audit.asesor?.supervisor?.nombre) {
        return audit.asesor.supervisor.nombre;
    }
    return "-";
};
const getSupervisorColor = (supervisorName, theme)=>{
    if (!supervisorName) return theme === "dark" ? "bg-gray-500/20 text-gray-400" : "bg-gray-100 text-gray-700";
    const nombreLower = supervisorName.toLowerCase();
    /* Colores específicos por supervisor */ /* ROJO - 4 supervisores */ if (nombreLower.includes('nahuel') && nombreLower.includes('sanchez') || nombreLower.includes('nahia') && nombreLower.includes('avellaneda') || nombreLower.includes('santiago') && nombreLower.includes('goldsztein') || nombreLower.includes('facundo') && nombreLower.includes('tevez')) {
        return theme === "dark" ? "bg-red-900 text-red-200" : "bg-red-100 text-red-800";
    }
    /* FUCSIA - Abigail Vera */ if (nombreLower.includes('abigail') && nombreLower.includes('vera')) {
        return theme === "dark" ? "bg-fuchsia-900 text-fuchsia-200" : "bg-fuchsia-100 text-fuchsia-800";
    }
    /* AZUL - Mateo Viera */ if (nombreLower.includes('mateo') && nombreLower.includes('viera')) {
        return theme === "dark" ? "bg-blue-900 text-blue-200" : "bg-blue-100 text-blue-800";
    }
    /* PÚRPURA - Belen Salaverry */ if (nombreLower.includes('belen') && nombreLower.includes('salaverry')) {
        return theme === "dark" ? "bg-purple-900 text-purple-200" : "bg-purple-100 text-purple-800";
    }
    /* ROSA - Analia Suarez */ if (nombreLower.includes('analia') && nombreLower.includes('suarez')) {
        return theme === "dark" ? "bg-pink-900 text-pink-200" : "bg-pink-100 text-pink-800";
    }
    /* VERDE - Erika Cardozo */ if (nombreLower.includes('erika') && nombreLower.includes('cardozo')) {
        return theme === "dark" ? "bg-green-900 text-green-200" : "bg-green-100 text-green-800";
    }
    /* AMARILLO - Aryel Puiggros */ if (nombreLower.includes('aryel') && nombreLower.includes('puiggros')) {
        return theme === "dark" ? "bg-yellow-900 text-yellow-200" : "bg-yellow-100 text-yellow-800";
    }
    /* VIOLETA - Joaquín Valdez */ if (nombreLower.includes('joaquin') && nombreLower.includes('valdez') || nombreLower.includes('joquin') && nombreLower.includes('valdez')) {
        return theme === "dark" ? "bg-violet-900 text-violet-200" : "bg-violet-100 text-violet-800";
    }
    /* GRIS - Luciano Carugno */ if (nombreLower.includes('luciano') && nombreLower.includes('carugno')) {
        return theme === "dark" ? "bg-gray-700 text-gray-200" : "bg-gray-200 text-gray-800";
    }
    /* ÁMBAR - Alejandro Mejail */ if (nombreLower.includes('alejandro') && nombreLower.includes('mejail')) {
        return theme === "dark" ? "bg-amber-900 text-amber-200" : "bg-amber-100 text-amber-800";
    }
    /* NARANJA - Gaston Sarmiento */ if (nombreLower.includes('gaston') && nombreLower.includes('sarmiento')) {
        return theme === "dark" ? "bg-orange-900 text-orange-200" : "bg-orange-100 text-orange-800";
    }
    /* Colores por defecto para otros supervisores */ const colors = [
        {
            light: "bg-teal-100 text-teal-800",
            dark: "bg-teal-900 text-teal-200"
        },
        {
            light: "bg-cyan-100 text-cyan-800",
            dark: "bg-cyan-900 text-cyan-200"
        },
        {
            light: "bg-rose-100 text-rose-800",
            dark: "bg-rose-900 text-rose-200"
        },
        {
            light: "bg-emerald-100 text-emerald-800",
            dark: "bg-emerald-900 text-emerald-200"
        },
        {
            light: "bg-indigo-100 text-indigo-800",
            dark: "bg-indigo-900 text-indigo-200"
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
    /* Colores de fila por estado */ const colorMap = {
        "mensaje enviado": {
            light: "bg-cyan-50 hover:bg-cyan-100",
            dark: "bg-cyan-900/20 hover:bg-cyan-900/30"
        },
        "en videollamada": {
            light: "bg-blue-100 hover:bg-blue-200",
            dark: "bg-blue-900/30 hover:bg-blue-900/40"
        },
        "falta documentación": {
            light: "bg-orange-50 hover:bg-orange-100",
            dark: "bg-orange-900/20 hover:bg-orange-900/30"
        },
        "falta clave": {
            light: "bg-orange-50 hover:bg-orange-100",
            dark: "bg-orange-900/20 hover:bg-orange-900/30"
        },
        "falta clave (por arca)": {
            light: "bg-indigo-50 hover:bg-indigo-100",
            dark: "bg-indigo-900/20 hover:bg-indigo-900/30"
        },
        "reprogramada": {
            light: "bg-violet-50 hover:bg-violet-100",
            dark: "bg-violet-900/20 hover:bg-violet-900/30"
        },
        "reprogramada (falta confirmar hora)": {
            light: "bg-violet-50 hover:bg-violet-100",
            dark: "bg-violet-900/20 hover:bg-violet-900/30"
        },
        "reprogramada (solo clave)": {
            light: "bg-violet-50 hover:bg-violet-100",
            dark: "bg-violet-900/20 hover:bg-violet-900/30"
        },
        "completa": {
            light: "bg-lime-100 hover:bg-lime-200",
            dark: "bg-lime-900/30 hover:bg-lime-900/40"
        },
        "qr hecho": {
            light: "bg-green-100 hover:bg-green-200",
            dark: "bg-green-900/30 hover:bg-green-900/40"
        },
        "aprobada": {
            light: "bg-teal-100 hover:bg-teal-200",
            dark: "bg-teal-900/30 hover:bg-teal-900/40"
        },
        "aprobada, pero no reconoce clave": {
            light: "bg-yellow-100 hover:bg-yellow-200",
            dark: "bg-yellow-900/30 hover:bg-yellow-900/40"
        },
        "no atendió": {
            light: "bg-yellow-50 hover:bg-yellow-100",
            dark: "bg-yellow-900/20 hover:bg-yellow-900/30"
        },
        "tiene dudas": {
            light: "bg-pink-50 hover:bg-pink-100",
            dark: "bg-pink-900/20 hover:bg-pink-900/30"
        },
        "falta clave y documentación": {
            light: "bg-orange-50 hover:bg-orange-100",
            dark: "bg-orange-900/20 hover:bg-orange-900/30"
        },
        "no le llegan los mensajes": {
            light: "bg-purple-50 hover:bg-purple-100",
            dark: "bg-purple-900/20 hover:bg-purple-900/30"
        },
        "cortó": {
            light: "bg-yellow-50 hover:bg-yellow-100",
            dark: "bg-yellow-900/20 hover:bg-yellow-900/30"
        },
        "autovinculación": {
            light: "bg-pink-50 hover:bg-pink-100",
            dark: "bg-pink-900/20 hover:bg-pink-900/30"
        },
        "caída": {
            light: "bg-red-100 hover:bg-red-200",
            dark: "bg-red-900/30 hover:bg-red-900/40"
        },
        "pendiente": {
            light: "bg-gray-100 hover:bg-gray-200",
            dark: "bg-gray-700/30 hover:bg-gray-700/40"
        },
        "rehacer vídeo": {
            light: "bg-red-50 hover:bg-red-100",
            dark: "bg-red-900/20 hover:bg-red-900/30"
        },
        "rechazada": {
            light: "bg-red-50 hover:bg-red-100",
            dark: "bg-red-900/20 hover:bg-red-900/30"
        },
        "baja remuneración": {
            light: "bg-red-50 hover:bg-red-100",
            dark: "bg-red-900/20 hover:bg-red-900/30"
        }
    };
    const colors = colorMap[statusLower];
    if (!colors) return "";
    return theme === "dark" ? colors.dark : colors.light;
};
function AuditoriasSeguimiento() {
    _s();
    const { theme } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$dashboard$2f$theme$2d$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTheme"])();
    const { user } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"])();
    /* Estado principal */ const [audits, setAudits] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [filtersExpanded, setFiltersExpanded] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    /* Estados de filtros */ const [filters, setFilters] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        afiliado: "",
        cuil: "",
        obraAnterior: "",
        obraVendida: "",
        estado: "",
        tipo: "",
        asesor: "",
        datos: "",
        auditor: "",
        supervisor: "",
        administrador: ""
    });
    const [dateFrom, setDateFrom] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [dateTo, setDateTo] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    /* Estados de selección múltiple */ const [selectedGroups, setSelectedGroups] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [selectedEstados, setSelectedEstados] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [selectedAsesores, setSelectedAsesores] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [selectedAuditores, setSelectedAuditores] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [selectedSupervisores, setSelectedSupervisores] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [selectedAdministradores, setSelectedAdministradores] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    /* Estados de dropdowns */ const [isGroupDropdownOpen, setIsGroupDropdownOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [isEstadoDropdownOpen, setIsEstadoDropdownOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [isAsesorDropdownOpen, setIsAsesorDropdownOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [isAuditorDropdownOpen, setIsAuditorDropdownOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [isSupervisorDropdownOpen, setIsSupervisorDropdownOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [isAdministradorDropdownOpen, setIsAdministradorDropdownOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    /* Listas para dropdowns */ const [asesoresList, setAsesoresList] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [gruposList, setGruposList] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [auditoresList, setAuditoresList] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [supervisoresList, setSupervisoresList] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [administradoresList, setAdministradoresList] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const filteredAsesoresList = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "AuditoriasSeguimiento.useMemo[filteredAsesoresList]": ()=>{
            if (selectedSupervisores.length === 0) return asesoresList;
            const equiposSupervisores = new Set();
            selectedSupervisores.forEach({
                "AuditoriasSeguimiento.useMemo[filteredAsesoresList]": (supName)=>{
                    const sup = supervisoresList.find({
                        "AuditoriasSeguimiento.useMemo[filteredAsesoresList].sup": (s)=>s.nombre === supName
                    }["AuditoriasSeguimiento.useMemo[filteredAsesoresList].sup"]);
                    if (sup?.numeroEquipo) equiposSupervisores.add(sup.numeroEquipo);
                }
            }["AuditoriasSeguimiento.useMemo[filteredAsesoresList]"]);
            if (equiposSupervisores.size === 0) return asesoresList;
            return asesoresList.filter({
                "AuditoriasSeguimiento.useMemo[filteredAsesoresList]": (a)=>a.numeroEquipo && equiposSupervisores.has(a.numeroEquipo)
            }["AuditoriasSeguimiento.useMemo[filteredAsesoresList]"]);
        }
    }["AuditoriasSeguimiento.useMemo[filteredAsesoresList]"], [
        asesoresList,
        selectedSupervisores,
        supervisoresList
    ]);
    /* Estados de modales */ const [selectedAudit, setSelectedAudit] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [editModalOpen, setEditModalOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    /* Estados del modal de turnos */ const [showSlotsModal, setShowSlotsModal] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [availableSlots, setAvailableSlots] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loadingSlots, setLoadingSlots] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [selectedDate, setSelectedDate] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(new Date().toISOString().split('T')[0]);
    /* Estados del modal de estadísticas */ const [showStatsModal, setShowStatsModal] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [salesStats, setSalesStats] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loadingStats, setLoadingStats] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [statsDate, setStatsDate] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(new Date().toISOString().split('T')[0]);
    /* Referencias para detectar clicks externos */ const groupFilterRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const estadoFilterRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const asesorFilterRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const auditorFilterRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const supervisorFilterRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const administradorFilterRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    /* Obtener rol del usuario actual */ const getCurrentUserRole = ()=>{
        try {
            const token = localStorage.getItem("token");
            if (!token) return null;
            const payload = JSON.parse(atob(token.split(".")[1]));
            return payload?.role || null;
        } catch  {
            return null;
        }
    };
    const currentRole = getCurrentUserRole();
    const isSupervisor = currentRole === "supervisor" || currentRole === "Supervisor" || currentRole === "encargado" || currentRole === "Encargado";
    const isAdmin = currentRole === "admin" || currentRole === "Admin";
    const isGerencia = currentRole === "gerencia" || currentRole === "Gerencia";
    const isAuditor = currentRole === "auditor" || currentRole === "Auditor";
    const isAsesor = currentRole === "asesor" || currentRole === "Asesor";
    const isAdministrativo = currentRole === "administrativo" || currentRole === "Administrativo";
    const isRecuperador = currentRole === "recuperador" || currentRole === "Recuperador";
    const isEncargado = currentRole === "encargado" || currentRole === "Encargado";
    const isIndependiente = currentRole === "independiente" || currentRole === "Independiente" // ✅ NUEVO: Rol Independiente
    ;
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
        if (selectedEstados.length > 0) {
            /* Si "Sin estado" está seleccionado, debemos obtener TODOS los registros del backend
         y filtrar del lado del cliente */ if (!selectedEstados.includes("Sin estado")) {
                params.estado = selectedEstados.map((e)=>e.trim()).join(",");
            }
        }
        if (selectedAsesores.length > 0) {
            params.asesor = selectedAsesores.map((a)=>a.trim()).filter(Boolean).join(",");
        }
        if (selectedAuditores.length > 0) {
            params.auditor = selectedAuditores.map((a)=>a.trim()).filter(Boolean).join(",");
        }
        if (selectedSupervisores.length > 0) {
            params.supervisor = selectedSupervisores.map((s)=>s.trim()).filter(Boolean).join(",");
        }
        if (selectedAdministradores.length > 0) {
            params.administrador = selectedAdministradores.map((a)=>a.trim()).filter(Boolean).join(",");
        }
        if (selectedGroups.length > 0) {
            params.grupo = selectedGroups.map((g)=>g.trim()).filter(Boolean).join(",");
        }
        /* Lógica de filtro CUIL: Si CUIL está presente, ignorar filtros de fecha */ if (filters.cuil && filters.cuil.trim() !== "") {
            delete params.dateFrom;
            delete params.dateTo;
            delete params.date;
        } else {
            /* Lógica de fecha estándar solo si CUIL NO está presente */ if (dateFrom && dateTo) {
                params.dateFrom = dateFrom;
                params.dateTo = dateTo;
            } else if (!dateFrom && !dateTo) {
                params.date = getCurrentArgentinaDate();
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
            const auditsArray = Array.isArray(data) ? data : [];
            let normalizedFilteredAudits = auditsArray;
            /* Filtrado del lado del cliente para lógica "Sin estado" */ if (selectedEstados.length > 0) {
                if (selectedEstados.includes("Sin estado")) {
                    normalizedFilteredAudits = auditsArray.filter((audit)=>{
                        const status = (audit.status || "").trim();
                        const isNoStatus = !status || status === "Seleccione" || status === "Seleccionar estado...";
                        const isSelectedStatus = selectedEstados.includes(status);
                        /* Retornar true si no tiene estado O si coincide con uno de los estados seleccionados */ return isNoStatus || isSelectedStatus;
                    });
                } else {
                    /* Si "Sin estado" NO está seleccionado, el backend ya filtró los datos */ normalizedFilteredAudits = auditsArray;
                }
            } else {
                /* Comportamiento por defecto: ocultar "cargada" y "aprobada" si no hay filtro de estado activo */ const statusesToHide = [
                    "cargada",
                    "aprobada"
                ];
                normalizedFilteredAudits = auditsArray.filter((audit)=>{
                    const status = (audit.status || "").toLowerCase();
                    return !statusesToHide.includes(status);
                });
            }
            setAudits(normalizedFilteredAudits);
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
            /* ✅ RESTRICCIÓN ASESOR: Solo puede ver su propio nombre en el filtro */ if (isAsesor && user?.nombre) {
                // Para asesor: solo mostrar su propio nombre en la lista
                const selfAsesor = asesoresData.find((u)=>u._id === user._id);
                if (selfAsesor) {
                    setAsesoresList([
                        selfAsesor
                    ]);
                    // Pre-seleccionar automáticamente al asesor autenticado
                    setSelectedAsesores([
                        selfAsesor.nombre
                    ]);
                } else {
                    // Fallback: crear entrada con datos del usuario actual
                    setAsesoresList([
                        {
                            _id: user._id,
                            nombre: user.nombre,
                            email: user.email || "",
                            role: "asesor"
                        }
                    ]);
                    setSelectedAsesores([
                        user.nombre
                    ]);
                }
            } else {
                // Para otros roles: comportamiento normal
                const asesoresFiltered = asesoresData.filter((u)=>{
                    const isActive = u?.active !== false;
                    const isAsesorRole = u.role === "asesor" || u.role === "Asesor";
                    const isAuditorWithTeam = (u.role === "auditor" || u.role === "Auditor") && u.numeroEquipo;
                    return isActive && (isAsesorRole || isAuditorWithTeam) && u.nombre;
                }).sort((a, b)=>a.nombre.localeCompare(b.nombre));
                setAsesoresList(asesoresFiltered);
            }
            /* Obtener auditores */ const auditoresData = asesoresData.filter((u)=>{
                const isActive = u?.active !== false;
                const role = u?.role;
                return isActive && (role === "auditor" || role === "Auditor" || role === "gerencia" || role === "Gerencia" || role === "supervisor" || role === "Supervisor") && u.nombre;
            }).sort((a, b)=>a.nombre.localeCompare(b.nombre));
            setAuditoresList(auditoresData);
            /* Obtener grupos */ const gruposRes = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].groups.list();
            const gruposData = Array.isArray(gruposRes.data) ? gruposRes.data : [];
            /* Supervisores y Gerencia ven todos los grupos */ setGruposList(gruposData.sort((a, b)=>(a.nombre || "").localeCompare(b.nombre || "")));
            /* Obtener supervisores (incluye Gerencia y Encargado para consistencia con modal de edición) */ const supervisoresData = asesoresData.filter((u)=>{
                const isActive = u?.active !== false;
                const role = u.role?.toLowerCase();
                // ✅ Incluir supervisores, gerencia y encargado
                return isActive && (role === "supervisor" || role === "gerencia" || role === "encargado") && u.nombre;
            }).sort((a, b)=>a.nombre.localeCompare(b.nombre));
            setSupervisoresList(supervisoresData);
            /* Obtener administradores (rol: administrativo) */ const administradoresData = asesoresData.filter((u)=>{
                const isActive = u?.active !== false;
                const roleLower = (u.role || "").toLowerCase();
                return isActive && roleLower === "administrativo" && u.nombre;
            }).sort((a, b)=>a.nombre.localeCompare(b.nombre));
            setAdministradoresList(administradoresData);
        } catch (err) {
            console.error("Error al cargar opciones de filtros:", err);
        }
    };
    const handleExportXLSX = ()=>{
        if (!audits || audits.length === 0) {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].info("No hay datos para exportar");
            return;
        }
        const rows = audits.map((a)=>{
            let telefono = a.telefono || "-";
            if (isSupervisor || isAsesor) {
                const auditGrupo = a.asesor?.numeroEquipo;
                const myGrupo = user?.numeroEquipo;
                if (auditGrupo && myGrupo && auditGrupo !== myGrupo) {
                    telefono = "***";
                }
            }
            return {
                Fecha: a.scheduledAt ? new Date(a.scheduledAt).toLocaleDateString("es-AR") : "-",
                Hora: a.scheduledAt ? new Date(a.scheduledAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit"
                }) : "-",
                Afiliado: a.nombre || "-",
                CUIL: a.cuil || "-",
                Teléfono: telefono,
                "Obra Social Anterior": a.obraSocialAnterior || "-",
                "Obra Social Vendida": a.obraSocialVendida || "-",
                Estado: a.status || "-",
                Tipo: a.tipoVenta || "-",
                Asesor: a.asesor?.nombre || "-",
                Supervisor: getSupervisorName(a),
                Grupo: a.groupId?.nombre || "-",
                Auditor: a.auditor?.nombre || "-",
                Administrador: a.administrador?.nombre || "-",
                "¿Recuperada?": a.isRecuperada ? "Sí" : "No"
            };
        });
        const ws = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["utils"].json_to_sheet(rows);
        const wb = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["utils"].book_new();
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["utils"].book_append_sheet(wb, ws, "Auditorías");
        const today = new Date().toISOString().slice(0, 10);
        const filename = `audits_${dateFrom || today}.xlsx`;
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
            cuil: "",
            obraAnterior: "",
            obraVendida: "",
            estado: "",
            tipo: "",
            asesor: "",
            datos: "",
            auditor: "",
            supervisor: "",
            administrador: ""
        });
        setDateFrom("");
        setDateTo("");
        setSelectedGroups([]);
        setSelectedEstados([]);
        /* ✅ RESTRICCIÓN ASESOR: No limpiar el filtro de asesor para asesores */ if (!isAsesor) {
            setSelectedAsesores([]);
        }
        setSelectedAuditores([]);
        setSelectedSupervisores([]);
        setSelectedAdministradores([]);
    };
    const handleDeleteAudit = async (auditId)=>{
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
        setSelectedAudit(audit);
        setEditModalOpen(true);
    };
    /* Funciones del modal de turnos */ const fetchAvailableSlots = async (date)=>{
        setLoadingSlots(true);
        try {
            const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].audits.getAvailableSlots(date);
            setAvailableSlots(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error("No se pudieron cargar los turnos");
        } finally{
            setLoadingSlots(false);
        }
    };
    const handleOpenSlotsModal = ()=>{
        setShowSlotsModal(true);
        fetchAvailableSlots(selectedDate);
    };
    const handleDateChange = (newDate)=>{
        setSelectedDate(newDate);
        fetchAvailableSlots(newDate);
    };
    const getSlotColor = (count)=>{
        const available = 10 - count;
        if (available <= 0) return 'bg-red-100 text-red-800 border-red-300';
        if (available >= 1 && available <= 2) return 'bg-orange-100 text-orange-800 border-orange-300';
        if (available >= 3 && available <= 4) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
        return 'bg-green-100 text-green-800 border-green-300';
    };
    /* Funciones del modal de estadísticas */ const fetchSalesStats = async (date)=>{
        setLoadingStats(true);
        try {
            const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].audits.getSalesStats(date);
            setSalesStats(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error("No se pudieron cargar las estadísticas");
        } finally{
            setLoadingStats(false);
        }
    };
    const handleOpenStatsModal = ()=>{
        setShowStatsModal(true);
        fetchSalesStats(statsDate);
    };
    const handleStatsDateChange = (newDate)=>{
        setStatsDate(newDate);
        fetchSalesStats(newDate);
    };
    /* Efectos */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AuditoriasSeguimiento.useEffect": ()=>{
            fetchAudits();
            fetchFilterOptions();
            /* Actualizaciones en tiempo real via Socket */ const socket = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$socket$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["connectSocket"])();
            /* Suscribirse a la sala de auditorías */ socket.emit("audits:subscribeAll");
            console.log("[Seguimiento] Subscribed to audits_all room");
            /* Manejador para nuevas auditorías - agregar si es visible en la vista actual */ const handleNewAudit = {
                "AuditoriasSeguimiento.useEffect.handleNewAudit": (newAudit)=>{
                    console.log("[Socket] New audit received:", newAudit._id);
                    /* ✅ RESTRICCIÓN ASESOR: Solo agregar si el asesor es el asignado o creador */ if (isAsesor && user?._id) {
                        const auditAsesorId = typeof newAudit.asesor === 'object' ? newAudit.asesor?._id : newAudit.asesor;
                        const auditCreatedById = newAudit.createdBy?._id || newAudit.createdBy;
                        if (auditAsesorId !== user._id && auditCreatedById !== user._id) {
                            console.log("[Socket] Asesor filter: ignoring audit (not owned)", newAudit._id);
                            return;
                        }
                    }
                    /* Agregar a la lista - el filtrado se maneja por la lógica existente del cliente */ setAudits({
                        "AuditoriasSeguimiento.useEffect.handleNewAudit": (prev)=>{
                            /* Verificar si ya existe (evitar duplicados) */ if (prev.some({
                                "AuditoriasSeguimiento.useEffect.handleNewAudit": (a)=>a._id === newAudit._id
                            }["AuditoriasSeguimiento.useEffect.handleNewAudit"])) return prev;
                            /* Agregar al inicio (más reciente primero) */ const updated = [
                                newAudit,
                                ...prev
                            ];
                            /* Mostrar notificación sutil */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].info(`Nueva auditoría: ${newAudit.nombre}`, {
                                duration: 3000
                            });
                            return updated;
                        }
                    }["AuditoriasSeguimiento.useEffect.handleNewAudit"]);
                }
            }["AuditoriasSeguimiento.useEffect.handleNewAudit"];
            /* Manejador para auditorías actualizadas - actualizar en su lugar */ const handleAuditUpdate = {
                "AuditoriasSeguimiento.useEffect.handleAuditUpdate": (updatedAudit)=>{
                    console.log("[Socket] Actualización de auditoría recibida:", updatedAudit._id);
                    setAudits({
                        "AuditoriasSeguimiento.useEffect.handleAuditUpdate": (prev)=>{
                            const index = prev.findIndex({
                                "AuditoriasSeguimiento.useEffect.handleAuditUpdate.index": (a)=>a._id === updatedAudit._id
                            }["AuditoriasSeguimiento.useEffect.handleAuditUpdate.index"]);
                            if (index === -1) {
                                // Auditoría no está en la lista actual - el usuario puede refrescar filtros
                                return prev;
                            }
                            /* Actualizar en su lugar, preservando posición */ const updated = [
                                ...prev
                            ];
                            updated[index] = {
                                ...prev[index],
                                ...updatedAudit
                            };
                            return updated;
                        }
                    }["AuditoriasSeguimiento.useEffect.handleAuditUpdate"]);
                    /* Si el usuario está editando esta auditoría, actualizar también */ setSelectedAudit({
                        "AuditoriasSeguimiento.useEffect.handleAuditUpdate": (prev)=>{
                            if (prev && prev._id === updatedAudit._id) {
                                /* No auto-actualizar si el modal está abierto para no interrumpir al usuario */ if (editModalOpen) {
                                    /* Verificar si la actualización fue hecha por el usuario actual */ const isSelfUpdate = updatedAudit.updatedBy === user?._id;
                                    if (!isSelfUpdate) {
                                        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].warning("Esta auditoría fue modificada por otro usuario", {
                                            duration: 5000
                                        });
                                    }
                                }
                                return {
                                    ...prev,
                                    ...updatedAudit
                                };
                            }
                            return prev;
                        }
                    }["AuditoriasSeguimiento.useEffect.handleAuditUpdate"]);
                }
            }["AuditoriasSeguimiento.useEffect.handleAuditUpdate"];
            /* Manejador para auditorías eliminadas - quitar de la lista */ const handleAuditDeleted = {
                "AuditoriasSeguimiento.useEffect.handleAuditDeleted": (data)=>{
                    console.log("[Socket] Audit deleted:", data._id);
                    setAudits({
                        "AuditoriasSeguimiento.useEffect.handleAuditDeleted": (prev)=>prev.filter({
                                "AuditoriasSeguimiento.useEffect.handleAuditDeleted": (a)=>a._id !== data._id
                            }["AuditoriasSeguimiento.useEffect.handleAuditDeleted"])
                    }["AuditoriasSeguimiento.useEffect.handleAuditDeleted"]);
                    /* Si el usuario está editando esta auditoría eliminada, cerrar modal */ if (selectedAudit && selectedAudit._id === data._id) {
                        setEditModalOpen(false);
                        setSelectedAudit(null);
                        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error("La auditoría que estabas editando fue eliminada", {
                            duration: 5000
                        });
                    }
                }
            }["AuditoriasSeguimiento.useEffect.handleAuditDeleted"];
            /* Registrar listeners de eventos */ socket.on("audits:new", handleNewAudit);
            socket.on("audit:update", handleAuditUpdate);
            socket.on("audit:deleted", handleAuditDeleted);
            /* Limpiar al desmontar */ return ({
                "AuditoriasSeguimiento.useEffect": ()=>{
                    socket.off("audits:new", handleNewAudit);
                    socket.off("audit:update", handleAuditUpdate);
                    socket.off("audit:deleted", handleAuditDeleted);
                    socket.emit("audits:unsubscribeAll");
                    console.log("[Seguimiento] Unsubscribed from audits_all room");
                }
            })["AuditoriasSeguimiento.useEffect"];
        }
    }["AuditoriasSeguimiento.useEffect"], [
        editModalOpen,
        selectedAudit
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AuditoriasSeguimiento.useEffect": ()=>{
            fetchAudits();
        }
    }["AuditoriasSeguimiento.useEffect"], [
        filters,
        selectedGroups,
        selectedEstados,
        selectedAsesores,
        selectedAuditores,
        selectedSupervisores,
        selectedAdministradores,
        dateFrom,
        dateTo
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AuditoriasSeguimiento.useEffect": ()=>{
            const refsToTrack = [
                {
                    ref: groupFilterRef,
                    setOpen: setIsGroupDropdownOpen
                },
                {
                    ref: estadoFilterRef,
                    setOpen: setIsEstadoDropdownOpen
                },
                {
                    ref: asesorFilterRef,
                    setOpen: setIsAsesorDropdownOpen
                },
                {
                    ref: auditorFilterRef,
                    setOpen: setIsAuditorDropdownOpen
                },
                {
                    ref: supervisorFilterRef,
                    setOpen: setIsSupervisorDropdownOpen
                },
                {
                    ref: administradorFilterRef,
                    setOpen: setIsAdministradorDropdownOpen
                }
            ];
            const handleClickOutside = {
                "AuditoriasSeguimiento.useEffect.handleClickOutside": (event)=>{
                    refsToTrack.forEach({
                        "AuditoriasSeguimiento.useEffect.handleClickOutside": ({ ref, setOpen })=>{
                            if (ref.current && !ref.current.contains(event.target)) {
                                setOpen(false);
                            }
                        }
                    }["AuditoriasSeguimiento.useEffect.handleClickOutside"]);
                }
            }["AuditoriasSeguimiento.useEffect.handleClickOutside"];
            document.addEventListener("mousedown", handleClickOutside);
            return ({
                "AuditoriasSeguimiento.useEffect": ()=>{
                    document.removeEventListener("mousedown", handleClickOutside);
                }
            })["AuditoriasSeguimiento.useEffect"];
        }
    }["AuditoriasSeguimiento.useEffect"], []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-6 animate-fade-in-up",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("rounded-2xl border p-6 backdrop-blur-sm relative z-20", theme === "dark" ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10" : "bg-white border-gray-200 shadow-sm"),
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-2 mb-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$filter$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Filter$3e$__["Filter"], {
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-5 h-5", theme === "dark" ? "text-purple-400" : "text-purple-500")
                            }, void 0, false, {
                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                lineNumber: 1019,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("font-semibold", theme === "dark" ? "text-white" : "text-gray-800"),
                                children: "Filtros"
                            }, void 0, false, {
                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                lineNumber: 1020,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                        lineNumber: 1018,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "text",
                                placeholder: "Buscar afiliado",
                                value: filters.afiliado,
                                onChange: (e)=>handleFilterChange("afiliado", e.target.value),
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-white/5 border-white/10 text-white placeholder-gray-500" : "bg-white border-gray-200 text-gray-800 placeholder-gray-400")
                            }, void 0, false, {
                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                lineNumber: 1025,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "text",
                                placeholder: "Buscar CUIL",
                                value: filters.cuil,
                                onChange: (e)=>handleFilterChange("cuil", e.target.value),
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-white/5 border-white/10 text-white placeholder-gray-500" : "bg-white border-gray-200 text-gray-800 placeholder-gray-400")
                            }, void 0, false, {
                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                lineNumber: 1037,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                value: filters.obraAnterior,
                                onChange: (e)=>handleFilterChange("obraAnterior", e.target.value),
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                        value: "",
                                        children: "Obra social anterior"
                                    }, void 0, false, {
                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                        lineNumber: 1057,
                                        columnNumber: 13
                                    }, this),
                                    ARGENTINE_OBRAS_SOCIALES.map((o)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                            value: o,
                                            children: o
                                        }, o, false, {
                                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                            lineNumber: 1059,
                                            columnNumber: 15
                                        }, this))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                lineNumber: 1049,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                value: filters.obraVendida,
                                onChange: (e)=>handleFilterChange("obraVendida", e.target.value),
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                        value: "",
                                        children: "Obra social vendida"
                                    }, void 0, false, {
                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                        lineNumber: 1070,
                                        columnNumber: 13
                                    }, this),
                                    OBRAS_VENDIDAS.map((o)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                            value: o,
                                            children: o
                                        }, o, false, {
                                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                            lineNumber: 1072,
                                            columnNumber: 15
                                        }, this))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                lineNumber: 1062,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "relative",
                                ref: estadoFilterRef,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>setIsEstadoDropdownOpen(!isEstadoDropdownOpen),
                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"),
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "truncate",
                                                children: formatMultiLabel(selectedEstados, "Estado", "estados")
                                            }, void 0, false, {
                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                lineNumber: 1085,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__["ChevronDown"], {
                                                className: "w-4 h-4"
                                            }, void 0, false, {
                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                lineNumber: 1086,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                        lineNumber: 1078,
                                        columnNumber: 13
                                    }, this),
                                    isEstadoDropdownOpen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-lg shadow-lg border bg-white dark:bg-gray-800 dark:border-gray-700",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        type: "button",
                                                        onClick: ()=>setSelectedEstados(STATUS_OPTIONS),
                                                        className: "text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300",
                                                        children: "Seleccionar todos"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                        lineNumber: 1091,
                                                        columnNumber: 19
                                                    }, this),
                                                    selectedEstados.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        type: "button",
                                                        onClick: ()=>setSelectedEstados([]),
                                                        className: "text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300",
                                                        children: "Limpiar"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                        lineNumber: 1099,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                lineNumber: 1090,
                                                columnNumber: 17
                                            }, this),
                                            STATUS_OPTIONS.map((status)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "checkbox",
                                                            checked: selectedEstados.includes(status),
                                                            onChange: ()=>toggleSelection(status, setSelectedEstados),
                                                            className: "accent-blue-600"
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                            lineNumber: 1110,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "dark:text-gray-200",
                                                            children: status
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                            lineNumber: 1116,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, status, true, {
                                                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                    lineNumber: 1109,
                                                    columnNumber: 19
                                                }, this))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                        lineNumber: 1089,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                lineNumber: 1077,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                value: filters.tipo,
                                onChange: (e)=>handleFilterChange("tipo", e.target.value),
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                        value: "",
                                        children: "Tipo"
                                    }, void 0, false, {
                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                        lineNumber: 1131,
                                        columnNumber: 13
                                    }, this),
                                    TIPO_VENTA.map((t)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                            value: t,
                                            children: t
                                        }, t, false, {
                                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                            lineNumber: 1133,
                                            columnNumber: 15
                                        }, this))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                lineNumber: 1123,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                        lineNumber: 1024,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "relative",
                                ref: asesorFilterRef,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>!isAsesor && setIsAsesorDropdownOpen(!isAsesorDropdownOpen),
                                        disabled: isAsesor,
                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800", isAsesor && "opacity-70 cursor-not-allowed"),
                                        title: isAsesor ? "Solo puedes ver tus propias ventas" : undefined,
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "truncate",
                                                children: formatMultiLabel(selectedAsesores, "Asesor", "asesores")
                                            }, void 0, false, {
                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                lineNumber: 1152,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__["ChevronDown"], {
                                                className: "w-4 h-4"
                                            }, void 0, false, {
                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                lineNumber: 1153,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                        lineNumber: 1142,
                                        columnNumber: 13
                                    }, this),
                                    isAsesorDropdownOpen && !isAsesor && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-lg shadow-lg border bg-white dark:bg-gray-800 dark:border-gray-700",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        type: "button",
                                                        onClick: ()=>setSelectedAsesores(filteredAsesoresList.map((a)=>a.nombre)),
                                                        className: "text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300",
                                                        children: "Seleccionar todos"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                        lineNumber: 1158,
                                                        columnNumber: 19
                                                    }, this),
                                                    selectedAsesores.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        type: "button",
                                                        onClick: ()=>setSelectedAsesores([]),
                                                        className: "text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300",
                                                        children: "Limpiar"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                        lineNumber: 1166,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                lineNumber: 1157,
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
                                                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                            lineNumber: 1177,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "dark:text-gray-200",
                                                            children: a.nombre
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                            lineNumber: 1183,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, a._id, true, {
                                                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                    lineNumber: 1176,
                                                    columnNumber: 19
                                                }, this))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                        lineNumber: 1156,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                lineNumber: 1141,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "relative",
                                ref: auditorFilterRef,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>setIsAuditorDropdownOpen(!isAuditorDropdownOpen),
                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"),
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "truncate",
                                                children: formatMultiLabel(selectedAuditores, "Auditor", "auditores")
                                            }, void 0, false, {
                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                lineNumber: 1199,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__["ChevronDown"], {
                                                className: "w-4 h-4"
                                            }, void 0, false, {
                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                lineNumber: 1200,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                        lineNumber: 1192,
                                        columnNumber: 13
                                    }, this),
                                    isAuditorDropdownOpen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-lg shadow-lg border bg-white dark:bg-gray-800 dark:border-gray-700",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        type: "button",
                                                        onClick: ()=>setSelectedAuditores(auditoresList.map((a)=>a.nombre)),
                                                        className: "text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300",
                                                        children: "Seleccionar todos"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                        lineNumber: 1205,
                                                        columnNumber: 19
                                                    }, this),
                                                    selectedAuditores.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        type: "button",
                                                        onClick: ()=>setSelectedAuditores([]),
                                                        className: "text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300",
                                                        children: "Limpiar"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                        lineNumber: 1213,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                lineNumber: 1204,
                                                columnNumber: 17
                                            }, this),
                                            auditoresList.map((a)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "checkbox",
                                                            checked: selectedAuditores.includes(a.nombre),
                                                            onChange: ()=>toggleSelection(a.nombre, setSelectedAuditores),
                                                            className: "accent-blue-600"
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                            lineNumber: 1224,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "dark:text-gray-200",
                                                            children: a.nombre
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                            lineNumber: 1230,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, a._id, true, {
                                                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                    lineNumber: 1223,
                                                    columnNumber: 19
                                                }, this))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                        lineNumber: 1203,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                lineNumber: 1191,
                                columnNumber: 11
                            }, this),
                            (isAuditor || isGerencia || isAdmin || isSupervisor || isAsesor || isAdministrativo) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "relative",
                                ref: supervisorFilterRef,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>setIsSupervisorDropdownOpen(!isSupervisorDropdownOpen),
                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"),
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "truncate",
                                                children: formatMultiLabel(selectedSupervisores, "Supervisor", "supervisores")
                                            }, void 0, false, {
                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                lineNumber: 1247,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__["ChevronDown"], {
                                                className: "w-4 h-4"
                                            }, void 0, false, {
                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                lineNumber: 1248,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                        lineNumber: 1240,
                                        columnNumber: 15
                                    }, this),
                                    isSupervisorDropdownOpen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-lg shadow-lg border bg-white dark:bg-gray-800 dark:border-gray-700",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        type: "button",
                                                        onClick: ()=>setSelectedSupervisores(supervisoresList.map((s)=>s.nombre)),
                                                        className: "text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300",
                                                        children: "Seleccionar todos"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                        lineNumber: 1253,
                                                        columnNumber: 21
                                                    }, this),
                                                    selectedSupervisores.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        type: "button",
                                                        onClick: ()=>setSelectedSupervisores([]),
                                                        className: "text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300",
                                                        children: "Limpiar"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                        lineNumber: 1261,
                                                        columnNumber: 23
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                lineNumber: 1252,
                                                columnNumber: 19
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
                                                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                            lineNumber: 1272,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "dark:text-gray-200",
                                                            children: s.nombre
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                            lineNumber: 1278,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, s._id, true, {
                                                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                    lineNumber: 1271,
                                                    columnNumber: 21
                                                }, this))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                        lineNumber: 1251,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                lineNumber: 1239,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "relative",
                                ref: administradorFilterRef,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>setIsAdministradorDropdownOpen(!isAdministradorDropdownOpen),
                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"),
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "truncate",
                                                children: formatMultiLabel(selectedAdministradores, "Administrativos", "administrativos")
                                            }, void 0, false, {
                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                lineNumber: 1295,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__["ChevronDown"], {
                                                className: "w-4 h-4"
                                            }, void 0, false, {
                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                lineNumber: 1296,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                        lineNumber: 1288,
                                        columnNumber: 13
                                    }, this),
                                    isAdministradorDropdownOpen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-lg shadow-lg border bg-white dark:bg-gray-800 dark:border-gray-700",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        type: "button",
                                                        onClick: ()=>setSelectedAdministradores(administradoresList.map((a)=>a.nombre)),
                                                        className: "text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300",
                                                        children: "Seleccionar todos"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                        lineNumber: 1301,
                                                        columnNumber: 19
                                                    }, this),
                                                    selectedAdministradores.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        type: "button",
                                                        onClick: ()=>setSelectedAdministradores([]),
                                                        className: "text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300",
                                                        children: "Limpiar"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                        lineNumber: 1309,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                lineNumber: 1300,
                                                columnNumber: 17
                                            }, this),
                                            administradoresList.map((a)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "checkbox",
                                                            checked: selectedAdministradores.includes(a.nombre),
                                                            onChange: ()=>toggleSelection(a.nombre, setSelectedAdministradores),
                                                            className: "accent-blue-600"
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                            lineNumber: 1320,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "dark:text-gray-200",
                                                            children: a.nombre
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                            lineNumber: 1326,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, a._id, true, {
                                                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                    lineNumber: 1319,
                                                    columnNumber: 19
                                                }, this))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                        lineNumber: 1299,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                lineNumber: 1287,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                        lineNumber: 1139,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-wrap items-end gap-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-xs block mb-1", theme === "dark" ? "text-gray-400" : "text-gray-500"),
                                        children: "Desde"
                                    }, void 0, false, {
                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                        lineNumber: 1337,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        type: "date",
                                        value: dateFrom,
                                        onChange: (e)=>setDateFrom(e.target.value),
                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800")
                                    }, void 0, false, {
                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                        lineNumber: 1340,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                lineNumber: 1336,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-xs block mb-1", theme === "dark" ? "text-gray-400" : "text-gray-500"),
                                        children: "Hasta"
                                    }, void 0, false, {
                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                        lineNumber: 1351,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        type: "date",
                                        value: dateTo,
                                        onChange: (e)=>setDateTo(e.target.value),
                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800")
                                    }, void 0, false, {
                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                        lineNumber: 1354,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                lineNumber: 1350,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex-1"
                            }, void 0, false, {
                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                lineNumber: 1364,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: fetchAudits,
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("px-4 py-2 rounded-lg text-sm font-medium transition-colors", theme === "dark" ? "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30" : "bg-cyan-500 text-white hover:bg-cyan-600"),
                                children: "Aplicar filtros"
                            }, void 0, false, {
                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                lineNumber: 1365,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: clearFilters,
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("px-4 py-2 rounded-lg text-sm font-medium transition-colors border", theme === "dark" ? "border-white/10 text-gray-400 hover:bg-white/5" : "border-gray-200 text-gray-600 hover:bg-gray-50"),
                                children: "Limpiar"
                            }, void 0, false, {
                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                lineNumber: 1376,
                                columnNumber: 11
                            }, this),
                            ![
                                'asesor',
                                'supervisor'
                            ].includes(user?.role?.toLowerCase() || '') && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: handleExportXLSX,
                                className: "px-4 py-2 rounded-lg text-sm font-medium transition-colors text-white flex items-center gap-2",
                                style: {
                                    backgroundColor: "#17C787"
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$download$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Download$3e$__["Download"], {
                                        className: "w-4 h-4"
                                    }, void 0, false, {
                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                        lineNumber: 1393,
                                        columnNumber: 15
                                    }, this),
                                    "Exportar"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                lineNumber: 1388,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: handleOpenSlotsModal,
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("px-4 py-2 rounded-lg text-sm font-medium transition-colors text-white flex items-center gap-2", theme === "dark" ? "bg-purple-600 hover:bg-purple-700" : "bg-purple-600 hover:bg-purple-700"),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Calendar$3e$__["Calendar"], {
                                        className: "w-4 h-4"
                                    }, void 0, false, {
                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                        lineNumber: 1404,
                                        columnNumber: 13
                                    }, this),
                                    "Turnos"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                lineNumber: 1397,
                                columnNumber: 11
                            }, this),
                            (isSupervisor || isGerencia) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: handleOpenStatsModal,
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("px-4 py-2 rounded-lg text-sm font-medium transition-colors text-white flex items-center gap-2", theme === "dark" ? "bg-indigo-600 hover:bg-indigo-700" : "bg-indigo-600 hover:bg-indigo-700"),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$column$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__BarChart3$3e$__["BarChart3"], {
                                        className: "w-4 h-4"
                                    }, void 0, false, {
                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                        lineNumber: 1415,
                                        columnNumber: 15
                                    }, this),
                                    "Estadísticas"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                lineNumber: 1408,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                        lineNumber: 1335,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                lineNumber: 1010,
                columnNumber: 7
            }, this),
            audits.length > 0 && (()=>{
                const estadosCount = {};
                let recuperadasCount = 0;
                audits.forEach((audit)=>{
                    const estado = audit.status || 'Sin estado';
                    estadosCount[estado] = (estadosCount[estado] || 0) + 1;
                    if (audit.isRecuperada) {
                        recuperadasCount++;
                    }
                });
                const total = audits.length;
                const estadosOrdenados = Object.entries(estadosCount).sort((a, b)=>b[1] - a[1]);
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("rounded-xl border p-3 mb-4", theme === "dark" ? "bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border-blue-700/30" : "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200"),
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-wrap items-center gap-2 text-sm",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("font-bold", theme === "dark" ? "text-gray-200" : "text-gray-800"),
                                children: [
                                    "Total: ",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: theme === "dark" ? "text-blue-400" : "text-blue-600",
                                        children: total
                                    }, void 0, false, {
                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                        lineNumber: 1448,
                                        columnNumber: 24
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                lineNumber: 1447,
                                columnNumber: 15
                            }, this),
                            estadosOrdenados.map(([estado, count])=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: theme === "dark" ? "text-gray-300" : "text-gray-700",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "font-semibold",
                                            children: [
                                                estado,
                                                ":"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                            lineNumber: 1452,
                                            columnNumber: 19
                                        }, this),
                                        ' ',
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: theme === "dark" ? "text-indigo-400" : "text-indigo-600",
                                            children: count
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                            lineNumber: 1453,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, estado, true, {
                                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                    lineNumber: 1451,
                                    columnNumber: 17
                                }, this)),
                            recuperadasCount > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: theme === "dark" ? "text-gray-300" : "text-gray-700",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "font-semibold",
                                        children: "Recuperadas:"
                                    }, void 0, false, {
                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                        lineNumber: 1458,
                                        columnNumber: 19
                                    }, this),
                                    ' ',
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: theme === "dark" ? "text-green-400" : "text-green-600",
                                        children: recuperadasCount
                                    }, void 0, false, {
                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                        lineNumber: 1459,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                lineNumber: 1457,
                                columnNumber: 17
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                        lineNumber: 1446,
                        columnNumber: 13
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                    lineNumber: 1440,
                    columnNumber: 11
                }, this);
            })(),
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
                                            children: "Fecha"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                            lineNumber: 1483,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            className: "px-2 py-2 min-w-[150px]",
                                            children: "Afiliado"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                            lineNumber: 1484,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            className: "px-2 py-2 w-[100px]",
                                            children: "CUIL"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                            lineNumber: 1485,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            className: "px-2 py-2 w-[100px]",
                                            children: "Teléfono"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                            lineNumber: 1486,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            className: "px-2 py-2 w-[80px]",
                                            children: "O.S. Ant"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                            lineNumber: 1487,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            className: "px-2 py-2 w-[80px]",
                                            children: "O.S. Ven"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                            lineNumber: 1488,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            className: "px-2 py-2 min-w-[120px]",
                                            children: "Estado"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                            lineNumber: 1489,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            className: "px-2 py-2 w-[80px]",
                                            children: "Tipo"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                            lineNumber: 1490,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            className: "px-2 py-2 min-w-[100px]",
                                            children: "Asesor"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                            lineNumber: 1491,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            className: "px-2 py-2 min-w-[100px]",
                                            children: "Supervisor"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                            lineNumber: 1492,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            className: "px-2 py-2 w-[60px]",
                                            children: "Grupo"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                            lineNumber: 1493,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            className: "px-2 py-2 min-w-[100px]",
                                            children: "Auditor"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                            lineNumber: 1494,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            className: "px-2 py-2 min-w-[100px]",
                                            children: "Admin"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                            lineNumber: 1495,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            className: "px-2 py-2 w-[80px] text-center",
                                            children: "Recup."
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                            lineNumber: 1496,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            className: "px-2 py-2 w-[80px] text-center",
                                            children: "Acciones"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                            lineNumber: 1497,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                    lineNumber: 1482,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                lineNumber: 1478,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                className: "divide-y divide-gray-200 dark:divide-white/5",
                                children: loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                        colSpan: 15,
                                        className: "px-4 py-8 text-center opacity-50",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex justify-center items-center gap-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$refresh$2d$cw$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__RefreshCw$3e$__["RefreshCw"], {
                                                    className: "w-4 h-4 animate-spin"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                    lineNumber: 1505,
                                                    columnNumber: 23
                                                }, this),
                                                "Cargando auditorías..."
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                            lineNumber: 1504,
                                            columnNumber: 21
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                        lineNumber: 1503,
                                        columnNumber: 19
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                    lineNumber: 1502,
                                    columnNumber: 17
                                }, this) : audits.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                        colSpan: 15,
                                        className: "px-4 py-8 text-center opacity-50",
                                        children: "No se encontraron auditorías"
                                    }, void 0, false, {
                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                        lineNumber: 1512,
                                        columnNumber: 19
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                    lineNumber: 1511,
                                    columnNumber: 17
                                }, this) : audits.map((item, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("transition-colors group", getRowBackgroundByStatus(item.status, theme) || (idx % 2 === 0 ? "" : theme === "dark" ? "bg-white/[0.02]" : "bg-gray-50/50")),
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("px-3 py-2.5 text-center", theme === "dark" ? "text-gray-400" : "text-gray-600"),
                                                children: item.fechaCreacionQR ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex flex-col items-center",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "text-purple-500 font-medium",
                                                            children: formatDateOnly(item.fechaCreacionQR)
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                            lineNumber: 1529,
                                                            columnNumber: 27
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "text-[10px] text-gray-400",
                                                            children: "(QR)"
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                            lineNumber: 1532,
                                                            columnNumber: 27
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                    lineNumber: 1528,
                                                    columnNumber: 25
                                                }, this) : formatDateTime(item.scheduledAt)
                                            }, void 0, false, {
                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                lineNumber: 1526,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "px-2 py-1.5 text-center font-medium truncate max-w-[150px]",
                                                title: item.nombre,
                                                children: item.nombre
                                            }, void 0, false, {
                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                lineNumber: 1540,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "px-2 py-1.5 text-center font-mono opacity-70 truncate",
                                                children: item.cuil || "-"
                                            }, void 0, false, {
                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                lineNumber: 1543,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "px-2 py-1.5 text-center font-mono opacity-70 truncate",
                                                children: (isSupervisor || isAsesor) && item.asesor?.numeroEquipo !== user?.numeroEquipo && !isEncargado ? "***" : item.telefono
                                            }, void 0, false, {
                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                lineNumber: 1546,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "px-2 py-1.5 text-center truncate max-w-[80px]",
                                                title: item.obraSocialAnterior,
                                                children: item.obraSocialAnterior || "-"
                                            }, void 0, false, {
                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                lineNumber: 1549,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "px-2 py-1.5 text-center",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium truncate max-w-[80px]", getObraVendidaClass(item.obraSocialVendida, theme)),
                                                    children: item.obraSocialVendida
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                    lineNumber: 1553,
                                                    columnNumber: 23
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                lineNumber: 1552,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "px-2 py-1.5 text-center",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium truncate max-w-[120px]", getStatusColor(item.status, theme)),
                                                    title: item.status,
                                                    children: item.status
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                    lineNumber: 1561,
                                                    columnNumber: 23
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                lineNumber: 1560,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "px-2 py-1.5 text-center",
                                                children: item.tipoVenta || "-"
                                            }, void 0, false, {
                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                lineNumber: 1568,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("px-3 py-3 text-center", theme === "dark" ? "text-gray-300" : "text-gray-700"),
                                                children: item.asesor?.nombre || '-'
                                            }, void 0, false, {
                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                lineNumber: 1571,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "px-2 py-1.5 text-center",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("px-2 py-0.5 rounded text-[10px] font-medium truncate max-w-[120px] inline-block", getSupervisorColor(getSupervisorName(item), theme)),
                                                    title: getSupervisorName(item),
                                                    children: getSupervisorName(item)
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                    lineNumber: 1575,
                                                    columnNumber: 23
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                lineNumber: 1574,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "px-2 py-1.5 text-center",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold truncate max-w-[60px]", theme === "dark" ? "bg-indigo-900 text-indigo-200" : "bg-indigo-100 text-indigo-800"),
                                                    children: item.asesor?.numeroEquipo || "-"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                    lineNumber: 1583,
                                                    columnNumber: 23
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                lineNumber: 1582,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("px-3 py-3 text-center", theme === "dark" ? "text-gray-400" : "text-gray-600"),
                                                children: item.auditor?.nombre || '-'
                                            }, void 0, false, {
                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                lineNumber: 1590,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("px-3 py-3 text-center", theme === "dark" ? "text-gray-400" : "text-gray-600"),
                                                children: item.administrador?.nombre || '-'
                                            }, void 0, false, {
                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                lineNumber: 1593,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "px-2 py-1.5 text-center",
                                                children: item.isRecuperada ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "inline-flex items-center justify-center px-2 py-1 rounded text-[10px] font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
                                                    children: "Sí"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                    lineNumber: 1598,
                                                    columnNumber: 25
                                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-gray-400",
                                                    children: "-"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                    lineNumber: 1602,
                                                    columnNumber: 25
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                lineNumber: 1596,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "px-2 py-1.5 text-center",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex items-center justify-center gap-1 transition-opacity",
                                                    children: [
                                                        !isAsesor && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                            onClick: ()=>openEditModal(item),
                                                            className: "p-1 hover:bg-blue-100 text-blue-600 rounded dark:hover:bg-blue-900/30 dark:text-blue-400",
                                                            title: isRecuperador || isAdministrativo ? "Ver detalles" : "Editar",
                                                            children: isRecuperador || isAdministrativo ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Eye$3e$__["Eye"], {
                                                                className: "w-3 h-3"
                                                            }, void 0, false, {
                                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                                lineNumber: 1614,
                                                                columnNumber: 68
                                                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$pencil$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Pencil$3e$__["Pencil"], {
                                                                className: "w-3 h-3"
                                                            }, void 0, false, {
                                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                                lineNumber: 1614,
                                                                columnNumber: 98
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                            lineNumber: 1609,
                                                            columnNumber: 27
                                                        }, this),
                                                        (isAdmin || isGerencia) && !isRecuperador && !isEncargado && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                            onClick: ()=>handleDeleteAudit(item._id),
                                                            className: "p-1 hover:bg-red-100 text-red-600 rounded dark:hover:bg-red-900/30 dark:text-red-400",
                                                            title: "Eliminar",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__["Trash2"], {
                                                                className: "w-3 h-3"
                                                            }, void 0, false, {
                                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                                lineNumber: 1624,
                                                                columnNumber: 29
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                            lineNumber: 1619,
                                                            columnNumber: 27
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                    lineNumber: 1606,
                                                    columnNumber: 23
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                lineNumber: 1605,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, item._id, true, {
                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                        lineNumber: 1518,
                                        columnNumber: 19
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                lineNumber: 1500,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                        lineNumber: 1477,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                    lineNumber: 1476,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                lineNumber: 1468,
                columnNumber: 7
            }, this),
            selectedAudit && editModalOpen && ("TURBOPACK compile-time value", "object") !== "undefined" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$dom$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createPortal"])(/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$dashboard$2f$audit$2d$edit$2d$modal$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AuditEditModal"], {
                isOpen: editModalOpen,
                isReadOnlyMode: isRecuperador || isAdministrativo,
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
                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                lineNumber: 1639,
                columnNumber: 9
            }, this), document.body),
            showSlotsModal && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 z-[100] flex items-start justify-center pt-20 p-4 bg-black/50 backdrop-blur-sm",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col", theme === "dark" ? "bg-gray-900 border border-white/10" : "bg-white"),
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex items-center justify-between p-4 border-b", theme === "dark" ? "border-gray-700 bg-purple-900/20" : "border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50"),
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center gap-3",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "bg-purple-600 p-2 rounded-lg",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Calendar$3e$__["Calendar"], {
                                                className: "w-6 h-6 text-white"
                                            }, void 0, false, {
                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                lineNumber: 1669,
                                                columnNumber: 19
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                            lineNumber: 1668,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-xl font-semibold", theme === "dark" ? "text-white" : "text-gray-800"),
                                                    children: "Turnos Disponibles"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                    lineNumber: 1672,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-500"),
                                                    children: "Consulta la disponibilidad de turnos por fecha"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                    lineNumber: 1673,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                            lineNumber: 1671,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                    lineNumber: 1667,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("p-2 rounded-lg transition", theme === "dark" ? "hover:bg-gray-800" : "hover:bg-gray-100"),
                                    onClick: ()=>setShowSlotsModal(false),
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-6 h-6", theme === "dark" ? "text-gray-400" : "text-gray-600")
                                    }, void 0, false, {
                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                        lineNumber: 1680,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                    lineNumber: 1676,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                            lineNumber: 1663,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("p-4 border-b", theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"),
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("block text-sm font-medium mb-2", theme === "dark" ? "text-gray-300" : "text-gray-700"),
                                    children: "Seleccionar fecha:"
                                }, void 0, false, {
                                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                    lineNumber: 1685,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                    type: "date",
                                    value: selectedDate,
                                    onChange: (e)=>handleDateChange(e.target.value),
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("p-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent", theme === "dark" ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300")
                                }, void 0, false, {
                                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                    lineNumber: 1686,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                            lineNumber: 1684,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("p-4 border-b", theme === "dark" ? "bg-blue-900/20 border-gray-700" : "bg-blue-50 border-gray-200"),
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-xs font-semibold mb-2", theme === "dark" ? "text-gray-300" : "text-gray-700"),
                                    children: "Leyenda de disponibilidad:"
                                }, void 0, false, {
                                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                    lineNumber: 1698,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex flex-wrap gap-3 text-xs",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center gap-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "w-4 h-4 rounded bg-green-100 border border-green-300"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                    lineNumber: 1701,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: theme === "dark" ? "text-gray-300" : "",
                                                    children: "5-10 cupos disponibles"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                    lineNumber: 1702,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                            lineNumber: 1700,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center gap-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "w-4 h-4 rounded bg-yellow-100 border border-yellow-300"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                    lineNumber: 1705,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: theme === "dark" ? "text-gray-300" : "",
                                                    children: "3-4 cupos disponibles"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                    lineNumber: 1706,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                            lineNumber: 1704,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center gap-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "w-4 h-4 rounded bg-orange-100 border border-orange-300"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                    lineNumber: 1709,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: theme === "dark" ? "text-gray-300" : "",
                                                    children: "1-2 cupos disponibles"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                    lineNumber: 1710,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                            lineNumber: 1708,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center gap-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "w-4 h-4 rounded bg-red-100 border border-red-300"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                    lineNumber: 1713,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: theme === "dark" ? "text-gray-300" : "",
                                                    children: "Turno completo"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                    lineNumber: 1714,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                            lineNumber: 1712,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                    lineNumber: 1699,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                            lineNumber: 1697,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex-1 overflow-y-auto p-4",
                            children: loadingSlots ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center justify-center py-12",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$refresh$2d$cw$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__RefreshCw$3e$__["RefreshCw"], {
                                        className: "w-12 h-12 animate-spin text-purple-600"
                                    }, void 0, false, {
                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                        lineNumber: 1722,
                                        columnNumber: 19
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("ml-3", theme === "dark" ? "text-gray-400" : "text-gray-600"),
                                        children: "Cargando turnos..."
                                    }, void 0, false, {
                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                        lineNumber: 1723,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                lineNumber: 1721,
                                columnNumber: 17
                            }, this) : availableSlots.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-center py-12", theme === "dark" ? "text-gray-400" : "text-gray-500"),
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    children: "No hay turnos disponibles para esta fecha."
                                }, void 0, false, {
                                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                    lineNumber: 1727,
                                    columnNumber: 19
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                lineNumber: 1726,
                                columnNumber: 17
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3",
                                children: availableSlots.map((slot)=>{
                                    const available = 10 - slot.count;
                                    const isBlocked = available <= 0;
                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: `p-4 rounded-lg border-2 transition-all ${getSlotColor(slot.count)} ${isBlocked ? 'opacity-60' : 'hover:shadow-md'}`,
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center justify-between mb-2",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-lg font-bold",
                                                        children: slot.time
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                        lineNumber: 1740,
                                                        columnNumber: 27
                                                    }, this),
                                                    isBlocked && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                                        className: "w-5 h-5"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                        lineNumber: 1741,
                                                        columnNumber: 41
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                lineNumber: 1739,
                                                columnNumber: 25
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "text-xs space-y-1",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex justify-between",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "text-gray-600",
                                                                children: "Pactadas:"
                                                            }, void 0, false, {
                                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                                lineNumber: 1745,
                                                                columnNumber: 29
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "font-semibold",
                                                                children: [
                                                                    slot.count,
                                                                    "/10"
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                                lineNumber: 1746,
                                                                columnNumber: 29
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                        lineNumber: 1744,
                                                        columnNumber: 27
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex justify-between",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "text-gray-600",
                                                                children: "Disponibles:"
                                                            }, void 0, false, {
                                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                                lineNumber: 1749,
                                                                columnNumber: 29
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "font-bold",
                                                                children: Math.max(0, available)
                                                            }, void 0, false, {
                                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                                lineNumber: 1750,
                                                                columnNumber: 29
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                        lineNumber: 1748,
                                                        columnNumber: 27
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                lineNumber: 1743,
                                                columnNumber: 25
                                            }, this),
                                            isBlocked && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "mt-2 text-xs font-semibold text-center",
                                                children: "COMPLETO"
                                            }, void 0, false, {
                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                lineNumber: 1753,
                                                columnNumber: 39
                                            }, this)
                                        ]
                                    }, slot.time, true, {
                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                        lineNumber: 1735,
                                        columnNumber: 23
                                    }, this);
                                })
                            }, void 0, false, {
                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                lineNumber: 1730,
                                columnNumber: 17
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                            lineNumber: 1719,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("p-4 border-t flex justify-between items-center", theme === "dark" ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-gray-50"),
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600"),
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "font-semibold",
                                            children: "Total de turnos:"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                            lineNumber: 1763,
                                            columnNumber: 17
                                        }, this),
                                        " ",
                                        availableSlots.length,
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "ml-4 font-semibold",
                                            children: "Auditorías pactadas:"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                            lineNumber: 1764,
                                            columnNumber: 17
                                        }, this),
                                        " ",
                                        availableSlots.reduce((sum, s)=>sum + s.count, 0)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                    lineNumber: 1762,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    className: "px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition",
                                    onClick: ()=>setShowSlotsModal(false),
                                    children: "Cerrar"
                                }, void 0, false, {
                                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                    lineNumber: 1766,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                            lineNumber: 1761,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                    lineNumber: 1659,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                lineNumber: 1658,
                columnNumber: 9
            }, this),
            showStatsModal && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 z-[100] flex items-start justify-center pt-20 p-4 bg-black/50 backdrop-blur-sm",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col", theme === "dark" ? "bg-gray-900 border border-white/10" : "bg-white"),
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex items-center justify-between p-5 border-b", theme === "dark" ? "border-gray-700 bg-indigo-900/20" : "border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50"),
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center gap-3",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "bg-indigo-600 p-2 rounded-lg",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$column$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__BarChart3$3e$__["BarChart3"], {
                                                className: "w-6 h-6 text-white"
                                            }, void 0, false, {
                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                lineNumber: 1790,
                                                columnNumber: 19
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                            lineNumber: 1789,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-xl font-semibold", theme === "dark" ? "text-white" : "text-gray-800"),
                                                    children: "Estadísticas de Contactación"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                    lineNumber: 1793,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-500"),
                                                    children: "Afiliados contactados por obra social anterior"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                    lineNumber: 1794,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                            lineNumber: 1792,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                    lineNumber: 1788,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("p-2 rounded-lg transition", theme === "dark" ? "hover:bg-gray-800" : "hover:bg-gray-100"),
                                    onClick: ()=>setShowStatsModal(false),
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-6 h-6", theme === "dark" ? "text-gray-400" : "text-gray-600")
                                    }, void 0, false, {
                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                        lineNumber: 1801,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                    lineNumber: 1797,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                            lineNumber: 1784,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("p-5 border-b", theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"),
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("block text-sm font-medium mb-2", theme === "dark" ? "text-gray-300" : "text-gray-700"),
                                    children: "Seleccionar fecha:"
                                }, void 0, false, {
                                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                    lineNumber: 1806,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                    type: "date",
                                    value: statsDate,
                                    onChange: (e)=>handleStatsDateChange(e.target.value),
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("p-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent", theme === "dark" ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300")
                                }, void 0, false, {
                                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                    lineNumber: 1807,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                            lineNumber: 1805,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex-1 overflow-y-auto p-5",
                            children: loadingStats ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center justify-center py-12",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$refresh$2d$cw$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__RefreshCw$3e$__["RefreshCw"], {
                                        className: "w-12 h-12 animate-spin text-indigo-600"
                                    }, void 0, false, {
                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                        lineNumber: 1821,
                                        columnNumber: 19
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("ml-3", theme === "dark" ? "text-gray-400" : "text-gray-600"),
                                        children: "Cargando estadísticas..."
                                    }, void 0, false, {
                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                        lineNumber: 1822,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                lineNumber: 1820,
                                columnNumber: 17
                            }, this) : salesStats.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-center py-12", theme === "dark" ? "text-gray-400" : "text-gray-500"),
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "font-medium",
                                    children: "No hay contactaciones registradas para esta fecha."
                                }, void 0, false, {
                                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                    lineNumber: 1826,
                                    columnNumber: 19
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                lineNumber: 1825,
                                columnNumber: 17
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "space-y-3",
                                children: salesStats.map((stat, index)=>{
                                    const total = salesStats.reduce((sum, s)=>sum + s.count, 0);
                                    const percentage = (stat.count / total * 100).toFixed(1);
                                    const colors = [
                                        '#4F46E5',
                                        '#7C3AED',
                                        '#2563EB',
                                        '#6B7280'
                                    ];
                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("rounded-lg p-4 border-l-4 hover:shadow-md transition", theme === "dark" ? "bg-gradient-to-r from-gray-800 to-gray-700" : "bg-gradient-to-r from-white to-gray-50"),
                                        style: {
                                            borderLeftColor: colors[index % colors.length]
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center justify-between mb-2",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex items-center gap-3",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm", theme === "dark" ? "bg-indigo-900 text-indigo-300" : "bg-indigo-100 text-indigo-700"),
                                                                children: index + 1
                                                            }, void 0, false, {
                                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                                lineNumber: 1845,
                                                                columnNumber: 29
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: `font-semibold text-base ${getObraVendidaClass(stat.obraSocial, theme)} px-3 py-1 rounded-full inline-block`,
                                                                    children: stat.obraSocial
                                                                }, void 0, false, {
                                                                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                                    lineNumber: 1852,
                                                                    columnNumber: 31
                                                                }, this)
                                                            }, void 0, false, {
                                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                                lineNumber: 1851,
                                                                columnNumber: 29
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                        lineNumber: 1844,
                                                        columnNumber: 27
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-right",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-2xl font-bold", theme === "dark" ? "text-indigo-400" : "text-indigo-600"),
                                                                children: stat.count
                                                            }, void 0, false, {
                                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                                lineNumber: 1858,
                                                                columnNumber: 29
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-xs", theme === "dark" ? "text-gray-400" : "text-gray-500"),
                                                                children: "contactaciones"
                                                            }, void 0, false, {
                                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                                lineNumber: 1859,
                                                                columnNumber: 29
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                        lineNumber: 1857,
                                                        columnNumber: 27
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                lineNumber: 1843,
                                                columnNumber: 25
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-full rounded-full h-2 mt-2", theme === "dark" ? "bg-gray-600" : "bg-gray-200"),
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500",
                                                    style: {
                                                        width: `${percentage}%`
                                                    }
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                    lineNumber: 1864,
                                                    columnNumber: 27
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                lineNumber: 1863,
                                                columnNumber: 25
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-xs mt-1 text-right", theme === "dark" ? "text-gray-400" : "text-gray-600"),
                                                children: [
                                                    percentage,
                                                    "% del total"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                                lineNumber: 1869,
                                                columnNumber: 25
                                            }, this)
                                        ]
                                    }, stat.obraSocial, true, {
                                        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                        lineNumber: 1835,
                                        columnNumber: 23
                                    }, this);
                                })
                            }, void 0, false, {
                                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                lineNumber: 1829,
                                columnNumber: 17
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                            lineNumber: 1818,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("p-5 border-t flex justify-between items-center", theme === "dark" ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-gray-50"),
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600"),
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "font-semibold",
                                            children: "Total contactaciones:"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                            lineNumber: 1879,
                                            columnNumber: 17
                                        }, this),
                                        " ",
                                        salesStats.reduce((sum, s)=>sum + s.count, 0),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "ml-4 font-semibold",
                                            children: "Obras sociales:"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                            lineNumber: 1880,
                                            columnNumber: 17
                                        }, this),
                                        " ",
                                        salesStats.length
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                    lineNumber: 1878,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    className: "px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition",
                                    onClick: ()=>setShowStatsModal(false),
                                    children: "Cerrar"
                                }, void 0, false, {
                                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                                    lineNumber: 1882,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                            lineNumber: 1877,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                    lineNumber: 1780,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
                lineNumber: 1779,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/dashboard/auditorias-seguimiento.tsx",
        lineNumber: 1008,
        columnNumber: 5
    }, this);
}
_s(AuditoriasSeguimiento, "MD8u5OzuyDD0SEFj1p/8j7zeou8=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$dashboard$2f$theme$2d$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTheme"],
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"]
    ];
});
_c = AuditoriasSeguimiento;
var _c;
__turbopack_context__.k.register(_c, "AuditoriasSeguimiento");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=components_dashboard_auditorias-seguimiento_tsx_708fc87a._.js.map