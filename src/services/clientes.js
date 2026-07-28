import { supabase } from './supabaseClient'

export async function listClientes() {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .order('nombre', { ascending: true })
  if (error) throw error
  return data
}

export async function createCliente({ userId, nombre, email, telefono, cuit, notas }) {
  const { data, error } = await supabase
    .from('clientes')
    .insert({ user_id: userId, nombre, email, telefono, cuit, notas })
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
