import { createClient } from 'jsr:@supabase/supabase-js@2'

// Derecho de arrepentimiento (Ley 24.240 art. 34 + Res. 424/2020): a
// diferencia de mp-cancelar-suscripcion (que deja seguir usando el plan
// hasta el fin del período ya pagado), esto es una recisión inmediata del
// contrato: se cancela la suscripción en Mercado Pago YA y se corta el
// acceso al plan pago en el momento, quedando registrado el reclamo con
// un número para que el responsable del tratamiento gestione el reintegro
// del pago (la devolución del dinero en Mercado Pago se hace a mano por
// ahora, no hay API de reembolso automático conectada).
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { motivo } = await req.json().catch(() => ({ motivo: null }))

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
      .select('plan, email, mp_preapproval_id')
      .eq('id', user.id)
      .single()

    if (perfilError || !perfil) {
      return new Response(JSON.stringify({ error: 'No se encontró tu perfil.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Si tiene una suscripción activa en Mercado Pago, se cancela ya mismo.
    if (perfil.mp_preapproval_id) {
      const accessToken = Deno.env.get('MP_ACCESS_TOKEN')
      if (!accessToken) {
        return new Response(
          JSON.stringify({ error: 'Mercado Pago no está configurado (falta el secret MP_ACCESS_TOKEN).' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

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
    }

    // Recisión inmediata: se corta el acceso al plan pago ya, no se espera
    // a que termine el período ya facturado (a diferencia de una baja
    // voluntaria común).
    await supabaseAdmin
      .from('profiles')
      .update({ mp_preapproval_id: null, plan: 'cancelado', plan_vence_el: new Date().toISOString() })
      .eq('id', user.id)

    const { data: solicitud, error: insertError } = await supabaseAdmin
      .from('solicitudes_arrepentimiento')
      .insert({
        user_id: user.id,
        email: perfil.email,
        plan: perfil.plan,
        mp_preapproval_id: perfil.mp_preapproval_id,
        motivo: motivo ?? null,
      })
      .select('numero_reclamo')
      .single()

    if (insertError || !solicitud) {
      console.error('Error al registrar la solicitud de arrepentimiento:', insertError)
      return new Response(
        JSON.stringify({ error: 'La suscripción se canceló, pero no pudimos registrar el reclamo. Escribinos por WhatsApp o email.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(JSON.stringify({ numero_reclamo: solicitud.numero_reclamo }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('mp-arrepentimiento:', err)
    return new Response(JSON.stringify({ error: 'Error inesperado. Probá de nuevo en unos minutos.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
