\set ON_ERROR_STOP on
\if :{?ifpass_ambiente_descartavel}
\else
SELECT 1 / 0;
\endif

BEGIN;

CREATE FUNCTION pg_temp.conferir(condicao boolean, nome text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF condicao IS DISTINCT FROM true THEN RAISE EXCEPTION 'Falhou: %', nome; END IF;
  RAISE NOTICE 'OK: %', nome;
END;
$$;
CREATE FUNCTION pg_temp.negado(comando text, codigo text, nome text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE comando;
  EXCEPTION WHEN OTHERS THEN
    PERFORM pg_temp.conferir(SQLSTATE = codigo, nome || ' (' || SQLSTATE || ')');
    RETURN;
  END;
  RAISE EXCEPTION 'Operação deveria falhar: %', nome;
END;
$$;

SELECT pg_temp.conferir(
  (SELECT count(*) = 18 AND bool_and(item_id IS NULL AND questao_id IS NULL AND questao_versao IS NULL)
    FROM public.treino_respostas)
  AND NOT EXISTS (
    SELECT FROM ifpass_teste.historico h
    LEFT JOIN public.treino_respostas r USING (id)
    WHERE (to_jsonb(r) - ARRAY['item_id','questao_id','questao_versao']) IS DISTINCT FROM to_jsonb(h)),
  'os 18 registros históricos conservam todos os valores originais'
);

-- Fixture local do provisionamento inicial. Nenhum usuário real é criado.
INSERT INTO public.papeis_equipe (usuario_id, papel, alterado_por)
VALUES ('00000000-0000-4000-8000-000000000003', 'administrador', '00000000-0000-4000-8000-000000000003');

INSERT INTO public.questoes_ia (
  id, versao, disciplina, assunto_id, etapa, habilidade_principal, dificuldade,
  enunciado, alternativas, resposta_correta, explicacao
)
SELECT id::uuid, versao, disciplina, 'p_texto', 'aplicacao', 'aplicacao', 'facil',
  'Enunciado fictício', '{"A":"Um","B":"Dois","C":"Três","D":"Quatro","E":"Cinco"}', 'A',
  '{"correta":"Justificativa A","distratores":{"B":"Motivo B","C":"Motivo C","D":"Motivo D","E":"Motivo E"}}'
FROM (VALUES
  ('00000000-0000-4000-8000-000000000101',1,'Português'),
  ('00000000-0000-4000-8000-000000000101',2,'Português'),
  ('00000000-0000-4000-8000-000000000102',1,'Matemática'),
  ('00000000-0000-4000-8000-000000000103',1,'Português'),
  ('00000000-0000-4000-8000-000000000104',1,'Português')
) AS perguntas(id, versao, disciplina);

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000001"}';
SELECT pg_temp.negado(
  $$SELECT public.ifpass_gerir_equipe(auth.uid(),'administrador',true)$$,
  '42501', 'aluno não pode atribuir privilégios');
SELECT pg_temp.negado(
  $$INSERT INTO public.papeis_equipe(usuario_id,papel,alterado_por) VALUES(auth.uid(),'administrador',auth.uid())$$,
  '42501', 'inserção direta de papel negada');
SELECT pg_temp.conferir((SELECT count(*) = 0 FROM public.questoes_ia), 'aluno não lê questões e gabaritos diretamente');
SELECT pg_temp.conferir((SELECT count(*) = 0 FROM public.revisoes_questoes), 'aluno não lê revisões');

INSERT INTO public.treino_sessoes(id, assunto)
VALUES ('00000000-0000-4000-8000-000000000201','p_texto');
INSERT INTO public.treino_respostas (prova_id,n,assunto,acertou)
VALUES ('ifal-2026-t1',19,'p_texto',true);
SELECT pg_temp.conferir((SELECT count(*)=19 FROM public.treino_respostas), 'inserção oficial antiga continua funcionando');
SELECT pg_temp.negado(
  $$SELECT public.ifpass_atribuir_autoral('00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000101')$$,
  '42501', 'aluno não recebe rascunho');
SELECT pg_temp.negado(
  $$INSERT INTO public.treino_respostas (origem_questao,assunto,acertou) VALUES ('ia','p_texto',true)$$,
  '42501', 'inserção autoral direta bloqueada');
SELECT pg_temp.negado(
  $$INSERT INTO public.treino_respostas (questao_ref,assunto,acertou) VALUES ('ia:fora-do-fluxo','p_texto',true)$$,
  '42501', 'referência autoral sem origem declarada também é bloqueada');

SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000003"}';
SELECT pg_temp.negado($$SELECT public.ifpass_gerir_equipe(auth.uid(),'administrador',false)$$,
  '42501','administrador não altera a própria atribuição');
SELECT pg_temp.negado(
  $$SELECT public.ifpass_gerir_equipe('00000000-0000-4000-8000-000000000001','administrador',true)$$,
  '23514', 'conta com histórico de aluno não pode virar conta de equipe');
SELECT public.ifpass_gerir_equipe('00000000-0000-4000-8000-000000000004','revisor_pedagogico',true);
SELECT public.ifpass_gerir_equipe('00000000-0000-4000-8000-000000000004','revisor_pedagogico',true,'Português');
SELECT public.ifpass_gerir_equipe('00000000-0000-4000-8000-000000000005','revisor_pedagogico',true);
SELECT public.ifpass_gerir_equipe('00000000-0000-4000-8000-000000000005','revisor_pedagogico',true,'Português');
SELECT public.ifpass_submeter_questao('00000000-0000-4000-8000-000000000101',1);
SELECT public.ifpass_submeter_questao('00000000-0000-4000-8000-000000000102',1);
SELECT public.ifpass_submeter_questao('00000000-0000-4000-8000-000000000103',1);
SELECT public.ifpass_submeter_questao('00000000-0000-4000-8000-000000000104',1);

SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000004"}';
SELECT pg_temp.conferir((SELECT count(*)=0 FROM public.treino_respostas)
  AND (SELECT count(*)=0 FROM public.treino_sessoes),'revisor não lê dados de alunos');
SELECT pg_temp.negado(
  $$INSERT INTO public.treino_sessoes(assunto) VALUES ('p_texto')$$,
  '42501', 'conta de equipe não cria sessão de aluno');
SELECT pg_temp.conferir(
  EXISTS (SELECT FROM public.questoes_ia WHERE disciplina='Português')
  AND NOT EXISTS (SELECT FROM public.questoes_ia WHERE disciplina='Matemática'),
  'RLS da revisão limita a disciplina');
SELECT pg_temp.negado(
  $$SELECT public.ifpass_revisar_questao('00000000-0000-4000-8000-000000000102',1,'aprovada',1,'{}')$$,
  '42501','revisor não decide fora da disciplina');
SELECT pg_temp.negado(
  $$SELECT public.ifpass_revisar_questao('00000000-0000-4000-8000-000000000101',1,'aprovada',1,'{}')$$,
  '23514','checklist incompleto não aprova');

\set checklist '{"gabarito_incorreto":false,"alternativa_correta_nao_unica":false,"erro_conceitual_ou_matematico":false,"ambiguidade":false,"informacoes_insuficientes":false,"fora_do_edital_sem_justificativa":false,"explicacao_incompativel":false,"reproducao_indevida":false}'
SELECT set_config('ifpass.checklist', :'checklist', true);
SELECT pg_temp.negado(
  $$SELECT public.ifpass_revisar_questao('00000000-0000-4000-8000-000000000101',1,'aprovada',1,
    current_setting('ifpass.checklist')::jsonb || '{"gabarito_incorreto":true}')$$,
  '23514','critério eliminatório impede aprovação');
SELECT public.ifpass_revisar_questao('00000000-0000-4000-8000-000000000101',1,'aprovada',1,:'checklist');
SELECT public.ifpass_revisar_questao('00000000-0000-4000-8000-000000000103',1,'correcao_solicitada',1,:'checklist','Rever enunciado');
SELECT public.ifpass_revisar_questao('00000000-0000-4000-8000-000000000104',1,'rejeitada',1,:'checklist');
SELECT pg_temp.conferir(
  (SELECT count(*) = 3 AND bool_and(revisor_id=auth.uid() AND checklist_versao=1
    AND criado_em IS NOT NULL) FROM public.revisoes_questoes)
  AND EXISTS (SELECT FROM public.revisoes_questoes WHERE observacoes='Rever enunciado'),
  'trilha registra revisor, checklist, observação e as três decisões');

SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000003"}';
SELECT public.ifpass_submeter_questao('00000000-0000-4000-8000-000000000101',2);
SELECT pg_temp.negado(
  $$SELECT public.ifpass_revisar_questao('00000000-0000-4000-8000-000000000101',2,'aprovada',1,'{}')$$,
  '42501','administrador que submeteu não pode aprovar');

SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000001"}';
SELECT public.ifpass_atribuir_autoral('00000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000101') AS item \gset
SELECT pg_temp.conferir(
  (:'item'::jsonb ->> 'questao_ref') = 'ia:00000000-0000-4000-8000-000000000101:1'
  AND NOT (:'item'::jsonb ?| ARRAY['gabarito','resposta_correta','explicacao']),
  'sucessora em revisão não retira a aprovada e apresentação omite gabarito');
SELECT set_config('ifpass.item', :'item'::jsonb ->> 'item_id', true);
SELECT public.ifpass_responder_autoral(current_setting('ifpass.item')::uuid, 'B') AS primeira \gset
SELECT pg_temp.conferir(
  public.ifpass_responder_autoral(current_setting('ifpass.item')::uuid,'B') = :'primeira'::jsonb
  AND (:'primeira'::jsonb ->> 'gabarito') = 'A'
  AND (:'primeira'::jsonb #>> '{explicacao,distratores,B}') = 'Motivo B'
  AND (SELECT count(*)=1 AND bool_and(questao_versao=1 AND NOT acertou)
       FROM public.treino_respostas WHERE item_id = current_setting('ifpass.item')::uuid),
  'correção do servidor, FK da versão e reenvio idempotente');
SELECT pg_temp.negado(
  $$SELECT public.ifpass_responder_autoral(current_setting('ifpass.item')::uuid,'A')$$,
  '23505','segunda alternativa não substitui a primeira');

SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000002"}';
SELECT pg_temp.negado(
  $$SELECT public.ifpass_responder_autoral(current_setting('ifpass.item')::uuid,'B')$$,
  '42501','outro aluno não tem acesso ao item nem ao gabarito');

SET LOCAL ROLE anon;
SELECT pg_temp.negado($$SELECT public.ifpass_responder_autoral(NULL,'A')$$,
  '42501','anônimo não pode executar RPC de resposta');
SELECT pg_temp.negado($$SELECT id FROM public.questoes_ia$$,'42501','anônimo não lê catálogo autoral');

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000004"}';
SELECT public.ifpass_revisar_questao('00000000-0000-4000-8000-000000000101',2,'aprovada',1,:'checklist');
SELECT pg_temp.conferir(
  (SELECT count(*)=2 AND count(*) FILTER (WHERE versao=1 AND status='retirada')=1
     AND count(*) FILTER (WHERE versao=2 AND status='aprovada')=1
   FROM public.questoes_ia WHERE id='00000000-0000-4000-8000-000000000101'),
  'sucessora aprovada substitui publicação e preserva a versão anterior');

SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000003"}';
SELECT public.ifpass_gerir_equipe('00000000-0000-4000-8000-000000000004','revisor_pedagogico',false,'Português');
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000004"}';
SELECT pg_temp.conferir(NOT EXISTS (SELECT FROM public.questoes_ia),
  'revogação da disciplina bloqueia leitura imediatamente');
SELECT pg_temp.negado(
  $$SELECT public.ifpass_revisar_questao('00000000-0000-4000-8000-000000000101',2,'rejeitada',1,'{}')$$,
  '42501','revogação da disciplina bloqueia decisões');

RESET ROLE;
SELECT pg_temp.negado(
  $$UPDATE public.questoes_ia SET enunciado='Mudança indevida' WHERE id='00000000-0000-4000-8000-000000000101' AND versao=1$$,
  '23514','versão já aprovada permanece imutável após retirada');
SELECT pg_temp.negado(
  $$INSERT INTO public.treino_itens_autorais(user_id,sessao_id,questao_id,questao_versao)
    VALUES ('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000201',
            '00000000-0000-4000-8000-000000000102',1)$$,
  '23503','FK composta rejeita item ligado à sessão de outro aluno');

ROLLBACK;
