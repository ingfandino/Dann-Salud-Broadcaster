/**
 * ============================================================
 * ESTADO DE LA BASE (base-afiliados-estadistica.tsx)
 * ============================================================
 * Dashboard Phase 3B. Resumen general y salud operativa.
 */

"use client"

import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { 
    Users, 
    CheckSquare, 
    Clock, 
    AlertTriangle, 
    Droplet, 
    RefreshCcw, 
    QrCode,
    RefreshCw,
    Info,
    Activity,
    UploadCloud,
    FileCheck,
    FileX
} from "lucide-react"

interface BaseStatus {
    totals: {
        total: number
        availableForSale: number
        unchecked: number
        expired: number
        fresh: number
        reusable: number
        qrDone: number
    }
    verificationHealth: {
        unchecked: number
        checked: number
        expired: number
        error: number
        captcha: number
        noData: number
    }
    byObraSocial: {
        obraSocial: string
        total: number
        availableForSale: number
        unchecked: number
        expired: number
        qrDone: number
    }[]
    recentImports: {
        id: string
        archivo: string
        fecha: string
        nuevos: number
        actualizados: number
        rechazados: number
        estado: string
    }[]
    alerts: {
        type: 'warning' | 'danger' | 'info'
        title: string
        description: string
    }[]
}

const colorMap: Record<string, string> = {
    "emerald": "#10b981",
    "yellow": "#eab308",
    "red": "#ef4444",
    "blue": "#3b82f6",
    "purple": "#a855f7",
    "gray": "#9ca3af",
    "cyan": "#06b6d4"
}

export function BaseAfiliadosEstadistica() {
    const { theme } = useTheme()
    const [status, setStatus] = useState<BaseStatus | null>(null)
    const [loading, setLoading] = useState(true)

    const loadStatus = async () => {
        try {
            setLoading(true)
            const res = await api.affiliates.baseStatus()
            setStatus(res.data)
        } catch (error) {
            console.error("Error loading base status:", error)
            toast.error("Error al cargar estado de la base")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadStatus()
    }, [])

    if (loading) {
        return (
            <div className="animate-pulse space-y-4">
                <div className={cn("rounded-2xl border p-6 h-20", theme === "dark" ? "bg-white/5 border-white/10" : "bg-gray-100 border-gray-200")} />
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7].map(i => (
                        <div key={i} className={cn("rounded-xl h-24", theme === "dark" ? "bg-white/5" : "bg-gray-100")} />
                    ))}
                </div>
            </div>
        )
    }

    if (!status) return null

    const { totals, verificationHealth, byObraSocial, recentImports, alerts } = status
    
    // Dist data
    const distItems = [
        { label: "Disponibles para venta", value: totals.availableForSale, color: "emerald", textClass: "text-emerald-500", bgClass: "bg-emerald-500" },
        { label: "Pendientes de chequeo", value: totals.unchecked, color: "yellow", textClass: "text-yellow-500", bgClass: "bg-yellow-500" },
        { label: "Chequeo vencido", value: totals.expired, color: "red", textClass: "text-red-500", bgClass: "bg-red-500" },
        { label: "Datos frescos", value: totals.fresh, color: "blue", textClass: "text-blue-500", bgClass: "bg-blue-500" },
        { label: "Datos reutilizables", value: totals.reusable, color: "purple", textClass: "text-purple-500", bgClass: "bg-purple-500" },
        { label: "QR hecho", value: totals.qrDone, color: "cyan", textClass: "text-cyan-500", bgClass: "bg-cyan-500" },
    ]

    const distTotalValue = distItems.reduce((acc, item) => acc + item.value, 0)

    const verificationTotal = Object.values(verificationHealth).reduce((a, b) => a + b, 0)
    const verificationItems = [
        { label: "Sin chequear", value: verificationHealth.unchecked, bgClass: "bg-yellow-500" },
        { label: "Chequeados vigentes", value: verificationHealth.checked, bgClass: "bg-emerald-500" },
        { label: "Chequeo vencido", value: verificationHealth.expired, bgClass: "bg-red-500" },
        { label: "Error / captcha / sin datos", value: verificationHealth.error + verificationHealth.captcha + verificationHealth.noData, bgClass: "bg-gray-400" },
    ]

    // Activity panel data
    const latestImport = recentImports.length > 0 ? recentImports[0] : null;

    let currentOffset = 0;
    const r = 40;
    const circ = 2 * Math.PI * r;

    return (
        <div className="animate-fade-in-up space-y-6">
            {/* Encabezado principal */}
            <div className={cn(
                "rounded-2xl border p-4 lg:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4",
                theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-emerald-100/50 shadow-sm"
            )}>
                <div className="flex items-center gap-3">
                    <div className={cn("p-3 rounded-xl", theme === "dark" ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-50 text-emerald-600")}>
                        <Activity className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className={cn("text-xl font-bold", theme === "dark" ? "text-white" : "text-gray-800")}>Estado de la Base</h2>
                        <p className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-500")}>Resumen general y salud operativa de la base de afiliados.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={loadStatus} className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
                        theme === "dark" ? "bg-white/5 border-white/10 hover:bg-white/10 text-white" : "bg-white border-gray-200 hover:bg-gray-50 text-gray-700"
                    )}>
                        <RefreshCw className="w-4 h-4" />
                        Actualizar
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {[
                    { title: "Total en base", value: totals.total, pct: "100%", icon: Users, color: theme === "dark" ? "text-emerald-400" : "text-emerald-600", bg: theme === "dark" ? "bg-emerald-500/10" : "bg-emerald-50" },
                    { title: "Disponibles para venta", value: totals.availableForSale, pct: totals.total ? ((totals.availableForSale/totals.total)*100).toFixed(1) + "%" : "0%", icon: CheckSquare, color: theme === "dark" ? "text-emerald-400" : "text-emerald-600", bg: theme === "dark" ? "bg-emerald-500/10" : "bg-emerald-50" },
                    { title: "Pendientes de chequeo", value: totals.unchecked, pct: totals.total ? ((totals.unchecked/totals.total)*100).toFixed(1) + "%" : "0%", icon: Clock, color: theme === "dark" ? "text-yellow-400" : "text-yellow-600", bg: theme === "dark" ? "bg-yellow-500/10" : "bg-yellow-50" },
                    { title: "Chequeo vencido", value: totals.expired, pct: totals.total ? ((totals.expired/totals.total)*100).toFixed(1) + "%" : "0%", icon: AlertTriangle, color: theme === "dark" ? "text-red-400" : "text-red-600", bg: theme === "dark" ? "bg-red-500/10" : "bg-red-50" },
                    { title: "Datos frescos", value: totals.fresh, pct: totals.total ? ((totals.fresh/totals.total)*100).toFixed(1) + "%" : "0%", icon: Droplet, color: theme === "dark" ? "text-blue-400" : "text-blue-600", bg: theme === "dark" ? "bg-blue-500/10" : "bg-blue-50" },
                    { title: "Datos reutilizables", value: totals.reusable, pct: totals.total ? ((totals.reusable/totals.total)*100).toFixed(1) + "%" : "0%", icon: RefreshCcw, color: theme === "dark" ? "text-purple-400" : "text-purple-600", bg: theme === "dark" ? "bg-purple-500/10" : "bg-purple-50" },
                    { title: "QR hecho", value: totals.qrDone, pct: totals.total ? ((totals.qrDone/totals.total)*100).toFixed(1) + "%" : "0%", icon: QrCode, color: theme === "dark" ? "text-cyan-400" : "text-cyan-600", bg: theme === "dark" ? "bg-cyan-500/10" : "bg-cyan-50" },
                ].map((kpi, idx) => (
                    <div key={idx} className={cn(
                        "rounded-xl border p-4 flex flex-col items-center text-center transition-all hover:scale-[1.02] shadow-sm",
                        theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-gray-100"
                    )}>
                        <div className={cn("p-2 rounded-lg mb-3", kpi.bg, kpi.color)}>
                            <kpi.icon className="w-5 h-5" />
                        </div>
                        <p className={cn("text-xs font-medium mb-1", theme === "dark" ? "text-gray-400" : "text-gray-500")}>{kpi.title}</p>
                        <h4 className={cn("text-xl font-bold mb-1", theme === "dark" ? "text-white" : "text-gray-800")}>{kpi.value.toLocaleString()}</h4>
                        <p className="text-[10px] text-gray-400">{kpi.pct} del total</p>
                    </div>
                ))}
            </div>

            {/* Row 1: Distribución, Salud, Alertas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Distribución de la base (Donut) */}
                <div className={cn("rounded-2xl border p-6 shadow-sm", theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-gray-100")}>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className={cn("font-semibold", theme === "dark" ? "text-white" : "text-gray-800")}>Distribución de la base</h3>
                        <Info className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="relative w-32 h-32 shrink-0">
                            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                                {distItems.map((item, idx) => {
                                    const pct = distTotalValue > 0 ? item.value / distTotalValue : 0;
                                    const strokeDasharray = `${pct * circ} ${circ}`;
                                    const strokeDashoffset = -currentOffset;
                                    currentOffset += pct * circ;
                                    return (
                                        <circle 
                                            key={idx}
                                            cx="50" cy="50" r={r}
                                            fill="transparent"
                                            stroke={colorMap[item.color] || "#cbd5e1"}
                                            strokeWidth="15"
                                            strokeDasharray={strokeDasharray}
                                            strokeDashoffset={strokeDashoffset}
                                            className="transition-all duration-500"
                                        />
                                    )
                                })}
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className={cn("text-sm font-bold", theme === "dark" ? "text-white" : "text-gray-800")}>
                                    {totals.total >= 1000000 ? (totals.total / 1000000).toFixed(1) + 'M' : totals.total >= 1000 ? (totals.total / 1000).toFixed(1) + 'k' : totals.total}
                                </span>
                                <span className="text-[10px] text-gray-400">Total</span>
                            </div>
                        </div>
                        <div className="flex-1 space-y-2 w-full">
                            {distItems.map((item, idx) => {
                                const pct = distTotalValue ? ((item.value/distTotalValue)*100).toFixed(1) : "0"
                                return (
                                    <div key={idx} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <div className={cn("w-2 h-2 rounded-full shrink-0", item.bgClass)}></div>
                                            <span className={cn("truncate max-w-[100px] xl:max-w-[120px]", theme === "dark" ? "text-gray-300" : "text-gray-600")}>{item.label}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{item.value.toLocaleString()}</span>
                                            <span className={cn("w-8 text-right font-medium", item.textClass)}>{pct}%</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Salud del chequeo */}
                <div className={cn("rounded-2xl border p-6 shadow-sm", theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-gray-100")}>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className={cn("font-semibold", theme === "dark" ? "text-white" : "text-gray-800")}>Salud del chequeo</h3>
                        <Info className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="space-y-6">
                        {verificationItems.map((item, idx) => {
                            const pct = verificationTotal ? ((item.value/verificationTotal)*100).toFixed(1) : "0"
                            return (
                                <div key={idx} className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className={theme === "dark" ? "text-gray-300" : "text-gray-600"}>{item.label}</span>
                                        <div className="flex gap-3">
                                            <span className="font-medium">{item.value.toLocaleString()}</span>
                                            <span className="text-gray-400 text-xs w-8 text-right">{pct}%</span>
                                        </div>
                                    </div>
                                    <div className={cn("h-2 rounded-full overflow-hidden", theme === "dark" ? "bg-gray-800" : "bg-gray-100")}>
                                        <div className={cn("h-full rounded-full transition-all duration-500", item.bgClass)} style={{ width: `${pct}%` }}></div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Alertas */}
                <div className={cn("rounded-2xl border p-6 shadow-sm", theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-gray-100")}>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className={cn("font-semibold flex items-center gap-2", theme === "dark" ? "text-white" : "text-gray-800")}>
                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                            Atención
                        </h3>
                    </div>
                    <div className="space-y-3">
                        {alerts.length > 0 ? alerts.map((alert, idx) => (
                            <div key={idx} className={cn(
                                "p-4 rounded-xl border flex gap-3",
                                alert.type === 'danger' ? (theme === "dark" ? "bg-red-500/10 border-red-500/20" : "bg-red-50 border-red-100") :
                                (theme === "dark" ? "bg-yellow-500/10 border-yellow-500/20" : "bg-yellow-50 border-yellow-100")
                            )}>
                                {alert.type === 'danger' ? 
                                    <Clock className={cn("w-5 h-5 shrink-0", theme === "dark" ? "text-red-400" : "text-red-500")} /> :
                                    <AlertTriangle className={cn("w-5 h-5 shrink-0", theme === "dark" ? "text-yellow-400" : "text-yellow-500")} />
                                }
                                <div>
                                    <p className={cn("text-sm font-semibold mb-1", theme === "dark" ? "text-white" : "text-gray-800")}>{alert.title}</p>
                                    <p className={cn("text-xs", theme === "dark" ? "text-gray-300" : "text-gray-600")}>{alert.description}</p>
                                </div>
                            </div>
                        )) : (
                            <div className="p-4 text-center text-sm text-gray-500 border border-dashed rounded-xl border-gray-200">
                                No hay alertas críticas.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Row 2: Stock por obra social (wide) & Actividad reciente (narrow) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Stock por obra social */}
                <div className={cn("lg:col-span-2 rounded-2xl border p-6 shadow-sm", theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-gray-100")}>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className={cn("font-semibold", theme === "dark" ? "text-white" : "text-gray-800")}>Stock por obra social</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                            <thead className={cn("text-xs uppercase border-b", theme === "dark" ? "text-gray-400 border-gray-800" : "text-gray-500 border-gray-100")}>
                                <tr>
                                    <th className="py-3 font-semibold px-2">Obra social</th>
                                    <th className="py-3 text-right font-semibold px-2">Total</th>
                                    <th className="py-3 text-right font-semibold px-2">Disponibles</th>
                                    <th className="py-3 text-right font-semibold px-2">Pendientes</th>
                                    <th className="py-3 text-right font-semibold px-2">Vencidos</th>
                                    <th className="py-3 text-right font-semibold px-2">QR hecho</th>
                                </tr>
                            </thead>
                            <tbody>
                                {byObraSocial.slice(0, 8).map((os, idx) => (
                                    <tr key={idx} className={cn("border-b last:border-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors", theme === "dark" ? "border-gray-800" : "border-gray-50")}>
                                        <td className={cn("py-3 px-2 font-medium max-w-[200px] truncate", theme === "dark" ? "text-gray-300" : "text-gray-700")} title={os.obraSocial}>{os.obraSocial}</td>
                                        <td className="py-3 px-2 text-right text-gray-500 font-medium">{os.total.toLocaleString()}</td>
                                        <td className="py-3 px-2 text-right">
                                            <span className={cn("px-2 py-1 rounded-md text-xs font-semibold", theme === "dark" ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-50 text-emerald-600")}>
                                                {os.availableForSale.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="py-3 px-2 text-right text-yellow-500">{os.unchecked.toLocaleString()}</td>
                                        <td className="py-3 px-2 text-right text-red-500">{os.expired.toLocaleString()}</td>
                                        <td className="py-3 px-2 text-right text-cyan-600 font-medium">{os.qrDone.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Actividad reciente */}
                <div className={cn("rounded-2xl border p-6 shadow-sm", theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-gray-100")}>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className={cn("font-semibold", theme === "dark" ? "text-white" : "text-gray-800")}>Actividad reciente</h3>
                    </div>
                    <div className="space-y-4">
                        {latestImport ? (
                            <div className="space-y-4">
                                <div className="flex gap-3">
                                    <div className={cn("p-2 rounded-full h-fit", theme === "dark" ? "bg-blue-500/20 text-blue-400" : "bg-blue-50 text-blue-600")}>
                                        <UploadCloud className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className={cn("text-sm font-semibold", theme === "dark" ? "text-gray-200" : "text-gray-800")}>Última importación</p>
                                        <p className="text-xs text-gray-500 truncate max-w-[180px]" title={latestImport.archivo}>{latestImport.archivo}</p>
                                        <p className="text-xs text-gray-400 mt-1">{new Date(latestImport.fecha).toLocaleString("es-AR", { dateStyle: 'short', timeStyle: 'short' })}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mt-4">
                                    <div className={cn("p-3 rounded-lg border", theme === "dark" ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-100")}>
                                        <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><FileCheck className="w-3 h-3 text-emerald-500"/> Nuevos</p>
                                        <p className={cn("text-lg font-bold", theme === "dark" ? "text-emerald-400" : "text-emerald-600")}>{latestImport.nuevos.toLocaleString()}</p>
                                    </div>
                                    <div className={cn("p-3 rounded-lg border", theme === "dark" ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-100")}>
                                        <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><RefreshCw className="w-3 h-3 text-blue-500"/> Act.</p>
                                        <p className={cn("text-lg font-bold", theme === "dark" ? "text-blue-400" : "text-blue-600")}>{latestImport.actualizados.toLocaleString()}</p>
                                    </div>
                                    <div className={cn("p-3 rounded-lg border col-span-2 flex justify-between items-center", theme === "dark" ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-100")}>
                                        <p className="text-xs text-gray-500 flex items-center gap-1"><FileX className="w-3 h-3 text-red-500"/> Rechazados</p>
                                        <p className={cn("text-sm font-bold", theme === "dark" ? "text-red-400" : "text-red-600")}>{latestImport.rechazados.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 text-center py-4">No hay importaciones recientes registradas.</p>
                        )}
                        <hr className={theme === "dark" ? "border-white/10" : "border-gray-100"} />
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className={cn("text-sm", theme === "dark" ? "text-gray-300" : "text-gray-600")}>Stock disponible actual</span>
                                <span className={cn("text-sm font-bold", theme === "dark" ? "text-emerald-400" : "text-emerald-600")}>{totals.availableForSale.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className={cn("text-sm", theme === "dark" ? "text-gray-300" : "text-gray-600")}>Chequeos pendientes</span>
                                <span className={cn("text-sm font-bold", theme === "dark" ? "text-yellow-400" : "text-yellow-600")}>{totals.unchecked.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 3: Importaciones recientes */}
            <div className={cn("rounded-2xl border p-6 shadow-sm", theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-gray-100")}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className={cn("font-semibold", theme === "dark" ? "text-white" : "text-gray-800")}>Importaciones recientes</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className={cn("text-xs uppercase border-b", theme === "dark" ? "text-gray-400 border-gray-800" : "text-gray-500 border-gray-100")}>
                            <tr>
                                <th className="py-3 font-semibold px-2">Archivo</th>
                                <th className="py-3 font-semibold px-2">Fecha</th>
                                <th className="py-3 text-right font-semibold px-2">Nuevos</th>
                                <th className="py-3 text-right font-semibold px-2">Actualizados</th>
                                <th className="py-3 text-right font-semibold px-2">Rechazados</th>
                                <th className="py-3 text-center font-semibold px-2">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentImports.length > 0 ? recentImports.map((imp, idx) => (
                                <tr key={idx} className={cn("border-b last:border-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors", theme === "dark" ? "border-gray-800" : "border-gray-50")}>
                                    <td className={cn("py-3 px-2 font-medium max-w-[250px] truncate", theme === "dark" ? "text-gray-300" : "text-gray-700")} title={imp.archivo}>{imp.archivo}</td>
                                    <td className="py-3 px-2 text-gray-500">{new Date(imp.fecha).toLocaleString("es-AR", { day: '2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}</td>
                                    <td className="py-3 px-2 text-right font-medium text-emerald-600">{imp.nuevos.toLocaleString()}</td>
                                    <td className="py-3 px-2 text-right text-blue-500">{imp.actualizados.toLocaleString()}</td>
                                    <td className="py-3 px-2 text-right text-red-500">{imp.rechazados.toLocaleString()}</td>
                                    <td className="py-3 px-2 text-center">
                                        <span className={cn(
                                            "px-2 py-1 rounded-full text-[10px] font-medium uppercase tracking-wide",
                                            imp.estado === 'completed' ? (theme === "dark" ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-100 text-emerald-700") :
                                            imp.estado === 'failed' ? (theme === "dark" ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-700") :
                                            (theme === "dark" ? "bg-yellow-500/20 text-yellow-400" : "bg-yellow-100 text-yellow-700")
                                        )}>
                                            {imp.estado}
                                        </span>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={6} className="text-center py-4 text-gray-500">No hay importaciones recientes.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
