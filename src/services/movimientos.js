import { supabase } from './supabaseClient'

const SELECT_CON_RELACIONES =
  '*, cuenta:cuentas(id,nombre,tipo,moneda), categoria:categorias(id,nombre,tipo)'

export async function listMovimientos({
  desde,
  hasta,
  tipo,
  estado,
  cuentaId,
  categoriaId,
} = {}) {
  let query = supabase
    .from('movimientos')
    .select(SELECT_CON_RELACIONES)
    .order('fecha', { ascending: true })

  if (desde) query = query.gte('fecha', desde)
  if (hasta) query = query.lte('fecha', hasta)
  if (tipo) query = query.eq('tipo', tipo)
  if (estado) query = query.eq('estado', estado)
  if (cuentaId) query = query.eq('cuenta_id', cuentaId)
  if (categoriaId) query = query.eq('categoria_id', categoriaId)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createMovimiento({
  userId,
  cuentaId,
  categoriaId,
  tipo,
  descripcion,
  monto,
  fecha,
  estado = 'pendiente',
  moneda = 'ARS',
}) {
  const { data, error } = await supabase
    .from('movimientos')
    .insert({
      user_id: userId,
      cuenta_id: cuentaId,
      categoria_id: categoriaId,
      tipo,
      descripcion,
      monto,
      fecha,
      estado,
      moneda,
    })
    .select(SELECT_CON_RELACIONES)
    .single()
  if (error) throw error
  return data
}

export async function updateMovimiento(id, patch) {
  const { data, error } = await supabase
    .from('movimientos')
    .update(patch)
    .eq('id', id)
    .select(SELECT_CON_RELACIONES)
    .single()
  if (error) throw error
  return data
}

export async function deleteMovimiento(id) {
  const { error } = await supabase.from('movimientos').delete().eq('id', id)
  if (error) throw error
}

export async function bulkInsertMovimientos(userId, filas) {
  const rows = filas.map((f) => ({ ...f, user_id: userId }))
  const { data, error } = await supabase
    .from('movimientos')
    .insert(rows)
    .select(SELECT_CON_RELACIONES)
  if (error) throw error
  return data
}
