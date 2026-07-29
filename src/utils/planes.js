// Mantener sincronizado con supabase/functions/mp-crear-suscripcion/index.ts
// y mp-reajustar-precios/index.ts (Mercado Pago cobra en ARS al tipo de
// cambio oficial del día; el USD es solo el precio de referencia).
export const PRECIOS_USD = {
  starter: 15,
  platinum: 30,
}

export const NOMBRE_PLAN = {
  trial: 'Prueba gratuita',
  starter: 'Starter',
  platinum: 'Platinum',
  cancelado: 'Sin plan activo',
}

// 'cancelado' (suscripción vencida sin renovar) recibe los mismos límites
// que 'starter': 1 empresa, 20 clientes, 20 proveedores, sin Reportes.
export function tienePlanLimitado(plan) {
  return plan === 'starter' || plan === 'cancelado'
}

export async function obtenerTasaOficial() {
  const resp = await fetch('https://dolarapi.com/v1/dolares/oficial')
  if (!resp.ok) throw new Error('No se pudo obtener la cotización del dólar.')
  const data = await resp.json()
  const venta = Number(data?.venta)
  if (!venta || Number.isNaN(venta)) throw new Error('Cotización del dólar inválida.')
  return venta
}

export function calcularPrecioARS(precioUSD, tasa) {
  return Math.round((precioUSD * tasa) / 100) * 100
}
