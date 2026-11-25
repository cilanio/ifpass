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
    PERFORM pg_temp.conferir(SQLSTATE = codigo, nome);
    RETURN;
  END;
  RAISE EXCEPTION 'Operação deveria falhar: %', nome;
END;
$$;

INSERT INTO public.papeis_equipe (usuario_id, papel, alterado_por)
VALUES ('00000000-0000-4000-8000-000000000003', 'administrador', '00000000-0000-4000-8000-000000000003');

ALTER TABLE public.questoes_ia DISABLE TRIGGER ifpass_exigir_visualizacao_imagem;
INSERT INTO public.questoes_ia (
  id, disciplina, assunto_id, topico_id, etapa, habilidade_principal, dificuldade,
  enunciado, alternativas, resposta_correta, explicacao, finalidade, desafio_copeve,
  status, submetida_por, imagem, aprovado_em
)
SELECT ('00000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,
  'Língua Portuguesa','p_texto','topico-1','fundamentos','compreensao','facil',
  'Questão sintética ' || n, '{"A":"Um","B":"Dois","C":"Três","D":"Quatro","E":"Cinco"}',
  'A','{"correta":"Explicação sintética","distratores":{"B":"B","C":"C","D":"D","E":"E"}}',
  CASE WHEN n = 104 THEN 'avaliacao' ELSE 'aprendizagem' END, n = 106,
  CASE WHEN n = 103 THEN 'rascunho' ELSE 'aprovada' END,
  '00000000-0000-4000-8000-000000000004',
  CASE WHEN n IN (101,102) THEN 'ficticio/figura.png' END, CASE WHEN n <> 103 THEN now() END
FROM generate_series(101,106) n;
ALTER TABLE public.questoes_ia ENABLE TRIGGER ifpass_exigir_visualizacao_imagem;

-- Fixtures sintéticas isolam a etapa 7.3 da aprovação de imagens, que continua bloqueada na etapa 7.2.
\set checklist '{"gabarito_incorreto":false,"alternativa_correta_nao_unica":false,"erro_conceitual_ou_matematico":false,"ambiguidade":false,"informacoes_insuficientes":false,"fora_do_edital_sem_justificativa":false,"explicacao_incompativel":false,"reproducao_indevida":false,"fidelidade_edital":true,"correcao_cientifica_matematica_linguistica":true,"clareza_precisao":true,"qualidade_alternativas":true,"adequacao_dificuldade":true,"compatibilidade_copeve":true,"qualidade_explicacao":true}'
INSERT INTO public.revisoes_questoes (questao_id, questao_versao, revisor_id, checklist_versao, criterios, decisao)
SELECT id, versao, '00000000-0000-4000-8000-000000000003', 1, :'checklist'::jsonb, 'aprovada'
FROM public.questoes_ia WHERE id::text NOT LIKE '%105';

SET LOCAL ROLE anon;
SELECT pg_temp.negado($$SELECT public.ifpass_treino_retomar()$$, '42501', 'anônimo não executa RPC de sessão');

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000003"}';
SELECT pg_temp.negado($$SELECT public.ifpass_treino_retomar()$$, '42501', 'conta de equipe não acessa sessões');
SELECT pg_temp.conferir((SELECT minimo = 5 AND quantidade = 2 AND topicos = 1
  FROM public.ifpass_treino_cobertura('p_texto') WHERE etapa = 'fundamentos'),
  'cobertura separa mínimo, quantidade e tópicos');

SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000001"}';
SELECT pg_temp.conferir(public.ifpass_treino_iniciar('p_texto','fundamentos')->>'status' = 'treino_indisponivel',
  'migração mantém novo treino desabilitado');
RESET ROLE;
UPDATE public.treino_configuracao_autoral SET habilitado = true WHERE etapa = 'fundamentos';
SET LOCAL ROLE authenticated;

SELECT pg_temp.conferir(public.ifpass_treino_iniciar('assunto-vazio','fundamentos')->>'status' = 'sem_questoes',
  'acervo vazio não inicia rodada nem usa oficiais');
SELECT public.ifpass_treino_iniciar('p_texto','fundamentos') AS rodada \gset
SELECT (:'rodada'::jsonb #>> '{sessao,id}') AS sessao,
  (:'rodada'::jsonb #>> '{itens,0,item_id}') AS item1,
  (:'rodada'::jsonb #>> '{itens,1,item_id}') AS item2,
  (:'rodada'::jsonb #>> '{itens,0,questao,id}') AS questao1,
  (:'rodada'::jsonb #>> '{itens,1,questao,id}') AS questao2 \gset
SELECT pg_temp.conferir(jsonb_array_length(:'rodada'::jsonb->'itens') = 2 AND :'questao1' <> :'questao2'
  AND :'rodada'::jsonb #>> '{itens,0,questao,tem_imagem}' = 'true'
  AND :'rodada' NOT LIKE '%ficticio/%' AND :'rodada' NOT LIKE '%gabarito%'
  AND :'rodada' NOT LIKE '%explicacao%', 'seleção curta válida tem somente aprendizagem aprovada e nenhum gabarito ou caminho');
SELECT pg_temp.conferir(public.ifpass_treino_iniciar('outro','fundamentos') = :'rodada'::jsonb
  AND public.ifpass_treino_retomar(:'sessao') = :'rodada'::jsonb,
  'início repetido retoma composição e posição exatas');
SELECT pg_temp.negado(format(
  'INSERT INTO public.treino_respostas (sessao_id,prova_id,n,assunto,acertou) VALUES (%L,%L,1,%L,true)',
  :'sessao','ifal-2026-t1','p_texto'), '42501', 'RLS bloqueia gravação direta na sessão autoral');
SELECT pg_temp.conferir(NOT EXISTS (
  SELECT FROM public.treino_sessoes WHERE id = :'sessao' AND status <> 'em_andamento'),
  'sessão inicialmente em andamento');
UPDATE public.treino_sessoes SET status = 'finalizada' WHERE id = :'sessao';
SELECT pg_temp.conferir((SELECT status = 'em_andamento' FROM public.treino_sessoes WHERE id = :'sessao'),
  'RLS bloqueia finalização direta');
SELECT pg_temp.negado(format('SELECT public.ifpass_atribuir_autoral(%L,%L)', :'sessao', :'questao1'),
  '42501', 'atribuição manual bloqueada na sessão autoral');
SELECT pg_temp.negado(format('SELECT public.ifpass_responder_autoral(%L,%L)', :'item2', 'A'),
  '22023', 'não corrige item fora da posição');
SELECT pg_temp.negado(format('SELECT public.ifpass_treino_finalizar(%L)', :'sessao'),
  '22023', 'finalização normal exige respostas para itens válidos');
SELECT pg_temp.negado(format('SELECT public.ifpass_treino_objeto_imagem(auth.uid(),%L)', :'item1'),
  '42501', 'cliente não acessa RPC privilegiada de imagens');
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000002"}';
SELECT pg_temp.conferir(public.ifpass_treino_retomar(:'sessao') IS NULL, 'outro aluno não retoma a sessão');
SELECT pg_temp.negado(format('SELECT public.ifpass_responder_autoral(%L,%L)', :'item1','A'),
  '42501', 'outro aluno não corrige o item');

SET LOCAL ROLE service_role;
SELECT pg_temp.conferir(public.ifpass_treino_objeto_imagem('00000000-0000-4000-8000-000000000001', :'item1')
  = 'ficticio/figura.png' AND public.ifpass_treino_objeto_imagem('00000000-0000-4000-8000-000000000002', :'item1') IS NULL,
  'assinante recebe caminho somente para o dono da sessão');
RESET ROLE;
UPDATE public.questoes_ia SET status = 'retirada', motivo_inativacao = 'substituicao' WHERE id = :'questao1';
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000001"}';
SELECT public.ifpass_responder_autoral(:'item1','A') AS resposta \gset
SELECT pg_temp.conferir(:'resposta'::jsonb->>'gabarito' = 'A'
 AND public.ifpass_responder_autoral(:'item1','A') = :'resposta'::jsonb,
 'versão substituída normalmente pode ser respondida e reenvio é idempotente');
SELECT pg_temp.conferir((SELECT respondidas = 19 AND acertos = 10
  FROM public.ifpass_treino_indicadores('-infinity') WHERE assunto = 'p_texto'),
  'indicador inclui respostas legadas e a válida da rodada incompleta');
SELECT pg_temp.conferir(public.ifpass_treino_avancar(:'sessao',1) #>> '{sessao,posicao}' = '2',
  'posição avançada é persistida');
SELECT pg_temp.conferir(public.ifpass_treino_avancar(:'sessao',1) #>> '{sessao,posicao}' = '2',
  'reenvio de avanço não pula questão');

RESET ROLE;
UPDATE public.questoes_ia SET status = 'retirada', motivo_inativacao = 'erro',
  retirada_por = '00000000-0000-4000-8000-000000000003', retirada_em = now(), observacao_retirada = 'erro fictício'
WHERE id = :'questao2';
UPDATE public.questoes_ia SET status = 'aprovada', aprovado_em = now() WHERE id = '00000000-0000-4000-8000-000000000103';
SET LOCAL ROLE authenticated;
SELECT pg_temp.conferir(public.ifpass_responder_autoral(:'item2','A')->>'status' = 'item_anulado',
  'retirada por erro bloqueia nova resposta');
SELECT public.ifpass_treino_avancar(:'sessao',2) AS apos_anular \gset
SELECT pg_temp.conferir(:'apos_anular'::jsonb #>> '{sessao,posicao}' = '3'
  AND :'apos_anular'::jsonb #>> '{itens,1,status}' = 'item_anulado'
  AND :'apos_anular'::jsonb #>> '{itens,2,questao,id}' = '00000000-0000-4000-8000-000000000103',
  'substitui item anulado com elegível sem apagar ordem ou histórico');
SELECT public.ifpass_treino_finalizar(:'sessao',true) AS resultado \gset
SELECT pg_temp.conferir(:'resultado'::jsonb #>> '{sessao,status}' = 'interrompida'
  AND :'resultado'::jsonb #>> '{sessao,acertos}' = '1'
  AND :'resultado'::jsonb #>> '{sessao,total_questoes}' = '2'
  AND public.ifpass_treino_finalizar(:'sessao',false) = :'resultado'::jsonb,
  'interrupção consolida no servidor e não pode ser regravada');

RESET ROLE;
UPDATE public.questoes_ia SET motivo_inativacao = 'erro',
  retirada_por = '00000000-0000-4000-8000-000000000003', retirada_em = now(), observacao_retirada = 'erro fictício'
WHERE id = :'questao1';
SET LOCAL ROLE authenticated;
SELECT pg_temp.conferir((SELECT respondidas = 18 AND acertos = 9
  FROM public.ifpass_treino_indicadores('-infinity') WHERE assunto = 'p_texto')
  AND (SELECT count(*) = 1 FROM public.treino_respostas WHERE item_id = :'item1'),
  'retirada por erro exclui resposta dos indicadores e conserva histórico bruto');
ROLLBACK;
