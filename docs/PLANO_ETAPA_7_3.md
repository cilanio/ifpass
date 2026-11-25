# Etapa 7.3 — Treino autoral e indicadores separados

Plano revisado para aprovação antes da implementação. Referências: [continuidade](CONTINUIDADE.md), [matriz pedagógica](MATRIZ_PEDAGOGICA.md) e [banco da etapa 7.2](../supabase/ETAPA_7_2.md).

## Transição aprovada

O destino da etapa é treino exclusivamente autoral com questões aprovadas e simulados exclusivamente oficiais. O treino atual permanece disponível até que o banco autoral esteja operacional e o corte seja aprovado. Após o corte, se houver poucos itens elegíveis, a proposta é oferecer uma rodada mais curta. Sem itens elegíveis, mostrar a indisponibilidade do assunto. O catálogo oficial permanece reservado aos simulados.

Preservar integralmente tentativas, sessões, respostas, classificações e resultados existentes, inclusive os treinos feitos com oficiais. Manter `prova_id` e `n` e interpretar campos novos nulos pelo contrato legado. Propor a conclusão, antes do corte, das rodadas iniciadas no fluxo anterior. Sessões antigas que fiquem em aberto devem conservar seus registros, com regra de encerramento a aprovar.

## Sessões exclusivamente autorais

| Fluxo | Arquitetura proposta |
|---|---|
| Seleção e início | Reutilizar `treino_sessoes`, `treino_itens_autorais`, `Questao` e o modelo da 7.1. O servidor valida a conta, escolhe versões correntes aprovadas por assunto e persiste, na mesma operação de início, a ordem da rodada e o UUID e a versão de cada item. A escolha considera a progressão aprovada por objetivo cognitivo e dificuldade. As regras de acesso permanecem no banco. |
| Retomada | Recuperar a sessão pelo dono e pelos itens persistidos, na ordem original, com respostas já registradas. Em uma substituição normal, manter a versão originalmente atribuída. Retomada é continuação da mesma sessão. |
| Correção | Entregar inicialmente somente dados de apresentação. Reutilizar `ifpass_responder_autoral` para gravar e corrigir no servidor. Só após confirmação, exibir gabarito e explicações. Repetir o mesmo envio recupera a resposta canônica. Preservar a unicidade por item e bloquear escritas diretas que contornem a correção. |
| Anulação | Uma retirada por erro sinaliza `item_anulado` para o item pendente. Mostrar o motivo geral, permitir avançar e excluir o item dos totais e dos indicadores como acerto, erro ou branco. Manter vínculo e trilha. Propor que respostas já gravadas permaneçam como histórico, com eventual exclusão apenas das métricas derivadas conforme decisão aprovada. |
| Imagens privadas | Emitir acesso temporário somente para o objeto associado à versão, após verificar a sessão e seu dono ou a autorização do revisor. Tratar expiração e falhas sem expor o caminho interno como link público. Manter o bloqueio de aprovação com imagem até validar a visualização privada. |
| Finalização | Consolidar itens e respostas canônicas em uma transação que bloqueie a sessão, confira a propriedade e calcule totais no servidor. Deduplicar novos envios de finalização e devolver o resultado já persistido. Preservar o histórico inclusive quando a rodada não for concluída. |

A identificação de sessão autoral deve ser explícita no caminho novo. O catálogo JSON e as regras atuais de correção dos simulados oficiais permanecem em seus fluxos.

## Exposição e indicadores

- **Exposição oficial.** Reservar as questões oficiais ao fluxo de simulados após o corte. Registrar início, retomada e finalização por aluno e prova, e usar as tentativas existentes quando houver evidência suficiente. Exibir e distinguir primeira tentativa registrada, repetição e retomada. A retomada mantém o identificador da tentativa. Indicar exposição anterior conhecida, por exemplo quando um treino histórico identifica questões da mesma prova. A ausência de evidência no histórico não comprova ausência de exposição. A referência proposta para primeira tentativa é a primeira abertura registrada da prova pela conta, inclusive quando não concluída. A forma de registrar abertura e o momento de liberar revisão oficial ainda precisam de aprovação.
- **Indicador de treino.** Usar respostas canônicas autorais por assunto e janela, excluindo itens anulados conforme a política aprovada. Preservar e disponibilizar os dados de treino anteriores como histórico legado. A correção no servidor e a unicidade por item evitam contar a confirmação do feedback como outra resposta.
- **Indicador de simulados.** Usar as tentativas oficiais finalizadas e mostrar primeira tentativa e repetições separadamente. Preservar notas, brancos e correção de anuladas conforme as regras oficiais atuais. Retomar uma tentativa não cria um resultado adicional. Manter a classificação histórica quando houver dados compatíveis e sinalizar exposição desconhecida quando não for possível inferi-la.
- **Limites do controle.** Hoje as provas e gabaritos oficiais são incluídos no cliente. Reservar o catálogo à navegação de simulados controla a exposição pela interface. Uma garantia de acesso ao conteúdo e gabarito exigiria entrega controlada no servidor e fica fora do escopo deste plano até decisão explícita.

## Simplificações em relação ao desenho anterior

Remover do plano a proporção e o embaralhamento entre origens, a substituição por oficiais em treino com oferta baixa, a persistência de itens oficiais em novas rodadas autorais e a finalização que unificaria dois caminhos de correção. Eliminar o indicador combinado de treino e simulados. A separação reduz a necessidade de conciliar regras de pontuação e exposição. Conservar identidade oficial, modelo unificado e estruturas existentes para renderização e leitura do histórico.

## Etapa 7.4 e aceite

A configuração de geração deve ser versionada e carregar as fontes curriculares, instruções e exemplos validados. Incluir triagem de similaridade das candidatas com oficiais, por sinais textuais e semânticos, com revisão humana dos casos sinalizados. Guardar referências e versão da triagem. Preservar a progressão pedagógica e separar características observáveis da banca de reprodução do conteúdo. As futuras etapas 8 podem atualizar as evidências e a configuração sem retreinamento obrigatório. Não há implementação da etapa 8 nesta entrega.

Antes do corte, validar em Supabase isolado os fluxos de Auth, PostgREST, RLS e Storage, a seleção de aprovadas, a retomada versionada, a falta de itens sem fallback oficial, a ausência de gabarito antecipado, os reenvios, a anulação, a finalização concorrente, a distinção das tentativas oficiais e a leitura íntegra do histórico. A implementação funcional e a implantação aguardam aprovação.

## Decisões ainda pendentes

1. Fixar o critério operacional para o corte, o tamanho mínimo da rodada curta, a política de substituição de itens anulados e o destino de sessões legadas pendentes.
2. Aprovar a política de exposição oficial e revisão de gabarito, inclusive o tratamento de abertura sem finalização e o limite entre controle pela interface e controle pelo servidor.
3. Aprovar a contabilização de rodadas incompletas e o efeito de retiradas por erro sobre indicadores de respostas já gravadas. Definir duração do acesso temporário às imagens.
4. Na etapa 7.4, validar o método, as referências e os limites da triagem de similaridade, com critérios de encaminhamento à revisão humana.
