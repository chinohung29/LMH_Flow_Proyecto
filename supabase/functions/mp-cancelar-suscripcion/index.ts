import { createClient } from 'jsr:@supabase/supabase-js@2'

// Cancela el preapproval en Mercado Pago pero deja que el usuario conserve
// su plan actual hasta el próximo vencimiento que ya tenía pago (no le
// corta el acceso al toque). El downgrade real a 'cancelado' lo hace el
// cron diario (mp-reajustar-precios) cuando esa fecha pasa.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } }
    )

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser()

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'No autenticado.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: perfil, error: perfilError } = await supabaseAdmin
      .from('profiles')
      .select('mp_preapproval_id')
      .eq('id', user.id)
      .single()

    if (perfilError || !perfil?.mp_preapproval_id) {
      return new Response(JSON.stringify({ error: 'No tenés una suscripción activa para cancelar.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const accessToken = Deno.env.get('MP_ACCESS_TOKEN')
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'Mercado Pago no está configurado (falta el secret MP_ACCESS_TOKEN).' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const getResp = await fetch(
      `https://api.mercadopago.com/preapproval/${perfil.mp_preapproval_id}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const preapproval = await getResp.json()
    const vencePeriodoActual = preapproval?.next_payment_date ?? null

    const cancelResp = await fetch(
      `https://api.mercadopago.com/preapproval/${perfil.mp_preapproval_id}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'cancelled' }),
      }
    )

    if (!cancelResp.ok) {
      const detalle = await cancelResp.text()
      console.error('Mercado Pago rechazó la cancelación:', cancelResp.status, detalle)
      return new Response(JSON.stringify({ error: 'No se pudo cancelar la suscripción en Mercado Pago.' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await supabaseAdmin
      .from('profiles')
      .update({ mp_preapproval_id: null, plan_vence_el: vencePeriodoActual })
      .eq('id', user.id)

    return new Response(JSON.stringify({ plan_vence_el: vencePeriodoActual }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Error inesperado.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
