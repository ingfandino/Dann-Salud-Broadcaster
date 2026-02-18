/**
 * ============================================================
 * GESTIÓN DE USUARIOS (gestion-usuarios.tsx)
 * ============================================================
 * Panel de administración de usuarios del sistema.
 * Permite crear, editar, eliminar y cambiar roles.
 */

"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import { Power, Pencil, Trash2, ChevronLeft, ChevronRight, X, Eye, EyeOff, RefreshCw, Users, Plus, Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"

interface Usuario {
  _id: string
  nombre: string
  email: string
  role: string
  numeroEquipo?: string
  active: boolean
}

const rolColors: Record<string, string> = {
  asesor: "#1E88E5",
  supervisor: "#17C787",
  auditor: "#F4C04A",
  administrativo: "#9C27B0",
  gerencia: "#C8376B",
  "rr.hh": "#607D8B",
  recuperador: "#FF5722",
  encargado: "#19803bff",
  independiente: "#00ACC1",
}



const roles = ["asesor", "supervisor", "auditor", "administrativo", "gerencia", "RR.HH", "recuperador", "encargado", "independiente"]

export function GestionUsuarios() {
  const { theme } = useTheme()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [filtroGrupo, setFiltroGrupo] = useState("")
  const [ordenFecha, setOrdenFecha] = useState("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  /* Estados de modales */
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [rolePopupOpen, setRolePopupOpen] = useState<string | null>(null)
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  /* Estados del formulario */
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    password: "",
    role: "asesor",
    numeroEquipo: ""
  })

  useEffect(() => {
    fetchUsuarios()
  }, [])

  const fetchUsuarios = async () => {
    try {
      setLoading(true)
      const response = await api.users.list()
      console.log("Usuarios fetched:", response.data) // Debug log
      setUsuarios(response.data)
    } catch (error) {
      console.error("Error fetching users:", error)
      toast.error("Error al cargar usuarios")
    } finally {
      setLoading(false)
    }
  }

  // ... (rest of code)

  const handleCreate = async () => {
    try {
      await api.users.create(formData)
      toast.success("Usuario creado correctamente")
      setCreateModalOpen(false)
      fetchUsuarios()
      resetForm()
    } catch (error: any) {
      console.error("Error creating user:", error)
      toast.error(error.response?.data?.message || "Error al crear usuario")
    }
  }

  const handleUpdate = async () => {
    if (!selectedUsuario) return
    try {
      const updateData: any = {
        nombre: formData.nombre,
        email: formData.email,
        role: formData.role
      }

      // Solo enviar numeroEquipo si tiene valor
      if (formData.numeroEquipo && formData.numeroEquipo.trim() !== "") {
        updateData.numeroEquipo = formData.numeroEquipo
      }

      // Solo enviar password si no está vacío
      if (formData.password && formData.password.trim() !== "") {
        updateData.password = formData.password
      }

      await api.users.update(selectedUsuario._id, updateData)

      toast.success("Usuario actualizado correctamente")
      setEditModalOpen(false)
      fetchUsuarios()
    } catch (error: any) {
      console.error("Error updating user:", error)
      toast.error(error.response?.data?.error || error.response?.data?.message || "Error al actualizar usuario")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este usuario?")) return
    try {
      await api.users.delete(id)
      toast.success("Usuario eliminado correctamente")
      fetchUsuarios()
    } catch (error: any) {
      console.error("Error deleting user:", error)
      toast.error(error.response?.data?.message || "Error al eliminar usuario")
    }
  }

  const handleToggleActive = async (usuario: Usuario) => {
    try {
      await api.users.update(usuario._id, { active: !usuario.active })
      toast.success(`Usuario ${usuario.active ? 'desactivado' : 'activado'} correctamente`)
      fetchUsuarios()
    } catch (error: any) {
      console.error("Error toggling user status:", error)
      toast.error("Error al cambiar estado del usuario")
    }
  }

  const handleRoleChange = async (usuario: Usuario, newRole: string) => {
    try {
      await api.users.update(usuario._id, { role: newRole })
      toast.success("Rol actualizado correctamente")
      setRolePopupOpen(null)
      fetchUsuarios()
    } catch (error: any) {
      console.error("Error changing role:", error)
      toast.error("Error al cambiar rol")
    }
  }

  const openEditModal = (usuario: Usuario) => {
    setSelectedUsuario(usuario)
    setFormData({
      nombre: usuario.nombre,
      email: usuario.email,
      password: "",
      role: usuario.role,
      numeroEquipo: usuario.numeroEquipo || ""
    })
    setEditModalOpen(true)
  }

  const openCreateModal = () => {
    resetForm()
    setCreateModalOpen(true)
  }

  const resetForm = () => {
    setFormData({
      nombre: "",
      email: "",
      password: "",
      role: "asesor",
      numeroEquipo: ""
    })
    setSelectedUsuario(null)
  }

  const toggleRolePopup = (id: string) => {
    setRolePopupOpen(rolePopupOpen === id ? null : id)
  }

  // Filtering
  const filteredUsuarios = usuarios.filter(user => {
    const matchesSearch =
      user.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      user.email.toLowerCase().includes(busqueda.toLowerCase())

    const matchesGroup = filtroGrupo ? user.numeroEquipo === filtroGrupo : true

    return matchesSearch && matchesGroup
  })

  // Pagination
  const totalPages = Math.ceil(filteredUsuarios.length / itemsPerPage)
  const paginatedUsuarios = filteredUsuarios.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const uniqueGroups = Array.from(new Set(usuarios.map(u => u.numeroEquipo).filter(Boolean))).sort()

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Encabezado con título y botón crear */}
      <div
        className={cn(
          "rounded-2xl border p-6",
          theme === "dark"
            ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
            : "bg-white border-gray-200 shadow-sm",
        )}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6" style={{ color: "#1E88E5" }} />
            <h2 className={cn("text-xl font-semibold", theme === "dark" ? "text-white" : "text-gray-800")}>
              Gestión de Usuarios
            </h2>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: "#17C787" }}
          >
            <Plus className="w-4 h-4" />
            Nuevo Usuario
          </button>
        </div>

        {/* Búsqueda y filtros */}
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
            {uniqueGroups.map(grupo => (
              <option key={grupo} value={grupo}>Equipo {grupo}</option>
            ))}
          </select>
        </div>

        {/* Tabla de usuarios */}
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
              {paginatedUsuarios.map((usuario) => (
                <tr
                  key={usuario._id}
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
                      onClick={() => toggleRolePopup(usuario._id)}
                      className="px-3 py-1 rounded text-xs font-medium text-white cursor-pointer hover:opacity-80 transition-opacity capitalize"
                      style={{ backgroundColor: rolColors[usuario.role?.toLowerCase()] || "#6B7280" }}
                    >
                      {usuario.role}
                    </button>

                    {/* Modal de cambio de rol (Portal) */}
                    {rolePopupOpen === usuario._id && typeof window !== 'undefined' && createPortal(
                      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                        <div
                          className={cn(
                            "w-full max-w-xs rounded-xl border p-4 shadow-2xl",
                            theme === "dark" ? "bg-[#1a1333] border-white/10" : "bg-white border-gray-200",
                          )}
                        >
                          <h4 className={cn("text-sm font-semibold mb-3", theme === "dark" ? "text-white" : "text-gray-800")}>
                            Cambiar rol de {usuario.nombre}
                          </h4>

                          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                            {roles.map((rol) => (
                              <button
                                key={rol}
                                onClick={() => handleRoleChange(usuario, rol)}
                                className={cn(
                                  "w-full px-3 py-2 rounded-lg text-sm font-medium text-left transition-colors capitalize flex items-center justify-between",
                                  usuario.role === rol
                                    ? theme === "dark"
                                      ? "bg-white/10 text-white"
                                      : "bg-gray-100 text-gray-800"
                                    : theme === "dark"
                                      ? "hover:bg-white/5 text-gray-300"
                                      : "hover:bg-gray-50 text-gray-600",
                                )}
                              >
                                {rol}
                                {usuario.role === rol && (
                                  <div className="w-2 h-2 rounded-full bg-green-500" />
                                )}
                              </button>
                            ))}
                          </div>

                          <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-white/10">
                            <button
                              onClick={() => setRolePopupOpen(null)}
                              className={cn(
                                "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors border",
                                theme === "dark"
                                  ? "border-white/10 text-gray-400 hover:bg-white/5"
                                  : "border-gray-200 text-gray-500 hover:bg-gray-50",
                              )}
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      </div>,
                      document.body
                    )}
                  </td>
                  <td className={cn("px-4 py-3 text-center", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                    {usuario.numeroEquipo || "-"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className="text-xs font-medium"
                      style={{ color: usuario.active ? "#17C787" : "#C8376B" }}
                    >
                      {usuario.active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleToggleActive(usuario)}
                        className="p-1.5 rounded transition-colors text-white"
                        style={{ backgroundColor: "#F4C04A" }}
                        title={usuario.active ? "Desactivar" : "Activar"}
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
                        onClick={() => handleDelete(usuario._id)}
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

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border disabled:opacity-50",
                theme === "dark"
                  ? "border-white/10 text-gray-400 hover:bg-white/5"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50",
              )}
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </button>
            <span className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50",
                theme === "dark"
                  ? "bg-gray-700 text-white hover:bg-gray-600"
                  : "bg-gray-800 text-white hover:bg-gray-700",
              )}
            >
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Modal de edición/creación de usuario */}
      {(editModalOpen || createModalOpen) && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className={cn(
              "w-full max-w-md rounded-2xl border p-6 shadow-xl max-h-[85vh] overflow-y-auto",
              theme === "dark" ? "bg-[#1a1333] border-white/10" : "bg-white border-gray-200",
            )}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5" style={{ color: "#1E88E5" }} />
                <h3 className={cn("text-lg font-semibold", theme === "dark" ? "text-white" : "text-gray-800")}>
                  {createModalOpen ? "Nuevo usuario" : "Editar usuario"}
                </h3>
              </div>
              <button
                onClick={() => {
                  setEditModalOpen(false)
                  setCreateModalOpen(false)
                }}
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
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
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
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                  {createModalOpen ? "Contraseña" : "Nueva contraseña (opcional)"}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={createModalOpen ? "********" : "Dejar vacío para mantener actual"}
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
              </div>

              <div>
                <label
                  className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}
                >
                  Rol
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className={cn(
                    "w-full px-3 py-2 rounded-lg border text-sm capitalize",
                    theme === "dark"
                      ? "bg-white/5 border-white/10 text-white"
                      : "bg-white border-gray-200 text-gray-800",
                  )}
                >
                  {roles.map(rol => (
                    <option key={rol} value={rol}>{rol}</option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}
                >
                  Grupo (opcional)
                </label>
                <input
                  type="text"
                  value={formData.numeroEquipo}
                  onChange={(e) => setFormData({ ...formData, numeroEquipo: e.target.value })}
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
                onClick={() => {
                  setEditModalOpen(false)
                  setCreateModalOpen(false)
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors text-white"
                style={{ backgroundColor: "#1E88E5" }}
              >
                Cancelar
              </button>
              <button
                onClick={createModalOpen ? handleCreate : handleUpdate}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: "#17C787" }}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
