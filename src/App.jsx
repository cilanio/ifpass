import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

export default function App() {
  const [status, setStatus] = useState('Verificando conexão...')

  useEffect(() => {
    supabase.auth.getSession().then(({ error }) => {
      setStatus(error ? 'Erro na conexão: ' + error.message : 'Conectado ao Supabase ✅')
    })
  }, [])

  return (
    <div style={{ fontFamily: 'sans-serif', textAlign: 'center', marginTop: 80 }}>
      <h1>IFPass</h1>
      <p>Plataforma de estudos para o processo seletivo do IFAL</p>
      <p>{status}</p>
    </div>
  )
}