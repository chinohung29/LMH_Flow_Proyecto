import { createClient } from 'jsr:@supabase/supabase-js@2'

// Precios en USD: se cobran en ARS al tipo de cambio oficial del día
// (Mercado Pago no admite cobro recurrente en USD para cuentas de
// Argentina). El monto se recalcula acá en cada alta, y además se
// reajusta periódicamente para los que ya están suscriptos (ver
// mp-reajustar-precios).
const PRECIOS_USD: Record<string, number> = {
  starter: 15,
  platinum: 30,
}

const NOMBRES_PLAN: Record<string, string> = {
  starter: 'LMH Flow · Plan Starter',
  platinum: 'LMH Flow · Plan Platinum',
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function obtenerTasaOficial(): Promise<number> {
  const resp = await fetch('https://dolarapi.com/v1/dolares/oficial')
  if (!resp.ok) throw new Error('No se pudo obtener la cotización del dólar oficial.')
  const data = await resp.json()
  const venta = Number(data?.venta)
  if (!venta || Number.isNaN(venta)) throw new Error('Cotización del dólar oficial inválida.')
  return venta
}

function calcularPrecioARS(precioUSD: number, tasa: number): number {
  // Redondeado a la centena más cercana para que el monto quede prolijo.
  return Math.round((precioUSD * tasa) / 100) * 100
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

    let tasa: number
    try {
      tasa = await obtenerTasaOficial()
    } catch (err) {
      return new Response(
        JSON.stringify({
          error:
            'No se pudo obtener la cotización del dólar para calcular el precio. Probá de nuevo en unos minutos.',
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const monto = calcularPrecioARS(PRECIOS_USD[plan], tasa)
    const appUrl = Deno.env.get('APP_URL') ?? 'https://lmh-flowfinance.netlify.app'

    const mpResponse = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason: `${NOMBRES_PLAN[plan]} (USD ${PRECIOS_USD[plan]}/mes)`,
        external_reference: `${user.id}:${plan}`,
        payer_email: user.email,
        back_url: `${appUrl}/configuracion`,
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: monto,
          currency_id: 'ARS',
        },
      }),
    })

    const mpTexto = await mpResponse.text()
    let mpData: any = null
    try {
      mpData = JSON.parse(mpTexto)
    } catch {
      // Respuesta no-JSON de Mercado Pago (se loguea el texto crudo si falla).
    }

    if (!mpResponse.ok) {
      console.error('Mercado Pago rechazó la solicitud:', mpResponse.status, mpTexto)
      return new Response(
        JSON.stringify({ error: mpData?.message ?? 'Error al crear la suscripción en Mercado Pago.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(JSON.stringify({ init_point: mpData.init_point, monto, tasa }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Error inesperado.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
