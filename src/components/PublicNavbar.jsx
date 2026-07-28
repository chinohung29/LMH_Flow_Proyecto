import { Link } from 'react-router-dom'
import Logo from './Logo'

export default function PublicNavbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-metal-800/80 bg-graphite-950/85 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/">
          <Logo />
        </Link>
        <div className="hidden items-center gap-8 text-sm text-metal-300 sm:flex">
          <a href="#funciones" className="hover:text-white">
            Funciones
          </a>
          <a href="#planes" className="hover:text-white">
            Planes
          </a>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-medium text-metal-300 hover:text-white">
            Iniciar sesión
          </Link>
          <Link to="/registro" className="btn-primary !px-4 !py-2 text-sm">
            Probar gratis
          </Link>
        </div>
      </nav>
    </header>
  )
}
