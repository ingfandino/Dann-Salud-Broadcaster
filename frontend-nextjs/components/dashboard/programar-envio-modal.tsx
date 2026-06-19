"use client"

import { useState, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import {
  X, ChevronRight, ChevronLeft, Plus, Trash2, CheckCircle,
  Clock, Zap, Users, MapPin, Calendar, BarChart3, Send, AlertTriangle, RefreshCw
} from "lucide-react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { toast } from "sonner"

// ── Types ────────────────────────────────────────────────────────────────────

interface Supervisor {
  _id: string
  nombre: string
  email: string
  numeroEquipo?: string
}

interface OsEntry {
  nombre: string
  cantidad: number
}

interface StockInfo {
  [osName: string]: { freshCount: number; reusableCount: number }
}

interface DeliveryBlock {
  id: string
  supervisorId: string
  supervisorName: string
  quantity: number
  zones: string[]
  freshPct: number
  reusablePct: number
  obrasSociales: OsEntry[]
  executionMode: "immediate" | "scheduled"
  scheduledHour: string
  _stock: StockInfo
  _splitAdjusted?: boolean
  _splitAdjustReason?: string
}

function emptyBlock(): DeliveryBlock {
  return {
    id: Date.now().toString(),
    supervisorId: "",
    supervisorName: "",
    quantity: 50,
    zones: [],
    freshPct: 70,
    reusablePct: 30,
    obrasSociales: [],
    executionMode: "immediate",
    scheduledHour: "09:00",
    _stock: {}
  }
}

// ── Constants ────────────────────────────────────────────────────────────────

const ZONES = ["CABA", "Norte", "Sur", "Oeste", "Provincia"]
const STEP_LABELS = ["Supervisor", "Cantidad", "Zonas", "Obras Sociales", "Ejecución"]

// ── Props ────────────────────────────────────────────────────────────────────

interface ProgramarEnvioModalProps {
  onClose: () => void
}

// ── Component ────────────────────────────────────────────────────────────────

export function ProgramarEnvioModal({ onClose }: ProgramarEnvioModalProps) {
  const { theme } = useTheme()
  const dark = theme === "dark"

  // Blocks & navigation
  const [blocks, setBlocks] = useState<DeliveryBlock[]>([emptyBlock()])
  const [activeBlock, setActiveBlock] = useState(0)
  const [step, setStep] = useState(1) // 1-5
  const [showSummary, setShowSummary] = useState(false)

  // Data
  const [supervisors, setSupervisors] = useState<Supervisor[]>([])
  const [allObrasSociales, setAllObrasSociales] = useState<string[]>([])
  const [loadingStock, setLoadingStock] = useState(false)
  const [loadingZoneStock, setLoadingZoneStock] = useState(false)
  const [zoneStockSummary, setZoneStockSummary] = useState<{ freshTotal: number; reusableTotal: number } | null>(null)
  const [executing, setExecuting] = useState(false)

  // Load supervisors on mount
  useEffect(() => {
    api.affiliates.getDeliverySupervisors()
      .then(r => setSupervisors(r.data.supervisors || []))
      .catch(() => toast.error("No se pudieron cargar los supervisores"))
    api.affiliates.distinctObrasSociales()
      .then(r => setAllObrasSociales(r.data.obrasSociales || []))
      .catch(() => {})
  }, [])

  // Load stock when entering step 4 (Obras Sociales)
  useEffect(() => {
    if (step !== 4) return
    fetchStock(activeBlock)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, activeBlock])

  // Fetch zone stock summary when on step 3 with zones selected
  const activeZonesKey = blocks[activeBlock]?.zones.join(",") ?? ""
  useEffect(() => {
    if (step !== 3 || !activeZonesKey) { setZoneStockSummary(null); return }
    setLoadingZoneStock(true)
    api.affiliates.getDeliveryStock({ zones: blocks[activeBlock].zones })
      .then((res: any) => {
        const stock: any[] = res.data.stock || []
        const freshTotal = stock.reduce((s: number, o: any) => s + o.freshCount, 0)
        const reusableTotal = stock.reduce((s: number, o: any) => s + o.reusableCount, 0)
        setZoneStockSummary({ freshTotal, reusableTotal })
      })
      .catch(() => setZoneStockSummary(null))
      .finally(() => setLoadingZoneStock(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, activeBlock, activeZonesKey])

  const fetchStock = useCallback(async (blockIdx: number) => {
    const b = blocks[blockIdx]
    setLoadingStock(true)
    try {
      const res = await api.affiliates.getDeliveryStock({ zones: b.zones })
      const stockMap: StockInfo = {}
      for (const row of (res.data.stock || [])) {
        stockMap[row.nombre] = { freshCount: row.freshCount, reusableCount: row.reusableCount }
      }
      if (res.data.allObrasSociales?.length) {
        setAllObrasSociales(res.data.allObrasSociales)
      }
      // Auto-adjust fresh/reusable split if stock is insufficient
      const totalFreshAvail = Object.values(stockMap).reduce((s, o) => s + o.freshCount, 0)
      const totalAvail = Object.values(stockMap).reduce((s, o) => s + o.freshCount + o.reusableCount, 0)
      const qty = blocks[blockIdx].quantity
      const targetFresh = Math.round(qty * blocks[blockIdx].freshPct / 100)
      let newFreshPct = blocks[blockIdx].freshPct
      let splitAdjusted = false
      let splitAdjustReason = ""

      if (totalFreshAvail < targetFresh && totalAvail >= qty) {
        const adjustedPct = Math.floor((totalFreshAvail / qty) * 100)
        newFreshPct = adjustedPct
        splitAdjusted = true
        splitAdjustReason = `Stock fresco insuficiente (disponibles: ${totalFreshAvail}, solicitados: ${targetFresh}). Porcentaje ajustado a ${adjustedPct}% frescos / ${100 - adjustedPct}% reutilizables.`
      }

      setBlocks(prev => {
        const next = [...prev]
        next[blockIdx] = {
          ...next[blockIdx],
          _stock: stockMap,
          freshPct: newFreshPct,
          reusablePct: 100 - newFreshPct,
          _splitAdjusted: splitAdjusted,
          _splitAdjustReason: splitAdjustReason
        }
        next[blockIdx].obrasSociales = next[blockIdx].obrasSociales.map(os => {
          const avail = (stockMap[os.nombre]?.freshCount ?? 0) + (stockMap[os.nombre]?.reusableCount ?? 0)
          return avail > 0 && os.cantidad > avail ? { ...os, cantidad: avail } : os
        })
        return next
      })
    } catch {
      toast.error("Error al calcular stock disponible")
    } finally {
      setLoadingStock(false)
    }
  }, [blocks])

  // ── Block helpers ──────────────────────────────────────────────────────────

  const updateBlock = (idx: number, update: Partial<DeliveryBlock>) => {
    setBlocks(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], ...update }
      return next
    })
  }

  const addBlock = () => {
    setBlocks(prev => [...prev, emptyBlock()])
    setActiveBlock(blocks.length)
    setStep(1)
    setShowSummary(false)
  }

  const removeBlock = (idx: number) => {
    if (blocks.length === 1) return
    setBlocks(prev => prev.filter((_, i) => i !== idx))
    setActiveBlock(Math.max(0, idx - 1))
  }

  // ── Validation ─────────────────────────────────────────────────────────────

  const canProceed = (): boolean => {
    const b = blocks[activeBlock]
    switch (step) {
      case 1: return !!b.supervisorId
      case 2: return b.quantity > 0
      case 3: return b.zones.length > 0
      case 4: {
        const total = b.obrasSociales.reduce((s, o) => s + o.cantidad, 0)
        return b.obrasSociales.length > 0 && total > 0 && total <= b.quantity
      }
      case 5: {
        if (b.executionMode === "scheduled") return !!b.scheduledHour
        return true
      }
      default: return false
    }
  }

  const handleNext = () => {
    if (!canProceed()) return
    if (step < 5) {
      setStep(s => s + 1)
    } else {
      setShowSummary(true)
    }
  }

  const handleBack = () => {
    if (step > 1) setStep(s => s - 1)
  }

  // ── Execute ────────────────────────────────────────────────────────────────

  const handleExecute = async () => {
    const immediateBlocks = blocks.filter(b => b.executionMode === "immediate")
    const scheduledBlocks = blocks.filter(b => b.executionMode === "scheduled")

    setExecuting(true)
    try {
      // Execute immediate blocks
      if (immediateBlocks.length > 0) {
        const payload = {
          blocks: immediateBlocks.map(b => ({
            supervisorId: b.supervisorId,
            zones: b.zones,
            freshPct: b.freshPct,
            reusablePct: b.reusablePct,
            obrasSociales: b.obrasSociales
          }))
        }
        const res = await api.affiliates.executeDelivery(payload)
        const data = res.data
        const total = data.totalAssigned ?? 0
        toast.success(`✅ ${total} leads asignados correctamente`)
      }

      // Save scheduled configs
      for (const b of scheduledBlocks) {
        await api.affiliates.saveScheduledConfig({
          supervisorId: b.supervisorId,
          zones: b.zones,
          freshPct: b.freshPct,
          reusablePct: b.reusablePct,
          obrasSociales: b.obrasSociales,
          totalQuantity: b.quantity,
          scheduledHour: b.scheduledHour
        })
        toast.success(`📅 Envío programado para ${b.supervisorName} a las ${b.scheduledHour}`)
      }

      onClose()
    } catch (err: any) {
      const resData = err.response?.data
      if (Array.isArray(resData?.errors) && resData.errors.length > 0) {
        resData.errors.forEach((e: any) => {
          toast.error(`${e.supervisorName ? e.supervisorName + ": " : ""}${e.error}`, { duration: 8000 })
        })
      } else {
        toast.error(resData?.message || resData?.error || "Error al ejecutar el envío")
      }
    } finally {
      setExecuting(false)
    }
  }

  // ── OS helpers ─────────────────────────────────────────────────────────────

  const toggleOs = (blockIdx: number, osName: string) => {
    const b = blocks[blockIdx]
    const exists = b.obrasSociales.findIndex(o => o.nombre === osName)
    if (exists >= 0) {
      updateBlock(blockIdx, { obrasSociales: b.obrasSociales.filter(o => o.nombre !== osName) })
    } else {
      const avail = (b._stock[osName]?.freshCount ?? 0) + (b._stock[osName]?.reusableCount ?? 0)
      if (avail === 0) return
      const remaining = b.quantity - b.obrasSociales.reduce((s, o) => s + o.cantidad, 0)
      const suggested = Math.min(avail, Math.max(1, remaining))
      updateBlock(blockIdx, { obrasSociales: [...b.obrasSociales, { nombre: osName, cantidad: suggested }] })
    }
  }

  const updateOsCantidad = (blockIdx: number, osName: string, val: number) => {
    const b = blocks[blockIdx]
    const avail = (b._stock[osName]?.freshCount ?? 0) + (b._stock[osName]?.reusableCount ?? 0)
    const capped = avail > 0 ? Math.min(Math.max(1, val), avail) : Math.max(1, val)
    updateBlock(blockIdx, {
      obrasSociales: b.obrasSociales.map(o => o.nombre === osName ? { ...o, cantidad: capped } : o)
    })
  }

  const commitOsCantidad = (blockIdx: number, osName: string, raw: string) => {
    const parsed = parseInt(raw)
    updateOsCantidad(blockIdx, osName, isNaN(parsed) || parsed <= 0 ? 1 : parsed)
  }

  // ── Styles ─────────────────────────────────────────────────────────────────

  const card = cn(
    "rounded-2xl border p-5 backdrop-blur-sm",
    dark ? "bg-gray-900/90 border-white/10" : "bg-white border-gray-200 shadow-lg"
  )
  const inputCls = cn(
    "w-full px-3 py-2 rounded-lg border text-sm",
    dark ? "bg-white/5 border-white/10 text-white placeholder:text-gray-500" : "bg-white border-gray-200 text-gray-700"
  )
  const labelCls = cn("text-xs font-medium mb-1 block", dark ? "text-gray-400" : "text-gray-500")
  const pill = (active: boolean) => cn(
    "px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer select-none",
    active
      ? dark ? "bg-purple-600/40 border-purple-500 text-purple-200" : "bg-purple-100 border-purple-400 text-purple-700"
      : dark ? "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10" : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
  )

  // ── Step content ───────────────────────────────────────────────────────────

  const b = blocks[activeBlock]

  const renderStep = () => {
    switch (step) {
      case 1: return (
        <div className="space-y-3">
          <p className={cn("text-sm", dark ? "text-gray-400" : "text-gray-500")}>
            Seleccioná el supervisor que recibirá los leads.
          </p>
          <div>
            <label className={labelCls}>Supervisor</label>
            <select
              value={b.supervisorId}
              onChange={e => {
                const sup = supervisors.find(s => s._id === e.target.value)
                updateBlock(activeBlock, { supervisorId: e.target.value, supervisorName: sup?.nombre || "" })
              }}
              className={inputCls}
            >
              <option value="">Seleccionar supervisor...</option>
              {supervisors.map(s => (
                <option key={s._id} value={s._id}>{s.nombre}{s.numeroEquipo ? ` (Equipo ${s.numeroEquipo})` : ""}</option>
              ))}
            </select>
          </div>
          {b.supervisorId && (
            <div className={cn("rounded-lg px-4 py-2 text-sm flex items-center gap-2",
              dark ? "bg-green-900/20 text-green-400 border border-green-800/30" : "bg-green-50 text-green-700 border border-green-200")}>
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span><strong>{b.supervisorName}</strong> seleccionado</span>
            </div>
          )}
        </div>
      )

      case 2: return (
        <div className="space-y-3">
          <p className={cn("text-sm", dark ? "text-gray-400" : "text-gray-500")}>
            Total de leads a asignar a <strong>{b.supervisorName}</strong>.
          </p>
          <div>
            <label className={labelCls}>Cantidad de leads</label>
            <input
              type="number"
              min={1}
              max={9999}
              value={b.quantity}
              onChange={e => updateBlock(activeBlock, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
              className={cn(inputCls, "text-lg font-semibold")}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[25, 50, 100, 150, 200].map(v => (
              <button key={v} type="button" onClick={() => updateBlock(activeBlock, { quantity: v })}
                className={pill(b.quantity === v)}>
                {v}
              </button>
            ))}
          </div>
          {/* Fresh/Reusable split slider */}
          <div className={cn("rounded-lg border p-3 space-y-2", dark ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200")}>
            <div className="flex items-center justify-between">
              <label className={cn("text-xs font-semibold", dark ? "text-gray-300" : "text-gray-600")}>
                Distribución Frescos / Reutilizables
              </label>
              <span className={cn("text-xs font-mono font-bold", dark ? "text-purple-300" : "text-purple-600")}>
                {b.freshPct}% / {b.reusablePct}%
              </span>
            </div>
            <input
              type="range" min={0} max={100} step={5}
              value={b.freshPct}
              onChange={e => {
                const fp = parseInt(e.target.value)
                updateBlock(activeBlock, { freshPct: fp, reusablePct: 100 - fp, _splitAdjusted: false })
              }}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <div className="flex justify-between">
              <span className={cn("text-xs", dark ? "text-green-400" : "text-green-600")}>
                ✨ {Math.round(b.quantity * b.freshPct / 100)} frescos
              </span>
              <span className={cn("text-xs", dark ? "text-amber-400" : "text-amber-600")}>
                ♻️ {b.quantity - Math.round(b.quantity * b.freshPct / 100)} reutilizables
              </span>
            </div>
          </div>
        </div>
      )

      case 3: return (
        <div className="space-y-3">
          <p className={cn("text-sm", dark ? "text-gray-400" : "text-gray-500")}>
            Zonas de procedencia de los leads. Podés seleccionar múltiples.
          </p>
          <div className="flex flex-wrap gap-2">
            {ZONES.map(z => (
              <button key={z} type="button"
                onClick={() => {
                  const has = b.zones.includes(z)
                  updateBlock(activeBlock, { zones: has ? b.zones.filter(x => x !== z) : [...b.zones, z] })
                }}
                className={pill(b.zones.includes(z))}>
                {z}
              </button>
            ))}
          </div>
          {b.zones.length > 0 && (
            <p className={cn("text-xs", dark ? "text-purple-400" : "text-purple-600")}>
              Zonas: {b.zones.join(", ")}
            </p>
          )}
          {/* Zone stock guidance cards */}
          {b.zones.length > 0 && (
            <div className={cn("rounded-lg border p-3 space-y-2", dark ? "bg-white/5 border-white/10" : "bg-blue-50 border-blue-200")}>
              <div className={cn("text-xs font-semibold", dark ? "text-gray-400" : "text-blue-700")}>
                Stock estimado · {b.zones.join(" + ")}
              </div>
              {loadingZoneStock ? (
                <div className={cn("text-xs flex items-center gap-1", dark ? "text-gray-500" : "text-gray-400")}>
                  <RefreshCw className="w-3 h-3 animate-spin" /> Calculando...
                </div>
              ) : zoneStockSummary ? (
                <div className="flex gap-4">
                  <span className={cn("text-xs font-medium", dark ? "text-green-400" : "text-green-700")}>✨ {zoneStockSummary.freshTotal.toLocaleString("es-AR")} frescos</span>
                  <span className={cn("text-xs font-medium", dark ? "text-amber-400" : "text-amber-700")}>♻️ {zoneStockSummary.reusableTotal.toLocaleString("es-AR")} reutilizables</span>
                  <span className={cn("text-xs font-semibold", dark ? "text-white" : "text-gray-800")}>📦 {(zoneStockSummary.freshTotal + zoneStockSummary.reusableTotal).toLocaleString("es-AR")} total</span>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )

      case 4: {
        const totalAssigned = b.obrasSociales.reduce((s, o) => s + o.cantidad, 0)
        const overQuota = totalAssigned > b.quantity
        const allOS = allObrasSociales.filter(os => {
          const s = b._stock[os]
          return s && (s.freshCount + s.reusableCount) > 0
        })

        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className={cn("text-sm", dark ? "text-gray-400" : "text-gray-500")}>
                Seleccioná obras sociales y asigná cantidades.
              </p>
              <button type="button" onClick={() => fetchStock(activeBlock)} disabled={loadingStock}
                className={cn("flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition",
                  dark ? "border-white/10 text-gray-400 hover:bg-white/10" : "border-gray-200 text-gray-500 hover:bg-gray-100")}>
                <RefreshCw className={cn("w-3 h-3", loadingStock && "animate-spin")} />
                Actualizar
              </button>
            </div>

            {/* Split adjustment warning */}
            {b._splitAdjusted && b._splitAdjustReason && (
              <div className={cn("rounded-lg px-3 py-2 text-xs flex items-start gap-2",
                dark ? "bg-amber-900/20 text-amber-400 border border-amber-800/30" : "bg-amber-50 text-amber-700 border border-amber-200")}>
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{b._splitAdjustReason}</span>
              </div>
            )}

            {/* Quota bar */}
            <div className={cn("rounded-lg px-3 py-2 text-xs flex items-center justify-between",
              overQuota
                ? dark ? "bg-red-900/20 text-red-400 border border-red-800/30" : "bg-red-50 text-red-600 border border-red-200"
                : dark ? "bg-blue-900/20 text-blue-400 border border-blue-800/30" : "bg-blue-50 text-blue-600 border border-blue-200"
            )}>
              <span>Asignados: <strong>{totalAssigned}</strong> / <strong>{b.quantity}</strong></span>
              <span className={cn("text-xs", dark ? "text-purple-400" : "text-purple-500")}>✨ {b.freshPct}% F · ♻️ {b.reusablePct}% R</span>
              {overQuota && <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Excede cuota</span>}
            </div>

            {loadingStock && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <RefreshCw className="w-4 h-4 animate-spin" /> Calculando stock...
              </div>
            )}

            {!loadingStock && (
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {allOS.map(os => {
                  const stock = b._stock[os] || { freshCount: 0, reusableCount: 0 }
                  const avail = stock.freshCount + stock.reusableCount
                  const sel = b.obrasSociales.find(o => o.nombre === os)
                  return (
                    <div key={os}
                      className={cn(
                        "rounded-lg border px-3 py-2 flex items-center gap-3 transition-all",
                        sel
                          ? dark ? "bg-purple-600/20 border-purple-500/50" : "bg-purple-50 border-purple-300"
                          : dark ? "bg-white/5 border-white/10 hover:bg-white/8" : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                      )}>
                      <input type="checkbox" checked={!!sel}
                        onChange={() => toggleOs(activeBlock, os)}
                        className="w-4 h-4 accent-purple-500 shrink-0 cursor-pointer" />
                      <div className="flex-1 min-w-0">
                        <div className={cn("text-xs font-medium truncate", dark ? "text-white" : "text-gray-800")}>{os}</div>
                        <div className="flex gap-2 mt-0.5">
                          <span className={cn("text-xs", dark ? "text-green-400" : "text-green-600")}>✨ {stock.freshCount} frescos</span>
                          <span className={cn("text-xs", dark ? "text-amber-400" : "text-amber-600")}>♻️ {stock.reusableCount} reutilizables</span>
                        </div>
                      </div>
                      {sel && (
                        <input
                          type="number" min={1} max={avail}
                          value={sel.cantidad === 0 ? "" : sel.cantidad}
                          onChange={e => {
                            const raw = e.target.value
                            if (raw === "") {
                              updateBlock(activeBlock, { obrasSociales: b.obrasSociales.map(o => o.nombre === os ? { ...o, cantidad: 0 } : o) })
                            } else {
                              updateOsCantidad(activeBlock, os, parseInt(raw) || 0)
                            }
                          }}
                          onBlur={e => commitOsCantidad(activeBlock, os, e.target.value)}
                          onClick={e => e.stopPropagation()}
                          className={cn(
                            "w-20 px-2 py-1 rounded-md border text-xs text-center",
                            dark ? "bg-gray-800 border-white/10 text-white" : "bg-white border-gray-300 text-gray-700"
                          )} />
                      )}
                    </div>
                  )
                })}
                {allOS.length === 0 && !loadingStock && (
                  <div className={cn("text-center py-6 text-sm", dark ? "text-gray-500" : "text-gray-400")}>
                    Sin stock disponible para las zonas seleccionadas.
                  </div>
                )}
              </div>
            )}
          </div>
        )
      }

      case 5: return (
        <div className="space-y-3">
          <p className={cn("text-sm", dark ? "text-gray-400" : "text-gray-500")}>
            ¿Cuándo ejecutar el envío para <strong>{b.supervisorName}</strong>?
          </p>
          <div className="space-y-2">
            {([
              ["immediate", "Ejecutar ahora", Zap, "Los leads se asignan inmediatamente"],
              ["scheduled", "Programar hora diaria", Clock, "Se ejecuta todos los días a la hora indicada"]
            ] as [string, string, any, string][]).map(([val, lbl, Icon, hint]) => (
              <button key={val} type="button"
                onClick={() => updateBlock(activeBlock, { executionMode: val as any })}
                className={cn(
                  "w-full text-left rounded-lg border px-4 py-3 flex items-start gap-3 transition-all",
                  b.executionMode === val
                    ? dark ? "bg-purple-600/30 border-purple-500" : "bg-purple-50 border-purple-400"
                    : dark ? "bg-white/5 border-white/10 hover:bg-white/10" : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                )}>
                <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", b.executionMode === val ? "text-purple-500" : dark ? "text-gray-500" : "text-gray-400")} />
                <div>
                  <div className={cn("text-sm font-medium", dark ? "text-white" : "text-gray-800")}>{lbl}</div>
                  <div className={cn("text-xs mt-0.5", dark ? "text-gray-500" : "text-gray-400")}>{hint}</div>
                </div>
              </button>
            ))}
          </div>
          {b.executionMode === "scheduled" && (
            <div>
              <label className={labelCls}>Hora de ejecución</label>
              <input type="time" value={b.scheduledHour}
                onChange={e => updateBlock(activeBlock, { scheduledHour: e.target.value })}
                className={cn(inputCls, "w-40")} />
            </div>
          )}
        </div>
      )

      default: return null
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────

  // Compute stock insufficiency issues for all immediate blocks.
  // Uses the stock loaded in step 4 (_stock) as a pre-execution hint.
  const stockIssues: string[] = blocks
    .filter(blk => blk.executionMode === "immediate")
    .flatMap(blk =>
      blk.obrasSociales.flatMap(os => {
        const stock = blk._stock[os.nombre]
        if (!stock) return []
        const freshTarget = Math.round(os.cantidad * blk.freshPct / 100)
        const reusableTarget = os.cantidad - freshTarget
        const msgs: string[] = []
        if (stock.freshCount < freshTarget)
          msgs.push(`${blk.supervisorName}: ${os.nombre} — necesita ${freshTarget}F, hay ${stock.freshCount}`)
        if (stock.reusableCount < reusableTarget)
          msgs.push(`${blk.supervisorName}: ${os.nombre} — necesita ${reusableTarget}R, hay ${stock.reusableCount}`)
        return msgs
      })
    )

  const renderSummary = () => (
    <div className="space-y-4">
      <p className={cn("text-sm", dark ? "text-gray-400" : "text-gray-500")}>
        Revisá los bloques antes de confirmar. Podés editar cualquiera antes de ejecutar.
      </p>
      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {blocks.map((blk, idx) => {
          const total = blk.obrasSociales.reduce((s, o) => s + o.cantidad, 0)
          return (
            <div key={blk.id} className={cn("rounded-xl border p-4",
              dark ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200")}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className={cn("text-sm font-semibold", dark ? "text-white" : "text-gray-800")}>
                    {blk.supervisorName}
                  </div>
                  <div className={cn("text-xs mt-0.5", dark ? "text-gray-400" : "text-gray-500")}>
                    {total} leads · {blk.zones.join(", ")} · ✨ {blk.freshPct}% F · ♻️ {blk.reusablePct}% R
                  </div>
                </div>
                <div className="flex gap-1">
                  <button type="button"
                    onClick={() => { setActiveBlock(idx); setStep(1); setShowSummary(false) }}
                    className={cn("text-xs px-2 py-1 rounded border transition",
                      dark ? "border-white/10 text-gray-400 hover:bg-white/10" : "border-gray-200 text-gray-500 hover:bg-gray-100")}>
                    Editar
                  </button>
                  {blocks.length > 1 && (
                    <button type="button" onClick={() => removeBlock(idx)}
                      className="text-xs px-2 py-1 rounded border border-red-300/40 text-red-400 hover:bg-red-500/10 transition">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {blk.obrasSociales.map(os => (
                  <span key={os.nombre} className={cn("text-xs px-2 py-0.5 rounded-full",
                    dark ? "bg-indigo-600/20 text-indigo-300" : "bg-indigo-100 text-indigo-700")}>
                    {os.nombre}: {os.cantidad}
                  </span>
                ))}
              </div>
              <div className={cn("flex items-center gap-1.5 text-xs",
                blk.executionMode === "immediate"
                  ? dark ? "text-green-400" : "text-green-600"
                  : dark ? "text-amber-400" : "text-amber-600")}>
                {blk.executionMode === "immediate"
                  ? <><Zap className="w-3 h-3" /> Ejecución inmediata</>
                  : <><Clock className="w-3 h-3" /> Programado: {blk.scheduledHour} hs diario</>}
              </div>
            </div>
          )
        })}
      </div>
      <button type="button" onClick={addBlock}
        className={cn("flex w-full items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all",
          dark ? "border-white/10 text-gray-400 hover:bg-white/5 hover:text-gray-300" : "border-gray-200 text-gray-500 hover:bg-gray-50")}>
        <Plus className="w-4 h-4" /> Agregar otro bloque
      </button>
      {stockIssues.length > 0 && (
        <div className={cn(
          "rounded-lg border p-3 flex gap-2.5",
          dark ? "bg-red-900/20 border-red-500/30 text-red-300" : "bg-red-50 border-red-200 text-red-700"
        )}>
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-semibold mb-1">Stock insuficiente — ajustá la configuración</div>
            <ul className="text-xs space-y-0.5">
              {stockIssues.map((msg, i) => <li key={i}>{msg}</li>)}
            </ul>
          </div>
        </div>
      )}
    </div>
  )

  // ── Main render ────────────────────────────────────────────────────────────

  const overlay = (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}>
      <div className={cn(
        "relative w-full max-w-xl max-h-[90vh] rounded-2xl flex flex-col shadow-2xl",
        dark ? "bg-gray-950 border border-white/10" : "bg-white border border-gray-200"
      )}>
        {/* ── Header ── */}
        <div className={cn("flex items-center justify-between px-6 py-4 border-b shrink-0",
          dark ? "border-white/10" : "border-gray-100")}>
          <div className="flex items-center gap-2">
            <Send className={cn("w-5 h-5", dark ? "text-purple-400" : "text-purple-500")} />
            <h2 className={cn("text-base font-semibold", dark ? "text-white" : "text-gray-800")}>
              Programar Envío de Leads
            </h2>
          </div>
          <button type="button" onClick={onClose}
            className={cn("p-1.5 rounded-lg transition-colors",
              dark ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-500")}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Block tabs (if multiple) ── */}
        {blocks.length > 1 && !showSummary && (
          <div className={cn("flex gap-1 px-4 pt-3 shrink-0 overflow-x-auto", dark ? "border-b border-white/10 pb-2" : "border-b border-gray-100 pb-2")}>
            {blocks.map((blk, idx) => (
              <button key={blk.id} type="button"
                onClick={() => { setActiveBlock(idx); setStep(idx === activeBlock ? step : 1); setShowSummary(false) }}
                className={cn("shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium border transition-all",
                  idx === activeBlock
                    ? dark ? "bg-purple-600/40 border-purple-500 text-purple-200" : "bg-purple-100 border-purple-400 text-purple-700"
                    : dark ? "bg-white/5 border-white/10 text-gray-400" : "bg-gray-50 border-gray-200 text-gray-500")}>
                {blk.supervisorName || `Bloque ${idx + 1}`}
              </button>
            ))}
          </div>
        )}

        {/* ── Step indicator (not in summary) ── */}
        {!showSummary && (
          <div className="flex items-center gap-1 px-6 pt-4 shrink-0">
            {STEP_LABELS.map((lbl, i) => {
              const n = i + 1
              const done = n < step
              const active = n === step
              return (
                <div key={lbl} className="flex items-center">
                  <div className={cn(
                    "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 transition-all",
                    done ? "bg-purple-500 text-white"
                      : active ? dark ? "bg-purple-600 text-white ring-2 ring-purple-400/40" : "bg-purple-500 text-white ring-2 ring-purple-300"
                      : dark ? "bg-white/10 text-gray-500" : "bg-gray-100 text-gray-400"
                  )}>
                    {done ? <CheckCircle className="w-3.5 h-3.5" /> : n}
                  </div>
                  {i < STEP_LABELS.length - 1 && (
                    <div className={cn("h-0.5 w-5 mx-0.5", done ? "bg-purple-500" : dark ? "bg-white/10" : "bg-gray-200")} />
                  )}
                </div>
              )
            })}
            <span className={cn("ml-2 text-xs", dark ? "text-gray-400" : "text-gray-500")}>
              {STEP_LABELS[step - 1]}
            </span>
          </div>
        )}

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {showSummary ? renderSummary() : renderStep()}
        </div>

        {/* ── Footer ── */}
        <div className={cn("flex items-center justify-between px-6 py-4 border-t shrink-0",
          dark ? "border-white/10" : "border-gray-100")}>
          {showSummary ? (
            <>
              <button type="button" onClick={() => setShowSummary(false)}
                className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all",
                  dark ? "border-white/10 text-gray-400 hover:bg-white/10" : "border-gray-200 text-gray-500 hover:bg-gray-50")}>
                <ChevronLeft className="w-4 h-4" />
                Volver
              </button>
              <button type="button" onClick={handleExecute} disabled={executing || stockIssues.length > 0}
                className={cn(
                  "flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                  dark ? "bg-gradient-to-r from-purple-600 to-purple-500" : "bg-gradient-to-r from-purple-500 to-purple-600"
                )}>
                {executing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {executing ? "Ejecutando..." : stockIssues.length > 0 ? "Stock insuficiente" : "Confirmar y Ejecutar"}
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={step > 1 ? handleBack : onClose}
                className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all",
                  dark ? "border-white/10 text-gray-400 hover:bg-white/10" : "border-gray-200 text-gray-500 hover:bg-gray-50")}>
                <ChevronLeft className="w-4 h-4" />
                {step > 1 ? "Atrás" : "Cancelar"}
              </button>
              <button type="button" onClick={handleNext} disabled={!canProceed()}
                className={cn(
                  "flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-40",
                  dark ? "bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400"
                       : "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500"
                )}>
                {step === 5 ? "Ver resumen" : "Siguiente"}
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )

  if (typeof window === "undefined") return null
  return createPortal(overlay, document.body)
}
