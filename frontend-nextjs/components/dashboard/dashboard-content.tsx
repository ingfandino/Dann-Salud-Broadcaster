/**
 * ============================================================
 * CONTENIDO DEL DASHBOARD (dashboard-content.tsx)
 * ============================================================
 * Router de secciones del dashboard.
 * Renderiza el componente correspondiente según activeSection.
 */

"use client"

import { useState, useEffect } from "react"
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
import { BaseAfiliadosExitosas } from "./base-afiliados-exitosas"
import { PalabrasProhibidas } from "./palabras-prohibidas"
import { PalabrasProhibidasDetecciones } from "./palabras-prohibidas-detecciones"
import { PalabrasProhibidasAgregar } from "./palabras-prohibidas-agregar"
import { AuditoriasSeguimiento } from "./auditorias-seguimiento"
import { AuditoriasCrearTurno } from "./auditorias-crear-turno"
import { AuditoriasLiquidacion } from "./auditorias-liquidacion"
import { AuditoriasFaltaClave } from "./auditorias-falta-clave"
import { AuditoriasRechazada } from "./auditorias-rechazada"
import { AuditoriasPendiente } from "./auditorias-pendiente"
import { AuditoriasAfipPadron } from "./auditorias-afip-padron"
import { RRHHEstadisticas } from "./rrhh-estadisticas"
import { RRHHActivos } from "./rrhh-activos"
import { RRHHInactivos } from "./rrhh-inactivos"
import { RRHHAgregar } from "./rrhh-agregar"
import { RRHHTelefonos } from "./rrhh-telefonos"
import { GestionUsuarios } from "./gestion-usuarios"
import { RegistroVentas } from "./registro-ventas"
import { FreshData } from "./fresh-data"
import { ReusableData } from "./reusable-data"
import { ContactAffiliates } from "./contact-affiliates"
import { FailedAffiliations } from "./failed-affiliations"
import { ContactarAdministracion } from "./contactar-administracion"
import { ContactarDatosDia } from "./contactar-datos-dia"
import { useAuth } from "@/lib/auth"
import { api } from "@/lib/api"
import { useSocket } from "@/lib/socket"

interface DashboardContentProps {
  activeSection: string
  onSectionChange?: (section: string) => void
}

const sectionTitles: Record<string, string> = {
  "reportes-globales": "Reportes de Mensajería",
  "mensajeria-masiva": "Mensajería Masiva",
  "base-afiliados": "Base de Afiliados",
  "base-afiliados-estadistica": "Estadística",
  "base-afiliados-exitosas": "Afiliaciones exitosas",
  "base-afiliados-exportaciones": "Exportaciones",
  "base-afiliados-configuracion": "Configuración de envíos",
  "base-afiliados-lista": "Lista de afiliados",

  "base-afiliados-cargar": "Cargar archivo",
  "base-afiliados-frescos": "Datos frescos",
  "base-afiliados-reutilizables": "Datos reutilizables",
  "base-afiliados-fallidas": "Afiliaciones fallidas",
  "contactar-afiliados": "Contactar Afiliados",
  "contactar-afiliados-administracion": "Administración de datos",
  "contactar-afiliados-datos-dia": "Datos del día",
  "palabras-prohibidas": "Palabras Prohibidas",
  "palabras-prohibidas-lista": "Lista de palabras",
  "palabras-prohibidas-detecciones": "Detecciones",
  "palabras-prohibidas-agregar": "Agregar palabra",
  auditorias: "Auditorías",
  "auditorias-seguimiento": "Seguimiento",
  "auditorias-crear-turno": "Crear turno",
  "auditorias-liquidacion": "Liquidación",
  "auditorias-falta-clave": "Falta Clave",
  "auditorias-rechazada": "Rechazada",
  "auditorias-pendiente": "Pendiente",
  "auditorias-afip-padron": "AFIP y Padrón",
  "recursos-humanos": "Recursos Humanos",
  "rrhh-estadisticas": "Estadísticas de Empleados",
  "rrhh-activos": "Personal Activo",
  "rrhh-inactivos": "Personal Inactivo",
  "rrhh-agregar": "Añadir Empleado",
  "rrhh-telefonos": "Teléfonos Corporativos",
  "administracion": "Administración",
  "administracion-registro-ventas": "Registro de Ventas",
  "gestion-usuarios": "Gestión de Usuarios",
}

export function DashboardContent({ activeSection, onSectionChange }: DashboardContentProps) {
  const { theme } = useTheme()
  const { user } = useAuth()

  // Safe check for activeSection
  const safeActiveSection = activeSection || ""

  const hideStats =
    safeActiveSection === "reportes-globales" ||
    safeActiveSection.startsWith("base-afiliados") ||
    safeActiveSection.startsWith("palabras-prohibidas") ||
    safeActiveSection.startsWith("auditorias") ||
    safeActiveSection.startsWith("rrhh") ||
    safeActiveSection === "gestion-usuarios" ||
    safeActiveSection.startsWith("mensajeria") ||
    safeActiveSection.startsWith("administracion")
  const isMensajeriaMasiva = safeActiveSection === "mensajeria-masiva"
  const [isMensajeriaInternaOpen, setIsMensajeriaInternaOpen] = useState(false)
  const socket = useSocket()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    loadUnreadCount()
  }, [])

  useEffect(() => {
    if (socket) {
      socket.on('new_message', () => {
        loadUnreadCount()
      })
    }
    return () => {
      if (socket) {
        socket.off('new_message')
      }
    }
  }, [socket])

  const loadUnreadCount = async () => {
    try {
      const res = await api.internalMessages.getUnreadCount()
      setUnreadCount(res.data.unreadCount)
    } catch (error) {
      console.error("Error loading unread count", error)
    }
  }

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

    if (activeSection === "base-afiliados-exitosas") {
      return <BaseAfiliadosExitosas />
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

    if (activeSection === "base-afiliados-frescos") {
      return <FreshData />
    }

    if (activeSection === "base-afiliados-reutilizables") {
      return <ReusableData />
    }

    if (activeSection === "base-afiliados-fallidas") {
      return <FailedAffiliations />
    }

    if (activeSection === "contactar-afiliados") {
      return <ContactAffiliates />
    }

    if (activeSection === "contactar-afiliados-administracion") {
      // Solo supervisores y gerencia pueden ver Administración de datos
      const role = user?.role?.toLowerCase()
      if (role !== 'supervisor' && role !== 'gerencia' && role !== 'supervisor_reventa') {
        return (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-red-500 text-lg font-semibold">⛔ Acceso Denegado</p>
            <p className="text-gray-500 mt-2">Esta sección es exclusiva para supervisores.</p>
          </div>
        )
      }
      return <ContactarAdministracion />
    }

    if (activeSection === "contactar-afiliados-datos-dia") {
      // Acceso: asesor, supervisor, gerencia, auditor con equipo
      const role = user?.role?.toLowerCase()
      const hasTeam = !!user?.numeroEquipo
      const canAccess = role === 'asesor' || role === 'gerencia' || role === 'supervisor' || 
                        (role === 'auditor' && hasTeam)
      if (!canAccess) {
        return (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-red-500 text-lg font-semibold">⛔ Acceso Denegado</p>
            <p className="text-gray-500 mt-2">No tienes permisos para acceder a esta sección.</p>
          </div>
        )
      }
      return <ContactarDatosDia />
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

    if (activeSection === "auditorias-liquidacion") {
      return <AuditoriasLiquidacion />
    }

    if (activeSection === "auditorias-falta-clave") {
      // Acceso: Gerencia y Recuperador
      const role = user?.role?.toLowerCase()
      if (role !== 'gerencia' && role !== 'recuperador') {
        return (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-red-500 text-lg font-semibold">⛔ Acceso Denegado</p>
            <p className="text-gray-500 mt-2">Esta sección es exclusiva para Gerencia y Recuperadores.</p>
          </div>
        )
      }
      return <AuditoriasFaltaClave />
    }

    if (activeSection === "auditorias-rechazada") {
      // Acceso: Gerencia y Recuperador
      const role = user?.role?.toLowerCase()
      if (role !== 'gerencia' && role !== 'recuperador') {
        return (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-red-500 text-lg font-semibold">⛔ Acceso Denegado</p>
            <p className="text-gray-500 mt-2">Esta sección es exclusiva para Gerencia y Recuperadores.</p>
          </div>
        )
      }
      return <AuditoriasRechazada />
    }

    if (activeSection === "auditorias-pendiente") {
      // Acceso: Gerencia y Recuperador
      const role = user?.role?.toLowerCase()
      if (role !== 'gerencia' && role !== 'recuperador') {
        return (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-red-500 text-lg font-semibold">⛔ Acceso Denegado</p>
            <p className="text-gray-500 mt-2">Esta sección es exclusiva para Gerencia y Recuperadores.</p>
          </div>
        )
      }
      return <AuditoriasPendiente />
    }

    if (activeSection === "auditorias-afip-padron") {
      // Acceso: Gerencia y Recuperador
      const role = user?.role?.toLowerCase()
      if (role !== 'gerencia' && role !== 'recuperador') {
        return (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-red-500 text-lg font-semibold">⛔ Acceso Denegado</p>
            <p className="text-gray-500 mt-2">Esta sección es exclusiva para Gerencia y Recuperadores.</p>
          </div>
        )
      }
      return <AuditoriasAfipPadron />
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

    if (activeSection === "rrhh-telefonos") {
      // Acceso: solo Supervisor y Gerencia
      const role = user?.role?.toLowerCase()
      if (role !== 'supervisor' && role !== 'gerencia') {
        return (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-red-500 text-lg font-semibold">⛔ Acceso Denegado</p>
            <p className="text-gray-500 mt-2">Esta sección es exclusiva para Supervisores y Gerencia.</p>
          </div>
        )
      }
      return <RRHHTelefonos />
    }

    if (activeSection === "gestion-usuarios") {
      return <GestionUsuarios />
    }

    if (activeSection === "administracion-registro-ventas") {
      const role = user?.role?.toLowerCase()
      if (role !== 'gerencia' && role !== 'administrativo') {
        return (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-red-500 text-lg font-semibold">⛔ Acceso Denegado</p>
            <p className="text-gray-500 mt-2">Esta sección es exclusiva para Gerencia y Administrativos.</p>
          </div>
        )
      }
      return <RegistroVentas />
    }

    if (safeActiveSection.startsWith("base-afiliados")) {
      return (
        <div className="animate-fade-in-up">
          <div
            className={cn(
              "rounded-2xl border p-4 lg:p-6 backdrop-blur-sm",
              theme === "dark"
                ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
                : "bg-gradient-to-br from-[#F5F0E8] to-white border-[#00C794]/20 shadow-lg shadow-[#00C794]/10",
            )}
          >
            <h2
              className={cn(
                "text-lg lg:text-xl font-semibold mb-4 flex items-center gap-2",
                theme === "dark" ? "text-white" : "text-gray-700",
              )}
            >
              <span
                className={cn("w-2 h-2 rounded-full animate-pulse", theme === "dark" ? "bg-purple-500" : "bg-[#00C794]")}
              />
              {sectionTitles[activeSection] || "Base de Afiliados"}
            </h2>
            <p
              className={cn("text-xs lg:text-sm leading-relaxed", theme === "dark" ? "text-gray-400" : "text-gray-600")}
            >
              Estás viendo la sección de{" "}
              <span className={cn(theme === "dark" ? "text-purple-400" : "text-[#00C794]")}>
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
              : "bg-gradient-to-br from-[#F5F0E8] to-white border border-[#00C794]/20 hover:border-[#00C794]/50 hover:shadow-[#00C794]/20",
          )}
        >
          <h2
            className={cn(
              "text-lg lg:text-xl font-semibold mb-4 flex items-center gap-2",
              theme === "dark" ? "text-white" : "text-gray-700",
            )}
          >
            <span
              className={cn("w-2 h-2 rounded-full animate-pulse", theme === "dark" ? "bg-purple-500" : "bg-[#00C794]")}
            />
            {sectionTitles[activeSection] || "Somos equipo, somos solución"}
          </h2>
          <p className={cn("text-sm lg:text-base", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
            Estás viendo la sección de{" "}
            <span className={cn(theme === "dark" ? "text-purple-400" : "text-[#00C794]")}>
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
                    : "bg-gradient-to-br from-[#F5F0E8] to-white border border-[#00C794]/20 hover:border-[#00C794]/50 hover:shadow-[#00C794]/20",
                )}
              >
                <span
                  className={cn(
                    "text-sm transition-colors",
                    theme === "dark"
                      ? "text-gray-600 group-hover:text-gray-400"
                      : "text-gray-400 group-hover:text-[#00C794]",
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
      {/* Encabezado de bienvenida */}
      <div className="mb-6 lg:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div
            className={cn(
              "w-8 h-8 lg:w-10 lg:h-10 rounded-lg flex items-center justify-center",
              theme === "dark"
                ? "bg-gradient-to-br from-purple-500/20 to-blue-500/20"
                : "bg-gradient-to-br from-[#00C794]/20 to-[#0078A0]/20",
            )}
          >
            <span className="text-xl lg:text-2xl">😄</span>
          </div>
          <h1 className={cn("text-2xl lg:text-3xl font-bold", theme === "dark" ? "text-white" : "text-gray-700")}>
            Somos equipo, somos solución
          </h1>
        </div>
        <p className={cn("text-sm lg:text-base", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
          Bienvenido,{" "}
          <span className={cn("font-medium", theme === "dark" ? "text-purple-400" : "text-[#00C794]")}>
            {user?.nombre || "Usuario"}
          </span>
          . Selecciona una opción en el menú lateral.
        </p>
      </div>

      {/* Tarjetas de estadísticas - ocultas en ciertas secciones */}
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

      {/* Contenido dinámico según sección activa */}
      {renderContent()}

      {/* Botón flotante para mensajería interna */}
      <button
        onClick={() => setIsMensajeriaInternaOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 lg:bottom-10 lg:right-10 w-12 h-12 lg:w-14 lg:h-14 rounded-full text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform duration-300 animate-float z-[100]",
          theme === "dark"
            ? "bg-gradient-to-br from-purple-600 to-blue-600 shadow-purple-500/30"
            : "bg-gradient-to-br from-[#00C794] to-[#0078A0] shadow-[#00C794]/30",
        )}
      >
        <Mail className="w-5 h-5 lg:w-6 lg:h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-gray-900 animate-bounce">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      <MensajeriaInternaModal
        isOpen={isMensajeriaInternaOpen}
        onClose={() => {
          setIsMensajeriaInternaOpen(false)
          loadUnreadCount()
        }}
      />
    </main>
  )
}
