# Etapa 7.3 — Treino autoral e indicadores separados

Diretrizes aprovadas para implementação. Referências: [continuidade](CONTINUIDADE.md), [matriz pedagógica](MATRIZ_PEDAGOGICA.md) e [banco da etapa 7.2](../supabase/ETAPA_7_2.md).

## Transição aprovada

A etapa 7.3 integra o treino exclusivamente com questões autorais aprovadas do acervo de aprendizagem. Mantém o simulado Oficial vigente. Híbrido e Autoral, bem como a evolução do fluxo de exposição e entrega de gabaritos dos simulados, ficam para uma etapa posterior. O treino atual permanece disponível até que o banco autoral esteja operacional e o corte seja aprovado. Após o corte, se houver poucos itens elegíveis, oferecer uma rodada mais curta. Sem itens elegíveis, mostrar a indisponibilidade do assunto. O catálogo oficial permanece reservado aos simulados.

Preservar integralmente tentativas, sessões, respostas, classificações e resultados existentes, inclusive os treinos feitos com oficiais. Manter `prova_id` e `n` e interpretar campos novos nulos pelo contrato legado. Propor a conclusão, antes do corte, das rodadas iniciadas no fluxo anterior. Sessões antigas que fiquem em aberto devem conservar seus registros, com regra de encerramento a aprovar.

## Sessões exclusivamente autorais

| Fluxo | Arquitetura proposta |
|---|---|
| Seleção e início | Reutilizar `treino_sessoes`, `treino_itens_autorais`, `Questao` e o modelo da 7.1. O servidor valida a conta, escolhe por assunto versões correntes aprovadas do acervo de aprendizagem e persiste, na mesma operação de início, a ordem da rodada e o UUID e a versão de cada item. A escolha considera a progressão aprovada por objetivo cognitivo e dificuldade. As regras de acesso permanecem no banco. |
| Retomada | Recuperar a sessão pelo dono e pelos itens persistidos, na ordem original, com respostas já registradas. Em uma substituição normal, manter a versão originalmente atribuída. Retomada é continuação da mesma sessão. |
| Correção | Entregar inicialmente somente dados de apresentação. Reutilizar `ifpass_responder_autoral` para gravar e corrigir no servidor. Só após confirmação, exibir gabarito e explicações. Repetir o mesmo envio recupera a resposta canônica. Preservar a unicidade por item e bloquear escritas diretas que contornem a correção. |
| Anulação | Uma retirada por erro sinaliza `item_anulado` para o item pendente. Mostrar o motivo geral, permitir avançar e excluir o item dos totais e dos indicadores como acerto, erro ou branco. Manter vínculo e trilha. Preservar respostas já gravadas no histórico e excluir retiradas por erro das métricas derivadas. Acrescentar substitutas elegíveis ao fim da rodada para preservar a ordem dos itens já atribuídos. |
| Imagens privadas | Emitir acesso temporário somente para o objeto associado à versão, após verificar a sessão e seu dono. A Edge Function assina a URL por cinco minutos e o cliente renova a autorização durante a apresentação. A visualização privada da revisão pedagógica tem seu próprio fluxo a validar. Tratar expiração e falhas sem expor o caminho interno como link público. Manter o bloqueio de aprovação com imagem até validar a visualização privada. |
| Finalização | Consolidar itens e respostas canônicas em uma transação que bloqueie a sessão, confira a propriedade e calcule totais no servidor. Deduplicar novos envios de finalização e devolver o resultado já persistido. Preservar o histórico inclusive quando a rodada não for concluída. |

A identificação de sessão autoral deve ser explícita no caminho novo. O catálogo JSON e as regras atuais de correção dos simulados oficiais permanecem em seus fluxos.

## Progressão e diagnóstico de cobertura

A configuração inicial usa 10 itens por rodada e mínimos de 5 em Fundamentos, 5 em Compreensão, 3 em Aplicação, 3 em Análise e 1 em Desafio no padrão COPEVE. Os mínimos são diagnósticos do acervo, sem bloqueio de abertura. O Desafio é complementar e independente da etapa cognitiva. A dificuldade segue independente e a análise de suficiência considera quantidade, cobertura curricular e diversidade. Os valores definitivos e os critérios de diversidade ficam para a etapa 7.4. A configuração persistida é por etapa, com extensão futura por tópico.

## Indicadores da etapa 7.3

Usar respostas canônicas de treino por assunto e janela, excluindo itens anulados conforme a política aprovada. Preservar e disponibilizar o histórico legado. A correção no servidor e a unicidade por item evitam dupla contagem. O desempenho do simulado vigente fica em série separada, com preservação das notas, brancos e anulações oficiais. Os indicadores das novas modalidades entram na etapa posterior.

## Simulados em etapa posterior

| Modalidade | Composição |
|---|---|
| Oficial | 100% de questões oficiais, com a composição original da prova. |
| Híbrido | Questões oficiais e autorais aprovadas de avaliação. A proporção é configurável. 50% é uma referência inicial. |
| Autoral | 100% de questões autorais aprovadas de avaliação. |

- **Acervos separados.** O servidor deve aplicar finalidade explícita e aprovação humana como condições de elegibilidade. Questões de aprendizagem entram no treino. Questões de avaliação entram nos simulados Híbrido e Autoral. Manter identidade, versão e vínculo histórico.
- **Preservação e exposição.** Controlar exposição por aluno e questão, registrando a versão exata das autorais e o contexto da tentativa. Preservar provas oficiais ainda não realizadas. No Híbrido, priorizar oficiais de provas já realizadas pelo aluno e excluir itens de provas reservadas. Se o conjunto elegível for insuficiente, aplicar a política de oferta ou proporção que vier a ser aprovada.
- **Tentativas e indicadores.** Distinguir primeira tentativa e repetição em cada modalidade. Recuperar a rodada pelo identificador já existente, sem gerar uma nova tentativa na retomada. Registrar exposição anterior conhecida, inclusive pelo treino legado quando identificável, e sinalizar quando a exposição for desconhecida. Manter indicadores separados para treino e para cada modalidade de simulado.
- **Proteção dos gabaritos.** Reter gabaritos e explicações enquanto qualquer simulado estiver em andamento, incluindo respostas da API e arquivos entregues ao cliente. O catálogo oficial vigente contém gabaritos no cliente. Na etapa de simulados, a entrega controlada pelo servidor e a retirada desses gabaritos do conteúdo público são necessárias para cumprir a diretriz. A revisão após encerramento segue a política a aprovar.

## Simplificações da etapa 7.3

A nova rodada de treino tem origem exclusivamente autoral. Composição por origem, proporção e nota combinada pertencem ao futuro simulado Híbrido. A etapa 7.3 mantém retomada, correção autoral e finalização no servidor. Preserva os simulados atuais e reutiliza o modelo unificado para renderização e leitura do histórico.

## Etapa 7.4 e aceite

A configuração de geração deve ser versionada e carregar as fontes curriculares, instruções e exemplos validados. Preparar perfis distintos para aprendizagem e avaliação. O primeiro mantém a progressão por objetivo cognitivo e dificuldade. O segundo prioriza cobertura do edital e itens de avaliação com exposição controlada. Incluir triagem de similaridade das candidatas com oficiais, por sinais textuais e semânticos, com revisão humana dos casos sinalizados. Guardar referências e versão da triagem. Preservar a progressão pedagógica e separar características observáveis da banca de reprodução do conteúdo. As futuras etapas 8 podem atualizar as evidências e a configuração sem retreinamento obrigatório. Não há implementação da etapa 8 nesta entrega.

Antes do corte, validar em Supabase isolado os fluxos de Auth, PostgREST, RLS e Storage, a seleção de aprovadas, a retomada versionada, a falta de itens sem fallback oficial, a ausência de gabarito antecipado, os reenvios, a anulação, a finalização concorrente, a separação dos indicadores e a leitura íntegra do histórico. A classificação das tentativas por modalidade e a entrega protegida dos gabaritos serão validadas na etapa posterior de simulados. A ativação do treino autoral aguarda autorização expressa após a validação isolada.

## Decisões ainda pendentes

1. Fixar o critério operacional para o corte e o destino de sessões legadas pendentes.
2. Na etapa posterior, definir o que conta como prova já realizada para o Híbrido, o que caracteriza repetição em cada modalidade, como ajustar a proporção híbrida se faltarem itens e quando liberar a revisão após o encerramento.
3. Na etapa 7.4, validar os critérios dos perfis de aprendizagem e avaliação e o método, as referências e os limites da triagem de similaridade.
