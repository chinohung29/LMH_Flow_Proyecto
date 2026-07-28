-- LMH Flow · esquema Sprint 2 (Movimientos, Flujo de Caja, Calendario)
-- Ejecutar en el SQL Editor de Supabase del proyecto correspondiente,
-- después de supabase/schema.sql (Sprint 1).

-- Cuentas (bancos + caja)
create table public.cuentas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nombre text not null,
  tipo text not null default 'banco' check (tipo in ('banco', 'caja')),
  saldo_inicial numeric(14,2) not null default 0,
  moneda text not null default 'ARS' check (moneda in ('ARS', 'USD')),
  created_at timestamptz not null default now()
);

alter table public.cuentas enable row level security;

create policy "cuentas_select_own" on public.cuentas for select using (auth.uid() = user_id);
create policy "cuentas_insert_own" on public.cuentas for insert with check (auth.uid() = user_id);
create policy "cuentas_update_own" on public.cuentas for update using (auth.uid() = user_id);
create policy "cuentas_delete_own" on public.cuentas for delete using (auth.uid() = user_id);

-- Categorías de ingreso/egreso
create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nombre text not null,
  tipo text not null check (tipo in ('ingreso', 'egreso')),
  created_at timestamptz not null default now()
);

alter table public.categorias enable row level security;

create policy "categorias_select_own" on public.categorias for select using (auth.uid() = user_id);
create policy "categorias_insert_own" on public.categorias for insert with check (auth.uid() = user_id);
create policy "categorias_update_own" on public.categorias for update using (auth.uid() = user_id);
create policy "categorias_delete_own" on public.categorias for delete using (auth.uid() = user_id);

-- Movimientos (ingresos y egresos)
create table public.movimientos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  cuenta_id uuid references public.cuentas (id) on delete set null,
  categoria_id uuid references public.categorias (id) on delete set null,
  tipo text not null check (tipo in ('ingreso', 'egreso')),
  descripcion text not null,
  monto numeric(14,2) not null check (monto > 0),
  fecha date not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'realizado')),
  moneda text not null default 'ARS' check (moneda in ('ARS', 'USD')),
  created_at timestamptz not null default now()
);

alter table public.movimientos enable row level security;

create policy "movimientos_select_own" on public.movimientos for select using (auth.uid() = user_id);
create policy "movimientos_insert_own" on public.movimientos for insert with check (auth.uid() = user_id);
create policy "movimientos_update_own" on public.movimientos for update using (auth.uid() = user_id);
create policy "movimientos_delete_own" on public.movimientos for delete using (auth.uid() = user_id);

create index movimientos_user_fecha_idx on public.movimientos (user_id, fecha);

-- Al registrarse, sembrar una caja y categorías básicas para que el usuario
-- pueda cargar movimientos sin pasos previos.
create or replace function public.seed_datos_iniciales()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.cuentas (user_id, nombre, tipo, saldo_inicial)
  values (new.id, 'Caja', 'caja', 0);

  insert into public.categorias (user_id, nombre, tipo)
  values
    (new.id, 'Ventas', 'ingreso'),
    (new.id, 'Servicios', 'ingreso'),
    (new.id, 'Otros ingresos', 'ingreso'),
    (new.id, 'Proveedores', 'egreso'),
    (new.id, 'Alquiler', 'egreso'),
    (new.id, 'Sueldos', 'egreso'),
    (new.id, 'Impuestos', 'egreso'),
    (new.id, 'Otros egresos', 'egreso');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_seed on auth.users;
create trigger on_auth_user_created_seed
  after insert on auth.users
  for each row execute procedure public.seed_datos_iniciales();
