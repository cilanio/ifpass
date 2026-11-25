import { catalogo, fontes } from './catalogo.js'
import { colunas, distribuicao, etapasCognitivas, manifesto, perfis } from './manifesto.js'
import { chaveSolucao, resolverEquacao } from './equacoes.js'

const letras = ['A', 'B', 'C', 'D', 'E']
const relacoes = ['explicita', 'desdobramento', 'apoio']
const texto = valor => typeof valor === 'string' && valor.trim().length > 0
const mapa = valor => valor !== null && typeof valor === 'object' && !Array.isArray(valor)
const normalizar = valor => valor.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLowerCase()
const resultado = (nome, erros) => ({ nome, status: erros.length ? 'reprovada' : 'aprovada', erros })

export function validarCatalogo(dados = catalogo) {
  if (!mapa(dados) || !Array.isArray(dados.topicos) || !dados.topicos.length) return ['Catálogo inválido']
  const erros = []
  const topicos = new Map()
  const objetivos = new Set()
  if (!Number.isSafeInteger(dados.versao) || dados.versao < 1 || !texto(dados.disciplina) || !texto(dados.assuntoId)) {
    erros.push('Identidade do catálogo inválida')
  }
  for (const t of dados.topicos) {
    if (!mapa(t) || !texto(t.id) || !texto(t.objetivoId) || !texto(t.objetivo) || !texto(t.nome)
      || topicos.has(t.id) || objetivos.has(t.objetivoId)) {
      erros.push('Identidade curricular inválida ou duplicada')
      continue
    }
    topicos.set(t.id, t)
    objetivos.add(t.objetivoId)
    if (![6, 7].includes(t.anoIntroducao) || !Array.isArray(t.anosRelacionados)
      || t.anosRelacionados.some(ano => ![7, 8, 9].includes(ano) || ano <= t.anoIntroducao)) {
      erros.push(`Anos escolares inválidos: ${t.id}`)
    }
    const preparacao = t.preparacao
    if (t.id === 'linguagem-algebrica' && (
      t.anoIntroducao !== 7 || preparacao?.ano !== 6 || !texto(preparacao.objetivo)
      || preparacao.relacao !== 'desdobramento' || preparacao.habilidadeDeApoio !== 'EF06MA14'
      || typeof preparacao.revisaoEspecializadaPendente !== 'boolean'
      || !Array.isArray(t.bncc) || !t.bncc.some(ref => ref?.codigo === 'EF07MA13' && ref.relacao === 'explicita')
    )) {
      erros.push('Preparação ou introdução formal da linguagem algébrica inválida')
    }
    if (!Array.isArray(t.edital) || !t.edital.length
      || t.edital.some(ref => !fontes.edital.itens.includes(ref?.item) || !relacoes.includes(ref?.relacao))) {
      erros.push(`Referência ao edital inválida: ${t.id}`)
    }
    if (!Array.isArray(t.bncc) || !t.bncc.length || t.bncc.some(ref =>
      !Object.hasOwn(fontes.bncc.habilidades, ref?.codigo) || !relacoes.includes(ref?.relacao)
        || typeof ref.revisaoEspecializadaPendente !== 'boolean')) {
      erros.push(`Referência BNCC inválida: ${t.id}`)
    }
  }

  const visitando = new Set()
  const visitados = new Set()
  function visitar(id) {
    if (visitando.has(id)) {
      erros.push(`Pré-requisito cíclico: ${id}`)
      return
    }
    if (visitados.has(id)) return
    visitando.add(id)
    const { preRequisitos } = topicos.get(id)
    if (!Array.isArray(preRequisitos)) erros.push(`Pré-requisitos inválidos: ${id}`)
    for (const requisito of Array.isArray(preRequisitos) ? preRequisitos : []) {
      if (!topicos.has(requisito)) erros.push(`Pré-requisito inexistente: ${id}`)
      else visitar(requisito)
    }
    visitando.delete(id)
    visitados.add(id)
  }
  for (const id of topicos.keys()) visitar(id)
  return erros
}

export function validarManifesto(lote = manifesto, curriculo = catalogo) {
  const erros = validarCatalogo(curriculo)
  if (!mapa(lote) || !Array.isArray(lote.itens)) return [...erros, 'Manifesto inválido']
  if (lote.catalogoVersao !== curriculo?.versao || !texto(lote.id) || !Number.isSafeInteger(lote.versao)
    || lote.versao < 1 || lote.itens.length !== 20) erros.push('Identidade, versão ou tamanho do lote inválido')
  const topicos = new Map((Array.isArray(curriculo?.topicos) ? curriculo.topicos : []).filter(mapa).map(t => [t.id, t]))
  const ids = new Set()
  const contagem = Object.fromEntries(Object.keys(distribuicao).map(id => [id, [0, 0, 0, 0, 0, 0]]))
  const dificuldade = { facil: 0, media: 0, dificil: 0 }
  for (const item of lote.itens) {
    const topico = topicos.get(item?.topicoId)
    const coluna = colunas.indexOf(item?.perfil === 'aprendizagem' ? item.etapa : item?.perfil)
    if (!mapa(item) || !texto(item.id) || ids.has(item.id) || !topico || topico.objetivoId !== item.objetivoId
      || !texto(item.objetivoEspecifico) || !Object.hasOwn(contagem, item.topicoId)
      || !Object.hasOwn(perfis, item.perfil) || perfis[item.perfil].versao !== item.perfilVersao
      || !etapasCognitivas.includes(item.etapa)
      || !Object.hasOwn(dificuldade, item.dificuldade)) {
      erros.push('Posição inválida ou duplicada no manifesto')
      continue
    }
    ids.add(item.id)
    contagem[item.topicoId][coluna]++
    dificuldade[item.dificuldade]++
  }
  for (const [id, esperado] of Object.entries(distribuicao)) {
    if (esperado.some((n, indice) => contagem[id][indice] !== n)) erros.push(`Cobertura divergente: ${id}`)
  }
  if (dificuldade.facil !== 6 || dificuldade.media !== 10 || dificuldade.dificil !== 4) {
    erros.push('Distribuição de dificuldades divergente')
  }
  return erros
}

export function validarSaida(saida, lote = manifesto, curriculo = catalogo) {
  const estrutura = []
  const curricular = []
  const proveniencia = saida?.proveniencia
  if (!mapa(saida) || saida.contratoVersao !== 1
    || !Number.isSafeInteger(saida.revisao) || saida.revisao < 1 || !texto(saida.enunciado)
    || (saida.texto !== undefined && !texto(saida.texto)) || saida.imagem != null
    || !mapa(proveniencia) || !texto(proveniencia.modelo) || !texto(proveniencia.instrucoesVersao)
    || !texto(proveniencia.geradoEm) || !Number.isFinite(Date.parse(proveniencia.geradoEm))
    || !Array.isArray(proveniencia.referencias) || !proveniencia.referencias.length
    || !proveniencia.referencias.every(texto)) estrutura.push('Estrutura ou proveniência inválida')

  const alternativas = saida?.alternativas
  if (!mapa(alternativas) || Object.keys(alternativas).length !== letras.length
    || !letras.every(letra => Object.hasOwn(alternativas, letra) && texto(alternativas[letra]))) {
    estrutura.push('São necessárias cinco alternativas de A a E')
  } else if (new Set(letras.map(letra => normalizar(alternativas[letra]))).size !== letras.length) {
    estrutura.push('Alternativas duplicadas')
  }

  const gabarito = saida?.resposta_correta
  const distratores = saida?.explicacao?.distratores
  if (!letras.includes(gabarito) || !texto(saida?.explicacao?.correta) || !mapa(distratores)
    || Object.keys(distratores).length !== 4
    || !letras.filter(letra => letra !== gabarito).every(letra => Object.hasOwn(distratores, letra) && texto(distratores[letra]))) {
    estrutura.push('Gabarito ou explicações inválidos')
  }

  const posicao = lote.itens?.find(item => item.id === saida?.posicaoId)
  const topico = curriculo.topicos?.find(item => item.id === posicao?.topicoId)
  if (!posicao || !topico || topico.objetivoId !== posicao.objetivoId
    || saida.loteId !== lote.id || saida.loteVersao !== lote.versao || saida.catalogoVersao !== curriculo.versao
    || saida.perfilVersao !== posicao.perfilVersao || saida.topico_id !== posicao.topicoId
    || saida.objetivoId !== posicao.objetivoId || saida.assunto_id !== curriculo.assuntoId
    || saida.disciplina !== curriculo.disciplina || !etapasCognitivas.includes(saida.etapa) || saida.etapa !== posicao.etapa
    || saida.dificuldade !== posicao.dificuldade || saida.finalidade !== perfis[posicao.perfil]?.finalidade
    || saida.desafio_copeve !== (posicao.perfil === 'desafio')
    || proveniencia?.editalVersao !== fontes.edital.versao || proveniencia?.bnccVersao !== fontes.bncc.versao) {
    curricular.push('Versão ou referência curricular incompatível com o manifesto')
  }

  let matematica = { nome: 'matematica-exata', status: 'pendente', motivo: 'Sem representação linear aplicável' }
  if (saida?.matematica != null) {
    try {
      const { equacao, solucoes } = saida.matematica
      if (!mapa(solucoes) || Object.keys(solucoes).length !== 5 || !letras.every(letra => Object.hasOwn(solucoes, letra))) {
        throw new TypeError('Soluções estruturadas inválidas')
      }
      const esperada = chaveSolucao(resolverEquacao(equacao))
      const chaves = letras.map(letra => chaveSolucao(solucoes[letra]))
      const erros = []
      if (new Set(chaves).size !== letras.length) erros.push('Alternativas matematicamente equivalentes')
      if (chaves[letras.indexOf(gabarito)] !== esperada) erros.push('Gabarito matemático incorreto')
      matematica = resultado('matematica-exata', erros)
    } catch {
      matematica = resultado('matematica-exata', ['Representação matemática inválida ou não suportada'])
    }
  }
  return [
    resultado('estrutura', estrutura), resultado('curriculo', curricular), matematica,
    { nome: 'fidelidade-ao-enunciado', status: 'pendente', motivo: 'Conferir texto, domínio e alternativas por resolução independente' },
    { nome: 'qualidade-pedagogica', status: 'pendente', motivo: 'Aplicar a matriz e obter revisão humana' },
  ]
}

export function validarLote(saidas, oficiais = []) {
  const erros = validarManifesto()
  if (!Array.isArray(saidas) || !Array.isArray(oficiais)) return { cobertura: resultado('cobertura', ['Lote inválido']), itens: [] }
  const ids = new Set()
  const catalogoOficial = oficiais.filter(q => texto(q?.enunciado))
  const chaves = new Set(catalogoOficial.map(chaveQuestao))
  const duplicatas = []
  const itens = saidas.map(saida => {
    if (ids.has(saida?.posicaoId)) erros.push('Posição repetida na saída')
    ids.add(saida?.posicaoId)
    if (texto(saida?.enunciado)) {
      const chave = chaveQuestao(saida)
      if (chaves.has(chave)) duplicatas.push(`Questão duplicada: ${saida.posicaoId}`)
      chaves.add(chave)
    }
    return { posicaoId: saida?.posicaoId, verificacoes: validarSaida(saida) }
  })
  if (ids.size !== manifesto.itens.length || manifesto.itens.some(item => !ids.has(item.id))) {
    erros.push('Cobertura insuficiente ou posições desconhecidas')
  }
  return {
    cobertura: resultado('cobertura', erros),
    duplicidade: resultado('duplicidade-exata', duplicatas),
    oficiaisComparadas: catalogoOficial.length,
    comparacaoComOficiais: catalogoOficial.length ? 'executada' : 'pendente',
    similaridade: { status: 'pendente', motivo: 'Triagem de paráfrases e diversidade pedagógica' },
    itens,
  }
}

function chaveQuestao(questao) {
  const alternativas = Object.values(questao.alternativas ?? {}).filter(texto).map(normalizar).sort()
  return JSON.stringify([normalizar(texto(questao.texto) ? questao.texto : ''), normalizar(questao.enunciado), alternativas])
}
