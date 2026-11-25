# Treino autoral da etapa 7.3

A migração da etapa 7.3 acrescenta a finalidade e a modalidade de desafio às versões das questões, a posição da rodada às sessões e a ordem aos seus itens. Questões existentes conservam finalidade nula. A finalidade deve ser definida editorialmente antes da submissão da versão. Somente versões correntes de aprendizagem com aprovação registrada são elegíveis para atribuição. As tentativas preservam a versão exata. A migração inicia com todas as etapas desabilitadas e mantém o snapshot de produção.

## Sessões e indicadores

- O início e os reenvios recuperam a rodada aberta do aluno. A composição é persistida na transação de início. A seleção usa assunto e etapa ou modalidade Desafio. O banco limita a rodada ao tamanho configurado, sem preencher escassez com oficiais.
- Os mínimos provisórios são diagnóstico de cobertura. A RPC da equipe apresenta quantidades e tópicos distintos, respeitando a autorização por disciplina. A avaliação de diversidade e os limites por tópico ficam para a etapa 7.4.
- A resposta só pode ser gravada para o item atual. O reenvio da mesma alternativa é idempotente. O servidor aplica o gabarito da versão atribuída e só retorna correção após a gravação.
- O avanço exige item respondido ou retirado por erro. Substitutas elegíveis são acrescentadas ao final sem repetir questão nem alterar posições originais. Ao finalizar ou interromper, o servidor grava os totais válidos daquele momento. As respostas válidas já registradas entram nos indicadores mesmo em uma sessão incompleta.
- Retiradas por erro são omitidas do cálculo dinâmico dos indicadores. As respostas e os totais históricos permanecem disponíveis como registro. Substituições normais preservam correção e resultados. O painel pós-transição separa treino e simulados e preserva as respostas dos treinos legados.

## Imagens e implantação

1. Em um projeto isolado, aplicar o snapshot e as migrações versionadas. Preparar o bucket privado `questoes-privadas`, sem leitura anônima ou direta pelos alunos. Armazenar a chave relativa do objeto no registro da versão.
2. Implantar a Edge Function `imagem-treino`. Ela usa `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` no servidor. A função valida o JWT pelo Auth, resolve o objeto por meio de uma RPC exclusiva de `service_role` e solicita ao Storage uma assinatura por 300 segundos. Cada renovação repete a autorização. Uma URL já emitida pode ser usada até expirar, inclusive após retirada da questão.
3. Validar em ambiente isolado a assinatura, a expiração, a renovação e o bloqueio de acesso direto. A proteção anterior de aprovação com imagem continua ativa. A visualização privada na revisão e a eventual liberação dessa proteção exigem validação específica.
4. Somente após autorização expressa do corte, habilitar a configuração de etapas no servidor e publicar o front-end com `VITE_TREINO_AUTORAL=true`. A interface legada segue como padrão enquanto a variável estiver ausente. A definição do destino de sessões legadas abertas permanece pendente.

O teste `tests/imagem-treino.test.js` usa respostas HTTP sintéticas do Auth, PostgREST e Storage. A suíte `supabase/tests/etapa-7-3.sql` confere as RPCs, as restrições, a composição, a evolução e os indicadores em PostgreSQL descartável. Reutilize a preparação e a fixture da etapa 7.2 descritas em [testes do Supabase](tests/README.md).

Execute `bash supabase/tests/etapa-7-3-api.sh` com Docker, OpenSSL e Python 3 para validar Auth e PostgREST com PostgreSQL. A instância usa loopback interno, cria contas fictícias e descarta os containers ao terminar. O teste verifica a aprovação, o isolamento entre alunos e equipe, a retomada e os reenvios concorrentes. A validação completa do Storage e da execução em runtime Edge exige o ambiente isolado com esses serviços.
