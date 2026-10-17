import { supabase } from './supabaseClient'

export async function listRecurrentes(empresaId) {
  const { data, error } = await supabase
    .from('recurrentes')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('dia_mes', { ascending: true })
  if (error) throw error
  return data
}

export async function createRecurrente({ userId, empresaId, ...campos }) {
  const { data, error } = await supabase
    .from('recurrentes')
    .insert({ user_id: userId, empresa_id: empresaId, ...campos })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateRecurrente(id, patch) {
  const { data, error } = await supabase
    .from('recurrentes')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteRecurrente(id) {
  const { error } = await supabase.from('recurrentes').delete().eq('id', id)
  if (error) throw error
}
