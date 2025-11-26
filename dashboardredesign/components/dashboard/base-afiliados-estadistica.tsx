"use client"

import { BarChart3, Users, Sparkles, FolderOpen, FileSpreadsheet, Clock } from "lucide-react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"

const estadisticasBase = {
  afiliadosTotales: 73116,
  disponibles: 2038,
  yaExportados: 71078,
}

const topObrasSociales = [
  { nombre: "O.S. DE LOS EMPLEADOS DE COMERCIO Y ACTIVIDADES CIVILES", cantidad: 20859 },
  {
    nombre:
      "O.S. DEL PERSONAL DEL TURISMO, HOTELERO Y GASTRONOMICO DE LA UNION DE TRABAJADORES DEL TURISMO, HOTELEROS Y GASTRONOMICOS DE LA RA (OSUTHGRA)",
    cantidad: 12041,
  },
  { nombre: "O.S. DE LA UNION OBRERA METALURGICO DE LA REPUBLICA ARGENTINA", cantidad: 6908 },
  { nombre: "O.S. TRABAJ. PAST, CONFIT, PIZZEROS, HELAD. Y ALFAJ. DE LA R.A.", cantidad: 6868 },
  { nombre: "O.S. DEL PERSONAL DE SEGURIDAD COMERCIAL, INDUSTRIAL E INVESTIGACIONES PRIVADAS", cantidad: 5471 },
]

const cargasRecientes = [
  { nombre: "Prospectos_20-11-2025.xlsx", fecha: "20/11/2025, 02:26:47", registros: 7918 },
  { nombre: "Prospectos_Eliana_36.000_Eliana_06_11_2025.xlsx", fecha: "6/11/2025, 10:43:10", registros: 35371 },
  { nombre: "Prospectos_Eliana_30.000.Reg_Eliana_29_10_2025.xlsx", fecha: "5/11/2025, 01:48:48", registros: 29827 },
]

export function BaseAfiliadosEstadistica() {
  const { theme } = useTheme()

  const porcentajeUsados = ((estadisticasBase.yaExportados / estadisticasBase.afiliadosTotales) * 100).toFixed(1)
  const porcentajeDisponibles = ((estadisticasBase.disponibles / estadisticasBase.afiliadosTotales) * 100).toFixed(1)

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
          <BarChart3 className={cn("w-5 h-5", theme === "dark" ? "text-purple-400" : "text-purple-500")} />
          Estadísticas de la Base
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Blue Card - Afiliados Totales */}
        <div
          className={cn(
            "rounded-xl p-5 transition-all duration-300 hover:scale-[1.02]",
            theme === "dark"
              ? "bg-gradient-to-br from-blue-600 to-blue-700"
              : "bg-gradient-to-br from-blue-500 to-blue-600",
          )}
        >
          <p className="text-4xl lg:text-5xl font-bold text-white mb-2">
            {estadisticasBase.afiliadosTotales.toLocaleString()}
          </p>
          <p className="text-sm text-blue-100 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Afiliados Totales
          </p>
        </div>

        {/* Green Card - Disponibles */}
        <div
          className={cn(
            "rounded-xl p-5 transition-all duration-300 hover:scale-[1.02]",
            theme === "dark"
              ? "bg-gradient-to-br from-emerald-600 to-emerald-700"
              : "bg-gradient-to-br from-emerald-500 to-emerald-600",
          )}
        >
          <p className="text-4xl lg:text-5xl font-bold text-white mb-2">
            {estadisticasBase.disponibles.toLocaleString()}
          </p>
          <p className="text-sm text-emerald-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Disponibles (Sin usar)
          </p>
        </div>

        {/* Orange Card - Ya Exportados */}
        <div
          className={cn(
            "rounded-xl p-5 transition-all duration-300 hover:scale-[1.02]",
            theme === "dark"
              ? "bg-gradient-to-br from-orange-500 to-orange-600"
              : "bg-gradient-to-br from-orange-400 to-orange-500",
          )}
        >
          <p className="text-4xl lg:text-5xl font-bold text-white mb-2">
            {estadisticasBase.yaExportados.toLocaleString()}
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

        {/* Progress bar */}
        <div className="relative">
          <div className={cn("h-8 rounded-lg overflow-hidden flex", theme === "dark" ? "bg-gray-700" : "bg-gray-200")}>
            {/* Green section - Disponibles */}
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 flex items-center justify-center text-xs font-medium text-white"
              style={{ width: `${porcentajeDisponibles}%` }}
            >
              {Number(porcentajeDisponibles) > 5 && `${porcentajeDisponibles}%`}
            </div>
            {/* Orange section - Usados/Exportados */}
            <div
              className="h-full bg-gradient-to-r from-orange-400 to-orange-500 flex items-center justify-center text-sm font-medium text-white"
              style={{ width: `${porcentajeUsados}%` }}
            >
              {porcentajeUsados}% Usados
            </div>
          </div>

          {/* Labels below the bar */}
          <div className="flex justify-between mt-2 text-xs">
            <div className="flex items-center gap-1">
              <span
                className={cn(
                  "px-2 py-0.5 rounded text-white text-xs",
                  theme === "dark" ? "bg-emerald-600" : "bg-emerald-500",
                )}
              >
                Disponible
              </span>
              <span
                className={cn("flex items-center gap-1", theme === "dark" ? "text-emerald-400" : "text-emerald-600")}
              >
                <span className="text-emerald-500">💚</span> {estadisticasBase.disponibles.toLocaleString()} frescos
              </span>
            </div>
            <div className={cn("flex items-center gap-1", theme === "dark" ? "text-orange-400" : "text-orange-600")}>
              <span className="text-yellow-500">🟡</span> {estadisticasBase.yaExportados.toLocaleString()} exportados
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Obras Sociales */}
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
            {topObrasSociales.map((obra, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-start justify-between gap-2 pb-3",
                  index !== topObrasSociales.length - 1 &&
                    (theme === "dark" ? "border-b border-white/10" : "border-b border-gray-100"),
                )}
              >
                <p className={cn("text-sm flex-1", theme === "dark" ? "text-gray-300" : "text-gray-600")}>
                  {obra.nombre}
                </p>
                <span
                  className={cn("text-sm font-semibold shrink-0", theme === "dark" ? "text-blue-400" : "text-blue-600")}
                >
                  {obra.cantidad.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Cargas Recientes */}
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
            {cargasRecientes.map((carga, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-start justify-between gap-2 pb-3",
                  index !== cargasRecientes.length - 1 &&
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
                    {carga.nombre}
                  </p>
                  <p
                    className={cn(
                      "text-xs mt-1 flex items-center gap-1",
                      theme === "dark" ? "text-gray-500" : "text-gray-400",
                    )}
                  >
                    <Clock className="w-3 h-3" />
                    {carga.fecha}
                  </p>
                </div>
                <span
                  className={cn(
                    "text-sm font-semibold shrink-0",
                    theme === "dark" ? "text-orange-400" : "text-orange-500",
                  )}
                >
                  {carga.registros.toLocaleString()} registros
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
