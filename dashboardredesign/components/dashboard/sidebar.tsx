"use client"

import { useState } from "react"
import {
  BarChart3,
  MessageSquare,
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
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "./theme-toggle"
import { useTheme } from "./theme-provider"

interface SidebarProps {
  activeSection: string
  onSectionChange: (section: string) => void
  isMobileOpen?: boolean
  onClose?: () => void
  onLogout?: () => void
}

const menuItems = [
  { id: "reportes-globales", label: "Reportes Globales", icon: BarChart3 },
  { id: "mensajeria-masiva", label: "Mensajería Masiva", icon: MessageSquare },
  {
    id: "base-afiliados",
    label: "Base de Afiliados",
    icon: Users,
    submenu: [
      { id: "base-afiliados-estadistica", label: "Estadística", icon: ChartPie },
      { id: "base-afiliados-exportaciones", label: "Exportaciones", icon: FileDown },
      { id: "base-afiliados-configuracion", label: "Configuración de envíos", icon: Settings2 },
      { id: "base-afiliados-lista", label: "Lista de afiliados", icon: ListOrdered },
      { id: "base-afiliados-cargar", label: "Cargar archivo", icon: Upload },
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

      {/* Logo Section */}
      <div className="p-6 items-center gap-3 hidden lg:flex">
        <div className="relative">
          <div
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center",
              theme === "dark"
                ? "bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 animate-pulse-glow"
                : "bg-gradient-to-br from-purple-400 to-pink-400 shadow-lg shadow-purple-300/30",
            )}
          >
            <span className="text-white font-bold text-xl">+</span>
          </div>
        </div>
        <div>
          <h1 className="font-bold text-lg">
            <span className={theme === "dark" ? "text-cyan-400" : "text-purple-500"}>DANN</span>
            <span className={theme === "dark" ? "text-purple-400" : "text-pink-400"}>+</span>
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

      {/* User Profile */}
      <div
        className={cn("px-6 py-4 border-t lg:border-t", theme === "dark" ? "border-white/5" : "border-purple-200/30")}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm",
              theme === "dark"
                ? "bg-gradient-to-br from-purple-500 to-pink-500"
                : "bg-gradient-to-br from-purple-400 to-blue-400",
            )}
          >
            YC
          </div>
          <div>
            <h2 className={cn("font-medium text-sm", theme === "dark" ? "text-white" : "text-gray-700")}>
              Yamila Chaar
            </h2>
            <p className={cn("text-xs", theme === "dark" ? "text-gray-400" : "text-gray-500")}>Gerencia</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
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
                      : "bg-gradient-to-r from-purple-400 to-blue-400 text-white shadow-lg shadow-purple-300/30"
                    : theme === "dark"
                      ? "text-gray-400 hover:text-white hover:bg-white/5"
                      : "text-gray-600 hover:text-purple-600 hover:bg-purple-50",
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 transition-transform duration-300",
                    isActive
                      ? "text-white"
                      : theme === "dark"
                        ? "text-gray-500 group-hover:text-purple-400"
                        : "text-gray-400 group-hover:text-purple-500",
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
                    {item.submenu.map((subItem) => {
                      const SubIcon = subItem.icon
                      const isSubActive = activeSection === subItem.id

                      return (
                        <button
                          key={subItem.id}
                          onClick={() => onSectionChange(subItem.id)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200",
                            isSubActive
                              ? theme === "dark"
                                ? "bg-purple-500/20 text-purple-300"
                                : "bg-purple-100 text-purple-600"
                              : theme === "dark"
                                ? "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                                : "text-gray-500 hover:text-purple-500 hover:bg-purple-50",
                          )}
                        >
                          <SubIcon className="w-4 h-4" />
                          <span>{subItem.label}</span>
                          {isSubActive && (
                            <div
                              className={cn(
                                "ml-auto w-1.5 h-1.5 rounded-full animate-pulse",
                                theme === "dark" ? "bg-purple-400" : "bg-purple-500",
                              )}
                            />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Theme Toggle */}
      <div className={cn("px-4 py-3 border-t", theme === "dark" ? "border-white/5" : "border-purple-200/30")}>
        <div className="flex items-center justify-between px-4">
          <span className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
            {theme === "dark" ? "Modo oscuro" : "Modo claro"}
          </span>
          <ThemeToggle />
        </div>
      </div>

      {/* Bottom Actions */}
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
