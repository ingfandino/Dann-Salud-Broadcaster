"use client"

import { useState } from "react"
import { Calendar, RefreshCw, FileSpreadsheet, Mail, X, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTheme } from "./theme-provider"

interface Campaign {
  id: number
  fechaHora: string
  campana: string
  asesor: string
  equipo: string
  contactos: number
  enviados: number
  fallidos: number
  respuestas: number
  estado: "Completada" | "Fallida" | "descanso" | "Pausada"
}

const campaignsData: Campaign[] = [
  {
    id: 1,
    fechaHora: "25/11/2025, 16:55",
    campana: "Prueba completa",
    asesor: "Benjamin Marco",
    equipo: "Equipo 121",
    contactos: 21,
    enviados: 13,
    fallidos: 3,
    respuestas: 0,
    estado: "Completada",
  },
  {
    id: 2,
    fechaHora: "25/11/2025, 15:23",
    campana: "Prueba completa",
    asesor: "Eriko Cardozo",
    equipo: "Equipo 117",
    contactos: 37,
    enviados: 14,
    fallidos: 10,
    respuestas: 0,
    estado: "Completada",
  },
  {
    id: 3,
    fechaHora: "25/11/2025, 14:13",
    campana: "CAMPANA bbg",
    asesor: "Agustín Maya",
    equipo: "Equipo 111",
    contactos: 71,
    enviados: 2,
    fallidos: 2,
    respuestas: 0,
    estado: "Fallida",
  },
  {
    id: 4,
    fechaHora: "25/11/2025, 14:11",
    campana: "Joaquin Valdez",
    asesor: "Joaquin Valdez",
    equipo: "Equipo 121",
    contactos: 31,
    enviados: 13,
    fallidos: 18,
    respuestas: 0,
    estado: "descanso",
  },
  {
    id: 5,
    fechaHora: "25/11/2025, 14:11",
    campana: "Joaquin Valdez",
    asesor: "Joaquin Valdez",
    equipo: "Equipo 674",
    contactos: 30,
    enviados: 1,
    fallidos: 3,
    respuestas: 0,
    estado: "Pausada",
  },
  {
    id: 6,
    fechaHora: "25/11/2025, 12:51",
    campana: "Joaquin Valdez",
    asesor: "Joaquin Suarez",
    equipo: "Equipo 201",
    contactos: 30,
    enviados: 0,
    fallidos: 3,
    respuestas: 0,
    estado: "descanso",
  },
  {
    id: 7,
    fechaHora: "25/11/2025, 11:30",
    campana: "Promoción Navidad",
    asesor: "María López",
    equipo: "Equipo 150",
    contactos: 45,
    enviados: 40,
    fallidos: 5,
    respuestas: 12,
    estado: "Completada",
  },
  {
    id: 8,
    fechaHora: "25/11/2025, 10:15",
    campana: "Seguimiento Q4",
    asesor: "Carlos Ruiz",
    equipo: "Equipo 102",
    contactos: 28,
    enviados: 25,
    fallidos: 3,
    respuestas: 8,
    estado: "Completada",
  },
]

const estadoStyles = {
  Completada: {
    dark: "bg-[#17C787]/20 text-[#17C787] border-[#17C787]/30",
    light: "bg-[#17C787]/10 text-[#17C787] border-[#17C787]/20",
  },
  Fallida: {
    dark: "bg-[#C8376B]/20 text-[#C8376B] border-[#C8376B]/30",
    light: "bg-[#C8376B]/10 text-[#C8376B] border-[#C8376B]/20",
  },
  descanso: {
    dark: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    light: "bg-cyan-100 text-cyan-600 border-cyan-200",
  },
  Pausada: {
    dark: "bg-[#F4C04A]/20 text-[#F4C04A] border-[#F4C04A]/30",
    light: "bg-[#F4C04A]/10 text-[#F4C04A] border-[#F4C04A]/20",
  },
}

export function ReportesGlobales() {
  const { theme } = useTheme()
  const [dateFilter, setDateFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const filteredCampaigns = campaignsData.filter((campaign) => {
    if (statusFilter !== "all" && campaign.estado !== statusFilter) return false
    return true
  })

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="mb-6">
        <h2 className={cn("text-xl lg:text-2xl font-bold mb-1", theme === "dark" ? "text-white" : "text-gray-700")}>
          Reporte de Campañas
        </h2>
        <p className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
          Historial completo de campañas de mensajería
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 sm:flex-initial sm:min-w-[180px]">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              placeholder="dd/mm/aaaa"
              className={cn(
                "w-full pl-4 pr-10 py-2.5 rounded-lg border text-sm transition-all",
                theme === "dark"
                  ? "bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
                  : "bg-white border-purple-200/50 text-gray-700 placeholder:text-gray-400 focus:border-purple-400 focus:ring-1 focus:ring-purple-200",
              )}
            />
            <Calendar
              className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4",
                theme === "dark" ? "text-gray-500" : "text-gray-400",
              )}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={cn(
              "flex-1 sm:flex-initial sm:min-w-[180px] px-4 py-2.5 rounded-lg border text-sm transition-all appearance-none cursor-pointer",
              theme === "dark"
                ? "bg-white/5 border-white/10 text-white focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
                : "bg-white border-purple-200/50 text-gray-700 focus:border-purple-400 focus:ring-1 focus:ring-purple-200",
            )}
          >
            <option value="all">Todos los estados</option>
            <option value="Completada">Completada</option>
            <option value="Fallida">Fallida</option>
            <option value="Pausada">Pausada</option>
            <option value="descanso">Descanso</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
              theme === "dark"
                ? "bg-cyan-500 hover:bg-cyan-400 text-white"
                : "bg-purple-500 hover:bg-purple-400 text-white",
            )}
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
          <button
            onClick={() => {
              setDateFilter("")
              setStatusFilter("all")
            }}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
              theme === "dark"
                ? "bg-white/10 hover:bg-white/20 text-gray-300"
                : "bg-gray-100 hover:bg-gray-200 text-gray-600",
            )}
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {/* Table */}
      <div
        className={cn(
          "rounded-xl border overflow-hidden",
          theme === "dark"
            ? "bg-[#0d1526]/80 border-white/10"
            : "bg-white border-purple-200/30 shadow-lg shadow-purple-100/20",
        )}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr
                className={cn(
                  "text-left text-xs uppercase tracking-wider",
                  theme === "dark" ? "text-gray-400 bg-white/5" : "text-gray-500 bg-purple-50/50",
                )}
              >
                <th className="px-4 py-3 font-medium">Fecha/Hora</th>
                <th className="px-4 py-3 font-medium">Campaña</th>
                <th className="px-4 py-3 font-medium">Asesor</th>
                <th className="px-4 py-3 font-medium text-center">Contactos</th>
                <th className="px-4 py-3 font-medium text-center">Enviados</th>
                <th className="px-4 py-3 font-medium text-center">Fallidos</th>
                <th className="px-4 py-3 font-medium text-center">Respuestas</th>
                <th className="px-4 py-3 font-medium text-center">Estado</th>
                <th className="px-4 py-3 font-medium text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className={cn("divide-y", theme === "dark" ? "divide-white/5" : "divide-purple-100/50")}>
              {filteredCampaigns.map((campaign, index) => (
                <tr
                  key={campaign.id}
                  className={cn(
                    "transition-colors",
                    theme === "dark" ? "hover:bg-white/5" : "hover:bg-purple-50/30",
                    "animate-fade-in-up",
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <td className={cn("px-4 py-3 text-sm", theme === "dark" ? "text-gray-300" : "text-gray-600")}>
                    {campaign.fechaHora}
                  </td>
                  <td
                    className={cn("px-4 py-3 text-sm font-medium", theme === "dark" ? "text-white" : "text-gray-700")}
                  >
                    {campaign.campana}
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className={cn("text-sm font-medium", theme === "dark" ? "text-white" : "text-gray-700")}>
                        {campaign.asesor}
                      </p>
                      <p className={cn("text-xs", theme === "dark" ? "text-gray-500" : "text-gray-400")}>
                        {campaign.equipo}
                      </p>
                    </div>
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 text-sm text-center",
                      theme === "dark" ? "text-gray-300" : "text-gray-600",
                    )}
                  >
                    {campaign.contactos}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium",
                        theme === "dark" ? "bg-[#17C787]/20 text-[#17C787]" : "bg-[#17C787]/10 text-[#17C787]",
                      )}
                    >
                      <Mail className="w-3 h-3" />
                      {campaign.enviados}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium",
                        theme === "dark" ? "bg-[#C8376B]/20 text-[#C8376B]" : "bg-[#C8376B]/10 text-[#C8376B]",
                      )}
                    >
                      <X className="w-3 h-3" />
                      {campaign.fallidos}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium",
                        theme === "dark" ? "bg-[#1E88E5]/20 text-[#1E88E5]" : "bg-[#1E88E5]/10 text-[#1E88E5]",
                      )}
                    >
                      <MessageSquare className="w-3 h-3" />
                      {campaign.respuestas}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border",
                        estadoStyles[campaign.estado][theme],
                      )}
                    >
                      <Mail className="w-3 h-3" />
                      {campaign.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105",
                        theme === "dark"
                          ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                          : "bg-blue-100 text-blue-600 hover:bg-blue-200",
                      )}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      Excel
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
