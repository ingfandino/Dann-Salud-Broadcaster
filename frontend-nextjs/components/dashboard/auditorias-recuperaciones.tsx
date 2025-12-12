"use client"

import { useState, useEffect, useMemo } from "react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import { Filter, Pencil, Clock, RefreshCw } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { RecoveryEditModal } from "./recovery-edit-modal"

const STATUS_COLORS: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
  Pendiente: { bg: "bg-gray-100", text: "text-gray-700", darkBg: "bg-gray-500/20", darkText: "text-gray-400" },
  "Falta clave": { bg: "bg-yellow-100", text: "text-yellow-700", darkBg: "bg-yellow-500/20", darkText: "text-yellow-400" },
  Rechazada: { bg: "bg-red-100", text: "text-red-700", darkBg: "bg-red-500/20", darkText: "text-red-400" },
  Completa: { bg: "bg-green-100", text: "text-green-700", darkBg: "bg-green-500/20", darkText: "text-green-400" },
  "QR hecho": { bg: "bg-blue-100", text: "text-blue-700", darkBg: "bg-blue-500/20", darkText: "text-blue-400" }
}

export function AuditoriasRecuperaciones() {
  const { theme } = useTheme()

  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    afiliado: "",
    cuil: "",
    obraSocialVendida: "",
    estado: "",
    fechaDesde: "",
    fechaHasta: ""
  })

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedRecuperacion, setSelectedRecuperacion] = useState<any>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      // ✅ Fetch all audits without date restriction for Recovery view
      const { data } = await api.audits.list({ ignoreDate: true })
      setItems(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
      toast.error("Error al cargar recuperaciones")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredItems = useMemo(() => {
    const STATUSES_TO_SHOW = ["Falta clave", "Falta documentación", "Falta clave y documentación", "Pendiente"]

    return items.filter(item => {
      // Must be in one of the allowed statuses
      if (!STATUSES_TO_SHOW.includes(item.status)) return false

      // Apply user filters
      if (filters.afiliado && !item.nombre?.toLowerCase().includes(filters.afiliado.toLowerCase())) return false
      if (filters.cuil && !item.cuil?.includes(filters.cuil)) return false
      if (filters.obraSocialVendida && item.obraSocialVendida !== filters.obraSocialVendida) return false
      if (filters.estado && item.status !== filters.estado) return false

      if (filters.fechaDesde) {
        const itemDate = new Date(item.statusUpdatedAt || item.scheduledAt || item.createdAt)
        const dateStr = itemDate.toISOString().split('T')[0]
        if (dateStr < filters.fechaDesde) return false
      }
      if (filters.fechaHasta) {
        const itemDate = new Date(item.statusUpdatedAt || item.scheduledAt || item.createdAt)
        const dateStr = itemDate.toISOString().split('T')[0]
        if (dateStr > filters.fechaHasta) return false
      }

      return true
    }).sort((a, b) => new Date(a.scheduledAt || a.createdAt).getTime() - new Date(b.scheduledAt || b.createdAt).getTime())
  }, [items, filters])

  const calculateTimeElapsed = (date: string) => {
    const now = new Date()
    const start = new Date(date)
    const diffMs = now.getTime() - start.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) {
      return `${diffDays}d ${diffHours % 24}h`
    }
    return `${diffHours}h`
  }

  const getTimeColor = (hours: string) => {
    const h = parseInt(hours)
    if (h < 16) return "text-green-500"
    if (h < 20) return "text-yellow-500"
    if (h < 24) return "text-orange-500"
    return "text-red-500"
  }

  const openEditModal = (item: any) => {
    setSelectedRecuperacion(item)
    setEditModalOpen(true)
  }

  const handleSave = (updatedAudit: any | null, deletedId?: string) => {
    if (deletedId) {
      setItems(prev => prev.filter(item => item._id !== deletedId))
    } else if (updatedAudit) {
      setItems(prev => prev.map(item => item._id === updatedAudit._id ? updatedAudit : item))
    }
  }

  const clearFilters = () => {
    setFilters({
      afiliado: "",
      cuil: "",
      obraSocialVendida: "",
      estado: "",
      fechaDesde: "",
      fechaHasta: ""
    })
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Filters */}
      <div className={cn(
        "rounded-2xl border p-6 backdrop-blur-sm",
        theme === "dark" ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10" : "bg-white border-gray-200 shadow-sm"
      )}>
        <div className="flex items-center gap-2 mb-4">
          <Filter className={cn("w-5 h-5", theme === "dark" ? "text-purple-400" : "text-purple-500")} />
          <h3 className={cn("font-semibold", theme === "dark" ? "text-white" : "text-gray-800")}>Filtros</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
          <input
            type="text"
            placeholder="Buscar afiliado..."
            value={filters.afiliado}
            onChange={(e) => setFilters({ ...filters, afiliado: e.target.value })}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm",
              theme === "dark" ? "bg-white/5 border-white/10 text-white placeholder-gray-500" : "bg-white border-gray-200 text-gray-800 placeholder-gray-400"
            )}
          />
          <input
            type="text"
            placeholder="Buscar CUIL..."
            value={filters.cuil}
            onChange={(e) => setFilters({ ...filters, cuil: e.target.value })}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm",
              theme === "dark" ? "bg-white/5 border-white/10 text-white placeholder-gray-500" : "bg-white border-gray-200 text-gray-800 placeholder-gray-400"
            )}
          />
          <select
            value={filters.obraSocialVendida}
            onChange={(e) => setFilters({ ...filters, obraSocialVendida: e.target.value })}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm",
              theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"
            )}
          >
            <option value="">Todas las Obras Sociales</option>
            <option value="Binimed">Binimed</option>
            <option value="Meplife">Meplife</option>
            <option value="TURF">TURF</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select
            value={filters.estado}
            onChange={(e) => setFilters({ ...filters, estado: e.target.value })}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm",
              theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"
            )}
          >
            <option value="">Todos los Estados</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Falta clave">Falta clave</option>
            <option value="Rechazada">Rechazada</option>
            <option value="Completa">Completa</option>
          </select>
          <input
            type="date"
            placeholder="Desde"
            value={filters.fechaDesde}
            onChange={(e) => setFilters({ ...filters, fechaDesde: e.target.value })}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm",
              theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"
            )}
          />
          <input
            type="date"
            placeholder="Hasta"
            value={filters.fechaHasta}
            onChange={(e) => setFilters({ ...filters, fechaHasta: e.target.value })}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm",
              theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"
            )}
          />
          <button
            onClick={clearFilters}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              theme === "dark" ? "bg-white/10 hover:bg-white/20 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            )}
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Table */}
      <div className={cn(
        "rounded-2xl border overflow-hidden",
        theme === "dark" ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10" : "bg-white border-gray-200 shadow-sm"
      )}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className={theme === "dark" ? "bg-white/5" : "bg-gray-50"}>
              <tr>
                {["TIEMPO", "INICIO", "AFILIADO", "CUIL", "TELÉFONO", "O.SOCIAL", "ASESOR", "SUPERVISOR", "GRUPO", "ADMIN", "ESTADO", ""].map(header => (
                  <th key={header} className={cn("px-3 py-3 text-left font-semibold whitespace-nowrap", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center opacity-50">
                    <div className="flex justify-center items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Cargando...
                    </div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center opacity-50">
                    No se encontraron recuperaciones
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => {
                  const estadoStyle = STATUS_COLORS[item.status] || STATUS_COLORS["Pendiente"]
                  const timeElapsed = calculateTimeElapsed(item.statusUpdatedAt || item.scheduledAt || item.createdAt)
                  const timeColor = getTimeColor(timeElapsed)

                  return (
                    <tr key={item._id} className={cn(
                      "border-t transition-colors",
                      theme === "dark" ? "border-white/5 hover:bg-white/5" : "border-gray-100 hover:bg-gray-50"
                    )}>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <Clock className={cn("w-4 h-4", timeColor)} />
                          <span className={cn("font-medium", timeColor)}>{timeElapsed}</span>
                        </div>
                      </td>
                      <td className={cn("px-3 py-3 whitespace-nowrap", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                        {item.scheduledAt ? new Date(item.scheduledAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) : '-'}
                      </td>
                      <td className={cn("px-3 py-3 font-medium", theme === "dark" ? "text-white" : "text-gray-800")}>
                        {item.nombre}
                      </td>
                      <td className={cn("px-3 py-3 whitespace-nowrap", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                        {item.cuil}
                      </td>
                      <td className={cn("px-3 py-3 whitespace-nowrap", theme === "dark" ? "text-cyan-400" : "text-cyan-600")}>
                        {item.telefono}
                      </td>
                      <td className="px-3 py-3">
                        <span className={cn(
                          "px-2 py-1 rounded text-xs font-medium",
                          item.obraSocialVendida === "Binimed"
                            ? theme === "dark" ? "bg-green-500/20 text-green-300" : "bg-green-100 text-green-700"
                            : theme === "dark" ? "bg-pink-500/20 text-pink-300" : "bg-pink-100 text-pink-700"
                        )}>
                          {item.obraSocialVendida}
                        </span>
                      </td>
                      <td className={cn("px-3 py-3 whitespace-nowrap", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                        {item.asesor?.nombre || '-'}
                      </td>
                      <td className="px-3 py-3">
                        <span className={cn(
                          "px-2 py-1 rounded text-xs font-medium",
                          theme === "dark" ? "bg-cyan-500/20 text-cyan-300" : "bg-cyan-100 text-cyan-700"
                        )}>
                          {item.asesor?.supervisor?.nombre || '-'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={cn(
                          "px-2 py-1 rounded text-xs font-medium",
                          theme === "dark" ? "bg-orange-500/20 text-orange-300" : "bg-orange-100 text-orange-700"
                        )}>
                          {item.asesor?.numeroEquipo || '-'}
                        </span>
                      </td>
                      <td className={cn("px-3 py-3 whitespace-nowrap", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                        {item.administrador?.nombre || '-'}
                      </td>
                      <td className="px-3 py-3">
                        <span className={cn(
                          "px-2 py-1 rounded text-xs font-medium whitespace-nowrap",
                          theme === "dark" ? estadoStyle.darkBg : estadoStyle.bg,
                          theme === "dark" ? estadoStyle.darkText : estadoStyle.text
                        )}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => openEditModal(item)}
                          className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            theme === "dark" ? "hover:bg-purple-500/20 text-purple-400" : "hover:bg-purple-50 text-purple-600"
                          )}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editModalOpen && selectedRecuperacion && (
        <RecoveryEditModal
          audit={selectedRecuperacion}
          onClose={() => setEditModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
