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

const getDarkColorStyles = (color: string) =>
  ({
    primary: {
      gradient: "from-purple-500/20 to-purple-600/10",
      iconBg: "from-purple-500 to-purple-600",
      text: "text-purple-400",
      glow: "shadow-purple-500/20",
    },
    secondary: {
      gradient: "from-blue-500/20 to-blue-600/10",
      iconBg: "from-blue-500 to-blue-600",
      text: "text-blue-400",
      glow: "shadow-blue-500/20",
    },
    accent: {
      gradient: "from-pink-500/20 to-pink-600/10",
      iconBg: "from-pink-500 to-pink-600",
      text: "text-pink-400",
      glow: "shadow-pink-500/20",
    },
  })[color]

const getLightColorStyles = (color: string) =>
  ({
    primary: {
      gradient: "from-purple-100/80 to-purple-50/50",
      iconBg: "from-purple-400 to-purple-500",
      text: "text-purple-500",
      glow: "shadow-purple-200/30",
    },
    secondary: {
      gradient: "from-blue-100/80 to-blue-50/50",
      iconBg: "from-blue-400 to-blue-500",
      text: "text-blue-500",
      glow: "shadow-blue-200/30",
    },
    accent: {
      gradient: "from-pink-100/80 to-pink-50/50",
      iconBg: "from-pink-400 to-pink-500",
      text: "text-pink-500",
      glow: "shadow-pink-200/30",
    },
  })[color]

export function StatsCard({ title, value, icon: Icon, color, delay = 0 }: StatsCardProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const { theme } = useTheme()
  const styles = theme === "dark" ? getDarkColorStyles(color) : getLightColorStyles(color)

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

  return (
    <div
      className={cn(
        "relative rounded-2xl bg-gradient-to-br border p-4 lg:p-6 backdrop-blur-sm overflow-hidden",
        "opacity-0 animate-fade-in-up group hover:scale-[1.02] transition-all duration-300",
        "hover:shadow-lg",
        styles?.gradient,
        styles?.glow,
        theme === "dark" ? "border-white/10 hover:border-white/20" : "border-purple-200/30 hover:border-purple-300/50",
      )}
    >
      {/* Background glow effect */}
      <div
        className={cn(
          "absolute -top-10 -right-10 w-24 lg:w-32 h-24 lg:h-32 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-opacity",
          `bg-gradient-to-br ${styles?.iconBg}`,
        )}
      />

      <div className="relative flex items-start justify-between">
        <div>
          <p className={cn("text-xs lg:text-sm mb-1 lg:mb-2", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
            {title}
          </p>
          <p className={cn("text-3xl lg:text-4xl font-bold", styles?.text)}>{displayValue.toLocaleString()}</p>
        </div>
        <div
          className={cn(
            "w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br flex items-center justify-center",
            styles?.iconBg,
            "group-hover:scale-110 transition-transform duration-300",
          )}
        >
          <Icon className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
        </div>
      </div>

      {/* Subtle progress bar */}
      <div
        className={cn(
          "mt-3 lg:mt-4 h-1 rounded-full overflow-hidden",
          theme === "dark" ? "bg-white/5" : "bg-purple-100",
        )}
      >
        <div
          className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-1000", styles?.iconBg)}
          style={{ width: `${Math.min((displayValue / value) * 100, 100)}%` }}
        />
      </div>
    </div>
  )
}
