import { supabase } from './supabaseClient'

export async function aceptarTerminos(userId) {
  const { error } = await supabase
    .from('profiles')
    .update({ terminos_aceptados_at: new Date().toISOString() })
    .eq('id', userId)
  if (error) throw error
}
