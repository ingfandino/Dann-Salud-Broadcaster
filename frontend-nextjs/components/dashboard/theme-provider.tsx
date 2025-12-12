"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

type Theme = "light" | "dark"

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  canUseDarkMode: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

// Email del único usuario permitido para usar modo oscuro
const ALLOWED_DARK_MODE_EMAIL = "ing.danielfandino@gmail.com"

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light")
  const [mounted, setMounted] = useState(false)
  const [canUseDarkMode, setCanUseDarkMode] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Verificar si el usuario puede usar modo oscuro
    // Zustand guarda en 'auth-storage' por el nombre configurado en persist
    const authStorageStr = localStorage.getItem('auth-storage')

    console.log('🔍 [THEME] Verificando permiso de dark mode...')

    if (authStorageStr) {
      try {
        const authStorage = JSON.parse(authStorageStr)
        const userEmail = authStorage?.state?.user?.email

        console.log('🔍 [THEME] Email del usuario:', userEmail)
        console.log('🔍 [THEME] Email permitido:', ALLOWED_DARK_MODE_EMAIL)

        const allowed = userEmail === ALLOWED_DARK_MODE_EMAIL
        setCanUseDarkMode(allowed)

        console.log('🔍 [THEME] Puede usar dark mode?:', allowed)

        if (allowed) {
          // Solo cargar el tema guardado si el usuario tiene permiso
          const savedTheme = localStorage.getItem("theme") as Theme | null
          if (savedTheme) {
            setTheme(savedTheme)
            console.log('🔍 [THEME] Tema cargado desde localStorage:', savedTheme)
          }
        } else {
          // Forzar tema claro para usuarios no autorizados
          setTheme("light")
          localStorage.setItem("theme", "light")
          console.log('🔍 [THEME] Forzando tema claro (usuario sin permiso)')
        }
      } catch (e) {
        console.error('🔍 [THEME] Error parseando auth-storage:', e)
        setTheme("light")
      }
    } else {
      console.log('🔍 [THEME] No hay auth-storage, usando tema claro')
      setTheme("light")
    }
  }, [])

  useEffect(() => {
    if (mounted) {
      document.documentElement.classList.toggle("dark", theme === "dark")
      if (canUseDarkMode) {
        localStorage.setItem("theme", theme)
      } else {
        // Asegurar que siempre esté en light si no tiene permiso
        if (theme !== "light") {
          setTheme("light")
        }
      }
    }
  }, [theme, mounted, canUseDarkMode])

  const toggleTheme = () => {
    // Solo permitir toggle si el usuario tiene permiso
    if (canUseDarkMode) {
      setTheme((prev) => (prev === "dark" ? "light" : "dark"))
    }
  }

  if (!mounted) {
    return null
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme, canUseDarkMode }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
