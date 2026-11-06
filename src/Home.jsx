import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Hoje from './Hoje'
import Plano from './Plano'
import Simulados from './Simulados'
import Treino from './Treino'

export default function Home({ usuario }) {
  const [perfil, setPerfil] = useState(null)
  const [aba, setAba] = useState('hoje')
  const [assuntoTreino, setAssuntoTreino] = useState(null)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('nome, papel')
      .eq('id', usuario.id)
      .single()
      .then(({ data }) => setPerfil(data))
  }, [usuario.id])

  // abre o treino já no assunto escolhido (vem do "Foco de estudo" e do resultado do simulado)
  function treinar(idAssunto) {
    setAssuntoTreino(idAssunto)
    setAba('treino')
  }

  function irPara(id) {
    if (id === 'treino') setAssuntoTreino(null)
    setAba(id)
  }

  const botao = (id, nome) => (
    <button className={aba === id ? 'pequeno aba ativa' : 'pequeno aba'} onClick={() => irPara(id)}>
      {nome}
    </button>
  )

  const largo = aba === 'simulados' || aba === 'treino'

  return (
    <div className={largo ? 'painel largo' : 'painel'}>
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
        {botao('treino', 'Treino')}
      </nav>

      {aba === 'hoje' && <Hoje onTreinar={treinar} />}
      {aba === 'plano' && <Plano />}
      {aba === 'simulados' && <Simulados onTreinar={treinar} />}
      {aba === 'treino' && <Treino key={assuntoTreino || 'lista'} assuntoInicial={assuntoTreino} />}
    </div>
  )
}
