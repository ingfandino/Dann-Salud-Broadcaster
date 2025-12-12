"use client"

import { useState, useEffect } from "react"
import { X, AlertCircle, Plus, Pencil, Trash2, Loader2 } from "lucide-react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { toast } from "sonner"

interface AutoRespuesta {
  _id: string
  keyword: string
  response: string
  matchType: string
  isFallback: boolean
  active: boolean
}

interface AutoRespuestasModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AutoRespuestasModal({ isOpen, onClose }: AutoRespuestasModalProps) {
  const { theme } = useTheme()
  const [keyword, setKeyword] = useState("")
  const [respuesta, setRespuesta] = useState("")
  const [matchType, setMatchType] = useState("contains")
  const [comodin, setComodin] = useState(false)
  const [activa, setActiva] = useState(true)
  const [autoRespuestas, setAutoRespuestas] = useState<AutoRespuesta[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadAutoResponses()
    }
  }, [isOpen])

  const loadAutoResponses = async () => {
    setLoading(true)
    try {
      const response = await api.autoResponses.list()
      setAutoRespuestas(response.data || [])
    } catch (error) {
      console.error("Error loading autoresponses:", error)
      toast.error("Error al cargar auto-respuestas")
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (ar: AutoRespuesta) => {
    setKeyword(ar.isFallback ? "" : ar.keyword)
    setRespuesta(ar.response)
    setMatchType(ar.matchType || "contains")
    setComodin(ar.isFallback)
    setActiva(ar.active)
    setEditingId(ar._id)
  }

  const handleCreate = async () => {
    if (!respuesta.trim()) {
      toast.error("La respuesta es obligatoria")
      return
    }
    if (!comodin && !keyword.trim()) {
      toast.error("La palabra clave es obligatoria (o marca como comodín)")
      return
    }

    setCreating(true)
    try {
      const data = {
        keyword: comodin ? null : keyword.trim(),
        response: respuesta.trim(),
        matchType: comodin ? null : matchType,
        isFallback: comodin,
        active: activa
      }

      if (editingId) {
        await api.autoResponses.update(editingId, data)
        toast.success("Auto-respuesta actualizada")
        setEditingId(null)
      } else {
        await api.autoResponses.create(data)
        toast.success("Auto-respuesta creada")
      }

      // Reset form
      setKeyword("")
      setRespuesta("")
      setComodin(false)
      setActiva(true)
      setMatchType("contains")

      // Reload list
      loadAutoResponses()
    } catch (error: any) {
      console.error("Error creating/updating autoresponse:", error)
      toast.error(error.response?.data?.error || `Error al ${editingId ? 'actualizar' : 'crear'} auto-respuesta`)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta auto-respuesta?")) return

    try {
      await api.autoResponses.delete(id)
      toast.success("Auto-respuesta eliminada")
      loadAutoResponses()
    } catch (error) {
      console.error("Error deleting autoresponse:", error)
      toast.error("Error al eliminar auto-respuesta")
    }
  }

  const handleToggleActive = async (id: string) => {
    try {
      await api.autoResponses.toggle(id)
      loadAutoResponses()
    } catch (error) {
      console.error("Error toggling autoresponse:", error)
      toast.error("Error al cambiar estado")
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed top-24 right-4 z-50 w-full max-w-2xl animate-in slide-in-from-right-10 fade-in duration-300">
      {/* Modal Window */}
      <div
        className={cn(
          "w-full overflow-hidden rounded-2xl border shadow-2xl",
          theme === "dark"
            ? "bg-[#0f0a1e]/95 backdrop-blur-md border-white/10 shadow-black/50"
            : "bg-white/95 backdrop-blur-md border-purple-200/50 shadow-purple-500/10",
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "flex items-center justify-between p-4 border-b",
            theme === "dark" ? "border-white/10" : "border-purple-100",
          )}
        >
          <h2 className={cn("text-lg font-semibold", theme === "dark" ? "text-white" : "text-gray-700")}>
            Auto-respuestas
          </h2>
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
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-60px)]">
          {/* Info Alert */}
          <div
            className={cn(
              "flex gap-3 p-3 rounded-xl mb-4 border",
              theme === "dark" ? "bg-[#1E88E5]/10 border-[#1E88E5]/30" : "bg-blue-50 border-blue-200",
            )}
          >
            <AlertCircle
              className={cn("w-5 h-5 flex-shrink-0 mt-0.5", theme === "dark" ? "text-[#1E88E5]" : "text-blue-500")}
            />
            <div className="text-xs space-y-1">
              <p className={cn("font-medium", theme === "dark" ? "text-[#1E88E5]" : "text-blue-700")}>
                Ventana anti-spam activa: 30 minutos
              </p>
              <p className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
                Durante esta ventana, solo se envía una auto-respuesta por contacto.
              </p>
            </div>
          </div>

          {/* Form */}
          <div className={cn(
            "space-y-3 mb-6 p-4 rounded-xl border",
            theme === "dark" ? "bg-white/5 border-white/10" : "bg-purple-50/50 border-purple-100"
          )}>
            <h3 className={cn("text-sm font-medium mb-2", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
              {editingId ? "Editar Regla" : "Nueva Regla"}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Palabra clave (ej: precio, info)"
                disabled={comodin}
                className={cn(
                  "w-full px-3 py-2 rounded-lg text-sm border transition-all focus:ring-2 disabled:opacity-50",
                  theme === "dark"
                    ? "bg-black/20 border-white/10 text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-purple-500/20"
                    : "bg-white border-purple-200/50 text-gray-700 placeholder-gray-400 focus:border-purple-400 focus:ring-purple-200/50",
                )}
              />

              <select
                value={matchType}
                onChange={(e) => setMatchType(e.target.value)}
                disabled={comodin}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm border transition-all disabled:opacity-50",
                  theme === "dark"
                    ? "bg-black/20 border-white/10 text-white"
                    : "bg-white border-purple-200/50 text-gray-700",
                )}
              >
                <option value="contains">Contiene</option>
                <option value="exact">Exacto</option>
                <option value="startsWith">Empieza con</option>
                <option value="endsWith">Termina con</option>
              </select>
            </div>

            <textarea
              value={respuesta}
              onChange={(e) => setRespuesta(e.target.value)}
              placeholder="Respuesta automática..."
              rows={3}
              className={cn(
                "w-full px-3 py-2 rounded-lg text-sm border transition-all focus:ring-2 resize-none",
                theme === "dark"
                  ? "bg-black/20 border-white/10 text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-purple-500/20"
                  : "bg-white border-purple-200/50 text-gray-700 placeholder-gray-400 focus:border-purple-400 focus:ring-purple-200/50",
              )}
            />

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={comodin}
                  onChange={(e) => setComodin(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-purple-500 focus:ring-purple-500"
                />
                <span className={cn("text-sm", theme === "dark" ? "text-gray-300" : "text-gray-600")}>
                  Es respuesta por defecto (Fallback)
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={activa}
                  onChange={(e) => setActiva(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-purple-500 focus:ring-purple-500"
                />
                <span className={cn("text-sm", theme === "dark" ? "text-gray-300" : "text-gray-600")}>Activa</span>
              </label>

              <button
                onClick={handleCreate}
                disabled={creating}
                className={cn(
                  "ml-auto flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50",
                  theme === "dark"
                    ? "bg-[#17C787] hover:bg-[#17C787]/80 text-white"
                    : "bg-emerald-500 hover:bg-emerald-600 text-white",
                )}
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {editingId ? "Actualizar" : "Crear Regla"}
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border overflow-hidden">
            <table className={cn("w-full text-xs", theme === "dark" ? "border-white/10" : "border-purple-100")}>
              <thead>
                <tr className={theme === "dark" ? "bg-white/5" : "bg-purple-50"}>
                  <th className={cn("px-3 py-2 text-left font-medium", theme === "dark" ? "text-gray-400" : "text-gray-600")}>Keyword</th>
                  <th className={cn("px-3 py-2 text-left font-medium", theme === "dark" ? "text-gray-400" : "text-gray-600")}>Respuesta</th>
                  <th className={cn("px-3 py-2 text-left font-medium", theme === "dark" ? "text-gray-400" : "text-gray-600")}>Tipo</th>
                  <th className={cn("px-3 py-2 text-center font-medium", theme === "dark" ? "text-gray-400" : "text-gray-600")}>Estado</th>
                  <th className={cn("px-3 py-2 text-center font-medium", theme === "dark" ? "text-gray-400" : "text-gray-600")}>Acciones</th>
                </tr>
              </thead>
              <tbody className={cn("divide-y", theme === "dark" ? "divide-white/5" : "divide-purple-100")}>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center">
                      <Loader2 className={cn("w-6 h-6 animate-spin mx-auto mb-2", theme === "dark" ? "text-purple-400" : "text-purple-600")} />
                      <p className={cn("text-xs", theme === "dark" ? "text-gray-500" : "text-gray-400")}>Cargando reglas...</p>
                    </td>
                  </tr>
                ) : autoRespuestas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center">
                      <p className={cn("text-sm", theme === "dark" ? "text-gray-500" : "text-gray-400")}>No hay auto-respuestas configuradas</p>
                    </td>
                  </tr>
                ) : (
                  autoRespuestas.map((ar) => (
                    <tr
                      key={ar._id}
                      className={cn("transition-colors", theme === "dark" ? "hover:bg-white/5" : "hover:bg-purple-50/50")}
                    >
                      <td className={cn("px-3 py-2 font-medium", theme === "dark" ? "text-white" : "text-gray-700")}>
                        {ar.isFallback ? (
                          <span className={cn("px-2 py-0.5 rounded text-[10px]", theme === "dark" ? "bg-rose-500/20 text-rose-300" : "bg-rose-100 text-rose-600")}>
                            FALLBACK
                          </span>
                        ) : (
                          ar.keyword
                        )}
                      </td>
                      <td className={cn("px-3 py-2 max-w-[200px] truncate", theme === "dark" ? "text-gray-300" : "text-gray-600")}>
                        {ar.response}
                      </td>
                      <td className="px-3 py-2">
                        {!ar.isFallback && (
                          <span className={cn("px-2 py-0.5 rounded text-[10px]", theme === "dark" ? "bg-blue-500/20 text-blue-300" : "bg-blue-100 text-blue-600")}>
                            {ar.matchType}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => handleToggleActive(ar._id)}
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] transition-colors",
                            ar.active
                              ? theme === "dark" ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30" : "bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
                              : theme === "dark" ? "bg-gray-500/20 text-gray-400 hover:bg-gray-500/30" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          )}
                        >
                          {ar.active ? "Activa" : "Inactiva"}
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEdit(ar)}
                            className={cn(
                              "p-1.5 rounded-lg transition-colors",
                              theme === "dark"
                                ? "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                                : "bg-blue-50 text-blue-600 hover:bg-blue-100",
                            )}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(ar._id)}
                            className={cn(
                              "p-1.5 rounded-lg transition-colors",
                              theme === "dark"
                                ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                                : "bg-rose-50 text-rose-600 hover:bg-rose-100",
                            )}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
    </div>
  )
}
