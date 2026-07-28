import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import Logo from './Logo'
import EmpresaSwitcher from './EmpresaSwitcher'
import { useAuth } from '../context/AuthContext'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/movimientos', label: 'Movimientos', icon: '💸' },
  { to: '/flujo', label: 'Flujo de caja', icon: '📈' },
  { to: '/calendario', label: 'Calendario', icon: '🗓️' },
  { to: '/clientes', label: 'Clientes', icon: '🧑‍💼' },
  { to: '/proveedores', label: 'Proveedores', icon: '📦' },
  { to: '/simulador', label: 'Simulador', icon: '🧮' },
  { to: '/reportes', label: 'Reportes', icon: '📑' },
  { to: '/configuracion', label: 'Configuración', icon: '⚙️' },
]

function NavList({ onNavigate }) {
  return (
    <nav className="flex-1 space-y-1 px-3">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
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
  )
}

export default function DashboardLayout({ children }) {
  const { user, signOut } = useAuth()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setMenuAbierto(false)
  }, [location.pathname])

  return (
    <div className="flex min-h-screen bg-graphite-950">
      <aside className="hidden w-64 shrink-0 border-r border-metal-800 bg-graphite-900 pl-[env(safe-area-inset-left)] md:flex md:flex-col">
        <div className="space-y-3 px-5 py-5 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
          <Logo className="h-8" />
          <EmpresaSwitcher />
        </div>
        <NavList />
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
        <header className="flex items-center justify-between border-b border-metal-800 bg-graphite-900/60 px-4 py-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] md:hidden">
          <button
            onClick={() => setMenuAbierto(true)}
            aria-label="Abrir menú"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-metal-300 hover:bg-graphite-800 hover:text-white"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 6h16M4 12h16M4 18h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <Logo variant="mark" className="h-8" />
          <button onClick={signOut} className="text-sm text-metal-300">
            Salir
          </button>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      {menuAbierto && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMenuAbierto(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-graphite-900 shadow-xl">
            <div className="flex items-center justify-between px-5 py-5 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
              <Logo className="h-8" />
              <button
                type="button"
                onClick={() => setMenuAbierto(false)}
                aria-label="Cerrar menú"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-metal-300 hover:bg-graphite-800 hover:text-white"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <div className="px-5 pb-4">
              <EmpresaSwitcher />
            </div>
            <NavList onNavigate={() => setMenuAbierto(false)} />
            <div className="border-t border-metal-800 p-4">
              <p className="truncate text-xs text-metal-400">{user?.email}</p>
              <button
                onClick={signOut}
                className="mt-2 text-sm font-medium text-metal-300 hover:text-electric-300"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
