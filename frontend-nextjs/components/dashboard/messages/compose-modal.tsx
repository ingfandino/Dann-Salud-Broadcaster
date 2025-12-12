"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { useTheme } from "../theme-provider"
import { cn } from "@/lib/utils"
import { X, Paperclip, Send, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { InternalMessage } from "@/types/internal-message"

interface ComposeModalProps {
    isOpen: boolean
    onClose: () => void
    initialData?: {
        to?: string[]
        subject?: string
        content?: string
        replyTo?: string
        isForward?: boolean
    }
    onSent: () => void
}

interface Recipient {
    _id: string
    nombre: string
    email: string
    role: string
    numeroEquipo?: string
}

export function ComposeModal({ isOpen, onClose, initialData, onSent }: ComposeModalProps) {
    const { theme } = useTheme()
    const [sendMode, setSendMode] = useState<'users' | 'roles'>('users')
    const [selectedRoles, setSelectedRoles] = useState<string[]>([])

    const availableRoles = [
        { id: 'admin', label: 'Administrador' },
        { id: 'gerencia', label: 'Gerencia' },
        { id: 'supervisor', label: 'Supervisor' },
        { id: 'asesor', label: 'Asesor' },
        { id: 'auditor', label: 'Auditor' },
        { id: 'rr.hh', label: 'RR.HH' },
        { id: 'administrativo', label: 'Administrativo' },
    ]

    const [recipients, setRecipients] = useState<Recipient[]>([])
    const [selectedRecipients, setSelectedRecipients] = useState<Recipient[]>([])
    const [searchQuery, setSearchQuery] = useState("")

    const [subject, setSubject] = useState(initialData?.subject || "")
    const [content, setContent] = useState(initialData?.content || "")
    const [attachments, setAttachments] = useState<File[]>([])
    const [sending, setSending] = useState(false)

    // Load recipients if needed (for now just load all or search)
    useEffect(() => {
        if (isOpen) {
            loadRecipients()
            if (initialData) {
                setSubject(initialData.subject || "")
                setContent(initialData.content || "")
                // If we have initial 'to' IDs, we might want to pre-select them, 
                // but for reply/forward usually we just set the ID.
                // For simplicity in this version, we'll handle single recipient replies directly.
            }
        }
    }, [isOpen, initialData])

    const loadRecipients = async (q = "") => {
        try {
            const response = await api.internalMessages.getRecipients(q)
            setRecipients(response.data)

            // Pre-select if initialData has 'to' and we can find them
            if (initialData?.to && initialData.to.length > 0) {
                const preSelected = response.data.filter((r: Recipient) => initialData.to?.includes(r._id))
                setSelectedRecipients(prev => {
                    // Avoid duplicates
                    const newRecs = preSelected.filter((r: Recipient) => !prev.find(p => p._id === r._id))
                    return [...prev, ...newRecs]
                })
            }
        } catch (error) {
            console.error("Error loading recipients:", error)
        }
    }

    const handleSend = async () => {
        if (sendMode === 'users' && selectedRecipients.length === 0) {
            toast.error("Seleccione al menos un destinatario")
            return
        }
        if (sendMode === 'roles' && selectedRoles.length === 0) {
            toast.error("Seleccione al menos un rol")
            return
        }
        if (!content.trim()) {
            toast.error("El mensaje no puede estar vacío")
            return
        }

        setSending(true)
        try {
            const formData = new FormData()

            if (sendMode === 'users') {
                selectedRecipients.forEach(r => formData.append('to[]', r._id))
            } else {
                selectedRoles.forEach(r => formData.append('roles[]', r))
            }

            formData.append('subject', subject)
            formData.append('content', content)
            if (initialData?.replyTo) formData.append('replyTo', initialData.replyTo)
            if (initialData?.isForward) formData.append('isForward', 'true')

            attachments.forEach(file => {
                formData.append('attachments', file)
            })

            await api.internalMessages.send(formData)
            toast.success("Mensaje enviado")
            onSent()
            onClose()
        } catch (error) {
            console.error("Error sending message:", error)
            toast.error("Error al enviar el mensaje")
        } finally {
            setSending(false)
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setAttachments(prev => [...prev, ...Array.from(e.target.files!)])
        }
    }

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index))
    }

    const toggleRecipient = (recipient: Recipient) => {
        setSelectedRecipients(prev => {
            if (prev.find(r => r._id === recipient._id)) {
                return prev.filter(r => r._id !== recipient._id)
            } else {
                return [...prev, recipient]
            }
        })
    }

    const toggleRole = (roleId: string) => {
        setSelectedRoles(prev =>
            prev.includes(roleId) ? prev.filter(r => r !== roleId) : [...prev, roleId]
        )
    }

    if (!isOpen) return null

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className={cn(
                "w-full max-w-2xl h-[80vh] flex flex-col rounded-xl shadow-2xl overflow-hidden",
                theme === "dark" ? "bg-[#1a1333] border border-white/10" : "bg-white"
            )}>
                {/* Header */}
                <div className={cn(
                    "flex items-center justify-between px-6 py-4 border-b",
                    theme === "dark" ? "border-white/10" : "border-gray-100"
                )}>
                    <h2 className={cn("text-lg font-semibold", theme === "dark" ? "text-white" : "text-gray-900")}>
                        Nuevo Mensaje
                    </h2>
                    <button onClick={onClose} className={cn("p-2 rounded-lg transition-colors", theme === "dark" ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-500")}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Send Mode Toggle */}
                    <div className="flex gap-4 mb-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="sendMode"
                                checked={sendMode === 'users'}
                                onChange={() => setSendMode('users')}
                                className={cn(
                                    "focus:ring-2",
                                    theme === "dark" ? "text-purple-600 focus:ring-purple-500" : "text-[#00C794] focus:ring-[#00C794]"
                                )}
                            />
                            <span className={cn("text-sm", theme === "dark" ? "text-gray-300" : "text-gray-700")}>Usuarios</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="sendMode"
                                checked={sendMode === 'roles'}
                                onChange={() => setSendMode('roles')}
                                className={cn(
                                    "focus:ring-2",
                                    theme === "dark" ? "text-purple-600 focus:ring-purple-500" : "text-[#00C794] focus:ring-[#00C794]"
                                )}
                            />
                            <span className={cn("text-sm", theme === "dark" ? "text-gray-300" : "text-gray-700")}>Roles (Grupos)</span>
                        </label>
                    </div>

                    {/* Recipients */}
                    <div className="space-y-2">
                        <label className={cn("text-sm font-medium", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                            Para:
                        </label>

                        {sendMode === 'users' ? (
                            <>
                                <div className={cn(
                                    "flex flex-wrap gap-2 p-2 rounded-lg border min-h-[42px]",
                                    theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-gray-200"
                                )}>
                                    {selectedRecipients.map(r => (
                                        <span key={r._id} className={cn(
                                            "text-xs px-2 py-1 rounded-full flex items-center gap-1",
                                            theme === "dark" ? "bg-purple-500/20 text-purple-300" : "bg-[#00C794]/20 text-[#0078A0]"
                                        )}>
                                            {r.nombre}
                                            <button onClick={() => toggleRecipient(r)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                                        </span>
                                    ))}
                                    <input
                                        type="text"
                                        placeholder="Buscar destinatario..."
                                        className="bg-transparent border-none outline-none text-sm flex-1 min-w-[150px]"
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value)
                                            loadRecipients(e.target.value)
                                        }}
                                    />
                                </div>

                                {/* Search Results Dropdown */}
                                {searchQuery && (
                                    <div className={cn(
                                        "max-h-40 overflow-y-auto border rounded-lg",
                                        theme === "dark" ? "bg-[#1a1333] border-white/10" : "bg-white border-gray-200"
                                    )}>
                                        {recipients.filter(r => !selectedRecipients.find(s => s._id === r._id)).map(r => (
                                            <div
                                                key={r._id}
                                                className={cn(
                                                    "px-3 py-2 cursor-pointer text-sm flex items-center justify-between",
                                                    theme === "dark" ? "hover:bg-white/5 text-gray-300" : "hover:bg-gray-50 text-gray-700"
                                                )}
                                                onClick={() => {
                                                    toggleRecipient(r)
                                                    setSearchQuery("")
                                                }}
                                            >
                                                <span>{r.nombre}</span>
                                                <span className="text-xs opacity-50">{r.role}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {availableRoles.map(role => (
                                    <button
                                        key={role.id}
                                        onClick={() => toggleRole(role.id)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-sm border transition-colors",
                                            selectedRoles.includes(role.id)
                                                ? theme === "dark" ? "bg-purple-600 text-white border-purple-600" : "bg-[#00C794] text-white border-[#00C794]"
                                                : theme === "dark"
                                                    ? "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                                                    : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                                        )}
                                    >
                                        {role.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Subject */}
                    <div className="space-y-2">
                        <label className={cn("text-sm font-medium", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                            Asunto:
                        </label>
                        <Input
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Asunto del mensaje"
                            className={cn(theme === "dark" ? "bg-white/5 border-white/10" : "bg-white")}
                        />
                    </div>

                    {/* Content */}
                    <div className="space-y-2 flex-1 flex flex-col">
                        <label className={cn("text-sm font-medium", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                            Mensaje:
                        </label>
                        <Textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Escribe tu mensaje aquí..."
                            className={cn("flex-1 min-h-[200px] resize-none", theme === "dark" ? "bg-white/5 border-white/10" : "bg-white")}
                        />
                    </div>

                    {/* Attachments List */}
                    {attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {attachments.map((file, idx) => (
                                <div key={idx} className={cn(
                                    "flex items-center gap-2 px-3 py-1 rounded-lg text-xs border",
                                    theme === "dark" ? "bg-white/5 border-white/10 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-700"
                                )}>
                                    <Paperclip className="w-3 h-3" />
                                    <span className="max-w-[150px] truncate">{file.name}</span>
                                    <button onClick={() => removeAttachment(idx)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={cn(
                    "px-6 py-4 border-t flex items-center justify-between",
                    theme === "dark" ? "border-white/10" : "border-gray-100"
                )}>
                    <div>
                        <input
                            type="file"
                            id="attachments"
                            multiple
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        <label
                            htmlFor="attachments"
                            className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors",
                                theme === "dark" ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-600"
                            )}
                        >
                            <Paperclip className="w-4 h-4" />
                            Adjuntar archivo
                        </label>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="ghost" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSend}
                            disabled={sending}
                            className={cn(
                                "text-white gap-2",
                                theme === "dark" ? "bg-purple-600 hover:bg-purple-700" : "bg-[#00C794] hover:bg-[#00a87d]"
                            )}
                        >
                            <Send className="w-4 h-4" />
                            {sending ? "Enviando..." : "Enviar"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    )
}
