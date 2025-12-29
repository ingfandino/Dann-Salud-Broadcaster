/**
 * ============================================================
 * CONTACTAR AFILIADOS (contact-affiliates.tsx)
 * ============================================================
 * Vista de afiliados para contactar por WhatsApp.
 * Muestra lista con estados y botones de acción.
 */

"use client"

import { useState, useEffect } from "react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import {
    Phone, CheckCircle, XCircle, Clock, Ban, User, MapPin, Building
} from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface Affiliate {
    _id: string
    nombre: string
    cuil: string
    telefono1: string
    obraSocial: string
    localidad: string
    leadStatus: string
    assignedAt: string
    lastInteraction?: string
    interactionHistory: any[]
}

export function ContactAffiliates() {
    const { theme } = useTheme()
    const router = useRouter()

    const [affiliates, setAffiliates] = useState<Affiliate[]>([])
    const [loading, setLoading] = useState(false)
    const [filterStatus, setFilterStatus] = useState("pending") // pending, all

    useEffect(() => {
        fetchData()
    }, [filterStatus])

    const fetchData = async () => {
        setLoading(true)
        try {
            const { data } = await api.affiliates.getAssigned({ status: filterStatus })
            setAffiliates(data.affiliates)
        } catch (error) {
            toast.error("Error cargando asignaciones")
        } finally {
            setLoading(false)
        }
    }

    const handleStatusUpdate = async (id: string, status: string, note: string = "") => {
        try {
            // Optimistic update
            setAffiliates(prev => prev.map(a =>
                a._id === id ? { ...a, leadStatus: status } : a
            ))

            await api.affiliates.updateStatus(id, { status, note })
            toast.success(`Estado actualizado: ${status}`)

            // If success, redirect to create audit
            if (status === 'Venta') {
                // Find the affiliate data
                const affiliate = affiliates.find(a => a._id === id)
                if (affiliate) {
                    // Store in sessionStorage to pre-fill the form
                    sessionStorage.setItem('prefillAudit', JSON.stringify({
                        nombre: affiliate.nombre,
                        cuil: affiliate.cuil,
                        telefono: affiliate.telefono1,
                        obraSocialAnterior: affiliate.obraSocial,
                        localidad: affiliate.localidad
                    }))
                    router.push('/dashboard/audits/follow-up?action=create')
                }
            } else {
                // Refresh to remove from list if filter is pending
                if (filterStatus === 'pending' && ['No interesado', 'Fallido'].includes(status)) {
                    setTimeout(fetchData, 500)
                }
            }
        } catch (error) {
            toast.error("Error actualizando estado")
            fetchData() // Revert on error
        }
    }

    return (
        <div className="space-y-6 p-6 animate-fade-in-up">
            {/* Encabezado de la sección */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className={cn("text-2xl font-bold", theme === "dark" ? "text-white" : "text-gray-900")}>
                        Contactar Afiliados
                    </h1>
                    <p className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                        Gestiona tus leads asignados
                    </p>
                </div>
                <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-lg">
                    <button
                        onClick={() => setFilterStatus("pending")}
                        className={cn(
                            "px-4 py-2 text-sm font-medium rounded-md transition-all",
                            filterStatus === "pending"
                                ? "bg-white dark:bg-gray-800 shadow text-purple-600"
                                : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                        )}
                    >
                        Pendientes
                    </button>
                    <button
                        onClick={() => setFilterStatus("all")}
                        className={cn(
                            "px-4 py-2 text-sm font-medium rounded-md transition-all",
                            filterStatus === "all"
                                ? "bg-white dark:bg-gray-800 shadow text-purple-600"
                                : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                        )}
                    >
                        Todos
                    </button>
                </div>
            </div>

            {/* Grilla de tarjetas */}
            {loading ? (
                <div className="text-center py-12 text-gray-500">Cargando asignaciones...</div>
            ) : affiliates.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-gray-50 dark:bg-white/5 rounded-xl border border-dashed border-gray-200 dark:border-white/10">
                    <p className="text-lg font-medium">No tienes leads asignados</p>
                    <p className="text-sm">Solicita nuevos leads a tu supervisor</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {affiliates.map((item) => (
                        <div key={item._id} className={cn(
                            "rounded-xl border p-5 transition-all hover:shadow-lg",
                            theme === "dark" ? "bg-[#1a1333] border-white/10 hover:border-purple-500/50" : "bg-white border-gray-200 hover:border-purple-200"
                        )}>
                            {/* Encabezado de tarjeta */}
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className={cn("font-bold text-lg", theme === "dark" ? "text-white" : "text-gray-900")}>
                                        {item.nombre}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={cn("text-xs px-2 py-0.5 rounded-full border",
                                            theme === "dark" ? "border-white/10 bg-white/5 text-gray-300" : "border-gray-200 bg-gray-50 text-gray-600"
                                        )}>
                                            {item.cuil}
                                        </span>
                                        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full",
                                            item.leadStatus === 'Pendiente' ? "bg-yellow-100 text-yellow-800" :
                                                item.leadStatus === 'Asignado' ? "bg-blue-100 text-blue-800" :
                                                    item.leadStatus === 'No contesta' ? "bg-orange-100 text-orange-800" :
                                                        item.leadStatus === 'Venta' ? "bg-green-100 text-green-800" :
                                                            "bg-gray-100 text-gray-800"
                                        )}>
                                            {item.leadStatus}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Información del contacto */}
                            <div className="space-y-3 mb-6">
                                <div className="flex items-center gap-3 text-sm">
                                    <Phone className="w-4 h-4 text-gray-400" />
                                    <a href={`tel:${item.telefono1}`} className="hover:underline text-purple-600 font-medium">
                                        {item.telefono1}
                                    </a>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <Building className="w-4 h-4 text-gray-400" />
                                    <span className={theme === "dark" ? "text-gray-300" : "text-gray-700"}>
                                        {item.obraSocial}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <MapPin className="w-4 h-4 text-gray-400" />
                                    <span className={theme === "dark" ? "text-gray-300" : "text-gray-700"}>
                                        {item.localidad}
                                    </span>
                                </div>
                            </div>

                            {/* Botones de acción */}
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => handleStatusUpdate(item._id, 'Venta')}
                                    className="col-span-2 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    Venta Exitosa
                                </button>
                                <button
                                    onClick={() => handleStatusUpdate(item._id, 'No contesta')}
                                    className={cn(
                                        "py-2 rounded-lg text-sm font-medium border transition-colors flex items-center justify-center gap-2",
                                        theme === "dark" ? "border-orange-500/30 text-orange-400 hover:bg-orange-500/10" : "border-orange-200 text-orange-700 hover:bg-orange-50"
                                    )}
                                >
                                    <Clock className="w-4 h-4" />
                                    No contesta
                                </button>
                                <button
                                    onClick={() => handleStatusUpdate(item._id, 'No interesado')}
                                    className={cn(
                                        "py-2 rounded-lg text-sm font-medium border transition-colors flex items-center justify-center gap-2",
                                        theme === "dark" ? "border-red-500/30 text-red-400 hover:bg-red-500/10" : "border-red-200 text-red-700 hover:bg-red-50"
                                    )}
                                >
                                    <XCircle className="w-4 h-4" />
                                    No interesado
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
