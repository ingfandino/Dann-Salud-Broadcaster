"use client"

import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import { Target, Trophy, TrendingUp } from "lucide-react"

interface Props {
  tipo: 'asesor' | 'supervisor'
  ventasMensuales: number
  ventasSemanal: number
  isIndividualView: boolean
}

// Escalas de comisión para Asesores (Telemarketer)
const ESCALA_ASESOR_MENSUAL = [
  { min: 10, max: 11, comision: 110000, label: '$110k' },
  { min: 12, max: 16, comision: 200000, label: '$200k' },
  { min: 17, max: 20, comision: 350000, label: '$350k' },
  { min: 21, max: 23, comision: 500000, label: '$500k' },
  { min: 24, max: Infinity, comision: 700000, label: '$700k' },
]

const ESCALA_ASESOR_SEMANAL = [
  { min: 3, max: 3, premio: 0, label: 'Sábado libre', type: 'reward' },
  { min: 4, max: 5, premio: 40000, label: '$40k' },
  { min: 6, max: 7, premio: 80000, label: '$80k' },
  { min: 8, max: 9, premio: 100000, label: '$100k' },
  { min: 10, max: Infinity, premio: 200000, label: '$200k' },
]

// Escalas de comisión para Supervisores
const ESCALA_SUPERVISOR_MENSUAL = [
  { min: 60, max: 79, comision: 500000, label: '$500k' },
  { min: 80, max: 99, comision: 800000, label: '$800k' },
  { min: 100, max: 119, comision: 1100000, label: '$1.1M' },
  { min: 120, max: Infinity, comision: 1500000, label: '$1.5M' },
]

const ESCALA_SUPERVISOR_SEMANAL = [
  { min: 18, max: 19, premio: 100000, label: '$100k' },
  { min: 20, max: 24, premio: 150000, label: '$150k' },
  { min: 25, max: 29, premio: 500000, label: '$500k' },
  { min: 30, max: Infinity, premio: 700000, label: '$700k' },
]

export function MotivationalProgressBars({ tipo, ventasMensuales, ventasSemanal, isIndividualView }: Props) {
  const { theme } = useTheme()
  
  // No mostrar en vista global (solo cuando se filtra por un asesor/supervisor específico)
  if (!isIndividualView) return null

  const isAsesor = tipo === 'asesor'
  const themeColor = isAsesor ? 'emerald' : 'violet'
  
  // Determinar metas mensuales
  const escalaMensual = isAsesor ? ESCALA_ASESOR_MENSUAL : ESCALA_SUPERVISOR_MENSUAL
  const currentMetaMensual = escalaMensual.find(e => ventasMensuales >= e.min && ventasMensuales <= e.max) || 
                              escalaMensual.find(e => ventasMensuales < e.min) || 
                              escalaMensual[escalaMensual.length - 1]
  
  const nextMetaMensual = escalaMensual.find(e => e.min > ventasMensuales)
  const prevMetaMensual = [...escalaMensual].reverse().find(e => ventasMensuales > e.max)
  
  // Calcular progreso mensual
  const progressMensual = nextMetaMensual 
    ? Math.min(100, ((ventasMensuales - (prevMetaMensual?.max || 0)) / (nextMetaMensual.min - (prevMetaMensual?.max || 0))) * 100)
    : 100

  // Determinar metas semanales
  const escalaSemanal = isAsesor ? ESCALA_ASESOR_SEMANAL : ESCALA_SUPERVISOR_SEMANAL
  const currentMetaSemanal = escalaSemanal.find(e => ventasSemanal >= e.min && ventasSemanal <= e.max) ||
                             escalaSemanal.find(e => ventasSemanal < e.min) ||
                             escalaSemanal[escalaSemanal.length - 1]
  
  const nextMetaSemanal = escalaSemanal.find(e => e.min > ventasSemanal)
  const prevMetaSemanal = [...escalaSemanal].reverse().find(e => ventasSemanal > e.max)
  
  // Calcular progreso semanal
  const progressSemanal = nextMetaSemanal
    ? Math.min(100, ((ventasSemanal - (prevMetaSemanal?.max || 0)) / (nextMetaSemanal.min - (prevMetaSemanal?.max || 0))) * 100)
    : 100

  const faltanMensual = nextMetaMensual ? nextMetaMensual.min - ventasMensuales : 0
  const faltanSemanal = nextMetaSemanal ? nextMetaSemanal.min - ventasSemanal : 0

  return (
    <div className={cn(
      "rounded-xl border p-4 mb-4 space-y-4",
      theme === "dark"
        ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
        : "bg-white border-gray-200 shadow-sm"
    )}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Target className={cn("w-5 h-5", isAsesor ? "text-emerald-500" : "text-violet-500")} />
        <h4 className={cn("text-sm font-semibold", theme === "dark" ? "text-white" : "text-gray-800")}>
          Progreso de Metas — {isAsesor ? 'Asesor' : 'Supervisor'}
        </h4>
      </div>

      {/* Barra Mensual - Principal */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className={cn("w-4 h-4", isAsesor ? "text-emerald-400" : "text-violet-400")} />
            <span className={cn("text-sm font-medium", theme === "dark" ? "text-gray-200" : "text-gray-700")}>
              Meta Mensual
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("text-lg font-bold", isAsesor ? "text-emerald-500" : "text-violet-500")}>
              {ventasMensuales}
            </span>
            <span className={cn("text-xs", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
              ventas
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className={cn(
          "h-3 rounded-full overflow-hidden",
          theme === "dark" ? "bg-gray-700" : "bg-gray-200"
        )}>
          <div 
            className={cn(
              "h-full rounded-full transition-all duration-700 relative overflow-hidden",
              isAsesor 
                ? "bg-gradient-to-r from-emerald-600 via-emerald-400 to-emerald-500"
                : "bg-gradient-to-r from-violet-600 via-violet-400 to-violet-500"
            )}
            style={{ width: `${progressMensual}%` }}
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" style={{ backgroundSize: '200% 100%', animation: 'shimmer 2s infinite', animationTimingFunction: 'linear' }} />
          </div>
        </div>

        {/* Info de meta */}
        <div className="flex items-center justify-between text-xs">
          <span className={theme === "dark" ? "text-gray-400" : "text-gray-500"}>
            {nextMetaMensual ? (
              <>Te faltan <span className={cn("font-semibold", isAsesor ? "text-emerald-400" : "text-violet-400")}>{faltanMensual}</span> ventas para {nextMetaMensual.label}</>
            ) : (
              <span className={cn("font-semibold", isAsesor ? "text-emerald-400" : "text-violet-400")}>¡Meta máxima alcanzada! 🎉</span>
            )}
          </span>
          {currentMetaMensual && currentMetaMensual.comision > 0 && (
            <span className={cn("font-medium", theme === "dark" ? "text-gray-300" : "text-gray-600")}>
              Comisión actual: <span className={isAsesor ? "text-emerald-500" : "text-violet-500"}>{currentMetaMensual.label}</span>
            </span>
          )}
        </div>
      </div>

      {/* Barra Semanal - Compacta */}
      <div className={cn(
        "rounded-lg p-3 space-y-2",
        theme === "dark" ? "bg-black/20" : "bg-gray-50"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className={cn("w-4 h-4", isAsesor ? "text-amber-400" : "text-amber-500")} />
            <span className={cn("text-xs font-medium", theme === "dark" ? "text-gray-300" : "text-gray-600")}>
              Premio Semanal (Vie-Jue)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("text-base font-bold", isAsesor ? "text-amber-400" : "text-amber-500")}>
              {ventasSemanal}
            </span>
            <span className={cn("text-xs", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
              QR
            </span>
          </div>
        </div>

        {/* Progress Bar Semanal */}
        <div className={cn(
          "h-2 rounded-full overflow-hidden",
          theme === "dark" ? "bg-gray-700" : "bg-gray-200"
        )}>
          <div 
            className="h-full rounded-full bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-400 transition-all duration-700 relative overflow-hidden"
            style={{ width: `${progressSemanal}%` }}
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent" style={{ animation: 'shimmer 2s infinite linear' }} />
          </div>
        </div>

        {/* Info meta semanal */}
        <div className="flex items-center justify-between text-xs">
          <span className={theme === "dark" ? "text-gray-400" : "text-gray-500"}>
            {nextMetaSemanal ? (
              <>Faltan <span className="font-semibold text-amber-500">{faltanSemanal}</span> para {nextMetaSemanal.label}</>
            ) : currentMetaSemanal?.premio > 0 ? (
              <span className="font-semibold text-amber-500">¡{currentMetaSemanal.label} asegurado! 🏆</span>
            ) : (
              <span className="font-semibold text-amber-500">Sábado libre 🎯</span>
            )}
          </span>
          {currentMetaSemanal && currentMetaSemanal.premio > 0 && (
            <span className={cn("font-medium", theme === "dark" ? "text-gray-300" : "text-gray-600")}>
              Premio: <span className="text-amber-500">{currentMetaSemanal.label}</span>
            </span>
          )}
        </div>
      </div>

      {/* Resumen de sueldo estimado */}
      <div className={cn(
        "rounded-lg p-3 flex items-center justify-between",
        theme === "dark" 
          ? isAsesor ? "bg-emerald-900/30 border border-emerald-800/50" : "bg-violet-900/30 border border-violet-800/50"
          : isAsesor ? "bg-emerald-50 border border-emerald-200" : "bg-violet-50 border border-violet-200"
      )}>
        <span className={cn("text-xs font-medium", theme === "dark" ? "text-gray-300" : "text-gray-600")}>
          Sueldo estimado (básico + comisión + premio):
        </span>
        <span className={cn(
          "text-sm font-bold",
          isAsesor 
            ? theme === "dark" ? "text-emerald-400" : "text-emerald-600"
            : theme === "dark" ? "text-violet-400" : "text-violet-600"
        )}>
          {isAsesor ? calcularSueldoAsesor(ventasMensuales, ventasSemanal) : calcularSueldoSupervisor(ventasMensuales, ventasSemanal)}
        </span>
      </div>
    </div>
  )
}

// Funciones auxiliares para cálculo rápido (on-the-fly, sin backend)
function calcularSueldoAsesor(ventas: number, ventasSemanal: number): string {
  // Básico
  let basico = 400000
  if (ventas >= 17 && ventas <= 20) basico = 500000
  else if (ventas >= 21) basico = 700000
  
  // Comisión mensual
  let comision = 0
  if (ventas >= 10 && ventas <= 11) comision = 110000
  else if (ventas >= 12 && ventas <= 16) comision = 200000
  else if (ventas >= 17 && ventas <= 20) comision = 350000
  else if (ventas >= 21 && ventas <= 23) comision = 500000
  else if (ventas >= 24) comision = 700000
  
  // Premio semanal
  let premio = 0
  if (ventasSemanal >= 10) premio = 200000
  else if (ventasSemanal >= 8) premio = 100000
  else if (ventasSemanal >= 6) premio = 80000
  else if (ventasSemanal >= 4) premio = 40000
  
  const total = basico + comision + premio
  return `$${(total / 1000).toFixed(0)}k`
}

function calcularSueldoSupervisor(ventas: number, ventasSemanal: number): string {
  // Básico
  let basico = 500000
  if (ventas >= 61) basico = 700000
  
  // Comisión mensual
  let comision = 0
  if (ventas >= 60 && ventas <= 79) comision = 500000
  else if (ventas >= 80 && ventas <= 99) comision = 800000
  else if (ventas >= 100 && ventas <= 119) comision = 1100000
  else if (ventas >= 120) comision = 1500000
  
  // Premio semanal
  let premio = 0
  if (ventasSemanal >= 30) premio = 700000
  else if (ventasSemanal >= 25) premio = 500000
  else if (ventasSemanal >= 20) premio = 150000
  else if (ventasSemanal >= 18) premio = 100000
  
  const total = basico + comision + premio
  return `$${(total / 1000000).toFixed(1)}M`
}
