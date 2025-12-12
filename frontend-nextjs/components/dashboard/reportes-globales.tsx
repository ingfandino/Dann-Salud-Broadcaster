"use client"

import { useState, useEffect, useMemo } from "react"
import { Calendar, RefreshCw, FileSpreadsheet, Mail, X, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTheme } from "./theme-provider"
import { api } from "@/lib/api"
import { toast } from "sonner"

interface Campaign {
  _id: string
  name: string
  createdBy: {
    nombre: string
    numeroEquipo?: string
  }
  scheduledFor?: string
  createdAt: string
  completedAt?: string
  status: string
  totalContacts: number
  sentCount: number
  failedCount: number
  repliesCount: number
}

// Pastel color styles for status badges
const estadoStyles = {
  completed: {
    dark: "bg-[#A8E6CF]/20 text-[#A8E6CF] border-[#A8E6CF]/30",
    light: "bg-[#A8E6CF]/30 text-[#2D5F3F] border-[#A8E6CF]/40",
  },
  paused: {
    dark: "bg-[#FFE89E]/20 text-[#FFE89E] border-[#FFE89E]/30",
    light: "bg-[#FFE89E]/40 text-[#8B7000] border-[#FFE89E]/50",
  },
  descanso: {
    dark: "bg-[#FFCBA4]/20 text-[#FFCBA4] border-[#FFCBA4]/30",
    light: "bg-[#FFCBA4]/40 text-[#A0522D] border-[#FFCBA4]/50",
  },
  pending: {
    dark: "bg-[#D3D3D3]/20 text-[#D3D3D3] border-[#D3D3D3]/30",
    light: "bg-[#D3D3D3]/40 text-[#696969] border-[#D3D3D3]/50",
  },
  running: {
    dark: "bg-[#AED6F1]/20 text-[#AED6F1] border-[#AED6F1]/30",
    light: "bg-[#AED6F1]/40 text-[#1F618D] border-[#AED6F1]/50",
  },
}

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleString("es-AR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

function mapStatus(status: string): "completed" | "paused" | "descanso" | "pending" | "running" {
  const statusMap: Record<string, "completed" | "paused" | "descanso" | "pending" | "running"> = {
    completado: "completed",
    completed: "completed",
    pausado: "paused",
    paused: "paused",
    descanso: "descanso",
    pendiente: "pending",
    pending: "pending",
    "en proceso": "running",
    running: "running",
  }
  return statusMap[status.toLowerCase()] || "running"
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    completado: "Completado",
    completed: "Completado",
    pausado: "Pausado",
    paused: "Pausado",
    descanso: "Descanso",
    "en proceso": "En proceso",
    running: "En proceso",
    pendiente: "Pendiente",
    pending: "Pendiente",
  }
  return labels[status.toLowerCase()] || status
}

function formatCampaignName(name: string): string {
  if (!name) return ""
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
}

export function ReportesGlobales() {
  const { theme } = useTheme()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  // Set today's date as default filter
  const today = new Date().toISOString().split("T")[0]
  const [dateFilter, setDateFilter] = useState(today)
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    fetchCampaigns()
  }, [])

  const fetchCampaigns = async () => {
    try {
      setLoading(true)
      const response = await api.sendJobs.list()
      setCampaigns(response.data || [])
    } catch (error: any) {
      console.error("Error fetching campaigns:", error)
      toast.error("Error al cargar campañas")
    } finally {
      setLoading(false)
    }
  }

  const handleExportCampaign = async (jobId: string) => {
    try {
      const response = await api.sendJobs.export(jobId)
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", `campaña_${jobId}_detalle.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success("✅ Excel descargado")
    } catch (error) {
      console.error("Error exporting campaign:", error)
      toast.error("Error al descargar Excel")
    }
  }

  const filteredCampaigns = useMemo(() => {
    // Filter out failed campaigns first
    let filtered = campaigns.filter((c) => c.status.toLowerCase() !== "fallido" && c.status.toLowerCase() !== "failed")

    // Apply date filter (independent of status filter)
    if (dateFilter) {
      filtered = filtered.filter((c) => {
        const campaignDate = new Date(c.scheduledFor || c.createdAt).toISOString().split("T")[0]
        return campaignDate === dateFilter
      })
    }

    // Apply status filter (independent of date filter)
    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => mapStatus(c.status) === statusFilter)
    }

    // Sort by date descending (most recent first)
    return filtered.sort(
      (a, b) =>
        new Date(b.scheduledFor || b.createdAt).getTime() - new Date(a.scheduledFor || a.createdAt).getTime()
    )
  }, [campaigns, statusFilter, dateFilter])

  if (loading) {
    return (
      <div className="animate-fade-in-up flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
            Cargando campañas...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="mb-6">
        <h2 className={cn("text-xl lg:text-2xl font-bold mb-1", theme === "dark" ? "text-white" : "text-gray-700")}>
          Reportes de Mensajería
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
            <option value="completed">Completado</option>
            <option value="paused">Pausado</option>
            <option value="descanso">Descanso</option>
            <option value="pending">Pendiente</option>
            <option value="running">En proceso</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            onClick={fetchCampaigns}
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
              const today = new Date().toISOString().split("T")[0]
              setDateFilter(today)
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
                <th className="px-4 py-3 font-medium">Fecha de inicio</th>
                <th className="px-4 py-3 font-medium">Campaña</th>
                <th className="px-4 py-3 font-medium">Asesor</th>
                <th className="px-4 py-3 font-medium text-center">Contactos</th>
                <th className="px-4 py-3 font-medium text-center">Enviados</th>
                <th className="px-4 py-3 font-medium text-center">Fallidos</th>
                <th className="px-4 py-3 font-medium text-center">Respuestas</th>
                <th className="px-4 py-3 font-medium text-center">Estado</th>
                <th className="px-4 py-3 font-medium">Fecha de finalización</th>
                <th className="px-4 py-3 font-medium text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className={cn("divide-y", theme === "dark" ? "divide-white/5" : "divide-purple-100/50")}>
              {filteredCampaigns.map((campaign, index) => {
                const mappedStatus = mapStatus(campaign.status)
                return (
                  <tr
                    key={campaign._id}
                    className={cn(
                      "transition-colors",
                      theme === "dark" ? "hover:bg-white/5" : "hover:bg-purple-50/30",
                      "animate-fade-in-up",
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <td className={cn("px-4 py-3 text-sm", theme === "dark" ? "text-gray-300" : "text-gray-600")}>
                      {formatDateTime(campaign.scheduledFor || campaign.createdAt)}
                    </td>
                    <td
                      className={cn("px-4 py-3 text-sm font-medium", theme === "dark" ? "text-white" : "text-gray-700")}
                    >
                      {formatCampaignName(campaign.name)}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className={cn("text-sm font-medium", theme === "dark" ? "text-white" : "text-gray-700")}>
                          {campaign.createdBy?.nombre || "N/A"}
                        </p>
                        <p className={cn("text-xs", theme === "dark" ? "text-gray-500" : "text-gray-400")}>
                          {campaign.createdBy?.numeroEquipo ? `Equipo ${campaign.createdBy.numeroEquipo}` : ""}
                        </p>
                      </div>
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 text-sm text-center",
                        theme === "dark" ? "text-gray-300" : "text-gray-600",
                      )}
                    >
                      {campaign.totalContacts || 0}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium",
                          theme === "dark" ? "bg-[#17C787]/20 text-[#17C787]" : "bg-[#17C787]/10 text-[#17C787]",
                        )}
                      >
                        <Mail className="w-3 h-3" />
                        {campaign.sentCount || 0}
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
                        {campaign.failedCount || 0}
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
                        {campaign.repliesCount || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border",
                          estadoStyles[mappedStatus][theme],
                        )}
                      >
                        <Mail className="w-3 h-3" />
                        {getStatusLabel(campaign.status)}
                      </span>
                    </td>
                    <td className={cn("px-4 py-3 text-sm", theme === "dark" ? "text-gray-300" : "text-gray-600")}>
                      {campaign.completedAt ? formatDateTime(campaign.completedAt) : "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleExportCampaign(campaign._id)}
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
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
