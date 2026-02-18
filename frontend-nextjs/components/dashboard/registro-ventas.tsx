"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { createPortal } from "react-dom"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import {
  Filter, Download, Calendar, Pencil, Trash2,
  X, ChevronDown, ChevronUp, RefreshCw,
  Upload, FileSpreadsheet, AlertCircle, CheckCircle2, FileWarning, Info, Copy
} from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth"
import * as XLSX from "xlsx"
import { RegistroVentasEditModal } from "./registro-ventas-edit-modal"
import { connectSocket } from "@/lib/socket"

const OBRAS_VENDIDAS = ["Binimed", "Meplife", "RAS", "TURF", "Medicenter"]

const STATUS_OPTIONS = [
  "Pendiente",
  "QR hecho",
  "QR hecho (Temporal)",
  "QR hecho pero pendiente de aprobación",
  "Hacer QR",
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
  "El afiliado cambió la clave",
  "Autovinculación",
  "Caída",
  "Completa",
]

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
  fechaCreacionQR?: string
  supervisorSnapshot?: {
    _id: string
    nombre: string
    numeroEquipo: string
  }
  aporte?: number
  cuit?: string
  observacionPrivada?: string
  clave?: string
  email?: string
  mesPadron?: string
  statusAdministrativo?: string
  statusHistory?: Array<{
    value: string
    updatedBy?: { nombre?: string }
    updatedAt?: string
  }>
}

interface User {
  _id: string
  nombre: string
  email: string
  role: string
  numeroEquipo?: string
  active?: boolean
}

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

const formatDateOnly = (value: string) => {
  if (!value) return "-"
  const dateStr = value.split('T')[0]
  if (!dateStr) return "-"
  const [year, month, day] = dateStr.split('-')
  if (!year || !month || !day) return "-"
  return `${day}/${month}/${year}`
}

const getAuditDateKey = (audit: { scheduledAt: string; fechaCreacionQR?: string; status?: string }) => {
  const dateValue = audit.scheduledAt || audit.fechaCreacionQR
  if (!dateValue) return ""
  return dateValue.split('T')[0] || ""
}

const formatDayHeader = (dateKey: string) => {
  if (!dateKey) return ""
  const [year, month, day] = dateKey.split('-')
  if (!year || !month || !day) return dateKey
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const dayName = dayNames[date.getDay()]
  return `${dayName} ${day}/${month}/${year}`
}

const getCurrentArgentinaDate = () => {
  const now = new Date()
  const argentinaTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }))
  const hours = argentinaTime.getHours()
  const minutes = argentinaTime.getMinutes()
  if ((hours === 23 && minutes >= 1) || hours > 23) {
    argentinaTime.setDate(argentinaTime.getDate() + 1)
  }
  const year = argentinaTime.getFullYear()
  const month = String(argentinaTime.getMonth() + 1).padStart(2, "0")
  const day = String(argentinaTime.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const getWeeklyWorkPeriod = () => {
  const now = new Date()
  const argentinaTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }))
  const dayOfWeek = argentinaTime.getDay()
  const hours = argentinaTime.getHours()
  const minutes = argentinaTime.getMinutes()

  let fridayStart = new Date(argentinaTime)
  let thursdayEnd = new Date(argentinaTime)

  if (dayOfWeek === 4 && (hours > 23 || (hours === 23 && minutes >= 1))) {
    fridayStart.setDate(argentinaTime.getDate() + 1)
  } else if (dayOfWeek === 5) {
    fridayStart.setDate(argentinaTime.getDate())
  } else if (dayOfWeek === 6) {
    fridayStart.setDate(argentinaTime.getDate() - 1)
  } else if (dayOfWeek === 0) {
    fridayStart.setDate(argentinaTime.getDate() - 2)
  } else {
    fridayStart.setDate(argentinaTime.getDate() - dayOfWeek - 2)
  }

  fridayStart.setHours(0, 0, 0, 0)

  thursdayEnd = new Date(fridayStart)
  thursdayEnd.setDate(fridayStart.getDate() + 6)
  thursdayEnd.setHours(23, 1, 0, 0)

  const formatDate = (d: Date) => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  return {
    dateFrom: formatDate(fridayStart),
    dateTo: formatDate(thursdayEnd)
  }
}

const STATUS_COLORS: Record<string, {
  badge: { light: string; dark: string }
  row: { light: string; dark: string }
}> = {
  "qr hecho": {
    badge: { light: "bg-green-100 text-green-700", dark: "bg-green-500/30 text-green-300" },
    row: { light: "bg-green-50 hover:bg-green-100", dark: "bg-green-900/20 hover:bg-green-900/30" },
  },
  "aprobada": {
    badge: { light: "bg-teal-100 text-teal-700", dark: "bg-teal-500/30 text-teal-300" },
    row: { light: "bg-teal-50 hover:bg-teal-100", dark: "bg-teal-900/20 hover:bg-teal-900/30" },
  },
  "pendiente": {
    badge: { light: "bg-stone-100 text-stone-600", dark: "bg-stone-500/30 text-stone-300" },
    row: { light: "bg-stone-50 hover:bg-stone-100", dark: "bg-stone-800/20 hover:bg-stone-800/30" },
  },
  "cargada": {
    badge: { light: "bg-indigo-100 text-indigo-700", dark: "bg-indigo-500/30 text-indigo-300" },
    row: { light: "bg-indigo-50 hover:bg-indigo-100", dark: "bg-indigo-900/20 hover:bg-indigo-900/30" },
  },
  "rechazada": {
    badge: { light: "bg-red-100 text-red-700", dark: "bg-red-500/30 text-red-300" },
    row: { light: "bg-red-50 hover:bg-red-100", dark: "bg-red-900/20 hover:bg-red-900/30" },
  },
  "padrón": {
    badge: { light: "bg-amber-100 text-amber-700", dark: "bg-amber-500/30 text-amber-300" },
    row: { light: "bg-amber-50 hover:bg-amber-100", dark: "bg-amber-900/20 hover:bg-amber-900/30" },
  },
  "remuneración no válida": {
    badge: { light: "bg-red-200 text-red-800", dark: "bg-red-700/30 text-red-400" },
    row: { light: "bg-red-100 hover:bg-red-200", dark: "bg-red-900/30 hover:bg-red-900/40" },
  },
  "autovinculación": {
    badge: { light: "bg-pink-100 text-pink-700", dark: "bg-pink-500/30 text-pink-300" },
    row: { light: "bg-pink-50 hover:bg-pink-100", dark: "bg-pink-900/20 hover:bg-pink-900/30" },
  },
  "caída": {
    badge: { light: "bg-rose-200 text-rose-800", dark: "bg-rose-800/40 text-rose-300" },
    row: { light: "bg-rose-100 hover:bg-rose-200", dark: "bg-rose-900/30 hover:bg-rose-900/40" },
  },
  "en revisión": {
    badge: { light: "bg-slate-100 text-slate-600", dark: "bg-slate-500/30 text-slate-300" },
    row: { light: "bg-slate-50 hover:bg-slate-100", dark: "bg-slate-800/20 hover:bg-slate-800/30" },
  },
  "afip": {
    badge: { light: "bg-slate-200 text-slate-700", dark: "bg-slate-500/30 text-slate-300" },
    row: { light: "bg-slate-100 hover:bg-slate-200", dark: "bg-slate-700/30 hover:bg-slate-700/40" },
  },
  "hacer qr": {
    badge: { light: "bg-yellow-100 text-yellow-700", dark: "bg-yellow-500/30 text-yellow-300" },
    row: { light: "bg-yellow-50 hover:bg-yellow-100", dark: "bg-yellow-900/20 hover:bg-yellow-900/30" },
  },
  "qr hecho (temporal)": {
    badge: { light: "bg-lime-100 text-lime-700", dark: "bg-lime-500/30 text-lime-300" },
    row: { light: "bg-lime-50 hover:bg-lime-100", dark: "bg-lime-900/20 hover:bg-lime-900/30" },
  },
  "qr hecho pero pendiente de aprobación": {
    badge: { light: "bg-emerald-100 text-emerald-800", dark: "bg-emerald-500/20 text-emerald-400" },
    row: { light: "bg-emerald-50 hover:bg-emerald-100", dark: "bg-emerald-900/20 hover:bg-emerald-900/30" },
  },
  "baja laboral con nueva alta": {
    badge: { light: "bg-blue-100 text-blue-800", dark: "bg-blue-500/20 text-blue-400" },
    row: { light: "bg-blue-50 hover:bg-blue-100", dark: "bg-blue-900/20 hover:bg-blue-900/30" },
  },
  "baja laboral sin nueva alta": {
    badge: { light: "bg-slate-100 text-slate-800", dark: "bg-slate-500/20 text-slate-400" },
    row: { light: "bg-slate-50 hover:bg-slate-100", dark: "bg-slate-900/20 hover:bg-slate-900/30" },
  },
  "aprobada, pero no reconoce clave": {
    badge: { light: "bg-yellow-100 text-yellow-800", dark: "bg-yellow-500/20 text-yellow-400" },
    row: { light: "bg-yellow-50 hover:bg-yellow-100", dark: "bg-yellow-900/20 hover:bg-yellow-900/30" },
  },
  "rehacer vídeo": {
    badge: { light: "bg-red-300 text-red-900", dark: "bg-red-500/20 text-red-400" },
    row: { light: "bg-red-50 hover:bg-red-100", dark: "bg-red-900/20 hover:bg-red-900/30" },
  },
  "falta documentación": {
    badge: { light: "bg-orange-100 text-orange-800", dark: "bg-orange-500/20 text-orange-400" },
    row: { light: "bg-orange-50 hover:bg-orange-100", dark: "bg-orange-900/20 hover:bg-orange-900/30" },
  },
  "falta clave": {
    badge: { light: "bg-orange-100 text-orange-800", dark: "bg-orange-500/20 text-orange-400" },
    row: { light: "bg-orange-50 hover:bg-orange-100", dark: "bg-orange-900/20 hover:bg-orange-900/30" },
  },
  "falta clave (por arca)": {
    badge: { light: "bg-indigo-100 text-indigo-800", dark: "bg-indigo-500/20 text-indigo-400" },
    row: { light: "bg-indigo-50 hover:bg-indigo-100", dark: "bg-indigo-900/20 hover:bg-indigo-900/30" },
  },
  "falta clave y documentación": {
    badge: { light: "bg-orange-100 text-orange-800", dark: "bg-orange-500/20 text-orange-400" },
    row: { light: "bg-orange-50 hover:bg-orange-100", dark: "bg-orange-900/20 hover:bg-orange-900/30" },
  },
  "el afiliado cambió la clave": {
    badge: { light: "bg-orange-200 text-orange-900", dark: "bg-orange-500/20 text-orange-400" },
    row: { light: "bg-orange-50 hover:bg-orange-100", dark: "bg-orange-900/20 hover:bg-orange-900/30" },
  },
  "completa": {
    badge: { light: "bg-lime-600 text-white", dark: "bg-lime-500/30 text-lime-300" },
    row: { light: "bg-lime-50 hover:bg-lime-100", dark: "bg-lime-900/20 hover:bg-lime-900/30" },
  },
}

const getStatusColor = (status: string, theme: string) => {
  const statusLower = (status || "").toLowerCase()
  const colorDef = STATUS_COLORS[statusLower]
  if (colorDef) {
    return theme === "dark" ? colorDef.badge.dark : colorDef.badge.light
  }
  return theme === "dark" ? "bg-gray-500/20 text-gray-400" : "bg-gray-100 text-gray-700"
}

const getAporteColor = (aporte: number | undefined, theme: string) => {
  if (aporte === undefined || aporte === null) return ""
  if (aporte < 35000) {
    return theme === "dark" ? "text-red-400" : "text-red-600"
  }
  return theme === "dark" ? "text-green-400" : "text-green-600"
}

const getObraSocialVendidaColor = (obra: string, theme: string) => {
  const obraLower = (obra || "").toLowerCase()
  const colors: Record<string, { light: string; dark: string }> = {
    "binimed": { light: "bg-blue-100 text-blue-800", dark: "bg-blue-500/20 text-blue-400" },
    "meplife": { light: "bg-green-100 text-green-800", dark: "bg-green-500/20 text-green-400" },
    "turf": { light: "bg-violet-100 text-violet-800", dark: "bg-violet-500/20 text-violet-400" },
    "ras": { light: "bg-red-100 text-red-800", dark: "bg-red-500/20 text-red-400" },
    "medicenter": { light: "bg-gray-100 text-gray-800", dark: "bg-gray-500/20 text-gray-400" },
  }
  const color = colors[obraLower] || { light: "bg-gray-100 text-gray-700", dark: "bg-gray-500/20 text-gray-400" }
  return theme === "dark" ? color.dark : color.light
}

const getRowBackgroundByStatus = (status: string, theme: string) => {
  if (!status) return ""
  const statusLower = status.toLowerCase()
  const colorDef = STATUS_COLORS[statusLower]
  if (colorDef) {
    return theme === "dark" ? colorDef.row.dark : colorDef.row.light
  }
  return ""
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

const copyColumnToClipboard = async (
  audits: Audit[],
  columnKey: keyof Audit | "aporte",
  fieldName: string,
  toastFn: typeof toast
) => {
  try {
    const values = audits
      .map((audit) => {
        if (columnKey === "nombre") return audit.nombre?.toUpperCase() || ""
        if (columnKey === "aporte") return audit.aporte ? String(audit.aporte) : ""
        return String(audit[columnKey] || "")
      })
      .filter((v) => v && v.trim() !== "")

    if (values.length === 0) {
      toastFn.error("No hay datos para copiar")
      return
    }

    const text = values.join("\n")

    // Intentar con clipboard API primero
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
    } else {
      // Fallback: usar textarea temporal
      const textarea = document.createElement("textarea")
      textarea.value = text
      textarea.style.position = "fixed"
      textarea.style.left = "-9999px"
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
    }

    toastFn.success(`${values.length} ${fieldName} copiados`, { duration: 1500 })
  } catch (err) {
    console.error("Error copiando columna:", err)
    toastFn.error("Error al copiar - verifique permisos del navegador")
  }
}

const getSupervisorColor = (supervisorName: string, theme: string) => {
  if (!supervisorName) return theme === "dark" ? "bg-gray-500/20 text-gray-400" : "bg-gray-100 text-gray-700"
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

  if (nombreLower.includes('belen') && nombreLower.includes('salaverry')) {
    return theme === "dark" ? "bg-purple-900 text-purple-200" : "bg-purple-100 text-purple-800"
  }

  if (nombreLower.includes('analia') && nombreLower.includes('suarez')) {
    return theme === "dark" ? "bg-pink-900 text-pink-200" : "bg-pink-100 text-pink-800"
  }

  if (nombreLower.includes('erika') && nombreLower.includes('cardozo')) {
    return theme === "dark" ? "bg-green-900 text-green-200" : "bg-green-100 text-green-800"
  }

  if (nombreLower.includes('aryel') && nombreLower.includes('puiggros')) {
    return theme === "dark" ? "bg-yellow-900 text-yellow-200" : "bg-yellow-100 text-yellow-800"
  }

  if ((nombreLower.includes('joaquin') && nombreLower.includes('valdez')) ||
    (nombreLower.includes('joquin') && nombreLower.includes('valdez'))) {
    return theme === "dark" ? "bg-violet-900 text-violet-200" : "bg-violet-100 text-violet-800"
  }

  if (nombreLower.includes('luciano') && nombreLower.includes('carugno')) {
    return theme === "dark" ? "bg-gray-700 text-gray-200" : "bg-gray-200 text-gray-800"
  }

  if (nombreLower.includes('alejandro') && nombreLower.includes('mejail')) {
    return theme === "dark" ? "bg-amber-900 text-amber-200" : "bg-amber-100 text-amber-800"
  }

  if (nombreLower.includes('gaston') && nombreLower.includes('sarmiento')) {
    return theme === "dark" ? "bg-orange-900 text-orange-200" : "bg-orange-100 text-orange-800"
  }

  const colors = [
    { light: "bg-teal-100 text-teal-800", dark: "bg-teal-900 text-teal-200" },
    { light: "bg-cyan-100 text-cyan-800", dark: "bg-cyan-900 text-cyan-200" },
    { light: "bg-rose-100 text-rose-800", dark: "bg-rose-900 text-rose-200" },
    { light: "bg-emerald-100 text-emerald-800", dark: "bg-emerald-900 text-emerald-200" },
    { light: "bg-indigo-100 text-indigo-800", dark: "bg-indigo-900 text-indigo-200" },
  ]

  let hash = 0
  for (let i = 0; i < supervisorName.length; i++) {
    hash = supervisorName.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % colors.length
  const color = colors[index]

  return theme === "dark" ? color.dark : color.light
}

export function RegistroVentas() {
  const { theme } = useTheme()
  const { user } = useAuth()

  const [audits, setAudits] = useState<Audit[]>([])
  const [loading, setLoading] = useState(false)
  const [filtersExpanded, setFiltersExpanded] = useState(true)

  const [filters, setFilters] = useState({
    afiliado: "",
    cuil: "",
    cuit: "",
    obraVendida: "",
    estado: "",
    asesor: "",
    supervisor: "",
    administrador: "",
  })

  const weeklyPeriod = getWeeklyWorkPeriod()
  const [dateFrom, setDateFrom] = useState(weeklyPeriod.dateFrom)
  const [dateTo, setDateTo] = useState(weeklyPeriod.dateTo)

  const [selectedEstados, setSelectedEstados] = useState<string[]>([])
  const [selectedAsesores, setSelectedAsesores] = useState<string[]>([])
  const [selectedSupervisores, setSelectedSupervisores] = useState<string[]>([])
  const [selectedAdministradores, setSelectedAdministradores] = useState<string[]>([])

  const [isEstadoDropdownOpen, setIsEstadoDropdownOpen] = useState(false)
  const [isAsesorDropdownOpen, setIsAsesorDropdownOpen] = useState(false)
  const [isSupervisorDropdownOpen, setIsSupervisorDropdownOpen] = useState(false)
  const [isAdministradorDropdownOpen, setIsAdministradorDropdownOpen] = useState(false)

  const [asesoresList, setAsesoresList] = useState<User[]>([])
  const [supervisoresList, setSupervisoresList] = useState<User[]>([])
  const [administradoresList, setAdministradoresList] = useState<User[]>([])

  const [selectedAudit, setSelectedAudit] = useState<Audit | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)

  const [bulkUploadOpen, setBulkUploadOpen] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState<{
    total: number
    processed: number
    success: number
    errors: number
    status: 'idle' | 'processing' | 'complete' | 'error'
    rejectedRecords: Array<{ row: number; data: any; reason: string }>
  }>({
    total: 0, processed: 0, success: 0, errors: 0, status: 'idle', rejectedRecords: []
  })

  const estadoFilterRef = useRef<HTMLDivElement>(null)
  const asesorFilterRef = useRef<HTMLDivElement>(null)
  const supervisorFilterRef = useRef<HTMLDivElement>(null)
  const administradorFilterRef = useRef<HTMLDivElement>(null)

  const isGerencia = user?.role?.toLowerCase() === "gerencia"

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

  const isQRHechoFilterActive = selectedEstados.some(e =>
    e.toLowerCase() === "qr hecho"
  )

  const visibleAudits = useMemo(() => {
    if (isQRHechoFilterActive) return audits
    return audits.filter(audit => {
      const status = (audit.statusAdministrativo || audit.status || "").toLowerCase().trim()
      return status !== "qr hecho"
    })
  }, [audits, isQRHechoFilterActive])

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

    if (selectedEstados.length > 0) {
      params.estado = selectedEstados.map((e) => e.trim()).join(",")
    }
    // NO aplicar filtro por defecto - los registros deben permanecer
    // visibles independientemente de cambios de estado

    if (selectedAsesores.length > 0) {
      params.asesor = selectedAsesores.map((a) => a.trim()).filter(Boolean).join(",")
    }

    if (selectedSupervisores.length > 0) {
      params.supervisor = selectedSupervisores.map((s) => s.trim()).filter(Boolean).join(",")
    }

    if (selectedAdministradores.length > 0) {
      params.administrador = selectedAdministradores.map((a) => a.trim()).filter(Boolean).join(",")
    }

    if (filters.cuil && filters.cuil.trim() !== "") {
      delete params.dateFrom
      delete params.dateTo
      delete params.date
    } else {
      if (dateFrom && dateTo) {
        params.dateFrom = dateFrom
        params.dateTo = dateTo
      } else {
        const period = getWeeklyWorkPeriod()
        params.dateFrom = period.dateFrom
        params.dateTo = period.dateTo
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
      const auditsArray = Array.isArray(data) ? data : []

      // Filtrar registros que:
      // 1. Estado actual es "Completa" o estados de seguimiento post-venta, O
      // 2. Tienen alguno de esos estados en su historial, O
      // 3. Estado actual es "QR hecho" o variantes (para coincidir con Liquidación)
      const estadosIncluidos = [
        "completa",
        "falta clave",
        "falta clave (por arca)",
        "rehacer vídeo",
        "falta clave y documentación",
        "falta documentación",
        "autovinculación"
      ]

      const filteredAudits = auditsArray.filter((audit: Audit) => {
        const statusLower = (audit.status || "").toLowerCase().trim()

        // ✅ Incluir registros con estado "QR hecho" o variantes (igual que Liquidación)
        if (statusLower === "qr hecho" ||
          statusLower === "qr hecho (temporal)" ||
          statusLower === "qr hecho pero pendiente de aprobación" ||
          statusLower === "cargada" ||
          statusLower === "aprobada") {
          return true
        }

        // Verificar si el estado actual es uno de los estados incluidos
        if (estadosIncluidos.includes(statusLower)) return true

        // Verificar si statusHistory contiene alguno de los estados incluidos
        if (audit.statusHistory && Array.isArray(audit.statusHistory)) {
          return audit.statusHistory.some(
            (h) => estadosIncluidos.includes((h.value || "").toLowerCase())
          )
        }

        return false
      })

      setAudits(filteredAudits)
    } catch (err) {
      console.error(err)
      toast.error("Error al cargar registros de ventas")
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
          const isAsesor = u.role === "asesor" || u.role === "Asesor"
          const isAuditorWithTeam = (u.role === "auditor" || u.role === "Auditor") && u.numeroEquipo
          return isActive && (isAsesor || isAuditorWithTeam) && u.nombre
        })
        .sort((a: User, b: User) => a.nombre.localeCompare(b.nombre))
      setAsesoresList(asesoresFiltered)

      const supervisoresData = asesoresData
        .filter((u: User) => {
          const isActive = u?.active !== false
          return isActive && (u.role === "supervisor" || u.role === "Supervisor" || u.role === "encargado" || u.role === "Encargado") && u.nombre
        })
        .sort((a: User, b: User) => a.nombre.localeCompare(b.nombre))
      setSupervisoresList(supervisoresData)

      const administradoresData = asesoresData
        .filter((u: User) => {
          const isActive = u?.active !== false
          const roleLower = (u.role || "").toLowerCase()
          return isActive && roleLower === "administrativo" && u.nombre
        })
        .sort((a: User, b: User) => a.nombre.localeCompare(b.nombre))
      setAdministradoresList(administradoresData)
    } catch (err) {
      console.error("Error al cargar opciones de filtros:", err)
    }
  }

  const handleExportXLSX = () => {
    if (!audits || audits.length === 0) {
      toast.info("No hay datos para exportar")
      return
    }

    const rows = audits.map((a, idx) => ({
      Cantidad: idx + 1,
      Fecha: a.fechaCreacionQR ? formatDateOnly(a.fechaCreacionQR) : (a.scheduledAt ? formatDateOnly(a.scheduledAt) : "-"),
      "Apellido y Nombre": a.nombre || "-",
      CUIL: a.cuil || "-",
      Teléfono: a.telefono || "-",
      "Obra Social Vendida": a.obraSocialVendida || "-",
      Supervisor: getSupervisorName(a),
      Asesor: a.asesor?.nombre || "-",
      Estado: a.status || "-",
      Aporte: a.aporte || "-",
      CUIT: a.cuit || "-",
      "Datos Extra": a.datosExtra || "-",
      "Observación Privada": a.observacionPrivada || "-",
      Clave: a.clave || "-",
      Email: a.email || "-",
      Administrativo: a.administrador?.nombre || "-",
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Registro de Ventas")
    const today = new Date().toISOString().slice(0, 10)
    const filename = `registro_ventas_${dateFrom || today}.xlsx`
    XLSX.writeFile(wb, filename)

    toast.success("Exportado correctamente")
  }

  const handleFilterChange = (field: string, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  const clearFilters = () => {
    setFilters({
      afiliado: "",
      cuil: "",
      cuit: "",
      obraVendida: "",
      estado: "",
      asesor: "",
      supervisor: "",
      administrador: "",
    })
    setDateFrom("")
    setDateTo("")
    setSelectedEstados([])
    setSelectedAsesores([])
    setSelectedSupervisores([])
    setSelectedAdministradores([])
  }

  const handleDeleteAudit = async (auditId: string) => {
    if (!confirm("¿Estás seguro de eliminar este registro? Se notificará a Gerencia.")) return

    try {
      await api.audits.delete(auditId)
      toast.success("Registro eliminado")
      fetchAudits()
    } catch (error) {
      console.error("Error deleting audit:", error)
      toast.error("Error al eliminar registro")
    }
  }

  const openEditModal = (audit: Audit) => {
    setSelectedAudit(audit)
    setEditModalOpen(true)
  }

  const handleBulkFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadFile(file)
      setUploadProgress({ total: 0, processed: 0, success: 0, errors: 0, status: 'idle', rejectedRecords: [] })
    }
  }

  const processBulkUpload = async () => {
    if (!uploadFile) return

    setUploadProgress(prev => ({ ...prev, status: 'processing' }))

    try {
      const data = await uploadFile.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' })

      if (jsonData.length === 0) {
        toast.error('El archivo está vacío')
        setUploadProgress(prev => ({ ...prev, status: 'error' }))
        return
      }

      setUploadProgress(prev => ({ ...prev, total: jsonData.length }))

      const columnMapping: Record<string, string> = {
        'nombre': 'nombre', 'apellido y nombre': 'nombre', 'afiliado': 'nombre',
        'cuil': 'cuil',
        'telefono': 'telefono', 'teléfono': 'telefono', 'tel': 'telefono',
        'tipo': 'tipoVenta', 'tipo venta': 'tipoVenta', 'tipoventa': 'tipoVenta',
        'obra social anterior': 'obraSocialAnterior', 'os anterior': 'obraSocialAnterior', 'osanterior': 'obraSocialAnterior',
        'obra social vendida': 'obraSocialVendida', 'os vendida': 'obraSocialVendida', 'osvendida': 'obraSocialVendida', 'obra social': 'obraSocialVendida',
        'supervisor': 'supervisor', 'sup': 'supervisor',
        'asesor': 'asesor',
        'administrativo': 'administrativo', 'admin': 'administrativo',
        'estado': 'estado', 'status': 'estado',
        'aporte': 'aporte',
        'cuit': 'cuit',
        'datos extra': 'datosExtra', 'datosextra': 'datosExtra', 'datos': 'datosExtra',
        'observacion': 'observacionPrivada', 'observación': 'observacionPrivada', 'obs': 'observacionPrivada', 'observacion privada': 'observacionPrivada',
        'clave': 'clave',
        'email': 'email', 'correo': 'email',
        'fecha turno': 'fechaTurno', 'fechaturno': 'fechaTurno', 'fecha': 'fechaTurno'
      }

      const normalizedRecords = jsonData.map((row: any) => {
        const normalized: any = {}
        Object.keys(row).forEach(key => {
          const keyLower = key.toLowerCase().trim()
          const mappedKey = columnMapping[keyLower] || keyLower
          normalized[mappedKey] = row[key]
        })
        return normalized
      })

      const BATCH_SIZE = 500
      const batches = []
      for (let i = 0; i < normalizedRecords.length; i += BATCH_SIZE) {
        batches.push(normalizedRecords.slice(i, i + BATCH_SIZE))
      }

      let totalSuccess = 0
      let totalErrors = 0
      let allRejected: Array<{ row: number; data: any; reason: string }> = []
      let processedCount = 0

      for (const batch of batches) {
        try {
          const response = await api.audits.bulkImport({ records: batch })
          totalSuccess += response.data.successCount || 0
          totalErrors += response.data.errorCount || 0

          if (response.data.errors) {
            allRejected = [...allRejected, ...response.data.errors.map((e: any) => ({
              row: e.row + processedCount,
              data: e.data,
              reason: e.reasons?.join(', ') || 'Error desconocido'
            }))]
          }
        } catch (err: any) {
          totalErrors += batch.length
          batch.forEach((_: any, idx: number) => {
            allRejected.push({
              row: processedCount + idx + 2,
              data: batch[idx],
              reason: err.message || 'Error de conexión'
            })
          })
        }
        processedCount += batch.length
        setUploadProgress(prev => ({
          ...prev,
          processed: processedCount,
          success: totalSuccess,
          errors: totalErrors
        }))
      }

      setUploadProgress(prev => ({
        ...prev,
        status: 'complete',
        rejectedRecords: allRejected
      }))

      if (totalSuccess > 0) {
        toast.success(`${totalSuccess} registros importados correctamente`)
        fetchAudits()
      }
      if (totalErrors > 0) {
        toast.warning(`${totalErrors} registros con errores`)
      }

    } catch (err: any) {
      console.error('Error processing file:', err)
      toast.error('Error al procesar el archivo: ' + err.message)
      setUploadProgress(prev => ({ ...prev, status: 'error' }))
    }
  }

  const downloadRejectedRecords = () => {
    if (uploadProgress.rejectedRecords.length === 0) return

    const rows = uploadProgress.rejectedRecords.map(r => ({
      Fila: r.row,
      Nombre: r.data?.nombre || '',
      CUIL: r.data?.cuil || '',
      Telefono: r.data?.telefono || '',
      'Obra Social Vendida': r.data?.obraSocialVendida || '',
      Supervisor: r.data?.supervisor || '',
      Asesor: r.data?.asesor || '',
      Estado: r.data?.estado || '',
      'Motivo Rechazo': r.reason
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Rechazados')
    XLSX.writeFile(wb, `registros_rechazados_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const closeBulkUpload = () => {
    setBulkUploadOpen(false)
    setUploadFile(null)
    setUploadProgress({ total: 0, processed: 0, success: 0, errors: 0, status: 'idle', rejectedRecords: [] })
  }

  useEffect(() => {
    fetchAudits()
    fetchFilterOptions()

    const socket = connectSocket()

    socket.emit("audits:subscribeAll")

    const handleAuditUpdate = (updatedAudit: Audit) => {
      setAudits(prev => {
        const index = prev.findIndex(a => a._id === updatedAudit._id)
        if (index === -1) {
          if (updatedAudit.status === "Completa") {
            return [updatedAudit, ...prev]
          }
          return prev
        }
        const updated = [...prev]
        updated[index] = { ...prev[index], ...updatedAudit }
        return updated
      })

      setSelectedAudit(prev => {
        if (prev && prev._id === updatedAudit._id) {
          return { ...prev, ...updatedAudit }
        }
        return prev
      })
    }

    const handleAuditDeleted = (data: { _id: string }) => {
      setAudits(prev => prev.filter(a => a._id !== data._id))
      if (selectedAudit && selectedAudit._id === data._id) {
        setEditModalOpen(false)
        setSelectedAudit(null)
        toast.info("El registro ha sido eliminado")
      }
    }

    socket.on("audit:updated", handleAuditUpdate)
    socket.on("audit:deleted", handleAuditDeleted)

    return () => {
      socket.off("audit:updated", handleAuditUpdate)
      socket.off("audit:deleted", handleAuditDeleted)
    }
  }, [])

  useEffect(() => {
    fetchAudits()
  }, [
    filters,
    selectedEstados,
    selectedAsesores,
    selectedSupervisores,
    selectedAdministradores,
    dateFrom,
    dateTo,
  ])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (estadoFilterRef.current && !estadoFilterRef.current.contains(event.target as Node)) {
        setIsEstadoDropdownOpen(false)
      }
      if (asesorFilterRef.current && !asesorFilterRef.current.contains(event.target as Node)) {
        setIsAsesorDropdownOpen(false)
      }
      if (supervisorFilterRef.current && !supervisorFilterRef.current.contains(event.target as Node)) {
        setIsSupervisorDropdownOpen(false)
      }
      if (administradorFilterRef.current && !administradorFilterRef.current.contains(event.target as Node)) {
        setIsAdministradorDropdownOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div
        className={cn(
          "rounded-2xl border p-6 backdrop-blur-sm relative z-20",
          theme === "dark"
            ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
            : "bg-white border-gray-200 shadow-sm",
        )}
      >
        <div className="flex items-center gap-2 mb-4">
          <Filter className={cn("w-5 h-5", theme === "dark" ? "text-purple-400" : "text-purple-500")} />
          <h3 className={cn("font-semibold", theme === "dark" ? "text-white" : "text-gray-800")}>Filtros</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-3">
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

          <div ref={estadoFilterRef} className="relative">
            <button
              onClick={() => setIsEstadoDropdownOpen(!isEstadoDropdownOpen)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm",
                theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"
              )}
            >
              <span className="truncate">{formatMultiLabel(selectedEstados, "Estado", "estados")}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            {isEstadoDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-lg shadow-lg border bg-white dark:bg-gray-800 dark:border-gray-700">
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
                  <button
                    type="button"
                    onClick={() => setSelectedEstados(STATUS_OPTIONS)}
                    className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Seleccionar todos
                  </button>
                  {selectedEstados.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedEstados([])}
                      className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
                {STATUS_OPTIONS.map((estado) => (
                  <label key={estado} className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedEstados.includes(estado)}
                      onChange={() => toggleSelection(estado, setSelectedEstados)}
                      className="accent-blue-600"
                    />
                    <span className="dark:text-gray-200">{estado}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div ref={supervisorFilterRef} className="relative">
            <button
              onClick={() => setIsSupervisorDropdownOpen(!isSupervisorDropdownOpen)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm",
                theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"
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
                    className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Seleccionar todos
                  </button>
                  {selectedSupervisores.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedSupervisores([])}
                      className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
                {supervisoresList.map((sup) => (
                  <label key={sup._id} className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSupervisores.includes(sup.nombre)}
                      onChange={() => toggleSelection(sup.nombre, setSelectedSupervisores)}
                      className="accent-blue-600"
                    />
                    <span className="dark:text-gray-200">{sup.nombre}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div ref={asesorFilterRef} className="relative">
            <button
              onClick={() => setIsAsesorDropdownOpen(!isAsesorDropdownOpen)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm",
                theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"
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
                    className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Seleccionar todos
                  </button>
                  {selectedAsesores.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedAsesores([])}
                      className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
                {filteredAsesoresList.map((asesor) => (
                  <label key={asesor._id} className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedAsesores.includes(asesor.nombre)}
                      onChange={() => toggleSelection(asesor.nombre, setSelectedAsesores)}
                      className="accent-blue-600"
                    />
                    <span className="dark:text-gray-200">{asesor.nombre}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div ref={administradorFilterRef} className="relative">
            <button
              onClick={() => setIsAdministradorDropdownOpen(!isAdministradorDropdownOpen)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm",
                theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"
              )}
            >
              <span className="truncate">{formatMultiLabel(selectedAdministradores, "Administrativo", "admins")}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            {isAdministradorDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-lg shadow-lg border bg-white dark:bg-gray-800 dark:border-gray-700">
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
                  <button
                    type="button"
                    onClick={() => setSelectedAdministradores(administradoresList.map(a => a.nombre))}
                    className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Seleccionar todos
                  </button>
                  {selectedAdministradores.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedAdministradores([])}
                      className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
                {administradoresList.map((admin) => (
                  <label key={admin._id} className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedAdministradores.includes(admin.nombre)}
                      onChange={() => toggleSelection(admin.nombre, setSelectedAdministradores)}
                      className="accent-blue-600"
                    />
                    <span className="dark:text-gray-200">{admin.nombre}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

        </div>

        <div className="flex flex-wrap items-end gap-3 mt-3">
          <div>
            <span className={cn("text-xs block mb-1", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
              Desde
            </span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className={cn(
                "px-3 py-2 rounded-lg border text-sm",
                theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
              )}
            />
          </div>
          <div>
            <span className={cn("text-xs block mb-1", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
              Hasta
            </span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className={cn(
                "px-3 py-2 rounded-lg border text-sm",
                theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
              )}
            />
          </div>
          <div className="flex-1" />
          <button
            onClick={clearFilters}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
              theme === "dark"
                ? "border-white/10 text-gray-400 hover:bg-white/5"
                : "border-gray-200 text-gray-600 hover:bg-gray-50",
            )}
          >
            Limpiar
          </button>
          <button
            onClick={handleExportXLSX}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors text-white flex items-center gap-2"
            style={{ backgroundColor: "#17C787" }}
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
          {isGerencia && (
            <button
              onClick={() => setBulkUploadOpen(true)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors text-white flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
            >
              <Upload className="w-4 h-4" />
              Carga Masiva
            </button>
          )}
        </div>
      </div>

      {/* Resumen de estados - Idéntico a Seguimiento */}
      {audits.length > 0 && (() => {
        const estadosCount: Record<string, number> = {}
        audits.forEach((audit) => {
          const estado = audit.statusAdministrativo || audit.status || 'Sin estado'
          estadosCount[estado] = (estadosCount[estado] || 0) + 1
        })
        const total = audits.length
        const estadosOrdenados = Object.entries(estadosCount).sort((a, b) => b[1] - a[1])

        return (
          <div className={cn(
            "rounded-xl border p-3 mb-4",
            theme === "dark"
              ? "bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border-blue-700/30"
              : "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200"
          )}>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className={cn("font-bold", theme === "dark" ? "text-gray-200" : "text-gray-800")}>
                Total: <span className={theme === "dark" ? "text-blue-400" : "text-blue-600"}>{total}</span>
              </span>
              {estadosOrdenados.map(([estado, count]) => (
                <span key={estado} className={theme === "dark" ? "text-gray-300" : "text-gray-700"}>
                  <span className="font-semibold">{estado}:</span>{' '}
                  <span className={theme === "dark" ? "text-indigo-400" : "text-indigo-600"}>{count}</span>
                </span>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Resumen por administrativo - Idéntico a Seguimiento */}
      {visibleAudits.length > 0 && (() => {
        const adminCount: Record<string, number> = {}
        visibleAudits.forEach((audit) => {
          const admin = audit.administrador?.nombre || 'Sin asignar'
          adminCount[admin] = (adminCount[admin] || 0) + 1
        })
        const adminOrdenados = Object.entries(adminCount).sort((a, b) => b[1] - a[1])

        return (
          <div className={cn(
            "rounded-xl border p-3 mb-4",
            theme === "dark"
              ? "bg-gradient-to-r from-purple-900/20 to-fuchsia-900/20 border-purple-700/30"
              : "bg-gradient-to-r from-purple-50 to-fuchsia-50 border-purple-200"
          )}>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className={cn("font-bold", theme === "dark" ? "text-gray-200" : "text-gray-800")}>
                Por Administrativo:
              </span>
              {adminOrdenados.map(([admin, count]) => (
                <span key={admin} className={theme === "dark" ? "text-gray-300" : "text-gray-700"}>
                  <span className="font-semibold">{admin}:</span>{' '}
                  <span className={theme === "dark" ? "text-purple-400" : "text-purple-600"}>{count}</span>
                </span>
              ))}
            </div>
          </div>
        )
      })()}

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
                <th className="px-2 py-2 text-center w-[100px]">Fecha</th>
                <th className="px-2 py-2 text-center min-w-[150px]">
                  <button
                    onClick={() => copyColumnToClipboard(visibleAudits, "nombre", "Afiliados", toast)}
                    className="inline-flex items-center gap-1 hover:text-blue-500 dark:hover:text-blue-400 transition-colors group/hdr"
                    title="Copiar toda la columna"
                  >
                    Afiliado
                    <Copy className="w-3 h-3 opacity-0 group-hover/hdr:opacity-70 transition-opacity" />
                  </button>
                </th>
                <th className="px-2 py-2 text-center w-[100px]">
                  <button
                    onClick={() => copyColumnToClipboard(visibleAudits, "cuil", "CUILs", toast)}
                    className="inline-flex items-center gap-1 hover:text-blue-500 dark:hover:text-blue-400 transition-colors group/hdr"
                    title="Copiar toda la columna"
                  >
                    CUIL
                    <Copy className="w-3 h-3 opacity-0 group-hover/hdr:opacity-70 transition-opacity" />
                  </button>
                </th>
                <th className="px-2 py-2 text-center w-[100px]">
                  <button
                    onClick={() => copyColumnToClipboard(visibleAudits, "telefono", "Teléfonos", toast)}
                    className="inline-flex items-center gap-1 hover:text-blue-500 dark:hover:text-blue-400 transition-colors group/hdr"
                    title="Copiar toda la columna"
                  >
                    Teléfono
                    <Copy className="w-3 h-3 opacity-0 group-hover/hdr:opacity-70 transition-opacity" />
                  </button>
                </th>
                <th className="px-2 py-2 text-center w-[90px]">O.S. Ven</th>
                <th className="px-2 py-2 text-center min-w-[100px]">Supervisor</th>
                <th className="px-2 py-2 text-center min-w-[100px]">Asesor</th>
                <th className="px-2 py-2 text-center min-w-[100px]">Estado</th>
                <th className="px-2 py-2 text-center w-[80px]">
                  <button
                    onClick={() => copyColumnToClipboard(visibleAudits, "aporte", "Aportes", toast)}
                    className="inline-flex items-center gap-1 hover:text-blue-500 dark:hover:text-blue-400 transition-colors group/hdr"
                    title="Copiar toda la columna"
                  >
                    Aporte
                    <Copy className="w-3 h-3 opacity-0 group-hover/hdr:opacity-70 transition-opacity" />
                  </button>
                </th>
                <th className="px-2 py-2 text-center w-[100px]">
                  <button
                    onClick={() => copyColumnToClipboard(visibleAudits, "cuit", "CUITs", toast)}
                    className="inline-flex items-center gap-1 hover:text-blue-500 dark:hover:text-blue-400 transition-colors group/hdr"
                    title="Copiar toda la columna"
                  >
                    CUIT
                    <Copy className="w-3 h-3 opacity-0 group-hover/hdr:opacity-70 transition-opacity" />
                  </button>
                </th>
                <th className="px-2 py-2 text-center w-[100px]">Datos Extra</th>
                <th className="px-2 py-2 text-center w-[100px]">Obs. Privada</th>
                <th className="px-2 py-2 text-center w-[80px]">Clave</th>
                <th className="px-2 py-2 text-center w-[100px]">
                  <button
                    onClick={() => copyColumnToClipboard(visibleAudits, "email", "Emails", toast)}
                    className="inline-flex items-center gap-1 hover:text-blue-500 dark:hover:text-blue-400 transition-colors group/hdr"
                    title="Copiar toda la columna"
                  >
                    Email
                    <Copy className="w-3 h-3 opacity-0 group-hover/hdr:opacity-70 transition-opacity" />
                  </button>
                </th>
                <th className="px-2 py-2 text-center min-w-[100px]">Admin</th>
                <th className="px-2 py-2 text-center w-[80px]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={16} className="px-4 py-8 text-center opacity-50">
                    <div className="flex justify-center items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Cargando registros...
                    </div>
                  </td>
                </tr>
              ) : visibleAudits.length === 0 ? (
                <tr>
                  <td colSpan={16} className="px-4 py-8 text-center opacity-50">
                    {audits.length > 0 && !isQRHechoFilterActive ? (
                      <div className="flex flex-col items-center gap-2">
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                        <span>Todos los registros están en estado "QR hecho"</span>
                        <span className="text-xs">Filtra por estado para verlos</span>
                      </div>
                    ) : (
                      "No se encontraron registros"
                    )}
                  </td>
                </tr>
              ) : (
                visibleAudits.map((audit, idx) => {
                  const currentDateKey = getAuditDateKey(audit)
                  const prevAudit = idx > 0 ? visibleAudits[idx - 1] : null
                  const prevDateKey = prevAudit ? getAuditDateKey(prevAudit) : null
                  const showDaySeparator = idx === 0 || currentDateKey !== prevDateKey

                  return (
                    <>
                      {showDaySeparator && currentDateKey && (
                        <tr key={`day-${currentDateKey}-${idx}`} className="sticky top-[41px] z-[5]">
                          <td
                            colSpan={16}
                            className={cn(
                              "px-0 py-0",
                              theme === "dark" ? "bg-gray-900" : "bg-white"
                            )}
                          >
                            <div
                              className={cn(
                                "relative px-4 py-3 font-bold text-sm overflow-hidden",
                                "border-y-2 shadow-md",
                                theme === "dark"
                                  ? "bg-gradient-to-r from-indigo-900/80 via-purple-900/60 to-indigo-900/80 text-white border-indigo-400/50"
                                  : "bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 text-white border-indigo-300"
                              )}
                            >
                              <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.1)_50%,transparent_100%)] animate-shimmer" />
                              <div className="flex items-center gap-3 relative z-10">
                                <div className={cn(
                                  "p-1.5 rounded-lg",
                                  theme === "dark" ? "bg-white/20" : "bg-white/30"
                                )}>
                                  <Calendar className="w-5 h-5" />
                                </div>
                                <span className="tracking-wide">{formatDayHeader(currentDateKey)}</span>
                                <div className="flex-1" />
                                <span className={cn(
                                  "text-xs px-2 py-1 rounded-full",
                                  theme === "dark" ? "bg-white/20" : "bg-white/30"
                                )}>
                                  {visibleAudits.filter(a => getAuditDateKey(a) === currentDateKey).length} registros
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      <tr
                        key={audit._id}
                        className={cn(
                          "transition-colors group",
                          getRowBackgroundByStatus(audit.statusAdministrativo || audit.status, theme) ||
                          (idx % 2 === 0 ? "" : theme === "dark" ? "bg-white/[0.02]" : "bg-gray-50/50")
                        )}
                      >
                        <td className={cn("px-2 py-2 text-center", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                          {audit.fechaCreacionQR ? (
                            <div className="flex flex-col items-center">
                              <span className="text-purple-500 font-medium">
                                {formatDateOnly(audit.fechaCreacionQR)}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                (QR)
                              </span>
                            </div>
                          ) : (
                            formatDateTime(audit.scheduledAt)
                          )}
                        </td>
                        <td className="px-2 py-2 text-center font-medium truncate max-w-[150px]" title={audit.nombre}>
                          {audit.nombre ? audit.nombre.toUpperCase() : "-"}
                        </td>
                        <td className={cn("px-2 py-2 text-center font-mono truncate", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                          {audit.cuil || "-"}
                        </td>
                        <td className={cn("px-2 py-2 text-center font-mono truncate", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                          {audit.telefono || "-"}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <span className={cn(
                            "inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium truncate max-w-[80px]",
                            getObraSocialVendidaColor(audit.obraSocialVendida, theme)
                          )}>
                            {audit.obraSocialVendida || "-"}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-medium truncate max-w-[120px] inline-block",
                            getSupervisorColor(getSupervisorName(audit), theme)
                          )} title={getSupervisorName(audit)}>
                            {getSupervisorName(audit)}
                          </span>
                        </td>
                        <td className={cn("px-2 py-2 text-center", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                          {audit.asesor?.nombre || "-"}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <span className={cn(
                            "inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium truncate max-w-[120px]",
                            getStatusColor(audit.statusAdministrativo || audit.status, theme)
                          )} title={audit.statusAdministrativo || audit.status}>
                            {audit.statusAdministrativo || audit.status || "-"}
                          </span>
                        </td>
                        <td className={cn("px-2 py-2 text-center font-semibold", getAporteColor(audit.aporte, theme))}>
                          {audit.aporte ? `$${audit.aporte.toLocaleString()}` : "-"}
                        </td>
                        <td className={cn("px-2 py-2 text-center font-mono truncate", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                          {audit.cuit || "-"}
                        </td>
                        <td className="px-2 py-2 text-center max-w-[100px] truncate" title={audit.datosExtra}>
                          {audit.datosExtra ? audit.datosExtra.charAt(0).toUpperCase() + audit.datosExtra.slice(1).toLowerCase() : "-"}
                        </td>
                        <td className="px-2 py-2 text-center max-w-[100px] truncate" title={audit.observacionPrivada}>
                          {audit.observacionPrivada ? audit.observacionPrivada.charAt(0).toUpperCase() + audit.observacionPrivada.slice(1).toLowerCase() : "-"}
                        </td>
                        <td className="px-2 py-2 text-center">
                          {audit.clave || "-"}
                        </td>
                        <td className="px-2 py-2 text-center max-w-[100px] truncate" title={audit.email}>
                          {audit.email || "-"}
                        </td>
                        <td className={cn("px-2 py-2 text-center", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                          {audit.administrador?.nombre || "-"}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <div className="flex items-center justify-center gap-1 transition-opacity">
                            <button
                              onClick={() => openEditModal(audit)}
                              className="p-1 hover:bg-blue-100 text-blue-600 rounded dark:hover:bg-blue-900/30 dark:text-blue-400"
                              title="Editar"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            {isGerencia && (
                              <button
                                onClick={() => handleDeleteAudit(audit._id)}
                                className="p-1 hover:bg-red-100 text-red-600 rounded dark:hover:bg-red-900/30 dark:text-red-400"
                                title="Eliminar"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    </>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedAudit && (
        <RegistroVentasEditModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false)
            setSelectedAudit(null)
          }}
          audit={selectedAudit}
          onSave={(updatedAudit: Audit) => {
            setAudits(prev => prev.map(a => a._id === updatedAudit._id ? updatedAudit : a))
            setEditModalOpen(false)
            setSelectedAudit(null)
          }}
        />
      )}

      {/* Slide-in Drawer: Carga Masiva */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full z-40 transition-transform duration-300 ease-out",
          "w-full sm:w-[420px] max-w-[90vw]",
          bulkUploadOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className={cn(
          "h-full overflow-y-auto shadow-2xl border-l",
          theme === "dark"
            ? "bg-gray-900 border-white/10"
            : "bg-white border-gray-200"
        )}>
          <div className="sticky top-0 z-10 px-4 py-3 border-b flex items-center justify-between"
            style={{ background: theme === "dark" ? "rgb(17, 24, 39)" : "white" }}
          >
            <h2 className={cn("text-base font-bold flex items-center gap-2", theme === "dark" ? "text-white" : "text-gray-800")}>
              <FileSpreadsheet className="w-5 h-5 text-purple-500" />
              Carga Masiva
            </h2>
            <button
              onClick={closeBulkUpload}
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                theme === "dark" ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-500"
              )}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Zona de carga */}
            <div className={cn(
              "rounded-lg border-2 border-dashed p-4 text-center transition-colors",
              theme === "dark"
                ? "border-white/20 hover:border-purple-500/50 bg-white/5"
                : "border-gray-300 hover:border-purple-400 bg-gray-50"
            )}>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleBulkFileSelect}
                className="hidden"
                id="bulk-file-input"
              />
              <label htmlFor="bulk-file-input" className="cursor-pointer block">
                <Upload className={cn("w-8 h-8 mx-auto mb-2", theme === "dark" ? "text-gray-500" : "text-gray-400")} />
                <p className={cn("font-medium text-sm", theme === "dark" ? "text-white" : "text-gray-700")}>
                  {uploadFile ? uploadFile.name : "Seleccionar archivo Excel"}
                </p>
                <p className={cn("text-xs mt-1", theme === "dark" ? "text-gray-500" : "text-gray-500")}>
                  .xlsx o .xls (hasta 100k registros)
                </p>
              </label>
            </div>

            {uploadFile && uploadProgress.status === 'idle' && (
              <button
                onClick={processBulkUpload}
                className="w-full px-4 py-2.5 rounded-lg font-medium text-white bg-purple-600 hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Upload className="w-4 h-4" />
                Iniciar Importación
              </button>
            )}

            {uploadProgress.status === 'processing' && (
              <div className={cn("rounded-lg p-3", theme === "dark" ? "bg-white/5" : "bg-gray-100")}>
                <div className="flex items-center justify-between mb-2">
                  <span className={cn("text-xs font-medium", theme === "dark" ? "text-white" : "text-gray-700")}>
                    Procesando...
                  </span>
                  <span className={cn("text-xs", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                    {uploadProgress.processed} / {uploadProgress.total}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-gray-300 dark:bg-gray-700 overflow-hidden">
                  <div
                    className="h-full bg-purple-500 transition-all duration-300"
                    style={{ width: `${uploadProgress.total > 0 ? (uploadProgress.processed / uploadProgress.total) * 100 : 0}%` }}
                  />
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs">
                  <span className="text-green-500">✓ {uploadProgress.success}</span>
                  {uploadProgress.errors > 0 && (
                    <span className="text-red-500">✗ {uploadProgress.errors}</span>
                  )}
                </div>
              </div>
            )}

            {uploadProgress.status === 'complete' && (
              <div className={cn("rounded-lg p-3", theme === "dark" ? "bg-green-900/20 border border-green-500/30" : "bg-green-50 border border-green-200")}>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className={cn("font-medium text-sm", theme === "dark" ? "text-green-300" : "text-green-700")}>
                    Completado
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-green-600 dark:text-green-400">✓ {uploadProgress.success} importados</span>
                  {uploadProgress.errors > 0 && (
                    <span className="text-red-500">✗ {uploadProgress.errors} rechazados</span>
                  )}
                </div>

                {uploadProgress.rejectedRecords.length > 0 && (
                  <button
                    onClick={downloadRejectedRecords}
                    className="mt-2 px-2 py-1.5 rounded text-xs font-medium border flex items-center gap-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 border-red-300 dark:border-red-500/30"
                  >
                    <FileWarning className="w-3 h-3" />
                    Descargar Rechazados ({uploadProgress.rejectedRecords.length})
                  </button>
                )}
              </div>
            )}

            {uploadProgress.status === 'error' && (
              <div className={cn("rounded-lg p-3 border", theme === "dark" ? "bg-red-900/20 border-red-500/30" : "bg-red-50 border-red-200")}>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="text-red-600 dark:text-red-400 font-medium text-sm">Error al procesar</span>
                </div>
              </div>
            )}

            {/* Panel de formato colapsable */}
            <details className={cn(
              "rounded-lg border overflow-hidden",
              theme === "dark" ? "bg-white/5 border-white/10" : "bg-blue-50/50 border-blue-200"
            )}>
              <summary className={cn(
                "px-3 py-2 cursor-pointer text-sm font-medium flex items-center gap-2 select-none",
                theme === "dark" ? "text-blue-300 hover:bg-white/5" : "text-blue-700 hover:bg-blue-100/50"
              )}>
                <Info className="w-4 h-4" />
                Formato del archivo
              </summary>
              <div className="px-3 pb-3 pt-1 space-y-1 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="px-1 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px]">*</span>
                  <span className={theme === "dark" ? "text-gray-300" : "text-gray-700"}>nombre</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-1 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px]">*</span>
                  <span className={theme === "dark" ? "text-gray-300" : "text-gray-700"}>telefono</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-1 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px]">*</span>
                  <span className={theme === "dark" ? "text-gray-300" : "text-gray-700"}>obraSocialVendida</span>
                </div>
                <div className={cn("pt-1 text-[11px]", theme === "dark" ? "text-gray-500" : "text-gray-500")}>
                  Opcionales: cuil, supervisor, asesor, administrativo, estado, aporte, cuit, clave, email
                </div>
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  )
}
