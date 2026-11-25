BEGIN;

CREATE TABLE public.papeis_equipe (
  usuario_id uuid PRIMARY KEY REFERENCES auth.users(id),
  papel text NOT NULL CHECK (papel IN ('administrador', 'revisor_pedagogico')),
  ativo boolean NOT NULL DEFAULT true,
  alterado_por uuid NOT NULL REFERENCES auth.users(id),
  alterado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.revisor_disciplinas (
  usuario_id uuid NOT NULL REFERENCES public.papeis_equipe(usuario_id),
  disciplina text NOT NULL CHECK (btrim(disciplina) <> ''),
  ativo boolean NOT NULL DEFAULT true,
  alterado_por uuid NOT NULL REFERENCES auth.users(id),
  alterado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, disciplina)
);

ALTER TABLE public.questoes_ia
  ADD COLUMN submetida_por uuid REFERENCES auth.users(id),
  ADD CONSTRAINT questoes_ia_submissao_check CHECK (
    status NOT IN ('em_revisao', 'aprovada') OR submetida_por IS NOT NULL
  );

CREATE UNIQUE INDEX questoes_ia_uma_versao_aprovada
  ON public.questoes_ia (id) WHERE status = 'aprovada';

CREATE TABLE public.revisoes_questoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  questao_id uuid NOT NULL,
  questao_versao integer NOT NULL,
  revisor_id uuid NOT NULL REFERENCES public.papeis_equipe(usuario_id),
  checklist_versao integer NOT NULL CHECK (checklist_versao > 0),
  criterios jsonb NOT NULL CHECK (jsonb_typeof(criterios) = 'object'),
  observacoes text NOT NULL DEFAULT '',
  decisao text NOT NULL CHECK (decisao IN ('aprovada', 'correcao_solicitada', 'rejeitada')),
  criado_em timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (questao_id, questao_versao) REFERENCES public.questoes_ia(id, versao)
    ON DELETE RESTRICT
);

CREATE INDEX revisoes_questoes_versao_idx
  ON public.revisoes_questoes (questao_id, questao_versao, criado_em);

CREATE TABLE public.treino_itens_autorais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sessao_id uuid NOT NULL,
  questao_id uuid NOT NULL,
  questao_versao integer NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (user_id, sessao_id) REFERENCES public.treino_sessoes(user_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (questao_id, questao_versao) REFERENCES public.questoes_ia(id, versao)
    ON DELETE RESTRICT,
  UNIQUE (sessao_id, questao_id),
  UNIQUE (id, user_id, sessao_id, questao_id, questao_versao)
);

ALTER TABLE public.treino_respostas
  ADD COLUMN questao_id uuid,
  ADD COLUMN questao_versao integer,
  ADD COLUMN item_id uuid,
  ADD CONSTRAINT treino_respostas_questao_autoral_fk
    FOREIGN KEY (questao_id, questao_versao) REFERENCES public.questoes_ia(id, versao)
    MATCH FULL ON DELETE RESTRICT,
  ADD CONSTRAINT treino_respostas_item_autoral_fk
    FOREIGN KEY (item_id, user_id, sessao_id, questao_id, questao_versao)
    REFERENCES public.treino_itens_autorais(id, user_id, sessao_id, questao_id, questao_versao)
    ON DELETE CASCADE,
  ADD CONSTRAINT treino_respostas_item_autoral_unico UNIQUE (item_id),
  ADD CONSTRAINT treino_respostas_referencia_autoral_check CHECK (
    CASE WHEN origem_questao = 'ia' THEN
      questao_id IS NOT NULL AND questao_versao IS NOT NULL AND item_id IS NOT NULL
      AND sessao_id IS NOT NULL AND prova_id IS NULL AND n IS NULL
      AND questao_ref IS NOT NULL
      AND questao_ref = 'ia:' || questao_id::text || ':' || questao_versao::text
    ELSE questao_id IS NULL AND questao_versao IS NULL AND item_id IS NULL END
  );

CREATE INDEX treino_itens_autorais_versao_idx
  ON public.treino_itens_autorais (questao_id, questao_versao);
CREATE INDEX treino_respostas_versao_autoral_idx
  ON public.treino_respostas (questao_id, questao_versao) WHERE questao_id IS NOT NULL;

ALTER TABLE public.papeis_equipe ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revisor_disciplinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revisoes_questoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treino_itens_autorais ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.papeis_equipe, public.revisor_disciplinas,
  public.revisoes_questoes, public.treino_itens_autorais FROM PUBLIC, anon, authenticated, service_role;

COMMIT;
