"use client"

import { useState } from "react"
import {
  Upload,
  WifiOff,
  MessageCircle,
  Save,
  Trash2,
  Eye,
  Clock,
  Package,
  Coffee,
  Calendar,
  Pause,
  Square,
  FileSpreadsheet,
  Bold,
  Italic,
  Smile,
  Sparkles,
} from "lucide-react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import { AutoRespuestasModal } from "./auto-respuestas-modal"
import { VincularWhatsApp } from "./vincular-whatsapp"

const campaignsData = [
  {
    id: 1,
    nombre: "Erika Cardozo 3",
    usuario: "Erika Cardozo",
    equipo: "117",
    estado: "ejecutando",
    progreso: 20.0,
    enviados: 3,
    fallidos: 2,
    pendientes: 20,
    horaCreacion: "12:15 p.m.",
  },
  {
    id: 2,
    nombre: "Joaquin Valdez",
    usuario: "Paulina Suarez",
    equipo: "879",
    estado: "fallido",
    progreso: 53.6,
    enviados: 6,
    fallidos: 9,
    pendientes: 13,
    horaCreacion: "10:40 a.m.",
  },
  {
    id: 3,
    nombre: "LU",
    usuario: "Mateo Viera",
    equipo: "23",
    estado: "fallido",
    progreso: 30.6,
    enviados: 12,
    fallidos: 3,
    pendientes: 34,
    horaCreacion: "11:18 a.m.",
  },
  {
    id: 4,
    nombre: "Campaña Promo",
    usuario: "Ana García",
    equipo: "45",
    estado: "completado",
    progreso: 100,
    enviados: 150,
    fallidos: 5,
    pendientes: 0,
    horaCreacion: "09:30 a.m.",
  },
  {
    id: 5,
    nombre: "Newsletter",
    usuario: "Carlos Ruiz",
    equipo: "234",
    estado: "pausado",
    progreso: 45.2,
    enviados: 45,
    fallidos: 2,
    pendientes: 53,
    horaCreacion: "08:15 a.m.",
  },
]

const getStatusStyles = (estado: string, theme: string) => {
  const styles: Record<string, { bg: string; text: string }> = {
    ejecutando: {
      bg: theme === "dark" ? "bg-emerald-500/20" : "bg-emerald-100",
      text: theme === "dark" ? "text-emerald-400" : "text-emerald-600",
    },
    fallido: {
      bg: theme === "dark" ? "bg-[#C8376B]/20" : "bg-red-100",
      text: theme === "dark" ? "text-[#C8376B]" : "text-red-600",
    },
    completado: {
      bg: theme === "dark" ? "bg-[#17C787]/20" : "bg-green-100",
      text: theme === "dark" ? "text-[#17C787]" : "text-green-600",
    },
    pausado: {
      bg: theme === "dark" ? "bg-[#F4C04A]/20" : "bg-amber-100",
      text: theme === "dark" ? "text-[#F4C04A]" : "text-amber-600",
    },
  }
  return styles[estado] || styles.ejecutando
}

export function MensajeriaMasiva() {
  const { theme } = useTheme()
  const [campaignName, setCampaignName] = useState("")
  const [template, setTemplate] = useState("")
  const [message, setMessage] = useState("")
  const [tiempoMin, setTiempoMin] = useState("60")
  const [tiempoMax, setTiempoMax] = useState("90")
  const [tamanoLote, setTamanoLote] = useState("15")
  const [descanso, setDescanso] = useState("25")
  const [fechaEnvio, setFechaEnvio] = useState("")
  const [filterDate, setFilterDate] = useState("26/11/2025")
  const [isAutoRespuestasOpen, setIsAutoRespuestasOpen] = useState(false)
  const [showVincularQR, setShowVincularQR] = useState(false)

  if (showVincularQR) {
    return <VincularWhatsApp />
  }

  return (
    <div className="animate-fade-in-up space-y-4 lg:space-y-6">
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all",
            theme === "dark"
              ? "bg-[#17C787] hover:bg-[#17C787]/80 text-white"
              : "bg-emerald-500 hover:bg-emerald-600 text-white",
          )}
        >
          <Upload className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Subir contactos (CSV/XLS)</span>
          <span className="sm:hidden">Subir</span>
        </button>
        <button
          onClick={() => setShowVincularQR(true)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all",
            theme === "dark"
              ? "bg-[#C8376B] hover:bg-[#C8376B]/80 text-white"
              : "bg-rose-500 hover:bg-rose-600 text-white",
          )}
        >
          <WifiOff className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Desconectar dispositivo</span>
          <span className="sm:hidden">Desconectar</span>
        </button>
        <button
          onClick={() => setIsAutoRespuestasOpen(true)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all",
            theme === "dark"
              ? "bg-[#1E88E5] hover:bg-[#1E88E5]/80 text-white"
              : "bg-blue-500 hover:bg-blue-600 text-white",
          )}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Auto-respuestas</span>
          <span className="sm:hidden">Auto</span>
        </button>
      </div>

      {/* Campaign Form */}
      <div
        className={cn(
          "rounded-2xl border p-4 lg:p-6 backdrop-blur-sm",
          theme === "dark"
            ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
            : "bg-gradient-to-br from-white to-[#FAF7F2]/80 border-purple-200/30 shadow-lg shadow-purple-100/30",
        )}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Column - Campaign Setup */}
          <div className="space-y-4">
            {/* Campaign Name */}
            <div>
              <label
                className={cn("block text-xs font-medium mb-1.5", theme === "dark" ? "text-gray-400" : "text-gray-600")}
              >
                Nombre de la campaña
              </label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="Ingresa el nombre..."
                className={cn(
                  "w-full px-3 py-2 rounded-lg text-sm border transition-all focus:ring-2",
                  theme === "dark"
                    ? "bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-purple-500/20"
                    : "bg-white border-purple-200/50 text-gray-700 placeholder-gray-400 focus:border-purple-400 focus:ring-purple-200/50",
                )}
              />
            </div>

            {/* Template Selector */}
            <div>
              <label
                className={cn("block text-xs font-medium mb-1.5", theme === "dark" ? "text-gray-400" : "text-gray-600")}
              >
                Plantilla (opcional)
              </label>
              <select
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className={cn(
                  "w-full px-3 py-2 rounded-lg text-sm border transition-all focus:ring-2",
                  theme === "dark"
                    ? "bg-white/5 border-white/10 text-white focus:border-purple-500/50 focus:ring-purple-500/20"
                    : "bg-white border-purple-200/50 text-gray-700 focus:border-purple-400 focus:ring-purple-200/50",
                )}
              >
                <option value="">-- Selecciona plantilla --</option>
                <option value="promo">Promoción</option>
                <option value="saludo">Saludo</option>
                <option value="recordatorio">Recordatorio</option>
              </select>
            </div>

            {/* Template Actions */}
            <div className="flex gap-2">
              <button
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                  theme === "dark"
                    ? "bg-[#17C787]/20 hover:bg-[#17C787]/30 text-[#17C787] border border-[#17C787]/30"
                    : "bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border border-emerald-200",
                )}
              >
                <Save className="w-3.5 h-3.5" />
                Guardar
              </button>
              <button
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                  theme === "dark"
                    ? "bg-[#C8376B]/20 hover:bg-[#C8376B]/30 text-[#C8376B] border border-[#C8376B]/30"
                    : "bg-rose-100 hover:bg-rose-200 text-rose-700 border border-rose-200",
                )}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar
              </button>
            </div>
          </div>

          {/* Right Column - Message */}
          <div className="space-y-2">
            <label
              className={cn("block text-xs font-medium mb-1.5", theme === "dark" ? "text-gray-400" : "text-gray-600")}
            >
              Mensaje
            </label>
            {/* Text Editor Toolbar */}
            <div
              className={cn(
                "flex items-center gap-1 px-2 py-1.5 rounded-t-lg border-b",
                theme === "dark" ? "bg-white/5 border-white/10" : "bg-purple-50 border-purple-100",
              )}
            >
              <button
                className={cn(
                  "p-1.5 rounded transition-colors",
                  theme === "dark" ? "hover:bg-white/10 text-gray-400" : "hover:bg-purple-100 text-gray-600",
                )}
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                className={cn(
                  "p-1.5 rounded transition-colors",
                  theme === "dark" ? "hover:bg-white/10 text-gray-400" : "hover:bg-purple-100 text-gray-600",
                )}
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                className={cn(
                  "p-1.5 rounded transition-colors",
                  theme === "dark" ? "hover:bg-white/10 text-gray-400" : "hover:bg-purple-100 text-gray-600",
                )}
              >
                <Smile className="w-3.5 h-3.5" />
              </button>
              <div className={cn("w-px h-4 mx-1", theme === "dark" ? "bg-white/10" : "bg-purple-200")} />
              <button
                className={cn(
                  "px-2 py-1 rounded text-xs font-medium transition-colors",
                  theme === "dark" ? "hover:bg-white/10 text-purple-400" : "hover:bg-purple-100 text-purple-600",
                )}
              >
                Spintax
              </button>
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escribe tu mensaje aquí... (se ignora si seleccionas plantilla)"
              rows={4}
              className={cn(
                "w-full px-3 py-2 rounded-b-lg text-sm border border-t-0 transition-all focus:ring-2 resize-none",
                theme === "dark"
                  ? "bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-purple-500/20"
                  : "bg-white border-purple-200/50 text-gray-700 placeholder-gray-400 focus:border-purple-400 focus:ring-purple-200/50",
              )}
            />
            <button
              className={cn(
                "w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                theme === "dark"
                  ? "bg-gradient-to-r from-purple-600/50 to-blue-600/50 hover:from-purple-600/70 hover:to-blue-600/70 text-white border border-white/10"
                  : "bg-gradient-to-r from-purple-200 to-blue-200 hover:from-purple-300 hover:to-blue-300 text-purple-700 border border-purple-200",
              )}
            >
              <Eye className="w-3.5 h-3.5" />
              Previsualizar
            </button>
          </div>
        </div>

        {/* Configuration Row */}
        <div
          className={cn(
            "grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t",
            theme === "dark" ? "border-white/10" : "border-purple-100",
          )}
        >
          <div>
            <label
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium mb-1.5",
                theme === "dark" ? "text-gray-400" : "text-gray-600",
              )}
            >
              <Clock className="w-3 h-3" />
              Tiempo (seg)
            </label>
            <div className="flex gap-1">
              <input
                type="number"
                value={tiempoMin}
                onChange={(e) => setTiempoMin(e.target.value)}
                className={cn(
                  "w-full px-2 py-1.5 rounded-lg text-xs border transition-all",
                  theme === "dark"
                    ? "bg-white/5 border-white/10 text-white"
                    : "bg-white border-purple-200/50 text-gray-700",
                )}
              />
              <input
                type="number"
                value={tiempoMax}
                onChange={(e) => setTiempoMax(e.target.value)}
                className={cn(
                  "w-full px-2 py-1.5 rounded-lg text-xs border transition-all",
                  theme === "dark"
                    ? "bg-white/5 border-white/10 text-white"
                    : "bg-white border-purple-200/50 text-gray-700",
                )}
              />
            </div>
          </div>
          <div>
            <label
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium mb-1.5",
                theme === "dark" ? "text-gray-400" : "text-gray-600",
              )}
            >
              <Package className="w-3 h-3" />
              Tamaño lote
            </label>
            <input
              type="number"
              value={tamanoLote}
              onChange={(e) => setTamanoLote(e.target.value)}
              className={cn(
                "w-full px-2 py-1.5 rounded-lg text-xs border transition-all",
                theme === "dark"
                  ? "bg-white/5 border-white/10 text-white"
                  : "bg-white border-purple-200/50 text-gray-700",
              )}
            />
          </div>
          <div>
            <label
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium mb-1.5",
                theme === "dark" ? "text-gray-400" : "text-gray-600",
              )}
            >
              <Coffee className="w-3 h-3" />
              Descanso (min)
            </label>
            <input
              type="number"
              value={descanso}
              onChange={(e) => setDescanso(e.target.value)}
              className={cn(
                "w-full px-2 py-1.5 rounded-lg text-xs border transition-all",
                theme === "dark"
                  ? "bg-white/5 border-white/10 text-white"
                  : "bg-white border-purple-200/50 text-gray-700",
              )}
            />
          </div>
          <div>
            <label
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium mb-1.5",
                theme === "dark" ? "text-gray-400" : "text-gray-600",
              )}
            >
              <Calendar className="w-3 h-3" />
              Programar
            </label>
            <input
              type="datetime-local"
              value={fechaEnvio}
              onChange={(e) => setFechaEnvio(e.target.value)}
              className={cn(
                "w-full px-2 py-1.5 rounded-lg text-xs border transition-all",
                theme === "dark"
                  ? "bg-white/5 border-white/10 text-white"
                  : "bg-white border-purple-200/50 text-gray-700",
              )}
            />
          </div>
        </div>

        {/* Send Button */}
        <button
          className={cn(
            "w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all transform hover:scale-[1.02] active:scale-[0.98]",
            theme === "dark"
              ? "bg-gradient-to-r from-[#17C787] to-[#1E88E5] hover:from-[#17C787]/90 hover:to-[#1E88E5]/90 text-white shadow-lg shadow-[#17C787]/20"
              : "bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white shadow-lg shadow-emerald-200/50",
          )}
        >
          <Sparkles className="w-4 h-4" />
          Iniciar envío
        </button>
      </div>

      {/* Campaigns Table */}
      <div
        className={cn(
          "rounded-2xl border backdrop-blur-sm overflow-hidden",
          theme === "dark"
            ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
            : "bg-gradient-to-br from-white to-[#FAF7F2]/80 border-purple-200/30 shadow-lg shadow-purple-100/30",
        )}
      >
        {/* Table Header */}
        <div
          className={cn(
            "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b",
            theme === "dark" ? "border-white/10" : "border-purple-100",
          )}
        >
          <h3 className={cn("text-sm font-semibold", theme === "dark" ? "text-white" : "text-gray-700")}>
            Campañas creadas
          </h3>
          <div className="flex items-center gap-2">
            <span className={cn("text-xs", theme === "dark" ? "text-gray-400" : "text-gray-500")}>Fecha:</span>
            <input
              type="text"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              placeholder="dd/mm/aaaa"
              className={cn(
                "px-2 py-1 rounded text-xs border w-28",
                theme === "dark"
                  ? "bg-white/5 border-white/10 text-white"
                  : "bg-white border-purple-200/50 text-gray-700",
              )}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className={theme === "dark" ? "bg-white/5" : "bg-purple-50"}>
                <th
                  className={cn(
                    "px-3 py-2 text-left font-medium",
                    theme === "dark" ? "text-gray-400" : "text-gray-600",
                  )}
                >
                  Nombre
                </th>
                <th
                  className={cn(
                    "px-3 py-2 text-left font-medium",
                    theme === "dark" ? "text-gray-400" : "text-gray-600",
                  )}
                >
                  Usuario/Equipo
                </th>
                <th
                  className={cn(
                    "px-3 py-2 text-left font-medium",
                    theme === "dark" ? "text-gray-400" : "text-gray-600",
                  )}
                >
                  Estado
                </th>
                <th
                  className={cn(
                    "px-3 py-2 text-left font-medium",
                    theme === "dark" ? "text-gray-400" : "text-gray-600",
                  )}
                >
                  Progreso
                </th>
                <th
                  className={cn(
                    "px-3 py-2 text-left font-medium",
                    theme === "dark" ? "text-gray-400" : "text-gray-600",
                  )}
                >
                  Métricas
                </th>
                <th
                  className={cn(
                    "px-3 py-2 text-left font-medium",
                    theme === "dark" ? "text-gray-400" : "text-gray-600",
                  )}
                >
                  Hora
                </th>
                <th
                  className={cn(
                    "px-3 py-2 text-center font-medium",
                    theme === "dark" ? "text-gray-400" : "text-gray-600",
                  )}
                >
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className={cn("divide-y", theme === "dark" ? "divide-white/5" : "divide-purple-100")}>
              {campaignsData.map((campaign) => {
                const statusStyle = getStatusStyles(campaign.estado, theme)
                return (
                  <tr
                    key={campaign.id}
                    className={cn("transition-colors", theme === "dark" ? "hover:bg-white/5" : "hover:bg-purple-50/50")}
                  >
                    <td className="px-3 py-2.5">
                      <span className={cn("font-medium", theme === "dark" ? "text-purple-400" : "text-purple-600")}>
                        {campaign.nombre}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div>
                        <span className={theme === "dark" ? "text-white" : "text-gray-700"}>{campaign.usuario}</span>
                        <span
                          className={cn(
                            "ml-2 px-1.5 py-0.5 rounded text-[10px]",
                            theme === "dark" ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-600",
                          )}
                        >
                          {campaign.equipo}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-medium",
                          statusStyle.bg,
                          statusStyle.text,
                        )}
                      >
                        {campaign.estado}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "w-16 h-1.5 rounded-full overflow-hidden",
                            theme === "dark" ? "bg-white/10" : "bg-purple-100",
                          )}
                        >
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              campaign.estado === "completado"
                                ? "bg-[#17C787]"
                                : campaign.estado === "fallido"
                                  ? "bg-[#C8376B]"
                                  : theme === "dark"
                                    ? "bg-purple-500"
                                    : "bg-purple-400",
                            )}
                            style={{ width: `${campaign.progreso}%` }}
                          />
                        </div>
                        <span className={cn("text-[10px]", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                          {campaign.progreso}%
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px]",
                            theme === "dark" ? "bg-[#17C787]/20 text-[#17C787]" : "bg-emerald-100 text-emerald-600",
                          )}
                        >
                          ✓{campaign.enviados}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px]",
                            theme === "dark" ? "bg-[#C8376B]/20 text-[#C8376B]" : "bg-rose-100 text-rose-600",
                          )}
                        >
                          ✕{campaign.fallidos}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px]",
                            theme === "dark" ? "bg-[#1E88E5]/20 text-[#1E88E5]" : "bg-blue-100 text-blue-600",
                          )}
                        >
                          ⏳{campaign.pendientes}
                        </span>
                      </div>
                    </td>
                    <td className={cn("px-3 py-2.5", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                      {campaign.horaCreacion}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          className={cn(
                            "p-1.5 rounded transition-colors",
                            theme === "dark"
                              ? "bg-[#F4C04A]/20 text-[#F4C04A] hover:bg-[#F4C04A]/30"
                              : "bg-amber-100 text-amber-600 hover:bg-amber-200",
                          )}
                        >
                          <Pause className="w-3 h-3" />
                        </button>
                        <button
                          className={cn(
                            "p-1.5 rounded transition-colors",
                            theme === "dark"
                              ? "bg-[#C8376B]/20 text-[#C8376B] hover:bg-[#C8376B]/30"
                              : "bg-rose-100 text-rose-600 hover:bg-rose-200",
                          )}
                        >
                          <Square className="w-3 h-3" />
                        </button>
                        <button
                          className={cn(
                            "p-1.5 rounded transition-colors",
                            theme === "dark"
                              ? "bg-[#17C787]/20 text-[#17C787] hover:bg-[#17C787]/30"
                              : "bg-emerald-100 text-emerald-600 hover:bg-emerald-200",
                          )}
                        >
                          <FileSpreadsheet className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* AutoRespuestasModal */}
      <AutoRespuestasModal isOpen={isAutoRespuestasOpen} onClose={() => setIsAutoRespuestasOpen(false)} />
    </div>
  )
}
