/**
 * ============================================================
 * VINCULAR WHATSAPP (vincular-whatsapp.tsx)
 * ============================================================
 * Componente para vincular cuenta de WhatsApp mediante QR.
 * Muestra el código QR y maneja el estado de conexión.
 */

"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Link2, RefreshCw, Smartphone, ArrowRight, CheckCircle2, Loader2 } from "lucide-react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function VincularWhatsApp() {
  const { theme } = useTheme()
  const router = useRouter()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const wasConnectedRef = useRef(false) /* Para detectar cambio a conectado */

  /* Función para obtener QR y estado */
  const fetchQRAndStatus = useCallback(async () => {
    try {
      setError(null)
      
      /* Verificar estado primero */
      const statusRes = await api.whatsapp.status()
      if (statusRes.data?.connected) {
        /* Detectar si acaba de conectarse (antes no estaba conectado) */
        if (!wasConnectedRef.current) {
          wasConnectedRef.current = true
          setIsConnected(true)
          setQrCode(null)
          setIsLoading(false)
          
          /* Mostrar mensaje de éxito y redirigir después de 2 segundos */
          toast.success("🎉 ¡WhatsApp vinculado exitosamente!")
          setTimeout(() => {
            router.push('/dashboard/contact/today')
          }, 2000)
          return
        }
        
        setIsConnected(true)
        setQrCode(null)
        setIsLoading(false)
        return
      }
      
      wasConnectedRef.current = false
      setIsConnected(false)
      
      /* Obtener QR */
      const qrRes = await api.whatsapp.qr()
      if (qrRes.data?.qr) {
        setQrCode(qrRes.data.qr)
      } else if (qrRes.data?.initializing) {
        setError("Inicializando conexión...")
      }
      
      setIsLoading(false)
    } catch (err: any) {
      console.error("Error obteniendo QR:", err)
      setError("Error al obtener QR")
      setIsLoading(false)
    }
  }, [router])

  // Polling para actualizar QR y verificar conexión
  useEffect(() => {
    fetchQRAndStatus()
    
    const interval = setInterval(fetchQRAndStatus, 5000) // Cada 5 segundos
    
    return () => clearInterval(interval)
  }, [fetchQRAndStatus])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      // Solicitar nuevo QR/relink
      await api.whatsapp.relink()
      toast.success("Generando nuevo QR...")
      await fetchQRAndStatus()
    } catch (err) {
      toast.error("Error al refrescar QR")
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className="animate-fade-in-up flex items-center justify-center min-h-[60vh]">
      <div
        className={cn(
          "w-full max-w-md rounded-2xl border p-6 lg:p-8 backdrop-blur-sm text-center",
          theme === "dark"
            ? "bg-gradient-to-br from-white/10 to-white/5 border-white/10 shadow-2xl shadow-purple-500/10"
            : "bg-gradient-to-br from-white to-[#FAF7F2]/80 border-purple-200/30 shadow-xl shadow-purple-200/30",
        )}
      >
        {/* Encabezado con título */}
        <div className="flex items-center justify-center gap-3 mb-2">
          <div
            className={cn(
              "p-2.5 rounded-xl",
              theme === "dark"
                ? "bg-gradient-to-br from-purple-500/20 to-blue-500/20"
                : "bg-gradient-to-br from-purple-100 to-blue-100",
            )}
          >
            <Link2 className={cn("w-6 h-6", theme === "dark" ? "text-purple-400" : "text-purple-600")} />
          </div>
          <h2 className={cn("text-xl lg:text-2xl font-bold", theme === "dark" ? "text-white" : "text-gray-800")}>
            Vincular WhatsApp
          </h2>
        </div>

        {/* Subtítulo con estado del dispositivo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <Smartphone className={cn("w-4 h-4", theme === "dark" ? "text-gray-400" : "text-gray-500")} />
          <p className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
            {isConnected ? "WhatsApp vinculado correctamente" : "Escanea este QR con WhatsApp"}
          </p>
        </div>

        {/* Contenedor del código QR */}
        <div
          className={cn(
            "relative mx-auto w-56 h-56 lg:w-64 lg:h-64 rounded-xl p-4 mb-6 overflow-hidden flex items-center justify-center",
            theme === "dark" ? "bg-white" : "bg-white border border-purple-100 shadow-inner",
          )}
        >
          {/* Estado: Cargando */}
          {isLoading && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
              <span className="text-sm text-gray-500">Cargando...</span>
            </div>
          )}

          {/* Estado: Conectado */}
          {!isLoading && isConnected && (
            <div className="flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
              </div>
              <span className="text-sm font-medium text-emerald-600">¡Conectado!</span>
            </div>
          )}

          {/* Estado: QR disponible */}
          {!isLoading && !isConnected && qrCode && (
            <img 
              src={qrCode} 
              alt="QR Code WhatsApp" 
              className="w-full h-full object-contain"
            />
          )}

          {/* Estado: Error o esperando QR */}
          {!isLoading && !isConnected && !qrCode && (
            <div className="flex flex-col items-center gap-3 text-center px-4">
              <Loader2 className="w-10 h-10 text-gray-400 animate-spin" />
              <span className="text-xs text-gray-500">
                {error || "Esperando código QR..."}
              </span>
            </div>
          )}

          {/* Capa de actualización */}
          {isRefreshing && (
            <div className="absolute inset-0 bg-white/90 flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
          )}
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={cn(
            "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all transform hover:scale-[1.02] active:scale-[0.98]",
            theme === "dark"
              ? "bg-gradient-to-r from-[#17C787] to-emerald-600 hover:from-[#17C787]/90 hover:to-emerald-600/90 text-white shadow-lg shadow-[#17C787]/20"
              : "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-200/50",
            isRefreshing && "opacity-70 cursor-not-allowed",
          )}
        >
          <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
          {isRefreshing ? "Actualizando..." : "Refrescar QR"}
        </button>

        {/* Instrucciones de uso */}
        <div className={cn("mt-6 pt-4 border-t", theme === "dark" ? "border-white/10" : "border-purple-100")}>
          <div
            className={cn(
              "flex items-center justify-center gap-2 text-xs flex-wrap",
              theme === "dark" ? "text-gray-400" : "text-gray-500",
            )}
          >
            <span>Abre WhatsApp</span>
            <ArrowRight className="w-3 h-3" />
            <span>Menú de dispositivos vinculados</span>
            <ArrowRight className="w-3 h-3" />
            <span>Escanea el código QR</span>
          </div>
        </div>
      </div>
    </div>
  )
}
