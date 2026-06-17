"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useTheme } from "./theme-provider"

type DocumentProcessingConfig = {
  documentProcessingEnabled: boolean
  documentProcessingInputsRequired: boolean
  documentProcessingAutoTriggerEnabled: boolean
}

const defaultConfig: DocumentProcessingConfig = {
  documentProcessingEnabled: false,
  documentProcessingInputsRequired: false,
  documentProcessingAutoTriggerEnabled: false,
}

export function ConfiguracionProcesamientoDocumental() {
  const { theme } = useTheme()
  const [config, setConfig] = useState<DocumentProcessingConfig>(defaultConfig)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      setLoading(true)
      const res = await api.documentProcessing.getConfig()
      setConfig({ ...defaultConfig, ...(res.data?.config || {}) })
    } catch {
      setMessage("No se pudo cargar la configuración.")
    } finally {
      setLoading(false)
    }
  }

  const updateFlag = async (key: keyof DocumentProcessingConfig, value: boolean) => {
    const previousConfig = config
    const nextConfig = { ...config, [key]: value }
    setConfig(nextConfig)
    setSaving(true)
    setMessage(null)
    try {
      const res = await api.documentProcessing.updateConfig(nextConfig)
      setConfig({ ...defaultConfig, ...(res.data?.config || {}) })
      setMessage("Configuración actualizada.")
    } catch {
      setConfig(previousConfig)
      setMessage("No se pudo actualizar la configuración.")
    } finally {
      setSaving(false)
    }
  }

  const options: Array<{ key: keyof DocumentProcessingConfig; label: string; description: string }> = [
    {
      key: "documentProcessingEnabled",
      label: "Activar flujo documental",
      description: "Habilita la base técnica del nuevo flujo sin modificar auditorías existentes.",
    },
    {
      key: "documentProcessingInputsRequired",
      label: "Exigir inputs documentales",
      description: "Mantener apagado hasta que el flujo operativo esté listo para producción.",
    },
    {
      key: "documentProcessingAutoTriggerEnabled",
      label: "Disparo automático",
      description: "Mantener apagado hasta implementar el bot documental en una fase posterior.",
    },
  ]

  return (
    <div className="animate-fade-in-up">
      <div
        className={cn(
          "rounded-2xl border p-4 lg:p-6 backdrop-blur-sm",
          theme === "dark"
            ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
            : "bg-gradient-to-br from-[#F5F0E8] to-white border-[#00C794]/20 shadow-lg shadow-[#00C794]/10",
        )}
      >
        <div className="mb-5">
          <h2 className={cn("text-xl font-semibold", theme === "dark" ? "text-white" : "text-gray-700")}>Configuración del flujo documental</h2>
          <p className={cn("text-sm mt-1", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
            Configuración inicial de Phase 0. Los valores apagados preservan el comportamiento actual.
          </p>
        </div>

        {loading ? (
          <p className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}>Cargando configuración...</p>
        ) : (
          <div className="space-y-3">
            {options.map((option) => (
              <div
                key={option.key}
                className={cn(
                  "flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between",
                  theme === "dark" ? "border-white/10 bg-white/5" : "border-[#00C794]/20 bg-white/70",
                )}
              >
                <div>
                  <p className={cn("font-medium", theme === "dark" ? "text-white" : "text-gray-700")}>{option.label}</p>
                  <p className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}>{option.description}</p>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => updateFlag(option.key, !config[option.key])}
                  className={cn(
                    "min-w-24 rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-60",
                    config[option.key]
                      ? "bg-gradient-to-r from-[#00C794] to-[#009e74]"
                      : "bg-gradient-to-r from-gray-400 to-gray-500",
                  )}
                >
                  {config[option.key] ? "Activo" : "Inactivo"}
                </button>
              </div>
            ))}
          </div>
        )}

        {message && (
          <p className={cn("mt-4 text-sm", message.includes("No se pudo") ? "text-red-500" : "text-green-500")}>
            {message}
          </p>
        )}
      </div>
    </div>
  )
}
