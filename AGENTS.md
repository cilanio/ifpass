# AGENTS.md — IFPASS

## 1. Contexto e objetivo

O IFPASS (IFAL Smart Study) é uma plataforma educacional destinada à preparação de estudantes para o processo seletivo do IFAL, organizado pela COPEVE/UFAL.

O objetivo é desenvolver conhecimento progressivo, identificar dificuldades de aprendizagem e melhorar o desempenho do estudante.

## 2. Arquitetura atual

- Front-end: React 19, Vite e JavaScript.
- Autenticação e banco de dados: Supabase.
- Provas oficiais: arquivos JSON em src/data/.
- Imagens das questões: public/provas/.
- Classificação por assunto: src/data/assuntos.js.
- Regras compartilhadas: src/lib/.
- Renderização de questões: src/Questao.jsx.

Preservar a arquitetura existente, salvo quando uma alteração for tecnicamente justificada e aprovada.

## 3. Regras obrigatórias de desenvolvimento

- Trabalhar exclusivamente no projeto IFPASS.
- Preservar funcionalidades existentes.
- Evitar refatorações desnecessárias.
- Não modificar diretamente a branch main.
- Não realizar alterações destrutivas.
- Não adicionar dependências sem justificativa técnica.
- Priorizar soluções simples, sustentáveis e de baixo custo.
- Não criar dependência permanente de assinaturas de inteligência artificial.
- Não expor credenciais, tokens, informações pessoais ou chaves privadas.
- Não inventar resultados de testes ou verificações.

## 4. Regras pedagógicas

- Priorizar Língua Portuguesa e Matemática no treino inicial.
- Preservar os dados de Atualidades e Ciências da Natureza.
- Respeitar os conteúdos previstos no edital do IFAL.
- Manter as provas oficiais identificadas e separadas das questões autorais.
- Preservar os gabaritos oficiais.
- Respeitar as regras de correção das questões anuladas.
- Não alterar classificações existentes sem justificativa e avaliação do impacto no histórico.

## 5. Questões autorais geradas por IA

Adotar uma abordagem pedagógica híbrida, contemplando:

- Conceitos e definições fundamentais.
- Compreensão e interpretação.
- Aplicação de conhecimentos.
- Raciocínio lógico.
- Resolução de problemas e cálculos.
- Progressão de dificuldade.

A geração de questões não deve depender exclusivamente da imitação das poucas questões oficiais disponíveis.

Cada questão autoral deverá possuir identificação própria, assunto, dificuldade, enunciado, alternativas, gabarito, resolução fundamentada, origem e situação de validação.

As questões deverão passar por critérios de qualidade e revisão humana antes da publicação.

Não publicar automaticamente questões geradas por IA.

Preservar a compatibilidade entre questões oficiais e autorais, sem comprometer os simulados oficiais.

## 6. Supabase e segurança

- Preservar os registros existentes.
- Respeitar o isolamento de dados entre usuários.
- Manter as políticas Row Level Security (RLS).
- Preservar restrições, índices e relacionamentos existentes.
- Não executar alterações no banco de produção sem autorização explícita.
- Apresentar previamente scripts SQL e seus impactos.
- Versionar migrações e alterações estruturais aprovadas.
- Não presumir que a estrutura publicada no GitHub corresponde integralmente ao banco em execução.
- Diferenciar configurações verificadas de configurações apenas relatadas.

## 7. Testes e qualidade técnica

Antes de considerar uma implementação concluída:

- Executar npm run lint.
- Executar npm run build.
- Executar os testes automatizados disponíveis.
- Verificar possíveis regressões.
- Preservar o histórico de simulados e treinos.
- Conferir a compatibilidade com registros antigos.
- Informar testes que não puderam ser executados.
- Diferenciar problemas preexistentes de problemas introduzidos pela alteração.

Priorizar a implantação gradual de testes automatizados para correção, classificação, indicadores, persistência e recuperação de sessões.

## 8. Fluxo de trabalho

Para cada tarefa:

1. Compreender o objetivo e consultar a documentação de continuidade.
2. Examinar os arquivos envolvidos.
3. Identificar riscos e dependências.
4. Implementar apenas o escopo autorizado.
5. Executar as verificações pertinentes.
6. Apresentar um resumo objetivo das alterações.
7. Atualizar a documentação de continuidade quando necessário.
8. Aguardar aprovação antes de integrar alterações à main.

Não repetir auditorias completas quando não houver mudanças relevantes.

## 9. Documentação e continuidade

O arquivo docs/CONTINUIDADE.md, quando criado, deverá concentrar:

- Arquitetura do projeto.
- Decisões técnicas e pedagógicas.
- Funcionalidades concluídas.
- Estrutura conhecida do banco de dados.
- Pendências priorizadas.
- Critérios de qualidade.
- Histórico das alterações relevantes.
- Próximos passos.

Nenhuma informação essencial à continuidade do projeto deverá depender exclusivamente da memória de uma ferramenta de inteligência artificial.

## 10. Comunicação

- Utilizar português brasileiro.
- Ser objetivo e tecnicamente fundamentado.
- Evitar explicações repetitivas.
- Apresentar evidências por arquivo e caminho.
- Distinguir fatos confirmados, hipóteses, recomendações e pendências.
- Solicitar esclarecimento quando uma decisão importante não estiver documentada.
- Não declarar uma tarefa concluída sem evidências suficientes.
