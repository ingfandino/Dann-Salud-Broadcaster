"use client"

import { useState, useEffect } from "react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import {
  Users,
  UserCheck,
  UserX,
  FileText,
  Briefcase,
  Search,
  Filter,
  Pencil,
  CheckCircle,
  XCircle,
  X,
  RefreshCw,
  Trash2,
  ImageIcon,
  Download,
  Upload
} from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth"

interface Employee {
  _id: string
  userId: {
    _id: string
    nombre: string
    email: string
    role: string
    numeroEquipo?: string
    active: boolean
  }
  nombreCompleto: string
  telefonoPersonal: string
  fechaEntrevista?: string
  fechaIngreso: string
  fechaBaja?: string
  motivoBaja?: string
  cargo: string
  numeroEquipo: string
  firmoContrato: boolean
  activo: boolean
  fotoDNI?: string
  notas?: string
}

const cargoColors: Record<string, string> = {
  supervisor: "#17C787",
  auditor: "#1E88E5",
  asesor: "#F4C04A",
  admin: "#C62FA8",
  rrhh: "#C8376B",
  gerencia: "#7C3AED"
}

export function RRHHInactivos() {
  const { theme } = useTheme()
  const { user } = useAuth()
  const canEdit = ['rrhh', 'rr.hh', 'gerencia'].includes(user?.role?.toLowerCase() || '');
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [filtroEquipo, setFiltroEquipo] = useState("")
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedEmpleado, setSelectedEmpleado] = useState<Employee | null>(null)
  const [saving, setSaving] = useState(false)

  // Edit form state
  const [editForm, setEditForm] = useState<Partial<Employee>>({})
  const [uploadingDNI, setUploadingDNI] = useState(false)
  const [newDNIFile, setNewDNIFile] = useState<File | null>(null)

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      const response = await api.employees.list()
      // Filter only inactive employees
      const inactiveEmployees = response.data.filter((e: Employee) => !e.activo)
      setEmployees(inactiveEmployees)
    } catch (error) {
      console.error("Error fetching employees:", error)
      toast.error("Error al cargar empleados")
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (empleado: Employee) => {
    setSelectedEmpleado(empleado)
    setEditForm({
      nombreCompleto: empleado.nombreCompleto,
      telefonoPersonal: empleado.telefonoPersonal,
      fechaEntrevista: empleado.fechaEntrevista,
      fechaIngreso: empleado.fechaIngreso ? new Date(empleado.fechaIngreso).toISOString().split('T')[0] : '',
      firmoContrato: empleado.firmoContrato,
      activo: empleado.activo,
      notas: empleado.notas,
      motivoBaja: empleado.motivoBaja
    })
    setEditModalOpen(true)
  }

  const handleSave = async () => {
    if (!selectedEmpleado) return

    try {
      setSaving(true)

      let fotoDNIPath = editForm.fotoDNI || selectedEmpleado.fotoDNI || ""

      if (newDNIFile) {
        setUploadingDNI(true)
        try {
          const uploadRes = await api.employees.uploadDNI(newDNIFile)
          fotoDNIPath = uploadRes.data.fotoDNI || ""
        } catch (uploadError: any) {
          console.error("Error uploading DNI:", uploadError)
          toast.error(uploadError.response?.data?.message || "Error al subir foto de DNI")
          setUploadingDNI(false)
          setSaving(false)
          return
        }
        setUploadingDNI(false)
      }

      await api.employees.update(selectedEmpleado._id, { ...editForm, fotoDNI: fotoDNIPath })
      toast.success("Empleado actualizado correctamente")

      // If reactivated
      if (!selectedEmpleado.activo && editForm.activo) {
        toast.success("Empleado reactivado. Recuerda reactivar el usuario manualmente si es necesario.")
      }

      setEditModalOpen(false)
      setNewDNIFile(null)
      fetchEmployees()
    } catch (error) {
      console.error("Error updating employee:", error)
      toast.error("Error al actualizar empleado")
    } finally {
      setSaving(false)
    }
  }

  const handleDNIFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("El archivo no puede superar 5MB")
        return
      }
      if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
        toast.error("Solo se permiten archivos JPG y PNG")
        return
      }
      setNewDNIFile(file)
    }
  }

  const getDNIUrl = (path: string) => {
    if (!path) return null
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''
    return `${apiUrl}${path}`
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar DEFINITIVAMENTE este empleado? Esta acción no se puede deshacer.")) return

    try {
      await api.employees.delete(id)
      toast.success("Empleado eliminado permanentemente")
      fetchEmployees()
    } catch (error) {
      console.error("Error deleting employee:", error)
      toast.error("Error al eliminar empleado")
    }
  }

  // Filter logic
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch =
      emp.nombreCompleto.toLowerCase().includes(busqueda.toLowerCase()) ||
      emp.userId?.email.toLowerCase().includes(busqueda.toLowerCase()) ||
      emp.userId?.nombre.toLowerCase().includes(busqueda.toLowerCase())

    const matchesTeam = filtroEquipo ? emp.numeroEquipo === filtroEquipo : true

    return matchesSearch && matchesTeam
  })

  // Group by team
  const employeesByTeam = filteredEmployees.reduce((acc, emp) => {
    const team = emp.numeroEquipo || "Sin Equipo"
    if (!acc[team]) acc[team] = []
    acc[team].push(emp)
    return acc
  }, {} as Record<string, Employee[]>)

  // Stats
  const totalInactive = employees.length

  const statsCards = [
    { label: "Total Inactivos", value: totalInactive, icon: UserX, color: "#C8376B" },
  ]

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Tarjetas de estadísticas */}
      <div className="flex flex-wrap gap-3">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div
              key={index}
              className={cn(
                "flex-1 min-w-[140px] rounded-xl border p-4 flex items-center justify-between",
                theme === "dark"
                  ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
                  : "bg-white border-gray-200 shadow-sm",
              )}
            >
              <div>
                <p className={cn("text-xs", theme === "dark" ? "text-gray-400" : "text-gray-500")}>{stat.label}</p>
                <p className="text-2xl font-bold" style={{ color: stat.color }}>
                  {stat.value}
                </p>
              </div>
              <Icon className="w-6 h-6" style={{ color: stat.color }} />
            </div>
          )
        })}
      </div>

      {/* Lista de empleados inactivos */}
      <div
        className={cn(
          "rounded-2xl border p-6",
          theme === "dark"
            ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
            : "bg-white border-gray-200 shadow-sm",
        )}
      >
        {/* Indicador de estado */}
        <div
          className={cn(
            "flex items-center gap-2 mb-4 px-3 py-2 rounded-lg w-fit",
            theme === "dark" ? "bg-[#C8376B]/10" : "bg-[#C8376B]/10",
          )}
        >
          <XCircle className="w-4 h-4" style={{ color: "#C8376B" }} />
          <span className="text-sm" style={{ color: "#C8376B" }}>
            Mostrando solo personal inactivo
          </span>
        </div>

        {/* Barra de búsqueda y filtros */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search
              className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4",
                theme === "dark" ? "text-gray-500" : "text-gray-400",
              )}
            />
            <input
              type="text"
              placeholder="Buscar por nombre, email..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className={cn(
                "w-full pl-10 pr-4 py-2 rounded-lg border text-sm",
                theme === "dark"
                  ? "bg-white/5 border-white/10 text-white placeholder-gray-500"
                  : "bg-white border-gray-200 text-gray-800 placeholder-gray-400",
              )}
            />
          </div>
          <select
            value={filtroEquipo}
            onChange={(e) => setFiltroEquipo(e.target.value)}
            className={cn(
              "px-4 py-2 rounded-lg border text-sm min-w-[180px]",
              theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
            )}
          >
            <option value="">Todos los equipos</option>
            {Object.keys(employeesByTeam).sort().map(team => (
              <option key={team} value={team}>Equipo {team}</option>
            ))}
          </select>
        </div>

        {/* Estado de carga */}
        {loading && (
          <div className="flex justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        )}

        {/* Estado vacío */}
        {!loading && employees.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No hay empleados inactivos registrados.
          </div>
        )}

        {/* Tablas agrupadas por equipo */}
        {!loading && Object.entries(employeesByTeam).map(([team, teamEmployees]) => (
          <div key={team} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4" style={{ color: "#1E88E5" }} />
              <h3 className={cn("font-semibold", theme === "dark" ? "text-white" : "text-gray-800")}>
                Equipo {team}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={theme === "dark" ? "bg-white/5" : "bg-gray-50"}>
                    {[
                      "NOMBRE",
                      "F. BAJA",
                      "MOTIVO",
                      "CARGO",
                      "TELÉFONO",
                      "CONTRATO",
                      "ACTIVO",
                      "ACCIONES",
                    ].map((header) => (
                      <th
                        key={header}
                        className={cn(
                          "px-3 py-2 text-left font-semibold text-xs",
                          theme === "dark" ? "text-gray-400" : "text-gray-600",
                        )}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {teamEmployees.map((emp) => (
                    <tr
                      key={emp._id}
                      className={cn(
                        "border-t transition-colors",
                        theme === "dark" ? "border-white/5 hover:bg-white/5" : "border-gray-100 hover:bg-gray-50",
                      )}
                    >
                      <td className="px-3 py-3">
                        <div>
                          <p className={cn("font-medium", theme === "dark" ? "text-white" : "text-gray-800")}>
                            {emp.nombreCompleto}
                          </p>
                          <p className={cn("text-xs", theme === "dark" ? "text-gray-500" : "text-gray-500")}>
                            {emp.userId?.email}
                          </p>
                        </div>
                      </td>
                      <td className={cn("px-3 py-3", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                        {emp.fechaBaja ? new Date(emp.fechaBaja).toLocaleDateString() : "-"}
                      </td>
                      <td className={cn("px-3 py-3 max-w-[150px] truncate", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                        {emp.motivoBaja || "-"}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className="px-2 py-1 rounded text-xs font-medium text-white capitalize"
                          style={{ backgroundColor: cargoColors[emp.cargo] || "#6B7280" }}
                        >
                          {emp.cargo}
                        </span>
                      </td>
                      <td className={cn("px-3 py-3", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                        {emp.telefonoPersonal || "-"}
                      </td>
                      <td className="px-3 py-3">
                        {emp.firmoContrato ? (
                          <CheckCircle className="w-5 h-5" style={{ color: "#17C787" }} />
                        ) : (
                          <XCircle className="w-5 h-5" style={{ color: "#C8376B" }} />
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className="px-2 py-0.5 rounded text-xs font-medium text-white"
                          style={{ backgroundColor: "#C8376B" }}
                        >
                          No
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          {canEdit && (
                            <>
                              <button
                                onClick={() => handleEdit(emp)}
                                className={cn(
                                  "p-1 rounded hover:bg-white/10 transition-colors",
                                  theme === "dark" ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-700",
                                )}
                                title="Editar"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>

                              <button
                                onClick={async () => {
                                  if (!confirm(`¿Estás seguro de reactivar a ${emp.nombreCompleto}? Esto también reactivará su usuario.`)) return;
                                  try {
                                    await api.employees.update(emp._id, { activo: true });
                                    toast.success("Empleado y usuario reactivados correctamente");
                                    fetchEmployees();
                                  } catch (error) {
                                    console.error("Error reactivating employee:", error);
                                    toast.error("Error al reactivar empleado");
                                  }
                                }}
                                className="p-1 rounded hover:bg-green-500/10 text-green-400 hover:text-green-500 transition-colors"
                                title="Reactivar"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleDelete(emp._id)}
                                className="p-1 rounded hover:bg-red-500/10 text-red-400 hover:text-red-500 transition-colors"
                                title="Eliminar Definitivamente"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {editModalOpen && selectedEmpleado && (
        <Portal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div
              className={cn(
                "w-full max-w-lg rounded-2xl border p-6 shadow-xl flex flex-col max-h-[90vh]",
                theme === "dark" ? "bg-[#1a1333] border-white/10" : "bg-white border-gray-200",
              )}
            >
              <div className="flex items-center justify-between mb-6 flex-shrink-0">
                <h3 className={cn("text-xl font-semibold", theme === "dark" ? "text-white" : "text-gray-800")}>
                  Editar Empleado
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

              <div className="space-y-4 overflow-y-auto flex-1 pr-2">
                <div>
                  <label
                    className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}
                  >
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    value={editForm.nombreCompleto}
                    onChange={(e) => setEditForm({ ...editForm, nombreCompleto: e.target.value })}
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
                      Teléfono Personal
                    </label>
                    <input
                      type="text"
                      value={editForm.telefonoPersonal}
                      onChange={(e) => setEditForm({ ...editForm, telefonoPersonal: e.target.value })}
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
                      Cargo
                    </label>
                    <input
                      type="text"
                      defaultValue={selectedEmpleado.cargo}
                      disabled
                      className={cn(
                        "w-full px-3 py-2 rounded-lg border text-sm capitalize",
                        theme === "dark"
                          ? "bg-white/10 border-white/10 text-gray-400"
                          : "bg-gray-100 border-gray-200 text-gray-500",
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
                      Fecha de Entrevista
                    </label>
                    <input
                      type="date"
                      value={editForm.fechaEntrevista ? new Date(editForm.fechaEntrevista).toISOString().split('T')[0] : ''}
                      onChange={(e) => setEditForm({ ...editForm, fechaEntrevista: e.target.value })}
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
                      Fecha de Ingreso
                    </label>
                    <input
                      type="date"
                      value={editForm.fechaIngreso}
                      onChange={(e) => setEditForm({ ...editForm, fechaIngreso: e.target.value })}
                      className={cn(
                        "w-full px-3 py-2 rounded-lg border text-sm",
                        theme === "dark"
                          ? "bg-white/5 border-white/10 text-white"
                          : "bg-white border-gray-200 text-gray-800",
                      )}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.firmoContrato}
                      onChange={(e) => setEditForm({ ...editForm, firmoContrato: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-[#17C787] focus:ring-[#17C787]"
                    />
                    <span className={cn("text-sm", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                      ¿Firmó el contrato?
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.activo}
                      onChange={(e) => setEditForm({ ...editForm, activo: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-[#17C787] focus:ring-[#17C787]"
                    />
                    <span className={cn("text-sm", theme === "dark" ? "text-gray-300" : "text-gray-700")}>¿Activo?</span>
                  </label>
                </div>

                <div>
                  <label
                    className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}
                  >
                    Motivo de Baja
                  </label>
                  <textarea
                    rows={2}
                    value={editForm.motivoBaja || ""}
                    onChange={(e) => setEditForm({ ...editForm, motivoBaja: e.target.value })}
                    className={cn(
                      "w-full px-3 py-2 rounded-lg border text-sm resize-none",
                      theme === "dark"
                        ? "bg-white/5 border-white/10 text-white placeholder-gray-500"
                        : "bg-white border-gray-200 text-gray-800 placeholder-gray-400",
                    )}
                    placeholder="Razón de la baja..."
                  />
                </div>

                {/* Foto de DNI */}
                <div className={cn(
                  "p-4 rounded-lg border",
                  theme === "dark" ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200"
                )}>
                  <label className={cn(
                    "flex items-center gap-2 text-sm font-medium mb-3",
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  )}>
                    <ImageIcon className="w-4 h-4" style={{ color: "#F4C04A" }} />
                    Foto del DNI
                  </label>

                  {(selectedEmpleado.fotoDNI || newDNIFile) && (
                    <div className="mb-3">
                      <div className={cn(
                        "relative w-full max-w-[200px] aspect-[3/2] rounded-lg overflow-hidden border",
                        theme === "dark" ? "border-white/10" : "border-gray-200"
                      )}>
                        {newDNIFile ? (
                          <img
                            src={URL.createObjectURL(newDNIFile)}
                            alt="Vista previa DNI"
                            className="w-full h-full object-cover"
                          />
                        ) : selectedEmpleado.fotoDNI ? (
                          <img
                            src={getDNIUrl(selectedEmpleado.fotoDNI) || ''}
                            alt="Foto DNI"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        ) : null}
                      </div>
                      {newDNIFile && (
                        <p className={cn("text-xs mt-1", theme === "dark" ? "text-green-400" : "text-green-600")}>
                          ✅ Nueva imagen seleccionada: {newDNIFile.name}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {selectedEmpleado.fotoDNI && !newDNIFile && (
                      <a
                        href={getDNIUrl(selectedEmpleado.fotoDNI) || ''}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className={cn(
                          "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                          theme === "dark"
                            ? "bg-white/10 text-gray-300 hover:bg-white/20"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        )}
                      >
                        <Download className="w-3 h-3" />
                        Descargar
                      </a>
                    )}
                    <label className={cn(
                      "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors",
                      uploadingDNI ? "opacity-50 cursor-not-allowed" : "",
                      theme === "dark"
                        ? "bg-[#1E88E5]/20 text-[#1E88E5] hover:bg-[#1E88E5]/30"
                        : "bg-[#1E88E5]/10 text-[#1E88E5] hover:bg-[#1E88E5]/20"
                    )}>
                      <Upload className="w-3 h-3" />
                      {selectedEmpleado.fotoDNI || newDNIFile ? "Cambiar imagen" : "Subir imagen"}
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png"
                        onChange={handleDNIFileChange}
                        disabled={uploadingDNI}
                        className="hidden"
                      />
                    </label>
                    {newDNIFile && (
                      <button
                        onClick={() => setNewDNIFile(null)}
                        className={cn(
                          "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                          theme === "dark"
                            ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                            : "bg-red-100 text-red-600 hover:bg-red-200"
                        )}
                      >
                        <X className="w-3 h-3" />
                        Cancelar
                      </button>
                    )}
                  </div>
                  <p className={cn("text-xs mt-2", theme === "dark" ? "text-gray-500" : "text-gray-500")}>
                    Máximo 5MB. Formatos: JPG, PNG
                  </p>
                </div>

                <div>
                  <label
                    className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}
                  >
                    Notas
                  </label>
                  <textarea
                    rows={3}
                    value={editForm.notas}
                    onChange={(e) => setEditForm({ ...editForm, notas: e.target.value })}
                    className={cn(
                      "w-full px-3 py-2 rounded-lg border text-sm resize-none",
                      theme === "dark"
                        ? "bg-white/5 border-white/10 text-white placeholder-gray-500"
                        : "bg-white border-gray-200 text-gray-800 placeholder-gray-400",
                    )}
                    placeholder="Observaciones adicionales..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 flex-shrink-0">
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
                  onClick={handleSave}
                  disabled={saving}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-2",
                    saving ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"
                  )}
                  style={{ backgroundColor: "#17C787" }}
                >
                  {uploadingDNI ? "Subiendo DNI..." : saving ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  )
}

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted) return null

  const { createPortal } = require('react-dom')
  return createPortal(children, document.body)
}
