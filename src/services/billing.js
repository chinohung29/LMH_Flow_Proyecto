import { supabase } from './supabaseClient'

export async function crearSuscripcion(plan) {
  const { data, error } = await supabase.functions.invoke('mp-crear-suscripcion', {
    body: { plan },
  })
  if (error) {
    const detalle = await error.context?.json?.().catch(() => null)
    throw new Error(detalle?.error ?? error.message)
  }
  if (data?.error) throw new Error(data.error)
  return data
}
