import * as XLSX from 'xlsx'

const COLUMNAS = [
  'Fecha',
  'Tipo',
  'Descripción',
  'Monto',
  'Moneda',
  'Cuenta',
  'Categoría',
  'Cliente',
  'Proveedor',
  'Estado',
]

export function descargarMovimientosExcel(movimientos) {
  const filas = movimientos.map((m) => ({
    Fecha: m.fecha,
    Tipo: m.tipo,
    Descripción: m.descripcion,
    Monto: m.monto,
    Moneda: m.moneda === 'USD' ? 'US$' : '$',
    Cuenta: m.cuenta?.nombre ?? '',
    Categoría: m.categoria?.nombre ?? '',
    Cliente: m.cliente?.nombre ?? '',
    Proveedor: m.proveedor?.nombre ?? '',
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
  indicadores = [],
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

  if (indicadores.length > 0) {
    agregarTabla(
      libro.addWorksheet('Indicadores'),
      'TablaIndicadores',
      ['Indicador', 'Valor'],
      indicadores.map((i) => [i.nombre, i.valor])
    )
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

/**
 * Acepta números de Excel normales (1234.56) y también el formato
 * argentino cuando la celda llega como texto ("1.234,56" o "1234,56":
 * punto = separador de miles, coma = decimales).
 */
function parseMonto(valor) {
  if (typeof valor === 'number') return valor
  const texto = String(valor ?? '').trim()
  if (!texto) return NaN
  const directo = Number(texto)
  if (!Number.isNaN(directo)) return directo
  const formatoArgentino = texto.replace(/\./g, '').replace(',', '.')
  return Number(formatoArgentino)
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
    if (Number(d) < 1 || Number(d) > 31 || Number(m) < 1 || Number(m) > 12) return null
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
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
 * Lee un archivo .xlsx/.csv y devuelve { validos, invalidos, avisos }.
 * `validos` está listo para insertar (cuenta_id/categoria_id/cliente_id/
 * proveedor_id resueltos por nombre contra las listas del usuario);
 * `invalidos` trae el motivo de cada fila rechazada; `avisos` son filas
 * que sí se importaron pero con una Cuenta/Categoría/Cliente/Proveedor
 * que no coincide con ninguno existente (se importan igual, ya que todos
 * son opcionales — pero vale la pena avisar por si fue un error de tipeo).
 */
export async function leerMovimientosExcel(file, { cuentas, categorias, clientes = [], proveedores = [] }) {
  const buffer = await file.arrayBuffer()
  const libro = XLSX.read(buffer, { type: 'array', cellDates: true })
  const primeraHoja = libro.Sheets[libro.SheetNames[0]]
  const filas = XLSX.utils.sheet_to_json(primeraHoja, { defval: '' })

  const cuentaPorNombre = new Map(
    cuentas.map((c) => [normalizarClave(c.nombre), { id: c.id, moneda: c.moneda }])
  )
  const categoriaPorNombre = new Map(categorias.map((c) => [normalizarClave(c.nombre), c.id]))
  const clientePorNombre = new Map(clientes.map((c) => [normalizarClave(c.nombre), c.id]))
  const proveedorPorNombre = new Map(proveedores.map((p) => [normalizarClave(p.nombre), p.id]))

  const validos = []
  const invalidos = []
  const avisos = []

  filas.forEach((fila, index) => {
    const entradas = Object.fromEntries(
      Object.entries(fila).map(([k, v]) => [normalizarClave(k), v])
    )

    const fecha = normalizarFecha(entradas.fecha)
    const tipo = normalizarTipo(entradas.tipo)
    const descripcion = String(entradas.descripcion ?? '').trim()
    const monto = parseMonto(entradas.monto)

    const motivos = []
    if (!fecha) motivos.push('fecha inválida')
    if (!tipo) motivos.push('tipo debe ser ingreso o egreso')
    if (!descripcion) motivos.push('falta descripción')
    if (!monto || Number.isNaN(monto) || monto <= 0) motivos.push('monto inválido')

    if (motivos.length > 0) {
      invalidos.push({ fila: index + 2, motivos })
      return
    }

    const textoCuenta = String(entradas.cuenta ?? '').trim()
    const textoCategoria = String(entradas.categoria ?? '').trim()
    const textoCliente = String(entradas.cliente ?? '').trim()
    const textoProveedor = String(entradas.proveedor ?? '').trim()
    const cuentaMatch = cuentaPorNombre.get(normalizarClave(textoCuenta))
    const categoriaMatch = categoriaPorNombre.get(normalizarClave(textoCategoria))
    const clienteMatch = clientePorNombre.get(normalizarClave(textoCliente))
    const proveedorMatch = proveedorPorNombre.get(normalizarClave(textoProveedor))

    const avisosFila = []
    if (textoCuenta && !cuentaMatch) avisosFila.push(`cuenta "${textoCuenta}" no encontrada`)
    if (textoCategoria && !categoriaMatch) avisosFila.push(`categoría "${textoCategoria}" no encontrada`)
    if (textoCliente && !clienteMatch) avisosFila.push(`cliente "${textoCliente}" no encontrado`)
    if (textoProveedor && !proveedorMatch) avisosFila.push(`proveedor "${textoProveedor}" no encontrado`)
    if (avisosFila.length > 0) avisos.push({ fila: index + 2, avisos: avisosFila })

    validos.push({
      fecha,
      tipo,
      descripcion,
      monto,
      estado: normalizarEstado(entradas.estado),
      moneda: normalizarMoneda(entradas.moneda) ?? cuentaMatch?.moneda ?? 'ARS',
      cuenta_id: cuentaMatch?.id ?? null,
      categoria_id: categoriaMatch ?? null,
      cliente_id: clienteMatch ?? null,
      proveedor_id: proveedorMatch ?? null,
    })
  })

  return { validos, invalidos, avisos }
}

const ULTIMA_FILA_MODELO = 500

/**
 * Genera un .xlsx modelo para importar movimientos: la hoja "Movimientos"
 * trae los encabezados correctos con 2 filas de ejemplo (usando cuentas,
 * categorías, clientes y proveedores reales del usuario si ya tiene, para
 * que los nombres calcen exacto) y desplegables reales de Excel en cada
 * columna con nombres (Tipo, Moneda, Estado, Cuenta, Categoría, Cliente,
 * Proveedor) — las listas de Cuenta/Categoría/Cliente/Proveedor viven en
 * una hoja auxiliar oculta "Listas", ya que Excel no permite un desplegable
 * con una lista inline demasiado larga. Se usa exceljs (en vez de xlsx)
 * porque es la única de las dos librerías que soporta escribir validación
 * de datos (data validation) en un .xlsx.
 */
export async function descargarModeloMovimientosExcel({
  cuentas = [],
  categorias = [],
  clientes = [],
  proveedores = [],
} = {}) {
  const { default: ExcelJS } = await import('exceljs')
  const libro = new ExcelJS.Workbook()

  const cuentaEjemplo = cuentas[0]?.nombre ?? 'Caja'
  const categoriaIngresoEjemplo = categorias.find((c) => c.tipo === 'ingreso')?.nombre ?? 'Ventas'
  const categoriaEgresoEjemplo = categorias.find((c) => c.tipo === 'egreso')?.nombre ?? 'Alquiler'
  const clienteEjemplo = clientes[0]?.nombre ?? ''
  const proveedorEjemplo = proveedores[0]?.nombre ?? ''

  const hojaMovimientos = libro.addWorksheet('Movimientos')
  hojaMovimientos.addRow(COLUMNAS).font = { bold: true }
  hojaMovimientos.addRow([
    new Date().toISOString().slice(0, 10),
    'ingreso',
    'Ejemplo: cobro a un cliente',
    150000,
    '$',
    cuentaEjemplo,
    categoriaIngresoEjemplo,
    clienteEjemplo,
    '',
    'realizado',
  ])
  hojaMovimientos.addRow([
    new Date().toISOString().slice(0, 10),
    'egreso',
    'Ejemplo: pago a un proveedor',
    45000,
    '$',
    cuentaEjemplo,
    categoriaEgresoEjemplo,
    '',
    proveedorEjemplo,
    'pendiente',
  ])
  COLUMNAS.forEach((header, i) => {
    hojaMovimientos.getColumn(i + 1).width = Math.max(14, header.length + 4)
  })
  hojaMovimientos.views = [{ state: 'frozen', ySplit: 1 }]

  // Hoja auxiliar con las listas reales del usuario — oculta (no
  // "veryHidden": se puede mostrar con clic derecho → Mostrar si alguien
  // quiere ver de dónde salen los desplegables).
  const hojaListas = libro.addWorksheet('Listas', { state: 'hidden' })
  hojaListas.getColumn(1).values = ['Cuentas', ...cuentas.map((c) => c.nombre)]
  hojaListas.getColumn(2).values = ['Categorías', ...categorias.map((c) => c.nombre)]
  hojaListas.getColumn(3).values = ['Clientes', ...clientes.map((c) => c.nombre)]
  hojaListas.getColumn(4).values = ['Proveedores', ...proveedores.map((p) => p.nombre)]

  function agregarDesplegable(columna, formulae) {
    hojaMovimientos.dataValidations.add(`${columna}2:${columna}${ULTIMA_FILA_MODELO}`, {
      type: 'list',
      allowBlank: true,
      showErrorMessage: false,
      formulae,
    })
  }

  agregarDesplegable('B', ['"ingreso,egreso"']) // Tipo
  agregarDesplegable('E', ['"$,US$"']) // Moneda
  agregarDesplegable('J', ['"realizado,pendiente"']) // Estado
  if (cuentas.length > 0) agregarDesplegable('F', [`Listas!$A$2:$A$${1 + cuentas.length}`])
  if (categorias.length > 0) agregarDesplegable('G', [`Listas!$B$2:$B$${1 + categorias.length}`])
  if (clientes.length > 0) agregarDesplegable('H', [`Listas!$C$2:$C$${1 + clientes.length}`])
  if (proveedores.length > 0) agregarDesplegable('I', [`Listas!$D$2:$D$${1 + proveedores.length}`])

  const hojaInstrucciones = libro.addWorksheet('Instrucciones')
  hojaInstrucciones.addRow(['Columna', 'Qué va', 'Valores válidos']).font = { bold: true }
  hojaInstrucciones.addRows([
    ['Fecha', 'Obligatoria', 'AAAA-MM-DD (ej: 2026-08-15) o DD/MM/AAAA (ej: 15/08/2026)'],
    ['Tipo', 'Obligatorio', '"ingreso" o "egreso" — tiene desplegable'],
    ['Descripción', 'Obligatoria', 'Texto libre'],
    ['Monto', 'Obligatorio', 'Número positivo. Podés usar formato argentino (1.234,56) o simple (1234.56)'],
    ['Moneda', 'Opcional', '"$" (pesos) o "US$" (dólares) — tiene desplegable. Si se deja vacío, se usa la moneda de la Cuenta indicada, o pesos por defecto'],
    ['Cuenta', 'Opcional', 'Tiene desplegable con tus cuentas actuales. Si escribís un nombre que no coincide, el movimiento igual se importa, pero sin cuenta asignada'],
    ['Categoría', 'Opcional', 'Tiene desplegable con tus categorías actuales (de ingreso y egreso mezcladas — elegí la que corresponda según el Tipo). Si no coincide, se importa sin categoría'],
    ['Cliente', 'Opcional', 'Tiene desplegable con tus clientes actuales. Tiene sentido solo en movimientos de tipo "ingreso"'],
    ['Proveedor', 'Opcional', 'Tiene desplegable con tus proveedores actuales. Tiene sentido solo en movimientos de tipo "egreso"'],
    ['Estado', 'Opcional', '"realizado" o "pendiente" — tiene desplegable. Si se deja vacío, se asume "pendiente"'],
    [],
    ['Hacé clic en cualquier celda de esas columnas en la hoja "Movimientos" y va a aparecer una flechita a la derecha con las opciones válidas — no hace falta escribir a mano.'],
    ['No cambies los encabezados de la primera fila de la hoja "Movimientos".'],
    ['Podés borrar las 2 filas de ejemplo antes de cargar las tuyas.'],
  ])
  hojaInstrucciones.getColumn(1).width = 45
  hojaInstrucciones.getColumn(2).width = 14
  hojaInstrucciones.getColumn(3).width = 80

  const buffer = await libro.xlsx.writeBuffer()
  descargarBuffer(buffer, 'lmh-flow-modelo-importar-movimientos.xlsx')
}
