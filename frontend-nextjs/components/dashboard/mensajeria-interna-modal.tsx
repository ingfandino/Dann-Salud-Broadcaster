/**
 * ============================================================
 * MODAL DE MENSAJERÍA INTERNA (mensajeria-interna-modal.tsx)
 * ============================================================
 * Sistema de mensajes internos entre usuarios.
 * Permite enviar, leer y responder mensajes.
 */

"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth"
import { MessagesSidebar } from "@/components/dashboard/messages/messages-sidebar"
import { MessageList } from "@/components/dashboard/messages/message-list"
import { MessageDetail } from "@/components/dashboard/messages/message-detail"
import { ComposeModal } from "@/components/dashboard/messages/compose-modal"
import { api } from "@/lib/api"
import { InternalMessage } from "@/types/internal-message"
import { toast } from "sonner"
import { useSocket } from "@/lib/socket"

interface MensajeriaInternaModalProps {
  isOpen: boolean
  onClose: () => void
}

export function MensajeriaInternaModal({ isOpen, onClose }: MensajeriaInternaModalProps) {
  const { theme } = useTheme()
  const socket = useSocket()

  const [view, setView] = useState<'inbox' | 'sent' | 'starred'>('inbox')
  const [selectedMessage, setSelectedMessage] = useState<InternalMessage | null>(null)
  const [isComposeOpen, setIsComposeOpen] = useState(false)
  const [composeData, setComposeData] = useState<any>(undefined)

  const [messages, setMessages] = useState<InternalMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [unreadCount, setUnreadCount] = useState(0)

  const [selectedIds, setSelectedIds] = useState<string[]>([])

  useEffect(() => {
    if (isOpen) {
      loadMessages()
      loadUnreadCount()
    }
  }, [isOpen, view, pagination.page])

  // Listen for new messages via socket
  useEffect(() => {
    if (socket && isOpen) {
      socket.on('new_message', (msg: any) => {
        toast.info(`Nuevo mensaje de ${msg.from.nombre}: ${msg.subject}`)
        loadUnreadCount()
        if (view === 'inbox') loadMessages()
      })

      socket.on('message_read', () => {
        if (view === 'sent') loadMessages()
      })
    }
    return () => {
      if (socket) {
        socket.off('new_message')
        socket.off('message_read')
      }
    }
  }, [socket, view, isOpen])

  const loadMessages = async () => {
    setLoading(true)
    try {
      let response;
      const params = { page: pagination.page, limit: 20 }

      if (view === 'inbox') {
        response = await api.internalMessages.getInbox(params)
      } else if (view === 'sent') {
        response = await api.internalMessages.getSent(params)
      } else if (view === 'starred') {
        response = await api.internalMessages.getStarred(params)
      }

      if (response) {
        setMessages(response.data.messages)
        setPagination(prev => ({
          ...prev,
          pages: response.data.pagination.pages,
          total: response.data.pagination.total
        }))
      }
    } catch (error) {
      console.error("Error loading messages:", error)
      toast.error("Error al cargar mensajes")
    } finally {
      setLoading(false)
    }
  }

  const loadUnreadCount = async () => {
    try {
      const response = await api.internalMessages.getUnreadCount()
      setUnreadCount(response.data.unreadCount)
    } catch (error) {
      console.error("Error loading unread count:", error)
    }
  }

  const handleSelectMessage = async (message: InternalMessage) => {
    // If inbox and unread, mark as read
    if (view === 'inbox' && !message.read) {
      try {
        await api.internalMessages.markAsRead(message._id, true)
        setUnreadCount(prev => Math.max(0, prev - 1))
        // Update local state
        setMessages(prev => prev.map(m => m._id === message._id ? { ...m, read: true } : m))
        message.read = true // Update for detail view
      } catch (error) {
        console.error("Error marking as read:", error)
      }
    }
    setSelectedMessage(message)
  }

  const handleToggleStar = async (e: React.MouseEvent, messageId: string) => {
    e.stopPropagation()
    try {
      await api.internalMessages.toggleStarred(messageId)
      // Update local state
      setMessages(prev => prev.map(m => {
        if (m._id === messageId) {
          return { ...m, starred: !m.starred }
        }
        return m
      }))
      if (selectedMessage?._id === messageId) {
        setSelectedMessage(prev => prev ? { ...prev, starred: !prev.starred } : null)
      }
      // If in starred view and unstarred, reload
      if (view === 'starred') {
        loadMessages()
      }
    } catch (error) {
      console.error("Error toggling star:", error)
    }
  }

  const handleDelete = async (ids: string[]) => {
    if (!confirm(`¿Está seguro de eliminar ${ids.length} mensaje(s)?`)) return

    try {
      await Promise.all(ids.map(id => api.internalMessages.delete(id)))
      toast.success("Mensajes eliminados")
      setSelectedIds([])
      if (selectedMessage && ids.includes(selectedMessage._id)) {
        setSelectedMessage(null)
      }
      loadMessages()
    } catch (error) {
      console.error("Error deleting messages:", error)
      toast.error("Error al eliminar mensajes")
    }
  }

  const handleDeleteAll = async () => {
    if (!confirm("¿Está seguro de eliminar TODOS los mensajes? Esta acción no se puede deshacer.")) return

    try {
      await api.internalMessages.deleteAll()
      toast.success("Todos los mensajes eliminados")
      setSelectedIds([])
      loadMessages()
    } catch (error) {
      console.error("Error deleting all messages:", error)
      toast.error("Error al eliminar todos los mensajes")
    }
  }

  const handleCompose = () => {
    setComposeData(undefined)
    setIsComposeOpen(true)
  }

  const handleReply = () => {
    if (!selectedMessage) return
    setComposeData({
      to: [selectedMessage.from._id],
      subject: `RE: ${selectedMessage.subject}`,
      replyTo: selectedMessage._id,
      content: `\n\n--- En respuesta a ---\nFecha: ${new Date(selectedMessage.createdAt).toLocaleString()}\nDe: ${selectedMessage.from.nombre}\nAsunto: ${selectedMessage.subject}\n\n${selectedMessage.content}`
    })
    setIsComposeOpen(true)
  }

  const handleForward = () => {
    if (!selectedMessage) return
    setComposeData({
      subject: `FW: ${selectedMessage.subject}`,
      content: `\n\n--- Mensaje reenviado ---\nFecha: ${new Date(selectedMessage.createdAt).toLocaleString()}\nDe: ${selectedMessage.from.nombre}\nAsunto: ${selectedMessage.subject}\n\n${selectedMessage.content}`,
      isForward: true
    })
    setIsComposeOpen(true)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      {/* Modal */}
      <div
        className={cn(
          "relative w-full max-w-6xl h-[85vh] overflow-hidden rounded-2xl border shadow-2xl animate-scale-in flex flex-col",
          theme === "dark"
            ? "bg-gradient-to-br from-[#1a1333] to-[#0f0a1e] border-white/10"
            : "bg-gradient-to-br from-white to-[#FAF7F2] border-purple-200/50",
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "flex items-center justify-between p-4 border-b flex-shrink-0",
            theme === "dark" ? "border-white/10" : "border-purple-100",
          )}
        >
          <div className="flex items-center gap-2">
            <h2 className={cn("text-lg font-semibold", theme === "dark" ? "text-white" : "text-gray-700")}>
              Mensajería Interna
            </h2>
          </div>
          <button
            onClick={onClose}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              theme === "dark" ? "hover:bg-white/10 text-gray-400" : "hover:bg-purple-100 text-gray-500",
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          <MessagesSidebar
            currentView={view}
            onViewChange={(v) => {
              setView(v)
              setSelectedMessage(null)
              setPagination({ ...pagination, page: 1 })
            }}
            onCompose={handleCompose}
            unreadCount={unreadCount}
          />

          <div className="flex-1 flex flex-col min-w-0 border-l border-opacity-10 dark:border-white/10 border-gray-200">
            {selectedMessage ? (
              <MessageDetail
                message={selectedMessage}
                onBack={() => setSelectedMessage(null)}
                onReply={handleReply}
                onForward={handleForward}
                onDelete={() => handleDelete([selectedMessage._id])}
                onToggleStar={() => handleToggleStar({ stopPropagation: () => { } } as any, selectedMessage._id)}
              />
            ) : (
              <MessageList
                messages={messages}
                loading={loading}
                view={view}
                onSelectMessage={handleSelectMessage}
                onToggleStar={handleToggleStar}
                onDelete={handleDelete}
                selectedIds={selectedIds}
                onToggleSelect={(id) => {
                  setSelectedIds(prev =>
                    prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
                  )
                }}
                onToggleSelectAll={() => {
                  if (selectedIds.length === messages.length) {
                    setSelectedIds([])
                  } else {
                    setSelectedIds(messages.map(m => m._id))
                  }
                }}
                onDeleteAll={handleDeleteAll}
                pagination={pagination}
                onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
              />
            )}
          </div>
        </div>

        <ComposeModal
          isOpen={isComposeOpen}
          onClose={() => setIsComposeOpen(false)}
          initialData={composeData}
          onSent={() => {
            if (view === 'sent') loadMessages()
          }}
        />
      </div>
    </div>
  )
}
