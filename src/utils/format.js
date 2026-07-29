export function formatCurrency(value, currency = 'ARS') {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatDate(value) {
  // Una fecha "pelada" (sin hora, ej. "2026-07-29") la interpreta como
  // medianoche UTC; en husos horarios negativos (Argentina, UTC-3) eso cae
  // en el día anterior al mostrarla en hora local. Se fuerza a interpretarla
  // como medianoche local en vez de UTC.
  const soloFecha = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  const fecha = soloFecha ? new Date(`${value}T00:00:00`) : new Date(value)
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
  }).format(fecha)
}
