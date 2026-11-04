import Texto, { Inline } from './Texto'

export default function Questao({ prova, questao, resposta, onResponder, revisao }) {
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
