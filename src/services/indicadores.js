import { supabase } from './supabaseClient'

const SELECT_CON_TERMINOS =
  '*, terminos:indicador_terminos(id, parte, categoria_id, signo, orden, categoria:categorias(nombre, tipo))'

export async function listIndicadores(empresaId) {
  const { data, error } = await supabase
    .from('indicadores')
    .select(SELECT_CON_TERMINOS)
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

/**
 * `numerador`/`denominador` son arrays de { categoria_id, signo }.
 * `denominador` vacío = el indicador es una suma simple (no un ratio).
 */
export async function crearIndicador({ empresaId, userId, nombre, moneda, formato, numerador, denominador = [] }) {
  const { data: indicador, error } = await supabase
    .from('indicadores')
    .insert({ empresa_id: empresaId, user_id: userId, nombre, moneda, formato })
    .select()
    .single()
  if (error) throw error

  const terminos = [
    ...numerador.map((t, i) => ({ ...t, parte: 'numerador', orden: i, indicador_id: indicador.id })),
    ...denominador.map((t, i) => ({ ...t, parte: 'denominador', orden: i, indicador_id: indicador.id })),
  ]

  if (terminos.length > 0) {
    const { error: terminosError } = await supabase.from('indicador_terminos').insert(terminos)
    if (terminosError) {
      await supabase.from('indicadores').delete().eq('id', indicador.id)
      throw terminosError
    }
  }

  return listIndicadores(empresaId).then((lista) => lista.find((i) => i.id === indicador.id))
}

export async function eliminarIndicador(id) {
  const { error } = await supabase.from('indicadores').delete().eq('id', id)
  if (error) throw error
}
