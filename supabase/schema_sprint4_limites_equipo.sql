-- LMH Flow · límites de equipo (continuación Sprint 4)
-- Ejecutar después de supabase/schema_sprint4_empresas.sql.
--
-- Invitar/gestionar miembros es una función exclusiva del plan Platinum
-- (mismo criterio que Reportes/IA financiera: 'starter' y 'cancelado'
-- están limitados). Dentro de una empresa Platinum, los cupos por rol
-- son: 1 administrador, 4 miembros, 10 lectores (propietario no tiene
-- límite: siempre es exactamente 1, por diseño de crear_empresa /
-- seed_datos_iniciales, que son la única vía de alta de un propietario).

create or replace function public.es_empresa_limitada(p_empresa_id uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select coalesce(
    (select pr.plan in ('starter', 'cancelado')
     from public.empresas e
     join public.profiles pr on pr.id = e.propietario_id
     where e.id = p_empresa_id),
    true
  );
$$;

create or replace function public.limite_rol(p_rol text)
returns int
language sql immutable
as $$
  select case p_rol
    when 'administrador' then 1
    when 'miembro' then 4
    when 'lector' then 10
    else null
  end;
$$;

create or replace function public.nombre_rol_plural(p_rol text)
returns text
language sql immutable
as $$
  select case p_rol
    when 'administrador' then 'administradores'
    when 'miembro' then 'miembros'
    when 'lector' then 'lectores'
    else p_rol
  end;
$$;

-- Corre en cada alta/cambio de rol de empresa_miembros, sin importar si
-- llega por una policy de RLS o por un RPC security definer (canjear_
-- invitacion) — los triggers siempre se ejecutan, a diferencia de las
-- policies de RLS.
create or replace function public.chequear_limite_miembros()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_limite int;
  v_actuales int;
begin
  if NEW.rol = 'propietario' then
    return NEW;
  end if;

  if public.es_empresa_limitada(NEW.empresa_id) then
    raise exception 'Invitar y gestionar miembros es una función del plan Platinum.';
  end if;

  v_limite := public.limite_rol(NEW.rol);
  if v_limite is not null then
    select count(*) into v_actuales
    from public.empresa_miembros
    where empresa_id = NEW.empresa_id
      and rol = NEW.rol
      and id <> NEW.id;

    if v_actuales >= v_limite then
      raise exception 'Ya alcanzaste el máximo de % (%) para esta empresa.',
        public.nombre_rol_plural(NEW.rol), v_limite;
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists empresa_miembros_chequear_limite on public.empresa_miembros;
create trigger empresa_miembros_chequear_limite
  before insert or update on public.empresa_miembros
  for each row execute function public.chequear_limite_miembros();

-- Al generar una invitación también se cuentan los cupos ya reservados
-- por invitaciones pendientes (no solo los miembros ya confirmados), para
-- no poder generar más links de los que en verdad se pueden canjear.
create or replace function public.chequear_limite_invitacion()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_limite int;
  v_actuales int;
begin
  if public.es_empresa_limitada(NEW.empresa_id) then
    raise exception 'Invitar y gestionar miembros es una función del plan Platinum.';
  end if;

  v_limite := public.limite_rol(NEW.rol);
  if v_limite is not null then
    select
      (select count(*) from public.empresa_miembros where empresa_id = NEW.empresa_id and rol = NEW.rol)
      + (select count(*) from public.invitaciones where empresa_id = NEW.empresa_id and rol = NEW.rol and usado_por is null and expira_at > now())
    into v_actuales;

    if v_actuales >= v_limite then
      raise exception 'Ya alcanzaste el máximo de % (%) para esta empresa.',
        public.nombre_rol_plural(NEW.rol), v_limite;
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists invitaciones_chequear_limite on public.invitaciones;
create trigger invitaciones_chequear_limite
  before insert on public.invitaciones
  for each row execute function public.chequear_limite_invitacion();
