"use client"

import { useState, useEffect } from "react"
import { Search, RefreshCw, Trash2, Filter } from "lucide-react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { toast } from "sonner"

interface Affiliate {
  _id: string
  nombre: string
  cuil: string
  obraSocial: string
  telefono1: string
  localidad: string
  uploadDate: string
}

export function BaseAfiliadosLista() {
  const { theme } = useTheme()
  const [afiliados, setAfiliados] = useState<Affiliate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [obraSocialFilter, setObraSocialFilter] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const loadAfiliados = async () => {
    try {
      setLoading(true)
      const response = await api.affiliates.list({
        page,
        limit: 50,
        search: searchTerm,
        obraSocial: obraSocialFilter
      })
      setAfiliados(response.data.affiliates || [])
      setTotalPages(response.data.totalPages || 1)
    } catch (error: any) {
      console.error("Error loading affiliates:", error)
      toast.error("Error al cargar afiliados")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAfiliados()
  }, [page, searchTerm, obraSocialFilter])

  const handleDelete = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar este afiliado?")) return

    try {
      await api.affiliates.delete(id)
      toast.success("Afiliado eliminado")
      loadAfiliados()
    } catch (error) {
      toast.error("Error al eliminar afiliado")
    }
  }

  return (
    <div className="animate-fade-in-up space-y-4">
      {/* Filters */}
      <div
        className={cn(
          "rounded-2xl border p-4 lg:p-6 backdrop-blur-sm",
          theme === "dark"
            ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
            : "bg-gradient-to-br from-white to-[#FAF7F2]/80 border-purple-200/30 shadow-lg shadow-purple-100/30",
        )}
      >
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          <div className="flex-1">
            <h2
              className={cn(
                "text-lg lg:text-xl font-semibold flex items-center gap-2 mb-4",
                theme === "dark" ? "text-white" : "text-gray-700",
              )}
            >
              <Search className={cn("w-5 h-5", theme === "dark" ? "text-purple-400" : "text-purple-500")} />
              Buscar y Filtrar Afiliados
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div>
                <label className={cn("text-xs mb-1 block", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                  Búsqueda por Nombre, CUIL o Teléfono
                </label>
                <div className="relative">
                  <Search
                    className={cn(
                      "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4",
                      theme === "dark" ? "text-gray-500" : "text-gray-400",
                    )}
                  />
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={cn(
                      "w-full pl-9 pr-3 py-2 rounded-lg border text-sm",
                      theme === "dark"
                        ? "bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                        : "bg-white border-gray-200 text-gray-700 placeholder:text-gray-400",
                    )}
                  />
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={loadAfiliados}
            disabled={loading}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 hover:scale-105 shrink-0 disabled:opacity-50",
              theme === "dark"
                ? "bg-gradient-to-r from-cyan-600 to-cyan-500 text-white"
                : "bg-gradient-to-r from-cyan-500 to-cyan-400 text-white",
            )}
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            Recargar Datos
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className={cn(
        "rounded-xl p-4 text-sm",
        theme === "dark" ? "bg-blue-500/10 text-blue-300" : "bg-blue-50 text-blue-700"
      )}>
        Mostrando {afiliados.length} afiliados
      </div>

      {/* Table */}
      <div
        className={cn(
          "rounded-2xl border backdrop-blur-sm overflow-hidden",
          theme === "dark"
            ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
            : "bg-gradient-to-br from-white to-[#FAF7F2]/80 border-purple-200/30 shadow-lg shadow-purple-100/30",
        )}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                className={cn(
                  theme === "dark"
                    ? "bg-white/5 border-b border-white/10"
                    : "bg-purple-50/50 border-b border-purple-100",
                )}
              >
                {["Nombre", "CUIL", "Obra Social", "Teléfono", "Localidad", "Cargado", "Acciones"].map((header) => (
                  <th
                    key={header}
                    className={cn(
                      "px-4 py-3 text-left font-semibold whitespace-nowrap",
                      theme === "dark" ? "text-gray-300" : "text-gray-600",
                    )}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center">
                    <div className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                      Cargando...
                    </div>
                  </td>
                </tr>
              ) : afiliados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center">
                    <div className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                      No se encontraron afiliados
                    </div>
                  </td>
                </tr>
              ) : (
                afiliados.map((afiliado) => (
                  <tr
                    key={afiliado._id}
                    className={cn(
                      "border-b transition-colors",
                      theme === "dark" ? "border-white/5 hover:bg-white/5" : "border-purple-50 hover:bg-purple-50/50",
                    )}
                  >
                    <td className={cn("px-4 py-3 font-medium", theme === "dark" ? "text-white" : "text-gray-700")}>
                      {afiliado.nombre}
                    </td>
                    <td className={cn("px-4 py-3", theme === "dark" ? "text-gray-300" : "text-gray-600")}>
                      {afiliado.cuil}
                    </td>
                    <td
                      className={cn("px-4 py-3 max-w-xs truncate", theme === "dark" ? "text-gray-400" : "text-gray-500")}
                    >
                      {afiliado.obraSocial}
                    </td>
                    <td className={cn("px-4 py-3", theme === "dark" ? "text-gray-300" : "text-gray-600")}>
                      {afiliado.telefono1}
                    </td>
                    <td className={cn("px-4 py-3", theme === "dark" ? "text-gray-300" : "text-gray-600")}>
                      {afiliado.localidad}
                    </td>
                    <td className={cn("px-4 py-3", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                      {new Date(afiliado.uploadDate).toLocaleDateString("es-AR")}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(afiliado._id)}
                        className={cn(
                          "p-1.5 rounded transition-colors",
                          theme === "dark" ? "text-red-400 hover:bg-red-500/20" : "text-red-600 hover:bg-red-100",
                        )}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
