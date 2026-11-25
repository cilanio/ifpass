BEGIN;

ALTER TABLE public.questoes_ia
  ADD COLUMN finalidade text CHECK (finalidade IN ('aprendizagem', 'avaliacao')),
  ADD COLUMN desafio_copeve boolean NOT NULL DEFAULT false;

ALTER TABLE public.treino_sessoes
  ADD COLUMN autoral boolean NOT NULL DEFAULT false,
  ADD COLUMN posicao integer CHECK (posicao > 0);

ALTER TABLE public.treino_itens_autorais
  ADD COLUMN ordem integer CHECK (ordem > 0),
  ADD CONSTRAINT treino_itens_ordem_unica UNIQUE (sessao_id, ordem);

CREATE UNIQUE INDEX treino_autoral_aberto_por_aluno
  ON public.treino_sessoes (user_id) WHERE autoral AND status = 'em_andamento';

CREATE TABLE public.treino_configuracao_autoral (
  etapa text PRIMARY KEY CHECK (etapa IN ('fundamentos','compreensao','aplicacao','analise','desafio_copeve')),
  minimo integer NOT NULL CHECK (minimo > 0),
  tamanho integer NOT NULL DEFAULT 10 CHECK (tamanho > 0),
  habilitado boolean NOT NULL DEFAULT false
);
ALTER TABLE public.treino_configuracao_autoral ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.treino_configuracao_autoral FROM PUBLIC, anon, authenticated;
INSERT INTO public.treino_configuracao_autoral (etapa, minimo)
VALUES ('fundamentos',5), ('compreensao',5), ('aplicacao',3), ('analise',3), ('desafio_copeve',1);

CREATE POLICY ifpass_treino_autoral_insercao_rpc ON public.treino_sessoes
  AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT autoral AND posicao IS NULL);
CREATE POLICY ifpass_treino_autoral_atualizacao_rpc ON public.treino_sessoes
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (NOT autoral) WITH CHECK (NOT autoral AND posicao IS NULL);
CREATE POLICY ifpass_treino_autoral_resposta_rpc ON public.treino_respostas
  AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (
    NOT EXISTS (SELECT FROM public.treino_sessoes s WHERE s.id = sessao_id AND s.autoral)
  );

CREATE FUNCTION public.ifpass_treino_aluno() RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.ifpass_conta_equipe() THEN
    RAISE EXCEPTION 'Treino não autorizado' USING ERRCODE = '42501';
  END IF;
  RETURN auth.uid();
END;
$$;

-- O bloqueio da sessão é adquirido antes de modificar seus itens.
CREATE FUNCTION public.ifpass_treino_selecionar(
  p_sessao uuid, p_total integer, p_primeira_ordem integer
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  quantidade integer;
BEGIN
  INSERT INTO public.treino_itens_autorais (user_id, sessao_id, questao_id, questao_versao, ordem)
  SELECT s.user_id, s.id, q.id, q.versao,
    p_primeira_ordem - 1 + row_number() OVER (ORDER BY q.sorteio, q.id)
  FROM public.treino_sessoes s
  CROSS JOIN LATERAL (
    SELECT v.id, v.versao, random() AS sorteio FROM public.questoes_ia v
    WHERE v.assunto_id = s.assunto AND v.status = 'aprovada'
      AND v.finalidade = 'aprendizagem'
      AND CASE s.filtros->>'etapa'
        WHEN 'desafio_copeve' THEN v.desafio_copeve
        ELSE v.etapa = s.filtros->>'etapa' AND NOT v.desafio_copeve
      END
      AND EXISTS (SELECT FROM public.revisoes_questoes r
        WHERE (r.questao_id, r.questao_versao) = (v.id,v.versao) AND r.decisao = 'aprovada')
      AND NOT EXISTS (SELECT FROM public.treino_itens_autorais i
        WHERE i.sessao_id = s.id AND i.questao_id = v.id)
    ORDER BY sorteio, v.id LIMIT p_total
    FOR SHARE OF v
  ) q
  WHERE s.id = p_sessao;
  GET DIAGNOSTICS quantidade = ROW_COUNT;
  RETURN quantidade;
END;
$$;

CREATE FUNCTION public.ifpass_treino_retomar(p_sessao uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  ator uuid := public.ifpass_treino_aluno();
  sessao public.treino_sessoes%ROWTYPE;
BEGIN
  SELECT * INTO sessao FROM public.treino_sessoes
  WHERE user_id = ator AND autoral AND
    (id = p_sessao OR (p_sessao IS NULL AND status = 'em_andamento')) FOR SHARE;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object('sessao', to_jsonb(sessao) - 'user_id', 'itens', (
    SELECT coalesce(jsonb_agg(
      jsonb_build_object('item_id',i.id,'ordem',i.ordem,
        'questao_ref',concat('ia:',q.id,':',q.versao),
        'status', CASE WHEN q.motivo_inativacao = 'erro' THEN 'item_anulado'
          WHEN r.id IS NOT NULL THEN 'respondido' ELSE 'pendente' END)
      || CASE WHEN q.motivo_inativacao IS DISTINCT FROM 'erro' THEN jsonb_build_object(
        'questao',jsonb_build_object('id',q.id,'versao',q.versao,'disciplina',q.disciplina,
          'assunto_id',q.assunto_id,'topico_id',q.topico_id,'etapa',q.etapa,
          'habilidade_principal',q.habilidade_principal,'dificuldade',q.dificuldade,
          'titulo_texto',q.titulo_texto,'texto',q.texto,'enunciado',q.enunciado,'alternativas',q.alternativas,
          'tem_imagem',q.imagem IS NOT NULL)
      ) ELSE '{}'::jsonb END
      || CASE WHEN r.id IS NOT NULL THEN jsonb_build_object('resposta',jsonb_build_object(
        'alternativa',r.alternativa_escolhida,'acertou',r.acertou,
        'gabarito',r.alternativa_correta,'explicacao',q.explicacao)) ELSE '{}'::jsonb END
      ORDER BY i.ordem), '[]'::jsonb)
    FROM public.treino_itens_autorais i
    JOIN public.questoes_ia q ON (q.id,q.versao) = (i.questao_id,i.questao_versao)
    LEFT JOIN public.treino_respostas r ON r.item_id = i.id
    WHERE i.sessao_id = sessao.id
  ));
END;
$$;

CREATE FUNCTION public.ifpass_treino_iniciar(p_assunto text, p_etapa text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  ator uuid := public.ifpass_treino_aluno();
  sessao uuid;
  configuracao public.treino_configuracao_autoral%ROWTYPE;
  quantidade integer;
BEGIN
  IF nullif(btrim(p_assunto), '') IS NULL THEN
    RAISE EXCEPTION 'Assunto obrigatório' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO configuracao FROM public.treino_configuracao_autoral WHERE etapa = p_etapa;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Etapa inválida' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(ator::text, 73));
  SELECT id INTO sessao FROM public.treino_sessoes
    WHERE user_id = ator AND autoral AND status = 'em_andamento' FOR UPDATE;
  IF FOUND THEN
    RETURN public.ifpass_treino_retomar(sessao);
  END IF;
  IF NOT configuracao.habilitado THEN
    RETURN jsonb_build_object('status','treino_indisponivel');
  END IF;
  INSERT INTO public.treino_sessoes (user_id, assunto, autoral, posicao, filtros)
    VALUES (ator,p_assunto,true,1,jsonb_build_object('etapa',p_etapa,'tamanho',configuracao.tamanho))
    RETURNING id INTO sessao;
  quantidade := public.ifpass_treino_selecionar(sessao,configuracao.tamanho,1);
  IF quantidade = 0 THEN
    DELETE FROM public.treino_sessoes WHERE id = sessao;
    RETURN jsonb_build_object('status','sem_questoes');
  END IF;
  UPDATE public.treino_sessoes SET filtros = filtros || jsonb_build_object('total_inicial',quantidade)
    WHERE id = sessao;
  RETURN public.ifpass_treino_retomar(sessao);
END;
$$;

CREATE FUNCTION public.ifpass_treino_avancar(p_sessao uuid, p_posicao integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  ator uuid := public.ifpass_treino_aluno();
  sessao public.treino_sessoes%ROWTYPE;
  ordem_maxima integer;
  total_valido integer;
BEGIN
  SELECT * INTO sessao FROM public.treino_sessoes
    WHERE id = p_sessao AND user_id = ator AND autoral FOR UPDATE;
  IF NOT FOUND OR sessao.status <> 'em_andamento' THEN
    RAISE EXCEPTION 'Sessão indisponível' USING ERRCODE = '42501';
  END IF;
  IF p_posicao IS DISTINCT FROM sessao.posicao THEN
    RETURN public.ifpass_treino_retomar(p_sessao);
  END IF;
  IF NOT EXISTS (
    SELECT FROM public.treino_itens_autorais i
    JOIN public.questoes_ia q ON (q.id,q.versao) = (i.questao_id,i.questao_versao)
    LEFT JOIN public.treino_respostas r ON r.item_id = i.id
    WHERE i.sessao_id = p_sessao AND i.ordem = sessao.posicao
      AND (r.id IS NOT NULL OR q.motivo_inativacao = 'erro')
  ) THEN
    RAISE EXCEPTION 'O item atual ainda está pendente' USING ERRCODE = '22023';
  END IF;
  SELECT max(i.ordem), count(*) FILTER (WHERE q.motivo_inativacao IS DISTINCT FROM 'erro')
    INTO ordem_maxima, total_valido
    FROM public.treino_itens_autorais i JOIN public.questoes_ia q
      ON (q.id,q.versao) = (i.questao_id,i.questao_versao)
    WHERE i.sessao_id = p_sessao;
  PERFORM public.ifpass_treino_selecionar(p_sessao,
    greatest(0, (sessao.filtros->>'total_inicial')::integer - total_valido), ordem_maxima + 1);
  IF EXISTS (SELECT FROM public.treino_itens_autorais
    WHERE sessao_id = p_sessao AND ordem = p_posicao + 1) THEN
    UPDATE public.treino_sessoes SET posicao = p_posicao + 1 WHERE id = p_sessao;
  END IF;
  RETURN public.ifpass_treino_retomar(p_sessao);
END;
$$;

CREATE FUNCTION public.ifpass_treino_finalizar(p_sessao uuid, p_interromper boolean DEFAULT false) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  ator uuid := public.ifpass_treino_aluno();
  estado text;
BEGIN
  SELECT status INTO estado FROM public.treino_sessoes
    WHERE id = p_sessao AND user_id = ator AND autoral FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sessão indisponível' USING ERRCODE = '42501';
  END IF;
  IF estado = 'em_andamento' THEN
    PERFORM 1 FROM public.treino_itens_autorais i
      JOIN public.questoes_ia q ON (q.id,q.versao) = (i.questao_id,i.questao_versao)
      WHERE i.sessao_id = p_sessao ORDER BY q.id,q.versao FOR SHARE OF q;
    IF NOT coalesce(p_interromper,false) AND EXISTS (
      SELECT FROM public.treino_itens_autorais i
      JOIN public.questoes_ia q ON (q.id,q.versao) = (i.questao_id,i.questao_versao)
      LEFT JOIN public.treino_respostas r ON r.item_id = i.id
      WHERE i.sessao_id = p_sessao AND r.id IS NULL AND q.motivo_inativacao IS DISTINCT FROM 'erro'
    ) THEN
      RAISE EXCEPTION 'Há itens pendentes' USING ERRCODE = '22023';
    END IF;
    UPDATE public.treino_sessoes SET finalizado_em = clock_timestamp(),
      status = CASE WHEN p_interromper THEN 'interrompida' ELSE 'finalizada' END,
      (total_questoes, acertos) = (
        SELECT count(*), count(*) FILTER (WHERE r.acertou)
        FROM public.treino_itens_autorais i
        JOIN public.questoes_ia q ON (q.id,q.versao) = (i.questao_id,i.questao_versao)
        LEFT JOIN public.treino_respostas r ON r.item_id = i.id
        WHERE i.sessao_id = p_sessao AND q.motivo_inativacao IS DISTINCT FROM 'erro')
      WHERE id = p_sessao;
  END IF;
  RETURN public.ifpass_treino_retomar(p_sessao);
END;
$$;

CREATE FUNCTION public.ifpass_treino_indicadores(p_desde timestamptz)
RETURNS TABLE (assunto text, respondidas bigint, acertos bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  ator uuid := public.ifpass_treino_aluno();
BEGIN
  RETURN QUERY SELECT r.assunto, count(*), count(*) FILTER (WHERE r.acertou)
    FROM public.treino_respostas r
    LEFT JOIN public.questoes_ia q ON (q.id,q.versao) = (r.questao_id,r.questao_versao)
    WHERE r.user_id = ator AND r.criado_em >= p_desde
      AND q.motivo_inativacao IS DISTINCT FROM 'erro'
    GROUP BY r.assunto ORDER BY r.assunto;
END;
$$;

CREATE FUNCTION public.ifpass_treino_cobertura(p_assunto text)
RETURNS TABLE (etapa text, minimo integer, quantidade bigint, topicos bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT public.ifpass_conta_equipe() THEN
    RAISE EXCEPTION 'Diagnóstico indisponível' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT c.etapa, c.minimo, count(q.id), count(DISTINCT q.topico_id)
    FROM public.treino_configuracao_autoral c
    LEFT JOIN public.questoes_ia q ON q.assunto_id = p_assunto
      AND q.status = 'aprovada' AND q.finalidade = 'aprendizagem'
      AND public.ifpass_pode_revisar(q.disciplina)
      AND CASE WHEN c.etapa = 'desafio_copeve' THEN q.desafio_copeve
        ELSE q.etapa = c.etapa AND NOT q.desafio_copeve END
      AND EXISTS (SELECT FROM public.revisoes_questoes r
        WHERE (r.questao_id,r.questao_versao) = (q.id,q.versao) AND r.decisao = 'aprovada')
    GROUP BY c.etapa, c.minimo ORDER BY c.etapa;
END;
$$;

-- Apenas a função de assinatura chama esta RPC, após validar o JWT no Auth.
CREATE FUNCTION public.ifpass_treino_objeto_imagem(p_usuario uuid, p_item uuid) RETURNS text
LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$
  SELECT q.imagem FROM public.treino_itens_autorais i
  JOIN public.treino_sessoes s ON s.id = i.sessao_id AND s.autoral
  JOIN public.questoes_ia q ON (q.id,q.versao) = (i.questao_id,i.questao_versao)
  WHERE i.id = p_item AND i.user_id = p_usuario
    AND NOT EXISTS (SELECT FROM public.papeis_equipe e WHERE e.usuario_id = p_usuario)
    AND (q.status = 'aprovada' OR q.motivo_inativacao = 'substituicao')
$$;
REVOKE ALL ON FUNCTION public.ifpass_treino_objeto_imagem(uuid,uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ifpass_treino_objeto_imagem(uuid,uuid) TO service_role;

-- Preserva a RPC anterior em sessões legadas. A composição nova é exclusiva do servidor.
ALTER FUNCTION public.ifpass_atribuir_autoral(uuid,uuid) RENAME TO ifpass_atribuir_autoral_legado;
REVOKE ALL ON FUNCTION public.ifpass_atribuir_autoral_legado(uuid,uuid) FROM authenticated;
CREATE FUNCTION public.ifpass_atribuir_autoral(p_sessao uuid, p_questao uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  ator uuid := public.ifpass_treino_aluno();
BEGIN
  PERFORM 1 FROM public.treino_sessoes WHERE id = p_sessao AND user_id = ator AND NOT autoral;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Atribuição manual indisponível' USING ERRCODE = '42501';
  END IF;
  RETURN public.ifpass_atribuir_autoral_legado(p_sessao,p_questao);
END;
$$;

ALTER FUNCTION public.ifpass_responder_autoral(uuid,text) RENAME TO ifpass_responder_autoral_base;
REVOKE ALL ON FUNCTION public.ifpass_responder_autoral_base(uuid,text) FROM authenticated;
CREATE FUNCTION public.ifpass_responder_autoral(p_item uuid, p_alternativa text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  ator uuid := public.ifpass_treino_aluno();
  ordem integer;
  posicao integer;
BEGIN
  SELECT s.posicao, i.ordem INTO posicao, ordem FROM public.treino_itens_autorais i
  JOIN public.treino_sessoes s ON s.id = i.sessao_id
  WHERE i.id = p_item AND i.user_id = ator FOR UPDATE OF s;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item indisponível' USING ERRCODE = '42501';
  END IF;
  IF ordem IS DISTINCT FROM posicao AND ordem IS NOT NULL
    AND NOT EXISTS (SELECT FROM public.treino_respostas WHERE item_id = p_item) THEN
    RAISE EXCEPTION 'Item fora da posição atual' USING ERRCODE = '22023';
  END IF;
  RETURN public.ifpass_responder_autoral_base(p_item,p_alternativa);
END;
$$;

REVOKE ALL ON FUNCTION public.ifpass_responder_autoral(uuid,text), public.ifpass_atribuir_autoral(uuid,uuid), public.ifpass_treino_aluno(), public.ifpass_treino_selecionar(uuid,integer,integer),
  public.ifpass_treino_iniciar(text,text), public.ifpass_treino_retomar(uuid),
  public.ifpass_treino_avancar(uuid,integer), public.ifpass_treino_finalizar(uuid,boolean),
  public.ifpass_treino_indicadores(timestamptz), public.ifpass_treino_cobertura(text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ifpass_responder_autoral(uuid,text), public.ifpass_atribuir_autoral(uuid,uuid), public.ifpass_treino_iniciar(text,text), public.ifpass_treino_retomar(uuid),
  public.ifpass_treino_avancar(uuid,integer), public.ifpass_treino_finalizar(uuid,boolean),
  public.ifpass_treino_indicadores(timestamptz), public.ifpass_treino_cobertura(text) TO authenticated;

COMMIT;
