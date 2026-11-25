// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import Questao from '../src/Questao.jsx'
import { PROVAS } from '../src/data/provas.js'
import { adaptarQuestaoAutoral, adaptarQuestaoOficial } from '../src/lib/questoes.js'

const registro = {
  id: '00000000-0000-4000-8000-000000000001',
  versao: 2,
  disciplina: 'Matemática',
  assunto_id: 'm_numeros',
  topico_id: 'topico-sintetico',
  etapa: 'aplicacao',
  habilidade_principal: 'aplicacao',
  habilidades_secundarias: ['compreensao'],
  dificuldade: 'facil',
  titulo_texto: 'Texto sintético',
  texto: 'Considere dois conjuntos unitários distintos.',
  enunciado: 'Quantos elementos tem a união?',
  imagem: null,
  alternativas: { A: 'Um', B: 'Dois', C: 'Três', D: 'Quatro', E: 'Cinco' },
  resposta_correta: 'B',
  explicacao: { texto: 'Cada conjunto contribui com um elemento.' },
  status: 'rascunho',
}

afterEach(cleanup)

it('mantém a identidade histórica e deixa metadados oficiais ausentes como nulos', () => {
  const [primeira, segunda] = PROVAS
  const modelo = adaptarQuestaoOficial(primeira, primeira.questoes[0])
  const outro = adaptarQuestaoOficial(segunda, segunda.questoes[0])

  expect(modelo).toMatchObject({
    id: 'oficial:ifal-2026-t1:1',
    origem: 'oficial',
    provaId: 'ifal-2026-t1',
    n: 1,
    versao: null,
    disciplina: 'Língua Portuguesa',
    assuntoId: 'p_semantica',
    topicoId: null,
    etapa: null,
    habilidadePrincipal: null,
    habilidadesSecundarias: null,
    dificuldade: null,
    explicacao: null,
    status: null,
  })
  expect(outro.n).toBe(modelo.n)
  expect(outro.id).toBe('oficial:ifal-2025-t1:1')
})

it('preserva gabarito, alternativas e enunciado oficial sem modificar o catálogo', () => {
  const prova = PROVAS.find(item => item.id === 'ifal-2026-t1')
  const original = prova.questoes.find(item => item.n === 3)
  const antes = structuredClone(original)
  const modelo = adaptarQuestaoOficial(prova, original)

  expect(original).toEqual(antes)
  expect(modelo.gabarito).toBe(antes.gabarito)
  expect(modelo.alternativas).toEqual(antes.alternativas)
  expect(modelo.texto).toBeTruthy()
  expect(modelo.enunciado).not.toContain('[trecho da letra]')
})

it('mapeia origem, versão, metadados, conteúdo, gabarito e explicação da questão autoral sintética', () => {
  const modelo = adaptarQuestaoAutoral(registro)
  expect(modelo).toEqual({
    id: `ia:${registro.id}`, origem: 'ia', versao: 2, provaId: null, n: null,
    disciplina: 'Matemática', assuntoId: 'm_numeros', topicoId: 'topico-sintetico',
    etapa: 'aplicacao', habilidadePrincipal: 'aplicacao',
    habilidadesSecundarias: ['compreensao'], dificuldade: 'facil',
    tituloTexto: 'Texto sintético', texto: registro.texto, enunciado: registro.enunciado,
    imagem: null, alternativas: registro.alternativas, gabarito: 'B',
    explicacao: registro.explicacao, status: 'rascunho', cor: null,
  })
  expect(adaptarQuestaoAutoral({ ...registro, versao: 3 })).toMatchObject({
    id: modelo.id, versao: 3,
  })
})

it('renderiza um modelo sintético e mantém o mesmo contrato de resposta e revisão', async () => {
  const usuario = userEvent.setup()
  const onResponder = vi.fn()
  const modelo = adaptarQuestaoAutoral(registro)
  const { rerender } = render(<Questao modelo={modelo} onResponder={onResponder} />)
  expect(screen.getByText('Questão autoral · Matemática')).toBeTruthy()
  expect(screen.getByText(registro.enunciado)).toBeTruthy()

  const alternativa = screen.getByRole('button', { name: /Dois/ })
  await usuario.click(alternativa)
  expect(onResponder).toHaveBeenCalledExactlyOnceWith('B')

  rerender(<Questao modelo={modelo} resposta="A" revisao />)
  expect(alternativa.disabled).toBe(true)
  expect(alternativa.classList.contains('certa')).toBe(true)
  expect(screen.getByRole('button', { name: /Um/ }).classList.contains('errada')).toBe(true)
})
