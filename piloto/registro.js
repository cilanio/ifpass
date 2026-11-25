import { validarSaida } from './validacao.js'

// A lista explícita de campos evita repassar dados internos do gerador.
export function entradaResolucaoIndependente(saida) {
  const [estrutura] = validarSaida(saida)
  if (estrutura.status !== 'aprovada') throw new TypeError('Questão com estrutura inválida')
  const { contratoVersao, loteId, loteVersao, posicaoId, revisao, texto, enunciado, alternativas } = saida
  return {
    contratoVersao, loteId, loteVersao, posicaoId, revisao,
    ...(texto === undefined ? {} : { texto }),
    enunciado,
    alternativas: Object.fromEntries(['A', 'B', 'C', 'D', 'E'].map(letra => [letra, alternativas[letra]])),
  }
}

export function registrarValidacao(saida) {
  return {
    formatoVersao: 1,
    loteId: saida.loteId,
    loteVersao: saida.loteVersao,
    posicaoId: saida.posicaoId,
    revisao: saida.revisao,
    verificacoes: validarSaida(saida),
    resolucaoIndependente: null,
    revisaoHumana: null,
    correcao: null,
    metricas: { custoDiretoCentavos: null, tempoRevisaoSegundos: null },
  }
}
