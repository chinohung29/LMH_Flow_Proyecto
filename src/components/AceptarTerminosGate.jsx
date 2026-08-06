import { useState } from 'react'
import { Link } from 'react-router-dom'
import Logo from './Logo'
import { useAuth } from '../context/AuthContext'
import { aceptarTerminos } from '../services/profiles'

/**
 * Bloquea el acceso a la app hasta que el usuario acepte los Términos y
 * Condiciones y la Política de Privacidad vigentes. Se muestra solo si
 * `profile.terminos_aceptados_at` está vacío — que es el caso de todas las
 * cuentas creadas antes de que existieran esos documentos.
 */
export default function AceptarTerminosGate() {
  const { user, signOut, recargarPerfil } = useAuth()
  const [acepta, setAcepta] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function handleAceptar() {
    if (!acepta) return
    setGuardando(true)
    setError('')
    try {
      await aceptarTerminos(user.id)
      await recargarPerfil()
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-graphite-950 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo className="h-11" />
        </div>
        <div className="card">
          <h1 className="font-display text-xl font-semibold text-white">
            Actualizamos nuestros Términos
          </h1>
          <p className="mt-2 text-sm text-metal-300">
            Antes de seguir usando LMH Flow, necesitamos que revises y aceptes nuestros{' '}
            <Link
              to="/terminos"
              target="_blank"
              className="text-electric-400 hover:text-electric-300"
            >
              Términos y Condiciones
            </Link>{' '}
            y nuestra{' '}
            <Link
              to="/privacidad"
              target="_blank"
              className="text-electric-400 hover:text-electric-300"
            >
              Política de Privacidad
            </Link>
            .
          </p>

          <label className="mt-5 flex items-start gap-2 text-sm text-metal-300">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-metal-600 bg-graphite-800 text-electric-600 focus:ring-electric-500"
              checked={acepta}
              onChange={(e) => setAcepta(e.target.checked)}
            />
            <span>Leí y acepto los Términos y Condiciones y la Política de Privacidad.</span>
          </label>

          {error && (
            <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
          )}

          <button
            type="button"
            className="btn-primary mt-5 w-full"
            disabled={!acepta || guardando}
            onClick={handleAceptar}
          >
            {guardando ? 'Guardando…' : 'Aceptar y continuar'}
          </button>

          <button
            type="button"
            onClick={signOut}
            className="mt-4 w-full text-center text-sm text-metal-400 hover:text-metal-200"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  )
}
