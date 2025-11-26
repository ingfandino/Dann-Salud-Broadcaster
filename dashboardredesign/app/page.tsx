"use client"

import { useState } from "react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { DashboardContent } from "@/components/dashboard/dashboard-content"
import { MobileHeader } from "@/components/dashboard/mobile-header"
import { ThemeProvider, useTheme } from "@/components/dashboard/theme-provider"
import { LoginPage } from "@/components/auth/login-page"
import { RegisterPage } from "@/components/auth/register-page"
import { RecoverPage } from "@/components/auth/recover-page"

type AuthView = "login" | "register" | "recover" | "dashboard"

function AppContent() {
  const [authView, setAuthView] = useState<AuthView>("login")
  const [activeSection, setActiveSection] = useState("mensajeria-masiva")
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { theme } = useTheme()

  // Handle successful login
  const handleLogin = () => {
    setAuthView("dashboard")
  }

  // Handle logout
  const handleLogout = () => {
    setAuthView("login")
  }

  // Render auth pages
  if (authView === "login") {
    return (
      <LoginPage
        onLogin={handleLogin}
        onRegister={() => setAuthView("register")}
        onRecover={() => setAuthView("recover")}
      />
    )
  }

  if (authView === "register") {
    return <RegisterPage onRegister={handleLogin} onLogin={() => setAuthView("login")} />
  }

  if (authView === "recover") {
    return <RecoverPage onBack={() => setAuthView("login")} />
  }

  // Dashboard view
  return (
    <div
      className={
        theme === "dark"
          ? "flex min-h-screen bg-gradient-to-br from-[#0f0a1e] via-[#1a1333] to-[#0d1526]"
          : "flex min-h-screen bg-gradient-to-br from-[#FAF8F5] via-[#F5F2EE] to-[#FFF9F0]"
      }
    >
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {theme === "dark" ? (
          <>
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-violet-600/5 rounded-full blur-3xl" />
          </>
        ) : (
          <>
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#0078A0]/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#00C794]/5 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#0078A0]/3 rounded-full blur-3xl" />
          </>
        )}
      </div>

      <MobileHeader isSidebarOpen={isSidebarOpen} onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar
        activeSection={activeSection}
        onSectionChange={(section) => {
          setActiveSection(section)
          setIsSidebarOpen(false)
        }}
        isMobileOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onLogout={handleLogout}
      />

      <DashboardContent activeSection={activeSection} />
    </div>
  )
}

export default function DashboardPage() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}
