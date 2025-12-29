/**
 * ============================================================
 * PÁGINA DE LOGIN (app/login/page.tsx)
 * ============================================================
 * Formulario de inicio de sesión con validación.
 * Incluye fondo animado y tema claro/oscuro.
 */

"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, MessageCircle, Moon, Sun, Sparkles, Zap, Shield } from "lucide-react"
import { AnimatedBackground } from "@/components/auth/animated-background"
import { FloatingShapes } from "@/components/auth/floating-shapes"
import { useAuth } from "@/lib/auth"
import { toast } from "sonner"

/** Página de inicio de sesión */
export default function LoginPage() {
    const router = useRouter()
    const { login } = useAuth()

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [rememberMe, setRememberMe] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [theme, setTheme] = useState<"light" | "dark">("light")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!email || !password) {
            toast.error('Por favor completa todos los campos')
            return
        }

        setIsLoading(true)

        try {
            const response = await login(email, password)
            toast.success('¡Bienvenido!')

            /* Redirigir según rol */
            const role = response?.user?.role?.toLowerCase() || ''

            if (role === 'asesor') {
                router.push('/dashboard/contact/today')
            } else if (role === 'supervisor') {
                router.push('/dashboard/contact/admin')
            } else if (role === 'administrativo' || role === 'auditor') {
                router.push('/dashboard/audits/follow-up')
            } else if (role === 'gerencia') {
                router.push('/dashboard/affiliates/stats')
            } else if (role === 'rr.hh' || role === 'rrhh') {
                router.push('/dashboard/hr/stats')
            } else {
                router.push('/dashboard')
            }
        } catch (error: any) {
            console.error('Login error:', error)
            toast.error(error.message || 'Error al iniciar sesión')
        } finally {
            setIsLoading(false)
        }
    }

    const toggleTheme = () => {
        setTheme(theme === "light" ? "dark" : "light")
    }

    const handleRegister = () => {
        router.push('/register')
    }

    const handleRecover = () => {
        router.push('/recover')
    }

    return (
        <div
            className={`min-h-screen relative overflow-hidden transition-colors duration-500 ${theme === "dark"
                ? "bg-gradient-to-br from-[#0f0a1e] via-[#1a1333] to-[#0d1526]"
                : "bg-gradient-to-br from-[#f8f9fc] via-[#eef1f8] to-[#e8f4f8]"
                }`}
        >
            <AnimatedBackground theme={theme} />
            <FloatingShapes theme={theme} />

            {/* Botón de cambio de tema */}
            <button
                onClick={toggleTheme}
                className={`fixed top-4 right-4 p-2.5 rounded-full transition-all duration-300 hover:scale-110 z-50 ${theme === "dark" ? "bg-white/10 hover:bg-white/20 text-white" : "bg-black/5 hover:bg-black/10 text-gray-700"
                    }`}
            >
                {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Contenido principal */}
            <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
                <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-6 lg:gap-8">
                    {/* Tarjeta izquierda: Información de bienvenida */}
                    <div
                        className={`flex-1 rounded-3xl p-8 lg:p-10 backdrop-blur-xl transition-all duration-500 animate-slide-in-left ${theme === "dark"
                            ? "bg-white/5 border border-white/10 shadow-2xl shadow-purple-500/10"
                            : "bg-white/70 border border-white/50 shadow-xl shadow-gray-200/50"
                            }`}
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div
                                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${theme === "dark"
                                    ? "bg-gradient-to-br from-[#1E88E5] to-[#0E6FFF]"
                                    : "bg-gradient-to-br from-[#1E88E5] to-[#0E6FFF]"
                                    }`}
                            >
                                <MessageCircle className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                                    Dann+Salud Online
                                </h1>
                                <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                                    Broadcaster & Autorespuestas
                                </p>
                            </div>
                        </div>

                        <h2
                            className={`text-2xl lg:text-3xl font-bold mb-6 leading-tight ${theme === "dark" ? "text-white" : "text-gray-900"
                                }`}
                        >
                            Conversa con tus clientes a escala,{" "}
                            <span className="bg-gradient-to-r from-[#17C787] to-[#1E88E5] bg-clip-text text-transparent">
                                manteniendo el toque humano.
                            </span>
                        </h2>

                        <ul className="space-y-4">
                            {[
                                { icon: Zap, text: "Campañas masivas con seguimiento en tiempo real." },
                                { icon: MessageCircle, text: "Multi-sesión WhatsApp por asesor." },
                                { icon: Shield, text: "Auto-respuestas inteligentes con anti-spam." },
                            ].map((item, index) => (
                                <li
                                    key={index}
                                    className={`flex items-start gap-3 animate-fade-in-up`}
                                    style={{ animationDelay: `${0.2 + index * 0.1}s` }}
                                >
                                    <div
                                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${theme === "dark" ? "bg-white/10" : "bg-gray-100"
                                            }`}
                                    >
                                        <item.icon className={`w-4 h-4 ${theme === "dark" ? "text-[#17C787]" : "text-[#1E88E5]"}`} />
                                    </div>
                                    <span className={`text-sm lg:text-base ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                                        {item.text}
                                    </span>
                                </li>
                            ))}
                        </ul>

                        {/* Elemento decorativo animado */}
                        <div className="mt-8 flex items-center gap-2">
                            <Sparkles className={`w-5 h-5 animate-pulse ${theme === "dark" ? "text-[#F4C04A]" : "text-[#F4C04A]"}`} />
                            <span className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>
                                Plataforma segura y confiable
                            </span>
                        </div>
                    </div>

                    {/* Tarjeta derecha: Formulario de login */}
                    <div
                        className={`w-full lg:w-[400px] rounded-3xl p-8 backdrop-blur-xl transition-all duration-500 animate-fade-in-up ${theme === "dark"
                            ? "bg-white/5 border border-white/10 shadow-2xl shadow-purple-500/10"
                            : "bg-white/80 border border-white/50 shadow-xl"
                            }`}
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F4C04A] to-[#ff9500] flex items-center justify-center">
                                <span className="text-lg">🔐</span>
                            </div>
                            <h2 className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                                Iniciar Sesión
                            </h2>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label
                                    className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
                                >
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="tu@correo.com"
                                    className={`w-full px-4 py-3 rounded-xl transition-all duration-300 focus:ring-2 focus:ring-[#1E88E5] focus:outline-none ${theme === "dark"
                                        ? "bg-white/10 border border-white/20 text-white placeholder-gray-500"
                                        : "bg-white border border-gray-200 text-gray-900 placeholder-gray-400"
                                        }`}
                                    required
                                    disabled={isLoading}
                                />
                            </div>

                            <div>
                                <label
                                    className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
                                >
                                    Contraseña
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className={`w-full px-4 py-3 pr-12 rounded-xl transition-all duration-300 focus:ring-2 focus:ring-[#1E88E5] focus:outline-none ${theme === "dark"
                                            ? "bg-white/10 border border-white/20 text-white placeholder-gray-500"
                                            : "bg-white border border-gray-200 text-gray-900 placeholder-gray-400"
                                            }`}
                                        required
                                        disabled={isLoading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors ${theme === "dark" ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-700"
                                            }`}
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-300 text-[#1E88E5] focus:ring-[#1E88E5]"
                                    />
                                    <span className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Recordarme</span>
                                </label>
                                <Link
                                    href="/recover"
                                    className="text-sm text-[#1E88E5] hover:text-[#0E6FFF] transition-colors"
                                >
                                    ¿Olvidaste tu contraseña?
                                </Link>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3.5 rounded-xl font-semibold text-white transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed bg-gradient-to-r from-[#17C787] via-[#1E88E5] to-[#0E6FFF] hover:shadow-lg hover:shadow-[#1E88E5]/30"
                            >
                                {isLoading ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Ingresando...</span>
                                    </div>
                                ) : (
                                    "Entrar"
                                )}
                            </button>
                        </form>

                        <p className={`text-center mt-6 text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                            ¿No tienes cuenta?{" "}
                            <Link
                                href="/register"
                                className="text-[#1E88E5] hover:text-[#0E6FFF] font-medium transition-colors"
                            >
                                Regístrate
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
