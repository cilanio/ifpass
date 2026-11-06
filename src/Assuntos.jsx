import { corBarra } from './lib/assuntos'

// Lista de assuntos com barra de acertos. "dados" vem de porAssunto().
export default function Assuntos({ dados, onTreinar }) {
  return (
    <div>
      {dados.map((a) => (
        <div key={a.id} className="assunto">
          <div className="assunto-info">
            <div className="assunto-nome">{a.nome}</div>
            <div className="assunto-meta">
              {a.bloco} · {a.acertos}/{a.total} {a.total === 1 ? 'questão' : 'questões'}
            </div>
            <div className="assunto-barra">
              <div style={{ width: `${a.pct}%`, background: corBarra(a.pct) }} />
            </div>
          </div>
          <div className="assunto-pct" style={{ color: corBarra(a.pct) }}>
            {a.pct}%
          </div>
          {onTreinar && (
            <button className="pequeno" onClick={() => onTreinar(a.id)}>
              Treinar
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
