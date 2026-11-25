import { useEffect, useState } from 'react'
import Home from './Home'
import RevisaoPedagogica from './RevisaoPedagogica'
import { supabase } from './lib/supabase'

export default function AreaAutenticada({ usuario }) {
  const [equipe, setEquipe] = useState(undefined)

  useEffect(() => {
    let atual = true
    async function consultarEquipe() {
      try {
        const { data, error } = await supabase.from('papeis_equipe')
          .select('papel, ativo').eq('usuario_id', usuario.id).maybeSingle()
        if (atual) setEquipe(error ? null : data)
      } catch {
        if (atual) setEquipe(null)
      }
    }
    consultarEquipe()
    return () => { atual = false }
  }, [usuario.id])

  if (equipe === undefined) return <p role="status">Carregando...</p>
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
