import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Logo from '../../components/Logo'
import { useAuth } from '../../context/AuthContext'
import { isSupabaseConfigured } from '../../services/supabaseClient'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const redirectTo = location.state?.from?.pathname ?? '/dashboard'

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: signInError } = await signIn({ email, password })
    setLoading(false)
    if (signInError) {
      setError(traducirError(signInError.message))
      return
    }
    navigate(redirectTo, { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-graphite-950 px-4 py-12">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex justify-center">
          <Logo className="h-11" />
        </Link>
        <div className="card">
          <h1 className="text-xl font-semibold text-white">Iniciar sesión</h1>
          <p className="mt-1 text-sm text-metal-300">
            Accedé a tu cuenta de LMH Flow.
          </p>

          {!isSupabaseConfigured && (
            <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
              Supabase no está configurado (.env). El login no funcionará
              hasta completar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.
            </p>
          )}

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
            <div>
              <label className="label-field" htmlFor="password">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Ingresando…' : 'Iniciar sesión'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-metal-400">
          ¿No tenés cuenta?{' '}
          <Link to="/registro" className="font-medium text-electric-400 hover:text-electric-300">
            Empezá tu prueba gratuita
          </Link>
        </p>
      </div>
    </div>
  )
}

function traducirError(message) {
  if (message.includes('Invalid login credentials')) {
    return 'Email o contraseña incorrectos.'
  }
  if (message.includes('Email not confirmed')) {
    return 'Confirmá tu email antes de iniciar sesión.'
  }
  return message
}
