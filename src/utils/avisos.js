// Avisos de vencimiento, recordatorios de cobro, preguntas rápidas y resumen
// semanal. Todo se calcula en el cliente con los movimientos ya cargados.
import { calcularDia, sumarDias } from './hoy'
import { trasladarFecha } from './replicar'
import { formatCurrency, formatDate } from './format'

const signo = (m) => (m.tipo === 'ingreso' ? 1 : -1)
const suma = (movs) => movs.reduce((acc, m) => acc + Number(m.monto), 0)
const monedasDe = (movimientos, cuentas) => {
  const set = new Set([...cuentas.map((c) => c.moneda), ...movimientos.map((m) => m.moneda)])
  if (set.size === 0) set.add('ARS')
  return [...set].sort((a) => (a === 'ARS' ? -1 : 1))
}

// Pendientes vencidos, de hoy y de los próximos `dias` días.
export function alertasVencimiento(movimientos, hoy, dias = 3) {
  const pendientes = movimientos.filter((m) => m.estado === 'pendiente')
  const hasta = sumarDias(hoy, dias)
  const porFecha = (a, b) => a.fecha.localeCompare(b.fecha)
  return {
    vencidos: pendientes.filter((m) => m.fecha < hoy).sort(porFecha),
    deHoy: pendientes.filter((m) => m.fecha === hoy),
    proximos: pendientes.filter((m) => m.fecha > hoy && m.fecha <= hasta).sort(porFecha),
  }
}

// Recurrentes activos que todavía no tienen movimiento en el mes (mismo tipo y
// descripción). Cada fila queda lista para insertar como pendiente.
export function recurrentesFaltantes(recurrentes, movimientos, mes) {
  const clave = (tipo, descripcion) => `${tipo}|${descripcion.trim().toLowerCase()}`
  const existentes = new Set(
    movimientos.filter((m) => m.fecha.startsWith(mes)).map((m) => clave(m.tipo, m.descripcion))
  )
  return recurrentes
    .filter((r) => r.activo && !existentes.has(clave(r.tipo, r.descripcion)))
    .map((r) => ({
      recurrenteId: r.id,
      cuenta_id: r.cuenta_id,
      categoria_id: r.categoria_id,
      cliente_id: r.cliente_id,
      proveedor_id: r.proveedor_id,
      tipo: r.tipo,
      descripcion: r.descripcion,
      monto: Number(r.monto),
      moneda: r.moneda,
      fecha: trasladarFecha(`${mes}-${String(r.dia_mes).padStart(2, '0')}`, mes),
      estado: 'pendiente',
    }))
}

// --- Recordatorios de cobro (WhatsApp / mail con el mensaje ya armado) ---

export function mensajeRecordatorio({ movimiento, empresaNombre, hoy }) {
  const cliente = movimiento.cliente?.nombre
  const vencido = movimiento.fecha < hoy
  const monto = formatCurrency(movimiento.monto, movimiento.moneda)
  const fecha = formatDate(movimiento.fecha)
  return (
    `Hola${cliente ? ` ${cliente}` : ''}, te escribimos de ${empresaNombre || 'nuestra empresa'}. ` +
    `Te recordamos que ${vencido ? `venció el ${fecha}` : `vence el ${fecha}`} ` +
    `el pago de "${movimiento.descripcion}" por ${monto}. ` +
    'Si ya lo realizaste, ignorá este mensaje. ¡Gracias!'
  )
}

export function linkWhatsApp(telefono, texto) {
  let digitos = String(telefono || '').replace(/\D/g, '').replace(/^0+/, '')
  if (!digitos) return null
  if (!digitos.startsWith('54')) digitos = `54${digitos}`
  return `https://wa.me/${digitos}?text=${encodeURIComponent(texto)}`
}

export function linkMail(email, asunto, texto) {
  if (!email) return null
  return `mailto:${email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(texto)}`
}

// --- Preguntas rápidas (respuesta instantánea, sin IA) ---

export function preguntasRapidas({ movimientos, cuentas, hoy }) {
  const mes = hoy.slice(0, 7)
  const enSiete = sumarDias(hoy, 7)
  const monedas = monedasDe(movimientos, cuentas)
  const porMoneda = (fn) => monedas.map((moneda) => fn(moneda, movimientos.filter((m) => m.moneda === moneda)))
  const unir = (lineas) => lineas.join('\n')

  return [
    {
      pregunta: '¿Con cuánto cuento hoy?',
      respuesta: unir(
        porMoneda((moneda) => {
          const d = calcularDia({ movimientos, cuentas, moneda, dia: hoy })
          return `${moneda}: ${formatCurrency(d.disponible, moneda)} disponibles (cierre del día: ${formatCurrency(d.cierreDia, moneda)}).`
        })
      ),
    },
    {
      pregunta: '¿Qué vence hoy?',
      respuesta: (() => {
        const lista = movimientos.filter((m) => m.estado === 'pendiente' && m.fecha === hoy)
        if (lista.length === 0) return 'No tenés cobros ni pagos pendientes para hoy.'
        return unir(
          lista.map(
            (m) => `${m.tipo === 'ingreso' ? 'Cobro' : 'Pago'}: ${m.descripcion} · ${formatCurrency(m.monto, m.moneda)}`
          )
        )
      })(),
    },
    {
      pregunta: '¿Cuánto cobro esta semana?',
      respuesta: unir(
        porMoneda((moneda, movs) => {
          const cobros = movs.filter(
            (m) => m.tipo === 'ingreso' && m.estado === 'pendiente' && m.fecha >= hoy && m.fecha <= enSiete
          )
          return `${moneda}: ${formatCurrency(suma(cobros), moneda)} (${cobros.length} cobro/s en los próximos 7 días).`
        })
      ),
    },
    {
      pregunta: '¿Cuánto tengo que pagar este mes?',
      respuesta: unir(
        porMoneda((moneda, movs) => {
          const pagos = movs.filter(
            (m) => m.tipo === 'egreso' && m.estado === 'pendiente' && m.fecha.startsWith(mes)
          )
          return `${moneda}: ${formatCurrency(suma(pagos), moneda)} en ${pagos.length} pago/s pendientes de este mes.`
        })
      ),
    },
    {
      pregunta: '¿Quién me debe?',
      respuesta: (() => {
        const deudas = new Map()
        for (const m of movimientos.filter((x) => x.tipo === 'ingreso' && x.estado === 'pendiente')) {
          const clave = `${m.cliente?.nombre ?? 'Sin cliente'}|${m.moneda}`
          deudas.set(clave, (deudas.get(clave) ?? 0) + Number(m.monto))
        }
        if (deudas.size === 0) return 'No tenés cobros pendientes.'
        return unir(
          [...deudas.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([clave, total]) => {
              const [nombre, moneda] = clave.split('|')
              return `${nombre}: ${formatCurrency(total, moneda)}`
            })
        )
      })(),
    },
  ]
}

// --- Resumen semanal ---

export function resumenSemanal({ movimientos, cuentas, hoy }) {
  const desde = sumarDias(hoy, -6)
  const hasta = sumarDias(hoy, 7)
  return monedasDe(movimientos, cuentas).map((moneda) => {
    const movs = movimientos.filter((m) => m.moneda === moneda)
    const dia = calcularDia({ movimientos, cuentas, moneda, dia: hoy })
    const semana = movs.filter((m) => m.estado === 'realizado' && m.fecha >= desde && m.fecha <= hoy)
    const proximos = movs.filter((m) => m.estado === 'pendiente' && m.fecha > hoy && m.fecha <= hasta)
    return {
      moneda,
      disponible: dia.disponible,
      ingresos: suma(semana.filter((m) => m.tipo === 'ingreso')),
      egresos: suma(semana.filter((m) => m.tipo === 'egreso')),
      cobrosProximos: suma(proximos.filter((m) => m.tipo === 'ingreso')),
      pagosProximos: suma(proximos.filter((m) => m.tipo === 'egreso')),
      atrasados: dia.atrasados.length,
      neto: semana.reduce((acc, m) => acc + signo(m) * Number(m.monto), 0),
    }
  })
}

export function textoResumenSemanal(resumenes, empresaNombre, hoy) {
  const lineas = [`Resumen semanal de ${empresaNombre || 'tu empresa'} · al ${formatDate(hoy)}`, '']
  for (const r of resumenes) {
    lineas.push(
      `${r.moneda}`,
      `- Disponible hoy: ${formatCurrency(r.disponible, r.moneda)}`,
      `- Última semana: +${formatCurrency(r.ingresos, r.moneda)} / -${formatCurrency(r.egresos, r.moneda)}`,
      `- Próximos 7 días: cobros ${formatCurrency(r.cobrosProximos, r.moneda)} · pagos ${formatCurrency(r.pagosProximos, r.moneda)}`,
      `- Atrasados sin resolver: ${r.atrasados}`,
      ''
    )
  }
  return lineas.join('\n').trim()
}
