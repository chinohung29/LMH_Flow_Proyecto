import { supabase } from './supabaseClient'

export async function crearSuscripcion(plan) {
  const { data, error } = await supabase.functions.invoke('mp-crear-suscripcion', {
    body: { plan },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}
