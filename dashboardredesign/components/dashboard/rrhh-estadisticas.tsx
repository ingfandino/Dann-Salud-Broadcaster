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
  Filter,
  Trash2,
  BarChart3,
  Calendar,
  Award,
  TrendingUp,
} from "lucide-react"

const statsCards = [
  { label: "Total Empleados", value: 111, icon: Users, color: "#1E88E5" },
  { label: "Activos", value: 95, icon: UserCheck, color: "#17C787" },
  { label: "Inactivos", value: 16, icon: UserX, color: "#C8376B" },
  { label: "Con Contrato", value: 105, icon: FileText, color: "#F4C04A" },
  { label: "Cargos", value: 6, icon: Briefcase, color: "#C62FA8" },
]

const empleados = [
  {
    id: 1,
    nombre: "Milagros Krauss",
    cargo: "Auditor",
    equipo: "23",
    fechaIngreso: "24/7/2025",
    telefono: "1166310803",
    estado: "Activo",
  },
  {
    id: 2,
    nombre: "Facundo Tevez",
    cargo: "Supervisor",
    equipo: "121",
    fechaIngreso: "6/11/2025",
    telefono: "1167327917",
    estado: "Activo",
  },
  {
    id: 3,
    nombre: "Benjamín Marco",
    cargo: "Auditor",
    equipo: "121",
    fechaIngreso: "6/7/2025",
    telefono: "1151073398",
    estado: "Activo",
  },
]

export function RRHHEstadisticas() {
  const { theme } = useTheme()
  const [filtroRol, setFiltroRol] = useState("")
  const [filtroEquipo, setFiltroEquipo] = useState("")
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(empleados[0])

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
                <p
                  className={cn("text-2xl font-bold", theme === "dark" ? "text-white" : "text-gray-800")}
                  style={{ color: stat.color }}
                >
                  {stat.value}
                </p>
              </div>
              <Icon className="w-6 h-6" style={{ color: stat.color }} />
            </div>
          )
        })}
      </div>

      {/* Filtros y selección */}
      <div
        className={cn(
          "rounded-2xl border p-6",
          theme === "dark"
            ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
            : "bg-white border-gray-200 shadow-sm",
        )}
      >
        <h2 className={cn("text-lg font-semibold mb-4", theme === "dark" ? "text-white" : "text-gray-800")}>
          Estadísticas de Empleados
        </h2>
        <p className={cn("text-sm mb-4", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
          Seleccione un empleado para ver sus estadísticas según su rol
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label
              className={cn(
                "text-xs font-medium flex items-center gap-1 mb-1",
                theme === "dark" ? "text-gray-400" : "text-gray-600",
              )}
            >
              <Filter className="w-3 h-3" style={{ color: "#1E88E5" }} />
              Filtrar por Rol
            </label>
            <select
              value={filtroRol}
              onChange={(e) => setFiltroRol(e.target.value)}
              className={cn(
                "w-full px-3 py-2 rounded-lg border text-sm",
                theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
              )}
            >
              <option value="">Todos los roles</option>
              <option value="supervisor">Supervisor</option>
              <option value="auditor">Auditor</option>
              <option value="asesor">Asesor</option>
            </select>
          </div>
          <div>
            <label
              className={cn(
                "text-xs font-medium flex items-center gap-1 mb-1",
                theme === "dark" ? "text-gray-400" : "text-gray-600",
              )}
            >
              <Users className="w-3 h-3" style={{ color: "#17C787" }} />
              Filtrar por Equipo
            </label>
            <select
              value={filtroEquipo}
              onChange={(e) => setFiltroEquipo(e.target.value)}
              className={cn(
                "w-full px-3 py-2 rounded-lg border text-sm",
                theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
              )}
            >
              <option value="">Todos los equipos</option>
              <option value="23">Equipo 23</option>
              <option value="121">Equipo 121</option>
              <option value="117">Equipo 117</option>
            </select>
          </div>
          <div>
            <label
              className={cn(
                "text-xs font-medium flex items-center gap-1 mb-1",
                theme === "dark" ? "text-gray-400" : "text-gray-600",
              )}
            >
              Acciones Rápidas
            </label>
            <button
              className={cn(
                "w-full px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors",
                theme === "dark"
                  ? "bg-[#C8376B]/20 text-[#C8376B] hover:bg-[#C8376B]/30"
                  : "bg-[#C8376B]/10 text-[#C8376B] hover:bg-[#C8376B]/20",
              )}
            >
              <Trash2 className="w-4 h-4" />
              Limpiar Filtros
            </button>
          </div>
          <div>
            <label
              className={cn("text-xs font-medium mb-1 block", theme === "dark" ? "text-gray-400" : "text-gray-600")}
            >
              Seleccionar Empleado (filtrado)
            </label>
            <select
              value={empleadoSeleccionado.id}
              onChange={(e) => {
                const emp = empleados.find((em) => em.id === Number(e.target.value))
                if (emp) setEmpleadoSeleccionado(emp)
              }}
              className={cn(
                "w-full px-3 py-2 rounded-lg border text-sm",
                theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
              )}
            >
              {empleados.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.nombre} - {emp.cargo} (Equipo {emp.equipo})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Info del empleado seleccionado */}
        <div
          className={cn(
            "rounded-xl border p-4 mb-6",
            theme === "dark" ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200",
          )}
        >
          <h3 className={cn("font-semibold mb-3", theme === "dark" ? "text-white" : "text-gray-800")}>
            Información del Empleado
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className={cn("text-xs", theme === "dark" ? "text-gray-500" : "text-gray-500")}>Nombre:</p>
              <p className={cn("font-medium", theme === "dark" ? "text-white" : "text-gray-800")}>
                {empleadoSeleccionado.nombre}
              </p>
            </div>
            <div>
              <p className={cn("text-xs", theme === "dark" ? "text-gray-500" : "text-gray-500")}>Cargo:</p>
              <p className={cn("font-medium", theme === "dark" ? "text-white" : "text-gray-800")}>
                {empleadoSeleccionado.cargo}
              </p>
            </div>
            <div>
              <p className={cn("text-xs", theme === "dark" ? "text-gray-500" : "text-gray-500")}>Equipo:</p>
              <p className={cn("font-medium", theme === "dark" ? "text-white" : "text-gray-800")}>
                {empleadoSeleccionado.equipo}
              </p>
            </div>
            <div>
              <p className={cn("text-xs", theme === "dark" ? "text-gray-500" : "text-gray-500")}>Fecha de Ingreso:</p>
              <p className={cn("font-medium", theme === "dark" ? "text-white" : "text-gray-800")}>
                {empleadoSeleccionado.fechaIngreso}
              </p>
            </div>
            <div>
              <p className={cn("text-xs", theme === "dark" ? "text-gray-500" : "text-gray-500")}>Estado:</p>
              <p className="font-medium" style={{ color: "#17C787" }}>
                {empleadoSeleccionado.estado}
              </p>
            </div>
          </div>
        </div>

        {/* Estadísticas de Auditorías */}
        <div className="mb-6">
          <h3
            className={cn(
              "font-semibold mb-3 flex items-center gap-2",
              theme === "dark" ? "text-white" : "text-gray-800",
            )}
          >
            <BarChart3 className="w-4 h-4" style={{ color: "#17C787" }} />
            Estadísticas de Auditorías
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Auditorías (Semana)", value: 1, color: "#17C787", icon: BarChart3 },
              { label: "Auditorías (Mes)", value: 4, color: "#1E88E5", icon: Calendar },
              { label: "Auditorías (Mes Anterior)", value: 0, color: "#C62FA8", icon: Calendar },
              { label: "Total Auditorías", value: 4, color: "#F4C04A", icon: Award },
            ].map((stat, idx) => {
              const Icon = stat.icon
              return (
                <div key={idx} className="rounded-xl p-4" style={{ backgroundColor: `${stat.color}15` }}>
                  <p className="text-xs flex items-center gap-1 mb-1" style={{ color: stat.color }}>
                    <Icon className="w-3 h-3" />
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold" style={{ color: stat.color }}>
                    {stat.value}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Estadísticas de Ventas */}
        <div>
          <h3
            className={cn(
              "font-semibold mb-3 flex items-center gap-2",
              theme === "dark" ? "text-white" : "text-gray-800",
            )}
          >
            <TrendingUp className="w-4 h-4" style={{ color: "#1E88E5" }} />
            Estadísticas de Ventas (También Vende)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "QR Hechos (Semana)", value: 5, color: "#17C787" },
              { label: "QR Hechos (Mes)", value: 12, color: "#1E88E5" },
              { label: "Máx. QR (Semana)", value: 5, color: "#F4C04A" },
              { label: "Máx. QR (Mes)", value: 12, color: "#C8376B" },
              { label: "Ventas Incompletas", value: 14, color: "#F4C04A" },
            ].map((stat, idx) => (
              <div key={idx} className="rounded-xl p-4" style={{ backgroundColor: `${stat.color}15` }}>
                <p className="text-xs mb-1" style={{ color: stat.color }}>
                  {stat.label}
                </p>
                <p className="text-2xl font-bold" style={{ color: stat.color }}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
