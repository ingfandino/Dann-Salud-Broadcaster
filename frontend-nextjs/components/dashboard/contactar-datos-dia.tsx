"use client"

import { Table, Search, Download, RefreshCw, Phone, MessageCircle, Clock, CheckCircle, XCircle, Send, X, Calendar } from "lucide-react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { toast } from "sonner"

interface Lead {
    _id: string
    affiliate: {
        nombre: string
        telefono1: string
        cuil: string
        obraSocial: string
        localidad: string
    }
    status: string
    subStatus?: string
    assignedAt: string
}

export function ContactarDatosDia() {
    const { theme } = useTheme()
    const [loading, setLoading] = useState(false)
    const [leads, setLeads] = useState<Lead[]>([])
    const [searchTerm, setSearchTerm] = useState("")

    // WhatsApp Modal State
    const [waModalOpen, setWaModalOpen] = useState(false)
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
    const [waMessage, setWaMessage] = useState("")
    const [sendingWa, setSendingWa] = useState(false)

    // Reschedule Modal State
    const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false)
    const [rescheduleDate, setRescheduleDate] = useState("")
    const [rescheduleNote, setRescheduleNote] = useState("")
    const [rescheduling, setRescheduling] = useState(false)

    const fetchLeads = async () => {
        setLoading(true)
        try {
            const res = await api.assignments.getMyLeads()
            setLeads(res.data)
        } catch (error) {
            console.error("Error cargando leads:", error)
            toast.error("Error al cargar tus datos del día")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchLeads()
    }, [])

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            // Optimistic update
            setLeads(leads.map(l => l._id === id ? { ...l, status: newStatus } : l))

            await api.assignments.updateStatus(id, { status: newStatus })
            toast.success(`Estado actualizado a ${newStatus}`)
        } catch (error) {
            console.error("Error actualizando estado:", error)
            toast.error("Error al actualizar estado")
            fetchLeads() // Revertir
        }
    }

    const openWaModal = (lead: Lead) => {
        setSelectedLead(lead)
        setWaMessage(`Hola ${lead.affiliate.nombre}, soy de Dann Salud. Te contacto por tu consulta sobre obra social.`)
        setWaModalOpen(true)
    }

    const openRescheduleModal = (lead: Lead) => {
        setSelectedLead(lead)
        // Default: mañana a las 10am
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(10, 0, 0, 0)
        setRescheduleDate(tomorrow.toISOString().slice(0, 16)) // Format for datetime-local
        setRescheduleNote("")
        setRescheduleModalOpen(true)
    }

    const sendWhatsApp = async () => {
        if (!selectedLead || !waMessage.trim()) return

        setSendingWa(true)
        try {
            await api.assignments.sendWhatsApp(selectedLead._id, { message: waMessage })
            toast.success("Mensaje enviado correctamente")
            setWaModalOpen(false)
            setLeads(leads.map(l => l._id === selectedLead._id ? { ...l, status: 'En Gestión' } : l))
        } catch (error: any) {
            console.error("Error enviando WA:", error)
            toast.error(error.response?.data?.error || "Error al enviar mensaje")
        } finally {
            setSendingWa(false)
        }
    }

    const handleReschedule = async () => {
        if (!selectedLead || !rescheduleDate) return

        setRescheduling(true)
        try {
            await api.assignments.reschedule(selectedLead._id, {
                date: new Date(rescheduleDate).toISOString(),
                note: rescheduleNote
            })
            toast.success("Reprogramado exitosamente")
            setRescheduleModalOpen(false)
            // Actualizar estado localmente
            setLeads(leads.map(l => l._id === selectedLead._id ? { ...l, status: 'En Gestión', subStatus: 'Reprogramado' } : l))
        } catch (error: any) {
            console.error("Error reprogramando:", error)
            toast.error(error.response?.data?.error || "Error al reprogramar")
        } finally {
            setRescheduling(false)
        }
    }

    const filteredLeads = leads.filter(lead => {
        const term = searchTerm.toLowerCase()
        return (
            lead.affiliate?.nombre?.toLowerCase().includes(term) ||
            lead.affiliate?.telefono1?.includes(term) ||
            lead.affiliate?.cuil?.includes(term)
        )
    })

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Pendiente': return theme === 'dark' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700'
            case 'En Gestión': return theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'
            case 'Contactado': return theme === 'dark' ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700'
            case 'Venta': return theme === 'dark' ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
            case 'No Interesa': return theme === 'dark' ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700'
            default: return theme === 'dark' ? 'bg-gray-500/20 text-gray-400' : 'bg-gray-100 text-gray-700'
        }
    }

    const handleExport = async () => {
        try {
            const response = await api.assignments.exportMyLeads()
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', `mis_leads_${new Date().toISOString().split('T')[0]}.xlsx`)
            document.body.appendChild(link)
            link.click()
            link.remove()
            toast.success("Excel exportado correctamente")
        } catch (error) {
            console.error("Error exportando:", error)
            toast.error("Error al exportar Excel")
        }
    }

    return (
        <div className="animate-fade-in-up space-y-4 relative">
            {/* Header */}
            <div
                className={cn(
                    "rounded-2xl border p-4 lg:p-6 backdrop-blur-sm",
                    theme === "dark"
                        ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
                        : "bg-gradient-to-br from-white to-[#FAF7F2]/80 border-purple-200/30 shadow-lg shadow-purple-100/30",
                )}
            >
                <h2
                    className={cn(
                        "text-lg lg:text-xl font-semibold flex items-center gap-2",
                        theme === "dark" ? "text-white" : "text-gray-700",
                    )}
                >
                    <Table className={cn("w-5 h-5", theme === "dark" ? "text-purple-400" : "text-purple-500")} />
                    Datos del Día
                </h2>
                <p className={cn("text-sm mt-2", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                    Gestiona tus asignaciones diarias. Total: {leads.length}
                </p>
            </div>

            {/* Search and Actions Bar */}
            <div
                className={cn(
                    "rounded-2xl border p-4 backdrop-blur-sm flex flex-col sm:flex-row gap-3 items-center justify-between",
                    theme === "dark"
                        ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
                        : "bg-gradient-to-br from-white to-[#FAF7F2]/80 border-purple-200/30 shadow-lg shadow-purple-100/30",
                )}
            >
                <div className="relative flex-1 w-full sm:w-auto">
                    <Search
                        className={cn(
                            "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4",
                            theme === "dark" ? "text-gray-400" : "text-gray-500",
                        )}
                    />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, teléfono o CUIL..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={cn(
                            "pl-10 pr-4 py-2 w-full rounded-lg border text-sm",
                            theme === "dark"
                                ? "bg-white/5 border-white/10 text-white placeholder-gray-500"
                                : "bg-white border-gray-200 text-gray-700 placeholder-gray-400",
                        )}
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleExport}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                            theme === "dark"
                                ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                                : "bg-green-100 text-green-600 hover:bg-green-200",
                        )}
                    >
                        <Download className="w-4 h-4" />
                        Exportar Excel
                    </button>
                    <button
                        onClick={fetchLeads}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                            theme === "dark"
                                ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                                : "bg-blue-100 text-blue-600 hover:bg-blue-200",
                        )}
                    >
                        <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                        Actualizar
                    </button>
                </div>
            </div>

            {/* Table */}
            <div
                className={cn(
                    "rounded-2xl border backdrop-blur-sm overflow-hidden",
                    theme === "dark"
                        ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
                        : "bg-gradient-to-br from-white to-[#FAF7F2]/80 border-purple-200/30 shadow-lg shadow-purple-100/30",
                )}
            >
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr
                                className={cn(
                                    "border-b",
                                    theme === "dark"
                                        ? "bg-white/5 border-white/10"
                                        : "bg-purple-50/50 border-purple-100",
                                )}
                            >
                                <th className={cn("px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                                    Afiliado
                                </th>
                                <th className={cn("px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                                    Datos Contacto
                                </th>
                                <th className={cn("px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                                    Estado
                                </th>
                                <th className={cn("px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className={cn("divide-y", theme === "dark" ? "divide-white/10" : "divide-gray-200")}>
                            {filteredLeads.map((item) => (
                                <tr
                                    key={item._id}
                                    className={cn(
                                        "transition-colors",
                                        theme === "dark" ? "hover:bg-white/5" : "hover:bg-purple-50/30",
                                    )}
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className={cn("font-medium text-sm", theme === "dark" ? "text-white" : "text-gray-900")}>
                                                {item.affiliate?.nombre || 'Sin Nombre'}
                                            </span>
                                            <span className={cn("text-xs", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                                                CUIL: {item.affiliate?.cuil || '-'}
                                            </span>
                                            <span className={cn("text-xs", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                                                {item.affiliate?.localidad}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <Phone className="w-3 h-3 text-gray-400" />
                                                <span className={cn("text-sm", theme === "dark" ? "text-gray-300" : "text-gray-600")}>
                                                    {item.affiliate?.telefono1}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={cn("text-xs px-2 py-0.5 rounded-full border", theme === "dark" ? "border-gray-700 text-gray-400" : "border-gray-200 text-gray-500")}>
                                                    {item.affiliate?.obraSocial || 'Sin OS'}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <select
                                                value={item.status}
                                                onChange={(e) => handleStatusChange(item._id, e.target.value)}
                                                className={cn(
                                                    "px-2 py-1 rounded-md text-xs font-medium border-none outline-none cursor-pointer",
                                                    getStatusColor(item.status)
                                                )}
                                            >
                                                <option value="Pendiente">Pendiente</option>
                                                <option value="En Gestión">En Gestión</option>
                                                <option value="Contactado">Contactado</option>
                                                <option value="Venta">Venta</option>
                                                <option value="No Interesa">No Interesa</option>
                                                <option value="No Contesta">No Contesta</option>
                                            </select>
                                            {item.subStatus && (
                                                <span className={cn("text-[10px] italic", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                                                    {item.subStatus}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => openWaModal(item)}
                                                className={cn(
                                                    "p-2 rounded-lg transition-colors",
                                                    theme === "dark" ? "bg-green-500/20 text-green-400 hover:bg-green-500/30" : "bg-green-100 text-green-600 hover:bg-green-200"
                                                )}
                                                title="Enviar WhatsApp"
                                            >
                                                <MessageCircle className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => openRescheduleModal(item)}
                                                className={cn(
                                                    "p-2 rounded-lg transition-colors",
                                                    theme === "dark" ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30" : "bg-blue-100 text-blue-600 hover:bg-blue-200"
                                                )}
                                                title="Reprogramar"
                                            >
                                                <Clock className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {filteredLeads.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                        No tienes datos asignados para hoy.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* WhatsApp Modal */}
            {waModalOpen && selectedLead && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className={cn(
                        "w-full max-w-md rounded-2xl border p-6 shadow-xl animate-scale-in",
                        theme === "dark" ? "bg-[#1a1b26] border-white/10" : "bg-white border-gray-200"
                    )}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className={cn("text-lg font-semibold flex items-center gap-2", theme === "dark" ? "text-white" : "text-gray-800")}>
                                <MessageCircle className="w-5 h-5 text-green-500" />
                                Enviar WhatsApp
                            </h3>
                            <button onClick={() => setWaModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="mb-4">
                            <p className={cn("text-sm mb-2", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                                Para: <span className="font-medium text-green-500">{selectedLead.affiliate.nombre}</span> ({selectedLead.affiliate.telefono1})
                            </p>
                            <textarea
                                value={waMessage}
                                onChange={(e) => setWaMessage(e.target.value)}
                                rows={4}
                                className={cn(
                                    "w-full p-3 rounded-xl border text-sm resize-none focus:ring-2 focus:ring-green-500/50 outline-none",
                                    theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-800"
                                )}
                                placeholder="Escribe tu mensaje aquí..."
                            />
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setWaModalOpen(false)}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                    theme === "dark" ? "hover:bg-white/10 text-gray-300" : "hover:bg-gray-100 text-gray-600"
                                )}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={sendWhatsApp}
                                disabled={sendingWa || !waMessage.trim()}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                    "bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                )}
                            >
                                {sendingWa ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Enviar Mensaje
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reschedule Modal */}
            {rescheduleModalOpen && selectedLead && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className={cn(
                        "w-full max-w-md rounded-2xl border p-6 shadow-xl animate-scale-in",
                        theme === "dark" ? "bg-[#1a1b26] border-white/10" : "bg-white border-gray-200"
                    )}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className={cn("text-lg font-semibold flex items-center gap-2", theme === "dark" ? "text-white" : "text-gray-800")}>
                                <Calendar className="w-5 h-5 text-blue-500" />
                                Reprogramar Llamada
                            </h3>
                            <button onClick={() => setRescheduleModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className={cn("text-xs mb-1 block", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                                    Fecha y Hora
                                </label>
                                <input
                                    type="datetime-local"
                                    value={rescheduleDate}
                                    onChange={(e) => setRescheduleDate(e.target.value)}
                                    className={cn(
                                        "w-full p-3 rounded-xl border text-sm focus:ring-2 focus:ring-blue-500/50 outline-none",
                                        theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-800"
                                    )}
                                />
                            </div>

                            <div>
                                <label className={cn("text-xs mb-1 block", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                                    Nota (Opcional)
                                </label>
                                <textarea
                                    value={rescheduleNote}
                                    onChange={(e) => setRescheduleNote(e.target.value)}
                                    rows={3}
                                    className={cn(
                                        "w-full p-3 rounded-xl border text-sm resize-none focus:ring-2 focus:ring-blue-500/50 outline-none",
                                        theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-800"
                                    )}
                                    placeholder="Motivo de reprogramación..."
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setRescheduleModalOpen(false)}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                    theme === "dark" ? "hover:bg-white/10 text-gray-300" : "hover:bg-gray-100 text-gray-600"
                                )}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleReschedule}
                                disabled={rescheduling || !rescheduleDate}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                    "bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                )}
                            >
                                {rescheduling ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-4 h-4" />
                                        Confirmar
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
