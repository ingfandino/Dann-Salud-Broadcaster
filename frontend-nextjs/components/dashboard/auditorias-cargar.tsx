/**
 * ============================================================
 * CARGAR AUDITORÍAS (auditorias-cargar.tsx)
 * ============================================================
 * Formulario para cargar auditorías (ventas) individuales.
 * Permite ingresar datos del afiliado y programar turnos.
 */

"use client"

import { useState, useEffect, useRef } from "react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import {
    Calendar, Clock, User, FileText, Upload, CheckCircle2,
    AlertCircle, Search, Users, Building2, Phone, CreditCard
} from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth"
import * as XLSX from "xlsx"

/* Constantes: Obras sociales argentinas */
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
    "OSPMA (700108)"
]

const OBRAS_VENDIDAS = ["Binimed", "Meplife", "TURF"]

interface User {
    _id: string
    nombre: string
    email: string
    role: string
    numeroEquipo?: string
    active?: boolean
}

export function AuditoriasCargar() {
    const { theme } = useTheme()
    const { user } = useAuth()

    // Form State
    const [form, setForm] = useState({
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
    })

    // Lists State
    const [asesores, setAsesores] = useState<User[]>([])
    const [supervisores, setSupervisores] = useState<User[]>([])
    const [validadores, setValidadores] = useState<User[]>([])
    const [availableSlots, setAvailableSlots] = useState<string[]>([])

    // UI State
    const [loading, setLoading] = useState(false)
    const [loadingSlots, setLoadingSlots] = useState(false)
    const [otroEquipo, setOtroEquipo] = useState(false)
    const [uploadingBulk, setUploadingBulk] = useState(false)
    const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 })
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Roles
    const isSupervisor = user?.role === "Supervisor" || user?.role === "supervisor" || user?.role === "encargado" || user?.role === "Encargado"
    const isGerenciaOrAuditor =
        user?.role === "Gerencia" || user?.role === "gerencia" ||
        user?.role === "Auditor" || user?.role === "auditor" ||
        user?.role === "Admin" || user?.role === "admin"

    // Fetch Data Functions
    const fetchSupervisores = async () => {
        try {
            const { data } = await api.users.list()
            const list = Array.isArray(data) ? data : []
            const filtered = list
                .filter((u: User) => {
                    const isActive = u?.active !== false
                    return isActive && ["supervisor", "Supervisor", "encargado", "Encargado", "supervisor_reventa"].includes(u.role) && u.nombre
                })
                .sort((a: User, b: User) => a.nombre.localeCompare(b.nombre))
            setSupervisores(filtered)
        } catch (err) {
            console.error(err)
            toast.error("Error al cargar supervisores")
        }
    }

    const fetchAsesores = async (numeroEquipo?: string) => {
        try {
            const { data } = await api.users.list() // In real implementation, use scope=group if needed
            const list = Array.isArray(data) ? data : []

            const targetTeam = numeroEquipo || user?.numeroEquipo
            if (!targetTeam) return

            const filtered = list
                .filter((u: User) => {
                    const isActive = u?.active !== false
                    const isCorrectRole = ["asesor", "auditor", "supervisor", "encargado"].includes(u.role?.toLowerCase())
                    const isSameTeam = String(u.numeroEquipo) === String(targetTeam)
                    return isActive && isCorrectRole && isSameTeam && u.nombre
                })
                .sort((a: User, b: User) => a.nombre.localeCompare(b.nombre))
            setAsesores(filtered)
        } catch (err) {
            console.error(err)
        }
    }

    const fetchValidadores = async (numeroEquipo?: string, showAll = false) => {
        try {
            const { data } = await api.users.list()
            const list = Array.isArray(data) ? data : []

            const targetTeam = numeroEquipo || user?.numeroEquipo

            const filtered = list
                .filter((u: User) => {
                    const isActive = u?.active !== false
                    if (!isActive || !u.nombre) return false

                    // If showing all, filter by role only
                    if (showAll) {
                        return ["asesor", "supervisor", "auditor", "gerencia"].includes(u.role?.toLowerCase())
                    }

                    // Filter by team
                    if (targetTeam && String(u.numeroEquipo) !== String(targetTeam)) return false

                    // Exclude selected advisor
                    if (form.asesor && u._id === form.asesor) return false

                    // Exclude current user unless supervisor
                    if (!isSupervisor && u._id === user?._id) return false

                    return true
                })
                .sort((a: User, b: User) => a.nombre.localeCompare(b.nombre))
            setValidadores(filtered)
        } catch (err) {
            console.error(err)
        }
    }

    // Effects
    useEffect(() => {
        if (isSupervisor) fetchAsesores()
        if (isGerenciaOrAuditor) fetchSupervisores()
        if (!isGerenciaOrAuditor) fetchValidadores()
    }, [isSupervisor, isGerenciaOrAuditor])

    useEffect(() => {
        if (isGerenciaOrAuditor && form.supervisor) {
            const supervisor = supervisores.find(s => s._id === form.supervisor)
            if (supervisor?.numeroEquipo) {
                fetchAsesores(supervisor.numeroEquipo)
                fetchValidadores(supervisor.numeroEquipo, otroEquipo)
            }
        }
    }, [form.supervisor, isGerenciaOrAuditor, otroEquipo])

    useEffect(() => {
        if (otroEquipo) {
            fetchValidadores(undefined, true)
        } else if (isSupervisor) {
            fetchValidadores()
        } else if (isGerenciaOrAuditor && form.supervisor) {
            const supervisor = supervisores.find(s => s._id === form.supervisor)
            if (supervisor?.numeroEquipo) {
                fetchValidadores(supervisor.numeroEquipo)
            }
        } else if (!isGerenciaOrAuditor && !isSupervisor) {
            fetchValidadores()
        }
    }, [form.asesor, otroEquipo])

    // Handlers
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!form.nombre || !form.cuil || !form.telefono || !form.obraSocialAnterior || !form.fecha || !form.hora) {
            toast.error("Por favor complete todos los campos obligatorios")
            return
        }

        try {
            setLoading(true)

            // Construct payload based on role
            const payload: any = {
                ...form,
                scheduledAt: `${form.fecha}T${form.hora}:00.000Z` // Simple ISO construction
            }

            if (!isGerenciaOrAuditor && !isSupervisor) {
                payload.asesor = user?._id
            }

            await api.audits.create(payload)
            toast.success("Auditoría cargada exitosamente")

            // Reset form
            setForm({
                ...form,
                nombre: "",
                cuil: "",
                telefono: "",
                obraSocialAnterior: "",
                datosExtra: ""
            })
        } catch (err) {
            console.error(err)
            toast.error("Error al cargar auditoría")
        } finally {
            setLoading(false)
        }
    }

    const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            setUploadingBulk(true)
            const reader = new FileReader()

            reader.onload = async (evt) => {
                const bstr = evt.target?.result
                const wb = XLSX.read(bstr, { type: "binary" })
                const wsname = wb.SheetNames[0]
                const ws = wb.Sheets[wsname]
                const data = XLSX.utils.sheet_to_json(ws)

                setBulkProgress({ current: 0, total: data.length })

                let successCount = 0
                let errorCount = 0

                for (let i = 0; i < data.length; i++) {
                    try {
                        const row: any = data[i]
                        // Map row data to payload
                        // Implementation details omitted for brevity - would map fields here
                        await api.audits.create(row)
                        successCount++
                    } catch (err) {
                        errorCount++
                    }
                    setBulkProgress(prev => ({ ...prev, current: i + 1 }))
                }

                toast.success(`Carga masiva completada: ${successCount} exitosos, ${errorCount} fallidos`)
            }

            reader.readAsBinaryString(file)
        } catch (err) {
            console.error(err)
            toast.error("Error en carga masiva")
        } finally {
            setUploadingBulk(false)
            if (fileInputRef.current) fileInputRef.current.value = ""
        }
    }

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className={cn(
                "rounded-2xl border p-6",
                theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-gray-200 shadow-sm"
            )}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className={cn("text-lg font-semibold", theme === "dark" ? "text-white" : "text-gray-800")}>
                        Cargar Nueva Auditoría
                    </h2>
                    <div className="flex gap-2">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleBulkUpload}
                            className="hidden"
                            accept=".xlsx,.xls,.csv"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingBulk}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                                theme === "dark"
                                    ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                                    : "bg-green-100 text-green-700 hover:bg-green-200"
                            )}
                        >
                            <Upload className="w-4 h-4" />
                            {uploadingBulk ? `Cargando (${bulkProgress.current}/${bulkProgress.total})` : "Carga Masiva"}
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Selección según rol del usuario */}
                    {(isGerenciaOrAuditor || isSupervisor) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-gray-50 dark:bg-white/5">
                            {isGerenciaOrAuditor && (
                                <div>
                                    <label className="block text-sm font-medium mb-1">Supervisor</label>
                                    <select
                                        value={form.supervisor}
                                        onChange={(e) => setForm({ ...form, supervisor: e.target.value })}
                                        className={cn(
                                            "w-full px-3 py-2 rounded-lg border text-sm",
                                            theme === "dark" ? "bg-black/20 border-white/10 text-white" : "bg-white border-gray-200"
                                        )}
                                    >
                                        <option value="">Seleccionar Supervisor</option>
                                        {supervisores.map(s => (
                                            <option key={s._id} value={s._id}>{s.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium mb-1">Asesor</label>
                                <select
                                    value={form.asesor}
                                    onChange={(e) => setForm({ ...form, asesor: e.target.value })}
                                    className={cn(
                                        "w-full px-3 py-2 rounded-lg border text-sm",
                                        theme === "dark" ? "bg-black/20 border-white/10 text-white" : "bg-white border-gray-200"
                                    )}
                                >
                                    <option value="">Seleccionar Asesor</option>
                                    {asesores.map(a => (
                                        <option key={a._id} value={a._id}>{a.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Formulario principal */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Nombre y Apellido</label>
                            <div className="relative">
                                <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={form.nombre}
                                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                                    className={cn(
                                        "w-full pl-9 pr-3 py-2 rounded-lg border text-sm",
                                        theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200"
                                    )}
                                    placeholder="Nombre completo"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">CUIL</label>
                            <div className="relative">
                                <CreditCard className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={form.cuil}
                                    onChange={(e) => setForm({ ...form, cuil: e.target.value })}
                                    className={cn(
                                        "w-full pl-9 pr-3 py-2 rounded-lg border text-sm",
                                        theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200"
                                    )}
                                    placeholder="Sin guiones"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Teléfono</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={form.telefono}
                                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                                    className={cn(
                                        "w-full pl-9 pr-3 py-2 rounded-lg border text-sm",
                                        theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200"
                                    )}
                                    placeholder="Cod. área + número"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Obra Social Anterior</label>
                            <select
                                value={form.obraSocialAnterior}
                                onChange={(e) => setForm({ ...form, obraSocialAnterior: e.target.value })}
                                className={cn(
                                    "w-full px-3 py-2 rounded-lg border text-sm",
                                    theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200"
                                )}
                            >
                                <option value="">Seleccionar...</option>
                                {ARGENTINE_OBRAS_SOCIALES.map(os => (
                                    <option key={os} value={os}>{os}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Obra Social Vendida</label>
                            <select
                                value={form.obraSocialVendida}
                                onChange={(e) => setForm({ ...form, obraSocialVendida: e.target.value })}
                                className={cn(
                                    "w-full px-3 py-2 rounded-lg border text-sm",
                                    theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200"
                                )}
                            >
                                {OBRAS_VENDIDAS.map(os => (
                                    <option key={os} value={os}>{os}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Tipo de Venta</label>
                            <select
                                value={form.tipoVenta}
                                onChange={(e) => setForm({ ...form, tipoVenta: e.target.value })}
                                className={cn(
                                    "w-full px-3 py-2 rounded-lg border text-sm",
                                    theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200"
                                )}
                            >
                                <option value="alta">Alta</option>
                                <option value="cambio">Cambio</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Fecha Auditoría</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                <input
                                    type="date"
                                    value={form.fecha}
                                    onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                                    className={cn(
                                        "w-full pl-9 pr-3 py-2 rounded-lg border text-sm",
                                        theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200"
                                    )}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Hora</label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                <input
                                    type="time"
                                    value={form.hora}
                                    onChange={(e) => setForm({ ...form, hora: e.target.value })}
                                    className={cn(
                                        "w-full pl-9 pr-3 py-2 rounded-lg border text-sm",
                                        theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200"
                                    )}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Validador</label>
                            <select
                                value={form.validador}
                                onChange={(e) => setForm({ ...form, validador: e.target.value })}
                                className={cn(
                                    "w-full px-3 py-2 rounded-lg border text-sm",
                                    theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200"
                                )}
                            >
                                <option value="">Seleccionar Validador</option>
                                {validadores.map(v => (
                                    <option key={v._id} value={v._id}>{v.nombre}</option>
                                ))}
                            </select>
                            <div className="mt-2 flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="otroEquipo"
                                    checked={otroEquipo}
                                    onChange={(e) => setOtroEquipo(e.target.checked)}
                                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                />
                                <label htmlFor="otroEquipo" className="text-xs text-gray-500">
                                    Ver validadores de otros equipos
                                </label>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Datos Extra / Comentarios</label>
                        <textarea
                            value={form.datosExtra}
                            onChange={(e) => setForm({ ...form, datosExtra: e.target.value })}
                            rows={3}
                            className={cn(
                                "w-full px-3 py-2 rounded-lg border text-sm resize-none",
                                theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200"
                            )}
                            placeholder="Información adicional relevante..."
                        />
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className={cn(
                                "px-6 py-2 rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-2",
                                loading ? "opacity-50 cursor-not-allowed" : "hover:opacity-90",
                                theme === "dark" ? "bg-purple-600" : "bg-purple-600"
                            )}
                        >
                            {loading ? "Cargando..." : "Cargar Auditoría"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
