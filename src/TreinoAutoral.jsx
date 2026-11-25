import { useEffect, useRef, useState } from 'react'
import Questao from './Questao'
import { ASSUNTOS } from './data/assuntos'
import { adaptarQuestaoAutoral } from './lib/questoes'
import { supabase } from './lib/supabase'

const etapas = {
  fundamentos: 'Fundamentos',
  compreensao: 'Compreensão',
  aplicacao: 'Aplicação',
  analise: 'Análise',
  desafio_copeve: 'Desafio no padrão COPEVE',
}

async function rpc(nome, argumentos) {
  const { data, error } = await supabase.rpc(nome, argumentos)
  if (error) throw error
  return data
}

function QuestaoDaRodada({ item, ocupado, responder }) {
  const [imagem, setImagem] = useState(null)
  const [erroImagem, setErroImagem] = useState(false)
  const [tentativa, setTentativa] = useState(0)
  const { item_id: id, questao, resposta } = item

  useEffect(() => {
    if (!questao.tem_imagem) return
    let ativo = true
    let renovacao
    async function renovar() {
      try {
        const { data, error } = await supabase.functions.invoke('imagem-treino', { body: { item_id: id } })
        if (error || !data?.url) throw new Error('Imagem indisponível')
        if (!ativo) return
        setImagem(new URL(data.url, supabase.supabaseUrl).href)
        setErroImagem(false)
        renovacao = setTimeout(renovar, 270_000)
      } catch {
        if (!ativo) return
        setImagem(null)
        setErroImagem(true)
      }
    }
    renovar()
    return () => {
      ativo = false
      clearTimeout(renovacao)
    }
  }, [id, questao.tem_imagem, tentativa])

  return (
    <>
      {erroImagem && <p role="alert">Não foi possível carregar a imagem.</p>}
      {erroImagem && <button onClick={() => setTentativa(n => n + 1)}>Tentar carregar imagem</button>}
      <Questao
        modelo={adaptarQuestaoAutoral({ ...questao, imagem, resposta_correta: resposta?.gabarito })}
        resposta={resposta?.alternativa}
        revisao={Boolean(resposta)}
        bloqueada={ocupado || (questao.tem_imagem && !imagem)}
        onResponder={responder}
      />
      {resposta?.explicacao?.correta && <p>{resposta.explicacao.correta}</p>}
      {Object.entries(resposta?.explicacao?.distratores ?? {}).map(([letra, explicacao]) => (
        <p key={letra}>{letra}. {explicacao}</p>
      ))}
    </>
  )
}

export default function TreinoAutoral({ assuntoInicial }) {
  const [assunto, setAssunto] = useState(assuntoInicial ?? '')
  const [etapa, setEtapa] = useState('fundamentos')
  const [rodada, setRodada] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')
  const [tentativa, setTentativa] = useState(0)
  const enviando = useRef(false)

  useEffect(() => {
    let ativo = true
    rpc('ifpass_treino_retomar').then(data => {
      if (ativo) setRodada(data)
    }).catch(() => {
      if (ativo) setErro('Não foi possível verificar se há treino em andamento.')
    }).finally(() => {
      if (ativo) setCarregando(false)
    })
    return () => { ativo = false }
  }, [tentativa])

  async function executar(operacao) {
    if (enviando.current) return
    enviando.current = true
    setOcupado(true)
    setErro('')
    try {
      setRodada(await operacao())
    } catch {
      setErro('Não foi possível concluir a operação. Tente novamente.')
    } finally {
      enviando.current = false
      setOcupado(false)
    }
  }

  if (carregando) return <p role="status">Carregando treino...</p>
  const { sessao, itens, status } = rodada ?? {}
  const item = itens?.find(i => i.ordem === sessao.posicao)
  const args = { p_sessao: sessao?.id }
  return (
    <section className="secao">
      <h2>Treino autoral</h2>
      {erro && <p role="alert">{erro}</p>}
      {erro && sessao && <button disabled={ocupado} onClick={() =>
        executar(() => rpc('ifpass_treino_retomar', args))
      }>Atualizar rodada</button>}
      {status === 'questoes_insuficientes' && (
        <p role="status">Questões autorais insuficientes para esta seleção. Disponíveis: {rodada.disponiveis}. Mínimo: {rodada.minimo}.</p>
      )}
      {status === 'treino_indisponivel' && <p role="status">Esta modalidade ainda está indisponível.</p>}
      {!sessao && (
        <form onSubmit={evento => {
          evento.preventDefault()
          executar(() => rpc('ifpass_treino_iniciar', { p_assunto: assunto, p_etapa: etapa }))
        }}>
          <label>Assunto <select required value={assunto} onChange={evento => setAssunto(evento.target.value)}>
            <option value="">Selecione</option>
            {Object.entries(ASSUNTOS).map(([id, dados]) => <option key={id} value={id}>{dados.nome}</option>)}
          </select></label>
          <label>Modalidade <select value={etapa} onChange={evento => setEtapa(evento.target.value)}>
            {Object.entries(etapas).map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
          </select></label>
          <button disabled={ocupado}>Iniciar treino</button>
          {erro && <button type="button" onClick={() => {
            setCarregando(true)
            setErro('')
            setTentativa(n => n + 1)
          }}>Buscar sessão novamente</button>}
        </form>
      )}
      {sessao?.status === 'em_andamento' && item && (
        <>
          <p>Item {item.ordem} de {itens.length}</p>
          {item.status === 'item_anulado' ? (
            <p role="status">Questão retirada por erro. Ela fica fora da pontuação.</p>
          ) : (
            <QuestaoDaRodada key={item.item_id} item={item} ocupado={ocupado} responder={letra =>
              executar(async () => {
                await rpc('ifpass_responder_autoral', { p_item: item.item_id, p_alternativa: letra })
                return rpc('ifpass_treino_retomar', args)
              })
            } />
          )}
          {item.status !== 'pendente' && <button disabled={ocupado} onClick={() => executar(async () => {
            const nova = await rpc('ifpass_treino_avancar', { ...args, p_posicao: item.ordem })
            return nova.sessao.posicao === item.ordem ? rpc('ifpass_treino_finalizar', args) : nova
          })}>{item.ordem === itens.length ? 'Concluir ou ver substituição' : 'Próxima questão'}</button>}
          <button disabled={ocupado} onClick={() =>
            executar(() => rpc('ifpass_treino_finalizar', { ...args, p_interromper: true }))
          }>Encerrar treino</button>
        </>
      )}
      {sessao && sessao.status !== 'em_andamento' && (
        <>
          <p role="status">{sessao.acertos} acertos em {sessao.total_questoes} questões válidas.</p>
          <button onClick={() => setRodada(null)}>Nova rodada</button>
        </>
      )}
    </section>
  )
}
