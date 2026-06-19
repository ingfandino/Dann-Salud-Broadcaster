"use client"

import { useState, useEffect, useMemo } from "react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth"
import { RefreshCw, Download, ChevronDown, CheckCircle2 } from "lucide-react"
import * as XLSX from "xlsx"
import { connectSocket } from "@/lib/socket"
import { MonthlyComparisonChart } from "./liquidacion-monthly-chart"
import { MotivationalProgressBars } from "./motivational-progress-bars"
import { LiquidacionSalaryPanel } from "./liquidacion-salary-panel"

const OBRAS_SOCIALES = ["Binimed", "Meplife", "TURF"]

const getSupervisorName = (item: any): string => {
  if (item.supervisorSnapshot?.nombre) return item.supervisorSnapshot.nombre
  if (item.asesor?.supervisor?.nombre) return item.asesor.supervisor.nombre
  return "-"
}

const getObraSocialColor = (obraSocial: string, theme: string) => {
  if (!obraSocial) return theme === "dark" ? "bg-gray-500/20 text-gray-400" : "bg-gray-100 text-gray-700"
  const osLower = obraSocial.toLowerCase()
  if (osLower.includes('meplife')) return theme === "dark" ? "bg-green-900 text-green-200" : "bg-green-100 text-green-800"
  if (osLower.includes('binimed')) return theme === "dark" ? "bg-blue-900 text-blue-200" : "bg-blue-100 text-blue-800"
  if (osLower.includes('turf')) return theme === "dark" ? "bg-violet-900 text-violet-200" : "bg-violet-100 text-violet-800"
  return theme === "dark" ? "bg-gray-500/20 text-gray-400" : "bg-gray-100 text-gray-700"
}

const getSupervisorColor = (supervisorName: string, theme: string) => {
  if (!supervisorName || supervisorName === "-") return theme === "dark" ? "bg-gray-500/20 text-gray-400" : "bg-gray-100 text-gray-700"
  const nombreLower = supervisorName.toLowerCase()

  if ((nombreLower.includes('nahuel') && nombreLower.includes('sanchez')) ||
    (nombreLower.includes('nahia') && nombreLower.includes('avellaneda')) ||
    (nombreLower.includes('santiago') && nombreLower.includes('goldsztein')) ||
    (nombreLower.includes('facundo') && nombreLower.includes('tevez'))) {
    return theme === "dark" ? "bg-red-900 text-red-200" : "bg-red-100 text-red-800"
  }
  if (nombreLower.includes('abigail') && nombreLower.includes('vera')) return theme === "dark" ? "bg-fuchsia-900 text-fuchsia-200" : "bg-fuchsia-100 text-fuchsia-800"
  if (nombreLower.includes('mateo') && nombreLower.includes('viera')) return theme === "dark" ? "bg-blue-900 text-blue-200" : "bg-blue-100 text-blue-800"
  if (nombreLower.includes('belen') && nombreLower.includes('salaverry')) return theme === "dark" ? "bg-purple-900 text-purple-200" : "bg-purple-100 text-purple-800"
  if (nombreLower.includes('analia') && nombreLower.includes('suarez')) return theme === "dark" ? "bg-pink-900 text-pink-200" : "bg-pink-100 text-pink-800"
  if (nombreLower.includes('erika') && nombreLower.includes('cardozo')) return theme === "dark" ? "bg-green-900 text-green-200" : "bg-green-100 text-green-800"
  if (nombreLower.includes('aryel') && nombreLower.includes('puiggros')) return theme === "dark" ? "bg-yellow-900 text-yellow-200" : "bg-yellow-100 text-yellow-800"
  if ((nombreLower.includes('joaquin') && nombreLower.includes('valdez')) || (nombreLower.includes('joquin') && nombreLower.includes('valdez')))
    return theme === "dark" ? "bg-violet-900 text-violet-200" : "bg-violet-100 text-violet-800"
  if (nombreLower.includes('luciano') && nombreLower.includes('carugno')) return theme === "dark" ? "bg-gray-700 text-gray-200" : "bg-gray-200 text-gray-800"
  if (nombreLower.includes('alejandro') && nombreLower.includes('mejail')) return theme === "dark" ? "bg-amber-900 text-amber-200" : "bg-amber-100 text-amber-800"
  if (nombreLower.includes('gaston') && nombreLower.includes('sarmiento')) return theme === "dark" ? "bg-orange-900 text-orange-200" : "bg-orange-100 text-orange-800"

  const colors = [
    { light: "bg-teal-100 text-teal-800", dark: "bg-teal-900 text-teal-200" },
    { light: "bg-cyan-100 text-cyan-800", dark: "bg-cyan-900 text-cyan-200" },
    { light: "bg-rose-100 text-rose-800", dark: "bg-rose-900 text-rose-200" },
    { light: "bg-emerald-100 text-emerald-800", dark: "bg-emerald-900 text-emerald-200" },
    { light: "bg-indigo-100 text-indigo-800", dark: "bg-indigo-900 text-indigo-200" },
  ]
  let hash = 0
  for (let i = 0; i < supervisorName.length; i++) hash = supervisorName.charCodeAt(i) + ((hash << 5) - hash)
  const index = Math.abs(hash) % colors.length
  return theme === "dark" ? colors[index].dark : colors[index].light
}

const formatDateOnly = (value: string) => {
  if (!value) return "-"
  const dateStr = value.split('T')[0]
  if (!dateStr) return "-"
  const [year, month, day] = dateStr.split('-')
  if (!year || !month || !day) return "-"
  return `${day}/${month}/${year}`
}

interface ColumnConfig {
  key: string
  label: string
  hidden?: boolean
}

interface Props {
  tipoLiquidacion: 'supervisor' | 'auditor' | 'administrativo' | 'asesor'
  accentColor: string
  columnas?: ColumnConfig[]
}

const DEFAULT_COLUMNS_SUPERVISOR: ColumnConfig[] = [
  { key: 'fecha', label: 'Fecha' },
  { key: 'afiliado', label: 'Afiliado' },
  { key: 'cuil', label: 'CUIL' },
  { key: 'obraSocial', label: 'O.S. Ven' },
  { key: 'asesor', label: 'Asesor' },
  { key: 'supervisor', label: 'Supervisor' },
  { key: 'auditor', label: 'Auditor' },
  { key: 'admin', label: 'Admin' },
  { key: 'recuperada', label: 'Recup.' },
]

const DEFAULT_COLUMNS_AUDITOR: ColumnConfig[] = [
  { key: 'fecha', label: 'Fecha' },
  { key: 'afiliado', label: 'Afiliado' },
  { key: 'cuil', label: 'CUIL' },
  { key: 'obraSocial', label: 'O.S. Ven' },
  { key: 'estado', label: 'Estado' },
  { key: 'asesor', label: 'Asesor' },
  { key: 'auditor', label: 'Auditor' },
  { key: 'supervisor', label: 'Supervisor' },
]

const DEFAULT_COLUMNS_ADMIN: ColumnConfig[] = [
  { key: 'fecha', label: 'Fecha' },
  { key: 'afiliado', label: 'Afiliado' },
  { key: 'cuil', label: 'CUIL' },
  { key: 'obraSocial', label: 'O.S. Ven' },
  { key: 'estado', label: 'Estado' },
  { key: 'admin', label: 'Administrativo' },
  { key: 'asesor', label: 'Asesor' },
  { key: 'auditor', label: 'Auditor' },
]

const DEFAULT_COLUMNS_ASESOR: ColumnConfig[] = [
  { key: 'fecha', label: 'Fecha' },
  { key: 'afiliado', label: 'Afiliado' },
  { key: 'cuil', label: 'CUIL' },
  { key: 'obraSocial', label: 'O.S. Ven' },
  { key: 'estado', label: 'Estado' },
  { key: 'asesor', label: 'Asesor' },
  { key: 'supervisor', label: 'Supervisor' },
  { key: 'auditor', label: 'Auditor' },
]

export function LiquidacionTableBase({ tipoLiquidacion, accentColor, columnas }: Props) {
  const { theme } = useTheme()
  const { user } = useAuth()
  const userRole = user?.role?.toLowerCase() || ''
  const isAsesor = userRole === 'asesor'
  const isRecuperador = userRole === 'recuperador'
  const isGerenciaOrEncargado = userRole === 'gerencia' || userRole === 'encargado'
  const isSupervisorRole = userRole === 'supervisor' || userRole === 'supervisor_reventa'

  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentWeek, setCurrentWeek] = useState(1)

  const [filters, setFilters] = useState({
    afiliado: "", cuil: "", auditor: "", administrador: "",
    obraSocialVendida: "", estado: "", dateFrom: "", dateTo: "",
  })

  const [selectedSupervisores, setSelectedSupervisores] = useState<string[]>([])
  const [selectedAsesores, setSelectedAsesores] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'fecha' | 'asesor' | 'supervisor'>('fecha')

  const [asesores, setAsesores] = useState<any[]>([])
  const [supervisores, setSupervisores] = useState<any[]>([])
  const [auditores, setAuditores] = useState<any[]>([])
  const [administradores, setAdministradores] = useState<any[]>([])
  const [isSupervisorDropdownOpen, setIsSupervisorDropdownOpen] = useState(false)
  const [isAsesorDropdownOpen, setIsAsesorDropdownOpen] = useState(false)
  const [fechaIngreso, setFechaIngreso] = useState<string | null>(null)

  const cols = columnas || (
    tipoLiquidacion === 'supervisor' ? DEFAULT_COLUMNS_SUPERVISOR :
    tipoLiquidacion === 'asesor' ? DEFAULT_COLUMNS_ASESOR :
    tipoLiquidacion === 'auditor' ? DEFAULT_COLUMNS_AUDITOR :
    DEFAULT_COLUMNS_ADMIN
  )

  const filteredAsesoresList = useMemo(() => {
    if (selectedSupervisores.length === 0) return asesores
    const equipos = new Set<string>()
    selectedSupervisores.forEach(supName => {
      const sup = supervisores.find((s: any) => s.nombre === supName)
      if (sup?.numeroEquipo) equipos.add(sup.numeroEquipo)
    })
    if (equipos.size === 0) return asesores
    return asesores.filter((a: any) => a.numeroEquipo && equipos.has(a.numeroEquipo))
  }, [asesores, selectedSupervisores, supervisores])

  const loadData = async (useFilters = false) => {
    try {
      setLoading(true)
      const params: any = { tipo: tipoLiquidacion }
      if (useFilters) {
        if (filters.dateFrom) params.dateFrom = filters.dateFrom
        if (filters.dateTo) params.dateTo = filters.dateTo
      }
      if (isAsesor && user?._id) params.asesor = user._id
      const { data } = await api.liquidation.listByTipo(params)
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
      // ✅ NUEVA LÓGICA: Asesores incluyen Asesor + Independiente + Auditor con numeroEquipo
      setAsesores(users.filter((u: any) => (
        (u.role?.toLowerCase() === "asesor" || 
         u.role?.toLowerCase() === "independiente" ||
         (u.role?.toLowerCase() === "auditor" && u.numeroEquipo)) && 
        u.active !== false
      )))
      setSupervisores(users.filter((u: any) => ((u.role?.toLowerCase() === "supervisor" || u.role?.toLowerCase() === "encargado") || u._id === "68f2688f549813490d3ee8ee") && u.active !== false))
      // Auditores: ALL role=auditor or RR.HH users (with or without numeroEquipo) for payroll summary.
      // Auditor/RR.HH without numeroEquipo → regular pay. Auditor/RR.HH with numeroEquipo → hybrid: $4k/audit, no basic.
      setAuditores(users.filter((u: any) => (u.role?.toLowerCase() === "auditor" || u.role?.toLowerCase() === "rr.hh") && u.active !== false))
      setAdministradores(users.filter((u: any) => u.role?.toLowerCase() === "administrativo" && u.active !== false))
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadData()
    loadFilterOptions()

    const socket = connectSocket()
    socket.emit("audits:subscribeAll")

    const handleNewAudit = (newAudit: any) => {
      setItems(prev => {
        if (prev.some(a => a._id === newAudit._id)) return prev
        return [newAudit, ...prev]
      })
    }
    const handleAuditUpdate = (updatedAudit: any) => {
      setItems(prev => {
        const idx = prev.findIndex(a => a._id === updatedAudit._id)
        if (idx === -1) return [updatedAudit, ...prev]
        const updated = [...prev]
        updated[idx] = { ...prev[idx], ...updatedAudit }
        return updated
      })
    }
    const handleAuditDeleted = (data: { _id: string }) => {
      setItems(prev => prev.filter(a => a._id !== data._id))
    }

    socket.on("audits:new", handleNewAudit)
    socket.on("audit:update", handleAuditUpdate)
    socket.on("audit:deleted", handleAuditDeleted)

    return () => {
      socket.off("audits:new", handleNewAudit)
      socket.off("audit:update", handleAuditUpdate)
      socket.off("audit:deleted", handleAuditDeleted)
      socket.emit("audits:unsubscribeAll")
    }
  }, [tipoLiquidacion])

  // Fecha de ingreso (RR.HH.) - solo cuando un único usuario está seleccionado
  useEffect(() => {
    const fetchFechaIngreso = async () => {
      let targetUser: any = null

      if (tipoLiquidacion === 'supervisor' && selectedSupervisores.length === 1) {
        targetUser = supervisores.find((s: any) => s.nombre === selectedSupervisores[0])
      } else if (tipoLiquidacion === 'asesor' && selectedAsesores.length === 1) {
        targetUser = asesores.find((a: any) => a.nombre === selectedAsesores[0])
      }

      if (!targetUser?._id) {
        setFechaIngreso(null)
        return
      }

      try {
        const { data } = await api.employees.getIngreso(targetUser._id)
        if (data?.fechaIngreso) {
          const d = new Date(data.fechaIngreso)
          const day = String(d.getDate()).padStart(2, '0')
          const month = String(d.getMonth() + 1).padStart(2, '0')
          const year = d.getFullYear()
          setFechaIngreso(`${day}/${month}/${year}`)
        } else {
          setFechaIngreso('No registrada')
        }
      } catch {
        setFechaIngreso('No registrada')
      }
    }

    fetchFechaIngreso()
  }, [tipoLiquidacion, selectedSupervisores, selectedAsesores, supervisores, asesores])

  // Week logic
  const getWeekStart = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay()
    const hours = d.getHours()
    const minutes = d.getMinutes()
    if (day === 4 && (hours > 23 || (hours === 23 && minutes >= 1))) {
      d.setDate(d.getDate() + 1); d.setHours(0, 0, 0, 0)
    }
    const currentDay = d.getDay()
    let daysToSubtract = currentDay === 5 ? 0 : currentDay === 6 ? 1 : currentDay + 2
    d.setDate(d.getDate() - daysToSubtract)
    d.setHours(0, 0, 0, 0)
    return d
  }

  const toLocalDateString = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

  const parseUTCDate = (isoString: string): Date => {
    if (!isoString) return new Date()
    const dateStr = isoString.split('T')[0]
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Date(year, month - 1, day, 12, 0, 0)
  }

  const getStatusFilters = () => {
    // ✅ NUEVA LÓGICA: Supervisor y Asesor solo ven QR hecho (el backend filtra Binimed exception)
    if (tipoLiquidacion === 'supervisor' || tipoLiquidacion === 'asesor') return ["QR hecho", "Cargada (Binimed excepción)"]
    if (tipoLiquidacion === 'auditor') return [
      'Rechazada', 'Completa', 'Pendiente', 'QR hecho',
      'QR hecho pero pendiente de aprobación', 'AFIP',
      'Baja laboral sin nueva alta', 'Baja laboral con nueva alta',
      'En revisión', 'Remuneración no válida',
      'Cargada', 'Aprobada', 'Aprobada pero no reconoce clave', // ✅ Canonical: no comma
      'El afiliado cambió la clave'
    ]
    if (tipoLiquidacion === 'administrativo') return [
      'QR hecho', 'QR hecho (Temporal)',
      'QR hecho pero pendiente de aprobación', 'AFIP',
      'Baja laboral sin nueva alta', 'Baja laboral con nueva alta',
      'Remuneración no válida', 'Cargada', 'Aprobada',
      'Aprobada pero no reconoce clave', 'Rechazada' // ✅ Canonical: no comma
    ]
    return []
  }

  const statusFilter = getStatusFilters()

  const itemsByWeek = useMemo(() => {
    const weeks: Record<string, any[]> = {}
    items.forEach(item => {
      if (tipoLiquidacion === 'supervisor' && !["Cargada", "Aprobada", "QR hecho"].includes(item.status)) return
      const dateField = item.fechaCreacionQR || item.scheduledAt
      const date = parseUTCDate(dateField || item.createdAt)
      const weekStart = toLocalDateString(getWeekStart(date))
      if (!weeks[weekStart]) weeks[weekStart] = []
      weeks[weekStart].push(item)
    })
    return Object.entries(weeks)
      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
      .map(([start, items]) => ({ start, items }))
  }, [items])

  const filteredItems = useMemo(() => {
    let baseItems = tipoLiquidacion === 'supervisor'
      ? items.filter(i => ["Cargada", "Aprobada", "QR hecho"].includes(i.status))
      : [...items]

    if (filters.dateFrom || filters.dateTo) {
      baseItems = baseItems.filter(item => {
        const dateField = item.fechaCreacionQR || item.scheduledAt
        const d = parseUTCDate(dateField)
        const itemDate = toLocalDateString(d)
        if (filters.dateFrom && itemDate < filters.dateFrom) return false
        if (filters.dateTo && itemDate > filters.dateTo) return false
        return true
      })
    } else if (tipoLiquidacion === 'supervisor') {
      baseItems = itemsByWeek[currentWeek - 1]?.items || []
    }

    let result = baseItems.filter(item => {
      if (isRecuperador && !item.isRecuperada) return false
      if (filters.afiliado && !item.nombre?.toLowerCase().includes(filters.afiliado.toLowerCase())) return false
      if (filters.cuil && !item.cuil?.includes(filters.cuil)) return false
      if (selectedSupervisores.length > 0 && !selectedSupervisores.includes(getSupervisorName(item))) return false
      if (selectedAsesores.length > 0 && !selectedAsesores.includes(item.asesor?.nombre || '')) return false
      if (filters.auditor && item.auditor?._id !== filters.auditor) return false
      if (filters.administrador && item.administrador?._id !== filters.administrador) return false
      if (filters.obraSocialVendida && item.obraSocialVendida !== filters.obraSocialVendida) return false
      if (filters.estado && item.status !== filters.estado) return false
      return true
    })

    return result.sort((a, b) => {
      if (sortBy === 'asesor') return (a.asesor?.nombre || '').localeCompare(b.asesor?.nombre || '')
      if (sortBy === 'supervisor') return getSupervisorName(a).localeCompare(getSupervisorName(b))
      return new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
    })
  }, [items, itemsByWeek, currentWeek, filters, selectedSupervisores, selectedAsesores, sortBy, isRecuperador])

  // Stats
  const stats = useMemo(() => {
    if (tipoLiquidacion === 'supervisor') {
      return {
        qr: filteredItems.filter(i => i.status === 'QR hecho').length,
        cargada: filteredItems.filter(i => i.status === 'Cargada').length,
        aprobada: filteredItems.filter(i => i.status === 'Aprobada').length,
        total: filteredItems.length,
      }
    }
    return { total: filteredItems.length }
  }, [filteredItems])

  // Export — multi-sheet contextual by role
  const itemToRow = (item: any) => ({
    Fecha: formatDateOnly(item.fechaCreacionQR || item.scheduledAt),
    Afiliado: item.nombre || '-',
    CUIL: item.cuil || '-',
    'O.S. Vendida': item.obraSocialVendida || '-',
    Estado: item.status || '-',
    Asesor: item.asesor?.nombre || '-',
    Supervisor: getSupervisorName(item),
    Auditor: item.auditor?.nombre || '-',
    Administrativo: item.administrador?.nombre || '-',
  })

  const sanitizeSheetName = (name: string) =>
    (name || 'Sin nombre').replace(/[*?:\\/\[\]]/g, '').substring(0, 31) || 'Hoja'

  const handleExport = () => {
    try {
      const tipoLabel = tipoLiquidacion === 'supervisor' ? 'supervisores' : tipoLiquidacion === 'auditor' ? 'auditores' : 'administrativos'
      const wb = XLSX.utils.book_new()

      if (tipoLiquidacion === 'supervisor' && isGerenciaOrEncargado) {
        // Gerencia/Encargado → 1 sheet per supervisor
        const grouped: Record<string, any[]> = {}
        filteredItems.forEach(item => {
          const supName = getSupervisorName(item) || 'Sin Supervisor'
          if (!grouped[supName]) grouped[supName] = []
          grouped[supName].push(item)
        })
        const entries = Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]))
        if (entries.length === 0) {
          const ws = XLSX.utils.json_to_sheet([])
          XLSX.utils.book_append_sheet(wb, ws, 'Sin Datos')
        } else {
          entries.forEach(([supName, items]) => {
            const ws = XLSX.utils.json_to_sheet(items.map(itemToRow))
            XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(supName))
          })
        }
      } else if (tipoLiquidacion === 'supervisor' && isSupervisorRole) {
        // Supervisor → 1 sheet per asesor
        const grouped: Record<string, any[]> = {}
        filteredItems.forEach(item => {
          const asesorName = item.asesor?.nombre || 'Sin Asesor'
          if (!grouped[asesorName]) grouped[asesorName] = []
          grouped[asesorName].push(item)
        })
        const entries = Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]))
        if (entries.length === 0) {
          const ws = XLSX.utils.json_to_sheet([])
          XLSX.utils.book_append_sheet(wb, ws, 'Sin Datos')
        } else {
          entries.forEach(([asesorName, items]) => {
            const ws = XLSX.utils.json_to_sheet(items.map(itemToRow))
            XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(asesorName))
          })
        }
      } else {
        // Single sheet for all other roles/accordion combos
        const rows = filteredItems.map(itemToRow)
        const ws = XLSX.utils.json_to_sheet(rows)
        XLSX.utils.book_append_sheet(wb, ws, `Liquidación ${tipoLabel}`)
      }

      XLSX.writeFile(wb, `liquidacion_${tipoLabel}_${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success("Archivo exportado correctamente")
    } catch (err) {
      console.error(err)
      toast.error("Error al exportar")
    }
  }

  // User list for chart
  const chartUserList = useMemo(() => {
    if (tipoLiquidacion === 'supervisor') return supervisores.map((s: any) => ({ _id: s._id, nombre: s.nombre }))
    if (tipoLiquidacion === 'auditor') return auditores.map((a: any) => ({ _id: a._id, nombre: a.nombre }))
    return administradores.map((a: any) => ({ _id: a._id, nombre: a.nombre }))
  }, [supervisores, auditores, administradores, tipoLiquidacion])

  // --- Salary panel helpers ---

  // Supervisors for salary summary: ONLY role=supervisor (exclude gerencia/encargado)
  const supervisoresPayroll = useMemo(() =>
    supervisores.filter((s: any) => s.role?.toLowerCase() === 'supervisor')
  , [supervisores])

  // Current labor week items from filteredItems (Fri–Thu, using the selected week)
  const currentWeekFilteredItems = useMemo(() => {
    if (!itemsByWeek[currentWeek - 1]) return []
    const weekStart = itemsByWeek[currentWeek - 1].start
    const weekStartDate = new Date(weekStart + 'T00:00:00')
    // week ends Thursday (6 days after Friday start)
    const weekEndDate = new Date(weekStartDate)
    weekEndDate.setDate(weekEndDate.getDate() + 6)
    weekEndDate.setHours(23, 59, 59, 999)
    return filteredItems.filter(item => {
      const dateField = item.fechaCreacionQR || item.scheduledAt
      const d = parseUTCDate(dateField)
      return d >= weekStartDate && d <= weekEndDate
    })
  }, [filteredItems, itemsByWeek, currentWeek])

  // Weekly count for the individual user view (intersect filteredItems with selected week)
  const ventasSemanalForPanel = useMemo(() => {
    if (filters.dateFrom || filters.dateTo) return filteredItems.length
    return currentWeekFilteredItems.length
  }, [currentWeekFilteredItems, filteredItems, filters.dateFrom, filters.dateTo])

  // Per-user sale counts from filteredItems (for global salary summary)
  const userSaleCountsFromItems = useMemo(() => {
    const map: Record<string, number> = {}
    if (tipoLiquidacion === 'asesor' || tipoLiquidacion === 'supervisor') {
      // Count by asesor._id (for both asesor and supervisor tabs)
      filteredItems.forEach(item => {
        const id = item.asesor?._id || item.asesor
        if (id) map[String(id)] = (map[String(id)] || 0) + 1
      })
    } else if (tipoLiquidacion === 'auditor') {
      // Count by auditor._id
      filteredItems.forEach(item => {
        const id = item.auditor?._id || item.auditor
        if (id) map[String(id)] = (map[String(id)] || 0) + 1
      })
    }
    return map
  }, [filteredItems, tipoLiquidacion])

  // Build userList with sale counts for global salary summary
  const salaryPanelUserList = useMemo(() => {
    if (tipoLiquidacion === 'asesor') {
      return asesores.map((u: any) => ({ _id: u._id, nombre: u.nombre, ventasMensuales: userSaleCountsFromItems[String(u._id)] || 0, numeroEquipo: u.numeroEquipo || '' }))
    }
    if (tipoLiquidacion === 'supervisor') {
      // For supervisor tab: aggregate by supervisor (sum all their team asesores' sales)
      return supervisoresPayroll.map((u: any) => {
        // Sum sales of all asesores whose supervisorSnapshot or asesor.supervisor matches this supervisor
        const supItems = filteredItems.filter(item => getSupervisorName(item) === u.nombre)
        return { _id: u._id, nombre: u.nombre, ventasMensuales: supItems.length, numeroEquipo: u.numeroEquipo || '' }
      })
    }
    if (tipoLiquidacion === 'auditor') {
      return auditores.map((u: any) => ({
        _id: u._id,
        nombre: u.nombre,
        ventasMensuales: userSaleCountsFromItems[String(u._id)] || 0,
        numeroEquipo: u.numeroEquipo || '',
        role: u.role || 'auditor',
      }))
    }
    return []
  }, [tipoLiquidacion, asesores, supervisoresPayroll, auditores, userSaleCountsFromItems, filteredItems])

  const renderCellValue = (item: any, colKey: string) => {
    switch (colKey) {
      case 'fecha':
        return <span className="whitespace-nowrap opacity-70">{formatDateOnly(item.fechaCreacionQR || item.scheduledAt)}</span>
      case 'afiliado':
        return <span className="font-medium truncate max-w-[150px] block" title={item.nombre}>{item.nombre}</span>
      case 'cuil':
        return <span className="font-mono opacity-70 truncate">{item.cuil}</span>
      case 'obraSocial':
        return <span className={cn("inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium", getObraSocialColor(item.obraSocialVendida, theme))}>{item.obraSocialVendida}</span>
      case 'estado':
        return <span className="text-[10px] font-medium">{item.status || '-'}</span>
      case 'asesor':
        return <span className="truncate max-w-[100px] block" title={item.asesor?.nombre}>{item.asesor?.nombre || '-'}</span>
      case 'supervisor':
        const supName = getSupervisorName(item)
        return <span className={cn("inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium truncate max-w-[100px]", getSupervisorColor(supName, theme))} title={supName}>{supName}</span>
      case 'auditor':
        return <span className="truncate max-w-[100px] block" title={item.auditor?.nombre}>{item.auditor?.nombre || '-'}</span>
      case 'admin':
        return <span className="truncate max-w-[100px] block" title={item.administrador?.nombre}>{item.administrador?.nombre || '-'}</span>
      case 'recuperada':
        return item.isRecuperada ? <CheckCircle2 className="w-3 h-3 text-green-500 mx-auto" /> : <span className="text-gray-300 dark:text-gray-700">-</span>
      default:
        return '-'
    }
  }

  return (
    <div className="space-y-4">
      {/* Monthly Chart */}
      <MonthlyComparisonChart
        tipo={tipoLiquidacion}
        userList={chartUserList}
        accentColor={accentColor}
      />

      {/* Motivational Progress Bars - Solo para Asesor y Supervisor en vista individual */}
      {(tipoLiquidacion === 'asesor' || tipoLiquidacion === 'supervisor') && (
        <MotivationalProgressBars
          tipo={tipoLiquidacion as 'asesor' | 'supervisor'}
          ventasMensuales={stats.total}
          ventasSemanal={ventasSemanalForPanel}
          isIndividualView={selectedAsesores.length === 1 || (tipoLiquidacion === 'supervisor' && isSupervisorRole && selectedSupervisores.length === 1)}
        />
      )}

      {/* Panel de Cálculo de Sueldos - Para Asesores, Supervisores y Auditores */}
      {(tipoLiquidacion === 'asesor' || tipoLiquidacion === 'supervisor' || tipoLiquidacion === 'auditor') && (
        <LiquidacionSalaryPanel
          tipo={tipoLiquidacion as 'asesor' | 'supervisor' | 'auditor'}
          userId={
            tipoLiquidacion === 'asesor' && selectedAsesores.length === 1
              ? asesores.find((a: any) => a.nombre === selectedAsesores[0])?._id
              : tipoLiquidacion === 'supervisor' && isSupervisorRole
              ? user?._id
              : undefined
          }
          userName={
            tipoLiquidacion === 'asesor' && selectedAsesores.length === 1
              ? selectedAsesores[0]
              : tipoLiquidacion === 'supervisor' && isSupervisorRole
              ? user?.nombre
              : undefined
          }
          ventasMensuales={stats.total}
          ventasSemanal={ventasSemanalForPanel}
          isGlobalView={
            tipoLiquidacion === 'asesor'
              ? selectedAsesores.length !== 1
              : tipoLiquidacion === 'supervisor'
              ? isSupervisorRole ? false : selectedSupervisores.length !== 1
              : true
          }
          userList={salaryPanelUserList}
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
        />
      )}

      {/* Header + Export */}
      <div className="flex flex-col md:flex-row justify-between gap-3">
        <div className="flex gap-2 text-xs font-medium">
          {tipoLiquidacion === 'supervisor' && (
            <>
              <span className="px-2 py-1 bg-green-500/20 text-green-600 rounded">QR: {(stats as any).qr}</span>
              <span className="px-2 py-1 bg-blue-500/20 text-blue-600 rounded">Cargada: {(stats as any).cargada}</span>
              <span className="px-2 py-1 bg-teal-500/20 text-teal-600 rounded">Aprobada: {(stats as any).aprobada}</span>
            </>
          )}
          <span className="px-2 py-1 rounded" style={{ backgroundColor: `${accentColor}20`, color: accentColor }}>
            Total: {stats.total}
          </span>
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium">
          <Download className="w-3 h-3" /> Exportar Excel
        </button>
      </div>

      {/* Week navigation (supervisor only) */}
      {tipoLiquidacion === 'supervisor' && !filters.dateFrom && !filters.dateTo && itemsByWeek.length > 0 && (
        <div className={cn("flex items-center justify-between p-2 rounded-lg", theme === "dark" ? "bg-white/5" : "bg-gray-50")}>
          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium">Semana:</span>
            <button onClick={() => setCurrentWeek(Math.max(1, currentWeek - 1))} disabled={currentWeek === 1} className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded disabled:opacity-50">←</button>
            <span className="px-2 py-0.5 text-white rounded text-xs font-bold" style={{ backgroundColor: accentColor }}>{currentWeek}</span>
            <button onClick={() => setCurrentWeek(Math.min(itemsByWeek.length, currentWeek + 1))} disabled={currentWeek === itemsByWeek.length} className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded disabled:opacity-50">→</button>
            <span className="opacity-60">de {itemsByWeek.length}</span>
          </div>
        </div>
      )}

      {/* Sort buttons */}
      <div className="flex items-center gap-2">
        <span className={cn("text-xs font-medium", theme === "dark" ? "text-gray-300" : "text-gray-600")}>Ordenar:</span>
        {(['fecha', 'asesor', 'supervisor'] as const).map(opt => (
          <button key={opt} onClick={() => setSortBy(opt)}
            className={cn("px-2 py-1 rounded text-[10px] font-medium transition-colors",
              sortBy === opt ? "text-white" : theme === "dark" ? "bg-white/10 text-gray-300" : "bg-gray-100 text-gray-700"
            )}
            style={sortBy === opt ? { backgroundColor: accentColor } : {}}
          >
            {opt === 'fecha' ? 'Fecha' : opt === 'asesor' ? 'Asesor' : 'Supervisor'}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <input placeholder="Buscar afiliado..." value={filters.afiliado} onChange={e => setFilters({ ...filters, afiliado: e.target.value })}
          className={cn("px-2 py-1.5 rounded-lg border text-xs", theme === "dark" ? "bg-black/20 border-white/10" : "bg-white")} />
        <input placeholder="Buscar CUIL..." value={filters.cuil} onChange={e => setFilters({ ...filters, cuil: e.target.value })}
          className={cn("px-2 py-1.5 rounded-lg border text-xs", theme === "dark" ? "bg-black/20 border-white/10" : "bg-white")} />

        {/* Supervisor multi-select */}
        <div className="relative">
          <button onClick={() => setIsSupervisorDropdownOpen(!isSupervisorDropdownOpen)}
            className={cn("w-full flex items-center justify-between px-2 py-1.5 rounded-lg border text-xs", theme === "dark" ? "bg-black/20 border-white/10" : "bg-white")}>
            <span className="truncate">{selectedSupervisores.length === 0 ? "Supervisores" : `${selectedSupervisores.length} sup.`}</span>
            <ChevronDown className="w-3 h-3 ml-1" />
          </button>
          {isSupervisorDropdownOpen && (
            <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-lg shadow-lg border bg-white dark:bg-gray-800 dark:border-gray-700">
              <div className="flex items-center justify-between px-2 py-1.5 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
                <button type="button" onClick={() => setSelectedSupervisores(supervisores.map(s => s.nombre))} className="text-[10px] text-blue-600">Todos</button>
                {selectedSupervisores.length > 0 && <button type="button" onClick={() => setSelectedSupervisores([])} className="text-[10px] text-blue-600">Limpiar</button>}
              </div>
              {supervisores.map(s => (
                <label key={s._id} className="flex items-center gap-2 px-2 py-1.5 text-[10px] hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                  <input type="checkbox" checked={selectedSupervisores.includes(s.nombre)} onChange={() => setSelectedSupervisores(prev => prev.includes(s.nombre) ? prev.filter(n => n !== s.nombre) : [...prev, s.nombre])} className="accent-blue-600" />
                  <span className="dark:text-gray-200">{s.nombre}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Asesor multi-select */}
        {!isAsesor && (
          <div className="relative">
            <button onClick={() => setIsAsesorDropdownOpen(!isAsesorDropdownOpen)}
              className={cn("w-full flex items-center justify-between px-2 py-1.5 rounded-lg border text-xs", theme === "dark" ? "bg-black/20 border-white/10" : "bg-white")}>
              <span className="truncate">{selectedAsesores.length === 0 ? "Asesores" : `${selectedAsesores.length} ases.`}</span>
              <ChevronDown className="w-3 h-3 ml-1" />
            </button>
            {isAsesorDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-lg shadow-lg border bg-white dark:bg-gray-800 dark:border-gray-700">
                <div className="flex items-center justify-between px-2 py-1.5 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
                  <button type="button" onClick={() => setSelectedAsesores(filteredAsesoresList.map(a => a.nombre))} className="text-[10px] text-blue-600">Todos</button>
                  {selectedAsesores.length > 0 && <button type="button" onClick={() => setSelectedAsesores([])} className="text-[10px] text-blue-600">Limpiar</button>}
                </div>
                {filteredAsesoresList.map(a => (
                  <label key={a._id} className="flex items-center gap-2 px-2 py-1.5 text-[10px] hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                    <input type="checkbox" checked={selectedAsesores.includes(a.nombre)} onChange={() => setSelectedAsesores(prev => prev.includes(a.nombre) ? prev.filter(n => n !== a.nombre) : [...prev, a.nombre])} className="accent-blue-600" />
                    <span className="dark:text-gray-200">{a.nombre}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <select value={filters.auditor} onChange={e => setFilters({ ...filters, auditor: e.target.value })}
          className={cn("px-2 py-1.5 rounded-lg border text-xs", theme === "dark" ? "bg-black/20 border-white/10" : "bg-white")}>
          <option value="">Auditores</option>
          {auditores.map(a => <option key={a._id} value={a._id}>{a.nombre}</option>)}
        </select>
        <select value={filters.administrador} onChange={e => setFilters({ ...filters, administrador: e.target.value })}
          className={cn("px-2 py-1.5 rounded-lg border text-xs", theme === "dark" ? "bg-black/20 border-white/10" : "bg-white")}>
          <option value="">Administrativos</option>
          {administradores.map(a => <option key={a._id} value={a._id}>{a.nombre}</option>)}
        </select>
        <select value={filters.obraSocialVendida} onChange={e => setFilters({ ...filters, obraSocialVendida: e.target.value })}
          className={cn("px-2 py-1.5 rounded-lg border text-xs", theme === "dark" ? "bg-black/20 border-white/10" : "bg-white")}>
          <option value="">Obras Sociales</option>
          {OBRAS_SOCIALES.map(os => <option key={os} value={os}>{os}</option>)}
        </select>
        {statusFilter.length > 0 && (
          <select value={filters.estado} onChange={e => setFilters({ ...filters, estado: e.target.value })}
            className={cn("px-2 py-1.5 rounded-lg border text-xs", theme === "dark" ? "bg-black/20 border-white/10" : "bg-white")}>
            <option value="">Estados</option>
            {statusFilter.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input type="date" value={filters.dateFrom} onChange={e => setFilters({ ...filters, dateFrom: e.target.value })}
          className={cn("px-2 py-1.5 rounded-lg border text-xs", theme === "dark" ? "bg-black/20 border-white/10" : "bg-white")} />
        <input type="date" value={filters.dateTo} onChange={e => setFilters({ ...filters, dateTo: e.target.value })}
          className={cn("px-2 py-1.5 rounded-lg border text-xs", theme === "dark" ? "bg-black/20 border-white/10" : "bg-white")} />
        <button onClick={() => loadData(true)} className="px-3 py-1.5 text-white rounded-lg text-xs transition-colors" style={{ backgroundColor: accentColor }}>Buscar</button>
        <button onClick={() => {
          setFilters({ afiliado: "", cuil: "", auditor: "", administrador: "", obraSocialVendida: "", estado: "", dateFrom: "", dateTo: "" })
          setSelectedSupervisores([]); setSelectedAsesores([]); setSortBy('fecha')
          setTimeout(() => loadData(false), 0)
        }} className={cn("px-3 py-1.5 rounded-lg text-xs", theme === "dark" ? "bg-white/10 hover:bg-white/20" : "bg-gray-100 hover:bg-gray-200")}>
          Limpiar
        </button>
      </div>

      {/* Fecha de ingreso (solo Supervisores / Asesores con 1 seleccionado) */}
      {fechaIngreso !== null && (tipoLiquidacion === 'supervisor' || tipoLiquidacion === 'asesor') && (
        <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium",
          theme === "dark" ? "bg-white/5 border-white/10 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-700"
        )}>
          <span className="opacity-70">Fecha de ingreso:</span>
          <span className={cn(fechaIngreso === 'No registrada' ? "text-red-500" : "text-foreground")}>{fechaIngreso}</span>
        </div>
      )}

      {/* Table */}
      <div className={cn("rounded-xl border shadow-sm overflow-hidden", theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-gray-200")}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className={cn("text-left font-semibold uppercase tracking-wider sticky top-0 z-10",
              theme === "dark" ? "bg-gray-900 text-gray-300" : "bg-gray-50 text-gray-600")}>
              <tr>
                {cols.map(col => (
                  <th key={col.key} className="px-2 py-2">{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-white/5">
              {loading ? (
                <tr><td colSpan={cols.length} className="px-4 py-8 text-center opacity-50">
                  <div className="flex justify-center items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> Cargando...</div>
                </td></tr>
              ) : filteredItems.length === 0 ? (
                <tr><td colSpan={cols.length} className="px-4 py-8 text-center opacity-50">No se encontraron registros</td></tr>
              ) : (
                filteredItems.map((item, idx) => (
                  <tr key={item._id} className={cn("transition-colors",
                    theme === "dark" ? "hover:bg-white/5" : "hover:bg-gray-50",
                    idx % 2 === 0 ? "" : theme === "dark" ? "bg-white/[0.02]" : "bg-gray-50/50")}>
                    {cols.map(col => (
                      <td key={col.key} className="px-2 py-1.5">{renderCellValue(item, col.key)}</td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
