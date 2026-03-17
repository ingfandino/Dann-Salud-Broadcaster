/**
 * ============================================================
 * PALABRAS PROHIBIDAS PARA MENSAJERÍA (palabras-prohibidas-mensajeria.tsx)
 * ============================================================
 * Gestión unificada de palabras prohibidas en mensajes.
 * Integra lista, agregar palabra y detecciones.
 */

"use client"

import { useState } from "react"
import { Shield, ShieldCheck, AlertTriangle, XCircle, Search, Trash2, Scale, Plus, CheckCircle2, X, ShieldAlert } from "lucide-react"
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
const severidades = ["Alta", "Media", "Baja"]

export function PalabrasProhibidasMensajeria() {
  const { theme } = useTheme()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategoria, setSelectedCategoria] = useState("Todas las categorías")
  const [soloActivas, setSoloActivas] = useState(true)

  // Modal states
  const [isAgregarModalOpen, setIsAgregarModalOpen] = useState(false)
  const [isDeteccionesModalOpen, setIsDeteccionesModalOpen] = useState(false)

  // Agregar Form states
  const [nuevaPalabra, setNuevaPalabra] = useState("")
  const [nuevaCategoria, setNuevaCategoria] = useState("Otra")
  const [nuevaSeveridad, setNuevaSeveridad] = useState("Media")
  const [notas, setNotas] = useState("")

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

  const handleAgregarSubmit = () => {
    console.log({ nuevaPalabra, nuevaCategoria, nuevaSeveridad, notas })
    setIsAgregarModalOpen(false)
  }

  return (
    <div className="animate-fade-in-up space-y-6 relative">
      {/* Encabezado */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              theme === "dark" ? "bg-red-500/20" : "bg-red-100",
            )}
          >
            <ShieldAlert className={cn("w-5 h-5", theme === "dark" ? "text-red-400" : "text-red-500")} />
          </div>
          <div>
            <h2 className={cn("text-xl font-bold", theme === "dark" ? "text-white" : "text-gray-800")}>
              Palabras prohibidas para mensajería
            </h2>
            <p className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
              Gestiona la lista, detecta infracciones y añade nuevas restricciones
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
                <Icon className={cn("w-6 h-6", getStatColor(stat.color))} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Área de contenido Principal (Lista y Controles) */}
      <div
        className={cn(
          "rounded-2xl border p-6",
          theme === "dark"
            ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
            : "bg-white border-gray-200 shadow-lg",
        )}
      >
        <div className="space-y-4 animate-fade-in-up">
          {/* Toolbar */}
          <div className="flex flex-col lg:flex-row gap-3 justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <div className="relative flex-1 max-w-sm">
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
                  "flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all shrink-0",
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
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setIsDeteccionesModalOpen(true)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all text-sm",
                  theme === "dark"
                    ? "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30"
                    : "bg-orange-100 text-orange-600 hover:bg-orange-200",
                )}
              >
                <AlertTriangle className="w-4 h-4" />
                Ver Detecciones
              </button>
              <button
                onClick={() => setIsAgregarModalOpen(true)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-all hover:scale-[1.02] active:scale-[0.98] text-sm",
                  theme === "dark"
                    ? "bg-gradient-to-r from-teal-600 to-cyan-600 hover:shadow-lg hover:shadow-teal-500/20"
                    : "bg-gradient-to-r from-teal-500 to-cyan-500 hover:shadow-lg hover:shadow-teal-300/30",
                )}
              >
                <Plus className="w-4 h-4" />
                Agregar Palabra
              </button>
            </div>
          </div>

          {/* Lista de palabras */}
          <div className="space-y-2 mt-4">
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
                          "px-2 py-0.5 rounded text-xs font-medium border uppercase tracking-wider",
                          getSeveridadColor(palabra.severidad),
                        )}
                      >
                        {palabra.severidad}
                      </span>
                    </div>
                    <p className={cn("text-xs mt-0.5", theme === "dark" ? "text-gray-500" : "text-gray-500")}>
                      Agregada el {palabra.fecha}
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

      {/* Modal Agregar Palabra */}
      {isAgregarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div
            className={cn(
              "w-full max-w-md rounded-2xl border p-6 shadow-2xl animate-in zoom-in-95",
              theme === "dark"
                ? "bg-[#1a1333] border-white/10"
                : "bg-white border-gray-200",
            )}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className={cn("text-lg font-bold flex items-center gap-2", theme === "dark" ? "text-white" : "text-gray-800")}>
                <Plus className={cn("w-5 h-5", theme === "dark" ? "text-purple-400" : "text-purple-500")} />
                Agregar Palabra
              </h3>
              <button
                onClick={() => setIsAgregarModalOpen(false)}
                className={cn("p-1 rounded-full transition-colors", theme === "dark" ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-500")}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
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
                  <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
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
                  <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
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
                <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                  Notas (Opcional)
                </label>
                <textarea
                  placeholder="Motivo o contexto de la prohibición..."
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={3}
                  className={cn(
                    "w-full px-4 py-2.5 rounded-lg border text-sm transition-all resize-none",
                    theme === "dark"
                      ? "bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500/50"
                      : "bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400 focus:border-purple-300",
                  )}
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setIsAgregarModalOpen(false)}
                className={cn(
                  "px-4 py-2 rounded-lg font-medium transition-all text-sm",
                  theme === "dark" ? "bg-white/10 text-white hover:bg-white/20" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                Cancelar
              </button>
              <button
                onClick={handleAgregarSubmit}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-all hover:scale-[1.02] active:scale-[0.98] text-sm",
                  theme === "dark"
                    ? "bg-gradient-to-r from-teal-600 to-cyan-600 hover:shadow-lg hover:shadow-teal-500/20"
                    : "bg-gradient-to-r from-teal-500 to-cyan-500 hover:shadow-lg hover:shadow-teal-300/30",
                )}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detecciones */}
      {isDeteccionesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div
            className={cn(
              "w-full max-w-2xl rounded-2xl border p-6 shadow-2xl animate-in zoom-in-95",
              theme === "dark"
                ? "bg-[#1a1333] border-white/10"
                : "bg-white border-gray-200",
            )}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className={cn("text-lg font-bold flex items-center gap-2", theme === "dark" ? "text-white" : "text-gray-800")}>
                <AlertTriangle className={cn("w-5 h-5", theme === "dark" ? "text-orange-400" : "text-orange-500")} />
                Historial de Detecciones
              </h3>
              <button
                onClick={() => setIsDeteccionesModalOpen(false)}
                className={cn("p-1 rounded-full transition-colors", theme === "dark" ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-500")}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              className={cn(
                "rounded-xl py-12 flex flex-col items-center justify-center border",
                theme === "dark"
                  ? "bg-gradient-to-br from-white/5 to-purple-500/5 border-white/5"
                  : "bg-gradient-to-br from-gray-50 to-purple-50/30 border-gray-100",
              )}
            >
              <div
                className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center mb-4 border-2",
                  theme === "dark" ? "bg-green-500/10 border-green-500/30" : "bg-green-50 border-green-200",
                )}
              >
                <CheckCircle2 className={cn("w-8 h-8", theme === "dark" ? "text-green-400" : "text-green-500")} />
              </div>
              <p className={cn("text-base font-medium", theme === "dark" ? "text-gray-300" : "text-gray-600")}>
                No hay detecciones registradas
              </p>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setIsDeteccionesModalOpen(false)}
                className={cn(
                  "px-6 py-2 rounded-lg font-medium transition-all text-sm",
                  theme === "dark" ? "bg-white/10 text-white hover:bg-white/20" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
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
