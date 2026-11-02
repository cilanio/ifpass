import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

export default function Home({ usuario }) {
  const [perfil, setPerfil] = useState(null)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('nome, papel')
      .eq('id', usuario.id)
      .single()
      .then(({ data }) => setPerfil(data))
  }, [usuario.id])

  return (
    <div className="centro">
      <div className="cartao">
        <h1>IFPass</h1>
        <p>
          Olá, {perfil ? perfil.nome : '...'}! Você entrou como {perfil ? perfil.papel : '...'}.
        </p>
        <button onClick={() => supabase.auth.signOut()}>Sair</button>
      </div>
    </div>
  )
}