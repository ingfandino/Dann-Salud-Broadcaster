/**
 * ============================================================
 * CONTABILIDAD - GESTIÓN DE GASTOS MENSUALES
 * ============================================================
 * Interfaz completa para registro, visualización y análisis
 * de gastos mensuales de la empresa.
 * 
 * Acceso: Gerencia y Encargado
 */

"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  FileText, 
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  Calendar,
  Download,
  X,
  Sparkles
} from "lucide-react"
import { toast } from "sonner"
import { Line } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface Expense {
  _id: string
  fecha: string
  categoria: string
  descripcion: string
  monto: number
  metodoPago: string
  responsable: {
    _id: string
    nombre: string
    email: string
  }
  notas?: string
  createdBy: {
    nombre: string
  }
  createdAt: string
}

interface ExpenseStats {
  currentMonth: {
    total: number
    count: number
  }
  lastMonth: {
    total: number
  }
  quarter: {
    total: number
  }
  variation: number
  byCategory: Array<{
    _id: string
    total: number
    count: number
  }>
  monthlyTrend: Array<{
    _id: {
      year: number
      month: number
    }
    total: number
    count: number
  }>
}

const CATEGORIAS = [
  'Salarios',
  'Servicios',
  'Marketing',
  'Tecnología',
  'Oficina',
  'Transporte',
  'Capacitación',
  'Legal',
  'Impuestos',
  'Otros'
]

const METODOS_PAGO = [
  'Efectivo',
  'Transferencia',
  'Tarjeta de Crédito',
  'Tarjeta de Débito',
  'Cheque'
]

const MOTIVATIONAL_QUOTES = [
  { text: "El éxito no es la clave de la felicidad. La felicidad es la clave del éxito.", author: "Albert Schweitzer" },
  { text: "No cuentes los días, haz que los días cuenten.", author: "Muhammad Ali" },
  { text: "El dinero es solo una herramienta. Te llevará a donde desees, pero no te reemplazará como conductor.", author: "Ayn Rand" },
  { text: "La riqueza consiste mucho más en el disfrute que en la posesión.", author: "Aristóteles" },
  { text: "No ahorres lo que te queda después de gastar, gasta lo que te queda después de ahorrar.", author: "Warren Buffett" },
  { text: "El precio es lo que pagas. El valor es lo que obtienes.", author: "Warren Buffett" },
  { text: "La inversión en conocimiento paga el mejor interés.", author: "Benjamin Franklin" },
  { text: "El éxito es la suma de pequeños esfuerzos repetidos día tras día.", author: "Robert Collier" },
  { text: "No esperes. El momento nunca será el perfecto.", author: "Napoleon Hill" },
  { text: "La disciplina es el puente entre metas y logros.", author: "Jim Rohn" }
]

export function Contabilidad() {
  const { theme } = useTheme()
  const { user } = useAuth()
  
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [stats, setStats] = useState<ExpenseStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [users, setUsers] = useState<any[]>([])
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMonth, setSelectedMonth] = useState<string>("")
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())
  const [selectedCategory, setSelectedCategory] = useState<string>("Todas")
  
  // Formulario
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    categoria: '',
    descripcion: '',
    monto: '',
    metodoPago: '',
    responsable: '',
    notas: ''
  })
  
  // Quote del día
  const [dailyQuote] = useState(() => {
    const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
    return MOTIVATIONAL_QUOTES[dayOfYear % MOTIVATIONAL_QUOTES.length]
  })

  useEffect(() => {
    loadData()
    loadUsers()
  }, [selectedMonth, selectedYear, selectedCategory, searchTerm])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Construir query params
      const params = new URLSearchParams()
      if (selectedMonth) params.append('mes', selectedMonth)
      if (selectedYear) params.append('anio', selectedYear)
      if (selectedCategory && selectedCategory !== 'Todas') params.append('categoria', selectedCategory)
      if (searchTerm) params.append('search', searchTerm)
      
      const [expensesRes, statsRes] = await Promise.all([
        fetch(`/api/expenses?${params.toString()}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }),
        fetch('/api/expenses/stats', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
      ])
      
      if (expensesRes.ok && statsRes.ok) {
        const expensesData = await expensesRes.json()
        const statsData = await statsRes.json()
        setExpenses(expensesData.data || [])
        setStats(statsData.data)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (res.ok) {
        const data = await res.json()
        setUsers(data || [])
      }
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.categoria || !formData.descripcion || !formData.monto || !formData.metodoPago || !formData.responsable) {
      toast.error('Por favor complete todos los campos obligatorios')
      return
    }
    
    try {
      const url = editingExpense 
        ? `/api/expenses/${editingExpense._id}`
        : '/api/expenses'
      
      const method = editingExpense ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...formData,
          monto: parseFloat(formData.monto)
        })
      })
      
      if (res.ok) {
        toast.success(editingExpense ? 'Gasto actualizado exitosamente' : 'Gasto registrado exitosamente')
        setShowModal(false)
        resetForm()
        loadData()
      } else {
        const error = await res.json()
        toast.error(error.message || 'Error al guardar el gasto')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al guardar el gasto')
    }
  }

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense)
    setFormData({
      fecha: new Date(expense.fecha).toISOString().split('T')[0],
      categoria: expense.categoria,
      descripcion: expense.descripcion,
      monto: expense.monto.toString(),
      metodoPago: expense.metodoPago,
      responsable: expense.responsable._id,
      notas: expense.notas || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este gasto?')) return
    
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (res.ok) {
        toast.success('Gasto eliminado exitosamente')
        loadData()
      } else {
        toast.error('Error al eliminar el gasto')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al eliminar el gasto')
    }
  }

  const resetForm = () => {
    setFormData({
      fecha: new Date().toISOString().split('T')[0],
      categoria: '',
      descripcion: '',
      monto: '',
      metodoPago: '',
      responsable: '',
      notas: ''
    })
    setEditingExpense(null)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getChartData = () => {
    if (!stats?.monthlyTrend) return null
    
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    
    return {
      labels: stats.monthlyTrend.map(item => `${monthNames[item._id.month - 1]} ${item._id.year}`),
      datasets: [
        {
          label: 'Gastos Mensuales',
          data: stats.monthlyTrend.map(item => item.total),
          borderColor: theme === 'dark' ? 'rgb(147, 51, 234)' : 'rgb(0, 199, 148)',
          backgroundColor: theme === 'dark' ? 'rgba(147, 51, 234, 0.1)' : 'rgba(0, 199, 148, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: theme === 'dark' ? 'rgb(147, 51, 234)' : 'rgb(0, 199, 148)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }
      ]
    }
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: theme === 'dark' ? 'rgba(30, 20, 50, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        titleColor: theme === 'dark' ? '#fff' : '#333',
        bodyColor: theme === 'dark' ? '#ddd' : '#666',
        borderColor: theme === 'dark' ? 'rgba(147, 51, 234, 0.3)' : 'rgba(0, 199, 148, 0.3)',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: function(context: any) {
            return formatCurrency(context.parsed.y)
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
          drawBorder: false
        },
        ticks: {
          color: theme === 'dark' ? '#888' : '#666',
          callback: function(value: any) {
            return formatCurrency(value)
          }
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: theme === 'dark' ? '#888' : '#666'
        }
      }
    }
  }

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con Quote Motivacional */}
      <div className={cn(
        "rounded-2xl p-6 backdrop-blur-sm border transition-all duration-300",
        theme === "dark"
          ? "bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-purple-500/20"
          : "bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200/30"
      )}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className={cn(
                "w-5 h-5",
                theme === "dark" ? "text-purple-400" : "text-purple-500"
              )} />
              <h1 className={cn(
                "text-2xl font-bold",
                theme === "dark" ? "text-white" : "text-gray-800"
              )}>
                Contabilidad
              </h1>
            </div>
            <p className={cn(
              "text-sm italic mb-1",
              theme === "dark" ? "text-purple-300" : "text-purple-700"
            )}>
              "{dailyQuote.text}"
            </p>
            <p className={cn(
              "text-xs",
              theme === "dark" ? "text-purple-400/70" : "text-purple-600/70"
            )}>
              — {dailyQuote.author}
            </p>
          </div>
          <button
            onClick={() => {
              resetForm()
              setShowModal(true)
            }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 hover:scale-105",
              theme === "dark"
                ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:shadow-lg hover:shadow-purple-500/30"
                : "bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:shadow-lg hover:shadow-purple-500/30"
            )}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden md:inline">Nuevo Gasto</span>
          </button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gasto del Mes */}
        <div className={cn(
          "rounded-xl p-5 backdrop-blur-sm border transition-all duration-300 hover:scale-105",
          theme === "dark"
            ? "bg-gradient-to-br from-blue-900/30 to-blue-800/20 border-blue-500/20"
            : "bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200/30"
        )}>
          <div className="flex items-center justify-between mb-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              theme === "dark" ? "bg-blue-500/20" : "bg-blue-500/10"
            )}>
              <DollarSign className={cn(
                "w-5 h-5",
                theme === "dark" ? "text-blue-400" : "text-blue-600"
              )} />
            </div>
          </div>
          <p className={cn(
            "text-sm mb-1",
            theme === "dark" ? "text-gray-400" : "text-gray-600"
          )}>
            Gasto del Mes
          </p>
          <p className={cn(
            "text-2xl font-bold",
            theme === "dark" ? "text-white" : "text-gray-800"
          )}>
            {formatCurrency(stats?.currentMonth.total || 0)}
          </p>
        </div>

        {/* Gasto del Trimestre */}
        <div className={cn(
          "rounded-xl p-5 backdrop-blur-sm border transition-all duration-300 hover:scale-105",
          theme === "dark"
            ? "bg-gradient-to-br from-purple-900/30 to-purple-800/20 border-purple-500/20"
            : "bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200/30"
        )}>
          <div className="flex items-center justify-between mb-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              theme === "dark" ? "bg-purple-500/20" : "bg-purple-500/10"
            )}>
              <TrendingUp className={cn(
                "w-5 h-5",
                theme === "dark" ? "text-purple-400" : "text-purple-600"
              )} />
            </div>
          </div>
          <p className={cn(
            "text-sm mb-1",
            theme === "dark" ? "text-gray-400" : "text-gray-600"
          )}>
            Gasto del Trimestre
          </p>
          <p className={cn(
            "text-2xl font-bold",
            theme === "dark" ? "text-white" : "text-gray-800"
          )}>
            {formatCurrency(stats?.quarter.total || 0)}
          </p>
        </div>

        {/* Número de Registros */}
        <div className={cn(
          "rounded-xl p-5 backdrop-blur-sm border transition-all duration-300 hover:scale-105",
          theme === "dark"
            ? "bg-gradient-to-br from-green-900/30 to-green-800/20 border-green-500/20"
            : "bg-gradient-to-br from-green-50 to-green-100/50 border-green-200/30"
        )}>
          <div className="flex items-center justify-between mb-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              theme === "dark" ? "bg-green-500/20" : "bg-green-500/10"
            )}>
              <FileText className={cn(
                "w-5 h-5",
                theme === "dark" ? "text-green-400" : "text-green-600"
              )} />
            </div>
          </div>
          <p className={cn(
            "text-sm mb-1",
            theme === "dark" ? "text-gray-400" : "text-gray-600"
          )}>
            Registros del Mes
          </p>
          <p className={cn(
            "text-2xl font-bold",
            theme === "dark" ? "text-white" : "text-gray-800"
          )}>
            {stats?.currentMonth.count || 0}
          </p>
        </div>

        {/* Variación */}
        <div className={cn(
          "rounded-xl p-5 backdrop-blur-sm border transition-all duration-300 hover:scale-105",
          theme === "dark"
            ? stats && stats.variation >= 0
              ? "bg-gradient-to-br from-red-900/30 to-red-800/20 border-red-500/20"
              : "bg-gradient-to-br from-cyan-900/30 to-cyan-800/20 border-cyan-500/20"
            : stats && stats.variation >= 0
              ? "bg-gradient-to-br from-red-50 to-red-100/50 border-red-200/30"
              : "bg-gradient-to-br from-cyan-50 to-cyan-100/50 border-cyan-200/30"
        )}>
          <div className="flex items-center justify-between mb-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              theme === "dark"
                ? stats && stats.variation >= 0 ? "bg-red-500/20" : "bg-cyan-500/20"
                : stats && stats.variation >= 0 ? "bg-red-500/10" : "bg-cyan-500/10"
            )}>
              {stats && stats.variation >= 0 ? (
                <TrendingUp className={cn(
                  "w-5 h-5",
                  theme === "dark" ? "text-red-400" : "text-red-600"
                )} />
              ) : (
                <TrendingDown className={cn(
                  "w-5 h-5",
                  theme === "dark" ? "text-cyan-400" : "text-cyan-600"
                )} />
              )}
            </div>
          </div>
          <p className={cn(
            "text-sm mb-1",
            theme === "dark" ? "text-gray-400" : "text-gray-600"
          )}>
            Variación vs Mes Anterior
          </p>
          <p className={cn(
            "text-2xl font-bold",
            theme === "dark"
              ? stats && stats.variation >= 0 ? "text-red-400" : "text-cyan-400"
              : stats && stats.variation >= 0 ? "text-red-600" : "text-cyan-600"
          )}>
            {stats && stats.variation >= 0 ? '+' : ''}{stats?.variation.toFixed(1) || 0}%
          </p>
        </div>
      </div>

      {/* Gráfica */}
      {getChartData() && (
        <div className={cn(
          "rounded-xl p-6 backdrop-blur-sm border",
          theme === "dark"
            ? "bg-gradient-to-br from-gray-900/50 to-gray-800/30 border-white/5"
            : "bg-white/80 border-gray-200/30"
        )}>
          <h3 className={cn(
            "text-lg font-semibold mb-4",
            theme === "dark" ? "text-white" : "text-gray-800"
          )}>
            Tendencia de Gastos (Últimos 6 Meses)
          </h3>
          <div className="h-[300px]">
            <Line data={getChartData()!} options={chartOptions} />
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className={cn(
        "rounded-xl p-4 backdrop-blur-sm border",
        theme === "dark"
          ? "bg-gradient-to-br from-gray-900/50 to-gray-800/30 border-white/5"
          : "bg-white/80 border-gray-200/30"
      )}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Búsqueda */}
          <div className="relative">
            <Search className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4",
              theme === "dark" ? "text-gray-500" : "text-gray-400"
            )} />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={cn(
                "w-full pl-10 pr-3 py-2 rounded-lg border text-sm transition-all",
                theme === "dark"
                  ? "bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-purple-500/50"
                  : "bg-white border-gray-200 text-gray-800 placeholder-gray-400 focus:border-purple-500/50"
              )}
            />
          </div>

          {/* Mes */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm transition-all",
              theme === "dark"
                ? "bg-white/5 border-white/10 text-white focus:border-purple-500/50"
                : "bg-white border-gray-200 text-gray-800 focus:border-purple-500/50"
            )}
          >
            <option value="">Todos los meses</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2000, i).toLocaleDateString('es-AR', { month: 'long' })}
              </option>
            ))}
          </select>

          {/* Año */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm transition-all",
              theme === "dark"
                ? "bg-white/5 border-white/10 text-white focus:border-purple-500/50"
                : "bg-white border-gray-200 text-gray-800 focus:border-purple-500/50"
            )}
          >
            {Array.from({ length: 5 }, (_, i) => {
              const year = new Date().getFullYear() - i
              return <option key={year} value={year}>{year}</option>
            })}
          </select>

          {/* Categoría */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm transition-all",
              theme === "dark"
                ? "bg-white/5 border-white/10 text-white focus:border-purple-500/50"
                : "bg-white border-gray-200 text-gray-800 focus:border-purple-500/50"
            )}
          >
            <option value="Todas">Todas las categorías</option>
            {CATEGORIAS.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla de Gastos */}
      <div className={cn(
        "rounded-xl backdrop-blur-sm border overflow-hidden",
        theme === "dark"
          ? "bg-gradient-to-br from-gray-900/50 to-gray-800/30 border-white/5"
          : "bg-white/80 border-gray-200/30"
      )}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={cn(
                "border-b",
                theme === "dark" ? "border-white/5 bg-white/5" : "border-gray-200 bg-gray-50/50"
              )}>
                <th className={cn(
                  "px-4 py-3 text-left text-xs font-semibold",
                  theme === "dark" ? "text-gray-400" : "text-gray-600"
                )}>
                  Fecha
                </th>
                <th className={cn(
                  "px-4 py-3 text-left text-xs font-semibold",
                  theme === "dark" ? "text-gray-400" : "text-gray-600"
                )}>
                  Categoría
                </th>
                <th className={cn(
                  "px-4 py-3 text-left text-xs font-semibold",
                  theme === "dark" ? "text-gray-400" : "text-gray-600"
                )}>
                  Descripción
                </th>
                <th className={cn(
                  "px-4 py-3 text-right text-xs font-semibold",
                  theme === "dark" ? "text-gray-400" : "text-gray-600"
                )}>
                  Monto
                </th>
                <th className={cn(
                  "px-4 py-3 text-left text-xs font-semibold hidden md:table-cell",
                  theme === "dark" ? "text-gray-400" : "text-gray-600"
                )}>
                  Responsable
                </th>
                <th className={cn(
                  "px-4 py-3 text-center text-xs font-semibold",
                  theme === "dark" ? "text-gray-400" : "text-gray-600"
                )}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    <p className={cn(
                      "text-sm",
                      theme === "dark" ? "text-gray-500" : "text-gray-400"
                    )}>
                      No hay gastos registrados
                    </p>
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr
                    key={expense._id}
                    className={cn(
                      "border-b transition-colors",
                      theme === "dark"
                        ? "border-white/5 hover:bg-white/5"
                        : "border-gray-100 hover:bg-gray-50/50"
                    )}
                  >
                    <td className={cn(
                      "px-4 py-3 text-sm",
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    )}>
                      {new Date(expense.fecha).toLocaleDateString('es-AR')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center px-2 py-1 rounded-md text-xs font-medium",
                        theme === "dark"
                          ? "bg-purple-500/20 text-purple-300"
                          : "bg-purple-100 text-purple-700"
                      )}>
                        {expense.categoria}
                      </span>
                    </td>
                    <td className={cn(
                      "px-4 py-3 text-sm max-w-xs truncate",
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    )}>
                      {expense.descripcion}
                    </td>
                    <td className={cn(
                      "px-4 py-3 text-sm text-right font-semibold",
                      theme === "dark" ? "text-white" : "text-gray-800"
                    )}>
                      {formatCurrency(expense.monto)}
                    </td>
                    <td className={cn(
                      "px-4 py-3 text-sm hidden md:table-cell",
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    )}>
                      {expense.responsable.nombre}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(expense)}
                          className={cn(
                            "p-1.5 rounded-lg transition-all hover:scale-110",
                            theme === "dark"
                              ? "hover:bg-blue-500/20 text-blue-400"
                              : "hover:bg-blue-100 text-blue-600"
                          )}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(expense._id)}
                          className={cn(
                            "p-1.5 rounded-lg transition-all hover:scale-110",
                            theme === "dark"
                              ? "hover:bg-red-500/20 text-red-400"
                              : "hover:bg-red-100 text-red-600"
                          )}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Formulario */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={cn(
            "w-full max-w-2xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto",
            theme === "dark"
              ? "bg-gradient-to-br from-gray-900 to-gray-800 border border-white/10"
              : "bg-white border border-gray-200"
          )}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={cn(
                "text-xl font-bold",
                theme === "dark" ? "text-white" : "text-gray-800"
              )}>
                {editingExpense ? 'Editar Gasto' : 'Nuevo Gasto'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false)
                  resetForm()
                }}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  theme === "dark"
                    ? "hover:bg-white/10 text-gray-400"
                    : "hover:bg-gray-100 text-gray-600"
                )}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Fecha */}
                <div>
                  <label className={cn(
                    "block text-sm font-medium mb-2",
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  )}>
                    Fecha *
                  </label>
                  <input
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                    required
                    className={cn(
                      "w-full px-3 py-2 rounded-lg border text-sm transition-all",
                      theme === "dark"
                        ? "bg-white/5 border-white/10 text-white focus:border-purple-500/50"
                        : "bg-white border-gray-200 text-gray-800 focus:border-purple-500/50"
                    )}
                  />
                </div>

                {/* Categoría */}
                <div>
                  <label className={cn(
                    "block text-sm font-medium mb-2",
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  )}>
                    Categoría *
                  </label>
                  <select
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    required
                    className={cn(
                      "w-full px-3 py-2 rounded-lg border text-sm transition-all",
                      theme === "dark"
                        ? "bg-white/5 border-white/10 text-white focus:border-purple-500/50"
                        : "bg-white border-gray-200 text-gray-800 focus:border-purple-500/50"
                    )}
                  >
                    <option value="">Seleccione...</option>
                    {CATEGORIAS.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Monto */}
                <div>
                  <label className={cn(
                    "block text-sm font-medium mb-2",
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  )}>
                    Monto *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.monto}
                    onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                    required
                    placeholder="0.00"
                    className={cn(
                      "w-full px-3 py-2 rounded-lg border text-sm transition-all",
                      theme === "dark"
                        ? "bg-white/5 border-white/10 text-white focus:border-purple-500/50 placeholder-gray-500"
                        : "bg-white border-gray-200 text-gray-800 focus:border-purple-500/50 placeholder-gray-400"
                    )}
                  />
                </div>

                {/* Método de Pago */}
                <div>
                  <label className={cn(
                    "block text-sm font-medium mb-2",
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  )}>
                    Método de Pago *
                  </label>
                  <select
                    value={formData.metodoPago}
                    onChange={(e) => setFormData({ ...formData, metodoPago: e.target.value })}
                    required
                    className={cn(
                      "w-full px-3 py-2 rounded-lg border text-sm transition-all",
                      theme === "dark"
                        ? "bg-white/5 border-white/10 text-white focus:border-purple-500/50"
                        : "bg-white border-gray-200 text-gray-800 focus:border-purple-500/50"
                    )}
                  >
                    <option value="">Seleccione...</option>
                    {METODOS_PAGO.map(metodo => (
                      <option key={metodo} value={metodo}>{metodo}</option>
                    ))}
                  </select>
                </div>

                {/* Responsable */}
                <div className="md:col-span-2">
                  <label className={cn(
                    "block text-sm font-medium mb-2",
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  )}>
                    Responsable *
                  </label>
                  <select
                    value={formData.responsable}
                    onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                    required
                    className={cn(
                      "w-full px-3 py-2 rounded-lg border text-sm transition-all",
                      theme === "dark"
                        ? "bg-white/5 border-white/10 text-white focus:border-purple-500/50"
                        : "bg-white border-gray-200 text-gray-800 focus:border-purple-500/50"
                    )}
                  >
                    <option value="">Seleccione...</option>
                    {users.map(u => (
                      <option key={u._id} value={u._id}>{u.nombre} ({u.email})</option>
                    ))}
                  </select>
                </div>

                {/* Descripción */}
                <div className="md:col-span-2">
                  <label className={cn(
                    "block text-sm font-medium mb-2",
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  )}>
                    Descripción *
                  </label>
                  <input
                    type="text"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    required
                    placeholder="Ej: Pago de servicios de hosting"
                    className={cn(
                      "w-full px-3 py-2 rounded-lg border text-sm transition-all",
                      theme === "dark"
                        ? "bg-white/5 border-white/10 text-white focus:border-purple-500/50 placeholder-gray-500"
                        : "bg-white border-gray-200 text-gray-800 focus:border-purple-500/50 placeholder-gray-400"
                    )}
                  />
                </div>

                {/* Notas */}
                <div className="md:col-span-2">
                  <label className={cn(
                    "block text-sm font-medium mb-2",
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  )}>
                    Notas (opcional)
                  </label>
                  <textarea
                    value={formData.notas}
                    onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                    rows={3}
                    placeholder="Información adicional..."
                    className={cn(
                      "w-full px-3 py-2 rounded-lg border text-sm transition-all resize-none",
                      theme === "dark"
                        ? "bg-white/5 border-white/10 text-white focus:border-purple-500/50 placeholder-gray-500"
                        : "bg-white border-gray-200 text-gray-800 focus:border-purple-500/50 placeholder-gray-400"
                    )}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                  className={cn(
                    "px-4 py-2 rounded-lg font-medium transition-all",
                    theme === "dark"
                      ? "bg-white/5 text-gray-300 hover:bg-white/10"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  )}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={cn(
                    "px-4 py-2 rounded-lg font-medium transition-all hover:scale-105",
                    theme === "dark"
                      ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:shadow-lg hover:shadow-purple-500/30"
                      : "bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:shadow-lg hover:shadow-purple-500/30"
                  )}
                >
                  {editingExpense ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
