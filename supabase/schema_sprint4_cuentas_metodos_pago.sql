-- LMH Flow · nuevos tipos de cuenta/medio de pago
-- Se suman 'tarjeta_credito' y 'cheque' como tipos de cuenta, al mismo
-- nivel que 'banco' y 'caja'.
alter table public.cuentas drop constraint cuentas_tipo_check;
alter table public.cuentas add constraint cuentas_tipo_check
  check (tipo in ('banco', 'caja', 'tarjeta_credito', 'cheque'));
