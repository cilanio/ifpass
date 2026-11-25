# Lote experimental de Equações do Primeiro Grau

O lote usa catálogo e manifesto v2, perfis v1 e contrato JSON v1. A geração ocorreu nesta execução do Codex, com instruções registradas pela referência `epg-v2-experimental-1`: respeitar as 20 posições do manifesto, criar cinco alternativas e justificar a correta e cada distrator. O identificador exato da variante do modelo e a contagem de tokens ficaram indisponíveis. As questões aguardam resolução independente e revisão pedagógica.

## Artefatos

- [Originais](geracao/originais.json) e [correções](geracao/correcoes.json) preservam as 20 primeiras versões e as duas segundas versões. A versão corrente de cada posição é a maior revisão registrada. Cada posição corrigida teve uma tentativa.
- [Resultados determinísticos](validacao/resultados.json), [comparação](validacao/comparacao.json) e [métricas](validacao/metricas.json) documentam o que foi executado.
- [Pacote de resolução independente](resolucao-independente/questoes.json) contém somente identificação, enunciados e alternativas. Para a resolução às cegas, encaminhar somente esse arquivo a outra execução ou pessoa, sem acesso aos originais, às correções, aos resultados ou aos dossiês.
- [Dossiês](revisao/dossies.json) incluem as referências curriculares, objetivos, etapas, perfil, trilha de validação e material para conferência posterior. O revisor pode começar pelo pacote cego e abrir o dossiê depois de registrar a resposta. Aplicar os 15 critérios da [Matriz Pedagógica](../../docs/MATRIZ_PEDAGOGICA.md#7-regra-de-aprovação-pedagógica) e registrar decisão individual.

## Resultados e limites

Estrutura, vínculos curriculares, alternativas e cobertura passaram nas 20 posições correntes. As quatro representações de equações lineares em racionais passaram na validação matemática exata. As 16 restantes exigem resolução textual ou análise contextual. A concordância entre a representação estruturada e o enunciado também espera conferência independente.

Foram comparados 120 itens oficiais e 190 pares internos em cada rodada de verificação. A comparação exata usou enunciado, texto de apoio e alternativas normalizadas. A triagem complementar calcula a interseção sobre a união dos conjuntos de tokens do enunciado. Os três vizinhos mais próximos por origem estão registrados. Na versão corrente, o maior índice interno foi 0,6667 entre epg-08 e epg-13. Ambos usam um comando curto para encontrar o valor de x, com operações distintas. O maior índice externo foi 0,2727 entre epg-13 e oficial:ifal-2026-t1:20. Houve zero duplicatas exatas. A triagem lexical orienta a conferência de similaridade semântica e diversidade pelo revisor.

Na primeira versão de epg-12, nenhuma alternativa atendia à restrição de quantidade positiva. A geração corrigiu os dados e o gabarito. A primeira versão de epg-19 repetia a estrutura de epg-12 e sugeria uma condição inicial ambígua. A geração diferenciou o cenário e as restrições. As correções foram revalidadas pelo mesmo processo determinístico. A identificação desses problemas faz parte da revisão da própria geração.

As despesas diretas com APIs contratadas foram zero. Custo total, custo por questão aprovada, tokens e tempo de revisão humana permanecem indisponíveis. As metas de aprovação humana só poderão ser avaliadas após a revisão. Nenhum item recebeu aprovação editorial.
