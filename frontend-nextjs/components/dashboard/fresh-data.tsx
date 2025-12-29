/**
 * ============================================================
 * DATOS FRESCOS (fresh-data.tsx)
 * ============================================================
 * Vista de afiliados frescos (no contactados aún).
 * Permite descargar y exportar datos nuevos.
 */

"use client"

import { useState, useEffect } from "react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import { Download, Sparkles, RefreshCw } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import * as XLSX from "xlsx"

interface FreshAffiliate {
    _id: string
    nombre: string
    cuil: string
    obraSocial: string
    telefono: string
    localidad: string
}

export function FreshData() {
    const { theme } = useTheme()

    const [affiliates, setAffiliates] = useState<FreshAffiliate[]>([])
    const [loading, setLoading] = useState(false)
    const [total, setTotal] = useState(0)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const { data } = await api.affiliates.getFresh()
            setAffiliates(data.data || [])
            setTotal(data.total || 0)
        } catch (error) {
            console.error("Error fetching fresh data:", error)
            toast.error("Error al cargar datos frescos")
        } finally {
            setLoading(false)
        }
    }

    const handleExport = () => {
        if (affiliates.length === 0) {
            toast.info("No hay datos para exportar")
            return
        }

        const rows = affiliates.map(a => ({
            "Nombre": a.nombre,
            "CUIL": a.cuil,
            "Obra Social": a.obraSocial,
            "Teléfono": a.telefono,
            "Localidad": a.localidad
        }))

        const ws = XLSX.utils.json_to_sheet(rows)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Datos Frescos")
        XLSX.writeFile(wb, `datos_frescos_${new Date().toISOString().slice(0, 10)}.xlsx`)
        toast.success("Archivo exportado exitosamente")
    }

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Encabezado de datos frescos */}
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div>
                    <h2 className={cn("text-2xl font-bold flex items-center gap-2", theme === "dark" ? "text-white" : "text-gray-800")}>
                        <span className="p-2 rounded-lg bg-emerald-500/20 text-emerald-500">
                            <Sparkles className="w-6 h-6" />
                        </span>
                        Datos Frescos
                    </h2>
                    <p className={cn("text-sm mt-1", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                        Afiliados sin registros en Auditorías o Contactar Afiliados
                    </p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={fetchData}
                        className={cn(
                            "px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2",
                            theme === "dark"
                                ? "bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10"
                                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
                        )}
                    >
                        <RefreshCw className="w-4 h-4" />
                        Actualizar
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={affiliates.length === 0}
                        className={cn(
                            "px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2",
                            affiliates.length === 0
                                ? "opacity-50 cursor-not-allowed"
                                : "",
                            theme === "dark"
                                ? "bg-green-500/20 text-green-300 hover:bg-green-500/30"
                                : "bg-green-100 text-green-700 hover:bg-green-200"
                        )}
                    >
                        <Download className="w-4 h-4" />
                        Exportar
                    </button>
                </div>
            </div>

            {/* Estadísticas de distribución */}
            <div className={cn(
                "rounded-2xl border p-6",
                theme === "dark" ? "bg-[#1a1333]/50 border-white/5" : "bg-white border-gray-100 shadow-sm"
            )}>
                <div className="flex items-center justify-between">
                    <div>
                        <p className={cn("text-sm font-medium", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                            Total de datos frescos
                        </p>
                        <p className={cn("text-3xl font-bold mt-1", theme === "dark" ? "text-white" : "text-gray-900")}>
                            {total}
                        </p>
                    </div>
                    <div className={cn(
                        "p-4 rounded-xl",
                        theme === "dark" ? "bg-emerald-500/10" : "bg-emerald-50"
                    )}>
                        <Sparkles className={cn("w-8 h-8", theme === "dark" ? "text-emerald-400" : "text-emerald-600")} />
                    </div>
                </div>
            </div>

            {/* Tabla de datos frescos */}
            <div className={cn(
                "rounded-2xl border overflow-hidden",
                theme === "dark" ? "bg-[#1a1333]/50 border-white/5" : "bg-white border-gray-100 shadow-sm"
            )}>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className={cn(
                                "text-left text-xs font-medium uppercase tracking-wider",
                                theme === "dark" ? "bg-white/5 text-gray-400" : "bg-gray-50 text-gray-500"
                            )}>
                                <th className="px-6 py-4">Nombre</th>
                                <th className="px-6 py-4">CUIL</th>
                                <th className="px-6 py-4">Obra Social</th>
                                <th className="px-6 py-4">Teléfono</th>
                                <th className="px-6 py-4">Localidad</th>
                            </tr>
                        </thead>
                        <tbody className={cn("divide-y", theme === "dark" ? "divide-white/5" : "divide-gray-100")}>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <RefreshCw className="w-5 h-5 animate-spin text-emerald-500" />
                                            <span className="text-gray-500">Cargando datos...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : affiliates.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        No hay datos frescos disponibles
                                    </td>
                                </tr>
                            ) : (
                                affiliates.map((item) => (
                                    <tr
                                        key={item._id}
                                        className={cn(
                                            "transition-colors text-sm",
                                            theme === "dark" ? "hover:bg-white/5 text-gray-300" : "hover:bg-gray-50 text-gray-700"
                                        )}
                                    >
                                        <td className="px-6 py-4 font-medium">{item.nombre}</td>
                                        <td className="px-6 py-4">{item.cuil}</td>
                                        <td className="px-6 py-4">{item.obraSocial}</td>
                                        <td className="px-6 py-4">{item.telefono}</td>
                                        <td className="px-6 py-4">{item.localidad}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
