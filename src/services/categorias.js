import { supabase } from './supabaseClient'

export async function listCategorias(empresaId) {
  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('nombre', { ascending: true })
  if (error) throw error
  return data
}

export async function createCategoria({ userId, empresaId, nombre, tipo }) {
  const { data, error } = await supabase
    .from('categorias')
    .insert({ user_id: userId, empresa_id: empresaId, nombre, tipo })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCategoria(id) {
  const { error } = await supabase.from('categorias').delete().eq('id', id)
  if (error) throw error
}
