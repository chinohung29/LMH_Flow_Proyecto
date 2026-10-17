import { useEmpresa } from '../context/EmpresaContext'
import { fechaLocal } from '../utils/hoy'
import { linkMail, linkWhatsApp, mensajeRecordatorio } from '../utils/avisos'

// Botones "WhatsApp" / "Mail" con el recordatorio de cobro ya armado. Solo
// aparecen si el cliente tiene teléfono o email cargado.
export default function RecordarCobro({ movimiento }) {
  const { empresaActiva } = useEmpresa()
  if (movimiento.tipo !== 'ingreso' || movimiento.estado !== 'pendiente') return null

  const texto = mensajeRecordatorio({
    movimiento,
    empresaNombre: empresaActiva?.nombre,
    hoy: fechaLocal(),
  })
  const wa = linkWhatsApp(movimiento.cliente?.telefono, texto)
  const mail = linkMail(movimiento.cliente?.email, `Recordatorio de pago: ${movimiento.descripcion}`, texto)
  if (!wa && !mail) return null

  return (
    <span className="inline-flex items-center gap-2 text-xs">
      {wa && (
        <a href={wa} target="_blank" rel="noopener noreferrer" className="text-success hover:underline">
          Recordar por WhatsApp
        </a>
      )}
      {mail && (
        <a href={mail} className="text-electric-400 hover:underline">
          Recordar por mail
        </a>
      )}
    </span>
  )
}
