import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import LegalLayout from '../../components/LegalLayout'
import { useAuth } from '../../context/AuthContext'
import { solicitarArrepentimiento } from '../../services/billing'
import { NOMBRE_PLAN } from '../../utils/planes'

export default function Arrepentimiento() {
  const { session, profile, loading } = useAuth()
  const location = useLocation()
  const [motivo, setMotivo] = useState('')
  const [confirmo, setConfirmo] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [numeroReclamo, setNumeroReclamo] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!confirmo) return
    setEnviando(true)
    setError('')
    try {
      const { numero_reclamo } = await solicitarArrepentimiento(motivo || null)
      setNumeroReclamo(numero_reclamo)
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <LegalLayout titulo="Botón de arrepentimiento" actualizado="6 de agosto de 2026">
      <p>
        Si contrataste un plan pago de LMH Flow a distancia, tenés derecho a arrepentirte de la
        contratación dentro de los <strong>10 días corridos</strong> desde que se confirmó el
        pago, sin costo ni responsabilidad (Ley 24.240, art. 34, y Resolución 424/2020). Al
        confirmar acá, cancelamos tu suscripción de inmediato y queda registrado tu reclamo con
        un número de seguimiento. Más detalle en los{' '}
        <Link to="/terminos">Términos y Condiciones</Link>.
      </p>

      {numeroReclamo ? (
        <div className="rounded-xl border border-success/40 bg-success/10 p-5">
          <h2 className="text-white">Listo, tu solicitud quedó registrada</h2>
          <p className="mt-2">
            Tu suscripción se canceló en el momento. Número de reclamo:{' '}
            <strong>{numeroReclamo}</strong>. Guardalo por si necesitás hacer un seguimiento.
          </p>
          <p className="mt-2">
            Si tu pago fue hecho dentro de los últimos 10 días, te reintegramos el monto a la
            misma cuenta con la que pagaste en Mercado Pago dentro de los próximos días hábiles.
            Cualquier consulta, escribinos a{' '}
            <a href="mailto:lamh2903@gmail.com">lamh2903@gmail.com</a> mencionando tu número de
            reclamo.
          </p>
        </div>
      ) : loading ? (
        <p>Cargando…</p>
      ) : !session ? (
        <div className="rounded-xl border border-metal-700 bg-graphite-900 p-5">
          <p>
            Para gestionar tu arrepentimiento necesitamos identificar tu cuenta. Iniciá sesión
            con el email con el que contrataste el plan.
          </p>
          <Link
            to="/login"
            state={{ from: location }}
            className="btn-primary mt-4 inline-flex"
          >
            Iniciar sesión
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="rounded-xl border border-metal-700 bg-graphite-900 p-5">
          <p className="text-metal-200">
            Cuenta: <strong>{profile?.email}</strong> · Plan actual:{' '}
            <strong>{NOMBRE_PLAN[profile?.plan] ?? profile?.plan ?? '—'}</strong>
          </p>

          <label className="label-field mt-4" htmlFor="motivo">
            Motivo (opcional)
          </label>
          <textarea
            id="motivo"
            className="input-field"
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Contanos por qué te arrepentís (no es obligatorio)"
          />

          <label className="mt-4 flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-metal-600 bg-graphite-800 text-electric-600 focus:ring-electric-500"
              checked={confirmo}
              onChange={(e) => setConfirmo(e.target.checked)}
            />
            <span>Entiendo que esto cancela mi suscripción de inmediato.</span>
          </label>

          {error && (
            <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
          )}

          <button
            type="submit"
            className="btn-primary mt-4 w-full sm:w-auto"
            disabled={!confirmo || enviando}
          >
            {enviando ? 'Procesando…' : 'Confirmar arrepentimiento y cancelar'}
          </button>
        </form>
      )}
    </LegalLayout>
  )
}
