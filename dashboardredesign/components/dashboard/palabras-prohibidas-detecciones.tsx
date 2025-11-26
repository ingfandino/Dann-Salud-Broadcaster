"use client"

import { Shield, ShieldCheck, AlertTriangle, XCircle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTheme } from "./theme-provider"

const statsData = [
  { label: "Total Palabras", value: 3, icon: Shield, color: "blue" },
  { label: "Activas", value: 3, icon: ShieldCheck, color: "green" },
  { label: "Detecciones", value: 0, icon: AlertTriangle, color: "orange" },
  { label: "Sin Resolver", value: 0, icon: XCircle, color: "red" },
]

export function PalabrasProhibidasDetecciones() {
  const { theme } = useTheme()

  const getStatColor = (color: string) => {
    switch (color) {
      case "blue":
        return theme === "dark" ? "text-blue-400" : "text-blue-500"
      case "green":
        return theme === "dark" ? "text-green-400" : "text-green-500"
      case "orange":
        return theme === "dark" ? "text-orange-400" : "text-orange-500"
      case "red":
        return theme === "dark" ? "text-red-400" : "text-red-500"
      default:
        return theme === "dark" ? "text-gray-400" : "text-gray-500"
    }
  }

  const getStatIconColor = (color: string) => {
    switch (color) {
      case "blue":
        return theme === "dark" ? "text-blue-400" : "text-blue-500"
      case "green":
        return theme === "dark" ? "text-green-400" : "text-green-500"
      case "orange":
        return theme === "dark" ? "text-orange-400" : "text-orange-500"
      case "red":
        return theme === "dark" ? "text-red-400" : "text-red-500"
      default:
        return theme === "dark" ? "text-gray-400" : "text-gray-500"
    }
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              theme === "dark" ? "bg-orange-500/20" : "bg-orange-100",
            )}
          >
            <AlertTriangle className={cn("w-5 h-5", theme === "dark" ? "text-orange-400" : "text-orange-500")} />
          </div>
          <div>
            <h2 className={cn("text-xl font-bold", theme === "dark" ? "text-white" : "text-gray-800")}>Detecciones</h2>
            <p className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
              Revisa las alertas de detección de palabras prohibidas
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statsData.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div
              key={index}
              className={cn(
                "rounded-xl border p-4 transition-all duration-300",
                theme === "dark"
                  ? "bg-white/5 border-white/10 hover:border-white/20"
                  : "bg-white border-gray-200 hover:border-purple-200 shadow-sm",
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={cn("text-xs", theme === "dark" ? "text-gray-400" : "text-gray-500")}>{stat.label}</p>
                  <p className={cn("text-2xl font-bold mt-1", getStatColor(stat.color))}>{stat.value}</p>
                </div>
                <Icon className={cn("w-6 h-6", getStatIconColor(stat.color))} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Content Area - Empty State */}
      <div
        className={cn(
          "rounded-2xl border p-6",
          theme === "dark"
            ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
            : "bg-white border-gray-200 shadow-lg",
        )}
      >
        <div
          className={cn(
            "rounded-xl py-16 animate-fade-in-up",
            theme === "dark"
              ? "bg-gradient-to-br from-white/5 to-purple-500/5"
              : "bg-gradient-to-br from-gray-50 to-purple-50/30",
          )}
        >
          <div className="flex flex-col items-center justify-center">
            <div
              className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center mb-4 border-2",
                theme === "dark" ? "bg-green-500/10 border-green-500/30" : "bg-green-50 border-green-200",
              )}
            >
              <CheckCircle2 className={cn("w-8 h-8", theme === "dark" ? "text-green-400" : "text-green-500")} />
            </div>
            <p className={cn("text-base", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
              No hay detecciones registradas
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
