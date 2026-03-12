/**
 * ============================================================
 * TARJETA DE ESTADÍSTICAS (stats-card.tsx)
 * ============================================================
 * Componente de tarjeta para mostrar métricas.
 * Incluye animación de contador y estilos por color.
 */

"use client"

import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { useTheme } from "./theme-provider"

interface StatsCardProps {
  title: string
  value: number
  icon: LucideIcon
  color: "primary" | "secondary" | "accent"
  delay?: number
}

import styles from "./stats-card.module.css"

export function StatsCard({ title, value, icon: Icon, color, delay = 0 }: StatsCardProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const { theme } = useTheme()

  useEffect(() => {
    const duration = 1500
    const startTime = Date.now()
    const startDelay = delay * 100

    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime - startDelay
        const progress = Math.min(elapsed / duration, 1)

        const easeOutQuart = 1 - Math.pow(1 - progress, 4)
        setDisplayValue(Math.floor(easeOutQuart * value))

        if (progress >= 1) {
          clearInterval(interval)
          setDisplayValue(value)
        }
      }, 16)

      return () => clearInterval(interval)
    }, startDelay)

    return () => clearTimeout(timer)
  }, [value, delay])

  // Determine classes based on theme and color
  const isDark = theme === "dark"

  return (
    <div
      className={cn(
        "relative rounded-2xl bg-gradient-to-br border p-4 lg:p-6 backdrop-blur-sm overflow-hidden",
        "opacity-0 animate-fade-in-up group hover:scale-[1.02] transition-all duration-300",
        "hover:shadow-lg",
        // Gradient backgrounds
        isDark && color === "primary" && "from-purple-500/20 to-purple-600/10",
        isDark && color === "secondary" && "from-blue-500/20 to-blue-600/10",
        isDark && color === "accent" && "from-pink-500/20 to-pink-600/10",
        // CSS Module classes for light mode
        !isDark && color === "primary" && styles.cardPrimaryLight,
        !isDark && color === "secondary" && styles.cardSecondaryLight,
        !isDark && color === "accent" && styles.cardAccentLight,
        // Shadows
        isDark && color === "primary" && "shadow-purple-500/20",
        isDark && color === "secondary" && "shadow-blue-500/20",
        isDark && color === "accent" && "shadow-pink-500/20",
        // Borders
        isDark ? "border-white/10 hover:border-white/20" : "border-gray-200/50 hover:border-gray-300/50",
      )}
    >
      {/* Background glow effect */}
      <div
        className={cn(
          "absolute -top-10 -right-10 w-24 lg:w-32 h-24 lg:h-32 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-opacity",
          "bg-gradient-to-br",
          isDark && color === "primary" && "from-purple-500 to-purple-600",
          isDark && color === "secondary" && "from-blue-500 to-blue-600",
          isDark && color === "accent" && "from-pink-500 to-pink-600",
          // CSS Module classes for light mode glow
          !isDark && color === "primary" && styles.glowPrimaryLight,
          !isDark && color === "secondary" && styles.glowSecondaryLight,
          !isDark && color === "accent" && styles.glowAccentLight,
        )}
      />

      <div className="relative flex items-start justify-between">
        <div>
          <p className={cn("text-xs lg:text-sm mb-1 lg:mb-2", isDark ? "text-gray-400" : "text-gray-600")}>
            {title}
          </p>
          <p className={cn(
            "text-3xl lg:text-4xl font-bold",
            isDark && color === "primary" && "text-purple-400",
            isDark && color === "secondary" && "text-blue-400",
            isDark && color === "accent" && "text-pink-400",
            // CSS Module classes for light mode text
            !isDark && color === "primary" && styles.textPrimaryLight,
            !isDark && color === "secondary" && styles.textSecondaryLight,
            !isDark && color === "accent" && styles.textAccentLight,
          )}>
            {displayValue.toLocaleString()}
          </p>
        </div>
        <div
          className={cn(
            "w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br flex items-center justify-center",
            "group-hover:scale-110 transition-transform duration-300",
            isDark && color === "primary" && "from-purple-500 to-purple-600",
            isDark && color === "secondary" && "from-blue-500 to-blue-600",
            isDark && color === "accent" && "from-pink-500 to-pink-600",
            // CSS Module classes for light mode icon bg
            !isDark && color === "primary" && styles.iconPrimaryLight,
            !isDark && color === "secondary" && styles.iconSecondaryLight,
            !isDark && color === "accent" && styles.iconAccentLight,
          )}
        >
          <Icon className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
        </div>
      </div>

      {/* Subtle progress bar */}
      <div
        className={cn(
          "mt-3 lg:mt-4 h-1 rounded-full overflow-hidden",
          isDark ? "bg-white/5" : "bg-gray-100",
        )}
      >
        <div
          className={cn(
            "h-full rounded-full bg-gradient-to-r transition-all duration-1000",
            isDark && color === "primary" && "from-purple-500 to-purple-600",
            isDark && color === "secondary" && "from-blue-500 to-blue-600",
            isDark && color === "accent" && "from-pink-500 to-pink-600",
            // CSS Module classes for light mode progress bar
            !isDark && color === "primary" && styles.progressPrimaryLight,
            !isDark && color === "secondary" && styles.progressSecondaryLight,
            !isDark && color === "accent" && styles.progressAccentLight,
          )}
          style={{ width: `${Math.min((displayValue / value) * 100, 100)}%` }}
        />
      </div>
    </div>
  )
}
