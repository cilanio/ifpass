BEGIN;

-- A RPC registra a decisão antes de publicar a versão, na mesma transação.
-- A restrição protege novas decisões e preserva o histórico de avaliações.
ALTER TABLE public.revisoes_questoes
  ADD CONSTRAINT revisoes_questoes_checklist_aprovacao_check CHECK (
    decisao <> 'aprovada' OR criterios @> '{
      "gabarito_incorreto": false,
      "alternativa_correta_nao_unica": false,
      "erro_conceitual_ou_matematico": false,
      "ambiguidade": false,
      "informacoes_insuficientes": false,
      "fora_do_edital_sem_justificativa": false,
      "explicacao_incompativel": false,
      "reproducao_indevida": false,
      "fidelidade_edital": true,
      "correcao_cientifica_matematica_linguistica": true,
      "clareza_precisao": true,
      "qualidade_alternativas": true,
      "adequacao_dificuldade": true,
      "compatibilidade_copeve": true,
      "qualidade_explicacao": true
    }'::jsonb
  ) NOT VALID;

COMMIT;
