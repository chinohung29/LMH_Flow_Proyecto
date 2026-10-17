import { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import AlertasVencimiento from '../../components/AlertasVencimiento'
import { useAuth } from '../../context/AuthContext'
import { useEmpresa } from '../../context/EmpresaContext'
import { listCuentas } from '../../services/cuentas'
import { listCategorias } from '../../services/categorias'
import { listMovimientos, bulkInsertMovimientos } from '../../services/movimientos'
import {
  listRecurrentes,
  createRecurrente,
  updateRecurrente,
  deleteRecurrente,
} from '../../services/recurrentes'
import { recurrentesFaltantes } from '../../utils/avisos'
import { mesActual } from '../../utils/replicar'
import { formatCurrency, formatDate } from '../../utils/format'

const FORM_INICIAL = {
  tipo: 'egreso',
  descripcion: '',
  monto: '',
  diaMes: '1',
  cuentaId: '',
  categoriaId: '',
  moneda: 'ARS',
}

const aNumero = (valor) => Number(String(valor).replace(',', '.'))

export default function Vencimientos() {
  const { user } = useAuth()
  const { empresaActiva } = useEmpresa()
  const [cuentas, setCuentas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [recurrentes, setRecurrentes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')

  const [form, setForm] = useState(FORM_INICIAL)
  const [guardando, setGuardando] = useState(false)
  const [mes, setMes] = useState(mesActual())
  const [montos, setMontos] = useState({})
  const [generando, setGenerando] = useState(false)

  useEffect(() => {
    if (!empresaActiva) return
    setLoading(true)
    Promise.all([
      listCuentas(empresaActiva.id),
      listCategorias(empresaActiva.id),
      listMovimientos({ empresaId: empresaActiva.id }),
      listRecurrentes(empresaActiva.id),
    ])
      .then(([c, cat, mov, rec]) => {
        setCuentas(c)
        setCategorias(cat)
        setMovimientos(mov)
        setRecurrentes(rec)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [empresaActiva?.id])

  const cuentaSeleccionada = cuentas.find((c) => c.id === form.cuentaId)
  const categoriasDelTipo = categorias.filter((c) => c.tipo === form.tipo)
  const faltantes = useMemo(
    () => recurrentesFaltantes(recurrentes, movimientos, mes),
    [recurrentes, movimientos, mes]
  )

  async function handleCrear(e) {
    e.preventDefault()
    const monto = aNumero(form.monto)
    const diaMes = Number(form.diaMes)
    if (!form.descripcion.trim() || !monto || monto <= 0) {
      setError('Completá la descripción y un monto mayor a 0.')
      return
    }
    if (!Number.isInteger(diaMes) || diaMes < 1 || diaMes > 31) {
      setError('El día del mes tiene que estar entre 1 y 31.')
      return
    }
    setGuardando(true)
    setError('')
    try {
      const creado = await createRecurrente({
        userId: user.id,
        empresaId: empresaActiva.id,
        tipo: form.tipo,
        descripcion: form.descripcion.trim(),
        monto,
        moneda: cuentaSeleccionada?.moneda ?? form.moneda,
        dia_mes: diaMes,
        cuenta_id: form.cuentaId || null,
        categoria_id: form.categoriaId || null,
      })
      setRecurrentes((prev) => [...prev, creado].sort((a, b) => a.dia_mes - b.dia_mes))
      setForm((f) => ({ ...FORM_INICIAL, tipo: f.tipo, cuentaId: f.cuentaId }))
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  async function toggleActivo(r) {
    try {
      const actualizado = await updateRecurrente(r.id, { activo: !r.activo })
      setRecurrentes((prev) => prev.map((x) => (x.id === r.id ? actualizado : x)))
    } catch (err) {
      setError(err.message)
    }
  }

  async function eliminar(id) {
    try {
      await deleteRecurrente(id)
      setRecurrentes((prev) => prev.filter((r) => r.id !== id))
    } catch (err) {
      setError(err.message)
    }
  }

  async function generar() {
    const filas = faltantes
      .map(({ recurrenteId, ...fila }) => ({
        ...fila,
        monto: aNumero(montos[recurrenteId] ?? fila.monto),
      }))
      .filter((f) => f.monto > 0)
    if (filas.length === 0) return
    setGenerando(true)
    setError('')
    setAviso('')
    try {
      const nuevos = await bulkInsertMovimientos(user.id, empresaActiva.id, filas)
      setMovimientos((prev) => [...prev, ...nuevos].sort((a, b) => a.fecha.localeCompare(b.fecha)))
      setMontos({})
      setAviso(`${nuevos.length} movimiento(s) pendiente(s) generado(s) para ${mes}.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setGenerando(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-white">Vencimientos</h1>
        <p className="text-metal-300">
          Avisos de pagos y cobros, y gastos fijos que se generan solos cada mes.
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
        <div className="space-y-6">
          <AlertasVencimiento movimientos={movimientos} dias={7} />

          <div className="card">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-semibold text-white">Generar los recurrentes del mes</h2>
                <p className="text-sm text-metal-300">
                  Se crean como pendientes. Ajustá el monto si cambió antes de generar.
                </p>
              </div>
              <input
                type="month"
                aria-label="Mes a generar"
                className="input-field !w-auto"
                value={mes}
                onChange={(e) => setMes(e.target.value)}
              />
            </div>

            {aviso && <p className="mt-3 text-sm text-success">{aviso}</p>}

            {faltantes.length === 0 ? (
              <p className="mt-4 text-sm text-metal-400">
                {recurrentes.some((r) => r.activo)
                  ? 'Todos los recurrentes de este mes ya están generados. ✅'
                  : 'Todavía no cargaste recurrentes. Agregá el primero abajo.'}
              </p>
            ) : (
              <>
                <ul className="mt-4 divide-y divide-metal-800">
                  {faltantes.map((f) => (
                    <li key={f.recurrenteId} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-white">{f.descripcion}</p>
                        <p className="text-xs text-metal-400">
                          {f.tipo === 'ingreso' ? 'Cobro' : 'Pago'} · {formatDate(f.fecha)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-metal-400">{f.moneda === 'USD' ? 'US$' : '$'}</span>
                        <input
                          inputMode="decimal"
                          aria-label={`Monto de ${f.descripcion}`}
                          className="input-field !w-32 text-right"
                          value={montos[f.recurrenteId] ?? String(f.monto).replace('.', ',')}
                          onChange={(e) =>
                            setMontos((prev) => ({
                              ...prev,
                              [f.recurrenteId]: e.target.value.replace(/[^0-9.,]/g, ''),
                            }))
                          }
                        />
                      </div>
                    </li>
                  ))}
                </ul>
                <button type="button" className="btn-primary mt-4" onClick={generar} disabled={generando}>
                  {generando ? 'Generando…' : `Generar ${faltantes.length} movimiento(s)`}
                </button>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <form onSubmit={handleCrear} className="card space-y-3 lg:col-span-1">
              <h2 className="font-semibold text-white">Nuevo recurrente</h2>
              <div className="flex rounded-lg border border-metal-600 p-1">
                {['egreso', 'ingreso'].map((tipo) => (
                  <button
                    type="button"
                    key={tipo}
                    onClick={() => setForm((f) => ({ ...f, tipo, categoriaId: '' }))}
                    className={`flex-1 rounded-md py-1.5 text-sm font-medium capitalize ${
                      form.tipo === tipo
                        ? tipo === 'ingreso'
                          ? 'bg-success/20 text-success'
                          : 'bg-danger/20 text-danger'
                        : 'text-metal-400'
                    }`}
                  >
                    {tipo}
                  </button>
                ))}
              </div>
              <div>
                <label className="label-field" htmlFor="rec-desc">
                  Descripción
                </label>
                <input
                  id="rec-desc"
                  className="input-field"
                  placeholder="Ej: Edenor"
                  value={form.descripcion}
                  onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-field" htmlFor="rec-monto">
                    Monto estimado
                  </label>
                  <input
                    id="rec-monto"
                    inputMode="decimal"
                    placeholder="0,00"
                    className="input-field"
                    value={form.monto}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, monto: e.target.value.replace(/[^0-9.,]/g, '') }))
                    }
                  />
                </div>
                <div>
                  <label className="label-field" htmlFor="rec-dia">
                    Día del mes
                  </label>
                  <input
                    id="rec-dia"
                    type="number"
                    min="1"
                    max="31"
                    className="input-field"
                    value={form.diaMes}
                    onChange={(e) => setForm((f) => ({ ...f, diaMes: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="label-field" htmlFor="rec-cuenta">
                  Cuenta
                </label>
                <select
                  id="rec-cuenta"
                  className="input-field"
                  value={form.cuentaId}
                  onChange={(e) => setForm((f) => ({ ...f, cuentaId: e.target.value }))}
                >
                  <option value="">Sin cuenta</option>
                  {cuentas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} ({c.moneda === 'USD' ? 'US$' : '$'})
                    </option>
                  ))}
                </select>
              </div>
              {!cuentaSeleccionada && (
                <div>
                  <label className="label-field" htmlFor="rec-moneda">
                    Moneda
                  </label>
                  <select
                    id="rec-moneda"
                    className="input-field"
                    value={form.moneda}
                    onChange={(e) => setForm((f) => ({ ...f, moneda: e.target.value }))}
                  >
                    <option value="ARS">$ Pesos</option>
                    <option value="USD">US$ Dólares</option>
                  </select>
                </div>
              )}
              <div>
                <label className="label-field" htmlFor="rec-cat">
                  Categoría
                </label>
                <select
                  id="rec-cat"
                  className="input-field"
                  value={form.categoriaId}
                  onChange={(e) => setForm((f) => ({ ...f, categoriaId: e.target.value }))}
                >
                  <option value="">Sin categoría</option>
                  {categoriasDelTipo.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn-primary w-full" disabled={guardando}>
                {guardando ? 'Guardando…' : 'Agregar recurrente'}
              </button>
            </form>

            <div className="card lg:col-span-2">
              <h2 className="font-semibold text-white">Recurrentes cargados</h2>
              {recurrentes.length === 0 ? (
                <p className="mt-4 text-sm text-metal-400">
                  Cargá tus gastos fijos (luz, internet, alquiler, suscripciones) una sola vez.
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-metal-800">
                  {recurrentes.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className={`min-w-0 ${r.activo ? '' : 'opacity-50'}`}>
                        <p className="truncate text-sm text-white">{r.descripcion}</p>
                        <p className="text-xs text-metal-400">
                          Todos los {r.dia_mes} · {r.tipo === 'ingreso' ? 'cobro' : 'pago'}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span
                          className={`text-sm font-medium ${r.tipo === 'ingreso' ? 'text-success' : 'text-danger'}`}
                        >
                          {formatCurrency(r.monto, r.moneda)}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleActivo(r)}
                          className="text-xs text-electric-400 hover:text-electric-300"
                        >
                          {r.activo ? 'Pausar' : 'Activar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => eliminar(r.id)}
                          className="text-xs text-metal-400 hover:text-danger"
                        >
                          Eliminar
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
