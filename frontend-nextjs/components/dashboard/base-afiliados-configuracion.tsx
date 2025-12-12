"use client"

import { useEffect, useState, useRef } from "react"
import { Settings, Package, CheckCircle, Plus, Trash2, AlertTriangle, Lock, XCircle, Users, BarChart3, Database } from "lucide-react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { ObraSocialModal } from "./obra-social-modal"
import { useAuth } from "@/lib/auth"

interface ObraSocial {
  id: string
  nombre: string
  cantidad: number
}

interface SupervisorConfig {
  id: string
  supervisorId: string
  supervisorName: string
  cantidad: number
  obrasSociales: ObraSocial[]
}

interface User {
  _id: string
  nombre: string
  email: string
  numeroEquipo?: string
}

interface SupervisorStats {
  freshCount: number
  reusableCount: number
  byObraSocial: { obraSocial: string; count: number }[]
}

export function BaseAfiliadosConfiguracion() {
  const { theme } = useTheme()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Config State
  const [tipoEnvio, setTipoEnvio] = useState<"masivo" | "avanzado">("masivo")
  const [cantidadMasiva, setCantidadMasiva] = useState(100)
  const [horaEnvio, setHoraEnvio] = useState("09:00")
  const [supervisoresDisponibles, setSupervisoresDisponibles] = useState<User[]>([])
  const [supervisoresConfig, setSupervisoresConfig] = useState<SupervisorConfig[]>([
    { id: "1", supervisorId: "", supervisorName: "", cantidad: 50, obrasSociales: [] }
  ])
  const [currentConfig, setCurrentConfig] = useState<any>(null)
  const [showObraSocialModal, setShowObraSocialModal] = useState(false)
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string | null>(null)
  const [availableObrasSociales, setAvailableObrasSociales] = useState<string[]>([])
  const modalTriggerRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({})

  // Data mixing proportions
  const [freshPercentage, setFreshPercentage] = useState(50)
  const [reusablePercentage, setReusablePercentage] = useState(50)

  // Cancellation modal
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  // Supervisor Stats
  const [supervisorStats, setSupervisorStats] = useState<SupervisorStats | null>(null)

  const isSupervisor = user?.role?.toLowerCase() === 'supervisor'

  useEffect(() => {
    loadData()
  }, [user])

  const loadData = async () => {
    try {
      setLoading(true)

      if (isSupervisor) {
        // Load Supervisor Stats
        const statsRes = await api.affiliates.getSupervisorStats()
        setSupervisorStats(statsRes.data)
      } else {
        // Load Gerencia Config
        const [supervisorsRes, configRes, obrasSocialesRes] = await Promise.all([
          api.users.getSupervisors(),
          api.affiliates.getExportConfig(),
          api.affiliates.getObrasSociales()
        ])

        setSupervisoresDisponibles(supervisorsRes.data || [])
        setAvailableObrasSociales(obrasSocialesRes.data?.obrasSociales || [])

        if (configRes.data?.config) {
          const config = configRes.data.config
          setCurrentConfig(config)
          setTipoEnvio(config.sendType || "masivo")
          setHoraEnvio(config.scheduledTime || "09:00")

          if (config.sendType === "masivo") {
            setCantidadMasiva(config.affiliatesPerFile || 100)
            if (config.dataSourceMix) {
              setFreshPercentage(config.dataSourceMix.freshPercentage)
              setReusablePercentage(config.dataSourceMix.reusablePercentage)
            }
          } else if (config.sendType === "avanzado" && config.supervisorConfigs) {
            const mappedConfigs = config.supervisorConfigs.map((sc: any) => ({
              id: sc._id || Date.now().toString(),
              supervisorId: sc.supervisorId?._id || sc.supervisorId,
              supervisorName: sc.supervisorId?.nombre || "Sin nombre",
              cantidad: sc.affiliatesPerFile || 50,
              obrasSociales: sc.obraSocialDistribution?.map((os: any) => ({
                id: Date.now().toString() + Math.random(),
                nombre: os.obraSocial,
                cantidad: os.cantidad
              })) || []
            }))
            setSupervisoresConfig(mappedConfigs)
          }
        }
      }
    } catch (error: any) {
      console.error("Error loading data:", error)
      toast.error("Error al cargar datos")
    } finally {
      setLoading(false)
    }
  }

  // ... (Helper functions for Gerencia logic remain same, simplified for brevity in this view)
  const handleTipoEnvioChange = (tipo: "masivo" | "avanzado") => {
    if (tipo === tipoEnvio) return
    setTipoEnvio(tipo)
    if (tipo === "masivo") {
      setSupervisoresConfig([{ id: "1", supervisorId: "", supervisorName: "", cantidad: 50, obrasSociales: [] }])
    } else {
      setCantidadMasiva(100)
    }
  }

  const addSupervisor = () => {
    setSupervisoresConfig([
      ...supervisoresConfig,
      { id: Date.now().toString(), supervisorId: "", supervisorName: "", cantidad: 50, obrasSociales: [] }
    ])
  }

  const removeSupervisor = (id: string) => {
    if (supervisoresConfig.length > 1) {
      setSupervisoresConfig(supervisoresConfig.filter((s) => s.id !== id))
    }
  }

  const updateSupervisor = (id: string, supervisorId: string) => {
    const supervisor = supervisoresDisponibles.find(s => s._id === supervisorId)
    setSupervisoresConfig(supervisoresConfig.map((s) =>
      s.id === id ? { ...s, supervisorId, supervisorName: supervisor?.nombre || "" } : s
    ))
  }

  const updateSupervisorCantidad = (id: string, cantidad: number) => {
    setSupervisoresConfig(supervisoresConfig.map((s) => (s.id === id ? { ...s, cantidad } : s)))
  }

  const openObraSocialModal = (supervisorId: string) => {
    setSelectedSupervisorId(supervisorId)
    setShowObraSocialModal(true)
  }

  const addObraSocial = (nombre: string, cantidad: number) => {
    setSupervisoresConfig(supervisoresConfig.map(s => {
      if (s.id === selectedSupervisorId) {
        return {
          ...s,
          obrasSociales: [...s.obrasSociales, {
            id: Date.now().toString(),
            nombre,
            cantidad
          }]
        }
      }
      return s
    }))
    setShowObraSocialModal(false)
    toast.success("Obra social agregada")
  }

  const removeObraSocial = (supervisorId: string, osId: string) => {
    setSupervisoresConfig(supervisoresConfig.map(s => {
      if (s.id === supervisorId) {
        return {
          ...s,
          obrasSociales: s.obrasSociales.filter(os => os.id !== osId)
        }
      }
      return s
    }))
  }

  const handleCancelExports = async (type: 'today' | 'indefinite') => {
    try {
      setCancelling(true)
      await api.affiliates.cancelExports(type)
      toast.success(type === 'today'
        ? 'Envíos cancelados solo por hoy. Se reanudarán mañana automáticamente.'
        : 'Envíos cancelados indefinidamente. Guarda una nueva configuración para reanudar.')
      setShowCancelModal(false)
      loadData()
    } catch (error: any) {
      console.error("Error cancelling exports:", error)
      toast.error("Error al cancelar envíos")
    } finally {
      setCancelling(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      if (tipoEnvio === "masivo" && (freshPercentage + reusablePercentage !== 100)) {
        toast.error("La suma de porcentajes debe ser 100%")
        return
      }

      let payload: any = {
        sendType: tipoEnvio,
        scheduledTime: horaEnvio,
      }

      if (tipoEnvio === "masivo") {
        payload.affiliatesPerFile = cantidadMasiva
        payload.dataSourceMix = {
          enabled: true,
          freshPercentage,
          reusablePercentage
        }
      } else {
        if (supervisoresConfig.some(s => !s.supervisorId)) {
          toast.error("Seleccione todos los supervisores")
          return
        }
        payload.supervisorConfigs = supervisoresConfig.map(s => {
          const config: any = {
            supervisorId: s.supervisorId,
            affiliatesPerFile: s.cantidad,
          }
          if (s.obrasSociales.length > 0) {
            config.obraSocialDistribution = s.obrasSociales.map(os => ({
              obraSocial: os.nombre,
              cantidad: os.cantidad
            }))
          }
          return config
        })
      }

      await api.affiliates.saveExportConfig(payload)
      toast.success("Configuración guardada correctamente")
      loadData()
    } catch (error: any) {
      console.error("Error saving config:", error)
      toast.error(error.response?.data?.error || "Error al guardar configuración")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-fade-in-up flex items-center justify-center p-12">
        <div className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
          Cargando configuración...
        </div>
      </div>
    )
  }

  // ========== SUPERVISOR VIEW ==========
  if (isSupervisor) {
    return (
      <div className="animate-fade-in-up space-y-6">
        {/* Stats Card */}
        <div className={cn(
          "rounded-2xl border p-6 backdrop-blur-sm",
          theme === "dark"
            ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
            : "bg-gradient-to-br from-white to-[#FAF7F2]/80 border-purple-200/30 shadow-lg shadow-purple-100/30"
        )}>
          <h2 className={cn("text-xl font-semibold flex items-center gap-2 mb-6", theme === "dark" ? "text-white" : "text-gray-800")}>
            <Database className={cn("w-6 h-6", theme === "dark" ? "text-purple-400" : "text-purple-600")} />
            Disponibilidad de Datos
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fresh Data */}
            <div className={cn(
              "p-6 rounded-2xl border transition-all duration-300",
              theme === "dark"
                ? "bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20"
                : "bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
            )}>
              <div className="flex items-center justify-between mb-2">
                <span className={cn("text-sm font-medium", theme === "dark" ? "text-emerald-300" : "text-emerald-700")}>
                  Datos Frescos
                </span>
                <div className={cn("p-2 rounded-lg", theme === "dark" ? "bg-emerald-500/20" : "bg-emerald-200")}>
                  <Users className={cn("w-5 h-5", theme === "dark" ? "text-emerald-400" : "text-emerald-600")} />
                </div>
              </div>
              <div className={cn("text-3xl font-bold", theme === "dark" ? "text-white" : "text-gray-900")}>
                {supervisorStats?.freshCount || 0}
              </div>
              <p className={cn("text-xs mt-2", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                Disponibles para asignar
              </p>
            </div>

            {/* Reusable Data */}
            <div className={cn(
              "p-6 rounded-2xl border transition-all duration-300",
              theme === "dark"
                ? "bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20"
                : "bg-blue-50 border-blue-200 hover:bg-blue-100"
            )}>
              <div className="flex items-center justify-between mb-2">
                <span className={cn("text-sm font-medium", theme === "dark" ? "text-blue-300" : "text-blue-700")}>
                  Datos Reutilizables
                </span>
                <div className={cn("p-2 rounded-lg", theme === "dark" ? "bg-blue-500/20" : "bg-blue-200")}>
                  <BarChart3 className={cn("w-5 h-5", theme === "dark" ? "text-blue-400" : "text-blue-600")} />
                </div>
              </div>
              <div className={cn("text-3xl font-bold", theme === "dark" ? "text-white" : "text-gray-900")}>
                {supervisorStats?.reusableCount || 0}
              </div>
              <p className={cn("text-xs mt-2", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                Disponibles para re-asignar
              </p>
            </div>
          </div>
        </div>

        {/* Obra Social Breakdown */}
        <div className={cn(
          "rounded-2xl border p-6 backdrop-blur-sm",
          theme === "dark"
            ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
            : "bg-gradient-to-br from-white to-[#FAF7F2]/80 border-purple-200/30 shadow-lg shadow-purple-100/30"
        )}>
          <h3 className={cn("text-lg font-semibold mb-4", theme === "dark" ? "text-white" : "text-gray-800")}>
            Detalle por Obra Social
          </h3>

          {supervisorStats?.byObraSocial && supervisorStats.byObraSocial.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {supervisorStats.byObraSocial.map((item, idx) => (
                <div key={idx} className={cn(
                  "flex items-center justify-between p-3 rounded-xl border",
                  theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-gray-100"
                )}>
                  <span className={cn("text-sm font-medium truncate flex-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                    {item.obraSocial || 'Sin especificar'}
                  </span>
                  <span className={cn("text-sm font-bold px-2 py-1 rounded-lg ml-2",
                    theme === "dark" ? "bg-purple-500/20 text-purple-300" : "bg-purple-100 text-purple-700"
                  )}>
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className={cn("text-center py-8 text-sm", theme === "dark" ? "text-gray-500" : "text-gray-400")}>
              No hay datos disponibles
            </div>
          )}
        </div>
      </div>
    )
  }

  // ========== GERENCIA VIEW (Existing) ==========
  return (
    <div className="animate-fade-in-up space-y-4">
      {/* Header */}
      <div
        className={cn(
          "rounded-2xl border p-4 lg:p-6 backdrop-blur-sm",
          theme === "dark"
            ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
            : "bg-gradient-to-br from-white to-[#FAF7F2]/80 border-purple-200/30 shadow-lg shadow-purple-100/30",
        )}
      >
        <h2
          className={cn(
            "text-lg lg:text-xl font-semibold flex items-center gap-2 mb-3",
            theme === "dark" ? "text-white" : "text-gray-700",
          )}
        >
          <Settings className={cn("w-5 h-5", theme === "dark" ? "text-purple-400" : "text-purple-500")} />
          Configuración de Envíos Programados
        </h2>
        <div
          className={cn(
            "rounded-lg p-3 text-sm",
            theme === "dark"
              ? "bg-blue-500/10 border border-blue-500/20 text-blue-300"
              : "bg-blue-50 border border-blue-200 text-blue-700",
          )}
        >
          Los archivos <strong>XLSX (Excel)</strong> se generarán automáticamente cada día a la hora indicada. Cada{" "}
          <strong className={cn(theme === "dark" ? "text-purple-400" : "text-purple-600")}>Supervisor</strong> recibirá
          su archivo exclusivo vía mensajería interna.
        </div>
      </div>

      {/* Tipo de Envío */}
      <div
        className={cn(
          "rounded-2xl border p-4 lg:p-6 backdrop-blur-sm",
          theme === "dark"
            ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
            : "bg-gradient-to-br from-white to-[#FAF7F2]/80 border-purple-200/30 shadow-lg shadow-purple-100/30",
        )}
      >
        <label className={cn("text-sm font-medium mb-3 block", theme === "dark" ? "text-gray-300" : "text-gray-600")}>
          Tipo de Envío
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleTipoEnvioChange("masivo")}
            className={cn(
              "p-4 rounded-xl border-2 transition-all duration-200 text-center relative",
              tipoEnvio === "masivo"
                ? theme === "dark"
                  ? "border-purple-500 bg-purple-500/10"
                  : "border-purple-400 bg-purple-50"
                : theme === "dark"
                  ? "border-white/10 hover:border-white/20 opacity-50"
                  : "border-gray-200 hover:border-purple-200 opacity-50",
            )}
          >
            {tipoEnvio !== "masivo" && (
              <div className="absolute top-2 right-2">
                <Lock className={cn("w-4 h-4", theme === "dark" ? "text-gray-500" : "text-gray-400")} />
              </div>
            )}
            <div className="flex items-center justify-center gap-2 mb-1">
              <Package
                className={cn(
                  "w-5 h-5",
                  tipoEnvio === "masivo"
                    ? theme === "dark"
                      ? "text-orange-400"
                      : "text-orange-500"
                    : theme === "dark"
                      ? "text-gray-400"
                      : "text-gray-500",
                )}
              />
              <span className={cn("font-semibold", theme === "dark" ? "text-white" : "text-gray-700")}>Masivo</span>
            </div>
            <span className={cn("text-xs", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
              Misma cantidad para todos
            </span>
          </button>
          <button
            onClick={() => handleTipoEnvioChange("avanzado")}
            className={cn(
              "p-4 rounded-xl border-2 transition-all duration-200 text-center relative",
              tipoEnvio === "avanzado"
                ? theme === "dark"
                  ? "border-purple-500 bg-purple-500/10"
                  : "border-purple-400 bg-purple-50"
                : theme === "dark"
                  ? "border-white/10 hover:border-white/20 opacity-50"
                  : "border-gray-200 hover:border-purple-200 opacity-50",
            )}
          >
            {tipoEnvio !== "avanzado" && (
              <div className="absolute top-2 right-2">
                <Lock className={cn("w-4 h-4", theme === "dark" ? "text-gray-500" : "text-gray-400")} />
              </div>
            )}
            <div className="flex items-center justify-center gap-2 mb-1">
              <Settings
                className={cn(
                  "w-5 h-5",
                  tipoEnvio === "avanzado"
                    ? theme === "dark"
                      ? "text-orange-400"
                      : "text-orange-500"
                    : theme === "dark"
                      ? "text-gray-400"
                      : "text-gray-500",
                )}
              />
              <span className={cn("font-semibold", theme === "dark" ? "text-white" : "text-gray-700")}>Avanzado</span>
            </div>
            <span className={cn("text-xs", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
              Configurar por supervisor
            </span>
          </button>
        </div>
      </div>

      {/* Configuración según tipo */}
      <div
        className={cn(
          "rounded-2xl border p-4 lg:p-6 backdrop-blur-sm",
          theme === "dark"
            ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
            : "bg-gradient-to-br from-white to-[#FAF7F2]/80 border-purple-200/30 shadow-lg shadow-purple-100/30",
        )}
      >
        {tipoEnvio === "masivo" ? (
          <div className="space-y-4">
            <h3
              className={cn(
                "font-semibold flex items-center gap-2",
                theme === "dark" ? "text-orange-400" : "text-orange-500",
              )}
            >
              <Package className="w-4 h-4" />
              Configuración Masiva
            </h3>
            <div>
              <label className={cn("text-sm mb-2 block", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                Cantidad de afiliados por archivo
              </label>
              <input
                type="number"
                value={cantidadMasiva}
                onChange={(e) => setCantidadMasiva(Number(e.target.value))}
                className={cn(
                  "w-32 px-3 py-2 rounded-lg border text-sm",
                  theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-700",
                )}
              />
            </div>

            {/* Proporción de datos */}
            <div>
              <label className={cn("text-sm mb-2 block font-medium", theme === "dark" ? "text-gray-300" : "text-gray-600")}>
                Proporción de Datos (Fresh/Reusable)
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={cn("text-xs mb-1 block", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                    Frescos (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={freshPercentage}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      setFreshPercentage(val)
                      setReusablePercentage(100 - val)
                    }}
                    className={cn(
                      "w-full px-3 py-2 rounded-lg border text-sm",
                      theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-700",
                    )}
                  />
                </div>
                <div>
                  <label className={cn("text-xs mb-1 block", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                    Reutilizables (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={reusablePercentage}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      setReusablePercentage(val)
                      setFreshPercentage(100 - val)
                    }}
                    className={cn(
                      "w-full px-3 py-2 rounded-lg border text-sm",
                      theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-700",
                    )}
                  />
                </div>
              </div>
              {(freshPercentage + reusablePercentage) !== 100 && (
                <span className={cn("text-xs mt-1 flex items-center gap-1", theme === "dark" ? "text-amber-400" : "text-amber-600")}>
                  <AlertTriangle className="w-3 h-3" />
                  La suma debe ser 100%
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3
                className={cn(
                  "font-semibold flex items-center gap-2",
                  theme === "dark" ? "text-orange-400" : "text-orange-500",
                )}
              >
                <Settings className="w-4 h-4" />
                Configuración Avanzada
              </h3>
              <button
                type="button"
                onClick={addSupervisor}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  theme === "dark"
                    ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                    : "bg-green-100 text-green-600 hover:bg-green-200",
                )}
              >
                <Plus className="w-4 h-4" />
                Agregar Supervisor
              </button>
            </div>

            <div className="space-y-3">
              {supervisoresConfig.map((sup, idx) => {
                const obrasSocialesTotal = sup.obrasSociales.reduce((sum, os) => sum + os.cantidad, 0)
                const faltante = sup.cantidad - obrasSocialesTotal

                return (
                  <div
                    key={sup.id}
                    className={cn(
                      "rounded-xl border p-4",
                      theme === "dark" ? "border-white/10 bg-white/5" : "border-gray-200 bg-gray-50",
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className={cn("font-medium text-sm", theme === "dark" ? "text-white" : "text-gray-700")}>
                        Supervisor #{idx + 1}
                      </span>
                      {supervisoresConfig.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSupervisor(sup.id)}
                          className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded text-xs",
                            theme === "dark" ? "text-red-400 hover:bg-red-500/20" : "text-red-500 hover:bg-red-50",
                          )}
                        >
                          <Trash2 className="w-3 h-3" />
                          Eliminar
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      <div>
                        <label className={cn("text-xs mb-1 block", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                          Seleccionar Supervisor
                        </label>
                        <select
                          value={sup.supervisorId}
                          onChange={(e) => updateSupervisor(sup.id, e.target.value)}
                          className={cn(
                            "w-full px-3 py-2 rounded-lg border text-sm",
                            theme === "dark"
                              ? "bg-white/5 border-white/10 text-white"
                              : "bg-white border-gray-200 text-gray-700",
                          )}
                        >
                          <option value="">-- Seleccione --</option>
                          {supervisoresDisponibles.map(s => (
                            <option key={s._id} value={s._id}>{s.nombre}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={cn("text-xs mb-1 block", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                          Cantidad Total de Afiliados
                        </label>
                        <input
                          type="number"
                          value={sup.cantidad}
                          onChange={(e) => updateSupervisorCantidad(sup.id, Number(e.target.value))}
                          className={cn(
                            "w-full px-3 py-2 rounded-lg border text-sm",
                            theme === "dark"
                              ? "bg-white/5 border-white/10 text-white"
                              : "bg-white border-gray-200 text-gray-700",
                          )}
                        />
                        {faltante > 0 && (
                          <span
                            className={cn(
                              "text-xs mt-1 flex items-center gap-1",
                              theme === "dark" ? "text-amber-400" : "text-amber-600",
                            )}
                          >
                            <AlertTriangle className="w-3 h-3" />
                            Faltan {faltante} afiliados por distribuir
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-2">
                        <label className={cn("text-xs", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                          Distribución por Obra Social
                        </label>
                        <button
                          type="button"
                          ref={(el) => { if (el) modalTriggerRefs.current[sup.id] = el }}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            console.log("🔍 [Modal Trigger] Button clicked for supervisor:", sup.id)
                            openObraSocialModal(sup.id)
                          }}
                          className={cn(
                            "flex items-center gap-1 text-xs px-2 py-1 rounded",
                            theme === "dark"
                              ? "text-green-400 hover:bg-green-500/20"
                              : "text-green-600 hover:bg-green-100",
                          )}
                        >
                          <Plus className="w-3 h-3" />
                          Agregar Obra Social
                        </button>
                      </div>
                      {sup.obrasSociales.length === 0 ? (
                        <div
                          className={cn(
                            "rounded-lg border-2 border-dashed p-4 text-center text-xs",
                            theme === "dark" ? "border-white/10 text-gray-500" : "border-gray-200 text-gray-400",
                          )}
                        >
                          Sin obras sociales configuradas
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {sup.obrasSociales.map(os => (
                            <div
                              key={os.id}
                              className={cn(
                                "flex items-center justify-between p-2 rounded text-xs",
                                theme === "dark" ? "bg-white/5" : "bg-white"
                              )}
                            >
                              <span className={cn(theme === "dark" ? "text-white" : "text-gray-700")}>
                                {os.nombre}: <strong>{os.cantidad}</strong> afiliados
                              </span>
                              <button
                                onClick={() => removeObraSocial(sup.id, os.id)}
                                className={cn(
                                  "p-1 rounded hover:bg-red-500/20",
                                  theme === "dark" ? "text-red-400" : "text-red-500"
                                )}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Hora de envío */}
      <div
        className={cn(
          "rounded-2xl border p-4 lg:p-6 backdrop-blur-sm",
          theme === "dark"
            ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
            : "bg-gradient-to-br from-white to-[#FAF7F2]/80 border-purple-200/30 shadow-lg shadow-purple-100/30",
        )}
      >
        <label className={cn("text-sm font-medium mb-2 block", theme === "dark" ? "text-gray-300" : "text-gray-600")}>
          Hora de envío diario (HH:mm)
        </label>
        <input
          type="time"
          value={horaEnvio}
          onChange={(e) => setHoraEnvio(e.target.value)}
          className={cn(
            "px-3 py-2 rounded-lg border text-sm",
            theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-700",
          )}
        />
      </div>

      {/* Configuración Actual */}
      {currentConfig && (
        <div
          className={cn(
            "rounded-2xl border p-4 lg:p-6 backdrop-blur-sm",
            theme === "dark"
              ? "bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20"
              : "bg-gradient-to-br from-green-50 to-green-50/50 border-green-200",
          )}
        >
          <h3
            className={cn(
              "font-semibold flex items-center gap-2 mb-3",
              theme === "dark" ? "text-green-400" : "text-green-600",
            )}
          >
            <CheckCircle className="w-5 h-5" />
            Configuración Actual
          </h3>
          <ul className={cn("space-y-1 text-sm", theme === "dark" ? "text-green-300" : "text-green-700")}>
            <li>
              • Tipo: <strong>{currentConfig.sendType === "masivo" ? "Masivo" : "Avanzado"}</strong>
            </li>
            <li>
              • {currentConfig.sendType === "masivo"
                ? "Configuración masiva para todos los supervisores"
                : `${currentConfig.supervisorConfigs?.length || 0} supervisor(es) configurado(s)`}
            </li>
            <li>• Envío diario a las {currentConfig.scheduledTime}</li>
            {currentConfig.lastExecutedAt && (
              <li>• Última ejecución: {new Date(currentConfig.lastExecutedAt).toLocaleString("es-AR")}</li>
            )}
          </ul>
        </div>
      )}

      {/* Guardar Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className={cn(
          "flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed",
          theme === "dark"
            ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-500 hover:to-blue-400"
            : "bg-gradient-to-r from-blue-500 to-blue-400 text-white hover:from-blue-400 hover:to-blue-300",
        )}
      >
        <CheckCircle className="w-5 h-5" />
        {saving ? "Guardando..." : "Guardar Configuración"}
      </button>

      {/* Cancelation Button */}
      {currentConfig && (
        <button
          onClick={() => setShowCancelModal(true)}
          disabled={cancelling}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105 disabled:opacity-50",
            theme === "dark"
              ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
              : "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200",
          )}
        >
          <XCircle className="w-5 h-5" />
          Cancelar Envíos
        </button>
      )}

      {/* Cancellation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCancelModal(false)}>
          <div
            className={cn(
              "rounded-2xl p-6 max-w-md w-full mx-4",
              theme === "dark" ? "bg-gray-800 border border-white/10" : "bg-white"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={cn("text-lg font-bold mb-4", theme === "dark" ? "text-white" : "text-gray-900")}>
              Cancelar Envíos Programados
            </h3>
            <p className={cn("text-sm mb-6", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
              Selecciona cómo deseas cancelar los envíos:
            </p>
            <div className="space-y-3">
              <button
                onClick={() => handleCancelExports('today')}
                disabled={cancelling}
                className={cn(
                  "w-full p-4 rounded-xl border-2 transition-all text-left",
                  theme === "dark"
                    ? "border-white/10 hover:border-yellow-500/50 hover:bg-yellow-500/10"
                    : "border-gray-200 hover:border-yellow-400 hover:bg-yellow-50"
                )}
              >
                <p className={cn("font-medium mb-1", theme === "dark" ? "text-white" : "text-gray-900")}>
                  Solo por hoy
                </p>
                <p className={cn("text-xs", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                  Se reanudará mañana automáticamente
                </p>
              </button>
              <button
                onClick={() => handleCancelExports('indefinite')}
                disabled={cancelling}
                className={cn(
                  "w-full p-4 rounded-xl border-2 transition-all text-left",
                  theme === "dark"
                    ? "border-red-500/30 hover:border-red-500/50 hover:bg-red-500/10"
                    : "border-red-200 hover:border-red-400 hover:bg-red-50"
                )}
              >
                <p className={cn("font-medium mb-1", theme === "dark" ? "text-red-400" : "text-red-600")}>
                  Indefinidamente
                </p>
                <p className={cn("text-xs", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                  Hasta que guardes una nueva configuración
                </p>
              </button>
            </div>
            <button
              onClick={() => setShowCancelModal(false)}
              disabled={cancelling}
              className={cn(
                "mt-4 w-full py-2 rounded-lg font-medium",
                theme === "dark" ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-800"
              )}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {showObraSocialModal && selectedSupervisorId && (
        <ObraSocialModal
          isOpen={showObraSocialModal}
          onClose={() => setShowObraSocialModal(false)}
          onAdd={addObraSocial}
          availableObrasSociales={availableObrasSociales}
          triggerElement={modalTriggerRefs.current[selectedSupervisorId]}
        />
      )}
    </div>
  )
}
