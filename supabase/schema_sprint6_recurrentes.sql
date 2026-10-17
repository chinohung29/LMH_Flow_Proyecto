-- LMH Flow · gastos e ingresos recurrentes (se generan como movimientos pendientes cada mes)
create table if not exists public.recurrentes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  cuenta_id uuid references public.cuentas (id) on delete set null,
  categoria_id uuid references public.categorias (id) on delete set null,
  cliente_id uuid references public.clientes (id) on delete set null,
  proveedor_id uuid references public.proveedores (id) on delete set null,
  tipo text not null check (tipo in ('ingreso', 'egreso')),
  descripcion text not null,
  monto numeric(14,2) not null check (monto > 0),
  moneda text not null default 'ARS' check (moneda in ('ARS', 'USD')),
  dia_mes smallint not null check (dia_mes between 1 and 31),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists recurrentes_empresa_idx on public.recurrentes (empresa_id);

alter table public.recurrentes enable row level security;

create policy "recurrentes_select_empresa" on public.recurrentes
  for select using (public.es_miembro_empresa(empresa_id));
create policy "recurrentes_insert_empresa" on public.recurrentes
  for insert with check (public.puede_editar_empresa(empresa_id) and auth.uid() = user_id);
create policy "recurrentes_update_empresa" on public.recurrentes
  for update using (public.puede_editar_empresa(empresa_id));
create policy "recurrentes_delete_empresa" on public.recurrentes
  for delete using (public.puede_editar_empresa(empresa_id));

revoke all on public.recurrentes from anon;
