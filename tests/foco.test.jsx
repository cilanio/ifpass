// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import Foco from '../src/Foco.jsx'
import { ASSUNTOS } from '../src/data/assuntos.js'

const db = vi.hoisted(() => ({ simulados: vi.fn(), treinos: vi.fn() }))

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    from(tabela) {
      if (tabela === 'simulados') return { select: () => ({ eq: db.simulados }) }
      if (tabela === 'treino_respostas') return { select: db.treinos }
      throw new Error(`Tabela inesperada: ${tabela}`)
    },
  },
}))

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-24T12:00:00Z'))
  db.simulados.mockReset().mockResolvedValue({ data: [], error: null })
  db.treinos.mockReset().mockResolvedValue({ data: [], error: null })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

it('mostra os três piores assuntos elegíveis e usa maior amostra no empate', async () => {
  const usuario = userEvent.setup()
  const onTreinar = vi.fn()
  const ordem = ['p_acentuacao', 'p_semantica', 'p_classes']
  const amostras = [
    ['p_grafia', 5, 3],
    ['p_sintaxe', 4, 0],
    ['p_texto', 5, 5],
    ['p_semantica', 10, 4],
    ['p_classes', 5, 2],
    ['p_acentuacao', 5, 1],
  ]
  db.treinos.mockResolvedValue({
    data: amostras.flatMap(([assunto, total, acertos]) => Array.from({ length: total }, (_, i) => ({
      assunto, acertou: i < acertos, criado_em: '2026-11-20T00:00:00Z',
    }))),
    error: null,
  })
  render(<Foco onTreinar={onTreinar} />)

  const botoes = await screen.findAllByRole('button', { name: 'Treinar' })
  expect(botoes).toHaveLength(3)
  const nomes = screen.getAllByText(/Aproveitamento geral:/).map(p => p.previousElementSibling.textContent)
  expect(nomes).toEqual(ordem.map(id => ASSUNTOS[id].nome))

  for (const botao of botoes) await usuario.click(botao)
  expect(onTreinar.mock.calls).toEqual(ordem.map(id => [id]))
  expect(db.simulados).toHaveBeenCalledWith('status', 'finalizado')
})

it('orienta o estudante quando o histórico está vazio', async () => {
  render(<Foco />)
  expect(await screen.findByText(/Faça um simulado ou treino/)).toBeTruthy()
  expect(screen.queryByRole('heading', { name: /Evolução do desempenho/ })).toBeNull()
})
