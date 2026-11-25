# Etapa 7.2 — Integração com Supabase e revisão pedagógica

Decisões consolidadas. A preparação técnica aguarda o diagnóstico do banco real antes da elaboração das migrações. A etapa 7.1 está integrada à `main` no commit `aa30e43`. Os pontos de partida são as [diretrizes](../AGENTS.md), a [continuidade](CONTINUIDADE.md), a [matriz pedagógica](MATRIZ_PEDAGOGICA.md), o [modelo em memória](MODELO_QUESTAO.md) e o [snapshot do Supabase](../supabase/schema.sql).

## Decisões aprovadas

- Referência oficial `oficial:<prova_id>:<n>` e autoral `ia:<uuid>:<versao>`. A resposta autoral usa UUID e versão em colunas próprias com chave estrangeira composta. A versão aprovada permanece disponível durante a revisão da sucessora, salvo retirada explícita por erro. Versões anteriores são preservadas.
- Questões autorais exigem uma aprovação humana independente por profissional qualificado e autorizado na disciplina. O servidor grava e corrige a resposta antes de liberar o gabarito, a explicação da correta e a justificativa individual de cada distrator. Imagens próprias ficam em armazenamento privado, com acesso temporário autorizado.
- A unicidade por item atribuído à sessão garante idempotência e evita dupla contagem. Os simulados oficiais permanecem exclusivamente oficiais, com o catálogo e os gabaritos atuais.
- A revisão é acessível remotamente pela plataforma. Os quatro perfis são aluno, responsável, revisor pedagógico e administrador. O primeiro administrador é provisionado manualmente no Supabase. Somente administradores atribuem e revogam permissões de equipe. Contas de equipe são separadas das contas de aluno e responsável. A autorização do revisor é delimitada por disciplina e os dados dos alunos ficam isolados da área de revisão.
- A área de revisão oferece fila de pendências com filtros, visualização da questão, do gabarito e das explicações, e checklist pedagógico versionado baseado na matriz. As decisões possíveis são aprovação, solicitação de correção e rejeição. Cada decisão registra revisor, versão avaliada, critérios, observações, decisão e data.

## Critérios eliminatórios obrigatórios

Qualquer ocorrência impede a aprovação, independentemente dos demais critérios do checklist.

- Gabarito incorreto.
- Mais de uma alternativa correta ou nenhuma correta.
- Erro conceitual ou matemático.
- Ambiguidade que comprometa a resolução.
- Informações insuficientes.
- Conteúdo fora do edital sem justificativa pedagógica.
- Explicação incompatível com a resposta.
- Reprodução indevida de conteúdo de terceiros.

## Estrutura existente e mudanças propostas

| Evidência atual | Mudança mínima proposta |
| --- | --- |
| [`questoes_ia`](../supabase/schema.sql#L48) já tem chave `(id, versao)`, estados, conteúdo, gabarito e explicação. | Reutilizar a tabela e a chave. Uma edição de conteúdo aprovado cria uma nova versão em rascunho sob o mesmo UUID. A versão aprovada anterior continua elegível enquanto a sucessora estiver em revisão, salvo retirada explícita por erro. A fila pode usar o estado existente `em_revisao`. A solicitação de correção devolve a versão em revisão a `rascunho` e registra a decisão no histórico. |
| [`treino_respostas`](../supabase/schema.sql#L89) usa `prova_id` e `n` no fluxo oficial. `questao_ref` é texto sem FK e os campos novos admitem nulos. | Adicionar duas colunas tipadas e opcionais para UUID e versão autoral, com FK composta para `questoes_ia`, presença conjunta obrigatória e exclusão restrita. Exigir o par em registros autorais novos. Preservar os campos e as linhas legadas. Usar `oficial:<prova_id>:<n>` e `ia:<uuid>:<versao>` como formatos definitivos de referência. A identidade em memória da 7.1 segue como par `(id, versao)`. Derivar a referência textual dos campos tipados se ela for usada na persistência. |
| [`profiles`](../supabase/schema.sql#L41) registra aluno ou responsável. [O cadastro](../src/Login.jsx) envia o papel e o trigger limita os valores que aceita. | Manter os perfis existentes. Modelar revisor e administrador em atribuições protegidas, separadas do perfil editável, com escopo por disciplina para o revisor. Registrar atribuições e revogações. Provisionar manualmente o primeiro administrador no Supabase antes de liberar a gestão na plataforma. |
| O snapshot carece de um registro de decisões de revisão. | Adicionar tabela de revisões com FK para a versão, identificador do revisor derivado da sessão, checklist estruturado com versão dos critérios, observações, decisão e horário do servidor. Escrita e mudança de estado em uma única transação autorizada. Revalidar o estado sob bloqueio para impedir decisões concorrentes sobre a mesma fila. Preservar decisões anteriores para auditoria. |

Antes de preparar migrações, conferir por leitura autorizada a estrutura efetiva, os privilégios e a existência de dados nas colunas autorais. Manter as referências legadas sem conversão automática. Validar novas restrições com dados representativos em ambiente isolado.

## Acesso e entrega de questões

- **RLS e privilégios.** Manter as políticas de propriedade dos registros de estudo. Autorizar consulta da fila e do histórico de revisão somente ao administrador ou ao revisor com atribuição ativa para a disciplina da versão. Usar operações controladas para registrar decisões e administrar atribuições. Identidade, escopo e transições são verificados no servidor em todas as operações. A área de revisão consulta somente conteúdo e dados de revisão. Ela não recebe consultas a perfis, respostas, notas ou sessões de alunos.
- **Aluno e responsável.** Manter o acesso atual aos dados de cada conta. A seleção autoral do treino devolve somente campos de apresentação de versões aprovadas. Gabarito, explicação, checklist, observações e metadados internos ficam fora dessa resposta. Uma operação transacional recebe a alternativa, valida a identidade da sessão e do item previamente atribuído, calcula a correção no servidor, salva a resposta e retorna gabarito e explicações como confirmação. O fluxo oficial atual continua gravando como hoje. Restringir a escrita autoral à operação controlada ao habilitar o fluxo.
- **Contabilização.** Vincular cada item autoral atribuído à sessão e à versão exata. Aplicar unicidade por item atribuído, inclusive em uma nova tentativa de envio após perda da confirmação. Retornar o registro já gravado em uma repetição idêntica e impedir que uma segunda escolha substitua a primeira. Manter o indicador baseado no registro canônico salvo e preservar respostas de rodadas legítimas distintas. Reutilizar as agregações existentes sem contar o retorno da operação como um segundo evento.
- **Imagens.** Usar bucket privado com objetos próprios vinculados à versão. Entregar imagens por acesso autorizado e temporário. Revisores veem imagens no escopo da disciplina e alunos veem apenas as imagens de versões elegíveis no treino.
- **Aplicação.** Reutilizar `Home` e a navegação existente para a área de revisão, `Questao` para a prévia e revisão, e as estruturas de treino e indicadores para o fluxo de resposta. Na revisão, compor gabarito, explicações e checklist junto à prévia. Usar filtros por disciplina, situação e assunto. Ocultar a área na interface para perfis sem permissão e aplicar as mesmas regras no servidor.

## Ordem de implementação e aceite propostos

1. Conferir o catálogo efetivo com o diagnóstico de leitura e avaliar os resultados. Projetar migrações mínimas para referências versionadas, atribuições e revisão.
2. Validar em ambiente isolado RLS, privilégios e transições. Cobrir atribuição legítima e autoatribuição negada, disciplina fora da autorização, isolamento dos alunos, histórico legado e concorrência entre decisões.
3. Habilitar a área de revisão com conteúdo de teste. Validar fila, filtros, checklist, três decisões, trilha de auditoria e nova aprovação ao modificar conteúdo.
4. Integrar entrega e resposta autoral em ambiente isolado. Testar ausência de gabarito antes da gravação, explicações após confirmação, repetição de envio, preservação de versões e invariância dos indicadores e simulados históricos. A abertura aos alunos depende de aprovação própria.

## Diagnóstico antes das migrações

Execute o [diagnóstico somente leitura](../supabase/verificacoes/diagnostico-etapa-7-2.sql) em sessão administrativa autorizada. Ele verifica as estruturas que podem ser reaproveitadas, as ACLs e RLS relevantes à etapa, os metadados do Storage e a existência de histórico autoral incompatível com a futura FK ou unicidade. O resultado contém metadados e contagens, sem linhas de usuários, respostas, conteúdo de questões ou chaves.

A verificação de TRUNCATE já confirmada em produção, as cascatas existentes e os testes locais de RLS da etapa 6.7 ficam fora deste diagnóstico. As consultas de ACL focam o conteúdo autoral, a gestão de perfis e o caminho de escrita de respostas, cuja configuração real condiciona as mudanças desta etapa.

As contagens de preflight podem exigir leitura das tabelas de questões e respostas. A execução depende de acesso administrativo de leitura e suporta catálogos em que as colunas autorais ainda estejam ausentes. O único SELECT retorna uma linha com a coluna JSON `diagnostico`. No SQL Editor, copie o objeto completo, incluindo `preflight`. Blocos sem as estruturas esperadas retornam um objeto com a chave `indisponivel`. Aguarde esses resultados antes de redigir as migrações definitivas.
