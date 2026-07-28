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
import { useAuth } from '../../context/AuthContext'
import {
  resumenFinanciero,
  proximosVencimientos,
  flujoProyectado,
  calcularSemaforo,
} from '../../database/mockData'
import { formatCurrency, formatDate } from '../../utils/format'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

const SEMAFORO_STYLES = {
  verde: 'bg-success/10 text-success border-success/40',
  amarillo: 'bg-warning/10 text-warning border-warning/40',
  rojo: 'bg-danger/10 text-danger border-danger/40',
}

export default function Dashboard() {
  const { user } = useAuth()
  const semaforo = calcularSemaforo(resumenFinanciero)
  const nombre = user?.user_metadata?.nombre

  const chartData = {
    labels: flujoProyectado.labels,
    datasets: [
      {
        label: 'Saldo proyectado',
        data: flujoProyectado.saldos,
        borderColor: '#2B7BFF',
        backgroundColor: 'rgba(43, 123, 255, 0.15)',
        pointBackgroundColor: '#5C9AFF',
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
      x: { grid: { display: false }, ticks: { color: '#9CA3AF' } },
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Saldo disponible" value={resumenFinanciero.saldoDisponible} />
        <StatCard label="Saldo proyectado" value={resumenFinanciero.saldoProyectado} />
        <StatCard
          label="Cobros pendientes"
          value={resumenFinanciero.cobrosPendientes}
          accent="text-success"
        />
        <StatCard
          label="Pagos pendientes"
          value={resumenFinanciero.pagosPendientes}
          accent="text-danger"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="font-semibold text-white">Proyección de flujo de caja</h2>
          <p className="text-sm text-metal-400">Próximos días</p>
          <div className="mt-4 h-64">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold text-white">Próximos vencimientos</h2>
          <ul className="mt-4 space-y-3">
            {proximosVencimientos.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-white">{v.descripcion}</p>
                  <p className="text-xs text-metal-400">{formatDate(v.fecha)}</p>
                </div>
                <span
                  className={`shrink-0 text-sm font-medium ${
                    v.tipo === 'cobro' ? 'text-success' : 'text-danger'
                  }`}
                >
                  {v.tipo === 'cobro' ? '+' : '-'}
                  {formatCurrency(v.monto)}
                </span>
              </li>
            ))}
          </ul>
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
