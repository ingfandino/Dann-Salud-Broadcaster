"use client"

import { useState } from "react"
import { StatsCard } from "./stats-card"
import { Send, Users, ContactRound, Mail } from "lucide-react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import { ReportesGlobales } from "./reportes-globales"
import { MensajeriaMasiva } from "./mensajeria-masiva"
import { MensajeriaInternaModal } from "./mensajeria-interna-modal"
import { BaseAfiliadosEstadistica } from "./base-afiliados-estadistica"
import { BaseAfiliadosExportaciones } from "./base-afiliados-exportaciones"
import { BaseAfiliadosConfiguracion } from "./base-afiliados-configuracion"
import { BaseAfiliadosLista } from "./base-afiliados-lista"
import { BaseAfiliadosCargar } from "./base-afiliados-cargar"
import { PalabrasProhibidas } from "./palabras-prohibidas"
import { PalabrasProhibidasDetecciones } from "./palabras-prohibidas-detecciones"
import { PalabrasProhibidasAgregar } from "./palabras-prohibidas-agregar"
import { AuditoriasSeguimiento } from "./auditorias-seguimiento"
import { AuditoriasCrearTurno } from "./auditorias-crear-turno"
import { AuditoriasRecuperaciones } from "./auditorias-recuperaciones"
import { AuditoriasLiquidacion } from "./auditorias-liquidacion"
import { RRHHEstadisticas } from "./rrhh-estadisticas"
import { RRHHActivos } from "./rrhh-activos"
import { RRHHInactivos } from "./rrhh-inactivos"
import { RRHHAgregar } from "./rrhh-agregar"
import { GestionUsuarios } from "./gestion-usuarios"

interface DashboardContentProps {
  activeSection: string
  onSectionChange?: (section: string) => void
}

const sectionTitles: Record<string, string> = {
  "reportes-globales": "Reportes Globales",
  "mensajeria-masiva": "Mensajería Masiva",
  "base-afiliados": "Base de Afiliados",
  "base-afiliados-estadistica": "Estadística",
  "base-afiliados-exportaciones": "Exportaciones",
  "base-afiliados-configuracion": "Configuración de envíos",
  "base-afiliados-lista": "Lista de afiliados",
  "base-afiliados-cargar": "Cargar archivo",
  "palabras-prohibidas": "Palabras Prohibidas",
  "palabras-prohibidas-lista": "Lista de palabras",
  "palabras-prohibidas-detecciones": "Detecciones",
  "palabras-prohibidas-agregar": "Agregar palabra",
  auditorias: "Auditorías",
  "auditorias-seguimiento": "Seguimiento",
  "auditorias-crear-turno": "Crear turno",
  "auditorias-recuperaciones": "Recuperaciones",
  "auditorias-liquidacion": "Liquidación",
  "recursos-humanos": "Recursos Humanos",
  "rrhh-estadisticas": "Estadísticas de Empleados",
  "rrhh-activos": "Personal Activo",
  "rrhh-inactivos": "Personal Inactivo",
  "rrhh-agregar": "Añadir Empleado",
  "gestion-usuarios": "Gestión de Usuarios",
}

export function DashboardContent({ activeSection, onSectionChange }: DashboardContentProps) {
  const { theme } = useTheme()
  const hideStats =
    activeSection === "reportes-globales" ||
    activeSection.startsWith("base-afiliados") ||
    activeSection.startsWith("palabras-prohibidas") ||
    activeSection.startsWith("auditorias") ||
    activeSection.startsWith("rrhh") ||
    activeSection === "gestion-usuarios"
  const isMensajeriaMasiva = activeSection === "mensajeria-masiva"
  const [isMensajeriaInternaOpen, setIsMensajeriaInternaOpen] = useState(false)

  const renderContent = () => {
    if (activeSection === "reportes-globales") {
      return <ReportesGlobales />
    }

    if (isMensajeriaMasiva) {
      return <MensajeriaMasiva />
    }

    if (activeSection === "base-afiliados-estadistica") {
      return <BaseAfiliadosEstadistica />
    }

    if (activeSection === "base-afiliados-exportaciones") {
      return <BaseAfiliadosExportaciones />
    }

    if (activeSection === "base-afiliados-configuracion") {
      return <BaseAfiliadosConfiguracion />
    }

    if (activeSection === "base-afiliados-lista") {
      return <BaseAfiliadosLista />
    }

    if (activeSection === "base-afiliados-cargar") {
      return <BaseAfiliadosCargar />
    }

    if (activeSection === "palabras-prohibidas-lista") {
      return <PalabrasProhibidas />
    }

    if (activeSection === "palabras-prohibidas-detecciones") {
      return <PalabrasProhibidasDetecciones />
    }

    if (activeSection === "palabras-prohibidas-agregar") {
      return <PalabrasProhibidasAgregar />
    }

    if (activeSection === "auditorias-seguimiento") {
      return <AuditoriasSeguimiento />
    }

    if (activeSection === "auditorias-crear-turno") {
      return <AuditoriasCrearTurno />
    }

    if (activeSection === "auditorias-recuperaciones") {
      return <AuditoriasRecuperaciones />
    }

    if (activeSection === "auditorias-liquidacion") {
      return <AuditoriasLiquidacion />
    }

    if (activeSection === "rrhh-estadisticas") {
      return <RRHHEstadisticas />
    }

    if (activeSection === "rrhh-activos") {
      return <RRHHActivos />
    }

    if (activeSection === "rrhh-inactivos") {
      return <RRHHInactivos />
    }

    if (activeSection === "rrhh-agregar") {
      return <RRHHAgregar />
    }

    if (activeSection === "gestion-usuarios") {
      return <GestionUsuarios />
    }

    if (activeSection.startsWith("base-afiliados")) {
      return (
        <div className="animate-fade-in-up">
          <div
            className={cn(
              "rounded-2xl border p-4 lg:p-6 backdrop-blur-sm",
              theme === "dark"
                ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
                : "bg-gradient-to-br from-[#F5F0E8] to-white border-purple-200/30 shadow-lg shadow-purple-100/30",
            )}
          >
            <h2
              className={cn(
                "text-lg lg:text-xl font-semibold mb-4 flex items-center gap-2",
                theme === "dark" ? "text-white" : "text-gray-700",
              )}
            >
              <span
                className={cn("w-2 h-2 rounded-full animate-pulse", theme === "dark" ? "bg-purple-500" : "bg-pink-400")}
              />
              {sectionTitles[activeSection] || "Base de Afiliados"}
            </h2>
            <p
              className={cn("text-xs lg:text-sm leading-relaxed", theme === "dark" ? "text-gray-400" : "text-gray-600")}
            >
              Estás viendo la sección de{" "}
              <span className={cn(theme === "dark" ? "text-purple-400" : "text-purple-500")}>
                {sectionTitles[activeSection]}
              </span>
              . Próximamente disponible.
            </p>
          </div>
        </div>
      )
    }

    return (
      <div className="animate-fade-in-up">
        <div
          className={cn(
            "rounded-2xl border p-4 lg:p-6 backdrop-blur-sm",
            theme === "dark"
              ? "bg-gradient-to-br from-white/5 to-transparent border border-white/5 hover:border-purple-500/30 hover:shadow-purple-500/10"
              : "bg-gradient-to-br from-[#F5F0E8] to-white border border-purple-100 hover:border-purple-300/50 hover:shadow-purple-200/30",
          )}
        >
          <h2
            className={cn(
              "text-lg lg:text-xl font-semibold mb-4 flex items-center gap-2",
              theme === "dark" ? "text-white" : "text-gray-700",
            )}
          >
            <span
              className={cn("w-2 h-2 rounded-full animate-pulse", theme === "dark" ? "bg-purple-500" : "bg-pink-400")}
            />
            {sectionTitles[activeSection] || "Dashboard"}
          </h2>
          <p className={cn("text-sm lg:text-base", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
            Estás viendo la sección de{" "}
            <span className={cn(theme === "dark" ? "text-purple-400" : "text-purple-500")}>
              {sectionTitles[activeSection]}
            </span>
            . Aquí podrás gestionar todas las funcionalidades relacionadas con esta área.
          </p>

          <div className="mt-4 lg:mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={cn(
                  "h-24 lg:h-32 rounded-xl flex items-center justify-center group transition-all duration-300 hover:shadow-lg",
                  theme === "dark"
                    ? "bg-gradient-to-br from-white/5 to-transparent border border-white/5 hover:border-purple-500/30 hover:shadow-purple-500/10"
                    : "bg-gradient-to-br from-[#F5F0E8] to-white border border-purple-100 hover:border-purple-300/50 hover:shadow-purple-200/30",
                )}
              >
                <span
                  className={cn(
                    "text-sm transition-colors",
                    theme === "dark"
                      ? "text-gray-600 group-hover:text-gray-400"
                      : "text-gray-400 group-hover:text-purple-400",
                  )}
                >
                  Contenido {i}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <main className="flex-1 p-4 pt-20 lg:pt-8 lg:p-8 overflow-auto w-full">
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div
            className={cn(
              "w-8 h-8 lg:w-10 lg:h-10 rounded-lg flex items-center justify-center",
              theme === "dark"
                ? "bg-gradient-to-br from-purple-500/20 to-blue-500/20"
                : "bg-gradient-to-br from-purple-100 to-blue-100",
            )}
          >
            <span className="text-xl lg:text-2xl">📊</span>
          </div>
          <h1 className={cn("text-2xl lg:text-3xl font-bold", theme === "dark" ? "text-white" : "text-gray-700")}>
            Dashboard
          </h1>
        </div>
        <p className={cn("text-sm lg:text-base", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
          Bienvenido,{" "}
          <span className={cn("font-medium", theme === "dark" ? "text-purple-400" : "text-purple-500")}>
            Yamila Chaar
          </span>
          . Selecciona una opción en el menú lateral.
        </p>
      </div>

      {/* Stats Cards - hidden for certain sections with animation */}
      <div
        className={cn(
          "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-6 lg:mb-8 transition-all duration-500 ease-out overflow-hidden",
          hideStats ? "max-h-0 opacity-0 mb-0 pointer-events-none" : "max-h-[500px] opacity-100",
        )}
      >
        <StatsCard title="Mensajes enviados hoy" value={165} icon={Send} color="primary" delay={1} />
        <StatsCard title="Usuarios activos" value={13} icon={Users} color="secondary" delay={2} />
        <StatsCard title="Contactos cargados" value={383} icon={ContactRound} color="accent" delay={3} />
      </div>

      {/* Dynamic Content */}
      {renderContent()}

      {/* FAB for Mensajería Interna */}
      <button
        onClick={() => setIsMensajeriaInternaOpen(true)}
        className={cn(
          "fixed bottom-4 right-4 lg:bottom-8 lg:right-8 w-12 h-12 lg:w-14 lg:h-14 rounded-full text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform duration-300 animate-float z-20",
          theme === "dark"
            ? "bg-gradient-to-br from-purple-600 to-blue-600 shadow-purple-500/30"
            : "bg-gradient-to-br from-purple-400 to-blue-400 shadow-purple-300/30",
        )}
      >
        <Mail className="w-5 h-5 lg:w-6 lg:h-6" />
      </button>

      <MensajeriaInternaModal isOpen={isMensajeriaInternaOpen} onClose={() => setIsMensajeriaInternaOpen(false)} />
    </main>
  )
}
