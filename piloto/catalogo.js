export const fontes = {
  edital: {
    versao: 'IFAL-44-2026-2026-11-10',
    pagina: 18,
    itens: [1, 2, 5, 6, 8, 12, 13],
  },
  bncc: {
    versao: 'MEC-EI-EF-2018-05-11',
    habilidades: {
      EF06MA14: 303, EF07MA12: 307, EF07MA13: 307, EF07MA16: 307, EF07MA18: 307,
    },
  },
}

export const catalogo = {
  versao: 2,
  disciplina: 'Matemática',
  assuntoId: 'm_equacoes1',
  topicos: [
    ['linguagem-algebrica', 'Linguagem algébrica', 7, [], [6, 8, 12],
      [['EF07MA13', 'explicita']], 'Interpretar letras, termos e coeficientes e distinguir variável de incógnita.'],
    ['igualdade', 'Propriedades da igualdade', 6, [], [6],
      [['EF06MA14', 'explicita']], 'Preservar a igualdade ao aplicar operações aos dois membros.'],
    ['conceito', 'Conceito de equação', 7, ['linguagem-algebrica', 'igualdade'], [6],
      [['EF07MA18', 'desdobramento'], ['EF06MA14', 'apoio']], 'Identificar membros, incógnita e solução.'],
    ['simples', 'Equações simples', 7, ['conceito'], [6],
      [['EF07MA18', 'desdobramento']], 'Isolar a incógnita e conferir a solução por substituição.'],
    ['dois-membros', 'Incógnitas nos dois membros', 7, ['simples'], [6],
      [['EF07MA18', 'desdobramento']], 'Reunir termos da incógnita preservando equivalência.'],
    ['parenteses', 'Equações com parênteses', 7, ['simples'], [6, 13],
      [['EF07MA18', 'desdobramento'], ['EF07MA16', 'apoio']], 'Aplicar distributividade e reduzir a equação.'],
    ['fracoes', 'Equações com frações', 7, ['simples'], [6, 1, 2],
      [['EF07MA18', 'desdobramento'], ['EF07MA12', 'apoio']], 'Operar com coeficientes racionais e denominadores numéricos não nulos.'],
    ['casos-especiais', 'Casos especiais', 7, ['dois-membros'], [6],
      [['EF07MA18', 'apoio'], ['EF06MA14', 'apoio']], 'Distinguir identidade de contradição no domínio declarado.'],
    ['modelagem', 'Modelagem matemática', 7, ['linguagem-algebrica', 'simples'], [8],
      [['EF07MA18', 'explicita']], 'Escolher a incógnita e representar relações por uma equação.'],
    ['problemas', 'Problemas contextualizados', 7, ['modelagem'], [8],
      [['EF07MA18', 'explicita']], 'Resolver e interpretar a solução considerando domínio e unidade.'],
  ].map(([id, nome, anoIntroducao, preRequisitos, itens, habilidades, objetivo]) => ({
    id, nome, objetivoId: `${id}-01`, objetivo, anoIntroducao,
    anosRelacionados: anoIntroducao === 6 ? [7, 8, 9] : [8, 9],
    preRequisitos,
    ...(id === 'linguagem-algebrica' ? {
      preparacao: {
        ano: 6,
        objetivo: 'Interpretar símbolos e determinar valores desconhecidos em igualdades simples.',
        relacao: 'desdobramento',
        habilidadeDeApoio: 'EF06MA14',
        revisaoEspecializadaPendente: true,
      },
    } : {}),
    edital: itens.map((item, indice) => ({
      item,
      relacao: indice > 0 || ['linguagem-algebrica', 'igualdade'].includes(id)
        ? 'apoio' : ['modelagem', 'problemas'].includes(id) ? 'explicita' : 'desdobramento',
    })),
    bncc: habilidades.map(([codigo, relacao]) => ({
      codigo, relacao,
      revisaoEspecializadaPendente: id === 'casos-especiais'
        || (id === 'parenteses' && codigo === 'EF07MA16'),
    })),
  })),
}
