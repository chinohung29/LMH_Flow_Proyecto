import { supabase } from './supabaseClient'

export async function listProveedores() {
  const { data, error } = await supabase
    .from('proveedores')
    .select('*')
    .order('nombre', { ascending: true })
  if (error) throw error
  return data
}

export async function createProveedor({ userId, nombre, email, telefono, cuit, notas }) {
  const { data, error } = await supabase
    .from('proveedores')
    .insert({ user_id: userId, nombre, email, telefono, cuit, notas })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateProveedor(id, patch) {
  const { data, error } = await supabase
    .from('proveedores')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteProveedor(id) {
  const { error } = await supabase.from('proveedores').delete().eq('id', id)
  if (error) throw error
}
