/**
 * ============================================================
 * LISTA DE AFILIADOS (base-afiliados-lista.tsx)
 * ============================================================
 * Tabla de búsqueda y visualización de afiliados.
 * Permite filtrar, buscar y eliminar registros.
 */

"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { Search, RefreshCw, Trash2, Download, Zap, AlertTriangle, X, Plus, Minus, ChevronDown, Send } from "lucide-react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth"
import { ProgramarEnvioModal } from "./programar-envio-modal"
import { ArcaProgressWidget } from "./arca-progress-widget"

interface PadronData {
  status: 'not_found' | 'found_expired' | 'found_active' | 'captcha_failed' | 'error' | null
  checkedAt: string | null
  canSell: boolean | null
  periodoDesde: string | null
  obraSocial: string | null
  estado: string | null
}

interface ContributionData {
  lastContributionPeriod: string | null
  last3ClosedMonthsPaidCount: number | null
  verificationStatus: 'pending' | 'success' | 'no_data' | 'captcha' | 'error'
  verificationCheckedAt: string | null
  padron: PadronData | null
}

interface Affiliate {
  _id: string
  nombre: string
  cuil: string
  obraSocial: string
  telefono1: string
  localidad: string
  uploadDate: string
  contribution?: ContributionData
  disponibleParaVenta?: boolean
}

const YEARS  = Array.from({ length: 16 }, (_, i) => String(2020 + i))
const MONTHS = [
  { value: "01", label: "Ene" }, { value: "02", label: "Feb" },
  { value: "03", label: "Mar" }, { value: "04", label: "Abr" },
  { value: "05", label: "May" }, { value: "06", label: "Jun" },
  { value: "07", label: "Jul" }, { value: "08", label: "Ago" },
  { value: "09", label: "Sep" }, { value: "10", label: "Oct" },
  { value: "11", label: "Nov" }, { value: "12", label: "Dic" },
]
const buildYYYYMM = (year: string, month: string): string | undefined =>
  year && month ? `${year}${month}` : undefined

export function BaseAfiliadosLista() {
  const { theme } = useTheme()
  const { user } = useAuth()

  // ── List state ──────────────────────────────────────────────────────────
  const [afiliados, setAfiliados]     = useState<Affiliate[]>([])
  const [loading, setLoading]         = useState(true)
  const [page, setPage]               = useState(1)
  const [totalPages, setTotalPages]   = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // ── Filters ─────────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm]               = useState("")
  const [obraSocialFilter, setObraSocialFilter]   = useState<string[]>([])
  const [obraSocialSearch, setObraSocialSearch]   = useState("")
  const [zonaFilter, setZonaFilter]               = useState("")
  const [localidadFilter, setLocalidadFilter]     = useState("")
  const [verificationFilter, setVerificationFilter] = useState<string[]>([])
  const [trimPagosFilter, setTrimPagosFilter]     = useState<number[]>([])
  const [soloDisponibles, setSoloDisponibles]     = useState(false)
  const [periodFromYear, setPeriodFromYear]       = useState("")
  const [periodFromMonth, setPeriodFromMonth]     = useState("")
  const [periodToYear, setPeriodToYear]           = useState("")
  const [periodToMonth, setPeriodToMonth]         = useState("")

  // ── Shared data ─────────────────────────────────────────────────────────
  const [obrasSociales, setObrasSociales] = useState<string[]>([])

  // ── UI toggles ──────────────────────────────────────────────────────────
  const [downloadingAll, setDownloadingAll]             = useState(false)
  const [runningContributions, setRunningContributions] = useState(false)
  const [arcaModalOpen, setArcaModalOpen]               = useState(false)
  const [exportModalOpen, setExportModalOpen]           = useState(false)
  const [programarEnvioOpen, setProgramarEnvioOpen]     = useState(false)
  const [obraSocialDropdownOpen, setObraSocialDropdownOpen] = useState(false)
  const [verifDropdownOpen, setVerifDropdownOpen]       = useState(false)

  // ── Export form state ────────────────────────────────────────────────────
  const [exportMode, setExportMode]                           = useState<'full' | 'custom' | 'selected' | 'filtered'>('full')
  // Legacy single-select (used only for filtered/full modes)
  const [exportZona, setExportZona]                           = useState('')
  const [exportObraSocial, setExportObraSocial]               = useState('')
  const [exportLimit, setExportLimit]                         = useState(200)
  const [exportPeriodFromMonth, setExportPeriodFromMonth]     = useState('')
  const [exportPeriodFromYear, setExportPeriodFromYear]       = useState('')
  const [exportPeriodToMonth, setExportPeriodToMonth]         = useState('')
  const [exportPeriodToYear, setExportPeriodToYear]           = useState('')
  // Custom (delivery-engine) mode state
  const [exportZones, setExportZones]                         = useState<string[]>([])
  const [exportObrasSociales, setExportObrasSociales]         = useState<string[]>([])
  const [exportFreshPct, setExportFreshPct]                   = useState(70)
  const [exportZonesOpen, setExportZonesOpen]                 = useState(false)
  const [exportOsOpen, setExportOsOpen]                       = useState(false)
  const [exportOsSearch, setExportOsSearch]                   = useState('')  // search inside OS dropdown
  // Eligible obras sociales for the custom export mode (dynamic based on selected zones)
  const [eligibleObrasSociales, setEligibleObrasSociales]     = useState<string[]>([])
  const [eligibleOsLoading, setEligibleOsLoading]             = useState(false)
  // Per-OS stock map for coverage control
  const [exportOsStockMap, setExportOsStockMap]               = useState<Record<string, { freshCount: number; reusableCount: number }>>({})

  // ── Total count ───────────────────────────────────────────────────────────
  const [totalCount, setTotalCount] = useState(0)
  const [freshCount, setFreshCount]       = useState(0)
  const [reusableCount, setReusableCount] = useState(0)

  // ── Verif portal position ────────────────────────────────────────────────
  const [verifDropdownPos, setVerifDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null)

  // ── ARCA state ───────────────────────────────────────────────────────────
  const [arcaMode, setArcaMode] = useState<'pending' | 'selected' | 'filtered' | 'byObraSocial'>('pending')
  const [arcaLimit, setArcaLimit] = useState<number>(10)
  const [arcaObraSocialGroups, setArcaObraSocialGroups] = useState<{ obraSocial: string; limit: number }[]>([
    { obraSocial: '', limit: 100 },
  ])

  // ── Refs ─────────────────────────────────────────────────────────────────
  const arcaPanelRef          = useRef<HTMLDivElement>(null)
  const exportPanelRef        = useRef<HTMLDivElement>(null)
  const obraSocialDropdownRef = useRef<HTMLDivElement>(null)
  const verifDropdownRef      = useRef<HTMLDivElement>(null)
  const verifPortalRef        = useRef<HTMLDivElement>(null)

  const isGerencia  = user?.role?.toLowerCase() === 'gerencia'
  const isEncargado = user?.role?.toLowerCase() === 'encargado'
  const canProgramarEnvio = isGerencia || isEncargado

  // ── Click-outside handler ────────────────────────────────────────────────
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (arcaModalOpen && arcaPanelRef.current && !arcaPanelRef.current.contains(e.target as Node))
        setArcaModalOpen(false)
      if (exportModalOpen && exportPanelRef.current && !exportPanelRef.current.contains(e.target as Node))
        setExportModalOpen(false)
      if (obraSocialDropdownOpen && obraSocialDropdownRef.current && !obraSocialDropdownRef.current.contains(e.target as Node))
        setObraSocialDropdownOpen(false)
      if (verifDropdownOpen) {
        const inTrigger = verifDropdownRef.current?.contains(e.target as Node)
        const inPortal  = verifPortalRef.current?.contains(e.target as Node)
        if (!inTrigger && !inPortal) { setVerifDropdownOpen(false); setVerifDropdownPos(null) }
      }
    }
    document.addEventListener("mousedown", onMouseDown)
    return () => document.removeEventListener("mousedown", onMouseDown)
  }, [arcaModalOpen, exportModalOpen, obraSocialDropdownOpen, verifDropdownOpen])

  // ── Load obras sociales (all authenticated users) ────────────────────────
  useEffect(() => {
    api.affiliates.distinctObrasSociales()
      .then(res => setObrasSociales(res.data.obrasSociales || []))
      .catch(() => {})
  }, [])

  // ── Eligible obras sociales for custom export mode (dynamic per zones) ──
  useEffect(() => {
    if (exportMode !== 'custom') return
    let cancelled = false
    setEligibleOsLoading(true)
    api.affiliates.getDeliveryStock({ zones: exportZones })
      .then(res => {
        if (cancelled) return
        const stock: Array<{ nombre: string; freshCount: number; reusableCount: number }> =
          res.data?.stock ?? []
        const available = stock
          .filter(s => (s.freshCount + s.reusableCount) > 0)
          .map(s => s.nombre)
          .sort((a, b) => a.localeCompare(b, 'es'))
        // Build stock map for coverage control
        const stockMap: Record<string, { freshCount: number; reusableCount: number }> = {}
        for (const s of stock) { stockMap[s.nombre] = { freshCount: s.freshCount, reusableCount: s.reusableCount } }
        setEligibleObrasSociales(available)
        setExportOsStockMap(stockMap)
        const availableSet = new Set(available)
        setExportObrasSociales(prev => {
          const valid   = prev.filter(os => availableSet.has(os))
          const removed = prev.filter(os => !availableSet.has(os))
          if (removed.length > 0) {
            toast.info(
              `${removed.join(', ')} ${
                removed.length === 1 ? 'fue eliminada' : 'fueron eliminadas'
              } — sin stock en las zonas seleccionadas`
            )
          }
          return valid
        })
      })
      .catch(() => {
        if (!cancelled) setEligibleObrasSociales(obrasSociales)
      })
      .finally(() => { if (!cancelled) setEligibleOsLoading(false) })
    return () => { cancelled = true }
  }, [exportMode, exportZones]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load affiliates ──────────────────────────────────────────────────────
  const loadAfiliados = async () => {
    try {
      setLoading(true)
      const params: Record<string, any> = { page, limit: 100, search: searchTerm }
      if (obraSocialFilter.length)   params.obraSocial        = obraSocialFilter
      if (zonaFilter)                params.zona              = zonaFilter
      if (localidadFilter)           params.localidad         = localidadFilter
      if (verificationFilter.length) params.verificationStatus = verificationFilter
      if (trimPagosFilter.length)    params.trimPagos         = trimPagosFilter
      if (soloDisponibles)            params.soloDisponibles   = 'true'
      const pFrom = buildYYYYMM(periodFromYear, periodFromMonth)
      const pTo   = buildYYYYMM(periodToYear,   periodToMonth)
      if (pFrom) params.periodFrom = pFrom
      if (pTo)   params.periodTo   = pTo
      const response = await api.affiliates.list(params)
      setAfiliados(response.data.affiliates || [])
      setTotalCount(response.data.pagination?.total ?? 0)
      setFreshCount(response.data.pagination?.freshCount ?? 0)
      setReusableCount(response.data.pagination?.reusableCount ?? 0)
      setTotalPages(response.data.pagination?.pages || response.data.totalPages || 1)
    } catch (error: any) {
      console.error("Error loading affiliates:", error)
      toast.error("Error al cargar afiliados")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAfiliados()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchTerm, obraSocialFilter, zonaFilter, localidadFilter, verificationFilter,
      periodFromMonth, periodFromYear, periodToMonth, periodToYear, trimPagosFilter, soloDisponibles])

  // ── Download full base ────────────────────────────────────────────────────
  const handleDownloadAll = async () => {
    try {
      setDownloadingAll(true)
      const response = await api.affiliates.exportAll()
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `base_afiliados_completa_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      toast.success("Base de afiliados descargada correctamente")
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Error al descargar la base de afiliados")
    } finally {
      setDownloadingAll(false)
    }
  }

  // ── Custom export ─────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (exportMode === 'selected' && selectedIds.length === 0) {
      toast.error('Debés seleccionar al menos un afiliado para exportar')
      return
    }
    try {
      setDownloadingAll(true)
      const payload: Record<string, any> = { mode: exportMode }
      if (exportMode === 'selected') {
        payload.affiliateIds = selectedIds
      } else if (exportMode === 'filtered') {
        if (searchTerm)              payload.search             = searchTerm
        if (obraSocialFilter.length) payload.obraSocial         = obraSocialFilter
        if (zonaFilter)              payload.zona               = zonaFilter
        if (localidadFilter)         payload.localidad          = localidadFilter
        if (verificationFilter.length) payload.verificationStatus = verificationFilter
        if (trimPagosFilter.length)  payload.trimPagos          = trimPagosFilter
        const pFrom = buildYYYYMM(periodFromYear, periodFromMonth)
        const pTo   = buildYYYYMM(periodToYear,   periodToMonth)
        if (pFrom)                   payload.periodFrom         = pFrom
        if (pTo)                     payload.periodTo           = pTo
        if (soloDisponibles)         payload.soloDisponibles    = true
      } else if (exportMode === 'custom') {
        // Custom mode uses the delivery engine — separate API call
        const deliveryPayload = {
          zones: exportZones,
          obrasSociales: exportObrasSociales,
          freshPct: exportFreshPct,
          limit: exportLimit > 0 ? exportLimit : 200
        }
        const response = await api.affiliates.exportDelivery(deliveryPayload)
        const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `export_delivery_${new Date().toISOString().split('T')[0]}.xlsx`
        document.body.appendChild(a); a.click(); document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        toast.success('Archivo descargado correctamente')
        setExportModalOpen(false)
        return
      }
      const response = await api.affiliates.exportCustom(payload)
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `base_afiliados_${exportMode}_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      toast.success('Archivo descargado correctamente')
      setExportModalOpen(false)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al exportar')
    } finally {
      setDownloadingAll(false)
    }
  }

  // ── ARCA run ─────────────────────────────────────────────────────────────
  const handleRunContributions = async () => {
    const payload: Parameters<typeof api.affiliateContributions.run>[0] = { mode: arcaMode }

    if (arcaMode === 'selected') {
      if (!selectedIds.length) { toast.error('No hay registros seleccionados'); return }
      payload.affiliateIds = selectedIds
      payload.limit = arcaLimit
    } else if (arcaMode === 'filtered') {
      payload.filters = {
        search:             searchTerm             || undefined,
        zona:               zonaFilter             || undefined,
        localidad:          localidadFilter        || undefined,
        verificationStatus: verificationFilter.length ? verificationFilter : undefined,
        obraSocial:         obraSocialFilter.length   ? obraSocialFilter   : undefined,
        periodFrom:         buildYYYYMM(periodFromYear, periodFromMonth),
        periodTo:           buildYYYYMM(periodToYear,   periodToMonth),
      }
      payload.limit = arcaLimit
    } else if (arcaMode === 'byObraSocial') {
      const validGroups = arcaObraSocialGroups.filter(g => g.obraSocial.trim() && g.limit > 0)
      if (!validGroups.length) { toast.error('Seleccioná al menos una obra social con cantidad válida'); return }
      payload.groups = validGroups
    } else {
      payload.limit = arcaLimit
    }

    try {
      setRunningContributions(true)
      const { data } = await api.affiliateContributions.run(payload)
      toast.success(data.message || 'Tarea encolada correctamente.')
      setArcaModalOpen(false)
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Error al iniciar verificación de aportes')
    } finally {
      setRunningContributions(false)
    }
  }

  // ── Padron badge ─────────────────────────────────────────────────────────
  const calcPadronExpiry = (periodoDesde: string | null | undefined): string => {
    if (!periodoDesde) return '—'
    const [mm, yyyy] = periodoDesde.split('/')
    if (!mm || !yyyy) return periodoDesde
    const d = new Date(parseInt(yyyy), parseInt(mm) - 1 + 12, 1)
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  }

  const getPadronBadge = (padron?: PadronData | null) => {
    if (!padron || !padron.status)
      return { label: '—', cls: theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-400' }
    switch (padron.status) {
      case 'not_found':     return { label: 'No',                              cls: theme === 'dark' ? 'bg-green-900 text-green-300'    : 'bg-green-100 text-green-700' }
      case 'found_expired': return { label: 'No',                              cls: theme === 'dark' ? 'bg-green-900 text-green-300'    : 'bg-green-100 text-green-700' }
      case 'found_active':  return { label: calcPadronExpiry(padron.periodoDesde), cls: theme === 'dark' ? 'bg-red-900 text-red-300'       : 'bg-red-100 text-red-700' }
      case 'captcha_failed':return { label: 'CAPTCHA',                         cls: theme === 'dark' ? 'bg-orange-900 text-orange-300'  : 'bg-orange-100 text-orange-700' }
      case 'error':         return { label: 'Error',                            cls: theme === 'dark' ? 'bg-red-900 text-red-400'        : 'bg-red-50 text-red-600' }
      default:              return { label: '—',                                cls: theme === 'dark' ? 'bg-gray-700 text-gray-400'      : 'bg-gray-100 text-gray-400' }
    }
  }

  // ── Contribution badge ────────────────────────────────────────────────────
  const getContributionBadge = (contrib?: ContributionData) => {
    if (!contrib || contrib.verificationStatus === 'pending')
      return { label: 'Pendiente', cls: theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-500' }
    switch (contrib.verificationStatus) {
      case 'success': return { label: 'OK',        cls: theme === 'dark' ? 'bg-green-900 text-green-300'   : 'bg-green-100 text-green-700' }
      case 'no_data': return { label: 'Sin datos', cls: theme === 'dark' ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-700' }
      case 'captcha': return { label: 'CAPTCHA',   cls: theme === 'dark' ? 'bg-orange-900 text-orange-300' : 'bg-orange-100 text-orange-700' }
      case 'error':   return { label: 'Error',     cls: theme === 'dark' ? 'bg-red-900 text-red-300'       : 'bg-red-100 text-red-700' }
      default:        return { label: 'Pendiente', cls: theme === 'dark' ? 'bg-gray-700 text-gray-300'     : 'bg-gray-100 text-gray-500' }
    }
  }

  // ── Delete affiliate ──────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar este afiliado?")) return
    try {
      await api.affiliates.delete(id)
      toast.success("Afiliado eliminado")
      loadAfiliados()
    } catch {
      toast.error("Error al eliminar afiliado")
    }
  }

  const inputCls = cn(
    "w-full px-3 py-2 rounded-lg border text-sm",
    theme === "dark" ? "bg-white/5 border-white/10 text-white placeholder:text-gray-500" : "bg-white border-gray-200 text-gray-700 placeholder:text-gray-400"
  )
  const selectCls = cn(
    "w-full px-2 py-2 rounded-lg border text-sm",
    theme === "dark" ? "bg-gray-800 border-white/10 text-white" : "bg-white border-gray-200 text-gray-700"
  )
  const labelCls = cn("text-xs mb-1 block", theme === "dark" ? "text-gray-400" : "text-gray-500")

  const normalizeText = (value = '') =>
    value
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()

  const filteredObrasSociales = obrasSociales.filter(os =>
    normalizeText(os).includes(normalizeText(obraSocialSearch))
  )

  return (
    <>
    <div className="animate-fade-in-up space-y-4">

      {/* ── FILTROS ────────────────────────────────────────────────────────── */}
      <div className={cn(
        "rounded-2xl border p-4 lg:p-6 backdrop-blur-sm",
        theme === "dark" ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
                         : "bg-gradient-to-br from-white to-[#FAF7F2]/80 border-purple-200/30 shadow-lg shadow-purple-100/30",
      )}>
        <div className="flex flex-col lg:flex-row lg:items-start gap-4">
          <div className="flex-1">
            <h2 className={cn("text-lg font-semibold flex items-center gap-2 mb-4", theme === "dark" ? "text-white" : "text-gray-700")}>
              <Search className={cn("w-5 h-5", theme === "dark" ? "text-purple-400" : "text-purple-500")} />
              Buscar y Filtrar Afiliados
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">

              {/* ── Búsqueda texto ── */}
              <div>
                <label className={labelCls}>Nombre, CUIL o Teléfono</label>
                <div className="relative">
                  <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", theme === "dark" ? "text-gray-500" : "text-gray-400")} />
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className={cn("w-full pl-9 pr-3 py-2 rounded-lg border text-sm",
                      theme === "dark" ? "bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                                       : "bg-white border-gray-200 text-gray-700 placeholder:text-gray-400")}
                  />
                </div>
              </div>

              {/* ── Obra Social multi-select ── */}
              <div ref={obraSocialDropdownRef} className="relative">
                <label className={labelCls}>Obra Social</label>
                <button type="button" onClick={() => setObraSocialDropdownOpen(v => !v)}
                  className={cn("w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm text-left",
                    theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-700")}>
                  <span className="truncate">
                    {obraSocialFilter.length === 0 ? 'Todas' : obraSocialFilter.length === 1 ? obraSocialFilter[0] : `${obraSocialFilter.length} seleccionadas`}
                  </span>
                  <ChevronDown className="w-4 h-4 shrink-0 ml-2 opacity-60" />
                </button>
                {obraSocialDropdownOpen && (
                  <div className={cn("absolute left-0 top-full mt-1 w-full max-h-[22rem] flex flex-col rounded-lg border shadow-2xl z-[60]",
                    theme === "dark" ? "bg-gray-900 border-white/10" : "bg-white border-gray-200")}>

                    {/* Búsqueda interna */}
                    <div className={cn("p-2 border-b shrink-0", theme === "dark" ? "border-white/10" : "border-gray-100")}>
                      <div className="relative">
                        <Search className={cn("absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5", theme === "dark" ? "text-gray-500" : "text-gray-400")} />
                        <input
                          type="text"
                          placeholder="Buscar obra social..."
                          value={obraSocialSearch}
                          onChange={e => setObraSocialSearch(e.target.value)}
                          onKeyDown={e => e.stopPropagation()}
                          className={cn("w-full pl-8 pr-2 py-1.5 rounded-md border text-xs outline-none transition-colors",
                            theme === "dark" ? "bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-indigo-500 focus:bg-white/10"
                                             : "bg-gray-50 border-gray-200 text-gray-700 placeholder:text-gray-400 focus:border-indigo-400 focus:bg-white")}
                        />
                      </div>
                    </div>

                    <div className={cn("flex border-b shrink-0", theme === "dark" ? "border-white/10" : "border-gray-100")}>
                      <button type="button" onClick={() => setObraSocialFilter([...obrasSociales])}
                        className={cn("flex-1 px-3 py-2 text-xs font-medium",
                          theme === "dark" ? "text-green-400 hover:bg-white/5" : "text-green-600 hover:bg-gray-50")}>
                        Todos
                      </button>
                      <button type="button" onClick={() => setObraSocialFilter([])}
                        className={cn("flex-1 px-3 py-2 text-xs font-medium",
                          theme === "dark" ? "text-indigo-400 hover:bg-white/5" : "text-indigo-600 hover:bg-gray-50")}>
                        Limpiar
                      </button>
                    </div>

                    <div className="overflow-y-auto flex-1">
                      {filteredObrasSociales.map(os => {
                        const sel = obraSocialFilter.includes(os)
                        return (
                          <button key={os} type="button"
                            onClick={() => setObraSocialFilter(prev => sel ? prev.filter(x => x !== os) : [...prev, os])}
                            className={cn("w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors",
                              sel ? (theme === "dark" ? "bg-indigo-600/20 text-indigo-300" : "bg-indigo-50 text-indigo-700")
                                  : (theme === "dark" ? "hover:bg-white/5 text-gray-300" : "hover:bg-gray-50 text-gray-700"))}>
                            <span className={cn("w-3 h-3 rounded border shrink-0 flex items-center justify-center transition-colors",
                              sel ? "bg-indigo-500 border-indigo-500" : (theme === "dark" ? "border-white/20" : "border-gray-300"))} />
                            {os}
                          </button>
                        )
                      })}
                      {filteredObrasSociales.length === 0 && (
                        <p className={cn("px-3 py-4 text-xs text-center", theme === "dark" ? "text-gray-500" : "text-gray-400")}>
                          No se encontraron obras sociales
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {obraSocialFilter.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {obraSocialFilter.map(os => (
                      <span key={os} className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs",
                        theme === "dark" ? "bg-indigo-600/30 text-indigo-300" : "bg-indigo-100 text-indigo-700")}>
                        {os}
                        <button type="button" onClick={() => setObraSocialFilter(prev => prev.filter(x => x !== os))}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Zona ── */}
              <div>
                <label className={labelCls}>Zona</label>
                <select value={zonaFilter} onChange={e => setZonaFilter(e.target.value)} className={selectCls}>
                  <option value="">Todas</option>
                  <option value="CABA">CABA</option>
                  <option value="Norte">Norte</option>
                  <option value="Sur">Sur</option>
                  <option value="Oeste">Oeste</option>
                  <option value="Provincia">Provincia</option>
                </select>
              </div>

              {/* ── Localidad ── */}
              <div>
                <label className={labelCls}>Localidad</label>
                <input type="text" placeholder="Filtrar por localidad..."
                  value={localidadFilter} onChange={e => setLocalidadFilter(e.target.value)}
                  className={inputCls} />
              </div>

              {/* ── Verificación ── */}
              <div ref={verifDropdownRef} className="relative">
                <label className={labelCls}>Verificación</label>
                <button type="button" onClick={() => {
                    if (!verifDropdownOpen && verifDropdownRef.current) {
                      const r = verifDropdownRef.current.getBoundingClientRect()
                      setVerifDropdownPos({ top: r.bottom + window.scrollY, left: r.left + window.scrollX, width: r.width })
                    } else {
                      setVerifDropdownPos(null)
                    }
                    setVerifDropdownOpen(v => !v)
                  }}
                  className={cn("w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm text-left",
                    theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-700")}>
                  <span>{verificationFilter.length === 0 ? 'Todos' : `${verificationFilter.length} estado(s)`}</span>
                  <ChevronDown className="w-4 h-4 ml-2 opacity-60" />
                </button>
              </div>

              {/* ── Período Desde ── */}
              <div>
                <label className={labelCls}>Aporte desde</label>
                <div className="flex gap-2">
                  <select value={periodFromMonth} onChange={e => setPeriodFromMonth(e.target.value)} className={selectCls}>
                    <option value="">Mes</option>
                    {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                  <select value={periodFromYear} onChange={e => setPeriodFromYear(e.target.value)} className={selectCls}>
                    <option value="">Año</option>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              {/* ── Período Hasta ── */}
              <div>
                <label className={labelCls}>Aporte hasta</label>
                <div className="flex gap-2">
                  <select value={periodToMonth} onChange={e => setPeriodToMonth(e.target.value)} className={selectCls}>
                    <option value="">Mes</option>
                    {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                  <select value={periodToYear} onChange={e => setPeriodToYear(e.target.value)} className={selectCls}>
                    <option value="">Año</option>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              {/* ── Trim. pagos multi-select ── */}
              <div>
                <label className={labelCls}>Trim. pagos</label>
                <div className="flex gap-1 flex-wrap">
                  {[0, 1, 2, 3].map(v => {
                    const sel = trimPagosFilter.includes(v)
                    const labels = ['0', '1', '2', '3']
                    return (
                      <button key={v} type="button"
                        onClick={() => setTrimPagosFilter(prev => sel ? prev.filter(x => x !== v) : [...prev, v])}
                        className={cn(
                          "px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors",
                          sel
                            ? theme === "dark" ? "bg-purple-600/40 border-purple-500 text-purple-200" : "bg-purple-100 border-purple-400 text-purple-700"
                            : theme === "dark" ? "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                        )}>
                        {labels[v]}
                      </button>
                    )
                  })}
                  {trimPagosFilter.length > 0 && (
                    <button type="button" onClick={() => setTrimPagosFilter([])}
                      className={cn("px-2 py-1.5 rounded-lg border text-xs transition-colors",
                        theme === "dark" ? "border-white/10 text-gray-500 hover:text-gray-300" : "border-gray-200 text-gray-400 hover:text-gray-600")}>
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* ── Solo disponibles para venta ── */}
              <div className="col-span-full">
                <label className={cn(
                  "inline-flex items-center gap-2.5 cursor-pointer select-none",
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                )}>
                  <span className={cn(
                    "relative inline-flex items-center justify-center w-4 h-4 rounded border shrink-0 transition-colors",
                    soloDisponibles
                      ? "bg-green-500 border-green-500"
                      : theme === "dark" ? "bg-white/5 border-white/20" : "bg-white border-gray-300"
                  )}>
                    <input
                      type="checkbox"
                      checked={soloDisponibles}
                      onChange={e => setSoloDisponibles(e.target.checked)}
                      className="sr-only"
                    />
                    {soloDisponibles && (
                      <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                        <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </span>
                  <span className="text-sm font-medium">Solo disponibles para venta</span>
                  {soloDisponibles && (
                    <span className={cn(
                      "text-xs px-1.5 py-0.5 rounded-full font-medium",
                      theme === "dark" ? "bg-green-900/40 text-green-300" : "bg-green-100 text-green-700"
                    )}>CanSell = Sí</span>
                  )}
                </label>
              </div>

            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mt-4 lg:mt-0 shrink-0">
            <button onClick={() => {
              setSearchTerm(''); setObraSocialFilter([]); setZonaFilter(''); setLocalidadFilter('');
              setVerificationFilter([]); setPeriodFromYear(''); setPeriodFromMonth('');
              setPeriodToYear(''); setPeriodToMonth(''); setTrimPagosFilter([]); setSoloDisponibles(false);
            }}
              className={cn("flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all hover:scale-105",
                theme === "dark" ? "bg-white/10 hover:bg-white/15 text-gray-300 border border-white/10" : "bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-200")}>
              <X className="w-4 h-4" />
              Limpiar filtros
            </button>
            <button onClick={loadAfiliados} disabled={loading}
              className={cn("flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all hover:scale-105 disabled:opacity-50",
                theme === "dark" ? "bg-gradient-to-r from-cyan-600 to-cyan-500 text-white" : "bg-gradient-to-r from-cyan-500 to-cyan-400 text-white")}>
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              Recargar
            </button>
          </div>
        </div>
      </div>

      {/* ── BARRA DE RESULTADOS + ACCIONES ─────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className={cn("rounded-xl px-4 py-2 text-sm flex flex-wrap items-center gap-x-3 gap-y-1", theme === "dark" ? "bg-blue-500/10 text-blue-300" : "bg-blue-50 text-blue-700")}>
          <span>Mostrando <strong>{afiliados.length}</strong> de <strong>{totalCount.toLocaleString('es-AR')}</strong> afiliados</span>
          <span className={cn("text-xs opacity-80", theme === "dark" ? "text-emerald-400" : "text-emerald-700")}>✨ {freshCount.toLocaleString('es-AR')} frescos</span>
          <span className={cn("text-xs opacity-80", theme === "dark" ? "text-amber-400" : "text-amber-600")}>♻️ {reusableCount.toLocaleString('es-AR')} reutilizables</span>
          {soloDisponibles && <span className="text-[11px] opacity-70">CanSell total, sin restar usos del mes</span>}
          {selectedIds.length > 0 && <span className="opacity-70">· {selectedIds.length} seleccionados</span>}
        </div>

        {isGerencia && (
          <div className="flex flex-col items-end gap-2">

            {/* ── Task progress widget ── */}
            <ArcaProgressWidget theme={theme} />

            <div className="flex flex-wrap gap-2 relative" style={{ zIndex: 50 }}>

            {/* ARCA button */}
            <button onClick={() => setArcaModalOpen(v => !v)}
              className={cn("flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all hover:scale-105",
                theme === "dark" ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white" : "bg-gradient-to-r from-indigo-500 to-indigo-400 text-white")}>
              <Zap className="w-4 h-4" />
              Actualizar Aportes ARCA
            </button>

            {/* Programar Envío button - Gerencia and Encargado */}
            {canProgramarEnvio && (
              <button onClick={() => setProgramarEnvioOpen(true)}
                className={cn("flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all hover:scale-105",
                  theme === "dark" ? "bg-gradient-to-r from-purple-600 to-purple-500 text-white" : "bg-gradient-to-r from-purple-500 to-purple-400 text-white")}>
                <Send className="w-4 h-4" />
                Programar Envío
              </button>
            )}

            {/* Export button + popover */}
            <div className="relative">
              <button onClick={() => setExportModalOpen(v => !v)}
                className={cn("flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all hover:scale-105",
                  theme === "dark" ? "bg-gradient-to-r from-green-600 to-green-500 text-white" : "bg-gradient-to-r from-green-500 to-green-400 text-white")}>
                <Download className="w-4 h-4" />
                Exportar
              </button>

              {exportModalOpen && (
                <div ref={exportPanelRef} className={cn(
                  "absolute top-full mt-2 right-0 w-80 rounded-xl border p-4 shadow-2xl z-[100] animate-fade-in-up",
                  theme === "dark" ? "bg-gray-900 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800")}>

                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Download className="w-4 h-4 text-green-500" />
                      <h3 className="text-sm font-semibold">Exportar Afiliados</h3>
                    </div>
                    <button onClick={() => setExportModalOpen(false)} className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Mode */}
                  <div className="mb-3">
                    <label className={cn("text-xs font-medium block mb-1.5", theme === "dark" ? "text-gray-400" : "text-gray-500")}>Tipo</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {([['full','Base Completa'],['custom','Personalizada'],['selected','Seleccionados'],['filtered','Filtrada']] as [string,string][]).map(([m, lbl]) => (
                        <button key={m} type="button" onClick={() => setExportMode(m as 'full' | 'custom' | 'selected' | 'filtered')}
                          className={cn("rounded-md px-2 py-1.5 text-xs font-medium border transition-all",
                            exportMode === m
                              ? (theme === "dark" ? "bg-green-600 border-green-500 text-white" : "bg-green-500 border-green-500 text-white")
                              : (theme === "dark" ? "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10" : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"))}>
                          {lbl}
                        </button>
                      ))}
                    </div>

                  {exportMode === 'selected' && (
                    <p className={cn("text-xs mt-2", selectedIds.length === 0 ? 'text-amber-400' : 'text-green-400')}>
                      {selectedIds.length === 0
                        ? 'Seleccioná registros en la tabla primero'
                        : `${selectedIds.length} registro(s) seleccionado(s)`}
                    </p>
                  )}
                  {exportMode === 'filtered' && (
                    <p className={cn("text-xs mt-2", theme === "dark" ? 'text-indigo-400' : 'text-indigo-600')}>
                      Exportará los {totalCount.toLocaleString()} registros que coinciden con los filtros activos.
                    </p>
                  )}
                  </div>

                  {exportMode === 'custom' && (
                    <div className="space-y-3 mb-3">
                      <div className={cn("text-xs px-2 py-1.5 rounded-md",
                        theme === "dark" ? "bg-indigo-900/40 text-indigo-300" : "bg-indigo-50 text-indigo-700")}>
                        Usa el mismo motor de elegibilidad que Programar Envío (frescos/reutilizables, validación de teléfono, ARCA).
                      </div>
                      <div>
                        <label className={labelCls}>Cantidad total</label>
                        <input type="number" min={1} value={exportLimit}
                          onChange={e => setExportLimit(Math.max(1, parseInt(e.target.value) || 1))}
                          className={cn("w-full px-2.5 py-1.5 rounded-md border text-sm",
                            theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200")} />
                      </div>
                      <div>
                        <label className={labelCls}>% Frescos / Reutilizables</label>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn("text-xs w-16 text-right", theme === "dark" ? "text-green-400" : "text-green-600")}>✨ {exportFreshPct}%</span>
                          <input type="range" min={0} max={100} step={5} value={exportFreshPct}
                            onChange={e => setExportFreshPct(parseInt(e.target.value))}
                            className="flex-1 accent-green-500 h-1.5" />
                          <span className={cn("text-xs w-16", theme === "dark" ? "text-amber-400" : "text-amber-600")}>♻️ {100 - exportFreshPct}%</span>
                        </div>
                      </div>
                      {/* ── Zona multi-select dropdown ── */}
                      <div className="relative">
                        <label className={labelCls}>Zonas</label>
                        <button type="button"
                          onClick={() => { setExportZonesOpen(v => !v); setExportOsOpen(false) }}
                          className={cn(
                            "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md border text-sm mt-0.5 transition-colors",
                            theme === "dark" ? "bg-white/5 border-white/10 text-white hover:bg-white/10" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                          )}>
                          <span className="truncate text-xs">
                            {exportZones.length === 0
                              ? <span className={theme === "dark" ? "text-gray-400" : "text-gray-400"}>Todas las zonas</span>
                              : exportZones.length <= 2
                                ? exportZones.join(', ')
                                : `${exportZones.length} zonas`}
                          </span>
                          <ChevronDown className={cn("w-3.5 h-3.5 shrink-0 ml-1 transition-transform", exportZonesOpen && "rotate-180",
                            theme === "dark" ? "text-gray-400" : "text-gray-400")} />
                        </button>
                        {exportZonesOpen && (
                          <div className={cn(
                            "absolute z-20 top-full mt-1 left-0 right-0 rounded-md border shadow-lg py-1",
                            theme === "dark" ? "bg-gray-800 border-white/10" : "bg-white border-gray-200"
                          )}>
                            {['CABA','Norte','Sur','Oeste','Provincia'].map(z => (
                              <button key={z} type="button"
                                onClick={() => setExportZones(prev => prev.includes(z) ? prev.filter(x => x !== z) : [...prev, z])}
                                className={cn(
                                  "w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors",
                                  exportZones.includes(z)
                                    ? (theme === "dark" ? "bg-indigo-600/30 text-indigo-200" : "bg-indigo-50 text-indigo-700")
                                    : (theme === "dark" ? "hover:bg-white/5 text-gray-300" : "hover:bg-gray-50 text-gray-700")
                                )}>
                                <span className={cn("w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0",
                                  exportZones.includes(z)
                                    ? (theme === "dark" ? "bg-indigo-500 border-indigo-500" : "bg-indigo-500 border-indigo-500")
                                    : (theme === "dark" ? "border-white/20" : "border-gray-300"))}>
                                  {exportZones.includes(z) && <span className="text-white text-[8px] font-bold">✓</span>}
                                </span>
                                {z}
                              </button>
                            ))}
                            {exportZones.length > 0 && (
                              <button type="button" onClick={() => setExportZones([])}
                                className={cn("w-full px-3 py-1 text-xs border-t mt-0.5 text-left",
                                  theme === "dark" ? "border-white/5 text-red-400 hover:text-red-300" : "border-gray-100 text-red-500 hover:text-red-600")}>
                                Limpiar selección
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      {/* ── Obra Social multi-select dropdown ── */}
                      {(() => {
                        const totalFresh = exportObrasSociales.length > 0
                          ? exportObrasSociales.reduce((s, os) => s + (exportOsStockMap[os]?.freshCount ?? 0), 0)
                          : Object.values(exportOsStockMap).reduce((s, v) => s + v.freshCount, 0)
                        const totalReusable = exportObrasSociales.length > 0
                          ? exportObrasSociales.reduce((s, os) => s + (exportOsStockMap[os]?.reusableCount ?? 0), 0)
                          : Object.values(exportOsStockMap).reduce((s, v) => s + v.reusableCount, 0)
                        const totalAvail = totalFresh + totalReusable
                        const stockOk = eligibleOsLoading || totalAvail >= exportLimit
                        const missing = Math.max(0, exportLimit - totalAvail)
                        return (
                          <>
                            <div className="relative">
                              <label className={labelCls}>Obras Sociales</label>
                              <button type="button"
                                onClick={() => { setExportOsOpen(v => !v); setExportZonesOpen(false) }}
                                className={cn(
                                  "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md border text-sm mt-0.5 transition-colors",
                                  theme === "dark" ? "bg-white/5 border-white/10 text-white hover:bg-white/10" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                                )}>
                                <span className="truncate text-xs">
                                  {exportObrasSociales.length === 0
                                    ? <span className={theme === "dark" ? "text-gray-400" : "text-gray-400"}>Todas las obras</span>
                                    : exportObrasSociales.length === 1
                                      ? exportObrasSociales[0]
                                      : `${exportObrasSociales.length} obras seleccionadas`}
                                </span>
                                <ChevronDown className={cn("w-3.5 h-3.5 shrink-0 ml-1 transition-transform", exportOsOpen && "rotate-180",
                                  theme === "dark" ? "text-gray-400" : "text-gray-400")} />
                              </button>
                              {exportOsOpen && (
                                <div className={cn(
                                  "absolute z-20 top-full mt-1 left-0 right-0 rounded-md border shadow-lg py-1",
                                  theme === "dark" ? "bg-gray-800 border-white/10" : "bg-white border-gray-200"
                                )}>
                                  <div className={cn("px-2 pt-1 pb-1 border-b", theme === "dark" ? "border-white/10" : "border-gray-100")}>
                                    <input
                                      type="text"
                                      value={exportOsSearch}
                                      onChange={e => setExportOsSearch(e.target.value)}
                                      placeholder="Buscar obra social..."
                                      autoFocus
                                      className={cn(
                                        "w-full px-2 py-1 rounded-sm text-xs border outline-none",
                                        theme === "dark"
                                          ? "bg-white/5 border-white/10 text-white placeholder-gray-500"
                                          : "bg-gray-50 border-gray-200 text-gray-700 placeholder-gray-400"
                                      )}
                                    />
                                  </div>
                                  <div className="max-h-36 overflow-y-auto">
                                    {eligibleOsLoading && (
                                      <p className={cn("px-3 py-2 text-xs", theme === "dark" ? "text-gray-400" : "text-gray-400")}>
                                        Cargando...
                                      </p>
                                    )}
                                    {!eligibleOsLoading && eligibleObrasSociales.length === 0 && (
                                      <p className={cn("px-3 py-2 text-xs", theme === "dark" ? "text-gray-400" : "text-gray-400")}>
                                        Sin obras con stock en las zonas seleccionadas
                                      </p>
                                    )}
                                    {!eligibleOsLoading && (() => {
                                      const needle = exportOsSearch.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
                                      const list = needle.length > 0
                                        ? eligibleObrasSociales.filter(os =>
                                            os.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(needle)
                                          )
                                        : eligibleObrasSociales
                                      if (list.length === 0) return (
                                        <p className={cn("px-3 py-2 text-xs", theme === "dark" ? "text-gray-500" : "text-gray-400")}>
                                          Sin resultados para "{exportOsSearch}"
                                        </p>
                                      )
                                      return list.map(os => {
                                        const osStock = exportOsStockMap[os]
                                        return (
                                          <button key={os} type="button"
                                            onClick={() => setExportObrasSociales(prev => prev.includes(os) ? prev.filter(x => x !== os) : [...prev, os])}
                                            className={cn(
                                              "w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors",
                                              exportObrasSociales.includes(os)
                                                ? (theme === "dark" ? "bg-indigo-600/30 text-indigo-200" : "bg-indigo-50 text-indigo-700")
                                                : (theme === "dark" ? "hover:bg-white/5 text-gray-300" : "hover:bg-gray-50 text-gray-700")
                                            )}>
                                            <span className={cn("w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0",
                                              exportObrasSociales.includes(os)
                                                ? (theme === "dark" ? "bg-indigo-500 border-indigo-500" : "bg-indigo-500 border-indigo-500")
                                                : (theme === "dark" ? "border-white/20" : "border-gray-300"))}>
                                              {exportObrasSociales.includes(os) && <span className="text-white text-[8px] font-bold">✓</span>}
                                            </span>
                                            <span className="truncate flex-1">{os}</span>
                                            {osStock && (
                                              <span className={cn("shrink-0 text-[9px] tabular-nums", theme === "dark" ? "text-gray-500" : "text-gray-400")}>
                                                ✨{osStock.freshCount} ♻️{osStock.reusableCount}
                                              </span>
                                            )}
                                          </button>
                                        )
                                      })
                                    })()}
                                  </div>
                                  {exportObrasSociales.length > 0 && (
                                    <button type="button" onClick={() => setExportObrasSociales([])}
                                      className={cn("w-full px-3 py-1 text-xs border-t mt-0.5 text-left sticky bottom-0",
                                        theme === "dark" ? "bg-gray-800 border-white/5 text-red-400 hover:text-red-300" : "bg-white border-gray-100 text-red-500 hover:text-red-600")}>
                                      Limpiar selección ({exportObrasSociales.length})
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                      {/* ── Stock coverage summary ── */}
                      {!eligibleOsLoading && Object.keys(exportOsStockMap).length > 0 && (
                        <div className={cn(
                          "text-xs px-2.5 py-1.5 rounded-md border flex items-center justify-between gap-2",
                          stockOk
                            ? (theme === "dark" ? "bg-green-900/30 border-green-700/40 text-green-300" : "bg-green-50 border-green-200 text-green-700")
                            : (theme === "dark" ? "bg-red-900/30 border-red-700/40 text-red-300" : "bg-red-50 border-red-200 text-red-600")
                        )}>
                          <span>
                            {stockOk
                              ? `Disponible: ✨${totalFresh} ♻️${totalReusable} = ${totalAvail} lead${totalAvail !== 1 ? 's' : ''}`
                              : `Faltan ${missing} lead${missing !== 1 ? 's' : ''} — seleccioná más obras`}
                          </span>
                          <span className="shrink-0 font-medium">{totalAvail}/{exportLimit}</span>
                        </div>
                      )}
                      </>
                      );
                      })()}
                    </div>
                  )}

                  <div className="pt-2 border-t dark:border-white/10 border-gray-100">
                    {exportMode === 'custom' && !eligibleOsLoading && Object.keys(exportOsStockMap).length > 0 && (() => {
                      const totalFreshBtn = exportObrasSociales.length > 0
                        ? exportObrasSociales.reduce((s, os) => s + (exportOsStockMap[os]?.freshCount ?? 0), 0)
                        : Object.values(exportOsStockMap).reduce((s, v) => s + v.freshCount, 0)
                      const totalReusBrn = exportObrasSociales.length > 0
                        ? exportObrasSociales.reduce((s, os) => s + (exportOsStockMap[os]?.reusableCount ?? 0), 0)
                        : Object.values(exportOsStockMap).reduce((s, v) => s + v.reusableCount, 0)
                      const insufficientStock = (totalFreshBtn + totalReusBrn) < exportLimit
                      if (!insufficientStock) return null
                      return (
                        <p className={cn("text-xs mb-1.5 text-center", theme === "dark" ? "text-red-400" : "text-red-600")}>
                          Stock insuficiente: seleccioná más obras sociales
                        </p>
                      )
                    })()}
                    <button onClick={handleExport}
                      disabled={downloadingAll || (exportMode === 'custom' && !eligibleOsLoading && Object.keys(exportOsStockMap).length > 0 && (() => {
                        const tot = exportObrasSociales.length > 0
                          ? exportObrasSociales.reduce((s, os) => s + (exportOsStockMap[os]?.freshCount ?? 0) + (exportOsStockMap[os]?.reusableCount ?? 0), 0)
                          : Object.values(exportOsStockMap).reduce((s, v) => s + v.freshCount + v.reusableCount, 0)
                        return tot < exportLimit
                      })())}
                      className={cn("flex w-full justify-center items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-white disabled:opacity-50",
                        theme === "dark" ? "bg-green-600 hover:bg-green-500" : "bg-green-500 hover:bg-green-600")}>
                      <Download className={cn("w-4 h-4", downloadingAll && "animate-pulse")} />
                      {downloadingAll ? 'Descargando...' : 'Descargar'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── ARCA Popover ── */}
            {arcaModalOpen && (
              <div ref={arcaPanelRef} className={cn(
                "absolute top-full mt-2 right-0 w-96 rounded-xl border p-4 shadow-2xl z-[100] animate-fade-in-up",
                theme === "dark" ? "bg-gray-900 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800")}>

                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-indigo-500" />
                    <h3 className="text-sm font-semibold">Ejecución Manual ARCA</h3>
                  </div>
                  <button onClick={() => setArcaModalOpen(false)} className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Warning */}
                <div className={cn("flex items-start gap-2 rounded-lg p-2.5 mb-3 text-xs",
                  theme === "dark" ? "bg-amber-900/30 text-amber-300 border border-amber-700/40" : "bg-amber-50 text-amber-700 border border-amber-200")}>
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Usá lotes pequeños. El CAPTCHA puede pausar la ejecución.</span>
                </div>

                {/* Mode buttons */}
                <div className="mb-3">
                  <label className={cn("text-xs font-medium block mb-1.5", theme === "dark" ? "text-gray-400" : "text-gray-500")}>Modo</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {([
                      { id: 'pending'      as const, label: 'Pendientes'     },
                      { id: 'selected'     as const, label: 'Seleccionados'  },
                      { id: 'filtered'     as const, label: 'Filtrados'      },
                      { id: 'byObraSocial' as const, label: 'Por Obra Social'},
                    ]).map(m => (
                      <button key={m.id} onClick={() => setArcaMode(m.id)}
                        className={cn("rounded-md px-2 py-1.5 text-xs font-medium border transition-all",
                          arcaMode === m.id
                            ? (theme === "dark" ? "bg-indigo-600 border-indigo-500 text-white" : "bg-indigo-500 border-indigo-500 text-white")
                            : (theme === "dark" ? "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10" : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"))}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mode descriptions */}
                {arcaMode === 'pending' && (
                  <p className="text-xs mb-3 opacity-60">Verificará todos los afiliados con estado de aporte "Pendiente".</p>
                )}
                {arcaMode === 'selected' && (
                  <p className={cn("text-xs mb-3", selectedIds.length === 0 ? "text-red-400" : "opacity-60")}>
                    {selectedIds.length === 0 ? 'No hay registros seleccionados en la tabla.' : `${selectedIds.length} registro(s) seleccionado(s).`}
                  </p>
                )}
                {arcaMode === 'filtered' && (
                  <p className="text-xs mb-3 opacity-60">
                    Usará los filtros activos: búsqueda, obra social, localidad, verificación y período.
                  </p>
                )}

                {/* byObraSocial groups */}
                {arcaMode === 'byObraSocial' && (
                  <div className="mb-3 space-y-2">
                    <label className={cn("text-xs font-medium block", theme === "dark" ? "text-gray-400" : "text-gray-500")}>Grupos por obra social</label>
                    {arcaObraSocialGroups.map((group, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <select value={group.obraSocial}
                          onChange={e => { const n = [...arcaObraSocialGroups]; n[i] = { ...n[i], obraSocial: e.target.value }; setArcaObraSocialGroups(n) }}
                          className={cn("flex-1 px-2 py-1.5 rounded-md border text-xs",
                            theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-700")}>
                          <option value="">Obra social...</option>
                          {obrasSociales.map(os => <option key={os} value={os}>{os}</option>)}
                        </select>
                        <input type="number" min={1} max={500} value={group.limit}
                          onChange={e => { const n = [...arcaObraSocialGroups]; n[i] = { ...n[i], limit: Math.max(1, parseInt(e.target.value) || 1) }; setArcaObraSocialGroups(n) }}
                          className={cn("w-20 px-2 py-1.5 rounded-md border text-xs",
                            theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-700")} />
                        <button type="button" onClick={() => setArcaObraSocialGroups(prev => prev.filter((_, j) => j !== i))}
                          disabled={arcaObraSocialGroups.length <= 1} className="p-1 text-red-400 hover:text-red-600 disabled:opacity-30">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={() => setArcaObraSocialGroups(prev => [...prev, { obraSocial: '', limit: 100 }])}
                      className={cn("flex items-center gap-1 text-xs px-2 py-1 rounded-md border",
                        theme === "dark" ? "border-white/10 text-indigo-400 hover:bg-white/5" : "border-gray-200 text-indigo-600 hover:bg-gray-50")}>
                      <Plus className="w-3 h-3" /> Agregar obra social
                    </button>
                  </div>
                )}

                {/* Limit (non-byObraSocial) */}
                {arcaMode !== 'byObraSocial' && (
                  <div className="mb-3">
                    <label className={cn("text-xs font-medium block mb-1.5", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                      Límite <span className="opacity-60">(0 = sin límite)</span>
                    </label>
                    <input type="number" min={0} max={500} value={arcaLimit}
                      onChange={e => setArcaLimit(Math.max(0, parseInt(e.target.value) || 0))}
                      className={cn("w-full px-2.5 py-1.5 rounded-md border text-sm",
                        theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-700")} />
                  </div>
                )}

                {/* Run button */}
                <div className="pt-2 border-t dark:border-white/10 border-gray-100">
                  <button onClick={handleRunContributions}
                    disabled={runningContributions || (arcaMode === 'selected' && selectedIds.length === 0)}
                    className={cn("flex w-full justify-center items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-white transition-all disabled:opacity-50",
                      theme === "dark" ? "bg-indigo-600 hover:bg-indigo-500" : "bg-indigo-500 hover:bg-indigo-600")}>
                    <Zap className={cn("w-4 h-4", runningContributions && "animate-pulse")} />
                    {runningContributions ? 'Iniciando...' : 'Iniciar'}
                  </button>
                </div>
              </div>
            )}
          </div>

          </div>
        )}
      </div>

      {/* Tabla de afiliados */}
      <div
        className={cn(
          "rounded-2xl border backdrop-blur-sm overflow-hidden",
          theme === "dark"
            ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
            : "bg-gradient-to-br from-white to-[#FAF7F2]/80 border-purple-200/30 shadow-lg shadow-purple-100/30",
        )}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                className={cn(
                  theme === "dark"
                    ? "bg-white/5 border-b border-white/10"
                    : "bg-purple-50/50 border-b border-purple-100",
                )}
              >
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={afiliados.length > 0 && afiliados.every(a => selectedIds.includes(a._id))}
                    ref={input => {
                      if (input) {
                        const someSelected = afiliados.some(a => selectedIds.includes(a._id))
                        const allSelected = afiliados.every(a => selectedIds.includes(a._id))
                        input.indeterminate = someSelected && !allSelected
                      }
                    }}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const newIds = Array.from(new Set([...selectedIds, ...afiliados.map(a => a._id)]))
                        setSelectedIds(newIds)
                      } else {
                        const visibleIds = afiliados.map(a => a._id)
                        setSelectedIds(selectedIds.filter(id => !visibleIds.includes(id)))
                      }
                    }}
                    className="rounded border-gray-300 text-indigo-500 focus:ring-indigo-500"
                  />
                </th>
                {["Nombre", "CUIL", "Obra Social", "Teléfono", "Localidad", "Últ. Aporte", "Trim. pagos", "Verificación", "Padrón", "Disponible"].map((header) => (
                  <th
                    key={header}
                    className={cn(
                      "px-4 py-3 text-left font-semibold whitespace-nowrap",
                      theme === "dark" ? "text-gray-300" : "text-gray-600",
                    )}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center">
                    <div className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                      Cargando...
                    </div>
                  </td>
                </tr>
              ) : afiliados.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center">
                    <div className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                      No se encontraron afiliados
                    </div>
                  </td>
                </tr>
              ) : (
                afiliados.map((afiliado) => (
                  <tr
                    key={afiliado._id}
                    className={cn(
                      "border-b transition-colors",
                      theme === "dark" ? "border-white/5 hover:bg-white/5" : "border-purple-50 hover:bg-purple-50/50",
                      selectedIds.includes(afiliado._id) && (theme === 'dark' ? "bg-white/10" : "bg-indigo-50/50")
                    )}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(afiliado._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds([...selectedIds, afiliado._id])
                          } else {
                            setSelectedIds(selectedIds.filter(id => id !== afiliado._id))
                          }
                        }}
                        className="rounded border-gray-300 text-indigo-500 focus:ring-indigo-500"
                      />
                    </td>
                    <td className={cn("px-4 py-3 font-medium", theme === "dark" ? "text-white" : "text-gray-700")}>
                      {afiliado.nombre}
                    </td>
                    <td className={cn("px-4 py-3", theme === "dark" ? "text-gray-300" : "text-gray-600")}>
                      {afiliado.cuil}
                    </td>
                    <td
                      className={cn("px-4 py-3 max-w-xs truncate", theme === "dark" ? "text-gray-400" : "text-gray-500")}
                    >
                      {afiliado.obraSocial}
                    </td>
                    <td className={cn("px-4 py-3", theme === "dark" ? "text-gray-300" : "text-gray-600")}>
                      {afiliado.telefono1}
                    </td>
                    <td className={cn("px-4 py-3", theme === "dark" ? "text-gray-300" : "text-gray-600")}>
                      {afiliado.localidad}
                    </td>
                    <td className={cn("px-4 py-3 font-mono text-sm", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                      {afiliado.contribution?.lastContributionPeriod || "-"}
                    </td>
                    <td className={cn("px-4 py-3 text-center text-sm font-semibold",
                      afiliado.contribution?.last3ClosedMonthsPaidCount === 3 ? (theme === 'dark' ? 'text-green-400' : 'text-green-600')
                      : afiliado.contribution?.last3ClosedMonthsPaidCount === null || afiliado.contribution?.last3ClosedMonthsPaidCount === undefined ? (theme === 'dark' ? 'text-gray-600' : 'text-gray-400')
                      : (theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'))}>
                      {afiliado.contribution?.last3ClosedMonthsPaidCount ?? '-'}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const badge = getContributionBadge(afiliado.contribution)
                        return (
                          <span className={cn("inline-block px-2 py-0.5 rounded-full text-xs font-medium", badge.cls)}>
                            {badge.label}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const badge = getPadronBadge(afiliado.contribution?.padron)
                        return (
                          <span className={cn("inline-block px-2 py-0.5 rounded-full text-xs font-medium", badge.cls)}>
                            {badge.label}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {afiliado.disponibleParaVenta === true
                        ? <span className={cn("inline-block px-2 py-0.5 rounded-full text-xs font-semibold", theme === 'dark' ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700')}>Sí</span>
                        : <span className={cn("inline-block px-2 py-0.5 rounded-full text-xs font-semibold", theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500')}>No</span>
                      }
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    {/* ── Verificación dropdown portal (renders to body, never clipped) ── */}
    {verifDropdownOpen && verifDropdownPos && typeof document !== 'undefined' && createPortal(
      <div
        ref={verifPortalRef}
        style={{ position: 'absolute', top: verifDropdownPos!.top + 4, left: verifDropdownPos!.left, width: verifDropdownPos!.width, zIndex: 9999 }}
        className={cn("rounded-lg border shadow-2xl",
          theme === "dark" ? "bg-gray-900 border-white/10" : "bg-white border-gray-200")}>
        <div className={cn("flex border-b", theme === "dark" ? "border-white/10" : "border-gray-100")}>
          <button type="button" onClick={() => setVerificationFilter(['pending','success','no_data','captcha','error'])}
            className={cn("flex-1 px-3 py-2 text-xs font-medium",
              theme === "dark" ? "text-green-400 hover:bg-white/5" : "text-green-600 hover:bg-gray-50")}>
            Todos
          </button>
          <button type="button" onClick={() => setVerificationFilter([])}
            className={cn("flex-1 px-3 py-2 text-xs font-medium",
              theme === "dark" ? "text-indigo-400 hover:bg-white/5" : "text-indigo-600 hover:bg-gray-50")}>
            Limpiar
          </button>
        </div>
        {([['pending','Pendiente'],['success','OK'],['no_data','Sin datos'],['captcha','CAPTCHA'],['error','Error']] as [string,string][]).map(([val, lbl]) => {
          const sel = verificationFilter.includes(val)
          return (
            <button key={val} type="button"
              onClick={() => setVerificationFilter(prev => sel ? prev.filter(x => x !== val) : [...prev, val])}
              className={cn("w-full text-left px-3 py-2 text-xs flex items-center gap-2",
                sel ? (theme === "dark" ? "bg-indigo-600/20 text-indigo-300" : "bg-indigo-50 text-indigo-700")
                    : (theme === "dark" ? "hover:bg-white/5 text-gray-300" : "hover:bg-gray-50 text-gray-700"))}>
              <span className={cn("w-3 h-3 rounded border shrink-0",
                sel ? "bg-indigo-500 border-indigo-500" : (theme === "dark" ? "border-white/20" : "border-gray-300"))} />
              {lbl}
            </button>
          )
        })}
      </div>,
      document.body
    )}

    {/* ── Programar Envío wizard modal ── */}
    {programarEnvioOpen && (
      <ProgramarEnvioModal onClose={() => setProgramarEnvioOpen(false)} />
    )}
    </>
  )
}
