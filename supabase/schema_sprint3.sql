-- LMH Flow · esquema Sprint 3 (Clientes, Proveedores, Simulador)
-- Ejecutar después de supabase/schema_sprint2*.sql.

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nombre text not null,
  email text,
  telefono text,
  cuit text,
  notas text,
  created_at timestamptz not null default now()
);

alter table public.clientes enable row level security;

create policy "clientes_select_own" on public.clientes for select using (auth.uid() = user_id);
create policy "clientes_insert_own" on public.clientes for insert with check (auth.uid() = user_id);
create policy "clientes_update_own" on public.clientes for update using (auth.uid() = user_id);
create policy "clientes_delete_own" on public.clientes for delete using (auth.uid() = user_id);

create table public.proveedores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nombre text not null,
  email text,
  telefono text,
  cuit text,
  notas text,
  created_at timestamptz not null default now()
);

alter table public.proveedores enable row level security;

create policy "proveedores_select_own" on public.proveedores for select using (auth.uid() = user_id);
create policy "proveedores_insert_own" on public.proveedores for insert with check (auth.uid() = user_id);
create policy "proveedores_update_own" on public.proveedores for update using (auth.uid() = user_id);
create policy "proveedores_delete_own" on public.proveedores for delete using (auth.uid() = user_id);

-- Vínculo opcional: un ingreso puede asociarse a un cliente, un egreso a un
-- proveedor, para poder ver cuánto factura/paga cada uno.
alter table public.movimientos
  add column cliente_id uuid references public.clientes (id) on delete set null,
  add column proveedor_id uuid references public.proveedores (id) on delete set null;
