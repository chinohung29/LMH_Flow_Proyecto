import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const NOMBRE_MONEDA: Record<string, string> = { ARS: 'Pesos (ARS)', USD: 'Dólares (USD)' }

function calcularResumen(movimientos: any[], cuentas: any[]) {
  const saldoInicial = cuentas.reduce((acc, c) => acc + Number(c.saldo_inicial || 0), 0)
  let saldoDisponible = saldoInicial
  let cobrosPendientes = 0
  let pagosPendientes = 0
  for (const m of movimientos) {
    const monto = Number(m.monto)
    if (m.estado === 'realizado') {
      saldoDisponible += m.tipo === 'ingreso' ? monto : -monto
    } else if (m.tipo === 'ingreso') {
      cobrosPendientes += monto
    } else {
      pagosPendientes += monto
    }
  }
  return {
    saldoDisponible,
    saldoProyectado: saldoDisponible + cobrosPendientes - pagosPendientes,
    cobrosPendientes,
    pagosPendientes,
  }
}

function formatearMonto(monto: number, moneda: string) {
  const signo = moneda === 'USD' ? 'US$' : '$'
  return `${signo}${Math.round(monto).toLocaleString('es-AR')}`
}

async function construirContexto(supabase: any, empresaId: string, nombreEmpresa: string) {
  const [{ data: cuentas }, { data: movimientos }, { data: clientes }, { data: proveedores }] =
    await Promise.all([
      supabase.from('cuentas').select('*').eq('empresa_id', empresaId),
      supabase
        .from('movimientos')
        .select('*, categoria:categorias(nombre), cliente:clientes(nombre), proveedor:proveedores(nombre)')
        .eq('empresa_id', empresaId)
        .order('fecha', { ascending: false })
        .limit(120),
      supabase.from('clientes').select('id, nombre').eq('empresa_id', empresaId),
      supabase.from('proveedores').select('id, nombre').eq('empresa_id', empresaId),
    ])

  const monedas = [...new Set([...(cuentas ?? []).map((c: any) => c.moneda), ...(movimientos ?? []).map((m: any) => m.moneda)])]

  const hoy = new Date().toISOString().slice(0, 10)
  const lineas: string[] = [`Empresa: ${nombreEmpresa}`, `Fecha de hoy: ${hoy}`, '']

  for (const moneda of monedas) {
    const movMoneda = (movimientos ?? []).filter((m: any) => m.moneda === moneda)
    const ctaMoneda = (cuentas ?? []).filter((c: any) => c.moneda === moneda)
    const r = calcularResumen(movMoneda, ctaMoneda)
    lineas.push(`--- ${NOMBRE_MONEDA[moneda] ?? moneda} ---`)
    lineas.push(`Saldo disponible: ${formatearMonto(r.saldoDisponible, moneda)}`)
    lineas.push(`Saldo proyectado (con pendientes): ${formatearMonto(r.saldoProyectado, moneda)}`)
    lineas.push(`Cobros pendientes: ${formatearMonto(r.cobrosPendientes, moneda)}`)
    lineas.push(`Pagos pendientes: ${formatearMonto(r.pagosPendientes, moneda)}`)
    lineas.push('')
  }

  const vencimientos = (movimientos ?? [])
    .filter((m: any) => m.estado === 'pendiente' && m.fecha >= hoy)
    .sort((a: any, b: any) => a.fecha.localeCompare(b.fecha))
    .slice(0, 15)

  if (vencimientos.length > 0) {
    lineas.push('--- Próximos vencimientos (pendientes) ---')
    for (const m of vencimientos) {
      const contraparte = m.cliente?.nombre ?? m.proveedor?.nombre
      lineas.push(
        `${m.fecha} · ${m.tipo === 'ingreso' ? 'Cobro' : 'Pago'} ${formatearMonto(m.monto, m.moneda)} · "${m.descripcion}"` +
          (m.categoria?.nombre ? ` · ${m.categoria.nombre}` : '') +
          (contraparte ? ` · ${contraparte}` : '')
      )
    }
    lineas.push('')
  }

  const recientes = (movimientos ?? []).slice(0, 40)
  if (recientes.length > 0) {
    lineas.push('--- Movimientos recientes (más nuevo primero) ---')
    for (const m of recientes) {
      const contraparte = m.cliente?.nombre ?? m.proveedor?.nombre
      lineas.push(
        `${m.fecha} · ${m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'} ${formatearMonto(m.monto, m.moneda)} · "${m.descripcion}"` +
          (m.categoria?.nombre ? ` · ${m.categoria.nombre}` : '') +
          (contraparte ? ` · ${contraparte}` : '') +
          ` · ${m.estado}`
      )
    }
    lineas.push('')
  }

  const conPendientes = (ids: any[], tipoContraparte: 'cliente' | 'proveedor') => {
    const mapa = new Map<string, number>()
    for (const m of movimientos ?? []) {
      if (m.estado !== 'pendiente') continue
      const id = tipoContraparte === 'cliente' ? m.cliente_id : m.proveedor_id
      if (!id) continue
      mapa.set(id, (mapa.get(id) ?? 0) + Number(m.monto))
    }
    return ids
      .filter((e: any) => mapa.has(e.id))
      .map((e: any) => `${e.nombre}: ${formatearMonto(mapa.get(e.id)!, 'ARS')}`)
  }

  const clientesPendientes = conPendientes(clientes ?? [], 'cliente')
  if (clientesPendientes.length > 0) {
    lineas.push('--- Clientes con cobros pendientes ---', ...clientesPendientes, '')
  }
  const proveedoresPendientes = conPendientes(proveedores ?? [], 'proveedor')
  if (proveedoresPendientes.length > 0) {
    lineas.push('--- Proveedores con pagos pendientes ---', ...proveedoresPendientes, '')
  }

  return lineas.join('\n')
}

const SYSTEM_BASE = `Sos el asesor financiero de LMH Flow, una app de flujo de caja para pequeñas empresas y profesionales de Argentina. Respondés en español rioplatense, de forma profesional pero cercana y directa.

Reglas:
- Usá ÚNICAMENTE los datos financieros que se te dan a continuación. Nunca inventes cifras ni movimientos que no estén en el contexto.
- Si no tenés información suficiente para responder algo, decilo con claridad en vez de adivinar.
- Los montos en pesos y en dólares son independientes, nunca los sumes entre sí.
- Sé concreto: priorizá números y hechos por sobre generalidades.`

const GEMINI_MODEL = 'gemini-2.0-flash'

// Gemini usa roles "user"/"model" (no "assistant") y separa el system
// prompt en su propio campo en vez de ir dentro de "messages".
async function llamarGemini(accessToken: string, system: string, messages: Array<{ role: string; content: string }>, maxTokens: number) {
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: {
        'x-goog-api-key': accessToken,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: messages.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    }
  )
  const data = await resp.json()
  if (!resp.ok) {
    console.error('Gemini API error:', resp.status, JSON.stringify(data))
    throw new Error(data?.error?.message ?? 'Error al consultar la IA.')
  }
  const texto = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('') ?? ''
  return texto
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { modo, mensaje, historial } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } }
    )

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'No autenticado.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: perfil } = await supabase
      .from('profiles')
      .select('plan, empresa_activa_id')
      .eq('id', user.id)
      .single()

    if (!perfil?.empresa_activa_id) {
      return new Response(JSON.stringify({ error: 'No tenés una empresa activa.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (perfil.plan === 'starter' || perfil.plan === 'cancelado') {
      return new Response(
        JSON.stringify({ error: 'La IA financiera es una función del plan Platinum.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const accessToken = Deno.env.get('GEMINI_API_KEY')
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'La IA financiera no está configurada (falta el secret GEMINI_API_KEY).' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: empresa } = await supabase
      .from('empresas')
      .select('nombre')
      .eq('id', perfil.empresa_activa_id)
      .single()

    const contexto = await construirContexto(supabase, perfil.empresa_activa_id, empresa?.nombre ?? 'tu empresa')

    if (modo === 'insights') {
      const system = `${SYSTEM_BASE}

Tu tarea ahora es generar entre 2 y 3 observaciones breves y accionables sobre el estado financiero actual, a partir de los datos de abajo. Cada una puede ser una alerta (riesgo a corto plazo), una oportunidad, o una observación informativa.

Respondé ÚNICAMENTE con un array JSON válido, sin texto antes ni después, con este formato exacto:
[{"tipo": "alerta" | "oportunidad" | "info", "titulo": "string corto", "descripcion": "1-2 oraciones"}]

Datos financieros:
${contexto}`

      const texto = await llamarGemini(accessToken, system, [{ role: 'user', content: 'Generá los insights.' }], 700)

      let insights
      try {
        const match = texto.match(/\[[\s\S]*\]/)
        insights = JSON.parse(match ? match[0] : texto)
      } catch {
        return new Response(JSON.stringify({ error: 'La IA devolvió una respuesta inesperada. Probá de nuevo.' }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ insights }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // modo 'chat' (default)
    if (!mensaje || typeof mensaje !== 'string') {
      return new Response(JSON.stringify({ error: 'Falta el mensaje.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const system = `${SYSTEM_BASE}

Respondé la consulta del usuario usando estos datos financieros de su empresa:
${contexto}`

    const historialLimitado = Array.isArray(historial) ? historial.slice(-10) : []
    const messages = [
      ...historialLimitado.map((h: any) => ({ role: h.role, content: String(h.content) })),
      { role: 'user', content: mensaje },
    ]

    const respuesta = await llamarGemini(accessToken, system, messages, 1024)

    return new Response(JSON.stringify({ respuesta }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Error inesperado.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
