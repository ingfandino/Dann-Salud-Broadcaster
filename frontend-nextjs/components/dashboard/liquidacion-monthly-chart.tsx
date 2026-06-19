"use client"

import { useState, useEffect } from "react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { BarChart3, Users, User, RefreshCw } from "lucide-react"

interface MonthlyData {
  label: string
  year: number
  month: number
  filtered: number
  global: number
}

interface Props {
  tipo: 'supervisor' | 'auditor' | 'administrativo' | 'asesor'
  userList: { _id: string; nombre: string }[]
  accentColor: string
}

export function MonthlyComparisonChart({ tipo, userList, accentColor }: Props) {
  const { theme } = useTheme()
  const [data, setData] = useState<MonthlyData[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'general' | 'individual'>('general')
  const [selectedUserId, setSelectedUserId] = useState<string>('')

  const fetchStats = async (userId?: string) => {
    try {
      setLoading(true)
      const params: any = { tipo }
      if (userId) params.userId = userId
      const { data: res } = await api.liquidation.statsMonthly(params)
      setData(res.data || [])
    } catch (err) {
      console.error('Error fetching monthly stats:', err)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (mode === 'general') {
      fetchStats()
    } else if (mode === 'individual' && selectedUserId) {
      fetchStats(selectedUserId)
    }
  }, [tipo, mode, selectedUserId])

  const chartData = data.map(d => ({
    name: d.label,
    total: mode === 'individual' ? d.global : d.filtered,
    ...(mode === 'individual' ? { individual: d.filtered } : {})
  }))

  const tipoLabel = tipo === 'supervisor' ? 'Supervisores' : tipo === 'asesor' ? 'Asesores' : tipo === 'auditor' ? 'Auditores' : 'Administrativos'

  return (
    <div className={cn(
      "rounded-xl border p-4 mb-4",
      theme === "dark"
        ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
        : "bg-white border-gray-200 shadow-sm"
    )}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4" style={{ color: accentColor }} />
          <h4 className={cn("text-sm font-semibold", theme === "dark" ? "text-white" : "text-gray-800")}>
            Comparativa Mensual — {tipoLabel}
          </h4>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle General / Individual */}
          <div className={cn(
            "flex rounded-lg border overflow-hidden text-xs",
            theme === "dark" ? "border-white/10" : "border-gray-200"
          )}>
            <button
              onClick={() => { setMode('general'); setSelectedUserId('') }}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 transition-colors",
                mode === 'general'
                  ? "text-white"
                  : theme === "dark" ? "text-gray-400 hover:bg-white/10" : "text-gray-600 hover:bg-gray-100"
              )}
              style={mode === 'general' ? { backgroundColor: accentColor } : {}}
            >
              <Users className="w-3 h-3" /> General
            </button>
            <button
              onClick={() => setMode('individual')}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 transition-colors",
                mode === 'individual'
                  ? "text-white"
                  : theme === "dark" ? "text-gray-400 hover:bg-white/10" : "text-gray-600 hover:bg-gray-100"
              )}
              style={mode === 'individual' ? { backgroundColor: accentColor } : {}}
            >
              <User className="w-3 h-3" /> Individual
            </button>
          </div>

          {/* User selector for individual mode */}
          {mode === 'individual' && (
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className={cn(
                "px-2 py-1.5 rounded-lg border text-xs min-w-[160px]",
                theme === "dark"
                  ? "bg-white/5 border-white/10 text-white"
                  : "bg-white border-gray-200 text-gray-800"
              )}
            >
              <option value="">Seleccionar usuario</option>
              {userList.map(u => (
                <option key={u._id} value={u._id}>{u.nombre}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <RefreshCw className="w-5 h-5 animate-spin" style={{ color: accentColor }} />
        </div>
      ) : chartData.length === 0 ? (
        <div className={cn("text-center py-8 text-xs", theme === "dark" ? "text-gray-500" : "text-gray-400")}>
          Sin datos para mostrar
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={theme === "dark" ? "rgba(255,255,255,0.06)" : "#f0f0f0"}
            />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: theme === "dark" ? "#9ca3af" : "#6b7280" }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: theme === "dark" ? "#9ca3af" : "#6b7280" }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: theme === "dark" ? "#1f2937" : "#fff",
                border: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.1)" : "#e5e7eb"}`,
                borderRadius: 8,
                fontSize: 12
              }}
              labelStyle={{ color: theme === "dark" ? "#fff" : "#111" }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar
              dataKey="total"
              name={mode === 'individual' ? "Total General" : `Total ${tipoLabel}`}
              fill={mode === 'general' ? accentColor : (theme === "dark" ? "rgba(255,255,255,0.15)" : "#d1d5db")}
              radius={[4, 4, 0, 0]}
            />
            {mode === 'individual' && selectedUserId && (
              <Bar
                dataKey="individual"
                name="Usuario seleccionado"
                fill={accentColor}
                radius={[4, 4, 0, 0]}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
