import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { porAssunto } from './lib/assuntos'
import Assuntos from './Assuntos'

// Mostra os assuntos em que o aluno mais erra (simulados + treinos)
export default function Foco({ onTreinar, limite = 3 }) {
  const [dados, setDados] = useState(null)

  useEffect(() => {
    async function carregar() {
      const [s, t] = await Promise.all([
        supabase.from('simulados').select('prova_id, status, resultado').eq('status', 'finalizado'),
        supabase.from('treino_respostas').select('assunto, acertou'),
      ])
      setDados(porAssunto(s.data || [], t.data || []))
    }
    carregar()
  }, [])

  if (dados === null) return null

  const fortes = dados.filter((d) => d.total >= 2)
  const lista = (fortes.length ? fortes : dados).filter((d) => d.pct < 100).slice(0, limite)

  return (
    <div className="secao foco">
      <h2>🎯 Foco de estudo</h2>
      {dados.length === 0 && (
        <p className="dica">Faça um simulado ou um treino por assunto e eu mostro aqui onde vale mais a pena estudar.</p>
      )}
      {dados.length > 0 && lista.length === 0 && <p className="dica">Nenhum ponto fraco por enquanto. Continue treinando! 🎉</p>}
      {lista.length > 0 && (
        <>
          <p className="dica">Assuntos com menos acertos (simulados e treinos). Questão em branco conta como erro.</p>
          <Assuntos dados={lista} onTreinar={onTreinar} />
        </>
      )}
    </div>
  )
}
