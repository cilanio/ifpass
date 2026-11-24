// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Home from '../src/Home.jsx'
import Treino from '../src/Treino.jsx'

const banco = vi.hoisted(() => {
  const blocos = [{ nome: 'Português', de: 1, ate: 17, cor: '#123456' }]
  const questoes = Array.from({ length: 17 }, (_, indice) => {
    const n = indice + 1
    return {
      n,
      enunciado: `Enunciado sintético ${n}`,
      alternativas: { A: 'Resposta certa', B: 'Resposta errada' },
      gabarito: [1, 16, 17].includes(n) ? 'NULA' : 'A',
    }
  })
  return [{ id: 'prova-sintetica', titulo: 'Prova sintética', blocos, questoes }]
})

vi.mock('../src/data/provas', () => ({ PROVAS: banco }))
vi.mock('../src/data/assuntos', () => ({
  BLOCOS: ['Português'],
  ASSUNTOS: {
    longo: { nome: 'Assunto extenso', bloco: 'Português' },
    curto: { nome: 'Assunto curto', bloco: 'Português' },
    vazio: { nome: 'Assunto sem questões válidas', bloco: 'Português' },
  },
  assuntoDe: (_provaId, n) => {
    if (n <= 13) return 'longo'
    if (n <= 16) return 'curto'
    return 'vazio'
  },
}))

vi.mock('../src/Hoje', () => ({ default: () => <h2>Painel do dia</h2> }))
vi.mock('../src/Plano', () => ({ default: () => null }))
vi.mock('../src/Simulados', () => ({ default: () => null }))

const db = vi.hoisted(() => ({
  criarSessao: vi.fn(),
  gravarResposta: vi.fn(),
  atualizarSessao: vi.fn(),
  finalizarSessao: vi.fn(),
}))

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    from(tabela) {
      switch (tabela) {
        case 'profiles':
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({ data: { nome: 'Estudante' }, error: null }),
              }),
            }),
          }
        case 'simulados':
          return { select: () => ({ eq: async () => ({ data: [], error: null }) }) }
        case 'treino_respostas':
          return {
            select: async () => ({ data: [], error: null }),
            insert: db.gravarResposta,
          }
        case 'treino_sessoes':
          return {
            insert: db.criarSessao,
            update(dados) {
              const filtros = {}
              return {
                eq(campo, valor) {
                  filtros[campo] = valor
                  if (campo !== 'status') return this

                  if (dados.status === 'finalizada') {
                    return { select: () => ({ single: () => db.finalizarSessao(dados, filtros) }) }
                  }

                  return db.atualizarSessao(dados, filtros)
                },
              }
            },
          }
        default:
          throw new Error(`Tabela inesperada no teste: ${tabela}`)
      }
    },
  },
}))

const filtrosSessao = { id: 'sessao-1', status: 'em_andamento' }
const retornoSessao = { data: { id: 'sessao-1' }, error: null }

beforeEach(() => {
  vi.resetAllMocks()
  // Escolhe sempre o último índice de cada passo do embaralhamento.
  vi.spyOn(Math, 'random').mockReturnValue(0.999)
  db.criarSessao.mockReturnValue({ select: () => ({ single: async () => retornoSessao }) })
  db.gravarResposta.mockResolvedValue({ error: null })
  db.atualizarSessao.mockResolvedValue({ error: null })
  db.finalizarSessao.mockResolvedValue(retornoSessao)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function botaoAssunto(nome) {
  const cartao = screen.getByText(nome).closest('.assunto')
  return within(cartao).getByRole('button', { name: 'Treinar' })
}

function alternativa(letra = 'A') {
  return screen.getByRole('button', { name: new RegExp(`^${letra}(?:\\s|Resposta)`) })
}

async function iniciarTreino(usuario, nome = 'Assunto curto') {
  await usuario.click(botaoAssunto(nome))
  await screen.findByRole('button', { name: 'Sair do treino' })
}

describe('seleção de questões', () => {
  it('limita a rodada a dez questões distintas do assunto escolhido e exclui anuladas', async () => {
    const usuario = userEvent.setup()
    render(<Treino />)

    expect(screen.getByText('12 questões no banco')).toBeTruthy()
    await iniciarTreino(usuario, 'Assunto extenso')

    for (let posicao = 1; posicao <= 10; posicao++) {
      expect(screen.getByText(new RegExp(`Questão ${posicao} de 10 ·`))).toBeTruthy()
      await usuario.click(alternativa())
      await screen.findByText('✓ Acertou!')
      if (posicao < 10) {
        await usuario.click(screen.getByRole('button', { name: /Próxima/ }))
      }
    }

    expect(screen.getByRole('button', { name: 'Ver resultado' })).toBeTruthy()
    expect(db.criarSessao).toHaveBeenCalledWith({
      assunto: 'longo', total_questoes: 10, status: 'em_andamento',
    })
    expect(db.gravarResposta.mock.calls.map(([resposta]) => resposta.n)).toEqual([
      2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
    ])
    expect(db.gravarResposta.mock.calls.every(([resposta]) => resposta.assunto === 'longo')).toBe(true)
  })

  it('usa apenas os itens elegíveis quando o assunto tem menos de dez questões', async () => {
    const usuario = userEvent.setup()
    render(<Treino />)

    expect(screen.getByText('2 questões no banco')).toBeTruthy()
    await iniciarTreino(usuario)
    expect(screen.getByText(/Questão 1 de 2 .*nº 14/)).toBeTruthy()

    await usuario.click(alternativa())
    await usuario.click(await screen.findByRole('button', { name: /Próxima/ }))
    expect(screen.getByText(/Questão 2 de 2 .*nº 15/)).toBeTruthy()
    expect(db.criarSessao).toHaveBeenCalledWith({
      assunto: 'curto', total_questoes: 2, status: 'em_andamento',
    })
  })

  it('oculta assunto sem questões válidas e não abre sessão por indicação inicial', async () => {
    render(<Treino assuntoInicial="vazio" />)

    expect(await screen.findByRole('heading', { name: 'Treino por assunto' })).toBeTruthy()
    expect(screen.queryByText('Assunto sem questões válidas')).toBeNull()
    expect(screen.getAllByRole('button', { name: 'Treinar' })).toHaveLength(2)
    expect(db.criarSessao).not.toHaveBeenCalled()
  })
})

describe('persistência das sessões de treino', () => {
  it('aguarda a criação da sessão antes de apresentar a primeira questão', async () => {
    const usuario = userEvent.setup()
    const pendente = Promise.withResolvers()
    const single = vi.fn().mockReturnValue(pendente.promise)
    const select = vi.fn().mockReturnValue({ single })
    db.criarSessao.mockReturnValueOnce({ select })
    render(<Treino />)

    await usuario.click(botaoAssunto('Assunto curto'))

    expect(db.criarSessao).toHaveBeenCalledExactlyOnceWith({
      assunto: 'curto', total_questoes: 2, status: 'em_andamento',
    })
    expect(select).toHaveBeenCalledWith('id')
    expect(single).toHaveBeenCalledOnce()
    expect(screen.queryByRole('button', { name: 'Sair do treino' })).toBeNull()

    pendente.resolve(retornoSessao)
    expect(await screen.findByText('Enunciado sintético 14')).toBeTruthy()
  })

  it('grava a resposta antes do feedback e ignora cliques repetidos durante a gravação', async () => {
    const usuario = userEvent.setup()
    const pendente = Promise.withResolvers()
    db.gravarResposta.mockReturnValueOnce(pendente.promise)
    render(<Treino />)
    await iniciarTreino(usuario)

    await usuario.click(alternativa())
    expect(screen.getByText('Salvando sua resposta...')).toBeTruthy()
    expect(screen.queryByText('✓ Acertou!')).toBeNull()
    expect(screen.queryByRole('button', { name: /Próxima/ })).toBeNull()

    await usuario.click(alternativa('B'))
    expect(db.gravarResposta).toHaveBeenCalledExactlyOnceWith({
      sessao_id: 'sessao-1',
      prova_id: 'prova-sintetica',
      n: 14,
      assunto: 'curto',
      alternativa_escolhida: 'A',
      alternativa_correta: 'A',
      acertou: true,
    })

    pendente.resolve({ error: null })
    expect(await screen.findByText('✓ Acertou!')).toBeTruthy()
    expect(alternativa('B').disabled).toBe(true)
    expect(screen.getByRole('button', { name: /Próxima/ })).toBeTruthy()
  })

  it('exibe a falha de criação e permite iniciar novamente', async () => {
    const usuario = userEvent.setup()
    db.criarSessao.mockReturnValueOnce({
      select: () => ({ single: async () => ({ error: { message: 'criação indisponível' } }) }),
    })
    render(<Treino />)

    await usuario.click(botaoAssunto('Assunto curto'))
    expect(await screen.findByText(/Não foi possível iniciar.*criação indisponível/)).toBeTruthy()
    expect(screen.queryByText('Enunciado sintético 14')).toBeNull()

    await iniciarTreino(usuario)
    expect(db.criarSessao).toHaveBeenCalledTimes(2)
  })

  it('permite tentar novamente após falha ao gravar a resposta sem liberar o avanço', async () => {
    const usuario = userEvent.setup()
    db.gravarResposta.mockResolvedValueOnce({ error: { message: 'gravação indisponível' } })
    render(<Treino />)
    await iniciarTreino(usuario)

    await usuario.click(alternativa())
    expect(await screen.findByText(/Não consegui salvar esta resposta.*gravação indisponível/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Próxima/ })).toBeNull()
    expect(screen.queryByText('✓ Acertou!')).toBeNull()

    await usuario.click(alternativa())
    expect(await screen.findByText('✓ Acertou!')).toBeTruthy()
    expect(db.gravarResposta.mock.calls).toEqual([
      db.gravarResposta.mock.calls[0],
      db.gravarResposta.mock.calls[0],
    ])
  })

  it('finaliza com o total respondido e os acertos após uma resposta certa e uma errada', async () => {
    const usuario = userEvent.setup()
    const pendente = Promise.withResolvers()
    db.finalizarSessao.mockReturnValueOnce(pendente.promise)
    render(<Treino />)
    await iniciarTreino(usuario)

    await usuario.click(alternativa())
    await usuario.click(await screen.findByRole('button', { name: /Próxima/ }))
    await usuario.click(alternativa('B'))
    expect(await screen.findByText(/Errou.*resposta certa é a A/)).toBeTruthy()
    await usuario.click(screen.getByRole('button', { name: 'Ver resultado' }))

    expect(db.finalizarSessao).toHaveBeenCalledExactlyOnceWith({
      status: 'finalizada', finalizado_em: expect.any(String), total_questoes: 2, acertos: 1,
    }, filtrosSessao)
    expect(screen.queryByText('Rodada concluída.')).toBeNull()

    pendente.resolve(retornoSessao)
    expect(await screen.findByText('Rodada concluída.')).toBeTruthy()
    expect(screen.getByText('1/2')).toBeTruthy()
  })

  it('retém a rodada após falha na finalização e permite tentar novamente', async () => {
    const usuario = userEvent.setup()
    db.finalizarSessao.mockResolvedValueOnce({ error: { message: 'finalização indisponível' } })
    render(<Treino />)
    await iniciarTreino(usuario)

    await usuario.click(alternativa())
    await usuario.click(await screen.findByRole('button', { name: /Próxima/ }))
    await usuario.click(alternativa())
    await usuario.click(await screen.findByRole('button', { name: 'Ver resultado' }))

    expect(await screen.findByText(/Não foi possível finalizar.*finalização indisponível/)).toBeTruthy()
    expect(screen.queryByText('Rodada concluída.')).toBeNull()
    await usuario.click(screen.getByRole('button', { name: 'Ver resultado' }))
    expect(await screen.findByText('2/2')).toBeTruthy()
    expect(db.finalizarSessao).toHaveBeenCalledTimes(2)
    expect(db.gravarResposta).toHaveBeenCalledTimes(2)
  })

  it('interrompe voluntariamente e grava os totais parciais', async () => {
    const usuario = userEvent.setup()
    render(<Treino />)
    await iniciarTreino(usuario)
    await usuario.click(alternativa())
    await screen.findByText('✓ Acertou!')

    await usuario.click(screen.getByRole('button', { name: 'Sair do treino' }))

    expect(db.atualizarSessao).toHaveBeenCalledExactlyOnceWith({
      status: 'interrompida', finalizado_em: expect.any(String), total_questoes: 1, acertos: 1,
    }, filtrosSessao)
    expect(db.finalizarSessao).not.toHaveBeenCalled()
    expect(await screen.findByRole('heading', { name: 'Treino por assunto' })).toBeTruthy()
  })
})

describe('caracterização do abandono de uma sessão', () => {
  it('troca de aba pela Home sem atualizar o status e retorna à lista de assuntos', async () => {
    const usuario = userEvent.setup()
    render(<Home usuario={{ id: 'estudante' }} />)
    await usuario.click(screen.getByRole('button', { name: 'Treino', exact: true }))
    await iniciarTreino(usuario)

    await usuario.click(screen.getByRole('button', { name: 'Hoje', exact: true }))
    expect(screen.getByRole('heading', { name: 'Painel do dia' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Sair do treino' })).toBeNull()

    await usuario.click(screen.getByRole('button', { name: 'Treino', exact: true }))
    expect(screen.getByRole('heading', { name: 'Treino por assunto' })).toBeTruthy()
    expect(db.criarSessao).toHaveBeenCalledOnce()
    expect(db.atualizarSessao).not.toHaveBeenCalled()
    expect(db.finalizarSessao).not.toHaveBeenCalled()
  })

  it('desmonta a tela sem marcar a sessão como interrompida', async () => {
    const usuario = userEvent.setup()
    const { unmount } = render(<Treino />)
    await iniciarTreino(usuario)
    await usuario.click(alternativa())
    await screen.findByText('✓ Acertou!')

    unmount()

    expect(db.gravarResposta).toHaveBeenCalledOnce()
    expect(db.atualizarSessao).not.toHaveBeenCalled()
    expect(db.finalizarSessao).not.toHaveBeenCalled()
  })
})
