import { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useEmpresa } from '../context/EmpresaContext'
import { fechaLocal } from '../utils/hoy'
import { formatCurrency } from '../utils/format'
import { linkMail, resumenSemanal, textoResumenSemanal } from '../utils/avisos'

export default function ResumenSemanal({ movimientos, cuentas }) {
  const { user } = useAuth()
  const { empresaActiva } = useEmpresa()
  const [copiado, setCopiado] = useState(false)
  const hoy = fechaLocal()
  const resumenes = useMemo(
    () => resumenSemanal({ movimientos, cuentas, hoy }),
    [movimientos, cuentas, hoy]
  )
  const texto = textoResumenSemanal(resumenes, empresaActiva?.nombre, hoy)
  const mail = linkMail(user?.email, 'Resumen semanal de tu caja', texto)
  const esLunes = new Date().getDay() === 1

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      setCopiado(false)
    }
  }

  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-white">Resumen de la semana{esLunes ? ' · hoy es lunes' : ''}</h2>
          <p className="text-sm text-metal-300">Ventas y caja de los últimos 7 días y lo que viene.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary text-sm" onClick={copiar}>
            {copiado ? '¡Copiado!' : 'Copiar'}
          </button>
          {mail && (
            <a href={mail} className="btn-secondary text-sm">
              Enviármelo por mail
            </a>
          )}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {resumenes.map((r) => (
          <div key={r.moneda} className="rounded-xl border border-metal-700 p-4">
            {resumenes.length > 1 && (
              <p className="mb-2 text-xs font-medium uppercase text-metal-400">
                {r.moneda === 'USD' ? 'Dólares (US$)' : 'Pesos ($)'}
              </p>
            )}
            <dl className="space-y-1.5 text-sm">
              <Fila label="Disponible hoy" valor={formatCurrency(r.disponible, r.moneda)} />
              <Fila label="Ingresos (7 días)" valor={`+${formatCurrency(r.ingresos, r.moneda)}`} clase="text-success" />
              <Fila label="Egresos (7 días)" valor={`-${formatCurrency(r.egresos, r.moneda)}`} clase="text-danger" />
              <Fila label="Cobros próximos 7 días" valor={formatCurrency(r.cobrosProximos, r.moneda)} />
              <Fila label="Pagos próximos 7 días" valor={formatCurrency(r.pagosProximos, r.moneda)} />
              {r.atrasados > 0 && <Fila label="Atrasados sin resolver" valor={r.atrasados} clase="text-warning" />}
            </dl>
          </div>
        ))}
      </div>
    </div>
  )
}

function Fila({ label, valor, clase = 'text-white' }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-metal-400">{label}</dt>
      <dd className={`font-medium ${clase}`}>{valor}</dd>
    </div>
  )
}
