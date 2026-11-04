import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from './lib/supabase'
import { corrigir, formatarTempo } from './lib/correcao'
import Questao from './Questao'

export default function Prova({ prova, tentativa, onSair, onFinalizar }) {
  const [respostas, setRespostas] = useState(tentativa.respostas || {})
  const [marcadas, setMarcadas] = useState(tentativa.marcadas || [])
  const [indice, setIndice] = useState(0)
  const [erro, setErro] = useState('')

  const total = prova.duracaoMin * 60
  const fim = new Date(tentativa.iniciado_em).getTime() + total * 1000
  const calcularRestante = () => Math.min(total, Math.max(0, Math.round((fim - Date.now()) / 1000)))
  const [restante, setRestante] = useState(calcularRestante)

  const encerrando = useRef(false)
  const ultimo = useRef({ respostas, marcadas })
  ultimo.current = { respostas, marcadas }

  const finalizar = useCallback(async () => {
    if (encerrando.current) return
    encerrando.current = true
    const { respostas: r, marcadas: m } = ultimo.current
    const resultado = corrigir(prova, r)
    const agora = new Date()
    const duracao = Math.min(total, Math.round((agora - new Date(tentativa.iniciado_em)) / 1000))
    const { data, error } = await supabase
      .from('simulados')
      .update({
        status: 'finalizado',
        finalizado_em: agora.toISOString(),
        duracao_seg: duracao,
        respostas: r,
        marcadas: m,
        acertos: resultado.acertos,
        total: resultado.total,
        resultado,
      })
      .eq('id', tentativa.id)
      .select()
      .single()
    if (error) {
      encerrando.current = false
      setErro('Não foi possível salvar o resultado: ' + error.message)
      return
    }
    onFinalizar(data)
  }, [prova, tentativa, total, onFinalizar])

  // cronômetro
  useEffect(() => {
    const t = setInterval(() => {
      const s = Math.min(total, Math.max(0, Math.round((fim - Date.now()) / 1000)))
      setRestante(s)
      if (s === 0) finalizar()
    }, 1000)
    return () => clearInterval(t)
  }, [fim, total, finalizar])

  // salva o andamento (para não perder nada se a página fechar)
  const primeira = useRef(true)
  useEffect(() => {
    if (primeira.current) {
      primeira.current = false
      return
    }
    const t = setTimeout(() => {
      supabase
        .from('simulados')
        .update({ respostas, marcadas })
        .eq('id', tentativa.id)
        .then(({ error }) => {
          if (error) setErro(error.message)
        })
    }, 700)
    return () => clearTimeout(t)
  }, [respostas, marcadas, tentativa.id])

  const q = prova.questoes[indice]

  function responder(letra) {
    setRespostas((r) => {
      const novo = { ...r }
      if (novo[q.n] === letra) delete novo[q.n]
      else novo[q.n] = letra
      return novo
    })
  }

  function alternarRevisao() {
    setMarcadas((m) => (m.includes(q.n) ? m.filter((x) => x !== q.n) : [...m, q.n]))
  }

  // atalhos: A–E marcam, setas navegam
  useEffect(() => {
    function tecla(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (k.length === 1 && 'abcde'.includes(k)) responder(k.toUpperCase())
      else if (e.key === 'ArrowRight') setIndice((i) => Math.min(i + 1, prova.questoes.length - 1))
      else if (e.key === 'ArrowLeft') setIndice((i) => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  })

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [indice])

  async function sair() {
    await supabase.from('simulados').update({ respostas, marcadas }).eq('id', tentativa.id)
    onSair()
  }

  function pedirFinalizar() {
    const respondidas = Object.keys(respostas).length
    let msg = `Você respondeu ${respondidas} de ${prova.questoes.length} questões.`
    if (marcadas.length) msg += `\n${marcadas.length} questão(ões) marcada(s) para revisar.`
    const decorrido = total - restante
    msg += decorrido < 3600
      ? '\n\nNa prova de verdade só é permitido sair depois de 1 hora. Encerrar mesmo assim?'
      : '\n\nEncerrar o simulado agora?'
    if (window.confirm(msg)) finalizar()
  }

  return (
    <div>
      <div className="prova-topo">
        <strong>{prova.titulo}</strong>
        <div className={restante < 600 ? 'cronometro urgente' : 'cronometro'}>⏱ {formatarTempo(restante)}</div>
        <div className="topo-botoes">
          <button className="pequeno sair" onClick={sair} title="O tempo continua correndo">
            Sair (o tempo continua)
          </button>
          <button className="pequeno finalizar" onClick={pedirFinalizar}>
            Finalizar
          </button>
        </div>
      </div>
      {erro && <p className="erro">{erro}</p>}

      <div className="prova-corpo">
        <div>
          <Questao prova={prova} questao={q} resposta={respostas[q.n]} onResponder={responder} />
          <div className="nav-prova">
            <button className="pequeno nav" disabled={indice === 0} onClick={() => setIndice(indice - 1)}>
              ← Anterior
            </button>
            <button
              className={marcadas.includes(q.n) ? 'pequeno nav revisar ativo' : 'pequeno nav revisar'}
              onClick={alternarRevisao}
            >
              {marcadas.includes(q.n) ? '🚩 Marcada para revisar' : '🚩 Marcar para revisar'}
            </button>
            <button
              className="pequeno nav"
              disabled={indice === prova.questoes.length - 1}
              onClick={() => setIndice(indice + 1)}
            >
              Próxima →
            </button>
          </div>
          <p className="dica">Dica: use as teclas A–E para marcar e as setas ← → para trocar de questão.</p>
        </div>

        <aside className="paleta-box">
          {prova.blocos.map((b) => (
            <div key={b.nome}>
              <div className="paleta-bloco" style={{ color: b.cor }}>
                {b.nome}
              </div>
              <div className="paleta-grid">
                {prova.questoes
                  .filter((x) => x.n >= b.de && x.n <= b.ate)
                  .map((x) => {
                    let classe = 'num'
                    if (respostas[x.n]) classe += ' resp'
                    if (marcadas.includes(x.n)) classe += ' rev'
                    if (x.n === q.n) classe += ' atual'
                    return (
                      <button key={x.n} type="button" className={classe} onClick={() => setIndice(x.n - 1)}>
                        {x.n}
                      </button>
                    )
                  })}
              </div>
            </div>
          ))}
          <p className="legenda">
            Azul: respondida · Borda laranja: marcada para revisar · Contorno: questão atual
          </p>
          <p className="legenda">
            Respondidas: {Object.keys(respostas).length}/{prova.questoes.length}
          </p>
        </aside>
      </div>
    </div>
  )
}
