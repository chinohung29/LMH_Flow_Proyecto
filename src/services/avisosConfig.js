import { supabase } from './supabaseClient'

export async function getAvisosConfig(empresaId) {
  const { data, error } = await supabase
    .from('avisos_config')
    .select('*')
    .eq('empresa_id', empresaId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function saveAvisosConfig(empresaId, config) {
  const { data, error } = await supabase
    .from('avisos_config')
    .upsert({ empresa_id: empresaId, ...config, updated_at: new Date().toISOString() })
    .select()
    .single()
  if (error) throw error
  return data
}
