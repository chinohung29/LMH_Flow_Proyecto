-- LMH Flow · re-consentimiento + botón de arrepentimiento (continuación Sprint 4)
-- Ejecutar después de supabase/schema_sprint4_limites_equipo.sql.

-- 1) Re-consentimiento: los usuarios ya registrados antes de publicar
-- Términos/Privacidad no prestaron consentimiento a nada. Se agrega una
-- columna que, si está vacía, obliga a aceptar antes de seguir usando la
-- app (ver AceptarTerminosGate + ProtectedRoute en el frontend). Los
-- usuarios NUEVOS la completan al registrarse (ver handle_new_user); los
-- existentes quedan en null a propósito para forzar el re-consentimiento.
alter table public.profiles add column if not exists terminos_aceptados_at timestamptz;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nombre, email, terminos_aceptados_at)
  values (
    new.id,
    new.raw_user_meta_data ->> 'nombre',
    new.email,
    case when (new.raw_user_meta_data ->> 'terminos_aceptados')::boolean is true then now() else null end
  );
  return new;
end;
$$;

-- 2) Botón de arrepentimiento (Ley 24.240 art. 34 + Res. 424/2020): cada
-- solicitud queda registrada con un número de reclamo, generado a partir
-- del id de la fila para garantizar unicidad sin depender de una
-- secuencia aparte. La procesa la Edge Function mp-arrepentimiento, que
-- cancela el preapproval en Mercado Pago y corta el acceso al plan pago
-- de inmediato (a diferencia de mp-cancelar-suscripcion, que deja seguir
-- usando el plan hasta fin del período ya pagado).
create table public.solicitudes_arrepentimiento (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  plan text,
  mp_preapproval_id text,
  motivo text,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'procesado', 'rechazado')),
  numero_reclamo text generated always as ('ARR-' || upper(substr(id::text, 1, 8))) stored,
  created_at timestamptz not null default now(),
  procesado_at timestamptz
);

alter table public.solicitudes_arrepentimiento enable row level security;

create policy "arrepentimiento_select_propio" on public.solicitudes_arrepentimiento
  for select using (auth.uid() = user_id);
create policy "arrepentimiento_insert_propio" on public.solicitudes_arrepentimiento
  for insert with check (auth.uid() = user_id);
-- Sin policy de update/delete para usuarios: el estado ("procesado" una
-- vez reintegrado el pago en Mercado Pago) lo actualiza manualmente el
-- responsable del tratamiento con la service role key, por ahora — no
-- hay integración con la API de reembolsos de Mercado Pago todavía.
