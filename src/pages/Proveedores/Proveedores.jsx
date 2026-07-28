import { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import { useAuth } from '../../context/AuthContext'
import { useEmpresa } from '../../context/EmpresaContext'
import {
  listProveedores,
  createProveedor,
  updateProveedor,
  deleteProveedor,
} from '../../services/proveedores'
import { listMovimientos } from '../../services/movimientos'
import { formatCurrency } from '../../utils/format'

const FORM_INICIAL = { nombre: '', email: '', telefono: '', cuit: '', notas: '' }

export default function Proveedores() {
  const { user, profile } = useAuth()
  const { empresaActiva } = useEmpresa()
  const [proveedores, setProveedores] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [form, setForm] = useState(FORM_INICIAL)
  const [editandoId, setEditandoId] = useState(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!empresaActiva) return
    setLoading(true)
    Promise.all([
      listProveedores(empresaActiva.id),
      listMovimientos({ empresaId: empresaActiva.id }),
    ])
      .then(([prov, mov]) => {
        setProveedores(prov)
        setMovimientos(mov)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [empresaActiva?.id])

  const statsPorProveedor = useMemo(() => {
    const mapa = new Map()
    for (const m of movimientos) {
      if (m.tipo !== 'egreso' || !m.proveedor_id) continue
      if (!mapa.has(m.proveedor_id)) mapa.set(m.proveedor_id, {})
      const porMoneda = mapa.get(m.proveedor_id)
      if (!porMoneda[m.moneda]) porMoneda[m.moneda] = { total: 0, pendiente: 0 }
      porMoneda[m.moneda].total += Number(m.monto)
      if (m.estado === 'pendiente') porMoneda[m.moneda].pendiente += Number(m.monto)
    }
    return mapa
  }, [movimientos])

  const limiteAlcanzado =
    !editandoId && profile?.plan === 'starter' && proveedores.length >= 20

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nombre || limiteAlcanzado) return
    setGuardando(true)
    setError('')
    try {
      if (editandoId) {
        const actualizado = await updateProveedor(editandoId, form)
        setProveedores((prev) => prev.map((p) => (p.id === editandoId ? actualizado : p)))
      } else {
        const creado = await createProveedor({
          userId: user.id,
          empresaId: empresaActiva.id,
          ...form,
        })
        setProveedores((prev) =>
          [...prev, creado].sort((a, b) => a.nombre.localeCompare(b.nombre))
        )
      }
      setForm(FORM_INICIAL)
      setEditandoId(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  function editar(proveedor) {
    setEditandoId(proveedor.id)
    setForm({
      nombre: proveedor.nombre,
      email: proveedor.email ?? '',
      telefono: proveedor.telefono ?? '',
      cuit: proveedor.cuit ?? '',
      notas: proveedor.notas ?? '',
    })
  }

  function cancelarEdicion() {
    setEditandoId(null)
    setForm(FORM_INICIAL)
  }

  async function eliminar(id) {
    try {
      await deleteProveedor(id)
      setProveedores((prev) => prev.filter((p) => p.id !== id))
      if (editandoId === id) cancelarEdicion()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-white">Proveedores</h1>
        <p className="text-metal-300">
          Contactos y pagos asociados a tus egresos ({proveedores.length} cargados).
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-4 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <h2 className="font-semibold text-white">
            {editandoId ? 'Editar proveedor' : 'Nuevo proveedor'}
          </h2>
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <div>
              <label className="label-field" htmlFor="nombre">
                Nombre
              </label>
              <input
                id="nombre"
                required
                className="input-field"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej: Insumos SRL"
              />
            </div>
            <div>
              <label className="label-field" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="input-field"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-field" htmlFor="telefono">
                  Teléfono
                </label>
                <input
                  id="telefono"
                  className="input-field"
                  value={form.telefono}
                  onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                />
              </div>
              <div>
                <label className="label-field" htmlFor="cuit">
                  CUIT
                </label>
                <input
                  id="cuit"
                  className="input-field"
                  value={form.cuit}
                  onChange={(e) => setForm((f) => ({ ...f, cuit: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="label-field" htmlFor="notas">
                Notas
              </label>
              <textarea
                id="notas"
                rows={2}
                className="input-field resize-none"
                value={form.notas}
                onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
              />
            </div>
            {limiteAlcanzado && (
              <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
                Alcanzaste el límite de 20 proveedores del plan Starter. Actualizá tu plan para
                agregar más.
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                className="btn-primary flex-1"
                disabled={guardando || limiteAlcanzado}
              >
                {guardando ? 'Guardando…' : editandoId ? 'Guardar cambios' : 'Agregar proveedor'}
              </button>
              {editandoId && (
                <button type="button" className="btn-secondary" onClick={cancelarEdicion}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="lg:col-span-2">
          {loading ? (
            <p className="text-sm text-metal-400">Cargando…</p>
          ) : proveedores.length === 0 ? (
            <p className="card text-sm text-metal-400">Todavía no cargaste proveedores.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {proveedores.map((proveedor) => {
                const stats = statsPorProveedor.get(proveedor.id)
                return (
                  <div key={proveedor.id} className="card">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">{proveedor.nombre}</p>
                        {proveedor.email && (
                          <p className="truncate text-xs text-metal-400">{proveedor.email}</p>
                        )}
                        {proveedor.telefono && (
                          <p className="text-xs text-metal-400">{proveedor.telefono}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-2 text-xs">
                        <button
                          onClick={() => editar(proveedor)}
                          className="text-electric-400 hover:text-electric-300"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => eliminar(proveedor.id)}
                          className="text-metal-400 hover:text-danger"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>

                    {stats ? (
                      <div className="mt-3 space-y-1 border-t border-metal-800 pt-3">
                        {Object.entries(stats).map(([moneda, s]) => (
                          <div key={moneda} className="flex items-center justify-between text-sm">
                            <span className="text-metal-400">Pendiente de pago</span>
                            <span
                              className={
                                s.pendiente > 0 ? 'font-medium text-warning' : 'text-metal-400'
                              }
                            >
                              {formatCurrency(s.pendiente, moneda)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 border-t border-metal-800 pt-3 text-xs text-metal-500">
                        Sin movimientos asociados todavía.
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
