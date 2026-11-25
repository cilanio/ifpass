import { useEffect, useState } from 'react'
import Home from './Home'
import RevisaoPedagogica from './RevisaoPedagogica'
import { supabase } from './lib/supabase'

function tabelaEquipeAusente(erro) {
  return erro?.code === 'PGRST205'
    || (erro?.code === '42P01' && erro.message?.includes('"public.papeis_equipe"'))
}

export default function AreaAutenticada({ usuario }) {
  const [resultado, setResultado] = useState(null)
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    let atual = true
    async function consultarEquipe() {
      try {
        const { data, error } = await supabase.from('papeis_equipe')
          .select('papel, ativo').eq('usuario_id', usuario.id).maybeSingle()
        if (error && !tabelaEquipeAusente(error)) throw error
        if (atual) setResultado({ equipe: error ? null : data })
      } catch (erro) {
        if (atual) setResultado({ erro })
      }
    }
    consultarEquipe()
    return () => { atual = false }
  }, [usuario.id, tentativa])

  if (!resultado) return <p role="status">Carregando...</p>
  if (resultado.erro) {
    return (
      <main className="painel">
        <h1>IFPass</h1>
        <p role="alert">Não foi possível verificar as permissões da sua conta.</p>
        <button onClick={() => {
          setResultado(null)
          setTentativa(n => n + 1)
        }}>Tentar novamente</button>
        <button className="pequeno sair" onClick={() => supabase.auth.signOut()}>Sair</button>
      </main>
    )
  }

  const { equipe } = resultado
  if (equipe?.ativo && ['revisor_pedagogico', 'administrador'].includes(equipe.papel)) {
    return <RevisaoPedagogica papel={equipe.papel} />
  }
  if (equipe) {
    return (
      <main className="painel">
        <h1>Revisão pedagógica</h1>
        <p role="alert">Sua conta de equipe está sem acesso ativo.</p>
        <button onClick={() => supabase.auth.signOut()}>Sair</button>
      </main>
    )
  }

  return <Home usuario={usuario} />
}
