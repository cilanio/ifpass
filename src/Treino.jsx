import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { PROVAS } from './data/provas'
import { ASSUNTOS, BLOCOS, assuntoDe } from './data/assuntos'
import { porAssunto, corBarra } from './lib/assuntos'
import Questao from './Questao'

const TAMANHO_RODADA = 10

// Banco de questões agrupadas por assunto (ignora as anuladas)
const BANCO = {}
for (const prova of PROVAS) {
  for (const questao of prova.questoes) {
    if (questao.gabarito === 'NULA') continue
    const id = assuntoDe(prova.id, questao.n)
    if (!id) continue
    ;(BANCO[id] = BANCO[id] || []).push({ prova, questao })
  }
}

function sortear(lista, n) {
  const c = [...lista]
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[c[i], c[j]] = [c[j], c[i]]
  }
  return c.slice(0, n)
}

export default function Treino({ assuntoInicial }) {
  const [desempenho, setDesempenho] = useState([])
  const [rodada, setRodada] = useState(null) // { id, itens, i, acertos, fim }
  const [escolhida, setEscolhida] = useState(null)
  const [erro, setErro] = useState('')

  async function carregar() {
    const [s, t] = await Promise.all([
      supabase.from('simulados').select('prova_id, status, resultado').eq('status', 'finalizado'),
      supabase.from('treino_respostas').select('assunto, acertou'),
    ])
    setDesempenho(porAssunto(s.data || [], t.data || []))
  }

  function iniciar(id) {
    setErro('')
    setEscolhida(null)
    setRodada({ id, itens: sortear(BANCO[id], TAMANHO_RODADA), i: 0, acertos: 0, fim: false })
  }

  useEffect(() => {
    carregar()
    if (assuntoInicial && BANCO[assuntoInicial]) iniciar(assuntoInicial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function responder(letra) {
    if (escolhida) return
    const { prova, questao } = rodada.itens[rodada.i]
    const acertou = letra === questao.gabarito
    setEscolhida(letra)
    setRodada((r) => ({ ...r, acertos: r.acertos + (acertou ? 1 : 0) }))
    const { error } = await supabase
      .from('treino_respostas')
      .insert({ prova_id: prova.id, n: questao.n, assunto: rodada.id, acertou })
    if (error) setErro('Não consegui salvar esta resposta: ' + error.message)
  }

  function proxima() {
    setEscolhida(null)
    setRodada((r) => (r.i + 1 < r.itens.length ? { ...r, i: r.i + 1 } : { ...r, fim: true }))
  }

  function voltar() {
    setRodada(null)
    setEscolhida(null)
    carregar()
  }

  // ---------- Tela da rodada ----------
  if (rodada && rodada.fim) {
    return (
      <div className="secao nota-box">
        <p className="dica">{ASSUNTOS[rodada.id].nome}</p>
        <div className="nota-grande">
          {rodada.acertos}/{rodada.itens.length}
        </div>
        <p>Rodada concluída.</p>
        <div className="linha" style={{ justifyContent: 'center' }}>
          <button className="pequeno" onClick={() => iniciar(rodada.id)}>
            Treinar de novo
          </button>
          <button className="pequeno sair" onClick={voltar}>
            Escolher outro assunto
          </button>
        </div>
      </div>
    )
  }

  if (rodada) {
    const { prova, questao } = rodada.itens[rodada.i]
    const acertou = escolhida === questao.gabarito
    return (
      <div>
        <div className="secao">
          <div className="linha" style={{ justifyContent: 'space-between', marginBottom: 0 }}>
            <div>
              <strong>{ASSUNTOS[rodada.id].nome}</strong>
              <p className="dica">
                Questão {rodada.i + 1} de {rodada.itens.length} · vem da prova {prova.titulo.replace(' — Prova', ' ·')} (nº {questao.n})
              </p>
            </div>
            <button className="pequeno sair" onClick={voltar}>
              Sair do treino
            </button>
          </div>
        </div>
        {erro && <p className="erro">{erro}</p>}
        <Questao prova={prova} questao={questao} resposta={escolhida} revisao={!!escolhida} onResponder={responder} />
        {escolhida && (
          <>
            <div className={acertou ? 'feedback ok' : 'feedback erro-fb'}>
              {acertou ? '✓ Acertou!' : `✗ Errou. A resposta certa é a ${questao.gabarito}.`}
            </div>
            <button className="pequeno" onClick={proxima}>
              {rodada.i + 1 < rodada.itens.length ? 'Próxima →' : 'Ver resultado'}
            </button>
          </>
        )}
      </div>
    )
  }

  // ---------- Tela de escolha do assunto ----------
  return (
    <div className="secao">
      <h2>Treino por assunto</h2>
      <p className="dica">
        Escolha um assunto e resolva até {TAMANHO_RODADA} questões reais das provas anteriores, com a correção na hora.
      </p>
      {erro && <p className="erro">{erro}</p>}
      {BLOCOS.map((bloco) => {
        const ids = Object.keys(ASSUNTOS).filter((id) => ASSUNTOS[id].bloco === bloco && BANCO[id])
        if (!ids.length) return null
        return (
          <div key={bloco}>
            <div className="bloco-titulo">{bloco}</div>
            {ids.map((id) => {
              const d = desempenho.find((x) => x.id === id)
              return (
                <div key={id} className="assunto">
                  <div className="assunto-info">
                    <div className="assunto-nome">{ASSUNTOS[id].nome}</div>
                    <div className="assunto-meta">
                      {BANCO[id].length} questões no banco
                      {d && (
                        <>
                          {' · seu aproveitamento: '}
                          <strong style={{ color: corBarra(d.pct) }}>{d.pct}%</strong> ({d.acertos}/{d.total})
                        </>
                      )}
                    </div>
                  </div>
                  <button className="pequeno" onClick={() => iniciar(id)}>
                    Treinar
                  </button>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
