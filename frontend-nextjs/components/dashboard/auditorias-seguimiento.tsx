/**
 * ============================================================
 * SEGUIMIENTO DE AUDITORÍAS (auditorias-seguimiento.tsx)
 * ============================================================
 * Vista principal para seguimiento de auditorías.
 * Permite filtrar, buscar, editar y exportar auditorías.
 */

"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { createPortal } from "react-dom"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import {
  Filter, Download, Calendar, BarChart3, Pencil, Eye, Trash2,
  X, ChevronDown, ChevronUp, RefreshCw
} from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth"
import * as XLSX from "xlsx"
import { AuditEditModal } from "./audit-edit-modal"
import { connectSocket, getSocket } from "@/lib/socket"

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

const STATUS_OPTIONS = [
  "Sin estado",
  "Mensaje enviado",
  "En videollamada",
  "Rechazada",
  "Falta documentación",
  "Falta clave",
  "Falta clave (por ARCA)",
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
  "El afiliado cambió la clave"
]

const TIPO_VENTA = ["Alta", "Cambio"]

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
}

interface User {
  _id: string
  nombre: string
  email: string
  role: string
  numeroEquipo?: string
  active?: boolean
}

interface Group {
  _id: string
  nombre: string
  numeroEquipo: string
}

/* Funciones auxiliares */
const formatDateTime = (value: string) => {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  /* Usar zona horaria local del navegador para consistencia */
  const formattedDate = date.toLocaleDateString("es-AR")
  const formattedTime = date.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  })
  return `${formattedDate} ${formattedTime}`
}

// ✅ Para fechas puras (sin hora específica) - evita problemas de zona horaria
const formatDateOnly = (value: string) => {
  if (!value) return "-"
  /* Extraer solo la parte de fecha del ISO string para evitar conversión de zona horaria */
  const dateStr = value.split('T')[0]
  if (!dateStr) return "-"
  const [year, month, day] = dateStr.split('-')
  if (!year || !month || !day) return "-"
  return `${day}/${month}/${year}`
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

const getStatusColor = (status: string, theme: string) => {
  const statusLower = (status || "").toLowerCase()
  const colors: Record<string, { light: string; dark: string }> = {
    "mensaje enviado": { light: "bg-cyan-100 text-cyan-800", dark: "bg-cyan-500/20 text-cyan-400" },
    "en videollamada": { light: "bg-blue-600 text-white", dark: "bg-blue-500/30 text-blue-300" },
    "falta documentación": { light: "bg-orange-100 text-orange-800", dark: "bg-orange-500/20 text-orange-400" },
    "falta clave": { light: "bg-orange-100 text-orange-800", dark: "bg-orange-500/20 text-orange-400" },
    "falta clave (por arca)": { light: "bg-indigo-100 text-indigo-800", dark: "bg-indigo-500/20 text-indigo-400" },
    reprogramada: { light: "bg-violet-100 text-violet-800", dark: "bg-violet-500/20 text-violet-400" },
    "reprogramada (falta confirmar hora)": { light: "bg-violet-100 text-violet-800", dark: "bg-violet-500/20 text-violet-400" },
    completa: { light: "bg-lime-600 text-white", dark: "bg-lime-500/30 text-lime-300" },
    "qr hecho": { light: "bg-green-600 text-white", dark: "bg-green-500/30 text-green-300" },
    aprobada: { light: "bg-teal-600 text-white", dark: "bg-teal-500/30 text-teal-300" },
    "no atendió": { light: "bg-yellow-100 text-yellow-800", dark: "bg-yellow-500/20 text-yellow-400" },
    "tiene dudas": { light: "bg-pink-100 text-pink-800", dark: "bg-pink-500/20 text-pink-400" },
    "falta clave y documentación": { light: "bg-orange-100 text-orange-800", dark: "bg-orange-500/20 text-orange-400" },
    "no le llegan los mensajes": { light: "bg-purple-100 text-purple-800", dark: "bg-purple-500/20 text-purple-400" },
    cortó: { light: "bg-yellow-100 text-yellow-800", dark: "bg-yellow-500/20 text-yellow-400" },
    autovinculación: { light: "bg-amber-700 text-white", dark: "bg-amber-500/30 text-amber-300" },
    caída: { light: "bg-red-600 text-white", dark: "bg-red-500/30 text-red-300" },
    pendiente: { light: "bg-gray-200 text-gray-700", dark: "bg-gray-500/20 text-gray-400" },
    "rehacer vídeo": { light: "bg-red-300 text-red-900", dark: "bg-red-500/20 text-red-400" },
    rechazada: { light: "bg-red-100 text-red-700", dark: "bg-red-500/20 text-red-400" },
    "aprobada, pero no reconoce clave": { light: "bg-yellow-600 text-white", dark: "bg-yellow-500/30 text-yellow-300" },
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

// ✅ Helper para obtener el nombre del supervisor (prioriza snapshot)
const getSupervisorName = (audit: Audit): string => {
  // 1. Prioridad: supervisorSnapshot
  if (audit.supervisorSnapshot?.nombre) {
    return audit.supervisorSnapshot.nombre
  }

  // 2. Fallback: asesor.supervisor (para ventas antiguas)
  if (audit.asesor?.supervisor?.nombre) {
    return audit.asesor.supervisor.nombre
  }

  return "-"
}

const getSupervisorColor = (supervisorName: string, theme: string) => {
  if (!supervisorName) return theme === "dark" ? "bg-gray-500/20 text-gray-400" : "bg-gray-100 text-gray-700"

  const nombreLower = supervisorName.toLowerCase()

  /* Colores específicos por supervisor */
  /* ROJO - 4 supervisores */
  if ((nombreLower.includes('nahuel') && nombreLower.includes('sanchez')) ||
    (nombreLower.includes('nahia') && nombreLower.includes('avellaneda')) ||
    (nombreLower.includes('santiago') && nombreLower.includes('goldsztein')) ||
    (nombreLower.includes('facundo') && nombreLower.includes('tevez'))) {
    return theme === "dark" ? "bg-red-900 text-red-200" : "bg-red-100 text-red-800"
  }

  /* FUCSIA - Abigail Vera */
  if (nombreLower.includes('abigail') && nombreLower.includes('vera')) {
    return theme === "dark" ? "bg-fuchsia-900 text-fuchsia-200" : "bg-fuchsia-100 text-fuchsia-800"
  }

  /* AZUL - Mateo Viera */
  if (nombreLower.includes('mateo') && nombreLower.includes('viera')) {
    return theme === "dark" ? "bg-blue-900 text-blue-200" : "bg-blue-100 text-blue-800"
  }

  /* PÚRPURA - Belen Salaverry */
  if (nombreLower.includes('belen') && nombreLower.includes('salaverry')) {
    return theme === "dark" ? "bg-purple-900 text-purple-200" : "bg-purple-100 text-purple-800"
  }

  /* ROSA - Analia Suarez */
  if (nombreLower.includes('analia') && nombreLower.includes('suarez')) {
    return theme === "dark" ? "bg-pink-900 text-pink-200" : "bg-pink-100 text-pink-800"
  }

  /* VERDE - Erika Cardozo */
  if (nombreLower.includes('erika') && nombreLower.includes('cardozo')) {
    return theme === "dark" ? "bg-green-900 text-green-200" : "bg-green-100 text-green-800"
  }

  /* AMARILLO - Aryel Puiggros */
  if (nombreLower.includes('aryel') && nombreLower.includes('puiggros')) {
    return theme === "dark" ? "bg-yellow-900 text-yellow-200" : "bg-yellow-100 text-yellow-800"
  }

  /* VIOLETA - Joaquín Valdez */
  if ((nombreLower.includes('joaquin') && nombreLower.includes('valdez')) ||
    (nombreLower.includes('joquin') && nombreLower.includes('valdez'))) {
    return theme === "dark" ? "bg-violet-900 text-violet-200" : "bg-violet-100 text-violet-800"
  }

  /* GRIS - Luciano Carugno */
  if (nombreLower.includes('luciano') && nombreLower.includes('carugno')) {
    return theme === "dark" ? "bg-gray-700 text-gray-200" : "bg-gray-200 text-gray-800"
  }

  /* ÁMBAR - Alejandro Mejail */
  if (nombreLower.includes('alejandro') && nombreLower.includes('mejail')) {
    return theme === "dark" ? "bg-amber-900 text-amber-200" : "bg-amber-100 text-amber-800"
  }

  /* NARANJA - Gaston Sarmiento */
  if (nombreLower.includes('gaston') && nombreLower.includes('sarmiento')) {
    return theme === "dark" ? "bg-orange-900 text-orange-200" : "bg-orange-100 text-orange-800"
  }

  /* Colores por defecto para otros supervisores */
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

const getRowBackgroundByStatus = (status: string, theme: string) => {
  if (!status) return ""

  const statusLower = status.toLowerCase()

  /* Colores de fila por estado */
  const colorMap: Record<string, { light: string; dark: string }> = {
    "mensaje enviado": { light: "bg-cyan-50 hover:bg-cyan-100", dark: "bg-cyan-900/20 hover:bg-cyan-900/30" },
    "en videollamada": { light: "bg-blue-100 hover:bg-blue-200", dark: "bg-blue-900/30 hover:bg-blue-900/40" },
    "falta documentación": { light: "bg-orange-50 hover:bg-orange-100", dark: "bg-orange-900/20 hover:bg-orange-900/30" },
    "falta clave": { light: "bg-orange-50 hover:bg-orange-100", dark: "bg-orange-900/20 hover:bg-orange-900/30" },
    "falta clave (por arca)": { light: "bg-indigo-50 hover:bg-indigo-100", dark: "bg-indigo-900/20 hover:bg-indigo-900/30" },
    "reprogramada": { light: "bg-violet-50 hover:bg-violet-100", dark: "bg-violet-900/20 hover:bg-violet-900/30" },
    "reprogramada (falta confirmar hora)": { light: "bg-violet-50 hover:bg-violet-100", dark: "bg-violet-900/20 hover:bg-violet-900/30" },
    "completa": { light: "bg-lime-100 hover:bg-lime-200", dark: "bg-lime-900/30 hover:bg-lime-900/40" },
    "qr hecho": { light: "bg-green-100 hover:bg-green-200", dark: "bg-green-900/30 hover:bg-green-900/40" },
    "aprobada": { light: "bg-teal-100 hover:bg-teal-200", dark: "bg-teal-900/30 hover:bg-teal-900/40" },
    "aprobada, pero no reconoce clave": { light: "bg-yellow-100 hover:bg-yellow-200", dark: "bg-yellow-900/30 hover:bg-yellow-900/40" },
    "no atendió": { light: "bg-yellow-50 hover:bg-yellow-100", dark: "bg-yellow-900/20 hover:bg-yellow-900/30" },
    "tiene dudas": { light: "bg-pink-50 hover:bg-pink-100", dark: "bg-pink-900/20 hover:bg-pink-900/30" },
    "falta clave y documentación": { light: "bg-orange-50 hover:bg-orange-100", dark: "bg-orange-900/20 hover:bg-orange-900/30" },
    "no le llegan los mensajes": { light: "bg-purple-50 hover:bg-purple-100", dark: "bg-purple-900/20 hover:bg-purple-900/30" },
    "cortó": { light: "bg-yellow-50 hover:bg-yellow-100", dark: "bg-yellow-900/20 hover:bg-yellow-900/30" },
    "autovinculación": { light: "bg-amber-100 hover:bg-amber-200", dark: "bg-amber-900/30 hover:bg-amber-900/40" },
    "caída": { light: "bg-red-100 hover:bg-red-200", dark: "bg-red-900/30 hover:bg-red-900/40" },
    "pendiente": { light: "bg-gray-100 hover:bg-gray-200", dark: "bg-gray-700/30 hover:bg-gray-700/40" },
    "rehacer vídeo": { light: "bg-red-50 hover:bg-red-100", dark: "bg-red-900/20 hover:bg-red-900/30" },
    "rechazada": { light: "bg-red-50 hover:bg-red-100", dark: "bg-red-900/20 hover:bg-red-900/30" },
    "baja remuneración": { light: "bg-red-50 hover:bg-red-100", dark: "bg-red-900/20 hover:bg-red-900/30" },
  }

  const colors = colorMap[statusLower]
  if (!colors) return ""

  return theme === "dark" ? colors.dark : colors.light
}

export function AuditoriasSeguimiento() {
  const { theme } = useTheme()
  const { user } = useAuth()

  /* Estado principal */
  const [audits, setAudits] = useState<Audit[]>([])
  const [loading, setLoading] = useState(false)
  const [filtersExpanded, setFiltersExpanded] = useState(true)

  /* Estados de filtros */
  const [filters, setFilters] = useState({
    afiliado: "",
    cuil: "",
    obraAnterior: "",
    obraVendida: "",
    estado: "",
    tipo: "",
    asesor: "",
    datos: "",
    auditor: "",
    supervisor: "",
    administrador: "",
  })

  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  /* Estados de selección múltiple */
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [selectedEstados, setSelectedEstados] = useState<string[]>([])
  const [selectedAsesores, setSelectedAsesores] = useState<string[]>([])
  const [selectedAuditores, setSelectedAuditores] = useState<string[]>([])
  const [selectedSupervisores, setSelectedSupervisores] = useState<string[]>([])
  const [selectedAdministradores, setSelectedAdministradores] = useState<string[]>([])

  /* Estados de dropdowns */
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false)
  const [isEstadoDropdownOpen, setIsEstadoDropdownOpen] = useState(false)
  const [isAsesorDropdownOpen, setIsAsesorDropdownOpen] = useState(false)
  const [isAuditorDropdownOpen, setIsAuditorDropdownOpen] = useState(false)
  const [isSupervisorDropdownOpen, setIsSupervisorDropdownOpen] = useState(false)
  const [isAdministradorDropdownOpen, setIsAdministradorDropdownOpen] = useState(false)

  /* Listas para dropdowns */
  const [asesoresList, setAsesoresList] = useState<User[]>([])
  const [gruposList, setGruposList] = useState<Group[]>([])
  const [auditoresList, setAuditoresList] = useState<User[]>([])
  const [supervisoresList, setSupervisoresList] = useState<User[]>([])
  const [administradoresList, setAdministradoresList] = useState<User[]>([])

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

  /* Estados de modales */
  const [selectedAudit, setSelectedAudit] = useState<Audit | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)

  /* Estados del modal de turnos */
  const [showSlotsModal, setShowSlotsModal] = useState(false)
  const [availableSlots, setAvailableSlots] = useState<any[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  /* Estados del modal de estadísticas */
  const [showStatsModal, setShowStatsModal] = useState(false)
  const [salesStats, setSalesStats] = useState<any[]>([])
  const [loadingStats, setLoadingStats] = useState(false)
  const [statsDate, setStatsDate] = useState(new Date().toISOString().split('T')[0])

  /* Referencias para detectar clicks externos */
  const groupFilterRef = useRef<HTMLDivElement>(null)
  const estadoFilterRef = useRef<HTMLDivElement>(null)
  const asesorFilterRef = useRef<HTMLDivElement>(null)
  const auditorFilterRef = useRef<HTMLDivElement>(null)
  const supervisorFilterRef = useRef<HTMLDivElement>(null)
  const administradorFilterRef = useRef<HTMLDivElement>(null)

  /* Obtener rol del usuario actual */
  const getCurrentUserRole = () => {
    try {
      const token = localStorage.getItem("token")
      if (!token) return null
      const payload = JSON.parse(atob(token.split(".")[1]))
      return payload?.role || null
    } catch {
      return null
    }
  }

  const currentRole = getCurrentUserRole()
  const isSupervisor = currentRole === "supervisor" || currentRole === "Supervisor"
  const isAdmin = currentRole === "admin" || currentRole === "Admin"
  const isGerencia = currentRole === "gerencia" || currentRole === "Gerencia"
  const isAuditor = currentRole === "auditor" || currentRole === "Auditor"
  const isAsesor = currentRole === "asesor" || currentRole === "Asesor"
  const isAdministrativo = currentRole === "administrativo" || currentRole === "Administrativo"

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

    if (selectedEstados.length > 0) {
      /* Si "Sin estado" está seleccionado, debemos obtener TODOS los registros del backend
         y filtrar del lado del cliente */
      if (!selectedEstados.includes("Sin estado")) {
        params.estado = selectedEstados.map((e) => e.trim()).join(",")
      }
    }

    if (selectedAsesores.length > 0) {
      params.asesor = selectedAsesores.map((a) => a.trim()).filter(Boolean).join(",")
    }

    if (selectedAuditores.length > 0) {
      params.auditor = selectedAuditores.map((a) => a.trim()).filter(Boolean).join(",")
    }

    if (selectedSupervisores.length > 0) {
      params.supervisor = selectedSupervisores.map((s) => s.trim()).filter(Boolean).join(",")
    }

    if (selectedAdministradores.length > 0) {
      params.administrador = selectedAdministradores.map((a) => a.trim()).filter(Boolean).join(",")
    }

    if (selectedGroups.length > 0) {
      params.grupo = selectedGroups.map((g) => g.trim()).filter(Boolean).join(",")
    }

    /* Lógica de filtro CUIL: Si CUIL está presente, ignorar filtros de fecha */
    if (filters.cuil && filters.cuil.trim() !== "") {
      delete params.dateFrom
      delete params.dateTo
      delete params.date
    } else {
      /* Lógica de fecha estándar solo si CUIL NO está presente */
      if (dateFrom && dateTo) {
        params.dateFrom = dateFrom
        params.dateTo = dateTo
      } else if (!dateFrom && !dateTo) {
        params.date = getCurrentArgentinaDate()
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

      let normalizedFilteredAudits = auditsArray

      /* Filtrado del lado del cliente para lógica "Sin estado" */
      if (selectedEstados.length > 0) {
        if (selectedEstados.includes("Sin estado")) {
          normalizedFilteredAudits = auditsArray.filter((audit: Audit) => {
            const status = (audit.status || "").trim()
            const isNoStatus = !status || status === "Seleccione" || status === "Seleccionar estado..."
            const isSelectedStatus = selectedEstados.includes(status)

            /* Retornar true si no tiene estado O si coincide con uno de los estados seleccionados */
            return isNoStatus || isSelectedStatus
          })
        } else {
          /* Si "Sin estado" NO está seleccionado, el backend ya filtró los datos */
          normalizedFilteredAudits = auditsArray
        }
      } else {
        /* Comportamiento por defecto: ocultar "cargada" y "aprobada" si no hay filtro de estado activo */
        const statusesToHide = ["cargada", "aprobada"]
        normalizedFilteredAudits = auditsArray.filter((audit: Audit) => {
          const status = (audit.status || "").toLowerCase()
          return !statusesToHide.includes(status)
        })
      }

      setAudits(normalizedFilteredAudits)
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
          const isAsesor = u.role === "asesor" || u.role === "Asesor"
          const isAuditorWithTeam = (u.role === "auditor" || u.role === "Auditor") && u.numeroEquipo
          return isActive && (isAsesor || isAuditorWithTeam) && u.nombre
        })
        .sort((a: User, b: User) => a.nombre.localeCompare(b.nombre))
      setAsesoresList(asesoresFiltered)

      /* Obtener auditores */
      const auditoresData = asesoresData
        .filter((u: User) => {
          const isActive = u?.active !== false
          const role = u?.role
          return (
            isActive &&
            (role === "auditor" ||
              role === "Auditor" ||
              role === "gerencia" ||
              role === "Gerencia" ||
              role === "supervisor" ||
              role === "Supervisor") &&
            u.nombre
          )
        })
        .sort((a: User, b: User) => a.nombre.localeCompare(b.nombre))
      setAuditoresList(auditoresData)

      /* Obtener grupos */
      const gruposRes = await api.groups.list()
      const gruposData = Array.isArray(gruposRes.data) ? gruposRes.data : []
      /* Supervisores y Gerencia ven todos los grupos */
      setGruposList(gruposData.sort((a: Group, b: Group) => (a.nombre || "").localeCompare(b.nombre || "")))

      /* Obtener supervisores */
      const supervisoresData = asesoresData
        .filter((u: User) => {
          const isActive = u?.active !== false
          return isActive && (u.role === "supervisor" || u.role === "Supervisor") && u.nombre
        })
        .sort((a: User, b: User) => a.nombre.localeCompare(b.nombre))
      setSupervisoresList(supervisoresData)

      /* Obtener administradores (rol: administrativo) */
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

    const rows = audits.map((a) => {
      let telefono = a.telefono || "-"
      if (isSupervisor || isAsesor) {
        const auditGrupo = a.asesor?.numeroEquipo
        const myGrupo = user?.numeroEquipo
        if (auditGrupo && myGrupo && auditGrupo !== myGrupo) {
          telefono = "***"
        }
      }

      return {
        Fecha: a.scheduledAt ? new Date(a.scheduledAt).toLocaleDateString("es-AR") : "-",
        Hora: a.scheduledAt
          ? new Date(a.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "-",
        Afiliado: a.nombre || "-",
        CUIL: a.cuil || "-",
        Teléfono: telefono,
        "Obra Social Anterior": a.obraSocialAnterior || "-",
        "Obra Social Vendida": a.obraSocialVendida || "-",
        Estado: a.status || "-",
        Tipo: a.tipoVenta || "-",
        Asesor: a.asesor?.nombre || "-",
        Supervisor: getSupervisorName(a),
        Grupo: a.groupId?.nombre || "-",
        Auditor: a.auditor?.nombre || "-",
        Administrador: a.administrador?.nombre || "-",
        "¿Recuperada?": a.isRecuperada ? "Sí" : "No",
      }
    })

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Auditorías")
    const today = new Date().toISOString().slice(0, 10)
    const filename = `audits_${dateFrom || today}.xlsx`
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
      obraAnterior: "",
      obraVendida: "",
      estado: "",
      tipo: "",
      asesor: "",
      datos: "",
      auditor: "",
      supervisor: "",
      administrador: "",
    })
    setDateFrom("")
    setDateTo("")
    setSelectedGroups([])
    setSelectedEstados([])
    setSelectedAsesores([])
    setSelectedAuditores([])
    setSelectedSupervisores([])
    setSelectedAdministradores([])
  }

  const handleDeleteAudit = async (auditId: string) => {
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
    setSelectedAudit(audit)
    setEditModalOpen(true)
  }

  /* Funciones del modal de turnos */
  const fetchAvailableSlots = async (date: string) => {
    setLoadingSlots(true)
    try {
      const { data } = await api.audits.getAvailableSlots(date)
      setAvailableSlots(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
      toast.error("No se pudieron cargar los turnos")
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleOpenSlotsModal = () => {
    setShowSlotsModal(true)
    fetchAvailableSlots(selectedDate)
  }

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate)
    fetchAvailableSlots(newDate)
  }

  const getSlotColor = (count: number) => {
    const available = 10 - count
    if (available <= 0) return 'bg-red-100 text-red-800 border-red-300'
    if (available >= 1 && available <= 2) return 'bg-orange-100 text-orange-800 border-orange-300'
    if (available >= 3 && available <= 4) return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    return 'bg-green-100 text-green-800 border-green-300'
  }

  /* Funciones del modal de estadísticas */
  const fetchSalesStats = async (date: string) => {
    setLoadingStats(true)
    try {
      const { data } = await api.audits.getSalesStats(date)
      setSalesStats(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
      toast.error("No se pudieron cargar las estadísticas")
    } finally {
      setLoadingStats(false)
    }
  }

  const handleOpenStatsModal = () => {
    setShowStatsModal(true)
    fetchSalesStats(statsDate)
  }

  const handleStatsDateChange = (newDate: string) => {
    setStatsDate(newDate)
    fetchSalesStats(newDate)
  }

  /* Efectos */
  useEffect(() => {
    fetchAudits()
    fetchFilterOptions()

    /* Actualizaciones en tiempo real via Socket */
    const socket = connectSocket()

    /* Suscribirse a la sala de auditorías */
    socket.emit("audits:subscribeAll")
    console.log("[Seguimiento] Subscribed to audits_all room")

    /* Manejador para nuevas auditorías - agregar si es visible en la vista actual */
    const handleNewAudit = (newAudit: Audit) => {
      console.log("[Socket] New audit received:", newAudit._id)

      /* Agregar a la lista - el filtrado se maneja por la lógica existente del cliente */
      setAudits(prev => {
        /* Verificar si ya existe (evitar duplicados) */
        if (prev.some(a => a._id === newAudit._id)) return prev

        /* Agregar al inicio (más reciente primero) */
        const updated = [newAudit, ...prev]

        /* Mostrar notificación sutil */
        toast.info(`Nueva auditoría: ${newAudit.nombre}`, { duration: 3000 })

        return updated
      })
    }

    /* Manejador para auditorías actualizadas - actualizar en su lugar */
    const handleAuditUpdate = (updatedAudit: Audit & { updatedBy?: string }) => {
      console.log("[Socket] Actualización de auditoría recibida:", updatedAudit._id)

      setAudits(prev => {
        const index = prev.findIndex(a => a._id === updatedAudit._id)
        if (index === -1) {
          // Auditoría no está en la lista actual - el usuario puede refrescar filtros
          return prev
        }

        /* Actualizar en su lugar, preservando posición */
        const updated = [...prev]
        updated[index] = { ...prev[index], ...updatedAudit }
        return updated
      })

      /* Si el usuario está editando esta auditoría, actualizar también */
      setSelectedAudit(prev => {
        if (prev && prev._id === updatedAudit._id) {
          /* No auto-actualizar si el modal está abierto para no interrumpir al usuario */
          if (editModalOpen) {
            /* Verificar si la actualización fue hecha por el usuario actual */
            const isSelfUpdate = updatedAudit.updatedBy === user?._id

            if (!isSelfUpdate) {
              toast.warning("Esta auditoría fue modificada por otro usuario", { duration: 5000 })
            }
          }
          return { ...prev, ...updatedAudit }
        }
        return prev
      })
    }

    /* Manejador para auditorías eliminadas - quitar de la lista */
    const handleAuditDeleted = (data: { _id: string }) => {
      console.log("[Socket] Audit deleted:", data._id)

      setAudits(prev => prev.filter(a => a._id !== data._id))

      /* Si el usuario está editando esta auditoría eliminada, cerrar modal */
      if (selectedAudit && selectedAudit._id === data._id) {
        setEditModalOpen(false)
        setSelectedAudit(null)
        toast.error("La auditoría que estabas editando fue eliminada", { duration: 5000 })
      }
    }

    /* Registrar listeners de eventos */
    socket.on("audits:new", handleNewAudit)
    socket.on("audit:update", handleAuditUpdate)
    socket.on("audit:deleted", handleAuditDeleted)

    /* Limpiar al desmontar */
    return () => {
      socket.off("audits:new", handleNewAudit)
      socket.off("audit:update", handleAuditUpdate)
      socket.off("audit:deleted", handleAuditDeleted)
      socket.emit("audits:unsubscribeAll")
      console.log("[Seguimiento] Unsubscribed from audits_all room")
    }
  }, [editModalOpen, selectedAudit])

  useEffect(() => {
    fetchAudits()
  }, [
    filters,
    selectedGroups,
    selectedEstados,
    selectedAsesores,
    selectedAuditores,
    selectedSupervisores,
    selectedAdministradores,
    dateFrom,
    dateTo,
  ])

  useEffect(() => {
    const refsToTrack = [
      { ref: groupFilterRef, setOpen: setIsGroupDropdownOpen },
      { ref: estadoFilterRef, setOpen: setIsEstadoDropdownOpen },
      { ref: asesorFilterRef, setOpen: setIsAsesorDropdownOpen },
      { ref: auditorFilterRef, setOpen: setIsAuditorDropdownOpen },
      { ref: supervisorFilterRef, setOpen: setIsSupervisorDropdownOpen },
      { ref: administradorFilterRef, setOpen: setIsAdministradorDropdownOpen },
    ]

    const handleClickOutside = (event: MouseEvent) => {
      refsToTrack.forEach(({ ref, setOpen }) => {
        if (ref.current && !ref.current.contains(event.target as Node)) {
          setOpen(false)
        }
      })
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
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
        <div className="flex items-center gap-2 mb-4">
          <Filter className={cn("w-5 h-5", theme === "dark" ? "text-purple-400" : "text-purple-500")} />
          <h3 className={cn("font-semibold", theme === "dark" ? "text-white" : "text-gray-800")}>Filtros</h3>
        </div>

        {/* Fila 1: Filtros principales */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-3">
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
          <select
            value={filters.obraAnterior}
            onChange={(e) => handleFilterChange("obraAnterior", e.target.value)}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm",
              theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
            )}
          >
            <option value="">Obra social anterior</option>
            {ARGENTINE_OBRAS_SOCIALES.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
          <select
            value={filters.obraVendida}
            onChange={(e) => handleFilterChange("obraVendida", e.target.value)}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm",
              theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
            )}
          >
            <option value="">Obra social vendida</option>
            {OBRAS_VENDIDAS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>

          {/* Filtro multi-selección de estado */}
          <div className="relative" ref={estadoFilterRef}>
            <button
              onClick={() => setIsEstadoDropdownOpen(!isEstadoDropdownOpen)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm",
                theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
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
                {STATUS_OPTIONS.map((status) => (
                  <label key={status} className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedEstados.includes(status)}
                      onChange={() => toggleSelection(status, setSelectedEstados)}
                      className="accent-blue-600"
                    />
                    <span className="dark:text-gray-200">{status}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <select
            value={filters.tipo}
            onChange={(e) => handleFilterChange("tipo", e.target.value)}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm",
              theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
            )}
          >
            <option value="">Tipo</option>
            {TIPO_VENTA.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Fila 2: Filtros de personal */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-3">
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

          {/* Filtro multi-selección de auditor */}
          <div className="relative" ref={auditorFilterRef}>
            <button
              onClick={() => setIsAuditorDropdownOpen(!isAuditorDropdownOpen)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm",
                theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
              )}
            >
              <span className="truncate">{formatMultiLabel(selectedAuditores, "Auditor", "auditores")}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            {isAuditorDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-lg shadow-lg border bg-white dark:bg-gray-800 dark:border-gray-700">
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
                  <button
                    type="button"
                    onClick={() => setSelectedAuditores(auditoresList.map(a => a.nombre))}
                    className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Seleccionar todos
                  </button>
                  {selectedAuditores.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedAuditores([])}
                      className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
                {auditoresList.map((a) => (
                  <label key={a._id} className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedAuditores.includes(a.nombre)}
                      onChange={() => toggleSelection(a.nombre, setSelectedAuditores)}
                      className="accent-blue-600"
                    />
                    <span className="dark:text-gray-200">{a.nombre}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Filtro multi-selección de supervisor */}
          {(isAuditor || isGerencia || isAdmin || isSupervisor || isAsesor || isAdministrativo) && (
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
          )}

          {/* Filtro multi-selección de administrador */}
          <div className="relative" ref={administradorFilterRef}>
            <button
              onClick={() => setIsAdministradorDropdownOpen(!isAdministradorDropdownOpen)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm",
                theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
              )}
            >
              <span className="truncate">{formatMultiLabel(selectedAdministradores, "Administrativos", "administrativos")}</span>
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
                {administradoresList.map((a) => (
                  <label key={a._id} className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedAdministradores.includes(a.nombre)}
                      onChange={() => toggleSelection(a.nombre, setSelectedAdministradores)}
                      className="accent-blue-600"
                    />
                    <span className="dark:text-gray-200">{a.nombre}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Fila 3: Fechas y botones de acción */}
        <div className="flex flex-wrap items-end gap-3">
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
            onClick={fetchAudits}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              theme === "dark"
                ? "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                : "bg-cyan-500 text-white hover:bg-cyan-600",
            )}
          >
            Aplicar filtros
          </button>
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
          {!['asesor', 'supervisor'].includes(user?.role?.toLowerCase() || '') && (
            <button
              onClick={handleExportXLSX}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors text-white flex items-center gap-2"
              style={{ backgroundColor: "#17C787" }}
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
          )}
          <button
            onClick={handleOpenSlotsModal}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors text-white flex items-center gap-2",
              theme === "dark" ? "bg-purple-600 hover:bg-purple-700" : "bg-purple-600 hover:bg-purple-700"
            )}
          >
            <Calendar className="w-4 h-4" />
            Turnos
          </button>
          {(isSupervisor || isGerencia) && (
            <button
              onClick={handleOpenStatsModal}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors text-white flex items-center gap-2",
                theme === "dark" ? "bg-indigo-600 hover:bg-indigo-700" : "bg-indigo-600 hover:bg-indigo-700"
              )}
            >
              <BarChart3 className="w-4 h-4" />
              Estadísticas
            </button>
          )}
        </div>
      </div>

      {/* Resumen de estados */}
      {audits.length > 0 && (() => {
        const estadosCount: Record<string, number> = {}
        let recuperadasCount = 0

        audits.forEach((audit: Audit) => {
          const estado = audit.status || 'Sin estado'
          estadosCount[estado] = (estadosCount[estado] || 0) + 1

          if (audit.isRecuperada) {
            recuperadasCount++
          }
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
              {recuperadasCount > 0 && (
                <span className={theme === "dark" ? "text-gray-300" : "text-gray-700"}>
                  <span className="font-semibold">Recuperadas:</span>{' '}
                  <span className={theme === "dark" ? "text-green-400" : "text-green-600"}>{recuperadasCount}</span>
                </span>
              )}
            </div>
          </div>
        )
      })()}

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
                <th className="px-2 py-2 w-[120px]">Fecha</th>
                <th className="px-2 py-2 min-w-[150px]">Afiliado</th>
                <th className="px-2 py-2 w-[100px]">CUIL</th>
                <th className="px-2 py-2 w-[100px]">Teléfono</th>
                <th className="px-2 py-2 w-[80px]">O.S. Ant</th>
                <th className="px-2 py-2 w-[80px]">O.S. Ven</th>
                <th className="px-2 py-2 min-w-[120px]">Estado</th>
                <th className="px-2 py-2 w-[80px]">Tipo</th>
                <th className="px-2 py-2 min-w-[100px]">Asesor</th>
                <th className="px-2 py-2 min-w-[100px]">Supervisor</th>
                <th className="px-2 py-2 w-[60px]">Grupo</th>
                <th className="px-2 py-2 min-w-[100px]">Auditor</th>
                <th className="px-2 py-2 min-w-[100px]">Admin</th>
                <th className="px-2 py-2 w-[80px] text-center">Recup.</th>
                <th className="px-2 py-2 w-[80px] text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={15} className="px-4 py-8 text-center opacity-50">
                    <div className="flex justify-center items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Cargando auditorías...
                    </div>
                  </td>
                </tr>
              ) : audits.length === 0 ? (
                <tr>
                  <td colSpan={15} className="px-4 py-8 text-center opacity-50">
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
                      {(item.status || "").toLowerCase() === "qr hecho" && item.fechaCreacionQR ? (
                        <div className="flex flex-col items-center">
                          <span className="text-purple-500 font-medium">
                            {formatDateOnly(item.fechaCreacionQR)}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            (QR)
                          </span>
                        </div>
                      ) : (
                        formatDateTime(item.scheduledAt)
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-center font-medium truncate max-w-[150px]" title={item.nombre}>
                      {item.nombre}
                    </td>
                    <td className="px-2 py-1.5 text-center font-mono opacity-70 truncate">
                      {item.cuil || "-"}
                    </td>
                    <td className="px-2 py-1.5 text-center font-mono opacity-70 truncate">
                      {(isSupervisor || isAsesor) && item.asesor?.numeroEquipo !== user?.numeroEquipo ? "***" : item.telefono}
                    </td>
                    <td className="px-2 py-1.5 text-center truncate max-w-[80px]" title={item.obraSocialAnterior}>
                      {item.obraSocialAnterior || "-"}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <span className={cn(
                        "inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium truncate max-w-[80px]",
                        getObraVendidaClass(item.obraSocialVendida, theme)
                      )}>
                        {item.obraSocialVendida}
                      </span>
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
                      {item.tipoVenta || "-"}
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
                      {item.auditor?.nombre || '-'}
                    </td>
                    <td className={cn("px-3 py-3 text-center", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                      {item.administrador?.nombre || '-'}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {item.isRecuperada ? (
                        <span className="inline-flex items-center justify-center px-2 py-1 rounded text-[10px] font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Sí
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <div className="flex items-center justify-center gap-1 transition-opacity">
                        {!isAsesor && (
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-1 hover:bg-blue-100 text-blue-600 rounded dark:hover:bg-blue-900/30 dark:text-blue-400"
                            title="Editar"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                        {(isAdmin || isGerencia) && (
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

      {/* Modal de edición - Portal flotante */}
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

      {/* Modal de turnos disponibles */}
      {showSlotsModal && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 p-4 bg-black/50 backdrop-blur-sm">
          <div className={cn(
            "rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col",
            theme === "dark" ? "bg-gray-900 border border-white/10" : "bg-white"
          )}>
            <div className={cn(
              "flex items-center justify-between p-4 border-b",
              theme === "dark" ? "border-gray-700 bg-purple-900/20" : "border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50"
            )}>
              <div className="flex items-center gap-3">
                <div className="bg-purple-600 p-2 rounded-lg">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className={cn("text-xl font-semibold", theme === "dark" ? "text-white" : "text-gray-800")}>Turnos Disponibles</h3>
                  <p className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-500")}>Consulta la disponibilidad de turnos por fecha</p>
                </div>
              </div>
              <button
                className={cn("p-2 rounded-lg transition", theme === "dark" ? "hover:bg-gray-800" : "hover:bg-gray-100")}
                onClick={() => setShowSlotsModal(false)}
              >
                <X className={cn("w-6 h-6", theme === "dark" ? "text-gray-400" : "text-gray-600")} />
              </button>
            </div>

            <div className={cn("p-4 border-b", theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200")}>
              <label className={cn("block text-sm font-medium mb-2", theme === "dark" ? "text-gray-300" : "text-gray-700")}>Seleccionar fecha:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className={cn(
                  "p-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent",
                  theme === "dark" ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"
                )}
              />
            </div>

            <div className={cn("p-4 border-b", theme === "dark" ? "bg-blue-900/20 border-gray-700" : "bg-blue-50 border-gray-200")}>
              <p className={cn("text-xs font-semibold mb-2", theme === "dark" ? "text-gray-300" : "text-gray-700")}>Leyenda de disponibilidad:</p>
              <div className="flex flex-wrap gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-100 border border-green-300"></div>
                  <span className={theme === "dark" ? "text-gray-300" : ""}>5-10 cupos disponibles</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-300"></div>
                  <span className={theme === "dark" ? "text-gray-300" : ""}>3-4 cupos disponibles</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-orange-100 border border-orange-300"></div>
                  <span className={theme === "dark" ? "text-gray-300" : ""}>1-2 cupos disponibles</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-red-100 border border-red-300"></div>
                  <span className={theme === "dark" ? "text-gray-300" : ""}>Turno completo</span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loadingSlots ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-12 h-12 animate-spin text-purple-600" />
                  <span className={cn("ml-3", theme === "dark" ? "text-gray-400" : "text-gray-600")}>Cargando turnos...</span>
                </div>
              ) : availableSlots.length === 0 ? (
                <div className={cn("text-center py-12", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                  <p>No hay turnos disponibles para esta fecha.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {availableSlots.map((slot: any) => {
                    const available = 10 - slot.count
                    const isBlocked = available <= 0
                    return (
                      <div
                        key={slot.time}
                        className={`p-4 rounded-lg border-2 transition-all ${getSlotColor(slot.count)} ${isBlocked ? 'opacity-60' : 'hover:shadow-md'}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-lg font-bold">{slot.time}</span>
                          {isBlocked && <X className="w-5 h-5" />}
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
                        {isBlocked && <div className="mt-2 text-xs font-semibold text-center">COMPLETO</div>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className={cn("p-4 border-t flex justify-between items-center", theme === "dark" ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-gray-50")}>
              <div className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                <span className="font-semibold">Total de turnos:</span> {availableSlots.length}
                <span className="ml-4 font-semibold">Auditorías pactadas:</span> {availableSlots.reduce((sum: number, s: any) => sum + s.count, 0)}
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

      {/* Modal de estadísticas */}
      {showStatsModal && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 p-4 bg-black/50 backdrop-blur-sm">
          <div className={cn(
            "rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col",
            theme === "dark" ? "bg-gray-900 border border-white/10" : "bg-white"
          )}>
            <div className={cn(
              "flex items-center justify-between p-5 border-b",
              theme === "dark" ? "border-gray-700 bg-indigo-900/20" : "border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50"
            )}>
              <div className="flex items-center gap-3">
                <div className="bg-indigo-600 p-2 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className={cn("text-xl font-semibold", theme === "dark" ? "text-white" : "text-gray-800")}>Estadísticas de Contactación</h3>
                  <p className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-500")}>Afiliados contactados por obra social anterior</p>
                </div>
              </div>
              <button
                className={cn("p-2 rounded-lg transition", theme === "dark" ? "hover:bg-gray-800" : "hover:bg-gray-100")}
                onClick={() => setShowStatsModal(false)}
              >
                <X className={cn("w-6 h-6", theme === "dark" ? "text-gray-400" : "text-gray-600")} />
              </button>
            </div>

            <div className={cn("p-5 border-b", theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200")}>
              <label className={cn("block text-sm font-medium mb-2", theme === "dark" ? "text-gray-300" : "text-gray-700")}>Seleccionar fecha:</label>
              <input
                type="date"
                value={statsDate}
                onChange={(e) => handleStatsDateChange(e.target.value)}
                className={cn(
                  "p-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent",
                  theme === "dark" ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"
                )}
              />
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {loadingStats ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-12 h-12 animate-spin text-indigo-600" />
                  <span className={cn("ml-3", theme === "dark" ? "text-gray-400" : "text-gray-600")}>Cargando estadísticas...</span>
                </div>
              ) : salesStats.length === 0 ? (
                <div className={cn("text-center py-12", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                  <p className="font-medium">No hay contactaciones registradas para esta fecha.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {salesStats.map((stat: any, index: number) => {
                    const total = salesStats.reduce((sum: number, s: any) => sum + s.count, 0)
                    const percentage = ((stat.count / total) * 100).toFixed(1)
                    const colors = ['#4F46E5', '#7C3AED', '#2563EB', '#6B7280']
                    return (
                      <div
                        key={stat.obraSocial}
                        className={cn(
                          "rounded-lg p-4 border-l-4 hover:shadow-md transition",
                          theme === "dark" ? "bg-gradient-to-r from-gray-800 to-gray-700" : "bg-gradient-to-r from-white to-gray-50"
                        )}
                        style={{ borderLeftColor: colors[index % colors.length] }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm",
                              theme === "dark" ? "bg-indigo-900 text-indigo-300" : "bg-indigo-100 text-indigo-700"
                            )}>
                              {index + 1}
                            </div>
                            <div>
                              <span className={`font-semibold text-base ${getObraVendidaClass(stat.obraSocial, theme)} px-3 py-1 rounded-full inline-block`}>
                                {stat.obraSocial}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={cn("text-2xl font-bold", theme === "dark" ? "text-indigo-400" : "text-indigo-600")}>{stat.count}</div>
                            <div className={cn("text-xs", theme === "dark" ? "text-gray-400" : "text-gray-500")}>contactaciones</div>
                          </div>
                        </div>

                        <div className={cn("w-full rounded-full h-2 mt-2", theme === "dark" ? "bg-gray-600" : "bg-gray-200")}>
                          <div
                            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <div className={cn("text-xs mt-1 text-right", theme === "dark" ? "text-gray-400" : "text-gray-600")}>{percentage}% del total</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className={cn("p-5 border-t flex justify-between items-center", theme === "dark" ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-gray-50")}>
              <div className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                <span className="font-semibold">Total contactaciones:</span> {salesStats.reduce((sum: number, s: any) => sum + s.count, 0)}
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
  )
}
