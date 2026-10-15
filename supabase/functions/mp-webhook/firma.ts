// Validación de la firma de los webhooks de Mercado Pago (cabecera
// x-signature). Documentación: "Notificaciones Webhooks → Validar origen".
//
// manifest = "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
// firma    = HMAC-SHA256(manifest, MP_WEBHOOK_SECRET) en hexadecimal
//
// Si MP_WEBHOOK_SECRET no está configurado, mp-webhook no exige firma (igual
// vuelve a consultar el estado real a la API de Mercado Pago, así que un
// aviso falso no puede cambiar un plan).

export async function firmaValida(
  secreto: string,
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string | null
): Promise<boolean> {
  if (!xSignature) return false

  let ts = ''
  let v1 = ''
  for (const parte of xSignature.split(',')) {
    const [clave, valor] = parte.split('=').map((x) => x.trim())
    if (clave === 'ts') ts = valor
    if (clave === 'v1') v1 = valor
  }
  if (!ts || !v1) return false

  let manifest = ''
  if (dataId) manifest += `id:${/^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId};`
  if (xRequestId) manifest += `request-id:${xRequestId};`
  manifest += `ts:${ts};`

  const enc = new TextEncoder()
  const clave = await crypto.subtle.importKey('raw', enc.encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const firma = new Uint8Array(await crypto.subtle.sign('HMAC', clave, enc.encode(manifest)))
  const esperada = Array.from(firma, (b) => b.toString(16).padStart(2, '0')).join('')

  // Comparación en tiempo constante.
  if (esperada.length !== v1.length) return false
  let diff = 0
  for (let i = 0; i < esperada.length; i++) diff |= esperada.charCodeAt(i) ^ v1.charCodeAt(i)
  return diff === 0
}
