"use client"

import type React from "react"

import { useState } from "react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import { RefreshCw, UserPlus, ImageIcon } from "lucide-react"

export function RRHHAgregar() {
  const { theme } = useTheme()
  const [formData, setFormData] = useState({
    usuario: "",
    nombreCompleto: "",
    telefonoPersonal: "",
    numeroEquipo: "",
    fechaEntrevista: "",
    fechaIngreso: "",
    cargo: "",
    firmoContrato: false,
    activo: true,
    fotoDNI: null as File | null,
    notas: "",
  })

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData((prev) => ({ ...prev, fotoDNI: e.target.files![0] }))
    }
  }

  const handleLimpiar = () => {
    setFormData({
      usuario: "",
      nombreCompleto: "",
      telefonoPersonal: "",
      numeroEquipo: "",
      fechaEntrevista: "",
      fechaIngreso: "",
      cargo: "",
      firmoContrato: false,
      activo: true,
      fotoDNI: null,
      notas: "",
    })
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div
        className={cn(
          "rounded-2xl border p-6",
          theme === "dark"
            ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
            : "bg-white border-gray-200 shadow-sm",
        )}
      >
        {/* Header */}
        <div className="mb-6">
          <h2 className={cn("text-xl font-semibold mb-1", theme === "dark" ? "text-white" : "text-gray-800")}>
            Nuevo Empleado
          </h2>
          <p className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
            Complete los datos del nuevo empleado asociándolo a una cuenta de usuario existente
          </p>
        </div>

        {/* Usuario de la plataforma - destacado */}
        <div
          className={cn(
            "rounded-xl border p-4 mb-6",
            theme === "dark"
              ? "bg-gradient-to-r from-[#1E88E5]/10 to-[#0E6FFF]/10 border-[#1E88E5]/30"
              : "bg-gradient-to-r from-[#1E88E5]/5 to-[#0E6FFF]/5 border-[#1E88E5]/20",
          )}
        >
          <label className={cn("text-sm font-medium mb-2 block", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
            Usuario de la Plataforma <span style={{ color: "#C8376B" }}>*</span>
          </label>
          <select
            value={formData.usuario}
            onChange={(e) => handleInputChange("usuario", e.target.value)}
            className={cn(
              "w-full px-4 py-2.5 rounded-lg border text-sm",
              theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
            )}
          >
            <option value="">Seleccionar usuario...</option>
            <option value="user1">Juan Pérez</option>
            <option value="user2">María García</option>
            <option value="user3">Carlos López</option>
          </select>
          <p className={cn("text-xs mt-2", theme === "dark" ? "text-[#1E88E5]" : "text-[#1E88E5]")}>
            Seleccione la cuenta de usuario que quedará asociada a este empleado
          </p>
        </div>

        {/* Formulario principal */}
        <div className="space-y-4">
          {/* Nombre completo */}
          <div>
            <label
              className={cn("text-sm font-medium mb-1 block", theme === "dark" ? "text-gray-300" : "text-gray-700")}
            >
              Nombre Completo <span style={{ color: "#C8376B" }}>*</span>
            </label>
            <input
              type="text"
              value={formData.nombreCompleto}
              onChange={(e) => handleInputChange("nombreCompleto", e.target.value)}
              className={cn(
                "w-full px-4 py-2.5 rounded-lg border text-sm",
                theme === "dark"
                  ? "bg-white/5 border-white/10 text-white placeholder-gray-500"
                  : "bg-white border-gray-200 text-gray-800 placeholder-gray-400",
              )}
            />
          </div>

          {/* Teléfono y Equipo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                className={cn("text-sm font-medium mb-1 block", theme === "dark" ? "text-gray-300" : "text-gray-700")}
              >
                Teléfono Personal
              </label>
              <input
                type="text"
                placeholder="Ej: 1112345678"
                value={formData.telefonoPersonal}
                onChange={(e) => handleInputChange("telefonoPersonal", e.target.value)}
                className={cn(
                  "w-full px-4 py-2.5 rounded-lg border text-sm",
                  theme === "dark"
                    ? "bg-white/5 border-white/10 text-white placeholder-gray-500"
                    : "bg-white border-gray-200 text-gray-800 placeholder-gray-400",
                )}
              />
            </div>
            <div>
              <label
                className={cn("text-sm font-medium mb-1 block", theme === "dark" ? "text-gray-300" : "text-gray-700")}
              >
                Número de Equipo
              </label>
              <input
                type="text"
                value={formData.numeroEquipo}
                onChange={(e) => handleInputChange("numeroEquipo", e.target.value)}
                className={cn(
                  "w-full px-4 py-2.5 rounded-lg border text-sm",
                  theme === "dark"
                    ? "bg-white/5 border-white/10 text-white placeholder-gray-500"
                    : "bg-white border-gray-200 text-gray-800 placeholder-gray-400",
                )}
              />
            </div>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                className={cn("text-sm font-medium mb-1 block", theme === "dark" ? "text-gray-300" : "text-gray-700")}
              >
                Fecha de Entrevista
              </label>
              <input
                type="date"
                value={formData.fechaEntrevista}
                onChange={(e) => handleInputChange("fechaEntrevista", e.target.value)}
                className={cn(
                  "w-full px-4 py-2.5 rounded-lg border text-sm",
                  theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
                )}
              />
            </div>
            <div>
              <label
                className={cn("text-sm font-medium mb-1 block", theme === "dark" ? "text-gray-300" : "text-gray-700")}
              >
                Fecha de Ingreso
              </label>
              <input
                type="date"
                value={formData.fechaIngreso}
                onChange={(e) => handleInputChange("fechaIngreso", e.target.value)}
                className={cn(
                  "w-full px-4 py-2.5 rounded-lg border text-sm",
                  theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
                )}
              />
              <p className={cn("text-xs mt-1", theme === "dark" ? "text-[#F4C04A]" : "text-[#F4C04A]")}>
                Por defecto se asigna la fecha de creación de la cuenta
              </p>
            </div>
          </div>

          {/* Cargo */}
          <div>
            <label
              className={cn("text-sm font-medium mb-1 block", theme === "dark" ? "text-gray-300" : "text-gray-700")}
            >
              Cargo (Rol)
            </label>
            <div
              className={cn(
                "w-full px-4 py-2.5 rounded-lg border text-sm",
                theme === "dark"
                  ? "bg-[#17C787]/10 border-[#17C787]/30 text-[#17C787]"
                  : "bg-[#17C787]/10 border-[#17C787]/30 text-[#17C787]",
              )}
            >
              {formData.usuario ? "Asesor" : "El cargo se obtiene automáticamente del rol del usuario"}
            </div>
            <p className={cn("text-xs mt-1", theme === "dark" ? "text-gray-500" : "text-gray-500")}>
              El cargo se obtiene automáticamente del rol del usuario
            </p>
          </div>

          {/* Checkboxes */}
          <div
            className={cn(
              "flex items-center gap-6 p-4 rounded-lg border",
              theme === "dark" ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200",
            )}
          >
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.firmoContrato}
                onChange={(e) => handleInputChange("firmoContrato", e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[#1E88E5] focus:ring-[#1E88E5]"
              />
              <span className={cn("text-sm", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                ¿Firmó el contrato?
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.activo}
                onChange={(e) => handleInputChange("activo", e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[#17C787] focus:ring-[#17C787]"
              />
              <span className={cn("text-sm", theme === "dark" ? "text-gray-300" : "text-gray-700")}>¿Activo?</span>
            </label>
          </div>

          {/* Foto DNI */}
          <div>
            <label
              className={cn(
                "text-sm font-medium mb-1 flex items-center gap-1",
                theme === "dark" ? "text-gray-300" : "text-gray-700",
              )}
            >
              <ImageIcon className="w-4 h-4" style={{ color: "#F4C04A" }} />
              Foto del DNI (.jpg, .png)
            </label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png"
              onChange={handleFileChange}
              className={cn(
                "w-full px-4 py-2.5 rounded-lg border text-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium",
                theme === "dark"
                  ? "bg-white/5 border-white/10 text-white file:bg-[#1E88E5]/20 file:text-[#1E88E5]"
                  : "bg-white border-gray-200 text-gray-800 file:bg-[#1E88E5]/10 file:text-[#1E88E5]",
              )}
            />
            <p className={cn("text-xs mt-1", theme === "dark" ? "text-gray-500" : "text-gray-500")}>
              Seleccione una imagen del DNI (máximo 5MB)
            </p>
          </div>

          {/* Notas */}
          <div>
            <label
              className={cn("text-sm font-medium mb-1 block", theme === "dark" ? "text-gray-300" : "text-gray-700")}
            >
              Notas
            </label>
            <textarea
              placeholder="Observaciones adicionales..."
              value={formData.notas}
              onChange={(e) => handleInputChange("notas", e.target.value)}
              rows={4}
              className={cn(
                "w-full px-4 py-2.5 rounded-lg border text-sm resize-none",
                theme === "dark"
                  ? "bg-white/5 border-white/10 text-white placeholder-gray-500"
                  : "bg-white border-gray-200 text-gray-800 placeholder-gray-400",
              )}
            />
          </div>
        </div>

        {/* Footer con botones */}
        <div
          className={cn(
            "flex justify-end gap-3 mt-6 pt-6 border-t",
            theme === "dark" ? "border-white/10" : "border-gray-200",
          )}
        >
          <button
            onClick={handleLimpiar}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border",
              theme === "dark"
                ? "border-white/10 text-gray-400 hover:bg-white/5"
                : "border-gray-200 text-gray-600 hover:bg-gray-50",
            )}
          >
            <RefreshCw className="w-4 h-4" />
            Limpiar Formulario
          </button>
          <button
            className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors text-white"
            style={{ backgroundColor: "#1E88E5" }}
          >
            <UserPlus className="w-4 h-4" />
            Crear Empleado
          </button>
        </div>
      </div>
    </div>
  )
}
