import { useState } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../../components/Logo'
import { useAuth } from '../../context/AuthContext'

export default function OlvidePassword() {
  const { resetPasswordForEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: resetError } = await resetPasswordForEmail(email)
    setLoading(false)
    if (resetError) {
      setError(resetError.message)
      return
    }
    setEnviado(true)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-graphite-950 px-4 py-12">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex justify-center">
          <Logo className="h-11" />
        </Link>
        <div className="card">
          {enviado ? (
            <div className="text-center">
              <h1 className="font-display text-xl font-semibold text-white">Revisá tu email</h1>
              <p className="mt-2 text-sm text-metal-300">
                Si existe una cuenta con ese email, te enviamos un link para elegir una
                contraseña nueva.
              </p>
            </div>
          ) : (
            <>
              <h1 className="font-display text-xl font-semibold text-white">
                Recuperar contraseña
              </h1>
              <p className="mt-1 text-sm text-metal-300">
                Ingresá el email con el que te registraste y te enviamos un link para
                restablecerla.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="label-field" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    className="input-field"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vos@empresa.com"
                  />
                </div>

                {error && (
                  <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
                )}

                <button type="submit" className="btn-primary w-full" disabled={loading}>
                  {loading ? 'Enviando…' : 'Enviar link de recuperación'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-metal-400">
          <Link to="/login" className="font-medium text-electric-400 hover:text-electric-300">
            Volver a iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
