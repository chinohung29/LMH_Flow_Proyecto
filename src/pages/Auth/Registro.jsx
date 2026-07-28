import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Logo from '../../components/Logo'
import { useAuth } from '../../context/AuthContext'
import { isSupabaseConfigured } from '../../services/supabaseClient'

export default function Registro() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    setLoading(true)
    const { data, error: signUpError } = await signUp({ email, password, nombre })
    setLoading(false)

    if (signUpError) {
      setError(traducirError(signUpError.message))
      return
    }

    if (data.session) {
      navigate('/dashboard', { replace: true })
    } else {
      setEnviado(true)
    }
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
                Te enviamos un link para confirmar tu cuenta y empezar tu
                prueba gratuita de 30 días.
              </p>
            </div>
          ) : (
            <>
              <h1 className="font-display text-xl font-semibold text-white">
                Creá tu cuenta
              </h1>
              <p className="mt-1 text-sm text-metal-300">
                30 días gratis. Sin tarjeta de crédito.
              </p>

              {!isSupabaseConfigured && (
                <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
                  Supabase no está configurado (.env). El registro no
                  funcionará hasta completar VITE_SUPABASE_URL y
                  VITE_SUPABASE_ANON_KEY.
                </p>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="label-field" htmlFor="nombre">
                    Nombre
                  </label>
                  <input
                    id="nombre"
                    type="text"
                    required
                    autoComplete="name"
                    className="input-field"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Tu nombre"
                  />
                </div>
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
                    minLength={8}
                    autoComplete="new-password"
                    className="input-field"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                  />
                </div>

                {error && (
                  <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                    {error}
                  </p>
                )}

                <button type="submit" className="btn-primary w-full" disabled={loading}>
                  {loading ? 'Creando cuenta…' : 'Empezar prueba gratuita'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-metal-400">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="font-medium text-electric-400 hover:text-electric-300">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  )
}

function traducirError(message) {
  if (message.includes('already registered')) {
    return 'Ya existe una cuenta con ese email.'
  }
  return message
}
