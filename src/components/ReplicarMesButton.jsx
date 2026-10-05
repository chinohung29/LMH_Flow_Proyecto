import { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useEmpresa } from '../context/EmpresaContext'
import { bulkInsertMovimientos } from '../services/movimientos'
import { mesActual, mesAnterior, prepararReplica } from '../utils/replicar'

export default function ReplicarMesButton({ movimientos, onImported, onError }) {
  const { user } = useAuth()
  const { empresaActiva } = useEmpresa()
  const [abierto, setAbierto] = useState(false)
  const [mesOrigen, setMesOrigen] = useState(mesAnterior())
  const [mesDestino, setMesDestino] = useState(mesActual())
  const [tipos, setTipos] = useState(['ingreso', 'egreso'])
  const [replicando, setReplicando] = useState(false)
  const [resumen, setResumen] = useState('')

  const vista = useMemo(
    () =>
      mesOrigen && mesDestino && mesOrigen !== mesDestino
        ? prepararReplica({ movimientos, mesOrigen, mesDestino, tipos })
        : { filas: [], omitidos: 0, totalOrigen: 0 },
    [movimientos, mesOrigen, mesDestino, tipos]
  )

  function toggleTipo(tipo) {
    setTipos((prev) => (prev.includes(tipo) ? prev.filter((t) => t !== tipo) : [...prev, tipo]))
  }

  async function replicar() {
    if (vista.filas.length === 0) return
    setReplicando(true)
    setResumen('')
    try {
      const insertados = await bulkInsertMovimientos(user.id, empresaActiva.id, vista.filas)
      onImported?.(insertados)
      setResumen(
        `${insertados.length} movimiento(s) replicado(s) en ${mesDestino}` +
          (vista.omitidos ? ` · ${vista.omitidos} ya existían y se omitieron` : '')
      )
      setAbierto(false)
    } catch (err) {
      onError?.(err.message)
    } finally {
      setReplicando(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button type="button" className="btn-secondary text-sm" onClick={() => setAbierto((v) => !v)}>
        Replicar mes
      </button>
      {resumen && <p className="text-xs text-metal-400">{resumen}</p>}

      {abierto && (
        <div className="card mt-2 w-full min-w-[18rem] space-y-3">
          <p className="text-xs text-metal-300">
            Copia los movimientos de un mes a otro, manteniendo el día. Las copias quedan como
            pendientes y se omiten las que ya existen en el mes destino.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field" htmlFor="replicar-origen">
                Desde
              </label>
              <input
                id="replicar-origen"
                type="month"
                className="input-field"
                value={mesOrigen}
                onChange={(e) => setMesOrigen(e.target.value)}
              />
            </div>
            <div>
              <label className="label-field" htmlFor="replicar-destino">
                Hacia
              </label>
              <input
                id="replicar-destino"
                type="month"
                className="input-field"
                value={mesDestino}
                onChange={(e) => setMesDestino(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-4 text-sm text-metal-200">
            {['ingreso', 'egreso'].map((tipo) => (
              <label key={tipo} className="flex items-center gap-2 capitalize">
                <input
                  type="checkbox"
                  checked={tipos.includes(tipo)}
                  onChange={() => toggleTipo(tipo)}
                />
                {tipo}s
              </label>
            ))}
          </div>
          <p className="text-xs text-metal-400">
            {mesOrigen === mesDestino
              ? 'Elegí meses distintos.'
              : `Se van a crear ${vista.filas.length} de ${vista.totalOrigen} movimiento(s)` +
                (vista.omitidos ? ` (${vista.omitidos} ya existen).` : '.')}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-primary text-sm"
              disabled={replicando || vista.filas.length === 0}
              onClick={replicar}
            >
              {replicando ? 'Replicando…' : 'Replicar'}
            </button>
            <button type="button" className="text-sm text-metal-400" onClick={() => setAbierto(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
