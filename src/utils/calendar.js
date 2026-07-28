function toISO(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Grilla de 7xN (lunes a domingo) para el mes dado, con null en los huecos. */
export function generarGrillaMes(anio, mes) {
  const primerDia = new Date(anio, mes, 1)
  const ultimoDia = new Date(anio, mes + 1, 0)
  const diasEnMes = ultimoDia.getDate()
  const offsetInicio = (primerDia.getDay() + 6) % 7 // lunes = 0

  const celdas = []
  for (let i = 0; i < offsetInicio; i++) celdas.push(null)
  for (let d = 1; d <= diasEnMes; d++) celdas.push(toISO(new Date(anio, mes, d)))
  while (celdas.length % 7 !== 0) celdas.push(null)

  return celdas
}

export const NOMBRE_MES = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' })
