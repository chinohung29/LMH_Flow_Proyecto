import { useEffect, useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import { useAuth } from '../../context/AuthContext'
import { useEmpresa } from '../../context/EmpresaContext'
import {
  actualizarEmpresa,
  listMiembros,
  eliminarMiembro,
  cambiarRolMiembro,
  listInvitaciones,
  crearInvitacion,
  eliminarInvitacion,
} from '../../services/empresas'
import { crearSuscripcion, cancelarSuscripcion } from '../../services/billing'
import { formatDate, formatCurrency } from '../../utils/format'
import { PRECIOS_USD, NOMBRE_PLAN, obtenerTasaOficial, calcularPrecioARS } from '../../utils/planes'

const ROLES_LABEL = {
  propietario: 'Propietario',
  administrador: 'Administrador',
  miembro: 'Miembro',
  lector: 'Lector',
}

export default function Configuracion() {
  const { user, profile, recargarPerfil } = useAuth()
  const { empresaActiva, recargar: recargarEmpresas } = useEmpresa()
  const [suscribiendo, setSuscribiendo] = useState(null)
  const [cancelando, setCancelando] = useState(false)
  const [errorPlan, setErrorPlan] = useState('')
  const [tasa, setTasa] = useState(null)
  const [miembros, setMiembros] = useState([])
  const [invitaciones, setInvitaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [nombreEmpresa, setNombreEmpresa] = useState('')
  const [guardandoNombre, setGuardandoNombre] = useState(false)

  const [rolInvitacion, setRolInvitacion] = useState('miembro')
  const [creandoInvitacion, setCreandoInvitacion] = useState(false)
  const [linkCopiado, setLinkCopiado] = useState('')

  const puedeAdministrar =
    empresaActiva?.rol === 'propietario' || empresaActiva?.rol === 'administrador'

  useEffect(() => {
    obtenerTasaOficial()
      .then(setTasa)
      .catch(() => setTasa(null))
  }, [])

  useEffect(() => {
    if (!empresaActiva) return
    setNombreEmpresa(empresaActiva.nombre)
    setLoading(true)
    Promise.all([listMiembros(empresaActiva.id), listInvitaciones(empresaActiva.id)])
      .then(([m, i]) => {
        setMiembros(m)
        setInvitaciones(i)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [empresaActiva?.id])

  async function handleGuardarNombre(e) {
    e.preventDefault()
    if (!nombreEmpresa.trim() || !empresaActiva) return
    setGuardandoNombre(true)
    setError('')
    try {
      await actualizarEmpresa(empresaActiva.id, nombreEmpresa.trim())
      await recargarEmpresas()
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardandoNombre(false)
    }
  }

  async function handleCrearInvitacion(e) {
    e.preventDefault()
    if (!empresaActiva) return
    setCreandoInvitacion(true)
    setError('')
    try {
      const nueva = await crearInvitacion({
        empresaId: empresaActiva.id,
        rol: rolInvitacion,
        userId: user.id,
      })
      setInvitaciones((prev) => [nueva, ...prev])
    } catch (err) {
      setError(err.message)
    } finally {
      setCreandoInvitacion(false)
    }
  }

  async function handleEliminarInvitacion(id) {
    try {
      await eliminarInvitacion(id)
      setInvitaciones((prev) => prev.filter((i) => i.id !== id))
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleEliminarMiembro(id) {
    try {
      await eliminarMiembro(id)
      setMiembros((prev) => prev.filter((m) => m.id !== id))
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleCambiarRol(id, rol) {
    try {
      await cambiarRolMiembro(id, rol)
      setMiembros((prev) => prev.map((m) => (m.id === id ? { ...m, rol } : m)))
    } catch (err) {
      setError(err.message)
    }
  }

  function copiarLink(codigo) {
    const link = `${window.location.origin}/unirse/${codigo}`
    navigator.clipboard?.writeText(link)
    setLinkCopiado(codigo)
    setTimeout(() => setLinkCopiado(''), 2000)
  }

  async function handleSuscribirse(plan) {
    setSuscribiendo(plan)
    setErrorPlan('')
    try {
      const { init_point } = await crearSuscripcion(plan)
      window.location.href = init_point
    } catch (err) {
      setErrorPlan(err.message)
      setSuscribiendo(null)
    }
  }

  async function handleCancelar() {
    if (
      !window.confirm(
        'Se va a cancelar la renovación automática en Mercado Pago. Conservás el acceso a tu plan hasta el fin del período que ya pagaste. ¿Confirmás?'
      )
    ) {
      return
    }
    setCancelando(true)
    setErrorPlan('')
    try {
      await cancelarSuscripcion()
      await recargarPerfil()
    } catch (err) {
      setErrorPlan(err.message)
    } finally {
      setCancelando(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-white">Configuración</h1>
        <p className="text-metal-300">Empresa, miembros y permisos.</p>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-4 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="card mb-6">
        <h2 className="font-semibold text-white">Plan y facturación</h2>
        <p className="mt-1 text-sm text-metal-300">
          Tu plan actual: <span className="text-white">{NOMBRE_PLAN[profile?.plan] ?? profile?.plan}</span>
        </p>

        {profile?.plan_vence_el && (
          <p className="mt-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
            Cancelaste la renovación automática. Conservás el acceso a tu plan hasta el{' '}
            {formatDate(profile.plan_vence_el)}.
          </p>
        )}

        {profile?.plan === 'cancelado' && (
          <p className="mt-2 rounded-lg border border-metal-700 bg-graphite-800 px-3 py-2 text-xs text-metal-300">
            No tenés un plan activo. Podés volver a suscribirte cuando quieras (sin el mes de
            prueba gratuita, que ya usaste).
          </p>
        )}

        {(profile?.plan === 'starter' || profile?.plan === 'platinum') &&
          profile?.mp_preapproval_id &&
          !profile?.plan_vence_el && (
            <button
              type="button"
              onClick={handleCancelar}
              disabled={cancelando}
              className="mt-2 text-xs font-medium text-metal-400 hover:text-danger"
            >
              {cancelando ? 'Cancelando…' : 'Cancelar suscripción'}
            </button>
          )}

        {errorPlan && (
          <p className="mt-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {errorPlan}
          </p>
        )}

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {['starter', 'platinum'].map((plan) => (
            <div key={plan} className="rounded-xl border border-metal-700 p-4">
              <p className="font-medium text-white">{NOMBRE_PLAN[plan]}</p>
              <p className="text-sm text-metal-400">
                US$ {PRECIOS_USD[plan]} / mes
                {tasa && ` · ≈ ${formatCurrency(calcularPrecioARS(PRECIOS_USD[plan], tasa), 'ARS')}`}
              </p>
              <p className="text-xs text-metal-500">
                Se cobra en pesos al tipo de cambio oficial del día de la suscripción.
              </p>
              {profile?.plan === plan ? (
                <p className="mt-3 text-xs font-medium text-electric-400">Tu plan actual</p>
              ) : (
                <button
                  type="button"
                  className="btn-secondary mt-3 w-full text-sm"
                  onClick={() => handleSuscribirse(plan)}
                  disabled={suscribiendo !== null}
                >
                  {suscribiendo === plan ? 'Redirigiendo…' : `Suscribirme a ${NOMBRE_PLAN[plan]}`}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-metal-400">Cargando…</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="card">
            <h2 className="font-semibold text-white">Datos de la empresa</h2>
            <form onSubmit={handleGuardarNombre} className="mt-4 flex gap-2">
              <input
                className="input-field"
                value={nombreEmpresa}
                onChange={(e) => setNombreEmpresa(e.target.value)}
                disabled={!puedeAdministrar}
              />
              {puedeAdministrar && (
                <button type="submit" className="btn-secondary" disabled={guardandoNombre}>
                  {guardandoNombre ? 'Guardando…' : 'Guardar'}
                </button>
              )}
            </form>
            <p className="mt-3 text-xs text-metal-400">
              Tu rol en esta empresa: <span className="text-metal-200">{ROLES_LABEL[empresaActiva?.rol]}</span>
            </p>
          </div>

          <div className="card">
            <h2 className="font-semibold text-white">Miembros</h2>
            <ul className="mt-4 space-y-3">
              {miembros.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-white">
                      {m.profile?.nombre || m.profile?.email || 'Usuario'}
                      {m.user_id === user.id && <span className="text-metal-400"> (vos)</span>}
                    </p>
                    <p className="truncate text-xs text-metal-400">{m.profile?.email}</p>
                  </div>
                  {puedeAdministrar && m.rol !== 'propietario' ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <select
                        className="input-field !w-auto !py-1 text-xs"
                        value={m.rol}
                        onChange={(e) => handleCambiarRol(m.id, e.target.value)}
                      >
                        <option value="administrador">Administrador</option>
                        <option value="miembro">Miembro</option>
                        <option value="lector">Lector</option>
                      </select>
                      <button
                        onClick={() => handleEliminarMiembro(m.id)}
                        className="text-xs text-metal-400 hover:text-danger"
                      >
                        Quitar
                      </button>
                    </div>
                  ) : (
                    <span className="shrink-0 rounded-full bg-metal-800 px-2.5 py-1 text-xs text-metal-300">
                      {ROLES_LABEL[m.rol]}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {puedeAdministrar && (
            <div className="card lg:col-span-2">
              <h2 className="font-semibold text-white">Invitar a la empresa</h2>
              <form onSubmit={handleCrearInvitacion} className="mt-4 flex flex-wrap items-end gap-2">
                <div>
                  <label className="label-field" htmlFor="rolInvitacion">
                    Rol
                  </label>
                  <select
                    id="rolInvitacion"
                    className="input-field"
                    value={rolInvitacion}
                    onChange={(e) => setRolInvitacion(e.target.value)}
                  >
                    <option value="administrador">Administrador</option>
                    <option value="miembro">Miembro</option>
                    <option value="lector">Lector</option>
                  </select>
                </div>
                <button type="submit" className="btn-primary" disabled={creandoInvitacion}>
                  {creandoInvitacion ? 'Generando…' : 'Generar invitación'}
                </button>
              </form>

              {invitaciones.length > 0 && (
                <ul className="mt-4 space-y-2 border-t border-metal-800 pt-4">
                  {invitaciones.map((inv) => (
                    <li key={inv.id} className="flex items-center justify-between gap-3 text-sm">
                      <div>
                        <span className="text-metal-200">{ROLES_LABEL[inv.rol]}</span>
                        <span className="ml-2 text-xs text-metal-500">
                          vence el {formatDate(inv.expira_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => copiarLink(inv.codigo)}
                          className="text-xs text-electric-400 hover:text-electric-300"
                        >
                          {linkCopiado === inv.codigo ? 'Copiado ✓' : 'Copiar link'}
                        </button>
                        <button
                          onClick={() => handleEliminarInvitacion(inv.id)}
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
          )}
        </div>
      )}
    </DashboardLayout>
  )
}
