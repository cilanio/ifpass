// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import AreaAutenticada from '../src/AreaAutenticada.jsx'

vi.mock('../src/Home', () => ({ default: () => <h1>Área de estudos existente</h1> }))

const db = vi.hoisted(() => ({ equipe: vi.fn(), fila: vi.fn(), questao: vi.fn(), historico: vi.fn(), rpc: vi.fn() }))
vi.mock('../src/lib/supabase', () => ({
  supabase: {
    from(tabela) {
      const filtros = {}
      const consulta = {
        select: () => consulta,
        eq(campo, valor) {
          filtros[campo] = valor
          return consulta
        },
        order: () => consulta,
        range: (inicio, fim) => db.fila(filtros, inicio, fim),
        maybeSingle() {
          return tabela === 'papeis_equipe' ? db.equipe(filtros) : db.questao(filtros)
        },
        then(resolve, reject) {
          if (tabela !== 'revisoes_questoes') throw new Error(`Consulta inesperada: ${tabela}`)
          return db.historico(filtros).then(resolve, reject)
        },
      }
      return consulta
    },
    rpc: db.rpc,
    auth: { signOut: vi.fn() },
  },
}))

const usuario = { id: 'conta-teste', user_metadata: { papel: 'administrador' } }
const questao = {
  id: 'questao-sintetica', versao: 2, disciplina: 'Matemática', assunto_id: 'm_numeros',
  status: 'em_revisao', enunciado: 'Qual é a soma de um mais um?',
  alternativas: { A: 'Um', B: 'Dois', C: 'Três', D: 'Quatro', E: 'Cinco' },
  resposta_correta: 'B',
  explicacao: { correta: 'A soma resulta em dois.', distratores: {
    A: 'Ignora a segunda parcela.', C: 'Conta uma unidade extra.',
    D: 'Dobra ambas as parcelas.', E: 'Excede a soma.',
  } },
  imagem: null,
}
const historico = {
  id: 'decisao-teste', questao_versao: 1, revisor_id: 'revisor-teste', checklist_versao: 1,
  criterios: { gabarito_incorreto: false, qualidade_explicacao: true },
  observacoes: 'Rever o texto inicial.', decisao: 'correcao_solicitada', criado_em: '2026-11-25T12:00:00Z',
}

beforeEach(() => {
  vi.resetAllMocks()
  db.equipe.mockResolvedValue({ data: { papel: 'revisor_pedagogico', ativo: true } })
  db.fila.mockResolvedValue({ data: [questao], count: 1 })
  db.questao.mockResolvedValue({ data: questao })
  db.historico.mockResolvedValue({ data: [historico] })
  db.rpc.mockResolvedValue({ data: 'decisao-nova' })
})

afterEach(cleanup)

async function abrirDetalhe() {
  const interacao = userEvent.setup()
  render(<AreaAutenticada usuario={usuario} />)
  await interacao.click(await screen.findByRole('button', { name: 'Revisar versão 2' }))
  await screen.findByRole('heading', { name: 'Gabarito B' })
  return interacao
}

function preencherChecklist() {
  const eliminatorios = within(screen.getByRole('group', { name: 'Critérios eliminatórios' })).getAllByRole('combobox')
  const qualitativos = within(screen.getByRole('group', { name: 'Critérios qualitativos' })).getAllByRole('combobox')
  expect(eliminatorios).toHaveLength(8)
  expect(qualitativos).toHaveLength(7)
  eliminatorios.forEach(campo => fireEvent.change(campo, { target: { value: 'false' } }))
  qualitativos.forEach((campo, i) => fireEvent.change(campo, { target: { value: i ? 'true' : 'false' } }))
}

it.each([
  { data: null },
  { error: { code: 'PGRST205' } },
  { error: { code: '42P01', message: 'relation "public.papeis_equipe" does not exist' } },
])('mantém a área de estudos sem atribuição de equipe confirmada (%j)', async retorno => {
  db.equipe.mockResolvedValue(retorno)
  render(<AreaAutenticada usuario={usuario} />)
  expect(await screen.findByRole('heading', { name: 'Área de estudos existente' })).toBeTruthy()
  expect(db.equipe).toHaveBeenCalledWith({ usuario_id: usuario.id })
  expect(db.fila).not.toHaveBeenCalled()
})

it('bloqueia uma conta de equipe inativa', async () => {
  db.equipe.mockResolvedValue({ data: { papel: 'revisor_pedagogico', ativo: false } })
  render(<AreaAutenticada usuario={usuario} />)
  expect((await screen.findByRole('alert')).textContent).toContain('sem acesso ativo')
  expect(db.fila).not.toHaveBeenCalled()
})

it('carrega pendentes e aplica filtros de disciplina, assunto e situação no servidor', async () => {
  const interacao = userEvent.setup()
  render(<AreaAutenticada usuario={usuario} />)
  await screen.findByRole('button', { name: 'Revisar versão 2' })
  expect(db.fila).toHaveBeenCalledWith({ status: 'em_revisao' }, 0, 19)

  await interacao.type(screen.getByLabelText('Disciplina'), 'Matemática')
  await interacao.type(screen.getByLabelText('Assunto (ID)'), 'm_numeros')
  await interacao.selectOptions(screen.getByLabelText('Situação'), 'aprovada')
  await interacao.click(screen.getByRole('button', { name: 'Filtrar' }))
  expect(db.fila).toHaveBeenLastCalledWith({
    disciplina: 'Matemática', assunto_id: 'm_numeros', status: 'aprovada',
  }, 0, 19)
})

it('mostra questão, gabarito, explicações e histórico para administrador sem botões de decisão', async () => {
  db.equipe.mockResolvedValue({ data: { papel: 'administrador', ativo: true } })
  db.questao.mockResolvedValue({ data: { ...questao, imagem: 'bucket-privado/questao.png' } })
  const interacao = await abrirDetalhe()
  expect(screen.getByText(questao.enunciado)).toBeTruthy()
  expect(screen.getByText('A soma resulta em dois.')).toBeTruthy()
  expect(screen.getByText('Ignora a segunda parcela.')).toBeTruthy()
  expect(screen.queryByRole('img')).toBeNull()
  expect(screen.queryByRole('button', { name: 'Aprovar' })).toBeNull()
  await interacao.click(screen.getByText(/Correção solicitada · Versão 1/))
  expect(screen.getByText(historico.observacoes)).toBeTruthy()
  expect(db.historico).toHaveBeenCalledWith({ questao_id: questao.id })
})

it.each([
  ['Aprovar', 'aprovada'],
  ['Solicitar correção', 'correcao_solicitada'],
  ['Rejeitar', 'rejeitada'],
])('envia %s com 15 critérios e recarrega a versão e o histórico', async (botao, decisao) => {
  const interacao = await abrirDetalhe()
  await interacao.click(screen.getByRole('button', { name: botao }))
  expect(db.rpc).not.toHaveBeenCalled()
  preencherChecklist()
  await interacao.type(screen.getByLabelText('Observações'), ' Observação sintética. ')
  db.questao.mockResolvedValue({ data: { ...questao, status: decisao === 'correcao_solicitada' ? 'rascunho' : decisao } })
  await interacao.click(screen.getByRole('button', { name: botao }))
  await screen.findByText('Decisão registrada.')
  expect(db.rpc).toHaveBeenCalledExactlyOnceWith('ifpass_revisar_questao', {
    p_id: questao.id, p_versao: 2, p_decisao: decisao, p_checklist_versao: 1,
    p_observacoes: 'Observação sintética.',
    p_criterios: {
      gabarito_incorreto: false, alternativa_correta_nao_unica: false,
      erro_conceitual_ou_matematico: false, ambiguidade: false, informacoes_insuficientes: false,
      fora_do_edital_sem_justificativa: false, explicacao_incompativel: false, reproducao_indevida: false,
      fidelidade_edital: false, correcao_cientifica_matematica_linguistica: true, clareza_precisao: true,
      qualidade_alternativas: true, adequacao_dificuldade: true, compatibilidade_copeve: true, qualidade_explicacao: true,
    },
  })
  expect(db.historico).toHaveBeenCalledTimes(2)
  expect(screen.queryByRole('button', { name: botao })).toBeNull()
})

it('recarrega a situação após concorrer com outra decisão', async () => {
  const interacao = await abrirDetalhe()
  preencherChecklist()
  db.rpc.mockResolvedValue({ error: { code: '23514', message: 'Versão fora da fila de revisão' } })
  db.questao.mockResolvedValue({ data: { ...questao, status: 'aprovada' } })
  await interacao.click(screen.getByRole('button', { name: 'Rejeitar' }))
  expect((await screen.findByRole('alert')).textContent).toContain('A situação da questão mudou')
  expect(await screen.findByRole('heading', { name: 'Versão 2 · Aprovada' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Rejeitar' })).toBeNull()
})

it('remove os dados da versão quando a permissão é revogada no servidor', async () => {
  const interacao = await abrirDetalhe()
  preencherChecklist()
  db.rpc.mockResolvedValue({ error: { code: '42501' } })
  db.questao.mockResolvedValue({ data: null })
  db.historico.mockResolvedValue({ data: [] })
  await interacao.click(screen.getByRole('button', { name: 'Aprovar' }))
  expect(await screen.findByText('Versão indisponível para esta conta.')).toBeTruthy()
  expect(screen.getByText('Sua conta não tem permissão para registrar esta decisão.')).toBeTruthy()
  expect(screen.queryByRole('heading', { name: 'Gabarito B' })).toBeNull()
})


it.each([
  ['autorização', () => db.equipe.mockResolvedValueOnce({ error: { code: '42501' } })],
  ['conexão', () => db.equipe.mockRejectedValueOnce(new Error('Conexão indisponível'))],
  ['estrutura não relacionada', () => db.equipe.mockResolvedValueOnce({
    error: { code: '42P01', message: 'relation "public.outra_tabela" does not exist' },
  })],
])('mantém a navegação bloqueada após falha de %s e permite nova tentativa', async (_caso, preparar) => {
  preparar()
  const interacao = userEvent.setup()
  render(<AreaAutenticada usuario={usuario} />)
  expect((await screen.findByRole('alert')).textContent).toContain('Não foi possível verificar')
  expect(screen.queryByRole('heading', { name: 'Área de estudos existente' })).toBeNull()
  expect(db.fila).not.toHaveBeenCalled()

  await interacao.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  expect(await screen.findByRole('heading', { name: 'Fila de questões' })).toBeTruthy()
  expect(db.equipe).toHaveBeenCalledTimes(2)
})

it('bloqueia aprovação com imagem privada e permite solicitar correção', async () => {
  const comImagem = { ...questao, imagem: 'bucket-privado/questao.png' }
  db.questao.mockResolvedValue({ data: comImagem })
  const interacao = await abrirDetalhe()
  preencherChecklist()
  expect(screen.getByText(/A aprovação exige a visualização da imagem privada/)).toBeTruthy()
  const aprovar = screen.getByRole('button', { name: 'Aprovar' })
  expect(aprovar.disabled).toBe(true)
  await interacao.click(aprovar)
  expect(db.rpc).not.toHaveBeenCalled()

  db.questao.mockResolvedValue({ data: { ...comImagem, status: 'rascunho' } })
  await interacao.click(screen.getByRole('button', { name: 'Solicitar correção' }))
  await screen.findByText('Decisão registrada.')
  expect(db.rpc).toHaveBeenCalledExactlyOnceWith('ifpass_revisar_questao',
    expect.objectContaining({ p_decisao: 'correcao_solicitada' }))
})
