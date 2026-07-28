// Datos de ejemplo para el Dashboard mientras se conecta el modelo de datos
// real en Supabase (Sprint 2: Movimientos y Flujo de Caja).

export const resumenFinanciero = {
  saldoDisponible: 842000,
  saldoProyectado: 615000,
  cobrosPendientes: 310000,
  pagosPendientes: 537000,
}

export const proximosVencimientos = [
  { id: 1, tipo: 'cobro', descripcion: 'Factura #1042 - Cliente ACME', fecha: '2026-07-30', monto: 120000 },
  { id: 2, tipo: 'pago', descripcion: 'Alquiler oficina', fecha: '2026-08-01', monto: 95000 },
  { id: 3, tipo: 'pago', descripcion: 'Proveedor Insumos SRL', fecha: '2026-08-03', monto: 68000 },
  { id: 4, tipo: 'cobro', descripcion: 'Factura #1050 - Cliente Beta', fecha: '2026-08-05', monto: 190000 },
  { id: 5, tipo: 'pago', descripcion: 'Sueldos', fecha: '2026-08-05', monto: 310000 },
]

export const flujoProyectado = {
  labels: ['28 jul', '30 jul', '01 ago', '03 ago', '05 ago', '07 ago', '10 ago'],
  saldos: [842000, 962000, 867000, 799000, 618000, 601000, 615000],
}

export function calcularSemaforo({ saldoProyectado, pagosPendientes }) {
  const ratio = saldoProyectado / pagosPendientes
  if (ratio >= 1.2) return { nivel: 'verde', label: 'Saludable', color: 'success' }
  if (ratio >= 0.9) return { nivel: 'amarillo', label: 'Ajustado', color: 'warning' }
  return { nivel: 'rojo', label: 'En riesgo', color: 'danger' }
}
