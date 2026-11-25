# Reavaliação independente das revisões 2

PR #19. Base avaliada `0c71c544842709706fcbfafd42497541ba719f53`. Nova resolução restrita às três posições abaixo. As outras 17 foram consolidadas a partir da avaliação anterior.

## Resolução independente registrada antes da consulta às chaves

Fonte: [pacote cego das três revisões](../resolucao-independente/questoes-corrigidas.json), blob `5a99025c0421404020757d10c30b2a0d090bd025`. As três conclusões têm confiança alta. Em cada questão há uma única alternativa correta, com dados suficientes e sem ambiguidade ou erro matemático identificado no material cego.

- **epg-08 r2 — E (3).** Subtraindo 18 dos dois membros, obtém-se `−4x = −12`. Dividindo por −4 resulta `x = 3`. A substituição confirma `18 − 4·3 = 6`.
- **epg-10 r2 — C (7).** Subtraindo `5r` e somando 12 aos dois membros, obtém-se `21 = 3r`, logo `r = 7`. À esquerda, `5·7 + 9 = 44`. À direita, `8·7 − 12 = 44`.
- **epg-16 r2 — A (`x + 2x + 8 = 47`).** A caixa maior tem `2x + 8` livros. Somando as caixas, `3x + 8 = 47`, logo `x = 13`. A maior contém 34 livros. As duas contagens são inteiras e positivas, somam 47 e obedecem à relação de dobro mais oito.

## Conferência posterior

Conferi a correspondência exata entre o pacote cego e os campos de identificação, revisão, enunciado e alternativas dos três itens em [correcoes.json](../geracao/correcoes.json). As três respostas e deduções concordam com as chaves e explicações vigentes. Também conferi as justificativas dos quatro distratores de cada item.

| Item | Achado na revisão 1 | Verificação da revisão 2 |
|---|---|---|
| epg-08 | A justificativa de D atribuía um erro de sinal adicional. | Corrigido integralmente. Dividir −12 por 2 produz −6. O divisor exigido é −4, que produz 3. A, B e C correspondem respectivamente ao sinal errado, ao segundo membro e à magnitude de −12 antes da divisão. |
| epg-10 | D tinha descrição imprecisa e E carecia de justificativa concreta. | Corrigido integralmente. D vem de `9 − (−12) = 21`, que corresponde a `3r`, e E falha por substituição, com 29 e 20. A troca o sinal da solução e B confunde o coeficiente 3 com a incógnita. |
| epg-16 | Total 46 incompatível com contagens inteiras, um erro matemático eliminatório. | Corrigido integralmente. Total 47 permite 13 e 34 livros, o que a explicação agora verifica. B dobra o acréscimo e omite a parcela da caixa menor. C dobra o acréscimo. D omite o dobro da caixa menor no cálculo da maior. E põe o acréscimo no membro do total. |

Nenhum novo problema matemático, de unicidade ou de coerência das explicações foi identificado nas três revisões. As duas primeiras mantêm suas respectivas operações de resolução. A terceira mantém o objetivo de selecionar um modelo e agora descreve uma situação viável.

## Similaridade com o lote vigente

Triagem em 54 pares internos distintos que envolvem pelo menos uma das três revisões. Comparei enunciados e conjuntos de alternativas com normalização Unicode NFKD, minúsculas e extração de palavras e números. Houve zero coincidências textuais normalizadas. Usei o Jaccard de tokens do enunciado para triagem e comparei situação, procedimento e objetivo na leitura qualitativa.

- **epg-08.** O maior Jaccard foi 0,667 com epg-13, por conta do comando quase idêntico. A resolução de 08 usa subtração e divisão com sinais. A de 13 exige lidar com denominadores distintos. Enunciado e alternativas de 08 são os mesmos da r1.
- **epg-10.** A maior proximidade de procedimento permanece com epg-09. Ambos agrupam incógnitas dos dois lados, mas 09 pede a igualdade intermediária e 10 pede a solução. O maior Jaccard, 0,176, ocorreu com epg-08 e epg-13, que compartilham termos genéricos do comando. Enunciado e alternativas de 10 são os mesmos da r1.
- **epg-16.** O maior Jaccard foi 0,157 com epg-18. Ambas tratam de contagens inteiras e distribuição, mas 16 escolhe o modelo de duas caixas com quantidades diferentes e 18 avalia a inviabilidade de uma divisão uniforme com reserva. Em epg-12 há duas quantidades a equilibrar. Em epg-17 e epg-20 há uma taxa ou multiplicador e uma parcela fixa, mas o comando pede interpretação ou preço. Alterar o total de 46 para 47 preservou a estrutura e não gerou nova paráfrase próxima.

A triagem atualiza a comparação interna das três posições. A [análise anterior do catálogo oficial](similaridade-semantica.md) permanece como registro histórico. As duas primeiras revisões mudaram apenas explicações, e a terceira preservou o cenário e o procedimento, com ajuste numérico.

## Consolidação das 20 posições

As 20 chaves vigentes concordam com as resoluções independentes. As 17 posições herdadas mantêm suas ressalvas qualitativas anteriores, quando registradas. O [relatório independente inicial](resolucao-independente-equacoes-v2.md) e a [comparação inicial](comparacao-independente.md) preservam o histórico.

| Questão | Revisão vigente | Gabarito gerado | Resolução independente | Histórico relevante |
|---|---:|---|---|---|
| epg-01 | 1 | B | B | — |
| epg-02 | 1 | D | D | — |
| epg-03 | 1 | A | A | — |
| epg-04 | 1 | E | E | — |
| epg-05 | 1 | B | B | — |
| epg-06 | 1 | C | C | — |
| epg-07 | 1 | D | D | — |
| epg-08 | 2 | E | E | r1 E, justificativa de D imprecisa |
| epg-09 | 1 | A | A | — |
| epg-10 | 2 | C | C | r1 C, justificativas de D/E imprecisas |
| epg-11 | 1 | B | B | — |
| epg-12 | 2 | A | A | r1 E gerado, nenhuma opção correta |
| epg-13 | 1 | D | D | — |
| epg-14 | 1 | B | B | — |
| epg-15 | 1 | E | E | — |
| epg-16 | 2 | A | A | r1 A formal, sem marcação independente por contagem inviável |
| epg-17 | 1 | C | C | — |
| epg-18 | 1 | D | D | — |
| epg-19 | 2 | C | C | r1 B gerado, problema substituído por sobreposição estrutural |
| epg-20 | 1 | E | E | — |

Da avaliação anterior, persistem as observações qualitativas sobre a dificuldade de epg-17, epg-18 e epg-19 e sobre a proximidade de procedimento de alguns pares. O registro curricular de epg-14 e epg-15 ainda indica revisão especializada pendente. Este relatório registra a avaliação independente e deixa a decisão pedagógica humana a cargo dos revisores autorizados.
