import { descargarMovimientosExcel } from '../utils/excel'

export default function ExportMovimientosButton({ movimientos }) {
  return (
    <button
      type="button"
      className="btn-secondary text-sm"
      onClick={() => descargarMovimientosExcel(movimientos)}
    >
      Exportar Excel
    </button>
  )
}
