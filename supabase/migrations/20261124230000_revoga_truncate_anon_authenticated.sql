REVOKE TRUNCATE ON TABLE
  public.profiles,
  public.materias,
  public.plano_blocos,
  public.estudos_feitos
FROM anon, authenticated RESTRICT;
