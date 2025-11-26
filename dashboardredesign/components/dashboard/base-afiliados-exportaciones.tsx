"use client"

import { Download, User, Calendar, HardDrive, Users } from "lucide-react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"

const exportedFiles = [
  {
    filename: "afiliados_6913b231070036f26f4cae57_1764158400672.xlsx",
    supervisor: "Gastón Sarmiento",
    date: "26/11/2025, 09:00:00",
    size: "9.56 KB",
    afiliados: 50,
  },
  {
    filename: "afiliados_690e46a4afaf7eec4f0b69aa_1764158400641.xlsx",
    supervisor: "Alejandro Mejail",
    date: "26/11/2025, 09:00:00",
    size: "8.43 KB",
    afiliados: 30,
  },
  {
    filename: "afiliados_6908e0defda0849bab30152b_1764158400609.xlsx",
    supervisor: "Nahuel Sánchez",
    date: "26/11/2025, 09:00:00",
    size: "9.59 KB",
    afiliados: 50,
  },
  {
    filename: "afiliados_6906182e018bb8d4d471fcff_1764158400521.xlsx",
    supervisor: "Abigail Vera",
    date: "26/11/2025, 09:00:00",
    size: "9.55 KB",
    afiliados: 50,
  },
  {
    filename: "afiliados_69061818018bb8d4d471fcf7_1764158400474.xlsx",
    supervisor: "Analía Suárez",
    date: "26/11/2025, 09:00:00",
    size: "12.26 KB",
    afiliados: 100,
  },
  {
    filename: "afiliados_6904eeb2f1282c49a8b4a681_1764158400427.xlsx",
    supervisor: "Mateo Viera",
    date: "26/11/2025, 09:00:00",
    size: "12.36 KB",
    afiliados: 100,
  },
  {
    filename: "afiliados_6904daedb4744a076aa7f0b4_1764158400399.xlsx",
    supervisor: "Luciano Carugno",
    date: "26/11/2025, 09:00:00",
    size: "9.55 KB",
    afiliados: 50,
  },
  {
    filename: "afiliados_68f666a3207ef6d638a48b7a_1764158400368.xlsx",
    supervisor: "Aryel Puiggros",
    date: "26/11/2025, 09:00:00",
    size: "12.27 KB",
    afiliados: 100,
  },
]

export function BaseAfiliadosExportaciones() {
  const { theme } = useTheme()

  return (
    <div className="animate-fade-in-up space-y-4">
      {/* Header */}
      <div
        className={cn(
          "rounded-2xl border p-4 lg:p-6 backdrop-blur-sm",
          theme === "dark"
            ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
            : "bg-gradient-to-br from-white to-[#FAF7F2]/80 border-purple-200/30 shadow-lg shadow-purple-100/30",
        )}
      >
        <h2
          className={cn(
            "text-lg lg:text-xl font-semibold flex items-center gap-2",
            theme === "dark" ? "text-white" : "text-gray-700",
          )}
        >
          <Download className={cn("w-5 h-5", theme === "dark" ? "text-purple-400" : "text-purple-500")} />
          Archivos Exportados
        </h2>
      </div>

      {/* Files List */}
      <div className="space-y-3">
        {exportedFiles.map((file, index) => (
          <div
            key={index}
            className={cn(
              "rounded-xl border p-4 backdrop-blur-sm transition-all duration-300 hover:scale-[1.01]",
              theme === "dark"
                ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10 hover:border-purple-500/30"
                : "bg-gradient-to-br from-white to-[#FAF7F2]/80 border-purple-200/30 shadow-sm hover:shadow-md hover:border-purple-300/50",
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* File Info */}
              <div className="flex-1 min-w-0">
                <h3
                  className={cn(
                    "font-medium text-sm lg:text-base truncate mb-2",
                    theme === "dark" ? "text-white" : "text-gray-700",
                  )}
                >
                  {file.filename}
                </h3>
                <div className="flex flex-wrap items-center gap-3 lg:gap-4 text-xs">
                  <span
                    className={cn("flex items-center gap-1.5", theme === "dark" ? "text-gray-400" : "text-gray-500")}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span className={cn(theme === "dark" ? "text-purple-400" : "text-purple-500")}>
                      {file.supervisor}
                    </span>
                  </span>
                  <span
                    className={cn("flex items-center gap-1.5", theme === "dark" ? "text-gray-400" : "text-gray-500")}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    {file.date}
                  </span>
                  <span
                    className={cn("flex items-center gap-1.5", theme === "dark" ? "text-gray-400" : "text-gray-500")}
                  >
                    <HardDrive className="w-3.5 h-3.5" />
                    {file.size}
                  </span>
                  <span
                    className={cn("flex items-center gap-1.5", theme === "dark" ? "text-gray-400" : "text-gray-500")}
                  >
                    <Users className="w-3.5 h-3.5" />
                    {file.afiliados} afiliados
                  </span>
                </div>
              </div>

              {/* Download Button */}
              <button
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 hover:scale-105 shrink-0",
                  theme === "dark"
                    ? "bg-gradient-to-r from-cyan-600 to-cyan-500 text-white hover:from-cyan-500 hover:to-cyan-400"
                    : "bg-gradient-to-r from-cyan-500 to-cyan-400 text-white hover:from-cyan-400 hover:to-cyan-300",
                )}
              >
                <Download className="w-4 h-4" />
                Descargar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
