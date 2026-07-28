import { createClient } from 'jsr:@supabase/supabase-js@2'

// Notificación de Mercado Pago: nunca confiamos en los datos del payload
// (podrían ser falsificados). Solo usamos el `id` para volver a consultar
// el estado real del preapproval contra la API de Mercado Pago con nuestro
// propio access token, y recién ahí actualizamos el plan del usuario.
Deno.serve(async (req: Request) => {
  const url = new URL(req.url)
  let preapprovalId = url.searchParams.get('id')
  const topic = url.searchParams.get('topic') ?? url.searchParams.get('type')

  if (req.method === 'POST') {
    try {
      const body = await req.json()
      preapprovalId = body?.data?.id ?? preapprovalId
    } catch {
      // Sin body JSON (IPN legacy por query params): seguimos con `id` de la URL.
    }
  }

  const topicValido = !topic || topic === 'preapproval' || topic === 'subscription_preapproval'
  if (!preapprovalId || !topicValido) {
    return new Response('ok', { status: 200 })
  }

  const accessToken = Deno.env.get('MP_ACCESS_TOKEN')
  if (!accessToken) {
    return new Response('Mercado Pago no configurado', { status: 200 })
  }

  const mpResponse = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!mpResponse.ok) {
    return new Response('ok', { status: 200 })
  }

  const preapproval = await mpResponse.json()
  const [userId, plan] = String(preapproval.external_reference ?? '').split(':')
  if (!userId || (plan !== 'starter' && plan !== 'platinum')) {
    return new Response('ok', { status: 200 })
  }

  if (preapproval.status === 'authorized') {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    await supabase
      .from('profiles')
      .update({ plan, mp_preapproval_id: preapprovalId })
      .eq('id', userId)
  }

  return new Response('ok', { status: 200 })
})
