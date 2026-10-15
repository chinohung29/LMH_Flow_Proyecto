-- LMH Flow · endurecimiento de seguridad de profiles (auditoría)
--
-- 1) Escalada de privilegios: la política "actualizar su propio perfil" no
--    restringía columnas, así que cualquier usuario podía cambiarse plan,
--    plan_vence_el, trial_ends_at o mp_preapproval_id (y con éste cancelar la
--    suscripción de otra persona vía mp-cancelar-suscripcion). Ahora el
--    cliente solo puede escribir las columnas que la app realmente usa; plan y
--    datos de cobro los escriben únicamente las Edge Functions (service role).
--
-- 2) Fuga de datos de cobro: profiles_select_coequipo devolvía la fila
--    completa (plan, mp_preapproval_id, vencimientos) de los compañeros de
--    equipo. Se reemplaza por listar_miembros(), que expone solo nombre y
--    email tras verificar que quien consulta es miembro de la empresa.

-- Parte 1 ------------------------------------------------------------------
revoke update on public.profiles from anon, authenticated;
grant update (nombre, empresa_activa_id, terminos_aceptados_at)
  on public.profiles to authenticated;

-- Parte 2 ------------------------------------------------------------------
create or replace function public.listar_miembros(p_empresa_id uuid)
returns table (
  id uuid,
  rol text,
  created_at timestamptz,
  user_id uuid,
  nombre text,
  email text
)
language sql security definer stable set search_path = public
as $$
  select em.id, em.rol, em.created_at, em.user_id, p.nombre, p.email
  from public.empresa_miembros em
  join public.profiles p on p.id = em.user_id
  where em.empresa_id = p_empresa_id
    and public.es_miembro_empresa(p_empresa_id)
  order by em.created_at;
$$;

revoke execute on function public.listar_miembros(uuid) from public, anon;
grant execute on function public.listar_miembros(uuid) to authenticated;

-- Se aplica DESPUÉS de desplegar el front que usa listar_miembros():
-- drop policy if exists "profiles_select_coequipo" on public.profiles;
