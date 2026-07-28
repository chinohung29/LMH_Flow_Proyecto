export function calcularResumen(movimientos, cuentas) {
  const saldoInicial = cuentas.reduce((acc, c) => acc + Number(c.saldo_inicial || 0), 0)

  let saldoDisponible = saldoInicial
  let cobrosPendientes = 0
  let pagosPendientes = 0

  for (const m of movimientos) {
    const monto = Number(m.monto)
    if (m.estado === 'realizado') {
      saldoDisponible += m.tipo === 'ingreso' ? monto : -monto
    } else if (m.tipo === 'ingreso') {
      cobrosPendientes += monto
    } else {
      pagosPendientes += monto
    }
  }

  const saldoProyectado = saldoDisponible + cobrosPendientes - pagosPendientes

  const proximosVencimientos = movimientos
    .filter((m) => m.estado === 'pendiente')
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .slice(0, 5)

  return {
    saldoDisponible,
    saldoProyectado,
    cobrosPendientes,
    pagosPendientes,
    proximosVencimientos,
  }
}

export function calcularSemaforo({ saldoProyectado, pagosPendientes }) {
  if (pagosPendientes <= 0) return { nivel: 'verde', label: 'Saludable' }
  const ratio = saldoProyectado / pagosPendientes
  if (ratio >= 1.2) return { nivel: 'verde', label: 'Saludable' }
  if (ratio >= 0.9) return { nivel: 'amarillo', label: 'Ajustado' }
  return { nivel: 'rojo', label: 'En riesgo' }
}
