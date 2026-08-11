import { useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useEmpresa } from '../context/EmpresaContext'
import { leerMovimientosExcel, descargarModeloMovimientosExcel } from '../utils/excel'
import { bulkInsertMovimientos } from '../services/movimientos'

export default function ImportMovimientosButton({
  cuentas,
  categorias,
  clientes = [],
  proveedores = [],
  onImported,
  onError,
}) {
  const { user } = useAuth()
  const { empresaActiva } = useEmpresa()
  const inputRef = useRef(null)
  const [importando, setImportando] = useState(false)
  const [generandoModelo, setGenerandoModelo] = useState(false)
  const [resumen, setResumen] = useState('')

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setImportando(true)
    setResumen('')
    try {
      const { validos, invalidos, avisos } = await leerMovimientosExcel(file, {
        cuentas,
        categorias,
        clientes,
        proveedores,
      })

      let insertados = []
      if (validos.length > 0) {
        insertados = await bulkInsertMovimientos(user.id, empresaActiva.id, validos)
        onImported?.(insertados)
      }

      const partes = [`${insertados.length} movimiento(s) importado(s)`]
      if (avisos.length > 0) {
        partes.push(`${avisos.length} con algún dato (cuenta/categoría/cliente/proveedor) no reconocido, importados igual sin esa asignación`)
      }
      if (invalidos.length > 0) {
        partes.push(`${invalidos.length} fila(s) omitida(s) por datos inválidos`)
      }
      setResumen(partes.join(' · '))
    } catch (err) {
      onError?.(err.message)
    } finally {
      setImportando(false)
    }
  }

  async function handleDescargarModelo() {
    setGenerandoModelo(true)
    try {
      await descargarModeloMovimientosExcel({ cuentas, categorias, clientes, proveedores })
    } catch (err) {
      onError?.(err.message)
    } finally {
      setGenerandoModelo(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-secondary text-sm"
          disabled={importando}
          onClick={() => inputRef.current?.click()}
        >
          {importando ? 'Importando…' : 'Importar Excel'}
        </button>
        <button
          type="button"
          className="text-sm text-electric-400 hover:text-electric-300"
          disabled={generandoModelo}
          onClick={handleDescargarModelo}
        >
          {generandoModelo ? 'Generando…' : 'Descargar modelo'}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFile}
      />
      {resumen && <p className="text-xs text-metal-400">{resumen}</p>}
    </div>
  )
}
