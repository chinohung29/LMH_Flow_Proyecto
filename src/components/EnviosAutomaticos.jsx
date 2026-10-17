import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useEmpresa } from '../context/EmpresaContext'
import { getAvisosConfig, saveAvisosConfig } from '../services/avisosConfig'

const VACIA = { resumen_semanal: false, recordatorios_cobro: false, dias_antes: 3, email_destino: '' }

// Activa los envíos automáticos por mail (resumen de los lunes y recordatorios
// de cobro a clientes). Arrancan desactivados.
export default function EnviosAutomaticos() {
  const { user } = useAuth()
  const { empresaActiva } = useEmpresa()
  const [config, setConfig] = useState(VACIA)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!empresaActiva) return
    setCargando(true)
    getAvisosConfig(empresaActiva.id)
      .then((c) =>
        setConfig(c ? { ...VACIA, ...c, email_destino: c.email_destino ?? '' } : { ...VACIA, email_destino: user?.email ?? '' })
      )
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false))
  }, [empresaActiva?.id, user?.email])

  async function guardar(e) {
    e.preventDefault()
    setError('')
    setMensaje('')
    const email = config.email_destino.trim()
    if ((config.resumen_semanal || config.recordatorios_cobro) && !/^\S+@\S+\.\S+$/.test(email)) {
      setError('Ingresá un mail válido: ahí te llega el resumen y los clientes te responden.')
      return
    }
    setGuardando(true)
    try {
      await saveAvisosConfig(empresaActiva.id, {
        resumen_semanal: config.resumen_semanal,
        recordatorios_cobro: config.recordatorios_cobro,
        dias_antes: Number(config.dias_antes),
        email_destino: email || null,
      })
      setMensaje('Guardado. Los envíos corren todos los días a las 9:00.')
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={guardar} className="card space-y-4">
      <div>
        <h2 className="font-semibold text-white">📧 Envíos automáticos por mail</h2>
        <p className="text-sm text-metal-300">
          Que la app avise sola, sin que tengas que acordarte. Los envíos arrancan desactivados.
        </p>
      </div>

      {cargando ? (
        <p className="text-sm text-metal-400">Cargando…</p>
      ) : (
        <>
          <label className="flex items-start gap-3 text-sm text-metal-100">
            <input
              type="checkbox"
              className="mt-1"
              checked={config.resumen_semanal}
              onChange={(e) => setConfig((c) => ({ ...c, resumen_semanal: e.target.checked }))}
            />
            <span>
              <b>Resumen semanal</b> — cada lunes te llega la caja, los cobros y pagos de la semana.
            </span>
          </label>

          <label className="flex items-start gap-3 text-sm text-metal-100">
            <input
              type="checkbox"
              className="mt-1"
              checked={config.recordatorios_cobro}
              onChange={(e) => setConfig((c) => ({ ...c, recordatorios_cobro: e.target.checked }))}
            />
            <span>
              <b>Recordatorios de cobro a clientes</b> — se envían a los clientes que tengan email cargado:
              antes del vencimiento, el día que vence y 3 días después si sigue pendiente.
            </span>
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label-field" htmlFor="envios-email">
                Tu mail (resumen y respuestas de clientes)
              </label>
              <input
                id="envios-email"
                type="email"
                className="input-field"
                value={config.email_destino}
                onChange={(e) => setConfig((c) => ({ ...c, email_destino: e.target.value }))}
              />
            </div>
            <div>
              <label className="label-field" htmlFor="envios-dias">
                Avisar al cliente con días de anticipación
              </label>
              <input
                id="envios-dias"
                type="number"
                min="0"
                max="15"
                className="input-field"
                value={config.dias_antes}
                onChange={(e) => setConfig((c) => ({ ...c, dias_antes: e.target.value }))}
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
          )}
          {mensaje && <p className="text-sm text-success">{mensaje}</p>}

          <button type="submit" className="btn-primary" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar envíos'}
          </button>
        </>
      )}
    </form>
  )
}
