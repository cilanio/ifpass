import Texto, { Inline } from './Texto'
import { adaptarQuestaoOficial } from './lib/questoes'

export default function Questao({ prova, questao: questaoOriginal, modelo, resposta, onResponder, revisao, bloqueada = false }) {
  const questao = modelo ?? adaptarQuestaoOficial(prova, questaoOriginal)
  const oficial = questao.origem === 'oficial'

  return (
    <div className="questao">
      <div className="questao-topo" style={{ background: questao.cor }}>
        {oficial ? `Questão ${questao.n}` : 'Questão autoral'} · {questao.disciplina}
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
            src={questao.imagem}
            alt={oficial ? `Figura da questão ${questao.n}` : 'Figura da questão autoral'}
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
                disabled={revisao || bloqueada}
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
        {revisao && questao.gabarito === 'NULA' && <p className="dica">Questão anulada pela banca: vale ponto para todos.</p>}
      </div>
    </div>
  )
}
