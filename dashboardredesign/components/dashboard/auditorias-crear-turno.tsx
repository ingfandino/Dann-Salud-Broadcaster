"use client"

import type React from "react"

import { useState } from "react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import { Upload, Send } from "lucide-react"

export function AuditoriasCrearTurno() {
  const { theme } = useTheme()
  const [formData, setFormData] = useState({
    nombreAfiliado: "",
    cuil: "",
    telefono: "",
    tipoVenta: "Alta",
    obraSocialAnterior: "",
    obraSocialVendida: "Binimed",
    fecha: "",
    hora: "",
    supervisor: "",
    asesor: "",
    validador: "",
    perteneceOtroEquipo: false,
    datosExtra: "",
  })

  const handleChange = (field: string, value: string | boolean) => {
    setFormData({ ...formData, [field]: value })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Form submitted:", formData)
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={cn("text-xl font-semibold", theme === "dark" ? "text-white" : "text-gray-800")}>
            Pautar auditoría / Venta
          </h2>
        </div>
        <button
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
            theme === "dark"
              ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
              : "bg-green-500 text-white hover:bg-green-600",
          )}
        >
          <Upload className="w-4 h-4" />
          Carga Masiva
        </button>
      </div>

      {/* Form */}
      <div
        className={cn(
          "rounded-2xl border p-6 backdrop-blur-sm max-w-2xl mx-auto",
          theme === "dark"
            ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
            : "bg-white border-gray-200 shadow-sm",
        )}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Nombre de afiliado */}
          <div>
            <label
              className={cn("block text-sm font-medium mb-2", theme === "dark" ? "text-gray-300" : "text-gray-700")}
            >
              Nombre de afiliado
            </label>
            <input
              type="text"
              value={formData.nombreAfiliado}
              onChange={(e) => handleChange("nombreAfiliado", e.target.value)}
              className={cn(
                "w-full px-4 py-2.5 rounded-lg border text-sm",
                theme === "dark"
                  ? "bg-white/5 border-white/10 text-white placeholder-gray-500"
                  : "bg-white border-gray-200 text-gray-800 placeholder-gray-400",
              )}
            />
          </div>

          {/* CUIL */}
          <div>
            <label
              className={cn("block text-sm font-medium mb-2", theme === "dark" ? "text-gray-300" : "text-gray-700")}
            >
              CUIL <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="11 dígitos"
              value={formData.cuil}
              onChange={(e) => handleChange("cuil", e.target.value)}
              className={cn(
                "w-full px-4 py-2.5 rounded-lg border text-sm",
                theme === "dark"
                  ? "bg-white/5 border-white/10 text-white placeholder-gray-500"
                  : "bg-white border-gray-200 text-gray-800 placeholder-gray-400",
              )}
              required
            />
          </div>

          {/* Teléfono */}
          <div>
            <label
              className={cn("block text-sm font-medium mb-2", theme === "dark" ? "text-gray-300" : "text-gray-700")}
            >
              Teléfono
            </label>
            <input
              type="tel"
              value={formData.telefono}
              onChange={(e) => handleChange("telefono", e.target.value)}
              className={cn(
                "w-full px-4 py-2.5 rounded-lg border text-sm",
                theme === "dark"
                  ? "bg-white/5 border-white/10 text-white placeholder-gray-500"
                  : "bg-white border-gray-200 text-gray-800 placeholder-gray-400",
              )}
            />
          </div>

          {/* Tipo de venta */}
          <div>
            <label
              className={cn("block text-sm font-medium mb-2", theme === "dark" ? "text-gray-300" : "text-gray-700")}
            >
              Tipo de venta
            </label>
            <select
              value={formData.tipoVenta}
              onChange={(e) => handleChange("tipoVenta", e.target.value)}
              className={cn(
                "w-full px-4 py-2.5 rounded-lg border text-sm",
                theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
              )}
            >
              <option value="Alta">Alta</option>
              <option value="Baja">Baja</option>
              <option value="Cambio">Cambio</option>
            </select>
          </div>

          {/* Obra social anterior */}
          <div>
            <label
              className={cn("block text-sm font-medium mb-2", theme === "dark" ? "text-gray-300" : "text-gray-700")}
            >
              Obra social anterior
            </label>
            <select
              value={formData.obraSocialAnterior}
              onChange={(e) => handleChange("obraSocialAnterior", e.target.value)}
              className={cn(
                "w-full px-4 py-2.5 rounded-lg border text-sm",
                theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
              )}
            >
              <option value="">-- Seleccionar --</option>
              <option value="OSECAC">OSECAC</option>
              <option value="OSUTHGRA">OSUTHGRA</option>
              <option value="Elevar">Elevar</option>
              <option value="OSTCARA">OSTCARA</option>
            </select>
          </div>

          {/* Obra social vendida */}
          <div>
            <label
              className={cn("block text-sm font-medium mb-2", theme === "dark" ? "text-gray-300" : "text-gray-700")}
            >
              Obra social vendida
            </label>
            <select
              value={formData.obraSocialVendida}
              onChange={(e) => handleChange("obraSocialVendida", e.target.value)}
              className={cn(
                "w-full px-4 py-2.5 rounded-lg border text-sm",
                theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
              )}
            >
              <option value="Binimed">Binimed</option>
              <option value="Meplife">Meplife</option>
            </select>
          </div>

          {/* Fecha */}
          <div>
            <label
              className={cn("block text-sm font-medium mb-2", theme === "dark" ? "text-gray-300" : "text-gray-700")}
            >
              Fecha (día)
            </label>
            <input
              type="date"
              value={formData.fecha}
              onChange={(e) => handleChange("fecha", e.target.value)}
              className={cn(
                "w-full px-4 py-2.5 rounded-lg border text-sm",
                theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
              )}
            />
          </div>

          {/* Hora */}
          <div>
            <label
              className={cn("block text-sm font-medium mb-2", theme === "dark" ? "text-gray-300" : "text-gray-700")}
            >
              Hora (turno)
            </label>
            <select
              value={formData.hora}
              onChange={(e) => handleChange("hora", e.target.value)}
              className={cn(
                "w-full px-4 py-2.5 rounded-lg border text-sm",
                theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
              )}
            >
              <option value="">-- Seleccionar --</option>
              <option value="09:00">09:00</option>
              <option value="09:30">09:30</option>
              <option value="10:00">10:00</option>
              <option value="10:30">10:30</option>
              <option value="11:00">11:00</option>
              <option value="11:30">11:30</option>
              <option value="12:00">12:00</option>
            </select>
          </div>

          {/* Supervisor */}
          <div>
            <label
              className={cn("block text-sm font-medium mb-2", theme === "dark" ? "text-gray-300" : "text-gray-700")}
            >
              Supervisor <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.supervisor}
              onChange={(e) => handleChange("supervisor", e.target.value)}
              className={cn(
                "w-full px-4 py-2.5 rounded-lg border text-sm",
                theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
              )}
              required
            >
              <option value="">-- Seleccionar supervisor --</option>
              <option value="mateo">Mateo Viera</option>
              <option value="gaston">Gaston Sarmiento</option>
              <option value="luciano">Luciano Carugno</option>
              <option value="nahia">Nahia Avellaneda</option>
            </select>
          </div>

          {/* Asesor */}
          <div>
            <label
              className={cn("block text-sm font-medium mb-2", theme === "dark" ? "text-gray-300" : "text-gray-700")}
            >
              Asesor <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.asesor}
              onChange={(e) => handleChange("asesor", e.target.value)}
              className={cn(
                "w-full px-4 py-2.5 rounded-lg border text-sm",
                theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
              )}
              required
            >
              <option value="">-- Seleccionar asesor --</option>
              <option value="lautaro">Lautaro Bogado</option>
              <option value="micaela">Micaela Cordoba</option>
              <option value="juliana">Juliana Baez</option>
            </select>
            <p className={cn("text-xs mt-1", theme === "dark" ? "text-cyan-400" : "text-cyan-600")}>
              Primero selecciona un supervisor
            </p>
          </div>

          {/* Validador */}
          <div>
            <label
              className={cn("block text-sm font-medium mb-2", theme === "dark" ? "text-gray-300" : "text-gray-700")}
            >
              Validador <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.validador}
              onChange={(e) => handleChange("validador", e.target.value)}
              className={cn(
                "w-full px-4 py-2.5 rounded-lg border text-sm",
                theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
              )}
              required
            >
              <option value="">-- Seleccionar validador --</option>
              <option value="marcelo">Marcelo</option>
              <option value="luciano">Luciano Carugno</option>
              <option value="paola">Paola Fernandez</option>
            </select>
          </div>

          {/* Pertenece a otro equipo */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="perteneceOtroEquipo"
              checked={formData.perteneceOtroEquipo}
              onChange={(e) => handleChange("perteneceOtroEquipo", e.target.checked)}
              className={cn(
                "w-4 h-4 rounded border",
                theme === "dark" ? "bg-white/5 border-white/10" : "border-gray-300",
              )}
            />
            <label
              htmlFor="perteneceOtroEquipo"
              className={cn("text-sm", theme === "dark" ? "text-gray-300" : "text-gray-700")}
            >
              Pertenece a otro equipo
            </label>
          </div>
          <p className={cn("text-xs -mt-3", theme === "dark" ? "text-cyan-400" : "text-cyan-600")}>
            Selecciona un compañero de tu equipo que validará la venta
          </p>

          {/* Datos extra */}
          <div>
            <label
              className={cn("block text-sm font-medium mb-2", theme === "dark" ? "text-gray-300" : "text-gray-700")}
            >
              Datos extra (opcional)
            </label>
            <textarea
              placeholder="Ejemplo: Afiliado con familiares, enfermedad preexistente, observaciones..."
              value={formData.datosExtra}
              onChange={(e) => handleChange("datosExtra", e.target.value)}
              rows={3}
              className={cn(
                "w-full px-4 py-2.5 rounded-lg border text-sm resize-none",
                theme === "dark"
                  ? "bg-white/5 border-white/10 text-white placeholder-gray-500"
                  : "bg-white border-gray-200 text-gray-800 placeholder-gray-400",
              )}
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            className={cn(
              "w-full sm:w-auto px-6 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2",
              theme === "dark"
                ? "bg-gradient-to-r from-cyan-500 to-teal-500 text-white hover:from-cyan-600 hover:to-teal-600"
                : "bg-gradient-to-r from-cyan-500 to-teal-500 text-white hover:from-cyan-600 hover:to-teal-600",
            )}
          >
            <Send className="w-4 h-4" />
            Enviar
          </button>
        </form>
      </div>
    </div>
  )
}
