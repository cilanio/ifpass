BEGIN;

CREATE FUNCTION public.ifpass_conta_equipe() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (SELECT FROM public.papeis_equipe WHERE usuario_id = auth.uid());
$$;

CREATE FUNCTION public.ifpass_pode_revisar(p_disciplina text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT FROM public.papeis_equipe e
    WHERE e.usuario_id = auth.uid() AND e.ativo AND (
      e.papel = 'administrador' OR EXISTS (
        SELECT FROM public.revisor_disciplinas d
        WHERE d.usuario_id = e.usuario_id AND d.disciplina = p_disciplina AND d.ativo
      )
    )
  );
$$;

CREATE FUNCTION public.ifpass_gerir_equipe(
  p_usuario uuid, p_papel text, p_ativo boolean, p_disciplina text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE ator uuid := auth.uid();
BEGIN
  PERFORM 1 FROM public.papeis_equipe
    WHERE usuario_id = ator AND papel = 'administrador' AND ativo FOR SHARE;
  IF NOT FOUND OR p_usuario IS NULL OR p_usuario = ator THEN
    RAISE EXCEPTION 'Atribuição de equipe não autorizada' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (SELECT FROM public.materias WHERE user_id = p_usuario)
    OR EXISTS (SELECT FROM public.plano_blocos WHERE user_id = p_usuario)
    OR EXISTS (SELECT FROM public.estudos_feitos WHERE user_id = p_usuario)
    OR EXISTS (SELECT FROM public.simulados WHERE user_id = p_usuario)
    OR EXISTS (SELECT FROM public.treino_sessoes WHERE user_id = p_usuario)
    OR EXISTS (SELECT FROM public.treino_respostas WHERE user_id = p_usuario) THEN
    RAISE EXCEPTION 'Use uma conta dedicada à equipe' USING ERRCODE = '23514';
  END IF;

  IF p_disciplina IS NULL THEN
    INSERT INTO public.papeis_equipe (usuario_id, papel, ativo, alterado_por)
    VALUES (p_usuario, p_papel, p_ativo, ator)
    ON CONFLICT (usuario_id) DO UPDATE
    SET papel = EXCLUDED.papel, ativo = EXCLUDED.ativo,
        alterado_por = ator, alterado_em = now();
  ELSE
    PERFORM 1 FROM public.papeis_equipe
      WHERE usuario_id = p_usuario AND papel = 'revisor_pedagogico' AND ativo FOR UPDATE;
    IF NOT FOUND OR p_papel IS DISTINCT FROM 'revisor_pedagogico' THEN
      RAISE EXCEPTION 'A disciplina exige um revisor ativo' USING ERRCODE = '23514';
    END IF;
    INSERT INTO public.revisor_disciplinas (usuario_id, disciplina, ativo, alterado_por)
    VALUES (p_usuario, p_disciplina, p_ativo, ator)
    ON CONFLICT (usuario_id, disciplina) DO UPDATE
    SET ativo = EXCLUDED.ativo, alterado_por = ator, alterado_em = now();
  END IF;
END;
$$;

CREATE FUNCTION public.ifpass_auditar_permissao() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  antes jsonb;
  depois jsonb := to_jsonb(NEW) - ARRAY['alterado_por','alterado_em'];
BEGIN
  IF TG_OP = 'UPDATE' THEN
    antes := to_jsonb(OLD) - ARRAY['alterado_por','alterado_em'];
    IF antes = depois THEN RETURN NEW; END IF;
  END IF;
  INSERT INTO public.historico_permissoes_equipe (
    usuario_id, disciplina, operacao, anterior, posterior, ator_id
  ) VALUES (
    NEW.usuario_id, depois ->> 'disciplina',
    CASE
      WHEN NOT NEW.ativo THEN 'revogacao'
      WHEN antes IS NULL OR antes -> 'ativo' = 'false'::jsonb THEN 'concessao'
      ELSE 'alteracao'
    END,
    antes, depois, NEW.alterado_por
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER ifpass_auditar_papel AFTER INSERT OR UPDATE ON public.papeis_equipe
  FOR EACH ROW EXECUTE FUNCTION public.ifpass_auditar_permissao();
CREATE TRIGGER ifpass_auditar_disciplina AFTER INSERT OR UPDATE ON public.revisor_disciplinas
  FOR EACH ROW EXECUTE FUNCTION public.ifpass_auditar_permissao();

GRANT SELECT ON public.historico_permissoes_equipe TO authenticated;
CREATE POLICY ifpass_historico_administrador ON public.historico_permissoes_equipe
  FOR SELECT TO authenticated USING (public.ifpass_pode_revisar(NULL));

-- A existência da atribuição separa a conta de equipe mesmo após revogação.
DO $$
DECLARE tabela text;
BEGIN
  FOREACH tabela IN ARRAY ARRAY['materias','plano_blocos','estudos_feitos',
      'simulados','treino_sessoes','treino_respostas'] LOOP
    EXECUTE format(
      'CREATE POLICY ifpass_exclui_equipe ON public.%I AS RESTRICTIVE TO authenticated
       USING (NOT public.ifpass_conta_equipe()) WITH CHECK (NOT public.ifpass_conta_equipe())', tabela);
  END LOOP;
END;
$$;

CREATE POLICY ifpass_resposta_direta_oficial
  ON public.treino_respostas AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (origem_questao IS DISTINCT FROM 'ia'
    AND questao_id IS NULL AND questao_versao IS NULL AND item_id IS NULL
    AND (questao_ref IS NULL OR questao_ref NOT ILIKE 'ia:%'));

GRANT SELECT ON public.questoes_ia, public.revisoes_questoes,
  public.papeis_equipe, public.revisor_disciplinas TO authenticated;

CREATE POLICY ifpass_questoes_equipe ON public.questoes_ia FOR SELECT TO authenticated
  USING (public.ifpass_pode_revisar(disciplina));
CREATE POLICY ifpass_limita_leitura_questoes ON public.questoes_ia AS RESTRICTIVE
  FOR SELECT TO authenticated USING (public.ifpass_pode_revisar(disciplina));

CREATE POLICY ifpass_revisoes_equipe ON public.revisoes_questoes FOR SELECT TO authenticated
  USING (EXISTS (SELECT FROM public.questoes_ia q
    WHERE q.id = questao_id AND q.versao = questao_versao));

CREATE POLICY ifpass_papeis_equipe ON public.papeis_equipe FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() OR public.ifpass_pode_revisar(NULL));
CREATE POLICY ifpass_disciplinas_equipe ON public.revisor_disciplinas FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() OR public.ifpass_pode_revisar(NULL));

CREATE FUNCTION public.ifpass_preservar_versao_submetida() RETURNS trigger
LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  IF OLD.submetida_por IS NOT NULL AND (
    (to_jsonb(OLD) - ARRAY['status','aprovado_em','motivo_inativacao','retirada_por','retirada_em','observacao_retirada']) IS DISTINCT FROM
    (to_jsonb(NEW) - ARRAY['status','aprovado_em','motivo_inativacao','retirada_por','retirada_em','observacao_retirada'])
    OR (OLD.aprovado_em IS NOT NULL AND (
      NEW.aprovado_em IS DISTINCT FROM OLD.aprovado_em
      OR NEW.status NOT IN ('aprovada','retirada')))
  ) THEN
    RAISE EXCEPTION 'O conteúdo submetido é imutável. Crie outra versão.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER ifpass_preservar_versao_submetida BEFORE UPDATE ON public.questoes_ia
  FOR EACH ROW EXECUTE FUNCTION public.ifpass_preservar_versao_submetida();

CREATE FUNCTION public.ifpass_submeter_questao(p_id uuid, p_versao integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE ator uuid := auth.uid();
BEGIN
  PERFORM 1 FROM public.papeis_equipe
    WHERE usuario_id = ator AND papel = 'administrador' AND ativo FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submissão não autorizada' USING ERRCODE = '42501';
  END IF;
  UPDATE public.questoes_ia SET status = 'em_revisao', submetida_por = ator
    WHERE id = p_id AND versao = p_versao AND status = 'rascunho' AND submetida_por IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Versão indisponível para submissão' USING ERRCODE = '23514';
  END IF;
END;
$$;

CREATE FUNCTION public.ifpass_revisar_questao(
  p_id uuid, p_versao integer, p_decisao text, p_checklist_versao integer,
  p_criterios jsonb, p_observacoes text DEFAULT ''
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  ator uuid := auth.uid();
  q public.questoes_ia%ROWTYPE;
  auditoria uuid;
  avaliacao CONSTANT text[] := ARRAY[
    'fidelidade_edital','correcao_cientifica_matematica_linguistica','clareza_precisao',
    'qualidade_alternativas','adequacao_dificuldade','compatibilidade_copeve','qualidade_explicacao'
  ];
  obrigatorios CONSTANT text[] := ARRAY[
    'gabarito_incorreto','alternativa_correta_nao_unica','erro_conceitual_ou_matematico',
    'ambiguidade','informacoes_insuficientes','fora_do_edital_sem_justificativa',
    'explicacao_incompativel','reproducao_indevida'
  ];
BEGIN
  PERFORM 1 FROM public.papeis_equipe
    WHERE usuario_id = ator AND papel = 'revisor_pedagogico' AND ativo FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Revisão não autorizada' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_id::text, 0));
  SELECT * INTO q FROM public.questoes_ia WHERE id = p_id AND versao = p_versao FOR UPDATE;
  IF NOT FOUND OR q.submetida_por = ator THEN
    RAISE EXCEPTION 'Revisão não autorizada' USING ERRCODE = '42501';
  END IF;
  PERFORM 1 FROM public.revisor_disciplinas
    WHERE usuario_id = ator AND disciplina = q.disciplina AND ativo FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Disciplina não autorizada' USING ERRCODE = '42501';
  END IF;
  IF q.status <> 'em_revisao' THEN
    RAISE EXCEPTION 'Versão fora da fila de revisão' USING ERRCODE = '23514';
  END IF;
  IF p_decisao IS NULL OR p_decisao NOT IN ('aprovada','correcao_solicitada','rejeitada')
    OR p_checklist_versao IS DISTINCT FROM 1 OR jsonb_typeof(p_criterios) IS DISTINCT FROM 'object'
    OR EXISTS (SELECT FROM unnest(obrigatorios || avaliacao) chave
      WHERE jsonb_typeof(p_criterios -> chave) IS DISTINCT FROM 'boolean') THEN
    RAISE EXCEPTION 'Decisão ou checklist inválido' USING ERRCODE = '23514';
  END IF;

  IF p_decisao = 'aprovada' THEN
    IF EXISTS (SELECT FROM unnest(obrigatorios) chave WHERE p_criterios -> chave = 'true'::jsonb) THEN
      RAISE EXCEPTION 'Checklist contém critério eliminatório' USING ERRCODE = '23514';
    END IF;
    IF EXISTS (SELECT FROM jsonb_object_keys(q.alternativas) letra WHERE letra NOT IN ('A','B','C','D','E'))
      OR EXISTS (SELECT FROM unnest(ARRAY['A','B','C','D','E']) letra
        WHERE jsonb_typeof(q.alternativas -> letra) IS DISTINCT FROM 'string'
          OR btrim(q.alternativas ->> letra) = '')
      OR btrim(coalesce(q.explicacao ->> 'correta','')) = ''
      OR jsonb_typeof(q.explicacao -> 'correta') IS DISTINCT FROM 'string'
      OR jsonb_typeof(q.explicacao -> 'distratores') IS DISTINCT FROM 'object'
      OR EXISTS (SELECT FROM unnest(ARRAY['A','B','C','D','E']) letra
        WHERE letra <> q.resposta_correta AND (
          jsonb_typeof(q.explicacao -> 'distratores' -> letra) IS DISTINCT FROM 'string'
          OR btrim(q.explicacao -> 'distratores' ->> letra) = '')) THEN
      RAISE EXCEPTION 'Alternativas ou explicações incompletas' USING ERRCODE = '23514';
    END IF;
    IF EXISTS (SELECT FROM public.questoes_ia
      WHERE id = p_id AND status = 'aprovada' AND versao > p_versao) THEN
      RAISE EXCEPTION 'Já existe uma versão aprovada mais recente' USING ERRCODE = '23514';
    END IF;
    UPDATE public.questoes_ia SET status = 'retirada', motivo_inativacao = 'substituicao'
      WHERE id = p_id AND status = 'aprovada';
  END IF;

  INSERT INTO public.revisoes_questoes (
    questao_id, questao_versao, revisor_id, checklist_versao, criterios, observacoes, decisao
  ) VALUES (p_id, p_versao, ator, p_checklist_versao, p_criterios, coalesce(p_observacoes,''), p_decisao)
  RETURNING id INTO auditoria;

  UPDATE public.questoes_ia SET
    status = CASE WHEN p_decisao = 'correcao_solicitada' THEN 'rascunho' ELSE p_decisao END,
    aprovado_em = CASE WHEN p_decisao = 'aprovada' THEN now() ELSE NULL END
  WHERE id = p_id AND versao = p_versao;
  RETURN auditoria;
END;
$$;

CREATE FUNCTION public.ifpass_retirar_autoral(p_id uuid, p_versao integer, p_motivo text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE ator uuid := auth.uid();
BEGIN
  PERFORM 1 FROM public.papeis_equipe
    WHERE usuario_id = ator AND papel = 'administrador' AND ativo FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Retirada não autorizada' USING ERRCODE = '42501';
  END IF;
  IF coalesce(btrim(p_motivo), '') = '' THEN
    RAISE EXCEPTION 'Informe o motivo da retirada por erro' USING ERRCODE = '23514';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_id::text, 0));
  UPDATE public.questoes_ia
    SET status = 'retirada', motivo_inativacao = 'erro',
        retirada_por = ator, retirada_em = clock_timestamp(), observacao_retirada = p_motivo
    WHERE id = p_id AND versao = p_versao
      AND (status = 'aprovada' OR motivo_inativacao = 'substituicao');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Versão indisponível para retirada' USING ERRCODE = '23514';
  END IF;
END;
$$;

CREATE FUNCTION public.ifpass_atribuir_autoral(p_sessao uuid, p_questao uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  ator uuid := auth.uid();
  sessao public.treino_sessoes%ROWTYPE;
  q public.questoes_ia%ROWTYPE;
  item uuid;
BEGIN
  IF ator IS NULL OR public.ifpass_conta_equipe() THEN
    RAISE EXCEPTION 'Treino não autorizado' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO sessao FROM public.treino_sessoes
    WHERE id = p_sessao AND user_id = ator AND status = 'em_andamento' FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sessão indisponível' USING ERRCODE = '42501';
  END IF;
  SELECT i.id INTO item FROM public.treino_itens_autorais i
    WHERE i.sessao_id = p_sessao AND i.questao_id = p_questao AND i.user_id = ator;
  IF FOUND THEN
    SELECT qv.* INTO q
    FROM public.treino_itens_autorais i
    JOIN public.questoes_ia qv ON qv.id = i.questao_id AND qv.versao = i.questao_versao
    WHERE i.id = item FOR SHARE OF qv;
    IF q.motivo_inativacao = 'erro' THEN
      RETURN jsonb_build_object('status','item_anulado','item_id',item);
    END IF;
  ELSE
    SELECT * INTO q FROM public.questoes_ia
      WHERE id = p_questao AND assunto_id = sessao.assunto AND status = 'aprovada'
      AND EXISTS (SELECT FROM public.revisoes_questoes r
        WHERE r.questao_id = questoes_ia.id AND r.questao_versao = questoes_ia.versao
          AND r.decisao = 'aprovada') FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Questão indisponível' USING ERRCODE = '42501';
    END IF;
    INSERT INTO public.treino_itens_autorais (user_id, sessao_id, questao_id, questao_versao)
      VALUES (ator, p_sessao, q.id, q.versao)
      RETURNING id INTO item;
  END IF;
  RETURN jsonb_build_object('item_id',item,'questao_ref',concat('ia:',q.id,':',q.versao),
    'disciplina',q.disciplina,'assunto_id',q.assunto_id,'titulo_texto',q.titulo_texto,
    'texto',q.texto,'enunciado',q.enunciado,'alternativas',q.alternativas);
END;
$$;

CREATE FUNCTION public.ifpass_responder_autoral(p_item uuid, p_alternativa text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  ator uuid := auth.uid();
  i public.treino_itens_autorais%ROWTYPE;
  q public.questoes_ia%ROWTYPE;
  resposta public.treino_respostas%ROWTYPE;
  estado text;
BEGIN
  IF ator IS NULL OR public.ifpass_conta_equipe() THEN
    RAISE EXCEPTION 'Resposta não autorizada' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO i FROM public.treino_itens_autorais WHERE id = p_item AND user_id = ator;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item indisponível' USING ERRCODE = '42501';
  END IF;
  SELECT status INTO estado FROM public.treino_sessoes
    WHERE id = i.sessao_id AND user_id = ator FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sessão indisponível' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO q FROM public.questoes_ia WHERE id = i.questao_id AND versao = i.questao_versao FOR SHARE;
  SELECT * INTO resposta FROM public.treino_respostas WHERE item_id = p_item;

  IF FOUND THEN
    IF resposta.alternativa_escolhida IS DISTINCT FROM p_alternativa THEN
      RAISE EXCEPTION 'Item já respondido' USING ERRCODE = '23505';
    END IF;
  ELSE
    IF q.motivo_inativacao = 'erro' THEN
      RETURN jsonb_build_object('status','item_anulado','item_id',p_item);
    END IF;
    IF estado <> 'em_andamento' OR
      (q.status <> 'aprovada' AND q.motivo_inativacao IS DISTINCT FROM 'substituicao') THEN
      RAISE EXCEPTION 'Item indisponível para resposta' USING ERRCODE = '42501';
    END IF;
    IF p_alternativa IS NULL OR NOT (q.alternativas ? p_alternativa) THEN
      RAISE EXCEPTION 'Alternativa inválida' USING ERRCODE = '23514';
    END IF;
    INSERT INTO public.treino_respostas (
      user_id, sessao_id, item_id, questao_id, questao_versao, questao_ref, origem_questao,
      assunto, topico_id, etapa, habilidade_principal, dificuldade,
      alternativa_escolhida, alternativa_correta, acertou
    ) VALUES (
      ator,i.sessao_id,i.id,q.id,q.versao,concat('ia:',q.id,':',q.versao),'ia',
      q.assunto_id,q.topico_id,q.etapa,q.habilidade_principal,q.dificuldade,
      p_alternativa,q.resposta_correta,p_alternativa = q.resposta_correta
    ) RETURNING * INTO resposta;
  END IF;
  RETURN jsonb_build_object('resposta_id',resposta.id,'acertou',resposta.acertou,
    'gabarito',resposta.alternativa_correta,'explicacao',q.explicacao);
END;
$$;

REVOKE ALL ON FUNCTION public.ifpass_conta_equipe(), public.ifpass_pode_revisar(text),
  public.ifpass_gerir_equipe(uuid,text,boolean,text), public.ifpass_preservar_versao_submetida(),
  public.ifpass_auditar_permissao(),
  public.ifpass_submeter_questao(uuid,integer),
  public.ifpass_revisar_questao(uuid,integer,text,integer,jsonb,text),
  public.ifpass_retirar_autoral(uuid,integer,text),
  public.ifpass_atribuir_autoral(uuid,uuid), public.ifpass_responder_autoral(uuid,text)
  FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.ifpass_conta_equipe(), public.ifpass_pode_revisar(text),
  public.ifpass_gerir_equipe(uuid,text,boolean,text), public.ifpass_submeter_questao(uuid,integer),
  public.ifpass_revisar_questao(uuid,integer,text,integer,jsonb,text),
  public.ifpass_retirar_autoral(uuid,integer,text),
  public.ifpass_atribuir_autoral(uuid,uuid), public.ifpass_responder_autoral(uuid,text)
  TO authenticated;

COMMIT;
