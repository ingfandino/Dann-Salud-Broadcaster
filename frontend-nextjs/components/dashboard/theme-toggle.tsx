"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/components/dashboard/theme-provider"
import { cn } from "@/lib/utils"

export function ThemeToggle() {
  const { theme, toggleTheme, canUseDarkMode } = useTheme()

  // No mostrar el botón si el usuario no tiene permiso para modo oscuro
  if (!canUseDarkMode) {
    return null
  }

  return (
    <div className="flex items-center justify-between px-4 w-full">
      <span className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
        {theme === "dark" ? "Modo oscuro" : "Modo claro"}
      </span>
      <button
        onClick={toggleTheme}
        className={cn(
          "relative w-14 h-7 rounded-full transition-all duration-300 flex items-center",
          theme === "dark"
            ? "bg-gradient-to-r from-purple-600/50 to-blue-600/50 border border-white/10"
            : "bg-gradient-to-r from-[#0078A0]/20 to-[#00C794]/20 border border-[#0078A0]/20",
        )}
        aria-label="Toggle theme"
      >
        <div
          className={cn(
            "absolute w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 shadow-md",
            theme === "dark"
              ? "left-1.5 bg-gradient-to-br from-purple-500 to-blue-500"
              : "left-7 bg-gradient-to-br from-[#0078A0] to-[#00C794]",
          )}
        >
          {theme === "dark" ? <Moon className="w-3 h-3 text-white" /> : <Sun className="w-3 h-3 text-white" />}
        </div>
      </button>
    </div>
  )
}
