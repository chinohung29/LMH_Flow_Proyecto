// Mantener sincronizado con supabase/functions/mp-crear-suscripcion/index.ts
// (Mercado Pago no admite cobro recurrente en USD para cuentas de Argentina).
export const PRECIOS_ARS = {
  starter: 15000,
  platinum: 30000,
}

export const NOMBRE_PLAN = {
  trial: 'Prueba gratuita',
  starter: 'Starter',
  platinum: 'Platinum',
}
