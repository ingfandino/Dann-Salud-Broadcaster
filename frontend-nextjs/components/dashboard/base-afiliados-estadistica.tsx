/**
 * ============================================================
 * ESTADÍSTICAS DE AFILIADOS (base-afiliados-estadistica.tsx)
 * ============================================================
 * Dashboard de estadísticas de la base de afiliados.
 * Muestra totales, obras sociales, datos frescos y reutilizables.
 */

"use client"

import { BarChart3, Users, Sparkles, FolderOpen, FileSpreadsheet, Clock, Recycle } from "lucide-react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { toast } from "sonner"

interface Stats {
  total: number
  exported: number
  available: number
  obrasSociales: { name: string; count: number }[]
  recentBatches: { _id: string; count: number; sourceFile: string; uploadDate: string }[]
}

export function BaseAfiliadosEstadistica() {
  const { theme } = useTheme()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [freshCount, setFreshCount] = useState(0)
  const [reusableCount, setReusableCount] = useState(0)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      const [statsRes, freshRes, reusableRes] = await Promise.all([
        api.affiliates.stats(),
        api.affiliates.getFresh(),
        api.affiliates.getReusableData()
      ])

      setStats(statsRes.data)
      setFreshCount(freshRes.data.total || 0)
      setReusableCount(reusableRes.data.total || 0)
    } catch (error) {
      console.error("Error loading stats:", error)
      toast.error("Error al cargar estadísticas")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className={cn(
          "rounded-2xl border p-6 h-20",
          theme === "dark" ? "bg-white/5 border-white/10" : "bg-gray-100 border-gray-200"
        )} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className={cn(
              "rounded-xl h-32",
              theme === "dark" ? "bg-white/5" : "bg-gray-100"
            )} />
          ))}
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className={cn(
        "rounded-2xl border p-6 text-center",
        theme === "dark" ? "bg-white/5 border-white/10 text-gray-400" : "bg-gray-50 border-gray-200 text-gray-600"
      )}>
        No hay estadísticas disponibles
      </div>
    )
  }

  // Calculate percentages
  const usedCount = stats.total - freshCount - reusableCount
  const porcentajeFrescos = stats.total > 0 ? ((freshCount / stats.total) * 100).toFixed(1) : "0.0"
  const porcentajeReutilizables = stats.total > 0 ? ((reusableCount / stats.total) * 100).toFixed(1) : "0.0"
  const porcentajeUsados = stats.total > 0 ? ((usedCount / stats.total) * 100).toFixed(1) : "0.0"

  // Get top 5 obras sociales
  const topObrasSociales = stats.obrasSociales.slice(0, 5)

  return (
    <div className="animate-fade-in-up space-y-4">
      {/* Encabezado de estadísticas */}
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
          <BarChart3 className={cn("w-5 h-5", theme === "dark" ? "text-purple-400" : "text-purple-500")} />
          Estadísticas de la Base
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Tarjeta azul: Afiliados totales */}
        <div
          className={cn(
            "rounded-xl p-5 transition-all duration-300 hover:scale-[1.02]",
            theme === "dark"
              ? "bg-gradient-to-br from-blue-600 to-blue-700"
              : "bg-gradient-to-br from-blue-500 to-blue-600",
          )}
        >
          <p className="text-4xl lg:text-5xl font-bold text-white mb-2">
            {stats.total.toLocaleString()}
          </p>
          <p className="text-sm text-blue-100 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Afiliados Totales
          </p>
        </div>

        {/* Tarjeta verde: Datos frescos */}
        <div
          className={cn(
            "rounded-xl p-5 transition-all duration-300 hover:scale-[1.02]",
            theme === "dark"
              ? "bg-gradient-to-br from-emerald-600 to-emerald-700"
              : "bg-gradient-to-br from-emerald-500 to-emerald-600",
          )}
        >
          <p className="text-4xl lg:text-5xl font-bold text-white mb-2">
            {freshCount.toLocaleString()}
          </p>
          <p className="text-sm text-emerald-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Disponibles (Sin usar)
          </p>
        </div>

        {/* Tarjeta naranja: Datos usados */}
        <div
          className={cn(
            "rounded-xl p-5 transition-all duration-300 hover:scale-[1.02]",
            theme === "dark"
              ? "bg-gradient-to-br from-orange-500 to-orange-600"
              : "bg-gradient-to-br from-orange-400 to-orange-500",
          )}
        >
          <p className="text-4xl lg:text-5xl font-bold text-white mb-2">
            {stats.exported.toLocaleString()}
          </p>
          <p className="text-sm text-orange-100 flex items-center gap-2">
            <FolderOpen className="w-4 h-4" />
            Ya Exportados
          </p>
        </div>
      </div>

      <div
        className={cn(
          "rounded-2xl border p-4 lg:p-6 backdrop-blur-sm",
          theme === "dark"
            ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
            : "bg-gradient-to-br from-white to-[#FAF7F2]/80 border-purple-200/30 shadow-lg shadow-purple-100/30",
        )}
      >
        <h3 className={cn("text-base font-semibold mb-4", theme === "dark" ? "text-white" : "text-gray-700")}>
          Estado de Uso
        </h3>

        {/* Barra de progreso de uso */}
        <div className="relative">
          <div className={cn("h-8 rounded-lg overflow-hidden flex", theme === "dark" ? "bg-gray-700" : "bg-gray-200")}>
            {/* Sección verde: Frescos */}
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 flex items-center justify-center text-xs font-medium text-white"
              style={{ width: `${porcentajeFrescos}%` }}
            >
              {Number(porcentajeFrescos) > 5 && `${porcentajeFrescos}%`}
            </div>
            {/* Sección púrpura: Reutilizables */}
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center text-xs font-medium text-white"
              style={{ width: `${porcentajeReutilizables}%` }}
            >
              {Number(porcentajeReutilizables) > 5 && `${porcentajeReutilizables}%`}
            </div>
            {/* Sección naranja: Usados */}
            <div
              className="h-full bg-gradient-to-r from-orange-400 to-orange-500 flex items-center justify-center text-xs font-medium text-white"
              style={{ width: `${porcentajeUsados}%` }}
            >
              {Number(porcentajeUsados) > 5 && `${porcentajeUsados}%`}
            </div>
          </div>

          {/* Etiquetas debajo de la barra */}
          <div className="flex justify-between mt-2 text-xs flex-wrap gap-2">
            <div className="flex items-center gap-1">
              <span
                className={cn(
                  "px-2 py-0.5 rounded text-white text-xs",
                  theme === "dark" ? "bg-emerald-600" : "bg-emerald-500",
                )}
              >
                Frescos
              </span>
              <span
                className={cn("flex items-center gap-1", theme === "dark" ? "text-emerald-400" : "text-emerald-600")}
              >
                <Sparkles className="w-3 h-3" /> {freshCount.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span
                className={cn(
                  "px-2 py-0.5 rounded text-white text-xs",
                  theme === "dark" ? "bg-purple-600" : "bg-purple-500",
                )}
              >
                Reutilizables
              </span>
              <span
                className={cn("flex items-center gap-1", theme === "dark" ? "text-purple-400" : "text-purple-600")}
              >
                <Recycle className="w-3 h-3" /> {reusableCount.toLocaleString()}
              </span>
            </div>
            <div className={cn("flex items-center gap-1", theme === "dark" ? "text-orange-400" : "text-orange-600")}>
              <span
                className={cn(
                  "px-2 py-0.5 rounded text-white text-xs",
                  theme === "dark" ? "bg-orange-600" : "bg-orange-500",
                )}
              >
                Usados
              </span>
              <span className="flex items-center gap-1">
                <FolderOpen className="w-3 h-3" /> {usedCount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top obras sociales */}
        <div
          className={cn(
            "rounded-2xl border p-4 lg:p-6 backdrop-blur-sm",
            theme === "dark"
              ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
              : "bg-gradient-to-br from-white to-[#FAF7F2]/80 border-purple-200/30 shadow-lg shadow-purple-100/30",
          )}
        >
          <h3 className={cn("text-base font-semibold mb-4", theme === "dark" ? "text-white" : "text-gray-700")}>
            Top Obras Sociales
          </h3>
          <div className="space-y-3">
            {topObrasSociales.length > 0 ? (
              topObrasSociales.map((obra, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex items-start justify-between gap-2 pb-3",
                    index !== topObrasSociales.length - 1 &&
                    (theme === "dark" ? "border-b border-white/10" : "border-b border-gray-100"),
                  )}
                >
                  <p className={cn("text-sm flex-1", theme === "dark" ? "text- gray-300" : "text-gray-600")}>
                    {obra.name}
                  </p>
                  <span
                    className={cn("text-sm font-semibold shrink-0", theme === "dark" ? "text-blue-400" : "text-blue-600")}
                  >
                    {obra.count.toLocaleString()}
                  </span>
                </div>
              ))
            ) : (
              <p className={cn("text-sm text-center", theme === "dark" ? "text-gray-500" : "text-gray-400")}>
                No hay datos disponibles
              </p>
            )}
          </div>
        </div>

        {/* Historial de cargas */}
        <div
          className={cn(
            "rounded-2xl border p-4 lg:p-6 backdrop-blur-sm",
            theme === "dark"
              ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
              : "bg-gradient-to-br from-white to-[#FAF7F2]/80 border-purple-200/30 shadow-lg shadow-purple-100/30",
          )}
        >
          <h3 className={cn("text-base font-semibold mb-4", theme === "dark" ? "text-white" : "text-gray-700")}>
            Cargas Recientes
          </h3>
          <div className="space-y-4">
            {stats.recentBatches.length > 0 ? (
              stats.recentBatches.map((carga, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex items-start justify-between gap-2 pb-3",
                    index !== stats.recentBatches.length - 1 &&
                    (theme === "dark" ? "border-b border-white/10" : "border-b border-gray-100"),
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm font-medium truncate flex items-center gap-2",
                        theme === "dark" ? "text-gray-200" : "text-gray-700",
                      )}
                    >
                      <FileSpreadsheet
                        className={cn("w-4 h-4 shrink-0", theme === "dark" ? "text-emerald-400" : "text-emerald-500")}
                      />
                      {carga.sourceFile}
                    </p>
                    <p
                      className={cn(
                        "text-xs mt-1 flex items-center gap-1",
                        theme === "dark" ? "text-gray-500" : "text-gray-400",
                      )}
                    >
                      <Clock className="w-3 h-3" />
                      {new Date(carga.uploadDate).toLocaleString("es-AR")}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-sm font-semibold shrink-0",
                      theme === "dark" ? "text-orange-400" : "text-orange-500",
                    )}
                  >
                    {carga.count.toLocaleString()} registros
                  </span>
                </div>
              ))
            ) : (
              <p className={cn("text-sm text-center", theme === "dark" ? "text-gray-500" : "text-gray-400")}>
                No hay cargas recientes
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
