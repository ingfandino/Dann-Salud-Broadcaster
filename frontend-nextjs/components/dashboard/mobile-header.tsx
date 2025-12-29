/**
 * ============================================================
 * ENCABEZADO MÓVIL (mobile-header.tsx)
 * ============================================================
 * Header para vista móvil con botón de menú hamburguesa.
 * Controla apertura/cierre del sidebar en dispositivos móviles.
 */

"use client"

import { Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTheme } from "./theme-provider"

interface MobileHeaderProps {
  isSidebarOpen: boolean
  onToggleSidebar: () => void
}

export function MobileHeader({ isSidebarOpen, onToggleSidebar }: MobileHeaderProps) {
  const { theme } = useTheme()

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 h-16 backdrop-blur-xl border-b z-40 lg:hidden flex items-center justify-between px-4",
        theme === "dark"
          ? "bg-gradient-to-r from-[#1a1333]/95 to-[#0f0a1e]/95 border-white/5"
          : "bg-gradient-to-r from-[#FAF7F2]/95 to-[#F5F0E8]/95 border-purple-200/30",
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            theme === "dark"
              ? "bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600"
              : "bg-gradient-to-br from-purple-400 to-pink-400",
          )}
        >
          <span className="text-white font-bold text-lg">+</span>
        </div>
        <div>
          <h1 className="font-bold text-sm">
            <span className={theme === "dark" ? "text-cyan-400" : "text-purple-500"}>DANN</span>
            <span className={theme === "dark" ? "text-purple-400" : "text-pink-400"}>+</span>
            <span className={theme === "dark" ? "text-white" : "text-gray-700"}>SALUD</span>
          </h1>
        </div>
      </div>

      {/* Menu Toggle Button */}
      <button
        onClick={onToggleSidebar}
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
          isSidebarOpen
            ? theme === "dark"
              ? "bg-purple-500/20 text-purple-400"
              : "bg-purple-200/50 text-purple-500"
            : theme === "dark"
              ? "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
              : "bg-purple-50 text-gray-600 hover:text-purple-600 hover:bg-purple-100",
        )}
      >
        {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>
    </header>
  )
}
