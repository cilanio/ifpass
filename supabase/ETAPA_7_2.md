# Etapa 7.2 — Estrutura e implantação

As migrações seguem o [plano aprovado e o diagnóstico do banco real](https://github.com/cilanio/ifpass/blob/3dcf702e305a66770d47c438f2980571048d5ff1/docs/PLANO_ETAPA_7_2.md). A base confirmada tinha 18 respostas oficiais, zero respostas autorais e zero versões em `questoes_ia`.

| Migração | Efeito |
| --- | --- |
| [Estrutura](migrations/20261125120000_estrutura_revisao_autoral.sql) | Adiciona atribuições de equipe, disciplina, histórico de permissões, decisões versionadas e itens de treino. Adiciona UUID, versão e item opcionais ao histórico, com FKs compostas, unicidade e restrições de coerência. |
| [Operações](migrations/20261125120100_operacoes_revisao_e_treino_autoral.sql) | Delimita a leitura por RLS, protege atribuições, registra decisões e oferece operações controladas de submissão, atribuição e resposta autoral. |

A referência oficial continua `oficial:<prova_id>:<n>`. As linhas legadas mantêm `prova_id`, `n` e os campos históricos. Para respostas autorais, a referência `ia:<uuid>:<versao>` acompanha as colunas tipadas, e a FK do item vincula sessão, dono e versão. Uma repetição com a mesma alternativa retorna a resposta gravada. Uma escolha diferente para o mesmo item é recusada.

## Autorização, revisão e publicação

- `papeis_equipe` é a autoridade para administração e revisão. `profiles.papel` continua reservado aos perfis existentes. As atribuições de equipe exigem administrador ativo e conta dedicada. Vínculos desativados continuam marcando a conta como de equipe, sem acesso aos registros de estudo. A trilha administrativa registra cada concessão, alteração e revogação efetiva, com ator, data, valores anteriores e posteriores. Somente administradores consultam a trilha pela API.
- A autorização ativa por disciplina é o registro de que a qualificação foi verificada pela administração. Só um revisor ativo e distinto de quem submeteu pode decidir. O administrador submete e consulta o conteúdo. A administração deve confirmar que o revisor não participou da elaboração, pois o banco verifica a independência em relação à conta que submeteu a versão.
- O checklist 1 registra os oito critérios eliminatórios e os sete critérios qualitativos da [matriz pedagógica](../docs/MATRIZ_PEDAGOGICA.md). Nos eliminatórios, verdadeiro indica problema. Nos qualitativos, verdadeiro indica adequação. Todos os campos são obrigatórios. Somente os eliminatórios formam a condição de aprovação do checklist. A avaliação qualitativa fica registrada sem pesos, notas ou limiares. A aprovação também exige alternativas A–E e explicações não vazias da correta e de cada distrator. A decisão e o estado são gravados juntos. Um bloqueio transacional serializa decisões pelo UUID.
- A versão submetida tem conteúdo imutável. Solicitar correção registra a decisão e devolve o estado a rascunho, com a versão submetida preservada para auditoria. A correção deve ser inserida em uma nova versão. A versão aprovada continua disponível durante a revisão da sucessora. Quando a sucessora é aprovada, a anterior é inativada por substituição na mesma transação. Sessões já vinculadas continuam usando a versão original. Para retirar por erro, um administrador ativo usa `ifpass_retirar_autoral` com justificativa obrigatória. A versão registra ator, data e motivo e deixa de aceitar novas respostas.
- A operação de atribuição devolve só campos de apresentação. O aluno recebe gabarito e explicações após a gravação e correção no servidor. A operação de resposta exige uma sessão do próprio aluno e um item previamente atribuído. Para um item pendente retirado por erro, retomada e envio devolvem `status: item_anulado` e `item_id`, sem conteúdo, gabarito ou nova gravação. O item permanece rastreável. A futura finalização deve desconsiderá-lo como item válido e poderá solicitar substituto elegível. Respostas gravadas antes da retirada mantêm seu vínculo e histórico, sem reclassificação automática.
- Os simulados e o treino oficial continuam operando pelos caminhos atuais. A saída do servidor autoral ainda carece de integração na aplicação. A emissão de acesso temporário ao Storage e a finalização de sessões mistas com totais calculados no servidor ficaram para a integração correspondente.

## Procedimento de implantação

1. Confirme que as condições do diagnóstico se conservam, em especial ausência de respostas autorais e de versões aprovadas ou em revisão antes desta implantação. Se houver divergência, reavalie a migração e o histórico antes de executar.
2. Faça backup e valide em ambiente Supabase isolado com Auth e PostgREST. Aplique as duas migrações em ordem, com a identidade administrativa usada para migrations e com controle transacional por arquivo. Confira o proprietário das rotinas `SECURITY DEFINER` e o conjunto efetivo de privilégios e políticas. Os testes locais usam claims sintéticas e PostgreSQL 17.
3. Depois da aprovação de implantação, o operador do Supabase deve provisionar manualmente o primeiro administrador. Confirme a ausência de administrador ativo antes do provisionamento inicial. Use uma conta dedicada à equipe, confirme o UUID no Auth pelo painel administrativo e verifique que essa conta carece de histórico de aluno. Em uma transação administrativa, insira uma única atribuição ativa em `public.papeis_equipe` com `usuario_id` e `alterado_por` iguais ao UUID verificado e `papel = 'administrador'`. Registre a operação na trilha administrativa de implantação. Confira por leitura que há exatamente a atribuição esperada e mantenha as credenciais em canal privado. O cadastro público continua sem atribuir funções de equipe.
4. Depois do provisionamento inicial, gerencie atribuições com `ifpass_gerir_equipe` sob a identidade de outro administrador ativo. Verifique qualificação antes de autorizar a disciplina de um revisor. Use contas distintas para equipe e aprendizagem.
5. Preserve o snapshot até confirmar a aplicação real. Se a primeira migração passar e a segunda falhar, mantenha o fluxo autoral fora de uso e avalie a recuperação com a cópia de segurança. A reversão após entrada de dados precisa preservar versões, decisões e respostas.

## Testes descartáveis

Use um PostgreSQL 17 vazio e sem portas publicadas, com `auth.users` e `auth.uid()` fornecidos pelo Supabase local ou por uma fixture de identidade que leia `request.jwt.claims`. A fixture mínima precisa das colunas `auth.users.id` e `raw_user_meta_data`, dos papéis `anon`, `authenticated` e `service_role` e de USAGE no schema `auth` para esses papéis. Use `psql -X -v ON_ERROR_STOP=1` pelo socket do contêiner.

Ordem dos arquivos

1. `supabase/schema.sql`
2. `supabase/tests/etapa-7-2-fixture.sql` para registrar as 18 respostas históricas sintéticas antes das alterações
3. As duas migrações da tabela acima
4. `supabase/tests/etapa-7-2.sql` com `-v ifpass_ambiente_descartavel=1`
5. `supabase/tests/etapa-7-2-concorrencia.sql` com o mesmo parâmetro e a extensão `dblink` disponível. Esse teste abre duas conexões locais e grava sua própria fixture no contêiner descartável

A suíte cobre preservação integral das 18 linhas simuladas, compatibilidade oficial, permissões, RLS, referências, decisões, divulgação do gabarito, idempotência e concorrência. A validação de Auth, PostgREST, Storage e ACLs específicas da produção continua pendente antes da implantação.
