import { supabase } from './supabaseClient'

export async function listClientes(empresaId) {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('nombre', { ascending: true })
  if (error) throw error
  return data
}

export async function createCliente({ userId, empresaId, nombre, email, telefono, cuit, notas }) {
  const { data, error } = await supabase
    .from('clientes')
    .insert({ user_id: userId, empresa_id: empresaId, nombre, email, telefono, cuit, notas })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCliente(id, patch) {
  const { data, error } = await supabase
    .from('clientes')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCliente(id) {
  const { error } = await supabase.from('clientes').delete().eq('id', id)
  if (error) throw error
}
