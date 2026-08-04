const FORMATO_MES = new Intl.DateTimeFormat('es-AR', { month: 'short', year: '2-digit' })

function nombreCategoria(m) {
  return m.categoria?.nombre || 'Sin categoría'
}

/** Total ingresos/egresos por categoría, agrupado por moneda y ordenado de mayor a menor. */
export function resumenPorCategoria(movimientos) {
  const acumulado = {}

  for (const m of movimientos) {
    if (!acumulado[m.moneda]) acumulado[m.moneda] = { ingreso: new Map(), egreso: new Map() }
    const grupo = acumulado[m.moneda][m.tipo]
    const categoria = nombreCategoria(m)
    grupo.set(categoria, (grupo.get(categoria) ?? 0) + Number(m.monto))
  }

  const resultado = {}
  for (const [moneda, tipos] of Object.entries(acumulado)) {
    resultado[moneda] = {
      ingreso: [...tipos.ingreso.entries()]
        .map(([categoria, total]) => ({ categoria, total }))
        .sort((a, b) => b.total - a.total),
      egreso: [...tipos.egreso.entries()]
        .map(([categoria, total]) => ({ categoria, total }))
        .sort((a, b) => b.total - a.total),
    }
  }
  return resultado
}

function rankingPor(movimientos, entidades, { tipo, clave }, limite) {
  const acumulado = {}
  for (const m of movimientos) {
    if (m.tipo !== tipo || !m[clave]) continue
    if (!acumulado[m.moneda]) acumulado[m.moneda] = new Map()
    const mapa = acumulado[m.moneda]
    mapa.set(m[clave], (mapa.get(m[clave]) ?? 0) + Number(m.monto))
  }

  const nombrePorId = new Map(entidades.map((e) => [e.id, e.nombre]))
  const resultado = {}
  for (const [moneda, totales] of Object.entries(acumulado)) {
    resultado[moneda] = [...totales.entries()]
      .map(([id, total]) => ({ nombre: nombrePorId.get(id) ?? 'Eliminado', total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, limite)
  }
  return resultado
}

/** Top clientes por monto facturado (ingresos), agrupado por moneda. */
export function rankingClientes(movimientos, clientes, limite = 10) {
  return rankingPor(movimientos, clientes, { tipo: 'ingreso', clave: 'cliente_id' }, limite)
}

/** Top proveedores por monto pagado (egresos), agrupado por moneda. */
export function rankingProveedores(movimientos, proveedores, limite = 10) {
  return rankingPor(movimientos, proveedores, { tipo: 'egreso', clave: 'proveedor_id' }, limite)
}

/**
 * Serie mensual de ingresos vs egresos, agrupada por moneda. Por defecto
 * muestra los últimos 12 meses; pasando `{ desde, hasta }` (claves
 * "YYYY-MM") se puede acotar a un rango de meses específico.
 */
export function evolucionMensual(movimientos, { desde, hasta } = {}) {
  const hoy = new Date()
  let inicio
  let fin
  if (desde && hasta) {
    const [anioDesde, mesDesde] = desde.split('-').map(Number)
    const [anioHasta, mesHasta] = hasta.split('-').map(Number)
    inicio = new Date(anioDesde, mesDesde - 1, 1)
    fin = new Date(anioHasta, mesHasta - 1, 1)
  } else {
    fin = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    inicio = new Date(fin.getFullYear(), fin.getMonth() - 11, 1)
  }

  const buckets = []
  const cursor = new Date(inicio)
  while (cursor <= fin) {
    buckets.push({
      key: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`,
      label: FORMATO_MES.format(cursor),
    })
    cursor.setMonth(cursor.getMonth() + 1)
  }
  const indicePorKey = new Map(buckets.map((b, i) => [b.key, i]))

  const resultado = {}
  for (const m of movimientos) {
    const idx = indicePorKey.get(m.fecha.slice(0, 7))
    if (idx === undefined) continue
    if (!resultado[m.moneda]) {
      resultado[m.moneda] = {
        labels: buckets.map((b) => b.label),
        ingresos: new Array(buckets.length).fill(0),
        egresos: new Array(buckets.length).fill(0),
      }
    }
    const serie = resultado[m.moneda]
    if (m.tipo === 'ingreso') serie.ingresos[idx] += Number(m.monto)
    else serie.egresos[idx] += Number(m.monto)
  }
  return resultado
}
