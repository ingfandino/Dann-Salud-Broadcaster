/**
 * ============================================================
 * CREAR TURNO DE AUDITORÍA (auditorias-crear-turno.tsx)
 * ============================================================
 * Formulario para crear nuevos turnos de auditoría.
 * Permite carga masiva desde Excel y selección de horarios.
 */

"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import { Upload, Send, X, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth"

const ARGENTINE_OBRAS_SOCIALES = [
  "OSDE",
  "OSDEPYM",
  "IOMA",
  "OSSEG",
  "OSDE 210",
  "OSFATUN",
  "OSDE GBA",
  "OSECAC (126205)",
  "OSPRERA",
  "OMINT",
  "OSSEGUR",
  "OSPR",
  "OSUTHGRA (108803)",
  "OSBLYCA",
  "UOM",
  "OSPM",
  "OSPECON (105408)",
  "Elevar (114307)",
  "OSCHOCA (105804)",
  "OSPEP (113908)",
  "OSPROTURA",
  "OSPSIP (119708)",
  "OSEIV (122401)",
  "OSPIF (108100)",
  "OSIPA (114208)",
  "OSPESESGYPE (107206)",
  "OSTCARA (126007)",
  "OSPIT (121002)",
  "OSMP (111209)",
  "OSPECA (103709)",
  "OSPIQYP (118705)",
  "OSBLYCA (102904)",
  "VIASANO (2501)",
  "OSPCYD (103402)",
  "OSUOMRA (112103)",
  "OSAMOC (3405)",
  "OSPAGA (101000)",
  "OSPF (107404)",
  "OSPIP (116006)",
  "OSPIC",
  "OSG (109202)",
  "OSPERYH (106500)",
  "OSPCRA (104009)",
  "OSPMA (700108)",
  "HOMINIS (901501)",
  "OSCTCP (121606)",
  "OSMA (112509)"
]

const OBRAS_VENDIDAS = ["Binimed", "Meplife", "TURF"]
const TIPO_VENTA = ["alta", "cambio"]

export function AuditoriasCrearTurno() {
  const { theme } = useTheme()
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const userRole = user?.role?.toLowerCase() || ""
  const isSupervisor = userRole === "supervisor"
  const isRecuperador = userRole === "recuperador"
  const isEncargado = userRole === "encargado" // ✅ NUEVO: Rol Encargado
  const isIndependiente = userRole === "independiente" // ✅ NUEVO: Rol Independiente

  // Un auditor CON numeroEquipo es realmente un asesor que también hace auditorías
  // Un auditor SIN numeroEquipo actúa como gerencia (puede ver todos los equipos)
  const isAuditorConEquipo = userRole === "auditor" && !!user?.numeroEquipo
  const isAsesor = userRole === "asesor" || isAuditorConEquipo || isRecuperador || isIndependiente // Independiente se comporta como asesor (autoasigna)
  const isGerenciaOrAuditorSinEquipo = userRole === "gerencia" || (userRole === "auditor" && !user?.numeroEquipo)
  
  // ✅ Encargado con numeroEquipo se comporta como supervisor de su equipo
  const isEncargadoConEquipo = isEncargado && !!user?.numeroEquipo
  const isSupervisorLevel = isSupervisor || isEncargadoConEquipo

  // Form State
  const [form, setForm] = useState({
    nombre: "",
    cuil: "",
    telefono: "",
    tipoVenta: "alta",
    obraSocialAnterior: "",
    obraSocialVendida: "Binimed",
    fecha: "",
    hora: "",
    supervisor: "",
    asesor: "",
    validador: "",
    datosExtra: ""
  })

  // Lists
  const [asesores, setAsesores] = useState<any[]>([])
  const [supervisores, setSupervisores] = useState<any[]>([])
  const [validadores, setValidadores] = useState<any[]>([])
  const [availableSlots, setAvailableSlots] = useState<any[]>([])
  const [otroEquipo, setOtroEquipo] = useState(false)
  const [perteneceOtroSupervisor, setPerteneceOtroSupervisor] = useState(false)
  const [supervisorSeleccionado, setSupervisorSeleccionado] = useState("")

  // Estado para "Venta propia" de Supervisores
  const [ventaPropia, setVentaPropia] = useState(false)

  // Loading states
  const [loading, setLoading] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)

  // Bulk upload
  const [uploadingBulk, setUploadingBulk] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 })
  const [rejectedRows, setRejectedRows] = useState<any[]>([])

  // Estado para Eliana Suarez (usada por Recuperador y Supervisor con venta propia)
  const [elianaSuarez, setElianaSuarez] = useState<any>(null)

  // Load supervisors (para Gerencia, Auditor sin equipo, Supervisor, Recuperador o Encargado)
  useEffect(() => {
    if (isGerenciaOrAuditorSinEquipo || isSupervisor || isRecuperador || isEncargado) {
      loadSupervisores()
    }
  }, [isGerenciaOrAuditorSinEquipo, isSupervisor, isRecuperador, isEncargado])

  // Efecto para manejar "Venta propia" de Supervisores y Encargados
  useEffect(() => {
    if ((isSupervisor || isEncargado) && ventaPropia) {
      // Autoseleccionar al supervisor como asesor
      if (user?._id) {
        setForm(prev => ({ ...prev, asesor: user._id }))
        console.log('Supervisor Venta Propia: Asesor autoasignado:', user.nombre)
      }
      // Asignar Eliana Suarez como supervisor si ya está cargada
      if (elianaSuarez) {
        setForm(prev => ({ ...prev, supervisor: elianaSuarez._id }))
        console.log('Supervisor Venta Propia: Supervisor asignado - Eliana Suarez')
      }
    } else if ((isSupervisor || isEncargado) && !ventaPropia) {
      // Limpiar asesor y supervisor cuando se desactiva
      setForm(prev => ({ ...prev, asesor: '', supervisor: '' }))
    }
  }, [ventaPropia, isSupervisor, isEncargado, user, elianaSuarez])

  // ✅ Efecto para Independiente: auto-asignar asesor y cargar Eliana Suarez como supervisor
  useEffect(() => {
    if (isIndependiente) {
      // Auto-asignar como asesor
      if (user?._id) {
        setForm(prev => ({ ...prev, asesor: user._id }))
        console.log('Independiente: Asesor autoasignado:', user.nombre)
      }
      // Cargar Eliana Suarez como supervisor
      loadElianaSuarezForIndependiente()
    }
  }, [isIndependiente, user])

  // Función para cargar Eliana Suarez para Independiente
  const loadElianaSuarezForIndependiente = async () => {
    try {
      const res = await api.users.list()
      const eliana = res.data.find((u: any) => 
        u.role?.toLowerCase() === 'gerencia' && 
        u.nombre?.toLowerCase().includes('eliana') &&
        (u.nombre?.toLowerCase().includes('suarez') || u.nombre?.toLowerCase().includes('suárez'))
      )
      if (eliana) {
        setElianaSuarez(eliana)
        setForm(prev => ({ ...prev, supervisor: eliana._id }))
        console.log('Independiente: Supervisor asignado - Eliana Suarez')
      } else {
        toast.error('No se pudo encontrar a Eliana Suarez (Gerencia) en el sistema')
      }
    } catch (error) {
      console.error('Error cargando Eliana Suarez para Independiente:', error)
      toast.error('Error al cargar supervisor automático')
    }
  }

  // Load asesores when supervisor changes (para Gerencia/Auditor sin equipo)
  // Para supervisores, cargar asesores de su equipo o del supervisor seleccionado
  // Para asesores, NO necesitan lista de asesores (se auto-asignan)
  useEffect(() => {
    if (isGerenciaOrAuditorSinEquipo && form.supervisor) {
      loadAsesoresByEquipo(form.supervisor)
    } else if (isSupervisor) {
      if (perteneceOtroSupervisor && supervisorSeleccionado) {
        loadAsesoresByEquipo(supervisorSeleccionado)
      } else {
        loadAsesores()
      }
    }
  }, [form.supervisor, isSupervisor, isGerenciaOrAuditorSinEquipo, perteneceOtroSupervisor, supervisorSeleccionado])

  // Load validadores
  useEffect(() => {
    console.log('Validadores useEffect triggered:', {
      otroEquipo,
      asesor: form.asesor,
      user: user?.nombre,
      numeroEquipo: user?.numeroEquipo,
      isSupervisor,
      isAsesor,
      isRecuperador,
      isGerenciaOrAuditorSinEquipo,
      perteneceOtroSupervisor,
      supervisorSeleccionado
    })
    if (otroEquipo) {
      loadTodosLosValidadores()
    } else if (isSupervisor && perteneceOtroSupervisor && supervisorSeleccionado) {
      loadValidadoresPorSupervisor(supervisorSeleccionado)
    } else if (isRecuperador && elianaSuarez) {
      // Recuperador: cargar validadores del equipo de Eliana Suarez
      loadValidadoresPorSupervisor(elianaSuarez._id)
    } else {
      loadValidadores()
    }
  }, [otroEquipo, form.asesor, form.supervisor, user, isSupervisor, isAsesor, isRecuperador, isGerenciaOrAuditorSinEquipo, perteneceOtroSupervisor, supervisorSeleccionado, supervisores, elianaSuarez])

  // Para Recuperador: preseleccionar validador por defecto (Eliana Suarez o usuario de sesión)
  useEffect(() => {
    if (isRecuperador && validadores.length > 0 && !form.validador) {
      // Intentar preseleccionar a Eliana Suarez como validador
      const elianaValidador = validadores.find((v: any) =>
        v.nombre?.toLowerCase().includes('eliana') &&
        v.nombre?.toLowerCase().includes('suarez')
      )
      if (elianaValidador) {
        setForm(prev => ({ ...prev, validador: elianaValidador._id }))
        console.log('Recuperador: Validador preseleccionado - Eliana Suarez')
      } else if (user?._id) {
        // Si no está Eliana, preseleccionar al usuario de sesión si está en la lista
        const usuarioEnLista = validadores.find((v: any) => v._id === user._id)
        if (usuarioEnLista) {
          setForm(prev => ({ ...prev, validador: user._id }))
          console.log('Recuperador: Validador preseleccionado - Usuario de sesión')
        }
      }
    }
  }, [isRecuperador, validadores, user])

  // Load available slots when date changes
  useEffect(() => {
    if (form.fecha) {
      loadAvailableSlots(form.fecha)
    }
  }, [form.fecha])

  // Check for pre-fill data from Lead Management
  useEffect(() => {
    const prefillData = sessionStorage.getItem('prefillAudit')
    if (prefillData) {
      try {
        const data = JSON.parse(prefillData)
        setForm(prev => ({
          ...prev,
          nombre: data.nombre || "",
          cuil: data.cuil || "",
          telefono: data.telefono || "",
          obraSocialAnterior: data.obraSocialAnterior || "",
          datosExtra: data.localidad ? `Localidad: ${data.localidad}` : ""
        }))
        sessionStorage.removeItem('prefillAudit')
        toast.info("Datos precargados desde Lead Management")
      } catch (e) {
        console.error("Error parsing prefill data", e)
      }
    }
  }, [])

  const loadSupervisores = async () => {
    try {
      // Usar includeAllAuditors=true para obtener todos los usuarios sin filtro por equipo
      const { data } = await api.users.list("includeAllAuditors=true")
      const users = Array.isArray(data) ? data : []
      const sups = users.filter((u: any) => (u.role?.toLowerCase() === "supervisor" || u.role?.toLowerCase() === "encargado") && u.active !== false)
      console.log('loadSupervisores:', sups.length, 'supervisores encontrados')
      setSupervisores(sups)

      // Buscar a Eliana Suarez (usada por Recuperador y Supervisor con venta propia)
      // ✅ FIX: Buscar en supervisores O gerencia (Eliana tiene rol gerencia)
      const eliana = users.find((s: any) =>
        (s.role?.toLowerCase() === 'supervisor' || s.role?.toLowerCase() === 'gerencia') &&
        s.active !== false &&
        s.nombre?.toLowerCase().includes('eliana') &&
        s.nombre?.toLowerCase().includes('suarez')
      )
      if (eliana) {
        setElianaSuarez(eliana)
        console.log('Eliana Suarez encontrada:', eliana.nombre)

        // Para Recuperador: preseleccionar automáticamente
        if (isRecuperador) {
          setForm(prev => ({ ...prev, supervisor: eliana._id }))
          console.log('Recuperador: Supervisor preseleccionado - Eliana Suarez')
        }
      } else {
        console.warn('No se encontró a Eliana Suarez en la lista de supervisores')
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Load asesores
  const loadAsesores = async () => {
    try {
      // Use scope=group to filter by team on backend if possible, or filter on client
      const { data } = await api.users.list("scope=group")
      const users = Array.isArray(data) ? data : []
      const myNumeroEquipo = user?.numeroEquipo

      const filtered = users.filter((u: any) => {
        const isActive = u.active !== false
        const hasName = u.nombre && u.nombre.trim().length > 0
        const isCorrectRole = ["asesor", "auditor", "supervisor", "encargado"].includes(u.role?.toLowerCase())
        // If supervisor or encargado, filter by own team. If not supervisor, backend 'scope=group' might have already filtered, 
        // but we double check if we have the info.
        const sameTeam = !isSupervisorLevel || !myNumeroEquipo || String(u.numeroEquipo) === String(myNumeroEquipo)
        return isActive && hasName && isCorrectRole && sameTeam
      }).sort((a: any, b: any) => a.nombre.localeCompare(b.nombre))

      // Si es supervisor o encargado, asegurarse de que esté incluido en la lista
      if (isSupervisorLevel && user) {
        const supervisorYaIncluido = filtered.some((u: any) => u._id === user._id)
        if (!supervisorYaIncluido) {
          // Agregar al supervisor/encargado actual al inicio de la lista
          filtered.unshift({
            _id: user._id,
            nombre: user.nombre || user.email,
            role: user.role,
            numeroEquipo: user.numeroEquipo
          })
        }
      }

      setAsesores(filtered)
    } catch (err) {
      console.error(err)
      toast.error("Error al cargar asesores")
    }
  }

  const loadAsesoresByEquipo = async (supervisorId: string) => {
    try {
      // Usar includeAllAuditors=true para obtener todos los usuarios
      const { data: allUsers } = await api.users.list("includeAllAuditors=true")
      const users = Array.isArray(allUsers) ? allUsers : []
      console.log('loadAsesoresByEquipo:', { supervisorId, totalUsers: users.length })

      const supervisor = users.find((u: any) => u._id === supervisorId)
      if (!supervisor?.numeroEquipo) {
        setAsesores([])
        return
      }

      const filtered = users.filter((u: any) => {
        const isActive = u.active !== false
        const hasName = u.nombre && u.nombre.trim().length > 0
        const isCorrectRole = ["asesor", "auditor", "supervisor"].includes(u.role?.toLowerCase())
        const sameTeam = String(u.numeroEquipo) === String(supervisor.numeroEquipo)
        return isActive && hasName && isCorrectRole && sameTeam
      }).sort((a: any, b: any) => a.nombre.localeCompare(b.nombre))

      setAsesores(filtered)

      // Also load validators for this team
      loadValidadoresByEquipo(supervisor.numeroEquipo, users)
    } catch (err) {
      console.error(err)
      toast.error("Error al cargar asesores del equipo")
    }
  }

  const loadValidadoresByEquipo = (numeroEquipo: string, allUsers: any[]) => {
    const filtered = allUsers.filter((u: any) => {
      const isActive = u.active !== false
      const hasName = u.nombre && u.nombre.trim().length > 0
      const sameTeam = String(u.numeroEquipo) === String(numeroEquipo)
      return isActive && hasName && sameTeam
    }).sort((a: any, b: any) => a.nombre.localeCompare(b.nombre))
    setValidadores(filtered)
  }

  const loadValidadoresPorSupervisor = async (supervisorId: string) => {
    try {
      // Usar includeAllAuditors=true para obtener todos los usuarios
      const { data: allUsers } = await api.users.list("includeAllAuditors=true")
      const users = Array.isArray(allUsers) ? allUsers : []
      console.log('loadValidadoresPorSupervisor:', { supervisorId, totalUsers: users.length })
      const supervisor = users.find((u: any) => u._id === supervisorId)
      if (!supervisor?.numeroEquipo) {
        setValidadores([])
        return
      }
      const filtered = users.filter((u: any) => {
        const isActive = u.active !== false
        const hasName = u.nombre && u.nombre.trim().length > 0
        const sameTeam = String(u.numeroEquipo) === String(supervisor.numeroEquipo)
        const notAsesor = !form.asesor || u._id !== form.asesor
        return isActive && hasName && sameTeam && notAsesor
      }).sort((a: any, b: any) => a.nombre.localeCompare(b.nombre))

      // ✅ CRÍTICO: Para Recuperador, incluir al usuario de sesión en la lista de validadores
      if (isRecuperador && user && !filtered.some((v: any) => v._id === user._id)) {
        filtered.push({
          _id: user._id,
          nombre: user.nombre || user.email,
          role: user.role,
          numeroEquipo: user.numeroEquipo
        })
        console.log('Recuperador: Usuario de sesión agregado a validadores:', user.nombre)
      }

      setValidadores(filtered)
    } catch (err) {
      console.error(err)
    }
  }

  const loadValidadores = async () => {
    try {
      // Determine the target team number
      let targetNumeroEquipo = user?.numeroEquipo

      // Para Gerencia o Auditor sin equipo: usar el equipo del supervisor seleccionado
      if (isGerenciaOrAuditorSinEquipo) {
        if (!form.supervisor) {
          setValidadores([])
          return
        }
        const selectedSupervisor = supervisores.find(s => s._id === form.supervisor)
        if (selectedSupervisor) {
          targetNumeroEquipo = selectedSupervisor.numeroEquipo
        }
      }

      console.log('loadValidadores called', {
        role: user?.role,
        userTeam: user?.numeroEquipo,
        targetTeam: targetNumeroEquipo,
        supervisor: form.supervisor,
        isAsesor,
        isSupervisor,
        isGerenciaOrAuditorSinEquipo
      })

      if (!targetNumeroEquipo) {
        console.log('No targetNumeroEquipo, setting validadores to empty')
        setValidadores([])
        return
      }

      // Para asesores y supervisores: cargar todos los usuarios
      // Usar scope=all para obtener todos los usuarios con sus campos completos
      const { data } = await api.users.list("scope=all")
      const users = Array.isArray(data) ? data : []

      // Debug: ver qué usuarios devuelve la API
      console.log('API devuelve', users.length, 'usuarios')
      console.log('Usuarios con numeroEquipo:', users.filter((u: any) => u.numeroEquipo).map((u: any) => ({ nombre: u.nombre, equipo: u.numeroEquipo, role: u.role })))
      console.log('Buscando equipo:', targetNumeroEquipo, 'tipo:', typeof targetNumeroEquipo)

      const filtered = users.filter((u: any) => {
        const isActive = u.active !== false
        const hasName = u.nombre && u.nombre.trim().length > 0

        // Comparar numeroEquipo con conversión a String para evitar problemas de tipo
        const userEquipo = u.numeroEquipo ? String(u.numeroEquipo) : null
        const targetEquipo = targetNumeroEquipo ? String(targetNumeroEquipo) : null
        const sameTeam = userEquipo === targetEquipo

        // Para asesores (isAsesor), excluir a sí mismos (son el asesor implícito de la venta)
        // Para otros roles, excluir al asesor seleccionado en el form
        const asesorIdToExclude = isAsesor ? user?._id : form.asesor
        const notAsesor = !asesorIdToExclude || u._id !== asesorIdToExclude

        return isActive && hasName && sameTeam && notAsesor
      }).sort((a: any, b: any) => a.nombre.localeCompare(b.nombre))

      console.log('Filtered validadores:', filtered.length, 'users from team', targetNumeroEquipo)
      setValidadores(filtered)
    } catch (err) {
      console.error('Error loading validadores:', err)
    }
  }

  const loadTodosLosValidadores = async () => {
    try {
      // Cargar todos los usuarios para mostrar validadores de otros equipos
      // Usar includeAllAuditors=true para que el backend devuelva todos los usuarios
      const { data } = await api.users.list("includeAllAuditors=true")
      const users = Array.isArray(data) ? data : []

      console.log('loadTodosLosValidadores: API devuelve', users.length, 'usuarios')

      const filtered = users.filter((u: any) => {
        const isActive = u.active !== false
        const hasName = u.nombre && u.nombre.trim().length > 0
        // Solo roles que pueden validar: Supervisor, Asesor, Auditor o Gerencia
        const isCorrectRole = ["asesor", "supervisor", "auditor", "gerencia"].includes(u.role?.toLowerCase())

        // Para asesores (isAsesor), excluir a sí mismos (son el asesor implícito)
        // Para otros roles, excluir al asesor seleccionado en el form
        const asesorIdToExclude = isAsesor ? user?._id : form.asesor
        const notAsesor = !asesorIdToExclude || u._id !== asesorIdToExclude

        return isActive && hasName && isCorrectRole && notAsesor
      }).sort((a: any, b: any) => a.nombre.localeCompare(b.nombre))

      setValidadores(filtered)
    } catch (err) {
      console.error(err)
    }
  }

  const loadAvailableSlots = async (date: string) => {
    try {
      setLoadingSlots(true)
      const { data } = await api.audits.getAvailableSlots(date)
      setAvailableSlots(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
      setAvailableSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  const generateTimeOptions = () => {
    const options = []
    const start = new Date()
    start.setHours(9, 20, 0, 0)
    const end = new Date()
    end.setHours(23, 0, 0, 0)
    let cur = new Date(start)

    while (cur <= end) {
      const hh = String(cur.getHours()).padStart(2, "0")
      const mm = String(cur.getMinutes()).padStart(2, "0")
      options.push(`${hh}:${mm}`)
      cur.setMinutes(cur.getMinutes() + 20)
    }
    return options
  }

  const timeOptions = useMemo(() => {
    const all = generateTimeOptions()
    const map: Record<string, number> = {}

    if (Array.isArray(availableSlots)) {
      availableSlots.forEach((s: any) => {
        map[s.time] = s.count
      })
    }

    return all.map(t => ({
      time: t,
      disabled: (map[t] || 0) >= 10
    }))
  }, [availableSlots])

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const validate = () => {
    if (!form.nombre.trim()) return "Nombre es requerido"
    if (!/^\d{11}$/.test(form.cuil)) return "CUIL debe tener exactamente 11 dígitos"
    if (form.telefono && !/^\d{10}$/.test(form.telefono.replace(/\D/g, '')))
      return "Teléfono debe tener 10 dígitos"
    if (!form.fecha) return "Fecha es requerida"
    if (!form.hora) return "Hora es requerida"
    // Para asesores, supervisores con venta propia o encargados con venta propia, no se requiere seleccionar asesor (se auto-asigna)
    const autoAsignaAsesor = isAsesor || ((isSupervisor || isEncargado) && ventaPropia)
    if (!autoAsignaAsesor && !form.asesor) return "Asesor es requerido"
    if (!form.validador) return "Validador es requerido"
    if (isGerenciaOrAuditorSinEquipo && !form.supervisor) return "Supervisor es requerido"
    // Para supervisor/encargado con venta propia, validar que Eliana Suarez esté disponible
    if ((isSupervisor || isEncargado) && ventaPropia && !elianaSuarez) return "No se encontró a Eliana Suarez para asignar como supervisor"
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const error = validate()
    if (error) {
      toast.error(error)
      return
    }

    try {
      setLoading(true)

      // Use browser's local timezone
      const scheduledAt = new Date(`${form.fecha}T${form.hora}:00`)

      // Para asesores, supervisores con venta propia o encargados con venta propia, el asesor es el propio usuario
      const autoAsignaAsesor = isAsesor || ((isSupervisor || isEncargado) && ventaPropia)
      const asesorId = autoAsignaAsesor ? user?._id : form.asesor

      const payload: any = {
        nombre: form.nombre,
        cuil: form.cuil,
        telefono: form.telefono,
        tipoVenta: form.tipoVenta,
        obraSocialAnterior: form.obraSocialAnterior,
        obraSocialVendida: form.obraSocialVendida,
        scheduledAt: scheduledAt.toISOString(),
        asesor: asesorId,
        validador: form.validador,
        datosExtra: form.datosExtra,
        status: "Pendiente"
      }

      // ✅ CRÍTICO: Para Recuperador, Supervisor con Venta Propia o Encargado con Venta Propia, asignar Eliana Suarez
      // También activar isReferido para que el sistema permita supervisor con rol Gerencia
      if ((isRecuperador || ((isSupervisor || isEncargado) && ventaPropia)) && elianaSuarez) {
        payload.supervisor = elianaSuarez._id
        payload.isReferido = true  // ✅ Permite supervisor con rol Gerencia
        console.log('Supervisor asignado (Eliana Suarez):', elianaSuarez.nombre, elianaSuarez._id, 'isReferido: true')
      } else if (form.supervisor) {
        payload.supervisor = form.supervisor
      }

      await api.audits.create(payload)
      toast.success("Auditoría creada exitosamente")

      // Reset form y estados relacionados
      setForm({
        nombre: "",
        cuil: "",
        telefono: "",
        tipoVenta: "alta",
        obraSocialAnterior: "",
        obraSocialVendida: "Binimed",
        fecha: "",
        hora: "",
        supervisor: "",
        asesor: "",
        validador: "",
        datosExtra: ""
      })
      // Resetear checkbox de venta propia
      if (isSupervisor || isEncargado) {
        setVentaPropia(false)
      }
    } catch (err: any) {
      console.error('Full error:', err)
      console.error('Error response:', err.response)
      console.error('Error response data:', JSON.stringify(err.response?.data, null, 2))
      console.error('Error status:', err.response?.status)

      // Log specific error details if they exist
      if (err.response?.data?.error) {
        console.error('Error details:', JSON.stringify(err.response.data.error, null, 2))
        console.error('Error code:', err.response.data.error.code)
        console.error('Error message:', err.response.data.error.message)
        console.error('Error traceId:', err.response.data.error.traceId)
        console.error('Error details array:', err.response.data.error.details)
      }

      let errorMessage = "Error al crear auditoría"

      if (err.response?.data?.error) {
        if (typeof err.response.data.error === 'string') {
          errorMessage = err.response.data.error
        } else if (typeof err.response.data.error === 'object' && err.response.data.error.message) {
          errorMessage = err.response.data.error.message
        }
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message
      } else if (err.message) {
        errorMessage = err.message
      }

      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploadingBulk(true)
      setBulkProgress({ current: 0, total: 0 })
      setRejectedRows([])

      const response = await api.audits.bulkUpload(file)
      const { accepted, rejected } = response.data

      toast.success(`${accepted} auditorías creadas exitosamente`)

      if (rejected && rejected.length > 0) {
        setRejectedRows(rejected)
        toast.warning(`${rejected.length} filas rechazadas`)
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.response?.data?.message || "Error en carga masiva")
    } finally {
      setUploadingBulk(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Encabezado de la sección */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={cn("text-xl font-semibold", theme === "dark" ? "text-white" : "text-gray-800")}>
            Pautar Auditoría / Venta
          </h2>
          <p className={cn("text-sm mt-1", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
            Crear nuevo turno de auditoría
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleBulkUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingBulk}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
              uploadingBulk ? "opacity-50 cursor-not-allowed" : "",
              theme === "dark"
                ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                : "bg-green-500 text-white hover:bg-green-600"
            )}
          >
            {uploadingBulk ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Carga Masiva
          </button>
        </div>
      </div>

      {/* Alerta de filas rechazadas */}
      {rejectedRows.length > 0 && (
        <div className={cn(
          "rounded-xl border p-4",
          theme === "dark" ? "bg-red-500/10 border-red-500/20" : "bg-red-50 border-red-200"
        )}>
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div className="flex-1">
              <h3 className={cn("font-semibold text-sm mb-2", theme === "dark" ? "text-red-400" : "text-red-700")}>
                Filas rechazadas ({rejectedRows.length})
              </h3>
              <div className="space-y-1 text-xs">
                {rejectedRows.slice(0, 5).map((row, idx) => (
                  <div key={idx} className={theme === "dark" ? "text-red-300" : "text-red-600"}>
                    Fila {row.row}: {row.reason}
                  </div>
                ))}
                {rejectedRows.length > 5 && (
                  <div className="text-gray-500">... y {rejectedRows.length - 5} más</div>
                )}
              </div>
              <button
                onClick={() => setRejectedRows([])}
                className="mt-2 text-xs underline hover:no-underline"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Formulario de creación de turno */}
      <div className={cn(
        "rounded-2xl border p-6 backdrop-blur-sm max-w-2xl mx-auto",
        theme === "dark"
          ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
          : "bg-white border-gray-200 shadow-sm"
      )}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campo: Nombre del afiliado */}
          <div>
            <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
              Nombre de afiliado <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => handleChange("nombre", e.target.value)}
              className={cn(
                "w-full px-3 py-2 rounded-lg border text-sm",
                theme === "dark"
                  ? "bg-white/5 border-white/10 text-white placeholder-gray-500"
                  : "bg-white border-gray-200 text-gray-800 placeholder-gray-400"
              )}
              required
            />
          </div>

          {/* Campo: CUIL */}
          <div>
            <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
              CUIL <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="11 dígitos"
              value={form.cuil}
              onChange={(e) => handleChange("cuil", e.target.value.replace(/\D/g, ""))}
              maxLength={11}
              className={cn(
                "w-full px-3 py-2 rounded-lg border text-sm",
                theme === "dark"
                  ? "bg-white/5 border-white/10 text-white placeholder-gray-500"
                  : "bg-white border-gray-200 text-gray-800 placeholder-gray-400"
              )}
              required
            />
          </div>

          {/* Campo: Teléfono */}
          <div>
            <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
              Teléfono
            </label>
            <input
              type="tel"
              value={form.telefono}
              onChange={(e) => handleChange("telefono", e.target.value)}
              className={cn(
                "w-full px-3 py-2 rounded-lg border text-sm",
                theme === "dark"
                  ? "bg-white/5 border-white/10 text-white placeholder-gray-500"
                  : "bg-white border-gray-200 text-gray-800 placeholder-gray-400"
              )}
            />
          </div>

          {/* Tipo de venta y Obra Social vendida */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                Tipo de venta
              </label>
              <select
                value={form.tipoVenta}
                onChange={(e) => handleChange("tipoVenta", e.target.value)}
                className={cn(
                  "w-full px-3 py-2 rounded-lg border text-sm",
                  theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"
                )}
              >
                {TIPO_VENTA.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                Obra social vendida
              </label>
              <select
                value={form.obraSocialVendida}
                onChange={(e) => handleChange("obraSocialVendida", e.target.value)}
                className={cn(
                  "w-full px-3 py-2 rounded-lg border text-sm",
                  theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"
                )}
              >
                {OBRAS_VENDIDAS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          {/* Campo: Obra social anterior */}
          <div>
            <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
              Obra social anterior
            </label>
            <select
              value={form.obraSocialAnterior}
              onChange={(e) => handleChange("obraSocialAnterior", e.target.value)}
              className={cn(
                "w-full px-3 py-2 rounded-lg border text-sm",
                theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"
              )}
            >
              <option value="">-- Seleccionar --</option>
              {ARGENTINE_OBRAS_SOCIALES.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          {/* Fecha y hora del turno */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                Fecha (día) <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.fecha}
                onChange={(e) => handleChange("fecha", e.target.value)}
                className={cn(
                  "w-full px-3 py-2 rounded-lg border text-sm",
                  theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"
                )}
                required
              />
            </div>
            <div>
              <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                Hora (turno) <span className="text-red-500">*</span>
              </label>
              <select
                value={form.hora}
                onChange={(e) => handleChange("hora", e.target.value)}
                disabled={loadingSlots}
                className={cn(
                  "w-full px-3 py-2 rounded-lg border text-sm",
                  theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"
                )}
                required
              >
                <option value="">-- Seleccionar --</option>
                {timeOptions.map(({ time, disabled }) => (
                  <option key={time} value={time} disabled={disabled}>
                    {time} {disabled ? "(lleno)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Checkbox "Pertenece a otro supervisor" - solo para Supervisores */}
          {isSupervisor && (
            <div className={cn(
              "p-3 rounded-lg border",
              theme === "dark" ? "bg-purple-500/10 border-purple-500/30" : "bg-purple-50 border-purple-200"
            )}>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="perteneceOtroSupervisor"
                  checked={perteneceOtroSupervisor}
                  onChange={(e) => {
                    setPerteneceOtroSupervisor(e.target.checked)
                    if (!e.target.checked) {
                      setSupervisorSeleccionado("")
                      setForm(prev => ({ ...prev, asesor: "", validador: "" }))
                    }
                  }}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="perteneceOtroSupervisor" className={cn("text-sm font-medium", theme === "dark" ? "text-purple-400" : "text-purple-700")}>
                  Pertenece a otro supervisor
                </label>
              </div>
              {perteneceOtroSupervisor && (
                <div className="mt-3">
                  <label className={cn("block text-xs font-medium mb-1", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                    Seleccionar supervisor
                  </label>
                  <select
                    value={supervisorSeleccionado}
                    onChange={(e) => {
                      setSupervisorSeleccionado(e.target.value)
                      setForm(prev => ({ ...prev, asesor: "", validador: "" }))
                    }}
                    className={cn(
                      "w-full px-3 py-2 rounded-lg border text-sm",
                      theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"
                    )}
                  >
                    <option value="">-- Seleccionar --</option>
                    {supervisores.filter(s => s._id !== user?._id).map(s => <option key={s._id} value={s._id}>{s.nombre}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Supervisor (solo para Gerencia o Auditor sin equipo) */}
          {isGerenciaOrAuditorSinEquipo && (
            <div>
              <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                Supervisor <span className="text-red-500">*</span>
              </label>
              <select
                value={form.supervisor}
                onChange={(e) => handleChange("supervisor", e.target.value)}
                className={cn(
                  "w-full px-3 py-2 rounded-lg border text-sm",
                  theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"
                )}
                required
              >
                <option value="">-- Seleccionar supervisor --</option>
                {supervisores.map(s => <option key={s._id} value={s._id}>{s.nombre}</option>)}
              </select>
            </div>
          )}

          {/* Supervisor fijo para Recuperador (solo Eliana Suarez) */}
          {isRecuperador && (
            <div className={cn(
              "p-3 rounded-lg border",
              theme === "dark" ? "bg-purple-500/10 border-purple-500/30" : "bg-purple-50 border-purple-200"
            )}>
              <p className={cn("text-sm", theme === "dark" ? "text-purple-400" : "text-purple-700")}>
                👑 <strong>Supervisor:</strong> {elianaSuarez?.nombre || "Eliana Suarez (cargando...)"}
              </p>
              <p className={cn("text-xs mt-1", theme === "dark" ? "text-purple-400/70" : "text-purple-600")}>
                La venta se asignará automáticamente al equipo de Eliana Suarez
              </p>
            </div>
          )}

          {/* Campo: Asesor asignado (solo para Supervisor y Gerencia/Auditor sin equipo) */}
          {/* Para asesores (y auditores con equipo), la venta se asigna automáticamente a ellos */}
          {!isAsesor && (
            <div>
              <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                Asesor <span className="text-red-500">*</span>
              </label>
              <select
                value={form.asesor}
                onChange={(e) => handleChange("asesor", e.target.value)}
                disabled={(isSupervisor || isEncargado) && ventaPropia}
                className={cn(
                  "w-full px-3 py-2 rounded-lg border text-sm",
                  theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800",
                  (isSupervisor || isEncargado) && ventaPropia && "opacity-60 cursor-not-allowed"
                )}
                required
              >
                <option value="">-- Seleccionar asesor --</option>
                {asesores.map(a => <option key={a._id} value={a._id}>{a.nombre} ({a.role})</option>)}
              </select>
              {isGerenciaOrAuditorSinEquipo && !form.supervisor && (
                <p className={cn("text-xs mt-1", theme === "dark" ? "text-cyan-400" : "text-cyan-600")}>
                  Primero selecciona un supervisor
                </p>
              )}
            </div>
          )}

          {/* Checkbox "Venta propia" - para Supervisores y Encargados */}
          {(isSupervisor || isEncargado) && !perteneceOtroSupervisor && (
            <div className={cn(
              "p-3 rounded-lg border",
              ventaPropia
                ? (theme === "dark" ? "bg-green-500/10 border-green-500/30" : "bg-green-50 border-green-200")
                : (theme === "dark" ? "bg-gray-500/10 border-gray-500/30" : "bg-gray-50 border-gray-200")
            )}>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ventaPropia"
                  checked={ventaPropia}
                  onChange={(e) => {
                    setVentaPropia(e.target.checked)
                    if (!e.target.checked) {
                      // Al desactivar, limpiar asignaciones
                      setForm(prev => ({ ...prev, asesor: '', supervisor: '' }))
                    }
                  }}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="ventaPropia" className={cn(
                  "text-sm font-medium",
                  ventaPropia
                    ? (theme === "dark" ? "text-green-400" : "text-green-700")
                    : (theme === "dark" ? "text-gray-400" : "text-gray-700")
                )}>
                  Venta propia
                </label>
              </div>
              {ventaPropia && (
                <div className="mt-2 space-y-1">
                  <p className={cn("text-xs", theme === "dark" ? "text-green-400/80" : "text-green-600")}>
                    👤 <strong>Asesor:</strong> {user?.nombre || "Tu usuario"}
                  </p>
                  <p className={cn("text-xs", theme === "dark" ? "text-green-400/80" : "text-green-600")}>
                    👑 <strong>Supervisor:</strong> {elianaSuarez?.nombre || "Eliana Suarez (cargando...)"}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Indicador para asesores: la venta se asigna a ellos automáticamente */}
          {isAsesor && (
            <div className={cn(
              "p-3 rounded-lg border",
              theme === "dark" ? "bg-cyan-500/10 border-cyan-500/30" : "bg-cyan-50 border-cyan-200"
            )}>
              <p className={cn("text-sm", theme === "dark" ? "text-cyan-400" : "text-cyan-700")}>
                👤 <strong>Asesor:</strong> {user?.nombre || "Tu usuario"}
              </p>
              <p className={cn("text-xs mt-1", theme === "dark" ? "text-cyan-400/70" : "text-cyan-600")}>
                La venta se registrará automáticamente a tu nombre
              </p>
            </div>
          )}

          {/* Campo: Validador asignado */}
          <div>
            <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
              Validador <span className="text-red-500">*</span>
            </label>
            <select
              value={form.validador}
              onChange={(e) => handleChange("validador", e.target.value)}
              className={cn(
                "w-full px-3 py-2 rounded-lg border text-sm",
                theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"
              )}
              required
            >
              <option value="">-- Seleccionar validador --</option>
              {validadores.map(v => <option key={v._id} value={v._id}>{v.nombre} ({v.role})</option>)}
            </select>

            {/* Checkbox para ver auditores de otros equipos */}
            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                id="otroEquipo"
                checked={otroEquipo}
                onChange={(e) => setOtroEquipo(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <label htmlFor="otroEquipo" className={cn("text-xs", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                Pertenece a otro equipo
              </label>
            </div>
            <p className={cn("text-xs mt-1", theme === "dark" ? "text-gray-500" : "text-gray-500")}>
              Selecciona un compañero de tu equipo que validará la venta
            </p>
          </div>

          {/* Campo: Datos adicionales */}
          <div>
            <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
              Datos extra (opcional)
            </label>
            <textarea
              placeholder="Ejemplo: Afiliado con familiares, enfermedad preexistente, observaciones..."
              value={form.datosExtra}
              onChange={(e) => handleChange("datosExtra", e.target.value)}
              rows={3}
              className={cn(
                "w-full px-3 py-2 rounded-lg border text-sm resize-none",
                theme === "dark"
                  ? "bg-white/5 border-white/10 text-white placeholder-gray-500"
                  : "bg-white border-gray-200 text-gray-800 placeholder-gray-400"
              )}
            />
          </div>

          {/* Botón de envío */}
          <button
            type="submit"
            disabled={loading}
            className={cn(
              "w-full px-6 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2",
              loading ? "opacity-50 cursor-not-allowed" : "",
              theme === "dark"
                ? "bg-gradient-to-r from-cyan-500 to-teal-500 text-white hover:from-cyan-600 hover:to-teal-600"
                : "bg-gradient-to-r from-cyan-500 to-teal-500 text-white hover:from-cyan-600 hover:to-teal-600"
            )}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {loading ? "Creando..." : "Crear Auditoría"}
          </button>
        </form>
      </div>
    </div>
  )
}
