"use client"

import { InternalMessage } from "@/types/internal-message"
import { useTheme } from "../theme-provider"
import { cn } from "@/lib/utils"
import { ArrowLeft, Reply, Forward, Trash2, Paperclip, Download, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { toast } from "sonner"

interface MessageDetailProps {
    message: InternalMessage
    onBack: () => void
    onReply: () => void
    onForward: () => void
    onDelete: () => void
    onToggleStar: () => void
}

export function MessageDetail({ message, onBack, onReply, onForward, onDelete, onToggleStar }: MessageDetailProps) {
    const { theme } = useTheme()

    const handleDownload = async (attachment: InternalMessage['attachments'][0]) => {
        try {
            const response = await api.internalMessages.downloadAttachment(message._id, attachment._id)
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', attachment.originalName)
            document.body.appendChild(link)
            link.click()
            link.remove()
        } catch (error) {
            console.error("Error downloading attachment:", error)
            toast.error("Error al descargar el archivo")
        }
    }

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className={cn(
                "flex items-center justify-between px-4 py-3 border-b",
                theme === "dark" ? "border-white/10" : "border-gray-200"
            )}>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={onBack}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={onReply}>
                            <Reply className="w-4 h-4 mr-2" />
                            Responder
                        </Button>
                        <Button variant="ghost" size="sm" onClick={onForward}>
                            <Forward className="w-4 h-4 mr-2" />
                            Reenviar
                        </Button>
                        <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Eliminar
                        </Button>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onToggleStar}>
                    <Star className={cn("w-5 h-5", message.starred ? "fill-yellow-400 text-yellow-400" : "text-gray-400")} />
                </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Header */}
                <div className="space-y-4">
                    <h1 className={cn("text-2xl font-bold", theme === "dark" ? "text-white" : "text-gray-900")}>
                        {message.subject}
                    </h1>

                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold",
                                theme === "dark" ? "bg-purple-600" : "bg-[#00C794]"
                            )}>
                                {message.from.nombre.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <div className={cn("font-medium", theme === "dark" ? "text-white" : "text-gray-900")}>
                                    {message.from.nombre} <span className="text-gray-500 font-normal">&lt;{message.from.email}&gt;</span>
                                </div>
                                <div className="text-sm text-gray-500">
                                    Para: {message.to.nombre}
                                </div>
                            </div>
                        </div>
                        <div className="text-sm text-gray-500">
                            {new Date(message.createdAt).toLocaleString()}
                        </div>
                    </div>
                </div>

                <hr className={cn(theme === "dark" ? "border-white/10" : "border-gray-200")} />

                {/* Body */}
                <div className={cn(
                    "whitespace-pre-wrap leading-relaxed",
                    theme === "dark" ? "text-gray-200" : "text-gray-800"
                )}>
                    {message.content}
                </div>

                {/* Attachments */}
                {message.attachments.length > 0 && (
                    <div className="pt-6">
                        <h3 className={cn("text-sm font-medium mb-3 flex items-center gap-2", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                            <Paperclip className="w-4 h-4" />
                            Adjuntos ({message.attachments.length})
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {message.attachments.map((att) => (
                                <div
                                    key={att._id}
                                    className={cn(
                                        "flex items-center justify-between p-3 rounded-lg border",
                                        theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-gray-200"
                                    )}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={cn(
                                            "w-8 h-8 rounded flex items-center justify-center flex-shrink-0",
                                            theme === "dark" ? "bg-white/10" : "bg-gray-100"
                                        )}>
                                            <span className="text-xs font-bold uppercase">{att.originalName.split('.').pop()}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className={cn("text-sm font-medium truncate", theme === "dark" ? "text-gray-200" : "text-gray-800")}>
                                                {att.originalName}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {(att.size / 1024).toFixed(1)} KB
                                            </p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => handleDownload(att)}>
                                        <Download className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
