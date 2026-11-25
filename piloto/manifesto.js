import { catalogo, fontes } from './catalogo.js'

export const perfis = {
  aprendizagem: { versao: 1, finalidade: 'aprendizagem', instrucoes: 'Avaliar um objetivo cognitivo com explicação formativa.' },
  desafio: { versao: 1, finalidade: 'aprendizagem', instrucoes: 'Aplicar o objetivo em desafio complementar inspirado em características verificáveis da COPEVE.' },
  avaliacao: { versao: 1, finalidade: 'avaliacao', instrucoes: 'Avaliar de forma autônoma, priorizando diversidade e escopo do edital.' },
}

export const distribuicao = {
  'linguagem-algebrica': [2, 1, 0, 0, 0, 0],
  igualdade: [1, 1, 0, 0, 0, 0],
  conceito: [1, 1, 0, 0, 0, 0],
  simples: [0, 0, 1, 0, 0, 0],
  'dois-membros': [0, 0, 1, 0, 0, 1],
  parenteses: [0, 0, 1, 0, 1, 0],
  fracoes: [0, 0, 1, 0, 0, 0],
  'casos-especiais': [0, 1, 0, 1, 0, 0],
  modelagem: [0, 0, 0, 1, 0, 0],
  problemas: [0, 0, 0, 2, 1, 1],
}

export const colunas = ['fundamentos', 'compreensao', 'aplicacao', 'analise', 'desafio', 'avaliacao']

const posicoes = [
  ['linguagem-algebrica', 'fundamentos', 'facil', 'Reconhecer o coeficiente de um termo.'],
  ['linguagem-algebrica', 'fundamentos', 'facil', 'Identificar termos em uma expressão.'],
  ['linguagem-algebrica', 'compreensao', 'media', 'Distinguir variável de incógnita conforme o contexto.'],
  ['igualdade', 'fundamentos', 'facil', 'Reconhecer uma operação que conserva a igualdade.'],
  ['igualdade', 'compreensao', 'facil', 'Explicar por que a mesma operação deve incidir nos dois membros.'],
  ['conceito', 'fundamentos', 'facil', 'Localizar os membros e a incógnita.'],
  ['conceito', 'compreensao', 'facil', 'Interpretar o significado de uma solução por substituição.'],
  ['simples', 'aplicacao', 'media', 'Isolar a incógnita usando operações inversas.'],
  ['dois-membros', 'aplicacao', 'media', 'Agrupar termos da incógnita antes de isolar.'],
  ['dois-membros', 'avaliacao', 'media', 'Resolver uma equação com incógnita nos dois membros.'],
  ['parenteses', 'aplicacao', 'media', 'Aplicar distributividade antes de simplificar.'],
  ['parenteses', 'desafio', 'dificil', 'Combinar distributividade e cancelamento de termos sob restrições do problema.'],
  ['fracoes', 'aplicacao', 'media', 'Resolver com denominadores numéricos distintos.'],
  ['casos-especiais', 'compreensao', 'media', 'Interpretar uma igualdade verdadeira para todo valor do domínio.'],
  ['casos-especiais', 'analise', 'dificil', 'Justificar a ausência de solução após o cancelamento da incógnita.'],
  ['modelagem', 'analise', 'media', 'Comparar modelos algébricos para uma situação.'],
  ['problemas', 'analise', 'media', 'Interpretar a solução em sua unidade original.'],
  ['problemas', 'analise', 'dificil', 'Avaliar se a solução algébrica respeita o domínio contextual.'],
  ['problemas', 'desafio', 'dificil', 'Integrar restrições do contexto e conferir a resposta obtida.'],
  ['problemas', 'avaliacao', 'media', 'Resolver e interpretar uma situação inédita em uma incógnita.'],
]

export const manifesto = {
  id: 'equacoes-primeiro-grau',
  versao: 1,
  catalogoVersao: catalogo.versao,
  itens: posicoes.map(([topicoId, coluna, dificuldade, objetivoEspecifico], indice) => {
    const perfil = colunas.indexOf(coluna) < 4 ? 'aprendizagem' : coluna
    return {
      id: `epg-${String(indice + 1).padStart(2, '0')}`,
      topicoId, objetivoId: `${topicoId}-01`, objetivoEspecifico, dificuldade,
      etapa: perfil === 'aprendizagem' ? coluna : null,
      perfil, perfilVersao: perfis[perfil].versao,
    }
  }),
}

export function entradasDoLote() {
  return manifesto.itens.map(posicao => ({
    contratoVersao: 1,
    lote: { id: manifesto.id, versao: manifesto.versao },
    catalogoVersao: catalogo.versao,
    disciplina: catalogo.disciplina,
    assuntoId: catalogo.assuntoId,
    posicao: structuredClone(posicao),
    topico: structuredClone(catalogo.topicos.find(t => t.id === posicao.topicoId)),
    fontes: structuredClone(fontes),
    perfil: { ...perfis[posicao.perfil] },
  }))
}
