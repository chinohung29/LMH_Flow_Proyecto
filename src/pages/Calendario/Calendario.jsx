import { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import { listMovimientos } from '../../services/movimientos'
import { generarGrillaMes, NOMBRE_MES } from '../../utils/calendar'
import { formatCurrency, formatDate } from '../../utils/format'

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function hoyISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

export default function Calendario() {
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return { anio: d.getFullYear(), mes: d.getMonth() }
  })
  const [diaSeleccionado, setDiaSeleccionado] = useState(hoyISO())

  useEffect(() => {
    listMovimientos()
      .then(setMovimientos)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const porDia = useMemo(() => {
    const mapa = new Map()
    for (const m of movimientos) {
      if (!mapa.has(m.fecha)) mapa.set(m.fecha, [])
      mapa.get(m.fecha).push(m)
    }
    return mapa
  }, [movimientos])

  const celdas = useMemo(
    () => generarGrillaMes(cursor.anio, cursor.mes),
    [cursor]
  )

  const itemsDelDia = porDia.get(diaSeleccionado) ?? []

  function cambiarMes(delta) {
    setCursor((c) => {
      const d = new Date(c.anio, c.mes + delta, 1)
      return { anio: d.getFullYear(), mes: d.getMonth() }
    })
  }

  const tituloMesCrudo = NOMBRE_MES.format(new Date(cursor.anio, cursor.mes, 1))
  const tituloMes = tituloMesCrudo.charAt(0).toUpperCase() + tituloMesCrudo.slice(1)

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-white">Calendario</h1>
          <p className="text-metal-300">Cobros, pagos y vencimientos del mes.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary !px-3 !py-1.5" onClick={() => cambiarMes(-1)}>
            ‹
          </button>
          <span className="w-40 text-center text-sm font-medium text-white">
            {tituloMes}
          </span>
          <button className="btn-secondary !px-3 !py-1.5" onClick={() => cambiarMes(1)}>
            ›
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-4 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          {loading ? (
            <p className="text-sm text-metal-400">Cargando…</p>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-metal-400">
                {DIAS_SEMANA.map((d) => (
                  <div key={d} className="py-2">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {celdas.map((fecha, idx) => {
                  if (!fecha) return <div key={idx} className="aspect-square" />
                  const items = porDia.get(fecha) ?? []
                  const esHoy = fecha === hoyISO()
                  const seleccionado = fecha === diaSeleccionado
                  return (
                    <button
                      key={fecha}
                      onClick={() => setDiaSeleccionado(fecha)}
                      className={`aspect-square rounded-lg border p-1.5 text-left text-xs transition ${
                        seleccionado
                          ? 'border-electric-500 bg-electric-500/10'
                          : 'border-metal-800 hover:border-metal-600'
                      }`}
                    >
                      <span className={esHoy ? 'font-semibold text-electric-300' : 'text-metal-300'}>
                        {Number(fecha.slice(-2))}
                      </span>
                      <div className="mt-1 flex flex-wrap gap-0.5">
                        {items.slice(0, 3).map((it) => (
                          <span
                            key={it.id}
                            className={`h-1.5 w-1.5 rounded-full ${
                              it.tipo === 'ingreso' ? 'bg-success' : 'bg-danger'
                            }`}
                          />
                        ))}
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>

        <div className="card">
          <h2 className="font-semibold text-white">
            {diaSeleccionado ? formatDate(diaSeleccionado) : 'Elegí un día'}
          </h2>
          {itemsDelDia.length === 0 ? (
            <p className="mt-4 text-sm text-metal-400">Sin cobros ni pagos este día.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {itemsDelDia.map((it) => (
                <li key={it.id} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-white">{it.descripcion}</p>
                    <p className="text-xs text-metal-400">
                      {it.tipo === 'ingreso' ? 'Cobro' : 'Pago'} ·{' '}
                      {it.estado === 'realizado' ? 'realizado' : 'pendiente'}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-medium ${
                      it.tipo === 'ingreso' ? 'text-success' : 'text-danger'
                    }`}
                  >
                    {it.tipo === 'ingreso' ? '+' : '-'}
                    {formatCurrency(it.monto)}
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
