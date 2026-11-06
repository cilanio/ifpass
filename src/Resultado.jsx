import { useState } from 'react'
import { formatarTempo } from './lib/correcao'
import Questao from './Questao'
import Assuntos from './Assuntos'
import { porAssunto } from './lib/assuntos'

export default function Resultado({ prova, tentativa, onVoltar, onTreinar }) {
  const r = tentativa.resultado
  const [filtro, setFiltro] = useState('erros')
  const [aberta, setAberta] = useState(null)
  const pct = Math.round((r.acertos / r.total) * 100)
  const assuntos = porAssunto([tentativa])

  const lista = r.detalhes.filter((d) => {
    if (filtro === 'erros') return !d.acertou && d.marcada
    if (filtro === 'brancos') return !d.marcada && !d.anulada
    return true
  })

  return (
    <div>
      <button className="pequeno sair" onClick={onVoltar}>
        ← Voltar aos simulados
      </button>

      <div className="secao nota-box">
        <p className="dica">{prova.titulo}</p>
        <div className="nota-grande">
          {r.acertos}/{r.total}
        </div>
        <p>
          <strong>{pct}% de acertos</strong> · tempo usado: {formatarTempo(tentativa.duracao_seg || 0)} de{' '}
          {formatarTempo(prova.duracaoMin * 60)}
        </p>
      </div>

      <div className="blocos-res">
        {r.porBloco.map((b) => (
          <div key={b.nome} className="bloco-res" style={{ background: b.cor }}>
            <div>{b.nome}</div>
            <strong>
              {b.acertos}/{b.total}
            </strong>
            <div>
              {Math.round((b.acertos / b.total) * 100)}% · {b.brancos} em branco
            </div>
          </div>
        ))}
      </div>

      <div className="secao">
        <h2>Desempenho por assunto</h2>
        <p className="dica">Do menor para o maior aproveitamento neste simulado. Os de cima são os melhores para estudar primeiro.</p>
        <Assuntos dados={assuntos} onTreinar={onTreinar} />
      </div>

      <div className="secao">
        <h2>Revisar questões</h2>
        <div className="linha">
          {[
            ['erros', 'Só as erradas'],
            ['brancos', 'Em branco'],
            ['todas', 'Todas'],
          ].map(([id, nome]) => (
            <button
              key={id}
              className={filtro === id ? 'pequeno aba ativa' : 'pequeno aba'}
              onClick={() => setFiltro(id)}
            >
              {nome}
            </button>
          ))}
        </div>
        {lista.length === 0 && <p className="dica">Nenhuma questão neste filtro. 🎉</p>}
        {lista.map((d) => (
          <div key={d.n}>
            <button
              type="button"
              className={d.acertou ? 'item-res ok' : 'item-res erro-item'}
              onClick={() => setAberta(aberta === d.n ? null : d.n)}
            >
              <span>Questão {d.n}</span>
              <span>
                Sua resposta: {d.marcada || '—'} · Gabarito: {d.anulada ? 'anulada' : d.gabarito}{' '}
                {d.acertou ? '✓' : '✗'}
              </span>
            </button>
            {aberta === d.n && (
              <Questao prova={prova} questao={prova.questoes[d.n - 1]} resposta={d.marcada} revisao />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
