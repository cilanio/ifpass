// Os coeficientes são strings inteiras ou frações. BigInt evita arredondamento.
export function racional(valor) {
  if (typeof valor !== 'string' || !/^-?\d+(?:\/\d+)?$/.test(valor) || valor.length > 128) {
    throw new TypeError('Racional inválido')
  }
  const [n, d = 1n] = valor.split('/').map(BigInt)
  if (d === 0n) throw new RangeError('Denominador nulo')
  return [n, d]
}

function subtrair([a, b], [c, d]) {
  return [a * d - b * c, b * d]
}

function simplificar(n, d) {
  if (d < 0n) return simplificar(-n, -d)
  let a = n < 0n ? -n : n
  let b = d
  while (b !== 0n) [a, b] = [b, a % b]
  return d === a ? String(n / a) : `${n / a}/${d / a}`
}

export function resolverEquacao({ a, b, c, d, dominio }) {
  if (!['Q', 'R'].includes(dominio)) throw new TypeError('Domínio matemático não suportado')
  const [coef, dc] = subtrair(racional(a), racional(c))
  const [constante, dk] = subtrair(racional(d), racional(b))
  if (coef === 0n) return { tipo: constante === 0n ? 'todas' : 'nenhuma' }
  return { tipo: 'unica', valor: simplificar(constante * dc, dk * coef) }
}

export function chaveSolucao(solucao) {
  if (solucao?.tipo === 'unica') return simplificar(...racional(solucao.valor))
  if (['todas', 'nenhuma'].includes(solucao?.tipo) && solucao.valor === undefined) return solucao.tipo
  throw new TypeError('Solução declarada inválida')
}
