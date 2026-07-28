# LMH Flow

PWA de gestión de flujo de caja para pequeñas empresas, profesionales y
comercios. Objetivo: que cualquier usuario sepa en menos de 10 segundos si
tendrá dinero suficiente para afrontar sus próximos pagos.

## Estado actual (Sprint 1 + Sprint 2 + Sprint 3 + Sprint 4 en curso)

Implementado hasta ahora:

**Sprint 1**
- Landing con propuesta de valor, funciones y planes (Starter / Platinum)
- Registro e inicio de sesión con Supabase Auth
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
- Pendiente: integración con Mercado Pago, IA financiera, reportes
  avanzados e integración con Odoo

## Identidad visual

Paleta muestreada por color directamente del logo oficial (fondo negro
grafito, azul acero + plateado/cromado del isotipo), definida en
`tailwind.config.js`:

- `graphite` — fondo (calibrado sobre el navy del logo)
- `metal` — superficies, bordes, texto secundario, incluye tonos plateados
  (`metal-200`/`metal-100`) tomados del cromado del isotipo
- `electric` — azul acero de marca; el tono `600` (botones/links) se
  satura un poco sobre la misma tonalidad para mantener buen contraste
- Tipografía: Inter para texto de UI (`@fontsource/inter`) + Cinzel para
  títulos y momentos de marca (`@fontsource/cinzel`, clase `font-display`),
  buscando el mismo estilo serif elegante del wordmark "Flow-Finance"

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
4. En **Authentication → URL Configuration**, configurá el **Site URL**
   con el dominio real donde publiques la app (por ejemplo tu sitio de
   Netlify) y agregalo también a **Redirect URLs**; si no, los links de
   confirmación de email van a apuntar a `localhost`.

Sin estas variables la app funciona igual (Landing, navegación), pero el
login y el registro no van a poder autenticar usuarios reales — se muestra
un aviso en pantalla cuando falta la configuración.

### Build de producción

```bash
npm run build
npm run preview
```

## Próximos pasos (roadmap)

- **Sprint 4 (resto):** integración con Mercado Pago, IA financiera,
  reportes avanzados e integración con Odoo
