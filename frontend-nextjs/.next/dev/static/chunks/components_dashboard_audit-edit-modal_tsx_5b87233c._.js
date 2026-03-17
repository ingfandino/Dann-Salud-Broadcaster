(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/components/dashboard/audit-edit-modal.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * ============================================================
 * MODAL DE EDICIÓN DE AUDITORÍA (audit-edit-modal.tsx)
 * ============================================================
 * Modal para editar auditorías (ventas).
 * Permite cambiar estado, reprogramar, asignar auditor/admin.
 */ __turbopack_context__.s([
    "AuditEditModal",
    ()=>AuditEditModal
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$dashboard$2f$theme$2d$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/dashboard/theme-provider.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$save$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Save$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/save.js [app-client] (ecmascript) <export default as Save>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Clock$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/clock.js [app-client] (ecmascript) <export default as Clock>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Users$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/users.js [app-client] (ecmascript) <export default as Users>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$message$2d$square$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MessageSquare$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/message-square.js [app-client] (ecmascript) <export default as MessageSquare>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/api.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/sonner/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$dashboard$2f$celebration$2d$animation$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/dashboard/celebration-animation.tsx [app-client] (ecmascript)");
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
/* Estados que disparan la animación de celebración */ const CELEBRATION_STATUSES = [
    "Completa",
    "QR hecho"
];
const STATUS_OPTIONS = [
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
    "AFIP",
    "Baja laboral con nueva alta",
    "Baja laboral sin nueva alta",
    "Padrón",
    "En revisión",
    "Remuneración no válida",
    "Cargada",
    "Aprobada",
    "Aprobada, pero no reconoce clave",
    "Rehacer vídeo",
    "Rechazada",
    "Falta documentación",
    "Falta clave",
    "Falta clave y documentación",
    "El afiliado cambió la clave"
];
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
    "Alta",
    "Cambio"
];
// Helper to check roles
const checkRole = (userRole, allowedRoles)=>{
    if (!userRole) return false;
    return allowedRoles.includes(userRole.toLowerCase());
};
function AuditEditModal({ isOpen, onClose, audit, onSave, isReadOnlyMode = false }) {
    _s();
    const { theme } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$dashboard$2f$theme$2d$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTheme"])();
    const { user } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"])();
    const getLocalDateTime = (utcDateString)=>{
        if (!utcDateString) return {
            fecha: "",
            hora: ""
        };
        const date = new Date(utcDateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return {
            fecha: `${year}-${month}-${day}`,
            hora: `${hours}:${minutes}`
        };
    };
    const localSchedule = getLocalDateTime(audit.scheduledAt);
    const userRole = user?.role?.toLowerCase();
    const isAsesor = userRole === 'asesor';
    const isGerencia = userRole === 'gerencia';
    const isAdmin = userRole === 'administrativo';
    const isAuditorOrSupervisor = [
        'auditor',
        'supervisor'
    ].includes(userRole || '');
    const isRecuperador = userRole === 'recuperador';
    const isEncargado = userRole === 'encargado'; // ✅ NUEVO: Rol Encargado
    const isIndependiente = userRole === 'independiente'; // ✅ NUEVO: Rol Independiente
    const isQRHecho = audit.status?.toLowerCase() === 'qr hecho';
    const isLockedByQR = isQRHecho && !isAdmin && !isGerencia;
    // ✅ Recuperador tiene acceso SOLO LECTURA
    // Independiente tiene permisos de edición como Auditor
    const isReadOnly = isReadOnlyMode;
    // ✅ Determinar si la venta pertenece al supervisor del usuario en sesión
    // Usado para enmascarar el teléfono cuando no corresponde al equipo del usuario
    const belongsToUserSupervisor = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "AuditEditModal.useMemo[belongsToUserSupervisor]": ()=>{
            // Gerencia, Administrativo y Encargado siempre ven el teléfono completo
            if (isGerencia || isAdmin || isEncargado) return true;
            // Auditores e Independientes ven todos los teléfonos (no están asignados a equipos específicos)
            if (userRole === 'auditor' || userRole === 'independiente') return true;
            // Para supervisores: verificar si es SU venta (comparar ID)
            if (userRole === 'supervisor') {
                return audit.supervisorSnapshot?._id === user?._id;
            }
            // Para asesores y otros roles: verificar si pertenece al mismo equipo
            const auditTeam = audit.supervisorSnapshot?.numeroEquipo;
            const userTeam = user?.numeroEquipo;
            return auditTeam && userTeam && String(auditTeam) === String(userTeam);
        }
    }["AuditEditModal.useMemo[belongsToUserSupervisor]"], [
        isGerencia,
        isAdmin,
        userRole,
        audit.supervisorSnapshot,
        user
    ]);
    // Valor a mostrar en el campo teléfono (enmascarado si no pertenece al supervisor)
    const displayPhone = belongsToUserSupervisor ? audit.telefono : '•••••••••••';
    // Status options logic
    const getAvailableStatuses = ()=>{
        if (isAdmin) {
            return [
                "Pendiente",
                "QR hecho",
                "AFIP",
                "Baja laboral con nueva alta",
                "Baja laboral sin nueva alta",
                "Padrón",
                "En revisión",
                "Remuneración no válida",
                "Cargada",
                "Aprobada",
                "Aprobada, pero no reconoce clave",
                "Rehacer vídeo",
                "Rechazada",
                "Falta documentación",
                "Falta clave",
                "Falta clave y documentación",
                "El afiliado cambió la clave"
            ];
        }
        if (isAuditorOrSupervisor || isIndependiente) {
            return [
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
                "Rehacer vídeo"
            ];
        }
        // ✅ Encargado usa los mismos estados que Auditor/Supervisor
        if (isEncargado) {
            return [
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
                "Rehacer vídeo"
            ];
        }
        if (isGerencia) {
            return STATUS_OPTIONS; // All options
        }
        // ✅ Recuperador: solo 3 estados permitidos
        if (isRecuperador) {
            return [
                "Completa",
                "Caída",
                "Reprogramada"
            ];
        }
        return []; // Asesor sees nothing or read-only
    };
    const availableStatuses = getAvailableStatuses();
    const [form, setForm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        nombre: audit.nombre || "",
        cuil: audit.cuil || "",
        telefono: audit.telefono || "",
        obraSocialAnterior: audit.obraSocialAnterior || "",
        obraSocialVendida: audit.obraSocialVendida || "",
        status: audit.status || "",
        tipoVenta: audit.tipoVenta || "Alta",
        asesor: audit.asesor?._id || "",
        grupo: audit.groupId?.nombre || audit.groupId?.name || audit.grupo || "",
        numeroEquipo: audit.asesor?.numeroEquipo || audit.numeroEquipo || "",
        auditor: audit.auditor?._id || "",
        administrador: audit.administrador?._id || "",
        fecha: localSchedule.fecha,
        hora: localSchedule.hora,
        datosExtra: audit.datosExtra || "",
        isRecuperada: audit.isRecuperada || false,
        isReferido: false,
        disponibleParaVenta: audit.disponibleParaVenta || false,
        fechaCreacionQR: audit.fechaCreacionQR ? audit.fechaCreacionQR.split('T')[0] : "",
        supervisor: audit.supervisorSnapshot?._id || ""
    });
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [reprogramar, setReprogramar] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [activeTab, setActiveTab] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("details");
    const [showCelebration, setShowCelebration] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const pendingResponseRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null) // Guardar datos de respuesta para después de la animación
    ;
    const [asesores, setAsesores] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [grupos, setGrupos] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [auditores, setAuditores] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [supervisores, setSupervisores] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [administradores, setAdministradores] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [availableSlots, setAvailableSlots] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AuditEditModal.useEffect": ()=>{
            if (isOpen) {
                setForm({
                    nombre: audit.nombre || "",
                    cuil: audit.cuil || "",
                    telefono: audit.telefono || "",
                    obraSocialAnterior: audit.obraSocialAnterior || "",
                    obraSocialVendida: audit.obraSocialVendida || "",
                    status: audit.status || "",
                    tipoVenta: audit.tipoVenta || "Alta",
                    asesor: audit.asesor?._id || "",
                    grupo: audit.groupId?.nombre || audit.groupId?.name || audit.grupo || "",
                    numeroEquipo: audit.asesor?.numeroEquipo || audit.numeroEquipo || "",
                    auditor: audit.auditor?._id || "",
                    administrador: audit.administrador?._id || "",
                    fecha: localSchedule.fecha,
                    hora: localSchedule.hora,
                    datosExtra: audit.datosExtra || "",
                    isRecuperada: audit.isRecuperada || false,
                    isReferido: audit.isReferido || false,
                    disponibleParaVenta: audit.disponibleParaVenta || false,
                    fechaCreacionQR: audit.fechaCreacionQR ? audit.fechaCreacionQR.split('T')[0] : "",
                    supervisor: audit.supervisorSnapshot?._id || ""
                });
                fetchFilterOptions();
            }
        }
    }["AuditEditModal.useEffect"], [
        isOpen,
        audit
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AuditEditModal.useEffect": ()=>{
            if (form.fecha) fetchAvailableSlots(form.fecha);
        }
    }["AuditEditModal.useEffect"], [
        form.fecha
    ]);
    const fetchFilterOptions = async ()=>{
        try {
            // Use includeAllAuditors=true to ensure we get all relevant users regardless of current user's role/team
            const usersRes = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].users.list("includeAllAuditors=true");
            const users = usersRes.data || [];
            console.log("AuditEditModal: Users fetched:", users.length, users);
            // Store ALL active users for the asesor dropdown (will be filtered by grupo)
            setAsesores(users.filter((u)=>u.active !== false));
            // Filter for auditores dropdown: auditor, supervisor, gerencia, recuperador
            const filteredAuditores = users.filter((u)=>[
                    'auditor',
                    'supervisor',
                    'gerencia',
                    'recuperador'
                ].includes(u.role?.toLowerCase()) && u.active !== false);
            console.log("AuditEditModal: Filtered auditores:", filteredAuditores.length, filteredAuditores);
            setAuditores(filteredAuditores);
            // ✅ NOTA: supervisores se calcula dinámicamente en el useMemo según isReferido
            setSupervisores(users.filter((u)=>[
                    'supervisor',
                    'supervisor_reventa',
                    'encargado',
                    'gerencia'
                ].includes(u.role?.toLowerCase()) && u.active !== false));
            setAdministradores(users.filter((u)=>u.role === 'administrativo' && u.active !== false));
            // Extract unique groups from users
            const uniqueGroups = Array.from(new Set(users.filter((u)=>u.numeroEquipo).map((u)=>u.numeroEquipo))).map((num)=>({
                    _id: num,
                    nombre: num,
                    name: num
                }));
            setGrupos(uniqueGroups);
        } catch (error) {
            console.error("Error fetching filter options:", error);
            // Ensure arrays are always set even on error
            setAsesores([]);
            setAuditores([]);
            setAdministradores([]);
            setGrupos([]);
        }
    };
    // ✅ NUEVO: Filtrar supervisores según isReferido
    // Si isReferido = false → solo supervisores
    // Si isReferido = true → supervisores + gerencia
    const filteredSupervisores = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "AuditEditModal.useMemo[filteredSupervisores]": ()=>{
            if (form.isReferido) {
                // Incluir supervisores Y gerencia
                return supervisores.filter({
                    "AuditEditModal.useMemo[filteredSupervisores]": (u)=>[
                            'supervisor',
                            'supervisor_reventa',
                            'encargado',
                            'gerencia'
                        ].includes(u.role?.toLowerCase())
                }["AuditEditModal.useMemo[filteredSupervisores]"]);
            }
            // Solo supervisores
            return supervisores.filter({
                "AuditEditModal.useMemo[filteredSupervisores]": (u)=>[
                        'supervisor',
                        'supervisor_reventa',
                        'encargado'
                    ].includes(u.role?.toLowerCase())
            }["AuditEditModal.useMemo[filteredSupervisores]"]);
        }
    }["AuditEditModal.useMemo[filteredSupervisores]"], [
        supervisores,
        form.isReferido
    ]);
    // ✅ NUEVO: Detectar si el supervisor seleccionado es Gerencia
    const selectedSupervisorIsGerencia = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "AuditEditModal.useMemo[selectedSupervisorIsGerencia]": ()=>{
            if (!form.supervisor) return false;
            const selected = supervisores.find({
                "AuditEditModal.useMemo[selectedSupervisorIsGerencia].selected": (u)=>u._id === form.supervisor
            }["AuditEditModal.useMemo[selectedSupervisorIsGerencia].selected"]);
            return selected?.role?.toLowerCase() === 'gerencia';
        }
    }["AuditEditModal.useMemo[selectedSupervisorIsGerencia]"], [
        form.supervisor,
        supervisores
    ]);
    // ✅ NUEVO: Detectar si el supervisor seleccionado es "Eliana Suarez"
    const selectedSupervisorIsElianaSuarez = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "AuditEditModal.useMemo[selectedSupervisorIsElianaSuarez]": ()=>{
            if (!form.supervisor) return false;
            const selected = supervisores.find({
                "AuditEditModal.useMemo[selectedSupervisorIsElianaSuarez].selected": (u)=>u._id === form.supervisor
            }["AuditEditModal.useMemo[selectedSupervisorIsElianaSuarez].selected"]);
            const nombre = selected?.nombre?.toLowerCase() || '';
            return nombre.includes('eliana') && (nombre.includes('suarez') || nombre.includes('suárez'));
        }
    }["AuditEditModal.useMemo[selectedSupervisorIsElianaSuarez]"], [
        form.supervisor,
        supervisores
    ]);
    // Filter asesores based on selected grupo (shows ALL users from that numeroEquipo, regardless of role)
    // ✅ MODIFICADO: Lógica condicional según supervisor seleccionado
    const filteredAsesores = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "AuditEditModal.useMemo[filteredAsesores]": ()=>{
            // ✅ NUEVO: Si el supervisor es "Eliana Suarez", mostrar Gerencia + Recuperador + Supervisor
            // Esto permite registrar ventas propias de Supervisores correctamente
            if (selectedSupervisorIsElianaSuarez) {
                return asesores.filter({
                    "AuditEditModal.useMemo[filteredAsesores]": (u)=>{
                        const role = u.role?.toLowerCase();
                        return role === 'gerencia' || role === 'recuperador' || role === 'supervisor';
                    }
                }["AuditEditModal.useMemo[filteredAsesores]"]);
            }
            // Si el supervisor seleccionado es Gerencia (pero no Eliana), mostrar solo Gerencias
            if (selectedSupervisorIsGerencia) {
                return asesores.filter({
                    "AuditEditModal.useMemo[filteredAsesores]": (u)=>u.role?.toLowerCase() === 'gerencia'
                }["AuditEditModal.useMemo[filteredAsesores]"]);
            }
            if (!form.numeroEquipo && !form.grupo) {
                return asesores;
            }
            const selectedNumeroEquipo = form.numeroEquipo || form.grupo;
            return asesores.filter({
                "AuditEditModal.useMemo[filteredAsesores]": (u)=>u.numeroEquipo === selectedNumeroEquipo
            }["AuditEditModal.useMemo[filteredAsesores]"]);
        }
    }["AuditEditModal.useMemo[filteredAsesores]"], [
        asesores,
        form.numeroEquipo,
        form.grupo,
        selectedSupervisorIsGerencia,
        selectedSupervisorIsElianaSuarez
    ]);
    const fetchAvailableSlots = async (date)=>{
        try {
            const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].audits.getAvailableSlots(date);
            setAvailableSlots(data || []);
        } catch (error) {
            console.error("Error fetching slots:", error);
            setAvailableSlots([]);
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
    const getEnabledTimeOptions = ()=>{
        const all = generateTimeOptions();
        const map = {};
        // Safety check: ensure availableSlots is an array
        if (Array.isArray(availableSlots)) {
            availableSlots.forEach((s)=>{
                map[s.time] = s.count;
            });
        }
        return all.map((t)=>({
                time: t,
                disabled: (map[t] || 0) >= 10
            }));
    };
    const timeOptions = getEnabledTimeOptions();
    if (!isOpen) return null;
    const handleChange = (e)=>{
        const { name, value, type } = e.target;
        const checked = e.target.checked;
        // Special handling for grupo changes
        if (name === 'grupo') {
            // Find supervisor for this grupo (numeroEquipo)
            const supervisor = asesores.find((u)=>u.numeroEquipo === value && [
                    'supervisor',
                    'supervisor_reventa',
                    'encargado'
                ].includes(u.role?.toLowerCase()));
            setForm((prev)=>({
                    ...prev,
                    grupo: value,
                    numeroEquipo: value,
                    asesor: supervisor?._id || '' // Auto-select supervisor or clear if not found
                }));
        } else if (name === 'supervisor') {
            // Verificar si el nuevo supervisor es Gerencia
            const selectedUser = supervisores.find((u)=>u._id === value);
            const isGerenciaSelected = selectedUser?.role?.toLowerCase() === 'gerencia';
            if (isGerenciaSelected) {
                // Si se selecciona Gerencia: vaciar grupo y asesor
                setForm((prev)=>({
                        ...prev,
                        supervisor: value,
                        grupo: '',
                        numeroEquipo: '',
                        asesor: '' // Vaciar asesor (se seleccionará de la lista de Gerencias)
                    }));
            } else {
                setForm((prev)=>({
                        ...prev,
                        supervisor: value
                    }));
            }
        } else if (name === 'isReferido') {
            // Al cambiar isReferido, resetear supervisor si ya no es válido
            setForm((prev)=>{
                const newIsReferido = checked;
                // Si se desmarca y el supervisor actual es Gerencia, limpiarlo
                if (!newIsReferido) {
                    const currentSupervisor = supervisores.find((u)=>u._id === prev.supervisor);
                    if (currentSupervisor?.role?.toLowerCase() === 'gerencia') {
                        return {
                            ...prev,
                            isReferido: newIsReferido,
                            supervisor: '',
                            grupo: '',
                            numeroEquipo: '',
                            asesor: ''
                        };
                    }
                }
                return {
                    ...prev,
                    isReferido: newIsReferido
                };
            });
        } else {
            setForm((prev)=>({
                    ...prev,
                    [name]: type === 'checkbox' ? checked : value
                }));
        }
    };
    // Handle Reprogramar checkbox
    const handleReprogramarChange = (e)=>{
        const checked = e.target.checked;
        setReprogramar(checked);
        if (checked) {
            setForm((prev)=>({
                    ...prev,
                    status: 'Reprogramada'
                }));
        }
    };
    const handleSave = async ()=>{
        try {
            setLoading(true);
            const payload = {
                ...form,
                scheduledAt: `${form.fecha}T${form.hora}:00`,
                fechaCreacionQR: form.fechaCreacionQR ? new Date(form.fechaCreacionQR).toISOString() : null
            };
            // Handle empty strings by converting to null
            if (!payload.asesor) payload.asesor = null;
            if (!payload.grupo) payload.grupo = null;
            if (!payload.numeroEquipo) payload.numeroEquipo = null;
            // Handle auditor: send null if empty to allow clearing
            payload.auditor = form.auditor || null;
            // Handle administrador: send null if empty to allow clearing
            payload.administrador = form.administrador || null;
            // Handle supervisor - Gerencia y Encargado pueden modificarlo
            if (!isGerencia && !isEncargado) {
                delete payload.supervisor;
            } else {
                // If gerencia and supervisor is empty string, send null or remove it
                if (!payload.supervisor) {
                    payload.supervisor = null;
                }
            }
            if (reprogramar && form.fecha && form.hora) {
                // Use browser's local timezone
                const scheduledAt = new Date(`${form.fecha}T${form.hora}:00`);
                payload.scheduledAt = scheduledAt.toISOString();
            }
            // If user is NOT Gerencia, remove supervisor from payload to prevent accidental overwrites
            // although the backend should handle this, it's safer.
            // This block is now handled by the new payload cleanup logic above.
            // if (!isGerencia) {
            //     delete payload.supervisor
            // }
            // Validation: Auditor removal
            if (audit.auditor?._id && !form.auditor) {
                // If trying to remove auditor, check permissions
                const currentUserId = user?._id;
                const isAssignedAuditor = currentUserId === audit.auditor._id;
                // Check if user is supervisor of the group
                // The audit's asesor has a numeroEquipo, and we need to check if current user is supervisor of that same team
                const isSupervisorOfGroup = (()=>{
                    const isSupervisor = user?.role?.toLowerCase() === 'supervisor' || user?.role?.toLowerCase() === 'encargado';
                    if (!isSupervisor) return false;
                    // Check if audit.asesor has numeroEquipo and it matches user's numeroEquipo
                    const auditTeam = audit.asesor?.numeroEquipo || audit.numeroEquipo;
                    const userTeam = user?.numeroEquipo;
                    return auditTeam && userTeam && String(auditTeam) === String(userTeam);
                })();
                if (!isGerencia && !isEncargado && !isSupervisorOfGroup && !isAssignedAuditor) {
                    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error("No tienes permiso para quitar al auditor asignado. Solo gerencia, el supervisor del equipo o el auditor mismo pueden hacerlo.");
                    setLoading(false);
                    return;
                }
            }
            // Validation: Admin removal
            if (audit.administrador?._id && !form.administrador) {
                const currentUserId = user?._id;
                const isAssignedAdmin = currentUserId === audit.administrador._id;
                if (!isGerencia && !isAssignedAdmin) {
                    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error("No tienes permiso para quitar al administrador asignado");
                    setLoading(false);
                    return;
                }
            }
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].audits.update(audit._id, payload);
            // ✅ Verificar si el estado cambió a uno de celebración
            const previousStatus = audit.status;
            const newStatus = form.status;
            const shouldCelebrate = CELEBRATION_STATUSES.includes(newStatus) && previousStatus !== newStatus;
            console.log("[AuditEditModal] Estado anterior:", previousStatus, "-> Nuevo estado:", newStatus);
            console.log("[AuditEditModal] Debería celebrar?:", shouldCelebrate, "Estados de celebración:", CELEBRATION_STATUSES);
            if (shouldCelebrate) {
                // Mostrar animación de celebración PRIMERO, luego guardar
                console.log("[AuditEditModal] 🎉 Activando celebración!");
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success("🎉 ¡Excelente! Venta completada");
                // Guardar referencia a los datos para usarlos después de la animación
                pendingResponseRef.current = response.data;
                setShowCelebration(true);
            // NO llamar onSave/onClose aquí - se hará en onComplete de la animación
            } else {
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success("Auditoría actualizada");
                onSave(response.data);
                onClose();
            }
        } catch (error) {
            console.error("Error updating audit:", error);
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error(error.response?.data?.message || "Error al actualizar auditoría");
        } finally{
            setLoading(false);
        }
    };
    const [mounted, setMounted] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AuditEditModal.useEffect": ()=>{
            setMounted(true);
            return ({
                "AuditEditModal.useEffect": ()=>setMounted(false)
            })["AuditEditModal.useEffect"];
        }
    }["AuditEditModal.useEffect"], []);
    if (!mounted) return null;
    const { createPortal } = __turbopack_context__.r("[project]/node_modules/next/dist/compiled/react-dom/index.js [app-client] (ecmascript)");
    return createPortal(/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-full max-w-4xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]", theme === "dark" ? "bg-[#1a1333] border border-white/10" : "bg-white"),
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("px-6 py-4 border-b flex items-center justify-between", theme === "dark" ? "border-white/10" : "border-gray-100"),
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-lg font-semibold", theme === "dark" ? "text-white" : "text-gray-800"),
                                        children: "Editar Auditoría"
                                    }, void 0, false, {
                                        fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                        lineNumber: 715,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-500"),
                                        children: [
                                            audit.nombre,
                                            " - ",
                                            audit.cuil
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                        lineNumber: 718,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                lineNumber: 714,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: onClose,
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("p-2 rounded-lg transition-colors", theme === "dark" ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-500"),
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                    className: "w-5 h-5"
                                }, void 0, false, {
                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                    lineNumber: 729,
                                    columnNumber: 25
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                lineNumber: 722,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                        lineNumber: 710,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex border-b", theme === "dark" ? "border-white/10" : "border-gray-100"),
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setActiveTab("details"),
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2", activeTab === "details" ? theme === "dark" ? "border-purple-500 text-purple-400" : "border-purple-600 text-purple-600" : "border-transparent text-gray-500 hover:text-gray-700"),
                                children: "Detalles"
                            }, void 0, false, {
                                fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                lineNumber: 738,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setActiveTab("history"),
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2", activeTab === "history" ? theme === "dark" ? "border-purple-500 text-purple-400" : "border-purple-600 text-purple-600" : "border-transparent text-gray-500 hover:text-gray-700"),
                                children: "Historial"
                            }, void 0, false, {
                                fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                lineNumber: 749,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                        lineNumber: 734,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex-1 overflow-y-auto p-6",
                        children: [
                            isLockedByQR && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("mb-4 p-3 rounded-lg border", theme === "dark" ? "bg-yellow-500/10 border-yellow-500/30" : "bg-yellow-50 border-yellow-200"),
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-sm font-medium", theme === "dark" ? "text-yellow-400" : "text-yellow-700"),
                                    children: '🔒 Esta auditoría tiene estado "QR Hecho" y no puede ser editada.'
                                }, void 0, false, {
                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                    lineNumber: 769,
                                    columnNumber: 29
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                lineNumber: 765,
                                columnNumber: 25
                            }, this),
                            isReadOnly && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("mb-4 p-3 rounded-lg border", theme === "dark" ? "bg-blue-500/10 border-blue-500/30" : "bg-blue-50 border-blue-200"),
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-sm font-medium", theme === "dark" ? "text-blue-400" : "text-blue-700"),
                                    children: [
                                        "👁️ Modo solo lectura - ",
                                        isAdmin ? "Utiliza Registro de Ventas para editar este registro." : "Puedes visualizar la información pero no modificarla."
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                    lineNumber: 780,
                                    columnNumber: 29
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                lineNumber: 776,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("fieldset", {
                                disabled: isAsesor || isLockedByQR || isReadOnly,
                                className: "contents",
                                children: activeTab === "details" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "space-y-4",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "grid grid-cols-1 md:grid-cols-2 gap-4",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700"),
                                                            children: "Afiliado"
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                            lineNumber: 794,
                                                            columnNumber: 41
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            name: "nombre",
                                                            value: form.nombre,
                                                            onChange: handleChange,
                                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-full px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800")
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                            lineNumber: 797,
                                                            columnNumber: 41
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                    lineNumber: 793,
                                                    columnNumber: 37
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700"),
                                                            children: "Teléfono"
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                            lineNumber: 809,
                                                            columnNumber: 41
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            name: "telefono",
                                                            value: belongsToUserSupervisor ? form.telefono : displayPhone,
                                                            onChange: handleChange,
                                                            readOnly: !belongsToUserSupervisor,
                                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-full px-3 py-2 rounded-lg border text-sm", !belongsToUserSupervisor && "text-gray-400 select-none cursor-not-allowed", theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800")
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                            lineNumber: 812,
                                                            columnNumber: 41
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                    lineNumber: 808,
                                                    columnNumber: 37
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                            lineNumber: 792,
                                            columnNumber: 33
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700"),
                                                    children: "CUIL"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                    lineNumber: 828,
                                                    columnNumber: 37
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    name: "cuil",
                                                    value: form.cuil,
                                                    onChange: handleChange,
                                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-full px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800")
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                    lineNumber: 831,
                                                    columnNumber: 37
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                            lineNumber: 827,
                                            columnNumber: 33
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "grid grid-cols-1 md:grid-cols-2 gap-4",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700"),
                                                            children: "Obra Social Anterior"
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                            lineNumber: 846,
                                                            columnNumber: 41
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                            name: "obraSocialAnterior",
                                                            value: form.obraSocialAnterior,
                                                            onChange: handleChange,
                                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-full px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"),
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                    value: "",
                                                                    children: "-- Seleccionar --"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                                    lineNumber: 859,
                                                                    columnNumber: 45
                                                                }, this),
                                                                ARGENTINE_OBRAS_SOCIALES.map((o)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                        value: o,
                                                                        children: o
                                                                    }, o, false, {
                                                                        fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                                        lineNumber: 861,
                                                                        columnNumber: 49
                                                                    }, this))
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                            lineNumber: 849,
                                                            columnNumber: 41
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                    lineNumber: 845,
                                                    columnNumber: 37
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700"),
                                                            children: "Obra Social Vendida"
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                            lineNumber: 866,
                                                            columnNumber: 41
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                            name: "obraSocialVendida",
                                                            value: form.obraSocialVendida,
                                                            onChange: handleChange,
                                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-full px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"),
                                                            children: OBRAS_VENDIDAS.map((o)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                    value: o,
                                                                    children: o
                                                                }, o, false, {
                                                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                                    lineNumber: 880,
                                                                    columnNumber: 49
                                                                }, this))
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                            lineNumber: 869,
                                                            columnNumber: 41
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                    lineNumber: 865,
                                                    columnNumber: 37
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                            lineNumber: 844,
                                            columnNumber: 33
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "grid grid-cols-1 md:grid-cols-2 gap-4",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700"),
                                                            children: "Estado"
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                            lineNumber: 889,
                                                            columnNumber: 41
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                            name: "status",
                                                            value: form.status,
                                                            onChange: handleChange,
                                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-full px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"),
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                    value: "",
                                                                    children: "Seleccionar estado..."
                                                                }, void 0, false, {
                                                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                                    lineNumber: 901,
                                                                    columnNumber: 45
                                                                }, this),
                                                                form.status && !availableStatuses.includes(form.status) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                    value: form.status,
                                                                    children: form.status
                                                                }, void 0, false, {
                                                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                                    lineNumber: 904,
                                                                    columnNumber: 49
                                                                }, this),
                                                                availableStatuses.map((opt)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                        value: opt,
                                                                        disabled: opt === 'Reprogramada' && !reprogramar,
                                                                        children: opt
                                                                    }, opt, false, {
                                                                        fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                                        lineNumber: 907,
                                                                        columnNumber: 49
                                                                    }, this))
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                            lineNumber: 892,
                                                            columnNumber: 41
                                                        }, this),
                                                        (form.status?.toLowerCase() === 'afip' || form.status?.toLowerCase() === 'padrón') && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex items-center gap-2 mt-2",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                    type: "checkbox",
                                                                    name: "disponibleParaVenta",
                                                                    checked: form.disponibleParaVenta,
                                                                    onChange: handleChange,
                                                                    className: "w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                                    lineNumber: 915,
                                                                    columnNumber: 49
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-sm", theme === "dark" ? "text-gray-300" : "text-gray-700"),
                                                                    children: "Disponible para venta"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                                    lineNumber: 922,
                                                                    columnNumber: 49
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                            lineNumber: 914,
                                                            columnNumber: 45
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                    lineNumber: 888,
                                                    columnNumber: 37
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700"),
                                                            children: "Tipo"
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                            lineNumber: 929,
                                                            columnNumber: 41
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                            name: "tipoVenta",
                                                            value: form.tipoVenta,
                                                            onChange: handleChange,
                                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-full px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"),
                                                            children: TIPO_VENTA.map((t)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                    value: t,
                                                                    children: t
                                                                }, t, false, {
                                                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                                    lineNumber: 943,
                                                                    columnNumber: 49
                                                                }, this))
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                            lineNumber: 932,
                                                            columnNumber: 41
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                    lineNumber: 928,
                                                    columnNumber: 37
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                            lineNumber: 887,
                                            columnNumber: 33
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "grid grid-cols-1 md:grid-cols-4 gap-4",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700"),
                                                            children: "Asesor"
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                            lineNumber: 952,
                                                            columnNumber: 41
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                            name: "asesor",
                                                            value: form.asesor,
                                                            onChange: handleChange,
                                                            disabled: !isGerencia && !isEncargado && !isRecuperador,
                                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-full px-3 py-2 rounded-lg border text-sm", !isGerencia && !isEncargado && !isRecuperador && "opacity-60 cursor-not-allowed", theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"),
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                    value: "",
                                                                    children: "Seleccione"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                                    lineNumber: 966,
                                                                    columnNumber: 45
                                                                }, this),
                                                                filteredAsesores?.map((u)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                        value: u._id,
                                                                        children: [
                                                                            u.nombre,
                                                                            " (",
                                                                            u.role,
                                                                            ")"
                                                                        ]
                                                                    }, u._id, true, {
                                                                        fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                                        lineNumber: 968,
                                                                        columnNumber: 49
                                                                    }, this))
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                            lineNumber: 955,
                                                            columnNumber: 41
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                    lineNumber: 951,
                                                    columnNumber: 37
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700"),
                                                            children: "Grupo"
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                            lineNumber: 973,
                                                            columnNumber: 41
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                            name: "grupo",
                                                            value: form.grupo,
                                                            onChange: handleChange,
                                                            disabled: !isGerencia && !isEncargado && !isRecuperador || selectedSupervisorIsGerencia,
                                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-full px-3 py-2 rounded-lg border text-sm", (!isGerencia && !isEncargado && !isRecuperador || selectedSupervisorIsGerencia) && "opacity-60 cursor-not-allowed", theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"),
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                    value: "",
                                                                    children: "-- Sin Grupo (Asignación Manual) --"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                                    lineNumber: 987,
                                                                    columnNumber: 45
                                                                }, this),
                                                                grupos?.map((g)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                        value: g.nombre || g.name,
                                                                        children: g.nombre || g.name
                                                                    }, g._id, false, {
                                                                        fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                                        lineNumber: 989,
                                                                        columnNumber: 49
                                                                    }, this))
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                            lineNumber: 976,
                                                            columnNumber: 41
                                                        }, this),
                                                        selectedSupervisorIsGerencia && !isRecuperador && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-xs mt-1", theme === "dark" ? "text-amber-400" : "text-amber-600"),
                                                            children: "Grupo deshabilitado (Supervisor es Gerencia)"
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                            lineNumber: 993,
                                                            columnNumber: 45
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                    lineNumber: 972,
                                                    columnNumber: 37
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700"),
                                                            children: "Supervisor"
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                            lineNumber: 999,
                                                            columnNumber: 41
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                            name: "supervisor",
                                                            value: form.supervisor,
                                                            onChange: handleChange,
                                                            disabled: !isGerencia && !isEncargado && !isRecuperador,
                                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-full px-3 py-2 rounded-lg border text-sm", !isGerencia && !isEncargado && !isRecuperador && "opacity-60 cursor-not-allowed", theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"),
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                    value: "",
                                                                    children: "Seleccione"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                                    lineNumber: 1013,
                                                                    columnNumber: 45
                                                                }, this),
                                                                filteredSupervisores?.map((u)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                        value: u._id,
                                                                        children: [
                                                                            u.nombre,
                                                                            " ",
                                                                            u.role?.toLowerCase() === 'gerencia' ? '(Gerencia)' : u.numeroEquipo ? `(${u.numeroEquipo})` : ''
                                                                        ]
                                                                    }, u._id, true, {
                                                                        fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                                        lineNumber: 1015,
                                                                        columnNumber: 49
                                                                    }, this))
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                            lineNumber: 1002,
                                                            columnNumber: 41
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                    lineNumber: 998,
                                                    columnNumber: 37
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700"),
                                                            children: "Auditor"
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                            lineNumber: 1022,
                                                            columnNumber: 41
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                            name: "auditor",
                                                            value: form.auditor,
                                                            onChange: handleChange,
                                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-full px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"),
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                    value: "",
                                                                    children: "Seleccione"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                                    lineNumber: 1034,
                                                                    columnNumber: 45
                                                                }, this),
                                                                auditores?.map((u)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                        value: u._id,
                                                                        children: [
                                                                            u.nombre,
                                                                            " (",
                                                                            u.role,
                                                                            ")"
                                                                        ]
                                                                    }, u._id, true, {
                                                                        fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                                        lineNumber: 1036,
                                                                        columnNumber: 49
                                                                    }, this))
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                            lineNumber: 1025,
                                                            columnNumber: 41
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                    lineNumber: 1021,
                                                    columnNumber: 37
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                            lineNumber: 950,
                                            columnNumber: 33
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700"),
                                                    children: "Administrador"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                    lineNumber: 1044,
                                                    columnNumber: 37
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                    name: "administrador",
                                                    value: form.administrador,
                                                    onChange: handleChange,
                                                    disabled: !isGerencia && !isAdmin,
                                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-full px-3 py-2 rounded-lg border text-sm", !isGerencia && !isAdmin && "opacity-60 cursor-not-allowed", theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"),
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                            value: "",
                                                            children: "Seleccione"
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                            lineNumber: 1058,
                                                            columnNumber: 41
                                                        }, this),
                                                        administradores?.map((u)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: u._id,
                                                                children: u.nombre
                                                            }, u._id, false, {
                                                                fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                                lineNumber: 1060,
                                                                columnNumber: 45
                                                            }, this))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                    lineNumber: 1047,
                                                    columnNumber: 37
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                            lineNumber: 1043,
                                            columnNumber: 33
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "grid grid-cols-1 md:grid-cols-2 gap-4",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700"),
                                                            children: "Fecha (día)"
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                            lineNumber: 1068,
                                                            columnNumber: 41
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "date",
                                                            name: "fecha",
                                                            value: form.fecha,
                                                            onChange: handleChange,
                                                            disabled: !reprogramar,
                                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-full px-3 py-2 rounded-lg border text-sm", !reprogramar && "opacity-50 cursor-not-allowed", theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800")
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                            lineNumber: 1071,
                                                            columnNumber: 41
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                    lineNumber: 1067,
                                                    columnNumber: 37
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700"),
                                                            children: "Hora (Turno)"
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                            lineNumber: 1085,
                                                            columnNumber: 41
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                            name: "hora",
                                                            value: form.hora,
                                                            onChange: handleChange,
                                                            disabled: !reprogramar,
                                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-full px-3 py-2 rounded-lg border text-sm", !reprogramar && "opacity-50 cursor-not-allowed", theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"),
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                    value: "",
                                                                    children: "Seleccionar hora"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                                    lineNumber: 1099,
                                                                    columnNumber: 45
                                                                }, this),
                                                                timeOptions.map((opt)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                        value: opt.time,
                                                                        disabled: opt.disabled && opt.time !== form.hora,
                                                                        children: [
                                                                            opt.time,
                                                                            " ",
                                                                            opt.disabled ? "(Lleno)" : ""
                                                                        ]
                                                                    }, opt.time, true, {
                                                                        fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                                        lineNumber: 1101,
                                                                        columnNumber: 49
                                                                    }, this))
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                            lineNumber: 1088,
                                                            columnNumber: 41
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                    lineNumber: 1084,
                                                    columnNumber: 37
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                            lineNumber: 1066,
                                            columnNumber: 33
                                        }, this),
                                        [
                                            'administrativo',
                                            'gerencia'
                                        ].includes(user?.role?.toLowerCase() || '') && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700"),
                                                    children: "Fecha Creación QR"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                    lineNumber: 1112,
                                                    columnNumber: 41
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "date",
                                                    name: "fechaCreacionQR",
                                                    value: form.fechaCreacionQR,
                                                    onChange: handleChange,
                                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-full px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800")
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                    lineNumber: 1115,
                                                    columnNumber: 41
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                            lineNumber: 1111,
                                            columnNumber: 37
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center gap-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "checkbox",
                                                    id: "reprogramar",
                                                    checked: reprogramar,
                                                    onChange: handleReprogramarChange,
                                                    className: "rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                    lineNumber: 1130,
                                                    columnNumber: 37
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    htmlFor: "reprogramar",
                                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-sm font-medium", theme === "dark" ? "text-gray-300" : "text-gray-700"),
                                                    children: "Reprogramar turno (habilitar fecha/hora)"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                    lineNumber: 1137,
                                                    columnNumber: 37
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                            lineNumber: 1129,
                                            columnNumber: 33
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700"),
                                                    children: "Datos Extra / Notas"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                    lineNumber: 1144,
                                                    columnNumber: 37
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                                    name: "datosExtra",
                                                    value: form.datosExtra,
                                                    onChange: handleChange,
                                                    rows: 3,
                                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-full px-3 py-2 rounded-lg border text-sm resize-none", theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800")
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                    lineNumber: 1147,
                                                    columnNumber: 37
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                            lineNumber: 1143,
                                            columnNumber: 33
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center gap-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "checkbox",
                                                    name: "isRecuperada",
                                                    checked: form.isRecuperada,
                                                    onChange: handleChange,
                                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500")
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                    lineNumber: 1161,
                                                    columnNumber: 37
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-sm", theme === "dark" ? "text-gray-300" : "text-gray-700"),
                                                    children: "¿Recuperada?"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                    lineNumber: 1170,
                                                    columnNumber: 37
                                                }, this),
                                                isRecuperador && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-xs ml-2", theme === "dark" ? "text-gray-500" : "text-gray-400"),
                                                    children: "(Se marca automáticamente al pasar a Completa)"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                    lineNumber: 1174,
                                                    columnNumber: 41
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                            lineNumber: 1160,
                                            columnNumber: 33
                                        }, this),
                                        (isGerencia || isRecuperador) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center gap-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "checkbox",
                                                    name: "isReferido",
                                                    checked: form.isReferido,
                                                    onChange: handleChange,
                                                    className: "w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                    lineNumber: 1183,
                                                    columnNumber: 37
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-sm", theme === "dark" ? "text-gray-300" : "text-gray-700"),
                                                    children: "Referido"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                    lineNumber: 1190,
                                                    columnNumber: 41
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-xs ml-2", theme === "dark" ? "text-gray-500" : "text-gray-400"),
                                                    children: "(Permite asignar Gerencia como Supervisor)"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                    lineNumber: 1193,
                                                    columnNumber: 41
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                            lineNumber: 1182,
                                            columnNumber: 33
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                    lineNumber: 790,
                                    columnNumber: 29
                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "space-y-6",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-sm font-semibold mb-3 flex items-center gap-2", theme === "dark" ? "text-white" : "text-gray-800"),
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Clock$3e$__["Clock"], {
                                                            className: "w-4 h-4"
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                            lineNumber: 1204,
                                                            columnNumber: 41
                                                        }, this),
                                                        "Historial de Estados"
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                    lineNumber: 1203,
                                                    columnNumber: 37
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "space-y-3 pl-2 border-l-2 border-gray-200 dark:border-white/10",
                                                    children: [
                                                        audit.statusHistory?.slice().reverse().map((entry, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "relative pl-4 pb-2",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2", theme === "dark" ? "bg-gray-900 border-purple-500" : "bg-white border-purple-500")
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                                        lineNumber: 1210,
                                                                        columnNumber: 49
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-sm font-medium", theme === "dark" ? "text-gray-200" : "text-gray-800"),
                                                                        children: entry.value
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                                        lineNumber: 1214,
                                                                        columnNumber: 49
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-xs", theme === "dark" ? "text-gray-400" : "text-gray-500"),
                                                                        children: [
                                                                            entry.updatedBy?.nombre || "Sistema",
                                                                            " - ",
                                                                            new Date(entry.updatedAt).toLocaleString()
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                                        lineNumber: 1217,
                                                                        columnNumber: 49
                                                                    }, this)
                                                                ]
                                                            }, idx, true, {
                                                                fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                                lineNumber: 1209,
                                                                columnNumber: 45
                                                            }, this)),
                                                        (!audit.statusHistory || audit.statusHistory.length === 0) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-sm text-gray-500 pl-4",
                                                            children: "No hay historial de estados"
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                            lineNumber: 1223,
                                                            columnNumber: 45
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                    lineNumber: 1207,
                                                    columnNumber: 37
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                            lineNumber: 1202,
                                            columnNumber: 33
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-sm font-semibold mb-3 flex items-center gap-2", theme === "dark" ? "text-white" : "text-gray-800"),
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Users$3e$__["Users"], {
                                                            className: "w-4 h-4"
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                            lineNumber: 1231,
                                                            columnNumber: 41
                                                        }, this),
                                                        "Historial de Asesores"
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                    lineNumber: 1230,
                                                    columnNumber: 37
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "space-y-3 pl-2 border-l-2 border-gray-200 dark:border-white/10",
                                                    children: [
                                                        audit.asesorHistory?.slice().reverse().map((entry, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "relative pl-4 pb-2",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2", theme === "dark" ? "bg-gray-900 border-blue-500" : "bg-white border-blue-500")
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                                        lineNumber: 1237,
                                                                        columnNumber: 49
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-sm font-medium", theme === "dark" ? "text-gray-200" : "text-gray-800"),
                                                                        children: [
                                                                            entry.previousAsesor?.nombre || entry.previousAsesor?.name || "Sin Asesor",
                                                                            " → ",
                                                                            entry.newAsesor?.nombre || entry.newAsesor?.name || "Sin Asesor"
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                                        lineNumber: 1241,
                                                                        columnNumber: 49
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-xs", theme === "dark" ? "text-gray-400" : "text-gray-500"),
                                                                        children: [
                                                                            entry.changedBy?.nombre || entry.changedBy?.name || "Sistema",
                                                                            " - ",
                                                                            new Date(entry.changedAt).toLocaleString()
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                                        lineNumber: 1244,
                                                                        columnNumber: 49
                                                                    }, this)
                                                                ]
                                                            }, idx, true, {
                                                                fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                                lineNumber: 1236,
                                                                columnNumber: 45
                                                            }, this)),
                                                        (!audit.asesorHistory || audit.asesorHistory.length === 0) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-sm text-gray-500 pl-4",
                                                            children: "No hay historial de cambios de asesor"
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                            lineNumber: 1250,
                                                            columnNumber: 45
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                    lineNumber: 1234,
                                                    columnNumber: 37
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                            lineNumber: 1229,
                                            columnNumber: 33
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-sm font-semibold mb-3 flex items-center gap-2", theme === "dark" ? "text-white" : "text-gray-800"),
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$message$2d$square$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MessageSquare$3e$__["MessageSquare"], {
                                                            className: "w-4 h-4"
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                            lineNumber: 1258,
                                                            columnNumber: 41
                                                        }, this),
                                                        "Historial de Comentarios"
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                    lineNumber: 1257,
                                                    columnNumber: 37
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "space-y-3 pl-2 border-l-2 border-gray-200 dark:border-white/10",
                                                    children: [
                                                        audit.datosExtraHistory?.slice().reverse().map((entry, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "relative pl-4 pb-2",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2", theme === "dark" ? "bg-gray-900 border-green-500" : "bg-white border-green-500")
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                                        lineNumber: 1264,
                                                                        columnNumber: 49
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-sm font-medium", theme === "dark" ? "text-gray-200" : "text-gray-800"),
                                                                        children: entry.value
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                                        lineNumber: 1268,
                                                                        columnNumber: 49
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-xs", theme === "dark" ? "text-gray-400" : "text-gray-500"),
                                                                        children: [
                                                                            entry.updatedBy?.nombre || "Sistema",
                                                                            " - ",
                                                                            new Date(entry.updatedAt).toLocaleString()
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                                        lineNumber: 1271,
                                                                        columnNumber: 49
                                                                    }, this)
                                                                ]
                                                            }, idx, true, {
                                                                fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                                lineNumber: 1263,
                                                                columnNumber: 45
                                                            }, this)),
                                                        (!audit.datosExtraHistory || audit.datosExtraHistory.length === 0) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-sm text-gray-500 pl-4",
                                                            children: "No hay historial de comentarios"
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                            lineNumber: 1277,
                                                            columnNumber: 45
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                                    lineNumber: 1261,
                                                    columnNumber: 37
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                            lineNumber: 1256,
                                            columnNumber: 33
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                    lineNumber: 1200,
                                    columnNumber: 29
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                lineNumber: 788,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                        lineNumber: 763,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("px-6 py-4 border-t flex justify-end gap-3", theme === "dark" ? "border-white/10" : "border-gray-100"),
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: onClose,
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("px-4 py-2 rounded-lg text-sm font-medium transition-colors", theme === "dark" ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-600"),
                                children: "Cancelar"
                            }, void 0, false, {
                                fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                lineNumber: 1291,
                                columnNumber: 21
                            }, this),
                            !isReadOnly && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: handleSave,
                                disabled: loading,
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-2", loading ? "opacity-50 cursor-not-allowed" : "hover:opacity-90", "bg-purple-600"),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$save$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Save$3e$__["Save"], {
                                        className: "w-4 h-4"
                                    }, void 0, false, {
                                        fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                        lineNumber: 1311,
                                        columnNumber: 29
                                    }, this),
                                    loading ? "Guardando..." : "Guardar Cambios"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                                lineNumber: 1302,
                                columnNumber: 25
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                        lineNumber: 1287,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                lineNumber: 703,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$dashboard$2f$celebration$2d$animation$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CelebrationAnimation"], {
                isActive: showCelebration,
                onComplete: ()=>{
                    console.log("[AuditEditModal] Animación completada, guardando y cerrando...");
                    setShowCelebration(false);
                    // Llamar onSave con los datos guardados
                    if (pendingResponseRef.current) {
                        onSave(pendingResponseRef.current);
                        pendingResponseRef.current = null;
                    }
                    onClose();
                },
                duration: 3500
            }, void 0, false, {
                fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
                lineNumber: 1319,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/dashboard/audit-edit-modal.tsx",
        lineNumber: 702,
        columnNumber: 9
    }, this), document.body);
}
_s(AuditEditModal, "lhX9YpF+desehG/8K8EFeWJs0/M=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$dashboard$2f$theme$2d$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTheme"],
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"]
    ];
});
_c = AuditEditModal;
var _c;
__turbopack_context__.k.register(_c, "AuditEditModal");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=components_dashboard_audit-edit-modal_tsx_5b87233c._.js.map