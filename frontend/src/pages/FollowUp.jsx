// frontend/src/pages/FollowUp.jsx

import React, { useEffect, useState } from "react";
import apiClient from "../services/api";
import { toast } from "react-toastify";
import AuditEditModal from "../components/AuditEditModal";
import * as XLSX from "xlsx";
import { Pencil, Eye, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import socket from "../services/socket"; // ✅ Socket para actualizaciones en tiempo real

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
    "OSPIP (116006)"
];
const OBRAS_VENDIDAS = ["Binimed", "Meplife", "TURF"];
const STATUS_OPTIONS = [
    "Mensaje enviado", "En videollamada", "Rechazada",
    "Falta documentación", "Falta clave", "Reprogramada",
    "Reprogramada (falta confirmar hora)", "Completa", "QR hecho", "Aprobada",
    "No atendió", "Tiene dudas", "Falta clave y documentación",
    "No le llegan los mensajes", "Cortó", "Autovinculación", "Caída", "Pendiente", "Rehacer vídeo",
    "Cargada"
];

const TIPO_VENTA = ["Alta", "Cambio"];

export default function FollowUp() {
    const { currentUser } = useAuth();

    const toTitleCase = (s) => {
        if (!s || typeof s !== "string") return s || "";
        return s
            .toLowerCase()
            .replace(/\s+/g, " ")
            .trim()
            .split(" ")
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");
    };

    // Estados para modal de Turnos Disponibles
    const [showSlotsModal, setShowSlotsModal] = useState(false);
    const [availableSlots, setAvailableSlots] = useState([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    // Estados para modal de Estadísticas de Venta
    const [showStatsModal, setShowStatsModal] = useState(false);
    const [salesStats, setSalesStats] = useState([]);
    const [loadingStats, setLoadingStats] = useState(false);
    const [statsDate, setStatsDate] = useState(new Date().toISOString().split('T')[0]);

    const getObraVendidaClass = (obra) => {
        const v = (obra || '').toLowerCase();
        if (v === 'binimed') return 'bg-blue-100 text-blue-800';
        if (v === 'meplife' || v === 'meplife ') return 'bg-green-200 text-green-800';
        if (v === 'medicenter') return 'bg-lime-200 text-lime-800';
        if (v === 'turf') return 'bg-purple-100 text-purple-800';
        return 'bg-gray-100 text-gray-700';
    };

    // Generar color para supervisor basado en nombre específico
    const getSupervisorColor = (nombre) => {
        if (!nombre) return 'bg-gray-100 text-gray-700';

        const nombreLower = nombre.toLowerCase();
        
        // ✅ COLORES PASTEL ESPECÍFICOS POR SUPERVISOR (tenues pero diferenciables)
        
        // ROJO PASTEL - 5 supervisores
        if (nombreLower.includes('nahuel') && nombreLower.includes('sanchez')) return 'bg-red-100 text-red-800';
        if (nombreLower.includes('abigail') && nombreLower.includes('vera')) return 'bg-red-100 text-red-800';
        if (nombreLower.includes('nahia') && nombreLower.includes('avellaneda')) return 'bg-red-100 text-red-800';
        if (nombreLower.includes('santiago') && nombreLower.includes('goldsztein')) return 'bg-red-100 text-red-800';
        if (nombreLower.includes('facundo') && nombreLower.includes('tevez')) return 'bg-red-100 text-red-800';
        
        // AZUL PASTEL - Mateo Viera
        if (nombreLower.includes('mateo') && nombreLower.includes('viera')) return 'bg-blue-100 text-blue-800';
        
        // MORADO PASTEL - Belen Salaverry
        if (nombreLower.includes('belen') && nombreLower.includes('salaverry')) return 'bg-purple-100 text-purple-800';
        
        // ROSA PASTEL - Analia Suarez
        if (nombreLower.includes('analia') && nombreLower.includes('suarez')) return 'bg-pink-100 text-pink-800';
        
        // VERDE PASTO PASTEL - Erika Cardozo
        if (nombreLower.includes('erika') && nombreLower.includes('cardozo')) return 'bg-green-100 text-green-800';
        
        // AMARILLO PASTEL - Aryel Puiggros
        if (nombreLower.includes('aryel') && nombreLower.includes('puiggros')) return 'bg-yellow-100 text-yellow-800';
        
        // VIOLETA PASTEL - Joaquín Valdez
        if (nombreLower.includes('joaquin') && nombreLower.includes('valdez')) return 'bg-violet-100 text-violet-800';
        if (nombreLower.includes('joquin') && nombreLower.includes('valdez')) return 'bg-violet-100 text-violet-800'; // Por si hay typo
        
        // GRIS PASTEL - Luciano Carugno
        if (nombreLower.includes('luciano') && nombreLower.includes('carugno')) return 'bg-gray-200 text-gray-800';
        
        // CAFÉ PASTEL - Alejandro Mejail
        if (nombreLower.includes('alejandro') && nombreLower.includes('mejail')) return 'bg-amber-100 text-amber-800';
        
        // NARANJA PASTEL - Gaston Sarmiento
        if (nombreLower.includes('gaston') && nombreLower.includes('sarmiento')) return 'bg-orange-100 text-orange-800';

        // Colores por defecto para otros supervisores (hash)
        const colors = [
            'bg-purple-100 text-purple-800',
            'bg-teal-100 text-teal-800',
            'bg-cyan-100 text-cyan-800',
            'bg-rose-100 text-rose-800',
            'bg-emerald-100 text-emerald-800',
            'bg-fuchsia-100 text-fuchsia-800',
            'bg-indigo-100 text-indigo-800',
        ];

        let hash = 0;
        for (let i = 0; i < nombre.length; i++) {
            hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
        }

        const index = Math.abs(hash) % colors.length;
        return colors[index];
    };
    const getCurrentUserRole = () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return null;
            const payload = JSON.parse(atob(token.split(".")[1]));
            return (payload?.role || null);
        } catch {
            return null;
        }
    };
    const currentRole = getCurrentUserRole();
    const isSupervisor = currentRole === 'supervisor' || currentRole === 'Supervisor';
    const isAdmin = currentRole === 'admin' || currentRole === 'Admin';
    const isGerencia = currentRole === 'gerencia' || currentRole === 'Gerencia';
    const isAuditor = currentRole === 'auditor' || currentRole === 'Auditor';
    // Filtros textuales (mantengo las keys que ya tenías: afiliado, cuil, obraAnterior...)
    const [audits, setAudits] = useState([]);
    const [filtersExpanded, setFiltersExpanded] = useState(true); // Estado para colapsar filtros en móvil
    const [filters, setFilters] = useState({
        afiliado: "",
        cuil: "",
        obraAnterior: "",
        obraVendida: "",
        estado: "",
        tipo: "",
        asesor: "",
        grupo: "",
        datos: "",
        auditor: "",
        supervisor: "",
        administrador: "", // Nuevo filtro para administradores
    });

    // Listas para dropdowns de filtros
    const [asesoresList, setAsesoresList] = useState([]);
    const [gruposList, setGruposList] = useState([]);
    const [auditoresList, setAuditoresList] = useState([]);
    const [supervisoresList, setSupervisoresList] = useState([]);
    const [administradoresList, setAdministradoresList] = useState([]);

    // Fecha para consultar histórico (YYYY-MM-DD). Default: hoy
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    const [selectedAudit, setSelectedAudit] = useState(null);
    const [detailsAudit, setDetailsAudit] = useState(null);
    const [loading, setLoading] = useState(false);

    // ✅ Función para obtener la fecha actual de Argentina considerando día laboral hasta 23:01
    const getCurrentArgentinaDate = () => {
        // Obtener hora actual en Argentina (UTC-3)
        const now = new Date();
        const argentinaTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }));
        
        const hours = argentinaTime.getHours();
        const minutes = argentinaTime.getMinutes();
        
        // Si son las 23:01 o después, avanzar al día siguiente
        if (hours === 23 && minutes >= 1 || hours > 23) {
            argentinaTime.setDate(argentinaTime.getDate() + 1);
        }
        
        // Formatear como YYYY-MM-DD
        const year = argentinaTime.getFullYear();
        const month = String(argentinaTime.getMonth() + 1).padStart(2, '0');
        const day = String(argentinaTime.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    };

    const buildParams = () => {
        const params = { ...filters };

        if (dateFrom && dateTo) {
            params.dateFrom = dateFrom;
            params.dateTo = dateTo;
        } else if (!dateFrom && !dateTo) {
            // si no hay rango, mandar día actual (considerando 23:01 como corte)
            params.date = getCurrentArgentinaDate();
        }

        Object.keys(params).forEach(k => {
            if (params[k] === "" || params[k] === null || params[k] === undefined) {
                delete params[k];
            }
        });
        return params;
    };

    const fetchAudits = async () => {
        try {
            setLoading(true);
            const params = buildParams();
            const { data } = await apiClient.get("/audits", { params });
            // data viene ya como array (getAuditsByDate devuelve []), si no festejamos
            setAudits(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            toast.error("Error al cargar auditorías");
            setAudits([]);
        } finally {
            setLoading(false);
        }
    };

    // Cargar listas para dropdowns de filtros
    const fetchFilterOptions = async () => {
        try {
            // Cargar asesores
            const asesoresRes = await apiClient.get('/users', {
                params: isSupervisor ? { scope: 'group' } : {}
            });
            const asesoresData = Array.isArray(asesoresRes.data) ? asesoresRes.data : [];
            const asesoresFiltered = asesoresData
                .filter(u => (u.role === 'asesor' || u.role === 'Asesor') && u.nombre)
                .sort((a, b) => a.nombre.localeCompare(b.nombre));
            setAsesoresList(asesoresFiltered);

            // Cargar auditores
            const auditoresRes = await apiClient.get('/users', {
                params: isSupervisor ? { scope: 'group', includeAllAuditors: 'true' } : {}
            });
            const auditoresData = Array.isArray(auditoresRes.data) ? auditoresRes.data : [];
            // ✅ Filtrar solo Gerencia, Auditor y Supervisor (sin Admin)
            const auditoresFiltered = auditoresData
                .filter(u => (u.role === 'auditor' || u.role === 'Auditor' || u.role === 'gerencia' || u.role === 'Gerencia' || u.role === 'supervisor' || u.role === 'Supervisor') && u.nombre)
                .sort((a, b) => a.nombre.localeCompare(b.nombre));
            setAuditoresList(auditoresFiltered);

            // Cargar grupos
            const gruposRes = await apiClient.get('/groups');
            const gruposData = Array.isArray(gruposRes.data) ? gruposRes.data : [];
            let gruposFiltered = gruposData;
            if (isSupervisor) {
                // Supervisores solo ven su grupo
                const myNumeroEquipo = currentUser?.numeroEquipo;
                gruposFiltered = gruposData.filter(g => g.numeroEquipo === myNumeroEquipo);
            }
            setGruposList(gruposFiltered.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '')));

            // Cargar supervisores (solo para auditor/gerencia)
            if (isAuditor || isGerencia || isAdmin) {
                const supervisoresRes = await apiClient.get('/users');
                const supervisoresData = Array.isArray(supervisoresRes.data) ? supervisoresRes.data : [];
                const supervisoresFiltered = supervisoresData
                    .filter(u => (u.role === 'supervisor' || u.role === 'Supervisor') && u.nombre)
                    .sort((a, b) => a.nombre.localeCompare(b.nombre));
                setSupervisoresList(supervisoresFiltered);
            }

            // Cargar administradores
            const administradoresRes = await apiClient.get('/users');
            const administradoresData = Array.isArray(administradoresRes.data) ? administradoresRes.data : [];
            const administradoresFiltered = administradoresData
                .filter(u => (u.role === 'admin' || u.role === 'Admin') && u.nombre)
                .sort((a, b) => a.nombre.localeCompare(b.nombre));
            setAdministradoresList(administradoresFiltered);
        } catch (err) {
            console.error('Error al cargar opciones de filtros:', err);
        }
    };

    useEffect(() => {
        // carga inicial: trae auditorías del día por defecto (date = hoy)
        fetchAudits();
        fetchFilterOptions();

        // ✅ SOCKET: Actualizar en tiempo real sin refrescar página completa
        const handleAuditUpdate = (payload) => {
            if (!payload) return;

            // Si es eliminación, remover de la lista
            if (payload.deleted) {
                setAudits(prev => prev.filter(a => a._id !== payload));
                return;
            }

            // Si es actualización, actualizar solo esa fila
            setAudits(prev => {
                const index = prev.findIndex(a => a._id === (payload._id || payload));
                if (index >= 0) {
                    // Actualizar auditoría existente
                    const updated = [...prev];
                    updated[index] = { ...updated[index], ...payload };
                    return updated;
                }
                // Si no existe, es una nueva auditoría
                return [payload, ...prev];
            });
        };

        socket.emit("audits:subscribeAll");
        socket.on("audit:update", handleAuditUpdate);

        return () => {
            socket.off("audit:update", handleAuditUpdate);
            socket.emit("audits:unsubscribeAll");
        };
    }, []);

    // Recargar auditorías cuando cambian los filtros o el rango de fechas
    useEffect(() => {
        fetchAudits();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters, dateFrom, dateTo]);

    const handleFilterChange = (field, value) => {
        setFilters((prev) => ({ ...prev, [field]: value }));
    };

    const clearFilters = () => {
        setFilters({
            afiliado: "",
            cuil: "",
            obraAnterior: "",
            obraVendida: "",
            estado: "",
            tipo: "",
            asesor: "",
            grupo: "",
            datos: "",
            auditor: "",
            supervisor: "",
            administrador: "",
        });
        // Resetea rango → fuerza al buildParams a usar "date = hoy"
        setDateFrom("");
        setDateTo("");
    };

    const handleExportXLSX = () => {
        if (!audits || audits.length === 0) {
            toast.info("No hay datos para exportar");
            return;
        }

        // Normalizar/planificar columnas para Excel
        const rows = audits.map(a => {
            // ✅ Ocultar teléfonos para supervisores de otros grupos
            let telefono = a.telefono || "-";
            if (isSupervisor) {
                const auditGrupo = a.asesor?.numeroEquipo;
                const myGrupo = currentUser?.numeroEquipo;
                // Solo ocultar si ambos tienen numeroEquipo y son diferentes
                if (auditGrupo && myGrupo && auditGrupo !== myGrupo) {
                    telefono = "***";
                }
            }

            return {
                Fecha: a.scheduledAt ? new Date(a.scheduledAt).toLocaleDateString("es-AR") : "-",
                Hora: a.scheduledAt ? new Date(a.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-",
                Afiliado: a.nombre || "-",
                CUIL: a.cuil || "-",
                Teléfono: telefono,
                "Obra Social Anterior": a.obraSocialAnterior || "-",
                "Obra Social Vendida": a.obraSocialVendida || "-",
                Estado: a.status || "-",
                Tipo: a.tipoVenta || "-",
                Asesor: (a.asesor && (a.asesor.nombre || a.asesor.name || a.asesor.email)) || "-",
                Supervisor: (a.asesor && a.asesor.supervisor && (a.asesor.supervisor.nombre || a.asesor.supervisor.name || a.asesor.supervisor.email)) || "-",
                Grupo: (a.groupId && (a.groupId.nombre || a.groupId.name)) || "-",
                Auditor: (a.auditor && (a.auditor.nombre || a.auditor.name || a.auditor.email)) || "-",
                Administrador: (a.administrador && (a.administrador.nombre || a.administrador.name || a.administrador.email)) || "-",
                "¿Recuperada?": a.isRecuperada ? "Sí" : "No"
            };
        });

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Auditorías");
        const today = new Date().toISOString().slice(0, 10);
        const filename = `audits_${dateFrom || today}.xlsx`;
        XLSX.writeFile(wb, filename);

        toast.success("Exportado correctamente");
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "Mensaje enviado":
                return "bg-cyan-100 text-cyan-800"; // Celeste
            case "En videollamada":
                return "bg-blue-600 text-white"; // Azul rey
            case "Falta documentación":
                return "bg-orange-100 text-orange-800"; // Naranja
            case "Falta clave":
                return "bg-orange-100 text-orange-800"; // Naranja
            case "Reprogramada":
                return "bg-violet-100 text-violet-800"; // Violeta
            case "Reprogramada (falta confirmar hora)":
                return "bg-violet-100 text-violet-800"; // Violeta
            case "Completa":
                return "bg-lime-600 text-white"; // Verde oliva
            case "QR hecho":
                return "bg-green-600 text-white"; // Verde fuerte
            case "Aprobada":
                return "bg-teal-600 text-white"; // Verde azulado
            case "Aprobada, pero no reconoce clave":
                return "bg-yellow-600 text-white"; // Amarillo fuerte (precaución)
            case "No atendió":
                return "bg-yellow-100 text-yellow-800"; // Amarillo
            case "Tiene dudas":
                return "bg-pink-100 text-pink-800"; // Rosa
            case "Falta clave y documentación":
                return "bg-orange-100 text-orange-800"; // Naranja
            case "No le llegan los mensajes":
                return "bg-purple-100 text-purple-800"; // Morado
            case "Cortó":
                return "bg-yellow-100 text-yellow-800"; // Amarillo
            case "Autovinculación":
                return "bg-amber-700 text-white"; // Marrón
            case "Caída":
                return "bg-red-600 text-white"; // Rojo fuerte
            case "Pendiente":
                return "bg-gray-200 text-gray-700"; // Gris
            case "Rehacer vídeo":
                return "bg-red-300 text-red-900"; // Rojo claro
            case "Rechazada":
                return "bg-red-100 text-red-700";
            case "Baja remuneración":
                return "bg-red-100 text-red-700"; // Rojo suave (igual que Rechazada)
            default:
                return "bg-gray-100 text-gray-700";
        }
    };

    // Función para cargar turnos disponibles
    const fetchAvailableSlots = async (date) => {
        setLoadingSlots(true);
        try {
            const { data } = await apiClient.get(`/audits/available-slots?date=${date}`);
            setAvailableSlots(data || []);
        } catch (err) {
            console.error("Error al cargar turnos disponibles:", err);
            toast.error("No se pudieron cargar los turnos");
        } finally {
            setLoadingSlots(false);
        }
    };

    // Abrir modal y cargar datos
    const handleOpenSlotsModal = () => {
        setShowSlotsModal(true);
        fetchAvailableSlots(selectedDate);
    };

    // Cambiar fecha en el modal
    const handleDateChange = (newDate) => {
        setSelectedDate(newDate);
        fetchAvailableSlots(newDate);
    };

    // Función para obtener color según disponibilidad
    const getSlotColor = (count) => {
        const available = 10 - count; // ✅ Máximo 10 auditorías por turno
        if (available <= 0) return 'bg-red-100 text-red-800 border-red-300';
        if (available >= 1 && available <= 2) return 'bg-orange-100 text-orange-800 border-orange-300';
        if (available >= 3 && available <= 4) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
        return 'bg-green-100 text-green-800 border-green-300'; // 5-10 disponibles
    };

    // Funciones para modal de Estadísticas de Venta
    const fetchSalesStats = async (date) => {
        setLoadingStats(true);
        try {
            const { data } = await apiClient.get(`/audits/sales-stats?date=${date}`);
            setSalesStats(data || []);
        } catch (err) {
            console.error("Error al cargar estadísticas de ventas:", err);
            toast.error("No se pudieron cargar las estadísticas");
        } finally {
            setLoadingStats(false);
        }
    };

    const handleOpenStatsModal = () => {
        setShowStatsModal(true);
        fetchSalesStats(statsDate);
    };

    const handleStatsDateChange = (newDate) => {
        setStatsDate(newDate);
        fetchSalesStats(newDate);
    };

    return (
        <div className="p-2 md:p-4 bg-gradient-to-b from-blue-50 to-purple-50 min-h-screen w-full">
            {/* Caja de Filtros - Colapsable en móvil */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
                <div
                    className="flex justify-between items-center cursor-pointer md:cursor-default"
                    onClick={() => window.innerWidth < 768 && setFiltersExpanded(!filtersExpanded)}
                >
                    <h2 className="text-lg font-semibold text-gray-700">Filtros</h2>
                    <button
                        className="md:hidden text-gray-500 hover:text-gray-700 p-2"
                        onClick={(e) => {
                            e.stopPropagation();
                            setFiltersExpanded(!filtersExpanded);
                        }}
                    >
                        {filtersExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                </div>

                <div className={`flex flex-wrap gap-2 md:gap-3 mt-3 transition-all duration-300 ${filtersExpanded ? 'block' : 'hidden md:flex'}`}>
                    <input
                        type="text"
                        placeholder="Buscar afiliado"
                        value={filters.afiliado}
                        onChange={(e) => handleFilterChange("afiliado", e.target.value)}
                        className="flex-1 min-w-[120px] md:min-w-[160px] p-1.5 md:p-2 border border-gray-200 rounded-lg text-xs md:text-sm"
                    />
                    <input
                        type="text"
                        placeholder="Buscar CUIL"
                        value={filters.cuil}
                        onChange={(e) => handleFilterChange("cuil", e.target.value)}
                        className="flex-1 min-w-[100px] md:min-w-[140px] p-1.5 md:p-2 border border-gray-200 rounded-lg text-xs md:text-sm"
                    />
                    <select
                        value={filters.obraAnterior}
                        onChange={(e) => handleFilterChange("obraAnterior", e.target.value)}
                        className="flex-1 min-w-[130px] md:min-w-[180px] p-1.5 md:p-2 border border-gray-200 rounded-lg text-xs md:text-sm"
                    >
                        <option value="">Obra social anterior</option>
                        {ARGENTINE_OBRAS_SOCIALES.map((o) => (
                            <option key={o} value={o}>{o}</option>
                        ))}
                    </select>
                    <select
                        value={filters.obraVendida}
                        onChange={(e) => handleFilterChange("obraVendida", e.target.value)}
                        className="flex-1 min-w-[130px] md:min-w-[180px] p-1.5 md:p-2 border border-gray-200 rounded-lg text-xs md:text-sm"
                    >
                        <option value="">Obra social vendida</option>
                        {OBRAS_VENDIDAS.map((o) => (
                            <option key={o} value={o}>{o}</option>
                        ))}
                    </select>
                    <select
                        value={filters.estado}
                        onChange={(e) => handleFilterChange("estado", e.target.value)}
                        className="flex-1 min-w-[100px] md:min-w-[140px] p-1.5 md:p-2 border border-gray-200 rounded-lg text-xs md:text-sm"
                    >
                        <option value="">Estado</option>
                        {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                    <select
                        value={filters.tipo}
                        onChange={(e) => handleFilterChange("tipo", e.target.value)}
                        className="flex-1 min-w-[90px] md:min-w-[120px] p-1.5 md:p-2 border border-gray-200 rounded-lg text-xs md:text-sm"
                    >
                        <option value="">Tipo</option>
                        {TIPO_VENTA.map((t) => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                    <select
                        value={filters.asesor}
                        onChange={(e) => handleFilterChange("asesor", e.target.value)}
                        className="flex-1 min-w-[100px] md:min-w-[140px] p-1.5 md:p-2 border border-gray-200 rounded-lg text-xs md:text-sm"
                    >
                        <option value="">-- Asesor --</option>
                        {asesoresList.map(a => (
                            <option key={a._id} value={a.nombre}>{a.nombre}</option>
                        ))}
                    </select>
                    <select
                        value={filters.grupo}
                        onChange={(e) => handleFilterChange("grupo", e.target.value)}
                        className="flex-1 min-w-[100px] md:min-w-[140px] p-1.5 md:p-2 border border-gray-200 rounded-lg text-xs md:text-sm"
                    >
                        <option value="">-- Grupo --</option>
                        {gruposList.map(g => (
                            <option key={g._id} value={g.nombre}>{g.nombre}</option>
                        ))}
                    </select>
                    <select
                        value={filters.auditor}
                        onChange={(e) => handleFilterChange("auditor", e.target.value)}
                        className="flex-1 min-w-[100px] md:min-w-[140px] p-1.5 md:p-2 border border-gray-200 rounded-lg text-xs md:text-sm"
                    >
                        <option value="">-- Auditor --</option>
                        {auditoresList.map(a => (
                            <option key={a._id} value={a.nombre}>{a.nombre}</option>
                        ))}
                    </select>
                    {(isAuditor || isGerencia || isAdmin) && (
                        <select
                            value={filters.supervisor}
                            onChange={(e) => handleFilterChange("supervisor", e.target.value)}
                            className="flex-1 min-w-[100px] md:min-w-[140px] p-1.5 md:p-2 border border-gray-200 rounded-lg text-xs md:text-sm"
                        >
                            <option value="">-- Supervisor --</option>
                            {supervisoresList.map(s => (
                                <option key={s._id} value={s.nombre}>{s.nombre}</option>
                            ))}
                        </select>
                    )}
                    <select
                        value={filters.administrador}
                        onChange={(e) => handleFilterChange("administrador", e.target.value)}
                        className="flex-1 min-w-[100px] md:min-w-[140px] p-1.5 md:p-2 border border-gray-200 rounded-lg text-xs md:text-sm"
                    >
                        <option value="">-- Administrador --</option>
                        {administradoresList.map(a => (
                            <option key={a._id} value={a.nombre}>{a.nombre}</option>
                        ))}
                    </select>

                    {/* Fecha (botón calendario) */}
                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 w-full md:w-auto md:min-w-[320px]">
                        <div className="flex flex-col flex-1">
                            <label className="text-[10px] md:text-xs text-gray-500">Desde</label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="p-1.5 md:p-2 border border-gray-200 rounded-lg text-xs md:text-sm"
                            />
                        </div>
                        <div className="flex flex-col flex-1">
                            <label className="text-[10px] md:text-xs text-gray-500">Hasta</label>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="p-1.5 md:p-2 border border-gray-200 rounded-lg text-xs md:text-sm"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap justify-end gap-2 md:gap-3 mt-4">
                    <button
                        onClick={fetchAudits}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm transition flex-1 md:flex-none min-w-[70px] md:min-w-[120px] touch-manipulation"
                        title="Aplicar filtros"
                    >
                        <span className="md:hidden">🔍</span>
                        <span className="hidden md:inline">Aplicar filtros</span>
                    </button>
                    <button
                        onClick={clearFilters}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm transition flex-1 md:flex-none min-w-[70px] md:min-w-[100px] touch-manipulation"
                        title="Limpiar filtros"
                    >
                        <span className="md:hidden">🗑️</span>
                        <span className="hidden md:inline">Limpiar</span>
                    </button>

                    <button
                        onClick={handleExportXLSX}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm transition flex-1 md:flex-none min-w-[70px] md:min-w-[120px] touch-manipulation"
                        title="Exportar Excel"
                    >
                        <span className="md:hidden">📄</span>
                        <span className="hidden md:inline">📄 Exportar</span>
                    </button>

                    <button
                        onClick={handleOpenSlotsModal}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm transition flex items-center justify-center gap-1 md:gap-2 flex-1 md:flex-none min-w-[70px] touch-manipulation"
                        title="Ver turnos disponibles"
                    >
                        <span className="md:hidden">📅</span>
                        <span className="hidden md:flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            Turnos
                        </span>
                    </button>

                    {/* Botón de Estadísticas solo para Gerencia y Supervisor */}
                    {(isSupervisor || isGerencia) && (
                        <button
                            onClick={handleOpenStatsModal}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm transition flex items-center justify-center gap-1 md:gap-2 flex-1 md:flex-none min-w-[70px] touch-manipulation"
                            title="Ver estadísticas de contactación por obra social anterior"
                        >
                            <span className="md:hidden">📊</span>
                            <span className="hidden md:flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="12" y1="20" x2="12" y2="10"></line>
                                    <line x1="18" y1="20" x2="18" y2="4"></line>
                                    <line x1="6" y1="20" x2="6" y2="16"></line>
                                </svg>
                                Estadísticas
                            </span>
                        </button>
                    )}
                </div>
            </div>

            {/* Contador de filas con desglose dinámico */}
            {audits.length > 0 && (() => {
                // Calcular contador de estados
                const estadosCount = {};
                let recuperadasCount = 0;
                
                audits.forEach(audit => {
                    const estado = audit.status || 'Sin estado';
                    estadosCount[estado] = (estadosCount[estado] || 0) + 1;
                    
                    // ✅ Contar auditorías recuperadas (isRecuperada: true)
                    if (audit.isRecuperada) {
                        recuperadasCount++;
                    }
                });

                const total = audits.length;
                const estadosOrdenados = Object.entries(estadosCount)
                    .sort((a, b) => b[1] - a[1]); // Ordenar por cantidad descendente

                return (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm rounded-xl border border-blue-200 p-3 mb-4">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="font-bold text-gray-800">
                                Total: <span className="text-blue-600">{total}</span>
                            </span>
                            {estadosOrdenados.map(([estado, count]) => (
                                <span key={estado} className="text-gray-700">
                                    <span className="font-semibold">{estado}:</span> <span className="text-indigo-600">{count}</span>
                                </span>
                            ))}
                            {/* ✅ Contador de Recuperadas */}
                            {recuperadasCount > 0 && (
                                <span className="text-gray-700">
                                    <span className="font-semibold">Recuperadas:</span> <span className="text-green-600">{recuperadasCount}</span>
                                </span>
                            )}
                        </div>
                    </div>
                );
            })()}

            {/* Tabla - Responsive con scroll horizontal */}
            <div className="bg-white shadow-sm rounded-2xl border border-gray-100 p-2 md:p-4">
                {/* Hint para scroll en móvil */}
                <div className="md:hidden text-xs text-gray-500 mb-2 text-center">
                    👈 Desliza para ver más columnas →
                </div>
                <div className="table-scroll-mobile overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                        <thead>
                            <tr className="bg-blue-100 text-gray-700 font-semibold text-center sticky top-0">
                                <th className="px-1 py-1.5 text-[9px] md:text-xs">Fecha</th>
                                <th className="px-1 py-1.5 text-[9px] md:text-xs">Hora</th>
                                <th className="px-1 py-1.5 text-[9px] md:text-xs">Afiliado</th>
                                <th className="px-1 py-1.5 text-[9px] md:text-xs">Tel.</th>
                                <th className="hidden md:table-cell px-1 py-1.5 text-xs">CUIL</th>
                                <th className="hidden lg:table-cell px-1 py-1.5 text-xs">O.S.Ant.</th>
                                <th className="px-1 py-1.5 text-[9px] md:text-xs">O.S.V.</th>
                                <th className="px-1 py-1.5 text-[9px] md:text-xs">Estado</th>
                                <th className="hidden lg:table-cell px-1 py-1.5 text-xs">Asesor</th>
                                <th className="px-1 py-1.5 text-[9px] md:text-xs">Sup.</th>
                                <th className="px-1 py-1.5 text-[9px] md:text-xs">Aud.</th>
                                <th className="hidden lg:table-cell px-1 py-1.5 text-xs">Admin.</th>
                                <th className="hidden md:table-cell px-1 py-1.5 text-xs">¿Recup.?</th>
                                <th className="hidden md:table-cell px-1 py-1.5 text-xs">Recup.</th>
                                <th className="px-1 py-1.5 text-[9px] md:text-xs">📝</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="14" className="text-center text-gray-500 py-4">
                                        Cargando datos...
                                    </td>
                                </tr>
                            ) : audits.length === 0 ? (
                                <tr>
                                    <td colSpan="14" className="text-center text-gray-500 py-4 italic">
                                        No hay registros que coincidan con los filtros.
                                    </td>
                                </tr>
                            ) : (
                                audits.map((audit) => {
                                    // ✅ Resaltar filas con color según estado (pastel) - Coincide con getStatusColor
                                    const getRowBackgroundByStatus = (status) => {
                                        if (!status) return "odd:bg-white even:bg-gray-50 hover:bg-blue-50";
                                        switch (status) {
                                            case "Mensaje enviado": return "bg-cyan-50 hover:bg-cyan-100"; // Celeste
                                            case "En videollamada": return "bg-blue-100 hover:bg-blue-200"; // Azul rey
                                            case "Falta documentación": return "bg-orange-50 hover:bg-orange-100"; // Naranja
                                            case "Falta clave": return "bg-orange-50 hover:bg-orange-100"; // Naranja
                                            case "Reprogramada": return "bg-violet-50 hover:bg-violet-100"; // Violeta
                                            case "Reprogramada (falta confirmar hora)": return "bg-violet-50 hover:bg-violet-100"; // Violeta
                                            case "Completa": return "bg-lime-100 hover:bg-lime-200"; // Verde oliva
                                            case "QR hecho": return "bg-green-100 hover:bg-green-200"; // Verde fuerte
                                            case "Aprobada": return "bg-teal-100 hover:bg-teal-200"; // Verde azulado
                                            case "Aprobada, pero no reconoce clave": return "bg-yellow-100 hover:bg-yellow-200"; // Amarillo (precaución)
                                            case "No atendió": return "bg-yellow-50 hover:bg-yellow-100"; // Amarillo
                                            case "Tiene dudas": return "bg-pink-50 hover:bg-pink-100"; // Rosa
                                            case "Falta clave y documentación": return "bg-orange-50 hover:bg-orange-100"; // Naranja
                                            case "No le llegan los mensajes": return "bg-purple-50 hover:bg-purple-100"; // Morado
                                            case "Cortó": return "bg-yellow-50 hover:bg-yellow-100"; // Amarillo
                                            case "Autovinculación": return "bg-amber-100 hover:bg-amber-200"; // Marrón
                                            case "Caída": return "bg-red-100 hover:bg-red-200"; // Rojo fuerte
                                            case "Pendiente": return "bg-gray-100 hover:bg-gray-200"; // Gris
                                            case "Rehacer vídeo": return "bg-red-50 hover:bg-red-100"; // Rojo claro
                                            case "Rechazada": return "bg-red-50 hover:bg-red-100";
                                            case "Baja remuneración": return "bg-red-50 hover:bg-red-100"; // Rojo suave
                                            default: return "odd:bg-white even:bg-gray-50 hover:bg-blue-50";
                                        }
                                    };
                                    const rowClassName = `${getRowBackgroundByStatus(audit.status)} transition border-b border-gray-100 text-center`;

                                    return (
                                        <tr
                                            key={audit._id}
                                            className={rowClassName}
                                        >
                                            <td className="px-0.5 py-0.5 text-[8px] md:text-xs">
                                                {audit.scheduledAt
                                                    ? (
                                                        <span className="inline-flex items-center px-0.5 py-0.5 rounded text-[8px] md:text-[11px] font-semibold bg-blue-100 text-blue-800">
                                                            {new Date(audit.scheduledAt).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })}
                                                        </span>
                                                    )
                                                    : "-"}
                                            </td>
                                            <td className="px-0.5 py-0.5 text-[8px] md:text-xs">
                                                {audit.scheduledAt
                                                    ? (
                                                        <span className="inline-flex items-center px-0.5 py-0.5 rounded text-[8px] md:text-[11px] font-semibold bg-indigo-100 text-indigo-800">
                                                            {new Date(audit.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
                                                        </span>
                                                    )
                                                    : "-"}
                                            </td>
                                            <td className="px-0.5 py-0.5 text-[8px] md:text-xs">{toTitleCase(audit.nombre) || "-"}</td>
                                            <td className="px-0.5 py-0.5 text-[8px] md:text-xs">
                                                {(() => {
                                                    // ✅ Supervisores solo ven teléfonos de su propio grupo
                                                    if (isSupervisor) {
                                                        const auditGrupo = audit.asesor?.numeroEquipo;
                                                        const myGrupo = currentUser?.numeroEquipo;
                                                        // Solo ocultar si ambos tienen numeroEquipo y son diferentes
                                                        if (auditGrupo && myGrupo && auditGrupo !== myGrupo) {
                                                            return "***";
                                                        }
                                                    }
                                                    return audit.telefono || "-";
                                                })()}
                                            </td>
                                            <td className="hidden md:table-cell px-1 py-1 text-xs">{audit.cuil || "-"}</td>
                                            <td className="hidden lg:table-cell px-1 py-1 text-xs">{audit.obraSocialAnterior || "-"}</td>
                                            <td className="px-0.5 py-0.5 text-[8px] md:text-xs">
                                                {audit.obraSocialVendida ? (
                                                    <span className={`inline-flex items-center px-1 py-0.5 rounded text-[10px] md:text-[11px] font-semibold ${getObraVendidaClass(audit.obraSocialVendida)}`}>
                                                        {audit.obraSocialVendida}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="px-0.5 py-0.5 text-[8px] md:text-xs">
                                                <span
                                                    className={`inline-flex items-center justify-center px-1 py-0.5 rounded text-[8px] md:text-[11px] font-medium ${getStatusColor(audit.status)}`}
                                                    style={{ minWidth: "50px" }}
                                                >
                                                    {audit.status || "-"}
                                                </span>
                                            </td>
                                            <td className="hidden lg:table-cell px-1 py-1 text-xs">
                                                {(() => {
                                                    const asesor = audit.asesor;
                                                    const nombreAsesor = asesor?.nombre || asesor?.name || asesor?.email;
                                                    if (!nombreAsesor) return '-';
                                                    
                                                    // ✅ Mostrar asesor en negro
                                                    return (
                                                        <span className="text-gray-900">
                                                            {toTitleCase(nombreAsesor)}
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-0.5 py-0.5 md:px-1 md:py-1 text-[8px] md:text-xs">
                                                {(() => {
                                                    const supervisor = audit.asesor?.supervisor;
                                                    const nombreSup = supervisor?.nombre || supervisor?.name || supervisor?.email;
                                                    if (!nombreSup) return '-';
                                                    return (
                                                        <span className={`inline-flex items-center px-1 py-0.5 rounded text-[8px] md:text-[11px] font-semibold ${getSupervisorColor(nombreSup)}`}>
                                                            {toTitleCase(nombreSup)}
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-0.5 py-0.5 md:px-1 md:py-1 text-[8px] md:text-xs">
                                                {audit.auditor?.nombre ? toTitleCase(audit.auditor?.nombre) : (audit.auditor?.name ? toTitleCase(audit.auditor?.name) : (audit.auditor?.email || "-"))}
                                            </td>
                                            <td className="hidden lg:table-cell px-1 py-1 text-xs">
                                                {audit.administrador?.nombre ? toTitleCase(audit.administrador?.nombre) : (audit.administrador?.name ? toTitleCase(audit.administrador?.name) : (audit.administrador?.email || "-"))}
                                            </td>
                                            <td className="hidden md:table-cell px-1 py-1 text-xs text-center">
                                                {audit.isRecuperada ? 'Sí' : 'No'}
                                            </td>
                                            <td className="hidden md:table-cell px-1 py-1 text-xs text-center">
                                                {audit.isRecovery ? (
                                                    <span className="inline-block px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-[10px] font-semibold">
                                                        Recup.
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-300">-</span>
                                                )}
                                            </td>
                                            <td className="px-0.5 py-0.5">
                                                <div className="flex items-center justify-center gap-0.5 md:gap-1 whitespace-nowrap">
                                                    <button
                                                        onClick={() => setSelectedAudit(audit)}
                                                        className="inline-flex items-center justify-center bg-green-500 hover:bg-green-600 text-white text-xs p-1 md:p-1.5 rounded transition touch-manipulation min-w-[28px] min-h-[28px] md:min-w-0 md:min-h-0"
                                                        title="Editar"
                                                    >
                                                        <Pencil size={12} className="md:w-3 md:h-3" />
                                                    </button>
                                                    <button
                                                        onClick={() => setDetailsAudit(audit)}
                                                        className="inline-flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white text-xs p-1 md:p-1.5 rounded transition touch-manipulation min-w-[28px] min-h-[28px] md:min-w-0 md:min-h-0"
                                                        title="Detalles"
                                                    >
                                                        <Eye size={12} className="md:w-3 md:h-3" />
                                                    </button>
                                                    {(isSupervisor || isAdmin || isGerencia) && (
                                                        <button
                                                            onClick={async () => {
                                                                const name = toTitleCase(audit.nombre || "");
                                                                const ok = window.confirm(`¿Está seguro de que quiere eliminar el turno para vídeo-auditoría de ${name || 'este afiliado'}?`);
                                                                if (!ok) return;
                                                                try {
                                                                    await apiClient.delete(`/audits/${audit._id}`);
                                                                    toast.success("Turno eliminado");
                                                                    fetchAudits();
                                                                } catch (err) {
                                                                    console.error(err);
                                                                    toast.error("No se pudo eliminar el turno");
                                                                }
                                                            }}
                                                            className="inline-flex items-center justify-center bg-red-500 hover:bg-red-600 text-white text-xs p-1 md:p-1.5 rounded transition touch-manipulation min-w-[28px] min-h-[28px] md:min-w-0 md:min-h-0"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 size={12} className="md:w-3 md:h-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedAudit && (
                <AuditEditModal
                    audit={selectedAudit}
                    onClose={() => setSelectedAudit(null)}
                    onSave={fetchAudits}
                />
            )}

            {detailsAudit && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5">
                        <div className="flex items-center justify-between mb-3 border-b pb-2">
                            <h3 className="text-lg font-semibold">Detalles de la auditoría</h3>
                            <button className="p-2 rounded hover:bg-gray-100" onClick={() => setDetailsAudit(null)}>✖</button>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-gray-500">Asesor:</span><span className="font-medium">{detailsAudit.asesor?.nombre ? toTitleCase(detailsAudit.asesor?.nombre) : (detailsAudit.asesor?.name ? toTitleCase(detailsAudit.asesor?.name) : (detailsAudit.asesor?.email || "-"))}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Validador:</span><span className="font-medium">{detailsAudit.validador?.nombre ? toTitleCase(detailsAudit.validador?.nombre) : (detailsAudit.validador?.name ? toTitleCase(detailsAudit.validador?.name) : (detailsAudit.validador?.email || "-"))}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Supervisor:</span><span className="font-medium">{detailsAudit.asesor?.supervisor?.nombre ? toTitleCase(detailsAudit.asesor?.supervisor?.nombre) : (detailsAudit.asesor?.supervisor?.name ? toTitleCase(detailsAudit.asesor?.supervisor?.name) : (detailsAudit.asesor?.supervisor?.email || "-"))}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Grupo:</span><span className="font-medium">{detailsAudit.groupId?.nombre ? toTitleCase(detailsAudit.groupId?.nombre) : (detailsAudit.groupId?.name ? toTitleCase(detailsAudit.groupId?.name) : "-")}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Tipo:</span><span className="font-medium">{detailsAudit.tipoVenta ? toTitleCase(detailsAudit.tipoVenta) : "-"}</span></div>
                            
                            {/* Campo ¿Recuperada? - Solo Gerencia puede marcar */}
                            <div className="flex items-center justify-between border-t pt-2">
                                <span className="text-gray-500">¿Recuperada?</span>
                                <label className="flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={detailsAudit.isRecuperada || false}
                                        disabled={!isGerencia}
                                        onChange={async (e) => {
                                            if (!isGerencia) return;
                                            const newValue = e.target.checked;
                                            try {
                                                await apiClient.patch(`/audits/${detailsAudit._id}`, {
                                                    isRecuperada: newValue
                                                });
                                                setDetailsAudit({ ...detailsAudit, isRecuperada: newValue });
                                                toast.success(newValue ? "✅ Marcada como recuperada" : "❌ Desmarcada como recuperada");
                                                fetchAudits(); // Refrescar lista
                                            } catch (err) {
                                                console.error(err);
                                                toast.error("Error al actualizar estado de recuperación");
                                            }
                                        }}
                                        className={`w-5 h-5 rounded ${isGerencia ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                                    />
                                    <span className={`ml-2 font-medium ${detailsAudit.isRecuperada ? 'text-green-600' : 'text-gray-400'}`}>
                                        {detailsAudit.isRecuperada ? 'Sí' : 'No'}
                                    </span>
                                </label>
                            </div>
                            
                            <div>
                                <div className="text-gray-500 mb-1">Datos extra:</div>
                                <div className="bg-gray-50 rounded p-2 min-h-[48px] whitespace-pre-wrap">{detailsAudit.datosExtra || "—"}</div>
                            </div>
                        </div>
                        <div className="flex justify-end mt-4">
                            <button className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700" onClick={() => setDetailsAudit(null)}>Cerrar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Turnos Disponibles */}
            {showSlotsModal && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b bg-gradient-to-r from-purple-50 to-blue-50">
                            <div className="flex items-center gap-3">
                                <div className="bg-purple-600 p-2 rounded-lg">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                        <line x1="16" y1="2" x2="16" y2="6"></line>
                                        <line x1="8" y1="2" x2="8" y2="6"></line>
                                        <line x1="3" y1="10" x2="21" y2="10"></line>
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-gray-800">Turnos Disponibles</h3>
                                    <p className="text-sm text-gray-500">Vista general de la ocupación de turnos</p>
                                </div>
                            </div>
                            <button
                                className="p-2 rounded-lg hover:bg-gray-100 transition"
                                onClick={() => setShowSlotsModal(false)}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>

                        {/* Selector de Fecha */}
                        <div className="p-5 bg-gray-50 border-b">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar fecha:</label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => handleDateChange(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                        </div>

                        {/* Leyenda */}
                        <div className="p-5 bg-blue-50 border-b">
                            <p className="text-xs font-semibold text-gray-700 mb-2">Leyenda de disponibilidad:</p>
                            <div className="flex flex-wrap gap-3 text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded bg-green-100 border border-green-300"></div>
                                    <span>5-10 cupos disponibles</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-300"></div>
                                    <span>3-4 cupos disponibles</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded bg-orange-100 border border-orange-300"></div>
                                    <span>1-2 cupos disponibles</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded bg-red-100 border border-red-300"></div>
                                    <span>Turno completo (bloqueado)</span>
                                </div>
                            </div>
                        </div>

                        {/* Lista de Turnos */}
                        <div className="flex-1 overflow-y-auto p-5">
                            {loadingSlots ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                                    <span className="ml-3 text-gray-600">Cargando turnos...</span>
                                </div>
                            ) : availableSlots.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <p>No hay turnos disponibles para esta fecha.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                    {availableSlots.map((slot) => {
                                        const available = 10 - slot.count;
                                        const isBlocked = available <= 0;
                                        return (
                                            <div
                                                key={slot.time}
                                                className={`p-4 rounded-lg border-2 transition-all ${getSlotColor(slot.count)} ${isBlocked ? 'opacity-60' : 'hover:shadow-md'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-lg font-bold">{slot.time}</span>
                                                    {isBlocked && (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                                        </svg>
                                                    )}
                                                </div>
                                                <div className="text-xs space-y-1">
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">Pactadas:</span>
                                                        <span className="font-semibold">{slot.count}/10</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">Disponibles:</span>
                                                        <span className="font-bold">{Math.max(0, available)}</span>
                                                    </div>
                                                </div>
                                                {isBlocked && (
                                                    <div className="mt-2 text-xs font-semibold text-center">
                                                        COMPLETO
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-5 border-t bg-gray-50 flex justify-between items-center">
                            <div className="text-sm text-gray-600">
                                <span className="font-semibold">Total de turnos:</span> {availableSlots.length}
                                <span className="ml-4 font-semibold">Auditorías pactadas:</span> {availableSlots.reduce((sum, s) => sum + s.count, 0)}
                            </div>
                            <button
                                className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition"
                                onClick={() => setShowSlotsModal(false)}
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Estadísticas de Venta */}
            {showStatsModal && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b bg-gradient-to-r from-indigo-50 to-purple-50">
                            <div className="flex items-center gap-3">
                                <div className="bg-indigo-600 p-2 rounded-lg">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="12" y1="20" x2="12" y2="10"></line>
                                        <line x1="18" y1="20" x2="18" y2="4"></line>
                                        <line x1="6" y1="20" x2="6" y2="16"></line>
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-gray-800">Estadísticas de Contactación</h3>
                                    <p className="text-sm text-gray-500">Afiliados contactados por obra social anterior</p>
                                </div>
                            </div>
                            <button
                                className="p-2 rounded-lg hover:bg-gray-100 transition"
                                onClick={() => setShowStatsModal(false)}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>

                        {/* Selector de Fecha */}
                        <div className="p-5 bg-gray-50 border-b">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar fecha:</label>
                            <input
                                type="date"
                                value={statsDate}
                                onChange={(e) => handleStatsDateChange(e.target.value)}
                                className="p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>

                        {/* Lista de Estadísticas */}
                        <div className="flex-1 overflow-y-auto p-5">
                            {loadingStats ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                                    <span className="ml-3 text-gray-600">Cargando estadísticas...</span>
                                </div>
                            ) : salesStats.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <line x1="12" y1="8" x2="12" y2="12"></line>
                                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                    </svg>
                                    <p className="font-medium">No hay contactaciones registradas para esta fecha.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {salesStats.map((stat, index) => {
                                        const total = salesStats.reduce((sum, s) => sum + s.count, 0);
                                        const percentage = ((stat.count / total) * 100).toFixed(1);
                                        return (
                                            <div
                                                key={stat.obraSocial}
                                                className="bg-gradient-to-r from-white to-gray-50 rounded-lg p-4 border-l-4 hover:shadow-md transition"
                                                style={{
                                                    borderLeftColor: index === 0 ? '#4F46E5' :
                                                        index === 1 ? '#7C3AED' :
                                                            index === 2 ? '#2563EB' : '#6B7280'
                                                }}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm">
                                                            {index + 1}
                                                        </div>
                                                        <div>
                                                            <span className={`font-semibold text-base ${getObraVendidaClass(stat.obraSocial)} px-3 py-1 rounded-full inline-block`}>
                                                                {stat.obraSocial}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-2xl font-bold text-indigo-600">{stat.count}</div>
                                                        <div className="text-xs text-gray-500">contactaciones</div>
                                                    </div>
                                                </div>

                                                {/* Barra de progreso */}
                                                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                                    <div
                                                        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                                                        style={{ width: `${percentage}%` }}
                                                    ></div>
                                                </div>
                                                <div className="text-xs text-gray-600 mt-1 text-right">{percentage}% del total</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-5 border-t bg-gray-50 flex justify-between items-center">
                            <div className="text-sm text-gray-600">
                                <span className="font-semibold">Total contactaciones:</span> {salesStats.reduce((sum, s) => sum + s.count, 0)}
                                <span className="ml-4 font-semibold">Obras sociales:</span> {salesStats.length}
                            </div>
                            <button
                                className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
                                onClick={() => setShowStatsModal(false)}
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}