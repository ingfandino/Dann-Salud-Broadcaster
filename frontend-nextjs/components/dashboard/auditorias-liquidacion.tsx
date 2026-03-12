/**
 * ============================================================
 * LIQUIDACIÓN DE AUDITORÍAS (auditorias-liquidacion.tsx)
 * ============================================================
 * Vista refactorizada con arquitectura de acordeón (collapse).
 * Tres secciones independientes: Supervisores, Auditores, Administrativos.
 * Cada sección usa LiquidacionTableBase como componente reutilizable.
 */

"use client"

import { useState, useEffect } from "react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth"
import { ChevronDown, ChevronUp, Users, ClipboardCheck, Briefcase, RefreshCw, X } from "lucide-react"
import { LiquidacionTableBase } from "./liquidacion-table-base"
import { api } from "@/lib/api"
import { toast } from "sonner"

/* ============================================================
 * Configuración de secciones del acordeón
 * ============================================================ */
interface CollapseSection {
  id: 'supervisor' | 'auditor' | 'administrativo'
  label: string
  icon: typeof Users
  accentColor: string
  description: string
}

const SECTIONS: CollapseSection[] = [
  {
    id: 'supervisor',
    label: 'Supervisores',
    icon: Users,
    accentColor: '#7C3AED',
    description: 'QR Hecho / Cargada / Aprobada'
  },
  {
    id: 'auditor',
    label: 'Auditores',
    icon: ClipboardCheck,
    accentColor: '#1E88E5',
    description: 'Ventas auditadas con estados de seguimiento'
  },
  {
    id: 'administrativo',
    label: 'Administrativos',
    icon: Briefcase,
    accentColor: '#E53935',
    description: 'Evidencia Terminada / En Proceso'
  }
]

const ALLOWED_SECTIONS_BY_ROLE: Record<string, string[]> = {
  gerencia:           ['supervisor', 'auditor', 'administrativo'],
  encargado:          ['supervisor', 'auditor', 'administrativo'],
  supervisor:         ['supervisor'],
  supervisor_reventa: ['supervisor'],
  asesor:             ['supervisor'],
  auditor:            ['auditor'],
  administrativo:     ['administrativo'],
  independiente:      ['supervisor', 'auditor'],
  recuperador:        ['supervisor'],
}

export function AuditoriasLiquidacion() {
  const { theme } = useTheme()
  const { user } = useAuth()
  const userRole = user?.role?.toLowerCase() || ''
  const isGerencia = userRole === 'gerencia'
  const isEncargado = userRole === 'encargado'

  const allowedSections = ALLOWED_SECTIONS_BY_ROLE[userRole] || []
  const visibleSections = SECTIONS.filter(s => allowedSections.includes(s.id))

  // Solo un panel abierto a la vez (null = todos cerrados)
  const [expandedSection, setExpandedSection] = useState<string | null>(visibleSections[0]?.id || null)

  // Recalculate Modal State (Gerencia only, supervisor section)
  const [showRecalculateModal, setShowRecalculateModal] = useState(false)
  const [recalculating, setRecalculating] = useState(false)
  const [recalcDateFrom, setRecalcDateFrom] = useState("")
  const [recalcDateTo, setRecalcDateTo] = useState("")
  const [onlyMissing, setOnlyMissing] = useState(true)

  const toggleSection = (sectionId: string) => {
    setExpandedSection(prev => prev === sectionId ? null : sectionId)
  }

  const handleRecalculateSupervisors = async () => {
    try {
      setRecalculating(true)
      const response = await api.audits.recalculateSupervisors({
        dateFrom: recalcDateFrom || undefined,
        dateTo: recalcDateTo || undefined,
        onlyMissing
      })
      toast.success(`Recalculación completada: ${response.data.success} exitosos, ${response.data.errors} errores`)
      setShowRecalculateModal(false)
    } catch (error: any) {
      console.error("Error recalculating supervisors:", error)
      toast.error(error.response?.data?.error || "Error al recalcular supervisores")
    } finally {
      setRecalculating(false)
    }
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Header */}
      <div className={cn(
        "rounded-2xl border p-4 shadow-sm",
        theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-gray-200"
      )}>
        <div className="flex flex-col md:flex-row justify-between gap-3 mb-2">
          <div>
            <h2 className={cn("text-lg font-semibold", theme === "dark" ? "text-white" : "text-gray-800")}>
              Liquidación de Auditorías
            </h2>
            <p className="text-xs opacity-60">Semana laboral: Viernes a Jueves · Seleccione una sección</p>
          </div>
          {(isGerencia || isEncargado) && (
            <button
              onClick={() => setShowRecalculateModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs font-medium"
            >
              <RefreshCw className="w-3 h-3" />
              Recalcular Supervisores
            </button>
          )}
        </div>
      </div>

      {/* Accordion Sections */}
      {visibleSections.map((section) => {
        const Icon = section.icon
        const isExpanded = expandedSection === section.id

        return (
          <div key={section.id} className={cn(
            "rounded-2xl border shadow-sm overflow-hidden transition-all duration-300",
            theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-gray-200",
          )} style={isExpanded ? { borderColor: section.accentColor } : {}}>
            {/* Collapse Header */}
            <button
              onClick={() => toggleSection(section.id)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 transition-colors",
                theme === "dark" ? "hover:bg-white/5" : "hover:bg-gray-50"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${section.accentColor}15` }}>
                  <Icon className="w-4 h-4" style={{ color: section.accentColor }} />
                </div>
                <div className="text-left">
                  <span className={cn("text-sm font-semibold", theme === "dark" ? "text-white" : "text-gray-800")}>
                    {section.label}
                  </span>
                  <p className={cn("text-[10px]", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                    {section.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium text-white" style={{ backgroundColor: section.accentColor }}>
                  {section.id === 'supervisor' ? 'QR' : section.id === 'auditor' ? 'SEG' : 'ADM'}
                </span>
                {isExpanded
                  ? <ChevronUp className="w-4 h-4 opacity-50" />
                  : <ChevronDown className="w-4 h-4 opacity-50" />
                }
              </div>
            </button>

            {/* Collapse Body */}
            {isExpanded && (
              <div className="px-4 pb-4 border-t border-gray-200 dark:border-white/5 pt-4">
                <LiquidacionTableBase
                  tipoLiquidacion={section.id}
                  accentColor={section.accentColor}
                />
              </div>
            )}
          </div>
        )
      })}

      {/* Modal de recálculo (Gerencia only) */}
      {showRecalculateModal && (
        <Portal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className={cn(
              "w-full max-w-lg rounded-2xl border p-6 shadow-2xl",
              theme === "dark" ? "bg-[#1a1333] border-white/10" : "bg-white border-gray-200"
            )}>
              <div className="flex items-center justify-between mb-6">
                <h3 className={cn("text-xl font-semibold", theme === "dark" ? "text-white" : "text-gray-800")}>
                  Recalcular Supervisores
                </h3>
                <button
                  onClick={() => setShowRecalculateModal(false)}
                  className={cn("p-1 rounded-lg transition-colors", theme === "dark" ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-500")}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-sm">
                  Esta acción recalculará el supervisor asignado a cada venta basándose en la fecha de la venta y el historial de equipos de los asesores.
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>Desde</label>
                    <input type="date" value={recalcDateFrom} onChange={(e) => setRecalcDateFrom(e.target.value)}
                      className={cn("w-full px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800")} />
                  </div>
                  <div>
                    <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>Hasta</label>
                    <input type="date" value={recalcDateTo} onChange={(e) => setRecalcDateTo(e.target.value)}
                      className={cn("w-full px-3 py-2 rounded-lg border text-sm", theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800")} />
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-600" />
                  <span className={cn("text-sm", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                    Solo ventas sin supervisor asignado (snapshot)
                  </span>
                </label>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowRecalculateModal(false)}
                  className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
                    theme === "dark" ? "border-white/10 text-gray-400 hover:bg-white/5" : "border-gray-200 text-gray-600 hover:bg-gray-50")}>
                  Cancelar
                </button>
                <button onClick={handleRecalculateSupervisors} disabled={recalculating}
                  className={cn("px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-2",
                    recalculating ? "bg-purple-600/50 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700")}>
                  {recalculating && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {recalculating ? "Recalculando..." : "Confirmar"}
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
