import { afterEach, describe, expect, it, vi } from 'vitest'
import { ASSUNTOS, CLASSIFICACAO, assuntoDe } from '../src/data/assuntos.js'
import { PROVAS } from '../src/data/provas.js'

describe('catálogo oficial', () => {
  it('tem IDs únicos e classificação cadastrada apenas para provas do catálogo', () => {
    const ids = PROVAS.map((prova) => prova.id)

    expect(ids.length).toBeGreaterThan(0)
    expect(new Set(ids).size).toBe(ids.length)
    expect(Object.keys(CLASSIFICACAO).sort()).toEqual([...ids].sort())
  })

  it('preserva as contagens do catálogo atual', () => {
    const questoes = PROVAS.flatMap((prova) => prova.questoes)

    expect(PROVAS).toHaveLength(3)
    expect(questoes).toHaveLength(120)
    expect(questoes.filter((questao) => questao.gabarito === 'NULA')).toHaveLength(2)
  })

  it.each(PROVAS)('mantém numeração, blocos e assuntos coerentes em $id', (prova) => {
    expect(prova.questoes).toHaveLength(40)
    expect(CLASSIFICACAO[prova.id]).toHaveLength(prova.questoes.length)

    for (const [indice, questao] of prova.questoes.entries()) {
      const contexto = `${prova.id}, posição ${indice + 1}`
      expect(questao.n, contexto).toBe(indice + 1)

      const blocos = prova.blocos.filter(({ de, ate }) => questao.n >= de && questao.n <= ate)
      expect(blocos.map(({ nome }) => nome), contexto).toEqual([questao.bloco])

      const id = assuntoDe(prova.id, questao.n)
      expect(id, contexto).toBe(CLASSIFICACAO[prova.id][indice])
      expect(ASSUNTOS[id]?.bloco, contexto).toBe(questao.bloco)
    }
  })

  it.each(PROVAS)('tem alternativas A–E e gabaritos válidos em $id', (prova) => {
    for (const questao of prova.questoes) {
      const contexto = `${prova.id}, questão ${questao.n}`
      const letras = Object.keys(questao.alternativas).sort()

      expect(letras, contexto).toEqual(['A', 'B', 'C', 'D', 'E'])
      expect([...letras, 'NULA'], contexto).toContain(questao.gabarito)
    }
  })
})

describe('validação da classificação ao carregar o catálogo', () => {
  const id = PROVAS[0].id

  afterEach(() => {
    vi.doUnmock('../src/data/assuntos.js')
    vi.resetModules()
  })

  it.each([
    ['classificação ausente', undefined, 'classificação não encontrada'],
    ['quantidade incorreta', CLASSIFICACAO[id].slice(1), '39 classificações para 40 questões'],
    ['assunto inexistente', ['__inexistente__', ...CLASSIFICACAO[id].slice(1)], 'utiliza assunto inexistente'],
    ['bloco incompatível', ['m_numeros', ...CLASSIFICACAO[id].slice(1)], 'foi classificada em Matemática'],
  ])('rejeita %s', async (_caso, classificacao, mensagem) => {
    const classificacoes = { ...CLASSIFICACAO }
    if (classificacao === undefined) delete classificacoes[id]
    else classificacoes[id] = classificacao

    vi.resetModules()
    vi.doMock('../src/data/assuntos.js', () => ({
      ASSUNTOS,
      CLASSIFICACAO: classificacoes,
    }))

    await expect(import('../src/data/provas.js')).rejects.toThrow(mensagem)
  })
})
