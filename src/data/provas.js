
import ifal2026 from './ifal-2026-t1.json'
import ifal2025 from './ifal-2025-t1.json'
import ifal2024 from './ifal-2024-t3.json'

import { CLASSIFICACAO, ASSUNTOS } from './assuntos'

export const PROVAS = [ifal2026, ifal2025, ifal2024]

// Valida automaticamente a classificação de todas as provas.
function validarClassificacoes() {
  const erros = []
  const idsProvas = new Set(PROVAS.map((prova) => prova.id))

  for (const prova of PROVAS) {
    const classificacao = CLASSIFICACAO[prova.id]

    if (!classificacao) {
      erros.push(`${prova.id}: classificação não encontrada.`)
      continue
    }

    if (classificacao.length !== prova.questoes.length) {
      erros.push(
        `${prova.id}: existem ${classificacao.length} classificações para ${prova.questoes.length} questões.`
      )
    }

    prova.questoes.forEach((questao, indice) => {
      const numeroEsperado = indice + 1
      const assuntoId = classificacao[indice]

      if (questao.n !== numeroEsperado) {
        erros.push(
          `${prova.id}: posição ${numeroEsperado} contém questão ${questao.n}.`
        )
      }

      if (!assuntoId) {
        erros.push(
          `${prova.id}: questão ${numeroEsperado} sem classificação.`
        )
        return
      }

      const assunto = ASSUNTOS[assuntoId]

      if (!assunto) {
        erros.push(
          `${prova.id}: questão ${numeroEsperado} utiliza assunto inexistente: ${assuntoId}.`
        )
        return
      }

      if (assunto.bloco !== questao.bloco) {
        erros.push(
          `${prova.id}: questão ${numeroEsperado} pertence a ${questao.bloco}, mas foi classificada em ${assunto.bloco}.`
        )
      }
    })
  }

  for (const provaId of Object.keys(CLASSIFICACAO)) {
    if (!idsProvas.has(provaId)) {
      erros.push(
        `${provaId}: existe classificação, mas a prova não está cadastrada em provas.js.`
      )
    }
  }

  if (erros.length > 0) {
    throw new Error(
      'Erros na classificação das provas:\n' + erros.join('\n')
    )
  }
}

validarClassificacoes()
