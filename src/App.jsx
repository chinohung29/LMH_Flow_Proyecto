import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Landing from './pages/Landing/Landing'
import Login from './pages/Auth/Login'
import Registro from './pages/Auth/Registro'
import Dashboard from './pages/Dashboard/Dashboard'
import Movimientos from './pages/Movimientos/Movimientos'
import Flujo from './pages/Flujo/Flujo'
import Calendario from './pages/Calendario/Calendario'
import Clientes from './pages/Clientes/Clientes'
import Proveedores from './pages/Proveedores/Proveedores'
import Simulador from './pages/Simulador/Simulador'
import Configuracion from './pages/Configuracion/Configuracion'
import UnirseEmpresa from './pages/UnirseEmpresa/UnirseEmpresa'

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
      <Route path="/dashboard" element={withProtection(Dashboard)} />
      <Route path="/movimientos" element={withProtection(Movimientos)} />
      <Route path="/flujo" element={withProtection(Flujo)} />
      <Route path="/calendario" element={withProtection(Calendario)} />
      <Route path="/clientes" element={withProtection(Clientes)} />
      <Route path="/proveedores" element={withProtection(Proveedores)} />
      <Route path="/simulador" element={withProtection(Simulador)} />
      <Route path="/configuracion" element={withProtection(Configuracion)} />
      <Route path="/unirse/:codigo" element={withProtection(UnirseEmpresa)} />
      <Route path="*" element={<Landing />} />
    </Routes>
  )
}
