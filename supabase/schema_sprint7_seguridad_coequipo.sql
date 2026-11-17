-- LMH Flow · auditoría de seguridad (noviembre 2026)
--
-- La política profiles_select_coequipo dejaba que cualquier integrante de una empresa leyera la fila COMPLETA del
-- perfil de sus compañeros (plan, mp_preapproval_id, vencimientos, trial). El front ya usa listar_miembros()
-- (que solo expone nombre y email), así que la política se puede quitar sin romper nada.
--
-- Pasos: 1) confirmar que el front desplegado usa listar_miembros() (src/services/empresas.js lo usa);
--        2) ejecutar este archivo en el SQL Editor de Supabase.
drop policy if exists "profiles_select_coequipo" on public.profiles;

-- Comprobación (debe devolver solo la política de "ver su propio perfil"):
-- select policyname, cmd from pg_policies where schemaname = 'public' and tablename = 'profiles';
