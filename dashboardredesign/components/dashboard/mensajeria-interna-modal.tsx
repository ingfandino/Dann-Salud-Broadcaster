"use client"

import { useState } from "react"
import { X, Mail, Inbox, Send, Star, Trash2, Plus } from "lucide-react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"

interface Mensaje {
  id: number
  de: string
  asunto: string
  contenido: string
  fecha: string
  leido: boolean
  destacado: boolean
  tipo: "recibido" | "enviado"
}

interface MensajeriaInternaModalProps {
  isOpen: boolean
  onClose: () => void
}

const mensajesIniciales: Mensaje[] = [
  {
    id: 1,
    de: "Admin Sistema",
    asunto: "Bienvenido al sistema",
    contenido: "Gracias por unirte a nuestra plataforma. Si tienes alguna duda, no dudes en contactarnos.",
    fecha: "26/11/2025",
    leido: true,
    destacado: false,
    tipo: "recibido",
  },
  {
    id: 2,
    de: "Soporte Técnico",
    asunto: "Actualización de sistema",
    contenido: "Se ha realizado una actualización del sistema. Por favor revisa los cambios.",
    fecha: "25/11/2025",
    leido: false,
    destacado: true,
    tipo: "recibido",
  },
  {
    id: 3,
    de: "Yamila Chaar",
    asunto: "Reporte mensual",
    contenido: "Adjunto el reporte mensual de actividades como solicitaste.",
    fecha: "24/11/2025",
    leido: true,
    destacado: false,
    tipo: "enviado",
  },
]

export function MensajeriaInternaModal({ isOpen, onClose }: MensajeriaInternaModalProps) {
  const { theme } = useTheme()
  const [activeTab, setActiveTab] = useState<"recibidos" | "enviados" | "destacados">("recibidos")
  const [mensajes, setMensajes] = useState<Mensaje[]>(mensajesIniciales)
  const [selectedMensaje, setSelectedMensaje] = useState<Mensaje | null>(null)
  const [showNewMessage, setShowNewMessage] = useState(false)

  if (!isOpen) return null

  const filteredMensajes = mensajes.filter((m) => {
    if (activeTab === "recibidos") return m.tipo === "recibido"
    if (activeTab === "enviados") return m.tipo === "enviado"
    if (activeTab === "destacados") return m.destacado
    return true
  })

  const handleDeleteAll = () => {
    if (activeTab === "recibidos") {
      setMensajes(mensajes.filter((m) => m.tipo !== "recibido"))
    } else if (activeTab === "enviados") {
      setMensajes(mensajes.filter((m) => m.tipo !== "enviado"))
    } else {
      setMensajes(mensajes.filter((m) => !m.destacado))
    }
    setSelectedMensaje(null)
  }

  const toggleDestacado = (id: number) => {
    setMensajes(mensajes.map((m) => (m.id === id ? { ...m, destacado: !m.destacado } : m)))
  }

  const tabs = [
    { id: "recibidos" as const, label: "Recibidos", icon: Inbox, color: "text-[#1E88E5]" },
    { id: "enviados" as const, label: "Enviados", icon: Send, color: "text-[#C8376B]" },
    { id: "destacados" as const, label: "Destacados", icon: Star, color: "text-[#F4C04A]" },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      {/* Modal */}
      <div
        className={cn(
          "relative w-full max-w-4xl h-[80vh] overflow-hidden rounded-2xl border shadow-2xl animate-scale-in flex flex-col",
          theme === "dark"
            ? "bg-gradient-to-br from-[#1a1333] to-[#0f0a1e] border-white/10"
            : "bg-gradient-to-br from-white to-[#FAF7F2] border-purple-200/50",
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "flex items-center justify-between p-4 border-b flex-shrink-0",
            theme === "dark" ? "border-white/10" : "border-purple-100",
          )}
        >
          <div className="flex items-center gap-2">
            <Mail className={cn("w-5 h-5", theme === "dark" ? "text-purple-400" : "text-purple-500")} />
            <h2 className={cn("text-lg font-semibold", theme === "dark" ? "text-white" : "text-gray-700")}>
              Mensajería Interna
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewMessage(true)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                theme === "dark"
                  ? "bg-[#1E88E5] hover:bg-[#1E88E5]/80 text-white"
                  : "bg-blue-500 hover:bg-blue-600 text-white",
              )}
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo Mensaje
            </button>
            <button
              onClick={handleDeleteAll}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                theme === "dark"
                  ? "bg-[#C8376B] hover:bg-[#C8376B]/80 text-white"
                  : "bg-rose-500 hover:bg-rose-600 text-white",
              )}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Borrar Todo
            </button>
            <button
              onClick={onClose}
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                theme === "dark" ? "hover:bg-white/10 text-gray-400" : "hover:bg-purple-100 text-gray-500",
              )}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div
            className={cn(
              "w-40 flex-shrink-0 border-r p-2 space-y-1",
              theme === "dark" ? "border-white/10" : "border-purple-100",
            )}
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  setSelectedMensaje(null)
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left",
                  activeTab === tab.id
                    ? theme === "dark"
                      ? "bg-purple-500/20 text-white"
                      : "bg-purple-100 text-purple-700"
                    : theme === "dark"
                      ? "text-gray-400 hover:bg-white/5 hover:text-white"
                      : "text-gray-600 hover:bg-purple-50 hover:text-purple-600",
                )}
              >
                <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? tab.color : "")} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Message List */}
          <div
            className={cn(
              "w-64 flex-shrink-0 border-r overflow-y-auto",
              theme === "dark" ? "border-white/10" : "border-purple-100",
            )}
          >
            {filteredMensajes.length === 0 ? (
              <div className="p-4 text-center">
                <p className={cn("text-sm", theme === "dark" ? "text-gray-500" : "text-gray-400")}>No hay mensajes</p>
              </div>
            ) : (
              <div className="divide-y divide-opacity-50">
                {filteredMensajes.map((mensaje) => (
                  <button
                    key={mensaje.id}
                    onClick={() => setSelectedMensaje(mensaje)}
                    className={cn(
                      "w-full p-3 text-left transition-colors",
                      selectedMensaje?.id === mensaje.id
                        ? theme === "dark"
                          ? "bg-purple-500/20"
                          : "bg-purple-100"
                        : theme === "dark"
                          ? "hover:bg-white/5"
                          : "hover:bg-purple-50",
                      !mensaje.leido && "font-semibold",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-xs truncate", theme === "dark" ? "text-purple-400" : "text-purple-600")}>
                          {mensaje.de}
                        </p>
                        <p className={cn("text-sm truncate", theme === "dark" ? "text-white" : "text-gray-700")}>
                          {mensaje.asunto}
                        </p>
                        <p className={cn("text-[10px] mt-0.5", theme === "dark" ? "text-gray-500" : "text-gray-400")}>
                          {mensaje.fecha}
                        </p>
                      </div>
                      {mensaje.destacado && <Star className="w-3 h-3 text-[#F4C04A] fill-[#F4C04A] flex-shrink-0" />}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Message Detail */}
          <div className="flex-1 overflow-y-auto p-4">
            {selectedMensaje ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className={cn("text-lg font-semibold", theme === "dark" ? "text-white" : "text-gray-700")}>
                      {selectedMensaje.asunto}
                    </h3>
                    <p className={cn("text-sm", theme === "dark" ? "text-purple-400" : "text-purple-600")}>
                      De: {selectedMensaje.de}
                    </p>
                    <p className={cn("text-xs", theme === "dark" ? "text-gray-500" : "text-gray-400")}>
                      {selectedMensaje.fecha}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleDestacado(selectedMensaje.id)}
                    className={cn(
                      "p-2 rounded-lg transition-colors",
                      theme === "dark" ? "hover:bg-white/10" : "hover:bg-purple-100",
                    )}
                  >
                    <Star
                      className={cn(
                        "w-5 h-5",
                        selectedMensaje.destacado
                          ? "text-[#F4C04A] fill-[#F4C04A]"
                          : theme === "dark"
                            ? "text-gray-500"
                            : "text-gray-400",
                      )}
                    />
                  </button>
                </div>
                <div
                  className={cn(
                    "p-4 rounded-xl border",
                    theme === "dark" ? "bg-white/5 border-white/10" : "bg-purple-50/50 border-purple-100",
                  )}
                >
                  <p className={cn("text-sm leading-relaxed", theme === "dark" ? "text-gray-300" : "text-gray-600")}>
                    {selectedMensaje.contenido}
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className={cn("text-sm", theme === "dark" ? "text-gray-500" : "text-gray-400")}>
                  Selecciona un mensaje para leerlo
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
