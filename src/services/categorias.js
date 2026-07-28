import { supabase } from './supabaseClient'

export async function listCategorias() {
  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .order('nombre', { ascending: true })
  if (error) throw error
  return data
}

export async function createCategoria({ userId, nombre, tipo }) {
  const { data, error } = await supabase
    .from('categorias')
    .insert({ user_id: userId, nombre, tipo })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCategoria(id) {
  const { error } = await supabase.from('categorias').delete().eq('id', id)
  if (error) throw error
}
