const VENTANAS = {
  diario: { antesDias: 14, despuesDias: 30 },
  semanal: { antesDias: 42, despuesDias: 84 },
  mensual: { antesDias: 90, despuesDias: 210 },
}

function toDate(fechaISO) {
  return new Date(`${fechaISO}T00:00:00`)
}

function toISO(date) {
  return date.toISOString().slice(0, 10)
}

function sumarDias(fechaISO, dias) {
  const d = toDate(fechaISO)
  d.setDate(d.getDate() + dias)
  return toISO(d)
}

function inicioDeSemana(fechaISO) {
  const d = toDate(fechaISO)
  const diaSemana = d.getDay() || 7 // lunes=1 ... domingo=7
  d.setDate(d.getDate() - diaSemana + 1)
  return toISO(d)
}

function inicioDeMes(fechaISO) {
  return `${fechaISO.slice(0, 7)}-01`
}

function finDeMes(fechaISO) {
  const d = toDate(inicioDeMes(fechaISO))
  d.setMonth(d.getMonth() + 1)
  d.setDate(d.getDate() - 1)
  return toISO(d)
}

const FORMATO_DIA = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short' })
const FORMATO_MES = new Intl.DateTimeFormat('es-AR', { month: 'short', year: '2-digit' })

function generarBuckets(desde, hasta, vista) {
  const buckets = []

  if (vista === 'diario') {
    let cursor = desde
    while (cursor <= hasta) {
      buckets.push({ inicio: cursor, fin: cursor, label: FORMATO_DIA.format(toDate(cursor)) })
      cursor = sumarDias(cursor, 1)
    }
  } else if (vista === 'semanal') {
    let cursor = inicioDeSemana(desde)
    while (cursor <= hasta) {
      const fin = sumarDias(cursor, 6)
      buckets.push({ inicio: cursor, fin, label: FORMATO_DIA.format(toDate(cursor)) })
      cursor = sumarDias(cursor, 7)
    }
  } else {
    let cursor = inicioDeMes(desde)
    while (cursor <= hasta) {
      const fin = finDeMes(cursor)
      buckets.push({ inicio: cursor, fin, label: FORMATO_MES.format(toDate(cursor)) })
      const siguiente = toDate(fin)
      siguiente.setDate(siguiente.getDate() + 1)
      cursor = toISO(siguiente)
    }
  }

  return buckets
}

/**
 * Construye la serie de saldo proyectado agrupada por día/semana/mes.
 * Incluye movimientos realizados y pendientes: representa el saldo
 * "esperado" si todo lo cargado se cobra/paga en su fecha.
 */
export function agruparFlujo(movimientos, cuentas, vista = 'diario') {
  const saldoInicial = cuentas.reduce((acc, c) => acc + Number(c.saldo_inicial || 0), 0)

  const eventos = movimientos
    .map((m) => ({
      fecha: m.fecha,
      delta: m.tipo === 'ingreso' ? Number(m.monto) : -Number(m.monto),
    }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))

  const hoy = toISO(new Date())
  const ventana = VENTANAS[vista] ?? VENTANAS.diario
  const desde = sumarDias(hoy, -ventana.antesDias)
  const hasta = sumarDias(hoy, ventana.despuesDias)

  let saldoArrastrado = saldoInicial
  let cursorEventos = 0
  while (cursorEventos < eventos.length && eventos[cursorEventos].fecha < desde) {
    saldoArrastrado += eventos[cursorEventos].delta
    cursorEventos++
  }

  // Saldo de hoy: independiente de la ventana del gráfico (que arranca
  // `antesDias` atrás), es el saldo inicial + todos los movimientos hasta
  // hoy inclusive.
  let saldoHoy = saldoInicial
  for (const evento of eventos) {
    if (evento.fecha > hoy) break
    saldoHoy += evento.delta
  }

  const buckets = generarBuckets(desde, hasta, vista)
  const labels = []
  const saldos = []
  let saldoActual = saldoArrastrado
  let i = cursorEventos

  for (const bucket of buckets) {
    while (i < eventos.length && eventos[i].fecha <= bucket.fin) {
      saldoActual += eventos[i].delta
      i++
    }
    labels.push(bucket.label)
    saldos.push(Math.round(saldoActual))
  }

  return { labels, saldos, saldoHoy: Math.round(saldoHoy) }
}
