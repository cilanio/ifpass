import { describe, expect, it } from 'vitest'
import { porAssunto } from '../src/lib/assuntos.js'

const agora = new Date('2026-11-24T12:00:00Z')
const dia = 86_400_000
const assunto = 'p_semantica'

function data(dias, ajuste = 0) {
  return new Date(agora.getTime() - dias * dia + ajuste).toISOString()
}

function respostas(total, acertos, dias) {
  return Array.from({ length: total }, (_, i) => ({
    assunto, acertou: i < acertos, criado_em: data(dias),
  }))
}

function tentativa(detalhes, campos = {}) {
  return {
    prova_id: 'ifal-2026-t1',
    status: 'finalizado',
    finalizado_em: data(1),
    resultado: { detalhes },
    ...campos,
  }
}

describe('indicadores por assunto', () => {
  it('consolida simulados finalizados e treinos e exclui anuladas e brancos da taxa', () => {
    const detalhe = { n: 1, marcada: 'A', acertou: true }
    const simulados = [
      tentativa([
        detalhe,
        { n: 6, marcada: 'B', acertou: false },
        { n: 17, marcada: 'A', acertou: true, anulada: true },
        ...[undefined, null, '', false].map(marcada => ({ ...detalhe, marcada, acertou: false })),
        { n: 99, marcada: 'A', acertou: true },
      ]),
      tentativa([detalhe], { status: 'em_andamento' }),
      tentativa([detalhe], { resultado: null }),
      tentativa([detalhe], { prova_id: 'desconhecida' }),
    ]
    const treino = [...respostas(2, 1, 40), { assunto: 'desconhecido', acertou: true }]

    expect(porAssunto(simulados, treino, agora)).toMatchObject([{
      id: assunto, total: 4, acertos: 2, erros: 2, emBranco: 4, pct: 50,
      evolucao: {
        recente: { total: 2, acertos: 1, erros: 1, pct: 50 },
        anterior: { total: 2, acertos: 1, erros: 1, pct: 50 },
        tendencia: 'dados_insuficientes',
      },
    }])
  })

  it('retorna lista vazia sem dados e mantém percentual nulo para assunto só com brancos', () => {
    expect(porAssunto()).toEqual([])
    expect(porAssunto([tentativa([{ n: 1, marcada: null }])], [], agora)).toMatchObject([
      { id: assunto, total: 0, emBranco: 1, pct: null, prioridade: 'sem_dados' },
    ])
  })

  it('respeita as fronteiras de 30 e 60 dias sem excluir registros do total geral', () => {
    const datas = [
      data(0), data(30), data(30, -1), data(60),
      data(60, -1), data(0, 1), 'inválida', undefined,
    ]
    const treinos = datas.map((criado_em, i) => ({ criado_em, assunto, acertou: i < 3 }))
    const [indicador] = porAssunto([], treinos, agora)

    expect(indicador).toMatchObject({ total: 8, acertos: 3, pct: 38 })
    expect(indicador.evolucao).toEqual({
      recente: { total: 2, acertos: 2, erros: 0, pct: 100 },
      anterior: { total: 2, acertos: 1, erros: 1, pct: 50 },
      tendencia: 'dados_insuficientes',
      variacao: null,
    })
  })

  it.each([[4, 5], [5, 4]])('exige cinco respostas em cada janela (%i e %i)', (recente, anterior) => {
    const [indicador] = porAssunto([], [
      ...respostas(recente, recente, 1), ...respostas(anterior, 0, 31),
    ], agora)
    expect(indicador.evolucao).toMatchObject({ variacao: null, tendencia: 'dados_insuficientes' })
  })

  it('calcula a tendência quando as duas janelas têm exatamente cinco respostas', () => {
    const [indicador] = porAssunto([], [
      ...respostas(5, 3, 1), ...respostas(5, 2, 31),
    ], agora)
    expect(indicador.evolucao).toMatchObject({ variacao: 20, tendencia: 'melhora' })
  })

  it.each([
    [11, 10, 20, 5, 'melhora'],
    [10, 11, 20, -5, 'queda'],
    [13, 12, 25, 4, 'estavel'],
    [12, 13, 25, -4, 'estavel'],
  ])('classifica evolução com %i e %i acertos em amostras de %i', (recente, anterior, total, variacao, tendencia) => {
    const [indicador] = porAssunto([], [
      ...respostas(total, recente, 1), ...respostas(total, anterior, 31),
    ], agora)
    expect(indicador.evolucao).toMatchObject({ variacao, tendencia })
  })

  it.each([
    [4, 1, 'insuficiente', 'coletar_dados'],
    [5, 2, 'baixa', 'alta'],
    [9, 5, 'baixa', 'media'],
    [10, 5, 'media', 'media'],
    [19, 13, 'media', 'media'],
    [20, 14, 'alta', 'baixa'],
  ])('define confiança e prioridade com %i respostas e %i acertos', (total, acertos, confianca, prioridade) => {
    expect(porAssunto([], respostas(total, acertos, 1), agora)).toMatchObject([
      { confianca, prioridade },
    ])
  })
})

describe('compatibilidade do histórico de treino', () => {
  it.each([
    ['sem campos autorais', {}],
    ['com campos autorais nulos', {
      questao_ref: null, origem_questao: null, topico_id: null,
      etapa: null, habilidade_principal: null, dificuldade: null,
    }],
  ])('mantém os indicadores de registros históricos %s', (_formato, campos) => {
    const historico = [
      { prova_id: 'ifal-2026-t1', n: 1, assunto: 'p_semantica', acertou: true, criado_em: data(2) },
      { prova_id: 'ifal-2025-t1', n: 1, assunto: 'p_comunicacao', acertou: false, criado_em: data(31) },
    ].map(registro => ({ ...registro, ...campos }))

    expect(porAssunto([], historico, agora)).toMatchObject([
      {
        id: 'p_comunicacao', pct: 0, total: 1, acertos: 0, erros: 1,
        evolucao: { anterior: { total: 1, pct: 0 }, recente: { total: 0, pct: null } },
      },
      {
        id: 'p_semantica', pct: 100, total: 1, acertos: 1, erros: 0,
        evolucao: { anterior: { total: 0, pct: null }, recente: { total: 1, pct: 100 } },
      },
    ])
  })
})
