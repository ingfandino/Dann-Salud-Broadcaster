"use client"

import type React from "react"

import { useState } from "react"
import { KeyRound, Moon, Sun, ArrowLeft, Mail, CheckCircle, Info } from "lucide-react"
import { AnimatedBackground } from "./animated-background"
import { FloatingShapes } from "./floating-shapes"

interface RecoverPageProps {
  onBack: () => void
}

export function RecoverPage({ onBack }: RecoverPageProps) {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSent, setIsSent] = useState(false)
  const [theme, setTheme] = useState<"light" | "dark">("light")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setIsLoading(false)
    setIsSent(true)
  }

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light")
  }

  return (
    <div
      className={`min-h-screen relative overflow-hidden transition-colors duration-500 ${
        theme === "dark"
          ? "bg-gradient-to-br from-[#0f0a1e] via-[#1a1333] to-[#0d1526]"
          : "bg-gradient-to-br from-[#f8f9fc] via-[#eef1f8] to-[#e8f4f8]"
      }`}
    >
      <AnimatedBackground theme={theme} />
      <FloatingShapes theme={theme} />

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className={`fixed top-4 right-4 p-2.5 rounded-full transition-all duration-300 hover:scale-110 z-50 ${
          theme === "dark" ? "bg-white/10 hover:bg-white/20 text-white" : "bg-black/5 hover:bg-black/10 text-gray-700"
        }`}
      >
        {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Left card - Info */}
          <div
            className={`flex-1 rounded-3xl p-8 lg:p-10 backdrop-blur-xl transition-all duration-500 animate-slide-in-left ${
              theme === "dark"
                ? "bg-white/5 border border-white/10 shadow-2xl shadow-purple-500/10"
                : "bg-white/70 border border-white/50 shadow-xl shadow-gray-200/50"
            }`}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1E88E5] to-[#0E6FFF] flex items-center justify-center">
                <KeyRound className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                  Recupera tu acceso
                </h1>
                <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                  Te enviaremos un enlace de restablecimiento
                </p>
              </div>
            </div>

            <h2
              className={`text-2xl lg:text-3xl font-bold mb-6 leading-tight ${
                theme === "dark" ? "text-white" : "text-gray-900"
              }`}
            >
              Ingresa tu correo para{" "}
              <span className="bg-gradient-to-r from-[#1E88E5] to-[#17C787] bg-clip-text text-transparent">
                continuar
              </span>
            </h2>

            <ul className="space-y-4">
              {[
                { icon: Mail, text: "Si tu correo existe, recibirás instrucciones." },
                { icon: Info, text: "El enlace expira por seguridad." },
              ].map((item, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 animate-fade-in-up"
                  style={{ animationDelay: `${0.2 + index * 0.1}s` }}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      theme === "dark" ? "bg-white/10" : "bg-gray-100"
                    }`}
                  >
                    <item.icon className="w-4 h-4 text-[#1E88E5]" />
                  </div>
                  <span className={`text-sm lg:text-base ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                    {item.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right card - Form */}
          <div
            className={`w-full lg:w-[400px] rounded-3xl p-8 backdrop-blur-xl transition-all duration-500 animate-fade-in-up ${
              theme === "dark"
                ? "bg-white/5 border border-white/10 shadow-2xl shadow-purple-500/10"
                : "bg-white/80 border border-white/50 shadow-xl"
            }`}
          >
            {!isSent ? (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1E88E5] to-[#0E6FFF] flex items-center justify-center">
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                  <h2 className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                    Recuperar contraseña
                  </h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${
                        theme === "dark" ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Correo electrónico
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@correo.com"
                      className={`w-full px-4 py-3 rounded-xl transition-all duration-300 focus:ring-2 focus:ring-[#1E88E5] focus:outline-none ${
                        theme === "dark"
                          ? "bg-white/10 border border-white/20 text-white placeholder-gray-500"
                          : "bg-white border border-gray-200 text-gray-900 placeholder-gray-400"
                      }`}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 rounded-xl font-semibold text-white transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed bg-gradient-to-r from-[#17C787] via-[#1E88E5] to-[#0E6FFF] hover:shadow-lg hover:shadow-[#1E88E5]/30"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Enviando...</span>
                      </div>
                    ) : (
                      "Enviar enlace"
                    )}
                  </button>
                </form>

                <p className={`text-center mt-6 text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                  ¿Recordaste tu clave?{" "}
                  <button
                    onClick={onBack}
                    className="text-[#1E88E5] hover:text-[#0E6FFF] font-medium transition-colors"
                  >
                    Inicia sesión
                  </button>
                </p>
              </>
            ) : (
              /* Success state */
              <div className="text-center py-8 animate-fade-in-up">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#17C787] to-[#1E88E5] flex items-center justify-center animate-pulse">
                  <CheckCircle className="w-10 h-10 text-white" />
                </div>
                <h3 className={`text-xl font-bold mb-3 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                  ¡Correo enviado!
                </h3>
                <p className={`text-sm mb-6 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                  Revisa tu bandeja de entrada y sigue las instrucciones para restablecer tu contraseña.
                </p>
                <button
                  onClick={onBack}
                  className={`flex items-center gap-2 mx-auto px-6 py-3 rounded-xl font-medium transition-all duration-300 hover:scale-105 ${
                    theme === "dark"
                      ? "bg-white/10 hover:bg-white/20 text-white"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Volver al inicio
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
