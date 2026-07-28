import { supabase } from './supabaseClient'

/** Empresas de las que el usuario actual es miembro, con su rol en cada una. */
export async function listMisEmpresas() {
  const { data, error } = await supabase
    .from('empresa_miembros')
    .select('rol, empresa:empresas(id,nombre,propietario_id,created_at)')
    .order('created_at', { referencedTable: 'empresas', ascending: true })
  if (error) throw error
  return data.map((row) => ({ ...row.empresa, rol: row.rol }))
}

export async function crearEmpresa(nombre) {
  const { data, error } = await supabase.rpc('crear_empresa', { p_nombre: nombre })
  if (error) throw error
  return data
}

export async function actualizarEmpresa(id, nombre) {
  const { data, error } = await supabase
    .from('empresas')
    .update({ nombre })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function establecerEmpresaActiva(empresaId) {
  const { data: userData } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('profiles')
    .update({ empresa_activa_id: empresaId })
    .eq('id', userData.user.id)
  if (error) throw error
}

export async function listMiembros(empresaId) {
  const { data, error } = await supabase
    .from('empresa_miembros')
    .select('id, rol, created_at, user_id, profile:profiles(nombre,email)')
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function eliminarMiembro(id) {
  const { error } = await supabase.from('empresa_miembros').delete().eq('id', id)
  if (error) throw error
}

export async function cambiarRolMiembro(id, rol) {
  const { error } = await supabase.from('empresa_miembros').update({ rol }).eq('id', id)
  if (error) throw error
}

export async function listInvitaciones(empresaId) {
  const { data, error } = await supabase
    .from('invitaciones')
    .select('*')
    .eq('empresa_id', empresaId)
    .is('usado_por', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function crearInvitacion({ empresaId, rol, userId }) {
  const { data, error } = await supabase
    .from('invitaciones')
    .insert({ empresa_id: empresaId, rol, creado_por: userId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function eliminarInvitacion(id) {
  const { error } = await supabase.from('invitaciones').delete().eq('id', id)
  if (error) throw error
}

export async function canjearInvitacion(codigo) {
  const { data, error } = await supabase.rpc('canjear_invitacion', { p_codigo: codigo })
  if (error) throw error
  return data
}
