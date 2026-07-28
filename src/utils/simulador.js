function sumarDias(fechaISO, dias) {
  const d = new Date(`${fechaISO}T00:00:00`)
  d.setDate(d.getDate() + dias)
  return d.toISOString().slice(0, 10)
}

function sumarMeses(fechaISO, meses) {
  const d = new Date(`${fechaISO}T00:00:00`)
  d.setMonth(d.getMonth() + meses)
  return d.toISOString().slice(0, 10)
}

export const ESCENARIOS = [
  {
    id: 'cobro_retrasado',
    label: 'Cobro retrasado',
    descripcion: 'Un cobro pendiente se atrasa X días.',
  },
  {
    id: 'compra_extraordinaria',
    label: 'Compra extraordinaria',
    descripcion: 'Un gasto puntual que no tenías planeado.',
  },
  {
    id: 'nuevo_prestamo',
    label: 'Nuevo préstamo',
    descripcion: 'Recibís un monto y lo devolvés en cuotas mensuales.',
  },
  {
    id: 'incremento_ventas',
    label: 'Incremento de ventas',
    descripcion: '% de aumento sobre tus cobros pendientes futuros.',
  },
  {
    id: 'incremento_gastos',
    label: 'Incremento de gastos',
    descripcion: '% de aumento sobre tus pagos pendientes futuros.',
  },
]

/**
 * Devuelve una copia de `movimientos` con el escenario aplicado. Nunca
 * modifica ni guarda nada: es solo para reproyectar el flujo en memoria.
 */
export function aplicarEscenario(movimientos, escenario) {
  const hoy = new Date().toISOString().slice(0, 10)

  switch (escenario.tipo) {
    case 'cobro_retrasado': {
      if (!escenario.movimientoId) return movimientos
      const dias = Number(escenario.dias) || 0
      return movimientos.map((m) =>
        m.id === escenario.movimientoId ? { ...m, fecha: sumarDias(m.fecha, dias) } : m
      )
    }

    case 'compra_extraordinaria': {
      if (!escenario.monto || !escenario.fecha) return movimientos
      return [
        ...movimientos,
        {
          id: 'sim-compra',
          tipo: 'egreso',
          monto: Number(escenario.monto),
          fecha: escenario.fecha,
          estado: 'pendiente',
          moneda: escenario.moneda,
          descripcion: escenario.descripcion || 'Compra extraordinaria (simulada)',
        },
      ]
    }

    case 'nuevo_prestamo': {
      const cuotas = Number(escenario.cuotas)
      if (!escenario.monto || !escenario.fecha || !cuotas || !escenario.montoCuota) {
        return movimientos
      }
      const ingreso = {
        id: 'sim-prestamo-ingreso',
        tipo: 'ingreso',
        monto: Number(escenario.monto),
        fecha: escenario.fecha,
        estado: 'pendiente',
        moneda: escenario.moneda,
        descripcion: 'Préstamo recibido (simulado)',
      }
      const cuotasArr = Array.from({ length: cuotas }, (_, i) => ({
        id: `sim-prestamo-cuota-${i}`,
        tipo: 'egreso',
        monto: Number(escenario.montoCuota),
        fecha: sumarMeses(escenario.fecha, i + 1),
        estado: 'pendiente',
        moneda: escenario.moneda,
        descripcion: `Cuota préstamo ${i + 1}/${cuotas} (simulada)`,
      }))
      return [...movimientos, ingreso, ...cuotasArr]
    }

    case 'incremento_ventas': {
      const pct = Number(escenario.porcentaje) || 0
      return movimientos.map((m) =>
        m.tipo === 'ingreso' && m.estado === 'pendiente' && m.fecha >= hoy
          ? { ...m, monto: m.monto * (1 + pct / 100) }
          : m
      )
    }

    case 'incremento_gastos': {
      const pct = Number(escenario.porcentaje) || 0
      return movimientos.map((m) =>
        m.tipo === 'egreso' && m.estado === 'pendiente' && m.fecha >= hoy
          ? { ...m, monto: m.monto * (1 + pct / 100) }
          : m
      )
    }

    default:
      return movimientos
  }
}
