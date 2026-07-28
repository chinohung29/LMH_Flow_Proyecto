import { supabase } from './supabaseClient'

export async function listCuentas() {
  const { data, error } = await supabase
    .from('cuentas')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function createCuenta({ userId, nombre, tipo, saldoInicial = 0 }) {
  const { data, error } = await supabase
    .from('cuentas')
    .insert({ user_id: userId, nombre, tipo, saldo_inicial: saldoInicial })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCuenta(id) {
  const { error } = await supabase.from('cuentas').delete().eq('id', id)
  if (error) throw error
}
