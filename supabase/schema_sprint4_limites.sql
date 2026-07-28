-- LMH Flow · límites de plan Starter (Sprint 4)
-- El plan starter admite como máximo 1 empresa propia y 20 clientes /
-- 20 proveedores por empresa. Los planes trial y platinum no tienen límite.
-- Se aplica en el backend (además del aviso en la UI) para que valga sin
-- importar desde dónde se haga el insert.

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

  if v_plan = 'starter' then
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

-- El plan que rige el límite de una empresa es el de su propietario.
create or replace function public.plan_de_empresa(p_empresa_id uuid)
returns text
language sql security definer stable set search_path = public
as $$
  select p.plan
  from public.empresas e
  join public.profiles p on p.id = e.propietario_id
  where e.id = p_empresa_id;
$$;

create or replace function public.check_limite_clientes()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_total int;
begin
  if public.plan_de_empresa(new.empresa_id) = 'starter' then
    select count(*) into v_total from public.clientes where empresa_id = new.empresa_id;
    if v_total >= 20 then
      raise exception 'Alcanzaste el límite de 20 clientes del plan Starter. Actualizá tu plan para agregar más.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists clientes_limite_starter on public.clientes;
create trigger clientes_limite_starter
  before insert on public.clientes
  for each row execute function public.check_limite_clientes();

create or replace function public.check_limite_proveedores()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_total int;
begin
  if public.plan_de_empresa(new.empresa_id) = 'starter' then
    select count(*) into v_total from public.proveedores where empresa_id = new.empresa_id;
    if v_total >= 20 then
      raise exception 'Alcanzaste el límite de 20 proveedores del plan Starter. Actualizá tu plan para agregar más.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists proveedores_limite_starter on public.proveedores;
create trigger proveedores_limite_starter
  before insert on public.proveedores
  for each row execute function public.check_limite_proveedores();
