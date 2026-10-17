import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { fechaLocal } from '../utils/hoy'
import { alertasVencimiento } from '../utils/avisos'
import { formatCurrency, formatDate } from '../utils/format'
import RecordarCobro from './RecordarCobro'

function Grupo({ titulo, estilo, items }) {
  if (items.length === 0) return null
  return (
    <div>
      <p className={`text-xs font-medium uppercase ${estilo}`}>
        {titulo} ({items.length})
      </p>
      <ul className="mt-2 divide-y divide-metal-800">
        {items.slice(0, 6).map((m) => (
          <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
            <div className="min-w-0">
              <p className="truncate text-white">{m.descripcion}</p>
              <p className="text-xs text-metal-400">
                {formatDate(m.fecha)}
                {m.cliente?.nombre ? ` · ${m.cliente.nombre}` : ''}
                {m.proveedor?.nombre ? ` · ${m.proveedor.nombre}` : ''}
              </p>
              <RecordarCobro movimiento={m} />
            </div>
            <span className={`shrink-0 font-medium ${m.tipo === 'ingreso' ? 'text-success' : 'text-danger'}`}>
              {m.tipo === 'ingreso' ? '+' : '-'}
              {formatCurrency(m.monto, m.moneda)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Avisos de lo que se vence antes de que se pase: vencidos, hoy y próximos días.
export default function AlertasVencimiento({ movimientos, dias = 3, compacto = false }) {
  const { vencidos, deHoy, proximos } = useMemo(
    () => alertasVencimiento(movimientos, fechaLocal(), dias),
    [movimientos, dias]
  )
  const total = vencidos.length + deHoy.length + proximos.length

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-white">⏰ Avisos de vencimiento</h2>
        {compacto && (
          <Link to="/vencimientos" className="text-sm text-electric-400 hover:text-electric-300">
            Ver todos →
          </Link>
        )}
      </div>
      {total === 0 ? (
        <p className="mt-3 text-sm text-metal-400">
          Nada vencido ni por vencer en los próximos {dias} días. 🎉
        </p>
      ) : (
        <div className="mt-3 space-y-4">
          <Grupo titulo="Vencidos" estilo="text-danger" items={vencidos} />
          <Grupo titulo="Vencen hoy" estilo="text-warning" items={deHoy} />
          <Grupo titulo={`Próximos ${dias} días`} estilo="text-electric-300" items={proximos} />
        </div>
      )}
    </div>
  )
}
