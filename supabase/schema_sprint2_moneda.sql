-- LMH Flow · soporte multi-moneda (pesos $ / dólares US$)
-- Ejecutar después de supabase/schema_sprint2.sql en proyectos que ya
-- tenían las tablas cuentas/movimientos creadas sin la columna moneda.

alter table public.cuentas
  add column if not exists moneda text not null default 'ARS' check (moneda in ('ARS', 'USD'));

alter table public.movimientos
  add column if not exists moneda text not null default 'ARS' check (moneda in ('ARS', 'USD'));
