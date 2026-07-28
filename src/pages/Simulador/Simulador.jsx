import { useEffect, useMemo, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import DashboardLayout from '../../components/DashboardLayout'
import { listCuentas } from '../../services/cuentas'
import { listMovimientos } from '../../services/movimientos'
import { agruparFlujo } from '../../utils/flujo'
import { aplicarEscenario, ESCENARIOS } from '../../utils/simulador'
import { formatCurrency, formatDate } from '../../utils/format'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

const HOY = new Date().toISOString().slice(0, 10)
const PARAMS_INICIAL = {
  movimientoId: '',
  dias: '7',
  monto: '',
  fecha: HOY,
  descripcion: '',
  cuotas: '12',
  montoCuota: '',
  porcentaje: '10',
}

export default function Simulador() {
  const [cuentas, setCuentas] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [moneda, setMoneda] = useState('ARS')
  const [tipoEscenario, setTipoEscenario] = useState('cobro_retrasado')
  const [params, setParams] = useState(PARAMS_INICIAL)

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
  const cobrosPendientes = useMemo(
    () => movimientosMoneda.filter((m) => m.tipo === 'ingreso' && m.estado === 'pendiente'),
    [movimientosMoneda]
  )

  const movimientosSimulados = useMemo(
    () =>
      aplicarEscenario(movimientosMoneda, {
        tipo: tipoEscenario,
        moneda,
        ...params,
      }),
    [movimientosMoneda, tipoEscenario, moneda, params]
  )

  const flujoActual = useMemo(
    () => agruparFlujo(movimientosMoneda, cuentasMoneda, 'diario'),
    [movimientosMoneda, cuentasMoneda]
  )
  const flujoSimulado = useMemo(
    () => agruparFlujo(movimientosSimulados, cuentasMoneda, 'diario'),
    [movimientosSimulados, cuentasMoneda]
  )

  const saldoMinimoActual = flujoActual.saldos.length ? Math.min(...flujoActual.saldos) : 0
  const saldoMinimoSimulado = flujoSimulado.saldos.length ? Math.min(...flujoSimulado.saldos) : 0

  const chartData = {
    labels: flujoActual.labels,
    datasets: [
      {
        label: 'Flujo actual',
        data: flujoActual.saldos,
        borderColor: '#6B7280',
        borderDash: [5, 4],
        pointRadius: 0,
        tension: 0.3,
        fill: false,
      },
      {
        label: 'Con este escenario',
        data: flujoSimulado.saldos,
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
      legend: {
        position: 'top',
        align: 'end',
        labels: { color: '#9AA4B0', boxWidth: 14, boxHeight: 2 },
      },
      tooltip: {
        backgroundColor: '#15181D',
        borderColor: '#2A2F38',
        borderWidth: 1,
        callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y, moneda)}` },
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

  function actualizarParam(clave, valor) {
    setParams((p) => ({ ...p, [clave]: valor }))
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-white">Simulador financiero</h1>
        <p className="text-metal-300">
          Probá escenarios sin tocar tus datos reales y mirá cómo le pega a tu flujo de caja.
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-4 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-metal-400">Cargando…</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="card lg:col-span-1">
            {monedasDisponibles.length > 1 && (
              <div className="mb-4 flex rounded-lg border border-metal-600 p-1">
                {monedasDisponibles.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMoneda(m)}
                    className={`flex-1 rounded-md py-1.5 text-sm font-medium transition ${
                      moneda === m ? 'bg-electric-600/20 text-electric-300' : 'text-metal-400'
                    }`}
                  >
                    {m === 'USD' ? 'US$' : '$'}
                  </button>
                ))}
              </div>
            )}

            <div>
              <label className="label-field" htmlFor="escenario">
                Escenario
              </label>
              <select
                id="escenario"
                className="input-field"
                value={tipoEscenario}
                onChange={(e) => setTipoEscenario(e.target.value)}
              >
                {ESCENARIOS.map((esc) => (
                  <option key={esc.id} value={esc.id}>
                    {esc.label}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-metal-400">
                {ESCENARIOS.find((e) => e.id === tipoEscenario)?.descripcion}
              </p>
            </div>

            <div className="mt-4 space-y-3">
              {tipoEscenario === 'cobro_retrasado' && (
                <>
                  <div>
                    <label className="label-field" htmlFor="movimientoId">
                      Cobro pendiente
                    </label>
                    <select
                      id="movimientoId"
                      className="input-field"
                      value={params.movimientoId}
                      onChange={(e) => actualizarParam('movimientoId', e.target.value)}
                    >
                      <option value="">Elegí un cobro pendiente</option>
                      {cobrosPendientes.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.descripcion} · {formatDate(m.fecha)} ·{' '}
                          {formatCurrency(m.monto, m.moneda)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label-field" htmlFor="dias">
                      Días de atraso
                    </label>
                    <input
                      id="dias"
                      type="number"
                      min="1"
                      className="input-field"
                      value={params.dias}
                      onChange={(e) => actualizarParam('dias', e.target.value)}
                    />
                  </div>
                </>
              )}

              {tipoEscenario === 'compra_extraordinaria' && (
                <>
                  <div>
                    <label className="label-field" htmlFor="descripcion">
                      Descripción
                    </label>
                    <input
                      id="descripcion"
                      className="input-field"
                      placeholder="Ej: Reparación de equipo"
                      value={params.descripcion}
                      onChange={(e) => actualizarParam('descripcion', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label-field" htmlFor="monto">
                        Monto
                      </label>
                      <input
                        id="monto"
                        type="text"
                        inputMode="decimal"
                        className="input-field"
                        value={params.monto}
                        onChange={(e) =>
                          actualizarParam('monto', e.target.value.replace(/[^0-9.,]/g, ''))
                        }
                      />
                    </div>
                    <div>
                      <label className="label-field" htmlFor="fecha">
                        Fecha
                      </label>
                      <input
                        id="fecha"
                        type="date"
                        className="input-field"
                        value={params.fecha}
                        onChange={(e) => actualizarParam('fecha', e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}

              {tipoEscenario === 'nuevo_prestamo' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label-field" htmlFor="monto">
                        Monto recibido
                      </label>
                      <input
                        id="monto"
                        type="text"
                        inputMode="decimal"
                        className="input-field"
                        value={params.monto}
                        onChange={(e) =>
                          actualizarParam('monto', e.target.value.replace(/[^0-9.,]/g, ''))
                        }
                      />
                    </div>
                    <div>
                      <label className="label-field" htmlFor="fecha">
                        Fecha
                      </label>
                      <input
                        id="fecha"
                        type="date"
                        className="input-field"
                        value={params.fecha}
                        onChange={(e) => actualizarParam('fecha', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label-field" htmlFor="cuotas">
                        Cuotas
                      </label>
                      <input
                        id="cuotas"
                        type="number"
                        min="1"
                        className="input-field"
                        value={params.cuotas}
                        onChange={(e) => actualizarParam('cuotas', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="label-field" htmlFor="montoCuota">
                        Monto por cuota
                      </label>
                      <input
                        id="montoCuota"
                        type="text"
                        inputMode="decimal"
                        className="input-field"
                        value={params.montoCuota}
                        onChange={(e) =>
                          actualizarParam('montoCuota', e.target.value.replace(/[^0-9.,]/g, ''))
                        }
                      />
                    </div>
                  </div>
                </>
              )}

              {(tipoEscenario === 'incremento_ventas' || tipoEscenario === 'incremento_gastos') && (
                <div>
                  <label className="label-field" htmlFor="porcentaje">
                    Porcentaje de incremento
                  </label>
                  <div className="relative">
                    <input
                      id="porcentaje"
                      type="number"
                      min="0"
                      className="input-field pr-8"
                      value={params.porcentaje}
                      onChange={(e) => actualizarParam('porcentaje', e.target.value)}
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-metal-400">
                      %
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-metal-400">
                    Se aplica a tus {tipoEscenario === 'incremento_ventas' ? 'cobros' : 'pagos'}{' '}
                    pendientes de hoy en adelante.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div className="card">
                <p className="text-sm text-metal-400">Saldo mínimo proyectado (actual)</p>
                <p className="mt-2 text-xl font-semibold text-white">
                  {formatCurrency(saldoMinimoActual, moneda)}
                </p>
              </div>
              <div className="card">
                <p className="text-sm text-metal-400">Saldo mínimo con este escenario</p>
                <p
                  className={`mt-2 text-xl font-semibold ${
                    saldoMinimoSimulado < 0 ? 'text-danger' : 'text-white'
                  }`}
                >
                  {formatCurrency(saldoMinimoSimulado, moneda)}
                </p>
              </div>
            </div>

            {saldoMinimoSimulado < 0 && saldoMinimoActual >= 0 && (
              <p className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-4 py-2 text-sm text-danger">
                Con este escenario, tu saldo proyectado se va a negativo en algún momento.
              </p>
            )}

            <div className="card">
              <h2 className="font-semibold text-white">Flujo de caja: actual vs. simulado</h2>
              <div className="mt-4 h-80">
                <Line data={chartData} options={chartOptions} />
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
