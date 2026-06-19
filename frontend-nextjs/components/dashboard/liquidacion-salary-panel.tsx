"use client"

import React, { useMemo } from "react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
// Eliminado import de api - usando cálculo local únicamente
import { DollarSign, TrendingUp, Award, Wallet, Users, Calculator } from "lucide-react"

interface SalaryData {
  basico: number
  comision: number
  premioSemanal: number
  total: number
  ventasMensuales: number
  ventasSemanal: number
  detalle?: {
    escalaBasico: string
    escalaComision: string
    escalaPremio: string
  }
}

interface UserWithSales {
  _id: string
  nombre: string
  ventasMensuales: number
  numeroEquipo?: string
  role?: string
}

interface Props {
  tipo: 'asesor' | 'supervisor' | 'auditor'
  userId?: string
  userName?: string
  ventasMensuales: number
  ventasSemanal: number
  isGlobalView: boolean
  userList?: UserWithSales[]
  dateFrom?: string
  dateTo?: string
}

const formatCurrency = (amount: number): string => {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}k`
  }
  return `$${amount}`
}

const formatCurrencyFull = (amount: number): string => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

function calculateLocalSalary(tipo: string, ventas: number, ventasSem: number, numeroEquipo?: string): SalaryData {
  if (tipo === 'asesor') {
    let basico = 400000
    if (ventas >= 17 && ventas <= 20) basico = 500000
    else if (ventas >= 21) basico = 700000
    let comision = 0
    if (ventas >= 10 && ventas <= 11) comision = 110000
    else if (ventas >= 12 && ventas <= 16) comision = 200000
    else if (ventas >= 17 && ventas <= 20) comision = 350000
    else if (ventas >= 21 && ventas <= 23) comision = 500000
    else if (ventas >= 24) comision = 700000
    let premioSemanal = 0
    if (ventasSem >= 10) premioSemanal = 200000
    else if (ventasSem >= 8) premioSemanal = 100000
    else if (ventasSem >= 6) premioSemanal = 80000
    else if (ventasSem >= 4) premioSemanal = 40000
    return {
      basico, comision, premioSemanal,
      total: basico + comision + premioSemanal,
      ventasMensuales: ventas, ventasSemanal: ventasSem,
      detalle: {
        escalaBasico: ventas >= 21 ? 'Más de 20 ventas' : ventas >= 17 ? '17-20 ventas' : '0-16 ventas',
        escalaComision: ventas >= 24 ? '24+ ventas' : ventas >= 21 ? '21-23 ventas' : ventas >= 17 ? '17-20 ventas' : ventas >= 12 ? '12-16 ventas' : ventas >= 10 ? '10-11 ventas' : 'Sin comisión',
        escalaPremio: ventasSem >= 10 ? '10 QR' : ventasSem >= 8 ? '8-9 QR' : ventasSem >= 6 ? '6-7 QR' : ventasSem >= 4 ? '4-5 QR' : ventasSem >= 3 ? '3 QR (Sábado free)' : 'Sin premio'
      }
    }
  } else if (tipo === 'supervisor') {
    let basico = ventas >= 61 ? 700000 : 500000
    let comision = 0
    if (ventas >= 120) comision = 1500000
    else if (ventas >= 100) comision = 1100000
    else if (ventas >= 80) comision = 800000
    else if (ventas >= 60) comision = 500000
    let premioSemanal = 0
    if (ventasSem >= 30) premioSemanal = 700000
    else if (ventasSem >= 25) premioSemanal = 500000
    else if (ventasSem >= 20) premioSemanal = 150000
    else if (ventasSem >= 18) premioSemanal = 100000
    return {
      basico, comision, premioSemanal,
      total: basico + comision + premioSemanal,
      ventasMensuales: ventas, ventasSemanal: ventasSem,
      detalle: {
        escalaBasico: ventas >= 61 ? '61+ ventas' : '0-60 ventas',
        escalaComision: ventas >= 120 ? '120 QR' : ventas >= 100 ? '100 QR' : ventas >= 80 ? '80 QR' : ventas >= 60 ? '60 QR' : 'Sin comisión',
        escalaPremio: ventasSem >= 30 ? '30 QR' : ventasSem >= 25 ? '25-29 QR' : ventasSem >= 20 ? '20-24 QR' : ventasSem >= 18 ? '18-19 QR' : 'Sin premio'
      }
    }
  } else {
    // Auditor with numeroEquipo (hybrid): no basic salary, $4,000 per audit
    const isHybrid = Boolean(numeroEquipo)
    const basico = isHybrid ? 0 : 400000
    const comision = isHybrid ? ventas * 4000 : ventas * 3500
    return {
      basico, comision, premioSemanal: 0,
      total: basico + comision,
      ventasMensuales: ventas, ventasSemanal: 0,
      detalle: {
        escalaBasico: isHybrid ? 'Sin básico (asesor-auditor)' : 'Base fija',
        escalaComision: isHybrid ? `$4.000 x ${ventas} auditorías` : `$3.500 x ${ventas} auditorías`,
        escalaPremio: 'No aplica'
      }
    }
  }
}

function sortByVentasDesc(a: { salary: SalaryData }, b: { salary: SalaryData }) {
  return b.salary.ventasMensuales - a.salary.ventasMensuales
}

function groupAsesorRows(rows: Array<{ userId: string; userName: string; salary: SalaryData; numeroEquipo: string }>) {
  const groups: Record<string, typeof rows> = {}
  rows.forEach(r => {
    const key = r.numeroEquipo || 'Sin equipo'
    if (!groups[key]) groups[key] = []
    groups[key].push(r)
  })
  // Sort each group by sales desc
  Object.values(groups).forEach(g => g.sort(sortByVentasDesc))
  // Sort group keys: numbered first, 'Sin equipo' last
  const sortedKeys = Object.keys(groups).sort((a, b) => {
    if (a === 'Sin equipo') return 1
    if (b === 'Sin equipo') return -1
    return a.localeCompare(b, undefined, { numeric: true })
  })
  return { groups, sortedKeys }
}

export function LiquidacionSalaryPanel({ 
  tipo, 
  userId, 
  userName,
  ventasMensuales, 
  ventasSemanal,
  isGlobalView,
  userList = [],
  dateFrom,
  dateTo
}: Props) {
  const { theme } = useTheme()

  // Individual view: compute from props directly (no state needed)
  const individualData = useMemo(
    () => calculateLocalSalary(tipo, ventasMensuales, ventasSemanal),
    [tipo, ventasMensuales, ventasSemanal]
  )

  // Global view: compute per-user salary from userList.ventasMensuales (real counts passed from parent)
  const groupSalaries = useMemo(() => {
    if (!isGlobalView) return []
    return userList.map(user => ({
      userId: user._id,
      userName: user.nombre,
      numeroEquipo: user.numeroEquipo || '',
      salary: calculateLocalSalary(tipo, user.ventasMensuales, 0, user.numeroEquipo)
    }))
  }, [isGlobalView, userList, tipo])

  const isAsesor = tipo === 'asesor'
  const isSupervisor = tipo === 'supervisor'
  const isAuditor = tipo === 'auditor'

  // Vista Global - Resumen de grupo
  if (isGlobalView) {
    // Sort: supervisors/auditors desc by sales; asesores grouped by team
    const totalPagar = groupSalaries.reduce((sum, item) => sum + item.salary.total, 0)
    const promedio = groupSalaries.length > 0 ? totalPagar / groupSalaries.length : 0

    let tableContent: React.ReactNode

    if (isAsesor) {
      const { groups, sortedKeys } = groupAsesorRows(groupSalaries)
      tableContent = (
        <>
          {sortedKeys.map(groupKey => (
            <React.Fragment key={groupKey}>
              <tr className={cn(
                "border-t",
                theme === "dark" ? "border-white/10 bg-emerald-900/20" : "border-emerald-200 bg-emerald-50"
              )}>
                <td colSpan={6} className={cn("px-2 py-1 text-[10px] font-semibold tracking-wide",
                  theme === "dark" ? "text-emerald-400" : "text-emerald-700"
                )}>
                  Equipo {groupKey}
                </td>
              </tr>
              {groups[groupKey].map((item, idx) => (
                <tr key={item.userId} className={cn(
                  "border-t",
                  theme === "dark" ? "border-white/5" : "border-gray-200",
                  idx % 2 === 0 ? (theme === "dark" ? "bg-white/[0.02]" : "bg-white") : ""
                )}>
                  <td className="p-2 text-gray-700 dark:text-gray-300">{item.userName}</td>
                  <td className="p-2 text-right text-gray-600 dark:text-gray-400">{item.salary.ventasMensuales}</td>
                  <td className="p-2 text-right text-gray-600 dark:text-gray-400">{formatCurrency(item.salary.basico)}</td>
                  <td className="p-2 text-right text-gray-600 dark:text-gray-400">{formatCurrency(item.salary.comision)}</td>
                  <td className="p-2 text-right text-gray-600 dark:text-gray-400">{formatCurrency(item.salary.premioSemanal)}</td>
                  <td className="p-2 text-right font-semibold text-emerald-500">
                    {formatCurrency(item.salary.total)}
                  </td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </>
      )
    } else {
      const sorted = [...groupSalaries].sort(sortByVentasDesc)
      tableContent = (
        <>
          {sorted.map((item, idx) => (
            <tr key={item.userId} className={cn(
              "border-t",
              theme === "dark" ? "border-white/5" : "border-gray-200",
              idx % 2 === 0 ? (theme === "dark" ? "bg-white/[0.02]" : "bg-white") : ""
            )}>
              <td className="p-2 text-gray-700 dark:text-gray-300">{item.userName}</td>
              <td className="p-2 text-right text-gray-600 dark:text-gray-400">{item.salary.ventasMensuales}</td>
              <td className="p-2 text-right text-gray-600 dark:text-gray-400">{formatCurrency(item.salary.basico)}</td>
              <td className="p-2 text-right text-gray-600 dark:text-gray-400">{formatCurrency(item.salary.comision)}</td>
              <td className="p-2 text-right text-gray-600 dark:text-gray-400">{formatCurrency(item.salary.premioSemanal)}</td>
              <td className={cn("p-2 text-right font-semibold",
                isSupervisor ? "text-violet-500" : "text-blue-500"
              )}>
                {formatCurrency(item.salary.total)}
              </td>
            </tr>
          ))}
        </>
      )
    }

    return (
      <div className={cn(
        "rounded-xl border p-4 mb-4",
        theme === "dark"
          ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
          : "bg-white border-gray-200 shadow-sm"
      )}>
        <div className="flex items-center gap-2 mb-4">
          <Users className={cn("w-5 h-5", 
            isAsesor ? "text-emerald-500" : isSupervisor ? "text-violet-500" : "text-blue-500"
          )} />
          <h4 className={cn("text-sm font-semibold", theme === "dark" ? "text-white" : "text-gray-800")}>
            Resumen de Sueldos — {isAsesor ? 'Asesores' : isSupervisor ? 'Supervisores' : 'Auditores'}
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className={cn("rounded-lg p-3", theme === "dark" ? "bg-white/5" : "bg-gray-50")}>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total a pagar (grupo)</div>
            <div className={cn("text-xl font-bold",
              isAsesor ? "text-emerald-500" : isSupervisor ? "text-violet-500" : "text-blue-500"
            )}>{formatCurrencyFull(totalPagar)}</div>
          </div>
          <div className={cn("rounded-lg p-3", theme === "dark" ? "bg-white/5" : "bg-gray-50")}>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Promedio por persona</div>
            <div className={cn("text-xl font-bold", theme === "dark" ? "text-gray-200" : "text-gray-800")}>
              {formatCurrencyFull(promedio)}
            </div>
          </div>
          <div className={cn("rounded-lg p-3", theme === "dark" ? "bg-white/5" : "bg-gray-50")}>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Cantidad de {isAsesor ? 'asesores' : isSupervisor ? 'supervisores' : 'auditores'}</div>
            <div className={cn("text-xl font-bold", theme === "dark" ? "text-gray-200" : "text-gray-800")}>
              {groupSalaries.length}
            </div>
          </div>
        </div>

        {groupSalaries.length > 0 && (
          <div className={cn("rounded-lg overflow-hidden", theme === "dark" ? "bg-white/5" : "bg-gray-50")}>
            <div className="max-h-56 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className={cn("sticky top-0", theme === "dark" ? "bg-gray-800" : "bg-gray-100")}>
                  <tr>
                    <th className="text-left p-2 font-medium text-gray-500 dark:text-gray-400">Nombre</th>
                    <th className="text-right p-2 font-medium text-gray-500 dark:text-gray-400">{isAuditor ? 'Auditorías' : 'Ventas'}</th>
                    <th className="text-right p-2 font-medium text-gray-500 dark:text-gray-400">Básico</th>
                    <th className="text-right p-2 font-medium text-gray-500 dark:text-gray-400">Comisión</th>
                    <th className="text-right p-2 font-medium text-gray-500 dark:text-gray-400">Premio</th>
                    <th className="text-right p-2 font-medium text-gray-500 dark:text-gray-400">Total</th>
                  </tr>
                </thead>
                <tbody>{tableContent}</tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Vista Individual
  const data = individualData

  return (
    <div className={cn(
      "rounded-xl border p-4 mb-4",
      theme === "dark"
        ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
        : "bg-white border-gray-200 shadow-sm"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calculator className={cn("w-5 h-5", 
            isAsesor ? "text-emerald-500" : isSupervisor ? "text-violet-500" : "text-blue-500"
          )} />
          <h4 className={cn("text-sm font-semibold", theme === "dark" ? "text-white" : "text-gray-800")}>
            Cálculo de Sueldo — {userName || (isAsesor ? 'Asesor' : isSupervisor ? 'Supervisor' : 'Auditor')}
          </h4>
        </div>
      </div>

      {/* Desglose del sueldo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {/* Básico */}
        <div className={cn(
          "rounded-lg p-3",
          theme === "dark" ? "bg-white/5" : "bg-gray-50"
        )}>
          <div className="flex items-center gap-1.5 mb-1">
            <Wallet className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Sueldo básico</span>
          </div>
          <div className={cn("text-lg font-bold", theme === "dark" ? "text-gray-200" : "text-gray-800")}>
            {formatCurrencyFull(data.basico)}
          </div>
          {data.detalle && (
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {data.detalle.escalaBasico}
            </div>
          )}
        </div>

        {/* Comisión */}
        <div className={cn(
          "rounded-lg p-3",
          theme === "dark" ? "bg-white/5" : "bg-gray-50"
        )}>
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Comisión mensual</span>
          </div>
          <div className={cn("text-lg font-bold", 
            data.comision > 0 
              ? (isAsesor ? "text-emerald-500" : isSupervisor ? "text-violet-500" : "text-blue-500")
              : (theme === "dark" ? "text-gray-400" : "text-gray-500")
          )}>
            {formatCurrencyFull(data.comision)}
          </div>
          {data.detalle && (
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {data.detalle.escalaComision}
            </div>
          )}
        </div>

        {/* Premio Semanal */}
        {!isAuditor && (
          <div className={cn(
            "rounded-lg p-3",
            theme === "dark" ? "bg-white/5" : "bg-gray-50"
          )}>
            <div className="flex items-center gap-1.5 mb-1">
              <Award className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Premio semanal</span>
            </div>
            <div className={cn("text-lg font-bold",
              data.premioSemanal > 0 ? "text-amber-500" : (theme === "dark" ? "text-gray-400" : "text-gray-500")
            )}>
              {formatCurrencyFull(data.premioSemanal)}
            </div>
            {data.detalle && (
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {data.detalle.escalaPremio}
              </div>
            )}
          </div>
        )}

        {/* Total */}
        <div className={cn(
          "rounded-lg p-3 border-2",
          theme === "dark" 
            ? isAsesor ? "bg-emerald-900/30 border-emerald-800/50" : isSupervisor ? "bg-violet-900/30 border-violet-800/50" : "bg-blue-900/30 border-blue-800/50"
            : isAsesor ? "bg-emerald-50 border-emerald-200" : isSupervisor ? "bg-violet-50 border-violet-200" : "bg-blue-50 border-blue-200"
        )}>
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className={cn("w-3.5 h-3.5", 
              isAsesor ? "text-emerald-500" : isSupervisor ? "text-violet-500" : "text-blue-500"
            )} />
            <span className={cn("text-xs font-medium",
              isAsesor ? "text-emerald-600 dark:text-emerald-400" : isSupervisor ? "text-violet-600 dark:text-violet-400" : "text-blue-600 dark:text-blue-400"
            )}>
              TOTAL ESTIMADO
            </span>
          </div>
          <div className={cn("text-xl font-bold",
            isAsesor ? "text-emerald-600 dark:text-emerald-400" : isSupervisor ? "text-violet-600 dark:text-violet-400" : "text-blue-600 dark:text-blue-400"
          )}>
            {formatCurrencyFull(data.total)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {data.ventasMensuales} {isAuditor ? 'auditorías' : 'ventas'}
          </div>
        </div>
      </div>

      {/* Info adicional para auditores */}
      {isAuditor && (
        <div className={cn(
          "rounded-lg p-2 text-xs",
          theme === "dark" ? "bg-blue-900/20 text-blue-300" : "bg-blue-50 text-blue-700"
        )}>
          <strong>Fórmula:</strong> $400.000 (básico) + (${data.ventasMensuales} auditorías × $3.500) = {formatCurrencyFull(data.total)}
        </div>
      )}
    </div>
  )
}
