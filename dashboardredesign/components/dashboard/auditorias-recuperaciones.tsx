"use client"

import { useState } from "react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import { Filter, Pencil, Clock, X, Trash2, FileText } from "lucide-react"

interface Recuperacion {
  id: number
  tiempo: string
  inicio: string
  afiliado: string
  cuil: string
  telefono: string
  oSocial: string
  asesor: string
  supervisor: string
  grupo: number
  admin: string
  estado: string
}

const estadoColors: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
  Pendiente: { bg: "bg-gray-100", text: "text-gray-700", darkBg: "bg-gray-500/20", darkText: "text-gray-400" },
  "Falta clave": {
    bg: "bg-yellow-100",
    text: "text-yellow-700",
    darkBg: "bg-yellow-500/20",
    darkText: "text-yellow-400",
  },
  Rechazada: { bg: "bg-red-100", text: "text-red-700", darkBg: "bg-red-500/20", darkText: "text-red-400" },
}

const tiempoColors: Record<string, string> = {
  "15h": "text-green-500",
  "17h": "text-yellow-500",
  "21h": "text-orange-500",
  "22h": "text-orange-600",
  "23h": "text-red-500",
  "1d 1h": "text-red-600",
  "1d 4h": "text-red-700",
}

const mockData: Recuperacion[] = [
  {
    id: 1,
    tiempo: "15h",
    inicio: "25/11",
    afiliado: "De Marco Santiago",
    cuil: "20428768833",
    telefono: "1164667525",
    oSocial: "Binimed",
    asesor: "Jorge Torres",
    supervisor: "Nahia Avellaneda",
    grupo: 222,
    admin: "Elias Martin Corio",
    estado: "Pendiente",
  },
  {
    id: 2,
    tiempo: "15h",
    inicio: "25/11",
    afiliado: "Ludmila Abril Agostoni",
    cuil: "27467024758",
    telefono: "1124012536",
    oSocial: "Binimed",
    asesor: "Franco Terenzano Rodriguez",
    supervisor: "Mateo Viera",
    grupo: 23,
    admin: "Maria Jimena Vargas",
    estado: "Pendiente",
  },
  {
    id: 3,
    tiempo: "15h",
    inicio: "25/11",
    afiliado: "Franco Angel",
    cuil: "20315977232",
    telefono: "1157043750",
    oSocial: "Binimed",
    asesor: "Morena Ledesma",
    supervisor: "Santiago Goldsztein",
    grupo: 444,
    admin: "Maria Jimena Vargas",
    estado: "Pendiente",
  },
  {
    id: 4,
    tiempo: "17h",
    inicio: "26/11",
    afiliado: "Sofia Guadalupe Jara",
    cuil: "27464337011",
    telefono: "1134369510",
    oSocial: "Binimed",
    asesor: "Katherine Gaitan",
    supervisor: "Mateo Viera",
    grupo: 23,
    admin: "Elias Martin Corio",
    estado: "Falta clave",
  },
  {
    id: 5,
    tiempo: "21h",
    inicio: "25/11",
    afiliado: "Franco Maria De Los Angeles",
    cuil: "27421007352",
    telefono: "1160003686",
    oSocial: "Meplife",
    asesor: "Diana Silvestre",
    supervisor: "Luciano Carugno",
    grupo: 555,
    admin: "Yair Navas",
    estado: "Rechazada",
  },
  {
    id: 6,
    tiempo: "21h",
    inicio: "25/11",
    afiliado: "Colombat Iribar Karla De La Caridad",
    cuil: "27960273880",
    telefono: "1128161844",
    oSocial: "Binimed",
    asesor: "Jonathan Perez",
    supervisor: "Analia Suarez",
    grupo: 888,
    admin: "Elias Martin Corio",
    estado: "Falta clave",
  },
  {
    id: 7,
    tiempo: "22h",
    inicio: "25/11",
    afiliado: "Rodriguez Hernan Alejandro",
    cuil: "20461098348",
    telefono: "1138393958",
    oSocial: "Binimed",
    asesor: "Ibarra Milenka",
    supervisor: "Belen Salaverry",
    grupo: 578,
    admin: "Elias Martin Corio",
    estado: "Falta clave",
  },
  {
    id: 8,
    tiempo: "22h",
    inicio: "25/11",
    afiliado: "Zelaya Jisell Del Carmen",
    cuil: "27333917438",
    telefono: "1152614569",
    oSocial: "Binimed",
    asesor: "Morena Ledesma",
    supervisor: "Santiago Goldsztein",
    grupo: 444,
    admin: "Elias Martin Corio",
    estado: "Falta clave",
  },
  {
    id: 9,
    tiempo: "23h",
    inicio: "25/11",
    afiliado: "MiñO Lazaro Cristian Nicolas",
    cuil: "23452825279",
    telefono: "1141776232",
    oSocial: "Binimed",
    asesor: "Luca Avenali",
    supervisor: "Belen Salaverry",
    grupo: 578,
    admin: "Yair Navas",
    estado: "Falta clave",
  },
  {
    id: 10,
    tiempo: "23h",
    inicio: "25/11",
    afiliado: "Micaela Maidana",
    cuil: "27435178672",
    telefono: "1127632231",
    oSocial: "Binimed",
    asesor: "Nuria Balbuena",
    supervisor: "Aryel Puiggros",
    grupo: 777,
    admin: "Yair Navas",
    estado: "Falta clave",
  },
  {
    id: 11,
    tiempo: "1d 1h",
    inicio: "25/11",
    afiliado: "Schaab Julia",
    cuil: "27423526136",
    telefono: "1157182985",
    oSocial: "Binimed",
    asesor: "Ledezma Santiago",
    supervisor: "Joaquin Valdez",
    grupo: 879,
    admin: "Yair Navas",
    estado: "Falta clave",
  },
  {
    id: 12,
    tiempo: "1d 4h",
    inicio: "7/11",
    afiliado: "Ayala AgustiN",
    cuil: "20419196609",
    telefono: "1138896600",
    oSocial: "Binimed",
    asesor: "Martin Rodriguez",
    supervisor: "Santiago Goldsztein",
    grupo: 444,
    admin: "-",
    estado: "Falta clave",
  },
]

export function AuditoriasRecuperaciones() {
  const { theme } = useTheme()
  const [filtros, setFiltros] = useState({
    afiliado: "",
    cuil: "",
    obraSocialVendida: "",
    estado: "",
    fechaDesde: "",
    fechaHasta: "",
  })

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedRecuperacion, setSelectedRecuperacion] = useState<any>(null)

  const openEditModal = (item: any) => {
    setSelectedRecuperacion(item)
    setEditModalOpen(true)
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Filtros */}
      <div
        className={cn(
          "rounded-2xl border p-6 backdrop-blur-sm",
          theme === "dark"
            ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
            : "bg-white border-gray-200 shadow-sm",
        )}
      >
        <div className="flex items-center gap-2 mb-4">
          <Filter className={cn("w-5 h-5", theme === "dark" ? "text-purple-400" : "text-purple-500")} />
          <h3 className={cn("font-semibold", theme === "dark" ? "text-white" : "text-gray-800")}>Filtros</h3>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <input
            type="text"
            placeholder="Buscar afiliado"
            value={filtros.afiliado}
            onChange={(e) => setFiltros({ ...filtros, afiliado: e.target.value })}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm w-40",
              theme === "dark"
                ? "bg-white/5 border-white/10 text-white placeholder-gray-500"
                : "bg-white border-gray-200 text-gray-800 placeholder-gray-400",
            )}
          />
          <input
            type="text"
            placeholder="Buscar CUIL"
            value={filtros.cuil}
            onChange={(e) => setFiltros({ ...filtros, cuil: e.target.value })}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm w-36",
              theme === "dark"
                ? "bg-white/5 border-white/10 text-white placeholder-gray-500"
                : "bg-white border-gray-200 text-gray-800 placeholder-gray-400",
            )}
          />
          <select
            value={filtros.obraSocialVendida}
            onChange={(e) => setFiltros({ ...filtros, obraSocialVendida: e.target.value })}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm",
              theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
            )}
          >
            <option value="">Obra social vendida</option>
            <option value="binimed">Binimed</option>
            <option value="meplife">Meplife</option>
          </select>
          <select
            value={filtros.estado}
            onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm",
              theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
            )}
          >
            <option value="">Estado</option>
            <option value="pendiente">Pendiente</option>
            <option value="falta-clave">Falta clave</option>
            <option value="rechazada">Rechazada</option>
          </select>
          <div className="flex items-center gap-2">
            <span className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}>Desde</span>
            <input
              type="date"
              value={filtros.fechaDesde}
              onChange={(e) => setFiltros({ ...filtros, fechaDesde: e.target.value })}
              className={cn(
                "px-3 py-2 rounded-lg border text-sm",
                theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
              )}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}>Hasta</span>
            <input
              type="date"
              value={filtros.fechaHasta}
              onChange={(e) => setFiltros({ ...filtros, fechaHasta: e.target.value })}
              className={cn(
                "px-3 py-2 rounded-lg border text-sm",
                theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
              )}
            />
          </div>
          <div className="flex-1" />
          <button
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              theme === "dark"
                ? "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                : "bg-cyan-500 text-white hover:bg-cyan-600",
            )}
          >
            Aplicar filtros
          </button>
          <button
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
              theme === "dark"
                ? "border-white/10 text-gray-400 hover:bg-white/5"
                : "border-gray-200 text-gray-600 hover:bg-gray-50",
            )}
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div
        className={cn(
          "rounded-2xl border overflow-hidden",
          theme === "dark"
            ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
            : "bg-white border-gray-200 shadow-sm",
        )}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={theme === "dark" ? "bg-white/5" : "bg-gray-50"}>
                {[
                  "TIEMPO",
                  "INICIO",
                  "AFILIADO",
                  "CUIL",
                  "TELÉFONO",
                  "O.SOCIAL",
                  "ASESOR",
                  "SUPERVISOR",
                  "GRUPO",
                  "ADMIN",
                  "ESTADO",
                  "",
                ].map((header) => (
                  <th
                    key={header}
                    className={cn(
                      "px-3 py-3 text-left font-semibold whitespace-nowrap",
                      theme === "dark" ? "text-gray-300" : "text-gray-700",
                    )}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockData.map((item) => {
                const estadoStyle = estadoColors[item.estado] || estadoColors["Pendiente"]
                const tiempoColor = tiempoColors[item.tiempo] || "text-gray-500"
                return (
                  <tr
                    key={item.id}
                    className={cn(
                      "border-t transition-colors",
                      theme === "dark" ? "border-white/5 hover:bg-white/5" : "border-gray-100 hover:bg-gray-50",
                    )}
                  >
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <Clock className={cn("w-4 h-4", tiempoColor)} />
                        <span className={cn("font-medium", tiempoColor)}>{item.tiempo}</span>
                      </div>
                    </td>
                    <td
                      className={cn(
                        "px-3 py-3 whitespace-nowrap",
                        theme === "dark" ? "text-gray-300" : "text-gray-700",
                      )}
                    >
                      {item.inicio}
                    </td>
                    <td className={cn("px-3 py-3 font-medium", theme === "dark" ? "text-white" : "text-gray-800")}>
                      {item.afiliado}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-3 whitespace-nowrap",
                        theme === "dark" ? "text-gray-400" : "text-gray-600",
                      )}
                    >
                      {item.cuil}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-3 whitespace-nowrap",
                        theme === "dark" ? "text-cyan-400" : "text-cyan-600",
                      )}
                    >
                      {item.telefono}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "px-2 py-1 rounded text-xs font-medium",
                          item.oSocial === "Binimed"
                            ? theme === "dark"
                              ? "bg-green-500/20 text-green-300"
                              : "bg-green-100 text-green-700"
                            : theme === "dark"
                              ? "bg-pink-500/20 text-pink-300"
                              : "bg-pink-100 text-pink-700",
                        )}
                      >
                        {item.oSocial}
                      </span>
                    </td>
                    <td
                      className={cn(
                        "px-3 py-3 whitespace-nowrap",
                        theme === "dark" ? "text-gray-300" : "text-gray-700",
                      )}
                    >
                      {item.asesor}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "px-2 py-1 rounded text-xs font-medium",
                          theme === "dark" ? "bg-cyan-500/20 text-cyan-300" : "bg-cyan-100 text-cyan-700",
                        )}
                      >
                        {item.supervisor}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "px-2 py-1 rounded text-xs font-medium",
                          theme === "dark" ? "bg-orange-500/20 text-orange-300" : "bg-orange-100 text-orange-700",
                        )}
                      >
                        {item.grupo}
                      </span>
                    </td>
                    <td
                      className={cn(
                        "px-3 py-3 whitespace-nowrap",
                        theme === "dark" ? "text-gray-400" : "text-gray-600",
                      )}
                    >
                      {item.admin}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "px-2 py-1 rounded text-xs font-medium whitespace-nowrap",
                          theme === "dark" ? estadoStyle.darkBg : estadoStyle.bg,
                          theme === "dark" ? estadoStyle.darkText : estadoStyle.text,
                        )}
                      >
                        {item.estado}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => openEditModal(item)}
                        className={cn(
                          "p-1.5 rounded-lg transition-colors",
                          theme === "dark"
                            ? "hover:bg-purple-500/20 text-purple-400"
                            : "hover:bg-purple-50 text-purple-600",
                        )}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editModalOpen && selectedRecuperacion && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div
            className={cn(
              "w-full max-w-xl rounded-2xl border shadow-xl my-8 overflow-hidden",
              theme === "dark" ? "bg-[#1a1333] border-white/10" : "bg-white border-gray-200",
            )}
          >
            {/* Modal Header - Teal gradient */}
            <div className="p-4" style={{ background: "linear-gradient(135deg, #17C787 0%, #0E9F6E 100%)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">Editar Recuperación</h3>
                  <p className="text-sm text-white/80">
                    {selectedRecuperacion.afiliado?.toUpperCase()} - {selectedRecuperacion.cuil}
                  </p>
                </div>
                <button
                  onClick={() => setEditModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Información Original */}
              <div
                className={cn(
                  "rounded-lg border p-4",
                  theme === "dark" ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200",
                )}
              >
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4" style={{ color: "#1E88E5" }} />
                  <span className={cn("font-medium text-sm", theme === "dark" ? "text-white" : "text-gray-800")}>
                    Información Original
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <p className={theme === "dark" ? "text-gray-400" : "text-gray-500"}>
                    Asesor original:{" "}
                    <span className={cn("font-medium", theme === "dark" ? "text-white" : "text-gray-800")}>
                      {selectedRecuperacion.asesor}
                    </span>
                  </p>
                  <p className={theme === "dark" ? "text-gray-400" : "text-gray-500"}>
                    Supervisor original: <span style={{ color: "#17C787" }}>{selectedRecuperacion.supervisor}</span>
                  </p>
                  <p className={theme === "dark" ? "text-gray-400" : "text-gray-500"}>
                    Grupo original:{" "}
                    <span className={cn("font-medium", theme === "dark" ? "text-white" : "text-gray-800")}>
                      {selectedRecuperacion.grupo}
                    </span>
                  </p>
                  <p className={theme === "dark" ? "text-gray-400" : "text-gray-500"}>
                    Fecha inicio:{" "}
                    <span className={cn("font-medium", theme === "dark" ? "text-white" : "text-gray-800")}>
                      {selectedRecuperacion.inicio}/2025
                    </span>
                  </p>
                  <p className={theme === "dark" ? "text-gray-400" : "text-gray-500"}>
                    Estado actual:{" "}
                    <span className={cn("font-medium", theme === "dark" ? "text-white" : "text-gray-800")}>
                      {selectedRecuperacion.estado}
                    </span>
                  </p>
                  <p className={theme === "dark" ? "text-gray-400" : "text-gray-500"}>
                    Tiempo en estado:{" "}
                    <span className={cn("font-medium", theme === "dark" ? "text-white" : "text-gray-800")}>
                      {selectedRecuperacion.tiempo}
                    </span>
                  </p>
                </div>
              </div>

              {/* Editable Fields */}
              <div>
                <label
                  className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}
                >
                  Nombre *
                </label>
                <input
                  type="text"
                  defaultValue={selectedRecuperacion.afiliado?.toUpperCase()}
                  className={cn(
                    "w-full px-3 py-2 rounded-lg border text-sm",
                    theme === "dark"
                      ? "bg-white/5 border-white/10 text-white"
                      : "bg-white border-gray-200 text-gray-800",
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    className={cn(
                      "block text-sm font-medium mb-1",
                      theme === "dark" ? "text-gray-300" : "text-gray-700",
                    )}
                  >
                    CUIL *
                  </label>
                  <input
                    type="text"
                    defaultValue={selectedRecuperacion.cuil}
                    className={cn(
                      "w-full px-3 py-2 rounded-lg border text-sm",
                      theme === "dark"
                        ? "bg-white/5 border-white/10 text-white"
                        : "bg-white border-gray-200 text-gray-800",
                    )}
                  />
                </div>
                <div>
                  <label
                    className={cn(
                      "block text-sm font-medium mb-1",
                      theme === "dark" ? "text-gray-300" : "text-gray-700",
                    )}
                  >
                    Teléfono *
                  </label>
                  <input
                    type="text"
                    defaultValue={selectedRecuperacion.telefono}
                    className={cn(
                      "w-full px-3 py-2 rounded-lg border text-sm",
                      theme === "dark"
                        ? "bg-white/5 border-white/10 text-white"
                        : "bg-white border-gray-200 text-gray-800",
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    className={cn(
                      "block text-sm font-medium mb-1",
                      theme === "dark" ? "text-gray-300" : "text-gray-700",
                    )}
                  >
                    Obra Social Vendida *
                  </label>
                  <select
                    defaultValue={selectedRecuperacion.oSocial}
                    className={cn(
                      "w-full px-3 py-2 rounded-lg border text-sm",
                      theme === "dark"
                        ? "bg-white/5 border-white/10 text-white"
                        : "bg-white border-gray-200 text-gray-800",
                    )}
                  >
                    <option>Binimed</option>
                    <option>Meplife</option>
                  </select>
                </div>
                <div>
                  <label
                    className={cn(
                      "block text-sm font-medium mb-1",
                      theme === "dark" ? "text-gray-300" : "text-gray-700",
                    )}
                  >
                    Estado *
                  </label>
                  <select
                    defaultValue={selectedRecuperacion.estado}
                    className={cn(
                      "w-full px-3 py-2 rounded-lg border text-sm",
                      theme === "dark"
                        ? "bg-white/5 border-white/10 text-white"
                        : "bg-white border-gray-200 text-gray-800",
                    )}
                  >
                    <option>Pendiente</option>
                    <option>Falta clave</option>
                    <option>Rechazada</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}
                >
                  👤 Administrador (opcional)
                </label>
                <select
                  defaultValue={selectedRecuperacion.admin}
                  className={cn(
                    "w-full px-3 py-2 rounded-lg border text-sm",
                    theme === "dark"
                      ? "bg-white/5 border-white/10 text-white"
                      : "bg-white border-gray-200 text-gray-800",
                  )}
                >
                  <option value="">Seleccionar administrador</option>
                  <option>Maria Jimena Vargas</option>
                  <option>Yair Navas</option>
                  <option>Elias Martin Corio</option>
                </select>
                <p className={cn("text-xs mt-1", theme === "dark" ? "text-gray-500" : "text-gray-400")}>
                  Asigna un administrador responsable de generar el QR
                </p>
              </div>

              <div>
                <label
                  className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}
                >
                  Datos Extra / Notas
                </label>
                <textarea
                  rows={3}
                  placeholder="ya se hizo el repaso de las preguntas, esta en la calle repro 20..."
                  className={cn(
                    "w-full px-3 py-2 rounded-lg border text-sm resize-none",
                    theme === "dark"
                      ? "bg-white/5 border-white/10 text-white placeholder-gray-500"
                      : "bg-white border-gray-200 text-gray-800 placeholder-gray-400",
                  )}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div
              className="flex justify-between gap-3 p-6 border-t"
              style={{ borderColor: theme === "dark" ? "rgba(255,255,255,0.1)" : "#e5e7eb" }}
            >
              <button
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-2"
                style={{ backgroundColor: "#C8376B" }}
              >
                <Trash2 className="w-4 h-4" />
                Eliminar
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => setEditModalOpen(false)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
                    theme === "dark"
                      ? "border-white/10 text-gray-400 hover:bg-white/5"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50",
                  )}
                >
                  Cancelar
                </button>
                <button
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-2"
                  style={{ backgroundColor: "#17C787" }}
                >
                  💾 Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
