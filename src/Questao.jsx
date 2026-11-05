import Texto, { Inline } from './Texto'
import { TODAS_LETRAS } from './data/letras-todas'

// Junta o que foi colado em src/data/letras.js com a questão original
function completar(prova, q) {
  const c = TODAS_LETRAS[prova.id] && TODAS_LETRAS[prova.id][q.n]
  if (!c) return q
  let enunciado = q.enunciado
  ;(c.trechos || []).forEach((t) => {
    if (t && t.trim()) enunciado = enunciado.replace('[trecho da letra]', t.trim())
  })
  const texto = c.texto && c.texto.trim() ? c.texto.trim() : q.texto
  return { ...q, texto, enunciado }
}

export default function Questao({ prova, questao: questaoOriginal, resposta, onResponder, revisao }) {
  const questao = completar(prova, questaoOriginal)
  const bloco = prova.blocos.find((b) => questao.n >= b.de && questao.n <= b.ate)
  const anulada = questao.gabarito === 'NULA'

  return (
    <div className="questao">
      <div className="questao-topo" style={{ background: bloco.cor }}>
        Questão {questao.n} · {bloco.nome}
      </div>
      <div className="questao-corpo">
        {questao.tituloTexto && <h3 className="texto-titulo">{questao.tituloTexto}</h3>}
        {questao.texto && (
          <div className="texto-apoio">
            <Texto>{questao.texto}</Texto>
          </div>
        )}
        {questao.imagem && (
          <img
            className="questao-img"
            src={`/provas/${prova.id}/${questao.imagem}`}
            alt={`Figura da questão ${questao.n}`}
          />
        )}
        <div className="enunciado">
          <Texto>{questao.enunciado}</Texto>
        </div>
        <div className="alternativas">
          {Object.entries(questao.alternativas).map(([letra, texto]) => {
            let classe = 'alt'
            if (revisao) {
              if (letra === questao.gabarito) classe += ' certa'
              else if (letra === resposta) classe += ' errada'
            } else if (letra === resposta) {
              classe += ' marcada'
            }
            return (
              <button
                key={letra}
                type="button"
                className={classe}
                disabled={revisao}
                onClick={() => onResponder && onResponder(letra)}
              >
                <span className="alt-letra">{letra}</span>
                <span className="alt-texto">
                  <Inline>{texto}</Inline>
                </span>
              </button>
            )
          })}
        </div>
        {revisao && anulada && <p className="dica">Questão anulada pela banca: vale ponto para todos.</p>}
      </div>
    </div>
  )
}
