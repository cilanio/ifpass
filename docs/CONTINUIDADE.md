# IFPASS — Documento Mestre de Continuidade

**Versão 1.3 — minuta para aprovação | 24/11/2026**

Repositório: https://github.com/cilanio/ifpass. Complementos: `AGENTS.md` e `docs/MATRIZ_PEDAGOGICA.md`.

## 1. Objetivo e governança

Preparar estudantes para o ingresso no IFAL mediante planejamento, simulados, treino por assunto, diagnóstico e progressão de aprendizagem. Trabalhar exclusivamente no IFPASS; preservar funcionalidades e histórico; consultar o código antes de alterar; usar branches separadas e aprovação antes do merge ou de mudanças no banco. Não depender permanentemente de assinaturas de IA. Distinguir confirmado no código, confirmado anteriormente pelo usuário, decisão aprovada, proposta, pendência e divergência. Não repetir auditorias sem mudança relevante ou indício de regressão.

## 2. Referência pedagógica

Edital nº 44/2026/DSI/PROEN-IFAL, seleção 2027.1.1, retificação de 10/11/2026, conforme registros anteriores: 18 questões de Português, 18 de Matemática e 4 de Ciências da Natureza, cinco alternativas e uma correta. O edital é a referência primária; provas históricas são evidência complementar de estilo, não substituto curricular. Atualizar a referência quando houver novo edital.

Decisões aprovadas: priorizar Português e Matemática inicialmente; preservar Ciências e planejar sua inclusão; manter Atualidades no histórico. Separar origem oficial e autoral. Fundamentos (conceitos, definições, terminologia e propriedades), compreensão, aplicação e análise são objetivos legítimos de aprendizagem. Dificuldade é independente do objetivo cognitivo: uma questão conceitual pode ser difícil. Não exigir contextualização ou complexidade como condição de qualidade. Ver matriz complementar.

## 3. Arquitetura

React 19, Vite, JavaScript, Supabase, GitHub. Caminho local informado: `C:\Projetos\ifpass`.

| Arquivo | Responsabilidade |
|---|---|
| src/App.jsx, Login.jsx, Home.jsx | Autenticação, sessão e navegação |
| src/Hoje.jsx, Plano.jsx | Atividades e planejamento |
| src/Simulados.jsx, Prova.jsx, Resultado.jsx | Simulados, execução e resultado |
| src/Treino.jsx, Foco.jsx | Treino e diagnóstico |
| src/Questao.jsx, Texto.jsx | Renderização de questões e textos |
| src/data/assuntos.js, provas.js | Classificação e catálogo |
| src/data/letras*.js | Complementos textuais; TODAS_LETRAS e completar() |
| src/lib/correcao.js, assuntos.js, util.js | Correção, indicadores e utilidades |
| src/lib/supabase.js | Cliente Supabase; VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY |

## 4. Banco histórico

| JSON em src/data/ | Aplicação | Distribuição |
|---|---|---|
| ifal-2024-t3.json | 03/12/2023 | 18 LP, 18 Mat., 4 Atualidades |
| ifal-2025-t1.json | 22/12/2024 | 18 LP, 18 Mat., 4 Atualidades |
| ifal-2026-t1.json | 21/12/2025 | 18 LP, 18 Mat., 4 Ciências |

40 questões e 210 minutos por prova; 120 oficiais, 118 não anuladas. Imagens em `public/provas/<id>/qXX.png`, qXX corresponde ao número da questão. Preservar números, gabaritos e IDs históricos. Anuladas dão ponto a todos no simulado e não entram no treino.

Contagens históricas não anuladas (v1.1):

| ID | Quantidade |
|---|---:|
| p_texto | 9 |
| p_comunicacao | 8 |
| p_acentuacao | 4 |
| p_grafia | 4 |
| p_semantica | 7 |
| p_classes | 9 |
| p_sintaxe | 9 |
| p_concordancia | 4 |
| m_numeros | 8 |
| m_proporcao | 7 |
| m_equacoes1 | 5 |
| m_algebra | 8 |
| m_potencia | 5 |
| m_eq2 | 5 |
| m_funcoes | 3 |
| m_geo_plana | 4 |
| m_geo_semelhanca | 3 |
| m_geo_espacial | 3 |
| m_dados | 1 |
| a_geopolitica | 3 |
| a_clima | 4 |
| a_globalizacao | 1 |
| c_calor | 1 |
| c_saude | 1 |
| c_ambiente | 1 |
| c_eletricidade | 1 |

Totais: LP 54, Mat. 52, Atualidades 8, Ciências 4. Frequência histórica não equivale à importância curricular.

## 5. Estado funcional e verificações

Implementados: autenticação, planejamento semanal, registro de estudos, simulados com cronômetro, marcações, salvamento, retomada e resultado por bloco; treino por assunto, sessões e respostas; Foco e indicadores. Rodadas de até 10 questões únicas, reduzidas naturalmente quando o banco é menor. O treino inclui assuntos de todos os blocos no diagnóstico publicado; verificar política de exibição antes de alterar.

Histórico confirmado anteriormente: gabaritos e classificação conferidos; inconsistência de 44 classificações na prova 2024 corrigida; 36 referências de imagens com arquivos existentes; apresentação visual aprovada pelo usuário; persistência e retomada de simulados testadas; registro de treino testado. RLS, perfis e permissões revisados anteriormente. Não repetir integralmente sem necessidade. Isso não certifica o estado atual do banco nem recuperação completa de treino interrompido.

## 6. Supabase

Tabelas conhecidas: profiles, materias, plano_blocos, estudos_feitos, simulados, treino_sessoes, treino_respostas. Perfis aluno/responsavel; trigger on_auth_user_created e função handle_new_user(). RLS e isolamento por usuário anteriormente verificados. Restrições de acesso anônimo relatadas em simulados e respostas de treino.

Restrições anteriormente verificadas: simulados.status em_andamento/finalizado; treino_sessoes.status em_andamento/finalizada/interrompida; alternativas escolhida/correta A–E ou NULL; UNIQUE treino_sessoes(user_id,id); FK treino_respostas(user_id,sessao_id) para treino_sessoes(user_id,id) ON DELETE CASCADE; FK simulados.user_id para auth.users(id) ON DELETE CASCADE. Índices conhecidos: simulados_user_idx, treino_respostas_sessao_idx, treino_user_idx, treino_sessoes_user_idx.

Em 22/11 houve execução SQL com retorno de sucesso relatado pelo usuário após cancelamento de uma tentativa com alerta de RLS. O script final e o schema efetivo de questoes_ia não estão confirmados neste documento. Não recriar tabelas ou aplicar migrações antes de recuperar o estado real por consulta somente leitura. Versionar schema, restrições, índices, políticas e migrações sem credenciais ou dados pessoais.

## 7. Diagnóstico Codex e riscos

Referência: diagnóstico estático do commit e3038eec88404c689d1df5b871a0dfad737be345. Não houve testes executados nem acesso ao Supabase ativo nesse diagnóstico. Não havia migrações SQL versionadas, suíte de testes automatizados ou integração autoral publicada. Identidade histórica: prova_id + número.

Riscos a tratar incrementalmente: cancelamento de autosave de 700 ms ao desmontar componente; treino pode ficar em andamento ao trocar aba; sequência de treino não recuperada integralmente; consultas sem paginação; repetição de questões pode inflar indicadores; mudanças de catálogo podem alterar interpretação histórica; correção e tempo no cliente; consultas dependentes de RLS. Não tratar riscos estáticos como falhas reproduzidas.

Foco: diagnóstico relata até três assuntos abaixo de 100%, mínimo de cinco respostas válidas; comparação últimos 30 dias com 30 anteriores, cinco respostas em cada e limiar de cinco pontos percentuais. Há divergência documental sobre brancos: diagnóstico indica exclusão do percentual por assunto, registros anteriores indicam contagem como erro. Confirmar código e regra pedagógica antes de mudar. Anuladas não são erros.

## 8. Questões autorais — roteiro aprovado

1. Definir modelo comum para Questao.jsx, mantendo adaptadores das oficiais.
2. Planejar questoes_ia e extensões de treino_sessoes/treino_respostas, preservando registros antigos; confirmar schema real primeiro.
3. Integrar ao mesmo fluxo de treino com identificação de origem; simulados oficiais intactos.
4. Definir geração, saída estruturada, validação independente, revisão humana e armazenamento; sem publicação automática.
5. Testar regressões, compatibilidade histórica e contabilização das novas questões.

Metadados propostos, rubrica e piloto em MATRIZ_PEDAGOGICA.md. Escassez de exemplos de Ciências não garante fidelidade à banca; avaliar cobertura e qualidade, não apenas volume.

## 9. Backlog priorizado

- [x] Conectar Codex e obter diagnóstico estático.
- [x] Criar e revisar AGENTS.md; integração PR #1, commit d15f313c55697053403cfd5c23998a1870b43630, relatada pelo usuário.
- [ ] Aprovar e integrar esta documentação e matriz complementar.
- [ ] Recuperar/conferir relação individual dos itens curriculares e IDs de subtópicos.
- [ ] Versionar estrutura efetiva do Supabase após consulta somente leitura.
- [ ] Estabelecer testes automatizados de correção, classificação, indicadores e persistência.
- [ ] Retomar roteiro de integração autoral; aprovar rubrica e piloto antes da publicação.
- [ ] Ajustar prioridade visual do treino sem apagar Atualidades ou Ciências.
- [ ] Avaliar recuperação de treino, autosave, paginação e indicadores de repetição.
- [ ] Melhorar README e avaliar bundle quando necessário.

Executar lint e build após alterações funcionais; avisos anteriores de React em Hoje.jsx/Simulados.jsx e tamanho de bundle devem ser distinguidos de regressões. Manter revisão semanal somente diagnóstica, sem commits ou alterações automáticas.

## 10. Controle de versões e continuidade

v1.0: referência inicial. v1.1 (16/11): estado técnico, auditorias, contagens, rubrica e piloto propostos. v1.2: decisões curriculares e progressão; reconstrução de 24/11 é parcial. v1.3: consolidação das duas versões, diagnóstico Codex, AGENTS.md e pendências posteriores. Não equivale a nova auditoria. A cada tarefa consultar AGENTS.md, esta referência, matriz e código atual; registrar evidências e atualizar decisões aprovadas. Não depender da memória de chats.
