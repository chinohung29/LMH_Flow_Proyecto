// Análisis financiero propio de la app: cálculos determinísticos, sin
// depender de ningún proveedor de IA. Sirve de base para el contexto que ve el
// modelo y de respaldo cuando la IA no está disponible.

export const NOMBRE_MONEDA: Record<string, string> = { ARS: 'Pesos (ARS)', USD: 'Dólares (USD)' }

export function calcularResumen(movimientos: any[], cuentas: any[]) {
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
  return {
    saldoDisponible,
    saldoProyectado: saldoDisponible + cobrosPendientes - pagosPendientes,
    cobrosPendientes,
    pagosPendientes,
  }
}

export function formatearMonto(monto: number, moneda: string) {
  const signo = moneda === 'USD' ? 'US$' : '$'
  return `${signo}${Math.round(monto).toLocaleString('es-AR')}`
}

export interface Insight {
  tipo: 'alerta' | 'oportunidad' | 'info'
  titulo: string
  descripcion: string
}

const suma = (movs: any[]) => movs.reduce((acc, m) => acc + Number(m.monto), 0)

// Observaciones calculadas con reglas simples sobre los datos reales. Se usan
// cuando la IA falla, para que el botón "Analizar con IA" nunca deje al usuario
// sin respuesta.
export function insightsLocales(movimientos: any[], cuentas: any[], hoy: string, enSiete: string): Insight[] {
  const monedas = [...new Set([...movimientos.map((m) => m.moneda), ...cuentas.map((c) => c.moneda)])]
  const salida: Insight[] = []

  for (const moneda of monedas.slice(0, 2)) {
    const movs = movimientos.filter((m) => m.moneda === moneda)
    const ctas = cuentas.filter((c) => c.moneda === moneda)
    const r = calcularResumen(movs, ctas)
    const etiqueta = monedas.length > 1 ? ` (${moneda})` : ''

    if (r.saldoProyectado < 0) {
      salida.push({
        tipo: 'alerta',
        titulo: `Saldo proyectado negativo${etiqueta}`,
        descripcion: `Con los cobros y pagos pendientes terminarías en ${formatearMonto(r.saldoProyectado, moneda)}. Revisá qué pagos podés postergar o qué cobros podés adelantar.`,
      })
    }

    const vencidos = movs.filter((m) => m.estado === 'pendiente' && m.fecha < hoy)
    if (vencidos.length > 0) {
      const pagos = suma(vencidos.filter((m) => m.tipo === 'egreso'))
      const cobros = suma(vencidos.filter((m) => m.tipo === 'ingreso'))
      salida.push({
        tipo: 'alerta',
        titulo: `${vencidos.length} movimiento(s) vencidos sin resolver${etiqueta}`,
        descripcion:
          `Hay ${formatearMonto(pagos, moneda)} en pagos y ${formatearMonto(cobros, moneda)} en cobros con fecha anterior a hoy que siguen pendientes. ` +
          'Marcalos como realizados o reprogramalos desde la sección Hoy.',
      })
    }

    const proximos = movs.filter((m) => m.estado === 'pendiente' && m.fecha >= hoy && m.fecha <= enSiete)
    const pagosProximos = suma(proximos.filter((m) => m.tipo === 'egreso'))
    if (pagosProximos > 0) {
      salida.push({
        tipo: 'info',
        titulo: `Pagos de los próximos 7 días${etiqueta}`,
        descripcion: `Vencen ${formatearMonto(pagosProximos, moneda)} en los próximos 7 días y hoy tenés disponible ${formatearMonto(r.saldoDisponible, moneda)}.`,
      })
    }
  }

  if (salida.length === 0) {
    salida.push({
      tipo: 'info',
      titulo: 'Sin alertas por ahora',
      descripcion: 'No hay saldos proyectados negativos, movimientos vencidos ni pagos urgentes en los próximos días.',
    })
  }
  return salida.slice(0, 3)
}
