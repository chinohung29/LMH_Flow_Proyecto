import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Logo from '../../components/Logo'
import PasswordInput from '../../components/PasswordInput'
import { useAuth } from '../../context/AuthContext'

export default function RestablecerPassword() {
  const { updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [listo, setListo] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    setLoading(true)
    const { error: updateError } = await updatePassword(password)
    setLoading(false)

    if (updateError) {
      setError(traducirError(updateError.message))
      return
    }

    setListo(true)
    setTimeout(() => navigate('/dashboard', { replace: true }), 1500)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-graphite-950 px-4 py-12">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex justify-center">
          <Logo className="h-11" />
        </Link>
        <div className="card">
          {listo ? (
            <div className="text-center">
              <h1 className="font-display text-xl font-semibold text-white">¡Listo!</h1>
              <p className="mt-2 text-sm text-metal-300">
                Tu contraseña se actualizó correctamente. Redirigiendo…
              </p>
            </div>
          ) : (
            <>
              <h1 className="font-display text-xl font-semibold text-white">
                Elegí una nueva contraseña
              </h1>
              <p className="mt-1 text-sm text-metal-300">
                Ingresá la contraseña que vas a usar de ahora en más.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="label-field" htmlFor="password">
                    Nueva contraseña
                  </label>
                  <PasswordInput
                    id="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                  />
                </div>

                {error && (
                  <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
                )}

                <button type="submit" className="btn-primary w-full" disabled={loading}>
                  {loading ? 'Guardando…' : 'Guardar contraseña'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function traducirError(message) {
  if (message.includes('session') || message.includes('Auth session missing')) {
    return 'El link de recuperación venció o ya se usó. Solicitá uno nuevo.'
  }
  return message
}
