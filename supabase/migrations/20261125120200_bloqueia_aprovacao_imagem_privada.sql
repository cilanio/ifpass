BEGIN;

-- Temporário até o fluxo de visualização privada ser validado.
CREATE FUNCTION public.ifpass_exigir_visualizacao_imagem() RETURNS trigger
LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'aprovada' AND nullif(btrim(NEW.imagem), '') IS NOT NULL THEN
    IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status
      OR OLD.imagem IS DISTINCT FROM NEW.imagem THEN
      RAISE EXCEPTION 'A aprovação exige a visualização da imagem privada, ainda indisponível.'
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.ifpass_exigir_visualizacao_imagem()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER ifpass_exigir_visualizacao_imagem
  BEFORE INSERT OR UPDATE OF status, imagem ON public.questoes_ia
  FOR EACH ROW EXECUTE FUNCTION public.ifpass_exigir_visualizacao_imagem();

COMMIT;
