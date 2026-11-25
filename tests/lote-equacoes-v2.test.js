import { expect, it } from 'vitest'
import originais from '../piloto/lote-equacoes-v2/geracao/originais.json'
import correcoes from '../piloto/lote-equacoes-v2/geracao/correcoes.json'
import pacoteCego from '../piloto/lote-equacoes-v2/resolucao-independente/questoes.json'
import resultados from '../piloto/lote-equacoes-v2/validacao/resultados.json'
import dossies from '../piloto/lote-equacoes-v2/revisao/dossies.json'
import { PROVAS } from '../src/data/provas.js'
import { entradaResolucaoIndependente } from '../piloto/registro.js'
import { validarLote } from '../piloto/validacao.js'

const atuais = originais.map(q => correcoes.find(c => c.posicaoId === q.posicaoId)?.item ?? q)

it('reproduz os resultados determinísticos e preserva as 20 versões originais', () => {
  const oficiais = PROVAS.flatMap(prova => prova.questoes)
  expect(originais).toHaveLength(20)
  expect(originais.every(q => q.revisao === 1)).toBe(true)
  for (const { posicaoId, tentativa, revisaoAnterior, item } of correcoes) {
    expect(originais.some(q => q.posicaoId === posicaoId && q.revisao === revisaoAnterior)).toBe(true)
    expect(item.posicaoId).toBe(posicaoId)
    expect(item.revisao).toBe(revisaoAnterior + tentativa)
    expect(tentativa).toBeLessThanOrEqual(2)
  }
  expect(validarLote(originais, oficiais)).toEqual(resultados.antes)
  expect(validarLote(atuais, oficiais)).toEqual(resultados.depois)
  expect(resultados.depois.cobertura.status).toBe('aprovada')
  expect(resultados.depois.duplicidade.status).toBe('aprovada')
  expect(resultados.depois.itens.every(i => i.verificacoes.every(v => v.status !== 'reprovada'))).toBe(true)
})

it('separa o pacote cego e mantém as decisões pedagógicas pendentes', () => {
  expect(pacoteCego).toEqual(atuais.map(entradaResolucaoIndependente))
  expect(dossies).toHaveLength(20)
  for (const dossie of dossies) {
    expect(dossie.estadoEditorial).toBe('aguardando_revisao')
    expect(dossie.resolucaoIndependente).toBeNull()
    expect(dossie.revisaoHumana).toBeNull()
  }
})
