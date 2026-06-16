"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useAuth } from "@/lib/auth"
import { api } from "@/lib/api"
import {
    FileCheck, Upload, Trash2, Download, Play,
    RefreshCw, AlertCircle, FileSpreadsheet,
    CheckCircle2, Clock, XCircle, Database, X,
    AlertTriangle, Ban, ClipboardCheck, Clock3,
    Eye, FolderClock, Lock, PackageCheck,
    RotateCcw, Settings, ShieldCheck, UploadCloud, Users,
    Timer, TrendingUp, Zap, Info, BarChart3, ArrowRight,
    Radio, Calendar, Layers, Shield, Activity, Pause, Search
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface DataCheckSession {
    _id: string
    originalFileName: string
    status: string
    totalRows: number
    progress: {
        arca: { processed: number, total: number, errors: number }
        dateas: { processed: number, total: number, errors: number }
        padron: { processed: number, total: number, errors: number }
    }
    createdAt: string
    errorMessage?: string
    syncSummary?: {
        inserted: number
        updated: number
        omittedMissingPhone: number
        omittedMissingName: number
        omittedMissingCuil: number
        omittedMissingRequired: number
        canSellErrors: number
        errors: number
        totalProcessed: number
        syncedAt?: string
    }
    uploadedByUserId: {
        _id: string
        nombre: string
        email: string
    }
}

export function LegacyChequeoDatos() {
    const { user } = useAuth()
    const [sessions, setSessions] = useState<DataCheckSession[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isUploading, setIsUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [dbModalOpen, setDbModalOpen] = useState(false)
    const [dbObrasSociales, setDbObrasSociales] = useState<string[]>([])
    const [dbSelectedObrasSociales, setDbSelectedObrasSociales] = useState<string[]>([])
    const [dbObraSocialSearch, setDbObraSocialSearch] = useState("")
    const [dbQuantity, setDbQuantity] = useState(100)
    const [dbStock, setDbStock] = useState<Record<string, number>>({})
    const [dbStockTotal, setDbStockTotal] = useState(0)
    const [isLoadingDbStock, setIsLoadingDbStock] = useState(false)
    const [isCreatingFromDb, setIsCreatingFromDb] = useState(false)
    const canCheckFromDatabase = ["gerencia", "desarrollador"].includes(user?.role?.toLowerCase() || "")
    const selectedDbStockTotal = dbSelectedObrasSociales.length > 0
        ? dbSelectedObrasSociales.reduce((sum, os) => sum + (dbStock[os] || 0), 0)
        : dbStockTotal

    const fetchSessions = useCallback(async () => {
        try {
            const res = await api.dataCheck.listSessions()
            setSessions(res.data.sessions)
        } catch (err: any) {
            console.error("Error al cargar sesiones:", err)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchSessions()

        // Polling para actualizar progreso
        const interval = setInterval(() => {
            setSessions(prev => {
                const hasActive = prev.some(s =>
                    s.status.includes("pending") ||
                    s.status.includes("processing") ||
                    s.status === "queued" ||
                    s.status === "parsing" ||
                    s.status === "generating_excel"
                )
                if (hasActive) {
                    fetchSessions()
                }
                return prev
            })
        }, 3000)

        return () => clearInterval(interval)
    }, [fetchSessions])

    useEffect(() => {
        if (!canCheckFromDatabase || !dbModalOpen || dbObrasSociales.length > 0) return
        api.affiliates.distinctObrasSociales()
            .then(res => setDbObrasSociales(res.data.obrasSociales || []))
            .catch(() => setError("No se pudieron cargar las obras sociales"))
    }, [canCheckFromDatabase, dbModalOpen, dbObrasSociales.length])

    useEffect(() => {
        if (!canCheckFromDatabase || !dbModalOpen) return
        let cancelled = false
        setIsLoadingDbStock(true)
        api.dataCheck.getDatabaseStock()
            .then(res => {
                if (cancelled) return
                const stockMap: Record<string, number> = {}
                for (const row of res.data.stock || []) stockMap[row.nombre] = row.count
                setDbStock(stockMap)
                setDbStockTotal(res.data.total || 0)
            })
            .catch(() => setError("No se pudo cargar el stock disponible para chequeo"))
            .finally(() => {
                if (!cancelled) setIsLoadingDbStock(false)
            })
        return () => { cancelled = true }
    }, [canCheckFromDatabase, dbModalOpen])

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        setError(null)
        const formData = new FormData()
        formData.append("file", file)

        try {
            await api.dataCheck.upload(formData)
            await fetchSessions()
        } catch (err: any) {
            setError(err.response?.data?.error || "Error al subir el archivo")
        } finally {
            setIsUploading(false)
            if (e.target) e.target.value = ''
        }
    }

    const createFromDatabase = async () => {
        if (dbSelectedObrasSociales.length === 0) {
            setError("Seleccioná al menos una obra social")
            return
        }

        const quantity = Math.max(1, Math.min(1000, Number(dbQuantity) || 1))
        if (quantity > selectedDbStockTotal) {
            setError(`La cantidad solicitada (${quantity}) supera el stock disponible (${selectedDbStockTotal}). Corregí la cantidad ingresada.`)
            return
        }
        setIsCreatingFromDb(true)
        setError(null)

        try {
            const res = await api.dataCheck.createFromDatabase({
                obrasSociales: dbSelectedObrasSociales,
                quantity
            })
            await api.dataCheck.startSession(res.data.sessionId)
            setDbModalOpen(false)
            setDbSelectedObrasSociales([])
            setDbObraSocialSearch("")
            await fetchSessions()
        } catch (err: any) {
            setError(err.response?.data?.error || "Error al crear chequeo desde base")
        } finally {
            setIsCreatingFromDb(false)
        }
    }

    const startSession = async (id: string) => {
        try {
            await api.dataCheck.startSession(id)
            fetchSessions()
        } catch (err: any) {
            setError(err.response?.data?.error || "Error al iniciar procesamiento")
        }
    }

    const deleteSession = async (id: string) => {
        if (!window.confirm("¿Seguro que deseas eliminar este chequeo? Se perderán los datos.")) return
        try {
            await api.dataCheck.deleteSession(id)
            fetchSessions()
        } catch (err: any) {
            setError(err.response?.data?.error || "Error al eliminar sesión")
        }
    }

    const retrySession = async (id: string) => {
        try {
            await api.dataCheck.retrySession(id)
            fetchSessions()
        } catch (err: any) {
            setError(err.response?.data?.error || "Error al reintentar sesión")
        }
    }

    const downloadResult = async (id: string, fileName: string) => {
        try {
            const response = await api.dataCheck.downloadResult(id)
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', `Chequeo_${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`)
            document.body.appendChild(link)
            link.click()
            link.remove()
        } catch (err: any) {
            setError("El archivo ha expirado o no está disponible")
        }
    }

    const getStatusBadge = (status: string) => {
        const badges: Record<string, { label: string, color: string, icon: any }> = {
            "parsing": { label: "Analizando...", color: "bg-gray-100 text-gray-700", icon: Clock },
            "queued": { label: "Listo para iniciar", color: "bg-blue-100 text-blue-700", icon: Play },
            "processing": { label: "Procesando...", color: "bg-teal-100 text-teal-700", icon: RefreshCw },
            "generating_excel": { label: "Generando Excel", color: "bg-yellow-100 text-yellow-700", icon: RefreshCw },
            "completed": { label: "Completado", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
            "error": { label: "Error", color: "bg-red-100 text-red-700", icon: XCircle },
        }

        const config = badges[status] || { label: status, color: "bg-gray-100 text-gray-700", icon: AlertCircle }
        const Icon = config.icon

        return (
            <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium gap-1", config.color)}>
                <Icon className={cn("w-3 h-3", status.includes("processing") || status === "generating_excel" ? "animate-spin" : "")} />
                {config.label}
            </span>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <FileCheck className="w-6 h-6 text-primary" />
                        Chequeo de Datos
                    </h2>
                    <p className="text-muted-foreground">
                        Sube archivos Excel temporales para verificar aportes, enriquecer con DATEAS y consultar el Padrón de forma aislada.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                    {canCheckFromDatabase && (
                        <button
                            type="button"
                            onClick={() => setDbModalOpen(true)}
                            className="border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 inline-flex items-center justify-center px-4 py-2 rounded-md font-medium transition-colors"
                        >
                            <Database className="w-4 h-4 mr-2" />
                            Chequear desde base
                        </button>
                    )}
                    <div className="relative">
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleFileUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            disabled={isUploading}
                        />
                        <button
                            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center px-4 py-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                            disabled={isUploading}
                        >
                            {isUploading ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Upload className="w-4 h-4 mr-2" />
                            )}
                            {isUploading ? "Subiendo..." : "Subir archivo Excel"}
                        </button>
                    </div>
                </div>
            </div>

            {dbModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-lg rounded-lg bg-white dark:bg-[#1C1D22] border border-gray-200 dark:border-gray-800 shadow-xl">
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
                            <h3 className="font-semibold flex items-center gap-2">
                                <Database className="w-5 h-5" />
                                Chequear datos desde base
                            </h3>
                            <button type="button" onClick={() => setDbModalOpen(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="text-sm font-medium">Obras sociales</label>
                                <input
                                    type="text"
                                    value={dbObraSocialSearch}
                                    onChange={e => setDbObraSocialSearch(e.target.value)}
                                    placeholder="Buscar obra social..."
                                    className="mt-1 w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                                />
                                <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-800">
                                    {dbObrasSociales
                                        .filter(os => os.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(dbObraSocialSearch.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")))
                                        .map(os => {
                                            const selected = dbSelectedObrasSociales.includes(os)
                                            return (
                                                <button
                                                    key={os}
                                                    type="button"
                                                    onClick={() => setDbSelectedObrasSociales(prev => selected ? prev.filter(x => x !== os) : [...prev, os])}
                                                    className={cn(
                                                        "w-full text-left px-3 py-2 text-sm border-b last:border-b-0 border-gray-100 dark:border-gray-800",
                                                        selected ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : "hover:bg-gray-50 dark:hover:bg-gray-800"
                                                    )}
                                                >
                                                    <span>{selected ? "✓ " : ""}{os}</span>
                                                    <span className="float-right text-xs opacity-70">{(dbStock[os] || 0).toLocaleString("es-AR")}</span>
                                                </button>
                                            )
                                        })}
                                </div>
                                {dbSelectedObrasSociales.length > 0 && (
                                    <p className="mt-1 text-xs text-gray-500">
                                        {dbSelectedObrasSociales.length} seleccionada(s) · {isLoadingDbStock ? "calculando stock..." : `${selectedDbStockTotal.toLocaleString("es-AR")} disponibles`}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="text-sm font-medium">Cantidad de datos</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={1000}
                                    value={dbQuantity}
                                    onChange={e => setDbQuantity(Math.max(1, Math.min(1000, Number(e.target.value) || 1)))}
                                    className="mt-1 w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                                />
                                {dbSelectedObrasSociales.length > 0 && dbQuantity > selectedDbStockTotal && (
                                    <p className="mt-1 text-xs text-red-500">La cantidad supera el stock disponible seleccionado.</p>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-800">
                            <button type="button" onClick={() => setDbModalOpen(false)} className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700">
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={createFromDatabase}
                                disabled={isCreatingFromDb || isLoadingDbStock || dbSelectedObrasSociales.length === 0 || dbQuantity > selectedDbStockTotal}
                                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center px-4 py-2 rounded-md font-medium disabled:opacity-50"
                            >
                                {isCreatingFromDb && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                                Iniciar chequeo
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p>{error}</p>
                </div>
            )}

            <div className="bg-white dark:bg-[#1C1D22] border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#1C1D22]/50">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-muted-foreground" />
                        Archivos en proceso
                    </h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-[#1C1D22] border-b border-gray-200 dark:border-gray-800">
                            <tr>
                                <th className="px-4 py-3 font-medium">Archivo</th>
                                <th className="px-4 py-3 font-medium">Estado</th>
                                <th className="px-4 py-3 font-medium">Progreso</th>
                                <th className="px-4 py-3 font-medium text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                                        Cargando sesiones...
                                    </td>
                                </tr>
                            ) : sessions.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                                        No hay archivos en proceso. Sube un Excel para comenzar.
                                    </td>
                                </tr>
                            ) : (
                                sessions.map((session) => (
                                    <tr key={session._id} className="hover:bg-gray-50 dark:hover:bg-[#25262B] transition-colors">
                                        <td className="px-4 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-gray-900 dark:text-gray-100 max-w-[200px] sm:max-w-xs truncate">
                                                    {session.originalFileName}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {new Date(session.createdAt).toLocaleString("es-AR")}
                                                </span>
                                                <span className="text-xs text-gray-500 mt-1">
                                                    Por: {session.uploadedByUserId?.nombre || session.uploadedByUserId?.email}
                                                </span>
                                                {canCheckFromDatabase && session.syncSummary && (
                                                    <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-gray-600 dark:text-gray-300">
                                                        <span>DB nuevos: <strong>{session.syncSummary.inserted}</strong></span>
                                                        <span>DB actualizados: <strong>{session.syncSummary.updated}</strong></span>
                                                        <span>Omitidos tel.: <strong>{session.syncSummary.omittedMissingPhone}</strong></span>
                                                        <span>Errores: <strong>{session.syncSummary.errors + session.syncSummary.canSellErrors}</strong></span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex flex-col items-start gap-1">
                                                {getStatusBadge(session.status)}
                                                {session.errorMessage && (
                                                    <span className="text-xs text-red-500 mt-1 max-w-[200px] truncate" title={session.errorMessage}>
                                                        {session.errorMessage}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 min-w-[200px]">
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-xs">
                                                    <span>ARCA:</span>
                                                    <span className="font-medium">{session.progress?.arca?.processed || 0} / {session.totalRows}</span>
                                                </div>
                                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                                    <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, ((session.progress?.arca?.processed || 0) / session.totalRows) * 100)}%` }}></div>
                                                </div>

                                                <div className="flex justify-between text-xs mt-2">
                                                    <span>DATEAS:</span>
                                                    <span className="font-medium">{session.progress?.dateas?.processed || 0} / {session.totalRows}</span>
                                                </div>
                                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                                    <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, ((session.progress?.dateas?.processed || 0) / session.totalRows) * 100)}%` }}></div>
                                                </div>

                                                <div className="flex justify-between text-xs mt-2">
                                                    <span>Padrón:</span>
                                                    <span className="font-medium">{session.progress?.padron?.processed || 0} / {session.totalRows}</span>
                                                </div>
                                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                                    <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, ((session.progress?.padron?.processed || 0) / session.totalRows) * 100)}%` }}></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                {session.status === "queued" && (
                                                    <button
                                                        onClick={() => startSession(session._id)}
                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                                                        title="Iniciar procesamiento"
                                                    >
                                                        <Play className="w-5 h-5" />
                                                    </button>
                                                )}

                                                {session.status === "completed" && (
                                                    <button
                                                        onClick={() => downloadResult(session._id, session.originalFileName)}
                                                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded"
                                                        title="Descargar resultado"
                                                    >
                                                        <Download className="w-5 h-5" />
                                                    </button>
                                                )}

                                                {session.status === "error" && (
                                                    <button
                                                        onClick={() => retrySession(session._id)}
                                                        className="p-1.5 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded"
                                                        title="Reintentar procesamiento"
                                                    >
                                                        <RefreshCw className="w-5 h-5" />
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => deleteSession(session._id)}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                                                    title="Eliminar sesión"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
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

type CheckMode = "check_new" | "check_reusable" | "extract_base" | "check_import"

interface AffiliateCheckConfig {
    dailyQuota?: {
        checkNew?: number
        checkReusable?: number
        extractBase?: number
        checkImport?: number
    }
    ownershipDays?: number
    verificationExpiryDays?: number
    features?: {
        checkNewEnabled?: boolean
        checkReusableEnabled?: boolean
        extractBaseEnabled?: boolean
        checkImportEnabled?: boolean
    }
}

interface BaseStatus {
    totals?: {
        total?: number
        availableForSale?: number
        unchecked?: number
        expired?: number
        fresh?: number
        reusable?: number
        qrDone?: number
    }
    byObraSocial?: Array<{
        obraSocial: string
        total: number
        availableForSale: number
        unchecked: number
        expired: number
        qrDone: number
    }>
}

interface ObraSocialAvailabilityItem {
    code: number
    codePadded: string
    name: string
    availableCount: number
}

type ObraSocialStrategy = "automatic" | "manual"

interface AffiliateCheckJob {
    _id: string
    mode: CheckMode
    status: string
    requestedCount?: number
    selectedCount?: number
    processedCount?: number
    eligibleCount?: number
    assignedCount?: number
    assignedToStockCount?: number
    generalStockCount?: number
    assignedRowsCount?: number
    rejectedCount?: number
    failedCount?: number
    createdAt?: string
    errorMessage?: string
    pendingTooLong?: boolean
    isStuck?: boolean
    progress?: {
        percent?: number
        processedCount?: number
        selectedCount?: number
        arcaCompleted?: number
        dateasCompleted?: number
        padronCompleted?: number
        finalizedCount?: number
        estimatedRemainingMs?: number | null
        elapsedActiveMs?: number
        activeStages?: string[]
        lastProgressAt?: string | null
    }
    permissions?: { canPause?: boolean; canResume?: boolean; canRetry?: boolean; canExport?: boolean; canDelete?: boolean }
}

interface AffiliateCheckDashboardSummary {
    quota?: {
        extract?: { used?: number; limit?: number; remaining?: number }
        checkNew?: { used?: number; limit?: number; remaining?: number }
        checkReusable?: { used?: number; limit?: number; remaining?: number }
    }
    summary?: {
        checksPerformedToday?: number
        jobsCreatedToday?: number
        activeAssignments?: number
        eligibleRowsToday?: number
        assignedToStockToday?: number
        generalStockToday?: number
        errorsToday?: number
    }
}

interface ModeCardConfig {
    mode: CheckMode
    title: string
    description: string
    icon: any
    accent: "emerald" | "violet" | "blue"
    enabled: boolean
    available?: number
    quota?: number
    disabledReason: string
}

const SUPPORTED_CHECK_ROLES = ["gerencia", "desarrollador", "encargado", "supervisor"]
const CHECK_MANAGER_ROLES = ["gerencia", "desarrollador", "encargado"]
const CHECK_PROCESS_ROLES = ["gerencia", "desarrollador"]
const FINAL_CHECK_STATUSES = ["completed", "completed_with_errors", "failed", "cancelled", "stuck", "partially_cancelled"]
const FAST_POLL_STATUSES = ["pending", "processing", "pausing", "retrying"]

function formatCheckNumber(value?: number | null) {
    if (typeof value !== "number" || Number.isNaN(value)) return "—"
    return value.toLocaleString("es-AR")
}

function argentinaTodayInputValue(now = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Argentina/Buenos_Aires",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(now)
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
    return values.year + "-" + values.month + "-" + values.day
}

function formatCheckDate(value?: string) {
    if (!value) return "—"
    return new Date(value).toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    })
}

function checkModeLabel(mode: CheckMode) {
    const labels: Record<CheckMode, string> = {
        check_new: "Datos nuevos",
        check_reusable: "Datos reutilizables",
        extract_base: "Extracción de base",
        check_import: "Archivo externo",
    }
    return labels[mode] || mode
}

function checkStatusLabel(status: string) {
    const labels: Record<string, string> = {
        draft: "Borrador",
        pending: "En espera",
        pausing: "Pausando",
        paused: "Pausado",
        retrying: "Reintentando",
        processing: "Procesando",
        completed: "Completado",
        completed_with_errors: "Completado con errores",
        failed: "Fallido",
        stuck: "Detenido",
        partially_cancelled: "Cancelado parcialmente",
        cancelled: "Cancelado",
    }
    return labels[status] || status
}

function checkStatusClasses(status: string) {
    const classes: Record<string, string> = {
        draft: "bg-slate-100 text-slate-700 border-slate-200",
        pending: "bg-amber-50 text-amber-700 border-amber-200",
        processing: "bg-cyan-50 text-cyan-700 border-cyan-200",
        pausing: "bg-amber-50 text-amber-700 border-amber-200",
        paused: "bg-violet-50 text-violet-700 border-violet-200",
        retrying: "bg-blue-50 text-blue-700 border-blue-200",
        completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
        completed_with_errors: "bg-orange-50 text-orange-700 border-orange-200",
        failed: "bg-red-50 text-red-700 border-red-200",
        stuck: "bg-red-50 text-red-700 border-red-200",
        partially_cancelled: "bg-orange-50 text-orange-700 border-orange-200",
        cancelled: "bg-slate-100 text-slate-500 border-slate-200",
    }
    return classes[status] || "bg-slate-100 text-slate-700 border-slate-200"
}

export function ChequeoDatos() {
    const { user } = useAuth()
    const role = user?.role?.toLowerCase() || ""
    const canAccess = SUPPORTED_CHECK_ROLES.includes(role)
    const canSeeAllJobs = CHECK_MANAGER_ROLES.includes(role)
    const canProcessManually = CHECK_PROCESS_ROLES.includes(role)

    const [config, setConfig] = useState<AffiliateCheckConfig | null>(null)
    const [baseStatus, setBaseStatus] = useState<BaseStatus | null>(null)
    const [dashboardSummary, setDashboardSummary] = useState<AffiliateCheckDashboardSummary | null>(null)
    const [jobs, setJobs] = useState<AffiliateCheckJob[]>([])
    const [selectedJobsDate, setSelectedJobsDate] = useState(() => argentinaTodayInputValue())
    const [jobsLoading, setJobsLoading] = useState(false)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [cancellingJobId, setCancellingJobId] = useState<string | null>(null)
    const [actingJobId, setActingJobId] = useState<string | null>(null)
    const jobsRef = useRef<AffiliateCheckJob[]>([])
    const jobsRequestInFlight = useRef(false)
    const jobsRequestSequence = useRef(0)
    const jobsAbortControllerRef = useRef<AbortController | null>(null)
    const etaHistoryRef = useRef<Record<string, { status: string; value: number }>>({})

    const [modalOpen, setModalOpen] = useState(false)
    const [modalMode, setModalMode] = useState<CheckMode | null>(null)
    const [requestedCount, setRequestedCount] = useState(100)
    const [previewResult, setPreviewResult] = useState<any | null>(null)
    const [previewLoading, setPreviewLoading] = useState(false)
    const [createLoading, setCreateLoading] = useState(false)
    const [supervisors, setSupervisors] = useState<any[]>([])
    const [supervisorsLoading, setSupervisorsLoading] = useState(false)
    const [selectedSupervisor, setSelectedSupervisor] = useState("")
    const [modalError, setModalError] = useState<string | null>(null)
    const [obraSocialStrategy, setObraSocialStrategy] = useState<ObraSocialStrategy>("automatic")
    const [obraSocialSearch, setObraSocialSearch] = useState("")
    const [obraSocialOptions, setObraSocialOptions] = useState<ObraSocialAvailabilityItem[]>([])
    const [selectedObrasSociales, setSelectedObrasSociales] = useState<ObraSocialAvailabilityItem[]>([])
    const [obraSocialLoading, setObraSocialLoading] = useState(false)
    const [lastCreationSummary, setLastCreationSummary] = useState<any | null>(null)

    const needsSupervisor = (mode: CheckMode | null) =>
        mode === "extract_base" && CHECK_MANAGER_ROLES.includes(role)

    const isInternalMode = (mode: CheckMode | null): mode is "check_new" | "check_reusable" =>
        mode === "check_new" || mode === "check_reusable"

    useEffect(() => {
        if (!modalOpen || !isInternalMode(modalMode) || obraSocialStrategy !== "manual") return
        const controller = new AbortController()
        const timer = window.setTimeout(async () => {
            setObraSocialLoading(true)
            try {
                const response = await api.affiliates.check.getObraSocialAvailability({
                    mode: modalMode,
                    search: obraSocialSearch,
                    limit: 50,
                    selectedCodes: selectedObrasSociales.map(item => item.code),
                })
                if (!controller.signal.aborted) setObraSocialOptions(response.data?.data || [])
            } catch (err: any) {
                if (!controller.signal.aborted) {
                    setModalError(err.response?.data?.message || "No se pudo consultar la disponibilidad por obra social")
                }
            } finally {
                if (!controller.signal.aborted) setObraSocialLoading(false)
            }
        }, 300)
        return () => {
            controller.abort()
            window.clearTimeout(timer)
        }
    }, [modalOpen, modalMode, obraSocialStrategy, obraSocialSearch, selectedObrasSociales])

    const loadDashboard = useCallback(async () => {
        if (!canAccess) {
            setLoading(false)
            return
        }

        setLoading(true)
        setError(null)

        try {
            const [configRes, statusRes, summaryRes] = await Promise.all([
                api.affiliates.check.getConfig(),
                api.affiliates.baseStatus(),
                api.affiliates.check.getDashboardSummary({ date: selectedJobsDate }),
            ])

            setConfig(configRes.data?.config || null)
            setBaseStatus(statusRes.data || null)
            setDashboardSummary(summaryRes.data || null)
        } catch (err: any) {
            setError(err.response?.data?.message || err.response?.data?.error || "No se pudo cargar Chequeo de Datos")
        } finally {
            setLoading(false)
        }
    }, [canAccess, selectedJobsDate])

    const loadJobs = useCallback(async (showLoading = false) => {
        if (!canAccess) return
        jobsAbortControllerRef.current?.abort()
        const controller = new AbortController()
        jobsAbortControllerRef.current = controller
        jobsRequestInFlight.current = true
        const sequence = ++jobsRequestSequence.current
        if (showLoading) setJobsLoading(true)
        try {
            const params = canSeeAllJobs ? { limit: 25, all: true, date: selectedJobsDate } : { limit: 25, date: selectedJobsDate }
            const response = await api.affiliates.check.listJobs(params, { signal: controller.signal })
            const nextJobs: AffiliateCheckJob[] = (response.data?.jobs || []).map((job: AffiliateCheckJob) => {
                const eta = job.progress?.estimatedRemainingMs
                if (eta == null || FINAL_CHECK_STATUSES.includes(job.status) || job.status === "paused") {
                    delete etaHistoryRef.current[job._id]
                    return job
                }
                const previous = etaHistoryRef.current[job._id]
                const smoothed = previous && previous.status === job.status ? Math.round(previous.value * 0.65 + eta * 0.35) : eta
                etaHistoryRef.current[job._id] = { status: job.status, value: smoothed }
                return { ...job, progress: { ...job.progress, estimatedRemainingMs: smoothed } }
            })
            if (sequence === jobsRequestSequence.current) setJobs(nextJobs)
        } catch (err: any) {
            if (err?.code !== "ERR_CANCELED" && err?.name !== "CanceledError" && sequence === jobsRequestSequence.current) {
                setError(err.response?.data?.message || "No se pudo actualizar el progreso")
            }
        } finally {
            if (sequence === jobsRequestSequence.current) {
                jobsRequestInFlight.current = false
                setJobsLoading(false)
            }
        }
    }, [canAccess, canSeeAllJobs, selectedJobsDate])

    useEffect(() => {
        loadDashboard()
    }, [loadDashboard])

    useEffect(() => {
        setJobs([])
        etaHistoryRef.current = {}
        void loadJobs(true)
        return () => jobsAbortControllerRef.current?.abort()
    }, [loadJobs])

    useEffect(() => { jobsRef.current = jobs }, [jobs])

    useEffect(() => {
        if (!canAccess) return
        let stopped = false
        let timer: ReturnType<typeof setTimeout> | null = null
        const schedule = () => {
            if (stopped) return
            const active = jobsRef.current.some(job => FAST_POLL_STATUSES.includes(job.status))
            const hidden = document.visibilityState === "hidden"
            timer = setTimeout(tick, hidden ? 60000 : active ? 3000 : 25000)
        }
        const tick = async () => {
            if (!stopped && document.visibilityState !== "hidden") await loadJobs()
            schedule()
        }
        const onVisibilityChange = () => {
            if (timer) clearTimeout(timer)
            if (document.visibilityState === "visible") void loadJobs().finally(schedule)
            else schedule()
        }
        schedule()
        document.addEventListener("visibilitychange", onVisibilityChange)
        return () => {
            stopped = true
            jobsRequestSequence.current += 1
            jobsAbortControllerRef.current?.abort()
            if (timer) clearTimeout(timer)
            document.removeEventListener("visibilitychange", onVisibilityChange)
        }
    }, [canAccess, loadJobs])

    const totals = baseStatus?.totals || {}
    const quotaSummary = dashboardSummary?.quota || {}
    const dailySummary = dashboardSummary?.summary || {}

    const modeCards: ModeCardConfig[] = [
        {
            mode: "check_new",
            title: "Chequear nuevos",
            description: "Datos frescos, sin chequear, nunca usados.",
            icon: ClipboardCheck,
            accent: "emerald",
            enabled: config?.features?.checkNewEnabled === true,
            available: totals.unchecked,
            quota: config?.dailyQuota?.checkNew,
            disabledReason: "Worker de chequeo no habilitado",
        },
        {
            mode: "check_reusable",
            title: "Chequear reutilizables",
            description: "Datos con chequeo vencido, listos para volver a validar.",
            icon: RotateCcw,
            accent: "violet",
            enabled: config?.features?.checkReusableEnabled === true,
            available: totals.expired,
            quota: config?.dailyQuota?.checkReusable,
            disabledReason: "Worker de chequeo no habilitado",
        },
        {
            mode: "extract_base",
            title: "Extraer de base",
            description: "Datos ya chequeados y aptos, listos para asignar.",
            icon: Database,
            accent: "blue",
            enabled: config?.features?.extractBaseEnabled !== false,
            available: totals.availableForSale,
            quota: config?.dailyQuota?.extractBase,
            disabledReason: "La extracción desde base está deshabilitada temporalmente.",
        },
    ]

    const canCancelJob = (job: AffiliateCheckJob) => {
        if (FINAL_CHECK_STATUSES.includes(job.status)) return false
        if (CHECK_MANAGER_ROLES.includes(role)) return true
        return role === "supervisor" && job.status === "pending"
    }

    const cancelJob = async (job: AffiliateCheckJob) => {
        if (!canCancelJob(job)) return
        if (!window.confirm("¿Cancelar este trabajo de chequeo?")) return

        setCancellingJobId(job._id)
        setError(null)

        try {
            await api.affiliates.check.cancelJob(job._id, { reason: "cancelled_from_ui_shell" })
            await loadJobs()
            return true
        } catch (err: any) {
            setError(err.response?.data?.message || "No se pudo cancelar el trabajo")
        } finally {
            setCancellingJobId(null)
        }
    }

    const runJobAction = async (job: AffiliateCheckJob, action: "pause" | "resume" | "retry" | "export" | "delete") => {
        setActingJobId(job._id)
        setError(null)
        try {
            if (action === "pause") await api.affiliates.check.pauseJob(job._id, { reason: "Pausa solicitada desde Chequeo de Datos" })
            if (action === "resume") await api.affiliates.check.resumeJob(job._id)
            if (action === "retry") await api.affiliates.check.retryJob(job._id, { reason: "Reintento solicitado desde Chequeo de Datos" })
            if (action === "delete") await api.affiliates.check.deleteJob(job._id, { reason: "Eliminado del historial desde Chequeo de Datos" })
            if (action === "export") {
                const response = await api.affiliates.check.exportJob(job._id)
                const url = window.URL.createObjectURL(new Blob([response.data]))
                const link = document.createElement("a")
                link.href = url
                link.download = `chequeo_archivo_${job._id}.xlsx`
                document.body.appendChild(link)
                link.click()
                link.remove()
                window.URL.revokeObjectURL(url)
            }
            toast.success(action === "export" ? "Exportación descargada" : "Trabajo actualizado")
            await loadJobs()
            return true
        } catch (err: any) {
            const message = err.response?.data?.message || err.response?.data?.error || "No se pudo completar la acción"
            setError(message)
            toast.error(message)
            return false
        } finally {
            setActingJobId(null)
        }
    }


    const downloadTemplate = async () => {
        const XLSX = await import("xlsx")
        const rows = [
            ["nombre", "cuil", "obraSocial", "localidad", "telefono1", "telefono2", "telefono3"],
            ["Ejemplo Afiliado", "20-12345678-3", "OBRA SOCIAL", "Avellaneda", "1123456789", "", ""],
        ]
        const worksheet = XLSX.utils.aoa_to_sheet(rows)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, "Afiliados")
        XLSX.writeFile(workbook, "plantilla_chequeo_archivo_externo.xlsx")
    }

    const closeModal = () => {
        setModalOpen(false)
        setModalMode(null)
        setPreviewResult(null)
        setModalError(null)
        setCreateLoading(false)
        setPreviewLoading(false)
        setSelectedSupervisor("")
        setObraSocialStrategy("automatic")
        setObraSocialSearch("")
        setObraSocialOptions([])
        setSelectedObrasSociales([])
    }

    const runPreview = async () => {
        if (!modalMode) return
        if (needsSupervisor(modalMode) && !selectedSupervisor) {
            setModalError("Seleccioná un supervisor destino antes de continuar.")
            return
        }
        if (!Number.isFinite(requestedCount) || requestedCount < 1) {
            setModalError("La cantidad solicitada debe ser un número mayor o igual a 1.")
            return
        }
        if (isInternalMode(modalMode) && obraSocialStrategy === "manual" && selectedObrasSociales.length === 0) {
            setModalError("Selecciona al menos una obra social.")
            return
        }
        setPreviewLoading(true)
        setModalError(null)
        try {
            const payload: any = {
                mode: modalMode,
                requestedCount,
                filters: {},
            }
            if (selectedSupervisor) {
                payload.supervisorId = selectedSupervisor
            }
            if (isInternalMode(modalMode)) {
                payload.obraSocialSelection = {
                    strategy: obraSocialStrategy,
                    items: obraSocialStrategy === "manual"
                        ? selectedObrasSociales.map(item => ({ code: item.code, name: item.name }))
                        : [],
                }
            }
            const res = await api.affiliates.check.preview(payload)
            setPreviewResult(res.data)
            if (res.data?.canCreate === false) {
                setModalError("Ya existe un trabajo activo para este modo. Esperá a que finalice o cancelalo antes de crear otro igual.")
            }
        } catch (err: any) {
            setModalError(err.response?.data?.message || err.response?.data?.error || "Error en la previsualización")
        } finally {
            setPreviewLoading(false)
        }
    }

    const runCreateJob = async () => {
        if (!modalMode) return
        if (needsSupervisor(modalMode) && !selectedSupervisor) {
            setModalError("Seleccioná un supervisor destino antes de continuar.")
            return
        }
        if (!Number.isFinite(requestedCount) || requestedCount < 1) {
            setModalError("La cantidad solicitada debe ser un número mayor o igual a 1.")
            return
        }
        if (isInternalMode(modalMode) && obraSocialStrategy === "manual" && selectedObrasSociales.length === 0) {
            setModalError("Selecciona al menos una obra social.")
            return
        }
        if (previewResult?.canCreate === false) {
            setModalError("Ya existe un trabajo activo para este modo. No se puede crear otro igual hasta que finalice.")
            return
        }
        setCreateLoading(true)
        setModalError(null)
        try {
            const payload: any = {
                mode: modalMode,
                requestedCount,
                filters: {},
            }
            if (selectedSupervisor) {
                payload.supervisorId = selectedSupervisor
            }
            if (isInternalMode(modalMode)) {
                payload.obraSocialSelection = {
                    strategy: obraSocialStrategy,
                    items: obraSocialStrategy === "manual"
                        ? selectedObrasSociales.map(item => ({ code: item.code, name: item.name }))
                        : [],
                }
            }
            const res = await api.affiliates.check.createJob(payload)
            const createdJob = res.data?.job
            setLastCreationSummary(createdJob ? {
                requestedCount: createdJob.requestedCount,
                selectedCount: createdJob.selectedCount,
                distribution: createdJob.obraSocialSelection?.finalDistribution || [],
            } : null)
            if (res.data?.partialCreation) {
                toast.success(res.data.partialMessage || "Trabajo creado con disponibilidad parcial")
            } else {
                toast.success("Trabajo creado correctamente")
            }
            closeModal()
            await loadDashboard()
        } catch (err: any) {
            setModalError(err.response?.data?.message || err.response?.data?.error || "No se pudo crear el trabajo")
        } finally {
            setCreateLoading(false)
        }
    }

    if (!user) {
        return (
            <div className="rounded-3xl border border-slate-100 bg-white p-8 text-center text-slate-500 shadow-xl shadow-slate-100/80">
                <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-emerald-600" />
                Cargando usuario...
            </div>
        )
    }

    if (!canAccess) {
        return (
            <div className="animate-fade-in-up space-y-6">
                <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-white to-amber-50 p-8 shadow-xl shadow-amber-100/50">
                    <div className="flex max-w-3xl items-start gap-4">
                        <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                            <ShieldCheck className="h-7 w-7" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">Chequeo de Datos</h2>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                Esta interfaz está disponible para gerencia, encargados y supervisores.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="animate-fade-in-up w-full max-w-[1600px] space-y-5 overflow-x-hidden pr-4">
            <section className="rounded-[28px] border border-emerald-100 bg-white/90 shadow-sm shadow-emerald-100/40">
                <div className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Chequeo de Datos</h1>
                            <p className="mt-1 max-w-3xl text-sm text-slate-600">
                                Centro operativo de verificación, extracción y asignación de datos.
                            </p>
                            <p className="mt-0.5 max-w-3xl text-sm text-slate-500">
                                Gestioná cupos diarios y distribuí los datos de tu stock personal a tu equipo.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {CHECK_MANAGER_ROLES.includes(role) && (
                            <button type="button" disabled className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
                                <Settings className="h-4 w-4" />
                                Configuración
                            </button>
                        )}
                        <button type="button" disabled className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
                            <FolderClock className="h-4 w-4" />
                            Mis jobs
                        </button>
                        <button type="button" onClick={() => { void loadDashboard(); void loadJobs(true) }} disabled={loading || jobsLoading} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
                            <RefreshCw className={cn("h-4 w-4", (loading || jobsLoading) && "animate-spin")} />
                            Actualizar
                        </button>
                    </div>
                </div>
            </section>

            {error && (
                <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.65fr)_minmax(360px,1fr)]">
                <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-5 flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base font-bold text-slate-900">Cupos de hoy</h2>
                            <p className="text-xs text-slate-500">
                                Argentina · {new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })}
                            </p>
                        </div>
                        <button type="button" disabled className="text-xs font-semibold text-blue-500 disabled:opacity-50">Ver detalle de cupos</button>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <CupoProgressBar label="Chequear nuevos" color="emerald" quota={quotaSummary.checkNew?.limit ?? config?.dailyQuota?.checkNew} used={quotaSummary.checkNew?.used} remaining={quotaSummary.checkNew?.remaining} loading={loading} />
                        <CupoProgressBar label="Chequear reutilizables" color="violet" quota={quotaSummary.checkReusable?.limit ?? config?.dailyQuota?.checkReusable} used={quotaSummary.checkReusable?.used} remaining={quotaSummary.checkReusable?.remaining} loading={loading} />
                        <CupoProgressBar label="Extraer de base" color="blue" quota={quotaSummary.extract?.limit ?? config?.dailyQuota?.extractBase} used={quotaSummary.extract?.used} remaining={quotaSummary.extract?.remaining} loading={loading} />
                    </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-base font-bold text-slate-900">Propiedad del dato</h2>
                    <div className="mt-5 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                            <Calendar className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-950">{loading ? "—" : (config?.ownershipDays ?? "—")} días</p>
                            <p className="text-xs text-slate-500">Tiempo asignado por propiedad</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <h2 className="text-base font-bold text-slate-900">Resumen del día</h2>
                        <span className="text-[10px] text-slate-500">
                            Actualizado: {new Date().toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })} hs
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                        <MiniStat label="Datos disponibles totales" value={formatCheckNumber(totals.availableForSale)} loading={loading} icon={<Database className="h-4 w-4" />} color="emerald" />
                        <MiniStat label="Asignaciones activas" value={formatCheckNumber(dailySummary.activeAssignments)} loading={loading} icon={<Users className="h-4 w-4" />} color="blue" />
                        <MiniStat label="Vencimientos próximos" value={formatCheckNumber(totals.expired)} loading={loading} icon={<Clock className="h-4 w-4" />} color="violet" />
                        <MiniStat label="Chequeos realizados hoy" value={formatCheckNumber(dailySummary.checksPerformedToday)} loading={loading} icon={<CheckCircle2 className="h-4 w-4" />} color="orange" />
                    </div>
                </div>
            </section>

            <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white">
                        <Zap className="h-3.5 w-3.5" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-900">¿Qué querés hacer hoy?</h2>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    {modeCards.map(card => (
                        <CheckModeCard
                            key={card.mode}
                            card={card}
                            loading={loading}
                            onOpen={() => {
                                if (!card.enabled) return
                                setModalMode(card.mode)
                                setModalOpen(true)
                                setPreviewResult(null)
                                setModalError(null)
                                setSelectedSupervisor("")
                                setObraSocialStrategy("automatic")
                                setObraSocialSearch("")
                                setObraSocialOptions([])
                                setSelectedObrasSociales([])
                                const quotaValue = Number(card.quota)
                                const availableValue = Number(card.available)
                                const safeQuota = Number.isFinite(quotaValue) && quotaValue > 0 ? quotaValue : undefined
                                const safeAvailable = Number.isFinite(availableValue) && availableValue > 0 ? availableValue : undefined
                                const q = Math.min(100, safeQuota ?? 100, safeAvailable ?? 100)
                                setRequestedCount(Math.max(1, q || 100))
                                if (card.mode === "extract_base" && CHECK_MANAGER_ROLES.includes(role)) {
                                    setSupervisorsLoading(true)
                                    api.users.getSupervisors()
                                        .then(res => {
                                            const list = Array.isArray(res.data) ? res.data : []
                                            setSupervisors(list)
                                        })
                                        .catch(() => setModalError("No se pudieron cargar los supervisores"))
                                        .finally(() => setSupervisorsLoading(false))
                                }
                            }}
                        />
                    ))}
                </div>

                {modalOpen && modalMode && (
                    <section className="mt-4 rounded-[22px] border border-blue-100 bg-blue-50/40 p-5 shadow-sm">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Configurar {checkModeLabel(modalMode).toLowerCase()}</h3>
                                <p className="mt-1 text-sm text-slate-600">Elegí la cantidad, previsualizá disponibilidad y confirmá la creación del trabajo.</p>
                            </div>
                            <button type="button" onClick={closeModal} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-800">
                                <X className="h-4 w-4" />
                                Cerrar
                            </button>
                        </div>

                        {modalError && (
                            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                                <span>{modalError}</span>
                            </div>
                        )}

                        <div className={cn("mt-5 grid grid-cols-1 gap-4", needsSupervisor(modalMode) && "lg:grid-cols-[220px_minmax(0,1fr)]")}>
                            <div className="max-w-[220px]">
                                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cantidad de datos</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={99999}
                                    value={requestedCount}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value, 10)
                                        setRequestedCount(Number.isNaN(val) ? 1 : Math.max(1, val))
                                    }}
                                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                />
                                <p className="mt-2 text-xs text-slate-500">Se ajustará al cupo y al stock apto.</p>
                            </div>

                            {modalMode === "extract_base" && CHECK_MANAGER_ROLES.includes(role) && (
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Supervisor destino</label>
                                    {supervisorsLoading ? (
                                        <div className="mt-2 flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-500">
                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                            Cargando supervisores...
                                        </div>
                                    ) : supervisors.length > 0 ? (
                                        <select value={selectedSupervisor} onChange={(e) => setSelectedSupervisor(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
                                            <option value="" disabled>Seleccioná un supervisor...</option>
                                            {supervisors.map((s: any) => (
                                                <option key={s._id} value={String(s._id)}>{s.nombre || s.name || s.email || "Sin nombre"}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <div className="mt-2 flex h-11 items-center rounded-xl border border-amber-200 bg-amber-50 px-3 text-sm text-amber-700">No hay supervisores disponibles.</div>
                                    )}
                                </div>
                            )}
                        </div>

                        {isInternalMode(modalMode) && (
                            <div className="mt-5 space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selección de obras sociales</p>
                                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                        {[
                                            { strategy: "automatic" as const, title: "Selección automática", description: "El sistema combinará datos de distintas obras sociales según la disponibilidad." },
                                            { strategy: "manual" as const, title: "Elegir obras sociales", description: "Selecciona una o varias obras sociales específicas." },
                                        ].map(option => (
                                            <button
                                                key={option.strategy}
                                                type="button"
                                                onClick={() => {
                                                    setObraSocialStrategy(option.strategy)
                                                    setPreviewResult(null)
                                                    setModalError(null)
                                                }}
                                                className={cn(
                                                    "rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
                                                    obraSocialStrategy === option.strategy
                                                        ? "border-blue-400 bg-blue-50"
                                                        : "border-slate-200 bg-white hover:border-slate-300"
                                                )}
                                            >
                                                <span className="block text-sm font-semibold text-slate-900">{option.title}</span>
                                                <span className="mt-1 block text-xs leading-5 text-slate-500">{option.description}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {obraSocialStrategy === "manual" && (
                                    <div>
                                        {selectedObrasSociales.length > 0 && (
                                            <div className="mb-3 flex flex-wrap gap-2">
                                                {selectedObrasSociales.map(item => (
                                                    <span key={item.code} className="inline-flex max-w-full items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs text-blue-800">
                                                        <span className="truncate">{item.name}</span>
                                                        <button
                                                            type="button"
                                                            aria-label={`Quitar ${item.name}`}
                                                            onClick={() => {
                                                                setSelectedObrasSociales(current => current.filter(selected => selected.code !== item.code))
                                                                setPreviewResult(null)
                                                            }}
                                                            className="rounded-full p-0.5 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        <div className="relative">
                                            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                                            <input
                                                type="search"
                                                role="combobox"
                                                aria-expanded="true"
                                                aria-controls="obra-social-results"
                                                value={obraSocialSearch}
                                                onChange={event => setObraSocialSearch(event.target.value)}
                                                placeholder="Buscar por nombre o código..."
                                                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                            />
                                        </div>
                                        <div id="obra-social-results" role="listbox" aria-multiselectable="true" className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                                            {obraSocialLoading ? (
                                                <div className="flex items-center gap-2 p-4 text-sm text-slate-500">
                                                    <RefreshCw className="h-4 w-4 animate-spin" /> Buscando disponibilidad...
                                                </div>
                                            ) : obraSocialOptions.length === 0 ? (
                                                <div className="p-4 text-sm text-slate-500">No hay obras sociales disponibles para este modo.</div>
                                            ) : obraSocialOptions.map(item => {
                                                const selected = selectedObrasSociales.some(current => current.code === item.code)
                                                return (
                                                    <button
                                                        key={item.code}
                                                        type="button"
                                                        role="option"
                                                        aria-selected={selected}
                                                        onClick={() => {
                                                            setSelectedObrasSociales(current => selected
                                                                ? current.filter(value => value.code !== item.code)
                                                                : [...current, item])
                                                            setPreviewResult(null)
                                                        }}
                                                        className={cn(
                                                            "flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-3 text-left text-sm last:border-b-0 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400",
                                                            selected && "bg-blue-50"
                                                        )}
                                                    >
                                                        <span className="min-w-0">
                                                            <span className="block truncate font-medium text-slate-900">{item.name}</span>
                                                            <span className="block text-xs text-slate-500">Código {item.codePadded}</span>
                                                        </span>
                                                        <span className="flex-shrink-0 text-xs font-semibold text-slate-600">{formatCheckNumber(item.availableCount)} disponibles</span>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                        {selectedObrasSociales.length === 0 && (
                                            <p className="mt-2 text-xs text-amber-700">Selecciona al menos una obra social para previsualizar.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {previewResult && (
                            <div className="mt-5 space-y-4 rounded-2xl border border-blue-100 bg-white p-4">
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                    {[
                                        ["Solicitados", previewResult.requestedCount],
                                        ["Aptos en base", previewResult.selectableCount],
                                        ["Cupo disponible", previewResult.remaining],
                                        ["Total a procesar", previewResult.willSelectCount],
                                    ].map(([label, value]) => (
                                        <div key={String(label)} className="min-w-0">
                                            <p className="truncate text-xs text-slate-500">{label}</p>
                                            <p className="mt-1 text-lg font-bold text-slate-900">{formatCheckNumber(value as number)}</p>
                                        </div>
                                    ))}
                                </div>
                                {Array.isArray(previewResult.distribution) && previewResult.distribution.length > 0 && (
                                    <div className="border-t border-slate-100 pt-3">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-sm font-semibold text-slate-900">Distribución estimada</p>
                                            <span className="text-xs text-slate-500">Puede cambiar al confirmar</span>
                                        </div>
                                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                            {previewResult.distribution.map((item: any) => (
                                                <div key={item.code} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                                                    <span className="truncate text-slate-700">{item.name}</span>
                                                    <span className="font-semibold text-slate-900">{formatCheckNumber(item.plannedCount)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mt-5 flex flex-wrap justify-end gap-2">
                            <button type="button" onClick={runPreview} disabled={previewLoading || createLoading || (needsSupervisor(modalMode) && !selectedSupervisor) || (isInternalMode(modalMode) && obraSocialStrategy === "manual" && selectedObrasSociales.length === 0)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
                                {previewLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                                {previewLoading ? "Calculando..." : "Previsualizar"}
                            </button>
                            <button type="button" onClick={runCreateJob} disabled={createLoading || previewLoading || (needsSupervisor(modalMode) && !selectedSupervisor) || (isInternalMode(modalMode) && obraSocialStrategy === "manual" && selectedObrasSociales.length === 0) || !previewResult || previewResult?.canCreate === false} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                                {createLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                                {createLoading ? "Creando..." : "Crear trabajo"}
                            </button>
                        </div>
                    </section>
                )}
            </section>

            {lastCreationSummary && (
                <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold text-emerald-900">Trabajo interno creado</p>
                            <p className="mt-1 text-sm text-emerald-800">Solicitados: {formatCheckNumber(lastCreationSummary.requestedCount)} · Seleccionados: {formatCheckNumber(lastCreationSummary.selectedCount)}</p>
                        </div>
                        <button type="button" onClick={() => setLastCreationSummary(null)} className="rounded-lg p-1 text-emerald-700 hover:bg-emerald-100" aria-label="Cerrar resumen">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    {lastCreationSummary.distribution?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {lastCreationSummary.distribution.filter((item: any) => item.selectedCount > 0).map((item: any) => (
                                <span key={item.code} className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs text-emerald-900">
                                    {item.name}: {formatCheckNumber(item.selectedCount)}
                                </span>
                            ))}
                        </div>
                    )}
                </section>
            )}

            <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                <Info className="h-5 w-5 flex-shrink-0 text-blue-500" />
                <p className="text-sm font-medium text-slate-700">
                    {CHECK_MANAGER_ROLES.includes(role)
                        ? "Los datos extraídos serán asignados según el supervisor destino seleccionado. Podrás elegir supervisor o dejar el resultado como stock general cuando el flujo corresponda."
                        : "Los datos extraídos serán asignados a tu propiedad y podrás distribuirlos a los afiliados de tu equipo."
                    }
                </p>
            </div>

            <ExternalExcelCheckCard enabled={config?.features?.checkImportEnabled === true} quota={config?.dailyQuota?.checkImport} role={role} onDownloadTemplate={downloadTemplate} onJobCreated={loadJobs} />

            <section className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <div className="min-w-0">
                    <RecentCheckJobsTable jobs={jobs} loading={loading || jobsLoading} selectedDate={selectedJobsDate} todayDate={argentinaTodayInputValue()} onDateChange={setSelectedJobsDate} canProcessManually={canProcessManually} canCancelJob={canCancelJob} onCancel={cancelJob} cancellingJobId={cancellingJobId} actingJobId={actingJobId} onAction={runJobAction} />
                </div>
                <div className="min-w-0 space-y-5">
                    <StockPersonalPanel baseStatus={baseStatus} loading={loading} role={role} />
                    <ActivityPanel jobs={jobs} loading={loading} />
                </div>
            </section>
        </div>
    )
}

function CupoProgressBar({ label, color, quota, used, remaining, loading }: { label: string; color: "emerald" | "violet" | "blue"; quota?: number; used?: number; remaining?: number; loading: boolean }) {
    const colorMap = {
        emerald: { text: "text-emerald-600", bar: "bg-emerald-500" },
        violet: { text: "text-violet-600", bar: "bg-violet-500" },
        blue: { text: "text-blue-600", bar: "bg-blue-500" },
    }
    const c = colorMap[color]
    const q = quota ?? 0
    const usedValue = Math.max(0, Number(used || 0))
    const remainingValue = remaining ?? Math.max(0, q - usedValue)
    const percent = q > 0 ? Math.min(100, Math.round((usedValue / q) * 100)) : 0

    return (
        <div className="min-w-0">
            <p className="truncate text-xs font-medium text-slate-600">{label}</p>
            <div className="mt-3 flex items-end gap-1">
                <span className="text-xl font-bold text-slate-950">{loading ? "—" : formatCheckNumber(usedValue)}</span>
                <span className="pb-0.5 text-xs text-slate-400">/ {loading ? "—" : formatCheckNumber(q)}</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-slate-100">
                <div className={cn("h-2 rounded-full transition-all duration-500", c.bar)} style={{ width: `${percent}%` }} />
            </div>
            <p className={cn("mt-2 text-xs font-medium", c.text)}>Restantes: {loading ? "—" : formatCheckNumber(remainingValue)}</p>
        </div>
    )
}

function MiniStat({ label, value, loading, icon, color }: { label: string; sublabel?: string; value: string; loading: boolean; icon?: React.ReactNode; color?: "emerald" | "blue" | "violet" | "orange" }) {
    const colorMap = {
        emerald: "text-emerald-600 bg-emerald-50",
        blue: "text-blue-600 bg-blue-50",
        violet: "text-violet-600 bg-violet-50",
        orange: "text-orange-600 bg-orange-50",
    }
    const iconClass = color && colorMap[color] ? colorMap[color] : "text-slate-600 bg-slate-50"

    return (
        <div className="flex min-w-0 items-center gap-2.5">
            {icon && <div className={cn("flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg", iconClass)}>{icon}</div>}
            <div className="min-w-0">
                <p className="truncate text-[11px] font-medium text-slate-500">{label}</p>
                <p className="mt-0.5 text-lg font-bold text-slate-900">{loading ? "—" : value}</p>
            </div>
        </div>
    )
}

function CheckModeCard({ card, loading, onOpen }: { card: ModeCardConfig; loading: boolean; onOpen?: () => void }) {
    const colorStyles: Record<ModeCardConfig["accent"], { border: string; bg: string; badge: string; title: string; btn: string }> = {
        emerald: {
            border: "border-emerald-200",
            bg: "bg-emerald-50/30",
            badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
            title: "text-emerald-700",
            btn: "border-emerald-300 text-emerald-700 hover:bg-emerald-50",
        },
        violet: {
            border: "border-violet-200",
            bg: "bg-violet-50/30",
            badge: "border-violet-200 bg-violet-50 text-violet-700",
            title: "text-violet-700",
            btn: "border-violet-300 text-violet-700 hover:bg-violet-50",
        },
        blue: {
            border: "border-blue-200",
            bg: "bg-blue-50/30",
            badge: "border-blue-200 bg-blue-50 text-blue-700",
            title: "text-blue-700",
            btn: "border-blue-600 bg-blue-600 text-white hover:bg-blue-700",
        },
    }
    const s = colorStyles[card.accent]

    return (
        <article className={cn("rounded-[22px] border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md", s.border, s.bg)}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className={cn("text-lg font-bold", s.title)}>{card.title}</h3>
                    <p className="mt-3 max-w-[260px] text-sm leading-6 text-slate-600">{card.description}</p>
                </div>
                <span className={cn("flex-shrink-0 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wide", s.badge)}>
                    {card.enabled ? "Activo" : "En preparación"}
                </span>
            </div>

            <div className="mt-5">
                <p className="text-sm text-slate-500">Disponibles</p>
                <p className="mt-1 text-2xl font-bold text-slate-950">{loading ? "—" : formatCheckNumber(card.available)}</p>
            </div>

            <button
                type="button"
                onClick={card.enabled ? onOpen : undefined}
                disabled={!card.enabled}
                className={cn("mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60", s.btn)}
            >
                {card.enabled && (card.mode === "extract_base" ? <UploadCloud className="h-4 w-4" /> : <Eye className="h-4 w-4" />)}
                {card.mode === "extract_base" ? "Extraer datos" : "Previsualizar disponibilidad"}
            </button>

            <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                {card.enabled ? <Info className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                <span>{card.enabled ? (card.mode === "extract_base" ? "Asignación directa al destino elegido" : "Sujeto a cupo diario disponible") : card.disabledReason}</span>
            </div>
        </article>
    )
}

interface ExternalImportSummary {
    _id: string
    status: "pending" | "processing" | "completed" | "completed_with_errors" | "failed"
    totalRows?: number
    createdCount?: number
    updatedCount?: number
    existingLinkedCount?: number
    checkableCount?: number
    excludedCount?: number
    exclusionReasons?: Record<string, number>
    rejectedCount?: number
    batchId?: string | null
    rejectedFileAvailable?: boolean
    updatedFileAvailable?: boolean
}

const EXCLUSION_REASON_LABELS: Record<string, string> = {
    valid_check: "Chequeo todavía vigente",
    active_check: "Chequeo activo",
    reserved_by_other_job: "Reservado por otro trabajo",
    sold_or_qr: "Vendido o con QR realizado",
    assignment_conflict: "Restricción de asignación",
    ownership_conflict: "Restricción de propiedad",
    other: "Otro conflicto operativo",
}

type ExternalTargetMode = "general" | "supervisor"

function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function externalImportStatusLabel(status?: string) {
    const labels: Record<string, string> = {
        pending: "Pendiente",
        processing: "Procesando",
        completed: "Completado",
        completed_with_errors: "Completado con observaciones",
        failed: "Fallido",
    }
    return status ? (labels[status] || status) : "Sin iniciar"
}

function getExternalErrorMessage(error: any, fallback: string) {
    const status = error?.response?.status
    const code = error?.response?.data?.code
    const message = error?.response?.data?.message || error?.response?.data?.error
    if (status === 401) return "Tu sesión venció. Volvé a iniciar sesión para continuar."
    if (status === 403) return message || "No tenés permisos para acceder a esta importación."
    if (status === 404) return message || "La importación o el reporte solicitado no está disponible."
    if (code === "CHECK_IMPORT_DISABLED") return "La carga externa está preparada, pero no está habilitada por configuración."
    if (code === "IMPORT_NOT_COMPLETED") return "La importación todavía no terminó. Esperá a que finalice antes de crear el trabajo."
    if (code === "NO_ELIGIBLE_IMPORT_ROWS" || code === "NO_AVAILABLE_IMPORT_ROWS") return "No hay registros válidos disponibles para chequear en este archivo."
    if (code === "REQUESTED_COUNT_EXCEEDS_AVAILABLE") return message || "La cantidad supera los registros disponibles para chequear."
    return message || (error?.request ? "No se pudo conectar con el servidor. Intentá nuevamente." : fallback)
}

function triggerBlobDownload(data: BlobPart, filename: string) {
    const url = window.URL.createObjectURL(new Blob([data]))
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", filename)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
}

function ExternalExcelCheckCard({
    enabled,
    role,
    onDownloadTemplate,
    onJobCreated,
}: {
    enabled: boolean
    quota?: number
    role: string
    onDownloadTemplate: () => void
    onJobCreated: () => Promise<void>
}) {
    const isManager = CHECK_MANAGER_ROLES.includes(role)
    const fileInputRef = useRef<HTMLInputElement | null>(null)
    const pollingAttemptsRef = useRef(0)
    const [panelOpen, setPanelOpen] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [dragging, setDragging] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [importJobId, setImportJobId] = useState("")
    const [summary, setSummary] = useState<ExternalImportSummary | null>(null)
    const [summaryLoading, setSummaryLoading] = useState(false)
    const [externalError, setExternalError] = useState<string | null>(null)
    const [requestedCountInput, setRequestedCountInput] = useState("1")
    const [targetMode, setTargetMode] = useState<ExternalTargetMode>("general")
    const [supervisors, setSupervisors] = useState<any[]>([])
    const [supervisorsLoading, setSupervisorsLoading] = useState(false)
    const [selectedSupervisor, setSelectedSupervisor] = useState("")
    const [creatingJob, setCreatingJob] = useState(false)
    const [downloadingReport, setDownloadingReport] = useState<"rejected" | "updated" | null>(null)

    const terminalImport = summary && ["completed", "completed_with_errors", "failed"].includes(summary.status)
    const importReady = summary && ["completed", "completed_with_errors"].includes(summary.status)
    const importedUsableRows = (summary?.createdCount || 0) + (summary?.updatedCount || 0) + (summary?.existingLinkedCount || 0)
    const checkableRows = summary?.checkableCount ?? importedUsableRows
    const excludedRows = summary?.excludedCount ?? 0
    const exclusionReasonEntries = Object.entries(summary?.exclusionReasons || {}).filter(([, count]) => Number(count) > 0)
    const parsedRequestedCount = Number(requestedCountInput)
    const isRequestedCountValid =
        requestedCountInput.trim() !== "" &&
        Number.isFinite(parsedRequestedCount) &&
        Number.isInteger(parsedRequestedCount) &&
        parsedRequestedCount > 0 &&
        parsedRequestedCount <= checkableRows

    const refreshSummary = useCallback(async (jobId: string, quiet = false) => {
        if (!quiet) setSummaryLoading(true)
        try {
            const response = await api.affiliates.check.externalFile.getSummary(jobId)
            setSummary(response.data?.job || null)
            setExternalError(null)
        } catch (error: any) {
            setExternalError(getExternalErrorMessage(error, "No se pudo consultar el estado de la importación."))
        } finally {
            if (!quiet) setSummaryLoading(false)
        }
    }, [])

    useEffect(() => {
        if (!panelOpen || !importJobId || terminalImport) return
        pollingAttemptsRef.current = 0
        refreshSummary(importJobId)
        const interval = window.setInterval(() => {
            pollingAttemptsRef.current += 1
            if (pollingAttemptsRef.current >= 120) {
                window.clearInterval(interval)
                setExternalError("La importación sigue en proceso. Usá “Actualizar estado” para continuar consultando.")
                return
            }
            refreshSummary(importJobId, true)
        }, 3000)
        return () => window.clearInterval(interval)
    }, [panelOpen, importJobId, terminalImport, refreshSummary])

    useEffect(() => {
        if (!isManager || targetMode !== "supervisor" || supervisors.length > 0 || supervisorsLoading) return
        setSupervisorsLoading(true)
        api.users.getSupervisors()
            .then(response => setSupervisors(Array.isArray(response.data) ? response.data : []))
            .catch(error => setExternalError(getExternalErrorMessage(error, "No se pudieron cargar los supervisores.")))
            .finally(() => setSupervisorsLoading(false))
    }, [isManager, targetMode, supervisors.length, supervisorsLoading])

    const resetPanel = () => {
        setSelectedFile(null)
        setImportJobId("")
        setSummary(null)
        setExternalError(null)
        setTargetMode("general")
        setSelectedSupervisor("")
        setRequestedCountInput("1")
        setPanelOpen(false)
        if (fileInputRef.current) fileInputRef.current.value = ""
    }

    const acceptFile = (file?: File | null) => {
        if (!file) return
        const validExtension = /\.(xlsx|xls)$/i.test(file.name)
        if (!validExtension) {
            setSelectedFile(null)
            setExternalError("Seleccioná un archivo Excel con extensión .xlsx o .xls.")
            return
        }
        setSelectedFile(file)
        setExternalError(null)
        setImportJobId("")
        setSummary(null)
    }

    const uploadFile = async () => {
        if (!enabled) {
            setExternalError("La carga externa ya está preparada, pero todavía no está habilitada por configuración.")
            return
        }
        if (!selectedFile) {
            setExternalError("Seleccioná un archivo antes de iniciar la validación.")
            return
        }
        setUploading(true)
        setExternalError(null)
        try {
            const response = await api.affiliates.check.externalFile.upload(selectedFile)
            const jobId = String(response.data?.importJobId || "")
            if (!jobId) throw new Error("El servidor no devolvió una importación válida")
            setImportJobId(jobId)
            setSummary({ _id: jobId, status: response.data?.status || "pending" })
            setSelectedFile(null)
            if (fileInputRef.current) fileInputRef.current.value = ""
            toast.success("Archivo recibido. La validación continuará en segundo plano.")
        } catch (error: any) {
            setExternalError(getExternalErrorMessage(error, "No se pudo subir el archivo externo."))
        } finally {
            setUploading(false)
        }
    }

    const downloadReport = async (type: "rejected" | "updated") => {
        if (!importJobId) return
        setDownloadingReport(type)
        setExternalError(null)
        try {
            const response = type === "rejected"
                ? await api.affiliates.check.externalFile.downloadRejectedFile(importJobId)
                : await api.affiliates.check.externalFile.downloadUpdatedFile(importJobId)
            triggerBlobDownload(response.data, `${type === "rejected" ? "rechazados" : "actualizados"}_${importJobId}.xlsx`)
        } catch (error: any) {
            setExternalError(getExternalErrorMessage(error, `No se pudo descargar el reporte de ${type === "rejected" ? "rechazados" : "actualizados"}.`))
        } finally {
            setDownloadingReport(null)
        }
    }

    const createScopedJob = async () => {
        if (!importJobId || !importReady) {
            setExternalError("La importación debe estar completada antes de crear el trabajo.")
            return
        }
        if (!isRequestedCountValid) {
            setExternalError(
                parsedRequestedCount > checkableRows
                    ? "La cantidad no puede superar las " + checkableRows + " filas disponibles para chequear."
                    : "La cantidad a chequear debe ser un entero mayor que cero."
            )
            return
        }
        if (isManager && targetMode === "supervisor" && !selectedSupervisor) {
            setExternalError("Seleccioná un supervisor destino o elegí Stock general.")
            return
        }
        if (checkableRows < 1) {
            setExternalError("No hay registros válidos para chequear en este archivo.")
            return
        }
        setCreatingJob(true)
        setExternalError(null)
        try {
            const payload: { requestedCount: number; supervisorId?: string } = { requestedCount: parsedRequestedCount }
            if (isManager && targetMode === "supervisor") payload.supervisorId = selectedSupervisor
            await api.affiliates.check.externalFile.createJob(importJobId, payload)
            toast.success("Trabajo de chequeo externo creado correctamente")
            resetPanel()
            await onJobCreated()
        } catch (error: any) {
            setExternalError(getExternalErrorMessage(error, "No se pudo crear el trabajo de chequeo externo."))
        } finally {
            setCreatingJob(false)
        }
    }

    return (
        <section className="rounded-[24px] border border-emerald-100 bg-emerald-50/40 p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 flex-1 gap-3">
                    <div className="h-fit rounded-xl border border-emerald-200/50 bg-emerald-100 p-2.5 text-emerald-600">
                        <FileSpreadsheet className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-bold text-slate-900">Chequear archivo externo</h3>
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Usa las mismas reglas de Cargar Archivo</span>
                            <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", enabled ? "border-emerald-200 bg-white text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700")}>
                                {enabled ? "Habilitado" : "En preparación"}
                            </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">Subí un .xlsx con el formato de Cargar Archivo y chequeá únicamente los registros de esa base.</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {["Formato .xlsx o .xls", "CUIL normalizado", "Validación de teléfonos", "Rechazos y duplicados"].map(item => (
                                <span key={item} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                    {item}
                                </span>
                            ))}
                        </div>
                        {!enabled && <p className="mt-3 text-xs font-medium text-amber-700">La carga externa ya está preparada, pero todavía no está habilitada por configuración.</p>}
                    </div>
                </div>

                <div className="flex flex-col gap-2 sm:min-w-[200px]">
                    <button type="button" onClick={() => { if (!enabled) return; if (panelOpen) resetPanel(); else setPanelOpen(true) }} disabled={!enabled} className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-600 bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400">
                        <UploadCloud className="h-4 w-4" />
                        {panelOpen ? "Cerrar preparación" : "Preparar archivo"}
                    </button>
                    <button type="button" onClick={onDownloadTemplate} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
                        <Download className="h-4 w-4" />
                        Descargar plantilla
                    </button>
                </div>
            </div>

            {panelOpen && enabled && (
                <div className="mt-5 rounded-[22px] border border-emerald-100 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h4 className="text-base font-bold text-slate-900">Preparar chequeo de archivo externo</h4>
                            <p className="mt-1 text-sm text-slate-600">El archivo será validado con las mismas reglas de Cargar Archivo.</p>
                        </div>
                        <button type="button" onClick={resetPanel} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><X className="h-4 w-4" /> Cerrar</button>
                    </div>

                    {externalError && (
                        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                            <span>{externalError}</span>
                        </div>
                    )}

                    {!importJobId && (
                        <div className="mt-5">
                            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={event => acceptFile(event.target.files?.[0])} />
                            <div
                                onDragEnter={event => { event.preventDefault(); setDragging(true) }}
                                onDragOver={event => event.preventDefault()}
                                onDragLeave={event => { event.preventDefault(); setDragging(false) }}
                                onDrop={event => { event.preventDefault(); setDragging(false); acceptFile(event.dataTransfer.files?.[0]) }}
                                className={cn("rounded-2xl border-2 border-dashed p-6 text-center transition", dragging ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-slate-50/60")}
                            >
                                <FileSpreadsheet className="mx-auto h-8 w-8 text-emerald-600" />
                                <p className="mt-2 text-sm font-semibold text-slate-800">Arrastrá un archivo Excel o seleccionalo desde tu equipo</p>
                                <p className="mt-1 text-xs text-slate-500">Formatos admitidos: .xlsx y .xls</p>
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Seleccionar archivo</button>
                            </div>

                            {selectedFile && (
                                <div className="mt-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <FileCheck className="h-5 w-5 flex-shrink-0 text-emerald-600" />
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-slate-800">{selectedFile.name}</p>
                                            <p className="text-xs text-slate-500">{formatFileSize(selectedFile.size)}</p>
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = "" }} className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700"><Trash2 className="h-3.5 w-3.5" /> Quitar</button>
                                </div>
                            )}

                            <div className="mt-4 flex justify-end">
                                <button type="button" onClick={uploadFile} disabled={!selectedFile || uploading} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
                                    {uploading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                                    {uploading ? "Subiendo..." : "Subir y validar archivo"}
                                </button>
                            </div>
                        </div>
                    )}

                    {importJobId && (
                        <div className="mt-5 space-y-5">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">Resumen de importación</p>
                                        <p className="mt-0.5 text-xs text-slate-500">ID: {importJobId}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {(summaryLoading || !terminalImport) && <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />}
                                        <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", summary?.status === "failed" ? "border-red-200 bg-red-50 text-red-700" : importReady ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700")}>{externalImportStatusLabel(summary?.status)}</span>
                                    </div>
                                </div>
                                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
                                    {[
                                        { label: "Filas detectadas", value: summary?.totalRows, tone: "neutral" },
                                        { label: "Creados", value: summary?.createdCount, tone: "neutral" },
                                        { label: "Actualizados", value: summary?.updatedCount, tone: "neutral" },
                                        { label: "Existentes vinculados", value: summary?.existingLinkedCount, tone: "neutral" },
                                        { label: "Disponibles para chequear", value: checkableRows, tone: "positive" },
                                        { label: "No disponibles temporalmente", value: excludedRows, tone: "warning" },
                                        { label: "Rechazados", value: summary?.rejectedCount, tone: "danger" },
                                    ].map(item => (
                                        <div key={item.label} className={cn("rounded-xl border bg-white p-3", item.tone === "positive" && "border-emerald-200 bg-emerald-50/60", item.tone === "warning" && "border-amber-200 bg-amber-50/60", item.tone === "danger" && "border-red-100")}>
                                            <p className={cn("text-xs leading-4 text-slate-500", item.tone === "positive" && "font-medium text-emerald-700", item.tone === "warning" && "font-medium text-amber-700", item.tone === "danger" && "text-red-600")}>{item.label}</p>
                                            <p className={cn("mt-1 text-xl font-bold text-slate-900", item.tone === "positive" && "text-emerald-700", item.tone === "warning" && "text-amber-700", item.tone === "danger" && Number(item.value || 0) > 0 && "text-red-700")}>{formatCheckNumber(item.value as number)}</p>
                                        </div>
                                    ))}
                                </div>
                                {excludedRows > 0 && exclusionReasonEntries.length > 0 && (
                                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                                        <p className="text-xs font-bold uppercase tracking-wide text-amber-800">Motivos de exclusión</p>
                                        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                                            {exclusionReasonEntries.map(([reason, count]) => (
                                                <div key={reason} className="flex items-center justify-between gap-3 text-xs text-slate-700">
                                                    <span>{EXCLUSION_REASON_LABELS[reason] || EXCLUSION_REASON_LABELS.other}</span>
                                                    <span className="font-bold text-amber-800">{formatCheckNumber(Number(count))}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {summary?.batchId && <p className="mt-3 truncate text-xs text-slate-500">Batch ID: <span className="font-medium text-slate-700">{summary.batchId}</span></p>}
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {summary?.rejectedFileAvailable && <button type="button" onClick={() => downloadReport("rejected")} disabled={downloadingReport !== null} className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60">{downloadingReport === "rejected" ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Descargar rechazados</button>}
                                    {summary?.updatedFileAvailable && <button type="button" onClick={() => downloadReport("updated")} disabled={downloadingReport !== null} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60">{downloadingReport === "updated" ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Descargar actualizados</button>}
                                    {!terminalImport && <button type="button" onClick={() => refreshSummary(importJobId)} disabled={summaryLoading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"><RefreshCw className={cn("h-3.5 w-3.5", summaryLoading && "animate-spin")} /> Actualizar estado</button>}
                                </div>
                            </div>

                            {importReady && (
                                <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                                    <h5 className="text-sm font-bold text-slate-900">Crear trabajo de chequeo</h5>
                                    <p className="mt-1 text-xs text-slate-600">Filas disponibles para chequear: {formatCheckNumber(checkableRows)}. El backend aplicará cupo y disponibilidad al crear el trabajo.</p>
                                    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                                        <div>
                                            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cantidad a chequear</label>
                                            <input type="number" min={1} step={1} max={checkableRows || undefined} value={requestedCountInput} onChange={event => setRequestedCountInput(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                                            {requestedCountInput.trim() !== "" && parsedRequestedCount > checkableRows && <p className="mt-2 text-xs text-amber-700">La cantidad no puede superar las {formatCheckNumber(checkableRows)} filas disponibles para chequear.</p>}
                                        </div>
                                        {isManager ? (
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Destino del resultado</p>
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    <label className={cn("flex cursor-pointer items-center gap-2 rounded-xl border bg-white px-3 py-2.5 text-sm", targetMode === "general" ? "border-blue-300 text-blue-700" : "border-slate-200 text-slate-600")}><input type="radio" name="external-target" checked={targetMode === "general"} onChange={() => { setTargetMode("general"); setSelectedSupervisor("") }} /> Stock general</label>
                                                    <label className={cn("flex cursor-pointer items-center gap-2 rounded-xl border bg-white px-3 py-2.5 text-sm", targetMode === "supervisor" ? "border-blue-300 text-blue-700" : "border-slate-200 text-slate-600")}><input type="radio" name="external-target" checked={targetMode === "supervisor"} onChange={() => setTargetMode("supervisor")} /> Supervisor específico</label>
                                                </div>
                                                {targetMode === "supervisor" && (
                                                    supervisorsLoading ? <div className="mt-3 flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-500"><RefreshCw className="h-4 w-4 animate-spin" /> Cargando supervisores...</div> :
                                                    <select value={selectedSupervisor} onChange={event => setSelectedSupervisor(event.target.value)} className="mt-3 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"><option value="">Seleccioná un supervisor...</option>{supervisors.map((supervisor: any) => <option key={supervisor._id} value={String(supervisor._id)}>{supervisor.nombre || supervisor.name || supervisor.email || "Sin nombre"}</option>)}</select>
                                                )}
                                                <p className="mt-2 text-xs text-slate-500">{targetMode === "general" ? "El trabajo quedará sin supervisor destino explícito." : "El trabajo quedará asociado al supervisor seleccionado."}</p>
                                            </div>
                                        ) : (
                                            <div className="rounded-xl border border-emerald-100 bg-white p-3 text-sm text-slate-600"><p className="font-semibold text-slate-800">Destino: tu stock personal</p><p className="mt-1 text-xs">Como supervisor, el backend asignará el trabajo a tu usuario y no se enviará supervisorId.</p></div>
                                        )}
                                    </div>
                                    <div className="mt-4 flex justify-end">
                                        <button type="button" onClick={createScopedJob} disabled={creatingJob || !importJobId || !importReady || !isRequestedCountValid || checkableRows < 1 || (isManager && targetMode === "supervisor" && !selectedSupervisor)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">{creatingJob ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}{creatingJob ? "Creando..." : "Crear trabajo"}</button>
                                    </div>
                                </div>
                            )}

                            {summary?.status === "failed" && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">La importación falló. Revisá el archivo e intentá nuevamente.</div>}
                        </div>
                    )}
                </div>
            )}
        </section>
    )
}

function formatEta(ms?: number | null) {
    if (ms == null || !Number.isFinite(ms)) return "Calculando tiempo estimado…"
    if (ms < 60000) return "Menos de 1 min"
    if (ms > 3600000) return "Más de 1 h"
    return `~${Math.max(1, Math.round(ms / 60000))} min restantes`
}

function currentPhase(job: AffiliateCheckJob) {
    if (job.isStuck) return "Detenido"
    if (job.status !== "processing") return checkStatusLabel(job.status)
    const stages = job.progress?.activeStages || []
    const labels: Record<string, string> = { arca: "ARCA", dateas: "DATEAS", padron: "Padrón", finalizer: "Finalización" }
    if (stages.length > 1) return "Procesando múltiples etapas"
    if (stages.length === 1) return `Procesando ${labels[stages[0]] || "etapa"}`
    return "Procesando"
}

function JobProgressDetails({ job, compact = false }: { job: AffiliateCheckJob; compact?: boolean }) {
    const progress = job.progress || {}
    const percent = Math.max(0, Math.min(100, progress.percent || 0))
    const selected = progress.selectedCount ?? job.selectedCount ?? 0
    const processed = progress.processedCount ?? job.processedCount ?? 0
    const finalized = progress.finalizedCount ?? processed
    return (
        <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
                <span className="font-semibold text-slate-700">{formatCheckNumber(finalized)} de {formatCheckNumber(selected)} finalizados</span>
                <span className="font-bold text-slate-900">{Math.round(percent)}%</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${percent}%` }} /></div>
            <p className="mt-1.5 whitespace-normal text-[11px] leading-4 text-slate-500">Procesados: {formatCheckNumber(processed)} · Solicitados: {formatCheckNumber(job.requestedCount)} · Seleccionados: {formatCheckNumber(selected)}</p>
            <p className="mt-0.5 whitespace-normal text-[11px] font-medium leading-4 text-slate-600">ARCA {formatCheckNumber(progress.arcaCompleted)} · DATEAS {formatCheckNumber(progress.dateasCompleted)} · Padrón {formatCheckNumber(progress.padronCompleted)}</p>
            {!compact && <p className="mt-0.5 text-[11px] leading-4 text-blue-600">{FINAL_CHECK_STATUSES.includes(job.status) ? "Finalizado" : job.status === "paused" ? "Tiempo estimado pausado" : formatEta(progress.estimatedRemainingMs)}</p>}
        </div>
    )
}

function JobIconButton({ label, icon, className, onClick, disabled = false }: { label: string; icon: React.ReactNode; className?: string; onClick: () => void; disabled?: boolean }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button type="button" aria-label={label} onClick={onClick} disabled={disabled} className={cn("inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50", className)}>{icon}</button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6}>{label}</TooltipContent>
        </Tooltip>
    )
}

function ConfirmedJobAction({ label, title, description, confirmLabel, icon, danger = false, onConfirm }: { label: string; title: string; description: string; confirmLabel: string; icon: React.ReactNode; danger?: boolean; onConfirm: () => Promise<boolean> }) {
    const [open, setOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const confirm = async () => {
        if (submitting) return
        setSubmitting(true)
        const succeeded = await onConfirm()
        setSubmitting(false)
        if (succeeded) setOpen(false)
    }
    return (
        <Popover open={open} onOpenChange={next => { if (!submitting) setOpen(next) }}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                        <button type="button" aria-label={label} className={cn("inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1", danger && "text-red-500 hover:bg-red-50 hover:text-red-700")}>{icon}</button>
                    </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={6}>{label}</TooltipContent>
            </Tooltip>
            <PopoverContent side="top" align="end" sideOffset={8} collisionPadding={12} className="w-80 rounded-xl border-slate-200 bg-white p-4 text-slate-900 shadow-xl">
                <p className="text-sm font-bold">{title}</p>
                <p className="mt-1.5 text-xs leading-5 text-slate-600">{description}</p>
                <div className="mt-4 flex justify-end gap-2">
                    <button type="button" onClick={() => setOpen(false)} disabled={submitting} className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancelar</button>
                    <button type="button" onClick={confirm} disabled={submitting} className={cn("inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-white disabled:opacity-60", danger ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700")}>{submitting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}{confirmLabel}</button>
                </div>
            </PopoverContent>
        </Popover>
    )
}

function JobActions({ job, busy, canCancel, onCancel, onAction }: { job: AffiliateCheckJob; busy: boolean; canCancel: boolean; onCancel: () => void; onAction: (action: "pause" | "resume" | "retry" | "export" | "delete") => Promise<boolean> }) {
    const permissions = job.permissions || {}
    const hasAction = permissions.canPause || permissions.canResume || permissions.canRetry || permissions.canExport || permissions.canDelete || canCancel
    if (busy) return <RefreshCw className="mx-2 h-4 w-4 animate-spin text-blue-500" />
    return (
        <div className="inline-flex flex-wrap items-center justify-end gap-0.5">
            {permissions.canPause && <ConfirmedJobAction label="Pausar" title="¿Pausar este trabajo?" description="Las tareas que ya están en curso terminarán, pero no se tomarán nuevas tareas." confirmLabel="Pausar" icon={<Pause className="h-3.5 w-3.5" />} onConfirm={() => onAction("pause")} />}
            {permissions.canResume && <JobIconButton label="Reanudar" icon={<Play className="h-3.5 w-3.5" />} onClick={() => void onAction("resume")} className="hover:bg-emerald-50 hover:text-emerald-700" />}
            {permissions.canRetry && <ConfirmedJobAction label="Reintentar" title="¿Reintentar este trabajo?" description="Solo se reabrirán las filas o etapas fallidas, pendientes o incompletas." confirmLabel="Reintentar" icon={<RotateCcw className="h-3.5 w-3.5" />} onConfirm={() => onAction("retry")} />}
            {permissions.canExport && <JobIconButton label="Exportar Excel" icon={<Download className="h-3.5 w-3.5" />} onClick={() => void onAction("export")} className="hover:bg-emerald-50 hover:text-emerald-700" />}
            {permissions.canDelete && <ConfirmedJobAction label="Eliminar del historial" title="¿Eliminar este trabajo del historial?" description="Los afiliados, resultados y datos procesados no serán eliminados." confirmLabel="Eliminar" icon={<Trash2 className="h-3.5 w-3.5" />} danger onConfirm={() => onAction("delete")} />}
            {canCancel && !permissions.canPause && <JobIconButton label="Cancelar" icon={<Ban className="h-3.5 w-3.5" />} onClick={onCancel} className="hover:bg-red-50 hover:text-red-600" />}
            {!hasAction && <span className="px-2 text-slate-300">—</span>}
        </div>
    )
}

function RecentCheckJobsTable({
    jobs,
    loading,
    selectedDate,
    todayDate,
    onDateChange,
    canProcessManually,
    canCancelJob,
    onCancel,
    cancellingJobId,
    actingJobId,
    onAction,
}: {
    jobs: AffiliateCheckJob[]
    loading: boolean
    selectedDate: string
    todayDate: string
    onDateChange: (date: string) => void
    canProcessManually: boolean
    canCancelJob: (job: AffiliateCheckJob) => boolean
    onCancel: (job: AffiliateCheckJob) => void
    cancellingJobId: string | null
    actingJobId: string | null
    onAction: (job: AffiliateCheckJob, action: "pause" | "resume" | "retry" | "export" | "delete") => Promise<boolean>
}) {
    void canProcessManually
    const empty = !loading && jobs.length === 0
    const isToday = selectedDate === todayDate
    const emptyMessage = isToday
        ? "No hay trabajos creados durante el día de hoy."
        : "No se encontraron trabajos para esta fecha."
    return (
        <div className="overflow-visible rounded-[24px] border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><Layers className="h-4 w-4" /></div><div><h3 className="text-base font-bold text-slate-900">Trabajos recientes</h3><p className="text-xs text-slate-500">Monitoreo operativo del día seleccionado</p></div></div>
                <div className="flex flex-wrap items-center gap-2">
                    <label className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>Fecha</span>
                        <input type="date" value={selectedDate} onChange={event => { if (event.target.value) onDateChange(event.target.value) }} className="min-w-0 bg-transparent text-xs font-medium text-slate-800 outline-none" aria-label="Fecha de trabajos" />
                    </label>
                    {!isToday && <button type="button" onClick={() => onDateChange(todayDate)} className="h-9 rounded-xl border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Hoy</button>}
                    {loading && <RefreshCw className="ml-1 h-4 w-4 animate-spin text-slate-300" />}
                </div>
            </div>
            <div className="hidden md:block">
                <table className="w-full table-fixed text-left text-sm">
                    <colgroup><col className="w-[13%]" /><col className="w-[14%]" /><col className="w-[35%]" /><col className="w-[7%]" /><col className="w-[10%]" /><col className="w-[11%]" /><col className="w-[10%]" /></colgroup>
                    <thead className="border-b border-slate-100 text-xs font-semibold text-slate-500"><tr><th className="px-3 py-3">Fecha</th><th className="px-3 py-3">Tipo</th><th className="px-3 py-3">Progreso</th><th className="px-2 py-3 text-right">Aptos</th><th className="px-2 py-3 text-right">Asignados al stock</th><th className="px-2 py-3">Estado</th><th className="px-2 py-3 text-right">Acciones</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading && jobs.length === 0 ? <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">Cargando trabajos recientes...</td></tr> : empty ? <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">{emptyMessage}</td></tr> : jobs.map(job => {
                            const busy = actingJobId === job._id || cancellingJobId === job._id
                            return <tr key={job._id} className="align-top transition hover:bg-slate-50/50">
                                <td className="px-3 py-3 text-xs leading-5 text-slate-600">{formatCheckDate(job.createdAt)}</td>
                                <td className="break-words px-3 py-3 text-xs font-semibold leading-5 text-slate-800">{checkModeLabel(job.mode)}</td>
                                <td className="px-3 py-3"><JobProgressDetails job={job} /></td>
                                <td className="px-2 py-3 text-right font-medium text-slate-700">{formatCheckNumber(job.eligibleCount)}</td>
                                <td className="px-2 py-3 text-right font-medium text-slate-700">{formatCheckNumber(job.assignedToStockCount ?? job.assignedCount)}</td>
                                <td className="px-2 py-3"><span className={cn("inline-flex max-w-full whitespace-normal break-words rounded-full border px-2 py-1 text-[10px] font-bold uppercase leading-4", checkStatusClasses(job.status))}>{currentPhase(job)}</span>{job.pendingTooLong && <p className="mt-1 text-[10px] leading-4 text-amber-700">En espera por más tiempo del previsto</p>}</td>
                                <td className="px-2 py-3 text-right"><JobActions job={job} busy={busy} canCancel={canCancelJob(job)} onCancel={() => onCancel(job)} onAction={action => onAction(job, action)} /></td>
                            </tr>
                        })}
                    </tbody>
                </table>
            </div>
            <div className="divide-y divide-slate-100 md:hidden">
                {loading && jobs.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">Cargando trabajos recientes...</div> : empty ? <div className="p-8 text-center text-sm text-slate-500">{emptyMessage}</div> : jobs.map(job => {
                    const busy = actingJobId === job._id || cancellingJobId === job._id
                    return <article key={job._id} className="space-y-3 p-4">
                        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs text-slate-500">{formatCheckDate(job.createdAt)}</p><p className="mt-0.5 font-semibold text-slate-900">{checkModeLabel(job.mode)}</p></div><span className={cn("max-w-[45%] whitespace-normal rounded-full border px-2 py-1 text-center text-[10px] font-bold uppercase leading-4", checkStatusClasses(job.status))}>{currentPhase(job)}</span></div>
                        <JobProgressDetails job={job} />
                        <div className="flex items-center justify-between gap-3 text-xs text-slate-600"><span>Aptos: <strong>{formatCheckNumber(job.eligibleCount)}</strong> · Stock: <strong>{formatCheckNumber(job.assignedToStockCount ?? job.assignedCount)}</strong></span><JobActions job={job} busy={busy} canCancel={canCancelJob(job)} onCancel={() => onCancel(job)} onAction={action => onAction(job, action)} /></div>
                    </article>
                })}
            </div>
        </div>
    )
}

function StockPersonalPanel({ baseStatus, loading, role }: { baseStatus: BaseStatus | null; loading: boolean; role: string }) {
    return (
        <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 p-4">
                <h3 className="text-base font-bold text-slate-900">Mi stock personal</h3>
                <button type="button" disabled className="text-sm font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50">
                    Ver detalle de mi stock
                </button>
            </div>
            <div className="p-5">
                <div className="flex rounded-xl bg-slate-50 border border-slate-100 p-4 divide-x divide-slate-200 text-center">
                    <div className="flex-1 px-2">
                        <p className="text-[11px] font-semibold uppercase text-slate-500">Total en stock</p>
                        <p className="mt-1 text-2xl font-bold text-slate-900">{loading ? "—" : formatCheckNumber(baseStatus?.totals?.availableForSale)}</p>
                    </div>
                    <div className="flex-1 px-2">
                        <p className="text-[11px] font-semibold uppercase text-slate-500">Asignados a mi equipo</p>
                        <p className="mt-1 text-xl font-bold text-slate-700">—</p>
                    </div>
                    <div className="flex-1 px-2">
                        <p className="text-[11px] font-semibold uppercase text-slate-500">Disponibles para asignar</p>
                        <p className="mt-1 text-xl font-bold text-slate-700">—</p>
                    </div>
                </div>
                <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                    <div className="text-emerald-500 mt-1">
                        <Users className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-emerald-800">Asignar datos a afiliados</p>
                        <p className="mt-1 text-xs text-emerald-600">Redistribuí datos de tu stock a los afiliados de tu equipo.</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

function ActivityPanel({ jobs, loading }: { jobs: AffiliateCheckJob[]; loading: boolean }) {
    const recentActivity = useMemo(() => {
        if (!jobs || jobs.length === 0) return []
        return jobs.slice(0, 5).map(job => {
            const actionMap: Record<string, string> = {
                completed: "Job completado",
                completed_with_errors: "Job completado con errores",
                failed: "Job fallido",
                processing: "Procesando extracción",
                pending: "Job creado",
                cancelled: "Job cancelado",
                draft: "Job en borrador",
            }
            return {
                id: job._id,
                label: actionMap[job.status] || "Evento registrado",
                mode: checkModeLabel(job.mode),
                time: formatCheckDate(job.createdAt),
                status: job.status,
            }
        })
    }, [jobs])

    return (
        <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
                <h3 className="text-base font-bold text-slate-900">Actividad reciente</h3>
            </div>
            <div className="p-5">
                {loading ? (
                    <div className="flex items-center gap-2 py-4 text-sm text-slate-500">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Cargando actividad...
                    </div>
                ) : recentActivity.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-400">Sin actividad reciente por ahora.</p>
                ) : (
                    <div className="space-y-3">
                        {recentActivity.map(item => (
                            <div key={item.id} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 transition hover:bg-slate-50">
                                <div className={cn(
                                    "mt-0.5 h-2 w-2 rounded-full flex-shrink-0",
                                    item.status === "completed" ? "bg-emerald-500" :
                                    item.status === "processing" || item.status === "pending" ? "bg-blue-500 animate-pulse" :
                                    item.status === "failed" ? "bg-red-500" :
                                    "bg-slate-400"
                                )} />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                                    <p className="text-xs text-slate-500">{item.mode} · {item.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <button type="button" disabled className="mt-4 inline-flex w-full items-center justify-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
                    Ver toda la actividad
                    <ArrowRight className="h-3 w-3" />
                </button>
            </div>
        </div>
    )
}
