
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { porAssunto } from './lib/assuntos'
import Assuntos from './Assuntos'
import { ASSUNTOS } from './data/assuntos'
import { treinoAutoralHabilitado } from './lib/treinoAutoral'

export default function Foco({ onTreinar, limite = 3 }) {
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState('')
  const [treino, setTreino] = useState([])

  useEffect(() => {
    let ativo = true

    async function carregar() {
      try {
        const [s, t] = await Promise.all([
          supabase
            .from('simulados')
            .select('prova_id, status, resultado, finalizado_em')
            .eq('status', 'finalizado'),

          treinoAutoralHabilitado
            ? supabase.rpc('ifpass_treino_indicadores', { p_desde: '-infinity' })
            : supabase.from('treino_respostas').select('assunto, acertou, criado_em'),
        ])

        if (s.error || t.error) {
          throw new Error('Não foi possível carregar seu diagnóstico.')
        }

        if (ativo) {
          setDados(porAssunto(s.data || [], treinoAutoralHabilitado ? [] : t.data || []))
          if (treinoAutoralHabilitado) setTreino(t.data || [])
        }
      } catch (e) {
        if (ativo) {
          setErro(e.message || 'Erro ao carregar o diagnóstico.')
          setDados([])
        }
      }
    }

    carregar()

    return () => {
      ativo = false
    }
  }, [])

  if (dados === null) return null

  const avaliaveis = dados.filter((d) => d.total >= 5)

  const lista = avaliaveis
    .filter((d) => d.pct < 100)
    .slice(0, limite)

  function textoTendencia(evolucao) {
    if (evolucao.tendencia === 'melhora') {
      return `Melhora de ${evolucao.variacao} pontos percentuais`
    }

    if (evolucao.tendencia === 'queda') {
      return `Queda de ${Math.abs(evolucao.variacao)} pontos percentuais`
    }

    if (evolucao.tendencia === 'estavel') {
      return 'Desempenho estável'
    }

    return 'Dados insuficientes para avaliar a evolução'
  }

  return (
    <div className="secao foco">
      <h2>🎯 Foco de estudo</h2>
      {treinoAutoralHabilitado && (
        <>
          <h3>Treino</h3>
          {treino.length === 0 && !erro && <p className="dica">Ainda não há respostas válidas de treino.</p>}
          {treino.length > 0 && <ul>{treino.map(({ assunto, acertos, respondidas }) => (
            <li key={assunto}>{ASSUNTOS[assunto]?.nome ?? assunto} — {acertos} de {respondidas} corretas</li>
          ))}</ul>}
          <h3>Simulados oficiais</h3>
        </>
      )}

      {erro && <p className="erro">{erro}</p>}

      {!erro && dados.length === 0 && (
        <p className="dica">
          {treinoAutoralHabilitado ? 'Conclua um simulado oficial para começar este diagnóstico.'
            : 'Faça um simulado ou treino por assunto para começar seu diagnóstico.'}
        </p>
      )}

      {!erro && dados.length > 0 && avaliaveis.length === 0 && (
        <p className="dica">
          Ainda precisamos de pelo menos 5 respostas válidas por assunto
          para identificar prioridades com mais segurança. Continue treinando!
        </p>
      )}

      {lista.length > 0 && (
        <>
          <p className="dica">
            Assuntos que merecem mais atenção, considerando apenas questões
            efetivamente respondidas.
          </p>

          <Assuntos dados={lista} onTreinar={onTreinar} />

          <div className="evolucao-assuntos">
            <h3>📈 Evolução do desempenho</h3>

            {lista.map((d) => (
              <div className="evolucao-item" key={d.id}>
                <strong>{d.nome}</strong>

                <p>
                  Aproveitamento geral: {d.pct}%
                </p>

                <p>
                  Últimos 30 dias: {d.evolucao.recente.pct === null
                    ? 'Sem dados'
                    : `${d.evolucao.recente.pct}%`}
                  {' · '}
                  Período anterior: {d.evolucao.anterior.pct === null
                    ? 'Sem dados'
                    : `${d.evolucao.anterior.pct}%`}
                </p>

                <p>
                  {textoTendencia(d.evolucao)}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      {!erro && avaliaveis.length > 0 && lista.length === 0 && (
        <p className="dica">
          Excelente! Não identificamos assuntos com aproveitamento abaixo
          de 100% entre os que já possuem dados suficientes.
        </p>
      )}
    </div>
  )
}