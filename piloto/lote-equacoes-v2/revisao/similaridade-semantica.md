# Similaridade semântica do lote experimental

Base: `a5517a74d4371fb400722439b80b5f6bacdc73d5`. Corpus oficial disponível no projeto: 120 questões, 40 de cada prova IFAL 2024-T3, 2025-T1 e 2026-T1. São 54 itens no bloco de Matemática e cinco classificados como `m_equacoes1`. [Catálogo de provas](../../../src/data/provas.js) · [Classificação](../../../src/data/assuntos.js)

## Método e escopo

Método v1 desta revisão. Calculei igualdade textual normalizada de enunciado e conjunto de alternativas nos 190 pares internos e 2.400 pares autoral × oficial. A normalização usa Unicode NFKD, casefold e extração de sequências alfanuméricas e sublinhados. Calculei Jaccard de conjuntos de tokens do enunciado como triagem. Na leitura semântica usei objetivo, contexto, quantidades, incógnitas, estrutura da resolução e organização dos distratores. Revisei o bloco de Matemática para selecionar comparações pertinentes, incluindo itens fora da classificação `m_equacoes1`. O parecer se restringe a esse catálogo e às compatibilidades observadas.

Zero coincidências textuais normalizadas. O maior Jaccard interno foi 0,667 em epg-08/13. O maior externo, 0,313 em epg-07/IFAL 2025-T1 Q3, é efeito de palavras comuns em uma questão de Português. Entre as aproximações de Matemática, epg-13/IFAL 2026-T1 Q20 e epg-11/IFAL 2025-T1 Q30 deram 0,250 cada. Nenhuma dessas quatro aproximações lexicalmente destacadas sustenta reprodução semântica. As diferenças de tokenização podem alterar a ordem dos vizinhos.

## Vizinhanças internas

| Itens | Sobreposição | Diferença que caracteriza a tarefa |
|---|---|---|
| 01, 02, 03 e 06 | Linguagem e papéis algébricos | Coeficiente, termos com sinal, variável versus incógnita e leitura de membros são ações distintas. |
| 04 e 05 | Alta proximidade conceitual. Aplicam a mesma subtração aos dois membros. | 04 identifica a transformação universal e 05 explica o motivo numa equação concreta. Repetição formativa deliberada, com pouca variação de operação. |
| 06 e 07 | Estrutura e significado de equação | 06 reconhece componentes, 07 testa um valor por substituição. |
| 08, 09, 10, 11 e 13 | Manipulação de equações lineares | 08 isola após translação e divisão com sinais. 09 pede o estado intermediário. 10 resolve incógnita nos dois membros. 11 distribui e simplifica. 13 limpa denominadores. 09/10 têm a maior proximidade de procedimento nesse grupo. |
| 11, 12, 14 e 15 | Expansão de parênteses | 11 simplifica, 12 equilibra grupos e confere estoque, 14 reconhece identidade e 15 detecta contradição. 14/15 formam um par complementar, com desfechos opostos. |
| 12 r2 e 19 r2 | Reserva, contagem e checagem de restrições | 12 iguala dois totais algébricos e calcula sobra. 19 busca uma fatoração admissível depois de retirar a reserva. Já 19 r1 tinha alta similaridade estrutural com 12, com o mesmo molde `3(x+2)=2(x−1)+c`; a r2 remove esse molde repetido. |
| 16, 17, 18, 19 e 20 | Modelagem, totais e soluções no contexto | 16 seleciona um modelo, 17 interpreta unidade, 18 verifica inviabilidade por integralidade, 19 escolhe uma fatoração no intervalo e 20 recupera um preço unitário. 17/20 compartilham `ax+b=c` com interpretação diferente; 18/19 compartilham integralidade, com desfechos distintos. |

## Questões oficiais pertinentes

| Oficial | Autoral | Enunciado, alternativas e percurso |
|---|---|---|
| IFAL 2024-T3 Q32 | 16, 20 | Ingressos com dois preços e total fixo. A resolução elimina uma das duas quantidades por `20(10−x)+30x=260`; opções são números de pessoas. 16 oferece modelos em função da caixa menor. 20 pede preço unitário a partir de taxa fixa e sete peças. Sobreposição de modelagem linear. |
| IFAL 2025-T1 Q32 | 16, 19 | Nota mínima via média, com opções de inequações. Compartilha tradução de restrições; 16 usa igualdade e 19 usa intervalo, divisibilidade e alternativas de planos. |
| IFAL 2025-T1 Q35 | 12, 16, 20 | Balões e chapéus, com duas incógnitas, total de itens e orçamento. Opções em pares de contagens; o procedimento é resolver o sistema. Em 12, equilibra-se a quantidade dos grupos; 16 usa relação dobro mais oito; 20 tem um único preço desconhecido. |
| IFAL 2026-T1 Q30 | 16, 18, 19 | Divisão de custo com teto e escolha de inequação. Comparte quantidades discretas e teste de restrições; a incógnita oficial está no denominador e a relação é estrita, enquanto os autorais pedem igualdade, diagnóstico contextual ou plano de distribuição. |
| IFAL 2026-T1 Q31 | 20 | Dois preços com descontos e um sistema linear; opções em pares monetários. O autoral determina um preço por divisão após retirar taxa fixa. |
| IFAL 2024-T3 Q27–28 e IFAL 2026-T1 Q21, Q28 | 03, 17, 20 | Função de preço com desconto, rateio de gastos, desconto percentual e acumulação por taxa. Há reserva/fixo ou taxa unitária em alguns modelos. A incógnita, o sentido da operação e o que as opções pedem variam. |
| IFAL 2024-T3 Q34–35 e IFAL 2026-T1 Q26 | 12, 18, 19 | Divisão de pizza com fatias de tamanhos diversos, quantidade de bolos por insumo limitante e preparo fracionário. O tema de distribuição ou estoque é comum, mas os autorais usam igualdade de grupos, divisibilidade ou capacidade inteira. |
| IFAL 2026-T1 Q20 e IFAL 2025-T1 Q30 | 13 e 11, respectivamente | Q20 avalia potência numérica e Q30 simplifica polinômio quadrático. As tarefas autorais limpam denominadores de uma equação ou aplicam uma distributiva mantendo o segundo membro. |

A revisão não encontrou cópia ou paráfrase próxima nas versões vigentes dentro do corpus observado. Os pares internos 04/05, 09/10 e 17/20 merecem atenção como repetições de procedimento, especialmente ao avaliar diversidade. A semelhança com o catálogo sustenta apenas observações pontuais de formato e habilidades, sem inferência de equivalência ao estilo COPEVE.
