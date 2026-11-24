// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Prova from '../src/Prova.jsx'
import Simulados from '../src/Simulados.jsx'

const [prova] = vi.hoisted(() => [{
  id: 'prova-sintetica',
  titulo: 'Prova sintética',
  duracaoMin: 1,
  blocos: [{ nome: 'Matemática', de: 1, ate: 2, cor: '#123456' }],
  questoes: [1, 2].map(n => ({
    n, enunciado: `Enunciado ${n}`, gabarito: 'A',
    alternativas: { A: 'Primeira opção', B: 'Segunda opção' },
  })),
}])
const db = vi.hoisted(() => ({
  listar: vi.fn(), inserir: vi.fn(), salvar: vi.fn(), finalizar: vi.fn(),
}))

vi.mock('../src/data/provas', () => ({ PROVAS: [prova] }))
vi.mock('../src/lib/supabase', () => ({
  supabase: {
    from(tabela) {
      if (tabela !== 'simulados') throw new Error(`Tabela inesperada: ${tabela}`)

      return {
        select: () => ({ order: db.listar }),
        insert: dados => ({ select: () => ({ single: () => db.inserir(dados) }) }),
        update(dados) {
          const filtros = {}
          const consulta = {
            eq(campo, valor) {
              filtros[campo] = valor
              return consulta
            },
            then(resolve, reject) {
              return db.salvar(dados, filtros).then(resolve, reject)
            },
            select() {
              return { single: () => db.finalizar(dados, filtros) }
            },
          }
          return consulta
        },
      }
    },
  },
}))

const agora = new Date('2026-11-24T12:00:00Z')
const filtros = { id: 'tentativa-1', status: 'em_andamento' }
const tentativa = {
  id: filtros.id, prova_id: prova.id, status: filtros.status,
  iniciado_em: agora.toISOString(), respostas: {}, marcadas: [],
}
const ok = { error: null }

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(agora)
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  db.listar.mockReset().mockResolvedValue({ ...ok, data: [] })
  db.inserir.mockReset().mockResolvedValue({ ...ok, data: tentativa })
  db.salvar.mockReset().mockResolvedValue(ok)
  db.finalizar.mockReset().mockImplementation(async dados => ({ ...ok, data: { ...tentativa, ...dados } }))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function exibirProva(campos = {}) {
  const onSair = vi.fn()
  const onFinalizar = vi.fn()
  const tela = render(<Prova prova={prova} tentativa={{ ...tentativa, ...campos }} onSair={onSair} onFinalizar={onFinalizar} />)
  return { ...tela, onSair, onFinalizar }
}

async function clicar(nome) {
  await act(async () => fireEvent.click(screen.getByRole('button', { name: nome })))
}

async function avancar(ms) {
  await act(async () => vi.advanceTimersByTimeAsync(ms))
}

async function resolver(pendente, resultado = ok) {
  await act(async () => pendente.resolve(resultado))
}

describe('início e retomada de simulados', () => {
  it('confirma o início e cria a tentativa com o horário atual', async () => {
    await act(async () => { render(<Simulados />) })
    window.confirm.mockReturnValueOnce(false)
    await clicar('Iniciar')
    expect(db.inserir).not.toHaveBeenCalled()

    await clicar('Iniciar')
    expect(db.inserir).toHaveBeenCalledExactlyOnceWith({
      prova_id: prova.id, iniciado_em: agora.toISOString(),
    })
    expect(screen.getByText('Enunciado 1')).toBeTruthy()
    expect(screen.getByText(/00:01:00/)).toBeTruthy()
  })

  it('retoma respostas, marcações e tempo a partir da tentativa existente', async () => {
    db.listar.mockResolvedValue({
      ...ok, data: [{
        ...tentativa, iniciado_em: '2026-11-24T11:59:40Z', respostas: { 1: 'B' }, marcadas: [2],
      }],
    })
    await act(async () => { render(<Simulados />) })
    expect(db.listar).toHaveBeenCalledWith('iniciado_em', { ascending: false })
    await clicar('Continuar')

    expect(db.inserir).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /Segunda opção/ }).classList.contains('marcada')).toBe(true)
    expect(screen.getByText('Respondidas: 1/2')).toBeTruthy()
    await clicar('2')
    expect(screen.getByRole('button', { name: /Marcada para revisar/ })).toBeTruthy()
    expect(screen.getByText(/00:00:40/)).toBeTruthy()
    await avancar(1000)
    expect(screen.getByText(/00:00:39/)).toBeTruthy()
  })

  it('informa a falha de criação e mantém a lista disponível', async () => {
    db.inserir.mockResolvedValueOnce({ error: { message: 'criação indisponível' } })
    await act(async () => { render(<Simulados />) })
    await clicar('Iniciar')
    expect(screen.getByText('criação indisponível')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Iniciar' })).toBeTruthy()
    expect(screen.queryByText('Enunciado 1')).toBeNull()
  })
})

describe('salvamento do andamento', () => {
  it('agrupa edições feitas dentro dos 700 ms e salva o estado mais recente', async () => {
    exibirProva({ respostas: null, marcadas: null })
    await clicar(/Primeira opção/)
    await avancar(400)
    await clicar(/Marcar para revisar/)
    await avancar(699)
    expect(db.salvar).not.toHaveBeenCalled()
    await avancar(1)
    expect(db.salvar).toHaveBeenCalledExactlyOnceWith({ respostas: { 1: 'A' }, marcadas: [1] }, filtros)
  })

  it('aguarda a primeira gravação antes de enviar a próxima', async () => {
    const primeira = Promise.withResolvers()
    db.salvar.mockReturnValueOnce(primeira.promise)
    exibirProva()
    await clicar(/Primeira opção/)
    await avancar(700)

    await clicar(/Segunda opção/)
    await avancar(700)
    expect(db.salvar).toHaveBeenCalledExactlyOnceWith({ respostas: { 1: 'A' }, marcadas: [] }, filtros)

    await resolver(primeira)
    expect(db.salvar).toHaveBeenNthCalledWith(2, { respostas: { 1: 'B' }, marcadas: [] }, filtros)
  })

  it('salva imediatamente ao sair, depois das gravações pendentes', async () => {
    const anterior = Promise.withResolvers()
    const saida = Promise.withResolvers()
    db.salvar.mockReturnValueOnce(anterior.promise).mockReturnValueOnce(saida.promise)
    const { onSair } = exibirProva()
    await clicar(/Primeira opção/)
    await avancar(700)
    await clicar(/Segunda opção/)
    await clicar(/Sair \(o tempo continua\)/)
    expect(db.salvar).toHaveBeenCalledOnce()
    expect(onSair).not.toHaveBeenCalled()

    await resolver(anterior)
    expect(db.salvar).toHaveBeenNthCalledWith(2, { respostas: { 1: 'B' }, marcadas: [] }, filtros)
    expect(onSair).not.toHaveBeenCalled()
    await resolver(saida)
    expect(onSair).toHaveBeenCalledOnce()
    await avancar(700)
    expect(db.salvar).toHaveBeenCalledTimes(2)
  })

  it('informa falha de autosave e salva uma edição posterior', async () => {
    db.salvar.mockResolvedValueOnce({ error: { message: 'autosave indisponível' } })
    exibirProva()
    await clicar(/Primeira opção/)
    await avancar(700)
    expect(screen.getByText(/Erro ao salvar o andamento: autosave indisponível/)).toBeTruthy()

    await clicar(/Segunda opção/)
    await avancar(700)
    expect(db.salvar).toHaveBeenNthCalledWith(2, { respostas: { 1: 'B' }, marcadas: [] }, filtros)
  })

  it('mantém a prova aberta se salvar ao sair falhar e permite tentar de novo', async () => {
    db.salvar.mockResolvedValueOnce({ error: { message: 'saída indisponível' } })
    const { onSair } = exibirProva()
    await clicar(/Primeira opção/)
    await clicar(/Sair \(o tempo continua\)/)
    expect(screen.getByText(/Não foi possível salvar seu progresso: saída indisponível/)).toBeTruthy()
    expect(onSair).not.toHaveBeenCalled()

    await clicar(/Sair \(o tempo continua\)/)
    expect(db.salvar).toHaveBeenNthCalledWith(2, { respostas: { 1: 'A' }, marcadas: [] }, filtros)
    expect(onSair).toHaveBeenCalledOnce()
  })
})

describe('caracterização de atualização sem linhas afetadas', () => {
  it('trata a saída como bem-sucedida quando a atualização não informa erro', async () => {
    db.salvar.mockResolvedValueOnce({ data: [], error: null })
    const { onSair } = exibirProva()
    await clicar(/Primeira opção/)
    await clicar(/Sair/)

    expect(db.salvar).toHaveBeenCalledExactlyOnceWith({ respostas: { 1: 'A' }, marcadas: [] }, filtros)
    expect(onSair).toHaveBeenCalledOnce()
  })
})

describe('finalização de simulados', () => {
  it('finaliza manualmente com a correção e o estado mais recente após aguardar o autosave', async () => {
    const anterior = Promise.withResolvers()
    db.salvar.mockReturnValueOnce(anterior.promise)
    const { onFinalizar } = exibirProva({ iniciado_em: '2026-11-24T11:59:40Z' })
    await clicar(/Segunda opção/)
    await avancar(700)
    await clicar(/Primeira opção/)
    await clicar(/Marcar para revisar/)
    await clicar('Finalizar')
    expect(db.finalizar).not.toHaveBeenCalled()

    await resolver(anterior)
    expect(db.finalizar).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      status: 'finalizado', respostas: { 1: 'A' }, marcadas: [1],
      acertos: 1, total: 2, duracao_seg: 21,
      resultado: expect.objectContaining({
        porBloco: [expect.objectContaining({ acertos: 1, total: 2, brancos: 1 })],
      }),
    }), filtros)
    expect(onFinalizar).toHaveBeenCalledOnce()
    await avancar(700)
    expect(db.salvar).toHaveBeenCalledOnce()
  })

  it('finaliza ao zerar o relógio e ignora novos pedidos enquanto a escrita está pendente', async () => {
    const fim = Promise.withResolvers()
    db.finalizar.mockReturnValueOnce(fim.promise)
    const { onFinalizar } = exibirProva({ iniciado_em: '2026-11-24T11:59:01Z' })
    await avancar(999)
    expect(db.finalizar).not.toHaveBeenCalled()

    await avancar(1)
    expect(screen.getByText(/00:00:00/)).toBeTruthy()
    expect(db.finalizar).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      status: 'finalizado', duracao_seg: 60, finalizado_em: '2026-11-24T12:00:01.000Z',
    }), filtros)

    await clicar('Finalizar')
    await clicar('Finalizar')
    await avancar(2000)
    expect(db.finalizar).toHaveBeenCalledOnce()
    expect(onFinalizar).not.toHaveBeenCalled()
    const registro = { ...tentativa, status: 'finalizado' }
    await resolver(fim, { ...ok, data: registro })
    expect(onFinalizar).toHaveBeenCalledExactlyOnceWith(registro)
  })

  it('informa falha na finalização sem sair e libera nova tentativa manual', async () => {
    db.finalizar.mockResolvedValueOnce({ error: { message: 'nenhuma linha atualizada' } })
    const { onFinalizar } = exibirProva()
    await clicar('Finalizar')
    expect(screen.getByText(/Não foi possível finalizar o simulado: nenhuma linha atualizada/)).toBeTruthy()
    expect(onFinalizar).not.toHaveBeenCalled()

    await clicar('Finalizar')
    expect(db.finalizar).toHaveBeenCalledTimes(2)
    expect(onFinalizar).toHaveBeenCalledOnce()
  })
})

describe('caracterização da desmontagem durante o autosave', () => {
  it('cancela a edição ainda no debounce sem cancelar a escrita já iniciada', async () => {
    const primeira = Promise.withResolvers()
    db.salvar.mockReturnValueOnce(primeira.promise)
    const { unmount, onSair, onFinalizar } = exibirProva()
    await clicar(/Primeira opção/)
    await avancar(700)
    await clicar(/Segunda opção/)
    await avancar(699)

    unmount()
    await resolver(primeira)
    await avancar(1000)
    expect(db.salvar).toHaveBeenCalledExactlyOnceWith({ respostas: { 1: 'A' }, marcadas: [] }, filtros)
    expect(onSair).not.toHaveBeenCalled()
    expect(onFinalizar).not.toHaveBeenCalled()
  })

  it('envia a edição já enfileirada mesmo após desmontar a tela', async () => {
    const primeira = Promise.withResolvers()
    db.salvar.mockReturnValueOnce(primeira.promise)
    const { unmount } = exibirProva()
    await clicar(/Primeira opção/)
    await avancar(700)
    await clicar(/Segunda opção/)
    await avancar(700)
    expect(db.salvar).toHaveBeenCalledOnce()

    unmount()
    await resolver(primeira)
    expect(db.salvar).toHaveBeenNthCalledWith(2, { respostas: { 1: 'B' }, marcadas: [] }, filtros)
  })
})
