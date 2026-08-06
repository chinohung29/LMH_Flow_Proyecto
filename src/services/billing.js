import { supabase } from './supabaseClient'

async function invocar(nombre, body) {
  const { data, error } = await supabase.functions.invoke(nombre, { body })
  if (error) {
    const detalle = await error.context?.json?.().catch(() => null)
    throw new Error(detalle?.error ?? error.message)
  }
  if (data?.error) throw new Error(data.error)
  return data
}

export function crearSuscripcion(plan) {
  return invocar('mp-crear-suscripcion', { plan })
}

export function cancelarSuscripcion() {
  return invocar('mp-cancelar-suscripcion', {})
}

export function solicitarArrepentimiento(motivo) {
  return invocar('mp-arrepentimiento', { motivo })
}
