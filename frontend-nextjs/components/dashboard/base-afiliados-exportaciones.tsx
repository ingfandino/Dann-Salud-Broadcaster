"use client"

import { useEffect, useState } from "react"
import { Download, User, Calendar, HardDrive, Users } from "lucide-react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { toast } from "sonner"

interface ExportFile {
  filename: string
  size: number
  createdAt: string
  supervisorId: string
  supervisorName: string
  affiliateCount: number
}

export function BaseAfiliadosExportaciones() {
  const { theme } = useTheme()
  const [exportedFiles, setExportedFiles] = useState<ExportFile[]>([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    fetchExports()
  }, [])

  const fetchExports = async () => {
    try {
      setLoading(true)
      const response = await api.affiliates.listExports()
      setExportedFiles(response.data.exports || [])
    } catch (error: any) {
      console.error("Error fetching exports:", error)
      toast.error("Error al cargar archivos exportados")
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (filename: string) => {
    try {
      setDownloading(filename)
      const response = await api.affiliates.downloadExport(filename)

      // Create blob and trigger download
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success("Archivo descargado correctamente")
    } catch (error: any) {
      console.error("Error downloading file:", error)
      toast.error("Error al descargar archivo")
    } finally {
      setDownloading(null)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    })
  }

  return (
    <div className="animate-fade-in-up space-y-4">
      {/* Header */}
      <div
        className={cn(
          "rounded-2xl border p-4 lg:p-6 backdrop-blur-sm",
          theme === "dark"
            ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
            : "bg-gradient-to-br from-white to-[#FAF7F2]/80 border-purple-200/30 shadow-lg shadow-purple-100/30",
        )}
      >
        <h2
          className={cn(
            "text-lg lg:text-xl font-semibold flex items-center gap-2",
            theme === "dark" ? "text-white" : "text-gray-700",
          )}
        >
          <Download className={cn("w-5 h-5", theme === "dark" ? "text-purple-400" : "text-purple-500")} />
          Archivos Exportados
        </h2>
      </div>

      {/* Loading State */}
      {loading && (
        <div
          className={cn(
            "rounded-xl border p-8 text-center backdrop-blur-sm",
            theme === "dark"
              ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
              : "bg-gradient-to-br from-white to-[#FAF7F2]/80 border-purple-200/30 shadow-sm",
          )}
        >
          <p className={cn(theme === "dark" ? "text-gray-400" : "text-gray-500")}>
            Cargando archivos...
          </p>
        </div>
      )}

      {/* Empty State */}
      {!loading && exportedFiles.length === 0 && (
        <div
          className={cn(
            "rounded-xl border p-8 text-center backdrop-blur-sm",
            theme === "dark"
              ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
              : "bg-gradient-to-br from-white to-[#FAF7F2]/80 border-purple-200/30 shadow-sm",
          )}
        >
          <p className={cn(theme === "dark" ? "text-gray-400" : "text-gray-500")}>
            No hay archivos exportados disponibles
          </p>
        </div>
      )}

      {/* Files List */}
      {!loading && exportedFiles.length > 0 && (
        <div className="space-y-3">
          {exportedFiles.map((file, index) => (
            <div
              key={file.filename}
              className={cn(
                "rounded-xl border p-4 backdrop-blur-sm transition-all duration-300 hover:scale-[1.01]",
                theme === "dark"
                  ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10 hover:border-purple-500/30"
                  : "bg-gradient-to-br from-white to-[#FAF7F2]/80 border-purple-200/30 shadow-sm hover:shadow-md hover:border-purple-300/50",
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <h3
                    className={cn(
                      "font-medium text-sm lg:text-base truncate mb-2",
                      theme === "dark" ? "text-white" : "text-gray-700",
                    )}
                  >
                    {file.filename}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 lg:gap-4 text-xs">
                    <span
                      className={cn("flex items-center gap-1.5", theme === "dark" ? "text-gray-400" : "text-gray-500")}
                    >
                      <User className="w-3.5 h-3.5" />
                      <span className={cn(theme === "dark" ? "text-purple-400" : "text-purple-500")}>
                        {file.supervisorName}
                      </span>
                    </span>
                    <span
                      className={cn("flex items-center gap-1.5", theme === "dark" ? "text-gray-400" : "text-gray-500")}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(file.createdAt)}
                    </span>
                    <span
                      className={cn("flex items-center gap-1.5", theme === "dark" ? "text-gray-400" : "text-gray-500")}
                    >
                      <HardDrive className="w-3.5 h-3.5" />
                      {formatSize(file.size)}
                    </span>
                    <span
                      className={cn("flex items-center gap-1.5", theme === "dark" ? "text-gray-400" : "text-gray-500")}
                    >
                      <Users className="w-3.5 h-3.5" />
                      {file.affiliateCount} afiliados
                    </span>
                  </div>
                </div>

                {/* Download Button */}
                <button
                  onClick={() => handleDownload(file.filename)}
                  disabled={downloading === file.filename}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 hover:scale-105 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
                    theme === "dark"
                      ? "bg-gradient-to-r from-cyan-600 to-cyan-500 text-white hover:from-cyan-500 hover:to-cyan-400"
                      : "bg-gradient-to-r from-cyan-500 to-cyan-400 text-white hover:from-cyan-400 hover:to-cyan-300",
                  )}
                >
                  <Download className="w-4 h-4" />
                  {downloading === file.filename ? "Descargando..." : "Descargar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
