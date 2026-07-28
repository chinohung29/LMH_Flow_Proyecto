-- LMH Flow · esquema Sprint 4 (multiempresa + multiusuario/permisos)
-- Ejecutar después de supabase/schema_sprint3.sql, sobre un proyecto que
-- YA tiene datos (cuentas/categorias/movimientos/clientes/proveedores)
-- creados en el modelo "single-tenant" de los sprints 1-3.
--
-- Roles disponibles en empresa_miembros: propietario, administrador,
-- miembro (lectura/escritura), lector (solo lectura).

create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  propietario_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.empresa_miembros (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  rol text not null default 'miembro' check (rol in ('propietario', 'administrador', 'miembro', 'lector')),
  created_at timestamptz not null default now(),
  unique (empresa_id, user_id)
);

create table public.invitaciones (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  rol text not null default 'miembro' check (rol in ('administrador', 'miembro', 'lector')),
  codigo text not null unique default encode(gen_random_bytes(5), 'hex'),
  creado_por uuid not null references auth.users (id) on delete cascade,
  usado_por uuid references auth.users (id) on delete set null,
  usado_at timestamptz,
  expira_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now()
);

-- Funciones security definer: evitan RLS recursivo al consultar
-- empresa_miembros desde adentro de sus propias policies.
create or replace function public.es_miembro_empresa(p_empresa_id uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from public.empresa_miembros
    where empresa_id = p_empresa_id and user_id = auth.uid()
  );
$$;

create or replace function public.puede_editar_empresa(p_empresa_id uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from public.empresa_miembros
    where empresa_id = p_empresa_id and user_id = auth.uid()
      and rol in ('propietario', 'administrador', 'miembro')
  );
$$;

create or replace function public.puede_administrar_miembros(p_empresa_id uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from public.empresa_miembros
    where empresa_id = p_empresa_id and user_id = auth.uid()
      and rol in ('propietario', 'administrador')
  );
$$;

alter table public.empresas enable row level security;
alter table public.empresa_miembros enable row level security;
alter table public.invitaciones enable row level security;

create policy "empresas_select_miembro" on public.empresas
  for select using (public.es_miembro_empresa(id));
create policy "empresas_update_admin" on public.empresas
  for update using (public.puede_administrar_miembros(id));

create policy "miembros_select_propio" on public.empresa_miembros
  for select using (public.es_miembro_empresa(empresa_id));
create policy "miembros_delete_admin" on public.empresa_miembros
  for delete using (public.puede_administrar_miembros(empresa_id) and rol <> 'propietario');
create policy "miembros_update_admin" on public.empresa_miembros
  for update using (public.puede_administrar_miembros(empresa_id) and rol <> 'propietario');

create policy "invitaciones_select_admin" on public.invitaciones
  for select using (public.puede_administrar_miembros(empresa_id));
create policy "invitaciones_insert_admin" on public.invitaciones
  for insert with check (public.puede_administrar_miembros(empresa_id) and creado_por = auth.uid());
create policy "invitaciones_delete_admin" on public.invitaciones
  for delete using (public.puede_administrar_miembros(empresa_id));

-- Única forma de alta de empresas: crea la empresa, hace "propietario" a
-- quien la crea, y le siembra caja + categorías básicas. No hay policy de
-- insert directa sobre empresas/empresa_miembros a propósito.
create or replace function public.crear_empresa(p_nombre text)
returns public.empresas
language plpgsql security definer set search_path = public
as $$
declare
  v_empresa public.empresas;
begin
  insert into public.empresas (nombre, propietario_id)
  values (p_nombre, auth.uid())
  returning * into v_empresa;

  insert into public.empresa_miembros (empresa_id, user_id, rol)
  values (v_empresa.id, auth.uid(), 'propietario');

  insert into public.cuentas (empresa_id, user_id, nombre, tipo, saldo_inicial, moneda)
  values (v_empresa.id, auth.uid(), 'Caja', 'caja', 0, 'ARS');

  insert into public.categorias (empresa_id, user_id, nombre, tipo)
  values
    (v_empresa.id, auth.uid(), 'Ventas', 'ingreso'),
    (v_empresa.id, auth.uid(), 'Servicios', 'ingreso'),
    (v_empresa.id, auth.uid(), 'Otros ingresos', 'ingreso'),
    (v_empresa.id, auth.uid(), 'Proveedores', 'egreso'),
    (v_empresa.id, auth.uid(), 'Alquiler', 'egreso'),
    (v_empresa.id, auth.uid(), 'Sueldos', 'egreso'),
    (v_empresa.id, auth.uid(), 'Impuestos', 'egreso'),
    (v_empresa.id, auth.uid(), 'Otros egresos', 'egreso');

  update public.profiles set empresa_activa_id = v_empresa.id where id = auth.uid();

  return v_empresa;
end;
$$;

-- Canjea un código de invitación: valida, suma al usuario actual como
-- miembro de la empresa con el rol invitado, y marca la invitación usada.
create or replace function public.canjear_invitacion(p_codigo text)
returns public.empresas
language plpgsql security definer set search_path = public
as $$
declare
  v_invitacion public.invitaciones;
  v_empresa public.empresas;
begin
  select * into v_invitacion from public.invitaciones
  where codigo = p_codigo and usado_por is null and expira_at > now()
  for update;

  if not found then
    raise exception 'Invitación inválida o expirada';
  end if;

  insert into public.empresa_miembros (empresa_id, user_id, rol)
  values (v_invitacion.empresa_id, auth.uid(), v_invitacion.rol)
  on conflict (empresa_id, user_id) do nothing;

  update public.invitaciones set usado_por = auth.uid(), usado_at = now()
  where id = v_invitacion.id;

  select * into v_empresa from public.empresas where id = v_invitacion.empresa_id;
  return v_empresa;
end;
$$;

-- Columnas empresa_id en las tablas de datos existentes.
alter table public.profiles add column empresa_activa_id uuid references public.empresas (id) on delete set null;
alter table public.cuentas add column empresa_id uuid references public.empresas (id) on delete cascade;
alter table public.categorias add column empresa_id uuid references public.empresas (id) on delete cascade;
alter table public.movimientos add column empresa_id uuid references public.empresas (id) on delete cascade;
alter table public.clientes add column empresa_id uuid references public.empresas (id) on delete cascade;
alter table public.proveedores add column empresa_id uuid references public.empresas (id) on delete cascade;

-- Backfill: a cada usuario existente se le crea una empresa propia y se le
-- migran ahí todos sus datos (user_id se mantiene como "creado por", ahora
-- el alcance real de los datos lo da empresa_id).
do $$
declare
  v_profile record;
  v_empresa_id uuid;
begin
  for v_profile in select id, nombre from public.profiles where empresa_activa_id is null loop
    insert into public.empresas (nombre, propietario_id)
    values (coalesce(nullif(trim(v_profile.nombre), ''), 'Mi empresa'), v_profile.id)
    returning id into v_empresa_id;

    insert into public.empresa_miembros (empresa_id, user_id, rol)
    values (v_empresa_id, v_profile.id, 'propietario');

    update public.profiles set empresa_activa_id = v_empresa_id where id = v_profile.id;

    update public.cuentas set empresa_id = v_empresa_id where user_id = v_profile.id and empresa_id is null;
    update public.categorias set empresa_id = v_empresa_id where user_id = v_profile.id and empresa_id is null;
    update public.movimientos set empresa_id = v_empresa_id where user_id = v_profile.id and empresa_id is null;
    update public.clientes set empresa_id = v_empresa_id where user_id = v_profile.id and empresa_id is null;
    update public.proveedores set empresa_id = v_empresa_id where user_id = v_profile.id and empresa_id is null;
  end loop;
end $$;

alter table public.cuentas alter column empresa_id set not null;
alter table public.categorias alter column empresa_id set not null;
alter table public.movimientos alter column empresa_id set not null;
alter table public.clientes alter column empresa_id set not null;
alter table public.proveedores alter column empresa_id set not null;

-- RLS por empresa en vez de por user_id directo.
drop policy cuentas_select_own on public.cuentas;
drop policy cuentas_insert_own on public.cuentas;
drop policy cuentas_update_own on public.cuentas;
drop policy cuentas_delete_own on public.cuentas;
create policy "cuentas_select_empresa" on public.cuentas for select using (public.es_miembro_empresa(empresa_id));
create policy "cuentas_insert_empresa" on public.cuentas for insert with check (public.puede_editar_empresa(empresa_id));
create policy "cuentas_update_empresa" on public.cuentas for update using (public.puede_editar_empresa(empresa_id));
create policy "cuentas_delete_empresa" on public.cuentas for delete using (public.puede_editar_empresa(empresa_id));

drop policy categorias_select_own on public.categorias;
drop policy categorias_insert_own on public.categorias;
drop policy categorias_update_own on public.categorias;
drop policy categorias_delete_own on public.categorias;
create policy "categorias_select_empresa" on public.categorias for select using (public.es_miembro_empresa(empresa_id));
create policy "categorias_insert_empresa" on public.categorias for insert with check (public.puede_editar_empresa(empresa_id));
create policy "categorias_update_empresa" on public.categorias for update using (public.puede_editar_empresa(empresa_id));
create policy "categorias_delete_empresa" on public.categorias for delete using (public.puede_editar_empresa(empresa_id));

drop policy movimientos_select_own on public.movimientos;
drop policy movimientos_insert_own on public.movimientos;
drop policy movimientos_update_own on public.movimientos;
drop policy movimientos_delete_own on public.movimientos;
create policy "movimientos_select_empresa" on public.movimientos for select using (public.es_miembro_empresa(empresa_id));
create policy "movimientos_insert_empresa" on public.movimientos for insert with check (public.puede_editar_empresa(empresa_id));
create policy "movimientos_update_empresa" on public.movimientos for update using (public.puede_editar_empresa(empresa_id));
create policy "movimientos_delete_empresa" on public.movimientos for delete using (public.puede_editar_empresa(empresa_id));

drop policy clientes_select_own on public.clientes;
drop policy clientes_insert_own on public.clientes;
drop policy clientes_update_own on public.clientes;
drop policy clientes_delete_own on public.clientes;
create policy "clientes_select_empresa" on public.clientes for select using (public.es_miembro_empresa(empresa_id));
create policy "clientes_insert_empresa" on public.clientes for insert with check (public.puede_editar_empresa(empresa_id));
create policy "clientes_update_empresa" on public.clientes for update using (public.puede_editar_empresa(empresa_id));
create policy "clientes_delete_empresa" on public.clientes for delete using (public.puede_editar_empresa(empresa_id));

drop policy proveedores_select_own on public.proveedores;
drop policy proveedores_insert_own on public.proveedores;
drop policy proveedores_update_own on public.proveedores;
drop policy proveedores_delete_own on public.proveedores;
create policy "proveedores_select_empresa" on public.proveedores for select using (public.es_miembro_empresa(empresa_id));
create policy "proveedores_insert_empresa" on public.proveedores for insert with check (public.puede_editar_empresa(empresa_id));
create policy "proveedores_update_empresa" on public.proveedores for update using (public.puede_editar_empresa(empresa_id));
create policy "proveedores_delete_empresa" on public.proveedores for delete using (public.puede_editar_empresa(empresa_id));

-- El trigger de alta de usuario ahora crea la empresa antes de sembrar
-- la caja/categorías, y guarda cuál es la empresa activa del perfil.
create or replace function public.seed_datos_iniciales()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_empresa_id uuid;
  v_nombre text;
begin
  v_nombre := coalesce(nullif(trim(new.raw_user_meta_data ->> 'nombre'), ''), 'Mi empresa');

  insert into public.empresas (nombre, propietario_id)
  values (v_nombre, new.id)
  returning id into v_empresa_id;

  insert into public.empresa_miembros (empresa_id, user_id, rol)
  values (v_empresa_id, new.id, 'propietario');

  insert into public.cuentas (empresa_id, user_id, nombre, tipo, saldo_inicial)
  values (v_empresa_id, new.id, 'Caja', 'caja', 0);

  insert into public.categorias (empresa_id, user_id, nombre, tipo)
  values
    (v_empresa_id, new.id, 'Ventas', 'ingreso'),
    (v_empresa_id, new.id, 'Servicios', 'ingreso'),
    (v_empresa_id, new.id, 'Otros ingresos', 'ingreso'),
    (v_empresa_id, new.id, 'Proveedores', 'egreso'),
    (v_empresa_id, new.id, 'Alquiler', 'egreso'),
    (v_empresa_id, new.id, 'Sueldos', 'egreso'),
    (v_empresa_id, new.id, 'Impuestos', 'egreso'),
    (v_empresa_id, new.id, 'Otros egresos', 'egreso');

  update public.profiles set empresa_activa_id = v_empresa_id where id = new.id;

  return new;
end;
$$;

-- profiles solo permitía ver la fila propia (Sprint 1); para poder listar
-- a tus compañeros de empresa (nombre/email) en la pantalla de miembros,
-- sumamos una policy adicional de solo-lectura entre compañeros de equipo.
create or replace function public.comparte_empresa(p_user_id uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from public.empresa_miembros em1
    join public.empresa_miembros em2 on em1.empresa_id = em2.empresa_id
    where em1.user_id = auth.uid() and em2.user_id = p_user_id
  );
$$;

create policy "profiles_select_coequipo" on public.profiles
  for select using (public.comparte_empresa(id));

-- FK adicional (redundante con auth.users, pero profiles.id = auth.users.id
-- siempre) para que PostgREST pueda embeber profiles al listar
-- empresa_miembros (select=*,profile:profiles(nombre,email)).
alter table public.empresa_miembros
  add constraint empresa_miembros_user_id_profiles_fkey
  foreign key (user_id) references public.profiles (id) on delete cascade;
