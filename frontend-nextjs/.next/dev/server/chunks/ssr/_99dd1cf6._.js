module.exports = [
"[project]/lib/evidenciasService.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * ============================================================
 * SERVICIO DE EVIDENCIAS
 * ============================================================
 * Funciones para interactuar con el backend del módulo de evidencias.
 * NO duplica lógica de negocio - solo consume endpoints.
 */ __turbopack_context__.s([
    "downloadZip",
    ()=>downloadZip,
    "getEvidenciaByVenta",
    ()=>getEvidenciaByVenta,
    "getEvidencias",
    ()=>getEvidencias,
    "getVentasElegibles",
    ()=>getVentasElegibles,
    "markAsComplete",
    ()=>markAsComplete,
    "uploadZip",
    ()=>uploadZip
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/api.ts [app-ssr] (ecmascript)");
;
async function getEvidencias(params) {
    const response = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].get('/evidencias', {
        params
    });
    return response.data;
}
async function getEvidenciaByVenta(ventaId) {
    const response = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].get(`/evidencias/${ventaId}`);
    return response.data;
}
async function getVentasElegibles(params) {
    const response = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].get('/evidencias/ventas-elegibles', {
        params
    });
    return response.data;
}
async function uploadZip(ventaId, file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('ventaId', ventaId);
    const response = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].post('/evidencias/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        },
        timeout: 180000,
        maxContentLength: 105 * 1024 * 1024,
        maxBodyLength: 105 * 1024 * 1024
    });
    return response.data;
}
async function markAsComplete(ventaId) {
    const response = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].patch(`/evidencias/${ventaId}/complete`);
    return response.data;
}
async function downloadZip(ventaId, originalName) {
    const response = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].get(`/evidencias/${ventaId}/download`, {
        responseType: 'blob'
    });
    // Crear blob y descargar
    const blob = new Blob([
        response.data
    ], {
        type: 'application/zip'
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = originalName || 'evidencia.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}
}),
"[project]/app/dashboard/affiliates/stats/page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/** Página: Estadísticas de Base de Afiliados */ __turbopack_context__.s([
    "default",
    ()=>AffiliatesStatsPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$dashboard$2f$dashboard$2d$content$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/dashboard/dashboard-content.tsx [app-ssr] (ecmascript)");
'use client';
;
;
function AffiliatesStatsPage() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$dashboard$2f$dashboard$2d$content$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DashboardContent"], {
        activeSection: "base-afiliados-estadistica"
    }, void 0, false, {
        fileName: "[project]/app/dashboard/affiliates/stats/page.tsx",
        lineNumber: 7,
        columnNumber: 12
    }, this);
}
}),
];

//# sourceMappingURL=_99dd1cf6._.js.map