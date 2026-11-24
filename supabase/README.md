# Estrutura do Supabase do IFPASS

## Origem e escopo

[schema.sql](schema.sql) reproduz, byte a byte, o anexo `IFPASS_schema_2026-11-24.sql`. Conforme o cabeçalho do anexo, o snapshot de 24/11/2026 foi reconstruído a partir de consultas aos catálogos do PostgreSQL. Registra oito tabelas de `public`, suas restrições, índices, RLS, políticas, privilégios de tabela, a função `public.handle_new_user()` e o trigger em `auth.users`. A definição de `questoes_ia` e os campos de questões autorais no treino constam do snapshot. A presença dessas definições é evidência documental e não confirma sua implantação atual.

O snapshot serve de referência para comparar mudanças. Não o execute sobre um banco existente. Sua restauração e a equivalência com o banco em operação não foram testadas. Ele pressupõe um ambiente Supabase com `auth.users`, `auth.uid()` e os papéis referenciados, além de `gen_random_uuid()` e resolução das tabelas de `public` no `search_path`. A coleta não abrange ACLs de coluna, função ou schema, proprietários e privilégios padrão. O SQL não contém registros de usuários ou credenciais.

## Achados da revisão estática

| Evidência | Implicação |
| --- | --- |
| [RLS e privilégios de tabela](schema.sql#L233) | As oito tabelas têm RLS habilitada. `estudos_feitos`, `materias`, `plano_blocos` e `profiles` registram `TRUNCATE` para `anon` e `authenticated`. RLS não cobre essa operação. A capacidade efetiva depende dos mecanismos de acesso e das permissões do ambiente. |
| [Políticas de perfil](schema.sql#L259) e [ACL de profiles](schema.sql#L305) | Há política de atualização do próprio perfil, enquanto o `GRANT` de tabela para `authenticated` omite `UPDATE`. A política por si só não concede esse privilégio. Grants de coluna e permissões herdadas não foram aferidos. |
| [Chaves estrangeiras](schema.sql#L193) | `estudos_feitos` e `plano_blocos` têm uma FK simples e outra composta para o mesmo vínculo. A composta também verifica o dono. A FK de `treino_sessoes.user_id` usa a ação padrão `NO ACTION` e pode impedir a exclusão de um usuário com sessões, enquanto outros vínculos usam cascata. |
| [Restrições de questões](schema.sql#L141) e [estrutura de respostas](schema.sql#L89) | O gabarito aceita A–E e `alternativas` deve ser um objeto JSON, mas o snapshot não exige cinco chaves nem a presença da chave do gabarito. `questao_ref` não tem FK para a chave `(id, versao)`. A origem é opcional e não obriga uma referência compatível. |
| [Políticas](schema.sql#L249) e [ACL de questoes_ia](schema.sql#L315) | `questoes_ia` tem RLS sem políticas registradas e sem grants de tabela para `anon` e `authenticated`. O snapshot não demonstra um caminho de leitura direta para alunos. A restrição para aprovação exige data, mas não comprova revisão humana. |
| [Função e trigger de cadastro](schema.sql#L347) | A função roda com `SECURITY DEFINER`. O proprietário e os privilégios efetivos da função ficaram fora da coleta. |

A revisão conferiu as referências entre as tabelas documentadas, os alvos de chaves estrangeiras e a separação entre políticas RLS e privilégios. O parser validou a sintaxe dos 116 comandos e do corpo PL/pgSQL sem conectar a um banco. Os achados descrevem o arquivo fornecido. Políticas, permissões e comportamento do ambiente ativo não foram testados.

## Como versionar futuras alterações

1. Consulte [AGENTS.md](../AGENTS.md) e [CONTINUIDADE.md](../docs/CONTINUIDADE.md). Use uma branch separada. Antes de propor DDL, obtenha por leitura autorizada do catálogo a estrutura efetiva e registre a data, a origem e as limitações da coleta. Exclua credenciais e dados pessoais dos artefatos.
2. Compare a coleta com este snapshot. Se houver mudança proposta, prepare uma migração incremental em `supabase/migrations/` com nome datado e descritivo. Documente o impacto sobre registros antigos, chaves, índices, RLS, ACLs e integrações, além da estratégia de reversão ou recuperação.
3. Apresente a migração e seus impactos para revisão. Em ambiente isolado e autorizado, verifique a aplicação, a compatibilidade com registros anteriores e o isolamento entre papéis. Registre os resultados.
4. Qualquer execução em produção requer autorização explícita. Depois de uma alteração aprovada e aplicada, confirme o resultado por leitura do catálogo, atualize o snapshot a partir do estado observado e registre a relação com a migração no pull request.
