import { ASSUNTOS, assuntoDe } from '../data/assuntos'

// Junta acertos e erros por assunto, a partir dos simulados finalizados e das respostas de treino.
// Questões anuladas não entram. Questão em branco conta como não acertada.
export function porAssunto(tentativas = [], treinos = []) {
  const acc = {}
  const somar = (id, acertou) => {
    if (!ASSUNTOS[id]) return
    if (!acc[id]) acc[id] = { id, acertos: 0, total: 0 }
    acc[id].total++
    if (acertou) acc[id].acertos++
  }
  for (const t of tentativas) {
    if (t.status !== 'finalizado' || !t.resultado) continue
    for (const d of t.resultado.detalhes) {
      if (d.anulada) continue
      somar(assuntoDe(t.prova_id, d.n), d.acertou)
    }
  }
  for (const r of treinos) somar(r.assunto, r.acertou)

  return Object.values(acc)
    .map((a) => ({ ...a, nome: ASSUNTOS[a.id].nome, bloco: ASSUNTOS[a.id].bloco, pct: Math.round((100 * a.acertos) / a.total) }))
    .sort((a, b) => a.pct - b.pct || b.total - a.total)
}

export function corBarra(pct) {
  return pct < 50 ? '#b91c1c' : pct < 70 ? '#b45309' : '#15803d'
}
