-- IFPASS | snapshot estrutural de 2026-11-24

-- Reconstruido a partir de consultas de catalogo; nao e pg_dump nem migracao validada.

-- NAO executar no banco existente. Sem dados pessoais ou credenciais.

-- Pressupoe ambiente Supabase com auth.users e papeis padrao.

-- ACL de colunas, funcoes, schema, proprietarios e defaults de privilegios nao coletados.

-- Permissoes amplas existentes sao registradas, nao recomendadas; RLS nao cobre TRUNCATE.



CREATE TABLE public.estudos_feitos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid DEFAULT auth.uid() NOT NULL,
  bloco_id uuid NOT NULL,
  data date NOT NULL,
  criado_em timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.materias (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid DEFAULT auth.uid() NOT NULL,
  nome text NOT NULL,
  cor text NOT NULL,
  criado_em timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.plano_blocos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid DEFAULT auth.uid() NOT NULL,
  materia_id uuid NOT NULL,
  dia_semana smallint NOT NULL,
  hora_inicio time without time zone NOT NULL,
  duracao_min smallint NOT NULL,
  criado_em timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  nome text DEFAULT ''::text NOT NULL,
  papel text DEFAULT 'aluno'::text NOT NULL,
  criado_em timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.questoes_ia (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  versao integer DEFAULT 1 NOT NULL,
  disciplina text NOT NULL,
  assunto_id text NOT NULL,
  topico_id text,
  etapa text NOT NULL,
  habilidade_principal text NOT NULL,
  habilidades_secundarias jsonb DEFAULT '[]'::jsonb NOT NULL,
  dificuldade text NOT NULL,
  titulo_texto text,
  texto text,
  enunciado text NOT NULL,
  imagem text,
  alternativas jsonb NOT NULL,
  resposta_correta text NOT NULL,
  explicacao jsonb NOT NULL,
  status text DEFAULT 'rascunho'::text NOT NULL,
  referencias jsonb DEFAULT '[]'::jsonb NOT NULL,
  dados_geracao jsonb DEFAULT '{}'::jsonb NOT NULL,
  pontuacao_qualidade numeric(5,2),
  criado_em timestamp with time zone DEFAULT now() NOT NULL,
  aprovado_em timestamp with time zone
);

CREATE TABLE public.simulados (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid DEFAULT auth.uid() NOT NULL,
  prova_id text NOT NULL,
  status text DEFAULT 'em_andamento'::text NOT NULL,
  iniciado_em timestamp with time zone DEFAULT now() NOT NULL,
  finalizado_em timestamp with time zone,
  duracao_seg integer,
  respostas jsonb DEFAULT '{}'::jsonb NOT NULL,
  marcadas jsonb DEFAULT '[]'::jsonb NOT NULL,
  acertos integer,
  total integer,
  resultado jsonb,
  criado_em timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.treino_respostas (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid DEFAULT auth.uid() NOT NULL,
  prova_id text,
  n smallint,
  assunto text NOT NULL,
  acertou boolean NOT NULL,
  criado_em timestamp with time zone DEFAULT now() NOT NULL,
  sessao_id uuid,
  alternativa_escolhida text,
  alternativa_correta text,
  questao_ref text,
  origem_questao text,
  topico_id text,
  etapa text,
  habilidade_principal text,
  dificuldade text
);

CREATE TABLE public.treino_sessoes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid DEFAULT auth.uid() NOT NULL,
  assunto text,
  status text DEFAULT 'em_andamento'::text NOT NULL,
  iniciado_em timestamp with time zone DEFAULT now() NOT NULL,
  finalizado_em timestamp with time zone,
  total_questoes integer,
  acertos integer,
  criado_em timestamp with time zone DEFAULT now() NOT NULL,
  filtros jsonb DEFAULT '{}'::jsonb NOT NULL
);

ALTER TABLE public.estudos_feitos ADD CONSTRAINT estudos_feitos_bloco_id_data_key UNIQUE (bloco_id, data);

ALTER TABLE public.estudos_feitos ADD CONSTRAINT estudos_feitos_pkey PRIMARY KEY (id);

ALTER TABLE public.materias ADD CONSTRAINT materias_pkey PRIMARY KEY (id);

ALTER TABLE public.materias ADD CONSTRAINT materias_user_id_id_unique UNIQUE (user_id, id);

ALTER TABLE public.plano_blocos ADD CONSTRAINT plano_blocos_dia_semana_check CHECK (((dia_semana >= 0) AND (dia_semana <= 6)));

ALTER TABLE public.plano_blocos ADD CONSTRAINT plano_blocos_duracao_min_check CHECK (((duracao_min >= 10) AND (duracao_min <= 240)));

ALTER TABLE public.plano_blocos ADD CONSTRAINT plano_blocos_pkey PRIMARY KEY (id);

ALTER TABLE public.plano_blocos ADD CONSTRAINT plano_blocos_user_id_id_unique UNIQUE (user_id, id);

ALTER TABLE public.profiles ADD CONSTRAINT profiles_papel_check CHECK ((papel = ANY (ARRAY['aluno'::text, 'responsavel'::text])));

ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

ALTER TABLE public.questoes_ia ADD CONSTRAINT questoes_ia_alternativas_check CHECK ((jsonb_typeof(alternativas) = 'object'::text));

ALTER TABLE public.questoes_ia ADD CONSTRAINT questoes_ia_check CHECK (((status <> 'aprovada'::text) OR (aprovado_em IS NOT NULL)));

ALTER TABLE public.questoes_ia ADD CONSTRAINT questoes_ia_dados_geracao_check CHECK ((jsonb_typeof(dados_geracao) = 'object'::text));

ALTER TABLE public.questoes_ia ADD CONSTRAINT questoes_ia_dificuldade_check CHECK ((dificuldade = ANY (ARRAY['facil'::text, 'media'::text, 'dificil'::text])));

ALTER TABLE public.questoes_ia ADD CONSTRAINT questoes_ia_etapa_check CHECK ((etapa = ANY (ARRAY['fundamentos'::text, 'compreensao'::text, 'aplicacao'::text, 'analise'::text])));

ALTER TABLE public.questoes_ia ADD CONSTRAINT questoes_ia_explicacao_check CHECK ((jsonb_typeof(explicacao) = 'object'::text));

ALTER TABLE public.questoes_ia ADD CONSTRAINT questoes_ia_habilidade_principal_check CHECK ((habilidade_principal = ANY (ARRAY['compreensao'::text, 'aplicacao'::text, 'analise'::text, 'sintese'::text, 'avaliacao'::text])));

ALTER TABLE public.questoes_ia ADD CONSTRAINT questoes_ia_habilidades_secundarias_check CHECK ((jsonb_typeof(habilidades_secundarias) = 'array'::text));

ALTER TABLE public.questoes_ia ADD CONSTRAINT questoes_ia_pkey PRIMARY KEY (id, versao);

ALTER TABLE public.questoes_ia ADD CONSTRAINT questoes_ia_pontuacao_qualidade_check CHECK (((pontuacao_qualidade >= (0)::numeric) AND (pontuacao_qualidade <= (100)::numeric)));

ALTER TABLE public.questoes_ia ADD CONSTRAINT questoes_ia_referencias_check CHECK ((jsonb_typeof(referencias) = 'array'::text));

ALTER TABLE public.questoes_ia ADD CONSTRAINT questoes_ia_resposta_correta_check CHECK ((resposta_correta = ANY (ARRAY['A'::text, 'B'::text, 'C'::text, 'D'::text, 'E'::text])));

ALTER TABLE public.questoes_ia ADD CONSTRAINT questoes_ia_status_check CHECK ((status = ANY (ARRAY['rascunho'::text, 'em_revisao'::text, 'aprovada'::text, 'rejeitada'::text, 'retirada'::text])));

ALTER TABLE public.questoes_ia ADD CONSTRAINT questoes_ia_versao_check CHECK ((versao > 0));

ALTER TABLE public.simulados ADD CONSTRAINT simulados_pkey PRIMARY KEY (id);

ALTER TABLE public.simulados ADD CONSTRAINT simulados_status_check CHECK ((status = ANY (ARRAY['em_andamento'::text, 'finalizado'::text])));

ALTER TABLE public.treino_respostas ADD CONSTRAINT treino_respostas_alternativa_correta_check CHECK (((alternativa_correta IS NULL) OR (alternativa_correta = ANY (ARRAY['A'::text, 'B'::text, 'C'::text, 'D'::text, 'E'::text]))));

ALTER TABLE public.treino_respostas ADD CONSTRAINT treino_respostas_alternativa_escolhida_check CHECK (((alternativa_escolhida IS NULL) OR (alternativa_escolhida = ANY (ARRAY['A'::text, 'B'::text, 'C'::text, 'D'::text, 'E'::text]))));

ALTER TABLE public.treino_respostas ADD CONSTRAINT treino_respostas_origem_check CHECK (((origem_questao IS NULL) OR (origem_questao = ANY (ARRAY['oficial'::text, 'ia'::text]))));

ALTER TABLE public.treino_respostas ADD CONSTRAINT treino_respostas_pkey PRIMARY KEY (id);

ALTER TABLE public.treino_sessoes ADD CONSTRAINT treino_sessoes_acertos_check CHECK (((acertos IS NULL) OR (acertos >= 0)));

ALTER TABLE public.treino_sessoes ADD CONSTRAINT treino_sessoes_filtros_check CHECK ((jsonb_typeof(filtros) = 'object'::text));

ALTER TABLE public.treino_sessoes ADD CONSTRAINT treino_sessoes_pkey PRIMARY KEY (id);

ALTER TABLE public.treino_sessoes ADD CONSTRAINT treino_sessoes_status_check CHECK ((status = ANY (ARRAY['em_andamento'::text, 'finalizada'::text, 'interrompida'::text])));

ALTER TABLE public.treino_sessoes ADD CONSTRAINT treino_sessoes_total_questoes_check CHECK (((total_questoes IS NULL) OR (total_questoes >= 0)));

ALTER TABLE public.treino_sessoes ADD CONSTRAINT treino_sessoes_user_id_id_unique UNIQUE (user_id, id);

ALTER TABLE public.estudos_feitos ADD CONSTRAINT estudos_feitos_bloco_id_fkey FOREIGN KEY (bloco_id) REFERENCES plano_blocos(id) ON DELETE CASCADE;

ALTER TABLE public.estudos_feitos ADD CONSTRAINT estudos_feitos_bloco_mesmo_usuario_fkey FOREIGN KEY (user_id, bloco_id) REFERENCES plano_blocos(user_id, id) ON DELETE CASCADE;

ALTER TABLE public.estudos_feitos ADD CONSTRAINT estudos_feitos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.materias ADD CONSTRAINT materias_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.plano_blocos ADD CONSTRAINT plano_blocos_materia_id_fkey FOREIGN KEY (materia_id) REFERENCES materias(id) ON DELETE CASCADE;

ALTER TABLE public.plano_blocos ADD CONSTRAINT plano_blocos_materia_mesmo_usuario_fkey FOREIGN KEY (user_id, materia_id) REFERENCES materias(user_id, id) ON DELETE CASCADE;

ALTER TABLE public.plano_blocos ADD CONSTRAINT plano_blocos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.simulados ADD CONSTRAINT simulados_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.treino_respostas ADD CONSTRAINT treino_respostas_sessao_mesmo_usuario_fkey FOREIGN KEY (user_id, sessao_id) REFERENCES treino_sessoes(user_id, id) ON DELETE CASCADE;

ALTER TABLE public.treino_respostas ADD CONSTRAINT treino_respostas_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.treino_sessoes ADD CONSTRAINT treino_sessoes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);



-- Indices adicionais; os outros 12 decorrem das constraints.

CREATE INDEX questoes_ia_aprovadas_idx ON public.questoes_ia USING btree (disciplina, assunto_id, dificuldade) WHERE (status = 'aprovada'::text);

CREATE INDEX simulados_user_idx ON public.simulados USING btree (user_id, iniciado_em DESC);

CREATE INDEX treino_respostas_sessao_idx ON public.treino_respostas USING btree (sessao_id, criado_em);

CREATE INDEX treino_user_idx ON public.treino_respostas USING btree (user_id, criado_em DESC);

CREATE INDEX treino_sessoes_user_idx ON public.treino_sessoes USING btree (user_id, iniciado_em DESC);



ALTER TABLE public.estudos_feitos ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.materias ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.plano_blocos ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.questoes_ia ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.simulados ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.treino_respostas ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.treino_sessoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "estudos do dono" ON public.estudos_feitos AS PERMISSIVE FOR ALL TO PUBLIC USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "materias do dono" ON public.materias AS PERMISSIVE FOR ALL TO PUBLIC USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "blocos do dono" ON public.plano_blocos AS PERMISSIVE FOR ALL TO PUBLIC USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "simulados do dono" ON public.simulados AS PERMISSIVE FOR ALL TO PUBLIC USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "treino do dono" ON public.treino_respostas AS PERMISSIVE FOR ALL TO PUBLIC USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "atualizar proprio perfil" ON public.profiles AS PERMISSIVE FOR UPDATE TO PUBLIC USING (auth.uid() = id);

CREATE POLICY "ver proprio perfil" ON public.profiles AS PERMISSIVE FOR SELECT TO PUBLIC USING (auth.uid() = id);

CREATE POLICY "sessoes do dono - atualizar" ON public.treino_sessoes AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sessoes do dono - inserir" ON public.treino_sessoes AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sessoes do dono - visualizar" ON public.treino_sessoes AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- questoes_ia: sem politicas. RLS nao forcado em todas as tabelas.



-- ACL de tabela observada (sete privilegios explicitamente listados).

REVOKE ALL PRIVILEGES ON TABLE public.estudos_feitos FROM PUBLIC, anon, authenticated, service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.estudos_feitos TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.estudos_feitos TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.estudos_feitos TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.estudos_feitos TO authenticated;

REVOKE ALL PRIVILEGES ON TABLE public.materias FROM PUBLIC, anon, authenticated, service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.materias TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.materias TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.materias TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.materias TO authenticated;

REVOKE ALL PRIVILEGES ON TABLE public.plano_blocos FROM PUBLIC, anon, authenticated, service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.plano_blocos TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.plano_blocos TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.plano_blocos TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.plano_blocos TO authenticated;

REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM PUBLIC, anon, authenticated, service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.profiles TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.profiles TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.profiles TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE ON TABLE public.profiles TO authenticated;

REVOKE ALL PRIVILEGES ON TABLE public.questoes_ia FROM PUBLIC, anon, authenticated, service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.questoes_ia TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.questoes_ia TO service_role;

REVOKE ALL PRIVILEGES ON TABLE public.simulados FROM PUBLIC, anon, authenticated, service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.simulados TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.simulados TO service_role;

GRANT INSERT, SELECT, UPDATE ON TABLE public.simulados TO authenticated;

REVOKE ALL PRIVILEGES ON TABLE public.treino_respostas FROM PUBLIC, anon, authenticated, service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.treino_respostas TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.treino_respostas TO service_role;

GRANT INSERT, SELECT ON TABLE public.treino_respostas TO authenticated;

REVOKE ALL PRIVILEGES ON TABLE public.treino_sessoes FROM PUBLIC, anon, authenticated, service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.treino_sessoes TO postgres WITH GRANT OPTION;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.treino_sessoes TO service_role;

GRANT INSERT, SELECT, UPDATE ON TABLE public.treino_sessoes TO authenticated;



CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, nome, papel)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', ''),
    case when new.raw_user_meta_data->>'papel' = 'responsavel' then 'responsavel' else 'aluno' end
  );
  return new;
end;
$function$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger habilitado no modo normal (O).
