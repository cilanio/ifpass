-- Execute a mesma consulta antes e depois da migração e compare os resultados.
-- A coluna pode_truncar inclui privilégios efetivos por herança ou PUBLIC.
-- Após a migração, espere false para anon e authenticated nas quatro tabelas
-- e preserve todas as demais células obtidas na consulta anterior.
WITH tabelas(nome) AS (
  VALUES ('public.profiles'), ('public.materias'),
         ('public.plano_blocos'), ('public.estudos_feitos')
), papeis(nome) AS (
  VALUES ('anon'), ('authenticated'), ('postgres'), ('service_role')
)
SELECT
  papeis.nome AS papel,
  tabelas.nome AS tabela,
  has_table_privilege(papeis.nome, tabelas.nome, 'TRUNCATE') AS pode_truncar,
  has_table_privilege(papeis.nome, tabelas.nome, 'SELECT') AS pode_select,
  has_table_privilege(papeis.nome, tabelas.nome, 'INSERT') AS pode_insert,
  has_table_privilege(papeis.nome, tabelas.nome, 'UPDATE') AS pode_update,
  has_table_privilege(papeis.nome, tabelas.nome, 'DELETE') AS pode_delete,
  has_table_privilege(papeis.nome, tabelas.nome, 'REFERENCES') AS pode_references,
  has_table_privilege(papeis.nome, tabelas.nome, 'TRIGGER') AS pode_trigger
FROM papeis CROSS JOIN tabelas
ORDER BY papel, tabela;
