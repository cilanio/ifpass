# Etapa 7.1 — Modelo unificado de questões

O [modelo em memória](../src/lib/questoes.js) adapta o catálogo de provas oficiais e o formato de `questoes_ia` descrito no [snapshot](../supabase/schema.sql). O [componente Questao](../src/Questao.jsx) mantém a entrada `{ prova, questao }` para os fluxos atuais e também aceita `modelo` já adaptado. A origem autoral é exercitada somente com dados sintéticos nos testes. O modelo sequer consulta uma fonte de dados e não decide a elegibilidade para publicação.

| Campos | Oficial | Autoral |
| --- | --- | --- |
| `id`, `origem`, `versao` | `oficial:<provaId>:<n>`, `oficial`, `null` | `ia:<uuid>`, `ia`, inteiro de `questoes_ia.versao` |
| `provaId`, `n` | Identidade histórica da questão na prova | `null` |
| `disciplina`, `assuntoId` | Nome do bloco e ID vindo da classificação oficial | `disciplina` e `assunto_id` do registro |
| `topicoId`, `etapa`, `habilidadePrincipal`, `habilidadesSecundarias`, `dificuldade` | `null` onde o catálogo não traz o metadado | Mapeados dos campos do registro, com tópico opcional |
| `tituloTexto`, `texto`, `enunciado`, `imagem` | Complementos textuais mantidos e imagem com o caminho original em `public/provas/` | Mapeados do registro, com título, texto e imagem opcionais |
| `alternativas`, `gabarito`, `explicacao` | Alternativas e gabarito originais, inclusive `NULA`. Explicação `null` | Mapa de alternativas, `resposta_correta` e objeto JSON de explicação |
| `status`, `cor` | Status `null` e cor do bloco | Status do registro e cor `null` |

O par `(id, versao)` identifica uma revisão do conteúdo. Os IDs do modelo são internos e não substituem `prova_id` e `n` no histórico nem definem o formato persistido de `questao_ref`. A versão oficial permanece nula porque o catálogo não registra revisão por questão. A etapa e a dificuldade são campos independentes, conforme a [matriz pedagógica](MATRIZ_PEDAGOGICA.md).

Os adaptadores esperam dados no formato das respectivas fontes e preservam a ordem das alternativas. A correção oficial, a seleção de questões e o cálculo de indicadores continuam nos fluxos existentes. O objeto de explicação é transportado sem interpretação. A janela de revisão atual exibe o gabarito e as marcações, conforme o comportamento oficial existente.

## Decisões pendentes antes de integrar as autorais ao treino

- Aprovar o formato persistido de `questao_ref` e como vincular cada resposta autoral à versão exata da questão.
- Aprovar o contrato do JSON de explicação, seu momento de exibição e a origem permitida para imagens autorais.
- Aprovar as regras de elegibilidade, publicação após revisão humana e agregação de registros das duas origens sem dupla contagem.
