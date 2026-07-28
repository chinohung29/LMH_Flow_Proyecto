import { Link } from 'react-router-dom'
import PublicNavbar from '../../components/PublicNavbar'

const FEATURES = [
  {
    icon: '📊',
    title: 'Dashboard financiero',
    description: 'Saldo disponible, saldo proyectado y semáforo financiero de un vistazo.',
  },
  {
    icon: '📈',
    title: 'Flujo de caja',
    description: 'Vista diaria, semanal y mensual con proyección automática.',
  },
  {
    icon: '🗓️',
    title: 'Calendario de vencimientos',
    description: 'Cobros, pagos y vencimientos organizados en un solo lugar.',
  },
  {
    icon: '🧮',
    title: 'Simulador financiero',
    description: 'Modelá escenarios: cobros retrasados, nuevos préstamos, más ventas o gastos.',
  },
  {
    icon: '📥',
    title: 'Importación de Excel',
    description: 'Subí tus movimientos existentes sin perder tiempo cargando a mano.',
  },
  {
    icon: '📤',
    title: 'Exportación de Excel',
    description: 'Llevate tus datos cuando los necesites, sin ataduras.',
  },
]

const PLANS = [
  {
    name: 'Starter',
    price: 15,
    highlight: false,
    features: [
      '1 empresa',
      '1 banco + Caja',
      'Hasta 20 clientes',
      'Hasta 20 proveedores',
      'Dashboard financiero',
      'Flujo de caja',
      'Calendario de vencimientos',
      'Simulador financiero',
      'Importación y exportación de Excel',
      'Configuración básica',
    ],
  },
  {
    name: 'Platinum',
    price: 30,
    highlight: true,
    features: [
      'Todo lo de Starter',
      'Empresas ilimitadas',
      'Bancos ilimitados',
      'Clientes ilimitados',
      'Proveedores ilimitados',
      'IA financiera',
      'Reportes avanzados',
      'Integración con Odoo',
      'Integración con Mercado Pago',
      'Importación bancaria',
      'Usuarios y permisos',
    ],
  },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-graphite-950">
      <PublicNavbar />

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(circle_at_top,_rgba(43,123,255,0.18),_transparent_60%)]" />
        <div className="mx-auto max-w-4xl px-6 pb-20 pt-20 text-center sm:pt-28">
          <span className="inline-block rounded-full border border-electric-500/40 bg-electric-500/10 px-4 py-1 text-sm font-medium text-electric-300">
            30 días gratis · Sin tarjeta de crédito
          </span>
          <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Sabé en menos de 10 segundos si vas a tener plata para pagar lo que
            viene.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-metal-300">
            LMH Flow es la app de flujo de caja para pequeñas empresas,
            profesionales y comercios que quieren tomar decisiones financieras
            sin sorpresas.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/registro" className="btn-primary w-full sm:w-auto">
              Empezar prueba gratuita
            </Link>
            <a href="#planes" className="btn-secondary w-full sm:w-auto">
              Ver planes
            </a>
          </div>
          <p className="mt-4 text-sm text-metal-400">
            Instalable como app en tu computadora, tablet o celular. Sin
            tiendas de aplicaciones.
          </p>
        </div>
      </section>

      <section id="funciones" className="mx-auto max-w-6xl px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-semibold text-white">Todo lo que necesitás para controlar tu caja</h2>
          <p className="mt-3 text-metal-300">
            Un solo lugar para ver, proyectar y anticipar el movimiento de tu
            dinero.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="card">
              <span className="text-2xl">{feature.icon}</span>
              <h3 className="mt-3 font-semibold text-white">{feature.title}</h3>
              <p className="mt-1.5 text-sm text-metal-300">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="planes" className="mx-auto max-w-5xl px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-semibold text-white">Planes simples, sin sorpresas</h2>
          <p className="mt-3 text-metal-300">
            Empezá con 30 días gratis. Sin tarjeta de crédito. Cambiá de plan
            cuando quieras.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`card flex flex-col ${
                plan.highlight ? 'border-electric-500 shadow-glow' : ''
              }`}
            >
              {plan.highlight && (
                <span className="mb-3 w-fit rounded-full bg-electric-600 px-3 py-1 text-xs font-semibold text-white">
                  Más elegido
                </span>
              )}
              <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
              <p className="mt-2">
                <span className="text-4xl font-bold text-white">${plan.price}</span>
                <span className="text-metal-400"> USD / mes</span>
              </p>
              <ul className="mt-6 flex-1 space-y-2.5 text-sm text-metal-300">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="mt-0.5 text-electric-400">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/registro"
                className={plan.highlight ? 'btn-primary mt-8' : 'btn-secondary mt-8'}
              >
                Empezar prueba gratuita
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-16 text-center">
        <div className="card">
          <h2 className="font-display text-2xl font-semibold text-white">
            30 días de prueba gratuita, acceso completo
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-metal-300">
            Sin tarjeta de crédito. Probá todas las funciones del plan que
            elijas y decidí con calma.
          </p>
          <Link to="/registro" className="btn-primary mt-6 inline-flex">
            Crear mi cuenta gratis
          </Link>
        </div>
      </section>

      <footer className="border-t border-metal-800 py-8 text-center text-sm text-metal-500">
        © {new Date().getFullYear()} LMH Flow · LMH Consulting
      </footer>
    </div>
  )
}
