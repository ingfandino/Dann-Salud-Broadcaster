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
  Filter,
  Trash2,
  BarChart3,
  Calendar,
  Award,
  TrendingUp,
  Loader2
} from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"

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
  cargo: string
  numeroEquipo: string
  fechaIngreso: string
  firmoContrato: boolean
  activo: boolean
}

export function RRHHEstadisticas() {
  const { theme } = useTheme()
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [users, setUsers] = useState<any[]>([]) // For cross-referencing teams

  // Filters
  const [filtroRol, setFiltroRol] = useState("")
  const [filtroEquipo, setFiltroEquipo] = useState("")
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("")

  // Stats State
  const [employeeStats, setEmployeeStats] = useState({
    auditsWeek: 0,
    auditsMonth: 0,
    auditsPrevMonth: 0,
    auditsTotal: 0,
    salesWeek: 0,
    salesMonth: 0,
    salesMaxWeek: 0, // Placeholder as we might not have historical max easily
    salesMaxMonth: 0, // Placeholder
    salesIncomplete: 0
  })
  const [loadingStats, setLoadingStats] = useState(false)

  useEffect(() => {
    fetchEmployees()
  }, [])

  useEffect(() => {
    if (selectedEmployeeId) {
      fetchEmployeeStats(selectedEmployeeId)
    } else {
      // Reset stats if no employee selected
      setEmployeeStats({
        auditsWeek: 0,
        auditsMonth: 0,
        auditsPrevMonth: 0,
        auditsTotal: 0,
        salesWeek: 0,
        salesMonth: 0,
        salesMaxWeek: 0,
        salesMaxMonth: 0,
        salesIncomplete: 0
      })
    }
  }, [selectedEmployeeId])

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      const [employeesRes, usersRes] = await Promise.all([
        api.employees.list(),
        api.users.list()
      ])

      setEmployees(employeesRes.data)
      setUsers(usersRes.data || [])

      // Select first active employee by default if available
      const firstActive = employeesRes.data.find((e: Employee) => e.activo)
      if (firstActive) {
        setSelectedEmployeeId(firstActive._id)
      }
    } catch (error) {
      console.error("Error fetching employees:", error)
      toast.error("Error al cargar empleados")
    } finally {
      setLoading(false)
    }
  }

  const fetchEmployeeStats = async (employeeId: string) => {
    const employee = employees.find(e => e._id === employeeId)
    if (!employee || !employee.userId) return

    try {
      setLoadingStats(true)
      const userId = employee.userId._id
      const userRole = (employee.userId.role || '').toLowerCase()
      const isSupervisor = userRole === 'supervisor'
      const numeroEquipo = employee.userId.numeroEquipo

      // ALWAYS fetch user's personal audits (where they are involved as auditor/asesor/etc)
      const auditsRes = await api.audits.list({ userId: userId })
      const userAudits = Array.isArray(auditsRes.data) ? auditsRes.data : []

      // For supervisors, fetch team sales by getting all team members' audits
      // where they are ASESOR (matching Seguimiento logic)
      let teamSalesAllTime: any[] = []
      if (isSupervisor && numeroEquipo) {
        try {
          // Step 1: Get all users with same numeroEquipo
          const usersRes = await api.users.list()
          const allUsers = Array.isArray(usersRes.data) ? usersRes.data : []
          const teamMembers = allUsers.filter((u: any) => u.numeroEquipo === numeroEquipo)

          // Step 2: Fetch audits for each team member in parallel
          const auditPromises = teamMembers.map((member: any) =>
            api.audits.list({ userId: member._id })
              .then(res => {
                const memberAudits = Array.isArray(res.data) ? res.data : []
                // Step 3: Filter to ONLY audits where THIS member is the ASESOR
                return memberAudits.filter((a: any) => {
                  const asesorId = a.asesor?._id || a.asesor
                  return asesorId === member._id
                })
              })
              .catch(err => {
                console.error(`Error fetching audits for ${member.nombre}:`, err)
                return []
              })
          )

          // Step 4: Combine all filtered audits
          const auditArrays = await Promise.all(auditPromises)
          teamSalesAllTime = auditArrays.flat()

        } catch (error) {
          console.error("Error fetching team sales for supervisor:", error)
          teamSalesAllTime = []
        }
      }

      // Helper function to get work week boundaries (Thursday 23:01 to Thursday 23:01)
      const getWorkWeekBoundaries = (date: Date) => {
        const d = new Date(date)
        const day = d.getDay() // 0 = Sunday, 4 = Thursday
        const hour = d.getHours()
        const minute = d.getMinutes()

        // Find the previous Thursday 23:01
        let daysToSubtract = day < 4 ? day + 3 : day - 4
        const startOfWeek = new Date(d)
        startOfWeek.setDate(d.getDate() - daysToSubtract)
        startOfWeek.setHours(23, 1, 0, 0)

        // If current time is before Thursday 23:01, go back one more week
        if (day < 4 || (day === 4 && (hour < 23 || (hour === 23 && minute < 1)))) {
          startOfWeek.setDate(startOfWeek.getDate() - 7)
        }

        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(endOfWeek.getDate() + 7)

        return { start: startOfWeek, end: endOfWeek }
      }

      const now = new Date()
      const currentWorkWeek = getWorkWeekBoundaries(now)
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
      const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

      // ========== AUDITORÍAS (where user is AUDITOR) ==========
      const userAuditsQRHecho = userAudits.filter((a: any) => {
        const auditorId = a.auditor?._id || a.auditor
        const status = (a.status || '').toLowerCase()
        return auditorId === userId && status === 'qr hecho'
      })

      const auditsWeek = userAuditsQRHecho.filter((a: any) => {
        const d = new Date(a.scheduledAt || a.createdAt)
        return d >= currentWorkWeek.start && d < currentWorkWeek.end
      }).length

      const auditsMonth = userAuditsQRHecho.filter((a: any) => {
        const d = new Date(a.scheduledAt || a.createdAt)
        return d >= startOfMonth && d <= endOfMonth
      }).length

      const auditsPrevMonth = userAuditsQRHecho.filter((a: any) => {
        const d = new Date(a.scheduledAt || a.createdAt)
        return d >= startOfPrevMonth && d <= endOfPrevMonth
      }).length

      const auditsTotal = userAuditsQRHecho.length

      // ========== VENTAS ==========
      // For supervisors: use teamSalesAllTime from liquidation API (proven correct)
      // For regular employees: use userAudits filtered by where they are asesor
      const salesSource = isSupervisor ? teamSalesAllTime : userAudits

      // Filter for sales where user/team is asesor with QR hecho
      const userSalesQRHecho = salesSource.filter((a: any) => {
        const status = (a.status || '').toLowerCase()
        if (isSupervisor) {
          // liquidation data is already filtered by supervisor, just check QR hecho
          return status === 'qr hecho'
        } else {
          // For regular employees: check they are the asesor
          const asesorId = a.asesor?._id || a.asesor
          return asesorId === userId && status === 'qr hecho'
        }
      })

      const userSalesAll = salesSource.filter((a: any) => {
        if (isSupervisor) {
          // All liquidation data
          return true
        } else {
          const asesorId = a.asesor?._id || a.asesor
          return asesorId === userId
        }
      })

      const salesWeek = userSalesQRHecho.filter((s: any) => {
        const d = new Date(s.scheduledAt || s.createdAt)
        return d >= currentWorkWeek.start && d < currentWorkWeek.end
      }).length

      // Calculate Máx. Semanal (max sales in any work week)
      const weeklyGroups = new Map<string, number>()
      userSalesQRHecho.forEach((s: any) => {
        const d = new Date(s.scheduledAt || s.createdAt)
        const weekBoundaries = getWorkWeekBoundaries(d)
        const weekKey = weekBoundaries.start.toISOString()
        weeklyGroups.set(weekKey, (weeklyGroups.get(weekKey) || 0) + 1)
      })
      const salesMaxWeek = weeklyGroups.size > 0 ? Math.max(...Array.from(weeklyGroups.values())) : 0

      // Calculate Máx. Mensual (max sales in any month)
      const monthlyGroups = new Map<string, number>()
      userSalesQRHecho.forEach((s: any) => {
        const d = new Date(s.scheduledAt || s.createdAt)
        const monthKey = `${d.getFullYear()}-${d.getMonth()}`
        monthlyGroups.set(monthKey, (monthlyGroups.get(monthKey) || 0) + 1)
      })
      const salesMaxMonth = monthlyGroups.size > 0 ? Math.max(...Array.from(monthlyGroups.values())) : 0

      // Incompletas/Pendientes: All sales NOT in 'QR hecho'
      const salesIncomplete = userSalesAll.filter((s: any) => {
        const status = (s.status || '').toLowerCase()
        return status !== 'qr hecho'
      }).length

      setEmployeeStats({
        auditsWeek,
        auditsMonth,
        auditsPrevMonth,
        auditsTotal,
        salesWeek,
        salesMonth: salesWeek, // Current month not needed per requirements, using week
        salesMaxWeek,
        salesMaxMonth,
        salesIncomplete
      })

    } catch (error) {
      console.error("Error fetching stats:", error)
      toast.error("Error al cargar estadísticas del empleado")
    } finally {
      setLoadingStats(false)
    }
  }

  // Global Stats Calculations
  const totalEmployees = employees.length
  const activeEmployees = employees.filter(e => e.activo).length
  const inactiveEmployees = employees.filter(e => !e.activo).length
  const withContract = employees.filter(e => e.firmoContrato).length
  const uniqueRoles = new Set(employees.map(e => e.cargo)).size

  const statsCards = [
    { label: "Total Empleados", value: totalEmployees, icon: Users, color: "#1E88E5" },
    { label: "Activos", value: activeEmployees, icon: UserCheck, color: "#17C787" },
    { label: "Inactivos", value: inactiveEmployees, icon: UserX, color: "#C8376B" },
    { label: "Con Contrato", value: withContract, icon: FileText, color: "#F4C04A" },
    { label: "Cargos", value: uniqueRoles, icon: Briefcase, color: "#C62FA8" },
  ]

  // Filtered Employees for Dropdown
  const filteredEmployees = employees.filter(emp => {
    const matchesRole = filtroRol ? emp.cargo.toLowerCase() === filtroRol.toLowerCase() : true

    // If team filter is active, check if this employee's user is in the selected team
    let matchesTeam = true
    if (filtroEquipo && emp.userId) {
      const userId = typeof emp.userId === 'string' ? emp.userId : emp.userId._id
      const user = users.find(u => u._id === userId)
      matchesTeam = user?.numeroEquipo === filtroEquipo
    }

    return matchesRole && matchesTeam && emp.activo
  })

  // Selected Employee Object
  const selectedEmployee = employees.find(e => e._id === selectedEmployeeId)

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
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
              {Array.from(new Set(employees.map(e => e.cargo))).map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
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
              {Array.from(new Set(
                users
                  .filter(u => u.active !== false && u.numeroEquipo)
                  .map(u => u.numeroEquipo)
              )).sort().map(team => (
                <option key={team} value={team}>Equipo {team}</option>
              ))}
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
              onClick={() => {
                setFiltroRol("")
                setFiltroEquipo("")
              }}
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
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className={cn(
                "w-full px-3 py-2 rounded-lg border text-sm",
                theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
              )}
            >
              <option value="">Seleccionar...</option>
              {filteredEmployees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.nombreCompleto} - {emp.cargo} {emp.numeroEquipo ? `(Eq. ${emp.numeroEquipo})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Info del empleado seleccionado */}
        {selectedEmployee && (
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
                  {selectedEmployee.nombreCompleto}
                </p>
              </div>
              <div>
                <p className={cn("text-xs", theme === "dark" ? "text-gray-500" : "text-gray-500")}>Cargo:</p>
                <p className={cn("font-medium", theme === "dark" ? "text-white" : "text-gray-800")}>
                  {selectedEmployee.cargo}
                </p>
              </div>
              <div>
                <p className={cn("text-xs", theme === "dark" ? "text-gray-500" : "text-gray-500")}>Equipo:</p>
                <p className={cn("font-medium", theme === "dark" ? "text-white" : "text-gray-800")}>
                  {selectedEmployee.numeroEquipo || "-"}
                </p>
              </div>
              <div>
                <p className={cn("text-xs", theme === "dark" ? "text-gray-500" : "text-gray-500")}>Fecha de Ingreso:</p>
                <p className={cn("font-medium", theme === "dark" ? "text-white" : "text-gray-800")}>
                  {new Date(selectedEmployee.fechaIngreso).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className={cn("text-xs", theme === "dark" ? "text-gray-500" : "text-gray-500")}>Estado:</p>
                <p className="font-medium" style={{ color: selectedEmployee.activo ? "#17C787" : "#C8376B" }}>
                  {selectedEmployee.activo ? "Activo" : "Inactivo"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Loading Stats */}
        {loadingStats && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
          </div>
        )}

        {/* Estadísticas de Auditorías */}
        {!loadingStats && selectedEmployee && (
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
                { label: "Auditorías (Semana)", value: employeeStats.auditsWeek, color: "#17C787", icon: BarChart3 },
                { label: "Auditorías (Mes)", value: employeeStats.auditsMonth, color: "#1E88E5", icon: Calendar },
                { label: "Auditorías (Mes Anterior)", value: employeeStats.auditsPrevMonth, color: "#C62FA8", icon: Calendar },
                { label: "Total Auditorías", value: employeeStats.auditsTotal, color: "#F4C04A", icon: Award },
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
        )}

        {/* Estadísticas de Ventas */}
        {!loadingStats && selectedEmployee && (
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
                { label: "Ventas (Semana)", value: employeeStats.salesWeek, color: "#17C787" },
                { label: "Ventas (Mes)", value: employeeStats.salesMonth, color: "#1E88E5" },
                { label: "Máx. Semanal", value: employeeStats.salesMaxWeek, color: "#F4C04A" },
                { label: "Máx. Mensual", value: employeeStats.salesMaxMonth, color: "#C8376B" },
                { label: "Incompletas/Pendientes", value: employeeStats.salesIncomplete, color: "#F4C04A" },
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
        )}
      </div>
    </div>
  )
}
