# LMH Flow

PWA de gestión de flujo de caja para pequeñas empresas, profesionales y
comercios. Objetivo: que cualquier usuario sepa en menos de 10 segundos si
tendrá dinero suficiente para afrontar sus próximos pagos.

## Estado actual (Sprint 1)

Implementado en esta etapa:

- Landing con propuesta de valor, funciones y planes (Starter / Platinum)
- Registro e inicio de sesión con Supabase Auth
- Dashboard con saldo disponible/proyectado, cobros/pagos pendientes,
  próximos vencimientos, semáforo financiero y gráfico de proyección
  (datos de ejemplo en `src/database/mockData.js`, a reemplazar en el
  Sprint 2 por datos reales de Supabase)
- App instalable como PWA (manifest + service worker con `vite-plugin-pwa`)
- Rutas protegidas para el área autenticada
- Páginas "próximamente" para Movimientos, Flujo, Calendario, Clientes,
  Proveedores, Simulador y Configuración (Sprints 2-3)

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
3. Ejecutá `supabase/schema.sql` en el SQL Editor de tu proyecto para crear
   la tabla `profiles` (perfil de usuario, plan, fecha de fin de prueba) y
   el trigger que la completa automáticamente al registrarse un usuario.

Sin estas variables la app funciona igual (Landing, navegación), pero el
login y el registro no van a poder autenticar usuarios reales — se muestra
un aviso en pantalla cuando falta la configuración.

### Build de producción

```bash
npm run build
npm run preview
```

## Próximos pasos (roadmap)

- **Sprint 2:** Movimientos, Flujo de caja, Calendario, importación/exportación de Excel
- **Sprint 3:** Clientes, Proveedores, Simulador financiero
- **Sprint 4:** Plan Platinum (IA financiera, reportes avanzados, integración Odoo y Mercado Pago, usuarios y permisos)
