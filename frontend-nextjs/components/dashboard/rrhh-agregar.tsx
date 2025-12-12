"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import { RefreshCw, UserPlus, ImageIcon, Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface User {
  _id: string
  nombre: string
  email: string
  role: string
  numeroEquipo?: string
  active: boolean
}

interface Employee {
  userId: string
}

export function RRHHAgregar() {
  const { theme } = useTheme()
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [existingEmployees, setExistingEmployees] = useState<Set<string>>(new Set())
  const [loadingData, setLoadingData] = useState(true)

  const [formData, setFormData] = useState({
    userId: "",
    nombreCompleto: "",
    telefonoPersonal: "",
    numeroEquipo: "",
    fechaEntrevista: "",
    fechaIngreso: new Date().toISOString().split('T')[0],
    cargo: "",
    firmoContrato: false,
    activo: true,
    fotoDNI: null as File | null,
    notas: "",
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoadingData(true)
      const [usersRes, employeesRes] = await Promise.all([
        api.users.list(),
        api.employees.list()
      ])

      setUsers(usersRes.data)

      const employeeUserIds = new Set<string>(
        employeesRes.data.map((e: any) => e.userId?._id || e.userId)
      )
      setExistingEmployees(employeeUserIds)

    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Error al cargar datos iniciales")
    } finally {
      setLoadingData(false)
    }
  }

  const handleUserSelect = (userId: string) => {
    const selectedUser = users.find(u => u._id === userId)
    if (selectedUser) {
      setFormData(prev => ({
        ...prev,
        userId: userId,
        nombreCompleto: selectedUser.nombre,
        numeroEquipo: selectedUser.numeroEquipo || "",
        cargo: selectedUser.role,
        // Reset specific fields if needed
      }))
    } else {
      setFormData(prev => ({ ...prev, userId: "" }))
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData((prev) => ({ ...prev, fotoDNI: e.target.files![0] }))
    }
  }

  const handleLimpiar = () => {
    setFormData({
      userId: "",
      nombreCompleto: "",
      telefonoPersonal: "",
      numeroEquipo: "",
      fechaEntrevista: "",
      fechaIngreso: new Date().toISOString().split('T')[0],
      cargo: "",
      firmoContrato: false,
      activo: true,
      fotoDNI: null,
      notas: "",
    })
  }

  const handleSubmit = async () => {
    if (!formData.userId) {
      toast.error("Debe seleccionar un usuario")
      return
    }
    if (!formData.nombreCompleto) {
      toast.error("El nombre completo es obligatorio")
      return
    }

    try {
      setLoading(true)

      // Prepare payload
      const payload = {
        ...formData,
        // If file upload is implemented later, handle it here. 
        // For now, sending null or string if backend expects it.
        fotoDNI: ""
      }

      await api.employees.create(payload)
      toast.success("Empleado creado exitosamente")
      handleLimpiar()
      // Optionally redirect or refresh
      fetchData() // Refresh list to update available users

    } catch (error: any) {
      console.error("Error creating employee:", error)
      toast.error(error.response?.data?.message || "Error al crear empleado")
    } finally {
      setLoading(false)
    }
  }

  // Filter available users (those who are not already employees)
  const availableUsers = users.filter(u => !existingEmployees.has(u._id))

  if (loadingData) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div
        className={cn(
          "rounded-2xl border p-6",
          theme === "dark"
            ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
            : "bg-white border-gray-200 shadow-sm",
        )}
      >
        {/* Header */}
        <div className="mb-6">
          <h2 className={cn("text-xl font-semibold mb-1", theme === "dark" ? "text-white" : "text-gray-800")}>
            Nuevo Empleado
          </h2>
          <p className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
            Complete los datos del nuevo empleado asociándolo a una cuenta de usuario existente
          </p>
        </div>

        {/* Usuario de la plataforma - destacado */}
        <div
          className={cn(
            "rounded-xl border p-4 mb-6",
            theme === "dark"
              ? "bg-gradient-to-r from-[#1E88E5]/10 to-[#0E6FFF]/10 border-[#1E88E5]/30"
              : "bg-gradient-to-r from-[#1E88E5]/5 to-[#0E6FFF]/5 border-[#1E88E5]/20",
          )}
        >
          <label className={cn("text-sm font-medium mb-2 block", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
            Usuario de la Plataforma <span style={{ color: "#C8376B" }}>*</span>
          </label>
          <select
            value={formData.userId}
            onChange={(e) => handleUserSelect(e.target.value)}
            className={cn(
              "w-full px-4 py-2.5 rounded-lg border text-sm",
              theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
            )}
          >
            <option value="">Seleccionar usuario...</option>
            {availableUsers.map(user => (
              <option key={user._id} value={user._id}>
                {user.nombre} ({user.email}) - {user.role}
              </option>
            ))}
          </select>
          <p className={cn("text-xs mt-2", theme === "dark" ? "text-[#1E88E5]" : "text-[#1E88E5]")}>
            Seleccione la cuenta de usuario que quedará asociada a este empleado. Solo se muestran usuarios sin ficha de empleado.
          </p>
        </div>

        {/* Formulario principal */}
        <div className="space-y-4">
          {/* Nombre completo */}
          <div>
            <label
              className={cn("text-sm font-medium mb-1 block", theme === "dark" ? "text-gray-300" : "text-gray-700")}
            >
              Nombre Completo <span style={{ color: "#C8376B" }}>*</span>
            </label>
            <input
              type="text"
              value={formData.nombreCompleto}
              onChange={(e) => handleInputChange("nombreCompleto", e.target.value)}
              className={cn(
                "w-full px-4 py-2.5 rounded-lg border text-sm",
                theme === "dark"
                  ? "bg-white/5 border-white/10 text-white placeholder-gray-500"
                  : "bg-white border-gray-200 text-gray-800 placeholder-gray-400",
              )}
            />
          </div>

          {/* Teléfono y Equipo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                className={cn("text-sm font-medium mb-1 block", theme === "dark" ? "text-gray-300" : "text-gray-700")}
              >
                Teléfono Personal
              </label>
              <input
                type="text"
                placeholder="Ej: 1112345678"
                value={formData.telefonoPersonal}
                onChange={(e) => handleInputChange("telefonoPersonal", e.target.value)}
                className={cn(
                  "w-full px-4 py-2.5 rounded-lg border text-sm",
                  theme === "dark"
                    ? "bg-white/5 border-white/10 text-white placeholder-gray-500"
                    : "bg-white border-gray-200 text-gray-800 placeholder-gray-400",
                )}
              />
            </div>
            <div>
              <label
                className={cn("text-sm font-medium mb-1 block", theme === "dark" ? "text-gray-300" : "text-gray-700")}
              >
                Número de Equipo
              </label>
              <input
                type="text"
                value={formData.numeroEquipo}
                onChange={(e) => handleInputChange("numeroEquipo", e.target.value)}
                className={cn(
                  "w-full px-4 py-2.5 rounded-lg border text-sm",
                  theme === "dark"
                    ? "bg-white/5 border-white/10 text-white placeholder-gray-500"
                    : "bg-white border-gray-200 text-gray-800 placeholder-gray-400",
                )}
              />
            </div>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                className={cn("text-sm font-medium mb-1 block", theme === "dark" ? "text-gray-300" : "text-gray-700")}
              >
                Fecha de Entrevista
              </label>
              <input
                type="date"
                value={formData.fechaEntrevista}
                onChange={(e) => handleInputChange("fechaEntrevista", e.target.value)}
                className={cn(
                  "w-full px-4 py-2.5 rounded-lg border text-sm",
                  theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
                )}
              />
            </div>
            <div>
              <label
                className={cn("text-sm font-medium mb-1 block", theme === "dark" ? "text-gray-300" : "text-gray-700")}
              >
                Fecha de Ingreso
              </label>
              <input
                type="date"
                value={formData.fechaIngreso}
                onChange={(e) => handleInputChange("fechaIngreso", e.target.value)}
                className={cn(
                  "w-full px-4 py-2.5 rounded-lg border text-sm",
                  theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
                )}
              />
              <p className={cn("text-xs mt-1", theme === "dark" ? "text-[#F4C04A]" : "text-[#F4C04A]")}>
                Por defecto se asigna la fecha de creación de la cuenta
              </p>
            </div>
          </div>

          {/* Cargo */}
          <div>
            <label
              className={cn("text-sm font-medium mb-1 block", theme === "dark" ? "text-gray-300" : "text-gray-700")}
            >
              Cargo (Rol)
            </label>
            <div
              className={cn(
                "w-full px-4 py-2.5 rounded-lg border text-sm capitalize",
                theme === "dark"
                  ? "bg-[#17C787]/10 border-[#17C787]/30 text-[#17C787]"
                  : "bg-[#17C787]/10 border-[#17C787]/30 text-[#17C787]",
              )}
            >
              {formData.cargo || "El cargo se obtiene automáticamente del rol del usuario"}
            </div>
            <p className={cn("text-xs mt-1", theme === "dark" ? "text-gray-500" : "text-gray-500")}>
              El cargo se obtiene automáticamente del rol del usuario
            </p>
          </div>

          {/* Checkboxes */}
          <div
            className={cn(
              "flex items-center gap-6 p-4 rounded-lg border",
              theme === "dark" ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200",
            )}
          >
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.firmoContrato}
                onChange={(e) => handleInputChange("firmoContrato", e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[#1E88E5] focus:ring-[#1E88E5]"
              />
              <span className={cn("text-sm", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                ¿Firmó el contrato?
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.activo}
                onChange={(e) => handleInputChange("activo", e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[#17C787] focus:ring-[#17C787]"
              />
              <span className={cn("text-sm", theme === "dark" ? "text-gray-300" : "text-gray-700")}>¿Activo?</span>
            </label>
          </div>

          {/* Foto DNI */}
          <div>
            <label
              className={cn(
                "text-sm font-medium mb-1 flex items-center gap-1",
                theme === "dark" ? "text-gray-300" : "text-gray-700",
              )}
            >
              <ImageIcon className="w-4 h-4" style={{ color: "#F4C04A" }} />
              Foto del DNI (.jpg, .png)
            </label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png"
              onChange={handleFileChange}
              disabled={true} // Disabled for now as backend expects string
              className={cn(
                "w-full px-4 py-2.5 rounded-lg border text-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium opacity-50 cursor-not-allowed",
                theme === "dark"
                  ? "bg-white/5 border-white/10 text-white file:bg-[#1E88E5]/20 file:text-[#1E88E5]"
                  : "bg-white border-gray-200 text-gray-800 file:bg-[#1E88E5]/10 file:text-[#1E88E5]",
              )}
            />
            <p className={cn("text-xs mt-1", theme === "dark" ? "text-gray-500" : "text-gray-500")}>
              Carga de imágenes deshabilitada temporalmente
            </p>
          </div>

          {/* Notas */}
          <div>
            <label
              className={cn("text-sm font-medium mb-1 block", theme === "dark" ? "text-gray-300" : "text-gray-700")}
            >
              Notas
            </label>
            <textarea
              placeholder="Observaciones adicionales..."
              value={formData.notas}
              onChange={(e) => handleInputChange("notas", e.target.value)}
              rows={4}
              className={cn(
                "w-full px-4 py-2.5 rounded-lg border text-sm resize-none",
                theme === "dark"
                  ? "bg-white/5 border-white/10 text-white placeholder-gray-500"
                  : "bg-white border-gray-200 text-gray-800 placeholder-gray-400",
              )}
            />
          </div>
        </div>

        {/* Footer con botones */}
        <div
          className={cn(
            "flex justify-end gap-3 mt-6 pt-6 border-t",
            theme === "dark" ? "border-white/10" : "border-gray-200",
          )}
        >
          <button
            onClick={handleLimpiar}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border",
              theme === "dark"
                ? "border-white/10 text-gray-400 hover:bg-white/5"
                : "border-gray-200 text-gray-600 hover:bg-gray-50",
            )}
          >
            <RefreshCw className="w-4 h-4" />
            Limpiar Formulario
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors text-white",
              loading ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"
            )}
            style={{ backgroundColor: "#1E88E5" }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Crear Empleado
          </button>
        </div>
      </div>
    </div>
  )
}
