-- Corre todos los días a las 12:00 UTC (09:00 de Argentina). Reutiliza el mismo
-- secreto compartido (CRON_SECRET) que el cron de mp-reajustar-precios.
do $$
declare
  v_secret text;
begin
  select substring(command from 'x-cron-secret'',\s*''([^'']+)''') into v_secret
  from cron.job where jobname = 'mp_reajustar_precios_diario';

  if v_secret is null then
    raise exception 'No se encontró el secreto del cron existente';
  end if;

  perform cron.schedule(
    'avisos_automaticos_diario',
    '0 12 * * *',
    format($cmd$
      select net.http_post(
        url := 'https://oxfkdioubobqttdyxcfn.supabase.co/functions/v1/avisos-automaticos',
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', %L),
        body := '{}'::jsonb
      );
    $cmd$, v_secret)
  );
end $$;
