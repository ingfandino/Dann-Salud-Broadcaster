"use client"

import { useState } from "react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import { Filter, Download, ChevronLeft, ChevronRight, DollarSign, Trash2 } from "lucide-react"

interface Liquidacion {
  id: number
  fecha: string
  afiliado: string
  cuil: string
  osVendida: string
  asesor: string
  supervisor: string
  auditor: string
  administrador: string
  recuperada: string
}

const mockData: Liquidacion[] = [
  {
    id: 1,
    fecha: "26/11/2025",
    afiliado: "Ivan Eduardo Mendoza Caceres",
    cuil: "20383909040",
    osVendida: "Binimed",
    asesor: "Daira Cabrera",
    supervisor: "Nahia Avellaneda",
    auditor: "Santiago Goldsztein",
    administrador: "Maria Jimena Vargas",
    recuperada: "No",
  },
  {
    id: 2,
    fecha: "26/11/2025",
    afiliado: "Sanchez Antonella Belen",
    cuil: "27480271071",
    osVendida: "Binimed",
    asesor: "Juliana Baez",
    supervisor: "Belen Salaverry",
    auditor: "Marcelo",
    administrador: "Yair Navas",
    recuperada: "No",
  },
  {
    id: 3,
    fecha: "26/11/2025",
    afiliado: "Lautaro Moralez",
    cuil: "20463369195",
    osVendida: "Binimed",
    asesor: "Agustín Maya",
    supervisor: "Facundo Tevez",
    auditor: "Nahia Avellaneda",
    administrador: "",
    recuperada: "No",
  },
  {
    id: 4,
    fecha: "26/11/2025",
    afiliado: "Grieve Samir Noel",
    cuil: "20386240907",
    osVendida: "Binimed",
    asesor: "Dayana Díaz",
    supervisor: "Facundo Tevez",
    auditor: "Santiago Goldsztein",
    administrador: "Yair Navas",
    recuperada: "No",
  },
  {
    id: 5,
    fecha: "26/11/2025",
    afiliado: "Batalla Lucas Benjamin",
    cuil: "20459127640",
    osVendida: "Binimed",
    asesor: "Benjamín Marco",
    supervisor: "Facundo Tevez",
    auditor: "Nahuel Sanchez",
    administrador: "Yair Navas",
    recuperada: "No",
  },
  {
    id: 6,
    fecha: "26/11/2025",
    afiliado: "Alexis Joel Paez",
    cuil: "27439911862",
    osVendida: "Meplife",
    asesor: "Diana Silvestre",
    supervisor: "Luciano Carugno",
    auditor: "Luciano Carugno",
    administrador: "Yair Navas",
    recuperada: "No",
  },
  {
    id: 7,
    fecha: "26/11/2025",
    afiliado: "Corera Nicoas Matias",
    cuil: "20465842920",
    osVendida: "Binimed",
    asesor: "Noelia Lageard",
    supervisor: "Abigail Vera",
    auditor: "Joaquin Valdez",
    administrador: "Yair Navas",
    recuperada: "No",
  },
  {
    id: 8,
    fecha: "26/11/2025",
    afiliado: "Macarena Pilar Rivera",
    cuil: "27441566145",
    osVendida: "Meplife",
    asesor: "Martina Ortigoza",
    supervisor: "Luciano Carugno",
    auditor: "Luciano Carugno",
    administrador: "Maria Jimena Vargas",
    recuperada: "No",
  },
]

const auditorStats = [
  { name: "Abigail Vera", count: 13 },
  { name: "Belen Salaverry", count: 11 },
  { name: "Gaston Sarmiento", count: 11 },
  { name: "Nahia Avellaneda", count: 10 },
  { name: "Facundo Tevez", count: 7 },
  { name: "Analia Suarez", count: 7 },
  { name: "Luciano Carugno", count: 5 },
  { name: "Nahuel Sanchez", count: 5 },
  { name: "Joaquin Valdez", count: 4 },
  { name: "Santiago Goldsztein", count: 4 },
  { name: "Mateo Viera", count: 4 },
  { name: "Aryel Puiggros", count: 3 },
  { name: "Alejandro Mejail", count: 2 },
]

export function AuditoriasLiquidacion() {
  const { theme } = useTheme()
  const [semanaActual, setSemanaActual] = useState(1)
  const [filtros, setFiltros] = useState({
    afiliado: "",
    cuil: "",
    asesor: "",
    supervisor: "",
    auditor: "",
    administrador: "",
    obraSocialVendida: "",
    fechaDesde: "",
    fechaHasta: "",
    estado: "",
  })

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <DollarSign className={cn("w-6 h-6", theme === "dark" ? "text-yellow-400" : "text-yellow-500")} />
          <div>
            <h2 className={cn("text-xl font-semibold", theme === "dark" ? "text-white" : "text-gray-800")}>
              Liquidación (QR Hecho)
            </h2>
            <p className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
              Semana laboral: Viernes 00:00 hrs a Jueves 23:01 hrs
            </p>
          </div>
        </div>
        <button
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
            theme === "dark"
              ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
              : "bg-green-500 text-white hover:bg-green-600",
          )}
        >
          <Download className="w-4 h-4" />
          Exportar
        </button>
      </div>

      {/* Week navigation */}
      <div
        className={cn(
          "rounded-xl border p-4 flex flex-wrap items-center justify-between gap-4",
          theme === "dark"
            ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
            : "bg-white border-gray-200 shadow-sm",
        )}
      >
        <div className="flex items-center gap-3">
          <span className={cn("text-sm font-medium", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
            Semana:
          </span>
          <button
            onClick={() => setSemanaActual(Math.max(1, semanaActual - 1))}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1",
              theme === "dark"
                ? "bg-white/5 text-gray-300 hover:bg-white/10"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200",
            )}
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </button>
          <span
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold",
              theme === "dark" ? "bg-cyan-500/20 text-cyan-400" : "bg-cyan-500 text-white",
            )}
          >
            {semanaActual}
          </span>
          <button
            onClick={() => setSemanaActual(semanaActual + 1)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1",
              theme === "dark"
                ? "bg-white/5 text-gray-300 hover:bg-white/10"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200",
            )}
          >
            Siguiente
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className={cn("text-sm", theme === "dark" ? "text-gray-500" : "text-gray-500")}>(de 4)</span>
        </div>

        <div className="flex items-center gap-2">
          <span className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
            Total esta semana:
          </span>
          <span
            className={cn(
              "px-3 py-1 rounded-lg text-sm font-bold",
              theme === "dark" ? "bg-cyan-500/20 text-cyan-400" : "bg-cyan-500 text-white",
            )}
          >
            86 QR Hechos
          </span>
          <span
            className={cn(
              "px-3 py-1 rounded-lg text-sm font-bold",
              theme === "dark" ? "bg-yellow-500/20 text-yellow-400" : "bg-yellow-500 text-white",
            )}
          >
            3 Cargada
          </span>
          <span
            className={cn(
              "px-3 py-1 rounded-lg text-sm font-bold",
              theme === "dark" ? "bg-purple-500/20 text-purple-400" : "bg-purple-500 text-white",
            )}
          >
            4 Aprobada
          </span>
          <span
            className={cn(
              "px-3 py-1 rounded-lg text-sm font-bold",
              theme === "dark" ? "bg-gray-500/20 text-gray-300" : "bg-gray-700 text-white",
            )}
          >
            Total: 93
          </span>
        </div>
      </div>

      {/* Auditor stats */}
      <div
        className={cn(
          "rounded-xl border p-4 text-sm",
          theme === "dark"
            ? "bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-white/10"
            : "bg-gradient-to-r from-purple-50 to-blue-50 border-purple-100",
        )}
      >
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <span className={cn("font-semibold", theme === "dark" ? "text-white" : "text-gray-800")}>
            Total QR Hechos: 86
          </span>
          <span className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>|</span>
          {auditorStats.map((stat, index) => (
            <span key={stat.name} className={theme === "dark" ? "text-gray-300" : "text-gray-700"}>
              {stat.name}: <span className={theme === "dark" ? "text-cyan-400" : "text-cyan-600"}>{stat.count}</span>
              {index < auditorStats.length - 1 && <span className="ml-2">|</span>}
            </span>
          ))}
        </div>
      </div>

      {/* Filtros */}
      <div
        className={cn(
          "rounded-2xl border p-6 backdrop-blur-sm",
          theme === "dark"
            ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
            : "bg-white border-gray-200 shadow-sm",
        )}
      >
        <div className="flex items-center gap-2 mb-4">
          <Filter className={cn("w-5 h-5", theme === "dark" ? "text-purple-400" : "text-purple-500")} />
          <h3 className={cn("font-semibold", theme === "dark" ? "text-white" : "text-gray-800")}>Filtros</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={filtros.afiliado}
            onChange={(e) => setFiltros({ ...filtros, afiliado: e.target.value })}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm",
              theme === "dark"
                ? "bg-white/5 border-white/10 text-white placeholder-gray-500"
                : "bg-white border-gray-200 text-gray-800 placeholder-gray-400",
            )}
          />
          <input
            type="text"
            placeholder="Buscar por CUIL..."
            value={filtros.cuil}
            onChange={(e) => setFiltros({ ...filtros, cuil: e.target.value })}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm",
              theme === "dark"
                ? "bg-white/5 border-white/10 text-white placeholder-gray-500"
                : "bg-white border-gray-200 text-gray-800 placeholder-gray-400",
            )}
          />
          <select
            value={filtros.asesor}
            onChange={(e) => setFiltros({ ...filtros, asesor: e.target.value })}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm",
              theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
            )}
          >
            <option value="">Todos</option>
            <option value="daira">Daira Cabrera</option>
            <option value="juliana">Juliana Baez</option>
          </select>
          <select
            value={filtros.supervisor}
            onChange={(e) => setFiltros({ ...filtros, supervisor: e.target.value })}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm",
              theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
            )}
          >
            <option value="">Todos</option>
            <option value="nahia">Nahia Avellaneda</option>
            <option value="facundo">Facundo Tevez</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <select
            value={filtros.auditor}
            onChange={(e) => setFiltros({ ...filtros, auditor: e.target.value })}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm",
              theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
            )}
          >
            <option value="">Todos</option>
            <option value="santiago">Santiago Goldsztein</option>
            <option value="marcelo">Marcelo</option>
          </select>
          <select
            value={filtros.administrador}
            onChange={(e) => setFiltros({ ...filtros, administrador: e.target.value })}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm",
              theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
            )}
          >
            <option value="">Todos</option>
            <option value="maria">Maria Jimena Vargas</option>
            <option value="yair">Yair Navas</option>
          </select>
          <select
            value={filtros.obraSocialVendida}
            onChange={(e) => setFiltros({ ...filtros, obraSocialVendida: e.target.value })}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm",
              theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
            )}
          >
            <option value="">Todas</option>
            <option value="binimed">Binimed</option>
            <option value="meplife">Meplife</option>
          </select>
          <input
            type="date"
            value={filtros.fechaDesde}
            onChange={(e) => setFiltros({ ...filtros, fechaDesde: e.target.value })}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm",
              theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
            )}
          />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <input
            type="date"
            value={filtros.fechaHasta}
            onChange={(e) => setFiltros({ ...filtros, fechaHasta: e.target.value })}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm",
              theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
            )}
          />
          <select
            value={filtros.estado}
            onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm",
              theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
            )}
          >
            <option value="">Todos</option>
            <option value="qr-hecho">QR Hecho</option>
            <option value="cargada">Cargada</option>
            <option value="aprobada">Aprobada</option>
          </select>
          <div className="flex-1" />
          <button
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
              theme === "dark"
                ? "bg-gray-500/20 text-gray-300 hover:bg-gray-500/30"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300",
            )}
          >
            <Trash2 className="w-4 h-4" />
            Limpiar
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div
        className={cn(
          "rounded-2xl border overflow-hidden",
          theme === "dark"
            ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
            : "bg-white border-gray-200 shadow-sm",
        )}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={theme === "dark" ? "bg-white/5" : "bg-gray-50"}>
                {[
                  "Fecha",
                  "Afiliado",
                  "CUIL",
                  "O.S. Vendida",
                  "Asesor",
                  "Supervisor",
                  "Auditor",
                  "Administrador",
                  "¿Recuperada?",
                ].map((header) => (
                  <th
                    key={header}
                    className={cn(
                      "px-3 py-3 text-left font-semibold whitespace-nowrap",
                      theme === "dark" ? "text-gray-300" : "text-gray-700",
                    )}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockData.map((item) => (
                <tr
                  key={item.id}
                  className={cn(
                    "border-t transition-colors",
                    theme === "dark" ? "border-white/5 hover:bg-white/5" : "border-gray-100 hover:bg-gray-50",
                  )}
                >
                  <td
                    className={cn("px-3 py-3 whitespace-nowrap", theme === "dark" ? "text-gray-300" : "text-gray-700")}
                  >
                    {item.fecha}
                  </td>
                  <td className={cn("px-3 py-3 font-medium", theme === "dark" ? "text-white" : "text-gray-800")}>
                    {item.afiliado}
                  </td>
                  <td
                    className={cn("px-3 py-3 whitespace-nowrap", theme === "dark" ? "text-gray-400" : "text-gray-600")}
                  >
                    {item.cuil}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        "px-2 py-1 rounded text-xs font-medium",
                        item.osVendida === "Binimed"
                          ? theme === "dark"
                            ? "bg-green-500/20 text-green-300"
                            : "bg-green-100 text-green-700"
                          : theme === "dark"
                            ? "bg-pink-500/20 text-pink-300"
                            : "bg-pink-100 text-pink-700",
                      )}
                    >
                      {item.osVendida}
                    </span>
                  </td>
                  <td
                    className={cn("px-3 py-3 whitespace-nowrap", theme === "dark" ? "text-gray-300" : "text-gray-700")}
                  >
                    {item.asesor}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        "px-2 py-1 rounded text-xs font-medium",
                        theme === "dark" ? "bg-cyan-500/20 text-cyan-300" : "bg-cyan-100 text-cyan-700",
                      )}
                    >
                      {item.supervisor}
                    </span>
                  </td>
                  <td
                    className={cn("px-3 py-3 whitespace-nowrap", theme === "dark" ? "text-gray-300" : "text-gray-700")}
                  >
                    {item.auditor}
                  </td>
                  <td
                    className={cn("px-3 py-3 whitespace-nowrap", theme === "dark" ? "text-gray-400" : "text-gray-600")}
                  >
                    {item.administrador || "-"}
                  </td>
                  <td
                    className={cn("px-3 py-3 whitespace-nowrap", theme === "dark" ? "text-gray-400" : "text-gray-600")}
                  >
                    {item.recuperada}
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
