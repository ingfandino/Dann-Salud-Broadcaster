"use client"

import { useState } from "react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import { Power, Pencil, Trash2, ChevronLeft, ChevronRight, X, Eye, EyeOff, RefreshCw, Users } from "lucide-react"

interface Usuario {
  id: number
  nombre: string
  email: string
  rol: string
  grupo: number | string
  estado: "Activo" | "Inactivo"
}

const rolColors: Record<string, string> = {
  Asesor: "#1E88E5",
  Supervisor: "#17C787",
  Auditor: "#F4C04A",
  Admin: "#C62FA8",
  Revendedor: "#0E6FFF",
  Gerencia: "#C8376B",
  "RR.HH.": "#6B7280",
}

const mockUsuarios: Usuario[] = [
  { id: 1, nombre: "Ignacio Vera", email: "ignaciovera2000@gmail.com", rol: "Asesor", grupo: 23, estado: "Activo" },
  { id: 2, nombre: "Micaela Cordoba", email: "mc5069914@gmail.com", rol: "Asesor", grupo: 166, estado: "Activo" },
  { id: 3, nombre: "Ledezma Santiago", email: "ledezmasanti4@gmail.com", rol: "Asesor", grupo: 879, estado: "Activo" },
  { id: 4, nombre: "Thiago", email: "centersalud24@gmail.com", rol: "Asesor", grupo: 578, estado: "Activo" },
  { id: 5, nombre: "Nahiara Diaz", email: "nahiaraanabella0805@gmail.com", rol: "Asesor", grupo: 23, estado: "Activo" },
  { id: 6, nombre: "Maximiliano Paredes", email: "trio.dtv@gmail.com", rol: "Asesor", grupo: 999, estado: "Activo" },
  {
    id: 7,
    nombre: "Gerardo Lencina",
    email: "gerardocarreralencina@gmail.com",
    rol: "RR.HH.",
    grupo: "-",
    estado: "Activo",
  },
  {
    id: 8,
    nombre: "Candela Cosentino",
    email: "candelacosentino456@gmail.com",
    rol: "Asesor",
    grupo: 23,
    estado: "Inactivo",
  },
  { id: 9, nombre: "Pablo Cabrera", email: "pabloalexisc75@gmail.com", rol: "Asesor", grupo: 999, estado: "Activo" },
  { id: 10, nombre: "Celeste Gil", email: "gilcantarutti704@gmail.com", rol: "Asesor", grupo: 166, estado: "Activo" },
]

const roles = ["Asesor", "Supervisor", "Auditor", "Admin", "Revendedor", "Gerencia", "RR.HH."]

export function GestionUsuarios() {
  const { theme } = useTheme()
  const [busqueda, setBusqueda] = useState("")
  const [filtroGrupo, setFiltroGrupo] = useState("")
  const [ordenFecha, setOrdenFecha] = useState("desc")
  const [currentPage, setCurrentPage] = useState(1)

  // Modal states
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [rolePopupOpen, setRolePopupOpen] = useState<number | null>(null)
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const openEditModal = (usuario: Usuario) => {
    setSelectedUsuario(usuario)
    setEditModalOpen(true)
  }

  const toggleRolePopup = (id: number) => {
    setRolePopupOpen(rolePopupOpen === id ? null : id)
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div
        className={cn(
          "rounded-2xl border p-6",
          theme === "dark"
            ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
            : "bg-white border-gray-200 shadow-sm",
        )}
      >
        <div className="flex items-center gap-3 mb-6">
          <Users className="w-6 h-6" style={{ color: "#1E88E5" }} />
          <h2 className={cn("text-xl font-semibold", theme === "dark" ? "text-white" : "text-gray-800")}>
            Gestión de Usuarios
          </h2>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className={cn(
                "w-full px-4 py-2 rounded-lg border text-sm",
                theme === "dark"
                  ? "bg-white/5 border-white/10 text-white placeholder-gray-500"
                  : "bg-white border-gray-200 text-gray-800 placeholder-gray-400",
              )}
            />
          </div>
          <button
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: "#1E88E5" }}
          >
            Buscar
          </button>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={filtroGrupo}
            onChange={(e) => setFiltroGrupo(e.target.value)}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm",
              theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
            )}
          >
            <option value="">Todos los grupos</option>
            <option value="23">Equipo 23</option>
            <option value="166">Equipo 166</option>
            <option value="999">Equipo 999</option>
          </select>
          <select
            className={cn(
              "px-3 py-2 rounded-lg border text-sm",
              theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
            )}
          >
            <option>Fecha creación</option>
          </select>
          <select
            value={ordenFecha}
            onChange={(e) => setOrdenFecha(e.target.value)}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm",
              theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
            )}
          >
            <option value="desc">Descendente</option>
            <option value="asc">Ascendente</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={theme === "dark" ? "bg-white/5" : "bg-gray-50"}>
                {["Nombre", "Email", "Rol", "Grupo", "Estado", "Acciones"].map((header) => (
                  <th
                    key={header}
                    className={cn(
                      "px-4 py-3 text-center font-semibold",
                      theme === "dark" ? "text-gray-300" : "text-gray-700",
                    )}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockUsuarios.map((usuario) => (
                <tr
                  key={usuario.id}
                  className={cn(
                    "border-t transition-colors",
                    theme === "dark" ? "border-white/5 hover:bg-white/5" : "border-gray-100 hover:bg-gray-50",
                  )}
                >
                  <td className={cn("px-4 py-3 text-center", theme === "dark" ? "text-cyan-400" : "text-cyan-600")}>
                    {usuario.nombre}
                  </td>
                  <td className={cn("px-4 py-3 text-center", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                    {usuario.email}
                  </td>
                  <td className="px-4 py-3 text-center relative">
                    <button
                      onClick={() => toggleRolePopup(usuario.id)}
                      className="px-3 py-1 rounded text-xs font-medium text-white cursor-pointer hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: rolColors[usuario.rol] || "#6B7280" }}
                    >
                      {usuario.rol}
                    </button>

                    {/* Role Change Popup */}
                    {rolePopupOpen === usuario.id && (
                      <div
                        className={cn(
                          "absolute top-full left-1/2 -translate-x-1/2 mt-2 z-20 rounded-lg border p-3 shadow-xl min-w-[160px]",
                          theme === "dark" ? "bg-[#1a1333] border-white/10" : "bg-white border-gray-200",
                        )}
                      >
                        <p
                          className={cn(
                            "text-xs mb-2 font-medium",
                            theme === "dark" ? "text-gray-400" : "text-gray-500",
                          )}
                        >
                          Cambiar rol a:
                        </p>
                        <div className="space-y-1">
                          {roles.map((rol) => (
                            <button
                              key={rol}
                              className={cn(
                                "w-full px-3 py-1.5 rounded text-xs font-medium text-left transition-colors",
                                usuario.rol === rol
                                  ? theme === "dark"
                                    ? "bg-white/10 text-white"
                                    : "bg-gray-100 text-gray-800"
                                  : theme === "dark"
                                    ? "hover:bg-white/5 text-gray-300"
                                    : "hover:bg-gray-50 text-gray-600",
                              )}
                            >
                              {rol}
                            </button>
                          ))}
                        </div>
                        <div
                          className="flex gap-2 mt-3 pt-2 border-t"
                          style={{ borderColor: theme === "dark" ? "rgba(255,255,255,0.1)" : "#e5e7eb" }}
                        >
                          <button
                            onClick={() => setRolePopupOpen(null)}
                            className={cn(
                              "flex-1 px-2 py-1 rounded text-xs font-medium transition-colors border",
                              theme === "dark"
                                ? "border-white/10 text-gray-400 hover:bg-white/5"
                                : "border-gray-200 text-gray-500 hover:bg-gray-50",
                            )}
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => setRolePopupOpen(null)}
                            className="flex-1 px-2 py-1 rounded text-xs font-medium text-white transition-colors"
                            style={{ backgroundColor: "#17C787" }}
                          >
                            Guardar
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className={cn("px-4 py-3 text-center", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                    {usuario.grupo}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className="text-xs font-medium"
                      style={{ color: usuario.estado === "Activo" ? "#17C787" : "#C8376B" }}
                    >
                      {usuario.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        className="p-1.5 rounded transition-colors text-white"
                        style={{ backgroundColor: "#F4C04A" }}
                        title="Activar/Desactivar"
                      >
                        <Power className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(usuario)}
                        className="p-1.5 rounded transition-colors text-white"
                        style={{ backgroundColor: "#17C787" }}
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        className="p-1.5 rounded transition-colors text-white"
                        style={{ backgroundColor: "#C8376B" }}
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border",
              theme === "dark"
                ? "border-white/10 text-gray-400 hover:bg-white/5"
                : "border-gray-200 text-gray-600 hover:bg-gray-50",
            )}
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </button>
          <span className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
            Página {currentPage} de 12
          </span>
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              theme === "dark"
                ? "bg-gray-700 text-white hover:bg-gray-600"
                : "bg-gray-800 text-white hover:bg-gray-700",
            )}
          >
            Siguiente
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Edit User Modal */}
      {editModalOpen && selectedUsuario && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className={cn(
              "w-full max-w-md rounded-2xl border p-6 shadow-xl",
              theme === "dark" ? "bg-[#1a1333] border-white/10" : "bg-white border-gray-200",
            )}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5" style={{ color: "#1E88E5" }} />
                <h3 className={cn("text-lg font-semibold", theme === "dark" ? "text-white" : "text-gray-800")}>
                  Editar usuario
                </h3>
              </div>
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

            <div className="space-y-4">
              <div>
                <label
                  className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}
                >
                  Nombre
                </label>
                <input
                  type="text"
                  defaultValue={selectedUsuario.nombre}
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
                  className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}
                >
                  Email
                </label>
                <input
                  type="email"
                  defaultValue={selectedUsuario.email}
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
                  className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}
                >
                  Contraseña actual
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    defaultValue="********"
                    className={cn(
                      "w-full px-3 py-2 rounded-lg border text-sm pr-10",
                      theme === "dark"
                        ? "bg-white/5 border-white/10 text-white"
                        : "bg-white border-gray-200 text-gray-800",
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={cn(
                      "absolute right-3 top-1/2 -translate-y-1/2",
                      theme === "dark" ? "text-gray-500" : "text-gray-400",
                    )}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className={cn("text-xs mt-1", theme === "dark" ? "text-orange-400" : "text-orange-500")}>
                  Por seguridad no se muestra la contraseña real (esta hasheada). Solo visible si guardas una temporal.
                </p>
              </div>

              <div>
                <label
                  className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}
                >
                  Nueva contraseña (opcional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Escribe una nueva contraseña (o deja vacío)"
                    className={cn(
                      "w-full px-3 py-2 rounded-lg border text-sm pr-10",
                      theme === "dark"
                        ? "bg-white/5 border-white/10 text-white placeholder-gray-500"
                        : "bg-white border-gray-200 text-gray-800 placeholder-gray-400",
                    )}
                  />
                  <button
                    type="button"
                    className={cn(
                      "absolute right-3 top-1/2 -translate-y-1/2",
                      theme === "dark" ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600",
                    )}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label
                  className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}
                >
                  Grupo
                </label>
                <input
                  type="text"
                  defaultValue={selectedUsuario.grupo}
                  className={cn(
                    "w-full px-3 py-2 rounded-lg border text-sm",
                    theme === "dark"
                      ? "bg-white/5 border-white/10 text-white"
                      : "bg-white border-gray-200 text-gray-800",
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors text-white"
                style={{ backgroundColor: "#1E88E5" }}
              >
                Cancelar
              </button>
              <button
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: "#17C787" }}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
