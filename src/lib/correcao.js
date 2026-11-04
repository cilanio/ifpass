// Corrige uma prova. Questão ANULADA vale ponto para todos (regra do edital).
export function corrigir(prova, respostas) {
  const porBloco = prova.blocos.map((b) => ({ nome: b.nome, cor: b.cor, acertos: 0, total: 0, brancos: 0 }))
  let acertos = 0

  const detalhes = prova.questoes.map((q) => {
    const marcada = respostas[q.n] || null
    const anulada = q.gabarito === 'NULA'
    const acertou = anulada ? true : marcada === q.gabarito
    const idx = prova.blocos.findIndex((b) => q.n >= b.de && q.n <= b.ate)
    porBloco[idx].total++
    if (acertou) {
      acertos++
      porBloco[idx].acertos++
    }
    if (!marcada && !anulada) porBloco[idx].brancos++
    return { n: q.n, marcada, gabarito: q.gabarito, anulada, acertou }
  })

  return { acertos, total: prova.questoes.length, porBloco, detalhes }
}

export function formatarTempo(segundos) {
  const s = Math.max(0, Math.round(segundos))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  const dois = (n) => String(n).padStart(2, '0')
  return `${dois(h)}:${dois(m)}:${dois(r)}`
}
