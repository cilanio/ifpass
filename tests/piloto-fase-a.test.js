import { describe, expect, it } from 'vitest'
import { catalogo, fontes } from '../piloto/catalogo.js'
import { entradasDoLote, manifesto } from '../piloto/manifesto.js'
import { resolverEquacao } from '../piloto/equacoes.js'
import { entradaResolucaoIndependente, registrarValidacao } from '../piloto/registro.js'
import { validarCatalogo, validarLote, validarManifesto, validarSaida } from '../piloto/validacao.js'

function exemplo(entrada = entradasDoLote()[7]) {
  const { lote, posicao, perfil, disciplina, assuntoId, catalogoVersao } = entrada
  return {
    contratoVersao: 1, loteId: lote.id, loteVersao: lote.versao, catalogoVersao,
    posicaoId: posicao.id, revisao: 1, perfilVersao: perfil.versao, disciplina,
    assunto_id: assuntoId, topico_id: posicao.topicoId, objetivoId: posicao.objetivoId,
    etapa: posicao.etapa, dificuldade: posicao.dificuldade, finalidade: perfil.finalidade,
    desafio_copeve: posicao.perfil === 'desafio',
    enunciado: 'Fixture sintética para validar o contrato.',
    alternativas: { A: '1/3', B: '1', C: '2', D: '3', E: '4' },
    resposta_correta: 'A',
    explicacao: { correta: 'Texto sintético', distratores: { B: 'B', C: 'C', D: 'D', E: 'E' } },
    proveniencia: {
      modelo: 'fixture', instrucoesVersao: '1', geradoEm: '2026-11-25T12:00:00Z',
      referencias: ['fixture'], editalVersao: fontes.edital.versao, bnccVersao: fontes.bncc.versao,
    },
    matematica: {
      equacao: { a: '3', b: '0', c: '0', d: '1', dominio: 'Q' },
      solucoes: Object.fromEntries(['1/3', '1', '2', '3', '4'].map((valor, indice) =>
        ['ABCDE'[indice], { tipo: 'unica', valor }])),
    },
  }
}

const verificacao = (saida, nome) => validarSaida(saida).find(item => item.nome === nome)

describe('catálogo e manifesto', () => {
  it('confere o catálogo, a distribuição e os casos especiais restritos à aprendizagem', () => {
    expect(validarCatalogo()).toEqual([])
    expect(validarManifesto()).toEqual([])
    expect(entradasDoLote()).toHaveLength(20)
    expect(manifesto.itens.filter(i => i.topicoId === 'casos-especiais').map(i => i.perfil))
      .toEqual(['aprendizagem', 'aprendizagem'])
  })

  it('distingue preparação no 6º da referência formal EF07MA13 no 7º', () => {
    const topico = catalogo.topicos.find(t => t.id === 'linguagem-algebrica')
    expect(topico).toMatchObject({
      anoIntroducao: 7,
      preparacao: { ano: 6, habilidadeDeApoio: 'EF06MA14', revisaoEspecializadaPendente: true },
      bncc: [{ codigo: 'EF07MA13', relacao: 'explicita' }],
    })
    const invalido = structuredClone(catalogo)
    invalido.topicos[0].anoIntroducao = 6
    expect(validarCatalogo(invalido)).toContain('Preparação ou introdução formal da linguagem algébrica inválida')
  })

  it('valida etapa cognitiva de desafios e avaliações sem misturá-los à contagem da aprendizagem', () => {
    const entradas = entradasDoLote().filter(e => e.posicao.perfil !== 'aprendizagem')
    expect(entradas.map(e => [e.posicao.perfil, e.perfil.finalidade, e.posicao.etapa])).toEqual([
      ['avaliacao', 'avaliacao', 'aplicacao'],
      ['desafio', 'aprendizagem', 'analise'],
      ['desafio', 'aprendizagem', 'analise'],
      ['avaliacao', 'avaliacao', 'aplicacao'],
    ])
    for (const entrada of entradas) {
      const saida = exemplo(entrada)
      expect(verificacao(saida, 'curriculo').status).toBe('aprovada')
      expect(verificacao({ ...saida, etapa: null }, 'curriculo').status).toBe('reprovada')
      expect(verificacao({ ...saida, etapa: entrada.posicao.perfil }, 'curriculo').status).toBe('reprovada')
    }
    const invalido = structuredClone(manifesto)
    invalido.itens.find(i => i.perfil === 'desafio').etapa = null
    expect(validarManifesto(invalido)).toContain('Posição inválida ou duplicada no manifesto')
  })

  it('identifica referências inexistentes e ciclo indireto', () => {
    const invalido = structuredClone(catalogo)
    invalido.topicos[0].preRequisitos.push('conceito', 'inexistente')
    invalido.topicos[0].bncc[0].codigo = 'EF99MA00'
    invalido.topicos[0].edital[0].item = 99
    expect(validarCatalogo(invalido).join(' ')).toMatch(/edital inválida.*BNCC inválida.*cíclico.*inexistente/)
    expect(validarManifesto({ ...manifesto, itens: manifesto.itens.slice(1) }).join(' ')).toContain('Cobertura')
  })

  it('valida tipos de entrada e rejeita versões incompatíveis', () => {
    expect(validarCatalogo(null)).toEqual(['Catálogo inválido'])
    expect(validarManifesto(null)).toContain('Manifesto inválido')
    expect(verificacao(null, 'estrutura').status).toBe('reprovada')
    expect(verificacao({ ...exemplo(), perfilVersao: 999 }, 'curriculo').status).toBe('reprovada')
  })
})

describe('validação de candidatos', () => {
  it('detecta alternativas textuais e matemáticas duplicadas', () => {
    const saida = exemplo()
    saida.alternativas.B = ' 1/3 '
    saida.matematica.solucoes.B.valor = '2/6'
    expect(verificacao(saida, 'estrutura').erros).toContain('Alternativas duplicadas')
    expect(verificacao(saida, 'matematica-exata').erros).toContain('Alternativas matematicamente equivalentes')
  })

  it('detecta gabarito incorreto sem arredondar coeficientes', () => {
    const saida = exemplo()
    expect(verificacao(saida, 'matematica-exata').status).toBe('aprovada')
    saida.resposta_correta = 'E'
    expect(verificacao(saida, 'matematica-exata').erros).toContain('Gabarito matemático incorreto')
    expect(resolverEquacao({ a: '1/2', b: '0', c: '1/3', d: '-1/7', dominio: 'R' }))
      .toEqual({ tipo: 'unica', valor: '-6/7' })
  })

  it('distingue identidade, contradição e domínio não suportado', () => {
    const eq = { a: '1/2', b: '1', c: '2/4', d: '1', dominio: 'Q' }
    expect(resolverEquacao(eq)).toEqual({ tipo: 'todas' })
    expect(resolverEquacao({ ...eq, d: '0' })).toEqual({ tipo: 'nenhuma' })
    expect(() => resolverEquacao({ ...eq, dominio: 'Z' })).toThrow('Domínio')
    expect(() => resolverEquacao({ ...eq, d: '1/0' })).toThrow('Denominador')
  })

  it('detecta cobertura incompleta e duplicidade com alternativas reordenadas', () => {
    const saida = exemplo()
    const lote = validarLote([saida], [{ ...saida, alternativas: { ...saida.alternativas, A: '1', B: '1/3' } }])
    expect(lote.cobertura.status).toBe('reprovada')
    expect(lote.duplicidade.status).toBe('reprovada')
    expect(lote.oficiaisComparadas).toBe(1)
  })

  it('reconhece cobertura completa e duplicatas internas por conteúdo', () => {
    const saidas = entradasDoLote().map(exemplo)
    expect(validarLote(saidas).cobertura.status).toBe('aprovada')
    expect(validarLote(saidas).duplicidade.erros).toHaveLength(19)
  })

  it('prepara resolução sem gabarito e registra etapas ainda pendentes', () => {
    const saida = { ...exemplo(), matematica: undefined }
    const cega = entradaResolucaoIndependente(saida)
    expect(Object.keys(cega).sort()).toEqual([
      'alternativas', 'contratoVersao', 'enunciado', 'loteId', 'loteVersao', 'posicaoId', 'revisao',
    ])
    expect(registrarValidacao(saida)).toMatchObject({ resolucaoIndependente: null, revisaoHumana: null })
    expect(verificacao(saida, 'matematica-exata').status).toBe('pendente')
    expect(verificacao(saida, 'fidelidade-ao-enunciado').status).toBe('pendente')
  })
})
