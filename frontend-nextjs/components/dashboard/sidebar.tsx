/**
 * ============================================================
 * SIDEBAR DE NAVEGACIÓN (sidebar.tsx)
 * ============================================================
 * Menú lateral con navegación por secciones.
 * Muestra opciones según rol del usuario.
 */

"use client"

import { useState } from "react"
import {
  BarChart3,
  MessageSquare,
  Mail,
  Users,
  ShieldAlert,
  ClipboardList,
  UserCog,
  LogOut,
  X,
  UsersRound,
  ChevronDown,
  BarChartBig as ChartPie,
  FileDown,
  Settings2,
  ListOrdered,
  Upload,
  Shield,
  Plus,
  AlertTriangle,
  Search,
  CalendarPlus,
  RotateCcw,
  DollarSign,
  UserPlus,
  UserCheck,
  UserX,
  Sparkles,
  Recycle,
  Phone,
  XCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "./theme-toggle"
import { useTheme } from "./theme-provider"
import { useAuth } from "@/lib/auth"

interface SidebarProps {
  activeSection: string
  onSectionChange: (section: string) => void
  isMobileOpen?: boolean
  onClose?: () => void
  onLogout?: () => void
}

const menuItems = [
  { id: "reportes-globales", label: "Reportes de Mensajería", icon: BarChart3 },
  { id: "mensajeria-masiva", label: "Mensajería Masiva", icon: MessageSquare },
  {
    id: "base-afiliados",
    label: "Base de Afiliados",
    icon: Users,
    submenu: [
      { id: "base-afiliados-estadistica", label: "Estadística", icon: ChartPie },
      { id: "base-afiliados-lista", label: "Lista de afiliados", icon: ListOrdered },
      { id: "base-afiliados-exitosas", label: "Afiliaciones exitosas", icon: UsersRound },
      { id: "base-afiliados-fallidas", label: "Afiliaciones fallidas", icon: XCircle },
      { id: "base-afiliados-frescos", label: "Datos frescos", icon: Sparkles },
      { id: "base-afiliados-reutilizables", label: "Datos reutilizables", icon: Recycle },
      { id: "base-afiliados-cargar", label: "Cargar archivo", icon: Upload },
      { id: "base-afiliados-configuracion", label: "Configuración de envíos", icon: Settings2 },
    ],
  },
  {
    id: "contactar-afiliados",
    label: "Contactar Afiliados",
    icon: Phone,
    submenu: [
      { id: "contactar-afiliados-administracion", label: "Administración de datos", icon: Settings2 },
      { id: "contactar-afiliados-datos-dia", label: "Datos del día", icon: ListOrdered },
    ],
  },
  {
    id: "palabras-prohibidas",
    label: "Palabras Prohibidas",
    icon: ShieldAlert,
    submenu: [
      { id: "palabras-prohibidas-lista", label: "Lista de palabras", icon: Shield },
      { id: "palabras-prohibidas-detecciones", label: "Detecciones", icon: AlertTriangle },
      { id: "palabras-prohibidas-agregar", label: "Agregar palabra", icon: Plus },
    ],
  },
  {
    id: "auditorias",
    label: "Auditorías",
    icon: ClipboardList,
    submenu: [
      { id: "auditorias-seguimiento", label: "Seguimiento", icon: Search },
      { id: "auditorias-crear-turno", label: "Crear turno", icon: CalendarPlus },
      { id: "auditorias-recuperaciones", label: "Recuperaciones", icon: RotateCcw },
      { id: "auditorias-liquidacion", label: "Liquidación", icon: DollarSign },
    ],
  },
  {
    id: "recursos-humanos",
    label: "Recursos Humanos",
    icon: UsersRound,
    submenu: [
      { id: "rrhh-estadisticas", label: "Estadísticas", icon: ChartPie },
      { id: "rrhh-activos", label: "Activos", icon: UserCheck },
      { id: "rrhh-inactivos", label: "Inactivos", icon: UserX },
      { id: "rrhh-agregar", label: "Añadir empleado", icon: UserPlus },
    ],
  },
  { id: "gestion-usuarios", label: "Gestión de Usuarios", icon: UserCog },
]

export function Sidebar({ activeSection, onSectionChange, isMobileOpen, onClose, onLogout }: SidebarProps) {
  const { theme } = useTheme()
  const { user } = useAuth()

  // Filter menu items based on user role
  const getFilteredMenuItems = () => {
    const role = user?.role?.toLowerCase()

    if (role === 'gerencia') {
      return menuItems // Gerencia sees everything
    }

    if (role === 'asesor') {
      return menuItems.filter(item => {
        if (item.id === 'reportes-globales' || item.id === 'mensajeria-masiva' || item.id === 'mensajeria-interna') return true
        if (item.id === 'auditorias') return true // Seguimiento, Crear turno, Liquidación
        if (item.id === 'contactar-afiliados') return true // Solo "Datos del día"
        return false
      }).map(item => {
        if (item.id === 'auditorias' && item.submenu) {
          return {
            ...item,
            submenu: item.submenu.filter(sub =>
              sub.id === 'auditorias-seguimiento' || 
              sub.id === 'auditorias-crear-turno' ||
              sub.id === 'auditorias-liquidacion' // ✅ Asesor ahora ve Liquidación
            )
          }
        }
        // Filtrar submenú de contactar-afiliados para asesor
        if (item.id === 'contactar-afiliados' && item.submenu) {
          return {
            ...item,
            submenu: item.submenu.filter(sub =>
              sub.id === 'contactar-afiliados-datos-dia' // Solo "Datos del día"
            )
          }
        }
        return item
      })
    }

    if (role === 'supervisor') {
      return menuItems.filter(item => {
        if (item.id === 'reportes-globales' || item.id === 'mensajeria-masiva' || item.id === 'mensajeria-interna') return true
        if (item.id === 'auditorias') {
          return {
            ...item,
            submenu: item.submenu?.filter(sub =>
              sub.id === 'auditorias-seguimiento' ||
              sub.id === 'auditorias-crear-turno' ||
              sub.id === 'auditorias-liquidacion'
            )
          }
        }
        if (item.id === 'contactar-afiliados') {
          return {
            ...item,
            submenu: item.submenu?.filter(sub =>
              sub.id === 'contactar-afiliados-administracion' ||
              sub.id === 'contactar-afiliados-datos-dia' // ✅ Supervisor ahora ve ambas
            )
          }
        }
        if (item.id === 'base-afiliados') {
          return {
            ...item,
            submenu: item.submenu?.filter(sub =>
              sub.id === 'base-afiliados-estadistica' ||
              sub.id === 'base-afiliados-configuracion'
            )
          }
        }
        if (item.id === 'recursos-humanos') {
          return {
            ...item,
            submenu: item.submenu?.filter(sub =>
              sub.id === 'rrhh-estadisticas' ||
              sub.id === 'rrhh-activos' ||
              sub.id === 'rrhh-inactivos'
            )
          }
        }
        return false
      }).map(item => {
        if (item.id === 'auditorias' && item.submenu) {
          return {
            ...item,
            submenu: item.submenu.filter(sub =>
              sub.id === 'auditorias-seguimiento' ||
              sub.id === 'auditorias-crear-turno' ||
              sub.id === 'auditorias-liquidacion'
            )
          }
        }
        if (item.id === 'base-afiliados' && item.submenu) {
          return {
            ...item,
            submenu: item.submenu.filter(sub =>
              sub.id === 'base-afiliados-estadistica'
            )
          }
        }
        if (item.id === 'contactar-afiliados' && item.submenu) {
          return {
            ...item,
            submenu: item.submenu.filter(sub =>
              sub.id === 'contactar-afiliados-administracion' ||
              sub.id === 'contactar-afiliados-datos-dia' // ✅ Supervisor ahora ve ambas
            )
          }
        }
        if (item.id === 'recursos-humanos' && item.submenu) {
          return {
            ...item,
            submenu: item.submenu.filter(sub =>
              sub.id === 'rrhh-estadisticas' ||
              sub.id === 'rrhh-activos' ||
              sub.id === 'rrhh-inactivos'
            )
          }
        }
        return item
      })
    }

    if (role === 'administrativo') {
      return menuItems.filter(item => {
        if (item.id === 'mensajeria-interna') return true
        if (item.id === 'auditorias') {
          return {
            ...item,
            submenu: item.submenu?.filter(sub =>
              sub.id === 'auditorias-seguimiento' ||
              sub.id === 'auditorias-recuperaciones'
            )
          }
        }
        return false
      }).map(item => {
        if (item.id === 'auditorias' && item.submenu) {
          return {
            ...item,
            submenu: item.submenu.filter(sub =>
              sub.id === 'auditorias-seguimiento' ||
              sub.id === 'auditorias-recuperaciones'
            )
          }
        }
        return item
      })
    }

    if (role === 'auditor') {
      const hasTeam = !!user?.numeroEquipo;

      return menuItems.filter(item => {
        if (!hasTeam) {
          // Case 1.1: Only Seguimiento (hija de Auditorías)
          if (item.id === 'auditorias') {
            return true;
          }
          return false;
        } else {
          // Case 1.2: Reportes, Mensajería, Seguimiento, Crear turno, Contactar Afiliados
          if (item.id === 'reportes-globales') return true;
          if (item.id === 'mensajeria-masiva') return true;
          if (item.id === 'mensajeria-interna') return true;
          if (item.id === 'auditorias') return true;
          if (item.id === 'contactar-afiliados') return true; // ✅ Auditor con equipo ve Datos del día
          return false;
        }
      }).map(item => {
        if (item.id === 'auditorias' && item.submenu) {
          const hasTeam = !!user?.numeroEquipo;
          if (!hasTeam) {
            // Only Seguimiento
            return { ...item, submenu: item.submenu.filter(sub => sub.id === 'auditorias-seguimiento') }
          } else {
            // Seguimiento, Crear turno y Liquidación (auditor con equipo)
            return { ...item, submenu: item.submenu.filter(sub => 
              sub.id === 'auditorias-seguimiento' || 
              sub.id === 'auditorias-crear-turno' ||
              sub.id === 'auditorias-liquidacion' // ✅ Auditor con equipo ve Liquidación
            )}
          }
        }
        // ✅ Auditor con equipo solo ve "Datos del día"
        if (item.id === 'contactar-afiliados' && item.submenu) {
          return {
            ...item,
            submenu: item.submenu.filter(sub => sub.id === 'contactar-afiliados-datos-dia')
          }
        }
        return item;
      })
    }

    if (role === 'rr.hh') {
      return menuItems.filter(item => item.id === 'recursos-humanos' || item.id === 'mensajeria-interna')
    }

    // Default: show nothing if role is not recognized
    return []
  }

  const filteredMenuItems = getFilteredMenuItems()

  const getInitialExpandedMenu = () => {
    if (activeSection.startsWith("base-afiliados")) return "base-afiliados"
    if (activeSection.startsWith("palabras-prohibidas")) return "palabras-prohibidas"
    if (activeSection.startsWith("auditorias")) return "auditorias"
    if (activeSection.startsWith("rrhh")) return "recursos-humanos"
    return null
  }
  const [expandedMenu, setExpandedMenu] = useState<string | null>(getInitialExpandedMenu())

  const handleMenuClick = (item: (typeof menuItems)[0]) => {
    if (item.submenu) {
      // Toggle submenu expansion
      setExpandedMenu(expandedMenu === item.id ? null : item.id)
      // Navigate to first submenu item when clicking parent
      onSectionChange(item.submenu[0].id)
    } else {
      setExpandedMenu(null)
      onSectionChange(item.id)
    }
  }

  const isItemActive = (itemId: string, submenu?: (typeof menuItems)[0]["submenu"]) => {
    if (submenu) {
      return submenu.some((sub) => sub.id === activeSection)
    }
    return activeSection === itemId
  }

  return (
    <aside
      className={cn(
        "min-h-screen backdrop-blur-xl border-r flex flex-col",
        theme === "dark"
          ? "bg-gradient-to-b from-[#1a1333]/90 to-[#0f0a1e]/90 border-white/5"
          : "bg-gradient-to-b from-[#FAF7F2]/95 to-[#F5F0E8]/95 border-purple-200/30",
        "lg:w-72 lg:relative lg:translate-x-0",
        "fixed top-0 left-0 w-72 h-full z-40 transition-transform duration-300 ease-out",
        isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        "pt-16 lg:pt-0",
      )}
    >
      <button
        onClick={onClose}
        className={cn(
          "absolute top-20 right-4 w-8 h-8 rounded-lg flex items-center justify-center transition-all lg:hidden",
          theme === "dark"
            ? "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
            : "bg-purple-100/50 text-purple-400 hover:text-purple-600 hover:bg-purple-100",
        )}
      >
        <X className="w-4 h-4" />
      </button>

      {/* Sección del logo */}
      <div className="p-6 items-center gap-3 hidden lg:flex">
        <div className="relative">
          <div
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center",
              theme === "dark"
                ? "bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 animate-pulse-glow"
                : "bg-gradient-to-br from-[#00C794] to-[#0078A0] shadow-lg shadow-[#00C794]/30",
            )}
          >
            <span className="text-white font-bold text-xl">+</span>
          </div>
        </div>
        <div>
          <h1 className="font-bold text-lg">
            <span className={theme === "dark" ? "text-cyan-400" : "text-[#00C794]"}>DANN</span>
            <span className={theme === "dark" ? "text-purple-400" : "text-[#0078A0]"}>+</span>
            <span className={theme === "dark" ? "text-white" : "text-gray-700"}>SALUD</span>
          </h1>
          <p
            className={cn(
              "text-[10px] tracking-[0.3em] uppercase",
              theme === "dark" ? "text-gray-400" : "text-gray-500",
            )}
          >
            Online
          </p>
        </div>
      </div>

      {/* Perfil del usuario */}
      <div
        className={cn("px-6 py-4 border-t lg:border-t", theme === "dark" ? "border-white/5" : "border-[#00C794]/20")}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm",
              theme === "dark"
                ? "bg-gradient-to-br from-purple-500 to-pink-500"
                : "bg-gradient-to-br from-[#00C794] to-[#0078A0]",
            )}
          >
            {user?.nombre ? user.nombre.substring(0, 2).toUpperCase() : "U"}
          </div>
          <div>
            <h2 className={cn("font-medium text-sm", theme === "dark" ? "text-white" : "text-gray-700")}>
              {user?.nombre || "Usuario"}
            </h2>
            <p className={cn("text-xs", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
              {user?.role || "Usuario"}
            </p>
          </div>
        </div>
      </div>

      {/* Menú de navegación */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {filteredMenuItems.map((item) => {
          const Icon = item.icon
          const isActive = isItemActive(item.id, item.submenu)
          const isExpanded = expandedMenu === item.id
          const hasSubmenu = !!item.submenu

          return (
            <div key={item.id}>
              <button
                onClick={() => handleMenuClick(item)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 group",
                  isActive
                    ? theme === "dark"
                      ? "bg-gradient-to-r from-purple-600/80 to-blue-600/80 text-white shadow-lg shadow-purple-500/20"
                      : "bg-gradient-to-r from-[#00C794] to-[#009e74] text-white shadow-lg shadow-[#00C794]/30"
                    : theme === "dark"
                      ? "text-gray-400 hover:text-white hover:bg-white/5"
                      : "text-gray-600 hover:text-[#00C794] hover:bg-[#00C794]/10",
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 transition-transform duration-300",
                    isActive
                      ? "text-white"
                      : theme === "dark"
                        ? "text-gray-500 group-hover:text-purple-400"
                        : "text-gray-400 group-hover:text-[#00C794]",
                    "group-hover:scale-110",
                  )}
                />
                <span className="flex-1 text-left">{item.label}</span>
                {hasSubmenu && (
                  <ChevronDown
                    className={cn("w-4 h-4 transition-transform duration-300", isExpanded && "rotate-180")}
                  />
                )}
                {isActive && !hasSubmenu && <div className="w-2 h-2 rounded-full bg-white animate-pulse" />}
              </button>

              {hasSubmenu && (
                <div
                  className={cn(
                    "overflow-hidden transition-all duration-300 ease-out",
                    isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0",
                  )}
                >
                  <div
                    className="mt-1 ml-4 pl-4 border-l-2 space-y-1"
                    style={{
                      borderColor: theme === "dark" ? "rgba(168, 85, 247, 0.3)" : "rgba(168, 85, 247, 0.2)",
                    }}
                  >
                    <div className="ml-9 mt-1 space-y-1">
                      {item.submenu.map((subItem) => {
                        const isSubActive = activeSection === subItem.id
                        return (
                          <button
                            key={subItem.id}
                            onClick={() => {
                              if (onSectionChange) onSectionChange(subItem.id)
                            }}
                            className={cn(
                              "w-full flex items-center justify-start text-left gap-3 px-4 py-2 rounded-lg text-sm transition-all duration-300 group/sub relative",
                              isSubActive
                                ? theme === "dark"
                                  ? "text-white bg-white/10"
                                  : "text-emerald-600 bg-emerald-50 font-medium"
                                : theme === "dark"
                                  ? "text-gray-500 hover:text-gray-300"
                                  : "text-gray-500 hover:text-emerald-600",
                            )}
                          >
                            {isSubActive && (
                              <div
                                className={cn(
                                  "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full",
                                  theme === "dark" ? "bg-purple-500" : "bg-emerald-400",
                                )}
                              />
                            )}
                            <span
                              className={cn(
                                "w-1.5 h-1.5 rounded-full transition-colors",
                                isSubActive
                                  ? theme === "dark"
                                    ? "bg-purple-400"
                                    : "bg-emerald-500"
                                  : theme === "dark"
                                    ? "bg-gray-600 group-hover/sub:bg-gray-400"
                                    : "bg-gray-300 group-hover/sub:bg-emerald-300",
                              )}
                            />
                            {subItem.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Cambio de tema */}
      <div className={cn("px-4 py-3 border-t", theme === "dark" ? "border-white/5" : "border-purple-200/30")}>
        <ThemeToggle />
      </div>

      {/* Acciones inferiores */}
      <div className={cn("p-4 border-t space-y-2", theme === "dark" ? "border-white/5" : "border-purple-200/30")}>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-300 group"
        >
          <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  )
}
