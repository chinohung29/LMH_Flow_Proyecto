import { NavLink } from 'react-router-dom'
import Logo from './Logo'
import { useAuth } from '../context/AuthContext'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/movimientos', label: 'Movimientos', icon: '💸' },
  { to: '/flujo', label: 'Flujo de caja', icon: '📈' },
  { to: '/calendario', label: 'Calendario', icon: '🗓️' },
  { to: '/clientes', label: 'Clientes', icon: '🧑‍💼' },
  { to: '/proveedores', label: 'Proveedores', icon: '📦' },
  { to: '/simulador', label: 'Simulador', icon: '🧮' },
  { to: '/configuracion', label: 'Configuración', icon: '⚙️' },
]

export default function DashboardLayout({ children }) {
  const { user, signOut } = useAuth()

  return (
    <div className="flex min-h-screen bg-graphite-950">
      <aside className="hidden w-64 shrink-0 border-r border-metal-800 bg-graphite-900 md:flex md:flex-col">
        <div className="px-5 py-5">
          <Logo />
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-electric-600/15 text-electric-300'
                    : 'text-metal-300 hover:bg-graphite-800 hover:text-white'
                }`
              }
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-metal-800 p-4">
          <p className="truncate text-xs text-metal-400">{user?.email}</p>
          <button
            onClick={signOut}
            className="mt-2 text-sm font-medium text-metal-300 hover:text-electric-300"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-metal-800 bg-graphite-900/60 px-4 py-3 md:hidden">
          <Logo />
          <button onClick={signOut} className="text-sm text-metal-300">
            Salir
          </button>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
