"use client"

import { useState } from "react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import { Filter, Download, Calendar, BarChart3, Pencil, Eye, Trash2, X } from "lucide-react"

interface Auditoria {
  id: number
  fecha: string
  hora: string
  afiliado: string
  telefono: string
  cuil: string
  osAnterior: string
  osVendida: string
  estado: string
  asesor: string
  supervisor: string
  auditor: string
  admin: string
  recuperada: string
  migrada: boolean
}

const estadoColors: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
  "No atendió": {
    bg: "bg-yellow-100",
    text: "text-yellow-700",
    darkBg: "bg-yellow-500/20",
    darkText: "text-yellow-400",
  },
  "QR hecho": { bg: "bg-green-100", text: "text-green-700", darkBg: "bg-green-500/20", darkText: "text-green-400" },
  "Aprobada, pero no reconoce clave": {
    bg: "bg-orange-100",
    text: "text-orange-700",
    darkBg: "bg-orange-500/20",
    darkText: "text-orange-400",
  },
  Reprogramada: { bg: "bg-blue-100", text: "text-blue-700", darkBg: "bg-blue-500/20", darkText: "text-blue-400" },
  "Sin estado": { bg: "bg-gray-100", text: "text-gray-700", darkBg: "bg-gray-500/20", darkText: "text-gray-400" },
}

const mockData: Auditoria[] = [
  {
    id: 1,
    fecha: "26/11",
    hora: "10:00",
    afiliado: "Ivana Nicole Zalazar",
    telefono: "1128387001",
    cuil: "27445538782",
    osAnterior: "OSECAC (126205)",
    osVendida: "Binimed",
    estado: "No atendió",
    asesor: "Lautaro Bogado",
    supervisor: "Luciano Carugno",
    auditor: "Marcelo",
    admin: "-",
    recuperada: "No",
    migrada: false,
  },
  {
    id: 2,
    fecha: "26/11",
    hora: "10:00",
    afiliado: "Segovia Pablo Hernan",
    telefono: "1168705095",
    cuil: "23388267429",
    osAnterior: "OSECAC (126205)",
    osVendida: "Binimed",
    estado: "No atendió",
    asesor: "Milagros Krauss",
    supervisor: "Mateo Viera",
    auditor: "Marcelo",
    admin: "-",
    recuperada: "No",
    migrada: false,
  },
  {
    id: 3,
    fecha: "26/11",
    hora: "10:00",
    afiliado: "Micaela Sofia Paz",
    telefono: "1164534914",
    cuil: "27430202265",
    osAnterior: "Elevar (114307)",
    osVendida: "Binimed",
    estado: "No atendió",
    asesor: "Katherine Gaitan",
    supervisor: "Mateo Viera",
    auditor: "Marcelo",
    admin: "-",
    recuperada: "No",
    migrada: false,
  },
  {
    id: 4,
    fecha: "26/11",
    hora: "10:20",
    afiliado: "Miranda Daiana",
    telefono: "1164721456",
    cuil: "27454280984",
    osAnterior: "OSECAC (126205)",
    osVendida: "Binimed",
    estado: "No atendió",
    asesor: "Maximiliano Paredes",
    supervisor: "Gaston Sarmiento",
    auditor: "Marcelo",
    admin: "-",
    recuperada: "No",
    migrada: false,
  },
  {
    id: 5,
    fecha: "26/11",
    hora: "10:25",
    afiliado: "Cristian Valentin Olivera",
    telefono: "1132314981",
    cuil: "20466409074",
    osAnterior: "OSTCARA (126007)",
    osVendida: "Binimed",
    estado: "QR hecho",
    asesor: "Micaela Cordoba",
    supervisor: "Abigail Vera",
    auditor: "Laura Jimena Gamboa",
    admin: "Maria Jimena Vargas",
    recuperada: "No",
    migrada: false,
  },
  {
    id: 6,
    fecha: "26/11",
    hora: "10:59",
    afiliado: "Coppialo Thiago Gabriel",
    telefono: "1130358993",
    cuil: "20445885097",
    osAnterior: "OSECAC (126205)",
    osVendida: "Meplife",
    estado: "Aprobada, pero no reconoce clave",
    asesor: "Marcos Miranda",
    supervisor: "Analia Suarez",
    auditor: "Paola Fernandez",
    admin: "Maria Jimena Vargas",
    recuperada: "No",
    migrada: false,
  },
  {
    id: 7,
    fecha: "26/11",
    hora: "10:59",
    afiliado: "Evelyn Micaela Palomo",
    telefono: "1170176146",
    cuil: "27441607755",
    osAnterior: "OSECAC (126205)",
    osVendida: "Meplife",
    estado: "Aprobada, pero no reconoce clave",
    asesor: "Lautaro Bogado",
    supervisor: "Luciano Carugno",
    auditor: "Luciano Carugno",
    admin: "Maria Jimena Vargas",
    recuperada: "No",
    migrada: false,
  },
  {
    id: 8,
    fecha: "26/11",
    hora: "11:00",
    afiliado: "Acebal Nogales Matias Gabriel",
    telefono: "1135795477",
    cuil: "20461938222",
    osAnterior: "OSUTHGRA (108803)",
    osVendida: "Binimed",
    estado: "No atendió",
    asesor: "Juliana Baez",
    supervisor: "Belen Salaverry",
    auditor: "Marcelo",
    admin: "-",
    recuperada: "No",
    migrada: false,
  },
  {
    id: 9,
    fecha: "26/11",
    hora: "11:05",
    afiliado: "Cespedes Nahiara Agustina",
    telefono: "1164496649",
    cuil: "27458879589",
    osAnterior: "Elevar (114307)",
    osVendida: "Binimed",
    estado: "QR hecho",
    asesor: "Aldana Gaspar",
    supervisor: "Luciano Carugno",
    auditor: "Luciano Carugno",
    admin: "Yair Navas",
    recuperada: "No",
    migrada: false,
  },
  {
    id: 10,
    fecha: "26/11",
    hora: "11:09",
    afiliado: "Galvan Saira Luz Mia",
    telefono: "2224511470",
    cuil: "27474068191",
    osAnterior: "Elevar (114307)",
    osVendida: "Meplife",
    estado: "QR hecho",
    asesor: "Tatiana Luna",
    supervisor: "Nahuel Sanchez",
    auditor: "Paola Fernandez",
    admin: "Maria Jimena Vargas",
    recuperada: "No",
    migrada: false,
  },
]

const estadisticas = {
  total: 70,
  sinEstado: 24,
  qrHecho: 18,
  reprogramada: 10,
  noAtendio: 7,
  aprobadaNoReconoce: 3,
  caida: 2,
  faltaClave: 2,
  bajaLaboral: 1,
  reprogramadaFalta: 1,
  completa: 1,
  mensajeEnviado: 1,
}

export function AuditoriasSeguimiento() {
  const { theme } = useTheme()
  const [filtros, setFiltros] = useState({
    afiliado: "",
    cuil: "",
    obraSocialAnterior: "",
    obraSocialVendida: "",
    estado: "",
    tipo: "",
    asesor: "",
    grupo: "",
    auditor: "",
    supervisor: "",
    administrador: "",
    fechaDesde: "",
    fechaHasta: "",
  })

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedAuditoria, setSelectedAuditoria] = useState<any>(null)

  const openEditModal = (item: any) => {
    setSelectedAuditoria(item)
    setEditModalOpen(true)
  }

  // Mock history data for the modal
  const historialEstado = [
    { fecha: "26/11/2025 10:11", usuario: "Yamila Chaar", estado: "No atendió" },
    { fecha: "26/11/2025 10:03", usuario: "Yamila Chaar", estado: "Mensaje enviado" },
    { fecha: "25/11/2025 17:44", usuario: "Luciano Carugno", estado: "Reprogramada" },
    { fecha: "25/11/2025 12:10", usuario: "Marcelo", estado: "No atendió" },
    { fecha: "25/11/2025 11:59", usuario: "Marcelo", estado: "Mensaje enviado" },
  ]

  const historialComentarios = [{ fecha: "25/11/2025 02:08", usuario: "Luciano Carugno", comentario: "INGRESA SOLA" }]

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

        {/* Row 1 */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-3">
          <input
            type="text"
            placeholder="Buscar afiliado"
            value={filtros.afiliado}
            onChange={(e) => setFiltros({ ...filtros, afiliado: e.target.value })}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm",
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
              "px-3 py-2 rounded-lg border text-sm",
              theme === "dark"
                ? "bg-white/5 border-white/10 text-white placeholder-gray-500"
                : "bg-white border-gray-200 text-gray-800 placeholder-gray-400",
            )}
          />
          <select
            value={filtros.obraSocialAnterior}
            onChange={(e) => setFiltros({ ...filtros, obraSocialAnterior: e.target.value })}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm",
              theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
            )}
          >
            <option value="">Obra social anterior</option>
            <option value="osecac">OSECAC</option>
            <option value="ostcara">OSTCARA</option>
            <option value="elevar">Elevar</option>
          </select>
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
            <option value="sin-estado">Sin estado</option>
            <option value="qr-hecho">QR hecho</option>
            <option value="no-atendio">No atendió</option>
            <option value="reprogramada">Reprogramada</option>
          </select>
          <select
            value={filtros.tipo}
            onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm",
              theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
            )}
          >
            <option value="">Tipo</option>
            <option value="alta">Alta</option>
            <option value="baja">Baja</option>
          </select>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-3">
          <select
            value={filtros.asesor}
            onChange={(e) => setFiltros({ ...filtros, asesor: e.target.value })}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm",
              theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
            )}
          >
            <option value="">Asesor</option>
            <option value="lautaro">Lautaro Bogado</option>
            <option value="micaela">Micaela Cordoba</option>
          </select>
          <select
            value={filtros.grupo}
            onChange={(e) => setFiltros({ ...filtros, grupo: e.target.value })}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm",
              theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
            )}
          >
            <option value="">Grupo</option>
            <option value="grupo1">Grupo 1</option>
            <option value="grupo2">Grupo 2</option>
          </select>
          <select
            value={filtros.auditor}
            onChange={(e) => setFiltros({ ...filtros, auditor: e.target.value })}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm",
              theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
            )}
          >
            <option value="">Auditor</option>
            <option value="marcelo">Marcelo</option>
            <option value="luciano">Luciano Carugno</option>
          </select>
          <select
            value={filtros.supervisor}
            onChange={(e) => setFiltros({ ...filtros, supervisor: e.target.value })}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm",
              theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
            )}
          >
            <option value="">Supervisor</option>
            <option value="mateo">Mateo Viera</option>
            <option value="gaston">Gaston Sarmiento</option>
          </select>
          <select
            value={filtros.administrador}
            onChange={(e) => setFiltros({ ...filtros, administrador: e.target.value })}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm",
              theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
            )}
          >
            <option value="">Administrador</option>
            <option value="maria">Maria Jimena Vargas</option>
            <option value="yair">Yair Navas</option>
          </select>
        </div>

        {/* Row 3: Dates and buttons */}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <span className={cn("text-xs block mb-1", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
              Desde
            </span>
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
          <div>
            <span className={cn("text-xs block mb-1", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
              Hasta
            </span>
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
          <button
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors text-white flex items-center gap-2"
            style={{ backgroundColor: "#17C787" }}
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
          <button
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors text-white flex items-center gap-2"
            style={{ backgroundColor: "#F4C04A" }}
          >
            <Calendar className="w-4 h-4" />
            Turnos
          </button>
          <button
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors text-white flex items-center gap-2",
              theme === "dark" ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-800 hover:bg-gray-700",
            )}
          >
            <BarChart3 className="w-4 h-4" />
            Estadísticas
          </button>
        </div>
      </div>

      <div
        className={cn(
          "rounded-xl border px-4 py-3",
          theme === "dark"
            ? "bg-gradient-to-r from-[#1a1333] to-[#0f0a1e] border-white/10"
            : "bg-gradient-to-r from-gray-50 to-white border-gray-200",
        )}
      >
        <p className={cn("text-sm leading-relaxed", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
          <span className="font-semibold" style={{ color: theme === "dark" ? "#fff" : "#1f2937" }}>
            Total: 70
          </span>
          <span className={theme === "dark" ? "text-gray-500" : "text-gray-400"}>{" | "}</span>
          <span>
            Sin estado: <span style={{ color: "#9CA3AF" }}>24</span>
          </span>
          <span className={theme === "dark" ? "text-gray-500" : "text-gray-400"}>{" | "}</span>
          <span>
            QR hecho: <span style={{ color: "#17C787" }}>18</span>
          </span>
          <span className={theme === "dark" ? "text-gray-500" : "text-gray-400"}>{" | "}</span>
          <span>
            Reprogramada: <span style={{ color: "#F4C04A" }}>10</span>
          </span>
          <span className={theme === "dark" ? "text-gray-500" : "text-gray-400"}>{" | "}</span>
          <span>
            No atendió: <span style={{ color: "#1E88E5" }}>7</span>
          </span>
          <span className={theme === "dark" ? "text-gray-500" : "text-gray-400"}>{" | "}</span>
          <span>
            Aprobada, pero no reconoce clave: <span style={{ color: "#0E6FFF" }}>3</span>
          </span>
          <span className={theme === "dark" ? "text-gray-500" : "text-gray-400"}>{" | "}</span>
          <span>
            Caída: <span style={{ color: "#C8376B" }}>2</span>
          </span>
          <span className={theme === "dark" ? "text-gray-500" : "text-gray-400"}>{" | "}</span>
          <span>
            Falta clave: <span style={{ color: "#C62FA8" }}>2</span>
          </span>
          <span className={theme === "dark" ? "text-gray-500" : "text-gray-400"}>{" | "}</span>
          <span>
            Baja laboral con nueva alta: <span style={{ color: "#F4C04A" }}>1</span>
          </span>
          <br />
          <span>
            Reprogramada (Falta confirmar hora): <span style={{ color: "#F4C04A" }}>1</span>
          </span>
          <span className={theme === "dark" ? "text-gray-500" : "text-gray-400"}>{" | "}</span>
          <span>
            Completa: <span style={{ color: "#17C787" }}>1</span>
          </span>
          <span className={theme === "dark" ? "text-gray-500" : "text-gray-400"}>{" | "}</span>
          <span>
            Mensaje enviado: <span style={{ color: "#1E88E5" }}>1</span>
          </span>
        </p>
      </div>

      {/* Table */}
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
                  "Fecha",
                  "Hora",
                  "Afiliado",
                  "Tel.",
                  "CUIL",
                  "O.S.Ant.",
                  "O.S.V.",
                  "Estado",
                  "Asesor",
                  "Sup.",
                  "Aud.",
                  "Admin.",
                  "¿Recuperada?",
                  "Migrada",
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
                const estadoStyle = estadoColors[item.estado] || estadoColors["Sin estado"]
                return (
                  <tr
                    key={item.id}
                    className={cn(
                      "border-t transition-colors",
                      theme === "dark" ? "border-white/5 hover:bg-white/5" : "border-gray-100 hover:bg-gray-50",
                    )}
                  >
                    <td
                      className={cn(
                        "px-3 py-3 whitespace-nowrap",
                        theme === "dark" ? "text-gray-300" : "text-gray-700",
                      )}
                    >
                      {item.fecha}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-3 whitespace-nowrap",
                        theme === "dark" ? "text-cyan-400" : "text-cyan-600",
                      )}
                    >
                      {item.hora}
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
                      {item.telefono}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-3 whitespace-nowrap",
                        theme === "dark" ? "text-gray-400" : "text-gray-600",
                      )}
                    >
                      {item.cuil}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "px-2 py-1 rounded text-xs font-medium",
                          theme === "dark" ? "bg-purple-500/20 text-purple-300" : "bg-purple-100 text-purple-700",
                        )}
                      >
                        {item.osAnterior}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "px-2 py-1 rounded text-xs font-medium",
                          item.osVendida === "Binimed"
                            ? theme === "dark"
                              ? "bg-green-500/20 text-green-300"
                              : "bg-green-100 text-green-700"
                            : theme === "dark"
                              ? "bg-pink-500/20 text-pink-300"
                              : "bg-pink-100 text-pink-700",
                        )}
                      >
                        {item.osVendida}
                      </span>
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
                    <td
                      className={cn(
                        "px-3 py-3 whitespace-nowrap",
                        theme === "dark" ? "text-gray-300" : "text-gray-700",
                      )}
                    >
                      {item.auditor}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-3 whitespace-nowrap",
                        theme === "dark" ? "text-gray-400" : "text-gray-600",
                      )}
                    >
                      {item.admin}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-3 whitespace-nowrap",
                        theme === "dark" ? "text-gray-400" : "text-gray-600",
                      )}
                    >
                      {item.recuperada}
                    </td>
                    <td className="px-3 py-3">
                      <div
                        className={cn(
                          "w-4 h-4 rounded-full flex items-center justify-center",
                          item.migrada
                            ? theme === "dark"
                              ? "bg-green-500/20"
                              : "bg-green-100"
                            : theme === "dark"
                              ? "bg-gray-500/20"
                              : "bg-gray-100",
                        )}
                      >
                        {item.migrada && (
                          <svg className="w-2.5 h-2.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(item)}
                          className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            theme === "dark"
                              ? "hover:bg-green-500/20 text-green-400"
                              : "hover:bg-green-50 text-green-600",
                          )}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            theme === "dark" ? "hover:bg-blue-500/20 text-blue-400" : "hover:bg-blue-50 text-blue-600",
                          )}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            theme === "dark" ? "hover:bg-red-500/20 text-red-400" : "hover:bg-red-50 text-red-600",
                          )}
                        >
                          <Trash2 className="w-4 h-4" />
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

      {editModalOpen && selectedAuditoria && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div
            className={cn(
              "w-full max-w-2xl rounded-2xl border shadow-xl my-8",
              theme === "dark" ? "bg-[#1a1333] border-white/10" : "bg-white border-gray-200",
            )}
          >
            {/* Modal Header */}
            <div
              className="flex items-center justify-between p-6 border-b"
              style={{ borderColor: theme === "dark" ? "rgba(255,255,255,0.1)" : "#e5e7eb" }}
            >
              <h3 className={cn("text-xl font-semibold", theme === "dark" ? "text-white" : "text-gray-800")}>
                Editar Auditoría
              </h3>
              <button
                onClick={() => setEditModalOpen(false)}
                className={cn(
                  "p-1 rounded-lg transition-colors",
                  theme === "dark" ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-500",
                )}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    className={cn(
                      "block text-sm font-medium mb-1",
                      theme === "dark" ? "text-gray-300" : "text-gray-700",
                    )}
                  >
                    Afiliado
                  </label>
                  <input
                    type="text"
                    defaultValue={selectedAuditoria.afiliado?.toUpperCase()}
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
                    Teléfono
                  </label>
                  <input
                    type="text"
                    defaultValue={selectedAuditoria.telefono}
                    className={cn(
                      "w-full px-3 py-2 rounded-lg border text-sm",
                      theme === "dark"
                        ? "bg-white/5 border-white/10 text-white"
                        : "bg-white border-gray-200 text-gray-800",
                    )}
                  />
                </div>
              </div>

              <div>
                <label
                  className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}
                >
                  CUIL
                </label>
                <input
                  type="text"
                  defaultValue={selectedAuditoria.cuil}
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
                    Obra Social Anterior
                  </label>
                  <select
                    defaultValue={selectedAuditoria.osAnterior}
                    className={cn(
                      "w-full px-3 py-2 rounded-lg border text-sm",
                      theme === "dark"
                        ? "bg-white/5 border-white/10 text-white"
                        : "bg-white border-gray-200 text-gray-800",
                    )}
                  >
                    <option>OSECAC (126205)</option>
                    <option>OSTCARA (126007)</option>
                    <option>Elevar (114307)</option>
                  </select>
                </div>
                <div>
                  <label
                    className={cn(
                      "block text-sm font-medium mb-1",
                      theme === "dark" ? "text-gray-300" : "text-gray-700",
                    )}
                  >
                    Obra Social Vendida
                  </label>
                  <select
                    defaultValue={selectedAuditoria.osVendida}
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    className={cn(
                      "block text-sm font-medium mb-1",
                      theme === "dark" ? "text-gray-300" : "text-gray-700",
                    )}
                  >
                    Estado
                  </label>
                  <select
                    defaultValue={selectedAuditoria.estado}
                    className={cn(
                      "w-full px-3 py-2 rounded-lg border text-sm",
                      theme === "dark"
                        ? "bg-white/5 border-white/10 text-white"
                        : "bg-white border-gray-200 text-gray-800",
                    )}
                  >
                    <option>No atendió</option>
                    <option>QR hecho</option>
                    <option>Reprogramada</option>
                    <option>Sin estado</option>
                    <option>Mensaje enviado</option>
                  </select>
                </div>
                <div>
                  <label
                    className={cn(
                      "block text-sm font-medium mb-1",
                      theme === "dark" ? "text-gray-300" : "text-gray-700",
                    )}
                  >
                    Tipo
                  </label>
                  <select
                    className={cn(
                      "w-full px-3 py-2 rounded-lg border text-sm",
                      theme === "dark"
                        ? "bg-white/5 border-white/10 text-white"
                        : "bg-white border-gray-200 text-gray-800",
                    )}
                  >
                    <option>Alta</option>
                    <option>Baja</option>
                  </select>
                </div>
              </div>

              {/* Historial de estado */}
              <div>
                <label
                  className={cn("block text-sm font-medium mb-2", theme === "dark" ? "text-gray-300" : "text-gray-700")}
                >
                  Historial de estado
                </label>
                <div
                  className={cn(
                    "rounded-lg border overflow-hidden",
                    theme === "dark" ? "border-white/10" : "border-gray-200",
                  )}
                >
                  <table className="w-full text-xs">
                    <thead>
                      <tr className={theme === "dark" ? "bg-white/5" : "bg-gray-50"}>
                        <th className={cn("px-3 py-2 text-left", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                          FECHA
                        </th>
                        <th className={cn("px-3 py-2 text-left", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                          USUARIO
                        </th>
                        <th className={cn("px-3 py-2 text-left", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                          ESTADO
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {historialEstado.map((h, i) => (
                        <tr key={i} className={cn("border-t", theme === "dark" ? "border-white/5" : "border-gray-100")}>
                          <td className={cn("px-3 py-2", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                            {h.fecha}
                          </td>
                          <td className={cn("px-3 py-2", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                            {h.usuario}
                          </td>
                          <td className={cn("px-3 py-2", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                            {h.estado}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Asesor, Grupo, Auditor, Admin */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label
                    className={cn(
                      "block text-sm font-medium mb-1",
                      theme === "dark" ? "text-gray-300" : "text-gray-700",
                    )}
                  >
                    Asesor
                  </label>
                  <select
                    defaultValue={selectedAuditoria.asesor}
                    className={cn(
                      "w-full px-3 py-2 rounded-lg border text-sm",
                      theme === "dark"
                        ? "bg-white/5 border-white/10 text-white"
                        : "bg-white border-gray-200 text-gray-800",
                    )}
                  >
                    <option>{selectedAuditoria.asesor}</option>
                  </select>
                </div>
                <div>
                  <label
                    className={cn(
                      "block text-sm font-medium mb-1",
                      theme === "dark" ? "text-gray-300" : "text-gray-700",
                    )}
                  >
                    Grupo
                  </label>
                  <select
                    className={cn(
                      "w-full px-3 py-2 rounded-lg border text-sm",
                      theme === "dark"
                        ? "bg-white/5 border-white/10 text-white"
                        : "bg-white border-gray-200 text-gray-800",
                    )}
                  >
                    <option>555</option>
                    <option>23</option>
                    <option>166</option>
                  </select>
                </div>
                <div>
                  <label
                    className={cn(
                      "block text-sm font-medium mb-1",
                      theme === "dark" ? "text-gray-300" : "text-gray-700",
                    )}
                  >
                    Auditor
                  </label>
                  <select
                    defaultValue={selectedAuditoria.auditor}
                    className={cn(
                      "w-full px-3 py-2 rounded-lg border text-sm",
                      theme === "dark"
                        ? "bg-white/5 border-white/10 text-white"
                        : "bg-white border-gray-200 text-gray-800",
                    )}
                  >
                    <option>{selectedAuditoria.auditor} (auditor)</option>
                  </select>
                </div>
                <div>
                  <label
                    className={cn(
                      "block text-sm font-medium mb-1",
                      theme === "dark" ? "text-gray-300" : "text-gray-700",
                    )}
                  >
                    Administrador
                  </label>
                  <select
                    className={cn(
                      "w-full px-3 py-2 rounded-lg border text-sm",
                      theme === "dark"
                        ? "bg-white/5 border-white/10 text-white"
                        : "bg-white border-gray-200 text-gray-800",
                    )}
                  >
                    <option>Seleccione</option>
                    <option>{selectedAuditoria.admin}</option>
                  </select>
                </div>
              </div>

              {/* Fecha y Hora */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    className={cn(
                      "block text-sm font-medium mb-1",
                      theme === "dark" ? "text-gray-300" : "text-gray-700",
                    )}
                  >
                    Fecha (día)
                  </label>
                  <input
                    type="date"
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
                    Hora (turno)
                  </label>
                  <select
                    defaultValue={selectedAuditoria.hora}
                    className={cn(
                      "w-full px-3 py-2 rounded-lg border text-sm",
                      theme === "dark"
                        ? "bg-white/5 border-white/10 text-white"
                        : "bg-white border-gray-200 text-gray-800",
                    )}
                  >
                    <option>10:00</option>
                    <option>10:20</option>
                    <option>10:25</option>
                    <option>10:59</option>
                    <option>11:00</option>
                  </select>
                </div>
              </div>

              {/* Reprogramar checkbox */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded" />
                <span style={{ color: "#17C787" }} className="text-sm">
                  Reprogramar turno (habilita edición de fecha y hora)
                </span>
              </label>

              {/* Datos extra */}
              <div>
                <label
                  className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}
                >
                  Datos extra
                </label>
                <textarea
                  rows={3}
                  defaultValue="INGRESA SOLA"
                  className={cn(
                    "w-full px-3 py-2 rounded-lg border text-sm resize-none",
                    theme === "dark"
                      ? "bg-white/5 border-white/10 text-white"
                      : "bg-white border-gray-200 text-gray-800",
                  )}
                />
              </div>

              {/* Historial de comentarios */}
              <div>
                <label
                  className={cn("block text-sm font-medium mb-2", theme === "dark" ? "text-gray-300" : "text-gray-700")}
                >
                  Historial de comentarios
                </label>
                <div
                  className={cn(
                    "rounded-lg border overflow-hidden",
                    theme === "dark" ? "border-white/10" : "border-gray-200",
                  )}
                >
                  <table className="w-full text-xs">
                    <thead>
                      <tr className={theme === "dark" ? "bg-white/5" : "bg-gray-50"}>
                        <th className={cn("px-3 py-2 text-left", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                          FECHA
                        </th>
                        <th className={cn("px-3 py-2 text-left", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                          USUARIO
                        </th>
                        <th className={cn("px-3 py-2 text-left", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                          COMENTARIO
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {historialComentarios.map((h, i) => (
                        <tr key={i} className={cn("border-t", theme === "dark" ? "border-white/5" : "border-gray-100")}>
                          <td className={cn("px-3 py-2", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                            {h.fecha}
                          </td>
                          <td className={cn("px-3 py-2", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                            {h.usuario}
                          </td>
                          <td className={cn("px-3 py-2", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                            {h.comentario}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recuperada checkbox */}
              <div className="flex items-center gap-4">
                <span className={cn("text-sm font-medium", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                  ¿Recuperada?
                </span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded" />
                  <span className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}>No</span>
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              className="flex justify-end gap-3 p-6 border-t"
              style={{ borderColor: theme === "dark" ? "rgba(255,255,255,0.1)" : "#e5e7eb" }}
            >
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
                style={{ backgroundColor: "#1E88E5" }}
              >
                💾 Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
