// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import TreinoAutoral from '../src/TreinoAutoral'

const rpc = vi.hoisted(() => vi.fn())
vi.mock('../src/lib/supabase', () => ({ supabase: { rpc } }))

const sessao = { id: 'sessao-sintetica', status: 'em_andamento', posicao: 1 }
const item = {
  item_id: 'item-sintetico', ordem: 1, status: 'pendente',
  questao: {
    id: 'questao-sintetica', versao: 2, disciplina: 'Matemática',
    enunciado: 'Enunciado sintético', alternativas: { A: 'Um', B: 'Dois' },
  },
}
const rodada = { sessao, itens: [item] }
const sucesso = data => ({ data, error: null })

beforeEach(() => rpc.mockReset())
afterEach(cleanup)

it('retoma a questão atribuída e mostra a correção somente após registro e confirmação', async () => {
  const usuario = userEvent.setup()
  let confirmar
  rpc.mockResolvedValueOnce(sucesso(rodada))
    .mockImplementationOnce(() => new Promise(resolve => { confirmar = resolve }))
    .mockResolvedValueOnce(sucesso({
      sessao, itens: [{ ...item, status: 'respondido', resposta: {
        alternativa: 'A', gabarito: 'A', explicacao: { correta: 'Explicação sintética', distratores: { B: 'Distrator sintético' } },
      } }],
    }))

  render(<TreinoAutoral />)
  expect(await screen.findByText(item.questao.enunciado)).toBeTruthy()
  await usuario.click(screen.getByRole('button', { name: /Um/ }))
  expect(rpc.mock.calls[1]).toEqual(['ifpass_responder_autoral', { p_item: item.item_id, p_alternativa: 'A' }])
  expect(screen.queryByText('Explicação sintética')).toBeNull()
  expect(screen.getByRole('button', { name: /Dois/ }).disabled).toBe(true)
  confirmar(sucesso({ acertou: true }))
  expect(await screen.findByText('Explicação sintética')).toBeTruthy()
  expect(screen.getByText('B. Distrator sintético')).toBeTruthy()
})

it('mantém o erro recuperável e permite retomar uma questão retirada', async () => {
  const usuario = userEvent.setup()
  rpc.mockResolvedValueOnce(sucesso(rodada))
    .mockResolvedValueOnce({ error: new Error('Falha de rede') })
    .mockResolvedValueOnce(sucesso({ sessao, itens: [{ ...item, status: 'item_anulado' }] }))
  render(<TreinoAutoral />)
  await usuario.click(await screen.findByRole('button', { name: /Um/ }))
  expect(await screen.findByRole('alert')).toBeTruthy()
  await usuario.click(screen.getByRole('button', { name: 'Atualizar rodada' }))
  expect(await screen.findByText(/Questão retirada por erro/)).toBeTruthy()
  expect(screen.queryByRole('button', { name: /Um/ })).toBeNull()
})

it('comunica falta de itens sem recorrer a oficiais', async () => {
  const usuario = userEvent.setup()
  rpc.mockResolvedValueOnce(sucesso(null)).mockResolvedValueOnce(sucesso({ status: 'sem_questoes' }))
  render(<TreinoAutoral assuntoInicial="p_texto" />)
  await usuario.click(await screen.findByRole('button', { name: 'Iniciar treino' }))
  expect(await screen.findByText(/Nenhuma questão autoral/)).toBeTruthy()
  expect(rpc.mock.calls.map(([nome]) => nome)).toEqual(['ifpass_treino_retomar', 'ifpass_treino_iniciar'])
})
