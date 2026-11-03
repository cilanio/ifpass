export const PALETA = [
  '#1D4ED8', // azul
  '#C2410C', // laranja
  '#15803D', // verde
  '#7E22CE', // roxo
  '#BE185D', // rosa
  '#0F766E', // turquesa
  '#B91C1C', // vermelho
  '#A16207', // amarelo escuro
]

export const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

// Ordem de exibição: começa na segunda-feira
export const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0]

export function dataLocal(d = new Date()) {
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

export function horaCurta(h) {
  return h.slice(0, 5)
}

// Conta quantos dias seguidos (até hoje ou ontem) têm pelo menos um estudo feito
export function calcularSequencia(datas) {
  const conjunto = new Set(datas)
  const dia = new Date()
  if (!conjunto.has(dataLocal(dia))) dia.setDate(dia.getDate() - 1)
  let total = 0
  while (conjunto.has(dataLocal(dia))) {
    total++
    dia.setDate(dia.getDate() - 1)
  }
  return total
}