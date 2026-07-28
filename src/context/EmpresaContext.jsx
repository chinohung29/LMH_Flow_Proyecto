import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '../services/supabaseClient'
import {
  listMisEmpresas,
  crearEmpresa as crearEmpresaService,
  establecerEmpresaActiva,
} from '../services/empresas'

const EmpresaContext = createContext(undefined)

export function EmpresaProvider({ children }) {
  const { user } = useAuth()
  const [empresas, setEmpresas] = useState([])
  const [empresaActivaId, setEmpresaActivaId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    if (!user) {
      setEmpresas([])
      setEmpresaActivaId(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const [lista, { data: perfil }] = await Promise.all([
        listMisEmpresas(),
        supabase.from('profiles').select('empresa_activa_id').eq('id', user.id).single(),
      ])
      setEmpresas(lista)
      const activaValida = lista.some((e) => e.id === perfil?.empresa_activa_id)
      setEmpresaActivaId(activaValida ? perfil.empresa_activa_id : (lista[0]?.id ?? null))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    cargar()
  }, [cargar])

  async function cambiarEmpresa(empresaId) {
    setEmpresaActivaId(empresaId)
    try {
      await establecerEmpresaActiva(empresaId)
    } catch (err) {
      setError(err.message)
    }
  }

  async function crearEmpresa(nombre) {
    const nueva = await crearEmpresaService(nombre)
    await cargar()
    setEmpresaActivaId(nueva.id)
    return nueva
  }

  const empresaActiva = empresas.find((e) => e.id === empresaActivaId) ?? null

  const value = {
    empresas,
    empresaActiva,
    loading,
    error,
    cambiarEmpresa,
    crearEmpresa,
    recargar: cargar,
  }

  return <EmpresaContext.Provider value={value}>{children}</EmpresaContext.Provider>
}

export function useEmpresa() {
  const ctx = useContext(EmpresaContext)
  if (ctx === undefined) {
    throw new Error('useEmpresa debe usarse dentro de <EmpresaProvider>')
  }
  return ctx
}
