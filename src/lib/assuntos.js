
import { ASSUNTOS, assuntoDe } from '../data/assuntos'

// Junta acertos e erros por assunto e calcula a evolução entre períodos.
export function porAssunto(tentativas = [], treinos = [], agora = new Date()) {
  const acc = {}

  const criarRegistro = (id) => {
    if (!ASSUNTOS[id]) return null

    if (!acc[id]) {
      acc[id] = {
        id,
        acertos: 0,
        erros: 0,
        emBranco: 0,
        total: 0,
        recente: { acertos: 0, erros: 0, total: 0 },
        anterior: { acertos: 0, erros: 0, total: 0 },
      }
    }

    return acc[id]
  }

  const somar = (id, acertou, emBranco, data) => {
    const registro = criarRegistro(id)
    if (!registro) return

    if (emBranco) {
      registro.emBranco++
      return
    }

    const periodo = Date.parse(data)
    const agoraMs = agora.getTime()
    const trintaDias = 30 * 24 * 60 * 60 * 1000

    registro.total++

    if (acertou) {
      registro.acertos++
    } else {
      registro.erros++
    }

    let destino = null

    if (
      Number.isFinite(periodo) &&
      periodo >= agoraMs - trintaDias &&
      periodo <= agoraMs
    ) {
      destino = registro.recente
    } else if (
      Number.isFinite(periodo) &&
      periodo >= agoraMs - 2 * trintaDias &&
      periodo < agoraMs - trintaDias
    ) {
      destino = registro.anterior
    }

    if (destino) {
      destino.total++

      if (acertou) {
        destino.acertos++
      } else {
        destino.erros++
      }
    }
  }

  // Resultados dos simulados finalizados.
  for (const tentativa of tentativas) {
    if (tentativa.status !== 'finalizado' || !tentativa.resultado) continue

    for (const detalhe of tentativa.resultado.detalhes || []) {
      if (detalhe.anulada) continue

      const emBranco =
        detalhe.marcada == null ||
        detalhe.marcada === '' ||
        detalhe.marcada === false

      somar(
        assuntoDe(tentativa.prova_id, detalhe.n),
        detalhe.acertou,
        emBranco,
        tentativa.finalizado_em
      )
    }
  }

  // Respostas dos treinamentos.
  for (const resposta of treinos) {
    somar(
      resposta.assunto,
      resposta.acertou,
      false,
      resposta.criado_em
    )
  }

  return Object.values(acc)
    .map((a) => {
      const pct = a.total
        ? Math.round((100 * a.acertos) / a.total)
        : null

      const pctRecente = a.recente.total
        ? Math.round((100 * a.recente.acertos) / a.recente.total)
        : null

      const pctAnterior = a.anterior.total
        ? Math.round((100 * a.anterior.acertos) / a.anterior.total)
        : null

      let tendencia = 'dados_insuficientes'
      let variacao = null

      if (a.recente.total >= 5 && a.anterior.total >= 5) {
        variacao = pctRecente - pctAnterior

        if (variacao >= 5) {
          tendencia = 'melhora'
        } else if (variacao <= -5) {
          tendencia = 'queda'
        } else {
          tendencia = 'estavel'
        }
      }

      let confianca = 'insuficiente'

      if (a.total >= 20) {
        confianca = 'alta'
      } else if (a.total >= 10) {
        confianca = 'media'
      } else if (a.total >= 5) {
        confianca = 'baixa'
      }

      let prioridade = 'sem_dados'

      if (pct !== null) {
        if (a.total < 5) {
          prioridade = 'coletar_dados'
        } else if (pct < 50) {
          prioridade = 'alta'
        } else if (pct < 70) {
          prioridade = 'media'
        } else {
          prioridade = 'baixa'
        }
      }

      return {
        ...a,
        nome: ASSUNTOS[a.id].nome,
        bloco: ASSUNTOS[a.id].bloco,
        pct,
        confianca,
        prioridade,
        evolucao: {
          recente: {
            total: a.recente.total,
            acertos: a.recente.acertos,
            erros: a.recente.erros,
            pct: pctRecente,
          },
          anterior: {
            total: a.anterior.total,
            acertos: a.anterior.acertos,
            erros: a.anterior.erros,
            pct: pctAnterior,
          },
          variacao,
          tendencia,
        },
      }
    })
    .sort((a, b) => {
      if (a.pct === null) return 1
      if (b.pct === null) return -1
      return a.pct - b.pct || b.total - a.total
    })
}

export function corBarra(pct) {
  if (pct === null) return '#999'
  return pct < 50 ? '#b91c1c' : pct < 70 ? '#b45309' : '#15803d'
}