import * as XLSX from 'xlsx'

const COLUMNAS = ['Fecha', 'Tipo', 'Descripción', 'Monto', 'Cuenta', 'Categoría', 'Estado']

export function descargarMovimientosExcel(movimientos) {
  const filas = movimientos.map((m) => ({
    Fecha: m.fecha,
    Tipo: m.tipo,
    Descripción: m.descripcion,
    Monto: m.monto,
    Cuenta: m.cuenta?.nombre ?? '',
    Categoría: m.categoria?.nombre ?? '',
    Estado: m.estado,
  }))

  const hoja = XLSX.utils.json_to_sheet(filas, { header: COLUMNAS })
  const libro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(libro, hoja, 'Movimientos')
  XLSX.writeFile(libro, `lmh-flow-movimientos-${new Date().toISOString().slice(0, 10)}.xlsx`)
}

function normalizarClave(clave) {
  return clave
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

function normalizarFecha(valor) {
  if (valor instanceof Date) return valor.toISOString().slice(0, 10)

  if (typeof valor === 'number') {
    const parsed = XLSX.SSF.parse_date_code(valor)
    return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`
  }

  const texto = String(valor ?? '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return texto

  const dmy = texto.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (dmy) {
    const [, d, m, y] = dmy
    return `${y}-${d.padStart(2, '0')}-${m.padStart(2, '0')}`
  }

  return null
}

function normalizarTipo(valor) {
  const t = normalizarClave(valor)
  if (['ingreso', 'ingresos', 'income'].includes(t)) return 'ingreso'
  if (['egreso', 'egresos', 'gasto', 'gastos', 'expense'].includes(t)) return 'egreso'
  return null
}

function normalizarEstado(valor) {
  const e = normalizarClave(valor)
  if (['realizado', 'pagado', 'cobrado', 'done'].includes(e)) return 'realizado'
  return 'pendiente'
}

/**
 * Lee un archivo .xlsx/.csv y devuelve { validos, invalidos }.
 * `validos` está listo para insertar (cuenta_id/categoria_id resueltos por
 * nombre contra las listas del usuario); `invalidos` trae el motivo de cada
 * fila rechazada para mostrarle un resumen.
 */
export async function leerMovimientosExcel(file, { cuentas, categorias }) {
  const buffer = await file.arrayBuffer()
  const libro = XLSX.read(buffer, { type: 'array', cellDates: true })
  const primeraHoja = libro.Sheets[libro.SheetNames[0]]
  const filas = XLSX.utils.sheet_to_json(primeraHoja, { defval: '' })

  const cuentaPorNombre = new Map(cuentas.map((c) => [normalizarClave(c.nombre), c.id]))
  const categoriaPorNombre = new Map(categorias.map((c) => [normalizarClave(c.nombre), c.id]))

  const validos = []
  const invalidos = []

  filas.forEach((fila, index) => {
    const entradas = Object.fromEntries(
      Object.entries(fila).map(([k, v]) => [normalizarClave(k), v])
    )

    const fecha = normalizarFecha(entradas.fecha)
    const tipo = normalizarTipo(entradas.tipo)
    const descripcion = String(entradas.descripcion ?? '').trim()
    const monto = Number(entradas.monto)

    const motivos = []
    if (!fecha) motivos.push('fecha inválida')
    if (!tipo) motivos.push('tipo debe ser ingreso o egreso')
    if (!descripcion) motivos.push('falta descripción')
    if (!monto || monto <= 0) motivos.push('monto inválido')

    if (motivos.length > 0) {
      invalidos.push({ fila: index + 2, motivos })
      return
    }

    validos.push({
      fecha,
      tipo,
      descripcion,
      monto,
      estado: normalizarEstado(entradas.estado),
      cuenta_id: cuentaPorNombre.get(normalizarClave(entradas.cuenta)) ?? null,
      categoria_id: categoriaPorNombre.get(normalizarClave(entradas.categoria)) ?? null,
    })
  })

  return { validos, invalidos }
}
