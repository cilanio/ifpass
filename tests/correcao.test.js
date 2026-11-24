import { describe, expect, it } from 'vitest'
import { corrigir } from '../src/lib/correcao.js'

const prova = {
  blocos: [
    { nome: 'Primeiro bloco', cor: '#123456', de: 1, ate: 2 },
    { nome: 'Segundo bloco', cor: '#654321', de: 3, ate: 4 },
  ],
  questoes: [
    { n: 1, gabarito: 'A' },
    { n: 2, gabarito: 'B' },
    { n: 3, gabarito: 'C' },
    { n: 4, gabarito: 'NULA' },
  ],
}

describe('correção de simulados', () => {
  it('distingue acerto, erro, branco e anulada nos limites dos blocos', () => {
    expect(corrigir(prova, { 1: 'A', 2: 'D' })).toEqual({
      acertos: 2,
      total: 4,
      porBloco: [
        { nome: 'Primeiro bloco', cor: '#123456', acertos: 1, total: 2, brancos: 0 },
        { nome: 'Segundo bloco', cor: '#654321', acertos: 1, total: 2, brancos: 1 },
      ],
      detalhes: [
        { n: 1, marcada: 'A', gabarito: 'A', anulada: false, acertou: true },
        { n: 2, marcada: 'D', gabarito: 'B', anulada: false, acertou: false },
        { n: 3, marcada: null, gabarito: 'C', anulada: false, acertou: false },
        { n: 4, marcada: null, gabarito: 'NULA', anulada: true, acertou: true },
      ],
    })
  })

  it('atribui ponto à anulada mesmo quando uma alternativa foi marcada', () => {
    const resultado = corrigir(prova, { 4: 'E' })

    expect(resultado.acertos).toBe(1)
    expect(resultado.porBloco[1]).toMatchObject({ acertos: 1, brancos: 1 })
    expect(resultado.detalhes[3]).toEqual({
      n: 4, marcada: 'E', gabarito: 'NULA', anulada: true, acertou: true,
    })
  })

  it.each([{}, { 1: null, 2: '', 3: null, 4: '' }])(
    'conta somente as questões válidas em uma entrega sem marcações (%j)',
    (respostas) => {
      const resultado = corrigir(prova, respostas)

      expect(resultado.acertos).toBe(1)
      expect(resultado.porBloco.map((bloco) => bloco.brancos)).toEqual([2, 1])
      expect(resultado.detalhes.map((questao) => questao.marcada)).toEqual([
        null, null, null, null,
      ])
    },
  )
})
