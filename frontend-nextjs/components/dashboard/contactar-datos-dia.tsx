/**
 * ============================================================
 * CONTACTAR DATOS DEL DÍA (contactar-datos-dia.tsx)
 * ============================================================
 * Vista de leads asignados al asesor para contactar hoy.
 * Permite gestionar estados, enviar WhatsApp y ver historial.
 */

"use client"

import { Table, Search, Download, RefreshCw, Phone, MessageCircle, Clock, CheckCircle, XCircle, Send, X, UserPlus, Users } from "lucide-react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import { useState, useEffect, useRef } from "react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react'
import { useRouter } from "next/navigation"

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

    const router = useRouter()

    /* Estado del modal de WhatsApp (flotante) */
    const [waModalOpen, setWaModalOpen] = useState(false)
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
    const [waMessage, setWaMessage] = useState("")
    const [sendingWa, setSendingWa] = useState(false)
    const [waLinked, setWaLinked] = useState<boolean | null>(null) // null = no verificado
    const waButtonRef = useRef<HTMLButtonElement | null>(null)
    
    // ✅ Sistema de plantillas de WhatsApp
    const [waTemplates, setWaTemplates] = useState<{id: string, name: string, message: string}[]>([])
    const [newTemplateName, setNewTemplateName] = useState("")
    const [showSaveTemplate, setShowSaveTemplate] = useState(false)
    
    // Cargar plantillas desde localStorage al montar
    useEffect(() => {
        const saved = localStorage.getItem('wa_templates')
        if (saved) {
            try {
                setWaTemplates(JSON.parse(saved))
            } catch {
                setWaTemplates([])
            }
        }
    }, [])
    
    // Guardar plantillas en localStorage cuando cambien
    const saveTemplates = (templates: typeof waTemplates) => {
        setWaTemplates(templates)
        localStorage.setItem('wa_templates', JSON.stringify(templates))
    }
    
    const addTemplate = () => {
        if (!newTemplateName.trim() || !waMessage.trim()) return
        const newTemplate = {
            id: Date.now().toString(),
            name: newTemplateName.trim(),
            message: waMessage
        }
        saveTemplates([...waTemplates, newTemplate])
        setNewTemplateName("")
        setShowSaveTemplate(false)
        toast.success(`Plantilla "${newTemplate.name}" guardada`)
    }
    
    const deleteTemplate = (id: string) => {
        const updated = waTemplates.filter(t => t.id !== id)
        saveTemplates(updated)
        toast.success("Plantilla eliminada")
    }
    
    const applyTemplate = (template: typeof waTemplates[0]) => {
        // Reemplazar {nombre} con el nombre del afiliado
        let msg = template.message
        if (selectedLead) {
            msg = msg.replace(/\{nombre\}/gi, selectedLead.affiliate.nombre || '')
            msg = msg.replace(/\{telefono\}/gi, selectedLead.affiliate.telefono1 || '')
        }
        setWaMessage(msg)
    }

    // Floating UI para modal WhatsApp
    const { refs: waRefs, floatingStyles: waFloatingStyles } = useFloating({
        placement: 'left-start',
        middleware: [offset(10), flip(), shift({ padding: 10 })],
        whileElementsMounted: autoUpdate,
    })

    // Reasignar a Supervisor Modal State
    const [reassignModalOpen, setReassignModalOpen] = useState(false)
    const [reassignNote, setReassignNote] = useState("")
    const [reassignHour, setReassignHour] = useState("") // ✅ Nuevo: Hora programada
    const [reassigning, setReassigning] = useState(false)
    const [supervisors, setSupervisors] = useState<{_id: string, nombre: string}[]>([])
    const [selectedSupervisor, setSelectedSupervisor] = useState("")
    const [modalScrollTop, setModalScrollTop] = useState(0) // Posición del scroll al abrir modal

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

    // Verificar vínculo WhatsApp al montar y cuando la ventana recupera el foco
    const checkWaLink = async () => {
        try {
            const res = await api.whatsapp.status()
            setWaLinked(res.data?.connected || false) // ✅ Usar 'connected' no 'isReady'
        } catch {
            setWaLinked(false)
        }
    }

    useEffect(() => {
        checkWaLink()
        
        // ✅ Re-verificar cuando la página recupera el foco (después de vincular)
        const handleFocus = () => checkWaLink()
        window.addEventListener('focus', handleFocus)
        return () => window.removeEventListener('focus', handleFocus)
    }, [])

    const openWaModal = async (lead: Lead, buttonElement: HTMLButtonElement) => {
        // ✅ Verificar en tiempo real antes de abrir modal
        try {
            const res = await api.whatsapp.status()
            const isLinked = res.data?.connected || false
            setWaLinked(isLinked)
            
            if (!isLinked) {
                toast.error("WhatsApp no está vinculado. Redirigiendo...")
                router.push('/dashboard/whatsapp')
                return
            }
        } catch {
            toast.error("Error verificando WhatsApp. Redirigiendo...")
            router.push('/dashboard/whatsapp')
            return
        }

        // ✅ Capturar posición del scroll para posicionar el modal
        setModalScrollTop(window.scrollY || document.documentElement.scrollTop)
        setSelectedLead(lead)
        setWaMessage(`Hola ${lead.affiliate.nombre}, soy de Dann Salud. Te contacto por tu consulta sobre obra social.`)
        setWaModalOpen(true)
    }

    // Cargar supervisores al montar
    useEffect(() => {
        const fetchSupervisors = async () => {
            try {
                console.log("[DatosDia] Cargando supervisores con scope=supervisors...")
                // ✅ Usar scope=supervisors para obtener lista de supervisores
                const res = await api.users.list("scope=supervisors")
                console.log("[DatosDia] Supervisores recibidos:", res.data?.length || 0)
                const sups = (res.data || []).sort((a: any, b: any) => a.nombre?.localeCompare(b.nombre))
                console.log("[DatosDia] Supervisores:", sups.map((s: any) => s.nombre))
                setSupervisors(sups)
            } catch (error) {
                console.error("[DatosDia] Error cargando supervisores:", error)
            }
        }
        fetchSupervisors()
    }, [])

    const openReassignModal = (lead: Lead) => {
        setSelectedLead(lead)
        setSelectedSupervisor("")
        setReassignNote("")
        setReassignHour("")
        // ✅ Capturar posición del scroll actual para posicionar el modal
        setModalScrollTop(window.scrollY || document.documentElement.scrollTop)
        setReassignModalOpen(true)
    }

    const sendWhatsApp = async () => {
        if (!selectedLead || !waMessage.trim()) return

        setSendingWa(true)
        try {
            await api.assignments.sendWhatsApp(selectedLead._id, { message: waMessage })
            toast.success("Mensaje enviado correctamente")
            setWaModalOpen(false)
            setLeads(leads.map(l => l._id === selectedLead._id ? { ...l, status: 'Llamando' } : l))
        } catch (error: any) {
            console.error("Error enviando WA:", error)
            toast.error(error.response?.data?.error || "Error al enviar mensaje")
        } finally {
            setSendingWa(false)
        }
    }

    const handleReassign = async () => {
        if (!selectedLead || !selectedSupervisor) {
            toast.error("Selecciona un supervisor")
            return
        }

        setReassigning(true)
        try {
            await api.assignments.reassign(selectedLead._id, {
                supervisorId: selectedSupervisor,
                note: reassignNote,
                scheduledHour: reassignHour || undefined // ✅ Enviar hora si se proporcionó
            })
            toast.success("Reasignado exitosamente. Se notificó al supervisor.")
            setReassignModalOpen(false)
            // Remover de la lista local ya que fue reasignado
            setLeads(leads.filter(l => l._id !== selectedLead._id))
        } catch (error: any) {
            console.error("Error reasignando:", error)
            toast.error(error.response?.data?.error || "Error al reasignar")
        } finally {
            setReassigning(false)
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

    // Colores para badges de estado
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Pendiente': return theme === 'dark' ? 'bg-gray-500/20 text-gray-400' : 'bg-gray-100 text-gray-700'
            case 'Llamando': return theme === 'dark' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700'
            case 'No contesta': return theme === 'dark' ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-700'
            case 'Venta': return theme === 'dark' ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
            case 'No le interesa': return theme === 'dark' ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700'
            case 'Spam': return theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'
            case 'Reasignada': return theme === 'dark' ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700'
            default: return theme === 'dark' ? 'bg-gray-500/20 text-gray-400' : 'bg-gray-100 text-gray-700'
        }
    }

    // Colores de fondo para filas según estado (Status Coloring)
    const getRowBackgroundColor = (status: string) => {
        switch (status) {
            case 'Pendiente': return theme === 'dark' ? 'bg-gray-500/5' : 'bg-gray-50/50'
            case 'Llamando': return theme === 'dark' ? 'bg-yellow-500/5' : 'bg-yellow-50/50'
            case 'No contesta': return theme === 'dark' ? 'bg-orange-500/5' : 'bg-orange-50/50'
            case 'Venta': return theme === 'dark' ? 'bg-green-500/10' : 'bg-green-50/70'
            case 'No le interesa': return theme === 'dark' ? 'bg-red-500/5' : 'bg-red-50/50'
            case 'Spam': return theme === 'dark' ? 'bg-blue-500/5' : 'bg-blue-50/50'
            case 'Reasignada': return theme === 'dark' ? 'bg-purple-500/5' : 'bg-purple-50/50'
            default: return ''
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
            {/* Encabezado de la sección */}
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

            {/* Barra de búsqueda y acciones */}
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

            {/* Tabla de datos del día */}
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
                                        "transition-all duration-200",
                                        getRowBackgroundColor(item.status),
                                        theme === "dark" 
                                            ? "hover:bg-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/20 hover:scale-[1.01]" 
                                            : "hover:bg-emerald-100 hover:shadow-md hover:shadow-emerald-200/50 hover:scale-[1.01]",
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
                                                <option value="Llamando">Llamando</option>
                                                <option value="No contesta">No contesta</option>
                                                <option value="Venta">Venta</option>
                                                <option value="No le interesa">No le interesa</option>
                                                <option value="Spam">Spam</option>
                                                <option value="Reasignada">Reasignada</option>
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
                                                onClick={(e) => openWaModal(item, e.currentTarget)}
                                                className={cn(
                                                    "p-2 rounded-lg transition-colors",
                                                    theme === "dark" ? "bg-green-500/20 text-green-400 hover:bg-green-500/30" : "bg-green-100 text-green-600 hover:bg-green-200"
                                                )}
                                                title="Enviar WhatsApp"
                                            >
                                                <MessageCircle className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => openReassignModal(item)}
                                                className={cn(
                                                    "p-2 rounded-lg transition-colors",
                                                    theme === "dark" ? "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30" : "bg-purple-100 text-purple-600 hover:bg-purple-200"
                                                )}
                                                title="Reasignar a Supervisor"
                                            >
                                                <UserPlus className="w-4 h-4" />
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

            {/* Modal de WhatsApp */}
            {waModalOpen && selectedLead && (
                <div 
                    className="absolute z-50 left-1/2 -translate-x-1/2 p-4"
                    style={{ top: `${modalScrollTop + 50}px` }}
                >
                    <div
                        className={cn(
                            "w-[420px] rounded-2xl border p-5 shadow-2xl animate-scale-in",
                            theme === "dark" 
                                ? "bg-[#1a1b26] border-white/10 shadow-black/50" 
                                : "bg-white border-gray-200 shadow-xl shadow-gray-400/30"
                        )}
                    >
                        {/* Encabezado del modal */}
                        <div className="flex items-center justify-between mb-4">
                            <h3 className={cn("text-base font-semibold flex items-center gap-2", theme === "dark" ? "text-white" : "text-gray-800")}>
                                <MessageCircle className="w-5 h-5 text-green-500" />
                                Enviar WhatsApp
                            </h3>
                            <button onClick={() => { setWaModalOpen(false); setShowSaveTemplate(false) }} className="text-gray-500 hover:text-gray-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Información del destinatario */}
                        <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                            <p className={cn("text-sm", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                                Para: <span className="font-semibold text-green-600">{selectedLead.affiliate.nombre}</span>
                            </p>
                            <p className={cn("text-xs mt-1", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                                📱 {selectedLead.affiliate.telefono1}
                            </p>
                        </div>

                        {/* Selector de plantillas de mensaje */}
                        {waTemplates.length > 0 && (
                            <div className="mb-3">
                                <label className={cn("text-xs font-medium mb-1.5 block", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                                    📋 Plantillas guardadas
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {waTemplates.map(template => (
                                        <div key={template.id} className="flex items-center gap-1">
                                            <button
                                                onClick={() => applyTemplate(template)}
                                                className={cn(
                                                    "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors",
                                                    theme === "dark" 
                                                        ? "bg-purple-500/20 text-purple-300 hover:bg-purple-500/30" 
                                                        : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                                                )}
                                            >
                                                {template.name}
                                            </button>
                                            <button
                                                onClick={() => deleteTemplate(template.id)}
                                                className="text-red-400 hover:text-red-500 p-0.5"
                                                title="Eliminar plantilla"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <p className={cn("text-[10px] mt-1.5 italic", theme === "dark" ? "text-gray-500" : "text-gray-400")}>
                                    Tip: Usa {"{nombre}"} y {"{telefono}"} como variables
                                </p>
                            </div>
                        )}

                        {/* Campo de texto del mensaje */}
                        <div className="mb-4">
                            <label className={cn("text-xs font-medium mb-1.5 block", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                                ✉️ Mensaje
                            </label>
                            <textarea
                                value={waMessage}
                                onChange={(e) => setWaMessage(e.target.value)}
                                rows={5}
                                className={cn(
                                    "w-full p-3 rounded-lg border text-sm resize-none focus:ring-2 focus:ring-green-500/50 outline-none",
                                    theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-800"
                                )}
                                placeholder="Escribe tu mensaje aquí..."
                            />
                        </div>

                        {/* Guardar mensaje como plantilla */}
                        {showSaveTemplate ? (
                            <div className="mb-4 p-3 rounded-lg border border-dashed border-purple-400/50 bg-purple-500/5">
                                <label className={cn("text-xs font-medium mb-1.5 block", theme === "dark" ? "text-purple-300" : "text-purple-600")}>
                                    Nombre de la plantilla
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newTemplateName}
                                        onChange={(e) => setNewTemplateName(e.target.value)}
                                        placeholder="Ej: Saludo inicial"
                                        className={cn(
                                            "flex-1 px-3 py-1.5 rounded-lg border text-xs outline-none focus:ring-2 focus:ring-purple-500/50",
                                            theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200"
                                        )}
                                    />
                                    <button
                                        onClick={addTemplate}
                                        disabled={!newTemplateName.trim()}
                                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50"
                                    >
                                        Guardar
                                    </button>
                                    <button
                                        onClick={() => { setShowSaveTemplate(false); setNewTemplateName("") }}
                                        className={cn("px-2 py-1.5 rounded-lg text-xs", theme === "dark" ? "text-gray-400 hover:text-gray-300" : "text-gray-500 hover:text-gray-700")}
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowSaveTemplate(true)}
                                disabled={!waMessage.trim()}
                                className={cn(
                                    "w-full mb-4 px-3 py-2 rounded-lg text-xs font-medium transition-colors border border-dashed",
                                    theme === "dark" 
                                        ? "border-purple-500/30 text-purple-400 hover:bg-purple-500/10 disabled:opacity-40" 
                                        : "border-purple-300 text-purple-600 hover:bg-purple-50 disabled:opacity-40"
                                )}
                            >
                                💾 Guardar mensaje como plantilla
                            </button>
                        )}

                        {/* Botones de acción del modal */}
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => { setWaModalOpen(false); setShowSaveTemplate(false) }}
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
                                    "flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors",
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
                                        Enviar WhatsApp
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de reasignación a supervisor */}
            {reassignModalOpen && selectedLead && (
                <div 
                    className="absolute z-50 left-1/2 -translate-x-1/2 p-4"
                    style={{ top: `${modalScrollTop + 100}px` }}
                >
                    <div
                        className={cn(
                            "w-full max-w-md rounded-2xl border p-6 shadow-2xl animate-scale-in",
                            theme === "dark" 
                                ? "bg-[#1a1b26] border-white/10 shadow-black/50" 
                                : "bg-white border-gray-200 shadow-xl shadow-gray-400/30"
                        )}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className={cn("text-lg font-semibold flex items-center gap-2", theme === "dark" ? "text-white" : "text-gray-800")}>
                                <Users className="w-5 h-5 text-purple-500" />
                                Reasignar a Supervisor
                            </h3>
                            <button onClick={() => setReassignModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="mb-4 p-3 rounded-lg bg-purple-50 border border-purple-100">
                            <p className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                                Lead: <span className="font-semibold text-purple-600">{selectedLead.affiliate.nombre}</span>
                            </p>
                            <p className={cn("text-xs mt-1", theme === "dark" ? "text-gray-500" : "text-gray-500")}>
                                Tel: {selectedLead.affiliate.telefono1} | CUIL: {selectedLead.affiliate.cuil}
                            </p>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className={cn("text-sm font-medium mb-2 block", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                                    Supervisor destino *
                                </label>
                                <select
                                    value={selectedSupervisor}
                                    onChange={(e) => setSelectedSupervisor(e.target.value)}
                                    className={cn(
                                        "w-full p-3 rounded-lg border text-sm focus:ring-2 focus:ring-purple-500/50 outline-none",
                                        theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-800"
                                    )}
                                >
                                    <option value="">Seleccionar supervisor...</option>
                                    {supervisors.map(sup => (
                                        <option key={sup._id} value={sup._id}>{sup.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className={cn("text-sm font-medium mb-2 block", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                                    <Clock className="w-4 h-4 inline mr-1" />
                                    Hora sugerida para llamar (opcional)
                                </label>
                                <input
                                    type="time"
                                    value={reassignHour}
                                    onChange={(e) => setReassignHour(e.target.value)}
                                    className={cn(
                                        "w-full p-3 rounded-lg border text-sm focus:ring-2 focus:ring-purple-500/50 outline-none",
                                        theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-800"
                                    )}
                                />
                            </div>

                            <div>
                                <label className={cn("text-sm font-medium mb-2 block", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                                    Nota / Motivo (opcional)
                                </label>
                                <textarea
                                    value={reassignNote}
                                    onChange={(e) => setReassignNote(e.target.value)}
                                    rows={3}
                                    className={cn(
                                        "w-full p-3 rounded-lg border text-sm resize-none focus:ring-2 focus:ring-purple-500/50 outline-none",
                                        theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-800"
                                    )}
                                    placeholder="Ej: Cliente disponible después de las 15hs..."
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setReassignModalOpen(false)}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                    theme === "dark" ? "hover:bg-white/10 text-gray-300" : "hover:bg-gray-100 text-gray-600"
                                )}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleReassign}
                                disabled={reassigning || !selectedSupervisor}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                    "bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                )}
                            >
                                {reassigning ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Reasignando...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-4 h-4" />
                                        Confirmar Reasignación
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
