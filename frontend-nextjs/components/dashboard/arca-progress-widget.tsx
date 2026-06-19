"use client"

import { useState, useEffect, useRef } from "react"
import { CheckCircle2, AlertTriangle, XCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"

interface TaskProgress {
  total: number
  processed: number
  success: number
  captcha: number
  error: number
  phase: "arca" | "dateas" | "padron" | null
}

interface ActiveTask {
  _id: string
  status: string
  mode: string
  startedAt: string | null
  completedAt?: string | null
  progress?: TaskProgress
  resultSummary?: {
    success: number
    captcha: number
    no_data: number
    error: number
    total: number
  }
  finished?: boolean
}

interface Props {
  theme: string
}

export function ArcaProgressWidget({ theme }: Props) {
  const [active, setActive] = useState<ActiveTask | null>(null)
  const [queuedCount, setQueuedCount] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isDark = theme === "dark"

  const fetchStatus = async () => {
    try {
      const { data } = await api.affiliateContributions.activeTask()
      setActive(data.active || null)
      setQueuedCount(data.queuedCount || 0)
    } catch {
      // non-critical — fail silently
    }
  }

  useEffect(() => {
    fetchStatus()
    intervalRef.current = setInterval(fetchStatus, 4000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!active) return null

  const isFinished = active.finished || active.status === "completed" || active.status === "error" || active.status === "captcha"
  const prog: TaskProgress = active.progress ?? { total: 0, processed: 0, success: 0, captcha: 0, error: 0, phase: null }

  // For finished tasks, pull final numbers from resultSummary if available
  const summary = isFinished && active.resultSummary
    ? { ...prog, success: active.resultSummary.success, captcha: active.resultSummary.captcha,
        error: active.resultSummary.error, processed: active.resultSummary.total,
        total: active.resultSummary.total }
    : prog

  const isPadron = prog.phase === "padron"
  const isDateas = prog.phase === "dateas"
  const pct = summary.total > 0 ? Math.min(100, Math.round((summary.processed / summary.total) * 100)) : 0

  return (
    <div className={cn(
      "rounded-lg border px-3 py-2 text-xs select-none",
      isDark
        ? "bg-gray-800/50 border-white/10 text-gray-300"
        : "bg-gray-50/80 border-gray-200 text-gray-600"
    )} style={{ minWidth: 220, maxWidth: 300 }}>

      {/* ── Header row: phase label + counts ── */}
      <div className="flex items-center justify-between gap-2">

        {/* Phase indicator */}
        {!isFinished ? (
          <span className={cn(
            "flex items-center gap-1 font-medium",
            isPadron
              ? (isDark ? "text-emerald-400" : "text-emerald-600")
              : isDateas
              ? (isDark ? "text-amber-400" : "text-amber-600")
              : (isDark ? "text-indigo-400" : "text-indigo-500")
          )}>
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className={cn(
                "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                isPadron ? "bg-emerald-400" : isDateas ? "bg-amber-400" : "bg-indigo-400"
              )} />
              <span className={cn(
                "relative inline-flex rounded-full h-1.5 w-1.5",
                isPadron ? "bg-emerald-500" : isDateas ? "bg-amber-500" : "bg-indigo-500"
              )} />
            </span>
            {isPadron ? "Padrón" : isDateas ? "DATEAS" : "ARCA"}
          </span>
        ) : (
          <span className={cn(
            "flex items-center gap-1 font-medium",
            active.status === "error"
              ? (isDark ? "text-red-400" : "text-red-500")
              : (isDark ? "text-green-400" : "text-green-600")
          )}>
            {active.status === "error"
              ? <XCircle className="w-3 h-3" />
              : <CheckCircle2 className="w-3 h-3" />}
            {active.status === "error" ? "Error" : "Completo"}
          </span>
        )}

        {/* Counts */}
        <div className="flex items-center gap-2">
          {summary.success > 0 && (
            <span className={cn("flex items-center gap-0.5", isDark ? "text-green-400" : "text-green-600")}>
              <CheckCircle2 className="w-3 h-3" />
              {summary.success}
            </span>
          )}
          {summary.captcha > 0 && (
            <span className={cn("flex items-center gap-0.5", isDark ? "text-yellow-400" : "text-yellow-600")}>
              <AlertTriangle className="w-3 h-3" />
              {summary.captcha}
            </span>
          )}
          {summary.error > 0 && (
            <span className={cn("flex items-center gap-0.5", isDark ? "text-red-400" : "text-red-500")}>
              <XCircle className="w-3 h-3" />
              {summary.error}
            </span>
          )}
        </div>
      </div>

      {/* ── Progress bar row ── */}
      {!isPadron && !isDateas && summary.total > 0 && (
        <div className="flex items-center gap-2 mt-1.5">
          <div className={cn("flex-1 h-1 rounded-full overflow-hidden", isDark ? "bg-white/10" : "bg-gray-200")}>
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                isFinished
                  ? (active.status === "error" ? "bg-red-500" : "bg-green-500")
                  : "bg-indigo-500"
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className={cn("tabular-nums opacity-60 whitespace-nowrap", "text-[10px]")}>
            {summary.processed}/{summary.total}
          </span>
        </div>
      )}

      {(isPadron || isDateas) && (
        <div className="flex items-center gap-2 mt-1.5">
          <div className={cn("flex-1 h-1 rounded-full overflow-hidden", isDark ? "bg-white/10" : "bg-gray-200")}>
            <div className={cn("h-full rounded-full animate-pulse", isDateas ? "bg-amber-500" : "bg-emerald-500")} style={{ width: "100%" }} />
          </div>
          <span className={cn("opacity-60 whitespace-nowrap", "text-[10px]")}>{isDateas ? "DATEAS..." : "Padrón..."}</span>
        </div>
      )}

      {/* ── Queue hint ── */}
      {queuedCount > 0 && (
        <div className={cn("flex items-center gap-1 mt-1 opacity-50", "text-[10px]")}>
          <Clock className="w-2.5 h-2.5" />
          {queuedCount} en cola
        </div>
      )}
    </div>
  )
}
