"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import {
  Filter, Download, Upload, CheckCircle2, Lock, Unlock, RefreshCw, X, FileArchive, AlertCircle, Search, Calendar
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth"
import * as evidenciasService from "@/lib/evidenciasService"
import type { Evidencia, VentaElegible } from "@/lib/evidenciasService"

interface FilaEvidencia {
  ventaId: string
  nombre: string
  cuil: string
  status: string
  fecha: string | null
  estado: 'incompleta' | 'en_proceso' | 'terminada'
  filePath: string | null
  originalName: string | null
  fileSizeKB: number | null
  isLocked: boolean
  evidenciaId: string | null
}

const formatFileSize = (sizeKB: number | null) => {
  if (!sizeKB) return "-"
  if (sizeKB < 1024) return `${sizeKB.toFixed(0)} KB`
  return `${(sizeKB / 1024).toFixed(2)} MB`
}

const ESTADO_COLORS: Record<string, {
  badge: { light: string; dark: string }
}> = {
  incompleta: {
    badge: { light: "bg-stone-100 text-stone-600", dark: "bg-stone-500/30 text-stone-300" },
  },
  en_proceso: {
    badge: { light: "bg-amber-100 text-amber-700", dark: "bg-amber-500/30 text-amber-300" },
  },
  terminada: {
    badge: { light: "bg-green-100 text-green-700", dark: "bg-green-500/30 text-green-300" },
  },
}

const ESTADO_LABELS: Record<string, string> = {
  incompleta: "Incompleta",
  en_proceso: "En Proceso",
  terminada: "Terminada",
}

const STATUS_VENTA_COLORS: Record<string, { light: string; dark: string }> = {
  "qr hecho": { light: "bg-green-100 text-green-700", dark: "bg-green-500/30 text-green-300" },
  "aprobada": { light: "bg-teal-100 text-teal-700", dark: "bg-teal-500/30 text-teal-300" },
  "pendiente": { light: "bg-stone-100 text-stone-600", dark: "bg-stone-500/30 text-stone-300" },
  "cargada": { light: "bg-indigo-100 text-indigo-700", dark: "bg-indigo-500/30 text-indigo-300" },
  "rechazada": { light: "bg-red-100 text-red-700", dark: "bg-red-500/30 text-red-300" },
  "padrón": { light: "bg-amber-100 text-amber-700", dark: "bg-amber-500/30 text-amber-300" },
  "remuneración no válida": { light: "bg-red-200 text-red-800", dark: "bg-red-700/30 text-red-400" },
  "autovinculación": { light: "bg-pink-100 text-pink-700", dark: "bg-pink-500/30 text-pink-300" },
  "caída": { light: "bg-rose-200 text-rose-800", dark: "bg-rose-800/40 text-rose-300" },
  "en revisión": { light: "bg-slate-100 text-slate-600", dark: "bg-slate-500/30 text-slate-300" },
  "afip": { light: "bg-slate-200 text-slate-700", dark: "bg-slate-500/30 text-slate-300" },
  "hacer qr": { light: "bg-yellow-100 text-yellow-700", dark: "bg-yellow-500/30 text-yellow-300" },
  "qr hecho (temporal)": { light: "bg-lime-100 text-lime-700", dark: "bg-lime-500/30 text-lime-300" },
  "qr hecho pero pendiente de aprobación": { light: "bg-emerald-100 text-emerald-800", dark: "bg-emerald-500/20 text-emerald-400" },
  "baja laboral con nueva alta": { light: "bg-blue-100 text-blue-800", dark: "bg-blue-500/20 text-blue-400" },
  "baja laboral sin nueva alta": { light: "bg-slate-100 text-slate-800", dark: "bg-slate-500/20 text-slate-400" },
  "aprobada, pero no reconoce clave": { light: "bg-yellow-100 text-yellow-800", dark: "bg-yellow-500/20 text-yellow-400" },
  "rehacer vídeo": { light: "bg-red-300 text-red-900", dark: "bg-red-500/20 text-red-400" },
  "falta documentación": { light: "bg-orange-100 text-orange-800", dark: "bg-orange-500/20 text-orange-400" },
  "falta clave": { light: "bg-orange-100 text-orange-800", dark: "bg-orange-500/20 text-orange-400" },
  "falta clave (por arca)": { light: "bg-indigo-100 text-indigo-800", dark: "bg-indigo-500/20 text-indigo-400" },
  "falta clave y documentación": { light: "bg-orange-100 text-orange-800", dark: "bg-orange-500/20 text-orange-400" },
  "el afiliado cambió la clave": { light: "bg-orange-200 text-orange-900", dark: "bg-orange-500/20 text-orange-400" },
  "completa": { light: "bg-lime-600 text-white", dark: "bg-lime-500/30 text-lime-300" },
}

const getStatusVentaColor = (status: string, theme: string) => {
  const key = (status || "").toLowerCase()
  const c = STATUS_VENTA_COLORS[key]
  if (c) return theme === "dark" ? c.dark : c.light
  return theme === "dark" ? "bg-gray-500/20 text-gray-400" : "bg-gray-100 text-gray-700"
}

const formatFecha = (fecha: string | null) => {
  if (!fecha) return "-"
  try {
    return new Date(fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
  } catch { return "-" }
}

export function Evidencias() {
  const { theme } = useTheme()
  const { user } = useAuth()

  const [filas, setFilas] = useState<FilaEvidencia[]>([])
  const [loading, setLoading] = useState(false)
  const [searchText, setSearchText] = useState("")
  const [searchDebounced, setSearchDebounced] = useState("")
  const [searchCuil, setSearchCuil] = useState("")
  const [searchCuilDebounced, setSearchCuilDebounced] = useState("")
  const [estadoFilter, setEstadoFilter] = useState("")
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")

  // Paginación
  const PAGE_SIZE = 50
  const [page, setPage] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [uploadModalTop, setUploadModalTop] = useState(0)
  const [selectedVentaId, setSelectedVentaId] = useState<string | null>(null)
  const [selectedVentaNombre, setSelectedVentaNombre] = useState("")
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadModalRef = useRef<HTMLDivElement>(null)

  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [confirmModalTop, setConfirmModalTop] = useState(0)
  const [confirmVentaId, setConfirmVentaId] = useState<string | null>(null)
  const [confirmVentaNombre, setConfirmVentaNombre] = useState("")
  const confirmModalRef = useRef<HTMLDivElement>(null)

  // Debounce search nombre
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(searchText)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchText])

  // Debounce search CUIL
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchCuilDebounced(searchCuil)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchCuil])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [estadoFilter, fechaDesde, fechaHasta])

  // Click-outside para cerrar upload modal
  useEffect(() => {
    if (!uploadModalOpen) return
    const handler = (e: MouseEvent) => {
      if (uploadModalRef.current && !uploadModalRef.current.contains(e.target as Node)) {
        closeUploadModal()
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [uploadModalOpen])

  // Click-outside para cerrar confirm modal
  useEffect(() => {
    if (!confirmModalOpen) return
    const handler = (e: MouseEvent) => {
      if (confirmModalRef.current && !confirmModalRef.current.contains(e.target as Node)) {
        setConfirmModalOpen(false)
        setConfirmVentaId(null)
        setConfirmVentaNombre("")
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [confirmModalOpen])

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      if (estadoFilter === "en_proceso" || estadoFilter === "terminada") {
        // Para filtros de estado con evidencia, usar endpoint de evidencias
        const params: any = { estado: estadoFilter }
        if (searchDebounced.trim()) params.nombre = searchDebounced.trim()
        const evidenciasResult = await evidenciasService.getEvidencias(params)
        const evidencias = Array.isArray(evidenciasResult.evidencias) ? evidenciasResult.evidencias : []

        const rows: FilaEvidencia[] = evidencias.filter((ev) => ev.ventaId != null).map((ev) => {
          const ventaData = typeof ev.ventaId === 'object' ? ev.ventaId : null
          return {
            ventaId: ventaData?._id || (ev.ventaId as any),
            nombre: ventaData?.nombre || 'Venta desconocida',
            cuil: ventaData?.cuil || '',
            status: ventaData?.status || '',
            fecha: null,
            estado: ev.estado,
            filePath: ev.filePath,
            originalName: ev.originalName,
            fileSizeKB: ev.fileSizeKB,
            isLocked: ev.isLocked,
            evidenciaId: ev._id,
          }
        })

        setFilas(rows)
        setTotalRecords(rows.length)
        setTotalPages(1)
        setPage(1)
      } else {
        // Para "todos" o "incompleta": paginar ventas elegibles
        const ventasParams: any = { page, limit: PAGE_SIZE }
        if (searchDebounced.trim()) ventasParams.nombre = searchDebounced.trim()
        if (searchCuilDebounced.trim()) ventasParams.cuil = searchCuilDebounced.trim()
        if (fechaDesde) ventasParams.fechaDesde = fechaDesde
        if (fechaHasta) ventasParams.fechaHasta = fechaHasta

        const [ventasResult, evidenciasResult] = await Promise.all([
          evidenciasService.getVentasElegibles(ventasParams),
          evidenciasService.getEvidencias()
        ])

        const ventas = Array.isArray(ventasResult.ventas) ? ventasResult.ventas : []
        const evidencias = Array.isArray(evidenciasResult.evidencias) ? evidenciasResult.evidencias : []

        // Crear mapa de evidencias por ventaId
        const evidenciaMap = new Map<string, Evidencia>()
        evidencias.forEach((ev) => {
          const vId = typeof ev.ventaId === 'object' ? ev.ventaId._id : ev.ventaId
          if (vId) evidenciaMap.set(vId, ev)
        })

        // Construir filas combinadas para la página actual
        const combined: FilaEvidencia[] = ventas.map((venta) => {
          const ev = evidenciaMap.get(venta._id)
          return {
            ventaId: venta._id,
            nombre: venta.nombre,
            cuil: venta.cuil || "",
            status: venta.status,
            fecha: (venta as any).fechaCreacionQR || (venta as any).createdAt || null,
            estado: ev?.estado || 'incompleta',
            filePath: ev?.filePath || null,
            originalName: ev?.originalName || null,
            fileSizeKB: ev?.fileSizeKB || null,
            isLocked: ev ? ev.isLocked : false,
            evidenciaId: ev?._id || null,
          }
        })

        // Filtrar por estado "incompleta" si está seleccionado
        const filtered = estadoFilter === "incompleta"
          ? combined.filter(f => f.estado === "incompleta")
          : combined

        setFilas(filtered)
        setTotalRecords(ventasResult.total || 0)
        setTotalPages(ventasResult.totalPages || 1)
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.response?.data?.message || "Error al cargar datos")
      setFilas([])
    } finally {
      setLoading(false)
    }
  }, [searchDebounced, searchCuilDebounced, estadoFilter, fechaDesde, fechaHasta, page])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleUploadClick = (ventaId: string, nombre: string, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const modalHeight = 320
    const top = Math.min(rect.top + window.scrollY, document.documentElement.scrollHeight - modalHeight - 16)
    setUploadModalTop(Math.max(16, top))
    setSelectedVentaId(ventaId)
    setSelectedVentaNombre(nombre)
    setUploadFile(null)
    setUploadModalOpen(true)
  }

  const handleUploadSubmit = async () => {
    if (!uploadFile || !selectedVentaId) return
    if (!uploadFile.name.toLowerCase().endsWith('.zip')) {
      toast.error("Solo se permiten archivos ZIP")
      return
    }
    if (uploadFile.size > 100 * 1024 * 1024) {
      toast.error("El archivo no puede superar 100 MB")
      return
    }
    try {
      setUploading(true)
      await evidenciasService.uploadZip(selectedVentaId, uploadFile)
      toast.success("Archivo subido correctamente")
      closeUploadModal()
      fetchData()
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error al subir archivo")
    } finally {
      setUploading(false)
    }
  }

  const closeUploadModal = () => {
    setUploadModalOpen(false)
    setUploadFile(null)
    setSelectedVentaId(null)
    setSelectedVentaNombre("")
  }

  const handleMarkComplete = (ventaId: string, nombre: string, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const modalHeight = 220
    const top = Math.min(rect.top + window.scrollY, document.documentElement.scrollHeight - modalHeight - 16)
    setConfirmModalTop(Math.max(16, top))
    setConfirmVentaId(ventaId)
    setConfirmVentaNombre(nombre)
    setConfirmModalOpen(true)
  }

  const handleMarkCompleteConfirm = async () => {
    if (!confirmVentaId) return
    try {
      await evidenciasService.markAsComplete(confirmVentaId)
      toast.success("Evidencia marcada como terminada")
      setConfirmModalOpen(false)
      setConfirmVentaId(null)
      setConfirmVentaNombre("")
      fetchData()
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error al marcar como terminada")
    }
  }

  const handleDownload = async (ventaId: string, originalName: string | null) => {
    try {
      await evidenciasService.downloadZip(ventaId, originalName || "evidencia.zip")
      toast.success("Descarga iniciada")
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error al descargar archivo")
    }
  }

  const canUpload = (f: FilaEvidencia) => !f.isLocked
  const canMarkComplete = (f: FilaEvidencia) => f.status === "QR hecho" && f.estado !== "terminada" && !!f.filePath

  const getEstadoBadge = (estado: string) => {
    const c = ESTADO_COLORS[estado]
    if (!c) return theme === "dark" ? "bg-gray-500/20 text-gray-400" : "bg-gray-100 text-gray-700"
    return theme === "dark" ? c.badge.dark : c.badge.light
  }

  const clearFilters = () => {
    setSearchText("")
    setSearchCuil("")
    setEstadoFilter("")
    setFechaDesde("")
    setFechaHasta("")
  }

  return (
    <div className="space-y-6 animate-fade-in-up relative">
      {/* ==================== FILTROS ==================== */}
      <div
        className={cn(
          "rounded-2xl border p-6 backdrop-blur-sm relative z-20",
          theme === "dark"
            ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
            : "bg-white border-gray-200 shadow-sm",
        )}
      >
        <div className="flex items-center gap-2 mb-4">
          <Filter className={cn("w-5 h-5", theme === "dark" ? "text-purple-400" : "text-[#00C794]")} />
          <h3 className={cn("font-semibold", theme === "dark" ? "text-white" : "text-gray-800")}>Filtros</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-3">
          <input
            type="text"
            placeholder="Buscar por nombre"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm",
              theme === "dark"
                ? "bg-white/5 border-white/10 text-white placeholder-gray-500"
                : "bg-white border-gray-200 text-gray-800 placeholder-gray-400",
            )}
          />

          <input
            type="text"
            placeholder="Buscar por CUIL"
            value={searchCuil}
            onChange={(e) => setSearchCuil(e.target.value)}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm",
              theme === "dark"
                ? "bg-white/5 border-white/10 text-white placeholder-gray-500"
                : "bg-white border-gray-200 text-gray-800 placeholder-gray-400",
            )}
          />

          <select
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value)}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm",
              theme === "dark"
                ? "bg-white/5 border-white/10 text-white"
                : "bg-white border-gray-200 text-gray-800",
            )}
          >
            <option value="">Todos los estados</option>
            <option value="incompleta">Incompleta</option>
            <option value="en_proceso">En Proceso</option>
            <option value="terminada">Terminada</option>
          </select>

          <div className="relative">
            <label className={cn("absolute -top-2 left-2 text-[9px] px-1 z-10", theme === "dark" ? "text-gray-400 bg-gray-900" : "text-gray-500 bg-white")}>Desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className={cn(
                "w-full px-3 py-2 rounded-lg border text-sm",
                theme === "dark"
                  ? "bg-white/5 border-white/10 text-white"
                  : "bg-white border-gray-200 text-gray-800",
              )}
            />
          </div>

          <div className="relative">
            <label className={cn("absolute -top-2 left-2 text-[9px] px-1 z-10", theme === "dark" ? "text-gray-400 bg-gray-900" : "text-gray-500 bg-white")}>Hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className={cn(
                "w-full px-3 py-2 rounded-lg border text-sm",
                theme === "dark"
                  ? "bg-white/5 border-white/10 text-white"
                  : "bg-white border-gray-200 text-gray-800",
              )}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={clearFilters}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              theme === "dark"
                ? "bg-white/5 hover:bg-white/10 text-white border border-white/10"
                : "bg-gray-100 hover:bg-gray-200 text-gray-700",
            )}
          >
            Limpiar
          </button>

          <button
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors text-white flex items-center justify-center gap-2"
            style={{ backgroundColor: "#17C787" }}
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            Actualizar
          </button>
        </div>
      </div>

      {/* ==================== RESUMEN ==================== */}
      {(totalRecords > 0 || filas.length > 0) && (() => {
        const estadosCount: Record<string, number> = {}
        filas.forEach((f) => {
          const estado = ESTADO_LABELS[f.estado] || f.estado
          estadosCount[estado] = (estadosCount[estado] || 0) + 1
        })
        const lockedCount = filas.filter(f => f.isLocked).length

        return (
          <div className={cn(
            "rounded-xl border p-3",
            theme === "dark"
              ? "bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border-blue-700/30"
              : "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200"
          )}>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className={cn("font-bold", theme === "dark" ? "text-gray-200" : "text-gray-800")}>
                Total: <span className={theme === "dark" ? "text-blue-400" : "text-blue-600"}>{totalRecords.toLocaleString()}</span>
              </span>
              <span className={theme === "dark" ? "text-gray-500" : "text-gray-400"}>|</span>
              <span className={cn("font-medium", theme === "dark" ? "text-gray-300" : "text-gray-600")}>
                En esta página: {filas.length}
              </span>
              {Object.entries(estadosCount).sort((a, b) => b[1] - a[1]).map(([estado, count]) => (
                <span key={estado} className={theme === "dark" ? "text-gray-300" : "text-gray-700"}>
                  <span className="font-semibold">{estado}:</span>{' '}
                  <span className={theme === "dark" ? "text-indigo-400" : "text-indigo-600"}>{count}</span>
                </span>
              ))}
              {lockedCount > 0 && (
                <span className={theme === "dark" ? "text-gray-300" : "text-gray-700"}>
                  <span className="font-semibold">Bloqueadas:</span>{' '}
                  <span className={theme === "dark" ? "text-red-400" : "text-red-600"}>{lockedCount}</span>
                </span>
              )}
            </div>
          </div>
        )
      })()}

      {/* ==================== TABLA ==================== */}
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
                <th className="px-2 py-2.5 text-center min-w-[150px]">Afiliado</th>
                <th className="px-2 py-2.5 text-center w-[110px]">CUIL</th>
                <th className="px-2 py-2.5 text-center w-[90px]">Fecha</th>
                <th className="px-2 py-2.5 text-center w-[130px]">Estado Venta</th>
                <th className="px-2 py-2.5 text-center w-[110px]">Evidencia</th>
                <th className="px-2 py-2.5 text-center min-w-[150px]">Archivo</th>
                <th className="px-2 py-2.5 text-center w-[90px]">Bloqueo</th>
                <th className="px-2 py-2.5 text-center w-[120px]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center opacity-50">
                    <div className="flex justify-center items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Cargando evidencias...
                    </div>
                  </td>
                </tr>
              ) : filas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center opacity-50">
                    No se encontraron evidencias
                  </td>
                </tr>
              ) : (
                filas.map((f) => (
                  <tr
                    key={f.ventaId}
                    className={cn(
                      "transition-colors",
                      f.estado === "terminada"
                        ? theme === "dark" ? "bg-green-900/20 hover:bg-green-900/30" : "bg-green-50 hover:bg-green-100"
                        : theme === "dark" ? "hover:bg-white/5" : "hover:bg-gray-50"
                    )}
                  >
                    <td className={cn("px-2 py-2.5 text-center", theme === "dark" ? "text-white" : "text-gray-800")}>
                      {f.nombre}
                    </td>
                    <td className={cn("px-2 py-2.5 text-center font-mono", theme === "dark" ? "text-gray-300" : "text-gray-600")}>
                      {f.cuil || "-"}
                    </td>
                    <td className={cn("px-2 py-2.5 text-center", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                      {formatFecha(f.fecha)}
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <span className={cn(
                        "inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium truncate max-w-[120px]",
                        getStatusVentaColor(f.status, theme)
                      )} title={f.status}>
                        {f.status || "-"}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-medium inline-block", getEstadoBadge(f.estado))}>
                        {ESTADO_LABELS[f.estado] || f.estado}
                      </span>
                    </td>
                    <td className={cn("px-2 py-2.5 text-center", theme === "dark" ? "text-gray-300" : "text-gray-600")}>
                      {f.originalName ? (
                        <div>
                          <div className="truncate max-w-[180px] mx-auto">{f.originalName}</div>
                          <div className={cn("text-[10px]", theme === "dark" ? "text-gray-500" : "text-gray-400")}>{formatFileSize(f.fileSizeKB)}</div>
                        </div>
                      ) : (
                        <span className={theme === "dark" ? "text-gray-600" : "text-gray-400"}>Sin archivo</span>
                      )}
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      {f.isLocked ? (
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium",
                          theme === "dark" ? "bg-red-500/30 text-red-300" : "bg-red-100 text-red-700"
                        )}>
                          <Lock className="w-3 h-3" />
                          Sí
                        </span>
                      ) : (
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium",
                          theme === "dark" ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-50 text-emerald-600"
                        )}>
                          <Unlock className="w-3 h-3" />
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={(e) => handleUploadClick(f.ventaId, f.nombre, e)}
                          disabled={!canUpload(f)}
                          title={!canUpload(f) ? "Bloqueada: venta en 'QR hecho'" : "Subir/Reemplazar ZIP"}
                          className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            canUpload(f)
                              ? theme === "dark"
                                ? "bg-teal-500/20 hover:bg-teal-500/30 text-teal-300"
                                : "bg-teal-100 hover:bg-teal-200 text-teal-700"
                              : "opacity-30 cursor-not-allowed"
                          )}
                        >
                          <Upload className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={(e) => handleMarkComplete(f.ventaId, f.nombre, e)}
                          disabled={!canMarkComplete(f)}
                          title={!canMarkComplete(f) ? (f.status !== "QR hecho" ? "Solo si venta está en 'QR hecho'" : !f.filePath ? "Debe subir archivo ZIP primero" : "Ya está terminada") : "Marcar Terminada"}
                          className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            canMarkComplete(f)
                              ? theme === "dark"
                                ? "bg-green-500/20 hover:bg-green-500/30 text-green-300"
                                : "bg-green-100 hover:bg-green-200 text-green-700"
                              : "opacity-30 cursor-not-allowed"
                          )}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDownload(f.ventaId, f.originalName)}
                          disabled={!f.filePath}
                          title={f.filePath ? "Descargar ZIP" : "Sin archivo"}
                          className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            f.filePath
                              ? theme === "dark"
                                ? "bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300"
                                : "bg-indigo-100 hover:bg-indigo-200 text-indigo-700"
                              : "opacity-30 cursor-not-allowed"
                          )}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className={cn(
            "flex items-center justify-between px-4 py-3 border-t",
            theme === "dark" ? "border-white/10" : "border-gray-200"
          )}>
            <span className={cn("text-xs", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
              Página {page} de {totalPages} ({totalRecords.toLocaleString()} registros)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  page <= 1 || loading
                    ? "opacity-40 cursor-not-allowed"
                    : theme === "dark"
                      ? "bg-white/10 hover:bg-white/20 text-white"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                )}
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  page >= totalPages || loading
                    ? "opacity-40 cursor-not-allowed"
                    : "text-white"
                )}
                style={page < totalPages && !loading ? { backgroundColor: "#17C787" } : undefined}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ==================== MODAL UPLOAD ==================== */}
      {uploadModalOpen && (
        <div
          ref={uploadModalRef}
          className={cn(
            "absolute right-4 z-50 w-[400px] rounded-2xl p-6 border-2 animate-[modalPop_0.2s_ease-out]",
            theme === "dark"
              ? "bg-gray-900 border-teal-500/40 shadow-[0_8px_40px_rgba(0,199,148,0.15)]"
              : "bg-white border-teal-300 shadow-[0_8px_40px_rgba(0,199,148,0.18)]"
          )}
          style={{ top: uploadModalTop }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Upload className={cn("w-5 h-5", theme === "dark" ? "text-purple-400" : "text-[#00C794]")} />
              <h3 className={cn("text-base font-semibold", theme === "dark" ? "text-white" : "text-gray-800")}>
                Subir ZIP
              </h3>
            </div>
            <button
              onClick={closeUploadModal}
              className={cn(
                "p-1 rounded-lg transition-colors",
                theme === "dark" ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-500"
              )}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className={cn("text-xs mb-3", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
            Venta: <span className="font-medium">{selectedVentaNombre}</span>
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed mb-3 transition-colors text-sm font-medium",
              uploadFile
                ? theme === "dark"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-emerald-300 bg-emerald-50 text-emerald-700"
                : theme === "dark"
                  ? "border-white/20 hover:border-white/40 bg-white/5 text-gray-300 hover:text-white"
                  : "border-gray-300 hover:border-gray-400 bg-gray-50 text-gray-600 hover:text-gray-800"
            )}
          >
            <FileArchive className="w-4 h-4" />
            {uploadFile ? uploadFile.name : "Seleccionar archivo ZIP"}
          </button>

          {uploadFile && (
            <div className={cn(
              "text-xs mb-3 px-3 py-2 rounded-lg",
              theme === "dark" ? "bg-white/5 text-gray-300" : "bg-gray-50 text-gray-600"
            )}>
              Tamaño: {formatFileSize(uploadFile.size / 1024)}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={closeUploadModal}
              disabled={uploading}
              className={cn(
                "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                theme === "dark"
                  ? "bg-white/5 hover:bg-white/10 text-white"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              )}
            >
              Cancelar
            </button>
            <button
              onClick={handleUploadSubmit}
              disabled={!uploadFile || uploading}
              className={cn(
                "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-white flex items-center justify-center gap-2",
                uploadFile && !uploading
                  ? ""
                  : "opacity-50 cursor-not-allowed"
              )}
              style={{ backgroundColor: uploadFile && !uploading ? "#17C787" : "#9CA3AF" }}
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Subiendo...
                </>
              ) : "Subir"}
            </button>
          </div>
        </div>
      )}

      {/* ==================== MODAL CONFIRMAR TERMINADA ==================== */}
      {confirmModalOpen && (
        <div
          ref={confirmModalRef}
          className={cn(
            "absolute right-4 z-50 w-[400px] rounded-2xl p-6 border-2 animate-[modalPop_0.2s_ease-out]",
            theme === "dark"
              ? "bg-gray-900 border-green-500/40 shadow-[0_8px_40px_rgba(34,197,94,0.15)]"
              : "bg-white border-green-300 shadow-[0_8px_40px_rgba(34,197,94,0.18)]"
          )}
          style={{ top: confirmModalTop }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className={cn("w-5 h-5", theme === "dark" ? "text-green-400" : "text-green-600")} />
              <h3 className={cn("text-base font-semibold", theme === "dark" ? "text-white" : "text-gray-800")}>
                Confirmar Acción
              </h3>
            </div>
            <button
              onClick={() => {
                setConfirmModalOpen(false)
                setConfirmVentaId(null)
                setConfirmVentaNombre("")
              }}
              className={cn(
                "p-1 rounded-lg transition-colors",
                theme === "dark" ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-500"
              )}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className={cn("text-xs mb-4", theme === "dark" ? "text-gray-300" : "text-gray-600")}>
            ¿Confirmas que deseas marcar la evidencia de <span className="font-semibold">{confirmVentaNombre}</span> como <span className="font-semibold text-green-600">Terminada</span>?
            Esta acción bloqueará futuras modificaciones mientras la venta esté en &apos;QR hecho&apos;.
          </p>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setConfirmModalOpen(false)
                setConfirmVentaId(null)
                setConfirmVentaNombre("")
              }}
              className={cn(
                "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                theme === "dark"
                  ? "bg-white/5 hover:bg-white/10 text-white"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              )}
            >
              Cancelar
            </button>
            <button
              onClick={handleMarkCompleteConfirm}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-white"
              style={{ backgroundColor: "#17C787" }}
            >
              Confirmar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
