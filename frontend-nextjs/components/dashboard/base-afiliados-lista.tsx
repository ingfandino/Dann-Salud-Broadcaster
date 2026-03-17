/**
 * ============================================================
 * LISTA DE AFILIADOS (base-afiliados-lista.tsx)
 * ============================================================
 * Tabla de búsqueda y visualización de afiliados.
 * Permite filtrar, buscar y eliminar registros.
 */

"use client"

import { useState, useEffect, useRef } from "react"
import { Search, RefreshCw, Trash2, Filter, Download, Zap, AlertTriangle, X } from "lucide-react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth"

interface ContributionData {
  lastContributionPeriod: string | null
  verificationStatus: 'pending' | 'success' | 'no_data' | 'captcha' | 'error'
  verificationCheckedAt: string | null
}

interface Affiliate {
  _id: string
  nombre: string
  cuil: string
  obraSocial: string
  telefono1: string
  localidad: string
  uploadDate: string
  contribution?: ContributionData
}

export function BaseAfiliadosLista() {
  const { theme } = useTheme()
  const { user } = useAuth()
  const [afiliados, setAfiliados] = useState<Affiliate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [obraSocialFilter, setObraSocialFilter] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [downloadingAll, setDownloadingAll] = useState(false)
  const [runningContributions, setRunningContributions] = useState(false)
  const [arcaModalOpen, setArcaModalOpen] = useState(false)
  const [arcaMode, setArcaMode] = useState<'single' | 'selected' | 'filtered' | 'pending'>('single')
  const [arcaLimit, setArcaLimit] = useState(1)
  const [arcaCuil, setArcaCuil] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const arcaPanelRef = useRef<HTMLDivElement>(null)

  // Cierra el panel de ARCA al hacer clic afuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (arcaModalOpen && arcaPanelRef.current && !arcaPanelRef.current.contains(event.target as Node)) {
        setArcaModalOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [arcaModalOpen])

  const handleDownloadAll = async () => {
    try {
      setDownloadingAll(true)
      const response = await api.affiliates.exportAll()
      const blob = new Blob([response.data], { 
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `base_afiliados_completa_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      toast.success("Base de afiliados descargada correctamente")
    } catch (error: any) {
      console.error("Error downloading all affiliates:", error)
      toast.error(error.response?.data?.error || "Error al descargar la base de afiliados")
    } finally {
      setDownloadingAll(false)
    }
  }

  const loadAfiliados = async () => {
    try {
      setLoading(true)
      const response = await api.affiliates.list({
        page,
        limit: 50,
        search: searchTerm,
        obraSocial: obraSocialFilter
      })
      setAfiliados(response.data.affiliates || [])
      setTotalPages(response.data.totalPages || 1)
    } catch (error: any) {
      console.error("Error loading affiliates:", error)
      toast.error("Error al cargar afiliados")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAfiliados()
  }, [page, searchTerm, obraSocialFilter])

  const handleRunContributions = async () => {
    try {
      setRunningContributions(true)
      const payload: Parameters<typeof api.affiliateContributions.run>[0] = { mode: arcaMode }
      if (arcaMode === 'single') {
        if (!arcaCuil.trim()) { toast.error('Ingresá un CUIL'); return }
        payload.cuil = arcaCuil.trim()
      } else if (arcaMode === 'selected') {
        if (!selectedIds.length) { toast.error('No hay registros seleccionados'); return }
        payload.affiliateIds = selectedIds
        payload.limit = arcaLimit
      } else if (arcaMode === 'filtered') {
        payload.cuil = searchTerm || undefined
        payload.limit = arcaLimit
      } else {
        payload.limit = arcaLimit
      }
      const { data } = await api.affiliateContributions.run(payload)
      toast.success(`Verificación iniciada: ${data.queued} afiliado(s). ID: ${data.executionId?.slice(0, 8)}…`)
      setArcaModalOpen(false)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al iniciar verificación de aportes')
    } finally {
      setRunningContributions(false)
    }
  }

  const getContributionBadge = (contrib?: ContributionData) => {
    if (!contrib || contrib.verificationStatus === 'pending') {
      return { label: 'Pendiente', cls: theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-500' }
    }
    switch (contrib.verificationStatus) {
      case 'success':  return { label: 'OK', cls: theme === 'dark' ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700' }
      case 'no_data':  return { label: 'Sin datos', cls: theme === 'dark' ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-700' }
      case 'captcha':  return { label: 'CAPTCHA', cls: theme === 'dark' ? 'bg-orange-900 text-orange-300' : 'bg-orange-100 text-orange-700' }
      case 'error':    return { label: 'Error', cls: theme === 'dark' ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-700' }
      default:         return { label: 'Pendiente', cls: theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-500' }
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar este afiliado?")) return

    try {
      await api.affiliates.delete(id)
      toast.success("Afiliado eliminado")
      loadAfiliados()
    } catch (error) {
      toast.error("Error al eliminar afiliado")
    }
  }

  return (
    <div className="animate-fade-in-up space-y-4">
      {/* Filtros de búsqueda */}
      <div
        className={cn(
          "rounded-2xl border p-4 lg:p-6 backdrop-blur-sm",
          theme === "dark"
            ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
            : "bg-gradient-to-br from-white to-[#FAF7F2]/80 border-purple-200/30 shadow-lg shadow-purple-100/30",
        )}
      >
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          <div className="flex-1">
            <h2
              className={cn(
                "text-lg lg:text-xl font-semibold flex items-center gap-2 mb-4",
                theme === "dark" ? "text-white" : "text-gray-700",
              )}
            >
              <Search className={cn("w-5 h-5", theme === "dark" ? "text-purple-400" : "text-purple-500")} />
              Buscar y Filtrar Afiliados
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div>
                <label className={cn("text-xs mb-1 block", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                  Búsqueda por Nombre, CUIL o Teléfono
                </label>
                <div className="relative">
                  <Search
                    className={cn(
                      "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4",
                      theme === "dark" ? "text-gray-500" : "text-gray-400",
                    )}
                  />
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={cn(
                      "w-full pl-9 pr-3 py-2 rounded-lg border text-sm",
                      theme === "dark"
                        ? "bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                        : "bg-white border-gray-200 text-gray-700 placeholder:text-gray-400",
                    )}
                  />
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={loadAfiliados}
            disabled={loading}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 hover:scale-105 shrink-0 disabled:opacity-50",
              theme === "dark"
                ? "bg-gradient-to-r from-cyan-600 to-cyan-500 text-white"
                : "bg-gradient-to-r from-cyan-500 to-cyan-400 text-white",
            )}
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            Recargar Datos
          </button>
        </div>
      </div>

      {/* Contador de resultados */}
      <div className={cn(
        "rounded-xl p-4 text-sm",
        theme === "dark" ? "bg-blue-500/10 text-blue-300" : "bg-blue-50 text-blue-700"
      )}>
        Mostrando {afiliados.length} afiliados
      </div>

      {/* Botones de acción - Solo para Daniel Fandiño */}
      {isDanielFandino && (
        <div className="flex flex-wrap justify-end gap-2 relative">
          <button
            onClick={() => setArcaModalOpen(!arcaModalOpen)}
            title="Consulta ARCA/Mis Aportes para afiliados sin verificar"
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 hover:scale-105 disabled:opacity-50",
              theme === "dark"
                ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white"
                : "bg-gradient-to-r from-indigo-500 to-indigo-400 text-white",
            )}
          >
            <Zap className="w-4 h-4" />
            Actualizar Aportes ARCA
          </button>
          <button
            onClick={handleDownloadAll}
            disabled={downloadingAll}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 hover:scale-105 disabled:opacity-50",
              theme === "dark"
                ? "bg-gradient-to-r from-green-600 to-green-500 text-white"
                : "bg-gradient-to-r from-green-500 to-green-400 text-white",
            )}
          >
            <Download className={cn("w-4 h-4", downloadingAll && "animate-pulse")} />
            {downloadingAll ? "Descargando..." : "Descargar Base Completa"}
          </button>

          {/* Panel ARCA (Popover en lugar de Modal Modal) */}
          {arcaModalOpen && (
            <div
              ref={arcaPanelRef}
              className={cn(
                "absolute top-full mt-2 right-0 w-80 rounded-xl border p-4 shadow-xl z-50 animate-fade-in-up",
                theme === 'dark'
                  ? 'bg-gray-900 border-white/10 text-white'
                  : 'bg-white border-gray-200 text-gray-800'
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-sm font-semibold">Ejecución Manual</h3>
                </div>
                <button onClick={() => setArcaModalOpen(false)} className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Warning */}
              <div className={cn(
                "flex items-start gap-2 rounded-lg p-2.5 mb-4 text-xs",
                theme === 'dark' ? 'bg-amber-900/30 text-amber-300 border border-amber-700/40' : 'bg-amber-50 text-amber-700 border border-amber-200'
              )}>
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Usá lotes pequeños. El CAPTCHA puede pausar la ejecución.</span>
              </div>

              {/* Mode selector */}
              <div className="mb-4">
                <label className={cn('text-xs font-medium block mb-1.5', theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>Modo</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {([
                    { id: 'single',   label: 'Un CUIL' },
                    { id: 'filtered', label: 'Filtrados' },
                    { id: 'pending',  label: 'Pendientes' },
                  ] as const).map(m => (
                    <button
                      key={m.id}
                      onClick={() => setArcaMode(m.id)}
                      className={cn(
                        'rounded-md px-2 py-1.5 text-xs font-medium border transition-all',
                        arcaMode === m.id
                          ? theme === 'dark'
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'bg-indigo-500 border-indigo-500 text-white'
                          : theme === 'dark'
                            ? 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Single CUIL input */}
              {arcaMode === 'single' && (
                <div className="mb-4">
                  <label className={cn('text-xs font-medium block mb-1.5', theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>CUIL (sin guiones)</label>
                  <input
                    type="text"
                    placeholder="20123456789"
                    value={arcaCuil}
                    onChange={e => setArcaCuil(e.target.value)}
                    className={cn(
                      'w-full px-2.5 py-1.5 rounded-md border text-sm',
                      theme === 'dark'
                        ? 'bg-white/5 border-white/10 text-white placeholder:text-gray-500'
                        : 'bg-white border-gray-200 text-gray-700 placeholder:text-gray-400'
                    )}
                  />
                </div>
              )}

              {/* Limit field (hidden for single) */}
              {arcaMode !== 'single' && (
                <div className="mb-4">
                  <label className={cn('text-xs font-medium block mb-1.5', theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>
                    Límite <span className="opacity-60">(máx. 500)</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={arcaLimit}
                    onChange={e => setArcaLimit(Math.max(1, Math.min(500, parseInt(e.target.value) || 1)))}
                    className={cn(
                      'w-full px-2.5 py-1.5 rounded-md border text-sm',
                      theme === 'dark'
                        ? 'bg-white/5 border-white/10 text-white'
                        : 'bg-white border-gray-200 text-gray-700'
                    )}
                  />
                </div>
              )}

              {/* Info lines */}
              {arcaMode === 'filtered' && searchTerm && (
                <p className={cn('text-xs mb-3 opacity-70')}>Filtro: &quot;{searchTerm}&quot;</p>
              )}

              {/* Actions */}
              <div className="flex justify-end pt-2 border-t dark:border-white/10 border-gray-100">
                <button
                  onClick={handleRunContributions}
                  disabled={runningContributions}
                  className={cn(
                    'flex w-full justify-center items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-white transition-all disabled:opacity-50',
                    theme === 'dark' ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-indigo-500 hover:bg-indigo-600'
                  )}
                >
                  <Zap className={cn('w-4 h-4', runningContributions && 'animate-pulse')} />
                  {runningContributions ? 'Iniciando...' : 'Iniciar'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabla de afiliados */}
      <div
        className={cn(
          "rounded-2xl border backdrop-blur-sm overflow-hidden",
          theme === "dark"
            ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
            : "bg-gradient-to-br from-white to-[#FAF7F2]/80 border-purple-200/30 shadow-lg shadow-purple-100/30",
        )}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                className={cn(
                  theme === "dark"
                    ? "bg-white/5 border-b border-white/10"
                    : "bg-purple-50/50 border-b border-purple-100",
                )}
              >
                {["Nombre", "CUIL", "Obra Social", "Teléfono", "Localidad", "Cargado", "Últ. Aporte", "Verificación", "Acciones"].map((header) => (
                  <th
                    key={header}
                    className={cn(
                      "px-4 py-3 text-left font-semibold whitespace-nowrap",
                      theme === "dark" ? "text-gray-300" : "text-gray-600",
                    )}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center">
                    <div className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                      Cargando...
                    </div>
                  </td>
                </tr>
              ) : afiliados.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center">
                    <div className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                      No se encontraron afiliados
                    </div>
                  </td>
                </tr>
              ) : (
                afiliados.map((afiliado) => (
                  <tr
                    key={afiliado._id}
                    className={cn(
                      "border-b transition-colors",
                      theme === "dark" ? "border-white/5 hover:bg-white/5" : "border-purple-50 hover:bg-purple-50/50",
                    )}
                  >
                    <td className={cn("px-4 py-3 font-medium", theme === "dark" ? "text-white" : "text-gray-700")}>
                      {afiliado.nombre}
                    </td>
                    <td className={cn("px-4 py-3", theme === "dark" ? "text-gray-300" : "text-gray-600")}>
                      {afiliado.cuil}
                    </td>
                    <td
                      className={cn("px-4 py-3 max-w-xs truncate", theme === "dark" ? "text-gray-400" : "text-gray-500")}
                    >
                      {afiliado.obraSocial}
                    </td>
                    <td className={cn("px-4 py-3", theme === "dark" ? "text-gray-300" : "text-gray-600")}>
                      {afiliado.telefono1}
                    </td>
                    <td className={cn("px-4 py-3", theme === "dark" ? "text-gray-300" : "text-gray-600")}>
                      {afiliado.localidad}
                    </td>
                    <td className={cn("px-4 py-3", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                      {new Date(afiliado.uploadDate).toLocaleDateString("es-AR")}
                    </td>
                    <td className={cn("px-4 py-3 font-mono text-sm", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                      {afiliado.contribution?.lastContributionPeriod || "-"}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const badge = getContributionBadge(afiliado.contribution)
                        return (
                          <span className={cn("inline-block px-2 py-0.5 rounded-full text-xs font-medium", badge.cls)}>
                            {badge.label}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(afiliado._id)}
                        className={cn(
                          "p-1.5 rounded transition-colors",
                          theme === "dark" ? "text-red-400 hover:bg-red-500/20" : "text-red-600 hover:bg-red-100",
                        )}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
