import { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import { useAuth } from '../../context/AuthContext'
import { useEmpresa } from '../../context/EmpresaContext'
import {
  listCategorias,
  createCategoria,
  updateCategoria,
  deleteCategoria,
} from '../../services/categorias'

const FORM_INICIAL = { nombre: '', tipo: 'ingreso' }

export default function Categorias() {
  const { user } = useAuth()
  const { empresaActiva } = useEmpresa()
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [form, setForm] = useState(FORM_INICIAL)
  const [editandoId, setEditandoId] = useState(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!empresaActiva) return
    setLoading(true)
    listCategorias(empresaActiva.id)
      .then(setCategorias)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [empresaActiva?.id])

  const ingresos = useMemo(() => categorias.filter((c) => c.tipo === 'ingreso'), [categorias])
  const egresos = useMemo(() => categorias.filter((c) => c.tipo === 'egreso'), [categorias])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nombre.trim()) return
    setGuardando(true)
    setError('')
    try {
      if (editandoId) {
        const actualizada = await updateCategoria(editandoId, form)
        setCategorias((prev) => prev.map((c) => (c.id === editandoId ? actualizada : c)))
      } else {
        const creada = await createCategoria({
          userId: user.id,
          empresaId: empresaActiva.id,
          nombre: form.nombre.trim(),
          tipo: form.tipo,
        })
        setCategorias((prev) => [...prev, creada].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      }
      setForm(FORM_INICIAL)
      setEditandoId(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  function editar(categoria) {
    setEditandoId(categoria.id)
    setForm({ nombre: categoria.nombre, tipo: categoria.tipo })
  }

  function cancelarEdicion() {
    setEditandoId(null)
    setForm(FORM_INICIAL)
  }

  async function eliminar(id) {
    if (!window.confirm('¿Eliminar esta categoría? Los movimientos que la usaban quedan sin categoría.')) {
      return
    }
    try {
      await deleteCategoria(id)
      setCategorias((prev) => prev.filter((c) => c.id !== id))
      if (editandoId === id) cancelarEdicion()
    } catch (err) {
      setError(err.message)
    }
  }

  function Lista({ titulo, items }) {
    return (
      <div className="card">
        <h2 className="font-semibold text-white">{titulo}</h2>
        {items.length === 0 ? (
          <p className="mt-3 text-sm text-metal-500">Todavía no hay categorías.</p>
        ) : (
          <ul className="mt-3 space-y-1">
            {items.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-graphite-800"
              >
                <span className="truncate text-sm text-white">{c.nombre}</span>
                <div className="flex shrink-0 gap-3 text-xs">
                  <button
                    onClick={() => editar(c)}
                    className="text-electric-400 hover:text-electric-300"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => eliminar(c.id)}
                    className="text-metal-400 hover:text-danger"
                  >
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-white">Categorías</h1>
        <p className="text-metal-300">
          Organizá tus ingresos y egresos ({categorias.length} cargadas).
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
            {editandoId ? 'Editar categoría' : 'Nueva categoría'}
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
                placeholder="Ej: Marketing"
              />
            </div>
            <div>
              <label className="label-field" htmlFor="tipo">
                Tipo
              </label>
              <select
                id="tipo"
                className="input-field"
                value={form.tipo}
                onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
              >
                <option value="ingreso">Ingreso</option>
                <option value="egreso">Egreso</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary flex-1" disabled={guardando}>
                {guardando ? 'Guardando…' : editandoId ? 'Guardar cambios' : 'Agregar categoría'}
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
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Lista titulo="Ingresos" items={ingresos} />
              <Lista titulo="Egresos" items={egresos} />
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
