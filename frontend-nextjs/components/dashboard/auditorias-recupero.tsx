/**
 * ============================================================
 * RECUPERO DE AUDITORÍAS (auditorias-recupero.tsx)
 * ============================================================
 * Gestión de auditorías marcadas para recuperación.
 * Muestra ventas fallidas que pueden ser reasignadas.
 */

"use client"

import { useState, useEffect } from "react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import {
    Search, Filter, Calendar, Download, RefreshCw,
    Clock, User, Phone, Edit2, Trash2
} from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { RecoveryEditModal } from "./recovery-edit-modal"

/* Helper para colores de estado */
const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
        "Mensaje enviado": "bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800",
        "En videollamada": "bg-blue-600 text-white border-blue-700",
        "Rechazada": "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
        "Falta documentación": "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800",
        "Falta clave": "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800",
        "Reprogramada": "bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800",
        "Completa": "bg-lime-600 text-white border-lime-700",
        "QR hecho": "bg-green-600 text-white border-green-700",
        "No atendió": "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
        "Tiene dudas": "bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800",
        "Falta clave y documentación": "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800",
        "No le llegan los mensajes": "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
        "Cortó": "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
        "Autovinculación": "bg-amber-700 text-white border-amber-800",
        "Caída": "bg-red-600 text-white border-red-700",
        "Pendiente": "bg-gray-200 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
        "Rehacer vídeo": "bg-red-300 text-red-900 border-red-400 dark:bg-red-900/50 dark:text-red-200 dark:border-red-800",
        "Cargada": "bg-indigo-600 text-white border-indigo-700",
        "Contactado": "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
        "Cerrado": "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
        "Rechazo": "bg-red-200 text-red-900 border-red-400 dark:bg-red-900/40 dark:text-red-200 dark:border-red-800",
    }
    return statusColors[status] || "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
}

export function AuditoriasRecupero() {
    const { theme } = useTheme()

    // State
    const [items, setItems] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [filters, setFilters] = useState({
        afiliado: "",
        cuil: "",
        obraVendida: "",
        estado: "",
        dateFrom: "",
        dateTo: ""
    })
    const [selectedAudit, setSelectedAudit] = useState<any>(null)
    const [showModal, setShowModal] = useState(false)

    // Fetch Data
    const loadData = async () => {
        try {
            setLoading(true)
            const { data } = await api.recovery.list()
            setItems(Array.isArray(data) ? data : [])
        } catch (err) {
            console.error(err)
            toast.error("Error al cargar recuperación")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    // Filter Logic
    const filteredItems = items.filter(item => {
        const created = new Date(item.createdAt || item.statusUpdatedAt || 0)

        if (filters.dateFrom) {
            const from = new Date(filters.dateFrom + "T00:00:00")
            if (created < from) return false
        }
        if (filters.dateTo) {
            const to = new Date(filters.dateTo + "T23:59:59")
            if (created > to) return false
        }
        if (filters.afiliado && !item.nombre?.toLowerCase().includes(filters.afiliado.toLowerCase())) return false
        if (filters.cuil && !item.cuil?.includes(filters.cuil)) return false
        if (filters.obraVendida && item.obraSocialVendida !== filters.obraVendida) return false
        if (filters.estado && item.status !== filters.estado) return false

        return true
    })

    // Handlers
    const handleEdit = (audit: any) => {
        setSelectedAudit(audit)
        setShowModal(true)
    }

    const handleSave = (updatedAudit: any, deletedId?: string) => {
        if (deletedId) {
            setItems(prev => prev.filter(i => i._id !== deletedId))
        } else if (updatedAudit) {
            setItems(prev => prev.map(i => i._id === updatedAudit._id ? updatedAudit : i))
        }
    }

    const getTimeInStatus = (dateStr?: string) => {
        if (!dateStr) return "-"
        const hours = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60))
        const days = Math.floor(hours / 24)
        if (days > 0) return `${days}d ${hours % 24}h`
        return `${hours}h`
    }

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Sección de filtros */}
            <div className={cn(
                "rounded-2xl border p-4 shadow-sm",
                theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-gray-200"
            )}>
                <div className="flex items-center gap-2 mb-4 text-sm font-medium opacity-70">
                    <Filter className="w-4 h-4" />
                    Filtros de Búsqueda
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar afiliado..."
                            value={filters.afiliado}
                            onChange={(e) => setFilters({ ...filters, afiliado: e.target.value })}
                            className={cn(
                                "w-full pl-9 pr-3 py-2 rounded-lg border text-sm",
                                theme === "dark" ? "bg-black/20 border-white/10 text-white" : "bg-white border-gray-200"
                            )}
                        />
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar CUIL..."
                            value={filters.cuil}
                            onChange={(e) => setFilters({ ...filters, cuil: e.target.value })}
                            className={cn(
                                "w-full pl-9 pr-3 py-2 rounded-lg border text-sm",
                                theme === "dark" ? "bg-black/20 border-white/10 text-white" : "bg-white border-gray-200"
                            )}
                        />
                    </div>

                    <select
                        value={filters.obraVendida}
                        onChange={(e) => setFilters({ ...filters, obraVendida: e.target.value })}
                        className={cn(
                            "w-full px-3 py-2 rounded-lg border text-sm",
                            theme === "dark" ? "bg-black/20 border-white/10 text-white" : "bg-white border-gray-200"
                        )}
                    >
                        <option value="">Todas las Obras Sociales</option>
                        <option value="Binimed">Binimed</option>
                        <option value="Meplife">Meplife</option>
                        <option value="TURF">TURF</option>
                    </select>

                    <select
                        value={filters.estado}
                        onChange={(e) => setFilters({ ...filters, estado: e.target.value })}
                        className={cn(
                            "w-full px-3 py-2 rounded-lg border text-sm",
                            theme === "dark" ? "bg-black/20 border-white/10 text-white" : "bg-white border-gray-200"
                        )}
                    >
                        <option value="">Todos los Estados</option>
                        <option value="Pendiente">Pendiente</option>
                        <option value="Contactado">Contactado</option>
                        <option value="Cargada">Cargada</option>
                        <option value="Falta clave">Falta clave</option>
                        <option value="Falta documentación">Falta documentación</option>
                        <option value="Completa">Completa</option>
                        <option value="QR hecho">QR hecho</option>
                        <option value="Aprobada">Aprobada</option>
                        <option value="Rechazó">Rechazó</option>
                        <option value="Cortó">Cortó</option>
                        <option value="Autovinculación">Autovinculación</option>
                        <option value="Caída">Caída</option>
                    </select>
                </div>

                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-dashed border-gray-200 dark:border-white/10">
                    <div className="flex items-center gap-2">
                        <span className="text-xs opacity-70">Desde:</span>
                        <input
                            type="date"
                            value={filters.dateFrom}
                            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                            className={cn(
                                "px-2 py-1 rounded border text-xs",
                                theme === "dark" ? "bg-black/20 border-white/10 text-white" : "bg-white border-gray-200"
                            )}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs opacity-70">Hasta:</span>
                        <input
                            type="date"
                            value={filters.dateTo}
                            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                            className={cn(
                                "px-2 py-1 rounded border text-xs",
                                theme === "dark" ? "bg-black/20 border-white/10 text-white" : "bg-white border-gray-200"
                            )}
                        />
                    </div>
                    <div className="ml-auto flex gap-2">
                        <button
                            onClick={() => setFilters({ afiliado: "", cuil: "", obraVendida: "", estado: "", dateFrom: "", dateTo: "" })}
                            className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                        >
                            Limpiar Filtros
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabla de recupero */}
            <div className={cn(
                "rounded-2xl border shadow-sm overflow-hidden",
                theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-gray-200"
            )}>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead className={cn(
                            "text-left font-semibold uppercase tracking-wider sticky top-0 z-10",
                            theme === "dark" ? "bg-gray-900 text-gray-300" : "bg-gray-50 text-gray-600"
                        )}>
                            <tr>
                                <th className="px-2 py-2 w-[80px]">Tiempo</th>
                                <th className="px-2 py-2 w-[80px]">Inicio</th>
                                <th className="px-2 py-2 min-w-[150px]">Afiliado</th>
                                <th className="px-2 py-2 w-[100px]">CUIL</th>
                                <th className="px-2 py-2 w-[100px]">Teléfono</th>
                                <th className="px-2 py-2 w-[80px]">O.Social</th>
                                <th className="px-2 py-2 min-w-[100px]">Asesor</th>
                                <th className="px-2 py-2 min-w-[100px]">Supervisor</th>
                                <th className="px-2 py-2 w-[60px]">Grupo</th>
                                <th className="px-2 py-2 min-w-[100px]">Admin</th>
                                <th className="px-2 py-2 min-w-[120px]">Estado</th>
                                <th className="px-2 py-2 w-[60px] text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={12} className="px-4 py-8 text-center opacity-50">
                                        <div className="flex justify-center items-center gap-2">
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            Cargando datos...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={12} className="px-4 py-8 text-center opacity-50">
                                        No se encontraron registros
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map((item, idx) => (
                                    <tr
                                        key={item._id}
                                        className={cn(
                                            "transition-colors group",
                                            theme === "dark" ? "hover:bg-white/5" : "hover:bg-gray-50",
                                            idx % 2 === 0 ? "" : theme === "dark" ? "bg-white/[0.02]" : "bg-gray-50/50"
                                        )}
                                    >
                                        <td className="px-2 py-1.5 whitespace-nowrap">
                                            <div className="flex items-center gap-1 text-[10px] font-medium text-orange-500">
                                                <Clock className="w-3 h-3" />
                                                {getTimeInStatus(item.statusUpdatedAt)}
                                            </div>
                                        </td>
                                        <td className="px-2 py-1.5 whitespace-nowrap opacity-70">
                                            {item.scheduledAt ? new Date(item.scheduledAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) : '-'}
                                        </td>
                                        <td className="px-2 py-1.5 font-medium truncate max-w-[150px]" title={item.nombre}>
                                            {item.nombre}
                                        </td>
                                        <td className="px-2 py-1.5 whitespace-nowrap font-mono opacity-70 truncate">
                                            {item.cuil}
                                        </td>
                                        <td className="px-2 py-1.5 whitespace-nowrap font-mono opacity-70 truncate">
                                            {item.telefono}
                                        </td>
                                        <td className="px-2 py-1.5 whitespace-nowrap">
                                            <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 truncate max-w-[80px]">
                                                {item.obraSocialVendida}
                                            </span>
                                        </td>
                                        <td className="px-2 py-1.5 truncate max-w-[100px]" title={item.asesor?.nombre || item.asesor?.email}>
                                            {item.asesor?.nombre || item.asesor?.email || '-'}
                                        </td>
                                        <td className="px-2 py-1.5 truncate max-w-[100px]" title={item.asesor?.supervisor?.nombre}>
                                            {item.asesor?.supervisor?.nombre || '-'}
                                        </td>
                                        <td className="px-2 py-1.5 text-center">
                                            <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                                                {item.asesor?.numeroEquipo || '-'}
                                            </span>
                                        </td>
                                        <td className="px-2 py-1.5 truncate max-w-[100px]" title={item.administrador?.nombre}>
                                            {item.administrador?.nombre || '-'}
                                        </td>
                                        <td className="px-2 py-1.5 whitespace-nowrap">
                                            <span className={cn(
                                                "inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border truncate max-w-[120px]",
                                                getStatusColor(item.status)
                                            )} title={item.status}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="px-2 py-1.5 text-center">
                                            <button
                                                onClick={() => handleEdit(item)}
                                                className="p-1 text-purple-600 hover:bg-purple-50 rounded transition-colors dark:text-purple-400 dark:hover:bg-purple-900/20 opacity-0 group-hover:opacity-100"
                                                title="Editar"
                                            >
                                                <Edit2 className="w-3 h-3" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de edición */}
            {showModal && selectedAudit && (
                <RecoveryEditModal
                    audit={selectedAudit}
                    onClose={() => setShowModal(false)}
                    onSave={handleSave}
                />
            )}
        </div>
    )
}
