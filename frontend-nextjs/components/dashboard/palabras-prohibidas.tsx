/**
 * ============================================================
 * PALABRAS PROHIBIDAS (palabras-prohibidas.tsx)
 * ============================================================
 * Gestión de palabras prohibidas en mensajes.
 * Detecta y alerta sobre mensajes con contenido restringido.
 */

"use client"

import { useState } from "react"
import { Shield, ShieldCheck, AlertTriangle, XCircle, Search, Trash2, Scale } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTheme } from "./theme-provider"

const statsData = [
  { label: "Total Palabras", value: 3, icon: Shield, color: "blue" },
  { label: "Activas", value: 3, icon: ShieldCheck, color: "green" },
  { label: "Detecciones", value: 0, icon: AlertTriangle, color: "orange" },
  { label: "Sin Resolver", value: 0, icon: XCircle, color: "red" },
]

const palabrasData = [
  { id: 1, palabra: "misma obra social", severidad: "alta", fecha: "5/11/2025" },
  { id: 2, palabra: "sindicato", severidad: "alta", fecha: "4/11/2025" },
  { id: 3, palabra: "superintendencia", severidad: "alta", fecha: "4/11/2025" },
]

const categorias = ["Legal", "Competencia", "Inapropiado", "Otra"]

export function PalabrasProhibidas() {
  const { theme } = useTheme()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategoria, setSelectedCategoria] = useState("Todas las categorías")
  const [soloActivas, setSoloActivas] = useState(true)

  const getSeveridadColor = (severidad: string) => {
    switch (severidad.toLowerCase()) {
      case "alta":
        return theme === "dark"
          ? "bg-red-500/20 text-red-400 border-red-500/30"
          : "bg-red-100 text-red-600 border-red-200"
      case "media":
        return theme === "dark"
          ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
          : "bg-yellow-100 text-yellow-600 border-yellow-200"
      case "baja":
        return theme === "dark"
          ? "bg-green-500/20 text-green-400 border-green-500/30"
          : "bg-green-100 text-green-600 border-green-200"
      default:
        return theme === "dark"
          ? "bg-gray-500/20 text-gray-400 border-gray-500/30"
          : "bg-gray-100 text-gray-600 border-gray-200"
    }
  }

  const getStatColor = (color: string) => {
    switch (color) {
      case "blue":
        return theme === "dark" ? "text-blue-400" : "text-blue-500"
      case "green":
        return theme === "dark" ? "text-green-400" : "text-green-500"
      case "orange":
        return theme === "dark" ? "text-orange-400" : "text-orange-500"
      case "red":
        return theme === "dark" ? "text-red-400" : "text-red-500"
      default:
        return theme === "dark" ? "text-gray-400" : "text-gray-500"
    }
  }

  const getStatIconColor = (color: string) => {
    switch (color) {
      case "blue":
        return theme === "dark" ? "text-blue-400" : "text-blue-500"
      case "green":
        return theme === "dark" ? "text-green-400" : "text-green-500"
      case "orange":
        return theme === "dark" ? "text-orange-400" : "text-orange-500"
      case "red":
        return theme === "dark" ? "text-red-400" : "text-red-500"
      default:
        return theme === "dark" ? "text-gray-400" : "text-gray-500"
    }
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* Encabezado de palabras prohibidas */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              theme === "dark" ? "bg-red-500/20" : "bg-red-100",
            )}
          >
            <Shield className={cn("w-5 h-5", theme === "dark" ? "text-red-400" : "text-red-500")} />
          </div>
          <div>
            <h2 className={cn("text-xl font-bold", theme === "dark" ? "text-white" : "text-gray-800")}>
              Lista de Palabras
            </h2>
            <p className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
              Gestiona la lista de palabras prohibidas
            </p>
          </div>
        </div>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statsData.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div
              key={index}
              className={cn(
                "rounded-xl border p-4 transition-all duration-300",
                theme === "dark"
                  ? "bg-white/5 border-white/10 hover:border-white/20"
                  : "bg-white border-gray-200 hover:border-purple-200 shadow-sm",
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={cn("text-xs", theme === "dark" ? "text-gray-400" : "text-gray-500")}>{stat.label}</p>
                  <p className={cn("text-2xl font-bold mt-1", getStatColor(stat.color))}>{stat.value}</p>
                </div>
                <Icon className={cn("w-6 h-6", getStatIconColor(stat.color))} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Área de contenido */}
      <div
        className={cn(
          "rounded-2xl border p-6",
          theme === "dark"
            ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
            : "bg-white border-gray-200 shadow-lg",
        )}
      >
        <div className="space-y-4 animate-fade-in-up">
          {/* Búsqueda y filtros */}
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="flex-1 relative">
              <Search
                className={cn(
                  "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4",
                  theme === "dark" ? "text-gray-500" : "text-gray-400",
                )}
              />
              <input
                type="text"
                placeholder="Buscar palabra..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={cn(
                  "w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm transition-all",
                  theme === "dark"
                    ? "bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500/50"
                    : "bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400 focus:border-purple-300",
                )}
              />
            </div>
            <select
              value={selectedCategoria}
              onChange={(e) => setSelectedCategoria(e.target.value)}
              className={cn(
                "px-4 py-2.5 rounded-lg border text-sm transition-all",
                theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-800",
              )}
            >
              <option>Todas las categorías</option>
              {categorias.map((cat) => (
                <option key={cat}>{cat}</option>
              ))}
            </select>
            <label
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all",
                soloActivas
                  ? theme === "dark"
                    ? "bg-green-500/20 border-green-500/30 text-green-400"
                    : "bg-green-50 border-green-200 text-green-600"
                  : theme === "dark"
                    ? "bg-white/5 border-white/10 text-gray-400"
                    : "bg-gray-50 border-gray-200 text-gray-600",
              )}
            >
              <input
                type="checkbox"
                checked={soloActivas}
                onChange={(e) => setSoloActivas(e.target.checked)}
                className="sr-only"
              />
              <ShieldCheck className="w-4 h-4" />
              <span className="text-sm font-medium">Activas</span>
            </label>
          </div>

          {/* Lista de palabras */}
          <div className="space-y-2">
            {palabrasData.map((palabra) => (
              <div
                key={palabra.id}
                className={cn(
                  "flex items-center justify-between p-4 rounded-xl border transition-all hover:scale-[1.01]",
                  theme === "dark"
                    ? "bg-white/5 border-white/10 hover:border-purple-500/30"
                    : "bg-gray-50 border-gray-200 hover:border-purple-200",
                )}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      theme === "dark" ? "bg-purple-500/20" : "bg-purple-100",
                    )}
                  >
                    <Scale className={cn("w-5 h-5", theme === "dark" ? "text-purple-400" : "text-purple-500")} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={cn("font-semibold", theme === "dark" ? "text-white" : "text-gray-800")}>
                        {palabra.palabra}
                      </span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-xs font-medium border",
                          getSeveridadColor(palabra.severidad),
                        )}
                      >
                        {palabra.severidad}
                      </span>
                    </div>
                    <p className={cn("text-xs mt-0.5", theme === "dark" ? "text-gray-500" : "text-gray-500")}>
                      Agregada por el {palabra.fecha}
                    </p>
                  </div>
                </div>
                <button
                  className={cn(
                    "p-2 rounded-lg transition-all hover:scale-110",
                    theme === "dark" ? "text-red-400 hover:bg-red-500/20" : "text-red-500 hover:bg-red-50",
                  )}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
