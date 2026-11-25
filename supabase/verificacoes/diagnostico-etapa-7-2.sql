-- IFPASS | Diagnóstico 7.2. Execute integralmente em uma sessão de leitura autorizada.
-- Colete os conjuntos SELECT e as mensagens NOTICE. Não há DDL nem gravação.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '2s';

-- 1. Reaproveitamento de tabelas e verificação dos contratos de coluna.
WITH alvo(nome) AS (
  VALUES ('profiles'), ('questoes_ia'), ('treino_sessoes'), ('treino_respostas'),
         ('papeis_equipe'), ('revisor_disciplinas'), ('revisoes_questoes'), ('treino_itens_autorais')
)
SELECT alvo.nome AS tabela, c.oid IS NOT NULL AS existe, c.relrowsecurity AS rls,
       c.relforcerowsecurity AS rls_forcada, a.attname AS coluna,
       format_type(a.atttypid, a.atttypmod) AS tipo, a.attnotnull AS obrigatoria
FROM alvo
LEFT JOIN pg_namespace n ON n.nspname = 'public'
LEFT JOIN pg_class c ON c.relnamespace = n.oid AND c.relname = alvo.nome
LEFT JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
ORDER BY tabela, a.attnum;

-- Restrições necessárias à referência versionada, aos estados e à idempotência.
SELECT c.relname AS tabela, k.conname AS restricao, k.convalidated AS validada,
       pg_get_constraintdef(k.oid) AS definicao
FROM pg_constraint k
JOIN pg_class c ON c.oid = k.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('questoes_ia', 'treino_respostas', 'treino_itens_autorais',
                    'papeis_equipe', 'revisor_disciplinas', 'revisoes_questoes')
ORDER BY tabela, restricao;

-- Índices independentes de restrições que podem afetar a fila ou a unicidade.
SELECT t.relname AS tabela, i.relname AS indice, x.indisunique AS unico,
       x.indisvalid AS valido, pg_get_indexdef(i.oid) AS definicao
FROM pg_index x
JOIN pg_class t ON t.oid = x.indrelid
JOIN pg_class i ON i.oid = x.indexrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relname IN ('questoes_ia', 'treino_respostas', 'treino_itens_autorais',
                    'papeis_equipe', 'revisor_disciplinas', 'revisoes_questoes')
  AND NOT EXISTS (SELECT FROM pg_constraint k WHERE k.conindid = i.oid)
ORDER BY tabela, indice;

-- 2. Políticas e ACLs efetivas que condicionam a revisão e a escrita autoral.
SELECT schemaname, tablename, policyname, permissive, roles, cmd,
       CASE WHEN schemaname = 'public' THEN qual END AS filtro,
       CASE WHEN schemaname = 'public' THEN with_check END AS condicao_escrita
FROM pg_policies
WHERE (schemaname = 'public' AND tablename IN (
         'profiles', 'questoes_ia', 'treino_respostas', 'papeis_equipe',
         'revisor_disciplinas', 'revisoes_questoes', 'treino_itens_autorais'
       ))
   OR (schemaname = 'storage' AND tablename IN ('buckets', 'objects'))
ORDER BY schemaname, tablename, policyname;

SELECT c.relname AS tabela, r.rolname AS papel,
       has_table_privilege(r.oid, c.oid, 'SELECT') AS leitura_tabela,
       has_any_column_privilege(r.oid, c.oid, 'SELECT') AS leitura_alguma_coluna,
       has_table_privilege(r.oid, c.oid, 'INSERT') AS insercao_tabela,
       has_any_column_privilege(r.oid, c.oid, 'INSERT') AS insercao_alguma_coluna,
       has_table_privilege(r.oid, c.oid, 'UPDATE') AS atualizacao_tabela,
       has_any_column_privilege(r.oid, c.oid, 'UPDATE') AS atualizacao_alguma_coluna,
       has_table_privilege(r.oid, c.oid, 'DELETE') AS exclusao_tabela
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
CROSS JOIN pg_roles r
WHERE n.nspname = 'public' AND c.relkind IN ('r','p','v')
  AND c.relname IN ('profiles', 'questoes_ia', 'treino_respostas', 'papeis_equipe',
                    'revisor_disciplinas', 'revisoes_questoes', 'treino_itens_autorais')
  AND r.rolname IN ('anon', 'authenticated')
ORDER BY tabela, papel;

SELECT c.relname AS tabela, a.attname AS coluna, r.rolname AS papel,
       has_column_privilege(r.oid, c.oid, a.attnum, 'SELECT') AS leitura,
       has_column_privilege(r.oid, c.oid, a.attnum, 'INSERT') AS insercao,
       has_column_privilege(r.oid, c.oid, a.attnum, 'UPDATE') AS atualizacao
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
CROSS JOIN pg_roles r
WHERE n.nspname = 'public' AND r.rolname IN ('anon','authenticated')
  AND ((c.relname = 'profiles' AND a.attname = 'papel')
    OR (c.relname = 'questoes_ia' AND a.attname IN ('resposta_correta','explicacao','status'))
    OR (c.relname = 'treino_respostas' AND a.attname IN (
        'origem_questao','questao_ref','questao_id','questao_versao','item_id','acertou','alternativa_correta')))
ORDER BY tabela, coluna, papel;

-- Rotinas que podem precisar ser reaproveitadas; não exibe código nem configurações.
SELECT p.proname AS rotina, pg_get_function_identity_arguments(p.oid) AS argumentos,
       p.prosecdef AS security_definer,
       has_function_privilege(r.oid, p.oid, 'EXECUTE') AS executavel, r.rolname AS papel
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
CROSS JOIN pg_roles r
WHERE n.nspname = 'public' AND r.rolname IN ('anon','authenticated')
  AND p.proname ~* '(quest|treino|revis|papel|equipe|handle_new_user)'
ORDER BY rotina, argumentos, papel;

-- 3. Preflight de dados. Somente agregados, com guardas para estruturas ausentes.
DO $diagnostico$
DECLARE
  questoes regclass := to_regclass('public.questoes_ia');
  respostas regclass := to_regclass('public.treino_respostas');
  buckets regclass := to_regclass('storage.buckets');
  resultado jsonb;
BEGIN
  IF (SELECT count(*) FROM pg_attribute WHERE attrelid = questoes AND attnum > 0
       AND NOT attisdropped AND attname IN ('id','versao','status')) = 3 THEN
    EXECUTE $q$
      SELECT jsonb_build_object(
        'total_versoes', count(*),
        'versoes_aprovadas', count(*) FILTER (WHERE status::text = 'aprovada'),
        'versoes_em_revisao', count(*) FILTER (WHERE status::text = 'em_revisao'),
        'ids_com_multiplas_aprovadas', (
          SELECT count(*) FROM (SELECT id FROM public.questoes_ia
            WHERE status::text = 'aprovada' GROUP BY id HAVING count(*) > 1) grupos
        )
      ) FROM public.questoes_ia
    $q$ INTO resultado;
    RAISE NOTICE 'questoes_ia: %', resultado;
  ELSE
    RAISE NOTICE 'questoes_ia: tabela ou colunas id, versao e status indisponíveis';
  END IF;

  IF (SELECT count(*) FROM pg_attribute WHERE attrelid = respostas AND attnum > 0
       AND NOT attisdropped AND attname IN ('origem_questao','questao_ref','sessao_id','prova_id','n')) = 5 THEN
    EXECUTE $q$
      SELECT jsonb_build_object(
        'total', count(*),
        'legadas_com_prova_e_numero', count(*) FILTER (
          WHERE origem_questao IS NULL AND prova_id IS NOT NULL AND n IS NOT NULL),
        'autorais', count(*) FILTER (WHERE origem_questao::text = 'ia'),
        'autorais_sem_sessao', count(*) FILTER (
          WHERE origem_questao::text = 'ia' AND sessao_id IS NULL),
        'autorais_sem_referencia_canonica', count(*) FILTER (
          WHERE origem_questao::text = 'ia' AND coalesce(questao_ref::text, '') !~*
            '^ia:[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}:[1-9][0-9]*$'),
        'referencias_sem_origem', count(*) FILTER (WHERE origem_questao IS NULL AND questao_ref IS NOT NULL),
        'grupos_autorais_repetidos_por_sessao_e_referencia', (
          SELECT count(*) FROM (SELECT sessao_id, questao_ref FROM public.treino_respostas
            WHERE origem_questao::text = 'ia' AND sessao_id IS NOT NULL AND questao_ref IS NOT NULL
            GROUP BY sessao_id, questao_ref HAVING count(*) > 1) grupos
        )
      ) FROM public.treino_respostas
    $q$ INTO resultado;
    RAISE NOTICE 'treino_respostas: %', resultado;

    IF (SELECT count(*) FROM pg_attribute WHERE attrelid = questoes AND attnum > 0
         AND NOT attisdropped AND attname IN ('id','versao')) = 2 THEN
      EXECUTE $q$
        SELECT jsonb_build_object('autorais_sem_versao_correspondente', count(*))
        FROM public.treino_respostas r
        WHERE r.origem_questao::text = 'ia'
          AND NOT EXISTS (SELECT FROM public.questoes_ia q
            WHERE concat('ia:', q.id, ':', q.versao) = lower(r.questao_ref::text))
      $q$ INTO resultado;
      RAISE NOTICE 'vinculo_autoral: %', resultado;
    ELSE
      RAISE NOTICE 'vinculo_autoral: id e versao indisponíveis';
    END IF;
  ELSE
    RAISE NOTICE 'treino_respostas: tabela ou colunas históricas necessárias indisponíveis';
  END IF;

  IF (SELECT count(*) FROM pg_attribute WHERE attrelid = buckets AND attnum > 0
       AND NOT attisdropped AND attname IN ('id','public')) = 2 THEN
    EXECUTE $q$
      SELECT coalesce(jsonb_agg(jsonb_build_object('bucket', id, 'publico', public) ORDER BY id), '[]')
      FROM storage.buckets WHERE id ~* '(ifpass|quest)'
    $q$ INTO resultado;
    RAISE NOTICE 'buckets_candidatos: %', resultado;
  ELSE
    RAISE NOTICE 'storage.buckets: catálogo indisponível';
  END IF;
END;
$diagnostico$;

COMMIT;
