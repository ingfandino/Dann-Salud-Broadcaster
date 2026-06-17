/**
 * ============================================================
 * CARGAR AFILIADOS (base-afiliados-cargar.tsx)
 * ============================================================
 * Importación masiva de afiliados desde archivos Excel.
 * Valida duplicados y genera reportes de rechazo.
 */

"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type MouseEvent } from "react"
import * as XLSX from "xlsx"
import {
  AlertCircle,
  CheckCircle,
  Clock,
  CloudUpload,
  Download,
  FileCheck2,
  FileDown,
  FileSpreadsheet,
  FileText,
  ListChecks,
  RefreshCw,
  ShieldCheck,
  Upload,
  XCircle,
} from "lucide-react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { toast } from "sonner"

type ImportStats = {
  importJobId?: string
  status?: string
  fileName?: string
  originalFileName?: string
  totalRows?: number
  processedRows?: number
  createdCount?: number
  updatedCount?: number
  rejectedCount?: number
  rejectedFileAvailable?: boolean
  rejectedFileUrl?: string | null
  updatedFileAvailable?: boolean
  updatedFileUrl?: string | null
  duplicatesReportUrl?: string | null
  updatedReportUrl?: string | null
  errorMessage?: string
  createdAt?: string
  updatedAt?: string
  startedAt?: string
  finishedAt?: string
}

type UploadResult = {
  success: boolean
  message: string
  stats?: ImportStats
}

type RecentImport = {
  id: string
  archivo: string
  fecha: string
  estado: string
  nuevos: number
  actualizados: number
  rechazados: number
  rejectedFileAvailable?: boolean
  rejectedFileUrl?: string | null
  updatedFileAvailable?: boolean
  updatedFileUrl?: string | null
}

const terminalStatuses = ["completed", "completed_with_errors", "failed"]
const processingStatuses = ["pending", "processing"]
const templateColumns = [
  "Nombre",
  "CUIL",
  "Obra Social",
  "Localidad",
  "Teléfono_1",
  "Teléfono_2",
  "Teléfono_3",
  "Edad",
  "Código de obra social",
]
const templateInstructions = [
  "- Nombre, CUIL, Obra Social, Localidad y Teléfono_1 son obligatorios.",
  "- CUIL puede cargarse con o sin guiones.",
  "- Teléfono_2 y Teléfono_3 son opcionales.",
  "- No modificar los encabezados de la plantilla.",
  "- Los campos adicionales podrán usarse para enriquecer el registro.",
]

function safeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function formatNumber(value: unknown) {
  return safeNumber(value).toLocaleString("es-AR")
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(2)} MB`
  return `${(size / 1024).toFixed(2)} KB`
}

function formatDate(value?: string) {
  if (!value) return "Fecha no disponible"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Fecha no disponible"
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function getImportTitle(status?: string) {
  if (status === "completed_with_errors") return "Importación completada con observaciones"
  if (status === "completed") return "Importación completada"
  if (status === "failed") return "Error al procesar archivo"
  return "Procesando archivo..."
}

function getStatusLabel(status?: string) {
  if (status === "completed_with_errors") return "Con observaciones"
  if (status === "completed") return "Completado"
  if (status === "failed") return "Fallido"
  if (status === "processing") return "Procesando"
  if (status === "pending") return "Pendiente"
  return status || "Sin estado"
}

export function BaseAfiliadosCargar() {
  const { theme } = useTheme()
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [recentImports, setRecentImports] = useState<RecentImport[]>([])
  const [recentLoading, setRecentLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadRecentImports = useCallback(async () => {
    try {
      setRecentLoading(true)
      const response = await api.affiliates.baseStatus()
      const imports = Array.isArray(response.data?.recentImports) ? response.data.recentImports : []
      setRecentImports(imports)
    } catch {
      setRecentImports([])
    } finally {
      setRecentLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRecentImports()
  }, [loadRecentImports])

  useEffect(() => {
    if (!activeJobId) return

    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const pollJob = async () => {
      try {
        const response = await api.affiliates.getImportJob(activeJobId)
        if (cancelled) return

        const job = response.data.job
        const terminal = terminalStatuses.includes(job.status)

        if (job.status === "failed") {
          setResult({
            success: false,
            message: job.errorMessage || "Error al procesar archivo",
            stats: { ...job, importJobId: activeJobId }
          })
          setLoading(false)
          setActiveJobId(null)
          loadRecentImports()
          toast.error(job.errorMessage || "Error al procesar archivo")
          return
        }

        const statusMessage = terminal
          ? `Archivo procesado: ${job.createdCount} afiliados cargados, ${job.updatedCount} actualizados y ${job.rejectedCount} rechazados.`
          : "Procesando archivo..."

        setResult({
          success: true,
          message: statusMessage,
          stats: {
            ...job,
            importJobId: activeJobId,
            duplicatesReportUrl: job.rejectedFileUrl,
            updatedReportUrl: job.updatedFileUrl
          }
        })

        if (terminal) {
          setLoading(false)
          setActiveJobId(null)
          loadRecentImports()
          toast.success("Importación de afiliados finalizada")
          return
        }

        timeoutId = setTimeout(pollJob, 2000)
      } catch (error: any) {
        if (cancelled) return
        const message = error.response?.data?.message || error.message || "No se pudo consultar el estado de la importación"
        setResult({ success: false, message })
        setLoading(false)
        setActiveJobId(null)
        toast.error(message)
      }
    }

    pollJob()

    return () => {
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [activeJobId, loadRecentImports])

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && (droppedFile.name.endsWith(".xlsx") || droppedFile.name.endsWith(".xls"))) {
      setFile(droppedFile)
      setResult(null) // Clear previous results
    } else if (droppedFile) {
      toast.error("Seleccioná un archivo Excel válido (.xlsx o .xls)")
    }
  }

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResult(null) // Clear previous results
    }
  }

  const handleProcess = async (e: MouseEvent) => {
    e.stopPropagation()
    if (!file || loading) return

    try {
      setLoading(true)
      setResult(null)
      const response = await api.affiliates.upload(file)
      const importJobId = response.data.importJobId

      if (!response.data.async || !importJobId) {
        throw new Error("El servidor no devolvió un trabajo de importación válido")
      }

      setResult({
        success: true,
        message: "Procesando archivo...",
        stats: {
          importJobId,
          status: response.data.status,
          totalRows: 0,
          processedRows: 0,
          createdCount: 0,
          updatedCount: 0,
          rejectedCount: 0
        }
      })
      setActiveJobId(importJobId)
      setFile(null)
      loadRecentImports()
      toast.success("Archivo recibido. La importación continuará en segundo plano.")
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || "Error al crear la importación"
      setResult({ success: false, message: errorMsg })
      setLoading(false)
      toast.error(errorMsg)
    }
  }

  const downloadRejectedReport = async (jobId?: string) => {
    if (!jobId) return
    try {
      const response = await api.affiliates.downloadImportRejected(jobId)

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement("a")
      link.href = url

      // Extract filename from URL or use default
      const filename = "rechazados_" + jobId + ".xlsx"
      link.setAttribute("download", filename)

      document.body.appendChild(link)
      link.click()

      // Clean up
      link.parentNode?.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error("Error al descargar rechazados")
    }
  }

  const downloadUpdatedReport = async (jobId?: string) => {
    if (!jobId) return
    try {
      const response = await api.affiliates.downloadImportUpdated(jobId)

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement("a")
      link.href = url

      // Extract filename from URL or use default
      const filename = "actualizados_" + jobId + ".xlsx"
      link.setAttribute("download", filename)

      document.body.appendChild(link)
      link.click()

      // Clean up
      link.parentNode?.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error("Error al descargar actualizados")
    }
  }

  const handleDownloadTemplate = () => {
    try {
      const workbook = XLSX.utils.book_new()
      const templateSheet = XLSX.utils.aoa_to_sheet([templateColumns])
      templateSheet["!cols"] = templateColumns.map((column) => ({ wch: Math.max(column.length + 4, 16) }))
      const instructionsSheet = XLSX.utils.aoa_to_sheet(templateInstructions.map((instruction) => [instruction]))
      instructionsSheet["!cols"] = [{ wch: 90 }]

      XLSX.utils.book_append_sheet(workbook, templateSheet, "Plantilla")
      XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instrucciones")
      XLSX.writeFile(workbook, "plantilla_carga_afiliados.xlsx")
      toast.success("Plantilla descargada")
    } catch {
      toast.error("No se pudo descargar la plantilla")
    }
  }

  const stats = result?.stats
  const status = stats?.status
  const isProcessing = !!status && processingStatuses.includes(status)
  const isCompleted = !!status && ["completed", "completed_with_errors"].includes(status)
  const isFailed = status === "failed" || (result && !result.success)
  const totalRows = safeNumber(stats?.totalRows)
  const processedRows = safeNumber(stats?.processedRows)
  const progress = totalRows > 0 ? Math.min(100, Math.round((processedRows / totalRows) * 100)) : isProcessing ? 8 : 0
  const currentImportForTable = useMemo<RecentImport | null>(() => {
    if (!stats?.importJobId) return null
    return {
      id: stats.importJobId,
      archivo: stats.originalFileName || stats.fileName || "Importación actual",
      fecha: stats.finishedAt || stats.updatedAt || stats.startedAt || stats.createdAt || "",
      estado: stats.status || "processing",
      nuevos: safeNumber(stats.createdCount),
      actualizados: safeNumber(stats.updatedCount),
      rechazados: safeNumber(stats.rejectedCount),
      rejectedFileAvailable: stats.rejectedFileAvailable || Boolean(stats.rejectedFileUrl || stats.duplicatesReportUrl),
      rejectedFileUrl: stats.rejectedFileUrl || stats.duplicatesReportUrl || null,
      updatedFileAvailable: stats.updatedFileAvailable || Boolean(stats.updatedFileUrl || stats.updatedReportUrl),
      updatedFileUrl: stats.updatedFileUrl || stats.updatedReportUrl || null,
    }
  }, [stats])

  const importsToShow = useMemo(() => {
    const filtered = currentImportForTable
      ? recentImports.filter((item) => item.id !== currentImportForTable.id)
      : recentImports
    return currentImportForTable ? [currentImportForTable, ...filtered] : filtered
  }, [currentImportForTable, recentImports])

  const canDownloadCurrentRejected = Boolean(
    stats?.rejectedFileAvailable || stats?.rejectedFileUrl || stats?.duplicatesReportUrl
  )
  const canDownloadCurrentUpdated = Boolean(
    stats?.updatedFileAvailable || stats?.updatedFileUrl || stats?.updatedReportUrl
  )

  const requirementCards = [
    {
      title: "Formato permitido",
      value: ".xlsx / .xls",
      description: "Excel 2007 o superior",
      icon: FileSpreadsheet,
      accent: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      title: "Columnas mínimas",
      value: "5 obligatorias",
      description: "Nombre, CUIL, Obra Social, Localidad, Teléfono_1",
      icon: ListChecks,
      accent: "text-violet-600",
      bg: "bg-violet-50",
    },
    {
      title: "Tolerancia de headers",
      value: "Sí",
      description: "Acepta variantes",
      icon: FileText,
      accent: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      title: "Validaciones",
      value: "Automáticas",
      description: "Antes de importar",
      icon: ShieldCheck,
      accent: "text-blue-600",
      bg: "bg-blue-50",
    },
  ]

  return (
    <div className={cn(
      "animate-fade-in-up rounded-[28px] p-4 lg:p-6 space-y-5",
      theme === "dark" ? "bg-slate-950/30" : "bg-gradient-to-br from-emerald-50/70 via-cyan-50/40 to-white"
    )}>
      {/* Encabezado con instrucciones */}
      <div
        className={cn(
          "rounded-3xl border p-5 lg:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 backdrop-blur-sm",
          theme === "dark"
            ? "bg-white/5 border-white/10"
            : "bg-white/90 border-emerald-100 shadow-sm shadow-emerald-100/60",
        )}
      >
        <div className="flex items-start gap-4">
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
            theme === "dark" ? "bg-emerald-500/15 text-emerald-300" : "bg-emerald-50 text-emerald-600"
          )}>
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <h2 className={cn("text-2xl font-bold tracking-tight", theme === "dark" ? "text-white" : "text-slate-900")}>
              Cargar archivo de afiliados
            </h2>
            <p className={cn("text-sm mt-1 max-w-3xl leading-relaxed", theme === "dark" ? "text-slate-300" : "text-slate-600")}>
              Importá nuevos datos o actualizá registros existentes de la base. El sistema validará teléfonos, CUIL, duplicados y datos enriquecibles.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDownloadTemplate}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors",
            theme === "dark" ? "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10" : "border-emerald-100 bg-white text-emerald-700 shadow-sm hover:bg-emerald-50"
          )}
          title="Descargar plantilla de carga"
        >
          <Download className="w-4 h-4" />
          Descargar plantilla
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {requirementCards.map((card) => (
          <div
            key={card.title}
            className={cn(
              "rounded-2xl border p-4 flex items-center gap-4 shadow-sm",
              theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-emerald-100/70"
            )}
          >
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0", card.bg, card.accent)}>
              <card.icon className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className={cn("text-xs font-medium", theme === "dark" ? "text-slate-400" : "text-slate-500")}>{card.title}</p>
              <p className={cn("text-sm font-bold mt-1", theme === "dark" ? "text-white" : "text-slate-900")}>{card.value}</p>
              <p className={cn("text-xs mt-1 truncate", theme === "dark" ? "text-slate-400" : "text-slate-500")}>{card.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Zona de arrastrar y soltar */}
      <div
        className={cn(
          "rounded-3xl border p-4 shadow-sm",
          theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-emerald-100/70"
        )}
      >
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "rounded-2xl border-2 border-dashed px-6 py-10 lg:py-14 text-center cursor-pointer transition-all duration-300",
            isDragging
              ? theme === "dark"
                ? "border-emerald-400 bg-emerald-500/10"
                : "border-emerald-400 bg-emerald-50"
              : theme === "dark"
                ? "border-white/15 hover:border-emerald-400/70 hover:bg-emerald-500/5"
                : "border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40",
          )}
        >
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileSelect} className="hidden" />

          {file ? (
            <div className="space-y-4">
              <div className="relative mx-auto w-20 h-20">
                <div className="absolute inset-0 rounded-full bg-emerald-100 animate-pulse" />
                <div className="relative w-20 h-20 rounded-full bg-white border border-emerald-100 flex items-center justify-center shadow-sm">
                  <FileCheck2 className="w-9 h-9 text-emerald-600" />
                </div>
              </div>
              <div>
                <p className={cn("text-lg font-bold", theme === "dark" ? "text-white" : "text-slate-900")}>{file.name}</p>
                <p className={cn("text-sm mt-1", theme === "dark" ? "text-slate-400" : "text-slate-500")}>
                  Archivo seleccionado · {formatFileSize(file.size)}
                </p>
              </div>
              <button
                onClick={handleProcess}
                disabled={loading}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-200/60 transition-all hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {loading ? "Creando importación..." : "Iniciar importación"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative mx-auto w-20 h-20">
                <div className="absolute inset-0 rounded-full bg-emerald-100/80" />
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-50 to-cyan-50 border border-emerald-100 flex items-center justify-center shadow-sm">
                  <CloudUpload className="w-10 h-10 text-emerald-600" />
                </div>
              </div>
              <div>
                <p className={cn("text-lg font-bold", theme === "dark" ? "text-white" : "text-slate-900")}>
                  Arrastrá tu archivo Excel aquí
                </p>
                <p className={cn("text-sm mt-1", theme === "dark" ? "text-slate-400" : "text-slate-500")}>
                  o hacé clic para seleccionarlo
                </p>
                <p className={cn("text-xs mt-3", theme === "dark" ? "text-slate-500" : "text-slate-400")}>
                  Tamaño máximo: 50 MB
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mensaje de resultado - persiste después del procesamiento */}
      {(isProcessing || isCompleted || isFailed) && result && (
        <div className="space-y-4">
          {isProcessing && (
            <div
              className={cn(
                "w-full rounded-3xl border p-5 shadow-sm",
                theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-emerald-100/70"
              )}
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                </div>
                <div>
                  <h3 className={cn("font-bold", theme === "dark" ? "text-white" : "text-slate-900")}>Procesando archivo...</h3>
                  <p className={cn("text-xs", theme === "dark" ? "text-slate-400" : "text-slate-500")}>Validando filas y actualizando la base.</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className={theme === "dark" ? "text-slate-300" : "text-slate-600"}>Progreso de importación</span>
                  <span className={cn("font-bold", theme === "dark" ? "text-cyan-300" : "text-cyan-700")}>{progress}%</span>
                </div>
                <div className={cn("h-3 rounded-full overflow-hidden", theme === "dark" ? "bg-white/10" : "bg-slate-100")}>
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-cyan-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
                {[
                  { label: "Filas procesadas", value: totalRows > 0 ? `${formatNumber(processedRows)} / ${formatNumber(totalRows)}` : formatNumber(processedRows), icon: ListChecks, color: "text-cyan-600", bg: "bg-cyan-50" },
                  { label: "Nuevos", value: formatNumber(stats?.createdCount), icon: FileCheck2, color: "text-emerald-600", bg: "bg-emerald-50" },
                  { label: "Actualizados", value: formatNumber(stats?.updatedCount), icon: RefreshCw, color: "text-blue-600", bg: "bg-blue-50" },
                  { label: "Rechazados", value: formatNumber(stats?.rejectedCount), icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" },
                ].map((item) => (
                  <div key={item.label} className={cn("rounded-2xl border p-4", theme === "dark" ? "border-white/10 bg-white/[0.03]" : "border-slate-100 bg-white")}>
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-3", item.bg, item.color)}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <p className={cn("text-base font-bold", theme === "dark" ? "text-white" : "text-slate-900")}>{item.value}</p>
                    <p className={cn("text-xs mt-1", theme === "dark" ? "text-slate-400" : "text-slate-500")}>{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(isCompleted || isFailed) && (
            <div
              className={cn(
                "w-full rounded-3xl border p-5 shadow-sm",
                isFailed
                  ? theme === "dark" ? "bg-red-500/10 border-red-500/20" : "bg-white border-red-100"
                  : theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-emerald-100/70"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0",
                  isFailed ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                )}>
                  {isFailed ? <XCircle className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={cn("font-bold", theme === "dark" ? "text-white" : "text-slate-900")}>{getImportTitle(status)}</h3>
                  <p className={cn("text-xs mt-1", theme === "dark" ? "text-slate-400" : "text-slate-500")}>
                    {isFailed ? result.message : `Finalizada el ${formatDate(stats?.finishedAt || stats?.updatedAt || stats?.createdAt)}`}
                  </p>
                </div>
              </div>

              {!isFailed && (
                <div className="grid grid-cols-3 gap-3 mt-5">
                  <div>
                    <p className="text-2xl font-bold text-emerald-600">{formatNumber(stats?.createdCount)}</p>
                    <p className={cn("text-xs", theme === "dark" ? "text-slate-400" : "text-slate-500")}>Nuevos</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{formatNumber(stats?.updatedCount)}</p>
                    <p className={cn("text-xs", theme === "dark" ? "text-slate-400" : "text-slate-500")}>Actualizados</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">{formatNumber(stats?.rejectedCount)}</p>
                    <p className={cn("text-xs", theme === "dark" ? "text-slate-400" : "text-slate-500")}>Rechazados</p>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 mt-5">
                {canDownloadCurrentRejected && (
                  <button
                    onClick={() => downloadRejectedReport(stats.importJobId)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-red-100 bg-white text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <FileDown className="w-4 h-4" />
                    Descargar rechazados
                  </button>
                )}
                {canDownloadCurrentUpdated && (
                  <button
                    onClick={() => downloadUpdatedReport(stats.importJobId)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-blue-100 bg-white text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <FileDown className="w-4 h-4" />
                    Descargar actualizados
                  </button>
                )}
              </div>
            </div>
          )}

        </div>
      )}

      <div className={cn(
        "rounded-3xl border p-5 shadow-sm overflow-hidden",
        theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-emerald-100/70"
      )}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className={cn("font-bold", theme === "dark" ? "text-white" : "text-slate-900")}>Importaciones recientes</h3>
            <p className={cn("text-xs mt-1", theme === "dark" ? "text-slate-400" : "text-slate-500")}>
              Últimos archivos procesados disponibles para consulta.
            </p>
          </div>
          <button
            type="button"
            onClick={loadRecentImports}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors",
              theme === "dark" ? "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10" : "border-emerald-100 bg-white text-emerald-700 hover:bg-emerald-50"
            )}
          >
            <RefreshCw className={cn("w-4 h-4", recentLoading && "animate-spin")} />
            Actualizar
          </button>
        </div>

        {importsToShow.length === 0 ? (
          <div className={cn(
            "rounded-2xl border border-dashed p-8 text-center",
            theme === "dark" ? "border-white/10 text-slate-400" : "border-slate-200 text-slate-500"
          )}>
            Todavía no hay importaciones recientes para mostrar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-sm">
              <thead>
                <tr className={cn("border-b", theme === "dark" ? "border-white/10 text-slate-400" : "border-slate-100 text-slate-500")}>
                  <th className="text-left font-semibold py-3 px-2">Archivo</th>
                  <th className="text-left font-semibold py-3 px-2">Fecha</th>
                  <th className="text-left font-semibold py-3 px-2">Estado</th>
                  <th className="text-right font-semibold py-3 px-2">Nuevos</th>
                  <th className="text-right font-semibold py-3 px-2">Actualizados</th>
                  <th className="text-right font-semibold py-3 px-2">Rechazados</th>
                  <th className="text-right font-semibold py-3 px-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {importsToShow.map((item) => {
                  const canDownloadRejected = !!item.id && Boolean(item.rejectedFileAvailable || item.rejectedFileUrl)
                  const canDownloadUpdated = !!item.id && Boolean(item.updatedFileAvailable || item.updatedFileUrl)
                  return (
                    <tr key={item.id} className={cn("border-b last:border-b-0", theme === "dark" ? "border-white/5" : "border-slate-100")}>
                      <td className={cn("py-3 px-2 font-medium", theme === "dark" ? "text-slate-200" : "text-slate-700")}>
                        <div className="flex items-center gap-2 min-w-0">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="truncate max-w-[260px]">{item.archivo || "Archivo de afiliados"}</span>
                        </div>
                      </td>
                      <td className={cn("py-3 px-2", theme === "dark" ? "text-slate-400" : "text-slate-500")}>{formatDate(item.fecha)}</td>
                      <td className="py-3 px-2">
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                          item.estado === "failed"
                            ? "bg-red-50 text-red-700"
                            : item.estado === "processing" || item.estado === "pending"
                              ? "bg-cyan-50 text-cyan-700"
                              : "bg-emerald-50 text-emerald-700"
                        )}>
                          {item.estado === "processing" || item.estado === "pending" ? <Clock className="w-3 h-3 mr-1" /> : null}
                          {getStatusLabel(item.estado)}
                        </span>
                      </td>
                      <td className={cn("py-3 px-2 text-right", theme === "dark" ? "text-slate-300" : "text-slate-700")}>{formatNumber(item.nuevos)}</td>
                      <td className={cn("py-3 px-2 text-right", theme === "dark" ? "text-slate-300" : "text-slate-700")}>{formatNumber(item.actualizados)}</td>
                      <td className="py-3 px-2 text-right font-semibold text-red-600">{formatNumber(item.rechazados)}</td>
                      <td className="py-3 px-2">
                        <div className="flex items-center justify-end gap-2">
                          {canDownloadRejected && (
                            <button
                              type="button"
                              onClick={() => downloadRejectedReport(item.id)}
                              className="w-8 h-8 rounded-lg border border-red-100 text-red-600 hover:bg-red-50 inline-flex items-center justify-center transition-colors"
                              title="Descargar rechazados"
                            >
                              <FileDown className="w-4 h-4" />
                            </button>
                          )}
                          {canDownloadUpdated && (
                            <button
                              type="button"
                              onClick={() => downloadUpdatedReport(item.id)}
                              className="w-8 h-8 rounded-lg border border-blue-100 text-blue-600 hover:bg-blue-50 inline-flex items-center justify-center transition-colors"
                              title="Descargar actualizados"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          )}
                          {!canDownloadRejected && !canDownloadUpdated && (
                            <span className={cn("text-xs", theme === "dark" ? "text-slate-500" : "text-slate-400")}>Sin reportes</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
