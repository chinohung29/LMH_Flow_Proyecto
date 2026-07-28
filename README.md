# LMH Flow

PWA de gestión de flujo de caja para pequeñas empresas, profesionales y
comercios. Objetivo: que cualquier usuario sepa en menos de 10 segundos si
tendrá dinero suficiente para afrontar sus próximos pagos.

## Estado actual (Sprint 1 + Sprint 2)

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

Cada usuario nuevo arranca con una cuenta "Caja" y categorías básicas
sembradas automáticamente (`supabase/schema_sprint2.sql`).

Páginas "próximamente" para Clientes, Proveedores, Simulador y
Configuración (Sprints 3-4).

## Identidad visual

Paleta interpretada a partir de la identidad de marca LMH (fondo negro
grafito, azul eléctrico como color principal, gris metálico para
superficies), definida en `tailwind.config.js`:

- `graphite` — fondo (negro grafito)
- `metal` — superficies, bordes, texto secundario (gris metálico)
- `electric` — color principal de marca (azul eléctrico)
- Tipografía: Inter (`@fontsource/inter`, autohospedada para que funcione offline)

**Logo:** todavía no se subió el archivo oficial de LMH. Se usa un logo
placeholder (`src/components/Logo.jsx`, `public/logo.png`,
`public/favicon.svg`, `public/icons/*`) tipo wordmark "LMH Flow" con un
ícono de tendencia ascendente. Cuando tengas el logo real, reemplazá esos
archivos y actualizá `Logo.jsx`.

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

- **Sprint 3:** Clientes, Proveedores, Simulador financiero
- **Sprint 4:** Plan Platinum (IA financiera, reportes avanzados, integración Odoo y Mercado Pago, usuarios y permisos)
