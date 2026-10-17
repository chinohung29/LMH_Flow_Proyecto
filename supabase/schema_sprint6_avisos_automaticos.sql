-- LMH Flow · envíos automáticos por mail (resumen semanal y recordatorios de cobro)
-- Los envíos son opt-in por empresa: arrancan desactivados.
create table if not exists public.avisos_config (
  empresa_id uuid primary key references public.empresas (id) on delete cascade,
  resumen_semanal boolean not null default false,
  recordatorios_cobro boolean not null default false,
  dias_antes smallint not null default 3 check (dias_antes between 0 and 15),
  email_destino text,
  updated_at timestamptz not null default now()
);

alter table public.avisos_config enable row level security;

create policy "avisos_config_select" on public.avisos_config
  for select using (public.es_miembro_empresa(empresa_id));
create policy "avisos_config_insert" on public.avisos_config
  for insert with check (public.puede_editar_empresa(empresa_id));
create policy "avisos_config_update" on public.avisos_config
  for update using (public.puede_editar_empresa(empresa_id));

revoke all on public.avisos_config from anon;

-- Registro de lo ya enviado (evita mandar dos veces el mismo aviso). Sin
-- policies: solo la Edge Function (service role) lo lee y escribe.
create table if not exists public.avisos_enviados (
  id bigint generated always as identity primary key,
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  tipo text not null,
  ref text not null,
  created_at timestamptz not null default now(),
  unique (empresa_id, tipo, ref)
);

alter table public.avisos_enviados enable row level security;
revoke all on public.avisos_enviados from anon, authenticated;
