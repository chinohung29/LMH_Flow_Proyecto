import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import DashboardLayout from '../../components/DashboardLayout'
import { useEmpresa } from '../../context/EmpresaContext'
import { canjearInvitacion } from '../../services/empresas'

export default function UnirseEmpresa() {
  const { codigo } = useParams()
  const navigate = useNavigate()
  const { cambiarEmpresa, recargar } = useEmpresa()
  const [estado, setEstado] = useState('inicial') // inicial | cargando | ok | error
  const [error, setError] = useState('')
  const [empresa, setEmpresa] = useState(null)

  async function handleUnirme() {
    setEstado('cargando')
    setError('')
    try {
      const empresaUnida = await canjearInvitacion(codigo)
      await recargar()
      await cambiarEmpresa(empresaUnida.id)
      setEmpresa(empresaUnida)
      setEstado('ok')
    } catch (err) {
      setError(err.message)
      setEstado('error')
    }
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-md">
        <div className="card text-center">
          {estado === 'ok' ? (
            <>
              <h1 className="font-display text-xl font-semibold text-white">
                ¡Listo!
              </h1>
              <p className="mt-2 text-sm text-metal-300">
                Ahora sos parte de <span className="text-white">{empresa?.nombre}</span>.
              </p>
              <button className="btn-primary mt-6" onClick={() => navigate('/dashboard')}>
                Ir al Dashboard
              </button>
            </>
          ) : (
            <>
              <h1 className="font-display text-xl font-semibold text-white">
                Unirte a una empresa
              </h1>
              <p className="mt-2 text-sm text-metal-300">
                Te invitaron a colaborar en LMH Flow. Confirmá para unirte con el link que
                recibiste.
              </p>
              {estado === 'error' && (
                <p className="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-4 py-2 text-sm text-danger">
                  {error}
                </p>
              )}
              <button
                className="btn-primary mt-6"
                onClick={handleUnirme}
                disabled={estado === 'cargando'}
              >
                {estado === 'cargando' ? 'Uniéndome…' : 'Unirme'}
              </button>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
