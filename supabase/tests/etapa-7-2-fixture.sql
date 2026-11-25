\set ON_ERROR_STOP on

-- Somente em banco descartável, antes das migrações da etapa 7.2.
DO $$
BEGIN
  IF inet_server_addr() IS NOT NULL OR EXISTS (SELECT FROM auth.users)
    OR EXISTS (SELECT FROM public.treino_respostas)
    OR EXISTS (SELECT FROM public.questoes_ia) THEN
    RAISE EXCEPTION 'Use o snapshot recém-carregado em um banco descartável via socket';
  END IF;
END;
$$;

INSERT INTO auth.users (id, raw_user_meta_data)
SELECT ('00000000-0000-4000-8000-' || lpad(i::text,12,'0'))::uuid, '{"nome":"Conta de teste"}'
FROM generate_series(1,5) i;

INSERT INTO public.treino_respostas (user_id, prova_id, n, assunto, acertou)
SELECT '00000000-0000-4000-8000-000000000001', 'ifal-2026-t1', i, 'p_texto', i % 2 = 0
FROM generate_series(1,18) i;

CREATE SCHEMA ifpass_teste;
CREATE TABLE ifpass_teste.historico AS SELECT * FROM public.treino_respostas;
