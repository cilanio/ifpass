import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Hoje from './Hoje'
import Plano from './Plano'

export default function Home({ usuario }) {
  const [perfil, setPerfil] = useState(null)
  const [aba, setAba] = useState('hoje')

  useEffect(() => {
    supabase
      .from('profiles')
      .select('nome, papel')
      .eq('id', usuario.id)
      .single()
      .then(({ data }) => setPerfil(data))
  }, [usuario.id])

  return (
    <div className="painel">
      <header className="topo">
        <div>
          <h1>IFPass</h1>
          <p className="dica">Olá, {perfil ? perfil.nome : '...'}!</p>
        </div>
        <button className="pequeno sair" onClick={() => supabase.auth.signOut()}>
          Sair
        </button>
      </header>

      <nav className="abas">
        <button className={aba === 'hoje' ? 'pequeno aba ativa' : 'pequeno aba'} onClick={() => setAba('hoje')}>
          Hoje
        </button>
        <button className={aba === 'plano' ? 'pequeno aba ativa' : 'pequeno aba'} onClick={() => setAba('plano')}>
          Meu plano
        </button>
      </nav>

      {aba === 'hoje' ? <Hoje /> : <Plano />}
    </div>
  )
}