"use client"

import { useState } from "react"
import { Settings, Package, CheckCircle, Plus, Trash2, AlertTriangle } from "lucide-react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"

interface Supervisor {
  id: number
  name: string
  cantidad: number
  obrasSociales: string[]
}

export function BaseAfiliadosConfiguracion() {
  const { theme } = useTheme()
  const [tipoEnvio, setTipoEnvio] = useState<"masivo" | "avanzado">("masivo")
  const [cantidadMasiva, setCantidadMasiva] = useState(100)
  const [horaEnvio, setHoraEnvio] = useState("09:00")
  const [cantidadIgual, setCantidadIgual] = useState(false)
  const [supervisores, setSupervisores] = useState<Supervisor[]>([{ id: 1, name: "", cantidad: 50, obrasSociales: [] }])

  const addSupervisor = () => {
    setSupervisores([...supervisores, { id: Date.now(), name: "", cantidad: 50, obrasSociales: [] }])
  }

  const removeSupervisor = (id: number) => {
    if (supervisores.length > 1) {
      setSupervisores(supervisores.filter((s) => s.id !== id))
    }
  }

  const updateSupervisorCantidad = (id: number, cantidad: number) => {
    setSupervisores(supervisores.map((s) => (s.id === id ? { ...s, cantidad } : s)))
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
            "text-lg lg:text-xl font-semibold flex items-center gap-2 mb-3",
            theme === "dark" ? "text-white" : "text-gray-700",
          )}
        >
          <Settings className={cn("w-5 h-5", theme === "dark" ? "text-purple-400" : "text-purple-500")} />
          Configuración de Envíos Programados
        </h2>
        <div
          className={cn(
            "rounded-lg p-3 text-sm",
            theme === "dark"
              ? "bg-blue-500/10 border border-blue-500/20 text-blue-300"
              : "bg-blue-50 border border-blue-200 text-blue-700",
          )}
        >
          Los archivos <strong>XLSX (Excel)</strong> se generarán automáticamente cada día a la hora indicada. Cada{" "}
          <strong className={cn(theme === "dark" ? "text-purple-400" : "text-purple-600")}>Supervisor</strong> recibirá
          su archivo exclusivo vía mensajería interna.
        </div>
      </div>

      {/* Tipo de Envío */}
      <div
        className={cn(
          "rounded-2xl border p-4 lg:p-6 backdrop-blur-sm",
          theme === "dark"
            ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
            : "bg-gradient-to-br from-white to-[#FAF7F2]/80 border-purple-200/30 shadow-lg shadow-purple-100/30",
        )}
      >
        <label className={cn("text-sm font-medium mb-3 block", theme === "dark" ? "text-gray-300" : "text-gray-600")}>
          Tipo de Envío
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setTipoEnvio("masivo")}
            className={cn(
              "p-4 rounded-xl border-2 transition-all duration-200 text-center",
              tipoEnvio === "masivo"
                ? theme === "dark"
                  ? "border-purple-500 bg-purple-500/10"
                  : "border-purple-400 bg-purple-50"
                : theme === "dark"
                  ? "border-white/10 hover:border-white/20"
                  : "border-gray-200 hover:border-purple-200",
            )}
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <Package
                className={cn(
                  "w-5 h-5",
                  tipoEnvio === "masivo"
                    ? theme === "dark"
                      ? "text-orange-400"
                      : "text-orange-500"
                    : theme === "dark"
                      ? "text-gray-400"
                      : "text-gray-500",
                )}
              />
              <span className={cn("font-semibold", theme === "dark" ? "text-white" : "text-gray-700")}>Masivo</span>
            </div>
            <span className={cn("text-xs", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
              Misma cantidad para todos
            </span>
          </button>
          <button
            onClick={() => setTipoEnvio("avanzado")}
            className={cn(
              "p-4 rounded-xl border-2 transition-all duration-200 text-center",
              tipoEnvio === "avanzado"
                ? theme === "dark"
                  ? "border-purple-500 bg-purple-500/10"
                  : "border-purple-400 bg-purple-50"
                : theme === "dark"
                  ? "border-white/10 hover:border-white/20"
                  : "border-gray-200 hover:border-purple-200",
            )}
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <Settings
                className={cn(
                  "w-5 h-5",
                  tipoEnvio === "avanzado"
                    ? theme === "dark"
                      ? "text-orange-400"
                      : "text-orange-500"
                    : theme === "dark"
                      ? "text-gray-400"
                      : "text-gray-500",
                )}
              />
              <span className={cn("font-semibold", theme === "dark" ? "text-white" : "text-gray-700")}>Avanzado</span>
            </div>
            <span className={cn("text-xs", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
              Configurar por supervisor
            </span>
          </button>
        </div>
      </div>

      {/* Configuración según tipo */}
      <div
        className={cn(
          "rounded-2xl border p-4 lg:p-6 backdrop-blur-sm",
          theme === "dark"
            ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
            : "bg-gradient-to-br from-white to-[#FAF7F2]/80 border-purple-200/30 shadow-lg shadow-purple-100/30",
        )}
      >
        {tipoEnvio === "masivo" ? (
          <div className="space-y-4">
            <h3
              className={cn(
                "font-semibold flex items-center gap-2",
                theme === "dark" ? "text-orange-400" : "text-orange-500",
              )}
            >
              <Package className="w-4 h-4" />
              Configuración Masiva
            </h3>
            <div>
              <label className={cn("text-sm mb-2 block", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                Cantidad de afiliados por archivo
              </label>
              <input
                type="number"
                value={cantidadMasiva}
                onChange={(e) => setCantidadMasiva(Number(e.target.value))}
                className={cn(
                  "w-32 px-3 py-2 rounded-lg border text-sm",
                  theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-700",
                )}
              />
            </div>
            <label
              className={cn("flex items-center gap-2 text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}
            >
              <input
                type="checkbox"
                checked={cantidadIgual}
                onChange={(e) => setCantidadIgual(e.target.checked)}
                className="rounded"
              />
              Cantidad igual para todos los supervisores
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3
                className={cn(
                  "font-semibold flex items-center gap-2",
                  theme === "dark" ? "text-orange-400" : "text-orange-500",
                )}
              >
                <Settings className="w-4 h-4" />
                Configuración Avanzada
              </h3>
              <button
                onClick={addSupervisor}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  theme === "dark"
                    ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                    : "bg-green-100 text-green-600 hover:bg-green-200",
                )}
              >
                <Plus className="w-4 h-4" />
                Agregar Supervisor
              </button>
            </div>

            <div className="space-y-3">
              {supervisores.map((sup, idx) => (
                <div
                  key={sup.id}
                  className={cn(
                    "rounded-xl border p-4",
                    theme === "dark" ? "border-white/10 bg-white/5" : "border-gray-200 bg-gray-50",
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={cn("font-medium text-sm", theme === "dark" ? "text-white" : "text-gray-700")}>
                      Supervisor #{idx + 1}
                    </span>
                    {supervisores.length > 1 && (
                      <button
                        onClick={() => removeSupervisor(sup.id)}
                        className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded text-xs",
                          theme === "dark" ? "text-red-400 hover:bg-red-500/20" : "text-red-500 hover:bg-red-50",
                        )}
                      >
                        <Trash2 className="w-3 h-3" />
                        Eliminar
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <div>
                      <label className={cn("text-xs mb-1 block", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                        Seleccionar Supervisor
                      </label>
                      <select
                        className={cn(
                          "w-full px-3 py-2 rounded-lg border text-sm",
                          theme === "dark"
                            ? "bg-white/5 border-white/10 text-white"
                            : "bg-white border-gray-200 text-gray-700",
                        )}
                      >
                        <option>-- Seleccione --</option>
                        <option>Gastón Sarmiento</option>
                        <option>Alejandro Mejail</option>
                        <option>Nahuel Sánchez</option>
                      </select>
                    </div>
                    <div>
                      <label className={cn("text-xs mb-1 block", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                        Cantidad Total de Afiliados
                      </label>
                      <input
                        type="number"
                        value={sup.cantidad}
                        onChange={(e) => updateSupervisorCantidad(sup.id, Number(e.target.value))}
                        className={cn(
                          "w-full px-3 py-2 rounded-lg border text-sm",
                          theme === "dark"
                            ? "bg-white/5 border-white/10 text-white"
                            : "bg-white border-gray-200 text-gray-700",
                        )}
                      />
                      <span
                        className={cn(
                          "text-xs mt-1 flex items-center gap-1",
                          theme === "dark" ? "text-amber-400" : "text-amber-600",
                        )}
                      >
                        <AlertTriangle className="w-3 h-3" />
                        Faltan {sup.cantidad} afiliados por distribuir
                      </span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <label className={cn("text-xs", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                        Distribución por Obra Social
                      </label>
                      <button
                        className={cn(
                          "flex items-center gap-1 text-xs px-2 py-1 rounded",
                          theme === "dark"
                            ? "text-green-400 hover:bg-green-500/20"
                            : "text-green-600 hover:bg-green-100",
                        )}
                      >
                        <Plus className="w-3 h-3" />
                        Agregar Obra Social
                      </button>
                    </div>
                    <div
                      className={cn(
                        "rounded-lg border-2 border-dashed p-4 text-center text-xs",
                        theme === "dark" ? "border-white/10 text-gray-500" : "border-gray-200 text-gray-400",
                      )}
                    >
                      Sin obras sociales configuradas
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Hora de envío */}
      <div
        className={cn(
          "rounded-2xl border p-4 lg:p-6 backdrop-blur-sm",
          theme === "dark"
            ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
            : "bg-gradient-to-br from-white to-[#FAF7F2]/80 border-purple-200/30 shadow-lg shadow-purple-100/30",
        )}
      >
        <label className={cn("text-sm font-medium mb-2 block", theme === "dark" ? "text-gray-300" : "text-gray-600")}>
          Hora de envío diario (HH:mm)
        </label>
        <input
          type="time"
          value={horaEnvio}
          onChange={(e) => setHoraEnvio(e.target.value)}
          className={cn(
            "px-3 py-2 rounded-lg border text-sm",
            theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-700",
          )}
        />
      </div>

      {/* Configuración Actual */}
      <div
        className={cn(
          "rounded-2xl border p-4 lg:p-6 backdrop-blur-sm",
          theme === "dark"
            ? "bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20"
            : "bg-gradient-to-br from-green-50 to-green-50/50 border-green-200",
        )}
      >
        <h3
          className={cn(
            "font-semibold flex items-center gap-2 mb-3",
            theme === "dark" ? "text-green-400" : "text-green-600",
          )}
        >
          <CheckCircle className="w-5 h-5" />
          Configuración Actual
        </h3>
        <ul className={cn("space-y-1 text-sm", theme === "dark" ? "text-green-300" : "text-green-700")}>
          <li>
            • Tipo: <strong>{tipoEnvio === "masivo" ? "Masivo" : "Avanzado"}</strong>
          </li>
          <li>• 13 supervisor(es) configurado(s)</li>
          <li>• Envío diario a las {horaEnvio}</li>
          <li>• Última ejecución: 26/11/2025, 09:00:00</li>
        </ul>
      </div>

      {/* Guardar Button */}
      <button
        className={cn(
          "flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105",
          theme === "dark"
            ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-500 hover:to-blue-400"
            : "bg-gradient-to-r from-blue-500 to-blue-400 text-white hover:from-blue-400 hover:to-blue-300",
        )}
      >
        <CheckCircle className="w-5 h-5" />
        Guardar Configuración
      </button>
    </div>
  )
}
