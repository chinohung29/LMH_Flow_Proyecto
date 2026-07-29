-- LMH Flow · cancelación de suscripciones Mercado Pago
-- plan_vence_el: cuando alguien cancela, conserva su plan actual hasta esta
-- fecha (el período que ya pagó); pasada la fecha, el cron diario
-- (mp-reajustar-precios) lo baja a plan='cancelado'. 'cancelado' se trata
-- igual que 'starter' en todos los límites/gating (no vuelve a disfrutar
-- del trial ni del acceso Platinum al reactivar).

alter table public.profiles add column plan_vence_el timestamptz;

alter table public.profiles drop constraint profiles_plan_check;
alter table public.profiles add constraint profiles_plan_check
  check (plan in ('trial', 'starter', 'platinum', 'cancelado'));

-- 'cancelado' recibe los mismos límites que 'starter': 1 empresa propia,
-- 20 clientes, 20 proveedores.
create or replace function public.crear_empresa(p_nombre text)
returns public.empresas
language plpgsql security definer set search_path = public
as $$
declare
  v_empresa public.empresas;
  v_plan text;
  v_empresas_propias int;
begin
  select plan into v_plan from public.profiles where id = auth.uid();

  if v_plan in ('starter', 'cancelado') then
    select count(*) into v_empresas_propias
    from public.empresas where propietario_id = auth.uid();

    if v_empresas_propias >= 1 then
      raise exception 'Alcanzaste el límite de 1 empresa del plan Starter. Actualizá tu plan para crear más empresas.';
    end if;
  end if;

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

create or replace function public.check_limite_clientes()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_total int;
begin
  if public.plan_de_empresa(new.empresa_id) in ('starter', 'cancelado') then
    select count(*) into v_total from public.clientes where empresa_id = new.empresa_id;
    if v_total >= 20 then
      raise exception 'Alcanzaste el límite de 20 clientes del plan Starter. Actualizá tu plan para agregar más.';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.check_limite_proveedores()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_total int;
begin
  if public.plan_de_empresa(new.empresa_id) in ('starter', 'cancelado') then
    select count(*) into v_total from public.proveedores where empresa_id = new.empresa_id;
    if v_total >= 20 then
      raise exception 'Alcanzaste el límite de 20 proveedores del plan Starter. Actualizá tu plan para agregar más.';
    end if;
  end if;
  return new;
end;
$$;
