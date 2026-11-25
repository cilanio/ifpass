\set ON_ERROR_STOP on
\if :{?ifpass_ambiente_descartavel}
\else
SELECT 1 / 0;
\endif

-- Usa as contas fictícias da fixture em uma instância descartável via socket.
DO $$
BEGIN
  IF inet_server_addr() IS NOT NULL OR to_regclass('ifpass_teste.historico') IS NULL THEN
    RAISE EXCEPTION 'Use somente a instância descartável com a fixture';
  END IF;
END;
$$;

CREATE EXTENSION dblink WITH SCHEMA ifpass_teste;

INSERT INTO public.papeis_equipe (usuario_id,papel,alterado_por)
VALUES ('00000000-0000-4000-8000-000000000004','revisor_pedagogico','00000000-0000-4000-8000-000000000003'),
       ('00000000-0000-4000-8000-000000000005','revisor_pedagogico','00000000-0000-4000-8000-000000000003');
INSERT INTO public.revisor_disciplinas(usuario_id,disciplina,alterado_por)
SELECT usuario_id,'Português',alterado_por FROM public.papeis_equipe;

INSERT INTO public.questoes_ia (
  id, versao, disciplina, assunto_id, etapa, habilidade_principal, dificuldade,
  enunciado, alternativas, resposta_correta, explicacao, status, submetida_por
) VALUES (
  '00000000-0000-4000-8000-000000000110',1,'Português','p_texto','aplicacao','aplicacao','facil',
  'Questão concorrente fictícia','{"A":"Um","B":"Dois","C":"Três","D":"Quatro","E":"Cinco"}','A',
  '{"correta":"Motivo A","distratores":{"B":"Motivo B","C":"Motivo C","D":"Motivo D","E":"Motivo E"}}',
  'em_revisao','00000000-0000-4000-8000-000000000003'
);

DO $teste$
DECLARE
  checklist constant text := '{"gabarito_incorreto":false,"alternativa_correta_nao_unica":false,"erro_conceitual_ou_matematico":false,"ambiguidade":false,"informacoes_insuficientes":false,"fora_do_edital_sem_justificativa":false,"explicacao_incompativel":false,"reproducao_indevida":false,"fidelidade_edital":true,"correcao_cientifica_matematica_linguistica":true,"clareza_precisao":true,"qualidade_alternativas":true,"adequacao_dificuldade":true,"compatibilidade_copeve":false,"qualidade_explicacao":true}';
  pergunta constant text := '00000000-0000-4000-8000-000000000110';
  conn text := format('dbname=%s application_name=ifpass_revisao_concorrente', current_database());
  chave uuid;
  limite timestamptz;
BEGIN
  PERFORM ifpass_teste.dblink_connect('primeira', conn || ' application_name=ifpass_revisao_primeira');
  PERFORM ifpass_teste.dblink_connect('segunda', conn);
  PERFORM ifpass_teste.dblink_exec('primeira','BEGIN');
  PERFORM ifpass_teste.dblink_exec('primeira','SET LOCAL ROLE authenticated');
  PERFORM ifpass_teste.dblink_exec('primeira',
    $cmd$SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000004"}'$cmd$);
  SELECT id INTO chave FROM ifpass_teste.dblink('primeira',
    format('SELECT public.ifpass_revisar_questao(%L,1,%L,1,%L)',pergunta,'aprovada',checklist)) AS x(id uuid);
  IF chave IS NULL THEN RAISE EXCEPTION 'Primeira revisão não retornou auditoria'; END IF;

  PERFORM ifpass_teste.dblink_exec('segunda','BEGIN');
  PERFORM ifpass_teste.dblink_exec('segunda','SET LOCAL ROLE authenticated');
  PERFORM ifpass_teste.dblink_exec('segunda',
    $cmd$SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000005"}'$cmd$);
  PERFORM ifpass_teste.dblink_send_query('segunda',
    format('SELECT public.ifpass_revisar_questao(%L,1,%L,1,%L)',pergunta,'rejeitada',checklist));

  limite := clock_timestamp() + interval '5 seconds';
  LOOP
    PERFORM pg_stat_clear_snapshot();
    EXIT WHEN EXISTS (SELECT FROM pg_stat_activity
      WHERE application_name='ifpass_revisao_concorrente' AND wait_event_type='Lock');
    IF clock_timestamp() > limite THEN RAISE EXCEPTION 'A segunda revisão não aguardou o bloqueio'; END IF;
    PERFORM pg_sleep(0.025);
  END LOOP;

  PERFORM ifpass_teste.dblink_exec('primeira','COMMIT');
  PERFORM id FROM ifpass_teste.dblink_get_result('segunda',false) AS x(id uuid);
  IF FOUND OR ifpass_teste.dblink_error_message('segunda') NOT LIKE '%Versão fora da fila de revisão%' THEN
    RAISE EXCEPTION 'A segunda revisão deveria ser recusada após o primeiro commit';
  END IF;
  PERFORM ifpass_teste.dblink_disconnect('primeira');
  PERFORM ifpass_teste.dblink_disconnect('segunda');
  RAISE NOTICE 'OK: segunda revisão aguardou e foi recusada após o commit concorrente';
END;
$teste$;

DO $$
BEGIN
  IF (SELECT count(*) FROM public.revisoes_questoes
        WHERE questao_id='00000000-0000-4000-8000-000000000110' AND decisao='aprovada') <> 1
    OR (SELECT count(*) FROM public.revisoes_questoes
        WHERE questao_id='00000000-0000-4000-8000-000000000110') <> 1
    OR NOT EXISTS (SELECT FROM public.questoes_ia
        WHERE id='00000000-0000-4000-8000-000000000110' AND versao=1 AND status='aprovada') THEN
    RAISE EXCEPTION 'A decisão concorrente alterou o estado ou a trilha';
  END IF;
  RAISE NOTICE 'OK: concorrência deixou apenas uma decisão e uma versão aprovada';
END;
$$;
