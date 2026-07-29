import { useEffect, useMemo, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'
import DashboardLayout from '../../components/DashboardLayout'
import { useAuth } from '../../context/AuthContext'
import { useEmpresa } from '../../context/EmpresaContext'
import { listMovimientos } from '../../services/movimientos'
import { listClientes } from '../../services/clientes'
import { listProveedores } from '../../services/proveedores'
import {
  resumenPorCategoria,
  rankingClientes,
  rankingProveedores,
  evolucionMensual,
} from '../../utils/reportes'
import { descargarReporteExcel } from '../../utils/excel'
import { formatCurrency } from '../../utils/format'
import { tienePlanLimitado } from '../../utils/planes'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

const NOMBRE_MONEDA = { ARS: '$', USD: 'US$' }
const COLORES = ['#2B86EE', '#7C9CBF', '#4ADE80', '#FBBF24', '#F87171', '#A78BFA', '#34D399', '#F472B6']

function Doughnut2({ datos, moneda }) {
  if (datos.length === 0) {
    return <p className="text-sm text-metal-500">Sin datos todavía.</p>
  }
  const data = {
    labels: datos.map((d) => d.categoria),
    datasets: [
      {
        data: datos.map((d) => d.total),
        backgroundColor: datos.map((_, i) => COLORES[i % COLORES.length]),
        borderWidth: 0,
      },
    ],
  }
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right', labels: { color: '#9CA3AF', boxWidth: 12, padding: 10 } },
      tooltip: { callbacks: { label: (ctx) => formatCurrency(ctx.parsed, moneda) } },
    },
  }
  return (
    <div className="h-56">
      <Doughnut data={data} options={options} />
    </div>
  )
}

function Ranking({ titulo, datos, moneda }) {
  return (
    <div className="card">
      <h3 className="font-semibold text-white">{titulo}</h3>
      {datos.length === 0 ? (
        <p className="mt-3 text-sm text-metal-500">Sin datos todavía.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {datos.map((d, i) => (
            <li key={d.nombre + i} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-metal-200">
                <span className="text-metal-500">{i + 1}.</span> {d.nombre}
              </span>
              <span className="shrink-0 font-medium text-white">
                {formatCurrency(d.total, moneda)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function Reportes() {
  const { profile } = useAuth()
  const { empresaActiva } = useEmpresa()
  const [movimientos, setMovimientos] = useState([])
  const [clientes, setClientes] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [moneda, setMoneda] = useState('ARS')

  const tieneAcceso = !tienePlanLimitado(profile?.plan)

  useEffect(() => {
    if (!empresaActiva || !tieneAcceso) {
      setLoading(false)
      return
    }
    setLoading(true)
    Promise.all([
      listMovimientos({ empresaId: empresaActiva.id }),
      listClientes(empresaActiva.id),
      listProveedores(empresaActiva.id),
    ])
      .then(([mov, cli, prov]) => {
        setMovimientos(mov)
        setClientes(cli)
        setProveedores(prov)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [empresaActiva?.id, tieneAcceso])

  const monedasDisponibles = useMemo(() => {
    const set = new Set(movimientos.map((m) => m.moneda))
    if (set.size === 0) set.add('ARS')
    return [...set].sort((a) => (a === 'ARS' ? -1 : 1))
  }, [movimientos])

  useEffect(() => {
    if (monedasDisponibles.length > 0 && !monedasDisponibles.includes(moneda)) {
      setMoneda(monedasDisponibles[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monedasDisponibles])

  const movimientosMoneda = useMemo(
    () => movimientos.filter((m) => m.moneda === moneda),
    [movimientos, moneda]
  )

  const categorias = useMemo(() => resumenPorCategoria(movimientosMoneda), [movimientosMoneda])
  const topClientes = useMemo(
    () => rankingClientes(movimientosMoneda, clientes),
    [movimientosMoneda, clientes]
  )
  const topProveedores = useMemo(
    () => rankingProveedores(movimientosMoneda, proveedores),
    [movimientosMoneda, proveedores]
  )
  const evolucion = useMemo(() => evolucionMensual(movimientosMoneda), [movimientosMoneda])

  const categoriasIngreso = categorias[moneda]?.ingreso ?? []
  const categoriasEgreso = categorias[moneda]?.egreso ?? []
  const clientesMoneda = topClientes[moneda] ?? []
  const proveedoresMoneda = topProveedores[moneda] ?? []
  const serieEvolucion = evolucion[moneda]

  const barData = serieEvolucion && {
    labels: serieEvolucion.labels,
    datasets: [
      {
        label: 'Ingresos',
        data: serieEvolucion.ingresos,
        backgroundColor: '#4ADE80',
      },
      {
        label: 'Egresos',
        data: serieEvolucion.egresos,
        backgroundColor: '#F87171',
      },
    ],
  }
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#9CA3AF' } },
      tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y, moneda)}` } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#9CA3AF' } },
      y: {
        grid: { color: '#20242B' },
        ticks: { color: '#9CA3AF', callback: (value) => formatCurrency(value, moneda) },
      },
    },
  }

  function exportar() {
    descargarReporteExcel({
      moneda,
      categoriasIngreso,
      categoriasEgreso,
      clientes: clientesMoneda,
      proveedores: proveedoresMoneda,
      evolucion: serieEvolucion,
    })
  }

  if (!tieneAcceso) {
    return (
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="font-display text-2xl font-semibold text-white">Reportes avanzados</h1>
          <p className="text-metal-300">Análisis detallado de tu operación.</p>
        </div>
        <div className="card mx-auto max-w-md text-center">
          <p className="text-3xl">📊</p>
          <h2 className="mt-3 font-display text-lg font-semibold text-white">
            Función de Plan Platinum
          </h2>
          <p className="mt-2 text-sm text-metal-300">
            Los reportes avanzados (evolución mensual, desglose por categoría y ranking de
            clientes/proveedores) están disponibles en el plan Platinum. Actualizá tu plan para
            acceder.
          </p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-white">Reportes avanzados</h1>
          <p className="text-metal-300">Análisis detallado de tu operación.</p>
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
          <button onClick={exportar} className="btn-secondary" disabled={loading}>
            Exportar a Excel
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-4 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-metal-400">Cargando…</p>
      ) : (
        <div className="space-y-6">
          <div className="card">
            <h2 className="font-semibold text-white">Evolución mensual (últimos 12 meses)</h2>
            <div className="mt-4 h-72">
              {barData ? (
                <Bar data={barData} options={barOptions} />
              ) : (
                <p className="text-sm text-metal-500">Sin datos todavía.</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="card">
              <h2 className="font-semibold text-white">Egresos por categoría</h2>
              <div className="mt-4">
                <Doughnut2 datos={categoriasEgreso} moneda={moneda} />
              </div>
            </div>
            <div className="card">
              <h2 className="font-semibold text-white">Ingresos por categoría</h2>
              <div className="mt-4">
                <Doughnut2 datos={categoriasIngreso} moneda={moneda} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Ranking titulo="Top clientes por facturación" datos={clientesMoneda} moneda={moneda} />
            <Ranking titulo="Top proveedores por gasto" datos={proveedoresMoneda} moneda={moneda} />
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
