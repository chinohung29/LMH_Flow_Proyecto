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
      'Integración con Mercado Pago',
      'Importación bancaria',
      'Usuarios y permisos',
      'Personalizaciones y automatizaciones: solicitar presupuesto',
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
        <div className="mb-4 flex items-center justify-center gap-5">
          <a
            href="https://wa.me/541173724119"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp"
            className="text-metal-400 transition hover:text-[#25D366]"
          >
            <svg width="22" height="22" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z" />
            </svg>
          </a>
          <a
            href="https://instagram.com/lmhapps"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="text-metal-400 transition hover:text-electric-400"
          >
            <svg width="22" height="22" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.917 3.917 0 0 0-1.417.923A3.927 3.927 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.916 3.916 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.926 3.926 0 0 0-.923-1.417A3.911 3.911 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0h.003zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599.28.28.453.546.598.92.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.47 2.47 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.478 2.478 0 0 1-.92-.598 2.48 2.48 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233 0-2.136.008-2.388.046-3.231.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92.28-.28.546-.453.92-.598.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045v.002zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92zm-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217zm0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334z" />
            </svg>
          </a>
        </div>
        <div className="mb-3 flex flex-wrap items-center justify-center gap-4">
          <Link to="/privacidad" className="hover:text-metal-300">
            Privacidad
          </Link>
          <Link to="/terminos" className="hover:text-metal-300">
            Términos y condiciones
          </Link>
          <Link to="/arrepentimiento" className="hover:text-metal-300">
            Botón de arrepentimiento
          </Link>
        </div>
        © {new Date().getFullYear()} LMH Flow · LMH Consulting
      </footer>
    </div>
  )
}
