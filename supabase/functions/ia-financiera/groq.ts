// Cliente de Groq (API compatible con OpenAI; tiene plan gratuito con límites).
//
// Groq retira modelos de vez en cuando (el 404 "model_not_found" fue lo que
// dejó la IA caída), así que el modelo NO está fijo: se consulta GET /models
// con la clave del proyecto, se ordena por preferencia y, si uno falla, se
// prueba el siguiente. Se puede forzar uno con el secret GROQ_MODEL.

export class ErrorProveedor extends Error {
  status: number
  constructor(mensajeUsuario: string, status = 502) {
    super(mensajeUsuario)
    this.status = status
  }
}

// De más a menos capaz. Solo se usan los que la cuenta realmente tenga.
const MODELOS_PREFERIDOS = [
  'openai/gpt-oss-120b',
  'llama-3.3-70b-versatile',
  'openai/gpt-oss-20b',
  'qwen/qwen3-32b',
  'llama-3.1-8b-instant',
]
const NO_SON_CHAT = /whisper|guard|tts|playai|embed|orpheus|safeguard/i
const FAMILIAS_CHAT = /llama|gpt-oss|qwen|gemma|mixtral|kimi|deepseek/i
const API = 'https://api.groq.com/openai/v1'

let cache: { modelos: string[]; hasta: number } | null = null

export function ordenarModelos(ids: string[], forzado?: string | null): string[] {
  const chat = ids.filter((id) => !NO_SON_CHAT.test(id))
  const preferidos = [forzado, ...MODELOS_PREFERIDOS].filter((id): id is string => !!id && chat.includes(id))
  const unicos = [...new Set(preferidos)]
  const otros = chat.filter((id) => !unicos.includes(id) && FAMILIAS_CHAT.test(id))
  return [...unicos, ...otros]
}

async function modelosDisponibles(accessToken: string): Promise<string[]> {
  if (cache && cache.hasta > Date.now()) return cache.modelos

  const resp = await fetch(`${API}/models`, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (resp.status === 401 || resp.status === 403) {
    throw new ErrorProveedor('La clave de la IA no es válida o no tiene acceso. Avisale al administrador.')
  }
  if (!resp.ok) throw new ErrorProveedor('El servicio de IA no está disponible en este momento. Probá más tarde.')

  const data = await resp.json().catch(() => null)
  const ids: string[] = (data?.data ?? []).map((m: any) => String(m?.id))
  const modelos = ordenarModelos(ids, Deno.env.get('GROQ_MODEL'))
  cache = { modelos, hasta: Date.now() + 10 * 60 * 1000 }
  return modelos
}

export function olvidarModelos() {
  cache = null
}

export async function llamarGroq(
  accessToken: string,
  system: string,
  messages: Array<{ role: string; content: string }>,
  maxTokens: number
): Promise<string> {
  const candidatos = (await modelosDisponibles(accessToken)).slice(0, 3)
  if (candidatos.length === 0) {
    throw new ErrorProveedor('No hay modelos de IA disponibles en este momento. Probá más tarde.', 503)
  }

  let ultimo: ErrorProveedor | null = null
  for (const model of candidatos) {
    // Los modelos "razonadores" gastan parte del límite pensando: se les da
    // margen y se les pide poco razonamiento para que quede texto de respuesta.
    const razonador = model.startsWith('openai/gpt-oss')
    const body: Record<string, unknown> = {
      model,
      messages: [{ role: 'system', content: system }, ...messages],
      max_tokens: razonador ? maxTokens + 1500 : maxTokens,
    }
    if (razonador) body.reasoning_effort = 'low'

    const resp = await fetch(`${API}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await resp.json().catch(() => null)

    if (resp.ok) {
      const texto = String(data?.choices?.[0]?.message?.content ?? '')
      if (texto.trim()) return texto
      console.error('Groq devolvió una respuesta vacía con', model)
      ultimo = new ErrorProveedor('La IA devolvió una respuesta vacía. Probá de nuevo.')
      continue
    }

    console.error('Groq API error:', model, resp.status, JSON.stringify(data))
    if (resp.status === 429) {
      throw new ErrorProveedor('La IA llegó a su límite de uso gratuito por ahora. Probá de nuevo en unos minutos.', 429)
    }
    if (resp.status === 401 || resp.status === 403) {
      throw new ErrorProveedor('La clave de la IA no es válida o no tiene acceso. Avisale al administrador.')
    }
    // 404 (modelo retirado), 400 u otros: se prueba el siguiente modelo.
    ultimo = new ErrorProveedor('El servicio de IA no está disponible en este momento. Probá más tarde.')
  }

  olvidarModelos() // la lista puede haber quedado vieja
  throw ultimo ?? new ErrorProveedor('El servicio de IA no está disponible en este momento. Probá más tarde.')
}
