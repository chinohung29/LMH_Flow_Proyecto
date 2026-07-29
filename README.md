# LMH Flow

PWA de gestión de flujo de caja para pequeñas empresas, profesionales y
comercios. Objetivo: que cualquier usuario sepa en menos de 10 segundos si
tendrá dinero suficiente para afrontar sus próximos pagos.

## Estado actual (Sprint 1 + Sprint 2 + Sprint 3 + Sprint 4 en curso)

Implementado hasta ahora:

**Sprint 1**
- Landing con propuesta de valor, funciones y planes (Starter / Platinum)
- Registro e inicio de sesión con Supabase Auth, con opción de mostrar/
  ocultar la contraseña y recuperación por email (`/olvide-password` →
  link a `/restablecer-password`)
- App instalable como PWA (manifest + service worker con `vite-plugin-pwa`)
- Rutas protegidas para el área autenticada

**Sprint 2**
- Movimientos: alta/edición/baja de ingresos y egresos, con cuentas
  (banco/caja) y categorías propias por usuario, filtros por tipo/estado
- Flujo de Caja: proyección diaria/semanal/mensual (Chart.js) calculada a
  partir de los movimientos reales
- Calendario mensual de cobros, pagos y vencimientos
- Importación y exportación de movimientos en Excel (`src/utils/excel.js`,
  librería `xlsx`)
- Dashboard conectado a datos reales de Supabase (saldo disponible/
  proyectado, pendientes, semáforo financiero, próximos vencimientos)
- Multi-moneda: cada cuenta es en pesos ($) o dólares (US$)
  (`supabase/schema_sprint2_moneda.sql`); los montos de distintas monedas
  nunca se suman entre sí — el Dashboard muestra una sección por moneda y
  Flujo de Caja tiene un selector, para que cada total sea coherente

Cada usuario nuevo arranca con una cuenta "Caja" (en pesos) y categorías
básicas sembradas automáticamente (`supabase/schema_sprint2.sql`).

**Sprint 3**
- Clientes y Proveedores: alta/edición/baja, con "pendiente de cobro/pago"
  calculado agregando los movimientos que tenés vinculados a cada uno
  (por moneda), sin necesidad de recalcular nada a mano
  (`supabase/schema_sprint3.sql`)
- Movimientos ahora puede asociar un ingreso a un cliente o un egreso a
  un proveedor (selector opcional en el formulario)
- Simulador financiero (`src/utils/simulador.js`): 5 escenarios —cobro
  retrasado, compra extraordinaria, nuevo préstamo, incremento de ventas,
  incremento de gastos— que reproyectan el flujo de caja en memoria (sin
  tocar tus datos reales) y lo comparan contra el flujo actual en un
  mismo gráfico, con el saldo mínimo proyectado de cada escenario

**Sprint 4 (Plan Platinum, en curso)**
- Multiempresa y multiusuario (`supabase/schema_sprint4_empresas.sql`):
  cada usuario puede pertenecer a varias empresas, con un rol por empresa
  (propietario/administrador/miembro/lector) que define qué puede editar.
  Todas las tablas de datos (cuentas, categorías, movimientos, clientes,
  proveedores) ahora se filtran por `empresa_id` en vez de por usuario
  directo, con RLS reescrita en base a la membresía en `empresa_miembros`
- Selector de empresa (`EmpresaSwitcher`) en el sidebar/drawer, para crear
  una empresa nueva o cambiar la activa sin recargar la página
  (`EmpresaContext`)
- Página Configuración: editar el nombre de la empresa, ver/administrar
  miembros (cambiar rol, quitar) y generar invitaciones por link
  (`/unirse/:codigo`) sin depender de envío de emails
- Límites del plan Starter (`supabase/schema_sprint4_limites.sql`): 1
  empresa propia, 20 clientes y 20 proveedores por empresa. Se avisa en la
  UI antes de llegar al límite y también se valida en el backend (función
  `crear_empresa` y triggers en `clientes`/`proveedores`); los planes
  trial y platinum no tienen límite
- Reportes avanzados (`src/pages/Reportes/Reportes.jsx`, exclusivo de
  planes trial/platinum — plan starter ve un aviso para actualizar):
  evolución mensual de ingresos vs egresos (últimos 12 meses), desglose
  de ingresos y egresos por categoría, ranking de clientes por
  facturación y de proveedores por gasto, todo por moneda y exportable a
  Excel (`descargarReporteExcel` en `src/utils/excel.js`)
- Suscripciones pagas de LMH Flow vía Mercado Pago (cobro recurrente en
  ARS al dólar oficial del día — ver sección **Cobros con Mercado Pago**
  más abajo): desde Configuración, el usuario elige Starter o Platinum y
  paga con Mercado Pago; un webhook activa el plan automáticamente, y
  puede cancelar la renovación cuando quiera (conserva el acceso hasta
  el fin del período ya pagado, y no recupera el mes de prueba gratuita
  si vuelve a suscribirse después)
- Página Categorías (`src/pages/Categorias/Categorias.jsx`): listado de
  las categorías de ingreso/egreso (arrancan con las básicas sembradas
  al crear la empresa), con alta, edición y baja; eliminar una categoría
  no borra los movimientos que la usaban, solo les saca la categoría
- Movimientos: además de eliminar y marcar pendiente/realizado, ahora se
  puede editar cualquier campo de un movimiento ya cargado (tipo,
  descripción, monto, fecha, cuenta, categoría, cliente/proveedor,
  estado) por si se cargó algo mal
- Pendiente: integración de Mercado Pago para que cada cliente importe
  sus propias ventas (era la otra idea original, se priorizó primero
  cobrar los planes de LMH Flow), IA financiera e integración con Odoo

## Identidad visual

Paleta muestreada por color directamente del logo oficial (fondo azul
marino, azul acero + plateado/cromado del isotipo), definida en
`tailwind.config.js`:

- `graphite` — fondo azul marino (más claro que el negro grafito original,
  misma progresión oscuro → claro)
- `metal` — superficies, bordes, texto secundario, incluye tonos plateados
  (`metal-200`/`metal-100`) tomados del cromado del isotipo
- `electric` — azul acero de marca; el tono `600` (botones/links) se
  satura un poco sobre la misma tonalidad para mantener buen contraste
- `white` (sobreescrito en `extend.colors`) — texto principal plateado en
  vez de blanco puro, para que los títulos y textos en `text-white` tengan
  el mismo tono cromado que el isotipo
- Tipografía: Inter para texto de UI (`@fontsource/inter`) + Cinzel para
  títulos, momentos de marca y las opciones del menú (sidebar/drawer y
  navbar público, clase `font-display`), buscando el mismo estilo serif
  elegante del wordmark "Flow-Finance"

**Logo:** se usa el logo oficial de LMH ("LMH Flow-Finance"). El archivo
fuente era una lámina de presentación (mockup 3D con fondo oscuro), así
que se generaron los assets reales con `scripts/generate-brand-assets.cjs`
(requiere el paquete `sharp`, no está en las dependencias del proyecto —
instalarlo aparte si hace falta regenerar algo):

- `public/logo.png` — isotipo + wordmark, fondo transparente (recorte por
  luminancia, sin caja/rectángulo visible sobre el fondo de la app)
- `public/logo-mark.png` — solo el isotipo, también transparente
- `public/icons/*`, `public/favicon-*.png` — íconos PWA/favicon/apple-touch,
  compuestos sobre el fondo de marca `#0A0C0F`

`src/components/Logo.jsx` renderiza estos PNG (`variant="full"` o
`variant="mark"` para espacios angostos). Si en algún momento aparece una
versión vectorial (SVG) del logo oficial, reemplazar estos archivos directo
es más simple y da mejor nitidez que el recorte actual.

## Stack

React · Vite · Tailwind CSS · Supabase · Chart.js · PWA (instalable, sin
publicación en tiendas)

## Cómo correr el proyecto

```bash
npm install
cp .env.example .env   # completar con las credenciales de tu proyecto Supabase
npm run dev
```

### Configurar Supabase

1. Creá un proyecto en [supabase.com](https://supabase.com)
2. Copiá `Project URL` y `anon public key` (Project Settings → API) a tu `.env`:
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```
3. Ejecutá en el SQL Editor de tu proyecto, en este orden:
   - `supabase/schema.sql` — tabla `profiles` (perfil, plan, fin de prueba)
     y el trigger que la completa al registrarse un usuario.
   - `supabase/schema_sprint2.sql` — tablas `cuentas`, `categorias` y
     `movimientos` (con RLS por usuario) y el trigger que siembra una
     cuenta "Caja" y categorías básicas para cada usuario nuevo.
   - `supabase/schema_sprint2_moneda.sql` — columna `moneda` (ARS/USD) en
     `cuentas` y `movimientos`.
   - `supabase/schema_sprint3.sql` — tablas `clientes` y `proveedores`, y
     las columnas `cliente_id`/`proveedor_id` en `movimientos`.
   - `supabase/schema_sprint4_empresas.sql` — tablas `empresas`,
     `empresa_miembros` e `invitaciones`, columnas `empresa_id` en las
     tablas existentes (con backfill de los datos previos) y RLS por
     empresa en vez de por usuario. **Ojo:** este script asume que ya
     corriste los anteriores y tenés datos reales de usuarios existentes;
     leelo antes de aplicarlo si tu proyecto ya está en producción.
   - `supabase/schema_sprint4_limites.sql` — límites de plan Starter (1
     empresa, 20 clientes/proveedores) en la función `crear_empresa` y en
     triggers de `clientes`/`proveedores`.
   - `supabase/schema_sprint4_mercadopago.sql` — columna
     `profiles.mp_preapproval_id`.
   - `supabase/schema_sprint4_mp_dolar_cron.sql` — programa el reajuste
     diario de precios (`pg_cron`/`pg_net`). Editar el placeholder del
     secret antes de correrlo (ver sección de Mercado Pago más abajo).
   - `supabase/schema_sprint4_cancelacion.sql` — columna
     `profiles.plan_vence_el`, plan `'cancelado'` en el check constraint,
     y actualiza `crear_empresa`/`check_limite_clientes`/
     `check_limite_proveedores` para tratar `'cancelado'` igual que
     `'starter'`.
4. En **Authentication → URL Configuration**, configurá el **Site URL**
   con el dominio real donde publiques la app (por ejemplo tu sitio de
   Netlify) y agregalo también a **Redirect URLs** (incluyendo
   `.../restablecer-password`); si no, los links de confirmación de email
   y de recuperación de contraseña van a apuntar a `localhost`.

Sin estas variables la app funciona igual (Landing, navegación), pero el
login y el registro no van a poder autenticar usuarios reales — se muestra
un aviso en pantalla cuando falta la configuración.

### Cobros con Mercado Pago (suscripciones Starter/Platinum)

Desde **Configuración → Plan y facturación**, el usuario elige un plan y
Mercado Pago le cobra automáticamente todos los meses (Preapproval /
Suscripciones). Los planes se definen en USD (`US$15`/`US$30` por mes,
`PRECIOS_USD` en `src/utils/planes.js`) pero Mercado Pago solo admite
cobro recurrente en ARS para cuentas de Argentina, así que el monto se
calcula en pesos al **tipo de cambio oficial del día** (fuente:
[dolarapi.com](https://dolarapi.com), sin necesidad de API key). El
flujo vive en tres Edge Functions ya desplegadas en el proyecto de
Supabase:

- `supabase/functions/mp-crear-suscripcion` — consulta la cotización
  oficial del momento, crea el preapproval en Mercado Pago por el
  equivalente en ARS y devuelve el link de pago (`init_point`) al que
  se redirige al usuario.
- `supabase/functions/mp-webhook` — recibe la notificación de Mercado
  Pago, vuelve a consultar el estado real del preapproval contra la API
  (nunca confía en el payload entrante) y si está `authorized` activa el
  plan en `profiles.plan`.
- `supabase/functions/mp-reajustar-precios` — corre una vez por día vía
  `pg_cron` (migración `supabase/schema_sprint4_mp_dolar_cron.sql`) y
  actualiza (`PUT /preapproval/{id}`) el monto en ARS de cada suscripción
  ya activa según la cotización de ese día, para que el precio en pesos
  de los que ya pagan seguido acompañe al dólar. También baja a
  `plan='cancelado'` a quienes cancelaron y ya pasó su
  `plan_vence_el`. Está protegida con un secret compartido
  (`CRON_SECRET`) en vez de JWT, porque la llama `pg_cron` y no un
  usuario logueado.
- `supabase/functions/mp-cancelar-suscripcion` — desde el botón "Cancelar
  suscripción" en Configuración: cancela el preapproval en Mercado Pago
  (`status: cancelled`) pero el usuario conserva el plan actual hasta el
  `next_payment_date` que ya tenía pago (`profiles.plan_vence_el`); no
  pierde el acceso al toque.

Un usuario que cancela y después decide volver a suscribirse **no
recupera el mes de prueba gratuita**: `trial_ends_at` se define una sola
vez al registrarse y ningún flujo lo vuelve a tocar, y al vencer
`plan_vence_el` el plan pasa a `'cancelado'` (mismos límites que
`'starter'`) en vez de volver a `'trial'`.

Para que funcione hace falta, una sola vez:

1. En [Mercado Pago Developers](https://www.mercadopago.com.ar/developers/panel),
   crear una aplicación y conseguir el **Access Token de producción**
   (Tus integraciones → tu app → Credenciales de producción).
2. Cargar ese token como secret en el proyecto de Supabase — **Edge
   Functions → Secrets** — con el nombre `MP_ACCESS_TOKEN` (nunca
   commitear este valor al repo ni pegarlo en un chat).
3. Cargar también el secret `CRON_SECRET` (un valor random propio, no
   relacionado con Mercado Pago) — tiene que ser exactamente el mismo
   valor que el que quedó embebido en el `net.http_post` de la migración
   `schema_sprint4_mp_dolar_cron.sql` al aplicarla.
4. En la misma aplicación de Mercado Pago, configurar la **URL de
   notificaciones/webhooks** en **modo productivo** apuntando a:
   ```
   https://oxfkdioubobqttdyxcfn.supabase.co/functions/v1/mp-webhook
   ```
   con el evento **"Planes y suscripciones"** tildado.
5. (Opcional) Setear el secret `APP_URL` con el dominio real de Netlify
   si cambia — se usa para armar el link de vuelta (`back_url`) al
   terminar el pago; por defecto apunta a `lmh-flowfinance.netlify.app`.

**Importante:** al probar el checkout con tu propia cuenta de Mercado
Pago, usá un comprador distinto del vendedor (cuenta real vs. cuenta de
prueba, o un email diferente) — Mercado Pago rechaza la suscripción si
el pagador y el cobrador son la misma cuenta o si uno es de prueba y el
otro real.

### Build de producción

```bash
npm run build
npm run preview
```

## Próximos pasos (roadmap)

- **Sprint 4 (resto):** integración con Mercado Pago (pausada por el
  momento), IA financiera e integración con Odoo
