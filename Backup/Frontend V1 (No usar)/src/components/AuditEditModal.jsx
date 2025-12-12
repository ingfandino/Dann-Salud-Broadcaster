// frontend/src/components/AuditEditModal.jsx

import React, { useState, useEffect, useMemo } from "react";
import apiClient from "../services/api";
import { toast } from "react-toastify";
import NotificationService from "../services/NotificationService";
import { useAuth } from "../context/AuthContext";
import confetti from "canvas-confetti";

const STATUS_OPTIONS = [
    "Mensaje enviado",
    "En videollamada",
    "Rechazada",
    "Falta documentación",
    "Falta clave",
    "Reprogramada",
    "Reprogramada (falta confirmar hora)",
    "Completa",
    "QR hecho",
    "Aprobada",
    "Aprobada, pero no reconoce clave",
    "No atendió",
    "Tiene dudas",
    "Falta clave y documentación",
    "No le llegan los mensajes",
    "Cortó",
    "Autovinculación",
    "Caída",
    "Pendiente",
    "Rehacer vídeo",
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
    "OSPERYH (106500)"
];
const OBRAS_VENDIDAS = ["Binimed", "Meplife", "TURF"];
const TIPO_VENTA = ["Alta", "Cambio"];

export default function AuditEditModal({ audit, onClose, onSave }) {
    const { user } = useAuth();

    // ✅ Guardar estado original para validar permisos de "Aprobada"
    const wasInCargadaStatus = audit.status === "Cargada";

    // Función para convertir UTC a hora local
    const getLocalDateTime = (utcDateString) => {
        if (!utcDateString) return { fecha: "", hora: "" };

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

    const normalizeTeamValue = (value) => {
        if (value === undefined || value === null) return "";
        return String(value).trim();
    };

    const deriveInitialNumeroEquipo = () => {
        const candidates = [
            audit?.asesor?.numeroEquipo,
            audit?.numeroEquipo,
            audit?.groupId?.numeroEquipo,
            audit?.grupo,
            audit?.groupId?.nombre,
            audit?.groupId?.name,
        ];
        for (const candidate of candidates) {
            const normalized = normalizeTeamValue(candidate);
            if (normalized.length) return normalized;
        }
        return "";
    };

    const deriveInitialGrupoLabel = () => {
        const candidates = [
            audit?.groupId?.nombre,
            audit?.groupId?.name,
            audit?.grupo,
            audit?.numeroEquipo
        ];
        for (const candidate of candidates) {
            const normalized = normalizeTeamValue(candidate);
            if (normalized.length) return normalized;
        }
        const fallback = deriveInitialNumeroEquipo();
        return fallback;
    };

    const initialNumeroEquipo = deriveInitialNumeroEquipo();
    const initialGrupoLabel = deriveInitialGrupoLabel();

    const [form, setForm] = useState({
        nombre: audit.nombre || "",
        cuil: audit.cuil || "",
        telefono: audit.telefono || "",
        obraSocialAnterior: audit.obraSocialAnterior || "",
        obraSocialVendida: audit.obraSocialVendida || "",
        status: audit.status || "",
        tipoVenta: audit.tipoVenta || "alta",
        asesor: audit.asesor?._id || audit.asesor || "",
        grupo: initialGrupoLabel,
        grupoId: typeof audit.groupId === 'object' ? audit.groupId?._id : null,
        numeroEquipo: initialNumeroEquipo,
        auditor: audit.auditor?._id || audit.auditor || "",
        administrador: audit.administrador?._id || audit.administrador || "", // ✅
        fecha: localSchedule.fecha,
        hora: localSchedule.hora,
        datosExtra: audit.datosExtra || "",
        isRecuperada: audit.isRecuperada || false, // ✅ Campo recuperada
    });

    const [loading, setLoading] = useState(false);
    const [reprogramar, setReprogramar] = useState(false);
    const [asesores, setAsesores] = useState([]);
    const [grupos, setGrupos] = useState([]);

    // Guardar fecha y hora originales (en hora local)
    const originalSchedule = {
        fecha: localSchedule.fecha,
        hora: localSchedule.hora
    };

    const [auditores, setAuditores] = useState([]);
    const [administradores, setAdministradores] = useState([]); // ✅
    const [availableSlots, setAvailableSlots] = useState([]);
    const [loadingSlots, setLoadingSlots] = useState(false);

    const [datosExtraHistory, setDatosExtraHistory] = useState(audit.datosExtraHistory || []);
    const [statusHistory, setStatusHistory] = useState(audit.statusHistory || []);

    useEffect(() => {
        setDatosExtraHistory(audit.datosExtraHistory || []);
        setStatusHistory(audit.statusHistory || []);
    }, [audit]);

    const sortedDatosExtraHistory = useMemo(() => {
        return [...(datosExtraHistory || [])]
            .filter((entry) => entry && (entry.value || '').trim().length)
            .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    }, [datosExtraHistory]);

    const sortedStatusHistory = useMemo(() => {
        return [...(statusHistory || [])]
            .filter((entry) => entry && (entry.value || '').trim().length)
            .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    }, [statusHistory]);

    const currentUserRole = user?.role?.toLowerCase();

    const targetNumeroEquipo = useMemo(() => {
        // ✅ CORRECCIÓN: Priorizar form.numeroEquipo (valor actualizado) sobre audit original
        // Esto permite que el dropdown de Asesor se actualice cuando se cambia el Grupo
        const candidates = [
            form.numeroEquipo,  // ✅ PRIMERO: valor actualizado del formulario
            audit?.asesor?.numeroEquipo,  // Valor original del asesor
            initialNumeroEquipo,
            audit?.numeroEquipo,
            audit?.grupo,
        ];
        console.log('🔍 [DEBUG] targetNumeroEquipo candidates:', candidates);
        for (const candidate of candidates) {
            const normalized = normalizeTeamValue(candidate);
            if (normalized.length) {
                console.log('🔍 [DEBUG] targetNumeroEquipo selected:', normalized);
                return normalized;
            }
        }
        console.log('🔍 [DEBUG] targetNumeroEquipo: EMPTY');
        return "";
    }, [
        form.numeroEquipo,  // ✅ Dependencia principal
        audit?.asesor?.numeroEquipo,
        initialNumeroEquipo,
        audit?.numeroEquipo,
        audit?.grupo
    ]);
    const currentUserNumeroEquipo = normalizeTeamValue(user?.numeroEquipo);
    const isSupervisorRole = currentUserRole === 'supervisor' || currentUserRole === 'supervisor_reventa';
    const supervisorPuedeEditarAsesor = isSupervisorRole
        && currentUserNumeroEquipo.length > 0
        && targetNumeroEquipo.length > 0
        && currentUserNumeroEquipo === targetNumeroEquipo;

    console.log('🔍 [DEBUG] currentUserRole:', currentUserRole);
    console.log('🔍 [DEBUG] currentUserNumeroEquipo:', currentUserNumeroEquipo);
    console.log('🔍 [DEBUG] targetNumeroEquipo:', targetNumeroEquipo);
    console.log('🔍 [DEBUG] isSupervisorRole:', isSupervisorRole);
    console.log('🔍 [DEBUG] supervisorPuedeEditarAsesor:', supervisorPuedeEditarAsesor);

    const formatHistoryTimestamp = (value) => {
        if (!value) return "-";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "-";
        const formattedDate = date.toLocaleDateString("es-AR");
        const formattedTime = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
        return `${formattedDate} ${formattedTime}`;
    };

    useEffect(() => {
        if (form.fecha) fetchAvailableSlots(form.fecha);
    }, [form.fecha]);

    async function fetchAvailableSlots(date) {
        setLoadingSlots(true);
        try {
            const res = await apiClient.get(`/audits/available-slots?date=${date}`);
            setAvailableSlots(res.data || []);
        } catch (err) {
            console.error(err);
            toast.error("No se pudieron cargar los turnos disponibles");
        } finally {
            setLoadingSlots(false);
        }
    }

    function generateTimeOptions() {
        const options = [];
        const start = new Date();
        start.setHours(9, 20, 0, 0);
        const end = new Date();
        end.setHours(23, 0, 0, 0); // ✅ Extendido hasta las 23:00
        let cur = new Date(start);
        while (cur <= end) {
            const hh = String(cur.getHours()).padStart(2, "0");
            const mm = String(cur.getMinutes()).padStart(2, "0");
            options.push(`${hh}:${mm}`);
            cur.setMinutes(cur.getMinutes() + 20);
        }
        return options;
    }

    function getEnabledTimeOptions() {
        const all = generateTimeOptions();
        const map = {};
        (availableSlots || []).forEach((s) => { map[s.time] = s.count; });
        // Límite: 10 auditorías por turno (se bloquea al llegar a 10)
        return all.map((t) => ({ time: t, disabled: (map[t] || 0) >= 10 }));
    }
    const timeOptions = getEnabledTimeOptions();

    // Filtrar estados disponibles según el rol del usuario
    const getAvailableStatuses = () => {
        const userRole = user?.role?.toLowerCase();

        // ✅ Estados exclusivos para Admin y Gerencia (Item 12)
        const adminOnlyStatuses = [
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
            "Falta clave y documentación"
        ];

        // ✅ Estados para Auditor y Supervisor (Item 13)
        const auditorSupervisorStatuses = [
            "Mensaje enviado",
            "En videollamada",
            "Rechazada",
            "Falta documentación",
            "Falta clave",
            "Reprogramada",
            "Reprogramada (falta confirmar hora)",
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

        // Gerencia tiene acceso a TODOS los estados (Item 13)
        if (userRole === 'gerencia') {
            return STATUS_OPTIONS;
        }

        // Admin ve sus estados específicos (Item 12)
        if (userRole === 'admin') {
            return adminOnlyStatuses;
        }

        // Auditor y Supervisor ven sus estados específicos (Item 13)
        if (userRole === 'auditor' || userRole === 'supervisor') {
            return auditorSupervisorStatuses;
        }

        // Asesor no debería editar, pero si pudiera, retornamos vacío o default
        return [];
    };

    const availableStatuses = getAvailableStatuses();

    // Restaurar fecha y hora originales cuando se desactiva reprogramar
    // ✅ Cuando se activa reprogramar, cambiar automáticamente el estado a "Reprogramada"
    useEffect(() => {
        if (reprogramar) {
            setForm(prev => ({
                ...prev,
                status: "Reprogramada"
            }));
        } else {
            setForm(prev => ({
                ...prev,
                fecha: originalSchedule.fecha,
                hora: originalSchedule.hora,
                // Si el estado actual es "Reprogramada", limpiarlo al desmarcar
                status: prev.status === "Reprogramada" ? audit.status || "" : prev.status
            }));
        }
    }, [reprogramar]);

    useEffect(() => {
        const fetchAuditores = async () => {
            try {
                // ✅ VOLVER A FILTRAR: Solo Gerencia, Auditor y Supervisor (sin Admin)
                const { data } = await apiClient.get("/users?includeAllAuditors=true");
                const filtered = data.filter(u => {
                    const role = u.role?.toLowerCase();
                    const isActive = u?.active !== false;
                    const hasName = u.nombre && u.nombre.trim().length > 0;
                    return isActive && hasName && (role === 'auditor' || role === 'gerencia' || role === 'supervisor');
                });
                setAuditores(filtered);
            } catch (err) {
                console.error("Error al cargar auditores", err);
                toast.error("No se pudieron cargar los auditores");
            }
        };

        // ✅ Nuevo: Cargar administradores (solo rol Admin)
        const fetchAdministradores = async () => {
            try {
                const { data } = await apiClient.get("/users");
                const filtered = data.filter(u => {
                    const role = u.role?.toLowerCase();
                    const isActive = u?.active !== false;
                    const hasName = u.nombre && u.nombre.trim().length > 0;
                    return isActive && hasName && role === 'admin';
                });
                setAdministradores(filtered);
            } catch (err) {
                console.error("Error al cargar administradores", err);
                toast.error("No se pudieron cargar los administradores");
            }
        };

        const fetchGrupos = async () => {
            try {
                const { data } = await apiClient.get("/groups");
                setGrupos(data || []);
            } catch (err) {
                console.error("Error al cargar grupos", err);
                toast.error("No se pudieron cargar los grupos");
            }
        };

        fetchAuditores();
        fetchAdministradores(); // ✅
        fetchGrupos();
    }, []);

    // ✅ CORRECCIÓN: Extraer fetchAsesores para poder llamarlo desde handleChange
    const fetchAsesores = async (overrideNumeroEquipo = null) => {
        const numeroEquipoToUse = overrideNumeroEquipo || targetNumeroEquipo;
        console.log('🔍 [DEBUG] fetchAsesores called with numeroEquipo:', numeroEquipoToUse);
        if (!numeroEquipoToUse) {
            console.log('🔍 [DEBUG] numeroEquipo is empty, clearing asesores');
            setAsesores([]);
            return;
        }
        try {
            const { data } = await apiClient.get("/users");
            console.log('🔍 [DEBUG] Total users fetched:', data.length);

            // ✅ Filtrar asesores, auditores Y supervisores del grupo
            let filtered = data.filter(u => {
                const role = u.role?.toLowerCase();
                const isActive = u?.active !== false;
                const hasName = u.nombre && u.nombre.trim().length > 0;
                if (!isActive || !hasName) return false;
                // ✅ Incluir asesor, auditor Y supervisor
                if (role !== 'asesor' && role !== 'auditor' && role !== 'supervisor') return false;

                // ✅ Usar numeroEquipo directamente del usuario
                const userNumeroEquipo = normalizeTeamValue(u.numeroEquipo);
                console.log(`🔍 [DEBUG] User ${u.nombre} (${role}): numeroEquipo="${userNumeroEquipo}" vs target="${numeroEquipoToUse}"`);

                if (!userNumeroEquipo.length) return false;
                return userNumeroEquipo === numeroEquipoToUse;
            });

            console.log('🔍 [DEBUG] Filtered asesores/auditores:', filtered.length, filtered.map(u => u.nombre));

            if (form.asesor) {
                const alreadyIncluded = filtered.some(u => u._id === form.asesor);
                if (!alreadyIncluded) {
                    const assignedUser = data.find(u => u._id === form.asesor);
                    if (assignedUser) {
                        console.log('🔍 [DEBUG] Adding currently assigned asesor:', assignedUser.nombre);
                        filtered = [...filtered, assignedUser];
                    }
                }
            }

            const uniqueSorted = filtered
                .reduce((acc, user) => {
                    if (!user || !user._id) return acc;
                    if (acc.map.has(user._id)) return acc;
                    acc.map.set(user._id, true);
                    acc.items.push(user);
                    return acc;
                }, { map: new Map(), items: [] })
                .items
                .sort((a, b) => (a.nombre || a.email || "").localeCompare(b.nombre || b.email || ""));

            console.log('🔍 [DEBUG] Final asesores list:', uniqueSorted.length, uniqueSorted.map(u => u.nombre));
            setAsesores(uniqueSorted);
        } catch (err) {
            console.error("Error al cargar asesores", err);
            toast.error("No se pudieron cargar los asesores");
        }
    };

    useEffect(() => {
        fetchAsesores();
    }, [targetNumeroEquipo, form.asesor]);

    const validate = () => {
        if (!form.nombre.trim()) return "Nombre es requerido";
        if (!/^\d{11}$/.test(form.cuil)) return "CUIL debe tener exactamente 11 dígitos";
        if (form.telefono && !/^\d{10}$/.test(form.telefono.replace(/\D/g, '')))
            return "Teléfono debe tener 10 dígitos";

        // ✅ Validación específica para estado "Reprogramada"
        if (form.status === "Reprogramada") {
            // Debe tener el checkbox marcado
            if (!reprogramar) {
                return 'Debe marcar el check "Reprogramar turno" para poder seleccionar este estado';
            }
            // Verificar que se haya cambiado la hora
            if (form.fecha === originalSchedule.fecha && form.hora === originalSchedule.hora) {
                return "Para reprogramar debe cambiar al menos la hora del turno, o desmarque el check 'Reprogramar'";
            }
        }

        // ✅ PRIVILEGIO ESPECIAL: Gerencia puede editar turnos de cualquier fecha sin restricciones
        const isGerencia = user?.role?.toLowerCase() === 'gerencia';

        if (reprogramar && form.fecha && form.hora && !isGerencia) {
            // Solo aplicar restricción de tiempo para roles que NO sean Gerencia
            const now = new Date();
            const selected = new Date(`${form.fecha}T${form.hora}:00`);
            // ✅ Tolerancia de 20 minutos: permite reprogramar si no han pasado más de 20 min desde el turno
            const twentyMinutesAgo = new Date(now.getTime() - 20 * 60 * 1000);
            if (selected < twentyMinutesAgo) {
                return "No se puede asignar un turno de hace más de 20 minutos";
            }
        }
        // ✅ Validación de eliminación de Auditor (Item 16)
        const auditorOriginal = audit.auditor?._id || audit.auditor;
        if (auditorOriginal && form.auditor !== auditorOriginal) {
            // Se está intentando cambiar o quitar el auditor
            const esGerencia = user?.role?.toLowerCase() === 'gerencia';
            const esElMismoAuditor = user?._id === auditorOriginal;
            // Verificar si es supervisor del grupo
            // Necesitamos saber el supervisor del grupo de la venta.
            // audit.asesor.supervisor o audit.groupId...
            // Aproximación: si el usuario es supervisor y su numeroEquipo coincide con el de la venta
            const esSupervisorDelGrupo = user?.role?.toLowerCase() === 'supervisor' &&
                normalizeTeamValue(user?.numeroEquipo) === normalizeTeamValue(initialNumeroEquipo);

            if (!esGerencia && !esElMismoAuditor && !esSupervisorDelGrupo) {
                return "No tiene permiso para quitar o cambiar el auditor asignado.";
            }
        }

        // ✅ Validación de eliminación de Administrador (Item 17)
        const adminOriginal = audit.administrador?._id || audit.administrador;
        if (adminOriginal && form.administrador !== adminOriginal) {
            const esGerencia = user?.role?.toLowerCase() === 'gerencia';
            const esElMismoAdmin = user?._id === adminOriginal;

            if (!esGerencia && !esElMismoAdmin) {
                return "No tiene permiso para quitar o cambiar el administrador asignado.";
            }
        }

        return null;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        // Validar si intentan seleccionar "Reprogramada" sin el checkbox
        if (name === 'status' && value === 'Reprogramada' && !reprogramar) {
            toast.error('Debe marcar el check "Reprogramar turno" para poder seleccionar este estado');
            return; // No actualizar el estado
        }

        // Si cambia el grupo, actualizar numeroEquipo y resetear asesor
        if (name === 'grupo') {
            const grupoSeleccionado = grupos.find(g => (g.nombre || g.name || g.numeroEquipo) === value);
            const nuevoNumeroEquipo = (() => {
                if (grupoSeleccionado?.numeroEquipo !== undefined && grupoSeleccionado?.numeroEquipo !== null) {
                    return String(grupoSeleccionado.numeroEquipo).trim();
                }
                if (grupoSeleccionado?.nombre) return String(grupoSeleccionado.nombre).trim();
                if (grupoSeleccionado?.name) return String(grupoSeleccionado.name).trim();
                return String(value).trim();
            })();

            setForm((p) => ({
                ...p,
                grupo: value,
                numeroEquipo: nuevoNumeroEquipo,
                grupoId: grupoSeleccionado?._id || "",
                asesor: "" // Resetear asesor cuando cambia el grupo
            }));

            // ✅ CORRECCIÓN: Llamar fetchAsesores inmediatamente con el nuevo numeroEquipo
            console.log('🔍 [DEBUG] Grupo changed, fetching asesores for:', nuevoNumeroEquipo);
            fetchAsesores(nuevoNumeroEquipo);
        } else {
            setForm((p) => ({ ...p, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const err = validate();
        if (err) { toast.error(err); return; }

        setLoading(true);
        try {
            const payload = {
                nombre: form.nombre?.trim() || "",
                cuil: form.cuil?.trim() || "",
                telefono: form.telefono?.trim() || "",
                tipoVenta: form.tipoVenta?.toLowerCase() || "alta",
                obraSocialAnterior: form.obraSocialAnterior || "",
                obraSocialVendida: form.obraSocialVendida || "",
                scheduledAt: reprogramar && form.fecha && form.hora ? `${form.fecha}T${form.hora}:00` : audit.scheduledAt,
                datosExtra: form.datosExtra?.trim() || "",
                isRecuperada: form.isRecuperada || false // ✅ Campo recuperada
            };

            // Solo incluir status si tiene un valor válido
            if (form.status && form.status !== "Seleccione") {
                payload.status = form.status;
            }

            // Manejar el campo auditor (permitir desasignar con "Seleccione")
            if (form.auditor === "" || form.auditor === "Seleccione") {
                payload.auditor = null; // Desasignar auditor explícitamente
            } else if (form.auditor) {
                payload.auditor = form.auditor; // Asignar/cambiar auditor
            }
            // Si no se especifica, no se modifica (mantiene valor actual)

            // ✅ Manejar el campo administrador (misma lógica que auditor)
            if (form.administrador === "" || form.administrador === "Seleccione") {
                payload.administrador = null; // Desasignar administrador explícitamente
            } else if (form.administrador) {
                payload.administrador = form.administrador; // Asignar/cambiar administrador
            }
            // Si no se especifica, no se modifica (mantiene valor actual)

            // Gerencia y supervisores autorizados pueden ajustar el asesor
            const puedeCambiarAsesor = currentUserRole === 'gerencia' || supervisorPuedeEditarAsesor;
            if (puedeCambiarAsesor) {
                if (form.asesor) {
                    payload.asesor = form.asesor;
                }
                if (currentUserRole === 'gerencia' && form.grupoId && /^[0-9a-fA-F]{24}$/.test(form.grupoId)) {
                    payload.groupId = form.grupoId;
                }
            }

            const { data: updatedAudit } = await apiClient.patch(`/audits/${audit._id}`, payload);

            // 🎉 Animación de confetti si el estado cambió a "Completa"
            if (form.status === "Completa" && audit.status !== "Completa") {
                // Confetti explosión desde el centro
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 }
                });

                // Confetti desde los lados
                setTimeout(() => {
                    confetti({
                        particleCount: 100,
                        angle: 60,
                        spread: 55,
                        origin: { x: 0 }
                    });
                }, 200);

                setTimeout(() => {
                    confetti({
                        particleCount: 100,
                        angle: 120,
                        spread: 55,
                        origin: { x: 1 }
                    });
                }, 400);
            }

            toast.success("Auditoría actualizada");
            NotificationService.success("Una auditoría fue editada correctamente");

            if (updatedAudit?.datosExtraHistory) {
                setDatosExtraHistory(updatedAudit.datosExtraHistory);
            }
            if (updatedAudit?.statusHistory) {
                setStatusHistory(updatedAudit.statusHistory);
            }

            // Esperar a que onSave complete antes de cerrar el modal
            if (onSave) {
                await onSave();
            }
            onClose();
        } catch (err) {
            console.error("Error al actualizar auditoría:", err);
            console.error("Error response data:", err.response?.data);

            // Intentar extraer el mensaje de error de diferentes ubicaciones
            let errorMsg = "No se pudo actualizar la auditoría";

            if (err.response?.data) {
                const data = err.response.data;
                // Intentar diferentes estructuras de error
                if (data.message) {
                    errorMsg = data.message;
                } else if (data.error?.message) {
                    errorMsg = data.error.message;
                } else if (data.error && typeof data.error === 'string') {
                    errorMsg = data.error;
                } else if (typeof data === 'string') {
                    errorMsg = data;
                }
            } else if (err.message) {
                errorMsg = err.message;
            }

            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50 p-0 md:p-4">
            <div className="modal-responsive bg-white md:rounded-lg shadow-lg w-full md:max-w-2xl max-h-screen md:max-h-[90vh] overflow-y-auto p-4 md:p-6">
                <div className="flex justify-between items-center mb-4 sticky top-0 bg-white pb-2 border-b md:border-0">
                    <h2 className="text-xl md:text-lg font-semibold">Editar Auditoría</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="md:hidden text-gray-500 hover:text-gray-700 p-2 touch-manipulation"
                        aria-label="Cerrar"
                    >
                        ✕
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4 md:space-y-3">
                    {/* Item 14: Bloquear todo para Asesor */}
                    <fieldset disabled={currentUserRole === 'asesor'} className="contents">
                        <div>
                            <label className="block text-sm md:text-sm font-medium mb-1">Afiliado</label>
                            <input
                                name="nombre"
                                value={form.nombre}
                                onChange={handleChange}
                                className="border rounded p-3 md:p-2 w-full text-base md:text-sm touch-manipulation"
                            />
                        </div>
                        <div>
                            <label className="block text-sm md:text-sm font-medium mb-1">Teléfono</label>
                            <input
                                name="telefono"
                                value={form.telefono || ""}
                                onChange={handleChange}
                                className="border rounded p-3 md:p-2 w-full text-base md:text-sm touch-manipulation"
                                type="tel"
                            />
                        </div>

                        <div>
                            <label className="block text-sm md:text-sm font-medium mb-1">CUIL</label>
                            <input
                                name="cuil"
                                value={form.cuil}
                                onChange={handleChange}
                                className="border rounded p-3 md:p-2 w-full text-base md:text-sm touch-manipulation"
                                inputMode="numeric"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-2">
                            <div>
                                <label className="block text-sm font-medium mb-1">Obra Social Anterior</label>
                                <select
                                    name="obraSocialAnterior"
                                    value={form.obraSocialAnterior}
                                    onChange={handleChange}
                                    className="border rounded p-3 md:p-2 w-full text-base md:text-sm touch-manipulation"
                                >
                                    <option value="">-- Seleccionar --</option>
                                    {ARGENTINE_OBRAS_SOCIALES.map((o) => (
                                        <option key={o} value={o}>{o}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Obra Social Vendida</label>
                                <select
                                    name="obraSocialVendida"
                                    value={form.obraSocialVendida}
                                    onChange={handleChange}
                                    className="border rounded p-3 md:p-2 w-full text-base md:text-sm touch-manipulation"
                                >
                                    {OBRAS_VENDIDAS.map((o) => (
                                        <option key={o} value={o}>{o}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-2">
                            <div>
                                <label className="block text-sm font-medium mb-1">Estado</label>
                                <select
                                    name="status"
                                    value={form.status}
                                    onChange={handleChange}
                                    className="border rounded p-3 md:p-2 w-full text-base md:text-sm touch-manipulation"
                                >
                                    <option value="">Seleccione</option>
                                    {availableStatuses.map((o) => {
                                        // Deshabilitar "Reprogramada" si no está marcado el checkbox
                                        const isReprogramadaDisabled = o === "Reprogramada" && !reprogramar;

                                        // Deshabilitar "Aprobada" y "Aprobada, pero no reconoce clave" si NO estuvo en "Cargada"
                                        const isAprobadaDisabled = [
                                            "Aprobada",
                                            "Aprobada, pero no reconoce clave"
                                        ].includes(o) && !wasInCargadaStatus;

                                        const disabled = isReprogramadaDisabled || isAprobadaDisabled;

                                        return (
                                            <option key={o} value={o} disabled={disabled}>
                                                {o}{disabled ? " (bloqueado)" : ""}
                                            </option>
                                        );
                                    })}
                                </select>
                                <div className="mt-3">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Historial de estado</h4>
                                    {sortedStatusHistory.length === 0 ? (
                                        <p className="text-xs text-gray-500">Aún no hay registros previos.</p>
                                    ) : (
                                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                                            <table className="w-full text-xs">
                                                <thead className="bg-gray-100 text-gray-600 uppercase">
                                                    <tr>
                                                        <th className="px-2 py-1 text-left">Fecha</th>
                                                        <th className="px-2 py-1 text-left">Usuario</th>
                                                        <th className="px-2 py-1 text-left">Estado</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {sortedStatusHistory.map((entry, idx) => {
                                                        const user = entry.updatedBy || {};
                                                        const userLabel = user.nombre || user.name || user.username || user.email || "Usuario";
                                                        return (
                                                            <tr key={`${entry._id || idx}-${entry.updatedAt || idx}`} className="border-t border-gray-200">
                                                                <td className="px-2 py-1 align-top text-gray-600">{formatHistoryTimestamp(entry.updatedAt)}</td>
                                                                <td className="px-2 py-1 align-top text-gray-700">{userLabel}</td>
                                                                <td className="px-2 py-1 align-top text-gray-800 whitespace-pre-wrap">{entry.value || "-"}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Tipo</label>
                                <select
                                    name="tipoVenta"
                                    value={form.tipoVenta}
                                    onChange={handleChange}
                                    className="border rounded p-3 md:p-2 w-full text-base md:text-sm touch-manipulation"
                                >
                                    {TIPO_VENTA.map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-2">
                            <div>
                                <label className="block text-sm font-medium mb-1">Asesor</label>
                                <label className="block text-sm font-medium mb-1">Asesor</label>
                                {/* Item 6: Solo Gerencia puede editar Asesor */}
                                {(currentUserRole === 'gerencia') ? (
                                    <select
                                        name="asesor"
                                        value={form.asesor}
                                        onChange={handleChange}
                                        className="border rounded p-3 md:p-2 w-full text-base md:text-sm touch-manipulation"
                                    >
                                        <option value="">Seleccione</option>
                                        {asesores.map((u) => (
                                            <option key={u._id} value={u._id}>
                                                {u.nombre || u.email || u.name}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        name="asesor"
                                        value={audit.asesor?.nombre || audit.asesor || ""}
                                        readOnly
                                        className="border rounded p-3 md:p-2 w-full bg-gray-100 cursor-not-allowed text-base md:text-sm"
                                    />
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Grupo</label>
                                {user?.role?.toLowerCase() === 'gerencia' ? (
                                    <select
                                        name="grupo"
                                        value={form.grupo}
                                        onChange={handleChange}
                                        className="border rounded p-3 md:p-2 w-full text-base md:text-sm touch-manipulation"
                                    >
                                        <option value="">Seleccione</option>
                                        {grupos.map((g) => (
                                            <option key={g._id} value={g.nombre || g.name}>
                                                {g.nombre || g.name}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        name="grupo"
                                        value={form.grupo}
                                        readOnly
                                        className="border rounded p-3 md:p-2 w-full bg-gray-100 cursor-not-allowed text-base md:text-sm"
                                    />
                                )}
                            </div>
                            {/* ✅ Campo Auditor: Solo Gerencia/Auditor/Supervisor */}
                            <div>
                                <label className="block text-sm font-medium">Auditor</label>
                                {(() => {
                                    const isGerencia = user?.role?.toLowerCase() === 'gerencia';
                                    const auditorAsignado = audit.auditor?._id || audit.auditor;
                                    const esElMismoAuditor = auditorAsignado && auditorAsignado === user?._id;
                                    const puedeModificar = reprogramar || !auditorAsignado || isGerencia || esElMismoAuditor;

                                    return (
                                        <>
                                            <select
                                                name="auditor"
                                                value={form.auditor}
                                                onChange={handleChange}
                                                className={`border rounded p-2 w-full ${!puedeModificar ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                                disabled={!puedeModificar}
                                            >
                                                <option value="">Seleccione</option>
                                                {auditores.map((u) => (
                                                    <option key={u._id} value={u._id}>
                                                        {u.nombre || u.email || u.name} ({u.role})
                                                    </option>
                                                ))}
                                            </select>
                                            {!puedeModificar && (
                                                <p className="text-xs text-red-600 mt-1">
                                                    🔒 Solo el auditor asignado o Gerencia pueden modificar este campo.
                                                </p>
                                            )}
                                            {reprogramar && auditorAsignado && !isGerencia && !esElMismoAuditor && (
                                                <p className="text-xs text-blue-600 mt-1">
                                                    🔄 Reprogramar habilita la reasignación de auditor.
                                                </p>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>

                            {/* ✅ Campo Administrador: misma lógica que Auditor */}
                            <div>
                                <label className="block text-sm font-medium">Administrador</label>
                                {(() => {
                                    const isGerencia = user?.role?.toLowerCase() === 'gerencia';
                                    const isAdmin = user?.role?.toLowerCase() === 'admin';
                                    const administradorAsignado = audit.administrador?._id || audit.administrador;
                                    const esElMismoAdministrador = administradorAsignado && administradorAsignado === user?._id;
                                    // Item 7: Bloqueado para todos menos admin o gerencia (o el mismo asignado para quitarse)
                                    const puedeModificar = isGerencia || isAdmin || esElMismoAdministrador;

                                    return (
                                        <>
                                            <select
                                                name="administrador"
                                                value={form.administrador}
                                                onChange={handleChange}
                                                className={`border rounded p-2 w-full ${!puedeModificar ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                                disabled={!puedeModificar}
                                            >
                                                <option value="">Seleccione</option>
                                                {administradores.map((u) => (
                                                    <option key={u._id} value={u._id}>
                                                        {u.nombre || u.email || u.name}
                                                    </option>
                                                ))}
                                            </select>
                                            {!puedeModificar && (
                                                <p className="text-xs text-red-600 mt-1">
                                                    🔒 Solo el administrador asignado o Gerencia pueden modificar este campo
                                                </p>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-sm font-medium">Fecha (día)</label>
                                <input
                                    type="date"
                                    min={user?.role?.toLowerCase() === 'gerencia' ? '2020-01-01' : new Date().toISOString().split("T")[0]}
                                    value={form.fecha}
                                    onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                                    className={`border rounded p-2 w-full ${!reprogramar ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                    disabled={!reprogramar}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Hora (turno)</label>
                                <select
                                    value={form.hora}
                                    onChange={(e) => setForm({ ...form, hora: e.target.value })}
                                    className={`border rounded p-2 w-full ${!reprogramar ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                    disabled={!reprogramar}
                                >
                                    <option value="">-- Seleccionar --</option>
                                    {loadingSlots ? (
                                        <option>cargando...</option>
                                    ) : (
                                        timeOptions.map((t) => (
                                            <option key={t.time} value={t.time} disabled={t.disabled}>
                                                {t.time}{t.disabled ? " (completo)" : ""}
                                            </option>
                                        ))
                                    )}
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                            <input
                                id="chk-reprogramar"
                                type="checkbox"
                                checked={reprogramar}
                                onChange={(e) => setReprogramar(e.target.checked)}
                                className="h-5 w-5 md:h-4 md:w-4 touch-manipulation"
                            />
                            <label htmlFor="chk-reprogramar" className="text-base md:text-sm cursor-pointer select-none">Reprogramar turno (habilita edición de fecha y hora)</label>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Datos extra</label>
                            <textarea
                                name="datosExtra"
                                value={form.datosExtra}
                                onChange={handleChange}
                                placeholder="Ejemplo: Afiliado con familiares, enfermedad preexistente, observaciones..."
                                className="border rounded p-3 md:p-2 w-full min-h-[90px] md:min-h-[70px] text-base md:text-sm touch-manipulation"
                            />
                            <div className="mt-3">
                                <h4 className="text-sm font-semibold text-gray-700 mb-2">Historial de comentarios</h4>
                                {sortedDatosExtraHistory.length === 0 ? (
                                    <p className="text-xs text-gray-500">Aún no hay registros previos.</p>
                                ) : (
                                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                                        <table className="w-full text-xs">
                                            <thead className="bg-gray-100 text-gray-600 uppercase">
                                                <tr>
                                                    <th className="px-2 py-1 text-left">Fecha</th>
                                                    <th className="px-2 py-1 text-left">Usuario</th>
                                                    <th className="px-2 py-1 text-left">Comentario</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sortedDatosExtraHistory.map((entry, idx) => {
                                                    const user = entry.updatedBy || {};
                                                    const userLabel = user.nombre || user.name || user.username || user.email || "Usuario";
                                                    return (
                                                        <tr key={`${entry._id || idx}-${entry.updatedAt || idx}`} className="border-t border-gray-200">
                                                            <td className="px-2 py-1 align-top text-gray-600">{formatHistoryTimestamp(entry.updatedAt)}</td>
                                                            <td className="px-2 py-1 align-top text-gray-700">{userLabel}</td>
                                                            <td className="px-2 py-1 align-top text-gray-800 whitespace-pre-wrap">{entry.value || "-"}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Campo ¿Recuperada? - Solo Gerencia puede marcar */}
                        <div className="flex items-center justify-between border-t pt-3 border-gray-200">
                            <label className="text-sm font-medium text-gray-700">¿Recuperada?</label>
                            <label className="flex items-center cursor-pointer gap-2">
                                <input
                                    type="checkbox"
                                    checked={form.isRecuperada || false}
                                    disabled={user?.role?.toLowerCase() !== 'gerencia'}
                                    onChange={(e) => {
                                        if (user?.role?.toLowerCase() === 'gerencia') {
                                            setForm({ ...form, isRecuperada: e.target.checked });
                                        }
                                    }}
                                    className={`w-5 h-5 rounded ${user?.role?.toLowerCase() === 'gerencia' ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                                />
                                <span className={`font-medium text-sm ${form.isRecuperada ? 'text-green-600' : 'text-gray-400'}`}>
                                    {form.isRecuperada ? 'Sí' : 'No'}
                                </span>
                                {user?.role?.toLowerCase() !== 'gerencia' && (
                                    <span className="text-xs text-gray-500 italic">(solo Gerencia)</span>
                                )}
                            </label>
                        </div>

                        <div className="flex flex-col md:flex-row justify-end gap-3 md:gap-2 pt-4 sticky bottom-0 bg-white pb-2 border-t md:border-0">
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full md:w-auto px-4 py-3 md:py-2 rounded bg-gray-300 hover:bg-gray-400 text-base md:text-sm font-medium touch-manipulation"
                                disabled={loading}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="w-full md:w-auto px-4 py-3 md:py-2 rounded bg-blue-600 text-white hover:bg-blue-700 text-base md:text-sm font-medium touch-manipulation"
                                disabled={loading}
                            >
                                {loading ? "Guardando..." : "💾 Guardar"}
                            </button>
                        </div>
                    </fieldset>
                </form>
            </div>
        </div>
    );
}