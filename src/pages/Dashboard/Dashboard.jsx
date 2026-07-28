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
import { calcularResumenPorMoneda, calcularSemaforo } from '../../utils/resumen'
import { agruparFlujo } from '../../utils/flujo'
import { formatCurrency, formatDate } from '../../utils/format'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

const SEMAFORO_STYLES = {
  verde: 'bg-success/10 text-success border-success/40',
  amarillo: 'bg-warning/10 text-warning border-warning/40',
  rojo: 'bg-danger/10 text-danger border-danger/40',
}

const NOMBRE_MONEDA = { ARS: 'Pesos ($)', USD: 'Dólares (US$)' }

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
