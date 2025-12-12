"use client"

import { useState } from "react"
import { Link2, RefreshCw, Smartphone, ArrowRight } from "lucide-react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"

export function VincularWhatsApp() {
  const { theme } = useTheme()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => setIsRefreshing(false), 1500)
  }

  return (
    <div className="animate-fade-in-up flex items-center justify-center min-h-[60vh]">
      <div
        className={cn(
          "w-full max-w-md rounded-2xl border p-6 lg:p-8 backdrop-blur-sm text-center",
          theme === "dark"
            ? "bg-gradient-to-br from-white/10 to-white/5 border-white/10 shadow-2xl shadow-purple-500/10"
            : "bg-gradient-to-br from-white to-[#FAF7F2]/80 border-purple-200/30 shadow-xl shadow-purple-200/30",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-center gap-3 mb-2">
          <div
            className={cn(
              "p-2.5 rounded-xl",
              theme === "dark"
                ? "bg-gradient-to-br from-purple-500/20 to-blue-500/20"
                : "bg-gradient-to-br from-purple-100 to-blue-100",
            )}
          >
            <Link2 className={cn("w-6 h-6", theme === "dark" ? "text-purple-400" : "text-purple-600")} />
          </div>
          <h2 className={cn("text-xl lg:text-2xl font-bold", theme === "dark" ? "text-white" : "text-gray-800")}>
            Vincular WhatsApp
          </h2>
        </div>

        {/* Subtitle */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <Smartphone className={cn("w-4 h-4", theme === "dark" ? "text-gray-400" : "text-gray-500")} />
          <p className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
            Escanea este QR con WhatsApp
          </p>
        </div>

        {/* QR Code Container */}
        <div
          className={cn(
            "relative mx-auto w-56 h-56 lg:w-64 lg:h-64 rounded-xl p-4 mb-6 overflow-hidden",
            theme === "dark" ? "bg-white" : "bg-white border border-purple-100 shadow-inner",
          )}
        >
          <div className="w-full h-full relative">
            <svg viewBox="0 0 200 200" className="w-full h-full">
              <rect fill="white" width="200" height="200" />
              <rect fill="black" x="10" y="10" width="50" height="50" />
              <rect fill="white" x="17" y="17" width="36" height="36" />
              <rect fill="black" x="24" y="24" width="22" height="22" />
              <rect fill="black" x="140" y="10" width="50" height="50" />
              <rect fill="white" x="147" y="17" width="36" height="36" />
              <rect fill="black" x="154" y="24" width="22" height="22" />
              <rect fill="black" x="10" y="140" width="50" height="50" />
              <rect fill="white" x="17" y="147" width="36" height="36" />
              <rect fill="black" x="24" y="154" width="22" height="22" />
              {Array.from({ length: 100 }).map((_, i) => {
                const x = 70 + (i % 10) * 7
                const y = 70 + Math.floor(i / 10) * 7
                const show = Math.random() > 0.5
                return show ? <rect key={i} fill="black" x={x} y={y} width="5" height="5" /> : null
              })}
              {Array.from({ length: 40 }).map((_, i) => {
                const x = 70 + (i % 8) * 8
                const y = 10 + Math.floor(i / 8) * 8
                const show = Math.random() > 0.4
                return show ? <rect key={`t${i}`} fill="black" x={x} y={y} width="6" height="6" /> : null
              })}
              {Array.from({ length: 40 }).map((_, i) => {
                const x = 10 + (i % 5) * 8
                const y = 70 + Math.floor(i / 5) * 8
                const show = Math.random() > 0.4
                return show ? <rect key={`l${i}`} fill="black" x={x} y={y} width="6" height="6" /> : null
              })}
              {Array.from({ length: 40 }).map((_, i) => {
                const x = 145 + (i % 5) * 8
                const y = 70 + Math.floor(i / 5) * 8
                const show = Math.random() > 0.4
                return show ? <rect key={`r${i}`} fill="black" x={x} y={y} width="6" height="6" /> : null
              })}
              {Array.from({ length: 35 }).map((_, i) => {
                const x = 70 + (i % 7) * 9
                const y = 150 + Math.floor(i / 7) * 9
                const show = Math.random() > 0.4
                return show ? <rect key={`b${i}`} fill="black" x={x} y={y} width="6" height="6" /> : null
              })}
            </svg>
          </div>

          {isRefreshing && (
            <div className="absolute inset-0 bg-white/90 flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
          )}
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={cn(
            "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all transform hover:scale-[1.02] active:scale-[0.98]",
            theme === "dark"
              ? "bg-gradient-to-r from-[#17C787] to-emerald-600 hover:from-[#17C787]/90 hover:to-emerald-600/90 text-white shadow-lg shadow-[#17C787]/20"
              : "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-200/50",
            isRefreshing && "opacity-70 cursor-not-allowed",
          )}
        >
          <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
          {isRefreshing ? "Actualizando..." : "Refrescar QR"}
        </button>

        {/* Instructions */}
        <div className={cn("mt-6 pt-4 border-t", theme === "dark" ? "border-white/10" : "border-purple-100")}>
          <div
            className={cn(
              "flex items-center justify-center gap-2 text-xs flex-wrap",
              theme === "dark" ? "text-gray-400" : "text-gray-500",
            )}
          >
            <span>Abre WhatsApp</span>
            <ArrowRight className="w-3 h-3" />
            <span>Menú de dispositivos vinculados</span>
            <ArrowRight className="w-3 h-3" />
            <span>Escanea el código QR</span>
          </div>
        </div>
      </div>
    </div>
  )
}
