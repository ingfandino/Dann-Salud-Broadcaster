"use client"

import { useState, useEffect, useMemo } from "react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth"
import { Filter, RefreshCw, FileDown, ChevronDown, ChevronUp, Calendar, Users, CheckCircle, X, Download, CheckCircle2, Search, Clock, User, Phone, XCircle, AlertCircle } from "lucide-react"
import * as XLSX from "xlsx"
import { connectSocket } from "@/lib/socket"

const OBRAS_SOCIALES = ["Binimed", "Meplife", "TURF"]

// ✅ Helper para obtener el nombre del supervisor (prioriza snapshot)
const getSupervisorName = (item: any): string => {
  // 1. Prioridad: supervisorSnapshot
  if (item.supervisorSnapshot?.nombre) {
    return item.supervisorSnapshot.nombre
  }

  // 2. Fallback: asesor.supervisor (para ventas antiguas)
  if (item.asesor?.supervisor?.nombre) {
    return item.asesor.supervisor.nombre
  }

  return "-"
}

const getSupervisorColor = (supervisorName: string, theme: string) => {
  if (!supervisorName) return theme === "dark" ? "bg-gray-500/20 text-gray-400" : "bg-gray-100 text-gray-700"

  // Hash string to get consistent color
  let hash = 0
  for (let i = 0; i < supervisorName.length; i++) {
    hash = supervisorName.charCodeAt(i) + ((hash << 5) - hash)
  }

  const colors = [
    { light: "bg-red-100 text-red-800", dark: "bg-red-500/20 text-red-300" },
    { light: "bg-orange-100 text-orange-800", dark: "bg-orange-500/20 text-orange-300" },
    { light: "bg-amber-100 text-amber-800", dark: "bg-amber-500/20 text-amber-300" },
    { light: "bg-yellow-100 text-yellow-800", dark: "bg-yellow-500/20 text-yellow-300" },
    { light: "bg-lime-100 text-lime-800", dark: "bg-lime-500/20 text-lime-300" },
    { light: "bg-green-100 text-green-800", dark: "bg-green-500/20 text-green-300" },
    { light: "bg-emerald-100 text-emerald-800", dark: "bg-emerald-500/20 text-emerald-300" },
    { light: "bg-teal-100 text-teal-800", dark: "bg-teal-500/20 text-teal-300" },
    { light: "bg-cyan-100 text-cyan-800", dark: "bg-cyan-500/20 text-cyan-300" },
    { light: "bg-sky-100 text-sky-800", dark: "bg-sky-500/20 text-sky-300" },
    { light: "bg-blue-100 text-blue-800", dark: "bg-blue-500/20 text-blue-300" },
    { light: "bg-indigo-100 text-indigo-800", dark: "bg-indigo-500/20 text-indigo-300" },
    { light: "bg-violet-100 text-violet-800", dark: "bg-violet-500/20 text-violet-300" },
    { light: "bg-purple-100 text-purple-800", dark: "bg-purple-500/20 text-purple-300" },
    { light: "bg-fuchsia-100 text-fuchsia-800", dark: "bg-fuchsia-500/20 text-fuchsia-300" },
    { light: "bg-pink-100 text-pink-800", dark: "bg-pink-500/20 text-pink-300" },
    { light: "bg-rose-100 text-rose-800", dark: "bg-rose-500/20 text-rose-300" }
  ]

  const index = Math.abs(hash) % colors.length
  const color = colors[index]

  return theme === "dark" ? color.dark : color.light
}

// ✅ Para fechas puras (sin hora específica) - evita problemas de zona horaria
const formatDateOnly = (value: string) => {
  if (!value) return "-"
  // Extraer solo la parte de fecha del ISO string para evitar conversión de zona horaria
  const dateStr = value.split('T')[0]
  if (!dateStr) return "-"
  const [year, month, day] = dateStr.split('-')
  if (!year || !month || !day) return "-"
  return `${day}/${month}/${year}`
}

export function AuditoriasLiquidacion() {
  const { theme } = useTheme()
  const { user } = useAuth()
  const isGerencia = user?.role?.toLowerCase() === 'gerencia'

  // State
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentWeek, setCurrentWeek] = useState(1)

  // Recalculate Modal State
  const [showRecalculateModal, setShowRecalculateModal] = useState(false)
  const [recalculating, setRecalculating] = useState(false)
  const [recalcDateFrom, setRecalcDateFrom] = useState("")
  const [recalcDateTo, setRecalcDateTo] = useState("")
  const [onlyMissing, setOnlyMissing] = useState(true)

  // Filter States
  const [filters, setFilters] = useState({
    afiliado: "",
    cuil: "",
    asesor: "",
    supervisor: "",
    auditor: "",
    administrador: "",
    obraSocialVendida: "",
    estado: "",
    dateFrom: "",
    dateTo: "",
    dateField: "fechaCreacionQR"
  })

  // Lists for dropdowns
  const [asesores, setAsesores] = useState<any[]>([])
  const [supervisores, setSupervisores] = useState<any[]>([])
  const [auditores, setAuditores] = useState<any[]>([])
  const [administradores, setAdministradores] = useState<any[]>([])

  // Fetch Data
  const loadData = async (useFilters = false) => {
    try {
      setLoading(true)
      const query = useFilters ? { ...filters, dateField: 'fechaCreacionQR' } : {}
      const { data } = await api.liquidation.list(query)
      setItems(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
      toast.error("Error al cargar datos")
    } finally {
      setLoading(false)
    }
  }

  const loadFilterOptions = async () => {
    try {
      const { data } = await api.users.list()
      const users = Array.isArray(data) ? data : []

      setAsesores(users.filter((u: any) => u.role?.toLowerCase() === "asesor"))
      setSupervisores(users.filter((u: any) => u.role?.toLowerCase() === "supervisor"))
      setAuditores(users.filter((u: any) => u.role?.toLowerCase() === "auditor"))
      setAdministradores(users.filter((u: any) => u.role?.toLowerCase() === "admin"))
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadData()
    loadFilterOptions()

    // ✅ SMART REAL-TIME UPDATES via Socket
    const socket = connectSocket()

    // Subscribe to audits room
    socket.emit("audits:subscribeAll")
    console.log("[Liquidación] Subscribed to audits_all room")

    // Handler for new audits
    const handleNewAudit = (newAudit: any) => {
      console.log("[Socket] New audit received:", newAudit._id)

      setItems(prev => {
        // Check if already exists
        if (prev.some(a => a._id === newAudit._id)) return prev

        // Add to list (filtering happens in useMemo)
        const updated = [newAudit, ...prev]

        // Only notify if it's a relevant status for liquidation
        if (["Cargada", "Aprobada", "QR hecho"].includes(newAudit.status)) {
          toast.info(`Nueva venta en liquidación: ${newAudit.nombre}`, { duration: 3000 })
        }

        return updated
      })
    }

    // Handler for updated audits
    const handleAuditUpdate = (updatedAudit: any) => {
      console.log("[Socket] Audit update received:", updatedAudit._id)

      setItems(prev => {
        const index = prev.findIndex(a => a._id === updatedAudit._id)
        if (index === -1) {
          // If not in list, add it (might have changed status to be relevant)
          return [updatedAudit, ...prev]
        }

        // Update in place
        const updated = [...prev]
        updated[index] = { ...prev[index], ...updatedAudit }
        return updated
      })
    }

    // Handler for deleted audits
    const handleAuditDeleted = (data: { _id: string }) => {
      console.log("[Socket] Audit deleted:", data._id)
      setItems(prev => prev.filter(a => a._id !== data._id))
    }

    // Register event listeners
    socket.on("audits:new", handleNewAudit)
    socket.on("audit:update", handleAuditUpdate)
    socket.on("audit:deleted", handleAuditDeleted)

    // Cleanup on unmount
    return () => {
      socket.off("audits:new", handleNewAudit)
      socket.off("audit:update", handleAuditUpdate)
      socket.off("audit:deleted", handleAuditDeleted)
      socket.emit("audits:unsubscribeAll")
      console.log("[Liquidación] Unsubscribed from audits_all room")
    }
  }, [])

  // Week Logic
  const getWeekStart = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay() // 0=Sun, 1=Mon, ..., 4=Thu, 5=Fri, 6=Sat
    const hours = d.getHours()
    const minutes = d.getMinutes()

    // If it's Thursday after 23:00, it counts as next week (Friday)
    // Actually, user wants "Thursday 23:01 to next Thursday 23:00"
    // So if it's Thu > 23:00, it belongs to the week starting THIS Thu 23:01
    // Wait, "Thursday 23:01" is the START of the week.

    // Let's normalize everything to the "week start date" which is the Thursday 23:01

    // Logic from LiquidacionList.jsx seems to be:
    // Week starts Friday 00:00.
    // But user says "iniciando desde el jueves a las 23:01 hrs".
    // This means Thu 23:01 IS effectively Friday 00:00 for accounting purposes.

    // Let's adjust the date so that Thu 23:01+ becomes Friday.
    if (day === 4 && (hours > 23 || (hours === 23 && minutes >= 1))) {
      d.setDate(d.getDate() + 1)
      d.setHours(0, 0, 0, 0)
    }

    // Now use standard Friday logic
    const normalizedDay = d.getDay()
    const diff = (normalizedDay < 5 ? -2 - normalizedDay : 5 - normalizedDay)
    d.setDate(d.getDate() - (normalizedDay === 5 ? 0 : normalizedDay === 6 ? 1 : normalizedDay === 0 ? 2 : normalizedDay + 2))
    d.setHours(0, 0, 0, 0)
    return d
  }

  const itemsByWeek = useMemo(() => {
    const weeks: Record<string, any[]> = {}
    items.forEach(item => {
      // Filter by status first
      if (!["Cargada", "Aprobada", "QR hecho"].includes(item.status)) return

      // ✅ Use fechaCreacionQR for QR-based records, fallback to scheduledAt
      const dateField = item.status === 'QR hecho' ? (item.fechaCreacionQR || item.scheduledAt) : item.scheduledAt;
      const date = new Date(dateField || item.createdAt)
      const weekStart = getWeekStart(date).toISOString().split('T')[0]
      if (!weeks[weekStart]) weeks[weekStart] = []
      weeks[weekStart].push(item)
    })
    return Object.entries(weeks)
      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
      .map(([start, items]) => ({ start, items }))
  }, [items])

  // Filter Logic
  const filteredItems = useMemo(() => {
    // Start with all items filtered by status
    let baseItems = items.filter(i => ["Cargada", "Aprobada", "QR hecho"].includes(i.status))

    // If date filters are active, use all filtered items instead of weekly grouping
    if (filters.dateFrom || filters.dateTo) {
      // Apply date filters
      baseItems = baseItems.filter(item => {
        // ✅ Use fechaCreacionQR for QR records, fallback to scheduledAt
        const dateField = item.status === 'QR hecho' ? (item.fechaCreacionQR || item.scheduledAt) : item.scheduledAt;
        const itemDate = new Date(dateField).toISOString().split('T')[0];

        if (filters.dateFrom && itemDate < filters.dateFrom) return false;
        if (filters.dateTo && itemDate > filters.dateTo) return false;

        return true;
      })
    } else {
      // Use weekly grouping
      baseItems = itemsByWeek[currentWeek - 1]?.items || []
    }

    // Apply other filters
    return baseItems.filter(item => {
      if (filters.afiliado && !item.nombre?.toLowerCase().includes(filters.afiliado.toLowerCase())) return false
      if (filters.cuil && !item.cuil?.includes(filters.cuil)) return false
      if (filters.asesor && item.asesor?._id !== filters.asesor) return false
      if (filters.supervisor && item.asesor?.supervisor?._id !== filters.supervisor) return false
      if (filters.auditor && item.auditor?._id !== filters.auditor) return false
      if (filters.administrador && item.administrador?._id !== filters.administrador) return false
      if (filters.obraSocialVendida && item.obraSocialVendida !== filters.obraSocialVendida) return false
      if (filters.estado && item.status !== filters.estado) return false

      return true
    }).sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
  }, [items, itemsByWeek, currentWeek, filters])

  // Export
  const handleExport = async () => {
    try {
      console.log('📊 Exportando liquidación...', filters)

      const response = await api.liquidation.export(filters)

      console.log('📊 Respuesta:', response.data instanceof Blob ? 'Blob válido' : 'ERROR: No es Blob')

      const blob = response.data instanceof Blob
        ? response.data
        : new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `liquidacion_${new Date().toISOString().split('T')[0]}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      console.log('✅ Descarga completada')
      toast.success("Archivo exportado correctamente")
    } catch (err) {
      console.error('❌ Error al exportar:', err)
      toast.error("Error al exportar")
    }
  }

  // Stats
  const stats = useMemo(() => {
    const qrItems = filteredItems.filter(i => i.status === 'QR hecho')
    const cargadaItems = filteredItems.filter(i => i.status === 'Cargada')
    const aprobadaItems = filteredItems.filter(i => i.status === 'Aprobada')

    // Supervisor stats (QR Hechos only)
    const supervisorCounts: Record<string, number> = {}
    qrItems.forEach(item => {
      const supervisorName = getSupervisorName(item) === '-' ? 'Sin supervisor' : getSupervisorName(item)
      supervisorCounts[supervisorName] = (supervisorCounts[supervisorName] || 0) + 1
    })

    const supervisorStats = Object.entries(supervisorCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    return {
      qr: qrItems.length,
      cargada: cargadaItems.length,
      aprobada: aprobadaItems.length,
      total: filteredItems.length,
      supervisorStats
    }
  }, [filteredItems])

  // ✅ Handle Recalculate Supervisors
  const handleRecalculateSupervisors = async () => {
    try {
      setRecalculating(true)
      const response = await api.audits.recalculateSupervisors({
        dateFrom: recalcDateFrom || undefined,
        dateTo: recalcDateTo || undefined,
        onlyMissing
      })

      toast.success(`Recalculación completada: ${response.data.success} exitosos, ${response.data.errors} errores`)
      setShowRecalculateModal(false)
      loadData() // Recargar datos
    } catch (error: any) {
      console.error("Error recalculating supervisors:", error)
      toast.error(error.response?.data?.error || "Error al recalcular supervisores")
    } finally {
      setRecalculating(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header & Controls */}
      <div className={cn(
        "rounded-2xl border p-4 shadow-sm",
        theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-gray-200"
      )}>
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
          <div>
            <h2 className={cn("text-lg font-semibold", theme === "dark" ? "text-white" : "text-gray-800")}>
              Liquidación (QR Hecho)
            </h2>
            <p className="text-sm opacity-60">Semana laboral: Viernes a Jueves</p>
          </div>
          <div className="flex gap-2">
            {isGerencia && (
              <button
                onClick={() => setShowRecalculateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                Recalcular Supervisores
              </button>
            )}
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              Exportar Excel
            </button>
          </div>
        </div>

        {/* Week Navigation */}
        {!filters.dateFrom && !filters.dateTo && itemsByWeek.length > 0 && (
          <div className="flex items-center justify-between bg-gray-50 dark:bg-white/5 p-3 rounded-xl mb-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Semana:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentWeek(Math.max(1, currentWeek - 1))}
                  disabled={currentWeek === 1}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded disabled:opacity-50"
                >
                  ←
                </button>
                <span className="px-3 py-1 bg-purple-600 text-white rounded text-sm font-bold">
                  {currentWeek}
                </span>
                <button
                  onClick={() => setCurrentWeek(Math.min(itemsByWeek.length, currentWeek + 1))}
                  disabled={currentWeek === itemsByWeek.length}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded disabled:opacity-50"
                >
                  →
                </button>
              </div>
              <span className="text-xs opacity-60">de {itemsByWeek.length}</span>
            </div>

            <div className="flex gap-3 text-xs font-medium">
              <span className="px-2 py-1 bg-green-500/20 text-green-600 rounded">QR: {stats.qr}</span>
              <span className="px-2 py-1 bg-blue-500/20 text-blue-600 rounded">Cargada: {stats.cargada}</span>
              <span className="px-2 py-1 bg-teal-500/20 text-teal-600 rounded">Aprobada: {stats.aprobada}</span>
            </div>
          </div>
        )}

        {/* Supervisor Stats */}
        {stats.supervisorStats.length > 0 && (
          <div className={cn(
            "p-3 rounded-xl text-xs mb-4",
            theme === "dark" ? "bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-white/10" : "bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100"
          )}>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <span className={cn("font-semibold", theme === "dark" ? "text-white" : "text-gray-800")}>
                QR Hechos: {stats.qr}
              </span>
              <span className="opacity-50">|</span>
              {stats.supervisorStats.map((stat, idx) => (
                <span key={stat.name} className={theme === "dark" ? "text-gray-300" : "text-gray-700"}>
                  {stat.name}: <span className={theme === "dark" ? "text-cyan-400" : "text-cyan-600"}>{stat.count}</span>
                  {idx < stats.supervisorStats.length - 1 && <span className="ml-2 opacity-50">|</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Filters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <input
            placeholder="Buscar afiliado..."
            value={filters.afiliado}
            onChange={e => setFilters({ ...filters, afiliado: e.target.value })}
            className={cn("px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-black/20 border-white/10" : "bg-white")}
          />
          <input
            placeholder="Buscar CUIL..."
            value={filters.cuil}
            onChange={e => setFilters({ ...filters, cuil: e.target.value })}
            className={cn("px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-black/20 border-white/10" : "bg-white")}
          />
          <select
            value={filters.asesor}
            onChange={e => setFilters({ ...filters, asesor: e.target.value })}
            className={cn("px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-black/20 border-white/10" : "bg-white")}
          >
            <option value="">Todos los Asesores</option>
            {asesores.map(a => <option key={a._id} value={a._id}>{a.nombre}</option>)}
          </select>
          <select
            value={filters.supervisor}
            onChange={e => setFilters({ ...filters, supervisor: e.target.value })}
            className={cn("px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-black/20 border-white/10" : "bg-white")}
          >
            <option value="">Todos los Supervisores</option>
            {supervisores.map(s => <option key={s._id} value={s._id}>{s.nombre}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <select
            value={filters.auditor}
            onChange={e => setFilters({ ...filters, auditor: e.target.value })}
            className={cn("px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-black/20 border-white/10" : "bg-white")}
          >
            <option value="">Todos los Auditores</option>
            {auditores.map(a => <option key={a._id} value={a._id}>{a.nombre}</option>)}
          </select>
          <select
            value={filters.administrador}
            onChange={e => setFilters({ ...filters, administrador: e.target.value })}
            className={cn("px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-black/20 border-white/10" : "bg-white")}
          >
            <option value="">Todos los Administradores</option>
            {administradores.map(a => <option key={a._id} value={a._id}>{a.nombre}</option>)}
          </select>
          <select
            value={filters.obraSocialVendida}
            onChange={e => setFilters({ ...filters, obraSocialVendida: e.target.value })}
            className={cn("px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-black/20 border-white/10" : "bg-white")}
          >
            <option value="">Todas las Obras Sociales</option>
            {OBRAS_SOCIALES.map(os => <option key={os} value={os}>{os}</option>)}
          </select>
          <select
            value={filters.estado}
            onChange={e => setFilters({ ...filters, estado: e.target.value })}
            className={cn("px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-black/20 border-white/10" : "bg-white")}
          >
            <option value="">Todos los Estados</option>
            <option value="QR hecho">QR hecho</option>
            <option value="Cargada">Cargada</option>
            <option value="Aprobada">Aprobada</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Date Filters */}
          <input
            type="date"
            placeholder="Fecha desde"
            value={filters.dateFrom}
            onChange={e => setFilters({ ...filters, dateFrom: e.target.value })}
            className={cn("px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-black/20 border-white/10" : "bg-white")}
          />
          <input
            type="date"
            placeholder="Fecha hasta"
            value={filters.dateTo}
            onChange={e => setFilters({ ...filters, dateTo: e.target.value })}
            className={cn("px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-black/20 border-white/10" : "bg-white")}
          />

          <button
            onClick={() => loadData(true)}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
          >
            Buscar
          </button>

          <button
            onClick={() => {
              setFilters({
                afiliado: "", cuil: "", asesor: "", supervisor: "",
                auditor: "", administrador: "", obraSocialVendida: "",
                estado: "", dateFrom: "", dateTo: "",
                dateField: "fechaCreacionQR"
              });
              // Reload without filters (default view)
              setTimeout(() => loadData(false), 0);
            }}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 rounded-lg text-sm transition-colors"
          >
            Limpiar Filtros
          </button>
        </div>
      </div>

      {/* Table */}
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
                <th className="px-2 py-2 w-[100px]">Fecha</th>
                <th className="px-2 py-2 min-w-[150px]">Afiliado</th>
                <th className="px-2 py-2 w-[100px]">CUIL</th>
                <th className="px-2 py-2 w-[80px]">O.S. Ven</th>
                <th className="px-2 py-2 min-w-[100px]">Asesor</th>
                <th className="px-2 py-2 min-w-[100px]">Supervisor</th>
                <th className="px-2 py-2 min-w-[100px]">Auditor</th>
                <th className="px-2 py-2 min-w-[100px]">Admin</th>
                <th className="px-2 py-2 w-[60px] text-center">Recup.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center opacity-50">
                    <div className="flex justify-center items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Cargando...
                    </div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center opacity-50">
                    No se encontraron registros
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => (
                  <tr
                    key={item._id}
                    className={cn(
                      "transition-colors",
                      theme === "dark" ? "hover:bg-white/5" : "hover:bg-gray-50",
                      idx % 2 === 0 ? "" : theme === "dark" ? "bg-white/[0.02]" : "bg-gray-50/50"
                    )}
                  >
                    <td className="px-2 py-1.5 whitespace-nowrap opacity-70">
                      {item.fechaCreacionQR
                        ? formatDateOnly(item.fechaCreacionQR)
                        : (item.scheduledAt ? formatDateOnly(item.scheduledAt) : '-')
                      }
                    </td>
                    <td className="px-2 py-1.5 font-medium truncate max-w-[150px]" title={item.nombre}>{item.nombre}</td>
                    <td className="px-2 py-1.5 font-mono opacity-70 truncate">{item.cuil}</td>
                    <td className="px-2 py-1.5">
                      <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 truncate max-w-[80px]">
                        {item.obraSocialVendida}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 truncate max-w-[100px]" title={item.asesor?.nombre}>{item.asesor?.nombre || '-'}</td>
                    <td className="px-2 py-1.5">
                      <span className={cn(
                        "inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium truncate max-w-[100px]",
                        getSupervisorColor(getSupervisorName(item), theme)
                      )} title={getSupervisorName(item)}>
                        {getSupervisorName(item)}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 truncate max-w-[100px]" title={item.auditor?.nombre}>{item.auditor?.nombre || '-'}</td>
                    <td className="px-2 py-1.5 truncate max-w-[100px]" title={item.administrador?.nombre}>{item.administrador?.nombre || '-'}</td>
                    <td className="px-2 py-1.5 text-center">
                      {item.isRecuperada ? (
                        <CheckCircle2 className="w-3 h-3 text-green-500 mx-auto" />
                      ) : (
                        <span className="text-gray-300 dark:text-gray-700">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recalculate Modal - Floating Popover */}
      {showRecalculateModal && (
        <Portal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className={cn(
              "w-full max-w-lg rounded-2xl border p-6 shadow-2xl",
              theme === "dark" ? "bg-[#1a1333] border-white/10" : "bg-white border-gray-200"
            )}>
              <div className="flex items-center justify-between mb-6">
                <h3 className={cn("text-xl font-semibold", theme === "dark" ? "text-white" : "text-gray-800")}>
                  Recalcular Supervisores
                </h3>
                <button
                  onClick={() => setShowRecalculateModal(false)}
                  className={cn(
                    "p-1 rounded-lg transition-colors",
                    theme === "dark" ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-500"
                  )}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-sm">
                  Esta acción recalculará el supervisor asignado a cada venta basándose en la fecha de la venta y el historial de equipos de los asesores.
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                      Desde
                    </label>
                    <input
                      type="date"
                      value={recalcDateFrom}
                      onChange={(e) => setRecalcDateFrom(e.target.value)}
                      className={cn(
                        "w-full px-3 py-2 rounded-lg border text-sm",
                        theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"
                      )}
                    />
                  </div>
                  <div>
                    <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                      Hasta
                    </label>
                    <input
                      type="date"
                      value={recalcDateTo}
                      onChange={(e) => setRecalcDateTo(e.target.value)}
                      className={cn(
                        "w-full px-3 py-2 rounded-lg border text-sm",
                        theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"
                      )}
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onlyMissing}
                    onChange={(e) => setOnlyMissing(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-600"
                  />
                  <span className={cn("text-sm", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                    Solo ventas sin supervisor asignado (snapshot)
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowRecalculateModal(false)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
                    theme === "dark"
                      ? "border-white/10 text-gray-400 hover:bg-white/5"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  )}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRecalculateSupervisors}
                  disabled={recalculating}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-2",
                    recalculating ? "bg-purple-600/50 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700"
                  )}
                >
                  {recalculating && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {recalculating ? "Recalculando..." : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  )
}

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted) return null

  const { createPortal } = require('react-dom')
  return createPortal(children, document.body)
}
