"use client"

import { useState } from "react"
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
  Trash2,
  CheckCircle,
  X,
} from "lucide-react"

const statsCards = [
  { label: "Total Empleados", value: 111, icon: Users, color: "#1E88E5" },
  { label: "Activos", value: 95, icon: UserCheck, color: "#17C787" },
  { label: "Inactivos", value: 16, icon: UserX, color: "#C8376B" },
  { label: "Con Contrato", value: 105, icon: FileText, color: "#F4C04A" },
  { label: "Cargos", value: 6, icon: Briefcase, color: "#C62FA8" },
]

const cargoColors: Record<string, string> = {
  supervisor: "#17C787",
  auditor: "#1E88E5",
  asesor: "#F4C04A",
  admin: "#C62FA8",
}

const empleadosPorEquipo = [
  {
    equipo: "117",
    empleados: [
      {
        id: 1,
        nombre: "Erika Cardozo",
        email: "erikacardozo@danfranms.com",
        fEntrevista: "-",
        fIngreso: "25/12/2024",
        cargo: "supervisor",
        telefono: "2255426153",
        contrato: true,
        activo: true,
      },
    ],
  },
  {
    equipo: "121",
    empleados: [
      {
        id: 2,
        nombre: "Facundo Tevez",
        email: "facundotevez@danfranms.com",
        fEntrevista: "-",
        fIngreso: "6/11/2025",
        cargo: "supervisor",
        telefono: "1167327917",
        contrato: true,
        activo: true,
      },
      {
        id: 3,
        nombre: "Benjamín Marco",
        email: "benjaminesquivel662@gmail.com",
        fEntrevista: "-",
        fIngreso: "6/7/2025",
        cargo: "auditor",
        telefono: "1151073398",
        contrato: true,
        activo: true,
      },
      {
        id: 4,
        nombre: "Tiziana Ayelen Requeijo",
        email: "tizianarequeijo5@gmail.com",
        fEntrevista: "-",
        fIngreso: "15/5/2025",
        cargo: "auditor",
        telefono: "1127069117",
        contrato: true,
        activo: true,
      },
      {
        id: 5,
        nombre: "Dayana Díaz",
        email: "dayanabinimed@gmail.com",
        fEntrevista: "-",
        fIngreso: "5/2/2025",
        cargo: "auditor",
        telefono: "1151560162",
        contrato: true,
        activo: true,
      },
      {
        id: 6,
        nombre: "Agustín Maya",
        email: "agustinmaya19324@gmail.com",
        fEntrevista: "-",
        fIngreso: "17/3/2025",
        cargo: "auditor",
        telefono: "1170154028",
        contrato: true,
        activo: true,
      },
      {
        id: 7,
        nombre: "Marcos Ferrer",
        email: "marcosferrerpajon@gmail.com",
        fEntrevista: "-",
        fIngreso: "15/2/2025",
        cargo: "asesor",
        telefono: "1149163394",
        contrato: true,
        activo: true,
      },
    ],
  },
]

export function RRHHActivos() {
  const { theme } = useTheme()
  const [busqueda, setBusqueda] = useState("")
  const [filtroEquipo, setFiltroEquipo] = useState("")
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedEmpleado, setSelectedEmpleado] = useState<any>(null)

  const openEditModal = (empleado: any) => {
    setSelectedEmpleado(empleado)
    setEditModalOpen(true)
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header con Stats */}
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

      {/* Lista de empleados activos */}
      <div
        className={cn(
          "rounded-2xl border p-6",
          theme === "dark"
            ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
            : "bg-white border-gray-200 shadow-sm",
        )}
      >
        {/* Indicador */}
        <div
          className={cn(
            "flex items-center gap-2 mb-4 px-3 py-2 rounded-lg w-fit",
            theme === "dark" ? "bg-[#17C787]/10" : "bg-[#17C787]/10",
          )}
        >
          <CheckCircle className="w-4 h-4" style={{ color: "#17C787" }} />
          <span className="text-sm" style={{ color: "#17C787" }}>
            Mostrando solo personal activo
          </span>
        </div>

        {/* Búsqueda y filtros */}
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
              placeholder="Buscar empleado..."
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
            <option value="117">Equipo 117</option>
            <option value="121">Equipo 121</option>
          </select>
        </div>

        {/* Tablas por equipo */}
        {empleadosPorEquipo.map((grupo) => (
          <div key={grupo.equipo} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4" style={{ color: "#1E88E5" }} />
              <h3 className={cn("font-semibold", theme === "dark" ? "text-white" : "text-gray-800")}>
                Equipo {grupo.equipo}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={theme === "dark" ? "bg-white/5" : "bg-gray-50"}>
                    {[
                      "NOMBRE",
                      "F. ENTREVISTA",
                      "F. INGRESO",
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
                  {grupo.empleados.map((emp) => (
                    <tr
                      key={emp.id}
                      className={cn(
                        "border-t transition-colors",
                        theme === "dark" ? "border-white/5 hover:bg-white/5" : "border-gray-100 hover:bg-gray-50",
                      )}
                    >
                      <td className="px-3 py-3">
                        <div>
                          <p className={cn("font-medium", theme === "dark" ? "text-white" : "text-gray-800")}>
                            {emp.nombre}
                          </p>
                          <p className={cn("text-xs", theme === "dark" ? "text-gray-500" : "text-gray-500")}>
                            {emp.email}
                          </p>
                        </div>
                      </td>
                      <td className={cn("px-3 py-3", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                        {emp.fEntrevista}
                      </td>
                      <td className={cn("px-3 py-3", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                        {emp.fIngreso}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className="px-2 py-1 rounded text-xs font-medium text-white"
                          style={{ backgroundColor: cargoColors[emp.cargo] || "#6B7280" }}
                        >
                          {emp.cargo}
                        </span>
                      </td>
                      <td className={cn("px-3 py-3", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                        {emp.telefono}
                      </td>
                      <td className="px-3 py-3">
                        <CheckCircle className="w-5 h-5" style={{ color: emp.contrato ? "#17C787" : "#C8376B" }} />
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-xs font-medium" style={{ color: "#17C787" }}>
                          Sí
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(emp)}
                            className={cn(
                              "p-1 rounded hover:bg-white/10 transition-colors",
                              theme === "dark" ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-700",
                            )}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button className="p-1 rounded hover:bg-red-500/10 text-red-400 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className={cn(
              "w-full max-w-lg rounded-2xl border p-6 shadow-xl",
              theme === "dark" ? "bg-[#1a1333] border-white/10" : "bg-white border-gray-200",
            )}
          >
            <div className="flex items-center justify-between mb-6">
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

            <div className="space-y-4">
              <div>
                <label
                  className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}
                >
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  defaultValue={selectedEmpleado.nombre}
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
                    defaultValue={selectedEmpleado.telefono}
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
                      "w-full px-3 py-2 rounded-lg border text-sm",
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
                    defaultValue={selectedEmpleado.fIngreso?.split("/").reverse().join("-")}
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
                  📷 Foto del DNI (.jpg, .png)
                </label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  className={cn(
                    "w-full px-3 py-2 rounded-lg border text-sm",
                    theme === "dark"
                      ? "bg-white/5 border-white/10 text-white file:bg-white/10 file:border-0 file:text-gray-300 file:mr-3 file:px-3 file:py-1 file:rounded"
                      : "bg-white border-gray-200 text-gray-800 file:bg-gray-100 file:border-0 file:text-gray-600 file:mr-3 file:px-3 file:py-1 file:rounded",
                  )}
                />
                <p className={cn("text-xs mt-1", theme === "dark" ? "text-gray-500" : "text-gray-400")}>
                  Seleccione una imagen del DNI (máximo 5MB)
                </p>
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked={selectedEmpleado.contrato}
                    className="w-4 h-4 rounded border-gray-300 text-[#17C787] focus:ring-[#17C787]"
                  />
                  <span className={cn("text-sm", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                    ¿Firmó el contrato?
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked={selectedEmpleado.activo}
                    className="w-4 h-4 rounded border-gray-300 text-[#17C787] focus:ring-[#17C787]"
                  />
                  <span className={cn("text-sm", theme === "dark" ? "text-gray-300" : "text-gray-700")}>¿Activo?</span>
                </label>
              </div>

              <div>
                <label
                  className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}
                >
                  Notas
                </label>
                <textarea
                  rows={3}
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

            <div className="flex justify-end gap-3 mt-6">
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
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: "#17C787" }}
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
