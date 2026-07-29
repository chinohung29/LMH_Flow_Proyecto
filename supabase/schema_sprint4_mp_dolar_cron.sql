-- LMH Flow · reajuste diario del precio de las suscripciones (dólar oficial)
-- Programa un job diario que llama a la Edge Function mp-reajustar-precios,
-- la cual recalcula en ARS el monto de cada suscripción activa según la
-- cotización oficial del dólar de ese día.
--
-- OJO: reemplazá 'REEMPLAZAR_CON_CRON_SECRET' por el mismo valor random que
-- cargaste como secret CRON_SECRET en Edge Functions → Secrets, antes de
-- aplicar este script. No commitear el valor real acá.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'mp_reajustar_precios_diario',
  '0 13 * * *', -- 13:00 UTC = 10:00 ARS
  $$
  select net.http_post(
    url := 'https://oxfkdioubobqttdyxcfn.supabase.co/functions/v1/mp-reajustar-precios',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'REEMPLAZAR_CON_CRON_SECRET'
    ),
    body := '{}'::jsonb
  );
  $$
);
