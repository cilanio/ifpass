import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './Login'
import Home from './Home'

export default function App() {
  const [sessao, setSessao] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session))
    const { data: ouvinte } = supabase.auth.onAuthStateChange((_evento, nova) => setSessao(nova))
    return () => ouvinte.subscription.unsubscribe()
  }, [])

  if (sessao === undefined) return <p>Carregando...</p>
  return sessao ? <Home usuario={sessao.user} /> : <Login />
}