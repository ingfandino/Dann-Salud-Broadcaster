"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/auth"
import { api, API_URL } from "@/lib/api"
import { 
    FileCheck, Upload, Trash2, Download, Play, 
    RefreshCw, AlertCircle, FileSpreadsheet,
    CheckCircle2, Clock, XCircle, Shield, Database
} from "lucide-react"
import { cn } from "@/lib/utils"

interface AdminCheckSession {
    _id: string
    originalFileName: string
    status: string
    mode: "cuil" | "dni"
    totalRows: number
    progress: {
        codem:  { processed: number, total: number, errors: number }
        arca:   { processed: number, total: number, errors: number }
        dateas: { processed: number, total: number, errors: number }
        padron: { processed: number, total: number, errors: number }
    }
    persistenceStats?: {
        created: number
        updated: number
        skipped: number
        errors: number
    }
    createdAt: string
    errorMessage?: string
    uploadedByUserId: {
        _id: string
        nombre: string
        email: string
    }
}

export function ChequeadoAdministrativo() {
    const { user } = useAuth()
    const [sessions, setSessions] = useState<AdminCheckSession[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isUploading, setIsUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchSessions = useCallback(async () => {
        try {
            const res = await api.adminCheck.listSessions()
            setSessions(res.data.sessions)
        } catch (err: any) {
            console.error("Error al cargar sesiones:", err)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchSessions()
        
        const interval = setInterval(() => {
            setSessions(prev => {
                const hasActive = prev.some(s => 
                    s.status.includes("pending") || 
                    s.status.includes("processing") || 
                    s.status === "queued" ||
                    s.status === "parsing" ||
                    s.status === "generating_excel" ||
                    s.status === "persisting"
                )
                if (hasActive) {
                    fetchSessions()
                }
                return prev
            })
        }, 3000)

        return () => clearInterval(interval)
    }, [fetchSessions])

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        setError(null)
        const formData = new FormData()
        formData.append("file", file)

        try {
            await api.adminCheck.upload(formData)
            await fetchSessions()
        } catch (err: any) {
            setError(err.response?.data?.error || "Error al subir el archivo")
        } finally {
            setIsUploading(false)
            if (e.target) e.target.value = ''
        }
    }

    const startSession = async (id: string) => {
        try {
            await api.adminCheck.startSession(id)
            fetchSessions()
        } catch (err: any) {
            setError(err.response?.data?.error || "Error al iniciar procesamiento")
        }
    }

    const deleteSession = async (id: string) => {
        if (!window.confirm("¿Seguro que deseas eliminar este chequeo? Se perderán los datos.")) return
        try {
            await api.adminCheck.deleteSession(id)
            fetchSessions()
        } catch (err: any) {
            setError(err.response?.data?.error || "Error al eliminar sesión")
        }
    }

    const retrySession = async (id: string) => {
        try {
            await api.adminCheck.retrySession(id)
            fetchSessions()
        } catch (err: any) {
            setError(err.response?.data?.error || "Error al reintentar sesión")
        }
    }

    const downloadResult = async (id: string, fileName: string) => {
        try {
            const response = await api.adminCheck.downloadResult(id)
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', `AdminCheck_${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`)
            document.body.appendChild(link)
            link.click()
            link.remove()
        } catch (err: any) {
            setError("El archivo ha expirado o no está disponible")
        }
    }

    const getStatusBadge = (status: string) => {
        const badges: Record<string, { label: string, color: string, icon: any }> = {
            "parsing":            { label: "Analizando...",       color: "bg-gray-100 text-gray-700",    icon: Clock },
            "queued":             { label: "Listo para iniciar",  color: "bg-blue-100 text-blue-700",    icon: Play },
            "processing":         { label: "Procesando...",       color: "bg-teal-100 text-teal-700",    icon: RefreshCw },
            "generating_excel":   { label: "Generando Excel",     color: "bg-yellow-100 text-yellow-700", icon: RefreshCw },
            "persisting":         { label: "Guardando registros", color: "bg-cyan-100 text-cyan-700",    icon: Database },
            "completed":          { label: "Completado",          color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
            "error":              { label: "Error",               color: "bg-red-100 text-red-700",      icon: XCircle },
        }

        const config = badges[status] || { label: status, color: "bg-gray-100 text-gray-700", icon: AlertCircle }
        const Icon = config.icon
        const isAnimating = status === "processing" || status === "generating_excel" || status === "persisting"

        return (
            <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium gap-1", config.color)}>
                <Icon className={cn("w-3 h-3", isAnimating ? "animate-spin" : "")} />
                {config.label}
            </span>
        )
    }

    const getModeBadge = (mode: string) => {
        return mode === "cuil" ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                CUIL
            </span>
        ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                DNI
            </span>
        )
    }

    const userRole = user?.role?.toLowerCase()
    const canDelete = userRole === "gerencia" || userRole === "desarrollador"

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Shield className="w-6 h-6 text-primary" />
                        Chequeado Administrativo
                    </h2>
                    <p className="text-muted-foreground">
                        Sube archivos Excel para verificar con CODEM, ARCA, DATEAS y Padrón. Los resultados se guardan en la base de afiliados.
                    </p>
                </div>
                
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
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-gray-900 dark:text-gray-100 max-w-[200px] sm:max-w-xs truncate">
                                                        {session.originalFileName}
                                                    </span>
                                                    {getModeBadge(session.mode)}
                                                </div>
                                                <span className="text-xs text-gray-500">
                                                    {new Date(session.createdAt).toLocaleString("es-AR")} — {session.totalRows} filas
                                                </span>
                                                <span className="text-xs text-gray-500 mt-0.5">
                                                    Por: {session.uploadedByUserId?.nombre || session.uploadedByUserId?.email}
                                                </span>
                                                {session.status === "completed" && session.persistenceStats && (
                                                    <span className="text-xs text-emerald-600 mt-1">
                                                        BD: {session.persistenceStats.created} nuevos, {session.persistenceStats.updated} actualizados
                                                        {session.persistenceStats.skipped > 0 && `, ${session.persistenceStats.skipped} omitidos`}
                                                    </span>
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
                                        <td className="px-4 py-4 min-w-[220px]">
                                            <div className="space-y-1.5">
                                                {/* CODEM */}
                                                <div className="flex justify-between text-xs">
                                                    <span>CODEM:</span>
                                                    <span className="font-medium">{session.progress?.codem?.processed || 0} / {session.totalRows}</span>
                                                </div>
                                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                                    <div className="bg-teal-500 h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, ((session.progress?.codem?.processed || 0) / session.totalRows) * 100)}%` }}></div>
                                                </div>

                                                {/* DATEAS */}
                                                <div className="flex justify-between text-xs mt-1">
                                                    <span>DATEAS:</span>
                                                    <span className="font-medium">{session.progress?.dateas?.processed || 0} / {session.totalRows}</span>
                                                </div>
                                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                                    <div className="bg-purple-500 h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, ((session.progress?.dateas?.processed || 0) / session.totalRows) * 100)}%` }}></div>
                                                </div>

                                                {/* ARCA */}
                                                <div className="flex justify-between text-xs mt-1">
                                                    <span>ARCA:</span>
                                                    <span className="font-medium">{session.progress?.arca?.processed || 0} / {session.totalRows}</span>
                                                </div>
                                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                                    <div className="bg-orange-500 h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, ((session.progress?.arca?.processed || 0) / session.totalRows) * 100)}%` }}></div>
                                                </div>

                                                {/* Padrón */}
                                                <div className="flex justify-between text-xs mt-1">
                                                    <span>Padrón:</span>
                                                    <span className="font-medium">{session.progress?.padron?.processed || 0} / {session.totalRows}</span>
                                                </div>
                                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                                    <div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, ((session.progress?.padron?.processed || 0) / session.totalRows) * 100)}%` }}></div>
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

                                                {canDelete && (
                                                    <button
                                                        onClick={() => deleteSession(session._id)}
                                                        className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                                                        title="Eliminar sesión"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                )}
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
