// Mantener sincronizado con supabase/functions/mp-crear-suscripcion/index.ts
// y mp-reajustar-precios/index.ts. Precios fijos en pesos argentinos — hasta
// el 13/10/2026 estaban atados al dólar oficial (un cron diario reajustaba
// el monto según la cotización); se pasó a precio fijo a pedido explícito
// del usuario.
export const PRECIOS_ARS = {
  starter: 20000,
  platinum: 35000,
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
