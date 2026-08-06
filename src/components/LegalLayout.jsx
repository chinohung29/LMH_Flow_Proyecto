import { Link } from 'react-router-dom'
import PublicNavbar from './PublicNavbar'

export default function LegalLayout({ titulo, actualizado, children }) {
  return (
    <div className="min-h-screen bg-graphite-950">
      <PublicNavbar />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="font-display text-3xl font-semibold text-white">{titulo}</h1>
        <p className="mt-2 text-sm text-metal-400">Última actualización: {actualizado}</p>
        <div className="legal-content mt-8 space-y-6 text-sm leading-relaxed text-metal-300">
          {children}
        </div>
      </main>
      <footer className="border-t border-metal-800 py-8 text-center text-sm text-metal-500">
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
