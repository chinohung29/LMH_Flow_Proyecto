import { createClient } from 'jsr:@supabase/supabase-js@2'

// Envíos automáticos por mail (corre todos los días por pg_cron):
// - Resumen semanal: los lunes, a quien la empresa eligió como destino.
// - Recordatorios de cobro: a los clientes con email, N días antes del
//   vencimiento, el día del vencimiento y 3 días después.
// Solo actúa sobre empresas que lo activaron (avisos_config) y nunca repite un
// aviso (avisos_enviados). Necesita el secret RESEND_API_KEY; sin él no envía.

const MAX_RECORDATORIOS_POR_EMPRESA = 50
const ZONA = 'America/Argentina/Buenos_Aires'

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

function fechaAR(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(d) // YYYY-MM-DD
}

function sumarDias(fecha: string, dias: number) {
  const d = new Date(`${fecha}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

function esLunes(fecha: string) {
  return new Date(`${fecha}T12:00:00Z`).getUTCDay() === 1
}

const monto = (n: number, moneda: string) =>
  `${moneda === 'USD' ? 'US$' : '$'} ${Math.round(n).toLocaleString('es-AR')}`

const fechaCorta = (f: string) => `${f.slice(8, 10)}/${f.slice(5, 7)}`

async function enviarMail(opts: { to: string; subject: string; html: string; replyTo?: string | null }) {
  const key = Deno.env.get('RESEND_API_KEY')!
  const from = Deno.env.get('RESEND_FROM') ?? 'LMH Flow <onboarding@resend.dev>'
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
    }),
  })
  if (!resp.ok) {
    const detalle = await resp.text().catch(() => '')
    throw new Error(`Resend ${resp.status}: ${detalle.slice(0, 200)}`)
  }
}

function resumenPorMoneda(movimientos: any[], cuentas: any[], hoy: string) {
  const desde = sumarDias(hoy, -6)
  const hasta = sumarDias(hoy, 7)
  const monedas = [...new Set([...cuentas.map((c) => c.moneda), ...movimientos.map((m) => m.moneda)])]
  if (monedas.length === 0) monedas.push('ARS')
  return monedas.sort((a) => (a === 'ARS' ? -1 : 1)).map((moneda) => {
    const movs = movimientos.filter((m) => m.moneda === moneda)
    const suma = (l: any[]) => l.reduce((acc, m) => acc + Number(m.monto), 0)
    const inicial = cuentas.filter((c) => c.moneda === moneda).reduce((a, c) => a + Number(c.saldo_inicial || 0), 0)
    const disponible = movs
      .filter((m) => m.estado === 'realizado' && m.fecha <= hoy)
      .reduce((acc, m) => acc + (m.tipo === 'ingreso' ? 1 : -1) * Number(m.monto), inicial)
    const semana = movs.filter((m) => m.estado === 'realizado' && m.fecha >= desde && m.fecha <= hoy)
    const proximos = movs.filter((m) => m.estado === 'pendiente' && m.fecha > hoy && m.fecha <= hasta)
    return {
      moneda,
      disponible,
      ingresos: suma(semana.filter((m) => m.tipo === 'ingreso')),
      egresos: suma(semana.filter((m) => m.tipo === 'egreso')),
      cobros: suma(proximos.filter((m) => m.tipo === 'ingreso')),
      pagos: suma(proximos.filter((m) => m.tipo === 'egreso')),
      atrasados: movs.filter((m) => m.estado === 'pendiente' && m.fecha < hoy).length,
    }
  })
}

function htmlResumen(empresa: string, hoy: string, resumenes: ReturnType<typeof resumenPorMoneda>) {
  const bloques = resumenes
    .map(
      (r) => `<h3 style="margin:16px 0 6px">${r.moneda === 'USD' ? 'Dólares (US$)' : 'Pesos ($)'}</h3>
<ul style="padding-left:18px;line-height:1.7">
<li>Disponible hoy: <b>${monto(r.disponible, r.moneda)}</b></li>
<li>Última semana: ingresos <b>${monto(r.ingresos, r.moneda)}</b> · egresos <b>${monto(r.egresos, r.moneda)}</b></li>
<li>Próximos 7 días: cobros <b>${monto(r.cobros, r.moneda)}</b> · pagos <b>${monto(r.pagos, r.moneda)}</b></li>
${r.atrasados > 0 ? `<li>Atrasados sin resolver: <b>${r.atrasados}</b></li>` : ''}
</ul>`
    )
    .join('')
  return `<div style="font-family:Arial,sans-serif;max-width:560px;color:#111">
<h2 style="margin:0 0 4px">Resumen semanal · ${esc(empresa)}</h2>
<p style="color:#555;margin:0">Al ${fechaCorta(hoy)}</p>${bloques}
<p style="color:#777;font-size:12px;margin-top:24px">Enviado por LMH Flow. Podés desactivarlo en Vencimientos → Envíos automáticos.</p></div>`
}

Deno.serve(async (req: Request) => {
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
    return new Response('No autorizado', { status: 401 })
  }
  if (!Deno.env.get('RESEND_API_KEY')) {
    return new Response(JSON.stringify({ omitido: 'Falta el secret RESEND_API_KEY' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const hoy = fechaAR()
  const stats = { empresas: 0, resumenes: 0, recordatorios: 0, errores: 0 }

  const { data: configs } = await admin
    .from('avisos_config')
    .select('*')
    .or('resumen_semanal.eq.true,recordatorios_cobro.eq.true')

  for (const cfg of configs ?? []) {
    stats.empresas += 1
    try {
      const [{ data: empresa }, { data: cuentas }, { data: movimientos }] = await Promise.all([
        admin.from('empresas').select('nombre').eq('id', cfg.empresa_id).single(),
        admin.from('cuentas').select('moneda, saldo_inicial').eq('empresa_id', cfg.empresa_id),
        admin
          .from('movimientos')
          .select('id, tipo, estado, fecha, monto, moneda, descripcion, cliente:clientes(nombre, email)')
          .eq('empresa_id', cfg.empresa_id),
      ])
      const nombre = empresa?.nombre ?? 'tu empresa'

      // Resumen semanal (lunes)
      if (cfg.resumen_semanal && cfg.email_destino && esLunes(hoy)) {
        const { error: dup } = await admin
          .from('avisos_enviados')
          .insert({ empresa_id: cfg.empresa_id, tipo: 'resumen', ref: hoy })
        if (!dup) {
          await enviarMail({
            to: cfg.email_destino,
            subject: `Resumen semanal de ${nombre}`,
            html: htmlResumen(nombre, hoy, resumenPorMoneda(movimientos ?? [], cuentas ?? [], hoy)),
          })
          stats.resumenes += 1
        }
      }

      // Recordatorios de cobro a clientes
      if (cfg.recordatorios_cobro) {
        const fechasDisparo = new Set([sumarDias(hoy, cfg.dias_antes), hoy, sumarDias(hoy, -3)])
        const candidatos = (movimientos ?? [])
          .filter(
            (m: any) =>
              m.tipo === 'ingreso' && m.estado === 'pendiente' && m.cliente?.email && fechasDisparo.has(m.fecha)
          )
          .slice(0, MAX_RECORDATORIOS_POR_EMPRESA)

        for (const m of candidatos) {
          const etapa = m.fecha === hoy ? 'hoy' : m.fecha < hoy ? 'vencido' : 'antes'
          const { error: dup } = await admin
            .from('avisos_enviados')
            .insert({ empresa_id: cfg.empresa_id, tipo: `cobro:${etapa}`, ref: m.id })
          if (dup) continue
          const cuando =
            etapa === 'hoy' ? 'vence hoy' : etapa === 'vencido' ? `venció el ${fechaCorta(m.fecha)}` : `vence el ${fechaCorta(m.fecha)}`
          await enviarMail({
            to: m.cliente.email,
            replyTo: cfg.email_destino,
            subject: `Recordatorio de pago: ${m.descripcion}`,
            html: `<div style="font-family:Arial,sans-serif;max-width:560px;color:#111">
<p>Hola ${esc(m.cliente.nombre)},</p>
<p>Te escribimos de <b>${esc(nombre)}</b> para recordarte que ${cuando} el pago de
“${esc(m.descripcion)}” por <b>${monto(Number(m.monto), m.moneda)}</b>.</p>
<p>Si ya lo realizaste, ignorá este mensaje. ¡Gracias!</p></div>`,
          })
          stats.recordatorios += 1
        }
      }
    } catch (err) {
      stats.errores += 1
      console.error('avisos-automaticos:', cfg.empresa_id, err)
    }
  }

  return new Response(JSON.stringify({ ok: true, ...stats }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
