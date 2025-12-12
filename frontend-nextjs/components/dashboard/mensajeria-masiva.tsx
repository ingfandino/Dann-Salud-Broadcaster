"use client"

import { useState, useEffect } from "react"
import {
  Upload,
  WifiOff,
  MessageCircle,
  Users,
  Save,
  Trash2,
  Eye,
  Clock,
  Package,
  Coffee,
  Calendar,
  Pause,
  Play,
  FileSpreadsheet,
  Bold,
  Italic,
  Smile,
  Sparkles,
  X,
  CheckCheck,
} from "lucide-react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import { AutoRespuestasModal } from "./auto-respuestas-modal"
import { SpintaxModal } from "./spintax-modal"
import { VincularQR } from "./vincular-qr"
import { WhatsAppDisconnectNotification } from "./whatsapp-disconnect-notification"
import { RejectedContactsNotification } from "./rejected-contacts-notification"
import { AutoResponseNotification } from "./auto-response-notification"
import { connectSocket } from "@/lib/socket"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth"
import styles from "./stats-card.module.css"

interface Campaign {
  _id: string
  name: string
  createdBy: {
    nombre: string
    numeroEquipo?: string
  }
  status: string
  progress: number
  sentCount: number
  failedCount: number
  pendingCount: number
  stats?: {
    sent: number
    failed: number
    pending: number
    total: number
  }
  restBreakUntil?: string | Date
  repliesCount?: number
  createdAt: string
}

interface Template {
  _id: string
  nombre: string
  contenido: string
}

const getStatusStyles = (estado: string, theme: string) => {
  const styles: Record<string, { bg: string; text: string }> = {
    running: {
      bg: theme === "dark" ? "bg-blue-500/20" : "bg-blue-100",
      text: theme === "dark" ? "text-blue-400" : "text-blue-600",
    },
    pending: {
      bg: theme === "dark" ? "bg-yellow-500/20" : "bg-yellow-100",
      text: theme === "dark" ? "text-yellow-400" : "text-yellow-600",
    },
    failed: {
      bg: theme === "dark" ? "bg-red-500/20" : "bg-red-100",
      text: theme === "dark" ? "text-red-400" : "text-red-600",
    },
    completed: {
      bg: theme === "dark" ? "bg-green-500/20" : "bg-green-100",
      text: theme === "dark" ? "text-green-400" : "text-green-600",
    },
    completado: {
      bg: theme === "dark" ? "bg-green-500/20" : "bg-green-100",
      text: theme === "dark" ? "text-green-400" : "text-green-600",
    },
    paused: {
      bg: theme === "dark" ? "bg-orange-500/20" : "bg-orange-100",
      text: theme === "dark" ? "text-orange-400" : "text-orange-600",
    },
    pausado: {
      bg: theme === "dark" ? "bg-orange-500/20" : "bg-orange-100",
      text: theme === "dark" ? "text-orange-400" : "text-orange-600",
    },
    ejecutando: {
      bg: theme === "dark" ? "bg-blue-500/20" : "bg-blue-100",
      text: theme === "dark" ? "text-blue-400" : "text-blue-600",
    },
    fallido: {
      bg: theme === "dark" ? "bg-red-500/20" : "bg-red-100",
      text: theme === "dark" ? "text-red-400" : "text-red-600",
    },
    descanso: {
      bg: theme === "dark" ? "bg-blue-500/20" : "bg-blue-100",
      text: theme === "dark" ? "text-blue-400" : "text-blue-600",
    },
  }
  return styles[estado.toLowerCase()] || { bg: theme === "dark" ? "bg-gray-500/20" : "bg-gray-100", text: theme === "dark" ? "text-gray-400" : "text-gray-600" }
}

function mapStatus(status: string): string {
  const statusMap: Record<string, string> = {
    running: "ejecutando",
    completed: "completado",
    failed: "fallido",
    paused: "pausado",
    pending: "ejecutando",
    resting: "descanso",
  }
  return statusMap[status.toLowerCase()] || status
}

export function MensajeriaMasiva() {
  const { theme } = useTheme()
  const { user } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(false)
  const [campaignName, setCampaignName] = useState("")
  const [template, setTemplate] = useState("")
  const [message, setMessage] = useState("")
  const [tiempoMin, setTiempoMin] = useState("60")
  const [tiempoMax, setTiempoMax] = useState("90")
  const [tamanoLote, setTamanoLote] = useState("15")
  const [descanso, setDescanso] = useState("25")
  const [fechaEnvio, setFechaEnvio] = useState("")
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0])
  const [isAutoRespuestasOpen, setIsAutoRespuestasOpen] = useState(false)
  const [showVincularQR, setShowVincularQR] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadedContacts, setUploadedContacts] = useState<any[]>([])
  const [rejectedFileId, setRejectedFileId] = useState<string | null>(null)
  const [uploadStats, setUploadStats] = useState<any>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState<any>(null)
  const [isWhatsAppConnected, setIsWhatsAppConnected] = useState<boolean | null>(null)
  const [checkingConnection, setCheckingConnection] = useState(true)

  // ✅ New states for dynamic buttons and text formatting
  const [importHeaders, setImportHeaders] = useState<string[]>([])
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showSpintaxModal, setShowSpintaxModal] = useState(false)
  const [showDisconnectNotification, setShowDisconnectNotification] = useState(false)
  const [showRejectedAlert, setShowRejectedAlert] = useState(false)
  const [rejectedCount, setRejectedCount] = useState(0)
  const [autoResponseNotification, setAutoResponseNotification] = useState<any>(null)

  const [metrics, setMetrics] = useState({
    mensajesHoy: 0,
    usuariosActivos: 0,
    contactosCargados: 0
  })

  // ✅ Emoji picker options
  const emojis = [
    "😀", "😃", "😄", "😉", "😊", "😍", "🤩", "😎", "😁", "😂",
    "🙌", "👍", "💪", "🎉", "🎯", "✨", "📞", "📲", "📅", "🕒",
    "💬", "✅", "❌", "⚠️", "📍", "📌", "🔔", "🚀", "💡", "🧾"
  ]

  useEffect(() => {
    // Get socket instance (already initialized in layout)
    const socket = connectSocket()

    // Check initial WhatsApp connection status
    const checkWhatsAppConnection = async () => {
      try {
        const response = await api.whatsapp.status()
        setIsWhatsAppConnected(response.data?.connected || false)
        setCheckingConnection(false)

        if (!response.data?.connected) {
          setShowVincularQR(true)
        }
      } catch (error) {
        console.error("[MensajeriaMasiva] Error checking WhatApp status:", error)
        setIsWhatsAppConnected(false)
        setCheckingConnection(false)
        setShowVincularQR(true)
      }
    }

    checkWhatsAppConnection()

    // Listen for WhatsApp disconnection events
    socket.on('whatsapp:disconnected', (data) => {
      console.log('[MensajeriaMasiva] WhatsApp disconnected:', data)
      setIsWhatsAppConnected(false)
      setShowDisconnectNotification(true)
      toast.error('WhatsApp desconectado - Las campañas se han detenido')
    })

    // ✅ Listen for campaign updates
    socket.emit('jobs:subscribe')

    socket.on('jobs:update', (updatedJob: any) => {
      console.log('[MensajeriaMasiva] Job update received:', updatedJob)

      setCampaigns(prevCampaigns => {
        // Case 1: Job deleted/cancelled
        if (updatedJob.deleted || (updatedJob.status === 'cancelado' && !prevCampaigns.find(c => c._id === updatedJob._id))) {
          return prevCampaigns.filter(c => c._id !== updatedJob._id)
        }

        // Case 2: Update existing job
        const exists = prevCampaigns.some(c => c._id === updatedJob._id)
        if (exists) {
          return prevCampaigns.map(c => c._id === updatedJob._id ? { ...c, ...updatedJob } : c)
        }

        // Case 3: New job
        return [updatedJob, ...prevCampaigns]
      })

      // Also refresh metrics if job status changes
      fetchMetrics()
    })

    // ✅ Listen for auto-responses
    socket.on('auto_response:sent', (data) => {
      console.log('[MensajeriaMasiva] Auto-response sent:', data)
      setAutoResponseNotification(data)
      // Auto-dismiss after 5 seconds
      setTimeout(() => setAutoResponseNotification(null), 5000)
    })

    // ✅ Listen for real-time job progress
    socket.on('job:progress', (progressData: any) => {
      console.log('[MensajeriaMasiva] Job progress received:', progressData)

      setCampaigns(prevCampaigns => {
        // Find if the job exists in our list - try multiple ID formats
        const jobId = progressData._id || progressData.jobId
        if (!jobId) {
          console.warn('[MensajeriaMasiva] Progress data missing job ID:', progressData)
          return prevCampaigns
        }

        const index = prevCampaigns.findIndex(c => c._id === jobId || c._id.toString() === jobId.toString())
        if (index === -1) {
          console.warn('[MensajeriaMasiva] Job not found in campaigns:', jobId)
          return prevCampaigns
        }

        // Create a new array to trigger re-render
        const newCampaigns = [...prevCampaigns]
        const campaign = newCampaigns[index]

        console.log('[MensajeriaMasiva] Updating campaign:', campaign.name, 'Progress:', progressData.stats)

        // Calculate delta for metrics update
        const oldSent = campaign.stats?.sent || 0
        const newSent = progressData.stats?.sent ?? oldSent
        const sentDelta = newSent - oldSent

        // Update global metrics if there's a change
        if (sentDelta > 0) {
          console.log('[MensajeriaMasiva] Updating global metrics. Delta:', sentDelta)
          setMetrics(prev => ({
            ...prev,
            mensajesHoy: prev.mensajesHoy + sentDelta
          }))
        }

        // Update stats and status with proper fallbacks
        newCampaigns[index] = {
          ...campaign,
          status: progressData.status || campaign.status,
          sentCount: newSent,
          failedCount: progressData.stats?.failed ?? campaign.failedCount,
          pendingCount: progressData.stats?.pending ?? campaign.pendingCount,
          repliesCount: progressData.repliesCount ?? campaign.repliesCount,
          stats: {
            sent: newSent,
            failed: progressData.stats?.failed ?? campaign.stats?.failed ?? 0,
            pending: progressData.stats?.pending ?? campaign.stats?.pending ?? 0,
            total: campaign.stats?.total ?? 0
          }
        }

        // 🚨 Show disconnect notification if campaign enters 'pendiente' status
        if (progressData.status === 'pendiente' && campaign.status !== 'pendiente') {
          setShowDisconnectNotification(true)
          toast.error('Campaña en estado Pendiente - Revisa la conexión de WhatsApp')
        }

        return newCampaigns
      })
    })

    // ✅ Listen for new replies
    socket.on('campaign:reply', (data: any) => {
      console.log('[MensajeriaMasiva] Reply received:', data)

      setCampaigns(prevCampaigns => {
        const index = prevCampaigns.findIndex(c => c._id === data.campaignId)
        if (index === -1) return prevCampaigns

        const newCampaigns = [...prevCampaigns]
        const campaign = newCampaigns[index]

        newCampaigns[index] = {
          ...campaign,
          repliesCount: (campaign.repliesCount || 0) + 1
        }

        return newCampaigns
      })
    })

    fetchCampaigns()
    fetchTemplates()
    fetchMetrics()

    return () => {
      socket.off('whatsapp:disconnected')
      socket.off('jobs:update')
      socket.off('auto_response:sent')
      socket.off('job:progress')
      socket.off('campaign:reply')
      socket.emit('jobs:unsubscribe')
    }
  }, [])

  const checkWhatsAppStatus = async () => {
    try {
      const response = await api.whatsapp.status()
      const connected = response.data?.connected || false
      setIsWhatsAppConnected(connected)

      // Si no está conectado, redirigir a la página de vinculación
      if (!connected) {
        setShowVincularQR(true)
      }
    } catch (error) {
      console.error("Error checking WhatsApp status:", error)
      setIsWhatsAppConnected(false)
      setShowVincularQR(true)
    }
  }

  const fetchMetrics = async () => {
    try {
      const response = await api.metrics.dashboard()
      setMetrics(response.data)
    } catch (error) {
      console.error("Error fetching metrics:", error)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploadedFile(file)
      const response = await api.contacts.upload(file)

      if (response.data) {
        const { contacts, resumen, rejectedFileId, headers } = response.data

        // Guardar contactos y estadísticas
        setUploadedContacts(contacts || [])
        setUploadStats(resumen)
        setRejectedFileId(rejectedFileId)

        // ✅ Extract and set headers for dynamic buttons
        if (headers && headers.length > 0) {
          console.log("[MensajeriaMasiva] Headers from backend:", headers)
          setImportHeaders(headers)
        } else if (contacts && contacts.length > 0) {
          // Fallback: extract headers from first contact's extraData
          const firstContact = contacts[0]
          const extractedHeaders = Object.keys(firstContact.extraData || {})
          console.log("[MensajeriaMasiva] Headers from first contact:", extractedHeaders)
          setImportHeaders(extractedHeaders)
        }

        // Mostrar mensaje de éxito con estadísticas
        const accepted = resumen?.accepted || 0
        const rejected = resumen?.rejected || 0

        if (rejected > 0) {
          setRejectedCount(rejected)
          setShowRejectedAlert(true)
          toast.success(`✅ ${accepted} afiliados cargados correctamente`)
        } else {
          toast.success(`✅ ${accepted} afiliados cargados correctamente`)
        }
      }
    } catch (error: any) {
      console.error("Error uploading contacts:", error)
      toast.error(error.response?.data?.message || "Error al cargar contactos")
      setUploadedFile(null)
      setUploadedContacts([])
      setUploadStats(null)
      setRejectedFileId(null)
      setImportHeaders([]) // ✅ Clear headers on error
    }
  }

  const fetchCampaigns = async () => {
    try {
      const response = await api.sendJobs.list()
      setCampaigns(response.data || [])
    } catch (error) {
      console.error("Error fetching campaigns:", error)
      toast.error("Error al cargar campañas")
    }
  }

  const fetchTemplates = async () => {
    try {
      const response = await api.templates.list()
      setTemplates(response.data || [])
    } catch (error) {
      console.error("Error fetching templates:", error)
      toast.error("Error al cargar plantillas")
    }
  }

  // ✅ Text formatting: Insert text at cursor position
  const insertAtCursor = (before: string, after: string = "") => {
    const textarea = document.querySelector<HTMLTextAreaElement>("textarea[name='mensaje']")
    if (!textarea) {
      console.warn("[insertAtCursor] Textarea not found")
      return
    }

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = message
    const selectedText = text.substring(start, end)
    const newText = text.substring(0, start) + before + selectedText + after + text.substring(end)

    setMessage(newText)

    // Restore cursor position
    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + before.length + selectedText.length + after.length
      textarea.selectionStart = newCursorPos
      textarea.selectionEnd = newCursorPos
    }, 0)
  }

  // ✅ Filter phone-like headers for dynamic buttons
  const phoneLike = new Set(["telefono", "phone", "celular", "telefono1", "telefonocelular", "movil"])
  const fieldButtons = importHeaders.filter(h => h && !phoneLike.has(String(h).toLowerCase()))

  const handleTemplateChange = (templateId: string) => {
    setTemplate(templateId)
    if (templateId) {
      const selectedTemplate = templates.find(t => t._id === templateId)
      if (selectedTemplate) {
        setMessage(selectedTemplate.contenido)
      }
    }
  }

  const handleSaveTemplate = async () => {
    if (!message.trim()) {
      toast.error("Escribe un mensaje para guardar como plantilla")
      return
    }

    const nombre = prompt("Nombre de la plantilla:")
    if (!nombre) return

    try {
      if (template) {
        // Update existing template
        await api.templates.update(template, { nombre, contenido: message })
        toast.success("Plantilla actualizada")
      } else {
        // Create new template
        await api.templates.create({ nombre, contenido: message })
        toast.success("Plantilla guardada")
      }
      fetchTemplates()
    } catch (error: any) {
      console.error("Error saving template:", error)
      toast.error(error.response?.data?.message || "Error al guardar plantilla")
    }
  }

  const handleDeleteTemplate = async () => {
    if (!template) {
      toast.error("Selecciona una plantilla para eliminar")
      return
    }

    if (!confirm("¿Eliminar esta plantilla?")) return

    try {
      await api.templates.delete(template)
      toast.success("Plantilla eliminada")
      setTemplate("")
      setMessage("")
      fetchTemplates()
    } catch (error: any) {
      console.error("Error deleting template:", error)
      toast.error(error.response?.data?.message || "Error al eliminar plantilla")
    }
  }

  const handleStartCampaign = async () => {
    if (!campaignName.trim()) {
      toast.error("Ingresa un nombre para la campaña")
      return
    }

    if (uploadedContacts.length === 0) {
      toast.error("Debes cargar contactos primero")
      return
    }

    if (!message.trim() && !template) {
      toast.error("Escribe un mensaje o selecciona una plantilla")
      return
    }

    try {
      setLoading(true)
      await api.sendJobs.start({
        name: campaignName,
        templateId: template || undefined,
        message: template ? undefined : message,
        contacts: uploadedContacts,
        delayMin: parseInt(tiempoMin),
        delayMax: parseInt(tiempoMax),
        batchSize: parseInt(tamanoLote),
        batchDelay: parseInt(descanso) * 60,
        scheduledAt: fechaEnvio || undefined
      })

      toast.success("Campaña iniciada exitosamente")

      // Reset form
      setCampaignName("")
      setTemplate("")
      setMessage("")
      setUploadedContacts([])
      setUploadedFile(null)
      setFechaEnvio("")

      fetchCampaigns()
    } catch (error: any) {
      console.error("Error starting campaign:", error)
      toast.error(error.response?.data?.message || "Error al iniciar campaña")
    } finally {
      setLoading(false)
    }
  }

  const handlePauseCampaign = async (id: string) => {
    try {
      await api.sendJobs.pause(id)
      toast.success("Campaña pausada")
      fetchCampaigns()
    } catch (error: any) {
      console.error("Error pausing campaign:", error)
      toast.error(error.response?.data?.message || "Error al pausar campaña")
    }
  }

  const handleResumeCampaign = async (id: string) => {
    try {
      await api.sendJobs.resume(id)
      toast.success("Campaña reanudada")
      fetchCampaigns()
    } catch (error: any) {
      console.error("Error resuming campaign:", error)
      toast.error(error.response?.data?.message || "Error al reanudar campaña")
    }
  }

  const handleCancelCampaign = async (id: string) => {
    if (!confirm("¿Cancelar esta campaña?")) return

    try {
      await api.sendJobs.cancel(id)
      toast.success("Campaña cancelada")
      fetchCampaigns()
    } catch (error: any) {
      console.error("Error canceling campaign:", error)
      toast.error(error.response?.data?.message || "Error al cancelar campaña")
    }
  }

  const handleExportCampaign = async (id: string) => {
    try {
      const response = await api.sendJobs.export(id)
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `campaign_${id}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success("Campaña exportada")
    } catch (error: any) {
      console.error("Error exporting campaign:", error)
      toast.error(error.response?.data?.message || "Error al exportar campaña")
    }
  }

  const handleDownloadRejected = async () => {
    if (!rejectedFileId) return

    try {
      const response = await api.contacts.downloadRejected(rejectedFileId)
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `afiliados_rechazados_${Date.now()}.txt`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success("Archivo de rechazados descargado")
    } catch (error: any) {
      console.error("Error downloading rejected file:", error)
      toast.error("Error al descargar archivo de rechazados")
    }
  }

  const handlePreview = () => {
    if (!message.trim()) {
      toast.error("Escribe un mensaje para previsualizar")
      return
    }

    if (!uploadedContacts || uploadedContacts.length === 0) {
      toast.error("Carga un archivo para previsualizar con datos reales")
      return
    }

    try {
      const firstContact = uploadedContacts[0]
      let previewMessage = message

      console.log('[Preview] First contact:', firstContact)
      console.log('[Preview] First contact FULL:', JSON.stringify(firstContact, null, 2))
      console.log('[Preview] Import headers:', importHeaders)
      console.log('[Preview] Original message:', message)

      // Replace [placeholders] with actual contact data
      importHeaders.forEach(header => {
        // Try multiple sources: direct field, extraData, case variations
        const value =
          firstContact[header] ||
          firstContact.extraData?.[header] ||
          firstContact[header.toLowerCase()] ||
          firstContact.extraData?.[header.toLowerCase()] ||
          `[${header}]`

        console.log(`[Preview] Replacing [${header}] with:`, value)

        // Create case-insensitive regex for [header]
        const regex = new RegExp(`\\[${header}\\]`, 'gi')
        previewMessage = previewMessage.replace(regex, String(value))
      })

      // Also replace any remaining [field] that might not be in importHeaders
      // This handles all possible extraData fields
      if (firstContact.extraData) {
        Object.keys(firstContact.extraData).forEach(key => {
          const value = firstContact.extraData[key]
          const regex = new RegExp(`\\[${key}\\]`, 'gi')
          previewMessage = previewMessage.replace(regex, String(value))
        })
      }

      console.log('[Preview] After replacement:', previewMessage)

      // Process Spintax - select first option for preview
      previewMessage = previewMessage.replace(/{([^}]+)}/g, (match, options) => {
        const opts = options.split('|').map((o: string) => o.trim())
        return opts[0] || match
      })

      setPreviewData({
        message: previewMessage,
        contactName: firstContact.nombre || firstContact.extraData?.nombre || 'Ejemplo'
      })
      setShowPreview(true)
    } catch (error: any) {
      console.error("Error previewing message:", error)
      toast.error("Error al generar vista previa")
    }
  }

  const handleDisconnect = async () => {
    if (!confirm("¿Estás seguro de que deseas desconectar el dispositivo? Deberás vincular uno nuevo.")) {
      return
    }

    try {
      await api.whatsapp.logout()
      toast.success("Dispositivo desconectado exitosamente")
      setIsWhatsAppConnected(false)
      setShowVincularQR(true)
    } catch (error: any) {
      console.error("Error disconnecting device:", error)
      toast.error(error.response?.data?.message || "Error al desconectar dispositivo")
    }
  }

  const filteredCampaigns = campaigns.filter((campaign) => {
    if (!filterDate) return true
    const campaignDate = new Date(campaign.createdAt).toISOString().split('T')[0]
    return campaignDate === filterDate
  })

  // Show loading while checking connection
  if (checkingConnection) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className={cn(
            "inline-block w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mb-4",
            theme === "dark" ? "border-white/20 border-t-white" : "border-gray-300 border-t-purple-600"
          )} />
          <p className={cn(
            "text-sm",
            theme === "dark" ? "text-gray-400" : "text-gray-600"
          )}>
            Verificando conexión de WhatsApp...
          </p>
        </div>
      </div>
    )
  }

  // Show QR linking if WhatsApp is not connected
  if (isWhatsAppConnected === false) {
    return (
      <VincularQR
        onSuccess={() => {
          setIsWhatsAppConnected(true)
          toast.success("WhatsApp vinculado correctamente")
          // Reload campaigns after successful connection
          fetchCampaigns()
        }}
      />
    )
  }

  return (
    <div className="animate-fade-in-up space-y-4 lg:space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Mensajes Hoy - Primary (Cyan) */}
        <div
          className={cn(
            "p-4 rounded-2xl border shadow-sm transition-all duration-300 hover:shadow-lg relative overflow-hidden group",
            theme === "dark"
              ? "bg-white/5 border-white/10"
              : cn("border-gray-200/50", styles.cardPrimaryLight)
          )}
          style={{ animationDelay: '0ms' }}
        >
          {/* Glow effect for light mode */}
          {theme !== "dark" && (
            <div className={cn(
              "absolute -top-10 -right-10 w-24 h-24 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-opacity",
              styles.glowPrimaryLight
            )} />
          )}

          <div className="flex items-center gap-3 relative z-10">
            <div className={cn(
              "p-2 rounded-lg flex items-center justify-center w-10 h-10 lg:w-12 lg:h-12",
              theme === "dark"
                ? "bg-blue-500/20 text-blue-400"
                : cn("text-white", styles.iconPrimaryLight)
            )}>
              <MessageCircle className="w-5 h-5 lg:w-6 lg:h-6" />
            </div>
            <div>
              <p className={cn("text-xs font-medium mb-1", theme === "dark" ? "text-gray-400" : "text-gray-600")}>Mensajes enviados hoy</p>
              <p className={cn(
                "text-2xl lg:text-3xl font-bold",
                theme === "dark" ? "text-white" : styles.textPrimaryLight
              )}>{metrics.mensajesHoy}</p>
            </div>
          </div>
        </div>

        {/* Usuarios Activos - Secondary (Slate) */}
        <div
          className={cn(
            "p-4 rounded-2xl border shadow-sm transition-all duration-300 hover:shadow-lg relative overflow-hidden group",
            theme === "dark"
              ? "bg-white/5 border-white/10"
              : cn("border-gray-200/50", styles.cardSecondaryLight)
          )}
          style={{ animationDelay: '100ms' }}
        >
          {/* Glow effect for light mode */}
          {theme !== "dark" && (
            <div className={cn(
              "absolute -top-10 -right-10 w-24 h-24 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-opacity",
              styles.glowSecondaryLight
            )} />
          )}

          <div className="flex items-center gap-3 relative z-10">
            <div className={cn(
              "p-2 rounded-lg flex items-center justify-center w-10 h-10 lg:w-12 lg:h-12",
              theme === "dark"
                ? "bg-emerald-500/20 text-emerald-400"
                : cn("text-white", styles.iconSecondaryLight)
            )}>
              <Users className="w-5 h-5 lg:w-6 lg:h-6" />
            </div>
            <div>
              <p className={cn("text-xs font-medium mb-1", theme === "dark" ? "text-gray-400" : "text-gray-600")}>Usuarios activos</p>
              <p className={cn(
                "text-2xl lg:text-3xl font-bold",
                theme === "dark" ? "text-white" : styles.textSecondaryLight
              )}>{metrics.usuariosActivos}</p>
            </div>
          </div>
        </div>

        {/* Contactos Cargados - Accent (Teal) */}
        <div className={cn(
          "p-4 rounded-2xl border shadow-sm transition-all duration-300 hover:shadow-lg relative overflow-hidden group",
          theme === "dark"
            ? "bg-white/5 border-white/10"
            : cn("border-gray-200/50", styles.cardAccentLight)
        )}
          style={{ animationDelay: '200ms' }}
        >
          {/* Glow effect for light mode */}
          {theme !== "dark" && (
            <div className={cn(
              "absolute -top-10 -right-10 w-24 h-24 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-opacity",
              styles.glowAccentLight
            )} />
          )}

          <div className="flex items-center gap-3 relative z-10">
            <div className={cn(
              "p-2 rounded-lg flex items-center justify-center w-10 h-10 lg:w-12 lg:h-12",
              theme === "dark"
                ? "bg-purple-500/20 text-purple-400"
                : cn("text-white", styles.iconAccentLight)
            )}>
              <Upload className="w-5 h-5 lg:w-6 lg:h-6" />
            </div>
            <div>
              <p className={cn("text-xs font-medium mb-1", theme === "dark" ? "text-gray-400" : "text-gray-600")}>Contactos cargados</p>
              <p className={cn(
                "text-2xl lg:text-3xl font-bold",
                theme === "dark" ? "text-white" : styles.textAccentLight
              )}>{metrics.contactosCargados}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <label
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer",
            theme === "dark"
              ? "bg-[#17C787] hover:bg-[#17C787]/80 text-white"
              : "bg-emerald-500 hover:bg-emerald-600 text-white",
          )}
        >
          <Upload className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Subir contactos (CSV/XLS)</span>
          <span className="sm:hidden">Subir</span>
          <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} className="hidden" />
        </label>
        <button
          onClick={handleDisconnect}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all",
            theme === "dark"
              ? "bg-[#C8376B] hover:bg-[#C8376B]/80 text-white"
              : "bg-rose-500 hover:bg-rose-600 text-white",
          )}
        >
          <WifiOff className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Desconectar dispositivo</span>
          <span className="sm:hidden">Desconectar</span>
        </button>
        <button
          onClick={() => setIsAutoRespuestasOpen(true)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all",
            theme === "dark"
              ? "bg-[#1E88E5] hover:bg-[#1E88E5]/80 text-white"
              : "bg-blue-500 hover:bg-blue-600 text-white",
          )}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Auto-respuestas</span>
          <span className="sm:hidden">Auto</span>
        </button>
      </div>

      {/* Upload Status */}
      {uploadStats && (
        <div className="space-y-2">
          {/* Success Status */}
          {uploadStats.accepted > 0 && (
            <div
              className={cn(
                "p-3 rounded-lg border",
                theme === "dark"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-emerald-50 border-emerald-200 text-emerald-700",
              )}
            >
              ✅ {uploadStats.accepted} afiliados aceptados y listos para contactar desde {uploadedFile?.name}
            </div>
          )}

          {/* Rejected Status with Download */}
          {uploadStats.rejected > 0 && rejectedFileId && (
            <div
              className={cn(
                "p-3 rounded-lg border flex items-center justify-between",
                theme === "dark"
                  ? "bg-orange-500/10 border-orange-500/30 text-orange-400"
                  : "bg-orange-50 border-orange-200 text-orange-700",
              )}
            >
              <span>⚠️ {uploadStats.rejected} afiliados rechazados (duplicados o ya contactados)</span>
              <button
                onClick={handleDownloadRejected}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  theme === "dark"
                    ? "bg-orange-500/20 hover:bg-orange-500/30 text-orange-300"
                    : "bg-orange-200 hover:bg-orange-300 text-orange-800",
                )}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Descargar rechazados
              </button>
            </div>
          )}
        </div>
      )}

      {/* Campaign Form */}
      <div
        className={cn(
          "rounded-2xl border p-4 lg:p-6 backdrop-blur-sm",
          theme === "dark"
            ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
            : "bg-gradient-to-br from-white to-[#FAF7F2]/80 border-purple-200/30 shadow-lg shadow-purple-100/30",
        )}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Column - Campaign Setup */}
          <div className="space-y-4">
            {/* Campaign Name */}
            <div>
              <label
                className={cn("block text-xs font-medium mb-1.5", theme === "dark" ? "text-gray-400" : "text-gray-600")}
              >
                Nombre de la campaña
              </label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="Ingresa el nombre..."
                className={cn(
                  "w-full px-3 py-2 rounded-lg text-sm border transition-all focus:ring-2",
                  theme === "dark"
                    ? "bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-purple-500/20"
                    : "bg-white border-purple-200/50 text-gray-700 placeholder-gray-400 focus:border-purple-400 focus:ring-purple-200/50",
                )}
              />
            </div>

            {/* Template Selector */}
            <div>
              <label
                className={cn("block text-xs font-medium mb-1.5", theme === "dark" ? "text-gray-400" : "text-gray-600")}
              >
                Plantilla (opcional)
              </label>
              <select
                value={template}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className={cn(
                  "w-full px-3 py-2 rounded-lg text-sm border transition-all focus:ring-2",
                  theme === "dark"
                    ? "bg-white/5 border-white/10 text-white focus:border-purple-500/50 focus:ring-purple-500/20"
                    : "bg-white border-purple-200/50 text-gray-700 focus:border-purple-400 focus:ring-purple-200/50",
                )}
              >
                <option value="">-- Selecciona plantilla --</option>
                {templates.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Template Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleSaveTemplate}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                  theme === "dark"
                    ? "bg-[#17C787]/20 hover:bg-[#17C787]/30 text-[#17C787] border border-[#17C787]/30"
                    : "bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border border-emerald-200",
                )}
              >
                <Save className="w-3.5 h-3.5" />
                Guardar
              </button>
              <button
                onClick={handleDeleteTemplate}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                  theme === "dark"
                    ? "bg-[#C8376B]/20 hover:bg-[#C8376B]/30 text-[#C8376B] border border-[#C8376B]/30"
                    : "bg-rose-100 hover:bg-rose-200 text-rose-700 border border-rose-200",
                )}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar
              </button>
            </div>
          </div>

          {/* Right Column - Message */}
          <div className="space-y-2">
            <label
              className={cn("block text-xs font-medium mb-1.5", theme === "dark" ? "text-gray-400" : "text-gray-600")}
            >
              Mensaje
            </label>
            {/* Text Editor Toolbar */}
            <div
              className={cn(
                "flex items-center gap-1 px-2 py-1.5 rounded-t-lg border-b relative",
                theme === "dark" ? "bg-white/5 border-white/10" : "bg-purple-50 border-purple-100",
              )}
            >
              {/* Bold button */}
              <button
                type="button"
                onClick={() => insertAtCursor("*", "*")}
                title="Negrita"
                className={cn(
                  "p-1.5 rounded transition-colors",
                  theme === "dark" ? "hover:bg-white/10 text-gray-400" : "hover:bg-purple-100 text-gray-600",
                )}
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              {/* Italic button */}
              <button
                type="button"
                onClick={() => insertAtCursor("_", "_")}
                title="Cursiva"
                className={cn(
                  "p-1.5 rounded transition-colors",
                  theme === "dark" ? "hover:bg-white/10 text-gray-400" : "hover:bg-purple-100 text-gray-600",
                )}
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              {/* Emoji picker button */}
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                title="Emoji"
                className={cn(
                  "p-1.5 rounded transition-colors",
                  theme === "dark" ? "hover:bg-white/10 text-gray-400" : "hover:bg-purple-100 text-gray-600",
                )}
              >
                <Smile className="w-3.5 h-3.5" />
              </button>

              {/* Emoji picker dropdown */}
              {showEmojiPicker && (
                <div className={cn(
                  "absolute top-full left-0 mt-1 p-2 rounded-lg shadow-lg border grid grid-cols-10 gap-1 z-20",
                  theme === "dark" ? "bg-gray-800 border-white/10" : "bg-white border-purple-200"
                )}>
                  {emojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        insertAtCursor(emoji)
                        setShowEmojiPicker(false)
                      }}
                      className={cn(
                        "text-xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-1"
                      )}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              <div className={cn("w-px h-4 mx-1", theme === "dark" ? "bg-white/10" : "bg-purple-200")} />

              {/* Spintax button - opens modal */}
              <button
                type="button"
                onClick={() => setShowSpintaxModal(true)}
                title="Spintax - Variaciones de texto"
                className={cn(
                  "px-2 py-1 rounded text-xs font-medium transition-colors",
                  theme === "dark" ? "hover:bg-white/10 text-purple-400" : "hover:bg-purple-100 text-purple-600",
                )}
              >
                Spintax
              </button>

              {/* Dynamic field buttons */}
              {fieldButtons.length > 0 && (
                <>
                  <div className={cn("w-px h-4 mx-1", theme === "dark" ? "bg-white/10" : "bg-purple-200")} />
                  {fieldButtons.map((header) => (
                    <button
                      key={header}
                      type="button"
                      onClick={() => insertAtCursor(`[${header}]`)}
                      title={`Insertar campo dinámico: ${header}`}
                      className={cn(
                        "px-2 py-1 rounded text-xs font-medium transition-colors",
                        theme === "dark" ? "hover:bg-white/10 text-blue-400" : "hover:bg-blue-100 text-blue-600",
                      )}
                    >
                      [{String(header).toUpperCase()}]
                    </button>
                  ))}
                </>
              )}
            </div>
            <textarea
              name="mensaje"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escribe tu mensaje aquí... (se ignora si seleccionas plantilla)"
              rows={4}
              spellCheck={true}
              lang="es"
              className={cn(
                "w-full px-3 py-2 rounded-b-lg text-sm border border-t-0 transition-all focus:ring-2 resize-none",
                theme === "dark"
                  ? "bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-purple-500/20"
                  : "bg-white border-purple-200/50 text-gray-700 placeholder-gray-400 focus:border-purple-400 focus:ring-purple-200/50",
              )}
            />
            <button
              onClick={handlePreview}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                theme === "dark"
                  ? "bg-gradient-to-r from-purple-600/50 to-blue-600/50 hover:from-purple-600/70 hover:to-blue-600/70 text-white border border-white/10"
                  : "bg-gradient-to-r from-purple-200 to-blue-200 hover:from-purple-300 hover:to-blue-300 text-purple-700 border border-purple-200",
              )}
            >
              <Eye className="w-3.5 h-3.5" />
              Previsualizar
            </button>
          </div>
        </div>

        {/* Configuration Row */}
        <div
          className={cn(
            "grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t",
            theme === "dark" ? "border-white/10" : "border-purple-100",
          )}
        >
          <div>
            <label
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium mb-1.5",
                theme === "dark" ? "text-gray-400" : "text-gray-600",
              )}
            >
              <Clock className="w-3 h-3" />
              Tiempo (seg)
            </label>
            <div className="flex gap-1">
              <input
                type="number"
                value={tiempoMin}
                onChange={(e) => setTiempoMin(e.target.value)}
                className={cn(
                  "w-full px-2 py-1.5 rounded-lg text-xs border transition-all",
                  theme === "dark"
                    ? "bg-white/5 border-white/10 text-white"
                    : "bg-white border-purple-200/50 text-gray-700",
                )}
              />
              <input
                type="number"
                value={tiempoMax}
                onChange={(e) => setTiempoMax(e.target.value)}
                className={cn(
                  "w-full px-2 py-1.5 rounded-lg text-xs border transition-all",
                  theme === "dark"
                    ? "bg-white/5 border-white/10 text-white"
                    : "bg-white border-purple-200/50 text-gray-700",
                )}
              />
            </div>
          </div>
          <div>
            <label
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium mb-1.5",
                theme === "dark" ? "text-gray-400" : "text-gray-600",
              )}
            >
              <Package className="w-3 h-3" />
              Tamaño lote
            </label>
            <input
              type="number"
              value={tamanoLote}
              onChange={(e) => setTamanoLote(e.target.value)}
              className={cn(
                "w-full px-2 py-1.5 rounded-lg text-xs border transition-all",
                theme === "dark"
                  ? "bg-white/5 border-white/10 text-white"
                  : "bg-white border-purple-200/50 text-gray-700",
              )}
            />
          </div>
          <div>
            <label
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium mb-1.5",
                theme === "dark" ? "text-gray-400" : "text-gray-600",
              )}
            >
              <Coffee className="w-3 h-3" />
              Descanso (min)
            </label>
            <input
              type="number"
              value={descanso}
              onChange={(e) => setDescanso(e.target.value)}
              className={cn(
                "w-full px-2 py-1.5 rounded-lg text-xs border transition-all",
                theme === "dark"
                  ? "bg-white/5 border-white/10 text-white"
                  : "bg-white border-purple-200/50 text-gray-700",
              )}
            />
          </div>
          <div>
            <label
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium mb-1.5",
                theme === "dark" ? "text-gray-400" : "text-gray-600",
              )}
            >
              <Calendar className="w-3 h-3" />
              Programar
            </label>
            <input
              type="datetime-local"
              value={fechaEnvio}
              onChange={(e) => setFechaEnvio(e.target.value)}
              className={cn(
                "w-full px-2 py-1.5 rounded-lg text-xs border transition-all",
                theme === "dark"
                  ? "bg-white/5 border-white/10 text-white"
                  : "bg-white border-purple-200/50 text-gray-700",
              )}
            />
          </div>
        </div>

        {/* Send Button */}
        <button
          onClick={handleStartCampaign}
          disabled={loading}
          className={cn(
            "w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed",
            theme === "dark"
              ? "bg-gradient-to-r from-[#17C787] to-[#1E88E5] hover:from-[#17C787]/90 hover:to-[#1E88E5]/90 text-white shadow-lg shadow-[#17C787]/20"
              : "bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white shadow-lg shadow-emerald-200/50",
          )}
        >
          <Sparkles className="w-4 h-4" />
          {loading ? "Iniciando..." : "Iniciar envío"}
        </button>
      </div>

      {/* Campaigns Table */}
      <div
        className={cn(
          "rounded-2xl border backdrop-blur-sm overflow-hidden",
          theme === "dark"
            ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
            : "bg-gradient-to-br from-white to-[#FAF7F2]/80 border-purple-200/30 shadow-lg shadow-purple-100/30",
        )}
      >
        {/* Table Header */}
        <div
          className={cn(
            "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b",
            theme === "dark" ? "border-white/10" : "border-purple-100",
          )}
        >
          <h3 className={cn("text-sm font-semibold", theme === "dark" ? "text-white" : "text-gray-700")}>
            Campañas creadas
          </h3>
          <div className="flex items-center gap-2">
            <span className={cn("text-xs", theme === "dark" ? "text-gray-400" : "text-gray-500")}>Fecha:</span>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className={cn(
                "px-2 py-1 rounded text-xs border w-28",
                theme === "dark"
                  ? "bg-white/5 border-white/10 text-white"
                  : "bg-white border-purple-200/50 text-gray-700",
              )}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className={theme === "dark" ? "bg-white/5" : "bg-purple-50"}>
                <th
                  className={cn(
                    "px-3 py-2 text-left font-medium",
                    theme === "dark" ? "text-gray-400" : "text-gray-600",
                  )}
                >
                  Nombre
                </th>
                <th
                  className={cn(
                    "px-3 py-2 text-left font-medium",
                    theme === "dark" ? "text-gray-400" : "text-gray-600",
                  )}
                >
                  Usuario/Equipo
                </th>
                <th
                  className={cn(
                    "px-3 py-2 text-left font-medium",
                    theme === "dark" ? "text-gray-400" : "text-gray-600",
                  )}
                >
                  Estado
                </th>
                <th
                  className={cn(
                    "px-3 py-2 text-left font-medium",
                    theme === "dark" ? "text-gray-400" : "text-gray-600",
                  )}
                >
                  Progreso
                </th>
                <th
                  className={cn(
                    "px-3 py-2 text-left font-medium",
                    theme === "dark" ? "text-gray-400" : "text-gray-600",
                  )}
                >
                  Métricas
                </th>
                <th
                  className={cn(
                    "px-3 py-2 text-left font-medium",
                    theme === "dark" ? "text-gray-400" : "text-gray-600",
                  )}
                >
                  Hora
                </th>
                <th
                  className={cn(
                    "px-3 py-2 text-center font-medium",
                    theme === "dark" ? "text-gray-400" : "text-gray-600",
                  )}
                >
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className={cn("divide-y", theme === "dark" ? "divide-white/5" : "divide-purple-100")}>
              {filteredCampaigns.map((campaign) => {
                const statusStyle = getStatusStyles(mapStatus(campaign.status), theme)
                const progress = campaign.progress || 0
                return (
                  <tr
                    key={campaign._id}
                    className={cn("transition-colors", theme === "dark" ? "hover:bg-white/5" : "hover:bg-purple-50/50")}
                  >
                    <td className="px-3 py-2.5">
                      <span className={cn("font-medium", theme === "dark" ? "text-purple-400" : "text-purple-600")}>
                        {campaign.name}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div>
                        <span className={theme === "dark" ? "text-white" : "text-gray-700"}>
                          {campaign.createdBy?.nombre || "N/A"}
                        </span>
                        <span
                          className={cn(
                            "ml-2 px-1.5 py-0.5 rounded text-[10px]",
                            theme === "dark" ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-600",
                          )}
                        >
                          {campaign.createdBy?.numeroEquipo || "N/A"}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-medium",
                          statusStyle.bg,
                          statusStyle.text,
                        )}
                      >
                        {mapStatus(campaign.status)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full transition-all duration-500",
                              campaign.status === "completed"
                                ? "bg-[#17C787]"
                                : campaign.status === "failed"
                                  ? "bg-[#C8376B]"
                                  : theme === "dark"
                                    ? "bg-purple-500"
                                    : "bg-purple-400",
                            )}
                            style={{ width: `${progress}% ` }}
                          />
                        </div>
                        <span className={cn("text-[10px]", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                          {progress}%
                        </span>
                        {/* Support both English and Spanish status for compatibility */}
                        {(campaign.status === "resting" || campaign.status === "descanso") && campaign.restBreakUntil && (
                          <Countdown targetDate={campaign.restBreakUntil} />
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px]",
                            theme === "dark" ? "bg-[#17C787]/20 text-[#17C787]" : "bg-emerald-100 text-emerald-600",
                          )}
                        >
                          ✓{campaign.stats?.sent || 0}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px]",
                            theme === "dark" ? "bg-[#C8376B]/20 text-[#C8376B]" : "bg-rose-100 text-rose-600",
                          )}
                        >
                          ✕{campaign.stats?.failed || 0}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px]",
                            theme === "dark" ? "bg-[#1E88E5]/20 text-[#1E88E5]" : "bg-blue-100 text-blue-600",
                          )}
                        >
                          ⏳{campaign.stats?.pending || 0}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px]",
                            theme === "dark" ? "bg-purple-500/20 text-purple-400" : "bg-purple-100 text-purple-600",
                          )}
                          title="Respuestas recibidas"
                        >
                          💬{campaign.repliesCount || 0}
                        </span>
                      </div>
                    </td>
                    <td className={cn("px-3 py-2.5", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                      {new Date(campaign.createdAt).toLocaleTimeString("es-AR", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-center gap-1">
                        {/* Show Pause button for running/pending campaigns (hide only for completed/failed/paused) */}
                        {!['paused', 'pausado', 'completado', 'completed', 'fallida', 'failed'].includes(campaign.status?.toLowerCase() || '') && (
                          <button
                            onClick={() => handlePauseCampaign(campaign._id)}
                            className={cn(
                              "p-1.5 rounded transition-colors",
                              theme === "dark"
                                ? "bg-[#F4C04A]/20 text-[#F4C04A] hover:bg-[#F4C04A]/30"
                                : "bg-amber-100 text-amber-600 hover:bg-amber-200",
                            )}
                            title="Pausar campaña"
                          >
                            <Pause className="w-3 h-3" />
                          </button>
                        )}
                        {/* Show Resume button only for paused campaigns */}
                        {(campaign.status === 'paused' || campaign.status === 'pausado') && (
                          <button
                            onClick={() => handleResumeCampaign(campaign._id)}
                            className={cn(
                              "p-1.5 rounded transition-colors",
                              theme === "dark"
                                ? "bg-[#17C787]/20 text-[#17C787] hover:bg-[#17C787]/30"
                                : "bg-emerald-100 text-emerald-600 hover:bg-emerald-200",
                            )}
                            title="Reanudar campaña"
                          >
                            <Play className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={() => handleCancelCampaign(campaign._id)}
                          className={cn(
                            "p-1.5 rounded transition-colors",
                            theme === "dark"
                              ? "bg-[#C8376B]/20 text-[#C8376B] hover:bg-[#C8376B]/30"
                              : "bg-rose-100 text-rose-600 hover:bg-rose-200",
                          )}
                          title="Borrar campaña"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleExportCampaign(campaign._id)}
                          className={cn(
                            "p-1.5 rounded transition-colors",
                            theme === "dark"
                              ? "bg-[#17C787]/20 text-[#17C787] hover:bg-[#17C787]/30"
                              : "bg-emerald-100 text-emerald-600 hover:bg-emerald-200",
                          )}
                          title="Descargar reporte"
                        >
                          <FileSpreadsheet className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>


      {/* Simplified Preview Modal */}
      {showPreview && previewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          <div
            className={cn(
              "w-full max-w-md rounded-2xl border p-6 shadow-2xl pointer-events-auto",
              theme === "dark"
                ? "bg-gradient-to-br from-gray-900 to-gray-800 border-white/10"
                : "bg-white border-gray-200"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className={cn("text-lg font-bold", theme === "dark" ? "text-white" : "text-gray-800")}>
                  Vista Previa del Mensaje
                </h3>
                <p className={cn("text-xs mt-1", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                  Ejemplo con: {previewData.contactName}
                </p>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  theme === "dark" ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-600"
                )}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* WhatsApp-style Message Bubble */}
            <div className="mb-6">
              <div className="flex justify-end">
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg p-3 shadow-md",
                    theme === "dark"
                      ? "bg-green-900/50 text-green-100"
                      : "bg-green-100 text-gray-800"
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {previewData.message}
                  </p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className={cn("text-[10px]", theme === "dark" ? "text-green-300/70" : "text-gray-500")}>
                      {new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <CheckCheck className={cn("w-3 h-3", theme === "dark" ? "text-blue-400" : "text-blue-500")} />
                  </div>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowPreview(false)}
              className={cn(
                "w-full px-4 py-2.5 rounded-lg font-semibold transition-all",
                theme === "dark"
                  ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                  : "bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
              )}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* VincularQR Component - Real QR from WhatsApp */}
      {showVincularQR && (
        <VincularQR
          onSuccess={() => {
            setIsWhatsAppConnected(true)
            setShowVincularQR(false)
            fetchCampaigns()
          }}
        />
      )}

      {/* AutoRespuestasModal */}
      <AutoRespuestasModal isOpen={isAutoRespuestasOpen} onClose={() => setIsAutoRespuestasOpen(false)} />

      {/* SpintaxModal */}
      <SpintaxModal
        isOpen={showSpintaxModal}
        onClose={() => setShowSpintaxModal(false)}
        onInsert={(spintax) => {
          insertAtCursor(spintax)
          setShowSpintaxModal(false)
        }}
      />

      {/* WhatsApp Disconnect Notification */}
      {showDisconnectNotification && (
        <WhatsAppDisconnectNotification
          onDismiss={() => setShowDisconnectNotification(false)}
          onReconnect={() => {
            setShowDisconnectNotification(false)
            setShowVincularQR(true)
          }}
        />
      )}

      {/* Rejected Contacts Notification */}
      {showRejectedAlert && (
        <RejectedContactsNotification
          count={rejectedCount}
          onDismiss={() => setShowRejectedAlert(false)}
          onDownload={handleDownloadRejected}
        />
      )}

      {/* Auto Response Notification */}
      {autoResponseNotification && (
        <AutoResponseNotification
          data={autoResponseNotification}
          onDismiss={() => setAutoResponseNotification(null)}
        />
      )}
    </div >
  )
}

function Countdown({ targetDate }: { targetDate: string | Date }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft("Reanudando...");
        clearInterval(interval);
      } else {
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <span className="text-[10px] font-mono bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded animate-pulse">
      ⏳ {timeLeft}
    </span>
  );
}
