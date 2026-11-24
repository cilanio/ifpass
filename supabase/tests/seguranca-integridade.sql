\set ON_ERROR_STOP on

\if :{?ifpass_ambiente_descartavel}
\else
  \echo Use esta suíte somente na instância local descartável indicada no README.
  SELECT 1 / 0;
\endif

BEGIN;
SET LOCAL search_path = public, pg_catalog;

CREATE FUNCTION pg_temp.conferir(condicao boolean, cenario text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF condicao IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Falhou: %', cenario;
  END IF;
  RAISE NOTICE 'OK: %', cenario;
END;
$$;

CREATE FUNCTION pg_temp.erro_esperado(comando text, codigo text, cenario text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE comando;
  EXCEPTION WHEN OTHERS THEN
    PERFORM pg_temp.conferir(SQLSTATE = codigo, cenario || ' (SQLSTATE ' || SQLSTATE || ')');
    RETURN;
  END;
  RAISE EXCEPTION 'Falhou: % (esperado SQLSTATE %)', cenario, codigo;
END;
$$;

SELECT pg_temp.conferir(inet_server_addr() IS NULL AND NOT EXISTS (SELECT FROM auth.users),
  'execução via socket local e catálogo de usuários vazio');

SELECT pg_temp.conferir(
  (SELECT count(*) = 8 AND bool_and(relrowsecurity)
     FROM pg_class WHERE oid IN (
       'profiles'::regclass, 'materias'::regclass, 'plano_blocos'::regclass,
       'estudos_feitos'::regclass, 'simulados'::regclass, 'treino_sessoes'::regclass,
       'treino_respostas'::regclass, 'questoes_ia'::regclass
     )), 'RLS habilitada nas oito tabelas');

-- has_table_privilege considera grants diretos, herdados e via PUBLIC.
-- A suíte verifica o catálogo sem executar TRUNCATE.
SELECT pg_temp.conferir(
  has_table_privilege(papel, tabela::regclass, 'TRUNCATE')
    = (papel IN ('postgres', 'service_role')),
  'TRUNCATE efetivo ' || papel || ' / ' || tabela)
FROM unnest(ARRAY['anon', 'authenticated', 'postgres', 'service_role']) AS papel
CROSS JOIN unnest(ARRAY[
  'public.profiles', 'public.materias', 'public.plano_blocos', 'public.estudos_feitos',
  'public.simulados', 'public.treino_sessoes', 'public.treino_respostas', 'public.questoes_ia'
]) AS tabela;

-- Preserva REFERENCES e TRIGGER além da matriz CRUD abaixo.
SELECT pg_temp.conferir(
  has_table_privilege(papel, tabela::regclass, 'REFERENCES')
  AND has_table_privilege(papel, tabela::regclass, 'TRIGGER'),
  'REFERENCES e TRIGGER preservados ' || papel || ' / ' || tabela)
FROM unnest(ARRAY['anon', 'authenticated']) AS papel
CROSS JOIN unnest(ARRAY[
  'public.profiles', 'public.materias', 'public.plano_blocos', 'public.estudos_feitos'
]) AS tabela;

-- Compara ACL separadamente da visibilidade de linhas controlada por RLS.
WITH permissoes(papel, tabela, esperadas) AS (
  VALUES
    ('anon', 'profiles', 'D,I,S,U'), ('authenticated', 'profiles', 'D,I,S'),
    ('anon', 'materias', 'D,I,S,U'), ('authenticated', 'materias', 'D,I,S,U'),
    ('anon', 'plano_blocos', 'D,I,S,U'), ('authenticated', 'plano_blocos', 'D,I,S,U'),
    ('anon', 'estudos_feitos', 'D,I,S,U'), ('authenticated', 'estudos_feitos', 'D,I,S,U'),
    ('anon', 'simulados', ''), ('authenticated', 'simulados', 'I,S,U'),
    ('anon', 'treino_sessoes', ''), ('authenticated', 'treino_sessoes', 'I,S,U'),
    ('anon', 'treino_respostas', ''), ('authenticated', 'treino_respostas', 'I,S'),
    ('anon', 'questoes_ia', ''), ('authenticated', 'questoes_ia', '')
)
SELECT pg_temp.conferir(
  concat_ws(',',
    CASE WHEN has_table_privilege(papel, tabela, 'DELETE') THEN 'D' END,
    CASE WHEN has_table_privilege(papel, tabela, 'INSERT') THEN 'I' END,
    CASE WHEN has_table_privilege(papel, tabela, 'SELECT') THEN 'S' END,
    CASE WHEN has_table_privilege(papel, tabela, 'UPDATE') THEN 'U' END
  ) = esperadas, 'ACL CRUD ' || papel || ' / ' || tabela)
FROM permissoes;

SELECT pg_temp.conferir(
  NOT has_table_privilege('authenticated', 'profiles', 'UPDATE')
  AND NOT has_any_column_privilege('authenticated', 'profiles', 'UPDATE'),
  'UPDATE de profiles ausente no nível de tabela e coluna');

INSERT INTO auth.users (id, raw_user_meta_data)
VALUES
  ('00000000-0000-4000-8000-000000000001', '{"nome":"Pessoa A","papel":"aluno"}'),
  ('00000000-0000-4000-8000-000000000002', '{"nome":"Pessoa B","papel":"responsavel"}');

SELECT pg_temp.conferir(
  (SELECT count(*) = 2 FROM profiles WHERE
    (id = '00000000-0000-4000-8000-000000000001' AND nome = 'Pessoa A' AND papel = 'aluno')
    OR (id = '00000000-0000-4000-8000-000000000002' AND nome = 'Pessoa B' AND papel = 'responsavel')),
  'trigger cria os dois perfis com os metadados fictícios');

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}';

INSERT INTO materias (id, nome, cor) VALUES ('00000000-0000-4000-8000-000000000011', 'Matéria A', '#000');
INSERT INTO plano_blocos (id, materia_id, dia_semana, hora_inicio, duracao_min)
VALUES ('00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000011', 1, '08:00', 30);
INSERT INTO estudos_feitos (bloco_id, data) VALUES ('00000000-0000-4000-8000-000000000012', '2026-11-24');
INSERT INTO simulados (id, prova_id) VALUES ('00000000-0000-4000-8000-000000000013', 'prova-sintetica');
INSERT INTO treino_sessoes (id, assunto) VALUES ('00000000-0000-4000-8000-000000000014', 'assunto-sintetico');
INSERT INTO treino_respostas (sessao_id, assunto, acertou, alternativa_escolhida, alternativa_correta)
VALUES ('00000000-0000-4000-8000-000000000014', 'assunto-sintetico', true, 'A', 'A');

SELECT pg_temp.conferir(
  (SELECT count(*) = 1 FROM profiles)
  AND (SELECT count(*) = 1 FROM materias)
  AND (SELECT count(*) = 1 FROM plano_blocos)
  AND (SELECT count(*) = 1 FROM estudos_feitos)
  AND (SELECT count(*) = 1 FROM simulados WHERE status = 'em_andamento')
  AND (SELECT count(*) = 1 FROM treino_sessoes WHERE status = 'em_andamento')
  AND (SELECT count(*) = 1 FROM treino_respostas),
  'A lê seus próprios registros e as tentativas iniciam em andamento');

SELECT pg_temp.erro_esperado($sql$UPDATE profiles SET nome = 'Outro nome' WHERE id = auth.uid()$sql$,
  '42501', 'atualização do próprio perfil é negada no snapshot carregado');
SELECT pg_temp.erro_esperado($sql$DELETE FROM simulados$sql$, '42501', 'authenticated não exclui simulados');
SELECT pg_temp.erro_esperado($sql$DELETE FROM treino_sessoes$sql$, '42501', 'authenticated não exclui sessões');
SELECT pg_temp.erro_esperado($sql$UPDATE treino_respostas SET acertou = false$sql$,
  '42501', 'authenticated não atualiza respostas de treino');
SELECT pg_temp.erro_esperado($sql$SELECT id FROM questoes_ia$sql$, '42501', 'authenticated não lê questões autorais');
SELECT pg_temp.erro_esperado($sql$INSERT INTO questoes_ia DEFAULT VALUES$sql$,
  '42501', 'authenticated não insere questões autorais');

SELECT pg_temp.erro_esperado($sql$UPDATE simulados SET status = 'invalido'$sql$,
  '23514', 'status inválido de simulado');
SELECT pg_temp.erro_esperado($sql$UPDATE treino_sessoes SET status = 'invalido'$sql$,
  '23514', 'status inválido de sessão');
SELECT pg_temp.erro_esperado($sql$INSERT INTO treino_respostas (assunto, acertou, alternativa_escolhida)
  VALUES ('assunto-sintetico', false, 'F')$sql$, '23514', 'alternativa escolhida inválida');
SELECT pg_temp.erro_esperado($sql$INSERT INTO treino_respostas (assunto, acertou, alternativa_correta)
  VALUES ('assunto-sintetico', false, 'F')$sql$, '23514', 'alternativa correta inválida');

UPDATE simulados SET respostas = '{"1":"A"}', marcadas = '[1]' WHERE id = '00000000-0000-4000-8000-000000000013';
SELECT pg_temp.conferir(
  EXISTS (SELECT FROM simulados WHERE respostas = '{"1":"A"}' AND marcadas = '[1]'),
  'respostas e marcações são persistidas e recuperadas');
UPDATE simulados SET status = 'finalizado', duracao_seg = 30, acertos = 1, total = 1,
  finalizado_em = now(), resultado = '{"acertos":1}'
WHERE id = '00000000-0000-4000-8000-000000000013' AND status = 'em_andamento';
UPDATE treino_sessoes SET status = 'finalizada', total_questoes = 1, acertos = 1, finalizado_em = now()
WHERE id = '00000000-0000-4000-8000-000000000014' AND status = 'em_andamento';

WITH repeticao AS (
  UPDATE simulados SET acertos = 0
  WHERE id = '00000000-0000-4000-8000-000000000013' AND status = 'em_andamento'
  RETURNING id
)
SELECT pg_temp.conferir(NOT EXISTS (SELECT FROM repeticao), 'filtro de status impede repetir a finalização');
SELECT pg_temp.conferir(
  EXISTS (SELECT FROM simulados WHERE status = 'finalizado' AND acertos = 1 AND finalizado_em IS NOT NULL)
  AND EXISTS (SELECT FROM treino_sessoes WHERE status = 'finalizada' AND acertos = 1 AND total_questoes = 1)
  AND EXISTS (SELECT FROM treino_respostas WHERE acertou AND sessao_id = '00000000-0000-4000-8000-000000000014'),
  'simulado e sessão finalizados mantêm totais e resposta vinculada');

SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated"}';

SELECT pg_temp.conferir(
  (SELECT count(*) = 1 AND bool_and(id = auth.uid()) FROM profiles)
  AND NOT EXISTS (SELECT FROM materias)
  AND NOT EXISTS (SELECT FROM plano_blocos)
  AND NOT EXISTS (SELECT FROM estudos_feitos)
  AND NOT EXISTS (SELECT FROM simulados)
  AND NOT EXISTS (SELECT FROM treino_sessoes)
  AND NOT EXISTS (SELECT FROM treino_respostas),
  'B lê seu perfil e não vê os registros de A');

WITH atualizadas AS (
  UPDATE materias SET nome = 'Alteração de B' WHERE id = '00000000-0000-4000-8000-000000000011' RETURNING id
), excluidas AS (
  DELETE FROM plano_blocos WHERE id = '00000000-0000-4000-8000-000000000012' RETURNING id
)
SELECT pg_temp.conferir(
  NOT EXISTS (SELECT FROM atualizadas) AND NOT EXISTS (SELECT FROM excluidas),
  'RLS limita atualização e exclusão a registros do proprietário');

SELECT pg_temp.erro_esperado($sql$INSERT INTO materias (user_id, nome, cor)
  VALUES ('00000000-0000-4000-8000-000000000001', 'Outro dono', '#000')$sql$,
  '42501', 'RLS rejeita inserção com o dono incorreto');
SELECT pg_temp.erro_esperado($sql$INSERT INTO plano_blocos (materia_id, dia_semana, hora_inicio, duracao_min)
  VALUES ('00000000-0000-4000-8000-000000000011', 1, '08:00', 30)$sql$,
  '23503', 'FK rejeita bloco ligado à matéria de outro usuário');
SELECT pg_temp.erro_esperado($sql$INSERT INTO estudos_feitos (bloco_id, data)
  VALUES ('00000000-0000-4000-8000-000000000012', '2026-11-25')$sql$,
  '23503', 'FK rejeita estudo ligado ao bloco de outro usuário');
SELECT pg_temp.erro_esperado($sql$INSERT INTO treino_respostas (sessao_id, assunto, acertou)
  VALUES ('00000000-0000-4000-8000-000000000014', 'assunto-sintetico', false)$sql$,
  '23503', 'FK rejeita resposta ligada à sessão de outro usuário');

INSERT INTO materias (id, nome, cor) VALUES ('00000000-0000-4000-8000-000000000021', 'Matéria B', '#111');
SELECT pg_temp.conferir(
  (SELECT count(*) = 1 AND bool_and(user_id = auth.uid()) FROM materias),
  'B pode criar e ler sua própria matéria');

SET LOCAL ROLE anon;
SET LOCAL request.jwt.claims = '{"role":"anon"}';

SELECT pg_temp.conferir(
  NOT EXISTS (SELECT FROM profiles)
  AND NOT EXISTS (SELECT FROM materias)
  AND NOT EXISTS (SELECT FROM plano_blocos)
  AND NOT EXISTS (SELECT FROM estudos_feitos),
  'RLS filtra registros para anon nas tabelas com SELECT concedido');
SELECT pg_temp.erro_esperado($sql$INSERT INTO materias (user_id, nome, cor)
  VALUES ('00000000-0000-4000-8000-000000000001', 'Matéria anônima', '#000')$sql$,
  '42501', 'RLS rejeita inserção anônima');
SELECT pg_temp.erro_esperado($sql$SELECT id FROM simulados$sql$, '42501', 'anon não lê simulados');
SELECT pg_temp.erro_esperado($sql$SELECT id FROM treino_sessoes$sql$, '42501', 'anon não lê sessões');
SELECT pg_temp.erro_esperado($sql$SELECT id FROM treino_respostas$sql$, '42501', 'anon não lê respostas');
SELECT pg_temp.erro_esperado($sql$SELECT id FROM questoes_ia$sql$, '42501', 'anon não lê questões autorais');

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}';

SELECT pg_temp.conferir(
  (SELECT count(*) = 1 AND bool_and(user_id = auth.uid()) FROM materias),
  'A não vê a matéria de B');

WITH atualizadas AS (
  UPDATE materias SET nome = 'Matéria A revisada' WHERE id = '00000000-0000-4000-8000-000000000011' RETURNING id
)
SELECT pg_temp.conferir((SELECT count(*) = 1 FROM atualizadas), 'A atualiza a própria matéria');
WITH excluidas AS (
  DELETE FROM materias WHERE id = '00000000-0000-4000-8000-000000000011' RETURNING id
)
SELECT pg_temp.conferir((SELECT count(*) = 1 FROM excluidas), 'A exclui a própria matéria');
SELECT pg_temp.conferir(
  NOT EXISTS (SELECT FROM plano_blocos) AND NOT EXISTS (SELECT FROM estudos_feitos),
  'exclusão da matéria remove blocos e registros de estudo vinculados');

RESET ROLE;
SELECT pg_temp.erro_esperado($sql$DELETE FROM auth.users WHERE id = '00000000-0000-4000-8000-000000000001'$sql$,
  '23503', 'FK sem cascata impede excluir usuário de teste com sessão');
DELETE FROM treino_sessoes WHERE id = '00000000-0000-4000-8000-000000000014';
SELECT pg_temp.conferir(NOT EXISTS (
  SELECT FROM treino_respostas WHERE sessao_id = '00000000-0000-4000-8000-000000000014'
), 'exclusão da sessão fictícia remove suas respostas');
DELETE FROM auth.users WHERE id = '00000000-0000-4000-8000-000000000001';
SELECT pg_temp.conferir(
  NOT EXISTS (SELECT FROM profiles WHERE id = '00000000-0000-4000-8000-000000000001')
  AND NOT EXISTS (SELECT FROM simulados WHERE id = '00000000-0000-4000-8000-000000000013')
  AND EXISTS (SELECT FROM profiles WHERE id = '00000000-0000-4000-8000-000000000002'),
  'exclusão de A em cascata preserva o perfil de B');

ROLLBACK;
