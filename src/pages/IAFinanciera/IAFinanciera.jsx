import { useEffect, useRef, useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import { useAuth } from '../../context/AuthContext'
import { enviarMensajeIA } from '../../services/ia'
import { tienePlanLimitado } from '../../utils/planes'

const SUGERENCIAS = [
  '¿Puedo pagarle a mis proveedores este mes?',
  '¿Cómo vengo con los gastos comparado con los ingresos?',
  '¿Qué clientes me deben plata?',
  '¿Cuáles son mis próximos vencimientos?',
]

export default function IAFinanciera() {
  const { profile } = useAuth()
  const [mensajes, setMensajes] = useState([])
  const [input, setInput] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const finRef = useRef(null)

  const tieneAcceso = !tienePlanLimitado(profile?.plan)

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, enviando])

  async function enviar(texto) {
    const mensaje = texto.trim()
    if (!mensaje || enviando) return
    setError('')
    const historial = mensajes.map((m) => ({ role: m.role, content: m.content }))
    setMensajes((prev) => [...prev, { role: 'user', content: mensaje }])
    setInput('')
    setEnviando(true)
    try {
      const respuesta = await enviarMensajeIA(mensaje, historial)
      setMensajes((prev) => [...prev, { role: 'assistant', content: respuesta }])
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    enviar(input)
  }

  if (!tieneAcceso) {
    return (
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="font-display text-2xl font-semibold text-white">IA Financiera</h1>
          <p className="text-metal-300">Tu asesor financiero, con tus propios números.</p>
        </div>
        <div className="card mx-auto max-w-md text-center">
          <p className="text-3xl">🤖</p>
          <h2 className="mt-3 font-display text-lg font-semibold text-white">
            Función de Plan Platinum
          </h2>
          <p className="mt-2 text-sm text-metal-300">
            La IA financiera analiza tus movimientos, saldos y vencimientos reales para
            responder tus preguntas. Está disponible en el plan Platinum. Actualizá tu plan
            para acceder.
          </p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-white">IA Financiera</h1>
        <p className="text-metal-300">Preguntale sobre tus números, en lenguaje natural.</p>
      </div>

      <div className="card flex h-[70vh] flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          {mensajes.length === 0 && (
            <div>
              <p className="text-sm text-metal-400">
                Probá preguntarle algo sobre tu flujo de caja:
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {SUGERENCIAS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => enviar(s)}
                    className="rounded-full border border-metal-700 px-3 py-1.5 text-xs text-metal-300 hover:border-electric-500 hover:text-electric-300"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mensajes.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === 'user'
                    ? 'bg-electric-600 text-white'
                    : 'border border-metal-700 bg-graphite-800 text-metal-100'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {enviando && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-metal-700 bg-graphite-800 px-4 py-2.5 text-sm text-metal-400">
                Pensando…
              </div>
            </div>
          )}
          <div ref={finRef} />
        </div>

        {error && (
          <p className="mt-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
          <input
            className="input-field"
            placeholder="Escribí tu pregunta…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={enviando}
          />
          <button type="submit" className="btn-primary shrink-0" disabled={enviando || !input.trim()}>
            Enviar
          </button>
        </form>
      </div>
    </DashboardLayout>
  )
}
