-- LMH Flow · suscripciones pagas vía Mercado Pago (Sprint 4)
-- Trackea la suscripción (preapproval) de Mercado Pago asociada al usuario
-- que paga el plan Starter/Platinum de LMH Flow. El estado real siempre se
-- re-consulta contra la API de Mercado Pago (nunca se confía en el payload
-- del webhook entrante) antes de actualizar profiles.plan.

alter table public.profiles add column mp_preapproval_id text;
