import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Landing from './pages/Landing/Landing'
import Login from './pages/Auth/Login'
import Registro from './pages/Auth/Registro'
import OlvidePassword from './pages/Auth/OlvidePassword'
import RestablecerPassword from './pages/Auth/RestablecerPassword'
import Dashboard from './pages/Dashboard/Dashboard'
import Movimientos from './pages/Movimientos/Movimientos'
import Categorias from './pages/Categorias/Categorias'
import Flujo from './pages/Flujo/Flujo'
import Calendario from './pages/Calendario/Calendario'
import Clientes from './pages/Clientes/Clientes'
import Proveedores from './pages/Proveedores/Proveedores'
import Simulador from './pages/Simulador/Simulador'
import Reportes from './pages/Reportes/Reportes'
import IAFinanciera from './pages/IAFinanciera/IAFinanciera'
import Configuracion from './pages/Configuracion/Configuracion'
import UnirseEmpresa from './pages/UnirseEmpresa/UnirseEmpresa'
import Privacidad from './pages/Legal/Privacidad'
import Terminos from './pages/Legal/Terminos'

function withProtection(Component) {
  return (
    <ProtectedRoute>
      <Component />
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Registro />} />
      <Route path="/olvide-password" element={<OlvidePassword />} />
      <Route path="/restablecer-password" element={<RestablecerPassword />} />
      <Route path="/privacidad" element={<Privacidad />} />
      <Route path="/terminos" element={<Terminos />} />
      <Route path="/dashboard" element={withProtection(Dashboard)} />
      <Route path="/movimientos" element={withProtection(Movimientos)} />
      <Route path="/categorias" element={withProtection(Categorias)} />
      <Route path="/flujo" element={withProtection(Flujo)} />
      <Route path="/calendario" element={withProtection(Calendario)} />
      <Route path="/clientes" element={withProtection(Clientes)} />
      <Route path="/proveedores" element={withProtection(Proveedores)} />
      <Route path="/simulador" element={withProtection(Simulador)} />
      <Route path="/reportes" element={withProtection(Reportes)} />
      <Route path="/ia-financiera" element={withProtection(IAFinanciera)} />
      <Route path="/configuracion" element={withProtection(Configuracion)} />
      <Route path="/unirse/:codigo" element={withProtection(UnirseEmpresa)} />
      <Route path="*" element={<Landing />} />
    </Routes>
  )
}
