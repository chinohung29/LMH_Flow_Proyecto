import { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import { useEmpresa } from '../../context/EmpresaContext'
import { listCuentas } from '../../services/cuentas'
import { listMovimientos, updateMovimiento } from '../../services/movimientos'
import { formatCurrency, formatDate } from '../../utils/format'
import { calcularDia, fechaLocal, sumarDias } from '../../utils/hoy'

function FilaMovimiento({ mov, acciones }) {
  const esIngreso = mov.tipo === 'ingreso'
  return (
    <li className="flex items-center justify-between gap-3 py-2 text-sm">
      <div className="min-w-0">
        <p className="truncate text-white">{mov.descripcion}</p>
        <p className="text-xs text-metal-400">
          {formatDate(mov.fecha)}
          {mov.categoria?.nombre ? ` · ${mov.categoria.nombre}` : ''}
          {mov.estado === 'realizado' ? ' · realizado' : ''}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className={esIngreso ? 'text-success' : 'text-danger'}>
          {esIngreso ? '+' : '−'}
          {formatCurrency(mov.monto, mov.moneda)}
        </span>
        {acciones}
      </div>
    </li>
  )
}

export default function Hoy() {
  const { empresaActiva } = useEmpresa()
  const hoy = fechaLocal()
  const [dia, setDia] = useState(hoy)
  const [cuentas, setCuentas] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!empresaActiva) return
    let activo = true
    setLoading(true)
    setError('')
    Promise.all([listCuentas(empresaActiva.id), listMovimientos({ empresaId: empresaActiva.id })])
      .then(([c, m]) => {
        if (!activo) return
        setCuentas(c)
        setMovimientos(m)
      })
      .catch((err) => activo && setError(err.message))
      .finally(() => activo && setLoading(false))
    return () => {
      activo = false
    }
  }, [empresaActiva])

  const vistas = useMemo(() => {
    const monedas = new Set([...cuentas.map((c) => c.moneda), ...movimientos.map((m) => m.moneda)])
    if (monedas.size === 0) monedas.add('ARS')
    return [...monedas]
      .sort((a) => (a === 'ARS' ? -1 : 1))
      .map((moneda) => calcularDia({ movimientos, cuentas, moneda, dia }))
  }, [movimientos, cuentas, dia])

  async function actualizar(mov, patch) {
    setError('')
    try {
      const actualizado = await updateMovimiento(mov.id, patch)
      setMovimientos((prev) => prev.map((m) => (m.id === mov.id ? actualizado : m)))
    } catch (err) {
      setError(err.message)
    }
  }

  const botonAccion = 'text-xs text-electric-400 hover:text-electric-300'

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-white">Hoy</h1>
          <p className="text-metal-300">Con cuánto contás en el día. Lo vencido queda aparte.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-secondary text-sm"
            aria-label="Día anterior"
            onClick={() => setDia((d) => sumarDias(d, -1))}
          >
            ←
          </button>
          <input
            type="date"
            className="input-field"
            value={dia}
            onChange={(e) => e.target.value && setDia(e.target.value)}
          />
          <button
            type="button"
            className="btn-secondary text-sm"
            aria-label="Día siguiente"
            onClick={() => setDia((d) => sumarDias(d, 1))}
          >
            →
          </button>
          {dia !== hoy && (
            <button type="button" className="btn-secondary text-sm" onClick={() => setDia(hoy)}>
              Hoy
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-4 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      {loading && <p className="text-metal-300">Cargando…</p>}

      {!loading &&
        vistas.map((v) => (
          <section key={v.moneda} className="mb-10 space-y-4">
            {vistas.length > 1 && <h2 className="font-semibold text-white">{v.moneda}</h2>}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="card">
                <p className="text-sm text-metal-300">Disponible al {formatDate(dia)}</p>
                <p className="mt-1 text-3xl font-semibold text-white">
                  {formatCurrency(v.disponible, v.moneda)}
                </p>
                <p className="mt-1 text-xs text-metal-400">Saldo inicial + realizado hasta ese día.</p>
              </div>
              <div className="card">
                <p className="text-sm text-metal-300">Al cierre del día</p>
                <p className="mt-1 text-3xl font-semibold text-white">
                  {formatCurrency(v.cierreDia, v.moneda)}
                </p>
                <p className="mt-1 text-xs text-metal-400">Suma lo pendiente de ese mismo día.</p>
              </div>
              <div className="card">
                <p className="text-sm text-metal-300">Tras los próximos 7 días</p>
                <p className="mt-1 text-3xl font-semibold text-white">
                  {formatCurrency(v.proyeccion, v.moneda)}
                </p>
                <p className="mt-1 text-xs text-metal-400">
                  {v.proximos.length} pendiente(s) hasta el {formatDate(v.hasta)}.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="card">
                <h3 className="font-semibold text-white">Movimientos del día</h3>
                {v.delDia.length === 0 ? (
                  <p className="mt-2 text-sm text-metal-400">Sin movimientos este día.</p>
                ) : (
                  <ul className="mt-2 divide-y divide-metal-700">
                    {v.delDia.map((m) => (
                      <FilaMovimiento
                        key={m.id}
                        mov={m}
                        acciones={
                          m.estado === 'pendiente' && (
                            <button
                              type="button"
                              className={botonAccion}
                              onClick={() => actualizar(m, { estado: 'realizado' })}
                            >
                              Marcar realizado
                            </button>
                          )
                        }
                      />
                    ))}
                  </ul>
                )}
              </div>

              <div className="card">
                <h3 className="font-semibold text-white">Próximos 7 días</h3>
                {v.proximos.length === 0 ? (
                  <p className="mt-2 text-sm text-metal-400">Nada pendiente en la semana.</p>
                ) : (
                  <ul className="mt-2 divide-y divide-metal-700">
                    {v.proximos.map((m) => (
                      <FilaMovimiento key={m.id} mov={m} />
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="card border-warning/40">
              <h3 className="font-semibold text-white">Atrasados ({v.atrasados.length})</h3>
              <p className="text-xs text-metal-400">
                Pendientes anteriores al {formatDate(dia)}. No cuentan en lo que tenés disponible.
                Pasalos a este día si todavía los vas a cobrar o pagar, o marcalos como realizados.
              </p>
              {v.atrasados.length === 0 ? (
                <p className="mt-2 text-sm text-metal-400">No hay nada atrasado.</p>
              ) : (
                <ul className="mt-2 divide-y divide-metal-700">
                  {v.atrasados.map((m) => (
                    <FilaMovimiento
                      key={m.id}
                      mov={m}
                      acciones={
                        <>
                          <button
                            type="button"
                            className={botonAccion}
                            onClick={() => actualizar(m, { fecha: dia })}
                          >
                            Pasar a este día
                          </button>
                          <button
                            type="button"
                            className={botonAccion}
                            onClick={() => actualizar(m, { estado: 'realizado' })}
                          >
                            Realizado
                          </button>
                        </>
                      }
                    />
                  ))}
                </ul>
              )}
            </div>
          </section>
        ))}
    </DashboardLayout>
  )
}
