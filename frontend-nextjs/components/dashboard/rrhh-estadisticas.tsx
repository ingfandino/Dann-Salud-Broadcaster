"use client"

import { useState, useEffect, useMemo } from "react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import {
  Building2,
  ShoppingCart,
  UserCog,
  ClipboardCheck,
  Users,
  Calendar,
  Award,
  TrendingUp,
  TrendingDown,
  Loader2,
  ChevronRight
} from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { motion, AnimatePresence } from "framer-motion"

interface User {
  _id: string
  nombre: string
  email: string
  role: string
  numeroEquipo?: string
  active: boolean
}

interface Employee {
  _id: string
  userId: User | string
  nombreCompleto: string
  cargo: string
  numeroEquipo: string
  fechaIngreso: string
  firmoContrato: boolean
  activo: boolean
}

interface Audit {
  _id: string
  status: string
  auditor?: { _id: string; nombre?: string } | string
  administrador?: { _id: string; nombre?: string } | string
  asesor?: { _id: string; nombre?: string; supervisor?: { _id: string; nombre?: string } } | string
  supervisorSnapshot?: { _id: string; nombre?: string }
  scheduledAt?: string
  createdAt?: string
  fechaCreacionQR?: string
}

type Departamento = "" | "corporativo" | "ventas"
type RolCorporativo = "" | "auditor" | "admin"
type RolVentas = "" | "supervisor" | "asesor"

const COLORS = {
  success: "#17C787",
  error: "#C8376B",
  primary: "#1E88E5",
  secondary: "#C62FA8",
  warning: "#F4C04A",
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3 }
}

export function RRHHEstadisticas() {
  const { theme } = useTheme()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [audits, setAudits] = useState<Audit[]>([])

  const [departamento, setDepartamento] = useState<Departamento>("")
  const [rolCorporativo, setRolCorporativo] = useState<RolCorporativo>("")
  const [rolVentas, setRolVentas] = useState<RolVentas>("")
  const [selectedUserId, setSelectedUserId] = useState("")
  const [selectedGrupo, setSelectedGrupo] = useState("")

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    try {
      setLoading(true)
      const [usersRes, employeesRes, auditsRes] = await Promise.all([
        api.users.list(),
        api.employees.list(),
        api.audits.list({ ignoreDate: 'true' }) // ✅ Obtener TODAS las auditorías históricas
      ])
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : [])
      setEmployees(Array.isArray(employeesRes.data) ? employeesRes.data : [])
      setAudits(Array.isArray(auditsRes.data) ? auditsRes.data : [])
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Error al cargar datos")
    } finally {
      setLoading(false)
    }
  }

  const resetSelections = (level: "departamento" | "rol" | "grupo") => {
    if (level === "departamento") {
      setRolCorporativo("")
      setRolVentas("")
      setSelectedGrupo("")
      setSelectedUserId("")
    } else if (level === "rol") {
      setSelectedGrupo("")
      setSelectedUserId("")
    } else if (level === "grupo") {
      setSelectedUserId("")
    }
  }

  const auditores = useMemo(() => 
    users.filter(u => u.role?.toLowerCase() === "auditor" && u.active !== false)
      .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "")),
    [users]
  )

  const administrativos = useMemo(() => 
    users.filter(u => u.role?.toLowerCase() === "administrativo" && u.active !== false)
      .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "")),
    [users]
  )

  const supervisores = useMemo(() => 
    users.filter(u => (u.role?.toLowerCase() === "supervisor" || u.role?.toLowerCase() === "supervisor_reventa") && u.active !== false)
      .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "")),
    [users]
  )

  const grupos = useMemo(() => {
    const gruposSet = new Set<string>()
    users.forEach(u => { if (u.numeroEquipo) gruposSet.add(u.numeroEquipo) })
    return Array.from(gruposSet).sort((a, b) => Number(a) - Number(b))
  }, [users])

  const asesoresPorGrupo = useMemo(() => {
    if (!selectedGrupo) return []
    return users.filter(u => {
      const role = u.role?.toLowerCase()
      // Incluir asesores Y auditores que tengan numeroEquipo asignado
      const isAsesorOrAuditorConEquipo = role === "asesor" || (role === "auditor" && !!u.numeroEquipo)
      return isAsesorOrAuditorConEquipo && u.numeroEquipo === selectedGrupo && u.active !== false
    }).sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""))
  }, [users, selectedGrupo])

  const selectedUser = useMemo(() => users.find(u => u._id === selectedUserId), [users, selectedUserId])

  const selectedEmployee = useMemo(() => {
    if (!selectedUserId) return null
    return employees.find(e => {
      const empUserId = typeof e.userId === "string" ? e.userId : e.userId?._id
      return empUserId === selectedUserId
    })
  }, [employees, selectedUserId])

  const AUDITOR_SUCCESS = ["completa", "aprobada", "cargada", "qr hecho"]
  const AUDITOR_FAIL = ["falta clave", "falta documentación", "falta clave y documentación", "rechazada", "cortó", "caída", "rehacer vídeo", "aprobada, pero no reconoce clave"]
  const VENTAS_SUCCESS = ["aprobada", "qr hecho"]
  const VENTAS_FAIL = ["rechazada", "cortó", "caída", "no le llegan los mensajes", "no atendió", "tiene dudas"]

  const stats = useMemo(() => {
    if (!selectedUserId) return null
    const normalize = (s: string) => (s || "").toLowerCase().trim()
    const getId = (ref: any): string => {
      if (!ref) return ""
      if (typeof ref === "string") return ref
      return String(ref._id || ref)
    }

    const getSupervisorId = (audit: Audit): string => {
      if (audit.supervisorSnapshot?._id) return String(audit.supervisorSnapshot._id)
      const asesor = audit.asesor
      if (asesor && typeof asesor === "object" && asesor.supervisor?._id) {
        return String(asesor.supervisor._id)
      }
      return ""
    }

    let successStatuses: string[] = []
    let failStatuses: string[] = []
    let filterFn: (a: Audit) => boolean = () => false

    if (departamento === "corporativo") {
      if (rolCorporativo === "auditor") {
        filterFn = (a) => getId(a.auditor) === selectedUserId
        successStatuses = AUDITOR_SUCCESS
        failStatuses = AUDITOR_FAIL
      } else if (rolCorporativo === "admin") {
        filterFn = (a) => getId(a.administrador) === selectedUserId
        successStatuses = ["qr hecho"]
        failStatuses = []
      }
    } else if (departamento === "ventas") {
      if (rolVentas === "supervisor") {
        filterFn = (a) => getSupervisorId(a) === selectedUserId
        successStatuses = VENTAS_SUCCESS
        failStatuses = VENTAS_FAIL
      } else if (rolVentas === "asesor") {
        filterFn = (a) => getId(a.asesor) === selectedUserId
        successStatuses = VENTAS_SUCCESS
        failStatuses = VENTAS_FAIL
      }
    }

    const userAudits = audits.filter(filterFn)
    const successAudits = userAudits.filter(a => successStatuses.includes(normalize(a.status)))
    const failAudits = userAudits.filter(a => failStatuses.includes(normalize(a.status)))

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    const getAuditDate = (audit: Audit): Date => {
      if (audit.fechaCreacionQR) return new Date(audit.fechaCreacionQR)
      return new Date(audit.scheduledAt || "")
    }

    const successThisMonth = successAudits.filter(a => {
      const d = getAuditDate(a)
      return !isNaN(d.getTime()) && d >= startOfMonth && d <= endOfMonth
    }).length

    const monthlyGroups = new Map<string, number>()
    successAudits.forEach(a => {
      const d = getAuditDate(a)
      if (!isNaN(d.getTime())) {
        const key = `${d.getFullYear()}-${d.getMonth()}`
        monthlyGroups.set(key, (monthlyGroups.get(key) || 0) + 1)
      }
    })
    const record = monthlyGroups.size > 0 ? Math.max(...Array.from(monthlyGroups.values())) : 0

    const total = userAudits.length
    const successCount = successAudits.length
    const failCount = failAudits.length
    const successRate = (successCount + failCount) > 0 ? Math.round((successCount / (successCount + failCount)) * 100) : 0

    return {
      total, successCount, failCount, successThisMonth, record, successRate,
      pieData: [
        { name: "Exitosas", value: successCount, color: COLORS.success },
        { name: "Fallidas", value: failCount, color: COLORS.error },
      ]
    }
  }, [audits, selectedUserId, departamento, rolCorporativo, rolVentas])

  const getRolLabel = () => {
    if (departamento === "corporativo") {
      if (rolCorporativo === "auditor") return "Auditor"
      if (rolCorporativo === "admin") return "Administrativo"
    } else if (departamento === "ventas") {
      if (rolVentas === "supervisor") return "Supervisor"
      if (rolVentas === "asesor") return "Asesor"
    }
    return ""
  }

  const getStatLabels = () => {
    if (departamento === "corporativo" && rolCorporativo === "admin") {
      return { total: "QR's hechos", thisMonth: "QR's hechos este mes", record: "Récord de QR's" }
    }
    if (departamento === "corporativo" && rolCorporativo === "auditor") {
      return { total: "Auditorías", success: "Auditorías exitosas", fail: "Auditorías fallidas", thisMonth: "Auditorías completadas este mes", record: "Récord de auditorías" }
    }
    return { total: "Ventas", success: "Ventas exitosas", fail: "Ventas fallidas", thisMonth: "Ventas completadas este mes", record: "Récord de ventas" }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>
  }

  const selectClass = cn(
    "w-full px-4 py-3 rounded-xl border text-sm font-medium transition-all",
    theme === "dark" ? "bg-white/5 border-white/10 text-white hover:bg-white/10" : "bg-white border-gray-200 text-gray-800 hover:border-gray-300 shadow-sm"
  )
  const cardClass = cn(
    "rounded-2xl border p-6",
    theme === "dark" ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10" : "bg-white border-gray-200 shadow-sm"
  )

  return (
    <div className="space-y-6">
      <div className={cardClass}>
        <h2 className={cn("text-lg font-semibold mb-2", theme === "dark" ? "text-white" : "text-gray-800")}>Estadísticas por Departamento</h2>
        <p className={cn("text-sm mb-6", theme === "dark" ? "text-gray-400" : "text-gray-600")}>Seleccione un departamento para comenzar</p>

        <div className="space-y-4">
          <div>
            <label className={cn("text-xs font-medium mb-2 flex items-center gap-2", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
              <Building2 className="w-4 h-4" style={{ color: COLORS.primary }} /> Elige un departamento
            </label>
            <select value={departamento} onChange={(e) => { setDepartamento(e.target.value as Departamento); resetSelections("departamento") }} className={selectClass}>
              <option value="">Seleccionar departamento...</option>
              <option value="corporativo">Corporativo</option>
              <option value="ventas">Ventas</option>
            </select>
          </div>

          <AnimatePresence mode="wait">
            {departamento === "corporativo" && (
              <motion.div key="corp-rol" {...fadeInUp}>
                <label className={cn("text-xs font-medium mb-2 flex items-center gap-2", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                  <ChevronRight className="w-4 h-4" style={{ color: COLORS.secondary }} /> Seleccione un rol
                </label>
                <select value={rolCorporativo} onChange={(e) => { setRolCorporativo(e.target.value as RolCorporativo); resetSelections("rol") }} className={selectClass}>
                  <option value="">Seleccionar rol...</option>
                  <option value="auditor">Auditor</option>
                  <option value="admin">Administrativo</option>
                </select>
              </motion.div>
            )}
            {departamento === "ventas" && (
              <motion.div key="ventas-rol" {...fadeInUp}>
                <label className={cn("text-xs font-medium mb-2 flex items-center gap-2", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                  <ChevronRight className="w-4 h-4" style={{ color: COLORS.secondary }} /> Seleccione un rol
                </label>
                <select value={rolVentas} onChange={(e) => { setRolVentas(e.target.value as RolVentas); resetSelections("rol") }} className={selectClass}>
                  <option value="">Seleccionar rol...</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="asesor">Asesor</option>
                </select>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {departamento === "corporativo" && rolCorporativo === "auditor" && (
              <motion.div key="auditor-sel" {...fadeInUp}>
                <label className={cn("text-xs font-medium mb-2 flex items-center gap-2", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                  <ClipboardCheck className="w-4 h-4" style={{ color: COLORS.success }} /> Seleccione un auditor
                </label>
                <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} className={selectClass}>
                  <option value="">Seleccionar auditor...</option>
                  {auditores.map(u => <option key={u._id} value={u._id}>{u.nombre || u.email}</option>)}
                </select>
              </motion.div>
            )}
            {departamento === "corporativo" && rolCorporativo === "admin" && (
              <motion.div key="admin-sel" {...fadeInUp}>
                <label className={cn("text-xs font-medium mb-2 flex items-center gap-2", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                  <UserCog className="w-4 h-4" style={{ color: COLORS.warning }} /> Seleccione un administrativo
                </label>
                <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} className={selectClass}>
                  <option value="">Seleccionar administrativo...</option>
                  {administrativos.map(u => <option key={u._id} value={u._id}>{u.nombre || u.email}</option>)}
                </select>
              </motion.div>
            )}
            {departamento === "ventas" && rolVentas === "supervisor" && (
              <motion.div key="sup-sel" {...fadeInUp}>
                <label className={cn("text-xs font-medium mb-2 flex items-center gap-2", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                  <Users className="w-4 h-4" style={{ color: COLORS.primary }} /> Seleccione un supervisor
                </label>
                <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} className={selectClass}>
                  <option value="">Seleccionar supervisor...</option>
                  {supervisores.map(u => <option key={u._id} value={u._id}>{u.nombre || u.email} {u.numeroEquipo ? `(${u.numeroEquipo})` : ""}</option>)}
                </select>
              </motion.div>
            )}
            {departamento === "ventas" && rolVentas === "asesor" && (
              <motion.div key="asesor-flow" {...fadeInUp} className="space-y-4">
                <div>
                  <label className={cn("text-xs font-medium mb-2 flex items-center gap-2", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                    <Users className="w-4 h-4" style={{ color: COLORS.warning }} /> Seleccione un grupo
                  </label>
                  <select value={selectedGrupo} onChange={(e) => { setSelectedGrupo(e.target.value); resetSelections("grupo") }} className={selectClass}>
                    <option value="">Seleccionar grupo...</option>
                    {grupos.map(g => <option key={g} value={g}>Grupo {g}</option>)}
                  </select>
                </div>
                <AnimatePresence mode="wait">
                  {selectedGrupo && (
                    <motion.div key="asesor-sel" {...fadeInUp}>
                      <label className={cn("text-xs font-medium mb-2 flex items-center gap-2", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                        <ShoppingCart className="w-4 h-4" style={{ color: COLORS.success }} /> Seleccione un asesor
                      </label>
                      <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} className={selectClass}>
                        <option value="">Seleccionar asesor...</option>
                        {asesoresPorGrupo.map(u => <option key={u._id} value={u._id}>{u.nombre || u.email}</option>)}
                      </select>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {selectedUserId && stats && (
          <motion.div key="stats" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} transition={{ duration: 0.4 }} className={cardClass}>
            <div className="flex flex-col lg:flex-row gap-6">
              {(departamento !== "corporativo" || rolCorporativo !== "admin") && (
                <div className="flex-1 min-w-[280px]">
                  <h3 className={cn("text-base font-semibold mb-4 flex items-center gap-2", theme === "dark" ? "text-white" : "text-gray-800")}>
                    <TrendingUp className="w-5 h-5" style={{ color: COLORS.success }} /> Tasa de Éxito - {getRolLabel()}
                  </h3>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={stats.pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                          {stats.pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                        <Tooltip formatter={(value: number) => [value, ""]} contentStyle={{ backgroundColor: theme === "dark" ? "#1f2937" : "#fff", border: theme === "dark" ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e5e7eb", borderRadius: "8px" }} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-center mt-2">
                    <span className={cn("text-3xl font-bold", theme === "dark" ? "text-white" : "text-gray-800")}>{stats.successRate}%</span>
                    <span className={cn("text-sm ml-2", theme === "dark" ? "text-gray-400" : "text-gray-500")}>tasa de éxito</span>
                  </div>
                </div>
              )}
              <div className={cn("flex-1 min-w-[280px] rounded-xl p-5", theme === "dark" ? "bg-white/5" : "bg-gray-50")}>
                <h3 className={cn("text-base font-semibold mb-4 flex items-center gap-2", theme === "dark" ? "text-white" : "text-gray-800")}>
                  <Award className="w-5 h-5" style={{ color: COLORS.warning }} /> Resumen - {selectedUser?.nombre || "Usuario"}
                </h3>
                <div className="space-y-3">
                  <div className={cn("flex justify-between py-2 border-b", theme === "dark" ? "border-white/10" : "border-gray-200")}>
                    <span className={cn("text-sm flex items-center gap-2", theme === "dark" ? "text-gray-400" : "text-gray-600")}><Calendar className="w-4 h-4" /> Fecha de ingreso</span>
                    <span className={cn("font-medium", theme === "dark" ? "text-white" : "text-gray-800")}>{selectedEmployee?.fechaIngreso ? new Date(selectedEmployee.fechaIngreso).toLocaleDateString("es-AR") : "-"}</span>
                  </div>
                  {departamento === "corporativo" && rolCorporativo === "admin" ? (
                    <>
                      <div className={cn("flex justify-between py-2 border-b", theme === "dark" ? "border-white/10" : "border-gray-200")}>
                        <span className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}>{getStatLabels().total}</span>
                        <span className="font-bold" style={{ color: COLORS.primary }}>{stats.successCount}</span>
                      </div>
                      <div className={cn("flex justify-between py-2 border-b", theme === "dark" ? "border-white/10" : "border-gray-200")}>
                        <span className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}>{getStatLabels().thisMonth}</span>
                        <span className="font-bold" style={{ color: COLORS.success }}>{stats.successThisMonth}</span>
                      </div>
                      <div className={cn("flex justify-between py-2", theme === "dark" ? "border-white/10" : "border-gray-200")}>
                        <span className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}>{getStatLabels().record}</span>
                        <span className="font-bold" style={{ color: COLORS.warning }}>{stats.record}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={cn("flex justify-between py-2 border-b", theme === "dark" ? "border-white/10" : "border-gray-200")}>
                        <span className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}>{getStatLabels().total}</span>
                        <span className="font-bold" style={{ color: COLORS.primary }}>{stats.total}</span>
                      </div>
                      <div className={cn("flex justify-between py-2 border-b", theme === "dark" ? "border-white/10" : "border-gray-200")}>
                        <span className={cn("text-sm flex items-center gap-2", theme === "dark" ? "text-gray-400" : "text-gray-600")}><TrendingUp className="w-4 h-4" style={{ color: COLORS.success }} /> {getStatLabels().success}</span>
                        <span className="font-bold" style={{ color: COLORS.success }}>{stats.successCount}</span>
                      </div>
                      <div className={cn("flex justify-between py-2 border-b", theme === "dark" ? "border-white/10" : "border-gray-200")}>
                        <span className={cn("text-sm flex items-center gap-2", theme === "dark" ? "text-gray-400" : "text-gray-600")}><TrendingDown className="w-4 h-4" style={{ color: COLORS.error }} /> {getStatLabels().fail}</span>
                        <span className="font-bold" style={{ color: COLORS.error }}>{stats.failCount}</span>
                      </div>
                      <div className={cn("flex justify-between py-2 border-b", theme === "dark" ? "border-white/10" : "border-gray-200")}>
                        <span className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}>{getStatLabels().thisMonth}</span>
                        <span className="font-bold" style={{ color: COLORS.success }}>{stats.successThisMonth}</span>
                      </div>
                      <div className={cn("flex justify-between py-2", theme === "dark" ? "border-white/10" : "border-gray-200")}>
                        <span className={cn("text-sm flex items-center gap-2", theme === "dark" ? "text-gray-400" : "text-gray-600")}><Award className="w-4 h-4" style={{ color: COLORS.warning }} /> {getStatLabels().record}</span>
                        <span className="font-bold" style={{ color: COLORS.warning }}>{stats.record}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!selectedUserId && departamento && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={cn("text-center py-12 rounded-2xl border", theme === "dark" ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200")}>
          <p className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-500")}>Complete la selección para ver las estadísticas</p>
        </motion.div>
      )}
    </div>
  )
}
