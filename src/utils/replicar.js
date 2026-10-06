// Utilidades para replicar los movimientos de un mes en otro.

export function mesActual() {
  return new Date().toISOString().slice(0, 7)
}

export function mesAnterior(mes = mesActual()) {
  const [y, m] = mes.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 2, 1))
  return d.toISOString().slice(0, 7)
}

// Mantiene el día del mes; si el mes destino es más corto (ej: 31 -> febrero)
// usa el último día disponible.
export function trasladarFecha(fecha, mesDestino) {
  const dia = Number(fecha.slice(8, 10))
  const [y, m] = mesDestino.split('-').map(Number)
  const ultimoDia = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return `${mesDestino}-${String(Math.min(dia, ultimoDia)).padStart(2, '0')}`
}

function claveMovimiento(m) {
  return [
    m.tipo,
    (m.descripcion || '').trim().toLowerCase(),
    Number(m.monto),
    m.cuenta_id ?? '',
    m.categoria_id ?? '',
  ].join('|')
}

// Devuelve las filas listas para insertar y cuántas se omitieron por ya existir
// en el mes destino.
export function prepararReplica({ movimientos, mesOrigen, mesDestino, tipos }) {
  const delMes = (mes) => movimientos.filter((m) => m.fecha.startsWith(mes))
  const origen = delMes(mesOrigen).filter((m) => tipos.includes(m.tipo))
  const existentes = new Set(delMes(mesDestino).map(claveMovimiento))

  const filas = []
  let omitidos = 0
  for (const m of origen) {
    if (existentes.has(claveMovimiento(m))) {
      omitidos += 1
      continue
    }
    filas.push({
      cuenta_id: m.cuenta_id,
      categoria_id: m.categoria_id,
      cliente_id: m.cliente_id,
      proveedor_id: m.proveedor_id,
      tipo: m.tipo,
      descripcion: m.descripcion,
      monto: m.monto,
      moneda: m.moneda,
      fecha: trasladarFecha(m.fecha, mesDestino),
      estado: 'pendiente',
    })
  }
  return { filas, omitidos, totalOrigen: origen.length }
}
