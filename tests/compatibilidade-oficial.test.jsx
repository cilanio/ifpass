// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { PROVAS } from '../src/data/provas.js'
import { corrigir } from '../src/lib/correcao.js'
import Questao from '../src/Questao.jsx'
import Simulados from '../src/Simulados.jsx'

const listar = vi.hoisted(() => vi.fn())

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    from(tabela) {
      if (tabela !== 'simulados') throw new Error(`Tabela inesperada: ${tabela}`)
      return { select: () => ({ order: listar }) }
    },
  },
}))

afterEach(() => {
  cleanup()
  listar.mockReset()
})

it('renderiza o texto complementar e as alternativas de uma questão oficial', () => {
  const prova = PROVAS.find(item => item.id === 'ifal-2026-t1')
  const questao = prova.questoes.find(item => item.n === 3)
  const { container } = render(<Questao prova={prova} questao={questao} />)

  expect(container.querySelector('.texto-apoio')?.textContent.trim()).toBeTruthy()
  const enunciado = container.querySelector('.enunciado')
  expect(enunciado.textContent).not.toContain('[trecho da letra]')
  expect(within(enunciado).getByText('Fácil', { exact: true }).tagName).toBe('EM')
  expect(screen.getAllByRole('button')).toHaveLength(5)
})

it('mantém as provas no catálogo e revisa uma tentativa histórica pelo ID oficial', async () => {
  const usuario = userEvent.setup()
  const prova = PROVAS.find(item => item.id === 'ifal-2024-t3')
  const respostas = { 1: 'A', 3: 'C' }
  const resultado = corrigir(prova, respostas)
  expect(resultado).toMatchObject({ total: 40, acertos: 3 })
  expect(resultado.detalhes[0]).toMatchObject({ n: 1, marcada: 'A', gabarito: 'E', acertou: false })

  const tentativa = {
    id: 'tentativa-historica',
    prova_id: 'ifal-2024-t3',
    status: 'finalizado',
    iniciado_em: '2025-01-10T12:00:00Z',
    finalizado_em: '2025-01-10T13:00:00Z',
    duracao_seg: 3600,
    acertos: 3,
    total: 40,
    resultado,
  }
  listar.mockResolvedValue({ data: [tentativa], error: null })
  render(<Simulados />)

  expect(screen.getAllByRole('button', { name: 'Iniciar' })).toHaveLength(3)
  await usuario.click(await screen.findByRole('button', { name: 'Ver resultado' }))
  expect(screen.getByText(prova.titulo)).toBeTruthy()
  expect(screen.getByText('3/40')).toBeTruthy()

  await usuario.click(screen.getByRole('button', { name: /^Questão 1\s*Sua resposta/ }))
  expect(screen.getByRole('img', { name: 'Figura da questão 1' }).getAttribute('src'))
    .toBe('/provas/ifal-2024-t3/q01.png')
  const alternativas = screen.getAllByRole('button').filter(botao => botao.classList.contains('alt'))
  expect(alternativas.find(botao => botao.classList.contains('certa'))?.textContent).toMatch(/^E/)
  expect(alternativas.find(botao => botao.classList.contains('errada'))?.textContent).toMatch(/^A/)
  expect(alternativas.every(botao => botao.disabled)).toBe(true)

  await usuario.click(screen.getByRole('button', { name: 'Em branco' }))
  expect(screen.queryByRole('button', { name: /^Questão 19\s*Sua resposta/ })).toBeNull()
  await usuario.click(screen.getByRole('button', { name: 'Todas' }))
  await usuario.click(screen.getByRole('button', { name: /^Questão 19\s*Sua resposta/ }))
  expect(screen.getByText('Questão anulada pela banca: vale ponto para todos.')).toBeTruthy()
})
