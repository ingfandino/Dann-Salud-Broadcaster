/**
 * ============================================================
 * AUDITORÍAS - DISPONIBLES PARA REVENTA (auditorias-reventa.tsx)
 * ============================================================
 * Interfaz que centraliza todos los registros marcados como
 * listos para reventa (lista_para_reventa = true).
 *
 * Acceso:
 * - Supervisor: solo registros donde supervisorSnapshot._id = usuario
 * - Encargado / Gerencia: todos los registros
 *
 * Exportación XLS: solo Encargado y Gerencia.
 * Sin columna de acciones.
 */

"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import { Download, X, ChevronDown, RefreshCw, Pencil } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth"
import * as XLSX from "xlsx"
import { AuditEditModal } from "./audit-edit-modal"
import { createPortal } from "react-dom"

/* ========== Tipos ========== */

interface Audit {
  _id: string
  nombre: string
  cuil?: string
  telefono: string
  tipoVenta: string
  obraSocialAnterior?: string
  obraSocialVendida: string
  scheduledAt: string
  status: string
  createdAt: string
  ultima_revision?: string
  lista_para_reventa?: boolean
  revisado_por?: {
    _id: string
    nombre: string
  }
  asesor?: {
    _id: string
    nombre: string
    numeroEquipo?: string
    supervisor?: {
      nombre: string
    }
  }
  administrador?: {
    _id: string
    nombre: string
  }
  supervisorSnapshot?: {
    _id: string
    nombre: string
    numeroEquipo: string
  }
}

interface User {
  _id: string
  nombre: string
  email: string
  role: string
  numeroEquipo?: string
  active?: boolean
}

/* ========== Funciones auxiliares ========== */

const formatDateTime = (value: string) => {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  const formattedDate = date.toLocaleDateString("es-AR")
  const formattedTime = date.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  return `${formattedDate} ${formattedTime}`
}

const getStatusColor = (status: string, theme: string) => {
  const statusLower = (status || "").toLowerCase()
  const colors: Record<string, { light: string; dark: string }> = {
    "falta clave": { light: "bg-orange-100 text-orange-800", dark: "bg-orange-500/20 text-orange-400" },
    "falta clave (por arca)": { light: "bg-orange-100 text-orange-800", dark: "bg-orange-500/20 text-orange-400" },
    "rechazada": { light: "bg-red-100 text-red-700", dark: "bg-red-500/20 text-red-400" },
    "pendiente": { light: "bg-gray-200 text-gray-700", dark: "bg-gray-500/20 text-gray-400" },
    "falta documentación": { light: "bg-orange-100 text-orange-800", dark: "bg-orange-500/20 text-orange-400" },
    "afip": { light: "bg-blue-100 text-blue-800", dark: "bg-blue-500/20 text-blue-400" },
    "completa": { light: "bg-lime-600 text-white", dark: "bg-lime-500/30 text-lime-300" },
    "reprogramada": { light: "bg-violet-100 text-violet-800", dark: "bg-violet-500/20 text-violet-400" },
    "caída": { light: "bg-red-600 text-white", dark: "bg-red-500/30 text-red-300" },
  }
  const color = colors[statusLower] || { light: "bg-gray-100 text-gray-700", dark: "bg-gray-500/20 text-gray-400" }
  return theme === "dark" ? color.dark : color.light
}

const getSupervisorName = (audit: Audit): string => {
  if (audit.supervisorSnapshot?.nombre) return audit.supervisorSnapshot.nombre
  if (audit.asesor?.supervisor?.nombre) return audit.asesor.supervisor.nombre
  return "-"
}

const getSupervisorColor = (supervisorName: string, theme: string) => {
  if (!supervisorName || supervisorName === "-") {
    return theme === "dark" ? "bg-gray-500/20 text-gray-400" : "bg-gray-100 text-gray-700"
  }

  const nombreLower = supervisorName.toLowerCase()

  if ((nombreLower.includes('nahuel') && nombreLower.includes('sanchez')) ||
    (nombreLower.includes('nahia') && nombreLower.includes('avellaneda')) ||
    (nombreLower.includes('santiago') && nombreLower.includes('goldsztein')) ||
    (nombreLower.includes('facundo') && nombreLower.includes('tevez'))) {
    return theme === "dark" ? "bg-red-900 text-red-200" : "bg-red-100 text-red-800"
  }

  if (nombreLower.includes('abigail') && nombreLower.includes('vera')) {
    return theme === "dark" ? "bg-fuchsia-900 text-fuchsia-200" : "bg-fuchsia-100 text-fuchsia-800"
  }

  if (nombreLower.includes('mateo') && nombreLower.includes('viera')) {
    return theme === "dark" ? "bg-blue-900 text-blue-200" : "bg-blue-100 text-blue-800"
  }

  const colorsList = [
    { light: "bg-teal-100 text-teal-800", dark: "bg-teal-900 text-teal-200" },
    { light: "bg-cyan-100 text-cyan-800", dark: "bg-cyan-900 text-cyan-200" },
    { light: "bg-emerald-100 text-emerald-800", dark: "bg-emerald-900 text-emerald-200" },
  ]

  let hash = 0
  for (let i = 0; i < supervisorName.length; i++) {
    hash = supervisorName.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % colorsList.length
  const color = colorsList[index]
  return theme === "dark" ? color.dark : color.light
}

/* ========== Componente principal ========== */

export function AuditoriasReventa() {
  const { theme } = useTheme()
  const { user } = useAuth()

  const [audits, setAudits] = useState<Audit[]>([])
  const [loading, setLoading] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedAudit, setSelectedAudit] = useState<Audit | null>(null)

  /* Filtros */
  const [selectedSupervisores, setSelectedSupervisores] = useState<string[]>([])
  const [selectedAsesores, setSelectedAsesores] = useState<string[]>([])
  const [selectedEstados, setSelectedEstados] = useState<string[]>([])
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  /* Dropdowns */
  const [isSupervisorDropdownOpen, setIsSupervisorDropdownOpen] = useState(false)
  const [isAsesorDropdownOpen, setIsAsesorDropdownOpen] = useState(false)
  const [isEstadoDropdownOpen, setIsEstadoDropdownOpen] = useState(false)

  /* Refs */
  const supervisorFilterRef = useRef<HTMLDivElement>(null)
  const asesorFilterRef = useRef<HTMLDivElement>(null)
  const estadoFilterRef = useRef<HTMLDivElement>(null)

  /* Rol */
  const userRole = user?.role?.toLowerCase()
  const isGerencia = userRole === "gerencia"
  const isEncargado = userRole === "encargado"
  const isRecuperador = userRole === "recuperador"
  const isDesarrollador = userRole === "desarrollador"
  const canEdit = isGerencia || isEncargado || isRecuperador
  // Only Gerencia and Desarrollador can export from restricted Audit interfaces
  // Encargado is explicitly excluded from export permissions
  const canExport = isGerencia || isDesarrollador

  /* Listas únicas derivadas de los datos cargados */
  const supervisorOptions = useMemo(() => {
    const names = new Set<string>()
    audits.forEach((a) => {
      const name = getSupervisorName(a)
      if (name !== "-") names.add(name)
    })
    return Array.from(names).sort()
  }, [audits])

  const asesorOptions = useMemo(() => {
    const names = new Set<string>()
    audits.forEach((a) => {
      if (a.asesor?.nombre) names.add(a.asesor.nombre)
    })
    return Array.from(names).sort()
  }, [audits])

  const estadoOptions = useMemo(() => {
    const statuses = new Set<string>()
    audits.forEach((a) => {
      if (a.status) statuses.add(a.status)
    })
    return Array.from(statuses).sort()
  }, [audits])

  /* Filtrado local sobre los datos cargados */
  const filteredAudits = useMemo(() => {
    let result = audits

    if (selectedSupervisores.length > 0) {
      result = result.filter((a) => selectedSupervisores.includes(getSupervisorName(a)))
    }
    if (selectedAsesores.length > 0) {
      result = result.filter((a) => a.asesor?.nombre && selectedAsesores.includes(a.asesor.nombre))
    }
    if (selectedEstados.length > 0) {
      result = result.filter((a) => selectedEstados.includes(a.status))
    }
    if (dateFrom) {
      const from = new Date(dateFrom)
      result = result.filter((a) => new Date(a.createdAt) >= from)
    }
    if (dateTo) {
      const to = new Date(dateTo)
      to.setDate(to.getDate() + 1)
      result = result.filter((a) => new Date(a.createdAt) < to)
    }

    return result
  }, [audits, selectedSupervisores, selectedAsesores, selectedEstados, dateFrom, dateTo])

  /* Fetch */
  const fetchAudits = async () => {
    try {
      setLoading(true)
      const { data } = await api.audits.getReventa()
      setAudits(Array.isArray(data) ? data : [])
    } catch (err: any) {
      console.error(err)
      if (err?.response?.status === 403) {
        toast.error("No tenés permisos para acceder a esta sección")
      } else {
        toast.error("Error al cargar registros de reventa")
      }
      setAudits([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAudits()
  }, [])

  /* Click outside */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (supervisorFilterRef.current && !supervisorFilterRef.current.contains(event.target as Node)) {
        setIsSupervisorDropdownOpen(false)
      }
      if (asesorFilterRef.current && !asesorFilterRef.current.contains(event.target as Node)) {
        setIsAsesorDropdownOpen(false)
      }
      if (estadoFilterRef.current && !estadoFilterRef.current.contains(event.target as Node)) {
        setIsEstadoDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  /* Helpers */
  const toggleSelection = (value: string, setFn: React.Dispatch<React.SetStateAction<string[]>>) => {
    const normalized = (value || "").trim()
    if (!normalized) return
    setFn((prev) => prev.includes(normalized) ? prev.filter((item) => item !== normalized) : [...prev, normalized])
  }

  const formatMultiLabel = (selected: string[], placeholder: string, pluralWord: string) => {
    if (selected.length === 0) return placeholder
    if (selected.length === 1) return selected[0]
    return `${selected.length} ${pluralWord}`
  }

  const clearFilters = () => {
    setSelectedSupervisores([])
    setSelectedAsesores([])
    setSelectedEstados([])
    setDateFrom("")
    setDateTo("")
  }

  const handleExportXLSX = () => {
    if (!canExport) {
      toast.error("No tienes permisos para exportar auditorías")
      return
    }

    if (!filteredAudits || filteredAudits.length === 0) {
      toast.info("No hay datos para exportar")
      return
    }

    const rows = filteredAudits.map((a) => ({
      Afiliado: a.nombre || "-",
      CUIL: a.cuil || "-",
      Teléfono: a.telefono || "-",
      "Obra Social": a.obraSocialVendida || "-",
      Asesor: a.asesor?.nombre || "-",
      Supervisor: getSupervisorName(a),
      Grupo: a.asesor?.numeroEquipo || "-",
      Administrativo: a.administrador?.nombre || "-",
      Estado: a.status || "-",
      "Fecha de alta": formatDateTime(a.createdAt),
      "Última revisión": a.ultima_revision
        ? `${formatDateTime(a.ultima_revision)}${a.revisado_por?.nombre ? ` — ${a.revisado_por.nombre}` : ""}`
        : "Sin revisión",
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Reventa")
    const today = new Date().toISOString().slice(0, 10)
    XLSX.writeFile(wb, `reventa_${today}.xlsx`)
    toast.success("Exportado correctamente")
  }

  /* ========== Render de un dropdown multi-selección ========== */
  const renderMultiDropdown = (
    label: string,
    pluralWord: string,
    options: string[],
    selected: string[],
    setSelected: React.Dispatch<React.SetStateAction<string[]>>,
    isOpen: boolean,
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>,
    ref: React.RefObject<HTMLDivElement | null>,
  ) => (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm",
          theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
        )}
      >
        <span className="truncate">{formatMultiLabel(selected, label, pluralWord)}</span>
        <ChevronDown className="w-4 h-4" />
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-lg shadow-lg border bg-white dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
            <button
              type="button"
              onClick={() => setSelected([...options])}
              className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400"
            >
              Seleccionar todos
            </button>
            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => setSelected([])}
                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400"
              >
                Limpiar
              </button>
            )}
          </div>
          {options.map((opt) => (
            <label key={opt} className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggleSelection(opt, setSelected)}
                className="accent-blue-600"
              />
              <span className="dark:text-gray-200">{opt}</span>
            </label>
          ))}
          {options.length === 0 && (
            <p className="px-3 py-2 text-xs text-gray-400">Sin opciones</p>
          )}
        </div>
      )}
    </div>
  )

  return (
    <>
      <div className="space-y-6 animate-fade-in-up">
      {/* Panel de filtros */}
      <div
        className={cn(
          "rounded-2xl border p-6 backdrop-blur-sm relative z-20",
          theme === "dark"
            ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
            : "bg-white border-gray-200 shadow-sm",
        )}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
          {/* Supervisor */}
          {renderMultiDropdown("Supervisor", "supervisores", supervisorOptions, selectedSupervisores, setSelectedSupervisores, isSupervisorDropdownOpen, setIsSupervisorDropdownOpen, supervisorFilterRef)}

          {/* Asesor */}
          {renderMultiDropdown("Asesor", "asesores", asesorOptions, selectedAsesores, setSelectedAsesores, isAsesorDropdownOpen, setIsAsesorDropdownOpen, asesorFilterRef)}

          {/* Estado */}
          {renderMultiDropdown("Estado", "estados", estadoOptions, selectedEstados, setSelectedEstados, isEstadoDropdownOpen, setIsEstadoDropdownOpen, estadoFilterRef)}

          {/* Fecha desde */}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm",
              theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
            )}
            placeholder="Desde"
          />

          {/* Fecha hasta */}
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm",
              theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
            )}
            placeholder="Hasta"
          />
        </div>

        {/* Botones de acción */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={clearFilters}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              theme === "dark"
                ? "bg-white/10 text-gray-300 hover:bg-white/20"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200",
            )}
          >
            <X className="w-4 h-4" />
            Limpiar
          </button>
          <button
            onClick={fetchAudits}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              theme === "dark"
                ? "bg-purple-600 text-white hover:bg-purple-700"
                : "bg-purple-500 text-white hover:bg-purple-600",
            )}
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
          {canExport && (
            <button
              onClick={handleExportXLSX}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                theme === "dark"
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "bg-green-500 text-white hover:bg-green-600",
              )}
            >
              <Download className="w-4 h-4" />
              Exportar Excel
            </button>
          )}
        </div>
      </div>

      {/* Resumen */}
      {filteredAudits.length > 0 && (
        <div className={cn(
          "rounded-xl border p-3",
          theme === "dark"
            ? "bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border-blue-700/30"
            : "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200"
        )}>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className={cn("font-bold", theme === "dark" ? "text-gray-200" : "text-gray-800")}>
              Total: <span className={theme === "dark" ? "text-blue-400" : "text-blue-600"}>{filteredAudits.length}</span>
            </span>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div
        className={cn(
          "rounded-2xl border overflow-hidden",
          theme === "dark"
            ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
            : "bg-white border-gray-200 shadow-sm",
        )}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className={cn(
              "font-semibold uppercase tracking-wider sticky top-0 z-10",
              theme === "dark" ? "bg-gray-900 text-gray-300" : "bg-gray-50 text-gray-600"
            )}>
              <tr>
                <th className="px-2 py-2 min-w-[150px] text-center">Afiliado</th>
                <th className="px-2 py-2 w-[100px] text-center">CUIL</th>
                <th className="px-2 py-2 w-[100px] text-center">Teléfono</th>
                <th className="px-2 py-2 w-[80px] text-center">O.S. Ven</th>
                <th className="px-2 py-2 min-w-[100px] text-center">Supervisor</th>
                <th className="px-2 py-2 min-w-[100px] text-center">Asesor</th>
                <th className="px-2 py-2 min-w-[100px] text-center">Estado</th>
                <th className="px-2 py-2 w-[120px] text-center">Fecha de alta</th>
                <th className="px-2 py-2 w-[140px] text-center">Última revisión</th>
                <th className="px-2 py-2 w-[80px] text-center">Acciones</th>
                <th className="px-2 py-2 w-[80px] text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center opacity-50">
                    <div className="flex justify-center items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Cargando registros...
                    </div>
                  </td>
                </tr>
              ) : filteredAudits.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center opacity-50">
                    No se encontraron registros para reventa
                  </td>
                </tr>
              ) : (
                filteredAudits.map((item, idx) => (
                  <tr
                    key={item._id}
                    className={cn(
                      "transition-colors",
                      idx % 2 === 0 ? "" : theme === "dark" ? "bg-white/[0.02]" : "bg-gray-50/50"
                    )}
                  >
                    <td className="px-2 py-1.5 text-center font-medium truncate max-w-[150px]" title={item.nombre}>
                      {item.nombre}
                    </td>
                    <td className="px-2 py-1.5 text-center font-mono opacity-70 truncate">
                      {item.cuil || "-"}
                    </td>
                    <td className={cn("px-2 py-1.5 text-center font-mono opacity-70 truncate", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                      {item.telefono || "-"}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <span className={cn(
                        "inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium truncate max-w-[80px]",
                        theme === "dark" ? "bg-gray-500/20 text-gray-400" : "bg-gray-100 text-gray-700"
                      )}>
                        {item.obraSocialVendida}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-medium truncate max-w-[120px] inline-block",
                        getSupervisorColor(getSupervisorName(item), theme)
                      )} title={getSupervisorName(item)}>
                        {getSupervisorName(item)}
                      </span>
                    </td>
                    <td className={cn("px-3 py-3 text-center", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                      {item.asesor?.nombre || "-"}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <span className={cn(
                        "inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium truncate max-w-[120px]",
                        getStatusColor(item.status, theme)
                      )} title={item.status}>
                        {item.status}
                      </span>
                    </td>
                    <td className={cn("px-2 py-1.5 text-center", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                      {formatDateTime(item.createdAt)}
                    </td>
                    <td className={cn("px-2 py-1.5 text-center", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                      {item.ultima_revision ? (
                        <span title={item.revisado_por?.nombre || ""}>
                          {formatDateTime(item.ultima_revision)}
                          {item.revisado_por?.nombre && (
                            <span className={cn("block text-[9px]", theme === "dark" ? "text-gray-500" : "text-gray-400")}>
                              {item.revisado_por.nombre}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="opacity-40">Sin revisión</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>

      {/* Modal de edición */}
      {selectedAudit && editModalOpen && typeof window !== "undefined" && createPortal(
        <AuditEditModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false)
            setSelectedAudit(null)
          }}
          audit={selectedAudit}
          onSave={(updated) => {
            setAudits(prev => prev.map(a => a._id === updated._id ? updated : a))
            setEditModalOpen(false)
            setSelectedAudit(null)
          }}
        />,
        document.body
      )}
    </>
  )
}
