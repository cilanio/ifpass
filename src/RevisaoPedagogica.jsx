import { useEffect, useRef, useState } from 'react'
import Questao from './Questao'
import Texto from './Texto'
import { ASSUNTOS } from './data/assuntos'
import { adaptarQuestaoAutoral } from './lib/questoes'
import { supabase } from './lib/supabase'
import './revisao.css'

const TAMANHO_PAGINA = 20
const CHECKLIST_VERSAO = 1
const SITUACOES = {
  em_revisao: 'Pendente',
  rascunho: 'Rascunho',
  aprovada: 'Aprovada',
  rejeitada: 'Rejeitada',
  retirada: 'Retirada',
}
const DECISOES = {
  aprovada: 'Aprovar',
  correcao_solicitada: 'Solicitar correção',
  rejeitada: 'Rejeitar',
}
const DECISOES_REGISTRADAS = {
  aprovada: 'Aprovada',
  correcao_solicitada: 'Correção solicitada',
  rejeitada: 'Rejeitada',
}
const ELIMINATORIOS = {
  gabarito_incorreto: 'Gabarito incorreto',
  alternativa_correta_nao_unica: 'Mais de uma alternativa correta ou nenhuma correta',
  erro_conceitual_ou_matematico: 'Erro conceitual ou matemático',
  ambiguidade: 'Ambiguidade que compromete a resolução',
  informacoes_insuficientes: 'Informações insuficientes',
  fora_do_edital_sem_justificativa: 'Conteúdo fora do edital sem justificativa pedagógica',
  explicacao_incompativel: 'Explicação incompatível com a resposta',
  reproducao_indevida: 'Reprodução indevida de conteúdo de terceiros',
}
const QUALITATIVOS = {
  fidelidade_edital: 'Fidelidade ao edital',
  correcao_cientifica_matematica_linguistica: 'Correção científica, matemática ou linguística',
  clareza_precisao: 'Clareza e precisão',
  qualidade_alternativas: 'Qualidade das alternativas',
  adequacao_dificuldade: 'Adequação da dificuldade',
  compatibilidade_copeve: 'Compatibilidade com características observáveis da COPEVE',
  qualidade_explicacao: 'Qualidade da explicação',
}
const CAMPOS_QUESTAO = [
  'id', 'versao', 'disciplina', 'assunto_id', 'topico_id', 'etapa', 'habilidade_principal',
  'habilidades_secundarias', 'dificuldade', 'titulo_texto', 'texto', 'enunciado', 'imagem',
  'alternativas', 'resposta_correta', 'explicacao', 'status',
].join(',')

function erroPermissao(erro) {
  return ['42501', 'PGRST301', 'PGRST303'].includes(erro?.code)
    || erro?.status === 401 || erro?.status === 403
}

function Fila({ filtros, pagina, onSelecionar, onPaginar }) {
  const [resultado, setResultado] = useState(null)
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    let atual = true
    async function carregarFila() {
      try {
        let consulta = supabase.from('questoes_ia')
          .select('id,versao,disciplina,assunto_id,status,enunciado', { count: 'exact' })
        if (filtros.disciplina) consulta = consulta.eq('disciplina', filtros.disciplina)
        if (filtros.assunto) consulta = consulta.eq('assunto_id', filtros.assunto)
        if (filtros.situacao) consulta = consulta.eq('status', filtros.situacao)
        const inicio = pagina * TAMANHO_PAGINA
        const { data, count, error } = await consulta.order('criado_em', { ascending: false })
          .order('id').order('versao').range(inicio, inicio + TAMANHO_PAGINA - 1)
        if (error) throw error
        if (atual) setResultado({ itens: data, total: count })
      } catch (erro) {
        if (atual) setResultado({ erro })
      }
    }
    carregarFila()
    return () => { atual = false }
  }, [filtros, pagina, tentativa])

  if (!resultado) return <p role="status">Carregando fila...</p>
  if (resultado.erro) {
    return (
      <>
        <p role="alert">{erroPermissao(resultado.erro) ? 'Sem permissão para consultar a fila.' : 'Não foi possível carregar a fila.'}</p>
        <button className="pequeno" onClick={() => {
          setResultado(null)
          setTentativa(n => n + 1)
        }}>Tentar novamente</button>
      </>
    )
  }

  return (
    <>
      {resultado.itens.length === 0 && <p>Nenhuma questão encontrada.</p>}
      <ul className="revisao-fila">
        {resultado.itens.map(item => (
          <li key={`${item.id}:${item.versao}`}>
            <button className="pequeno" onClick={() => onSelecionar(item)}>Revisar versão {item.versao}</button>
            <div>
              <p className="revisao-enunciado">{item.enunciado}</p>
              <p className="dica">{item.disciplina} · {ASSUNTOS[item.assunto_id]?.nome ?? item.assunto_id} · {SITUACOES[item.status] ?? item.status}</p>
            </div>
          </li>
        ))}
      </ul>
      {(pagina > 0 || resultado.total > TAMANHO_PAGINA) && (
        <nav className="linha" aria-label="Páginas da fila">
          <button className="pequeno" disabled={pagina === 0} onClick={() => onPaginar(pagina - 1)}>Anterior</button>
          <span>Página {pagina + 1}</span>
          <button className="pequeno" disabled={(pagina + 1) * TAMANHO_PAGINA >= resultado.total}
            onClick={() => onPaginar(pagina + 1)}>Próxima</button>
        </nav>
      )}
    </>
  )
}

function Criterios({ titulo, campos, valores, onAlterar, eliminatorio }) {
  return (
    <fieldset>
      <legend>{titulo}</legend>
      {Object.entries(campos).map(([id, rotulo]) => (
        <label key={id}>
          {rotulo}
          <select required value={valores[id] ?? ''} onChange={e => onAlterar(id, e.target.value)}>
            <option value="">Selecione</option>
            <option value="true">{eliminatorio ? 'Presente' : 'Adequado'}</option>
            <option value="false">{eliminatorio ? 'Ausente' : 'Precisa de ajuste'}</option>
          </select>
        </label>
      ))}
    </fieldset>
  )
}

function Historico({ revisoes }) {
  return (
    <section className="secao">
      <h2>Histórico de revisões</h2>
      {revisoes.length === 0 && <p>Nenhuma revisão registrada.</p>}
      {revisoes.map(revisao => (
        <details key={revisao.id}>
          <summary>{DECISOES_REGISTRADAS[revisao.decisao] ?? revisao.decisao} · Versão {revisao.questao_versao} · {new Date(revisao.criado_em).toLocaleString('pt-BR')}</summary>
          <p>Revisor {revisao.revisor_id} · Checklist v{revisao.checklist_versao}</p>
          {revisao.observacoes && <p>{revisao.observacoes}</p>}
          <ul>
            {Object.entries(revisao.criterios ?? {}).map(([id, valor]) => (
              <li key={id}>
                {ELIMINATORIOS[id] ?? QUALITATIVOS[id] ?? id} — {
                  ELIMINATORIOS[id] ? (valor ? 'Presente' : 'Ausente') : (valor ? 'Adequado' : 'Precisa de ajuste')
                }
              </li>
            ))}
          </ul>
        </details>
      ))}
    </section>
  )
}

function Detalhe({ selecionada, papel, onVoltar }) {
  const [resultado, setResultado] = useState(null)
  const [atualizacao, setAtualizacao] = useState(0)
  const [valores, setValores] = useState({})
  const [observacoes, setObservacoes] = useState('')
  const [mensagem, setMensagem] = useState(null)
  const enviando = useRef(false)
  const [salvando, setSalvando] = useState(false)
  const { id, versao } = selecionada

  useEffect(() => {
    let atual = true
    async function carregarDetalhe() {
      try {
        const [questao, revisoes] = await Promise.all([
          supabase.from('questoes_ia').select(CAMPOS_QUESTAO)
            .eq('id', id).eq('versao', versao).maybeSingle(),
          supabase.from('revisoes_questoes')
            .select('id,questao_versao,revisor_id,checklist_versao,criterios,observacoes,decisao,criado_em')
            .eq('questao_id', id).order('criado_em', { ascending: false }),
        ])
        if (questao.error || revisoes.error) throw questao.error ?? revisoes.error
        if (atual) setResultado({ questao: questao.data, revisoes: revisoes.data })
      } catch (erro) {
        if (atual) setResultado({ erro })
      }
    }
    carregarDetalhe()
    return () => { atual = false }
  }, [id, versao, atualizacao])

  function recarregar() {
    setResultado(null)
    setAtualizacao(n => n + 1)
  }

  async function decidir(e) {
    e.preventDefault()
    const decisao = e.nativeEvent.submitter?.value
    const chaves = [...Object.keys(ELIMINATORIOS), ...Object.keys(QUALITATIVOS)]
    if (!Object.hasOwn(DECISOES, decisao) || enviando.current || chaves.some(chave => !valores[chave])) return

    enviando.current = true
    setSalvando(true)
    setMensagem(null)
    try {
      const { error } = await supabase.rpc('ifpass_revisar_questao', {
        p_id: id, p_versao: versao, p_decisao: decisao, p_checklist_versao: CHECKLIST_VERSAO,
        p_criterios: Object.fromEntries(chaves.map(chave => [chave, valores[chave] === 'true'])),
        p_observacoes: observacoes.trim(),
      })
      if (error) throw error
      setMensagem({ texto: 'Decisão registrada.' })
      recarregar()
    } catch (erro) {
      const conflito = erro?.code === '23514'
        && ['Versão fora da fila de revisão', 'Já existe uma versão aprovada mais recente'].includes(erro.message)
      if (conflito || erroPermissao(erro)) {
        setMensagem({ erro: true, texto: conflito
          ? 'A situação da questão mudou. A versão foi atualizada para consulta.'
          : 'Sua conta não tem permissão para registrar esta decisão.' })
        recarregar()
      } else {
        setMensagem({ erro: true, texto: erro?.code === '23514'
          ? erro.message : 'Não foi possível registrar a decisão. Consulte o histórico antes de tentar novamente.' })
      }
    } finally {
      enviando.current = false
      setSalvando(false)
    }
  }

  const questao = resultado?.questao
  const modelo = questao && adaptarQuestaoAutoral({ ...questao, imagem: null })
  const podeDecidir = papel === 'revisor_pedagogico' && questao?.status === 'em_revisao'

  return (
    <>
      <button className="pequeno sair" onClick={onVoltar} disabled={salvando}>Voltar à fila</button>
      {mensagem && <p role={mensagem.erro ? 'alert' : 'status'}>{mensagem.texto}</p>}
      {!resultado && <p role="status">Carregando questão e histórico...</p>}
      {resultado?.erro && (
        <>
          <p role="alert">{erroPermissao(resultado.erro) ? 'Sem permissão para consultar esta questão.' : 'Não foi possível carregar a questão ou o histórico.'}</p>
          <button className="pequeno" onClick={recarregar}>Tentar novamente</button>
        </>
      )}
      {resultado && !questao && !resultado.erro && <p role="alert">Versão indisponível para esta conta.</p>}
      {modelo && (
        <>
          <section className="secao">
            <h2>Versão {versao} · {SITUACOES[questao.status] ?? questao.status}</h2>
            <p>{ASSUNTOS[questao.assunto_id]?.nome ?? questao.assunto_id}</p>
            <Questao modelo={modelo} revisao />
            {questao.imagem && <p className="dica">A visualização da imagem privada está pendente.</p>}
            <h3>Gabarito {modelo.gabarito}</h3>
            <h4>Explicação da resposta correta</h4>
            <Texto>{modelo.explicacao?.correta ?? 'Explicação não informada.'}</Texto>
            <h4>Justificativas dos distratores</h4>
            <dl>
              {Object.keys(modelo.alternativas).filter(letra => letra !== modelo.gabarito).map(letra => (
                <div key={letra}><dt>Alternativa {letra}</dt>
                  <dd><Texto>{modelo.explicacao?.distratores?.[letra] ?? 'Justificativa não informada.'}</Texto></dd>
                </div>
              ))}
            </dl>
          </section>
          {podeDecidir && (
            <form className="secao" onSubmit={decidir}>
              <h2>Checklist v{CHECKLIST_VERSAO}</h2>
              <fieldset disabled={salvando} className="revisao-formulario">
                <Criterios titulo="Critérios eliminatórios" campos={ELIMINATORIOS} valores={valores}
                  onAlterar={(id, valor) => setValores(v => ({ ...v, [id]: valor }))} eliminatorio />
                <Criterios titulo="Critérios qualitativos" campos={QUALITATIVOS} valores={valores}
                  onAlterar={(id, valor) => setValores(v => ({ ...v, [id]: valor }))} />
                <label>Observações<textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} /></label>
                <div className="linha">
                  {Object.entries(DECISOES).map(([id, rotulo]) => (
                    <button key={id} type="submit" className="pequeno" value={id}>{rotulo}</button>
                  ))}
                </div>
              </fieldset>
              {salvando && <p role="status">Registrando decisão...</p>}
            </form>
          )}
          {papel === 'administrador' && <p className="dica">A decisão pedagógica cabe ao revisor autorizado na disciplina.</p>}
          <Historico revisoes={resultado.revisoes} />
        </>
      )}
    </>
  )
}

export default function RevisaoPedagogica({ papel }) {
  const [filtros, setFiltros] = useState({ disciplina: '', assunto: '', situacao: 'em_revisao' })
  const [pagina, setPagina] = useState(0)
  const [selecionada, setSelecionada] = useState(null)

  function filtrar(e) {
    e.preventDefault()
    const dados = new FormData(e.currentTarget)
    setPagina(0)
    setFiltros({
      disciplina: dados.get('disciplina').trim(),
      assunto: dados.get('assunto').trim(),
      situacao: dados.get('situacao'),
    })
  }

  return (
    <main className="painel largo revisao-pedagogica">
      <header className="topo">
        <div>
          <h1>Revisão pedagógica</h1>
          <p className="dica">{papel === 'administrador' ? 'Administrador' : 'Revisor pedagógico'}</p>
        </div>
        <button className="pequeno sair" onClick={() => supabase.auth.signOut()}>Sair</button>
      </header>
      {selecionada ? (
        <Detalhe selecionada={selecionada} papel={papel} onVoltar={() => setSelecionada(null)} />
      ) : (
        <section className="secao">
          <h2>Fila de questões</h2>
          <form className="linha revisao-filtros" onSubmit={filtrar}>
            <label>Disciplina<input name="disciplina" defaultValue={filtros.disciplina} /></label>
            <label>Assunto (ID)<input name="assunto" list="revisao-assuntos" defaultValue={filtros.assunto} /></label>
            <datalist id="revisao-assuntos">
              {Object.entries(ASSUNTOS).map(([id, assunto]) => <option key={id} value={id} label={assunto.nome} />)}
            </datalist>
            <label>Situação<select name="situacao" defaultValue={filtros.situacao}>
              <option value="">Todas</option>
              {Object.entries(SITUACOES).map(([id, rotulo]) => <option key={id} value={id}>{rotulo}</option>)}
            </select></label>
            <button type="submit" className="pequeno">Filtrar</button>
          </form>
          <Fila key={JSON.stringify([filtros, pagina])} filtros={filtros} pagina={pagina} onPaginar={setPagina}
            onSelecionar={setSelecionada} />
        </section>
      )}
    </main>
  )
}
