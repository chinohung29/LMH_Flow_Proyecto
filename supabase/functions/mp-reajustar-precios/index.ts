import { createClient } from 'jsr:@supabase/supabase-js@2'

// Corre una vez por día (pg_cron) para reajustar el monto en ARS de cada
// suscripción activa según la cotización oficial del dólar del día. No la
// llama un usuario logueado, así que se protege con un secret compartido
// en vez de verify_jwt.
const PRECIOS_USD: Record<string, number> = {
  starter: 15,
  platinum: 30,
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
  return Math.round((precioUSD * tasa) / 100) * 100
}

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

  let tasa: number
  try {
    tasa = await obtenerTasaOficial()
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Error al obtener la cotización.' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: suscriptores, error } = await supabase
    .from('profiles')
    .select('id, plan, mp_preapproval_id')
    .not('mp_preapproval_id', 'is', null)
    .in('plan', ['starter', 'platinum'])

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let actualizados = 0
  const fallidos: string[] = []

  for (const perfil of suscriptores ?? []) {
    const monto = calcularPrecioARS(PRECIOS_USD[perfil.plan], tasa)
    try {
      const resp = await fetch(`https://api.mercadopago.com/preapproval/${perfil.mp_preapproval_id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ auto_recurring: { transaction_amount: monto } }),
      })
      if (resp.ok) {
        actualizados++
      } else {
        fallidos.push(perfil.mp_preapproval_id)
      }
    } catch {
      fallidos.push(perfil.mp_preapproval_id)
    }
  }

  return new Response(
    JSON.stringify({ tasa, total: suscriptores?.length ?? 0, actualizados, fallidos }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
