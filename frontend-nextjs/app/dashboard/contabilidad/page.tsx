/**
 * ============================================================
 * PÁGINA DE CONTABILIDAD
 * ============================================================
 * Interfaz de gestión de gastos mensuales.
 * Acceso: Gerencia y Encargado
 */

"use client"

import { useAuth } from "@/lib/auth"
import { Contabilidad } from "@/components/dashboard/contabilidad"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function ContabilidadPage() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user) {
      const role = user.role?.toLowerCase()
      if (role !== 'gerencia' && role !== 'encargado') {
        router.push('/dashboard')
      }
    }
  }, [user, router])

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  const role = user.role?.toLowerCase()
  if (role !== 'gerencia' && role !== 'encargado') {
    return null
  }

  return <Contabilidad />
}
