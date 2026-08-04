import * as XLSX from 'xlsx'

const COLUMNAS = ['Fecha', 'Tipo', 'Descripción', 'Monto', 'Moneda', 'Cuenta', 'Categoría', 'Estado']

export function descargarMovimientosExcel(movimientos) {
  const filas = movimientos.map((m) => ({
    Fecha: m.fecha,
    Tipo: m.tipo,
    Descripción: m.descripcion,
    Monto: m.monto,
    Moneda: m.moneda === 'USD' ? 'US$' : '$',
    Cuenta: m.cuenta?.nombre ?? '',
    Categoría: m.categoria?.nombre ?? '',
    Estado: m.estado,
  }))

  const hoja = XLSX.utils.json_to_sheet(filas, { header: COLUMNAS })
  const libro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(libro, hoja, 'Movimientos')
  XLSX.writeFile(libro, `lmh-flow-movimientos-${new Date().toISOString().slice(0, 10)}.xlsx`)
}

function descargarBuffer(buffer, nombreArchivo) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombreArchivo
  enlace.click()
  URL.revokeObjectURL(url)
}

/**
 * Escribe `filas` como una Tabla nativa de Excel (con flechitas de filtro
 * en cada columna) en vez de celdas sueltas — así se puede filtrar/ordenar
 * directamente en Excel, y sirve como fuente lista para armar una Tabla o
 * Gráfico dinámico real (Insertar → Tabla dinámica) sin tocar la app.
 */
function agregarTabla(hoja, nombre, columnas, filas) {
  columnas.forEach((header, i) => {
    hoja.getColumn(i + 1).width = Math.max(14, header.length + 4)
  })

  if (filas.length === 0) {
    hoja.addRow(columnas).font = { bold: true }
    return
  }

  hoja.addTable({
    name: nombre,
    ref: 'A1',
    headerRow: true,
    style: { theme: 'TableStyleMedium9', showRowStripes: true },
    columns: columnas.map((header) => ({ name: header, filterButton: true })),
    rows: filas,
  })
}

/**
 * `graficos` es un array de { titulo, base64 } con capturas PNG (data URL)
 * de los gráficos ya renderizados en pantalla (via chart.toBase64Image()),
 * que se insertan como imágenes en una hoja aparte — xlsx (SheetJS free)
 * no soporta incrustar gráficos nativos de Excel, así que usamos exceljs
 * para poder al menos incrustarlos como imagen. `movimientos` (opcional)
 * es el detalle crudo filtrado, que se agrega como Tabla en una hoja
 * "Movimientos" pensada como fuente para una Tabla/Gráfico dinámico real.
 */
export async function descargarReporteExcel({
  moneda,
  categoriasIngreso,
  categoriasEgreso,
  clientes,
  proveedores,
  evolucion,
  movimientos = [],
  graficos = [],
}) {
  const { default: ExcelJS } = await import('exceljs')
  const libro = new ExcelJS.Workbook()

  if (graficos.length > 0) {
    const hojaGraficos = libro.addWorksheet('Gráficos')
    let filaActual = 1
    for (const { titulo, base64 } of graficos) {
      if (!base64) continue
      hojaGraficos.getCell(`A${filaActual}`).value = titulo
      hojaGraficos.getCell(`A${filaActual}`).font = { bold: true, size: 12 }
      const imagenId = libro.addImage({ base64, extension: 'png' })
      hojaGraficos.addImage(imagenId, {
        tl: { col: 0, row: filaActual },
        ext: { width: 640, height: 320 },
      })
      filaActual += 18
    }

    if (movimientos.length > 0) {
      filaActual += 1
      hojaGraficos.getCell(`A${filaActual}`).value =
        'Cómo armar un gráfico dinámico interactivo (tipo Power BI)'
      hojaGraficos.getCell(`A${filaActual}`).font = { bold: true, size: 12 }
      filaActual += 1
      const pasos = [
        '1. Andá a la hoja "Movimientos" (el detalle completo, ya como Tabla de Excel).',
        '2. Hacé clic en cualquier celda dentro de esa tabla.',
        '3. Insertar → Tabla dinámica (o "Gráfico dinámico" si tu versión de Excel lo tiene directo).',
        '4. Arrastrá Fecha, Categoría o Cliente/Proveedor a Filas o Filtros, y Monto a Valores.',
        '5. Ese gráfico sí queda 100% interactivo: filtrás por mes, categoría, etc. sin la app.',
      ]
      for (const paso of pasos) {
        hojaGraficos.getCell(`A${filaActual}`).value = paso
        filaActual += 1
      }
    }
  }

  agregarTabla(
    libro.addWorksheet('Por categoría'),
    'TablaCategorias',
    ['Tipo', 'Categoría', 'Monto'],
    [
      ...categoriasIngreso.map((c) => ['Ingreso', c.categoria, c.total]),
      ...categoriasEgreso.map((c) => ['Egreso', c.categoria, c.total]),
    ]
  )

  agregarTabla(
    libro.addWorksheet('Top clientes'),
    'TablaClientes',
    ['Cliente', 'Facturado'],
    clientes.map((c) => [c.nombre, c.total])
  )

  agregarTabla(
    libro.addWorksheet('Top proveedores'),
    'TablaProveedores',
    ['Proveedor', 'Pagado'],
    proveedores.map((p) => [p.nombre, p.total])
  )

  if (evolucion) {
    agregarTabla(
      libro.addWorksheet('Evolución mensual'),
      'TablaEvolucion',
      ['Mes', 'Ingresos', 'Egresos'],
      evolucion.labels.map((label, i) => [label, evolucion.ingresos[i], evolucion.egresos[i]])
    )
  }

  if (movimientos.length > 0) {
    agregarTabla(
      libro.addWorksheet('Movimientos'),
      'TablaMovimientos',
      ['Fecha', 'Tipo', 'Descripción', 'Categoría', 'Cliente', 'Proveedor', 'Monto', 'Estado'],
      movimientos.map((m) => [
        m.fecha,
        m.tipo,
        m.descripcion,
        m.categoria?.nombre ?? '',
        m.cliente?.nombre ?? '',
        m.proveedor?.nombre ?? '',
        Number(m.monto),
        m.estado,
      ])
    )
  }

  const buffer = await libro.xlsx.writeBuffer()
  const sufijoMoneda = moneda === 'USD' ? 'usd' : 'ars'
  descargarBuffer(buffer, `lmh-flow-reportes-${sufijoMoneda}-${new Date().toISOString().slice(0, 10)}.xlsx`)
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

function normalizarMoneda(valor) {
  const m = normalizarClave(valor)
  if (['us$', 'usd', 'u$s', 'dolar', 'dolares', 'u$d'].includes(m)) return 'USD'
  if (['$', 'ars', 'pesos', 'peso'].includes(m)) return 'ARS'
  return null
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

  const cuentaPorNombre = new Map(
    cuentas.map((c) => [normalizarClave(c.nombre), { id: c.id, moneda: c.moneda }])
  )
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

    const cuentaMatch = cuentaPorNombre.get(normalizarClave(entradas.cuenta))

    validos.push({
      fecha,
      tipo,
      descripcion,
      monto,
      estado: normalizarEstado(entradas.estado),
      moneda: normalizarMoneda(entradas.moneda) ?? cuentaMatch?.moneda ?? 'ARS',
      cuenta_id: cuentaMatch?.id ?? null,
      categoria_id: categoriaPorNombre.get(normalizarClave(entradas.categoria)) ?? null,
    })
  })

  return { validos, invalidos }
}
