import { createClient } from 'jsr:@supabase/supabase-js@2'

// Precios placeholder en ARS (Mercado Pago no admite cobro recurrente en
// USD para cuentas de Argentina). Ajustar acá si cambia el precio del plan.
const PRECIOS_ARS: Record<string, number> = {
  starter: 15000,
  platinum: 30000,
}

const NOMBRES_PLAN: Record<string, string> = {
  starter: 'LMH Flow · Plan Starter',
  platinum: 'LMH Flow · Plan Platinum',
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { plan } = await req.json()
    if (plan !== 'starter' && plan !== 'platinum') {
      return new Response(JSON.stringify({ error: 'Plan inválido.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } }
    )

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user?.email) {
      return new Response(JSON.stringify({ error: 'No autenticado.' }), {
        status: 401,
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

    const appUrl = Deno.env.get('APP_URL') ?? 'https://lmh-flowfinance.netlify.app'

    const mpResponse = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason: NOMBRES_PLAN[plan],
        external_reference: `${user.id}:${plan}`,
        payer_email: user.email,
        back_url: `${appUrl}/configuracion`,
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: PRECIOS_ARS[plan],
          currency_id: 'ARS',
        },
      }),
    })

    const mpData = await mpResponse.json()

    if (!mpResponse.ok) {
      console.error('Mercado Pago rechazó la solicitud:', mpResponse.status, JSON.stringify(mpData))
      return new Response(
        JSON.stringify({ error: mpData?.message ?? 'Error al crear la suscripción en Mercado Pago.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(JSON.stringify({ init_point: mpData.init_point }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Error inesperado.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
