"use client"

import { useState } from "react"
import { Shield, ShieldCheck, AlertTriangle, XCircle, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTheme } from "./theme-provider"

const statsData = [
  { label: "Total Palabras", value: 3, icon: Shield, color: "blue" },
  { label: "Activas", value: 3, icon: ShieldCheck, color: "green" },
  { label: "Detecciones", value: 0, icon: AlertTriangle, color: "orange" },
  { label: "Sin Resolver", value: 0, icon: XCircle, color: "red" },
]

const categorias = ["Legal", "Competencia", "Inapropiado", "Otra"]
const severidades = ["Alta", "Media", "Baja"]

export function PalabrasProhibidasAgregar() {
  const { theme } = useTheme()
  const [nuevaPalabra, setNuevaPalabra] = useState("")
  const [nuevaCategoria, setNuevaCategoria] = useState("Otra")
  const [nuevaSeveridad, setNuevaSeveridad] = useState("Media")
  const [notas, setNotas] = useState("")

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

  const handleSubmit = () => {
    // Handle form submission
    console.log({ nuevaPalabra, nuevaCategoria, nuevaSeveridad, notas })
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              theme === "dark" ? "bg-purple-500/20" : "bg-purple-100",
            )}
          >
            <Plus className={cn("w-5 h-5", theme === "dark" ? "text-purple-400" : "text-purple-500")} />
          </div>
          <div>
            <h2 className={cn("text-xl font-bold", theme === "dark" ? "text-white" : "text-gray-800")}>
              Agregar Palabra
            </h2>
            <p className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
              Añade una nueva palabra prohibida a la lista
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
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

      {/* Content Area - Form */}
      <div
        className={cn(
          "rounded-2xl border p-6",
          theme === "dark"
            ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
            : "bg-white border-gray-200 shadow-lg",
        )}
      >
        <div className="flex justify-center animate-fade-in-up">
          <div className="w-full max-w-md space-y-5">
            <div>
              <label
                className={cn("block text-sm font-medium mb-2", theme === "dark" ? "text-gray-300" : "text-gray-700")}
              >
                Palabra Prohibida <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ej: competidor, ilegal, etc."
                value={nuevaPalabra}
                onChange={(e) => setNuevaPalabra(e.target.value)}
                className={cn(
                  "w-full px-4 py-2.5 rounded-lg border text-sm transition-all",
                  theme === "dark"
                    ? "bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500/50"
                    : "bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400 focus:border-purple-300",
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  className={cn("block text-sm font-medium mb-2", theme === "dark" ? "text-gray-300" : "text-gray-700")}
                >
                  Categoría
                </label>
                <select
                  value={nuevaCategoria}
                  onChange={(e) => setNuevaCategoria(e.target.value)}
                  className={cn(
                    "w-full px-4 py-2.5 rounded-lg border text-sm transition-all",
                    theme === "dark"
                      ? "bg-white/5 border-white/10 text-white"
                      : "bg-gray-50 border-gray-200 text-gray-800",
                  )}
                >
                  {categorias.map((cat) => (
                    <option key={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  className={cn("block text-sm font-medium mb-2", theme === "dark" ? "text-gray-300" : "text-gray-700")}
                >
                  Severidad
                </label>
                <select
                  value={nuevaSeveridad}
                  onChange={(e) => setNuevaSeveridad(e.target.value)}
                  className={cn(
                    "w-full px-4 py-2.5 rounded-lg border text-sm transition-all",
                    theme === "dark"
                      ? "bg-white/5 border-white/10 text-white"
                      : "bg-gray-50 border-gray-200 text-gray-800",
                  )}
                >
                  {severidades.map((sev) => (
                    <option key={sev}>{sev}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                className={cn("block text-sm font-medium mb-2", theme === "dark" ? "text-gray-300" : "text-gray-700")}
              >
                Notas (Opcional)
              </label>
              <textarea
                placeholder="Motivo o contexto de la prohibición..."
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={4}
                className={cn(
                  "w-full px-4 py-2.5 rounded-lg border text-sm transition-all resize-none",
                  theme === "dark"
                    ? "bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500/50"
                    : "bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400 focus:border-purple-300",
                )}
              />
            </div>

            <button
              onClick={handleSubmit}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-white transition-all hover:scale-[1.02] active:scale-[0.98]",
                theme === "dark"
                  ? "bg-gradient-to-r from-teal-600 to-cyan-600 hover:shadow-lg hover:shadow-teal-500/20"
                  : "bg-gradient-to-r from-teal-500 to-cyan-500 hover:shadow-lg hover:shadow-teal-300/30",
              )}
            >
              <Plus className="w-5 h-5" />
              Agregar Palabra
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
