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
import { listCuentas } from '../../services/cuentas'
import { listMovimientos } from '../../services/movimientos'
import { calcularResumen, calcularSemaforo } from '../../utils/resumen'
import { agruparFlujo } from '../../utils/flujo'
import { formatCurrency, formatDate } from '../../utils/format'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

const SEMAFORO_STYLES = {
  verde: 'bg-success/10 text-success border-success/40',
  amarillo: 'bg-warning/10 text-warning border-warning/40',
  rojo: 'bg-danger/10 text-danger border-danger/40',
}

export default function Dashboard() {
  const { user } = useAuth()
  const [cuentas, setCuentas] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([listCuentas(), listMovimientos()])
      .then(([c, m]) => {
        setCuentas(c)
        setMovimientos(m)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const resumen = useMemo(() => calcularResumen(movimientos, cuentas), [movimientos, cuentas])
  const semaforo = calcularSemaforo(resumen)
  const { labels, saldos } = useMemo(
    () => agruparFlujo(movimientos, cuentas, 'diario'),
    [movimientos, cuentas]
  )
  const nombre = user?.user_metadata?.nombre

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Saldo proyectado',
        data: saldos,
        borderColor: '#2B7BFF',
        backgroundColor: 'rgba(43, 123, 255, 0.15)',
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
          label: (ctx) => formatCurrency(ctx.parsed.y),
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#9CA3AF', maxRotation: 0, autoSkip: true } },
      y: {
        grid: { color: '#20242B' },
        ticks: {
          color: '#9CA3AF',
          callback: (value) => formatCurrency(value),
        },
      },
    },
  }

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            Hola{nombre ? `, ${nombre}` : ''} 👋
          </h1>
          <p className="text-metal-300">
            Este es el estado de tu flujo de caja hoy.
          </p>
        </div>
        <span
          className={`w-fit rounded-full border px-4 py-1.5 text-sm font-medium ${SEMAFORO_STYLES[semaforo.nivel]}`}
        >
          Semáforo financiero: {semaforo.label}
        </span>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-4 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Saldo disponible" value={resumen.saldoDisponible} />
        <StatCard label="Saldo proyectado" value={resumen.saldoProyectado} />
        <StatCard
          label="Cobros pendientes"
          value={resumen.cobrosPendientes}
          accent="text-success"
        />
        <StatCard
          label="Pagos pendientes"
          value={resumen.pagosPendientes}
          accent="text-danger"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-white">Proyección de flujo de caja</h2>
              <p className="text-sm text-metal-400">Próximos días</p>
            </div>
            <Link to="/flujo" className="text-sm text-electric-400 hover:text-electric-300">
              Ver detalle →
            </Link>
          </div>
          <div className="mt-4 h-64">
            {loading ? (
              <p className="text-sm text-metal-400">Cargando…</p>
            ) : (
              <Line data={chartData} options={chartOptions} />
            )}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white">Próximos vencimientos</h2>
            <Link to="/calendario" className="text-sm text-electric-400 hover:text-electric-300">
              Ver todos →
            </Link>
          </div>
          {loading ? (
            <p className="mt-4 text-sm text-metal-400">Cargando…</p>
          ) : resumen.proximosVencimientos.length === 0 ? (
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
                    {formatCurrency(v.monto)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

function StatCard({ label, value, accent = 'text-white' }) {
  return (
    <div className="card">
      <p className="text-sm text-metal-400">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${accent}`}>{formatCurrency(value)}</p>
    </div>
  )
}
