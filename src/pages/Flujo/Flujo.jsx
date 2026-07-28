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
import DashboardLayout from '../../components/DashboardLayout'
import { listCuentas } from '../../services/cuentas'
import { listMovimientos } from '../../services/movimientos'
import { agruparFlujo } from '../../utils/flujo'
import { formatCurrency } from '../../utils/format'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

const VISTAS = [
  { id: 'diario', label: 'Diario' },
  { id: 'semanal', label: 'Semanal' },
  { id: 'mensual', label: 'Mensual' },
]

const NOMBRE_MONEDA = { ARS: '$', USD: 'US$' }

export default function Flujo() {
  const [cuentas, setCuentas] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [vista, setVista] = useState('diario')
  const [moneda, setMoneda] = useState('ARS')

  useEffect(() => {
    Promise.all([listCuentas(), listMovimientos()])
      .then(([c, m]) => {
        setCuentas(c)
        setMovimientos(m)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const monedasDisponibles = useMemo(() => {
    const set = new Set([...cuentas.map((c) => c.moneda), ...movimientos.map((m) => m.moneda)])
    if (set.size === 0) set.add('ARS')
    return [...set].sort((a) => (a === 'ARS' ? -1 : 1))
  }, [cuentas, movimientos])

  useEffect(() => {
    if (monedasDisponibles.length > 0 && !monedasDisponibles.includes(moneda)) {
      setMoneda(monedasDisponibles[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monedasDisponibles])

  const cuentasMoneda = useMemo(
    () => cuentas.filter((c) => c.moneda === moneda),
    [cuentas, moneda]
  )
  const movimientosMoneda = useMemo(
    () => movimientos.filter((m) => m.moneda === moneda),
    [movimientos, moneda]
  )

  const { labels, saldos, saldoHoy } = useMemo(
    () => agruparFlujo(movimientosMoneda, cuentasMoneda, vista),
    [movimientosMoneda, cuentasMoneda, vista]
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
        tension: 0.3,
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
        callbacks: { label: (ctx) => formatCurrency(ctx.parsed.y, moneda) },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#9CA3AF', maxRotation: 0, autoSkip: true } },
      y: {
        grid: { color: '#20242B' },
        ticks: { color: '#9CA3AF', callback: (value) => formatCurrency(value, moneda) },
      },
    },
  }

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-white">Flujo de caja</h1>
          <p className="text-metal-300">Proyección automática a partir de tus movimientos.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {monedasDisponibles.length > 1 && (
            <div className="flex rounded-lg border border-metal-600 p-1">
              {monedasDisponibles.map((m) => (
                <button
                  key={m}
                  onClick={() => setMoneda(m)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    moneda === m ? 'bg-electric-600/20 text-electric-300' : 'text-metal-400'
                  }`}
                >
                  {NOMBRE_MONEDA[m] ?? m}
                </button>
              ))}
            </div>
          )}
          <div className="flex rounded-lg border border-metal-600 p-1">
            {VISTAS.map((v) => (
              <button
                key={v.id}
                onClick={() => setVista(v.id)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  vista === v.id ? 'bg-electric-600/20 text-electric-300' : 'text-metal-400'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-4 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="card">
        <div className="mb-4 flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <div>
            <p className="text-sm text-metal-400">Saldo actual</p>
            <p className="text-xl font-semibold text-white">
              {formatCurrency(saldoHoy ?? 0, moneda)}
            </p>
          </div>
        </div>
        {loading ? (
          <p className="text-sm text-metal-400">Cargando…</p>
        ) : (
          <div className="h-80">
            <Line data={chartData} options={chartOptions} />
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
