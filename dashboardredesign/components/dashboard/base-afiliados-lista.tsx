"use client"

import { useState } from "react"
import { Search, RefreshCw, Trash2, Filter } from "lucide-react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"

const afiliados = [
  {
    nombre: "MIGUEL VALENTIN GASTON",
    cuil: "20425675916",
    obraSocial: "O.S. DE LOS EMPLEADOS DE COMERCIO Y ACTIVIDADES CIVILES",
    telefono: "1136251055",
    localidad: "BELLA VISTA",
    cargado: "20/11/2025",
  },
  {
    nombre: "BARNE PARDO RODRIGO IGNACIO",
    cuil: "20423461757",
    obraSocial: "O.S. DE LOS EMPLEADOS DE COMERCIO Y ACTIVIDADES CIVILES",
    telefono: "1136219126",
    localidad: "VICTORIA",
    cargado: "20/11/2025",
  },
  {
    nombre: "BALQUINTA JULIETA SABRINA",
    cuil: "20423688352",
    obraSocial: "O.S. DE LOS EMPLEADOS DE COMERCIO Y ACTIVIDADES CIVILES",
    telefono: "1140340500",
    localidad: "BERAZATEGUI",
    cargado: "20/11/2025",
  },
  {
    nombre: "SENDRA LOANA ITATI",
    cuil: "27419530951",
    obraSocial: "O.S. DE LOS EMPLEADOS DE COMERCIO Y ACTIVIDADES CIVILES",
    telefono: "1125277663",
    localidad: "TIGRE",
    cargado: "20/11/2025",
  },
  {
    nombre: "CORDOBA JUAN MARCOS",
    cuil: "20427749860",
    obraSocial: "O.S. DE LOS EMPLEADOS DE COMERCIO Y ACTIVIDADES CIVILES",
    telefono: "1165221322",
    localidad: "SAN JUSTO",
    cargado: "20/11/2025",
  },
  {
    nombre: "GOMEZ BRIAN NICOLAS",
    cuil: "20422097254",
    obraSocial: "O.S. DE LOS EMPLEADOS DE COMERCIO Y ACTIVIDADES CIVILES",
    telefono: "1158675503",
    localidad: "GREGORIO DE LAFERRERE",
    cargado: "20/11/2025",
  },
  {
    nombre: "VILLALBA JUAN GABRIEL",
    cuil: "20468928079",
    obraSocial: "O.S. DE LOS EMPLEADOS DE COMERCIO Y ACTIVIDADES CIVILES",
    telefono: "1166572258",
    localidad: "FLORENCIO VARELA",
    cargado: "20/11/2025",
  },
  {
    nombre: "FRANCO GIMENEZ ELAINE AYELEN",
    cuil: "27427232242",
    obraSocial: "O.S. DE LOS EMPLEADOS DE COMERCIO Y ACTIVIDADES CIVILES",
    telefono: "1163618075",
    localidad: "SAN FERNANDO",
    cargado: "20/11/2025",
  },
]

export function BaseAfiliadosLista() {
  const { theme } = useTheme()
  const [searchTerm, setSearchTerm] = useState("")
  const [obraSocialFilter, setObraSocialFilter] = useState("")

  const filteredAfiliados = afiliados.filter(
    (a) =>
      a.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.cuil.includes(searchTerm) ||
      a.telefono.includes(searchTerm),
  )

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
              <div>
                <label className={cn("text-xs mb-1 block", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                  Filtrar por Obra Social
                </label>
                <div className="relative">
                  <Filter
                    className={cn(
                      "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4",
                      theme === "dark" ? "text-gray-500" : "text-gray-400",
                    )}
                  />
                  <select
                    value={obraSocialFilter}
                    onChange={(e) => setObraSocialFilter(e.target.value)}
                    className={cn(
                      "w-full pl-9 pr-3 py-2 rounded-lg border text-sm appearance-none",
                      theme === "dark"
                        ? "bg-white/5 border-white/10 text-white"
                        : "bg-white border-gray-200 text-gray-700",
                    )}
                  >
                    <option value="">Todas las obras sociales</option>
                    <option value="comercio">O.S. DE LOS EMPLEADOS DE COMERCIO</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          <button
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 hover:scale-105 shrink-0",
              theme === "dark"
                ? "bg-gradient-to-r from-cyan-600 to-cyan-500 text-white"
                : "bg-gradient-to-r from-cyan-500 to-cyan-400 text-white",
            )}
          >
            <RefreshCw className="w-4 h-4" />
            Recargar Datos
          </button>
        </div>
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
              {filteredAfiliados.map((afiliado, index) => (
                <tr
                  key={index}
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
                    {afiliado.telefono}
                  </td>
                  <td className={cn("px-4 py-3", theme === "dark" ? "text-gray-300" : "text-gray-600")}>
                    {afiliado.localidad}
                  </td>
                  <td className={cn("px-4 py-3", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                    {afiliado.cargado}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      className={cn(
                        "p-1.5 rounded transition-colors",
                        theme === "dark" ? "text-cyan-400 hover:bg-cyan-500/20" : "text-cyan-600 hover:bg-cyan-100",
                      )}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
