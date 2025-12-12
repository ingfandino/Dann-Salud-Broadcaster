"use client"

import { useState } from "react"
import { InternalMessage } from "@/types/internal-message"
import { useTheme } from "../theme-provider"
import { cn } from "@/lib/utils"
import { Star, Paperclip, Trash2 } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"

interface MessageListProps {
    messages: InternalMessage[]
    loading: boolean
    view: 'inbox' | 'sent' | 'starred'
    onSelectMessage: (message: InternalMessage) => void
    onToggleStar: (e: React.MouseEvent, messageId: string) => void
    onDelete: (ids: string[]) => void
    selectedIds: string[]
    onToggleSelect: (id: string) => void
    onToggleSelectAll: () => void
    onDeleteAll: () => void
    pagination: {
        page: number;
        pages: number;
        total: number;
    }
    onPageChange: (page: number) => void
}

export function MessageList({
    messages,
    loading,
    view,
    onSelectMessage,
    onToggleStar,
    onDelete,
    selectedIds,
    onToggleSelect,
    onToggleSelectAll,
    onDeleteAll,
    pagination,
    onPageChange
}: MessageListProps) {
    const { theme } = useTheme()

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Cargando mensajes...</div>
    }

    if (messages.length === 0) {
        return <div className="p-8 text-center text-gray-500">No hay mensajes</div>
    }

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className={cn(
                "flex items-center justify-between px-4 py-2 border-b",
                theme === "dark" ? "border-white/10" : "border-gray-200"
            )}>
                <div className="flex items-center gap-4">
                    <Checkbox
                        checked={selectedIds.length === messages.length && messages.length > 0}
                        onCheckedChange={onToggleSelectAll}
                    />
                    {selectedIds.length > 0 ? (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(selectedIds)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Eliminar ({selectedIds.length})
                        </Button>
                    ) : (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onDeleteAll}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Eliminar todo
                        </Button>
                    )}
                </div>
                <div className="text-xs text-gray-500">
                    {pagination.total} mensajes
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
                {messages.map((message) => {
                    const isSelected = selectedIds.includes(message._id)
                    const isRead = view === 'sent' ? true : message.read

                    return (
                        <div
                            key={message._id}
                            className={cn(
                                "flex items-center gap-4 px-4 py-3 border-b cursor-pointer transition-colors group",
                                theme === "dark"
                                    ? "border-white/5 hover:bg-white/5"
                                    : "border-gray-100 hover:bg-gray-50",
                                isSelected && (theme === "dark" ? "bg-purple-900/20" : "bg-purple-50"),
                                !isRead && (theme === "dark" ? "bg-white/5 font-medium" : "bg-white font-medium")
                            )}
                            onClick={() => onSelectMessage(message)}
                        >
                            <div onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => onToggleSelect(message._id)}
                                />
                            </div>

                            <button
                                onClick={(e) => onToggleStar(e, message._id)}
                                className={cn(
                                    "text-gray-400 hover:text-yellow-400 transition-colors",
                                    message.starred && "text-yellow-400"
                                )}
                            >
                                <Star className={cn("w-4 h-4", message.starred && "fill-current")} />
                            </button>

                            <div className={cn(
                                "w-48 truncate",
                                !isRead && "font-bold",
                                theme === "dark" ? "text-gray-200" : "text-gray-900"
                            )}>
                                {view === 'sent'
                                    ? `Para: ${message.to.nombre}`
                                    : message.from.nombre
                                }
                            </div>

                            <div className="flex-1 min-w-0 flex items-center gap-2">
                                <span className={cn(
                                    "truncate",
                                    !isRead && "font-bold",
                                    theme === "dark" ? "text-gray-200" : "text-gray-900"
                                )}>
                                    {message.subject}
                                </span>
                                <span className={cn(
                                    "truncate text-sm",
                                    theme === "dark" ? "text-gray-500" : "text-gray-500"
                                )}>
                                    - {message.content.substring(0, 100)}
                                </span>
                                {message.attachments.length > 0 && (
                                    <Paperclip className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                )}
                            </div>

                            <div className={cn(
                                "text-xs whitespace-nowrap",
                                !isRead ? "text-purple-500 font-bold" : "text-gray-500"
                            )}>
                                {new Date(message.createdAt).toLocaleDateString()}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
                <div className={cn(
                    "p-4 border-t flex justify-center gap-2",
                    theme === "dark" ? "border-white/10" : "border-gray-200"
                )}>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={pagination.page === 1}
                        onClick={() => onPageChange(pagination.page - 1)}
                    >
                        Anterior
                    </Button>
                    <span className="flex items-center text-sm text-gray-500">
                        Página {pagination.page} de {pagination.pages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={pagination.page === pagination.pages}
                        onClick={() => onPageChange(pagination.page + 1)}
                    >
                        Siguiente
                    </Button>
                </div>
            )}
        </div>
    )
}
