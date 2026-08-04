import { supabase } from './supabaseClient'

async function invocar(body) {
  const { data, error } = await supabase.functions.invoke('ia-financiera', { body })
  if (error) {
    const detalle = await error.context?.json?.().catch(() => null)
    throw new Error(detalle?.error ?? error.message)
  }
  if (data?.error) throw new Error(data.error)
  return data
}

export async function enviarMensajeIA(mensaje, historial) {
  const data = await invocar({ modo: 'chat', mensaje, historial })
  return data.respuesta
}

export async function generarInsightsIA() {
  const data = await invocar({ modo: 'insights' })
  return data.insights
}
