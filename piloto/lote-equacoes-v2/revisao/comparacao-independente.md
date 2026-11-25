# Comparação pós-resolução independente

Base do PR #19: `a5517a74d4371fb400722439b80b5f6bacdc73d5`. Confronto feito após o fechamento da [resolução independente](resolucao-independente-equacoes-v2.md), incorporada byte a byte (SHA-256 `11913790b231415fd7b3d5765564f660375dd1682eb6fffb15f5acb6eca5854b`).

Conferi, nas 20 posições, a identidade de revisão, enunciado e alternativas do pacote cego com os itens efetivos. Comparei os resultados com a chave e a explicação da versão correspondente e revisei as justificativas dos distratores. A coluna «Gerado r1» preserva a leitura histórica de [originais.json](../geracao/originais.json). A coluna «Gerado vigente» incorpora as revisões já registradas em [correcoes.json](../geracao/correcoes.json).

| Questão | Revisão avaliada | Gerado r1 | Gerado vigente | Independente | Comparação |
|---|---:|---|---|---|---|
| epg-01 | 1 | B | B | B | Concordância |
| epg-02 | 1 | D | D | D | Concordância |
| epg-03 | 1 | A | A | A | Concordância |
| epg-04 | 1 | E | E | E | Concordância |
| epg-05 | 1 | B | B | B | Concordância |
| epg-06 | 1 | C | C | C | Concordância |
| epg-07 | 1 | D | D | D | Concordância |
| epg-08 | 1 | E | E | E | Concordância |
| epg-09 | 1 | A | A | A | Concordância |
| epg-10 | 1 | C | C | C | Concordância |
| epg-11 | 1 | B | B | B | Concordância |
| epg-12 | 2 | E | A | A | Concordância em r2. Em r1, nenhuma alternativa satisfazia as condições. |
| epg-13 | 1 | D | D | D | Concordância |
| epg-14 | 1 | B | B | B | Concordância |
| epg-15 | 1 | E | E | E | Concordância |
| epg-16 | 1 | A | A | Sem marcação | A coincide como modelo formal. A situação é impossível. |
| epg-17 | 1 | C | C | C | Concordância |
| epg-18 | 1 | D | D | D | Concordância |
| epg-19 | 2 | B | C | C | Concordância em r2. A r1 era outro problema, com chave B. |
| epg-20 | 1 | E | E | E | Concordância |

**Resultado vigente:** 19 concordâncias integrais e uma divergência de classificação, na epg-16. Há concordância formal com a expressão da alternativa A nesse item. As diferenças históricas E→A e B→C decorrem de revisões de conteúdo. A comparação por versão evita tratá-las como erros de transcrição da chave.

## epg-16, revisão 1

- **Erro conceitual ou matemático — presente e eliminatório.** Contagens de livros exigem inteiros. A equação formal é `x + (2x + 8) = 46`, equivalente a `3x = 38`. Portanto, as quantidades inteiras narradas como realizadas não existem. A explicação gerada deduz o modelo corretamente e omite o teste de viabilidade.
- **Gabarito incorreto ou nenhuma alternativa correta.** Para o comando literal de selecionar um modelo, A é a única opção correta e o critério de unicidade é atendido. Para a situação como problema contextual válido, nenhuma opção registra a impossibilidade. O enquadramento eliminatório principal é o erro matemático do cenário.
- Os dados bastam para provar a impossibilidade. Não há evidência de duas alternativas corretas, ambiguidade que impeça identificar o modelo, insuficiência de informações ou conteúdo fora do escopo catalogado. A explicação é compatível com A na leitura formal e incompleta para o contexto. A análise de reprodução consta do relatório de similaridade. [Matriz pedagógica, critérios eliminatórios](../../../docs/MATRIZ_PEDAGOGICA.md)

## Outros achados

- **epg-08 r1, distrator D.** «Divisão por 2 com sinal trocado» é impreciso. A partir de `−4x = −12`, dividir o lado direito por 2 já produz −6. O erro de sinal adicional não explica esse valor.
- **epg-10 r1, distratores D e E.** O 21 vem de `9 − (−12)`, ou `9 + 12`. A justificativa de 4 como «diferença inadequada entre constantes e coeficientes» deixa a operação indeterminada. A chave C e sua dedução estão corretas.
- **epg-12 r1, falha histórica.** A igualdade exige `n = 1`, incompatível com `n − 1 > 0`. E afirma `n = 5`, em conflito também com a explicação gerada. A r2 tem chave A e justificativas coerentes com as quantidades.
- **epg-14 e epg-15 r1.** Identidade e contradição são casos degenerados após o cancelamento. Os itens permanecem na aprendizagem e medem o objetivo específico de classificar soluções. A relação curricular continua com a revisão especializada pendente indicada no catálogo.
- **epg-17 e epg-18 r1.** A primeira cobra interpretação de unidade, mas entrega o modelo e permite identificar a resposta por duas contas curtas. A segunda testa integralidade, mas o comando entrega a equação e a alternativa correta explicita todo o argumento. A dificuldade cognitiva declarada merece aferição com estudantes.
- **epg-19 r2.** Checar totais, integralidade e limites atende ao objetivo de integrar restrições. As opções A e E já caem por limites e integralidade, reduzindo a busca entre planos. A explicação valida C e refuta os quatro distratores. O formato de escolha entre planos aproxima o comando do objetivo, com resolução mais curta do que a dificuldade «difícil» pode sugerir.
- **Objetivos e cobertura.** As posições preservam os dez tópicos e os perfis do manifesto. A epg-16 discrimina traduções algébricas, mas a inconsistência fica invisível para quem atende apenas ao comando. A epg-08 permite conferir por substituição, como prevê o objetivo amplo do catálogo, sem exigir essa conferência para escolher a resposta. As observações de dificuldade são apreciações qualitativas. [Manifesto](../../manifesto.js) · [Catálogo](../../catalogo.js)
