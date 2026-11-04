import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Hoje from './Hoje'
import Plano from './Plano'
import Simulados from './Simulados'

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

  const botao = (id, nome) => (
    <button className={aba === id ? 'pequeno aba ativa' : 'pequeno aba'} onClick={() => setAba(id)}>
      {nome}
    </button>
  )

  return (
    <div className={aba === 'simulados' ? 'painel largo' : 'painel'}>
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
        {botao('hoje', 'Hoje')}
        {botao('plano', 'Meu plano')}
        {botao('simulados', 'Simulados')}
      </nav>

      {aba === 'hoje' && <Hoje />}
      {aba === 'plano' && <Plano />}
      {aba === 'simulados' && <Simulados />}
    </div>
  )
}
