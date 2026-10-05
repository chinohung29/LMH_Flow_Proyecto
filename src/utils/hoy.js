// Cálculos de la vista "Hoy": con cuánto cuento en un día dado, dejando atrás
// lo vencido que sigue pendiente.

export function fechaLocal(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dia}`
}

export function sumarDias(fecha, dias) {
  const d = new Date(`${fecha}T00:00:00`)
  d.setDate(d.getDate() + dias)
  return fechaLocal(d)
}

const signo = (m) => (m.tipo === 'ingreso' ? 1 : -1)

/**
 * Para una moneda y un día:
 * - disponible: saldo inicial + movimientos realizados hasta ese día (inclusive).
 * - delDia: movimientos con fecha == día (realizados y pendientes).
 * - cierreDia: disponible + pendientes del día.
 * - atrasados: pendientes anteriores al día. NO cuentan en el disponible ni en
 *   el cierre; son lo "viejo" que hay que resolver o dejar atrás.
 * - proximos: pendientes de los siguientes `diasProximos` días y su proyección.
 */
export function calcularDia({ movimientos, cuentas, moneda, dia, diasProximos = 7 }) {
  const enMoneda = movimientos.filter((m) => m.moneda === moneda)
  const saldoInicial = cuentas
    .filter((c) => c.moneda === moneda)
    .reduce((acc, c) => acc + Number(c.saldo_inicial || 0), 0)

  const disponible = enMoneda
    .filter((m) => m.estado === 'realizado' && m.fecha <= dia)
    .reduce((acc, m) => acc + signo(m) * Number(m.monto), saldoInicial)

  const delDia = enMoneda.filter((m) => m.fecha === dia)
  const pendientesDelDia = delDia.filter((m) => m.estado === 'pendiente')
  const cierreDia = pendientesDelDia.reduce((acc, m) => acc + signo(m) * Number(m.monto), disponible)

  const atrasados = enMoneda
    .filter((m) => m.estado === 'pendiente' && m.fecha < dia)
    .sort((a, b) => b.fecha.localeCompare(a.fecha))

  const hasta = sumarDias(dia, diasProximos)
  const proximos = enMoneda
    .filter((m) => m.estado === 'pendiente' && m.fecha > dia && m.fecha <= hasta)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
  const proyeccion = proximos.reduce((acc, m) => acc + signo(m) * Number(m.monto), cierreDia)

  return { moneda, disponible, delDia, cierreDia, atrasados, proximos, proyeccion, hasta }
}
