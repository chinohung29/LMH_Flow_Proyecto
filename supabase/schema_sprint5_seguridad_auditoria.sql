-- LMH Flow · endurecimiento de seguridad (auditoría, puntos 3, 7, 9 y 10)

-- 3) Límite de consultas a la IA financiera. La Edge Function ia-financiera
--    registra cada consulta acá (con service role) y rechaza al usuario que
--    supera el tope por hora. Sin policies: el cliente no puede leerla ni
--    escribirla.
create table if not exists public.ia_consultas (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists ia_consultas_user_fecha_idx
  on public.ia_consultas (user_id, created_at desc);
alter table public.ia_consultas enable row level security;
revoke all on public.ia_consultas from anon, authenticated;

-- 7) Códigos de invitación: de 40 a 128 bits de entropía (los ya emitidos
--    siguen valiendo hasta que expiren).
alter table public.invitaciones
  alter column codigo set default encode(gen_random_bytes(16), 'hex');

-- 9) Las funciones SECURITY DEFINER no deben poder llamarse sin sesión.
--    Las que solo disparan triggers no las necesita llamar nadie.
revoke execute on function
  public.canjear_invitacion(text),
  public.crear_empresa(text),
  public.listar_miembros(uuid),
  public.comparte_empresa(uuid),
  public.es_empresa_limitada(uuid),
  public.es_miembro_empresa(uuid),
  public.plan_de_empresa(uuid),
  public.puede_administrar_miembros(uuid),
  public.puede_editar_empresa(uuid)
from public, anon;

revoke execute on function
  public.check_limite_clientes(),
  public.check_limite_proveedores(),
  public.chequear_limite_invitacion(),
  public.chequear_limite_miembros(),
  public.handle_new_user(),
  public.seed_datos_iniciales()
from public, anon, authenticated;

-- 10) search_path fijo en las dos funciones auxiliares que no lo tenían.
alter function public.limite_rol(text) set search_path = public;
alter function public.nombre_rol_plural(text) set search_path = public;
