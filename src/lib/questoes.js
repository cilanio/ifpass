import { assuntoDe } from '../data/assuntos'
import { TODAS_LETRAS } from '../data/letras-todas'

export function adaptarQuestaoOficial(prova, questao) {
  const bloco = prova.blocos.find(({ de, ate }) => questao.n >= de && questao.n <= ate)
  const complemento = TODAS_LETRAS[prova.id]?.[questao.n]
  let enunciado = questao.enunciado
  for (const trecho of complemento?.trechos ?? []) {
    if (trecho?.trim()) enunciado = enunciado.replace('[trecho da letra]', trecho.trim())
  }

  return {
    id: `oficial:${prova.id}:${questao.n}`,
    origem: 'oficial',
    versao: null,
    provaId: prova.id,
    n: questao.n,
    disciplina: bloco.nome,
    assuntoId: assuntoDe(prova.id, questao.n) ?? null,
    topicoId: null,
    etapa: null,
    habilidadePrincipal: null,
    habilidadesSecundarias: null,
    dificuldade: null,
    tituloTexto: questao.tituloTexto ?? null,
    texto: complemento?.texto?.trim() || questao.texto || null,
    enunciado,
    imagem: questao.imagem ? `/provas/${prova.id}/${questao.imagem}` : null,
    alternativas: questao.alternativas,
    gabarito: questao.gabarito,
    explicacao: null,
    status: null,
    cor: bloco.cor,
  }
}

export function adaptarQuestaoAutoral(registro) {
  return {
    id: `ia:${registro.id}`,
    origem: 'ia',
    versao: registro.versao,
    provaId: null,
    n: null,
    disciplina: registro.disciplina,
    assuntoId: registro.assunto_id,
    topicoId: registro.topico_id ?? null,
    etapa: registro.etapa,
    habilidadePrincipal: registro.habilidade_principal,
    habilidadesSecundarias: registro.habilidades_secundarias,
    dificuldade: registro.dificuldade,
    tituloTexto: registro.titulo_texto ?? null,
    texto: registro.texto ?? null,
    enunciado: registro.enunciado,
    imagem: registro.imagem ?? null,
    alternativas: registro.alternativas,
    gabarito: registro.resposta_correta,
    explicacao: registro.explicacao,
    status: registro.status,
    cor: null,
  }
}
