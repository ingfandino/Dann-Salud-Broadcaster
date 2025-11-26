"use client"

import { useState } from "react"
import { X, AlertCircle, Plus, Pencil, Trash2 } from "lucide-react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"

interface AutoRespuesta {
  id: number
  keyword: string
  match: string
  fallback: boolean
  activa: boolean
}

interface AutoRespuestasModalProps {
  isOpen: boolean
  onClose: () => void
}

const initialAutoRespuestas: AutoRespuesta[] = [
  { id: 1, keyword: "a", match: "exact", fallback: false, activa: true },
  { id: 2, keyword: "b", match: "exact", fallback: false, activa: true },
  { id: 3, keyword: "c", match: "exact", fallback: false, activa: true },
  { id: 4, keyword: "d", match: "exact", fallback: false, activa: true },
  { id: 5, keyword: "e", match: "exact", fallback: false, activa: true },
  { id: 6, keyword: "f", match: "exact", fallback: false, activa: true },
  { id: 7, keyword: "g", match: "exact", fallback: true, activa: true },
]

export function AutoRespuestasModal({ isOpen, onClose }: AutoRespuestasModalProps) {
  const { theme } = useTheme()
  const [keyword, setKeyword] = useState("")
  const [respuesta, setRespuesta] = useState("")
  const [matchType, setMatchType] = useState("contiene")
  const [comodin, setComodin] = useState(false)
  const [activa, setActiva] = useState(true)
  const [autoRespuestas, setAutoRespuestas] = useState<AutoRespuesta[]>(initialAutoRespuestas)

  if (!isOpen) return null

  const handleCreate = () => {
    if (!keyword.trim() || !respuesta.trim()) return
    const newAutoRespuesta: AutoRespuesta = {
      id: Date.now(),
      keyword: keyword.trim(),
      match: matchType,
      fallback: comodin,
      activa,
    }
    setAutoRespuestas([...autoRespuestas, newAutoRespuesta])
    setKeyword("")
    setRespuesta("")
    setComodin(false)
    setActiva(true)
  }

  const handleDelete = (id: number) => {
    setAutoRespuestas(autoRespuestas.filter((ar) => ar.id !== id))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      {/* Modal */}
      <div
        className={cn(
          "relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl border shadow-2xl animate-scale-in",
          theme === "dark"
            ? "bg-gradient-to-br from-[#1a1333] to-[#0f0a1e] border-white/10"
            : "bg-gradient-to-br from-white to-[#FAF7F2] border-purple-200/50",
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
                Durante esta ventana, solo se envía una auto-respuesta por contacto. Ejemplos:
              </p>
              <ul
                className={cn(
                  "list-disc list-inside space-y-0.5",
                  theme === "dark" ? "text-gray-400" : "text-gray-600",
                )}
              >
                <li>Si alguien escribe "A" y luego "A"/"B" dentro de 30 min, se responde solo la primera vez.</li>
                <li>Pasada la ventana, si vuelve a escribir, se vuelve a evaluar y responder.</li>
              </ul>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-3 mb-4">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Palabra clave"
              className={cn(
                "w-full px-3 py-2 rounded-lg text-sm border transition-all focus:ring-2",
                theme === "dark"
                  ? "bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-purple-500/20"
                  : "bg-white border-purple-200/50 text-gray-700 placeholder-gray-400 focus:border-purple-400 focus:ring-purple-200/50",
              )}
            />
            <textarea
              value={respuesta}
              onChange={(e) => setRespuesta(e.target.value)}
              placeholder="Respuesta"
              rows={3}
              className={cn(
                "w-full px-3 py-2 rounded-lg text-sm border transition-all focus:ring-2 resize-none",
                theme === "dark"
                  ? "bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-purple-500/20"
                  : "bg-white border-purple-200/50 text-gray-700 placeholder-gray-400 focus:border-purple-400 focus:ring-purple-200/50",
              )}
            />

            <div className="flex flex-wrap items-center gap-4">
              <select
                value={matchType}
                onChange={(e) => setMatchType(e.target.value)}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm border transition-all",
                  theme === "dark"
                    ? "bg-white/5 border-white/10 text-white"
                    : "bg-white border-purple-200/50 text-gray-700",
                )}
              >
                <option value="contiene">Contiene</option>
                <option value="exact">Exacto</option>
                <option value="empieza">Empieza con</option>
                <option value="termina">Termina con</option>
              </select>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={comodin}
                  onChange={(e) => setComodin(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-purple-500 focus:ring-purple-500"
                />
                <span className={cn("text-sm", theme === "dark" ? "text-gray-300" : "text-gray-600")}>Comodín</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
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
                className={cn(
                  "ml-auto flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  theme === "dark"
                    ? "bg-[#17C787] hover:bg-[#17C787]/80 text-white"
                    : "bg-emerald-500 hover:bg-emerald-600 text-white",
                )}
              >
                <Plus className="w-4 h-4" />
                Crear
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border overflow-hidden">
            <table className={cn("w-full text-xs", theme === "dark" ? "border-white/10" : "border-purple-100")}>
              <thead>
                <tr className={theme === "dark" ? "bg-white/5" : "bg-purple-50"}>
                  <th
                    className={cn(
                      "px-3 py-2 text-left font-medium",
                      theme === "dark" ? "text-gray-400" : "text-gray-600",
                    )}
                  >
                    Keyword
                  </th>
                  <th
                    className={cn(
                      "px-3 py-2 text-left font-medium",
                      theme === "dark" ? "text-gray-400" : "text-gray-600",
                    )}
                  >
                    Match
                  </th>
                  <th
                    className={cn(
                      "px-3 py-2 text-left font-medium",
                      theme === "dark" ? "text-gray-400" : "text-gray-600",
                    )}
                  >
                    Fallback
                  </th>
                  <th
                    className={cn(
                      "px-3 py-2 text-left font-medium",
                      theme === "dark" ? "text-gray-400" : "text-gray-600",
                    )}
                  >
                    Activa
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
                {autoRespuestas.map((ar) => (
                  <tr
                    key={ar.id}
                    className={cn("transition-colors", theme === "dark" ? "hover:bg-white/5" : "hover:bg-purple-50/50")}
                  >
                    <td className={cn("px-3 py-2", theme === "dark" ? "text-white" : "text-gray-700")}>{ar.keyword}</td>
                    <td>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px]",
                          theme === "dark" ? "bg-[#1E88E5]/20 text-[#1E88E5]" : "bg-blue-100 text-blue-600",
                        )}
                      >
                        {ar.match}
                      </span>
                    </td>
                    <td>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px]",
                          ar.fallback
                            ? theme === "dark"
                              ? "bg-[#17C787]/20 text-[#17C787]"
                              : "bg-emerald-100 text-emerald-600"
                            : theme === "dark"
                              ? "bg-[#C8376B]/20 text-[#C8376B]"
                              : "bg-rose-100 text-rose-600",
                        )}
                      >
                        {ar.fallback ? "Sí" : "No"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px]",
                          ar.activa
                            ? theme === "dark"
                              ? "bg-[#17C787]/20 text-[#17C787]"
                              : "bg-emerald-100 text-emerald-600"
                            : theme === "dark"
                              ? "bg-gray-500/20 text-gray-400"
                              : "bg-gray-100 text-gray-500",
                        )}
                      >
                        {ar.activa ? "Sí" : "No"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          className={cn(
                            "px-2 py-1 rounded text-[10px] font-medium transition-colors",
                            theme === "dark"
                              ? "bg-[#1E88E5]/20 text-[#1E88E5] hover:bg-[#1E88E5]/30"
                              : "bg-blue-100 text-blue-600 hover:bg-blue-200",
                          )}
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDelete(ar.id)}
                          className={cn(
                            "px-2 py-1 rounded text-[10px] font-medium transition-colors",
                            theme === "dark"
                              ? "bg-[#C8376B]/20 text-[#C8376B] hover:bg-[#C8376B]/30"
                              : "bg-rose-100 text-rose-600 hover:bg-rose-200",
                          )}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
