import { useMemo, useState } from 'react'
import { fechaLocal } from '../utils/hoy'
import { preguntasRapidas } from '../utils/avisos'

// Preguntas frecuentes con respuesta instantánea, calculada con los datos de la
// empresa (no usa IA, funciona en todos los planes).
export default function PreguntasRapidas({ movimientos, cuentas }) {
  const [abierta, setAbierta] = useState(null)
  const preguntas = useMemo(
    () => preguntasRapidas({ movimientos, cuentas, hoy: fechaLocal() }),
    [movimientos, cuentas]
  )

  return (
    <div className="card">
      <h2 className="font-semibold text-white">Preguntas frecuentes</h2>
      <p className="text-sm text-metal-300">Respuestas al instante con tus números de hoy.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {preguntas.map((p, i) => (
          <button
            key={p.pregunta}
            type="button"
            onClick={() => setAbierta(abierta === i ? null : i)}
            className={`rounded-full border px-3 py-1.5 text-xs ${
              abierta === i
                ? 'border-electric-500 text-electric-300'
                : 'border-metal-700 text-metal-300 hover:border-electric-500'
            }`}
          >
            {p.pregunta}
          </button>
        ))}
      </div>
      {abierta !== null && (
        <p className="mt-3 whitespace-pre-line rounded-lg border border-metal-700 bg-graphite-800 px-4 py-3 text-sm text-metal-100">
          {preguntas[abierta].respuesta}
        </p>
      )}
    </div>
  )
}
