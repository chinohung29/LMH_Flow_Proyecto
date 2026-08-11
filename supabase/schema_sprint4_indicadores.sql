-- LMH Flow · Indicadores personalizados (Reportes avanzados)
-- Ejecutar después de supabase/schema_sprint4_reconsentimiento_arrepentimiento.sql.
--
-- Un indicador es una fórmula simple: suma/resta de categorías
-- ("numerador"), opcionalmente dividida por otra suma/resta de
-- categorías ("denominador") para armar ratios/porcentajes.

create table public.indicadores (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  nombre text not null,
  moneda text not null default 'ARS' check (moneda in ('ARS', 'USD')),
  formato text not null default 'moneda' check (formato in ('moneda', 'numero', 'porcentaje')),
  created_at timestamptz not null default now()
);

create table public.indicador_terminos (
  id uuid primary key default gen_random_uuid(),
  indicador_id uuid not null references public.indicadores (id) on delete cascade,
  parte text not null default 'numerador' check (parte in ('numerador', 'denominador')),
  categoria_id uuid not null references public.categorias (id) on delete cascade,
  signo smallint not null default 1 check (signo in (1, -1)),
  orden int not null default 0
);

alter table public.indicadores enable row level security;
alter table public.indicador_terminos enable row level security;

create policy "indicadores_select_empresa" on public.indicadores
  for select using (public.es_miembro_empresa(empresa_id));
create policy "indicadores_insert_empresa" on public.indicadores
  for insert with check (public.puede_editar_empresa(empresa_id) and user_id = auth.uid());
create policy "indicadores_update_empresa" on public.indicadores
  for update using (public.puede_editar_empresa(empresa_id));
create policy "indicadores_delete_empresa" on public.indicadores
  for delete using (public.puede_editar_empresa(empresa_id));

create policy "indicador_terminos_select_empresa" on public.indicador_terminos
  for select using (
    exists (
      select 1 from public.indicadores i
      where i.id = indicador_terminos.indicador_id and public.es_miembro_empresa(i.empresa_id)
    )
  );
create policy "indicador_terminos_insert_empresa" on public.indicador_terminos
  for insert with check (
    exists (
      select 1 from public.indicadores i
      where i.id = indicador_terminos.indicador_id and public.puede_editar_empresa(i.empresa_id)
    )
  );
create policy "indicador_terminos_delete_empresa" on public.indicador_terminos
  for delete using (
    exists (
      select 1 from public.indicadores i
      where i.id = indicador_terminos.indicador_id and public.puede_editar_empresa(i.empresa_id)
    )
  );
