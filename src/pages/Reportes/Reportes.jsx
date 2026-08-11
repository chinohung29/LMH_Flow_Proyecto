import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
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
import { listCategorias } from '../../services/categorias'
import { listIndicadores, crearIndicador, eliminarIndicador } from '../../services/indicadores'
import {
  resumenPorCategoria,
  rankingClientes,
  rankingProveedores,
  evolucionMensual,
} from '../../utils/reportes'
import { calcularIndicador, formatearIndicador } from '../../utils/indicadores'
import { descargarReporteExcel } from '../../utils/excel'
import { formatCurrency } from '../../utils/format'
import { tienePlanLimitado } from '../../utils/planes'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

const NOMBRE_MONEDA = { ARS: '$', USD: 'US$' }
const COLORES = ['#2B86EE', '#7C9CBF', '#4ADE80', '#FBBF24', '#F87171', '#A78BFA', '#34D399', '#F472B6']
const FORMATO_MES_OPCION = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' })

function labelMes(clave) {
  const [anio, mes] = clave.split('-').map(Number)
  const texto = FORMATO_MES_OPCION.format(new Date(anio, mes - 1, 1))
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

const Doughnut2 = forwardRef(function Doughnut2({ datos, moneda }, ref) {
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
      <Doughnut ref={ref} data={data} options={options} />
    </div>
  )
})

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

const TERMINO_VACIO = () => ({ categoria_id: '', signo: 1 })

function TerminosBuilder({ titulo, categorias, terminos, onChange }) {
  function actualizarTermino(i, patch) {
    onChange(terminos.map((t, idx) => (idx === i ? { ...t, ...patch } : t)))
  }
  function quitarTermino(i) {
    onChange(terminos.filter((_, idx) => idx !== i))
  }
  return (
    <div>
      <p className="label-field">{titulo}</p>
      <div className="space-y-2">
        {terminos.map((t, i) => (
          <div key={i} className="flex items-center gap-2">
            <select
              className="input-field !w-auto !py-1.5 text-sm"
              value={t.signo}
              onChange={(e) => actualizarTermino(i, { signo: Number(e.target.value) })}
            >
              <option value={1}>+</option>
              <option value={-1}>−</option>
            </select>
            <select
              className="input-field text-sm"
              value={t.categoria_id}
              onChange={(e) => actualizarTermino(i, { categoria_id: e.target.value })}
            >
              <option value="">Elegí una categoría…</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} ({c.tipo})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => quitarTermino(i)}
              disabled={terminos.length === 1}
              className="shrink-0 text-xs text-metal-500 hover:text-danger disabled:opacity-30"
            >
              Quitar
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...terminos, TERMINO_VACIO()])}
        className="mt-2 text-xs text-electric-400 hover:text-electric-300"
      >
        + Agregar categoría
      </button>
    </div>
  )
}

function IndicadorForm({ categorias, onCancelar, onGuardar }) {
  const [nombre, setNombre] = useState('')
  const [monedaIndicador, setMonedaIndicador] = useState('ARS')
  const [esRatio, setEsRatio] = useState(false)
  const [formato, setFormato] = useState('moneda')
  const [numerador, setNumerador] = useState([TERMINO_VACIO()])
  const [denominador, setDenominador] = useState([TERMINO_VACIO()])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  function handleToggleRatio(e) {
    const activo = e.target.checked
    setEsRatio(activo)
    setFormato(activo ? 'porcentaje' : 'moneda')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const numeradorLimpio = numerador.filter((t) => t.categoria_id)
    const denominadorLimpio = esRatio ? denominador.filter((t) => t.categoria_id) : []

    if (!nombre.trim()) {
      setError('Ponele un nombre al indicador.')
      return
    }
    if (numeradorLimpio.length === 0) {
      setError('Elegí al menos una categoría.')
      return
    }
    if (esRatio && denominadorLimpio.length === 0) {
      setError('Si es un ratio, elegí al menos una categoría para el denominador.')
      return
    }

    setGuardando(true)
    try {
      await onGuardar({
        nombre: nombre.trim(),
        moneda: monedaIndicador,
        formato,
        numerador: numeradorLimpio,
        denominador: denominadorLimpio,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 space-y-4 rounded-xl border border-metal-700 bg-graphite-900/60 p-4"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label-field" htmlFor="nombreIndicador">
            Nombre
          </label>
          <input
            id="nombreIndicador"
            className="input-field"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder='Ej: "Margen operativo"'
          />
        </div>
        <div>
          <label className="label-field" htmlFor="monedaIndicador">
            Moneda
          </label>
          <select
            id="monedaIndicador"
            className="input-field"
            value={monedaIndicador}
            onChange={(e) => setMonedaIndicador(e.target.value)}
          >
            <option value="ARS">Pesos ($)</option>
            <option value="USD">Dólares (US$)</option>
          </select>
        </div>
      </div>

      <TerminosBuilder
        titulo="Numerador"
        categorias={categorias}
        terminos={numerador}
        onChange={setNumerador}
      />

      <label className="flex items-center gap-2 text-sm text-metal-300">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-metal-600 bg-graphite-800 text-electric-600 focus:ring-electric-500"
          checked={esRatio}
          onChange={handleToggleRatio}
        />
        Es un ratio o porcentaje (dividir por otra suma de categorías)
      </label>

      {esRatio && (
        <TerminosBuilder
          titulo="Denominador"
          categorias={categorias}
          terminos={denominador}
          onChange={setDenominador}
        />
      )}

      <div>
        <label className="label-field" htmlFor="formatoIndicador">
          Cómo mostrarlo
        </label>
        <select
          id="formatoIndicador"
          className="input-field !w-auto"
          value={formato}
          onChange={(e) => setFormato(e.target.value)}
        >
          <option value="moneda">Moneda ({monedaIndicador === 'USD' ? 'US$' : '$'}1.234)</option>
          <option value="numero">Número (1,23)</option>
          <option value="porcentaje">Porcentaje (12,3%)</option>
        </select>
      </div>

      {error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <div className="flex gap-2">
        <button type="submit" className="btn-primary text-sm" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar indicador'}
        </button>
        <button type="button" onClick={onCancelar} className="btn-secondary text-sm">
          Cancelar
        </button>
      </div>
    </form>
  )
}

export default function Reportes() {
  const { user, profile } = useAuth()
  const { empresaActiva } = useEmpresa()
  const [movimientos, setMovimientos] = useState([])
  const [clientes, setClientes] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [categoriasEmpresa, setCategoriasEmpresa] = useState([])
  const [indicadores, setIndicadores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [moneda, setMoneda] = useState('ARS')
  const [mesDesde, setMesDesde] = useState('')
  const [mesHasta, setMesHasta] = useState('')
  const [exportando, setExportando] = useState(false)
  const [mostrarFormIndicador, setMostrarFormIndicador] = useState(false)
  const barRef = useRef(null)
  const doughnutEgresoRef = useRef(null)
  const doughnutIngresoRef = useRef(null)

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
      listCategorias(empresaActiva.id),
      listIndicadores(empresaActiva.id),
    ])
      .then(([mov, cli, prov, cat, ind]) => {
        setMovimientos(mov)
        setClientes(cli)
        setProveedores(prov)
        setCategoriasEmpresa(cat)
        setIndicadores(ind)
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

  const mesesDisponibles = useMemo(() => {
    const set = new Set(movimientosMoneda.map((m) => m.fecha.slice(0, 7)))
    return [...set].sort()
  }, [movimientosMoneda])

  useEffect(() => {
    if (mesesDisponibles.length === 0) return
    setMesDesde((actual) => (mesesDisponibles.includes(actual) ? actual : mesesDisponibles[0]))
    setMesHasta((actual) =>
      mesesDisponibles.includes(actual) ? actual : mesesDisponibles[mesesDisponibles.length - 1]
    )
  }, [mesesDisponibles])

  const filtroActivo = mesDesde && mesHasta && (mesDesde !== mesesDisponibles[0] || mesHasta !== mesesDisponibles[mesesDisponibles.length - 1])

  const movimientosFiltrados = useMemo(() => {
    if (!mesDesde || !mesHasta) return movimientosMoneda
    return movimientosMoneda.filter((m) => {
      const mes = m.fecha.slice(0, 7)
      return mes >= mesDesde && mes <= mesHasta
    })
  }, [movimientosMoneda, mesDesde, mesHasta])

  // Los indicadores tienen su propia moneda (independiente del selector $/US$
  // de la página), así que se calculan sobre todas las monedas y cada uno
  // filtra la suya adentro de calcularIndicador().
  const movimientosPeriodo = useMemo(() => {
    if (!mesDesde || !mesHasta) return movimientos
    return movimientos.filter((m) => {
      const mes = m.fecha.slice(0, 7)
      return mes >= mesDesde && mes <= mesHasta
    })
  }, [movimientos, mesDesde, mesHasta])

  function cambiarMesDesde(valor) {
    setMesDesde(valor)
    if (mesHasta && valor > mesHasta) setMesHasta(valor)
  }

  function cambiarMesHasta(valor) {
    setMesHasta(valor)
    if (mesDesde && valor < mesDesde) setMesDesde(valor)
  }

  const categorias = useMemo(() => resumenPorCategoria(movimientosFiltrados), [movimientosFiltrados])
  const topClientes = useMemo(
    () => rankingClientes(movimientosFiltrados, clientes),
    [movimientosFiltrados, clientes]
  )
  const topProveedores = useMemo(
    () => rankingProveedores(movimientosFiltrados, proveedores),
    [movimientosFiltrados, proveedores]
  )
  const evolucion = useMemo(
    () => evolucionMensual(movimientosFiltrados, mesDesde && mesHasta ? { desde: mesDesde, hasta: mesHasta } : {}),
    [movimientosFiltrados, mesDesde, mesHasta]
  )

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

  const valoresIndicadores = useMemo(
    () =>
      indicadores.map((ind) => ({
        indicador: ind,
        valor: calcularIndicador(ind, movimientosPeriodo),
      })),
    [indicadores, movimientosPeriodo]
  )

  async function handleCrearIndicador(datos) {
    const nuevo = await crearIndicador({
      empresaId: empresaActiva.id,
      userId: user.id,
      ...datos,
    })
    setIndicadores((prev) => [...prev, nuevo])
    setMostrarFormIndicador(false)
  }

  async function handleEliminarIndicador(id) {
    if (!window.confirm('¿Eliminar este indicador?')) return
    await eliminarIndicador(id)
    setIndicadores((prev) => prev.filter((i) => i.id !== id))
  }

  async function exportar() {
    setExportando(true)
    try {
      await descargarReporteExcel({
        moneda,
        categoriasIngreso,
        categoriasEgreso,
        clientes: clientesMoneda,
        proveedores: proveedoresMoneda,
        evolucion: serieEvolucion,
        movimientos: movimientosFiltrados,
        indicadores: valoresIndicadores.map(({ indicador, valor }) => ({
          nombre: indicador.nombre,
          valor: formatearIndicador(valor, indicador),
        })),
        graficos: [
          { titulo: 'Evolución mensual', base64: barRef.current?.toBase64Image() },
          { titulo: 'Egresos por categoría', base64: doughnutEgresoRef.current?.toBase64Image() },
          { titulo: 'Ingresos por categoría', base64: doughnutIngresoRef.current?.toBase64Image() },
        ],
      })
    } finally {
      setExportando(false)
    }
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
          <button onClick={exportar} className="btn-secondary" disabled={loading || exportando}>
            {exportando ? 'Generando…' : 'Exportar a Excel'}
          </button>
        </div>
      </div>

      {mesesDisponibles.length > 1 && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <span className="text-sm text-metal-400">Período:</span>
          <select
            value={mesDesde}
            onChange={(e) => cambiarMesDesde(e.target.value)}
            className="input-field w-auto"
          >
            {mesesDisponibles.map((m) => (
              <option key={m} value={m}>
                {labelMes(m)}
              </option>
            ))}
          </select>
          <span className="text-sm text-metal-400">a</span>
          <select
            value={mesHasta}
            onChange={(e) => cambiarMesHasta(e.target.value)}
            className="input-field w-auto"
          >
            {mesesDisponibles.map((m) => (
              <option key={m} value={m}>
                {labelMes(m)}
              </option>
            ))}
          </select>
          {filtroActivo && (
            <button
              type="button"
              onClick={() => {
                setMesDesde(mesesDisponibles[0])
                setMesHasta(mesesDisponibles[mesesDisponibles.length - 1])
              }}
              className="text-sm text-electric-400 hover:text-electric-300"
            >
              Ver todo el historial
            </button>
          )}
        </div>
      )}

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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-white">Indicadores propios</h2>
                <p className="text-sm text-metal-400">
                  Armá tus propios KPIs combinando categorías (sumas, restas o ratios).
                </p>
              </div>
              <button
                type="button"
                className="btn-secondary text-sm"
                onClick={() => setMostrarFormIndicador((v) => !v)}
              >
                {mostrarFormIndicador ? 'Cancelar' : '+ Crear indicador'}
              </button>
            </div>

            {mostrarFormIndicador && (
              <IndicadorForm
                categorias={categoriasEmpresa}
                onCancelar={() => setMostrarFormIndicador(false)}
                onGuardar={handleCrearIndicador}
              />
            )}

            {valoresIndicadores.length === 0 ? (
              <p className="mt-4 text-sm text-metal-500">
                Todavía no creaste ningún indicador. Ejemplos: "Margen operativo" (Ventas −
                Costos), "% gastos fijos sobre ingresos" (Alquiler + Sueldos / Ventas).
              </p>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {valoresIndicadores.map(({ indicador, valor }) => (
                  <div key={indicador.id} className="rounded-xl border border-metal-700 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-metal-300">{indicador.nombre}</p>
                      <button
                        type="button"
                        onClick={() => handleEliminarIndicador(indicador.id)}
                        className="shrink-0 text-xs text-metal-500 hover:text-danger"
                      >
                        Eliminar
                      </button>
                    </div>
                    <p className="mt-1 text-2xl font-semibold text-white">
                      {formatearIndicador(valor, indicador)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="font-semibold text-white">
              Evolución mensual
              {filtroActivo && mesDesde && mesHasta && (
                <span className="ml-2 text-sm font-normal text-metal-400">
                  ({labelMes(mesDesde)} a {labelMes(mesHasta)})
                </span>
              )}
            </h2>
            <div className="mt-4 h-72">
              {barData ? (
                <Bar ref={barRef} data={barData} options={barOptions} />
              ) : (
                <p className="text-sm text-metal-500">Sin datos todavía.</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="card">
              <h2 className="font-semibold text-white">Egresos por categoría</h2>
              <div className="mt-4">
                <Doughnut2 ref={doughnutEgresoRef} datos={categoriasEgreso} moneda={moneda} />
              </div>
            </div>
            <div className="card">
              <h2 className="font-semibold text-white">Ingresos por categoría</h2>
              <div className="mt-4">
                <Doughnut2 ref={doughnutIngresoRef} datos={categoriasIngreso} moneda={moneda} />
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
