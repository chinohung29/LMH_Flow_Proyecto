import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AceptarTerminosGate from './AceptarTerminosGate'

function Spinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-graphite-950">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-electric-500 border-t-transparent" />
    </div>
  )
}

export default function ProtectedRoute({ children }) {
  const { session, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <Spinner />
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  // Esperamos a que el perfil termine de cargar (llega justo después de la
  // sesión) para no dejar pasar por un instante a alguien que en realidad
  // todavía no aceptó los Términos vigentes.
  if (!profile) {
    return <Spinner />
  }

  if (!profile.terminos_aceptados_at) {
    return <AceptarTerminosGate />
  }

  return children
}
