"use client"

import { useState, useEffect, useMemo } from "react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import { X, Save, Calendar as CalendarIcon } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth"

const STATUS_OPTIONS = [
  "QR hecho",
  "QR hecho (Temporal)",
  "QR hecho, pero pendiente de aprobación",
  "Hacer QR",
  "Aprobada",
  "Pendiente",
  "Cargada",
  "Falta clave",
  "AFIP",
  "Rechazada",
  "Padrón",
  "Remuneración no válida",
  "Autovinculación",
  "En revisión",
  "Caída",
  "Completa",
]

const STATUS_MAP_TO_SEGUIMIENTO: Record<string, string> = {
  "Hacer QR": "Pendiente",
  "QR hecho (Temporal)": "Baja laboral sin nueva alta",
  "QR hecho, pero pendiente de aprobación": "Cargada",
}

const OBRAS_VENDIDAS = ["Binimed", "Meplife", "RAS", "TURF", "Medicenter"]

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
  statusUpdatedAt?: string
  asesor?: {
    _id: string
    nombre: string
    numeroEquipo?: string
  }
  auditor?: {
    _id: string
    nombre: string
  }
  administrador?: {
    _id: string
    nombre: string
  }
  groupId?: {
    _id: string
    nombre: string
    numeroEquipo?: string
  }
  numeroEquipo?: string
  datosExtra?: string
  isRecuperada?: boolean
  statusHistory?: Array<{
    value: string
    updatedBy?: { nombre?: string }
    updatedAt?: string
  }>
  datosExtraHistory?: Array<{
    value: string
    updatedBy?: { nombre?: string }
    updatedAt?: string
  }>
  asesorHistory?: {
    previousAsesor: { nombre: string; name?: string }
    newAsesor: { nombre: string; name?: string }
    changedBy: { nombre: string; name?: string }
    changedAt: string
  }[]
  fechaCreacionQR?: string
  createdAt: string
  supervisorSnapshot?: {
    _id: string
    nombre: string
    numeroEquipo: string
  }
  aporte?: number
  cuit?: string
  observacionPrivada?: string
  clave?: string
  email?: string
  mesPadron?: string
  statusAdministrativo?: string
}

interface RegistroVentasEditModalProps {
  isOpen: boolean
  onClose: () => void
  audit: Audit
  onSave: (updatedAudit: Audit) => void
}

export function RegistroVentasEditModal({ isOpen, onClose, audit, onSave }: RegistroVentasEditModalProps) {
  const { theme } = useTheme()
  const { user } = useAuth()

  const getLocalDate = (utcDateString: string) => {
    if (!utcDateString) return ""
    const date = new Date(utcDateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const userRole = user?.role?.toLowerCase()
  const isGerencia = userRole === "gerencia"
  const isAdministrativo = userRole === "administrativo"

  const [form, setForm] = useState({
    cuil: audit.cuil || "",
    cuit: audit.cuit || "",
    fecha: getLocalDate(audit.fechaCreacionQR || audit.scheduledAt),
    aporte: audit.aporte?.toString() || "",
    observacionPrivada: audit.observacionPrivada || "",
    clave: audit.clave || "",
    email: audit.email || "",
    status: audit.statusAdministrativo || audit.status || "",
    administrador: audit.administrador?._id || "",
    supervisor: audit.supervisorSnapshot?._id || "",
    asesor: audit.asesor?._id || "",
    datosExtra: audit.datosExtra || "",
    mesPadron: audit.mesPadron || "",
  })

  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"details" | "history">("details")

  const [asesores, setAsesores] = useState<any[]>([])
  const [supervisores, setSupervisores] = useState<any[]>([])
  const [administradores, setAdministradores] = useState<any[]>([])

  useEffect(() => {
    if (isOpen) {
      setForm({
        cuil: audit.cuil || "",
        cuit: audit.cuit || "",
        fecha: getLocalDate(audit.fechaCreacionQR || audit.scheduledAt),
        aporte: audit.aporte?.toString() || "",
        observacionPrivada: audit.observacionPrivada || "",
        clave: audit.clave || "",
        email: audit.email || "",
        status: audit.statusAdministrativo || audit.status || "",
        administrador: audit.administrador?._id || "",
        supervisor: audit.supervisorSnapshot?._id || "",
        asesor: audit.asesor?._id || "",
        datosExtra: audit.datosExtra || "",
        mesPadron: audit.mesPadron || "",
      })
      fetchFilterOptions()
    }
  }, [isOpen, audit])

  const fetchFilterOptions = async () => {
    try {
      const usersRes = await api.users.list("includeAllAuditors=true")
      const users = usersRes.data || []

      setAsesores(users.filter((u: any) => u.active !== false))
      setSupervisores(users.filter((u: any) => u.role === 'supervisor' && u.active !== false))
      setAdministradores(users.filter((u: any) => u.role === 'administrativo' && u.active !== false))
    } catch (error) {
      console.error("Error fetching filter options:", error)
      setAsesores([])
      setSupervisores([])
      setAdministradores([])
    }
  }

  const filteredAsesores = useMemo(() => {
    if (!form.supervisor) {
      return asesores.filter((u: any) => 
        (u.role === 'asesor' || u.role === 'Asesor' || 
         ((u.role === 'auditor' || u.role === 'Auditor') && u.numeroEquipo))
      )
    }
    const selectedSupervisor = supervisores.find((s: any) => s._id === form.supervisor)
    if (!selectedSupervisor?.numeroEquipo) return asesores
    return asesores.filter((u: any) => 
      u.numeroEquipo === selectedSupervisor.numeroEquipo &&
      (u.role === 'asesor' || u.role === 'Asesor' || 
       ((u.role === 'auditor' || u.role === 'Auditor') && u.numeroEquipo))
    )
  }, [asesores, form.supervisor, supervisores])

  if (!isOpen) return null

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    if (name === 'supervisor') {
      setForm(prev => ({
        ...prev,
        supervisor: value,
        asesor: ''
      }))
    } else {
      setForm(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const handleSave = async () => {
    if (form.status === "Padrón" && !form.mesPadron) {
      toast.error("Debe indicar el mes de liberación del padrón")
      return
    }

    try {
      setLoading(true)

      const estadoParaSeguimiento = STATUS_MAP_TO_SEGUIMIENTO[form.status] || form.status

      const payload: any = {
        cuil: form.cuil,
        cuit: form.cuit,
        aporte: form.aporte ? parseFloat(form.aporte) : null,
        observacionPrivada: form.observacionPrivada,
        clave: form.clave,
        email: form.email,
        status: estadoParaSeguimiento,
        statusAdministrativo: form.status,
        datosExtra: form.datosExtra,
        mesPadron: form.status === "Padrón" ? form.mesPadron : null,
      }

      if (form.fecha) {
        payload.fechaCreacionQR = new Date(form.fecha).toISOString()
      }

      const administradorAsignado = audit.administrador?._id || audit.administrador
      const esElMismoAdministrador = administradorAsignado && administradorAsignado === user?._id
      const puedeModificarAdmin = !administradorAsignado || isGerencia || esElMismoAdministrador

      if (puedeModificarAdmin) {
        payload.administrador = form.administrador || null
      }

      if (isGerencia) {
        if (form.supervisor) {
          payload.supervisor = form.supervisor
        }
        if (form.asesor) {
          payload.asesor = form.asesor
        }
      }

      if (form.status === "QR hecho" && audit.status !== "QR hecho") {
        payload.fechaCreacionQR = new Date().toISOString()
      }

      const response = await api.audits.update(audit._id, payload)

      toast.success("Registro actualizado correctamente")
      onSave(response.data)
      onClose()
    } catch (error: any) {
      console.error("Error updating audit:", error)
      toast.error(error.response?.data?.message || "Error al actualizar registro")
    } finally {
      setLoading(false)
    }
  }

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted) return null

  const { createPortal } = require('react-dom')

  const administradorAsignado = audit.administrador?._id || audit.administrador
  const esElMismoAdministrador = administradorAsignado && administradorAsignado === user?._id
  const puedeModificarAdmin = !administradorAsignado || isGerencia || esElMismoAdministrador

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative w-full max-w-4xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]",
          theme === "dark" ? "bg-[#1a1333] border border-white/10" : "bg-white"
        )}
      >
        <div className={cn(
          "px-6 py-4 border-b flex items-center justify-between",
          theme === "dark" ? "border-white/10" : "border-gray-100"
        )}>
          <div>
            <h2 className={cn("text-lg font-semibold", theme === "dark" ? "text-white" : "text-gray-800")}>
              Editar Registro de Venta
            </h2>
            <p className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
              {audit.nombre} - {audit.cuil}
            </p>
          </div>
          <button
            onClick={onClose}
            className={cn(
              "p-2 rounded-lg transition-colors",
              theme === "dark" ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-500"
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className={cn(
          "flex border-b",
          theme === "dark" ? "border-white/10" : "border-gray-100"
        )}>
          <button
            onClick={() => setActiveTab("details")}
            className={cn(
              "flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2",
              activeTab === "details"
                ? theme === "dark" ? "border-purple-500 text-purple-400" : "border-purple-600 text-purple-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            Detalles
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={cn(
              "flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2",
              activeTab === "history"
                ? theme === "dark" ? "border-purple-500 text-purple-400" : "border-purple-600 text-purple-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            Historial
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "details" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                    CUIL
                  </label>
                  <input
                    name="cuil"
                    value={form.cuil}
                    onChange={handleChange}
                    className={cn(
                      "w-full px-3 py-2 rounded-lg border text-sm",
                      theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"
                    )}
                  />
                </div>
                <div>
                  <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                    CUIT
                  </label>
                  <input
                    name="cuit"
                    value={form.cuit}
                    onChange={handleChange}
                    className={cn(
                      "w-full px-3 py-2 rounded-lg border text-sm",
                      theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"
                    )}
                  />
                </div>
                <div>
                  <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                    Fecha
                  </label>
                  <input
                    type="date"
                    name="fecha"
                    value={form.fecha}
                    onChange={handleChange}
                    className={cn(
                      "w-full px-3 py-2 rounded-lg border text-sm",
                      theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                    Aporte
                  </label>
                  <input
                    name="aporte"
                    type="number"
                    value={form.aporte}
                    onChange={handleChange}
                    className={cn(
                      "w-full px-3 py-2 rounded-lg border text-sm",
                      theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"
                    )}
                  />
                </div>
                <div>
                  <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                    Clave
                  </label>
                  <input
                    name="clave"
                    value={form.clave}
                    onChange={handleChange}
                    className={cn(
                      "w-full px-3 py-2 rounded-lg border text-sm",
                      theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"
                    )}
                  />
                </div>
                <div>
                  <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                    Email
                  </label>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    className={cn(
                      "w-full px-3 py-2 rounded-lg border text-sm",
                      theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                    Estado
                  </label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    className={cn(
                      "w-full px-3 py-2 rounded-lg border text-sm",
                      theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"
                    )}
                  >
                    <option value="">Seleccionar estado...</option>
                    {form.status && !STATUS_OPTIONS.includes(form.status) && (
                      <option value={form.status}>{form.status}</option>
                    )}
                    {STATUS_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                    Administrativo
                    {!puedeModificarAdmin && (
                      <span className="ml-2 text-xs text-yellow-500">🔒 Bloqueado</span>
                    )}
                  </label>
                  <select
                    name="administrador"
                    value={form.administrador}
                    onChange={handleChange}
                    disabled={!puedeModificarAdmin}
                    className={cn(
                      "w-full px-3 py-2 rounded-lg border text-sm",
                      !puedeModificarAdmin && "opacity-60 cursor-not-allowed",
                      theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"
                    )}
                  >
                    <option value="">Seleccione</option>
                    {administradores.map(u => (
                      <option key={u._id} value={u._id}>{u.nombre}</option>
                    ))}
                  </select>
                  {!puedeModificarAdmin && (
                    <p className="text-xs text-yellow-500 mt-1">
                      Solo el administrador asignado o Gerencia pueden modificar este campo
                    </p>
                  )}
                </div>
              </div>

              {form.status === "Padrón" && (
                <div>
                  <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                    Mes de Liberación del Padrón <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={form.mesPadron ? form.mesPadron.split("-")[1] || "" : ""}
                      onChange={(e) => {
                        const year = form.mesPadron ? form.mesPadron.split("-")[0] : new Date().getFullYear().toString()
                        const month = e.target.value
                        if (month) {
                          setForm(prev => ({ ...prev, mesPadron: `${year}-${month}` }))
                        }
                      }}
                      className={cn(
                        "w-full px-3 py-2 rounded-lg border text-sm",
                        theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"
                      )}
                    >
                      <option value="">Mes</option>
                      <option value="01">Enero</option>
                      <option value="02">Febrero</option>
                      <option value="03">Marzo</option>
                      <option value="04">Abril</option>
                      <option value="05">Mayo</option>
                      <option value="06">Junio</option>
                      <option value="07">Julio</option>
                      <option value="08">Agosto</option>
                      <option value="09">Septiembre</option>
                      <option value="10">Octubre</option>
                      <option value="11">Noviembre</option>
                      <option value="12">Diciembre</option>
                    </select>
                    <select
                      value={form.mesPadron ? form.mesPadron.split("-")[0] || "" : ""}
                      onChange={(e) => {
                        const month = form.mesPadron ? form.mesPadron.split("-")[1] : "01"
                        const year = e.target.value
                        if (year) {
                          setForm(prev => ({ ...prev, mesPadron: `${year}-${month || "01"}` }))
                        }
                      }}
                      className={cn(
                        "w-full px-3 py-2 rounded-lg border text-sm",
                        theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"
                      )}
                    >
                      <option value="">Año</option>
                      {Array.from({ length: 10 }, (_, i) => {
                        const year = new Date().getFullYear() + i
                        return <option key={year} value={year}>{year}</option>
                      })}
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                    Supervisor
                    {!isGerencia && <span className="ml-2 text-xs text-gray-500">(Solo lectura)</span>}
                  </label>
                  <select
                    name="supervisor"
                    value={form.supervisor}
                    onChange={handleChange}
                    disabled={!isGerencia}
                    className={cn(
                      "w-full px-3 py-2 rounded-lg border text-sm",
                      !isGerencia && "opacity-60 cursor-not-allowed",
                      theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"
                    )}
                  >
                    <option value="">Seleccione</option>
                    {supervisores.map(u => (
                      <option key={u._id} value={u._id}>{u.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                    Asesor
                    {!isGerencia && <span className="ml-2 text-xs text-gray-500">(Solo lectura)</span>}
                  </label>
                  <select
                    name="asesor"
                    value={form.asesor}
                    onChange={handleChange}
                    disabled={!isGerencia}
                    className={cn(
                      "w-full px-3 py-2 rounded-lg border text-sm",
                      !isGerencia && "opacity-60 cursor-not-allowed",
                      theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"
                    )}
                  >
                    <option value="">Seleccione</option>
                    {filteredAsesores.map(u => (
                      <option key={u._id} value={u._id}>{u.nombre} ({u.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                  Datos Extra (aparecerá en Seguimiento)
                </label>
                <textarea
                  name="datosExtra"
                  value={form.datosExtra}
                  onChange={handleChange}
                  rows={2}
                  className={cn(
                    "w-full px-3 py-2 rounded-lg border text-sm resize-none",
                    theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"
                  )}
                />
              </div>

              <div>
                <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                  Observación (exclusivo de Registro de Ventas)
                </label>
                <textarea
                  name="observacionPrivada"
                  value={form.observacionPrivada}
                  onChange={handleChange}
                  rows={3}
                  className={cn(
                    "w-full px-3 py-2 rounded-lg border text-sm resize-none",
                    theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"
                  )}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {audit.statusHistory && audit.statusHistory.length > 0 && (
                <div>
                  <h3 className={cn("text-sm font-semibold mb-3", theme === "dark" ? "text-white" : "text-gray-800")}>
                    Historial de Estados
                  </h3>
                  <div className="space-y-2">
                    {audit.statusHistory.map((entry, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg",
                          theme === "dark" ? "bg-white/5" : "bg-gray-50"
                        )}
                      >
                        <div>
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                            theme === "dark" ? "bg-purple-500/20 text-purple-400" : "bg-purple-100 text-purple-800"
                          )}>
                            {entry.value}
                          </span>
                          <p className={cn("text-xs mt-1", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                            por {entry.updatedBy?.nombre || "Sistema"}
                          </p>
                        </div>
                        <span className={cn("text-xs", theme === "dark" ? "text-gray-500" : "text-gray-400")}>
                          {entry.updatedAt ? new Date(entry.updatedAt).toLocaleString("es-AR") : "-"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {audit.datosExtraHistory && audit.datosExtraHistory.length > 0 && (
                <div>
                  <h3 className={cn("text-sm font-semibold mb-3", theme === "dark" ? "text-white" : "text-gray-800")}>
                    Historial de Datos Extra
                  </h3>
                  <div className="space-y-2">
                    {audit.datosExtraHistory.map((entry, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "p-3 rounded-lg",
                          theme === "dark" ? "bg-white/5" : "bg-gray-50"
                        )}
                      >
                        <p className={cn("text-sm", theme === "dark" ? "text-white" : "text-gray-800")}>
                          {entry.value || "(vacío)"}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className={cn("text-xs", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                            por {entry.updatedBy?.nombre || "Sistema"}
                          </span>
                          <span className={cn("text-xs", theme === "dark" ? "text-gray-500" : "text-gray-400")}>
                            {entry.updatedAt ? new Date(entry.updatedAt).toLocaleString("es-AR") : "-"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {audit.asesorHistory && audit.asesorHistory.length > 0 && (
                <div>
                  <h3 className={cn("text-sm font-semibold mb-3", theme === "dark" ? "text-white" : "text-gray-800")}>
                    Historial de Cambios de Asesor
                  </h3>
                  <div className="space-y-2">
                    {audit.asesorHistory.map((entry, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "p-3 rounded-lg",
                          theme === "dark" ? "bg-white/5" : "bg-gray-50"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                            {entry.previousAsesor?.nombre || entry.previousAsesor?.name || "N/A"}
                          </span>
                          <span className={theme === "dark" ? "text-gray-500" : "text-gray-400"}>→</span>
                          <span className={cn("text-sm font-medium", theme === "dark" ? "text-white" : "text-gray-800")}>
                            {entry.newAsesor?.nombre || entry.newAsesor?.name || "N/A"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className={cn("text-xs", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                            por {entry.changedBy?.nombre || entry.changedBy?.name || "Sistema"}
                          </span>
                          <span className={cn("text-xs", theme === "dark" ? "text-gray-500" : "text-gray-400")}>
                            {new Date(entry.changedAt).toLocaleString("es-AR")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!audit.statusHistory || audit.statusHistory.length === 0) &&
                (!audit.datosExtraHistory || audit.datosExtraHistory.length === 0) &&
                (!audit.asesorHistory || audit.asesorHistory.length === 0) && (
                  <div className="text-center py-8">
                    <p className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
                      No hay historial disponible
                    </p>
                  </div>
                )}
            </div>
          )}
        </div>

        <div className={cn(
          "px-6 py-4 border-t flex items-center justify-end gap-3",
          theme === "dark" ? "border-white/10" : "border-gray-100"
        )}>
          <button
            onClick={onClose}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              theme === "dark" ? "bg-white/5 hover:bg-white/10 text-gray-300" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            )}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              "bg-purple-600 hover:bg-purple-700 text-white",
              loading && "opacity-50 cursor-not-allowed"
            )}
          >
            <Save className="w-4 h-4" />
            {loading ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
