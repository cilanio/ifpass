# Etapa 7.3 — Integração ao treino e aos indicadores

Esta proposta depende de revisão e validação em Supabase isolado antes de qualquer aplicação no ambiente real. A [continuidade](CONTINUIDADE.md), a [matriz pedagógica](MATRIZ_PEDAGOGICA.md) e o [banco da etapa 7.2](../supabase/ETAPA_7_2.md) são as referências. O catálogo, a correção e o histórico dos simulados oficiais permanecem exclusivos de questões oficiais.

## Seleção, retomada e correção

1. Reutilizar `Treino`, `Questao` e o modelo unificado. Identificar a origem na roda de treino e usar o contrato histórico das questões oficiais. Manter o treino oficial disponível durante a implantação.
2. Introduzir seleção autoral no servidor, por sessão e assunto. Considerar somente versões correntes aprovadas, com autorização da sessão, limite de rodada e deduplicação. Reutilizar a atribuição versionada e suas restrições. Persistir a composição e a ordem da rodada mista para que a retomada preserve o conjunto original, inclusive a posição e o vínculo exato de cada item oficial ou autoral.
3. Entregar somente dados de apresentação. Autorais usam UUID, versão e item atribuído. Enviar a alternativa pela RPC de resposta e exibir gabarito, explicação e justificativas somente após a confirmação da gravação. Ao repetir a mesma requisição, recuperar a resposta canônica. Restringir escritas e cálculos de novos fluxos mistos ao servidor.
4. Se a versão foi substituída normalmente, preservar a versão original dos itens já atribuídos. Se foi retirada por erro, a resposta pendente retorna `item_anulado`. Sinalizar a anulação, permitir avançar e excluir itens anulados dos totais e indicadores aplicáveis, sem contar acerto, erro ou resposta em branco. Preservar o registro histórico de respostas anteriores à retirada enquanto a política de reprocessamento estiver pendente.
5. Integrar o acesso temporário às imagens privadas por operação autorizada. Verificar propriedade e vínculo na sessão, ou a autorização do revisor, e emitir acesso de curta duração apenas ao objeto da versão correta. Tratar expiração e falhas. O bloqueio provisório de aprovação de questões com imagem continua até a validação da visualização privada.

## Sessões mistas e desempenho

- Finalizar no servidor em uma transação que confira o dono, bloqueie a sessão, leia a composição persistida e consolide respostas canônicas e itens anulados. Recusar novas respostas após a finalização e retornar o mesmo resultado em novas tentativas de finalização. Preservar o contrato das sessões oficiais atuais.
- Amarrar a unicidade de resposta ao item atribuído. Usar uma resposta canônica por item elegível na rodada, com origem registrada, evitando contabilizar o feedback como outro evento. As janelas, regras de respostas em branco e critérios atuais dos indicadores seguem vigentes.
- Reutilizar indicadores por assunto e manter `prova_id` e `n` em registros históricos, inclusive quando campos recentes estão nulos. Testar o isolamento dos dados por conta e disciplina.
- Implantar em etapas com sessão mista desativada até passar pela validação de ponta a ponta. Confirmar compatibilidade com alunos e responsáveis, latência, tamanho de rodada, recuperação de falhas e ausência de gabarito antecipado. Exercitar também expiração de URL, concorrência entre resposta, retirada e finalização, reenvios, registros legados e invariância dos simulados oficiais.

## Interface com as etapas 7.4 e 8

A etapa 7.4 deve consumir um perfil de geração versionado que vincule instruções, exemplos, fonte curricular, evidências e validação humana à versão gerada. Dados importados na 8.1 e evidências avaliadas na 8.2 podem compor perfis novos na 8.3. A atualização dessas entradas deve preservar a progressão pedagógica, a atribuição de origem e a reprodução do histórico, sem retreinamento obrigatório da IA. Nenhuma etapa 8 faz parte da entrega atual.

## Decisões para aprovação antes da implementação

1. Definir a composição da rodada mista, o limite por origem, a regra quando faltarem autorais e quando o aluno poderá retomar uma rodada interrompida.
2. Aprovar a política de substituição de item anulado durante a rodada e decidir se a retirada por erro deve excluir retroativamente respostas já registradas dos indicadores derivados, preservando os registros.
3. Definir validade do acesso temporário às imagens e os critérios de encerramento e contabilização de sessões mistas incompletas.
