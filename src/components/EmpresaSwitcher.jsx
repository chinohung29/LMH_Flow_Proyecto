import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useEmpresa } from '../context/EmpresaContext'
import { tienePlanLimitado } from '../utils/planes'

export default function EmpresaSwitcher() {
  const { profile } = useAuth()
  const { empresas, empresaActiva, cambiarEmpresa, crearEmpresa } = useEmpresa()
  const [abierto, setAbierto] = useState(false)
  const [creando, setCreando] = useState(false)
  const [nombreNueva, setNombreNueva] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  if (!empresaActiva) return null

  const limiteAlcanzado =
    tienePlanLimitado(profile?.plan) && empresas.some((e) => e.rol === 'propietario')

  async function handleCrear(e) {
    e.preventDefault()
    if (!nombreNueva.trim()) return
    setGuardando(true)
    setError('')
    try {
      await crearEmpresa(nombreNueva.trim())
      setNombreNueva('')
      setCreando(false)
      setAbierto(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-metal-700 bg-graphite-800 px-3 py-2 text-left text-sm text-white hover:border-metal-500"
      >
        <span className="truncate">{empresaActiva.nombre}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          className="shrink-0 text-metal-400"
          aria-hidden="true"
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {abierto && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setAbierto(false)} aria-hidden="true" />
          <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-metal-700 bg-graphite-800 p-1 shadow-xl">
            {empresas.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => {
                  cambiarEmpresa(e.id)
                  setAbierto(false)
                }}
                className={`block w-full truncate rounded-md px-3 py-2 text-left text-sm ${
                  e.id === empresaActiva.id
                    ? 'bg-electric-600/15 text-electric-300'
                    : 'text-metal-200 hover:bg-graphite-700'
                }`}
              >
                {e.nombre}
              </button>
            ))}
            <div className="mt-1 border-t border-metal-700 pt-1">
              {limiteAlcanzado ? (
                <p className="px-3 py-2 text-xs text-metal-400">
                  Tu plan Starter permite 1 empresa. Actualizá tu plan para crear más.
                </p>
              ) : creando ? (
                <form onSubmit={handleCrear} className="flex gap-1 p-1">
                  <input
                    autoFocus
                    className="input-field !py-1.5 text-sm"
                    placeholder="Nombre de la empresa"
                    value={nombreNueva}
                    onChange={(e) => setNombreNueva(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="btn-primary !px-2.5 !py-1.5 text-xs"
                    disabled={guardando}
                  >
                    +
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setCreando(true)}
                  className="block w-full rounded-md px-3 py-2 text-left text-sm text-electric-400 hover:bg-graphite-700 hover:text-electric-300"
                >
                  + Nueva empresa
                </button>
              )}
              {error && <p className="px-3 pb-1 text-xs text-danger">{error}</p>}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
