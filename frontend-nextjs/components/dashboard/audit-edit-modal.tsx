"use client"

import { useState, useEffect, useMemo } from "react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import { X, Save, Clock, User, CheckCircle2, AlertCircle, Calendar as CalendarIcon, Users, MessageSquare } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth"

interface Audit {
    _id: string
    nombre: string
    cuil?: string
    telefono: string
    tipoVenta: string
    obraSocialAnterior?: string
    obraSocialVendida: string
    scheduledAt: string
    status: string
    statusUpdatedAt?: string
    asesor?: {
        _id: string
        nombre: string
        numeroEquipo?: string
    }
    auditor?: {
        _id: string
        nombre: string
    }
    administrador?: {
        _id: string
        nombre: string
    }
    groupId?: {
        _id: string
        nombre: string
        numeroEquipo?: string
        name?: string
    }
    numeroEquipo?: string
    grupo?: string
    datosExtra?: string
    isRecuperada?: boolean
    statusHistory?: {
        value: string
        updatedBy: { nombre: string }
        updatedAt: string
    }[]
    datosExtraHistory?: {
        value: string
        updatedBy: { nombre: string }
        updatedAt: string
    }[]
    asesorHistory?: {
        previousAsesor: { nombre: string; name?: string }
        newAsesor: { nombre: string; name?: string }
        changedBy: { nombre: string; name?: string }
        changedAt: string
    }[]
    fechaCreacionQR?: string
    createdAt: string
    migrada?: boolean
    supervisorSnapshot?: {
        _id: string
        nombre: string
        numeroEquipo: string
    }
}

interface AuditEditModalProps {
    isOpen: boolean
    onClose: () => void
    audit: Audit
    onSave: (updatedAudit: Audit) => void
}

const STATUS_OPTIONS = [
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
    "Falta clave y documentación"
]

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
    "OSPCRA (104009)"
]

const OBRAS_VENDIDAS = ["Binimed", "Meplife", "TURF"]
const TIPO_VENTA = ["Alta", "Cambio"]

// Helper to check roles
const checkRole = (userRole: string | undefined, allowedRoles: string[]) => {
    if (!userRole) return false;
    return allowedRoles.includes(userRole.toLowerCase());
};

export function AuditEditModal({ isOpen, onClose, audit, onSave }: AuditEditModalProps) {
    const { theme } = useTheme()
    const { user } = useAuth()

    const getLocalDateTime = (utcDateString: string) => {
        if (!utcDateString) return { fecha: "", hora: "" }
        const date = new Date(utcDateString)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        return {
            fecha: `${year}-${month}-${day}`,
            hora: `${hours}:${minutes}`
        }
    }

    const localSchedule = getLocalDateTime(audit.scheduledAt)

    const userRole = user?.role?.toLowerCase();
    const isAsesor = userRole === 'asesor';
    const isGerencia = userRole === 'gerencia';
    const isAdmin = userRole === 'administrativo';
    const isAuditorOrSupervisor = ['auditor', 'supervisor'].includes(userRole || '');

    // Status options logic
    const getAvailableStatuses = () => {
        if (isAdmin) {
            return [
                "Pendiente", "QR hecho", "AFIP", "Baja laboral con nueva alta",
                "Baja laboral sin nueva alta", "Padrón", "En revisión",
                "Remuneración no válida", "Cargada", "Aprobada",
                "Aprobada, pero no reconoce clave", "Rehacer vídeo",
                "Rechazada", "Falta documentación", "Falta clave",
                "Falta clave y documentación"
            ];
        }
        if (isAuditorOrSupervisor) {
            return [
                "Mensaje enviado", "En videollamada", "Rechazada",
                "Falta documentación", "Falta clave", "Reprogramada",
                "Reprogramada (falta confirmar hora)", "Completa",
                "No atendió", "Tiene dudas", "Falta clave y documentación",
                "No le llegan los mensajes", "Cortó", "Autovinculación",
                "Caída", "Rehacer vídeo"
            ];
        }
        if (isGerencia) {
            return STATUS_OPTIONS; // All options
        }
        return []; // Asesor sees nothing or read-only
    };

    const availableStatuses = getAvailableStatuses();

    const [form, setForm] = useState({
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
        fechaCreacionQR: audit.fechaCreacionQR ? audit.fechaCreacionQR.split('T')[0] : "",
        supervisor: audit.supervisorSnapshot?._id || ""
    })

    const [loading, setLoading] = useState(false)
    const [reprogramar, setReprogramar] = useState(false)
    const [activeTab, setActiveTab] = useState<"details" | "history">("details")

    const [asesores, setAsesores] = useState<any[]>([])
    const [grupos, setGrupos] = useState<any[]>([])
    const [auditores, setAuditores] = useState<any[]>([])
    const [supervisores, setSupervisores] = useState<any[]>([])
    const [administradores, setAdministradores] = useState<any[]>([])
    const [availableSlots, setAvailableSlots] = useState<any[]>([])

    useEffect(() => {
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
                fechaCreacionQR: audit.fechaCreacionQR ? audit.fechaCreacionQR.split('T')[0] : "",
                supervisor: audit.supervisorSnapshot?._id || ""
            })
            fetchFilterOptions()
        }
    }, [isOpen, audit])

    useEffect(() => {
        if (form.fecha) fetchAvailableSlots(form.fecha)
    }, [form.fecha])

    const fetchFilterOptions = async () => {
        try {
            // Use includeAllAuditors=true to ensure we get all relevant users regardless of current user's role/team
            const usersRes = await api.users.list("includeAllAuditors=true")
            const users = usersRes.data || []

            console.log("AuditEditModal: Users fetched:", users.length, users)

            // Store ALL active users for the asesor dropdown (will be filtered by grupo)
            setAsesores(users.filter((u: any) => u.active !== false))

            // Filter for auditores dropdown: auditor, supervisor, gerencia
            const filteredAuditores = users.filter((u: any) => ['auditor', 'supervisor', 'gerencia'].includes(u.role?.toLowerCase()) && u.active !== false)
            console.log("AuditEditModal: Filtered auditores:", filteredAuditores.length, filteredAuditores)
            setAuditores(filteredAuditores)
            setSupervisores(users.filter((u: any) => u.role === 'supervisor' && u.active !== false))
            setAdministradores(users.filter((u: any) => u.role === 'administrativo' && u.active !== false))

            // Extract unique groups from users
            const uniqueGroups = Array.from(new Set(
                users
                    .filter((u: any) => u.numeroEquipo)
                    .map((u: any) => u.numeroEquipo)
            )).map(num => ({ _id: num, nombre: num, name: num }))

            setGrupos(uniqueGroups)
        } catch (error) {
            console.error("Error fetching filter options:", error)
            // Ensure arrays are always set even on error
            setAsesores([])
            setAuditores([])
            setAdministradores([])
            setGrupos([])
        }
    }

    // Filter asesores based on selected grupo (shows ALL users from that numeroEquipo, regardless of role)
    const filteredAsesores = useMemo(() => {
        if (!form.numeroEquipo && !form.grupo) {
            return asesores
        }

        const selectedNumeroEquipo = form.numeroEquipo || form.grupo
        return asesores.filter((u: any) => u.numeroEquipo === selectedNumeroEquipo)
    }, [asesores, form.numeroEquipo, form.grupo])

    const fetchAvailableSlots = async (date: string) => {
        try {
            const { data } = await api.audits.getAvailableSlots(date)
            setAvailableSlots(data || [])
        } catch (error) {
            console.error("Error fetching slots:", error)
            setAvailableSlots([])
        }
    }

    const generateTimeOptions = () => {
        const options = []
        const start = new Date()
        start.setHours(9, 20, 0, 0)
        const end = new Date()
        end.setHours(23, 0, 0, 0)
        let cur = new Date(start)
        while (cur <= end) {
            const hh = String(cur.getHours()).padStart(2, "0")
            const mm = String(cur.getMinutes()).padStart(2, "0")
            options.push(`${hh}:${mm}`)
            cur.setMinutes(cur.getMinutes() + 20)
        }
        return options
    }

    const getEnabledTimeOptions = () => {
        const all = generateTimeOptions()
        const map: Record<string, number> = {}
        // Safety check: ensure availableSlots is an array
        if (Array.isArray(availableSlots)) {
            availableSlots.forEach((s: any) => { map[s.time] = s.count })
        }
        return all.map((t) => ({ time: t, disabled: (map[t] || 0) >= 10 }))
    }

    const timeOptions = getEnabledTimeOptions()

    if (!isOpen) return null

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target
        const checked = (e.target as HTMLInputElement).checked

        // Special handling for grupo changes
        if (name === 'grupo') {
            // Find supervisor for this grupo (numeroEquipo)
            const supervisor = asesores.find((u: any) =>
                u.numeroEquipo === value && u.role?.toLowerCase() === 'supervisor'
            )

            setForm(prev => ({
                ...prev,
                grupo: value,
                numeroEquipo: value, // Update numeroEquipo to match grupo
                asesor: supervisor?._id || '' // Auto-select supervisor or clear if not found
            }))
        } else {
            setForm(prev => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            }))
        }
    }

    // Handle Reprogramar checkbox
    const handleReprogramarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        setReprogramar(checked);
        if (checked) {
            setForm(prev => ({ ...prev, status: 'Reprogramada' }));
        }
    };

    const handleSave = async () => {
        try {
            setLoading(true)

            const payload: any = {
                ...form,
                scheduledAt: `${form.fecha}T${form.hora}:00`,
                fechaCreacionQR: form.fechaCreacionQR ? new Date(form.fechaCreacionQR).toISOString() : null
            }

            // Clean up payload: remove empty strings for ObjectId fields
            if (!payload.asesor) delete payload.asesor
            if (!payload.grupo) delete payload.grupo
            if (!payload.numeroEquipo) delete payload.numeroEquipo

            // Handle auditor: send null if empty to allow clearing
            payload.auditor = form.auditor || null

            // Handle administrador: send null if empty to allow clearing
            payload.administrador = form.administrador || null

            // Handle supervisor
            if (!isGerencia) {
                delete payload.supervisor
            } else {
                // If gerencia and supervisor is empty string, send null or remove it
                if (!payload.supervisor) {
                    payload.supervisor = null
                }
            }

            if (reprogramar && form.fecha && form.hora) {
                // Use browser's local timezone
                const scheduledAt = new Date(`${form.fecha}T${form.hora}:00`)
                payload.scheduledAt = scheduledAt.toISOString()
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
                const isSupervisorOfGroup = (() => {
                    const isSupervisor = user?.role?.toLowerCase() === 'supervisor';
                    if (!isSupervisor) return false;

                    // Check if audit.asesor has numeroEquipo and it matches user's numeroEquipo
                    const auditTeam = audit.asesor?.numeroEquipo || audit.numeroEquipo;
                    const userTeam = user?.numeroEquipo;

                    return auditTeam && userTeam && String(auditTeam) === String(userTeam);
                })();

                if (!isGerencia && !isSupervisorOfGroup && !isAssignedAuditor) {
                    toast.error("No tienes permiso para quitar al auditor asignado. Solo gerencia, el supervisor del equipo o el auditor mismo pueden hacerlo.");
                    setLoading(false);
                    return;
                }
            }

            // Validation: Admin removal
            if (audit.administrador?._id && !form.administrador) {
                const currentUserId = user?._id;
                const isAssignedAdmin = currentUserId === audit.administrador._id;

                if (!isGerencia && !isAssignedAdmin) {
                    toast.error("No tienes permiso para quitar al administrador asignado");
                    setLoading(false);
                    return;
                }
            }

            const response = await api.audits.update(audit._id, payload)
            toast.success("Auditoría actualizada")
            onSave(response.data)
            onClose()
        } catch (error: any) {
            console.error("Error updating audit:", error)
            toast.error(error.response?.data?.message || "Error al actualizar auditoría")
        } finally {
            setLoading(false)
        }
    }

    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        return () => setMounted(false)
    }, [])

    if (!mounted) return null

    const { createPortal } = require('react-dom')

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div
                className={cn(
                    "w-full max-w-4xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]",
                    theme === "dark" ? "bg-[#1a1333] border border-white/10" : "bg-white"
                )}
            >
                {/* Header */}
                <div className={cn(
                    "px-6 py-4 border-b flex items-center justify-between",
                    theme === "dark" ? "border-white/10" : "border-gray-100"
                )}>
                    <div>
                        <h2 className={cn("text-lg font-semibold", theme === "dark" ? "text-white" : "text-gray-800")}>
                            Editar Auditoría
                        </h2>
                        <p className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                            {audit.nombre} - {audit.cuil}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className={cn(
                            "p-2 rounded-lg transition-colors",
                            theme === "dark" ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-500"
                        )}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className={cn(
                    "flex border-b",
                    theme === "dark" ? "border-white/10" : "border-gray-100"
                )}>
                    <button
                        onClick={() => setActiveTab("details")}
                        className={cn(
                            "flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2",
                            activeTab === "details"
                                ? theme === "dark" ? "border-purple-500 text-purple-400" : "border-purple-600 text-purple-600"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                        )}
                    >
                        Detalles
                    </button>
                    <button
                        onClick={() => setActiveTab("history")}
                        className={cn(
                            "flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2",
                            activeTab === "history"
                                ? theme === "dark" ? "border-purple-500 text-purple-400" : "border-purple-600 text-purple-600"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                        )}
                    >
                        Historial
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <fieldset disabled={isAsesor} className="contents">
                        {activeTab === "details" ? (
                            <div className="space-y-4">
                                {/* Basic Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                                            Afiliado
                                        </label>
                                        <input
                                            name="nombre"
                                            value={form.nombre}
                                            onChange={handleChange}
                                            className={cn(
                                                "w-full px-3 py-2 rounded-lg border text-sm",
                                                theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"
                                            )}
                                        />
                                    </div>
                                    <div>
                                        <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                                            Teléfono
                                        </label>
                                        <input
                                            name="telefono"
                                            value={form.telefono}
                                            onChange={handleChange}
                                            className={cn(
                                                "w-full px-3 py-2 rounded-lg border text-sm",
                                                theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"
                                            )}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                                        CUIL
                                    </label>
                                    <input
                                        name="cuil"
                                        value={form.cuil}
                                        onChange={handleChange}
                                        className={cn(
                                            "w-full px-3 py-2 rounded-lg border text-sm",
                                            theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"
                                        )}
                                    />
                                </div>

                                {/* Obras Sociales */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                                            Obra Social Anterior
                                        </label>
                                        <select
                                            name="obraSocialAnterior"
                                            value={form.obraSocialAnterior}
                                            onChange={handleChange}
                                            className={cn(
                                                "w-full px-3 py-2 rounded-lg border text-sm",
                                                theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"
                                            )}
                                        >
                                            <option value="">-- Seleccionar --</option>
                                            {ARGENTINE_OBRAS_SOCIALES.map(o => (
                                                <option key={o} value={o}>{o}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                                            Obra Social Vendida
                                        </label>
                                        <select
                                            name="obraSocialVendida"
                                            value={form.obraSocialVendida}
                                            onChange={handleChange}
                                            className={cn(
                                                "w-full px-3 py-2 rounded-lg border text-sm",
                                                theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"
                                            )}
                                        >
                                            {OBRAS_VENDIDAS.map(o => (
                                                <option key={o} value={o}>{o}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Estado y Tipo */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                                            Estado
                                        </label>
                                        <select
                                            name="status"
                                            value={form.status}
                                            onChange={handleChange}
                                            className={cn(
                                                "w-full px-3 py-2 rounded-lg border text-sm",
                                                theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"
                                            )}
                                        >
                                            <option value="">Seleccionar estado...</option>
                                            {/* Always show current status even if not in available list */}
                                            {form.status && !availableStatuses.includes(form.status) && (
                                                <option value={form.status}>{form.status}</option>
                                            )}
                                            {availableStatuses.map(opt => (
                                                <option key={opt} value={opt} disabled={opt === 'Reprogramada' && !reprogramar}>
                                                    {opt}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                                            Tipo
                                        </label>
                                        <select
                                            name="tipoVenta"
                                            value={form.tipoVenta}
                                            onChange={handleChange}
                                            className={cn(
                                                "w-full px-3 py-2 rounded-lg border text-sm",
                                                theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"
                                            )}
                                        >
                                            {TIPO_VENTA.map(t => (
                                                <option key={t} value={t}>{t}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Asesor, Grupo, Supervisor, Auditor */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                                            Asesor
                                        </label>
                                        <select
                                            name="asesor"
                                            value={form.asesor}
                                            onChange={handleChange}
                                            disabled={!isGerencia} // Item 6: Lock Asesor for non-gerencia
                                            className={cn(
                                                "w-full px-3 py-2 rounded-lg border text-sm",
                                                !isGerencia && "opacity-60 cursor-not-allowed",
                                                theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"
                                            )}
                                        >
                                            <option value="">Seleccione</option>
                                            {filteredAsesores?.map(u => (
                                                <option key={u._id} value={u._id}>{u.nombre} ({u.role})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                                            Grupo
                                        </label>
                                        <select
                                            name="grupo"
                                            value={form.grupo}
                                            onChange={handleChange}
                                            disabled={!isGerencia} // Item 6: Lock Grupo for non-gerencia
                                            className={cn(
                                                "w-full px-3 py-2 rounded-lg border text-sm",
                                                !isGerencia && "opacity-60 cursor-not-allowed",
                                                theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"
                                            )}
                                        >
                                            <option value="">Seleccione</option>
                                            {grupos?.map(g => (
                                                <option key={g._id} value={g.nombre || g.name}>{g.nombre || g.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                                            Supervisor
                                        </label>
                                        <select
                                            name="supervisor"
                                            value={form.supervisor}
                                            onChange={handleChange}
                                            disabled={!isGerencia}
                                            className={cn(
                                                "w-full px-3 py-2 rounded-lg border text-sm",
                                                !isGerencia && "opacity-60 cursor-not-allowed",
                                                theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"
                                            )}
                                        >
                                            <option value="">Seleccione</option>
                                            {supervisores?.map(u => (
                                                <option key={u._id} value={u._id}>
                                                    {u.nombre} {u.numeroEquipo ? `(${u.numeroEquipo})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                                            Auditor
                                        </label>
                                        <select
                                            name="auditor"
                                            value={form.auditor}
                                            onChange={handleChange}
                                            className={cn(
                                                "w-full px-3 py-2 rounded-lg border text-sm",
                                                theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"
                                            )}
                                        >
                                            <option value="">Seleccione</option>
                                            {auditores?.map(u => (
                                                <option key={u._id} value={u._id}>{u.nombre} ({u.role})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Administrador */}
                                <div>
                                    <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                                        Administrador
                                    </label>
                                    <select
                                        name="administrador"
                                        value={form.administrador}
                                        onChange={handleChange}
                                        disabled={!isGerencia && !isAdmin} // Item 7: Lock Admin for non-admin/gerencia
                                        className={cn(
                                            "w-full px-3 py-2 rounded-lg border text-sm",
                                            (!isGerencia && !isAdmin) && "opacity-60 cursor-not-allowed",
                                            theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"
                                        )}
                                    >
                                        <option value="">Seleccione</option>
                                        {administradores?.map(u => (
                                            <option key={u._id} value={u._id}>{u.nombre}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Fecha y Hora */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                                            Fecha (día)
                                        </label>
                                        <input
                                            type="date"
                                            name="fecha"
                                            value={form.fecha}
                                            onChange={handleChange}
                                            disabled={!reprogramar}
                                            className={cn(
                                                "w-full px-3 py-2 rounded-lg border text-sm",
                                                !reprogramar && "opacity-50 cursor-not-allowed",
                                                theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"
                                            )}
                                        />
                                    </div>
                                    <div>
                                        <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                                            Hora (Turno)
                                        </label>
                                        <select
                                            name="hora"
                                            value={form.hora}
                                            onChange={handleChange}
                                            disabled={!reprogramar}
                                            className={cn(
                                                "w-full px-3 py-2 rounded-lg border text-sm",
                                                !reprogramar && "opacity-50 cursor-not-allowed",
                                                theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"
                                            )}
                                        >
                                            <option value="">Seleccionar hora</option>
                                            {timeOptions.map((opt) => (
                                                <option key={opt.time} value={opt.time} disabled={opt.disabled && opt.time !== form.hora}>
                                                    {opt.time} {opt.disabled ? "(Lleno)" : ""}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Fecha Creación QR (Solo Admin/Gerencia) */}
                                {['administrativo', 'gerencia'].includes(user?.role?.toLowerCase() || '') && (
                                    <div>
                                        <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                                            Fecha Creación QR
                                        </label>
                                        <input
                                            type="date"
                                            name="fechaCreacionQR"
                                            value={form.fechaCreacionQR}
                                            onChange={handleChange}
                                            className={cn(
                                                "w-full px-3 py-2 rounded-lg border text-sm",
                                                theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"
                                            )}
                                        />
                                    </div>
                                )}

                                {/* Reprogramar Checkbox */}
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="reprogramar"
                                        checked={reprogramar}
                                        onChange={handleReprogramarChange}
                                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                    />
                                    <label htmlFor="reprogramar" className={cn("text-sm font-medium", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                                        Reprogramar turno (habilitar fecha/hora)
                                    </label>
                                </div>

                                {/* Datos Extra */}
                                <div>
                                    <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                                        Datos Extra / Notas
                                    </label>
                                    <textarea
                                        name="datosExtra"
                                        value={form.datosExtra}
                                        onChange={handleChange}
                                        rows={3}
                                        className={cn(
                                            "w-full px-3 py-2 rounded-lg border text-sm resize-none",
                                            theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"
                                        )}
                                    />
                                </div>

                                {/* Checkbox Recuperada */}
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        name="isRecuperada"
                                        checked={form.isRecuperada}
                                        onChange={handleChange}
                                        className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                    />
                                    <label className={cn("text-sm", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                                        ¿Recuperada?
                                    </label>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Status History */}
                                <div>
                                    <h3 className={cn("text-sm font-semibold mb-3 flex items-center gap-2", theme === "dark" ? "text-white" : "text-gray-800")}>
                                        <Clock className="w-4 h-4" />
                                        Historial de Estados
                                    </h3>
                                    <div className="space-y-3 pl-2 border-l-2 border-gray-200 dark:border-white/10">
                                        {audit.statusHistory?.slice().reverse().map((entry, idx) => (
                                            <div key={idx} className="relative pl-4 pb-2">
                                                <div className={cn(
                                                    "absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2",
                                                    theme === "dark" ? "bg-gray-900 border-purple-500" : "bg-white border-purple-500"
                                                )} />
                                                <p className={cn("text-sm font-medium", theme === "dark" ? "text-gray-200" : "text-gray-800")}>
                                                    {entry.value}
                                                </p>
                                                <p className={cn("text-xs", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                                                    {entry.updatedBy?.nombre || "Sistema"} - {new Date(entry.updatedAt).toLocaleString()}
                                                </p>
                                            </div>
                                        ))}
                                        {(!audit.statusHistory || audit.statusHistory.length === 0) && (
                                            <p className="text-sm text-gray-500 pl-4">No hay historial de estados</p>
                                        )}
                                    </div>
                                </div>

                                {/* Asesor History */}
                                <div>
                                    <h3 className={cn("text-sm font-semibold mb-3 flex items-center gap-2", theme === "dark" ? "text-white" : "text-gray-800")}>
                                        <Users className="w-4 h-4" />
                                        Historial de Asesores
                                    </h3>
                                    <div className="space-y-3 pl-2 border-l-2 border-gray-200 dark:border-white/10">
                                        {audit.asesorHistory?.slice().reverse().map((entry, idx) => (
                                            <div key={idx} className="relative pl-4 pb-2">
                                                <div className={cn(
                                                    "absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2",
                                                    theme === "dark" ? "bg-gray-900 border-blue-500" : "bg-white border-blue-500"
                                                )} />
                                                <p className={cn("text-sm font-medium", theme === "dark" ? "text-gray-200" : "text-gray-800")}>
                                                    {entry.previousAsesor?.nombre || entry.previousAsesor?.name || "Sin Asesor"} → {entry.newAsesor?.nombre || entry.newAsesor?.name || "Sin Asesor"}
                                                </p>
                                                <p className={cn("text-xs", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                                                    {entry.changedBy?.nombre || entry.changedBy?.name || "Sistema"} - {new Date(entry.changedAt).toLocaleString()}
                                                </p>
                                            </div>
                                        ))}
                                        {(!audit.asesorHistory || audit.asesorHistory.length === 0) && (
                                            <p className="text-sm text-gray-500 pl-4">No hay historial de cambios de asesor</p>
                                        )}
                                    </div>
                                </div>

                                {/* Comments History */}
                                <div>
                                    <h3 className={cn("text-sm font-semibold mb-3 flex items-center gap-2", theme === "dark" ? "text-white" : "text-gray-800")}>
                                        <MessageSquare className="w-4 h-4" />
                                        Historial de Comentarios
                                    </h3>
                                    <div className="space-y-3 pl-2 border-l-2 border-gray-200 dark:border-white/10">
                                        {audit.datosExtraHistory?.slice().reverse().map((entry, idx) => (
                                            <div key={idx} className="relative pl-4 pb-2">
                                                <div className={cn(
                                                    "absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2",
                                                    theme === "dark" ? "bg-gray-900 border-green-500" : "bg-white border-green-500"
                                                )} />
                                                <p className={cn("text-sm font-medium", theme === "dark" ? "text-gray-200" : "text-gray-800")}>
                                                    {entry.value}
                                                </p>
                                                <p className={cn("text-xs", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                                                    {entry.updatedBy?.nombre || "Sistema"} - {new Date(entry.updatedAt).toLocaleString()}
                                                </p>
                                            </div>
                                        ))}
                                        {(!audit.datosExtraHistory || audit.datosExtraHistory.length === 0) && (
                                            <p className="text-sm text-gray-500 pl-4">No hay historial de comentarios</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </fieldset>
                </div>

                {/* Footer */}
                <div className={cn(
                    "px-6 py-4 border-t flex justify-end gap-3",
                    theme === "dark" ? "border-white/10" : "border-gray-100"
                )}>
                    <button
                        onClick={onClose}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                            theme === "dark" ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-600"
                        )}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-2",
                            loading ? "opacity-50 cursor-not-allowed" : "hover:opacity-90",
                            "bg-purple-600"
                        )}
                    >
                        <Save className="w-4 h-4" />
                        {loading ? "Guardando..." : "Guardar Cambios"}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}
