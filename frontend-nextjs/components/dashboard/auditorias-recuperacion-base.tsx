/**
 * ============================================================
 * AUDITORÍAS RECUPERACIÓN BASE (auditorias-recuperacion-base.tsx)
 * ============================================================
 * Componente base reutilizable para las interfaces de recuperación:
 * - Falta clave
 * - Rechazada
 * - Pendiente
 * - AFIP y Padrón
 * 
 * Permisos:
 * - Borrar → solo Gerencia
 * - Editar → Recuperador y Gerencia
 */

"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { createPortal } from "react-dom"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import {
  Filter, Download, Pencil, Trash2, X, ChevronDown, RefreshCw
} from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth"
import * as XLSX from "xlsx"
import { AuditEditModal } from "./audit-edit-modal"
import { connectSocket } from "@/lib/socket"

/* Tipos de interfaz */
export type RecuperacionType = 
  | "falta-clave" 
  | "rechazada" 
  | "pendiente" 
  | "afip-padron"

interface RecuperacionConfig {
  title: string
  description: string
  statusFilters: string[]
  defaultSort: "asc" | "desc"
  requireDisponibleParaVenta?: boolean
}

const INTERFACE_CONFIG: Record<RecuperacionType, RecuperacionConfig> = {
  "falta-clave": {
    title: "Falta Clave",
    description: "Ventas con estado 'Falta clave'",
    statusFilters: ["Falta clave"],
    defaultSort: "asc", // más antiguas primero
  },
  "rechazada": {
    title: "Rechazada",
    description: "Ventas con estado 'Rechazada'",
    statusFilters: ["Rechazada"],
    defaultSort: "desc",
  },
  "pendiente": {
    title: "Pendiente",
    description: "Ventas con estado 'Pendiente' o 'Falta documentación'",
    statusFilters: ["Pendiente", "Falta documentación"],
    defaultSort: "desc",
  },
  "afip-padron": {
    title: "AFIP y Padrón",
    description: "Ventas con estado 'AFIP' o 'Padrón' disponibles para venta",
    statusFilters: ["AFIP", "Padrón"],
    defaultSort: "desc",
    requireDisponibleParaVenta: true,
  },
}

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
    supervisor?: {
      nombre: string
    }
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
  }
  isRecuperada?: boolean
  datosExtra?: string
  createdAt: string
  migrada?: boolean
  disponibleParaVenta?: boolean
  supervisorSnapshot?: {
    _id: string
    nombre: string
    numeroEquipo: string
  }
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
}

interface User {
  _id: string
  nombre: string
  email: string
  role: string
  numeroEquipo?: string
  active?: boolean
}

interface AuditoriasRecuperacionBaseProps {
  type: RecuperacionType
}

/* Funciones auxiliares */
const formatDateTime = (value: string) => {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  const formattedDate = date.toLocaleDateString("es-AR")
  const formattedTime = date.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  })
  return `${formattedDate} ${formattedTime}`
}

const getStatusColor = (status: string, theme: string) => {
  const statusLower = (status || "").toLowerCase()
  const colors: Record<string, { light: string; dark: string }> = {
    "falta clave": { light: "bg-orange-100 text-orange-800", dark: "bg-orange-500/20 text-orange-400" },
    "rechazada": { light: "bg-red-100 text-red-700", dark: "bg-red-500/20 text-red-400" },
    "pendiente": { light: "bg-gray-200 text-gray-700", dark: "bg-gray-500/20 text-gray-400" },
    "falta documentación": { light: "bg-orange-100 text-orange-800", dark: "bg-orange-500/20 text-orange-400" },
    "afip": { light: "bg-blue-100 text-blue-800", dark: "bg-blue-500/20 text-blue-400" },
    "padrón": { light: "bg-indigo-100 text-indigo-800", dark: "bg-indigo-500/20 text-indigo-400" },
    "completa": { light: "bg-lime-600 text-white", dark: "bg-lime-500/30 text-lime-300" },
    "reprogramada": { light: "bg-violet-100 text-violet-800", dark: "bg-violet-500/20 text-violet-400" },
    "caída": { light: "bg-red-600 text-white", dark: "bg-red-500/30 text-red-300" },
  }

  const color = colors[statusLower] || { light: "bg-gray-100 text-gray-700", dark: "bg-gray-500/20 text-gray-400" }
  return theme === "dark" ? color.dark : color.light
}

const getObraVendidaClass = (obra: string, theme: string) => {
  const v = (obra || "").toLowerCase()
  if (v === "binimed") return theme === "dark" ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-800"
  if (v === "meplife" || v === "meplife ") return theme === "dark" ? "bg-green-500/20 text-green-400" : "bg-green-200 text-green-800"
  if (v === "turf") return theme === "dark" ? "bg-purple-500/20 text-purple-400" : "bg-purple-100 text-purple-800"
  return theme === "dark" ? "bg-gray-500/20 text-gray-400" : "bg-gray-100 text-gray-700"
}

const getSupervisorName = (audit: Audit): string => {
  if (audit.supervisorSnapshot?.nombre) {
    return audit.supervisorSnapshot.nombre
  }
  if (audit.asesor?.supervisor?.nombre) {
    return audit.asesor.supervisor.nombre
  }
  return "-"
}

const getSupervisorColor = (supervisorName: string, theme: string) => {
  if (!supervisorName || supervisorName === "-") {
    return theme === "dark" ? "bg-gray-500/20 text-gray-400" : "bg-gray-100 text-gray-700"
  }
  
  const nombreLower = supervisorName.toLowerCase()
  
  if ((nombreLower.includes('nahuel') && nombreLower.includes('sanchez')) ||
    (nombreLower.includes('nahia') && nombreLower.includes('avellaneda')) ||
    (nombreLower.includes('santiago') && nombreLower.includes('goldsztein')) ||
    (nombreLower.includes('facundo') && nombreLower.includes('tevez'))) {
    return theme === "dark" ? "bg-red-900 text-red-200" : "bg-red-100 text-red-800"
  }

  if (nombreLower.includes('abigail') && nombreLower.includes('vera')) {
    return theme === "dark" ? "bg-fuchsia-900 text-fuchsia-200" : "bg-fuchsia-100 text-fuchsia-800"
  }

  if (nombreLower.includes('mateo') && nombreLower.includes('viera')) {
    return theme === "dark" ? "bg-blue-900 text-blue-200" : "bg-blue-100 text-blue-800"
  }

  const colors = [
    { light: "bg-teal-100 text-teal-800", dark: "bg-teal-900 text-teal-200" },
    { light: "bg-cyan-100 text-cyan-800", dark: "bg-cyan-900 text-cyan-200" },
    { light: "bg-emerald-100 text-emerald-800", dark: "bg-emerald-900 text-emerald-200" },
  ]

  let hash = 0
  for (let i = 0; i < supervisorName.length; i++) {
    hash = supervisorName.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % colors.length
  const color = colors[index]

  return theme === "dark" ? color.dark : color.light
}

const getRowBackgroundByStatus = (status: string, theme: string) => {
  if (!status) return ""
  const statusLower = status.toLowerCase()

  const colorMap: Record<string, { light: string; dark: string }> = {
    "falta clave": { light: "bg-orange-50 hover:bg-orange-100", dark: "bg-orange-900/20 hover:bg-orange-900/30" },
    "rechazada": { light: "bg-red-50 hover:bg-red-100", dark: "bg-red-900/20 hover:bg-red-900/30" },
    "pendiente": { light: "bg-gray-100 hover:bg-gray-200", dark: "bg-gray-700/30 hover:bg-gray-700/40" },
    "falta documentación": { light: "bg-orange-50 hover:bg-orange-100", dark: "bg-orange-900/20 hover:bg-orange-900/30" },
    "afip": { light: "bg-blue-50 hover:bg-blue-100", dark: "bg-blue-900/20 hover:bg-blue-900/30" },
    "padrón": { light: "bg-indigo-50 hover:bg-indigo-100", dark: "bg-indigo-900/20 hover:bg-indigo-900/30" },
  }

  const colors = colorMap[statusLower]
  if (!colors) return ""

  return theme === "dark" ? colors.dark : colors.light
}

export function AuditoriasRecuperacionBase({ type }: AuditoriasRecuperacionBaseProps) {
  const { theme } = useTheme()
  const { user } = useAuth()
  const config = INTERFACE_CONFIG[type]

  /* Estado principal */
  const [audits, setAudits] = useState<Audit[]>([])
  const [loading, setLoading] = useState(false)
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(config.defaultSort)

  /* Estados de filtros */
  const [filters, setFilters] = useState({
    afiliado: "",
    cuil: "",
  })

  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  /* Estados de selección múltiple */
  const [selectedSupervisores, setSelectedSupervisores] = useState<string[]>([])
  const [selectedAsesores, setSelectedAsesores] = useState<string[]>([])

  /* Estados de dropdowns */
  const [isSupervisorDropdownOpen, setIsSupervisorDropdownOpen] = useState(false)
  const [isAsesorDropdownOpen, setIsAsesorDropdownOpen] = useState(false)

  /* Listas para dropdowns */
  const [asesoresList, setAsesoresList] = useState<User[]>([])
  const [supervisoresList, setSupervisoresList] = useState<User[]>([])

  /* Estados de modales */
  const [selectedAudit, setSelectedAudit] = useState<Audit | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)

  /* Referencias para detectar clicks externos */
  const supervisorFilterRef = useRef<HTMLDivElement>(null)
  const asesorFilterRef = useRef<HTMLDivElement>(null)

  /* Obtener rol del usuario actual */
  const userRole = user?.role?.toLowerCase()
  const isGerencia = userRole === 'gerencia'
  const isRecuperador = userRole === 'recuperador'
  const canEdit = isGerencia || isRecuperador
  const canDelete = isGerencia

  /* Filtrar asesores por supervisor seleccionado */
  const filteredAsesoresList = useMemo(() => {
    if (selectedSupervisores.length === 0) return asesoresList
    const equiposSupervisores = new Set<string>()
    selectedSupervisores.forEach(supName => {
      const sup = supervisoresList.find(s => s.nombre === supName)
      if (sup?.numeroEquipo) equiposSupervisores.add(sup.numeroEquipo)
    })
    if (equiposSupervisores.size === 0) return asesoresList
    return asesoresList.filter(a => a.numeroEquipo && equiposSupervisores.has(a.numeroEquipo))
  }, [asesoresList, selectedSupervisores, supervisoresList])

  /* Funciones auxiliares de selección */
  const toggleSelection = (value: string, setFn: React.Dispatch<React.SetStateAction<string[]>>) => {
    const normalized = (value || "").trim()
    if (!normalized) return
    setFn((prev) => {
      if (prev.includes(normalized)) {
        return prev.filter((item) => item !== normalized)
      }
      return [...prev, normalized]
    })
  }

  const formatMultiLabel = (selected: string[], placeholder: string, pluralWord: string) => {
    if (selected.length === 0) return placeholder
    if (selected.length === 1) return selected[0]
    return `${selected.length} ${pluralWord}`
  }

  const buildParams = () => {
    const params: any = { ...filters }

    // Filtrar por estados específicos de esta interfaz
    params.estado = config.statusFilters.join(",")

    // ✅ CRÍTICO: Ignorar filtro de fecha por defecto para ver todo el historial
    // Las interfaces de Auditorías deben ver TODOS los registros con el estado correspondiente
    params.ignoreDate = 'true'

    if (selectedAsesores.length > 0) {
      params.asesor = selectedAsesores.map((a) => a.trim()).filter(Boolean).join(",")
    }

    if (selectedSupervisores.length > 0) {
      params.supervisor = selectedSupervisores.map((s) => s.trim()).filter(Boolean).join(",")
    }

    // Lógica de fecha (solo si el usuario especifica un rango)
    if (filters.cuil && filters.cuil.trim() !== "") {
      delete params.dateFrom
      delete params.dateTo
    } else {
      if (dateFrom && dateTo) {
        // Si hay rango de fechas, desactivar ignoreDate para aplicar el filtro
        delete params.ignoreDate
        params.dateFrom = dateFrom
        params.dateTo = dateTo
      } else if (dateFrom) {
        delete params.ignoreDate
        params.dateFrom = dateFrom
      } else if (dateTo) {
        delete params.ignoreDate
        params.dateTo = dateTo
      }
    }

    Object.keys(params).forEach((k) => {
      if (params[k] === "" || params[k] === null || params[k] === undefined) {
        delete params[k]
      }
    })

    return params
  }

  const fetchAudits = async () => {
    try {
      setLoading(true)
      const params = buildParams()
      const { data } = await api.audits.list(params)
      let auditsArray = Array.isArray(data) ? data : []

      // Filtrar por disponibleParaVenta si es requerido
      if (config.requireDisponibleParaVenta) {
        auditsArray = auditsArray.filter((audit: Audit) => audit.disponibleParaVenta === true)
      }

      // Ordenar según configuración
      auditsArray.sort((a: Audit, b: Audit) => {
        const dateA = new Date(a.createdAt).getTime()
        const dateB = new Date(b.createdAt).getTime()
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA
      })

      setAudits(auditsArray)
    } catch (err) {
      console.error(err)
      toast.error("Error al cargar auditorías")
      setAudits([])
    } finally {
      setLoading(false)
    }
  }

  const fetchFilterOptions = async () => {
    try {
      const asesoresRes = await api.users.list("includeAllAuditors=true")
      const asesoresData = Array.isArray(asesoresRes.data) ? asesoresRes.data : []

      const asesoresFiltered = asesoresData
        .filter((u: User) => {
          const isActive = u?.active !== false
          const isAsesorRole = u.role === "asesor" || u.role === "Asesor"
          const isAuditorWithTeam = (u.role === "auditor" || u.role === "Auditor") && u.numeroEquipo
          return isActive && (isAsesorRole || isAuditorWithTeam) && u.nombre
        })
        .sort((a: User, b: User) => a.nombre.localeCompare(b.nombre))
      setAsesoresList(asesoresFiltered)

      const supervisoresData = asesoresData
        .filter((u: User) => {
          const isActive = u?.active !== false
          const role = u.role?.toLowerCase()
          return isActive && (role === "supervisor" || role === "gerencia") && u.nombre
        })
        .sort((a: User, b: User) => a.nombre.localeCompare(b.nombre))
      setSupervisoresList(supervisoresData)
    } catch (err) {
      console.error("Error al cargar opciones de filtros:", err)
    }
  }

  const handleExportXLSX = () => {
    if (!audits || audits.length === 0) {
      toast.info("No hay datos para exportar")
      return
    }

    const rows = audits.map((a) => ({
      "Fecha de creación": formatDateTime(a.createdAt),
      Afiliado: a.nombre || "-",
      CUIL: a.cuil || "-",
      Teléfono: a.telefono || "-",
      "Obra Social Vendida": a.obraSocialVendida || "-",
      Asesor: a.asesor?.nombre || "-",
      Supervisor: getSupervisorName(a),
      Grupo: a.asesor?.numeroEquipo || "-",
      Administrativo: a.administrador?.nombre || "-",
      Estado: a.status || "-",
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, config.title)
    const today = new Date().toISOString().slice(0, 10)
    const filename = `${type}_${today}.xlsx`
    XLSX.writeFile(wb, filename)

    toast.success("Exportado correctamente")
  }

  const handleFilterChange = (field: string, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  const clearFilters = () => {
    setFilters({ afiliado: "", cuil: "" })
    setDateFrom("")
    setDateTo("")
    setSelectedSupervisores([])
    setSelectedAsesores([])
  }

  const handleDeleteAudit = async (auditId: string) => {
    if (!canDelete) {
      toast.error("No tienes permisos para eliminar auditorías")
      return
    }
    if (!confirm("¿Estás seguro de eliminar esta auditoría?")) return

    try {
      await api.audits.delete(auditId)
      toast.success("Auditoría eliminada")
      fetchAudits()
    } catch (error) {
      console.error("Error deleting audit:", error)
      toast.error("Error al eliminar auditoría")
    }
  }

  const openEditModal = (audit: Audit) => {
    if (!canEdit) {
      toast.error("No tienes permisos para editar auditorías")
      return
    }
    setSelectedAudit(audit)
    setEditModalOpen(true)
  }

  /* Efectos */
  useEffect(() => {
    fetchAudits()
    fetchFilterOptions()

    const socket = connectSocket()
    socket.emit("audits:subscribeAll")

    const handleAuditUpdate = (updatedAudit: Audit) => {
      setAudits(prev => {
        const index = prev.findIndex(a => a._id === updatedAudit._id)
        if (index === -1) return prev
        const updated = [...prev]
        updated[index] = { ...prev[index], ...updatedAudit }
        return updated
      })
    }

    const handleAuditDeleted = (data: { _id: string }) => {
      setAudits(prev => prev.filter(a => a._id !== data._id))
      if (selectedAudit && selectedAudit._id === data._id) {
        setEditModalOpen(false)
        setSelectedAudit(null)
      }
    }

    socket.on("audit:update", handleAuditUpdate)
    socket.on("audit:deleted", handleAuditDeleted)

    return () => {
      socket.off("audit:update", handleAuditUpdate)
      socket.off("audit:deleted", handleAuditDeleted)
      socket.emit("audits:unsubscribeAll")
    }
  }, [])

  useEffect(() => {
    fetchAudits()
  }, [filters, selectedSupervisores, selectedAsesores, dateFrom, dateTo, sortOrder])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (supervisorFilterRef.current && !supervisorFilterRef.current.contains(event.target as Node)) {
        setIsSupervisorDropdownOpen(false)
      }
      if (asesorFilterRef.current && !asesorFilterRef.current.contains(event.target as Node)) {
        setIsAsesorDropdownOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Sección de filtros */}
      <div
        className={cn(
          "rounded-2xl border p-6 backdrop-blur-sm relative z-20",
          theme === "dark"
            ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
            : "bg-white border-gray-200 shadow-sm",
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className={cn("w-5 h-5", theme === "dark" ? "text-purple-400" : "text-purple-500")} />
            <h3 className={cn("font-semibold", theme === "dark" ? "text-white" : "text-gray-800")}>
              {config.title}
            </h3>
          </div>
          <p className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
            {config.description}
          </p>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
          <input
            type="text"
            placeholder="Buscar afiliado"
            value={filters.afiliado}
            onChange={(e) => handleFilterChange("afiliado", e.target.value)}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm",
              theme === "dark"
                ? "bg-white/5 border-white/10 text-white placeholder-gray-500"
                : "bg-white border-gray-200 text-gray-800 placeholder-gray-400",
            )}
          />
          <input
            type="text"
            placeholder="Buscar CUIL"
            value={filters.cuil}
            onChange={(e) => handleFilterChange("cuil", e.target.value)}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm",
              theme === "dark"
                ? "bg-white/5 border-white/10 text-white placeholder-gray-500"
                : "bg-white border-gray-200 text-gray-800 placeholder-gray-400",
            )}
          />

          {/* Fecha desde */}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm",
              theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
            )}
            placeholder="Desde"
          />

          {/* Fecha hasta */}
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm",
              theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
            )}
            placeholder="Hasta"
          />

          {/* Filtro multi-selección de supervisor */}
          <div className="relative" ref={supervisorFilterRef}>
            <button
              onClick={() => setIsSupervisorDropdownOpen(!isSupervisorDropdownOpen)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm",
                theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
              )}
            >
              <span className="truncate">{formatMultiLabel(selectedSupervisores, "Supervisor", "supervisores")}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            {isSupervisorDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-lg shadow-lg border bg-white dark:bg-gray-800 dark:border-gray-700">
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
                  <button
                    type="button"
                    onClick={() => setSelectedSupervisores(supervisoresList.map(s => s.nombre))}
                    className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400"
                  >
                    Seleccionar todos
                  </button>
                  {selectedSupervisores.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedSupervisores([])}
                      className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
                {supervisoresList.map((s) => (
                  <label key={s._id} className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSupervisores.includes(s.nombre)}
                      onChange={() => toggleSelection(s.nombre, setSelectedSupervisores)}
                      className="accent-blue-600"
                    />
                    <span className="dark:text-gray-200">{s.nombre}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Filtro multi-selección de asesor */}
          <div className="relative" ref={asesorFilterRef}>
            <button
              onClick={() => setIsAsesorDropdownOpen(!isAsesorDropdownOpen)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm",
                theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
              )}
            >
              <span className="truncate">{formatMultiLabel(selectedAsesores, "Asesor", "asesores")}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            {isAsesorDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-lg shadow-lg border bg-white dark:bg-gray-800 dark:border-gray-700">
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
                  <button
                    type="button"
                    onClick={() => setSelectedAsesores(filteredAsesoresList.map(a => a.nombre))}
                    className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400"
                  >
                    Seleccionar todos
                  </button>
                  {selectedAsesores.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedAsesores([])}
                      className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
                {filteredAsesoresList.map((a) => (
                  <label key={a._id} className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedAsesores.includes(a.nombre)}
                      onChange={() => toggleSelection(a.nombre, setSelectedAsesores)}
                      className="accent-blue-600"
                    />
                    <span className="dark:text-gray-200">{a.nombre}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={clearFilters}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              theme === "dark"
                ? "bg-white/10 text-gray-300 hover:bg-white/20"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200",
            )}
          >
            <X className="w-4 h-4" />
            Limpiar
          </button>
          <button
            onClick={fetchAudits}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              theme === "dark"
                ? "bg-purple-600 text-white hover:bg-purple-700"
                : "bg-purple-500 text-white hover:bg-purple-600",
            )}
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
          <button
            onClick={handleExportXLSX}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              theme === "dark"
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-green-500 text-white hover:bg-green-600",
            )}
          >
            <Download className="w-4 h-4" />
            Exportar Excel
          </button>
          <button
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              theme === "dark"
                ? "bg-white/10 text-gray-300 hover:bg-white/20"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200",
            )}
          >
            {sortOrder === "asc" ? "📅 Más antiguas primero" : "📅 Más recientes primero"}
          </button>
        </div>
      </div>

      {/* Resumen */}
      {audits.length > 0 && (
        <div className={cn(
          "rounded-xl border p-3",
          theme === "dark"
            ? "bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border-blue-700/30"
            : "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200"
        )}>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className={cn("font-bold", theme === "dark" ? "text-gray-200" : "text-gray-800")}>
              Total: <span className={theme === "dark" ? "text-blue-400" : "text-blue-600"}>{audits.length}</span>
            </span>
          </div>
        </div>
      )}

      {/* Tabla de auditorías */}
      <div
        className={cn(
          "rounded-2xl border overflow-hidden",
          theme === "dark"
            ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
            : "bg-white border-gray-200 shadow-sm",
        )}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className={cn(
              "text-left font-semibold uppercase tracking-wider sticky top-0 z-10",
              theme === "dark" ? "bg-gray-900 text-gray-300" : "bg-gray-50 text-gray-600"
            )}>
              <tr>
                <th className="px-2 py-2 w-[120px]">Fecha creación</th>
                <th className="px-2 py-2 min-w-[150px]">Afiliado</th>
                <th className="px-2 py-2 w-[100px]">CUIL</th>
                <th className="px-2 py-2 w-[100px]">Teléfono</th>
                <th className="px-2 py-2 w-[80px]">O.S. Ven</th>
                <th className="px-2 py-2 min-w-[100px]">Asesor</th>
                <th className="px-2 py-2 min-w-[100px]">Supervisor</th>
                <th className="px-2 py-2 w-[60px]">Grupo</th>
                <th className="px-2 py-2 min-w-[100px]">Admin</th>
                <th className="px-2 py-2 min-w-[100px]">Estado</th>
                <th className="px-2 py-2 w-[80px] text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center opacity-50">
                    <div className="flex justify-center items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Cargando auditorías...
                    </div>
                  </td>
                </tr>
              ) : audits.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center opacity-50">
                    No se encontraron auditorías
                  </td>
                </tr>
              ) : (
                audits.map((item, idx) => (
                  <tr
                    key={item._id}
                    className={cn(
                      "transition-colors group",
                      getRowBackgroundByStatus(item.status, theme) ||
                      (idx % 2 === 0 ? "" : theme === "dark" ? "bg-white/[0.02]" : "bg-gray-50/50")
                    )}
                  >
                    <td className={cn("px-3 py-2.5 text-center", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                      {formatDateTime(item.createdAt)}
                    </td>
                    <td className="px-2 py-1.5 text-center font-medium truncate max-w-[150px]" title={item.nombre}>
                      {item.nombre}
                    </td>
                    <td className="px-2 py-1.5 text-center font-mono opacity-70 truncate">
                      {item.cuil || "-"}
                    </td>
                    <td className="px-2 py-1.5 text-center font-mono opacity-70 truncate">
                      {item.telefono || "-"}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <span className={cn(
                        "inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium truncate max-w-[80px]",
                        getObraVendidaClass(item.obraSocialVendida, theme)
                      )}>
                        {item.obraSocialVendida}
                      </span>
                    </td>
                    <td className={cn("px-3 py-3 text-center", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                      {item.asesor?.nombre || '-'}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-medium truncate max-w-[120px] inline-block",
                        getSupervisorColor(getSupervisorName(item), theme)
                      )} title={getSupervisorName(item)}>
                        {getSupervisorName(item)}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <span className={cn(
                        "inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold truncate max-w-[60px]",
                        theme === "dark" ? "bg-indigo-900 text-indigo-200" : "bg-indigo-100 text-indigo-800"
                      )}>
                        {item.asesor?.numeroEquipo || "-"}
                      </span>
                    </td>
                    <td className={cn("px-3 py-3 text-center", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                      {item.administrador?.nombre || '-'}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <span className={cn(
                        "inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium truncate max-w-[120px]",
                        getStatusColor(item.status, theme)
                      )} title={item.status}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <div className="flex items-center justify-center gap-1 transition-opacity">
                        {canEdit && (
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-1 hover:bg-blue-100 text-blue-600 rounded dark:hover:bg-blue-900/30 dark:text-blue-400"
                            title="Editar"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteAudit(item._id)}
                            className="p-1 hover:bg-red-100 text-red-600 rounded dark:hover:bg-red-900/30 dark:text-red-400"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de edición */}
      {selectedAudit && editModalOpen && typeof window !== "undefined" && createPortal(
        <AuditEditModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false)
            setSelectedAudit(null)
          }}
          audit={selectedAudit}
          onSave={(updated) => {
            setAudits(prev => prev.map(a => a._id === updated._id ? updated : a))
            setEditModalOpen(false)
            setSelectedAudit(null)
          }}
        />,
        document.body
      )}
    </div>
  )
}
