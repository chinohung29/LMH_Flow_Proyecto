import { createClient } from 'jsr:@supabase/supabase-js@2'
import { decidirCambio } from './decision.ts'

// Corre una vez por día (pg_cron). Ya NO reajusta precios por dólar — los
// planes pasaron a precio fijo en pesos el 13/10/2026 (ver
// src/utils/planes.js). Lo que queda acá es una red de seguridad: revisa
// en Mercado Pago el estado de cada suscripción activa por si se perdió
// algún webhook (pausada/cancelada sin que profiles se haya enterado), y
// baja a 'cancelado' las que ya vencieron su período de gracia. No la
// llama un usuario logueado, así que se protege con un secret compartido
// en vez de verify_jwt.

Deno.serve(async (req: Request) => {
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
    return new Response(JSON.stringify({ error: 'No autorizado.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const accessToken = Deno.env.get('MP_ACCESS_TOKEN')
  if (!accessToken) {
    return new Response(JSON.stringify({ error: 'Falta MP_ACCESS_TOKEN.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: suscriptores, error } = await supabase
    .from('profiles')
    .select('id, plan, mp_preapproval_id, plan_vence_el')
    .not('mp_preapproval_id', 'is', null)
    .in('plan', ['starter', 'platinum'])

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let verificados = 0
  let en_gracia = 0
  const fallidos: string[] = []

  for (const perfil of suscriptores ?? []) {
    try {
      // Red de seguridad por si se perdió algún aviso: si Mercado Pago ya
      // tiene la suscripción pausada o cancelada, se abre la gracia.
      const estadoResp = await fetch(
        `https://api.mercadopago.com/preapproval/${perfil.mp_preapproval_id}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      if (estadoResp.ok) {
        const { status } = await estadoResp.json()
        if (status === 'paused' || status === 'cancelled') {
          const cambio = decidirCambio(
            { tipo: 'preapproval', preapprovalId: perfil.mp_preapproval_id, status, plan: perfil.plan },
            perfil,
            new Date()
          )
          if (cambio) {
            await supabase.from('profiles').update(cambio).eq('id', perfil.id)
            en_gracia++
          }
        }
        verificados++
      } else {
        fallidos.push(perfil.mp_preapproval_id)
      }
    } catch {
      fallidos.push(perfil.mp_preapproval_id)
    }
  }

  // Suscripciones canceladas o con falta de pago cuyo período (pago o de
  // gracia de 10 días) venció: se bajan a 'cancelado' (mismos límites que
  // 'starter', sin acceso a Reportes ni a un nuevo trial).
  const { data: vencidos, error: errorVencidos } = await supabase
    .from('profiles')
    .update({ plan: 'cancelado', plan_vence_el: null, mp_preapproval_id: null })
    .lte('plan_vence_el', new Date().toISOString())
    .in('plan', ['starter', 'platinum'])
    .select('id')

  return new Response(
    JSON.stringify({
      total: suscriptores?.length ?? 0,
      verificados,
      en_gracia,
      fallidos,
      bajados_por_vencimiento: errorVencidos ? null : vencidos?.length ?? 0,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
