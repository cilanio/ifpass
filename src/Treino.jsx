import { useEffect, useRef, useState } from 'react'
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
  const [rodada, setRodada] = useState(null)
  const [escolhida, setEscolhida] = useState(null)
  const [erro, setErro] = useState('')
  const [iniciando, setIniciando] = useState(null) // Guarda o ID do assunto carregando
  const [salvandoResposta, setSalvandoResposta] = useState(false)
  const [finalizando, setFinalizando] = useState(false)

  const enviando = useRef(false)
  const iniciandoRef = useRef(false)

  async function carregar() {
    const [s, t] = await Promise.all([
      supabase
        .from('simulados')
        .select('prova_id, status, resultado')
        .eq('status', 'finalizado'),

      supabase
        .from('treino_respostas')
        .select('assunto, acertou'),
    ])

    if (s.error || t.error) {
      setErro('Não foi possível carregar seu desempenho.')
      return
    }

    setDesempenho(porAssunto(s.data || [], t.data || []))
  }

  // Cria uma sessão no banco antes de iniciar a rodada.
  async function iniciar(id) {
    if (iniciandoRef.current) return

      setErro('')

    const itens = sortear(BANCO[id] || [], TAMANHO_RODADA)

    if (!itens.length) {
      setErro('Não existem questões disponíveis para este assunto.')
      return
    }

    iniciandoRef.current = true

    setIniciando(id)

    try {
      const { data, error } = await supabase
        .from('treino_sessoes')
        .insert({
          assunto: id,
          total_questoes: itens.length,
          status: 'em_andamento',
        })
        .select('id')
        .single()

      if (error) throw error

      setEscolhida(null)

      setRodada({
        id,
        sessaoId: data.id,
        itens,
        i: 0,
        acertos: 0,
        respondidas: 0,
        fim: false,
      })
    } catch (error) {
      setErro('Não foi possível iniciar o treinamento: ' + error.message)
    } finally {
      iniciandoRef.current = false
      setIniciando(null)
    }
  }

  useEffect(() => {
    carregar()

    if (assuntoInicial && BANCO[assuntoInicial]) {
      iniciar(assuntoInicial)
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Registra a resposta antes de liberar a próxima questão.
  async function responder(letra) {
    if (escolhida || enviando.current) return

    const { prova, questao } = rodada.itens[rodada.i]
    const acertou = letra === questao.gabarito

    enviando.current = true
    setSalvandoResposta(true)
    setErro('')

    try {
      const { error } = await supabase
        .from('treino_respostas')
        .insert({
          sessao_id: rodada.sessaoId,
          prova_id: prova.id,
          n: questao.n,
          assunto: rodada.id,
          alternativa_escolhida: letra,
          alternativa_correta: questao.gabarito,
          acertou,
        })

      if (error) throw error

      setEscolhida(letra)

      setRodada((r) => ({
        ...r,
        acertos: r.acertos + (acertou ? 1 : 0),
        respondidas: r.respondidas + 1,
      }))
    } catch (error) {
      setErro('Não consegui salvar esta resposta: ' + error.message)
    } finally {
      enviando.current = false
      setSalvandoResposta(false)
    }
  }

  // Avança ou finaliza a sessão.
  async function proxima() {
    if (!escolhida || salvandoResposta || finalizando) return

    if (rodada.i + 1 < rodada.itens.length) {
      setEscolhida(null)

      setRodada((r) => ({
        ...r,
        i: r.i + 1,
      }))

      return
    }

    setFinalizando(true)
    setErro('')

    try {
      const { error } = await supabase
        .from('treino_sessoes')
        .update({
          status: 'finalizada',
          finalizado_em: new Date().toISOString(),
          total_questoes: rodada.respondidas,
          acertos: rodada.acertos,
        })
        .eq('id', rodada.sessaoId)
        .eq('status', 'em_andamento')
        .select('id')
        .single()

      if (error) throw error

      setRodada((r) => ({
        ...r,
        fim: true,
      }))

      carregar()
    } catch (error) {
      setErro('Não foi possível finalizar a sessão: ' + error.message)
    } finally {
      setFinalizando(false)
    }
  }

  // Ao sair antes de concluir, registra a sessão como interrompida.
  async function voltar() {
    if (salvandoResposta || finalizando || iniciando) return

    if (rodada && !rodada.fim) {
      const { error } = await supabase
        .from('treino_sessoes')
        .update({
          status: 'interrompida',
          finalizado_em: new Date().toISOString(),
          total_questoes: rodada.respondidas,
          acertos: rodada.acertos,
        })
        .eq('id', rodada.sessaoId)
        .eq('status', 'em_andamento')

      if (error) {
        setErro('Não foi possível interromper a sessão: ' + error.message)
        return
      }
    }

    setRodada(null)
    setEscolhida(null)
    await carregar()
  }

  // ---------- 1. Tela da rodada concluída ----------
  if (rodada && rodada.fim) {
    return (
      <div className="secao nota-box">
        <p className="dica">{ASSUNTOS[rodada.id].nome}</p>

        <div className="nota-grande">
          {rodada.acertos}/{rodada.itens.length}
        </div>

        <p>Rodada concluída.</p>

        {erro && <p className="erro">{erro}</p>}

        <div className="linha" style={{ justifyContent: 'center' }}>
          <button
            className="pequeno"
            onClick={() => iniciar(rodada.id)}
            disabled={iniciando === rodada.id}
          >
            {iniciando === rodada.id ? 'Iniciando...' : 'Treinar de novo'}
          </button>

          <button className="pequeno sair" onClick={voltar}>
            Escolher outro assunto
          </button>
        </div>
      </div>
    )
  }

  // ---------- 2. Tela da questão ----------
  if (rodada) {
    const { prova, questao } = rodada.itens[rodada.i]
    const acertou = escolhida === questao.gabarito

    return (
      <div>
        <div className="secao">
          <div
            className="linha"
            style={{
              justifyContent: 'space-between',
              marginBottom: 0,
            }}
          >
            <div>
              <strong>{ASSUNTOS[rodada.id].nome}</strong>

              <p className="dica">
                Questão {rodada.i + 1} de {rodada.itens.length} · vem da prova{' '}
                {prova.titulo.replace(' — Prova', ' ·')} (nº {questao.n})
              </p>
            </div>

            <button
              className="pequeno sair"
              onClick={voltar}
              disabled={salvandoResposta || finalizando}
            >
              Sair do treino
            </button>
          </div>
        </div>

        {erro && <p className="erro">{erro}</p>}

        <Questao
          prova={prova}
          questao={questao}
          resposta={escolhida}
          revisao={!!escolhida}
          onResponder={responder}
        />

        {salvandoResposta && (
          <p className="dica">Salvando sua resposta...</p>
        )}

        {escolhida && (
          <>
            <div className={acertou ? 'feedback ok' : 'feedback erro-fb'}>
              {acertou
                ? '✓ Acertou!'
                : `✗ Errou. A resposta certa é a ${questao.gabarito}.`}
            </div>

            <button
              className="pequeno"
              onClick={proxima}
              disabled={finalizando}
            >
              {finalizando
                ? 'Finalizando...'
                : rodada.i + 1 < rodada.itens.length
                  ? 'Próxima →'
                  : 'Ver resultado'}
            </button>
          </>
        )}
      </div>
    )
  }

  // ---------- 3. Tela de escolha do assunto ----------
  return (
    <div className="secao">
      <h2>Treino por assunto</h2>

      <p className="dica">
        Escolha um assunto e resolva até {TAMANHO_RODADA} questões reais das
        provas anteriores, com a correção na hora.
      </p>

      {erro && <p className="erro">{erro}</p>}

      {BLOCOS.map((bloco) => {
        const ids = Object.keys(ASSUNTOS).filter(
          (id) => ASSUNTOS[id].bloco === bloco && BANCO[id]
        )

        if (!ids.length) return null

        return (
          <div key={bloco}>
            <div className="bloco-titulo">{bloco}</div>

            {ids.map((id) => {
              const d = desempenho.find((x) => x.id === id)

              return (
                <div key={id} className="assunto">
                  <div className="assunto-info">
                    <div className="assunto-nome">
                      {ASSUNTOS[id].nome}
                    </div>

                    <div className="assunto-meta">
                      {BANCO[id].length} questões no banco

                      {d && (
                        <>
                          {' · aproveitamento: '}
                          <strong style={{ color: corBarra(d.pct) }}>
                            {d.pct === null ? '—' : `${d.pct}%`}
                          </strong>
                          {' · '}
                          {d.acertos} acertos
                          {' · '}
                          {d.erros} erros
                          {' · '}
                          {d.emBranco} em branco
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    className="pequeno"
                    onClick={() => iniciar(id)}
                    disabled={iniciando === id}
                  >
                    {iniciando === id ? 'Iniciando...' : 'Treinar'}
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