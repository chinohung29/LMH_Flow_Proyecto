/**
 * Calcula el valor de un indicador personalizado sobre un conjunto de
 * movimientos (ya filtrados por empresa/moneda/período desde afuera).
 * Cada término suma o resta (según `signo`) el total de su categoría.
 * Si hay términos de "denominador", el resultado es numerador/denominador
 * (como porcentaje si `formato === 'porcentaje'`); si no, es la suma simple
 * del numerador. Devuelve `null` si el denominador da cero (no se puede
 * calcular el ratio).
 */
export function calcularIndicador(indicador, movimientos) {
  const totalPorCategoria = (categoriaId) =>
    movimientos
      .filter((m) => m.categoria_id === categoriaId && m.moneda === indicador.moneda)
      .reduce((acc, m) => acc + Number(m.monto), 0)

  const sumarTerminos = (terminos) =>
    terminos.reduce((acc, t) => acc + totalPorCategoria(t.categoria_id) * t.signo, 0)

  const terminos = indicador.terminos ?? []
  const numerador = sumarTerminos(terminos.filter((t) => t.parte === 'numerador'))
  const terminosDenominador = terminos.filter((t) => t.parte === 'denominador')

  if (terminosDenominador.length === 0) {
    return numerador
  }

  const denominador = sumarTerminos(terminosDenominador)
  if (denominador === 0) return null

  const ratio = numerador / denominador
  return indicador.formato === 'porcentaje' ? ratio * 100 : ratio
}

export function formatearIndicador(valor, indicador) {
  if (valor === null) return 'N/D'
  if (indicador.formato === 'porcentaje') {
    return `${valor.toLocaleString('es-AR', { maximumFractionDigits: 1 })}%`
  }
  if (indicador.formato === 'moneda') {
    const signo = indicador.moneda === 'USD' ? 'US$' : '$'
    return `${signo}${Math.round(valor).toLocaleString('es-AR')}`
  }
  return valor.toLocaleString('es-AR', { maximumFractionDigits: 2 })
}
