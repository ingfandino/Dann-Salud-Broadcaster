"use client"

/**
 * ============================================================
 * BAJO RENDIMIENTO (rrhh-bajo-rendimiento.tsx)
 * ============================================================
 * Panel de control para monitorear rendimiento de Supervisores y Asesores.
 * Muestra alertas en tiempo real (Quincena/Mes) e historial mensual.
 */

import { useState, useEffect, useMemo } from "react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import {
  TrendingDown,
  AlertTriangle,
  Calendar,
  Users,
  BarChart3,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
  Target,
  Award,
  XCircle,
  History,
  Info,
  User,
  ShieldAlert,
  Clock
} from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend
} from "recharts"
import { motion, AnimatePresence } from "framer-motion"

// Colores unificados con Estadísticas
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

interface User {
  _id: string
  nombre: string
  email: string
  numeroEquipo?: string
}

interface LowPerformaceUser {
  user: User
  qrHechoCount: number
  threshold: number
  deficit: number
  advisorCount?: number // Nuevo campo para Supervisores
}

interface PeriodMetrics {
  fortnight: LowPerformaceUser[]
  month: LowPerformaceUser[]
}

export function RRHHBajoRendimiento() {
  const { theme } = useTheme()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'supervisor' | 'asesor'>('supervisor')
  // Inicializar visibilidad de quincena según fecha actual
  const [showFortnight, setShowFortnight] = useState(new Date().getDate() <= 15)

  // Data State
  const [currentMetrics, setCurrentMetrics] = useState<{
    supervisors: PeriodMetrics
    asesors: PeriodMetrics
    periodInfo: {
      fortnight: { start: string, end: string }
      month: { start: string, end: string }
    }
  } | null>(null)

  const [historyStats, setHistoryStats] = useState<any>(null)
  const [evaluating, setEvaluating] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [currentRes, statsRes] = await Promise.all([
        api.lowPerformance.getCurrentPeriod(),
        api.lowPerformance.getStats()
      ])

      setCurrentMetrics(currentRes.data)
      setHistoryStats(statsRes.data)
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Error al cargar datos de rendimiento")
    } finally {
      setLoading(false)
    }
  }

  const handleEvaluatePreviousMonth = async () => {
    try {
      setEvaluating(true)
      await api.lowPerformance.evaluate({}) // {} usa mes anterior por defecto
      toast.success("Evaluación histórica completada correctamente")
      fetchData() // Recargar datos
    } catch (error) {
      toast.error("Error al evaluar historial")
    } finally {
      setEvaluating(false)
    }
  }

  // Filtrar métricas según tab activo
  const activeMetrics = activeTab === 'supervisor'
    ? currentMetrics?.supervisors
    : currentMetrics?.asesors

  const thresholdFortnight = activeTab === 'supervisor' ? 30 : 6
  const thresholdMonth = activeTab === 'supervisor' ? 50 : 8

  // Helpers de fecha
  const currentMonthName = new Date().toLocaleDateString('es-ES', { month: 'long' });
  const isAfterFortnight = new Date().getDate() > 15;

  // Filtrar historial (Top Recurrent) según rol activo
  const topRecurrent = activeTab === 'supervisor'
    ? historyStats?.topSupervisors || []
    : historyStats?.topAsesors || []

  // --- RENDER ITEMS ---
  const renderItem = (item: LowPerformaceUser, idx: number, threshold: number) => (
    <div key={idx} className={cn(
      "flex items-center justify-between p-3 rounded-lg border transition-colors mb-2 last:mb-0",
      activeTab === 'supervisor'
        ? "bg-card/50 hover:bg-accent/5"
        : "bg-card hover:bg-accent/5"
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs",
          activeTab === 'supervisor'
            ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
            : "bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400"
        )}>
          {item.qrHechoCount}
        </div>
        <div>
          <p className="font-medium text-sm">{item.user.nombre}</p>
          {/* Mostrar conteo de asesores solo para Supervisores y si existe el dato */}
          {activeTab === 'supervisor' && item.advisorCount !== undefined && (
            <p className="text-[10px] italic text-muted-foreground/70">
              Asesores asignados: {item.advisorCount}
            </p>
          )}
          {item.user.numeroEquipo && (
            <p className="text-xs text-muted-foreground">Equipo {item.user.numeroEquipo}</p>
          )}
        </div>
      </div>
      <div className="text-right">
        <span className="text-xs font-medium text-red-500">Faltan {item.deficit}</span>
        <div className="w-24 h-1.5 bg-secondary/20 rounded-full mt-1 overflow-hidden">
          <div
            className={cn("h-full", activeTab === 'supervisor' ? "bg-orange-500" : "bg-pink-500")}
            style={{ width: `${Math.min((item.qrHechoCount / threshold) * 100, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );

  const renderGroupedAsesores = (items: LowPerformaceUser[], threshold: number) => {
    // 1. Agrupar por equipo
    const grouped = items.reduce((acc, item) => {
      const team = item.user.numeroEquipo || 'Sin Equipo';
      if (!acc[team]) acc[team] = [];
      acc[team].push(item);
      return acc;
    }, {} as Record<string, LowPerformaceUser[]>);

    // 2. Ordenar claves de equipos (numérico)
    const sortedTeams = Object.keys(grouped).sort((a, b) => {
      if (a === 'Sin Equipo') return 1;
      if (b === 'Sin Equipo') return -1;
      return parseInt(a) - parseInt(b);
    });

    return sortedTeams.map(team => (
      <div key={team} className="mb-4 last:mb-0">
        <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-2 pl-1 border-l-2 border-primary/40">
          Equipo {team}
        </h4>
        <div className="space-y-1 pl-1">
          {/* Los items ya vienen ordenados por qrHechoCount ascendente desde Backend */}
          {grouped[team].map((item, idx) => renderItem(item, idx, threshold))}
        </div>
      </div>
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Cargando análisis de rendimiento...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Control de Bajo Rendimiento
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Monitoreo en tiempo real de metas quincenales y mensuales.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-secondary/20 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('supervisor')}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2",
              activeTab === 'supervisor'
                ? "bg-white dark:bg-zinc-800 shadow-sm text-primary ring-1 ring-primary/20"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Users className="w-4 h-4" />
            Supervisores
          </button>
          <button
            onClick={() => setActiveTab('asesor')}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2",
              activeTab === 'asesor'
                ? "bg-white dark:bg-zinc-800 shadow-sm text-pink-600 dark:text-pink-400 ring-1 ring-pink-500/20"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <User className="w-4 h-4" />
            Asesores
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* COLUMNA 1: ALERTA QUINCENAL (1-15) */}
        {!showFortnight && isAfterFortnight ? (
          <div className="bg-card rounded-xl border border-dashed shadow-sm flex flex-col items-center justify-center p-8 text-muted-foreground gap-3 min-h-[300px]">
            <Clock className="w-10 h-10 opacity-20" />
            <p className="text-sm">El periodo quincenal ha finalizado.</p>
            <button
              onClick={() => setShowFortnight(true)}
              className="text-xs bg-secondary/50 hover:bg-secondary text-secondary-foreground px-3 py-1.5 rounded transition-colors"
            >
              Ver Histórico Quincena
            </button>
          </div>
        ) : (
          <motion.div
            className="bg-card rounded-xl border shadow-sm overflow-hidden"
            initial="initial" animate="animate" variants={fadeInUp}
          >
            <div className="p-4 border-b bg-gradient-to-r from-orange-50 to-transparent dark:from-orange-950/20 flex justify-between items-center">
              <div className="flex items-center gap-2 text-warning">
                <Clock className="w-5 h-5" />
                <h3 className="font-semibold text-sm md:text-base capitalize">
                  Del 01 al 15 de {currentMonthName}
                </h3>
              </div>
              <div className="text-xs font-mono bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 px-2 py-1 rounded">
                Meta: {thresholdFortnight}
              </div>
            </div>

            <div className="p-4">
              {activeMetrics?.fortnight.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p>Todos cumplen la meta quincenal</p>
                </div>
              ) : (
                <div className="space-y-1 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {activeTab === 'asesor'
                    ? renderGroupedAsesores(activeMetrics!.fortnight, thresholdFortnight)
                    : activeMetrics?.fortnight.map((item, idx) => renderItem(item, idx, thresholdFortnight))
                  }
                </div>
              )}

              <div className="mt-4 p-3 bg-secondary/10 rounded text-xs text-muted-foreground flex gap-2">
                <Info className="w-4 h-4 shrink-0" />
                <p>Datos en tiempo real (1-15). No genera historial.</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* COLUMNA 2: EVALUACIÓN MENSUAL */}
        <motion.div
          className="bg-card rounded-xl border shadow-sm overflow-hidden"
          initial="initial" animate="animate" variants={fadeInUp} transition={{ delay: 0.1 }}
        >
          <div className="p-4 border-b bg-gradient-to-r from-red-50 to-transparent dark:from-red-950/20 flex justify-between items-center">
            <div className="flex items-center gap-2 text-error">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="font-semibold text-sm md:text-base">Cierre Mensual</h3>
            </div>
            <div className="text-xs font-mono bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 px-2 py-1 rounded">
              Meta: {thresholdMonth}
            </div>
          </div>

          <div className="p-4">
            {activeMetrics?.month.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Award className="w-12 h-12 mx-auto mb-2 opacity-20 text-success" />
                <p>Todos cumplen la meta mensual actual</p>
              </div>
            ) : (
              <div className="space-y-1 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {activeTab === 'asesor'
                  ? renderGroupedAsesores(activeMetrics!.month, thresholdMonth)
                  : activeMetrics?.month.map((item, idx) => renderItem(item, idx, thresholdMonth))
                }
              </div>
            )}

            <div className="mt-4 pt-4 border-t flex justify-between items-center">
              <p className="text-xs text-muted-foreground capitalize">
                {currentMonthName} {new Date().getFullYear()}
              </p>
              <button
                onClick={handleEvaluatePreviousMonth}
                disabled={evaluating}
                className="text-xs bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded transition-colors flex items-center gap-1"
              >
                {evaluating ? <Loader2 className="w-3 h-3 animate-spin" /> : <History className="w-3 h-3" />}
                Guardar Cierre Mes Anterior
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* SECCIÓN HISTÓRICO */}
      <motion.div
        className="mt-8 pt-8 border-t"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          Historial de Incumplimientos ({activeTab === 'supervisor' ? 'Supervisores' : 'Asesores'})
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Recurrentes Chart */}
          <div className="lg:col-span-1 bg-card border rounded-xl p-4 shadow-sm">
            <h4 className="text-sm font-medium mb-4 text-center text-muted-foreground">Más Recurrentes (Acumulado)</h4>
            <div className="h-[300px] w-full">
              {topRecurrent.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topRecurrent}
                      dataKey="appearances"
                      nameKey={(entry) => entry.user.nombre}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {topRecurrent.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index % 5]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Legend layout="horizontal" verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  Sin datos históricos
                </div>
              )}
            </div>
          </div>

          {/* Lista Detallada */}
          <div className="lg:col-span-2 space-y-3">
            {topRecurrent.length === 0 ? (
              <div className="text-center py-12 bg-secondary/5 rounded-xl border border-dashed">
                <p className="text-muted-foreground">No hay registros históricos de incumplimiento para este rol.</p>
              </div>
            ) : (
              topRecurrent.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-card border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{item.user.nombre}</p>
                      <div className="flex gap-4 text-sm text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-error" />
                          {item.appearances} Fallos
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingDown className="w-3 h-3" />
                          Promedio QR: {item.avgQrCount}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground mb-1">Déficit Acumulado</p>
                    <span className="text-lg font-bold text-error">-{item.totalDeficit} QR</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
