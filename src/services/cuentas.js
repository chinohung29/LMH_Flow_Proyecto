import { supabase } from './supabaseClient'

export async function listCuentas(empresaId) {
  const { data, error } = await supabase
    .from('cuentas')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function createCuenta({
  userId,
  empresaId,
  nombre,
  tipo,
  saldoInicial = 0,
  moneda = 'ARS',
}) {
  const { data, error } = await supabase
    .from('cuentas')
    .insert({
      user_id: userId,
      empresa_id: empresaId,
      nombre,
      tipo,
      saldo_inicial: saldoInicial,
      moneda,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCuenta(id) {
  const { error } = await supabase.from('cuentas').delete().eq('id', id)
  if (error) throw error
}
