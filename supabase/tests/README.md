# Etapa 6.7 — Segurança e integridade do Supabase

A suíte [seguranca-integridade.sql](seguranca-integridade.sql) verifica o comportamento do [snapshot estrutural](../schema.sql) com a migração de TRUNCATE aplicada em PostgreSQL descartável. Os cenários usam dois usuários fictícios, os papéis `authenticated` e `anon`, e o contexto de identidade consumido por `auth.uid()`. A suíte exige confirmação explícita de uso descartável, conexão por socket local e tabela de usuários vazia. As operações com dados de teste ficam em uma transação revertida ao final. As permissões de `TRUNCATE` são lidas do catálogo.

## Execução no Supabase local

1. Em um diretório separado do repositório, inicialize uma instância descartável com `supabase init` e `supabase start`. Use Docker local com espaço para baixar e extrair as imagens. A instância precisa de PostgreSQL, dos papéis padrão, de `auth.users` e `auth.uid()`. Para verificações adicionais pela API, mantenha também Supabase Auth e PostgREST disponíveis.
2. Confirme que a instância é nova, que não há usuários e que as tabelas do IFPASS ainda não existem. Identifique com `docker ps` o contêiner de banco pertencente a essa instância.
3. A partir da raiz do repositório, substitua `CONTAINER_LOCAL_DESCARTAVEL` pelo nome conferido. As chamadas usam o socket dentro do contêiner.

```sh
docker exec -i CONTAINER_LOCAL_DESCARTAVEL psql -X -U postgres -d postgres \
  -v ON_ERROR_STOP=1 --single-transaction -f - < supabase/schema.sql
docker exec -i CONTAINER_LOCAL_DESCARTAVEL psql -X -U postgres -d postgres \
  -v ON_ERROR_STOP=1 --single-transaction -f - < supabase/migrations/20261124230000_revoga_truncate_anon_authenticated.sql
docker exec -i CONTAINER_LOCAL_DESCARTAVEL psql -X -U postgres -d postgres \
  -v ifpass_ambiente_descartavel=1 -f - < supabase/tests/seguranca-integridade.sql
```

Carregue o snapshot uma vez por instância nova. As asserções imprimem `OK` ou interrompem a execução com o cenário que falhou. Exclua a instância de teste após a validação. O repositório não precisa de chaves, tokens ou dados reais para essa execução.

## Conferência de privilégios antes e depois

A [consulta de verificação](../verificacoes/privilegios-truncate.sql) é somente leitura. Compare seu resultado antes e depois de uma eventual execução aprovada no Supabase real. A coluna `pode_truncar` deve ser falsa para `anon` e `authenticated` nas quatro tabelas. Os demais valores devem permanecer iguais. Se algum privilégio efetivo persistir por herança ou via `PUBLIC`, registre a divergência para revisão separada.

## Resultados de 24/11/2026 antes da migração

A pilha completa do Supabase não iniciou. O armazenamento do Docker retornou `no space left on device` durante a extração das imagens de banco. A alternativa executada foi PostgreSQL 17.12 em contêiner descartável, sem rede ou porta publicada e com dados em memória. O ambiente tinha os três papéis padrão, uma tabela mínima `auth.users` e uma implementação de teste de `auth.uid()` que lê o `sub` de `request.jwt.claims`. O snapshot foi carregado integralmente. **70 asserções passaram** e a transação foi revertida. A consulta posterior confirmou zero usuários e zero simulados.

| Categoria | Resultado |
| --- | --- |
| Isolamento, acesso anônimo e RLS | RLS habilitada nas oito tabelas. Os dados fictícios ficaram restritos aos donos nas operações testadas. O cliente anônimo recebeu acesso negado ou nenhum registro, de acordo com a tabela. A matriz de privilégios de tabela conferiu leitura, inserção, atualização e exclusão para os dois papéis. |
| Privilégios observados | O catálogo confirmou `TRUNCATE` para `anon` e `authenticated` em `profiles`, `materias`, `plano_blocos` e `estudos_feitos`. A operação não foi executada. A atualização do próprio perfil por `authenticated` foi negada, apesar da política de atualização. As leituras de `questoes_ia` pelos dois papéis e a inserção por `authenticated` foram negadas. |
| Integridade e persistência | O trigger criou os dois perfis. As FKs compostas rejeitaram relações entre usuários. Status e alternativas inválidos foram rejeitados. Foram conferidas as cascatas de matérias, sessões e usuários, além do bloqueio de exclusão de usuário com sessão vinculada. Simulados e treinos foram persistidos e finalizados com os totais esperados. |

**Vulnerabilidades confirmadas.** Nenhuma exposição entre usuários foi observada nos cenários executados. A existência do privilégio `TRUNCATE` foi confirmada na réplica do snapshot. A possibilidade de acioná-lo por uma interface acessível externamente permanece um risco potencial. A ausência de `UPDATE` em `profiles` e o bloqueio de exclusão de usuários com sessões são comportamentos confirmados nessa réplica.

**Verificações não executadas.** Falta rodar a suíte no Supabase completo e verificar cadastro e emissão de JWT pelo serviço Auth, encaminhamento de papéis pelo PostgREST, respostas HTTP e privilégios adicionais ausentes do snapshot. Para essa extensão, é necessária uma instância Supabase local com espaço para as imagens ou uma instância descartável com estrutura equivalente, Auth, PostgREST e acesso administrativo exclusivo para preparação. A produção ficou fora do escopo.
