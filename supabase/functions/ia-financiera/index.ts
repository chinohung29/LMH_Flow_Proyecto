import { createClient } from 'jsr:@supabase/supabase-js@2'
import { NOMBRE_MONEDA, calcularResumen, formatearMonto, insightsLocales } from './analisis.ts'
import { ErrorProveedor, llamarGroq } from './groq.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

  return { texto: lineas.join('\n'), cuentas: cuentas ?? [], movimientos: movimientos ?? [] }
}

const SYSTEM_BASE = `Sos el asesor financiero de LMH Flow, una app de flujo de caja para pequeñas empresas y profesionales de Argentina. Respondés en español rioplatense, de forma profesional pero cercana y directa.

Reglas:
- Usá ÚNICAMENTE los datos financieros que se te dan a continuación. Nunca inventes cifras ni movimientos que no estén en el contexto.
- Si no tenés información suficiente para responder algo, decilo con claridad en vez de adivinar.
- Los montos en pesos y en dólares son independientes, nunca los sumes entre sí.
- Sé concreto: priorizá números y hechos por sobre generalidades.`

// Límites de abuso: cada consulta cuesta plata (API de la IA).
const LIMITE_CONSULTAS_POR_HORA = 30
const MAX_LARGO_MENSAJE = 2000
const MAX_MENSAJES_HISTORIAL = 10

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

    const accessToken = Deno.env.get('GROQ_API_KEY')
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'La IA financiera no está configurada (falta el secret GROQ_API_KEY).' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Tope de consultas por usuario y por hora (se cuenta con service role: la
    // tabla ia_consultas no es accesible desde el cliente).
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const desde = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count: consultasRecientes } = await admin
      .from('ia_consultas')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', desde)
    if ((consultasRecientes ?? 0) >= LIMITE_CONSULTAS_POR_HORA) {
      return new Response(
        JSON.stringify({ error: 'Llegaste al límite de consultas por hora a la IA. Probá de nuevo en un rato.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    await admin.from('ia_consultas').insert({ user_id: user.id })

    // Carga de datos: convierte el texto pegado de un mail, factura o mensaje en
    // un movimiento listo para revisar. No guarda nada: lo confirma el usuario.
    if (modo === 'extraer') {
      if (!mensaje || typeof mensaje !== 'string') {
        return new Response(JSON.stringify({ error: 'Pegá el texto a analizar.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const hoyISO = new Date().toISOString().slice(0, 10)
      const system = `Extraés datos de un movimiento financiero a partir de un texto (mail, factura, recibo o mensaje) escrito en español de Argentina.
Hoy es ${hoyISO}.
Respondé ÚNICAMENTE con un objeto JSON válido, sin texto antes ni después, con este formato exacto:
{"tipo": "ingreso" | "egreso", "descripcion": "string corto", "monto": number, "moneda": "ARS" | "USD", "fecha": "YYYY-MM-DD"}
Reglas:
- "egreso" si es algo que hay que pagar (factura recibida, servicio, vencimiento); "ingreso" si es algo que se cobra o se recibió.
- "monto" es un número positivo sin símbolos ni separadores de miles (usá punto decimal). Si hay varios importes, usá el total a pagar.
- "fecha" es la fecha de vencimiento o de pago; si no hay ninguna, usá ${hoyISO}.
- Si el texto no contiene ningún importe, respondé {"error": "No encontré un importe en el texto."}.
- No inventes datos que no estén en el texto.`
      const texto = await llamarGroq(accessToken, system, [{ role: 'user', content: mensaje.slice(0, 3000) }], 300)
      const match = texto.match(/\{[\s\S]*\}/)
      let dato: any = null
      try {
        dato = JSON.parse(match ? match[0] : texto)
      } catch {
        dato = null
      }
      const monto = Number(dato?.monto)
      if (
        !dato ||
        dato.error ||
        !(monto > 0) ||
        (dato.tipo !== 'ingreso' && dato.tipo !== 'egreso') ||
        !/^\d{4}-\d{2}-\d{2}$/.test(String(dato.fecha ?? ''))
      ) {
        return new Response(
          JSON.stringify({ error: dato?.error ?? 'No pude entender el texto. Revisá que incluya el importe.' }),
          { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      return new Response(
        JSON.stringify({
          movimiento: {
            tipo: dato.tipo,
            descripcion: String(dato.descripcion ?? '').slice(0, 120) || 'Movimiento',
            monto,
            moneda: dato.moneda === 'USD' ? 'USD' : 'ARS',
            fecha: dato.fecha,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: empresa } = await supabase
      .from('empresas')
      .select('nombre')
      .eq('id', perfil.empresa_activa_id)
      .single()

    const { texto: contexto, cuentas, movimientos } = await construirContexto(
      supabase,
      perfil.empresa_activa_id,
      empresa?.nombre ?? 'tu empresa'
    )

    if (modo === 'insights') {
      const system = `${SYSTEM_BASE}

Tu tarea ahora es generar entre 2 y 3 observaciones breves y accionables sobre el estado financiero actual, a partir de los datos de abajo. Cada una puede ser una alerta (riesgo a corto plazo), una oportunidad, o una observación informativa.

Respondé ÚNICAMENTE con un array JSON válido, sin texto antes ni después, con este formato exacto:
[{"tipo": "alerta" | "oportunidad" | "info", "titulo": "string corto", "descripcion": "1-2 oraciones"}]

Datos financieros:
${contexto}`

      // Observaciones calculadas por la app: respaldo si la IA no responde o
      // devuelve algo inutilizable, para que el botón nunca quede en error.
      const hoy = new Date().toISOString().slice(0, 10)
      const enSiete = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      const respaldo = () =>
        new Response(
          JSON.stringify({ insights: insightsLocales(movimientos, cuentas, hoy, enSiete), origen: 'local' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      try {
        const texto = await llamarGroq(accessToken, system, [{ role: 'user', content: 'Generá los insights.' }], 700)
        const match = texto.match(/\[[\s\S]*\]/)
        const insights = JSON.parse(match ? match[0] : texto)
        if (!Array.isArray(insights) || insights.length === 0) return respaldo()
        return new Response(JSON.stringify({ insights, origen: 'ia' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      } catch (err) {
        console.error('ia-financiera: insights con respaldo local:', err)
        return respaldo()
      }
    }

    // modo 'chat' (default)
    if (!mensaje || typeof mensaje !== 'string') {
      return new Response(JSON.stringify({ error: 'Falta el mensaje.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (mensaje.length > MAX_LARGO_MENSAJE) {
      return new Response(
        JSON.stringify({ error: `El mensaje es demasiado largo (máximo ${MAX_LARGO_MENSAJE} caracteres).` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const system = `${SYSTEM_BASE}

Respondé la consulta del usuario usando estos datos financieros de su empresa:
${contexto}`

    // Solo se aceptan turnos user/assistant: un cliente no puede inyectar
    // mensajes con rol "system" ni historiales gigantes.
    const historialLimitado = (Array.isArray(historial) ? historial : [])
      .filter((h: any) => h && (h.role === 'user' || h.role === 'assistant'))
      .slice(-MAX_MENSAJES_HISTORIAL)
    const messages = [
      ...historialLimitado.map((h: any) => ({
        role: h.role,
        content: String(h.content ?? '').slice(0, MAX_LARGO_MENSAJE),
      })),
      { role: 'user', content: mensaje },
    ]

    const respuesta = await llamarGroq(accessToken, system, messages, 1024)

    return new Response(JSON.stringify({ respuesta }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    if (err instanceof ErrorProveedor) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: err.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    console.error('ia-financiera:', err)
    return new Response(JSON.stringify({ error: 'Error inesperado. Probá de nuevo en unos minutos.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
