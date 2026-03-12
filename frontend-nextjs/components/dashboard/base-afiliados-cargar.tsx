/**
 * ============================================================
 * CARGAR AFILIADOS (base-afiliados-cargar.tsx)
 * ============================================================
 * Importación masiva de afiliados desde archivos Excel.
 * Valida duplicados y genera reportes de rechazo.
 */

"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from "lucide-react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import { api, API_URL } from "@/lib/api"
import { toast } from "sonner"


export function BaseAfiliadosCargar() {
  const { theme } = useTheme()
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; stats?: any } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && (droppedFile.name.endsWith(".xlsx") || droppedFile.name.endsWith(".xls"))) {
      setFile(droppedFile)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResult(null) // Clear previous results
    }
  }

  const handleProcess = async (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent parent drop zone click
    if (!file) return

    try {
      setLoading(true)
      setResult(null)
      const response = await api.affiliates.upload(file)

      console.log("🔍 [Upload Debug] Response data:", response.data)

      const processed = response.data.imported || response.data.processed || 0
      const duplicates = response.data.duplicates || 0
      const duplicatesReport = response.data.duplicatesReport

      console.log("🔍 [Upload Debug] Extracted report URL:", duplicatesReport)

      const newResult = {
        success: true,
        message: `Archivo procesado: ${processed} afiliados cargados${duplicates > 0 ? `, ${duplicates} rechazados` : ''}.`,
        stats: {
          ...response.data,
          duplicatesReportUrl: duplicatesReport
        }
      }

      console.log("🔍 [Upload Debug] Setting result state:", newResult)
      setResult(newResult)

      toast.success(`${processed} afiliados cargados exitosamente`)
      // Clear file after successful upload
      setFile(null)
    } catch (error: any) {
      console.error("Error procesando archivo:", error)
      const errorMsg = error.response?.data?.message || error.message || "Error al procesar el archivo"
      setResult({
        success: false,
        message: errorMsg
      })
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="animate-fade-in-up space-y-4">
      {/* Encabezado con instrucciones */}
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
            "text-lg lg:text-xl font-semibold flex items-center gap-2 mb-4",
            theme === "dark" ? "text-white" : "text-gray-700",
          )}
        >
          <Upload className={cn("w-5 h-5", theme === "dark" ? "text-purple-400" : "text-purple-500")} />
          Cargar Archivo de Afiliados
        </h2>

        {/* Requisitos del archivo */}
        <div
          className={cn(
            "rounded-xl p-4 space-y-2",
            theme === "dark" ? "bg-blue-500/10 border border-blue-500/20" : "bg-blue-50 border border-blue-200",
          )}
        >
          <h3
            className={cn(
              "font-semibold text-sm flex items-center gap-2",
              theme === "dark" ? "text-blue-300" : "text-blue-700",
            )}
          >
            <AlertCircle className="w-4 h-4" />
            Requisitos del archivo:
          </h3>
          <ul className={cn("text-sm space-y-1 ml-6", theme === "dark" ? "text-blue-200" : "text-blue-600")}>
            <li>
              <strong>Formato:</strong>{" "}
              <span className={cn(theme === "dark" ? "text-cyan-400" : "text-cyan-600")}>.xlsx</span> o{" "}
              <span className={cn(theme === "dark" ? "text-cyan-400" : "text-cyan-600")}>.xls</span>
            </li>
            <li>
              <strong>Campos obligatorios:</strong>{" "}
              <span className={cn(theme === "dark" ? "text-purple-400" : "text-purple-600")}>
                Nombre, CUIL, Obra Social, Localidad, Teléfono_1
              </span>
            </li>
            <li>
              <strong>Campos opcionales:</strong>{" "}
              <span className={cn(theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                Teléfono_2, Teléfono_3, Edad, Código de obra social
              </span>
            </li>
            <li>
              <strong>Tolerancia de headers:</strong>{" "}
              <span className={cn(theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                Acepta variantes (ej: "nombre", "Name", "NOMBRE")
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Zona de arrastrar y soltar */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "rounded-2xl border-2 border-dashed p-8 lg:p-12 text-center cursor-pointer transition-all duration-300",
          isDragging
            ? theme === "dark"
              ? "border-purple-500 bg-purple-500/10"
              : "border-purple-400 bg-purple-50"
            : theme === "dark"
              ? "border-white/20 bg-white/5 hover:border-purple-500/50 hover:bg-purple-500/5"
              : "border-gray-300 bg-white hover:border-purple-300 hover:bg-purple-50/50",
        )}
      >
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileSelect} className="hidden" />

        {file ? (
          <div className="space-y-3">
            <div
              className={cn(
                "w-16 h-16 mx-auto rounded-xl flex items-center justify-center",
                theme === "dark" ? "bg-green-500/20" : "bg-green-100",
              )}
            >
              <CheckCircle className={cn("w-8 h-8", theme === "dark" ? "text-green-400" : "text-green-500")} />
            </div>
            <div>
              <p className={cn("font-semibold", theme === "dark" ? "text-white" : "text-gray-700")}>{file.name}</p>
              <p className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                {(file.size / 1024).toFixed(2)} KB
              </p>
            </div>
            <button
              onClick={handleProcess}
              disabled={loading}
              className={cn(
                "px-6 py-2 rounded-lg font-medium text-sm transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed",
                theme === "dark"
                  ? "bg-gradient-to-r from-green-600 to-green-500 text-white"
                  : "bg-gradient-to-r from-green-500 to-green-400 text-white",
              )}
            >
              {loading ? "Procesando..." : "Procesar Archivo"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div
              className={cn(
                "w-16 h-16 mx-auto rounded-xl flex items-center justify-center",
                theme === "dark" ? "bg-white/10" : "bg-gray-100",
              )}
            >
              <FileSpreadsheet className={cn("w-8 h-8", theme === "dark" ? "text-purple-400" : "text-purple-500")} />
            </div>
            <div>
              <p className={cn("font-semibold", theme === "dark" ? "text-white" : "text-gray-700")}>
                Click aquí para seleccionar archivo
              </p>
              <p className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                O arrastra y suelta tu archivo .xlsx
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Mensaje de resultado - persiste después del procesamiento */}
      {result && (
        <div className="mt-4">
          <div
            className={cn(
              "p-4 rounded-xl text-sm border shadow-sm transition-all duration-300 animate-in fade-in slide-in-from-top-2",
              result.success
                ? theme === "dark"
                  ? "bg-green-500/10 text-green-300 border-green-500/20"
                  : "bg-green-50 text-green-700 border-green-200"
                : theme === "dark"
                  ? "bg-red-500/10 text-red-300 border-red-500/20"
                  : "bg-red-50 text-red-700 border-red-200"
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                "p-2 rounded-full shrink-0",
                result.success
                  ? theme === "dark" ? "bg-green-500/20" : "bg-green-100"
                  : theme === "dark" ? "bg-red-500/20" : "bg-red-100"
              )}>
                {result.success ? (
                  <CheckCircle className={cn("w-5 h-5", theme === "dark" ? "text-green-400" : "text-green-600")} />
                ) : (
                  <AlertCircle className={cn("w-5 h-5", theme === "dark" ? "text-red-400" : "text-red-600")} />
                )}
              </div>
              <div className="flex-1 space-y-3">
                <p className="font-medium pt-1">{result.message}</p>

                {/* Botón descargar reporte de rechazados */}
                {result.stats?.duplicatesReportUrl && (
                  <button
                    onClick={async () => {
                      try {
                        const response = await api.client.get(result.stats.duplicatesReportUrl, {
                          responseType: 'blob'
                        })

                        // Create blob link to download
                        const url = window.URL.createObjectURL(new Blob([response.data]))
                        const link = document.createElement('a')
                        link.href = url

                        // Extract filename from URL or use default
                        const filename = result.stats.duplicatesReportUrl.split('/').pop() || 'reporte_rechazos.xlsx'
                        link.setAttribute('download', filename)

                        document.body.appendChild(link)
                        link.click()

                        // Clean up
                        link.parentNode?.removeChild(link)
                        window.URL.revokeObjectURL(url)
                      } catch (error) {
                        console.error("Error downloading report:", error)
                        toast.error("Error al descargar el reporte")
                      }
                    }}
                    className={cn(
                      "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
                      theme === "dark"
                        ? "bg-yellow-500/10 text-yellow-300 border border-yellow-500/20 hover:bg-yellow-500/20"
                        : "bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100"
                    )}
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Descargar Reporte de Rechazos
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
