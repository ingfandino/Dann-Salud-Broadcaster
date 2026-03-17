module.exports = [
"[project]/components/dashboard/auditorias-crear-turno.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * ============================================================
 * CREAR TURNO DE AUDITORÍA (auditorias-crear-turno.tsx)
 * ============================================================
 * Formulario para crear nuevos turnos de auditoría.
 * Permite carga masiva desde Excel y selección de horarios.
 */ __turbopack_context__.s([
    "AuditoriasCrearTurno",
    ()=>AuditoriasCrearTurno
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$dashboard$2f$theme$2d$provider$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/dashboard/theme-provider.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$upload$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Upload$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/upload.js [app-ssr] (ecmascript) <export default as Upload>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$send$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Send$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/send.js [app-ssr] (ecmascript) <export default as Send>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-alert.js [app-ssr] (ecmascript) <export default as AlertCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-ssr] (ecmascript) <export default as Loader2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/api.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/sonner/dist/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
;
;
;
const ARGENTINE_OBRAS_SOCIALES = [
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
const TIPO_VENTA = [
    "alta",
    "cambio"
];
function AuditoriasCrearTurno() {
    const { theme } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$dashboard$2f$theme$2d$provider$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useTheme"])();
    const { user } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useAuth"])();
    const fileInputRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const userRole = user?.role?.toLowerCase() || "";
    const isSupervisor = userRole === "supervisor";
    const isRecuperador = userRole === "recuperador";
    const isEncargado = userRole === "encargado" // ✅ NUEVO: Rol Encargado
    ;
    const isIndependiente = userRole === "independiente" // ✅ NUEVO: Rol Independiente
    ;
    // Un auditor CON numeroEquipo es realmente un asesor que también hace auditorías
    // Un auditor SIN numeroEquipo actúa como gerencia (puede ver todos los equipos)
    const isAuditorConEquipo = userRole === "auditor" && !!user?.numeroEquipo;
    const isAsesor = userRole === "asesor" || isAuditorConEquipo || isRecuperador || isIndependiente // Independiente se comporta como asesor (autoasigna)
    ;
    const isGerenciaOrAuditorSinEquipo = userRole === "gerencia" || userRole === "encargado" || userRole === "auditor" && !user?.numeroEquipo;
    // ✅ Encargado con numeroEquipo se comporta como supervisor de su equipo
    const isEncargadoConEquipo = isEncargado && !!user?.numeroEquipo;
    const isSupervisorLevel = isSupervisor || isEncargadoConEquipo;
    // Form State
    const [form, setForm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({
        nombre: "",
        cuil: "",
        telefono: "",
        tipoVenta: "alta",
        obraSocialAnterior: "",
        obraSocialVendida: "Binimed",
        fecha: "",
        hora: "",
        supervisor: "",
        asesor: "",
        validador: "",
        datosExtra: ""
    });
    // Lists
    const [asesores, setAsesores] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [supervisores, setSupervisores] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [validadores, setValidadores] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [availableSlots, setAvailableSlots] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [otroEquipo, setOtroEquipo] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [perteneceOtroSupervisor, setPerteneceOtroSupervisor] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [supervisorSeleccionado, setSupervisorSeleccionado] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    // Estado para "Venta propia" de Supervisores
    const [ventaPropia, setVentaPropia] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    // Loading states
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [loadingSlots, setLoadingSlots] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    // Bulk upload
    const [uploadingBulk, setUploadingBulk] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [bulkProgress, setBulkProgress] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({
        current: 0,
        total: 0
    });
    const [rejectedRows, setRejectedRows] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    // Estado para Eliana Soledad (usada por Recuperador y Supervisor con venta propia)
    const [elianaSoledad, setElianaSoledad] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    // Load supervisors (para Gerencia, Auditor sin equipo, Supervisor, Recuperador o Encargado)
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (isGerenciaOrAuditorSinEquipo || isSupervisor || isRecuperador || isEncargado) {
            loadSupervisores();
        }
    }, [
        isGerenciaOrAuditorSinEquipo,
        isSupervisor,
        isRecuperador,
        isEncargado
    ]);
    // Efecto para manejar "Venta propia" de Supervisores y Encargados
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if ((isSupervisor || isEncargado) && ventaPropia) {
            // Autoseleccionar al supervisor como asesor
            if (user?._id) {
                setForm((prev)=>({
                        ...prev,
                        asesor: user._id
                    }));
                console.log('Supervisor Venta Propia: Asesor autoasignado:', user.nombre);
            }
            // Asignar Eliana Soledad como supervisor si ya está cargada
            if (elianaSoledad) {
                setForm((prev)=>({
                        ...prev,
                        supervisor: elianaSoledad._id
                    }));
                console.log('Supervisor Venta Propia: Supervisor asignado - Eliana Soledad');
            }
        } else if ((isSupervisor || isEncargado) && !ventaPropia) {
            // Limpiar asesor y supervisor cuando se desactiva
            setForm((prev)=>({
                    ...prev,
                    asesor: '',
                    supervisor: ''
                }));
        }
    }, [
        ventaPropia,
        isSupervisor,
        isEncargado,
        user,
        elianaSoledad
    ]);
    // ✅ Efecto para Independiente: auto-asignar asesor y cargar Eliana Soledad como supervisor
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (isIndependiente) {
            // Auto-asignar como asesor
            if (user?._id) {
                setForm((prev)=>({
                        ...prev,
                        asesor: user._id
                    }));
                console.log('Independiente: Asesor autoasignado:', user.nombre);
            }
            // Cargar Eliana Soledad como supervisor
            loadElianaSoledadForIndependiente();
        }
    }, [
        isIndependiente,
        user
    ]);
    // Función para cargar Eliana Soledad para Independiente
    const loadElianaSoledadForIndependiente = async ()=>{
        try {
            const res = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].users.list();
            const eliana = res.data.find((u)=>u.role?.toLowerCase() === 'gerencia' && u.nombre?.toLowerCase().includes('eliana') && u.nombre?.toLowerCase().includes('soledad'));
            if (eliana) {
                setElianaSoledad(eliana);
                setForm((prev)=>({
                        ...prev,
                        supervisor: eliana._id
                    }));
                console.log('Independiente: Supervisor asignado - Eliana Soledad');
            } else {
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error('No se pudo encontrar a Eliana Soledad (Gerencia) en el sistema');
            }
        } catch (error) {
            console.error('Error cargando Eliana Soledad para Independiente:', error);
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error('Error al cargar supervisor automático');
        }
    };
    // Load asesores when supervisor changes (para Gerencia/Auditor sin equipo)
    // Para supervisores, cargar asesores de su equipo o del supervisor seleccionado
    // Para asesores, NO necesitan lista de asesores (se auto-asignan)
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (isGerenciaOrAuditorSinEquipo && form.supervisor) {
            loadAsesoresByEquipo(form.supervisor);
        } else if (isSupervisor) {
            if (perteneceOtroSupervisor && supervisorSeleccionado) {
                loadAsesoresByEquipo(supervisorSeleccionado);
            } else {
                loadAsesores();
            }
        }
    }, [
        form.supervisor,
        isSupervisor,
        isGerenciaOrAuditorSinEquipo,
        perteneceOtroSupervisor,
        supervisorSeleccionado
    ]);
    // Load validadores
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        console.log('Validadores useEffect triggered:', {
            otroEquipo,
            asesor: form.asesor,
            user: user?.nombre,
            numeroEquipo: user?.numeroEquipo,
            isSupervisor,
            isAsesor,
            isRecuperador,
            isGerenciaOrAuditorSinEquipo,
            perteneceOtroSupervisor,
            supervisorSeleccionado
        });
        if (otroEquipo) {
            loadTodosLosValidadores();
        } else if (isSupervisor && perteneceOtroSupervisor && supervisorSeleccionado) {
            loadValidadoresPorSupervisor(supervisorSeleccionado);
        } else if (isRecuperador && elianaSoledad) {
            // Recuperador: cargar validadores del equipo de Eliana Soledad
            loadValidadoresPorSupervisor(elianaSoledad._id);
        } else {
            loadValidadores();
        }
    }, [
        otroEquipo,
        form.asesor,
        form.supervisor,
        user,
        isSupervisor,
        isAsesor,
        isRecuperador,
        isGerenciaOrAuditorSinEquipo,
        perteneceOtroSupervisor,
        supervisorSeleccionado,
        supervisores,
        elianaSoledad
    ]);
    // Para Recuperador: preseleccionar validador por defecto (Eliana Soledad o usuario de sesión)
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (isRecuperador && validadores.length > 0 && !form.validador) {
            // Intentar preseleccionar a Eliana Soledad como validador
            const elianaValidador = validadores.find((v)=>v.nombre?.toLowerCase().includes('eliana') && v.nombre?.toLowerCase().includes('soledad'));
            if (elianaValidador) {
                setForm((prev)=>({
                        ...prev,
                        validador: elianaValidador._id
                    }));
                console.log('Recuperador: Validador preseleccionado - Eliana Soledad');
            } else if (user?._id) {
                // Si no está Eliana, preseleccionar al usuario de sesión si está en la lista
                const usuarioEnLista = validadores.find((v)=>v._id === user._id);
                if (usuarioEnLista) {
                    setForm((prev)=>({
                            ...prev,
                            validador: user._id
                        }));
                    console.log('Recuperador: Validador preseleccionado - Usuario de sesión');
                }
            }
        }
    }, [
        isRecuperador,
        validadores,
        user
    ]);
    // Load available slots when date changes
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (form.fecha) {
            loadAvailableSlots(form.fecha);
        }
    }, [
        form.fecha
    ]);
    // Check for pre-fill data from Lead Management
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const prefillData = sessionStorage.getItem('prefillAudit');
        if (prefillData) {
            try {
                const data = JSON.parse(prefillData);
                setForm((prev)=>({
                        ...prev,
                        nombre: data.nombre || "",
                        cuil: data.cuil || "",
                        telefono: data.telefono || "",
                        obraSocialAnterior: data.obraSocialAnterior || "",
                        datosExtra: data.localidad ? `Localidad: ${data.localidad}` : ""
                    }));
                sessionStorage.removeItem('prefillAudit');
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].info("Datos precargados desde Lead Management");
            } catch (e) {
                console.error("Error parsing prefill data", e);
            }
        }
    }, []);
    const loadSupervisores = async ()=>{
        try {
            // Usar includeAllAuditors=true para obtener todos los usuarios sin filtro por equipo
            const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].users.list("includeAllAuditors=true");
            const users = Array.isArray(data) ? data : [];
            const sups = users.filter((u)=>(u.role?.toLowerCase() === "supervisor" || u.role?.toLowerCase() === "encargado") && u.active !== false);
            console.log('loadSupervisores:', sups.length, 'supervisores encontrados');
            setSupervisores(sups);
            // Buscar a Eliana Soledad (usada por Recuperador y Supervisor con venta propia)
            // ✅ FIX: Buscar en supervisores O gerencia (Eliana tiene rol gerencia)
            const eliana = users.find((s)=>(s.role?.toLowerCase() === 'supervisor' || s.role?.toLowerCase() === 'gerencia') && s.active !== false && s.nombre?.toLowerCase().includes('eliana') && s.nombre?.toLowerCase().includes('soledad'));
            if (eliana) {
                setElianaSoledad(eliana);
                console.log('Eliana Soledad encontrada:', eliana.nombre);
                // Para Recuperador: preseleccionar automáticamente
                if (isRecuperador) {
                    setForm((prev)=>({
                            ...prev,
                            supervisor: eliana._id
                        }));
                    console.log('Recuperador: Supervisor preseleccionado - Eliana Soledad');
                }
            } else {
                console.warn('No se encontró a Eliana Soledad en la lista de supervisores');
            }
        } catch (err) {
            console.error(err);
        }
    };
    // Load asesores
    const loadAsesores = async ()=>{
        try {
            // Use scope=group to filter by team on backend if possible, or filter on client
            const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].users.list("scope=group");
            const users = Array.isArray(data) ? data : [];
            const myNumeroEquipo = user?.numeroEquipo;
            const filtered = users.filter((u)=>{
                const isActive = u.active !== false;
                const hasName = u.nombre && u.nombre.trim().length > 0;
                const isCorrectRole = [
                    "asesor",
                    "auditor",
                    "supervisor",
                    "encargado"
                ].includes(u.role?.toLowerCase());
                // If supervisor or encargado, filter by own team. If not supervisor, backend 'scope=group' might have already filtered, 
                // but we double check if we have the info.
                const sameTeam = !isSupervisorLevel || !myNumeroEquipo || String(u.numeroEquipo) === String(myNumeroEquipo);
                return isActive && hasName && isCorrectRole && sameTeam;
            }).sort((a, b)=>a.nombre.localeCompare(b.nombre));
            // Si es supervisor o encargado, asegurarse de que esté incluido en la lista
            if (isSupervisorLevel && user) {
                const supervisorYaIncluido = filtered.some((u)=>u._id === user._id);
                if (!supervisorYaIncluido) {
                    // Agregar al supervisor/encargado actual al inicio de la lista
                    filtered.unshift({
                        _id: user._id,
                        nombre: user.nombre || user.email,
                        role: user.role,
                        numeroEquipo: user.numeroEquipo
                    });
                }
            }
            setAsesores(filtered);
        } catch (err) {
            console.error(err);
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error("Error al cargar asesores");
        }
    };
    const loadAsesoresByEquipo = async (supervisorId)=>{
        try {
            // Usar includeAllAuditors=true para obtener todos los usuarios
            const { data: allUsers } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].users.list("includeAllAuditors=true");
            const users = Array.isArray(allUsers) ? allUsers : [];
            console.log('loadAsesoresByEquipo:', {
                supervisorId,
                totalUsers: users.length
            });
            const supervisor = users.find((u)=>u._id === supervisorId);
            if (!supervisor?.numeroEquipo) {
                setAsesores([]);
                return;
            }
            const filtered = users.filter((u)=>{
                const isActive = u.active !== false;
                const hasName = u.nombre && u.nombre.trim().length > 0;
                const isCorrectRole = [
                    "asesor",
                    "auditor",
                    "supervisor"
                ].includes(u.role?.toLowerCase());
                const sameTeam = String(u.numeroEquipo) === String(supervisor.numeroEquipo);
                return isActive && hasName && isCorrectRole && sameTeam;
            }).sort((a, b)=>a.nombre.localeCompare(b.nombre));
            setAsesores(filtered);
            // Also load validators for this team
            loadValidadoresByEquipo(supervisor.numeroEquipo, users);
        } catch (err) {
            console.error(err);
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error("Error al cargar asesores del equipo");
        }
    };
    const loadValidadoresByEquipo = (numeroEquipo, allUsers)=>{
        const filtered = allUsers.filter((u)=>{
            const isActive = u.active !== false;
            const hasName = u.nombre && u.nombre.trim().length > 0;
            const sameTeam = String(u.numeroEquipo) === String(numeroEquipo);
            return isActive && hasName && sameTeam;
        }).sort((a, b)=>a.nombre.localeCompare(b.nombre));
        setValidadores(filtered);
    };
    const loadValidadoresPorSupervisor = async (supervisorId)=>{
        try {
            // Usar includeAllAuditors=true para obtener todos los usuarios
            const { data: allUsers } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].users.list("includeAllAuditors=true");
            const users = Array.isArray(allUsers) ? allUsers : [];
            console.log('loadValidadoresPorSupervisor:', {
                supervisorId,
                totalUsers: users.length
            });
            const supervisor = users.find((u)=>u._id === supervisorId);
            if (!supervisor?.numeroEquipo) {
                setValidadores([]);
                return;
            }
            const filtered = users.filter((u)=>{
                const isActive = u.active !== false;
                const hasName = u.nombre && u.nombre.trim().length > 0;
                const sameTeam = String(u.numeroEquipo) === String(supervisor.numeroEquipo);
                const notAsesor = !form.asesor || u._id !== form.asesor;
                return isActive && hasName && sameTeam && notAsesor;
            }).sort((a, b)=>a.nombre.localeCompare(b.nombre));
            // ✅ CRÍTICO: Para Recuperador, incluir al usuario de sesión en la lista de validadores
            if (isRecuperador && user && !filtered.some((v)=>v._id === user._id)) {
                filtered.push({
                    _id: user._id,
                    nombre: user.nombre || user.email,
                    role: user.role,
                    numeroEquipo: user.numeroEquipo
                });
                console.log('Recuperador: Usuario de sesión agregado a validadores:', user.nombre);
            }
            setValidadores(filtered);
        } catch (err) {
            console.error(err);
        }
    };
    const loadValidadores = async ()=>{
        try {
            // Determine the target team number
            let targetNumeroEquipo = user?.numeroEquipo;
            // Para Gerencia o Auditor sin equipo: usar el equipo del supervisor seleccionado
            if (isGerenciaOrAuditorSinEquipo) {
                if (!form.supervisor) {
                    setValidadores([]);
                    return;
                }
                const selectedSupervisor = supervisores.find((s)=>s._id === form.supervisor);
                if (selectedSupervisor) {
                    targetNumeroEquipo = selectedSupervisor.numeroEquipo;
                }
            }
            console.log('loadValidadores called', {
                role: user?.role,
                userTeam: user?.numeroEquipo,
                targetTeam: targetNumeroEquipo,
                supervisor: form.supervisor,
                isAsesor,
                isSupervisor,
                isGerenciaOrAuditorSinEquipo
            });
            if (!targetNumeroEquipo) {
                console.log('No targetNumeroEquipo, setting validadores to empty');
                setValidadores([]);
                return;
            }
            // Para asesores y supervisores: cargar todos los usuarios
            // Usar scope=all para obtener todos los usuarios con sus campos completos
            const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].users.list("scope=all");
            const users = Array.isArray(data) ? data : [];
            // Debug: ver qué usuarios devuelve la API
            console.log('API devuelve', users.length, 'usuarios');
            console.log('Usuarios con numeroEquipo:', users.filter((u)=>u.numeroEquipo).map((u)=>({
                    nombre: u.nombre,
                    equipo: u.numeroEquipo,
                    role: u.role
                })));
            console.log('Buscando equipo:', targetNumeroEquipo, 'tipo:', typeof targetNumeroEquipo);
            const filtered = users.filter((u)=>{
                const isActive = u.active !== false;
                const hasName = u.nombre && u.nombre.trim().length > 0;
                // Comparar numeroEquipo con conversión a String para evitar problemas de tipo
                const userEquipo = u.numeroEquipo ? String(u.numeroEquipo) : null;
                const targetEquipo = targetNumeroEquipo ? String(targetNumeroEquipo) : null;
                const sameTeam = userEquipo === targetEquipo;
                // Para asesores (isAsesor), excluir a sí mismos (son el asesor implícito de la venta)
                // Para otros roles, excluir al asesor seleccionado en el form
                const asesorIdToExclude = isAsesor ? user?._id : form.asesor;
                const notAsesor = !asesorIdToExclude || u._id !== asesorIdToExclude;
                return isActive && hasName && sameTeam && notAsesor;
            }).sort((a, b)=>a.nombre.localeCompare(b.nombre));
            console.log('Filtered validadores:', filtered.length, 'users from team', targetNumeroEquipo);
            setValidadores(filtered);
        } catch (err) {
            console.error('Error loading validadores:', err);
        }
    };
    const loadTodosLosValidadores = async ()=>{
        try {
            // Cargar todos los usuarios para mostrar validadores de otros equipos
            // Usar includeAllAuditors=true para que el backend devuelva todos los usuarios
            const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].users.list("includeAllAuditors=true");
            const users = Array.isArray(data) ? data : [];
            console.log('loadTodosLosValidadores: API devuelve', users.length, 'usuarios');
            const filtered = users.filter((u)=>{
                const isActive = u.active !== false;
                const hasName = u.nombre && u.nombre.trim().length > 0;
                // Solo roles que pueden validar: Supervisor, Asesor, Auditor o Gerencia
                const isCorrectRole = [
                    "asesor",
                    "supervisor",
                    "auditor",
                    "gerencia"
                ].includes(u.role?.toLowerCase());
                // Para asesores (isAsesor), excluir a sí mismos (son el asesor implícito)
                // Para otros roles, excluir al asesor seleccionado en el form
                const asesorIdToExclude = isAsesor ? user?._id : form.asesor;
                const notAsesor = !asesorIdToExclude || u._id !== asesorIdToExclude;
                return isActive && hasName && isCorrectRole && notAsesor;
            }).sort((a, b)=>a.nombre.localeCompare(b.nombre));
            setValidadores(filtered);
        } catch (err) {
            console.error(err);
        }
    };
    const loadAvailableSlots = async (date)=>{
        try {
            setLoadingSlots(true);
            const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].audits.getAvailableSlots(date);
            setAvailableSlots(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            setAvailableSlots([]);
        } finally{
            setLoadingSlots(false);
        }
    };
    const generateTimeOptions = ()=>{
        const options = [];
        const start = new Date();
        start.setHours(9, 20, 0, 0);
        const end = new Date();
        end.setHours(23, 0, 0, 0);
        let cur = new Date(start);
        while(cur <= end){
            const hh = String(cur.getHours()).padStart(2, "0");
            const mm = String(cur.getMinutes()).padStart(2, "0");
            options.push(`${hh}:${mm}`);
            cur.setMinutes(cur.getMinutes() + 20);
        }
        return options;
    };
    const timeOptions = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        const all = generateTimeOptions();
        const map = {};
        if (Array.isArray(availableSlots)) {
            availableSlots.forEach((s)=>{
                map[s.time] = s.count;
            });
        }
        return all.map((t)=>({
                time: t,
                disabled: (map[t] || 0) >= 10
            }));
    }, [
        availableSlots
    ]);
    const handleChange = (field, value)=>{
        setForm((prev)=>({
                ...prev,
                [field]: value
            }));
    };
    const validate = ()=>{
        if (!form.nombre.trim()) return "Nombre es requerido";
        if (!/^\d{11}$/.test(form.cuil)) return "CUIL debe tener exactamente 11 dígitos";
        if (form.telefono && !/^\d{10}$/.test(form.telefono.replace(/\D/g, ''))) return "Teléfono debe tener 10 dígitos";
        if (!form.fecha) return "Fecha es requerida";
        if (!form.hora) return "Hora es requerida";
        // Para asesores, supervisores con venta propia o encargados con venta propia, no se requiere seleccionar asesor (se auto-asigna)
        const autoAsignaAsesor = isAsesor || (isSupervisor || isEncargado) && ventaPropia;
        if (!autoAsignaAsesor && !form.asesor) return "Asesor es requerido";
        if (!form.validador) return "Validador es requerido";
        if (isGerenciaOrAuditorSinEquipo && !form.supervisor) return "Supervisor es requerido";
        // Para supervisor/encargado con venta propia, validar que Eliana Soledad esté disponible
        if ((isSupervisor || isEncargado) && ventaPropia && !elianaSoledad) return "No se encontró a Eliana Soledad para asignar como supervisor";
        return null;
    };
    const handleSubmit = async (e)=>{
        e.preventDefault();
        const error = validate();
        if (error) {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error(error);
            return;
        }
        try {
            setLoading(true);
            // Use browser's local timezone
            const scheduledAt = new Date(`${form.fecha}T${form.hora}:00`);
            // Para asesores, supervisores con venta propia o encargados con venta propia, el asesor es el propio usuario
            const autoAsignaAsesor = isAsesor || (isSupervisor || isEncargado) && ventaPropia;
            const asesorId = autoAsignaAsesor ? user?._id : form.asesor;
            const payload = {
                nombre: form.nombre,
                cuil: form.cuil,
                telefono: form.telefono,
                tipoVenta: form.tipoVenta,
                obraSocialAnterior: form.obraSocialAnterior,
                obraSocialVendida: form.obraSocialVendida,
                scheduledAt: scheduledAt.toISOString(),
                asesor: asesorId,
                validador: form.validador,
                datosExtra: form.datosExtra,
                status: "Pendiente"
            };
            // ✅ CRÍTICO: Para Recuperador, Supervisor con Venta Propia o Encargado con Venta Propia, asignar Eliana Soledad
            // También activar isReferido para que el sistema permita supervisor con rol Gerencia
            if ((isRecuperador || (isSupervisor || isEncargado) && ventaPropia) && elianaSoledad) {
                payload.supervisor = elianaSoledad._id;
                payload.isReferido = true; // ✅ Permite supervisor con rol Gerencia
                console.log('Supervisor asignado (Eliana Soledad):', elianaSoledad.nombre, elianaSoledad._id, 'isReferido: true');
            } else if (form.supervisor) {
                payload.supervisor = form.supervisor;
            }
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].audits.create(payload);
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success("Auditoría creada exitosamente");
            // Reset form y estados relacionados
            setForm({
                nombre: "",
                cuil: "",
                telefono: "",
                tipoVenta: "alta",
                obraSocialAnterior: "",
                obraSocialVendida: "Binimed",
                fecha: "",
                hora: "",
                supervisor: "",
                asesor: "",
                validador: "",
                datosExtra: ""
            });
            // Resetear checkbox de venta propia
            if (isSupervisor || isEncargado) {
                setVentaPropia(false);
            }
        } catch (err) {
            console.error('Full error:', err);
            console.error('Error response:', err.response);
            console.error('Error response data:', JSON.stringify(err.response?.data, null, 2));
            console.error('Error status:', err.response?.status);
            // Log specific error details if they exist
            if (err.response?.data?.error) {
                console.error('Error details:', JSON.stringify(err.response.data.error, null, 2));
                console.error('Error code:', err.response.data.error.code);
                console.error('Error message:', err.response.data.error.message);
                console.error('Error traceId:', err.response.data.error.traceId);
                console.error('Error details array:', err.response.data.error.details);
            }
            let errorMessage = "Error al crear auditoría";
            // ✅ Manejo especial para CUIL duplicado con info enriquecida
            if (err.response?.data?.code === "DUPLICATE_CUIL") {
                const sale = err.response.data.existingSale;
                let msg = err.response.data.message || "El CUIL ingresado ya se encuentra registrado.";
                msg += `\nEstado actual: ${sale?.status || "Sin estado"}.`;
                if (sale?.asesor) msg += `\nAsesor: ${sale.asesor}.`;
                if (sale?.createdAt) {
                    const fecha = new Date(sale.createdAt).toLocaleDateString("es-AR");
                    msg += `\nFecha de creación: ${fecha}.`;
                }
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error(msg, {
                    duration: 8000
                });
            } else {
                if (err.response?.data?.error) {
                    if (typeof err.response.data.error === 'string') {
                        errorMessage = err.response.data.error;
                    } else if (typeof err.response.data.error === 'object' && err.response.data.error.message) {
                        errorMessage = err.response.data.error.message;
                    }
                } else if (err.response?.data?.message) {
                    errorMessage = err.response.data.message;
                } else if (err.message) {
                    errorMessage = err.message;
                }
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error(errorMessage);
            }
        } finally{
            setLoading(false);
        }
    };
    const handleBulkUpload = async (e)=>{
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setUploadingBulk(true);
            setBulkProgress({
                current: 0,
                total: 0
            });
            setRejectedRows([]);
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].audits.bulkUpload(file);
            const { accepted, rejected } = response.data;
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success(`${accepted} auditorías creadas exitosamente`);
            if (rejected && rejected.length > 0) {
                setRejectedRows(rejected);
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].warning(`${rejected.length} filas rechazadas`);
            }
        } catch (err) {
            console.error(err);
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error(err.response?.data?.message || "Error en carga masiva");
        } finally{
            setUploadingBulk(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-6 animate-fade-in-up",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center justify-between",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("text-xl font-semibold", theme === "dark" ? "text-white" : "text-gray-800"),
                                children: "Pautar Auditoría / Venta"
                            }, void 0, false, {
                                fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                lineNumber: 746,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("text-sm mt-1", theme === "dark" ? "text-gray-400" : "text-gray-600"),
                                children: "Crear nuevo turno de auditoría"
                            }, void 0, false, {
                                fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                lineNumber: 749,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                        lineNumber: 745,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                ref: fileInputRef,
                                type: "file",
                                accept: ".xlsx,.xls,.csv",
                                onChange: handleBulkUpload,
                                className: "hidden"
                            }, void 0, false, {
                                fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                lineNumber: 754,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>fileInputRef.current?.click(),
                                disabled: uploadingBulk,
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2", uploadingBulk ? "opacity-50 cursor-not-allowed" : "", theme === "dark" ? "bg-green-500/20 text-green-400 hover:bg-green-500/30" : "bg-green-500 text-white hover:bg-green-600"),
                                children: [
                                    uploadingBulk ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                        className: "w-4 h-4 animate-spin"
                                    }, void 0, false, {
                                        fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                        lineNumber: 772,
                                        columnNumber: 30
                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$upload$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Upload$3e$__["Upload"], {
                                        className: "w-4 h-4"
                                    }, void 0, false, {
                                        fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                        lineNumber: 772,
                                        columnNumber: 77
                                    }, this),
                                    "Carga Masiva"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                lineNumber: 761,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                        lineNumber: 753,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                lineNumber: 744,
                columnNumber: 7
            }, this),
            rejectedRows.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("rounded-xl border p-4", theme === "dark" ? "bg-red-500/10 border-red-500/20" : "bg-red-50 border-red-200"),
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-start gap-3",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__["AlertCircle"], {
                            className: "w-5 h-5 text-red-500 mt-0.5"
                        }, void 0, false, {
                            fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                            lineNumber: 785,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex-1",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("font-semibold text-sm mb-2", theme === "dark" ? "text-red-400" : "text-red-700"),
                                    children: [
                                        "Filas rechazadas (",
                                        rejectedRows.length,
                                        ")"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                    lineNumber: 787,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "space-y-1 text-xs",
                                    children: [
                                        rejectedRows.slice(0, 5).map((row, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: theme === "dark" ? "text-red-300" : "text-red-600",
                                                children: [
                                                    "Fila ",
                                                    row.row,
                                                    ": ",
                                                    row.reason
                                                ]
                                            }, idx, true, {
                                                fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                                lineNumber: 792,
                                                columnNumber: 19
                                            }, this)),
                                        rejectedRows.length > 5 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "text-gray-500",
                                            children: [
                                                "... y ",
                                                rejectedRows.length - 5,
                                                " más"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                            lineNumber: 797,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                    lineNumber: 790,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>setRejectedRows([]),
                                    className: "mt-2 text-xs underline hover:no-underline",
                                    children: "Cerrar"
                                }, void 0, false, {
                                    fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                    lineNumber: 800,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                            lineNumber: 786,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                    lineNumber: 784,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                lineNumber: 780,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("rounded-2xl border p-6 backdrop-blur-sm max-w-2xl mx-auto", theme === "dark" ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10" : "bg-white border-gray-200 shadow-sm"),
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                    onSubmit: handleSubmit,
                    className: "space-y-4",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700"),
                                    children: [
                                        "Nombre de afiliado ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-red-500",
                                            children: "*"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                            lineNumber: 822,
                                            columnNumber: 34
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                    lineNumber: 821,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                    type: "text",
                                    value: form.nombre,
                                    onChange: (e)=>handleChange("nombre", e.target.value),
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("w-full px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-white/5 border-white/10 text-white placeholder-gray-500" : "bg-white border-gray-200 text-gray-800 placeholder-gray-400"),
                                    required: true
                                }, void 0, false, {
                                    fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                    lineNumber: 824,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                            lineNumber: 820,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700"),
                                    children: [
                                        "CUIL ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-red-500",
                                            children: "*"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                            lineNumber: 841,
                                            columnNumber: 20
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                    lineNumber: 840,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                    type: "text",
                                    placeholder: "11 dígitos",
                                    value: form.cuil,
                                    onChange: (e)=>handleChange("cuil", e.target.value.replace(/\D/g, "")),
                                    maxLength: 11,
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("w-full px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-white/5 border-white/10 text-white placeholder-gray-500" : "bg-white border-gray-200 text-gray-800 placeholder-gray-400"),
                                    required: true
                                }, void 0, false, {
                                    fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                    lineNumber: 843,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                            lineNumber: 839,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700"),
                                    children: "Teléfono"
                                }, void 0, false, {
                                    fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                    lineNumber: 861,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                    type: "tel",
                                    value: form.telefono,
                                    onChange: (e)=>handleChange("telefono", e.target.value),
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("w-full px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-white/5 border-white/10 text-white placeholder-gray-500" : "bg-white border-gray-200 text-gray-800 placeholder-gray-400")
                                }, void 0, false, {
                                    fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                    lineNumber: 864,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                            lineNumber: 860,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "grid grid-cols-2 gap-3",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700"),
                                            children: "Tipo de venta"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                            lineNumber: 880,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                            value: form.tipoVenta,
                                            onChange: (e)=>handleChange("tipoVenta", e.target.value),
                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("w-full px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"),
                                            children: TIPO_VENTA.map((t)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: t,
                                                    children: t
                                                }, t, false, {
                                                    fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                                    lineNumber: 891,
                                                    columnNumber: 38
                                                }, this))
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                            lineNumber: 883,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                    lineNumber: 879,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700"),
                                            children: "Obra social vendida"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                            lineNumber: 895,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                            value: form.obraSocialVendida,
                                            onChange: (e)=>handleChange("obraSocialVendida", e.target.value),
                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("w-full px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"),
                                            children: OBRAS_VENDIDAS.map((o)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: o,
                                                    children: o
                                                }, o, false, {
                                                    fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                                    lineNumber: 906,
                                                    columnNumber: 42
                                                }, this))
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                            lineNumber: 898,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                    lineNumber: 894,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                            lineNumber: 878,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700"),
                                    children: "Obra social anterior"
                                }, void 0, false, {
                                    fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                    lineNumber: 913,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                    value: form.obraSocialAnterior,
                                    onChange: (e)=>handleChange("obraSocialAnterior", e.target.value),
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("w-full px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"),
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                            value: "",
                                            children: "-- Seleccionar --"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                            lineNumber: 924,
                                            columnNumber: 15
                                        }, this),
                                        ARGENTINE_OBRAS_SOCIALES.map((o)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: o,
                                                children: o
                                            }, o, false, {
                                                fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                                lineNumber: 925,
                                                columnNumber: 50
                                            }, this))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                    lineNumber: 916,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                            lineNumber: 912,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "grid grid-cols-2 gap-3",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700"),
                                            children: [
                                                "Fecha (día) ",
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-red-500",
                                                    children: "*"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                                    lineNumber: 933,
                                                    columnNumber: 29
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                            lineNumber: 932,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "date",
                                            value: form.fecha,
                                            onChange: (e)=>handleChange("fecha", e.target.value),
                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("w-full px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"),
                                            required: true
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                            lineNumber: 935,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                    lineNumber: 931,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700"),
                                            children: [
                                                "Hora (turno) ",
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-red-500",
                                                    children: "*"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                                    lineNumber: 948,
                                                    columnNumber: 30
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                            lineNumber: 947,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                            value: form.hora,
                                            onChange: (e)=>handleChange("hora", e.target.value),
                                            disabled: loadingSlots,
                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("w-full px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"),
                                            required: true,
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "",
                                                    children: "-- Seleccionar --"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                                    lineNumber: 960,
                                                    columnNumber: 17
                                                }, this),
                                                timeOptions.map(({ time, disabled })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: time,
                                                        disabled: disabled,
                                                        children: [
                                                            time,
                                                            " ",
                                                            disabled ? "(lleno)" : ""
                                                        ]
                                                    }, time, true, {
                                                        fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                                        lineNumber: 962,
                                                        columnNumber: 19
                                                    }, this))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                            lineNumber: 950,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                    lineNumber: 946,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                            lineNumber: 930,
                            columnNumber: 11
                        }, this),
                        isSupervisor && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("p-3 rounded-lg border", theme === "dark" ? "bg-purple-500/10 border-purple-500/30" : "bg-purple-50 border-purple-200"),
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center gap-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "checkbox",
                                            id: "perteneceOtroSupervisor",
                                            checked: perteneceOtroSupervisor,
                                            onChange: (e)=>{
                                                setPerteneceOtroSupervisor(e.target.checked);
                                                if (!e.target.checked) {
                                                    setSupervisorSeleccionado("");
                                                    setForm((prev)=>({
                                                            ...prev,
                                                            asesor: "",
                                                            validador: ""
                                                        }));
                                                }
                                            },
                                            className: "w-4 h-4 rounded"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                            lineNumber: 977,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            htmlFor: "perteneceOtroSupervisor",
                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("text-sm font-medium", theme === "dark" ? "text-purple-400" : "text-purple-700"),
                                            children: "Pertenece a otro supervisor"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                            lineNumber: 990,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                    lineNumber: 976,
                                    columnNumber: 15
                                }, this),
                                perteneceOtroSupervisor && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mt-3",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("block text-xs font-medium mb-1", theme === "dark" ? "text-gray-400" : "text-gray-600"),
                                            children: "Seleccionar supervisor"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                            lineNumber: 996,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                            value: supervisorSeleccionado,
                                            onChange: (e)=>{
                                                setSupervisorSeleccionado(e.target.value);
                                                setForm((prev)=>({
                                                        ...prev,
                                                        asesor: "",
                                                        validador: ""
                                                    }));
                                            },
                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("w-full px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"),
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "",
                                                    children: "-- Seleccionar --"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                                    lineNumber: 1010,
                                                    columnNumber: 21
                                                }, this),
                                                supervisores.filter((s)=>s._id !== user?._id).map((s)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: s._id,
                                                        children: s.nombre
                                                    }, s._id, false, {
                                                        fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                                        lineNumber: 1011,
                                                        columnNumber: 77
                                                    }, this))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                            lineNumber: 999,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                    lineNumber: 995,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                            lineNumber: 972,
                            columnNumber: 13
                        }, this),
                        isGerenciaOrAuditorSinEquipo && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700"),
                                    children: [
                                        "Supervisor ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-red-500",
                                            children: "*"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                            lineNumber: 1022,
                                            columnNumber: 28
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                    lineNumber: 1021,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                    value: form.supervisor,
                                    onChange: (e)=>handleChange("supervisor", e.target.value),
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("w-full px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"),
                                    required: true,
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                            value: "",
                                            children: "-- Seleccionar supervisor --"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                            lineNumber: 1033,
                                            columnNumber: 17
                                        }, this),
                                        supervisores.map((s)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: s._id,
                                                children: s.nombre
                                            }, s._id, false, {
                                                fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                                lineNumber: 1034,
                                                columnNumber: 40
                                            }, this))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                    lineNumber: 1024,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                            lineNumber: 1020,
                            columnNumber: 13
                        }, this),
                        isRecuperador && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("p-3 rounded-lg border", theme === "dark" ? "bg-purple-500/10 border-purple-500/30" : "bg-purple-50 border-purple-200"),
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("text-sm", theme === "dark" ? "text-purple-400" : "text-purple-700"),
                                    children: [
                                        "👑 ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                            children: "Supervisor:"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                            lineNumber: 1046,
                                            columnNumber: 20
                                        }, this),
                                        " ",
                                        elianaSoledad?.nombre || "Eliana Soledad (cargando...)"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                    lineNumber: 1045,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("text-xs mt-1", theme === "dark" ? "text-purple-400/70" : "text-purple-600"),
                                    children: "La venta se asignará automáticamente al equipo de Eliana Soledad"
                                }, void 0, false, {
                                    fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                    lineNumber: 1048,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                            lineNumber: 1041,
                            columnNumber: 13
                        }, this),
                        !isAsesor && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700"),
                                    children: [
                                        "Asesor ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-red-500",
                                            children: "*"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                            lineNumber: 1059,
                                            columnNumber: 24
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                    lineNumber: 1058,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                    value: form.asesor,
                                    onChange: (e)=>handleChange("asesor", e.target.value),
                                    disabled: (isSupervisor || isEncargado) && ventaPropia,
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("w-full px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800", (isSupervisor || isEncargado) && ventaPropia && "opacity-60 cursor-not-allowed"),
                                    required: true,
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                            value: "",
                                            children: "-- Seleccionar asesor --"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                            lineNumber: 1072,
                                            columnNumber: 17
                                        }, this),
                                        asesores.map((a)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: a._id,
                                                children: [
                                                    a.nombre,
                                                    " (",
                                                    a.role,
                                                    ")"
                                                ]
                                            }, a._id, true, {
                                                fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                                lineNumber: 1073,
                                                columnNumber: 36
                                            }, this))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                    lineNumber: 1061,
                                    columnNumber: 15
                                }, this),
                                isGerenciaOrAuditorSinEquipo && !form.supervisor && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("text-xs mt-1", theme === "dark" ? "text-cyan-400" : "text-cyan-600"),
                                    children: "Primero selecciona un supervisor"
                                }, void 0, false, {
                                    fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                    lineNumber: 1076,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                            lineNumber: 1057,
                            columnNumber: 13
                        }, this),
                        (isSupervisor || isEncargado) && !perteneceOtroSupervisor && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("p-3 rounded-lg border", ventaPropia ? theme === "dark" ? "bg-green-500/10 border-green-500/30" : "bg-green-50 border-green-200" : theme === "dark" ? "bg-gray-500/10 border-gray-500/30" : "bg-gray-50 border-gray-200"),
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center gap-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "checkbox",
                                            id: "ventaPropia",
                                            checked: ventaPropia,
                                            onChange: (e)=>{
                                                setVentaPropia(e.target.checked);
                                                if (!e.target.checked) {
                                                    // Al desactivar, limpiar asignaciones
                                                    setForm((prev)=>({
                                                            ...prev,
                                                            asesor: '',
                                                            supervisor: ''
                                                        }));
                                                }
                                            },
                                            className: "w-4 h-4 rounded"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                            lineNumber: 1092,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            htmlFor: "ventaPropia",
                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("text-sm font-medium", ventaPropia ? theme === "dark" ? "text-green-400" : "text-green-700" : theme === "dark" ? "text-gray-400" : "text-gray-700"),
                                            children: "Venta propia"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                            lineNumber: 1105,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                    lineNumber: 1091,
                                    columnNumber: 15
                                }, this),
                                ventaPropia && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mt-2 space-y-1",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("text-xs", theme === "dark" ? "text-green-400/80" : "text-green-600"),
                                            children: [
                                                "👤 ",
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                    children: "Asesor:"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                                    lineNumber: 1117,
                                                    columnNumber: 24
                                                }, this),
                                                " ",
                                                user?.nombre || "Tu usuario"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                            lineNumber: 1116,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("text-xs", theme === "dark" ? "text-green-400/80" : "text-green-600"),
                                            children: [
                                                "👑 ",
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                    children: "Supervisor:"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                                    lineNumber: 1120,
                                                    columnNumber: 24
                                                }, this),
                                                " ",
                                                elianaSoledad?.nombre || "Eliana Soledad (cargando...) "
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                            lineNumber: 1119,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                    lineNumber: 1115,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                            lineNumber: 1085,
                            columnNumber: 13
                        }, this),
                        isAsesor && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("p-3 rounded-lg border", theme === "dark" ? "bg-cyan-500/10 border-cyan-500/30" : "bg-cyan-50 border-cyan-200"),
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("text-sm", theme === "dark" ? "text-cyan-400" : "text-cyan-700"),
                                    children: [
                                        "👤 ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                            children: "Asesor:"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                            lineNumber: 1134,
                                            columnNumber: 20
                                        }, this),
                                        " ",
                                        user?.nombre || "Tu usuario"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                    lineNumber: 1133,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("text-xs mt-1", theme === "dark" ? "text-cyan-400/70" : "text-cyan-600"),
                                    children: "La venta se registrará automáticamente a tu nombre"
                                }, void 0, false, {
                                    fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                    lineNumber: 1136,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                            lineNumber: 1129,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700"),
                                    children: [
                                        "Validador ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-red-500",
                                            children: "*"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                            lineNumber: 1145,
                                            columnNumber: 25
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                    lineNumber: 1144,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                    value: form.validador,
                                    onChange: (e)=>handleChange("validador", e.target.value),
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("w-full px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"),
                                    required: true,
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                            value: "",
                                            children: "-- Seleccionar validador --"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                            lineNumber: 1156,
                                            columnNumber: 15
                                        }, this),
                                        validadores.map((v)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: v._id,
                                                children: [
                                                    v.nombre,
                                                    " (",
                                                    v.role,
                                                    ")"
                                                ]
                                            }, v._id, true, {
                                                fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                                lineNumber: 1157,
                                                columnNumber: 37
                                            }, this))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                    lineNumber: 1147,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center gap-2 mt-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "checkbox",
                                            id: "otroEquipo",
                                            checked: otroEquipo,
                                            onChange: (e)=>setOtroEquipo(e.target.checked),
                                            className: "w-4 h-4 rounded"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                            lineNumber: 1162,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            htmlFor: "otroEquipo",
                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("text-xs", theme === "dark" ? "text-gray-400" : "text-gray-600"),
                                            children: "Pertenece a otro equipo"
                                        }, void 0, false, {
                                            fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                            lineNumber: 1169,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                    lineNumber: 1161,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("text-xs mt-1", theme === "dark" ? "text-gray-500" : "text-gray-500"),
                                    children: "Selecciona un compañero de tu equipo que validará la venta"
                                }, void 0, false, {
                                    fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                    lineNumber: 1173,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                            lineNumber: 1143,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700"),
                                    children: "Datos extra (opcional)"
                                }, void 0, false, {
                                    fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                    lineNumber: 1180,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                    placeholder: "Ejemplo: Afiliado con familiares, enfermedad preexistente, observaciones...",
                                    value: form.datosExtra,
                                    onChange: (e)=>handleChange("datosExtra", e.target.value),
                                    rows: 3,
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("w-full px-3 py-2 rounded-lg border text-sm resize-none", theme === "dark" ? "bg-white/5 border-white/10 text-white placeholder-gray-500" : "bg-white border-gray-200 text-gray-800 placeholder-gray-400")
                                }, void 0, false, {
                                    fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                    lineNumber: 1183,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                            lineNumber: 1179,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            type: "submit",
                            disabled: loading,
                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("w-full px-6 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2", loading ? "opacity-50 cursor-not-allowed" : "", theme === "dark" ? "bg-gradient-to-r from-cyan-500 to-teal-500 text-white hover:from-cyan-600 hover:to-teal-600" : "bg-gradient-to-r from-cyan-500 to-teal-500 text-white hover:from-cyan-600 hover:to-teal-600"),
                            children: [
                                loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                    className: "w-4 h-4 animate-spin"
                                }, void 0, false, {
                                    fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                    lineNumber: 1209,
                                    columnNumber: 24
                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$send$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Send$3e$__["Send"], {
                                    className: "w-4 h-4"
                                }, void 0, false, {
                                    fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                                    lineNumber: 1209,
                                    columnNumber: 71
                                }, this),
                                loading ? "Creando..." : "Crear Auditoría"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                            lineNumber: 1198,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                    lineNumber: 818,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
                lineNumber: 812,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/dashboard/auditorias-crear-turno.tsx",
        lineNumber: 742,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=components_dashboard_auditorias-crear-turno_tsx_a4b242dc._.js.map