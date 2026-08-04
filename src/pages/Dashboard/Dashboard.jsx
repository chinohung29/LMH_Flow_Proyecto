import { useEffect, useMemo, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { Link } from 'react-router-dom'
import DashboardLayout from '../../components/DashboardLayout'
import { useAuth } from '../../context/AuthContext'
import { useEmpresa } from '../../context/EmpresaContext'
import { listCuentas } from '../../services/cuentas'
import { listMovimientos } from '../../services/movimientos'
import { calcularResumenPorMoneda, calcularSemaforo } from '../../utils/resumen'
import { agruparFlujo } from '../../utils/flujo'
import { formatCurrency, formatDate } from '../../utils/format'
import { generarInsightsIA } from '../../services/ia'
import { tienePlanLimitado } from '../../utils/planes'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

const SEMAFORO_STYLES = {
  verde: 'bg-success/10 text-success border-success/40',
  amarillo: 'bg-warning/10 text-warning border-warning/40',
  rojo: 'bg-danger/10 text-danger border-danger/40',
}

const NOMBRE_MONEDA = { ARS: 'Pesos ($)', USD: 'Dólares (US$)' }

export default function Dashboard() {
  const { user, profile } = useAuth()
  const { empresaActiva } = useEmpresa()
  const [cuentas, setCuentas] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!empresaActiva) return
    setLoading(true)
    Promise.all([listCuentas(empresaActiva.id), listMovimientos({ empresaId: empresaActiva.id })])
      .then(([c, m]) => {
        setCuentas(c)
        setMovimientos(m)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [empresaActiva?.id])

  const resumenes = useMemo(
    () => calcularResumenPorMoneda(movimientos, cuentas),
    [movimientos, cuentas]
  )
  const nombre = user?.user_metadata?.nombre

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-white">
          Hola{nombre ? `, ${nombre}` : ''} 👋
        </h1>
        <p className="text-metal-300">Este es el estado de tu flujo de caja hoy.</p>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-4 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <AnalisisIA plan={profile?.plan} />

      {loading ? (
        <p className="text-sm text-metal-400">Cargando…</p>
      ) : (
        <div className="space-y-8">
          {resumenes.map((resumen) => (
            <MonedaSection
              key={resumen.moneda}
              resumen={resumen}
              movimientos={movimientos.filter((m) => m.moneda === resumen.moneda)}
              cuentas={cuentas.filter((c) => c.moneda === resumen.moneda)}
              mostrarEtiqueta={resumenes.length > 1}
            />
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}

function MonedaSection({ resumen, movimientos, cuentas, mostrarEtiqueta }) {
  const semaforo = calcularSemaforo(resumen)
  const { labels, saldos } = useMemo(
    () => agruparFlujo(movimientos, cuentas, 'diario'),
    [movimientos, cuentas]
  )

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Saldo proyectado',
        data: saldos,
        borderColor: '#2B86EE',
        backgroundColor: 'rgba(43, 134, 238, 0.15)',
        pointRadius: 0,
        tension: 0.35,
        fill: true,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#15181D',
        borderColor: '#2A2F38',
        borderWidth: 1,
        callbacks: {
          label: (ctx) => formatCurrency(ctx.parsed.y, resumen.moneda),
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#9CA3AF', maxRotation: 0, autoSkip: true } },
      y: {
        grid: { color: '#20242B' },
        ticks: {
          color: '#9CA3AF',
          callback: (value) => formatCurrency(value, resumen.moneda),
        },
      },
    },
  }

  return (
    <div>
      <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        {mostrarEtiqueta ? (
          <h2 className="font-display text-lg font-semibold text-white">
            {NOMBRE_MONEDA[resumen.moneda] ?? resumen.moneda}
          </h2>
        ) : (
          <span />
        )}
        <span
          className={`w-fit rounded-full border px-4 py-1.5 text-sm font-medium ${SEMAFORO_STYLES[semaforo.nivel]}`}
        >
          Semáforo financiero: {semaforo.label}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Saldo disponible"
          value={resumen.saldoDisponible}
          moneda={resumen.moneda}
        />
        <StatCard
          label="Saldo proyectado"
          value={resumen.saldoProyectado}
          moneda={resumen.moneda}
        />
        <StatCard
          label="Cobros pendientes"
          value={resumen.cobrosPendientes}
          moneda={resumen.moneda}
          accent="text-success"
        />
        <StatCard
          label="Pagos pendientes"
          value={resumen.pagosPendientes}
          moneda={resumen.moneda}
          accent="text-danger"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">Proyección de flujo de caja</h3>
              <p className="text-sm text-metal-400">Próximos días</p>
            </div>
            <Link to="/flujo" className="text-sm text-electric-400 hover:text-electric-300">
              Ver detalle →
            </Link>
          </div>
          <div className="mt-4 h-64">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">Próximos vencimientos</h3>
            <Link to="/calendario" className="text-sm text-electric-400 hover:text-electric-300">
              Ver todos →
            </Link>
          </div>
          {resumen.proximosVencimientos.length === 0 ? (
            <p className="mt-4 text-sm text-metal-400">
              No tenés cobros ni pagos pendientes cargados.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {resumen.proximosVencimientos.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-white">{v.descripcion}</p>
                    <p className="text-xs text-metal-400">{formatDate(v.fecha)}</p>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-medium ${
                      v.tipo === 'ingreso' ? 'text-success' : 'text-danger'
                    }`}
                  >
                    {v.tipo === 'ingreso' ? '+' : '-'}
                    {formatCurrency(v.monto, resumen.moneda)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, moneda, accent = 'text-white' }) {
  return (
    <div className="card">
      <p className="text-sm text-metal-400">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${accent}`}>{formatCurrency(value, moneda)}</p>
    </div>
  )
}

const TIPO_INSIGHT_STYLES = {
  alerta: 'border-danger/40 bg-danger/10 text-danger',
  oportunidad: 'border-success/40 bg-success/10 text-success',
  info: 'border-electric-500/40 bg-electric-500/10 text-electric-300',
}
const TIPO_INSIGHT_ICONO = { alerta: '⚠️', oportunidad: '💡', info: 'ℹ️' }

function AnalisisIA({ plan }) {
  const [insights, setInsights] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const tieneAcceso = !tienePlanLimitado(plan)

  async function generar() {
    setCargando(true)
    setError('')
    try {
      const data = await generarInsightsIA()
      setInsights(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  if (!tieneAcceso) {
    return (
      <div className="card mb-8 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-semibold text-white">🤖 Análisis con IA</h2>
          <p className="text-sm text-metal-300">
            Disponible en el plan Platinum: observaciones automáticas sobre tu estado financiero.
          </p>
        </div>
        <Link to="/configuracion" className="btn-secondary shrink-0 text-sm">
          Actualizar plan
        </Link>
      </div>
    )
  }

  return (
    <div className="card mb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-white">🤖 Análisis con IA</h2>
          <p className="text-sm text-metal-300">
            Observaciones automáticas sobre tu estado financiero.
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary shrink-0 text-sm"
          onClick={generar}
          disabled={cargando}
        >
          {cargando ? 'Analizando…' : insights ? 'Volver a analizar' : 'Analizar con IA'}
        </button>
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {insights && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {insights.map((ins, i) => (
            <div
              key={i}
              className={`rounded-xl border p-4 ${TIPO_INSIGHT_STYLES[ins.tipo] ?? TIPO_INSIGHT_STYLES.info}`}
            >
              <p className="font-medium">
                {TIPO_INSIGHT_ICONO[ins.tipo] ?? 'ℹ️'} {ins.titulo}
              </p>
              <p className="mt-1 text-sm opacity-90">{ins.descripcion}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
