import { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import { useAuth } from '../../context/AuthContext'
import { listCuentas, createCuenta } from '../../services/cuentas'
import { listCategorias, createCategoria } from '../../services/categorias'
import {
  listMovimientos,
  createMovimiento,
  updateMovimiento,
  deleteMovimiento,
} from '../../services/movimientos'
import { formatCurrency, formatDate } from '../../utils/format'
import ExportMovimientosButton from '../../components/ExportMovimientosButton'
import ImportMovimientosButton from '../../components/ImportMovimientosButton'

const HOY = new Date().toISOString().slice(0, 10)

const FORM_INICIAL = {
  tipo: 'ingreso',
  descripcion: '',
  monto: '',
  fecha: HOY,
  cuentaId: '',
  categoriaId: '',
  estado: 'pendiente',
}

export default function Movimientos() {
  const { user } = useAuth()
  const [cuentas, setCuentas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [form, setForm] = useState(FORM_INICIAL)
  const [guardando, setGuardando] = useState(false)

  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroEstado, setFiltroEstado] = useState('todos')

  const [mostrarCuentaForm, setMostrarCuentaForm] = useState(false)
  const [nuevaCuenta, setNuevaCuenta] = useState({ nombre: '', tipo: 'banco' })
  const [mostrarCategoriaForm, setMostrarCategoriaForm] = useState(false)
  const [nuevaCategoria, setNuevaCategoria] = useState({ nombre: '', tipo: 'ingreso' })

  async function cargarTodo() {
    setLoading(true)
    setError('')
    try {
      const [c, cat, mov] = await Promise.all([
        listCuentas(),
        listCategorias(),
        listMovimientos(),
      ])
      setCuentas(c)
      setCategorias(cat)
      setMovimientos(mov)
      setForm((f) => ({
        ...f,
        cuentaId: f.cuentaId || c[0]?.id || '',
      }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarTodo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const categoriasDelTipo = useMemo(
    () => categorias.filter((c) => c.tipo === form.tipo),
    [categorias, form.tipo]
  )

  const movimientosFiltrados = useMemo(() => {
    return movimientos.filter((m) => {
      if (filtroTipo !== 'todos' && m.tipo !== filtroTipo) return false
      if (filtroEstado !== 'todos' && m.estado !== filtroEstado) return false
      return true
    })
  }, [movimientos, filtroTipo, filtroEstado])

  async function handleSubmit(e) {
    e.preventDefault()
    const monto = Number(String(form.monto).replace(',', '.'))
    if (!form.descripcion || !form.monto || !form.fecha) return
    if (!monto || monto <= 0) {
      setError('El monto tiene que ser un número mayor a 0.')
      return
    }
    setGuardando(true)
    setError('')
    try {
      const nuevo = await createMovimiento({
        userId: user.id,
        cuentaId: form.cuentaId || null,
        categoriaId: form.categoriaId || null,
        tipo: form.tipo,
        descripcion: form.descripcion,
        monto,
        fecha: form.fecha,
        estado: form.estado,
      })
      setMovimientos((prev) => [...prev, nuevo].sort((a, b) => a.fecha.localeCompare(b.fecha)))
      setForm((f) => ({ ...FORM_INICIAL, cuentaId: f.cuentaId, tipo: f.tipo }))
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  async function toggleEstado(mov) {
    const nuevoEstado = mov.estado === 'pendiente' ? 'realizado' : 'pendiente'
    try {
      const actualizado = await updateMovimiento(mov.id, { estado: nuevoEstado })
      setMovimientos((prev) => prev.map((m) => (m.id === mov.id ? actualizado : m)))
    } catch (err) {
      setError(err.message)
    }
  }

  async function eliminar(id) {
    try {
      await deleteMovimiento(id)
      setMovimientos((prev) => prev.filter((m) => m.id !== id))
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleCrearCuenta(e) {
    e.preventDefault()
    if (!nuevaCuenta.nombre) return
    try {
      const creada = await createCuenta({
        userId: user.id,
        nombre: nuevaCuenta.nombre,
        tipo: nuevaCuenta.tipo,
      })
      setCuentas((prev) => [...prev, creada])
      setNuevaCuenta({ nombre: '', tipo: 'banco' })
      setMostrarCuentaForm(false)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleCrearCategoria(e) {
    e.preventDefault()
    if (!nuevaCategoria.nombre) return
    try {
      const creada = await createCategoria({
        userId: user.id,
        nombre: nuevaCategoria.nombre,
        tipo: nuevaCategoria.tipo,
      })
      setCategorias((prev) => [...prev, creada])
      setNuevaCategoria({ nombre: '', tipo: 'ingreso' })
      setMostrarCategoriaForm(false)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-white">Movimientos</h1>
          <p className="text-metal-300">Ingresos y egresos de tu caja.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ImportMovimientosButton
            cuentas={cuentas}
            categorias={categorias}
            onImported={(nuevos) =>
              setMovimientos((prev) =>
                [...prev, ...nuevos].sort((a, b) => a.fecha.localeCompare(b.fecha))
              )
            }
            onError={setError}
          />
          <ExportMovimientosButton movimientos={movimientos} />
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-4 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <h2 className="font-semibold text-white">Nuevo movimiento</h2>
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <div className="flex rounded-lg border border-metal-600 p-1">
              {['ingreso', 'egreso'].map((tipo) => (
                <button
                  type="button"
                  key={tipo}
                  onClick={() => setForm((f) => ({ ...f, tipo, categoriaId: '' }))}
                  className={`flex-1 rounded-md py-1.5 text-sm font-medium capitalize transition ${
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
              <label className="label-field" htmlFor="descripcion">
                Descripción
              </label>
              <input
                id="descripcion"
                required
                className="input-field"
                value={form.descripcion}
                onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                placeholder="Ej: Factura #1042"
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
                  placeholder="0,00"
                  required
                  className="input-field"
                  value={form.monto}
                  onChange={(e) => {
                    const valor = e.target.value.replace(/[^0-9.,]/g, '')
                    setForm((f) => ({ ...f, monto: valor }))
                  }}
                />
              </div>
              <div>
                <label className="label-field" htmlFor="fecha">
                  Fecha
                </label>
                <input
                  id="fecha"
                  type="date"
                  required
                  className="input-field"
                  value={form.fecha}
                  onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="label-field" htmlFor="cuenta">
                  Cuenta
                </label>
                <button
                  type="button"
                  className="mb-1.5 text-xs text-electric-400 hover:text-electric-300"
                  onClick={() => setMostrarCuentaForm((v) => !v)}
                >
                  {mostrarCuentaForm ? 'Cancelar' : '+ Nueva cuenta'}
                </button>
              </div>
              {mostrarCuentaForm ? (
                <div className="flex gap-2">
                  <input
                    className="input-field"
                    placeholder="Nombre"
                    value={nuevaCuenta.nombre}
                    onChange={(e) =>
                      setNuevaCuenta((c) => ({ ...c, nombre: e.target.value }))
                    }
                  />
                  <select
                    className="input-field w-28"
                    value={nuevaCuenta.tipo}
                    onChange={(e) => setNuevaCuenta((c) => ({ ...c, tipo: e.target.value }))}
                  >
                    <option value="banco">Banco</option>
                    <option value="caja">Caja</option>
                  </select>
                  <button type="button" className="btn-secondary !px-3" onClick={handleCrearCuenta}>
                    +
                  </button>
                </div>
              ) : (
                <select
                  id="cuenta"
                  className="input-field"
                  value={form.cuentaId}
                  onChange={(e) => setForm((f) => ({ ...f, cuentaId: e.target.value }))}
                >
                  <option value="">Sin cuenta</option>
                  {cuentas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="label-field" htmlFor="categoria">
                  Categoría
                </label>
                <button
                  type="button"
                  className="mb-1.5 text-xs text-electric-400 hover:text-electric-300"
                  onClick={() => setMostrarCategoriaForm((v) => !v)}
                >
                  {mostrarCategoriaForm ? 'Cancelar' : '+ Nueva categoría'}
                </button>
              </div>
              {mostrarCategoriaForm ? (
                <div className="flex gap-2">
                  <input
                    className="input-field"
                    placeholder="Nombre"
                    value={nuevaCategoria.nombre}
                    onChange={(e) =>
                      setNuevaCategoria((c) => ({ ...c, nombre: e.target.value }))
                    }
                  />
                  <select
                    className="input-field w-28"
                    value={nuevaCategoria.tipo}
                    onChange={(e) =>
                      setNuevaCategoria((c) => ({ ...c, tipo: e.target.value }))
                    }
                  >
                    <option value="ingreso">Ingreso</option>
                    <option value="egreso">Egreso</option>
                  </select>
                  <button
                    type="button"
                    className="btn-secondary !px-3"
                    onClick={handleCrearCategoria}
                  >
                    +
                  </button>
                </div>
              ) : (
                <select
                  id="categoria"
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
              )}
            </div>

            <div>
              <label className="label-field" htmlFor="estado">
                Estado
              </label>
              <select
                id="estado"
                className="input-field"
                value={form.estado}
                onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))}
              >
                <option value="pendiente">Pendiente</option>
                <option value="realizado">Realizado</option>
              </select>
            </div>

            <button type="submit" className="btn-primary w-full" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Agregar movimiento'}
            </button>
          </form>
        </div>

        <div className="card lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold text-white">Historial</h2>
            <div className="flex gap-2">
              <select
                className="input-field !w-auto text-sm"
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
              >
                <option value="todos">Todos los tipos</option>
                <option value="ingreso">Ingresos</option>
                <option value="egreso">Egresos</option>
              </select>
              <select
                className="input-field !w-auto text-sm"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
              >
                <option value="todos">Todos los estados</option>
                <option value="pendiente">Pendientes</option>
                <option value="realizado">Realizados</option>
              </select>
            </div>
          </div>

          {loading ? (
            <p className="mt-6 text-sm text-metal-400">Cargando…</p>
          ) : movimientosFiltrados.length === 0 ? (
            <p className="mt-6 text-sm text-metal-400">
              Todavía no hay movimientos cargados con estos filtros.
            </p>
          ) : (
            <>
              {/* Mobile / tablet: tarjetas, evita que la tabla se corte con el sidebar fijo */}
              <ul className="mt-4 divide-y divide-metal-800 lg:hidden">
                {movimientosFiltrados.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-white">{m.descripcion}</p>
                      <p className="text-xs text-metal-400">
                        {formatDate(m.fecha)}
                        {m.categoria?.nombre ? ` · ${m.categoria.nombre}` : ''}
                        {m.cuenta?.nombre ? ` · ${m.cuenta.nombre}` : ''}
                      </p>
                      <button
                        onClick={() => toggleEstado(m)}
                        className={`mt-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          m.estado === 'realizado'
                            ? 'bg-success/15 text-success'
                            : 'bg-warning/15 text-warning'
                        }`}
                      >
                        {m.estado === 'realizado' ? 'Realizado' : 'Pendiente'}
                      </button>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span
                        className={`text-sm font-medium ${
                          m.tipo === 'ingreso' ? 'text-success' : 'text-danger'
                        }`}
                      >
                        {m.tipo === 'ingreso' ? '+' : '-'}
                        {formatCurrency(m.monto)}
                      </span>
                      <button
                        onClick={() => eliminar(m.id)}
                        className="text-metal-400 hover:text-danger"
                        aria-label="Eliminar"
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Desktop: tabla completa */}
              <div className="mt-4 hidden overflow-x-auto lg:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-metal-700 text-metal-400">
                      <th className="py-2 pr-3 font-medium">Fecha</th>
                      <th className="py-2 pr-3 font-medium">Descripción</th>
                      <th className="py-2 pr-3 font-medium">Categoría</th>
                      <th className="py-2 pr-3 font-medium">Cuenta</th>
                      <th className="py-2 pr-3 text-right font-medium">Monto</th>
                      <th className="py-2 pr-3 font-medium">Estado</th>
                      <th className="py-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientosFiltrados.map((m) => (
                      <tr key={m.id} className="border-b border-metal-800">
                        <td className="py-2.5 pr-3 text-metal-300">{formatDate(m.fecha)}</td>
                        <td className="py-2.5 pr-3 text-white">{m.descripcion}</td>
                        <td className="py-2.5 pr-3 text-metal-300">
                          {m.categoria?.nombre ?? '—'}
                        </td>
                        <td className="py-2.5 pr-3 text-metal-300">{m.cuenta?.nombre ?? '—'}</td>
                        <td
                          className={`py-2.5 pr-3 text-right font-medium ${
                            m.tipo === 'ingreso' ? 'text-success' : 'text-danger'
                          }`}
                        >
                          {m.tipo === 'ingreso' ? '+' : '-'}
                          {formatCurrency(m.monto)}
                        </td>
                        <td className="py-2.5 pr-3">
                          <button
                            onClick={() => toggleEstado(m)}
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              m.estado === 'realizado'
                                ? 'bg-success/15 text-success'
                                : 'bg-warning/15 text-warning'
                            }`}
                          >
                            {m.estado === 'realizado' ? 'Realizado' : 'Pendiente'}
                          </button>
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => eliminar(m.id)}
                            className="text-metal-400 hover:text-danger"
                            aria-label="Eliminar"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
