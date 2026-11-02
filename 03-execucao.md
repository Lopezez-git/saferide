# Plano de execução

## Organização das entregas

Sequência proposta, sem datas fechadas: prazo, disponibilidade e integrantes ainda precisam ser informados. A entrega atual é um protótipo local para apresentação, incluindo coleta automática de notícias e fallback. O piloto público e sua operação são evolução posterior. As etapas podem virar milestones; cada linha do backlog pode virar uma issue.

| Etapa | Entrega verificável | Condição para avançar |
| --- | --- | --- |
| 1 Alinhamento | Cidade piloto, configuração da stack React e Spring Boot, responsáveis, fontes candidatas e escopo revisado | Grupo registra as decisões |
| 2 Protótipo | Telas navegáveis com dados fictícios | Jornada de consulta compreensível e revisada |
| 3 Consulta funcional | Mapa, endereços, rota e contexto com base demonstrativa | Percurso completo e estados de erro funcionando |
| 4 Comunidade | Autenticação, perfis, relatos, feed, comentários e moderação persistidos | Controle de acesso e publicação verificados |
| 5 Piloto e avaliação | Fonte real validada, teste com motoristas e ajustes | Evidências de uso e limitações documentadas |

## Backlog inicial

P0 é necessário para a demonstração completa. P1 é necessário para o piloto com dados reais. IDs são identificadores de planejamento, não números de issues já criadas.

| ID | Prioridade | Tarefa | Dependência | Critério de aceite |
| --- | --- | --- | --- | --- |
| SR-01 | P0 | Fechar decisões iniciais | — | Cidade, versões e ferramentas para React e Spring Boot, integrantes e prazo registrados |
| SR-02 | P0 | Desenhar telas e estados | SR-01 | Jornada de consulta, envio e revisão navegável |
| SR-03 | P0 | Preparar frontend React e backend Spring Boot | SR-01 | Outro integrante inicia frontend e backend seguindo README; uma chamada React → API Spring Boot funciona, sem segredos no Git |
| SR-04 | P0 | Preparar base demonstrativa | SR-01 | Exemplos recentes, antigos, sem dados e contraditórios, todos fictícios |
| SR-05 | P0 | Implementar mapa e busca | SR-02, SR-03 | Seleção confirmada dos dois pontos; erro de endereço tratado |
| SR-06 | P0 | Implementar consulta de rota | SR-05 | Geometria correta e falha do provedor tratada |
| SR-07 | P0 | Implementar contexto e painel | SR-04, SR-06 | Registros próximos com fonte, data, filtros e ausência explícita |
| SR-08 | P0 | Implementar autenticação e permissões | SR-03 | Usuário comum não consegue moderar nem alterar dados de terceiros |
| SR-09 | P0 | Implementar envio e meus relatos | SR-08 | Relato válido persiste pendente e autor acompanha status |
| SR-10 | P0 | Implementar moderação e denúncia | SR-09 | Moderador publica, rejeita e retira; motivo e ação registrados |
| SR-11 | P0 | Verificar jornada completa | SR-07, SR-10 | Envio, aprovação e exibição funcionam; erros e permissões testados |
| SR-12 | P1 | Validar e importar fonte pública | SR-01 | Cobertura, atribuição, datas e deduplicação conferidas |
| SR-13 | P1 | Preparar operação do piloto | SR-10, SR-12 | Moderação, validade, exclusão, restauração e limites de consumo definidos |
| SR-14 | P1 | Testar com motoristas e consolidar aprendizado | SR-11, SR-13 | Resultados por tarefa, problemas e decisões de melhoria registrados |

## Entregas adicionais de notícias

Estas tarefas complementam o backlog conforme o [plano do módulo](05-integracao-noticias.md). Coleta automática e fallback são requisitos da demonstração local; os IDs ainda não representam issues criadas.

| ID | Etapa | Tarefa | Dependência | Critério de aceite |
| --- | --- | --- | --- | --- |
| SR-15 | MVP local | Modelar notícias, ocorrências, evidências e execuções | SR-03 | Banco local separa publicações e acontecimentos, registra coleta e preserva datas |
| SR-16 | MVP local | Criar revisão de ocorrências | SR-08, SR-15 | Apenas moderador publica ocorrência no mapa; local, evidência e histórico obrigatórios |
| SR-17 | MVP local | Integrar ocorrências ao mapa e painel | SR-07, SR-16, SR-20 | Ocorrências da coleta revisadas aparecem com precisão, fonte e datas, sem duplicações |
| SR-18 | MVP local | Verificar jornada completa de notícias | SR-17, SR-21, SR-22 | Coleta, alternativa, cache, demo, recuperação e permissões testados ponta a ponta |
| SR-19 | MVP local | Selecionar cidade e fontes principal/alternativas | SR-01 | Acesso permitido, formato, cobertura, limites e atribuição verificados antes de coletar |
| SR-20 | MVP local | Implementar coleta automática e lista regional | SR-15, SR-19 | Coleta sem cadastro manual, filtra, deduplica, persiste e mostra notícias; localização incerta fica fora do mapa |
| SR-21 | MVP local | Implementar fallback e estados de atualização | SR-20 | Limites por ciclo, alternativa, dados salvos e resultados parciais; erros não apagam dados nem renovam datas |
| SR-22 | MVP local | Preparar demonstração e simulação de falha | SR-21, SR-08 | Exemplos separados, botão restrito e reversível, roteiro offline com mapa e percursos locais |

A demonstração integrada inclui SR-18 além de SR-11. SR-19 antecede a implementação dos coletores. Distribuir os trabalhos entre as frentes abaixo e revisar o prazo do grupo; tarefas de operação de piloto público não bloqueiam a apresentação local.

## Divisão sugerida por frente

### Entregas de perfil da comunidade

Conforme o [plano de perfis](06-comunidade-perfis.md), adicionar ao MVP local:

| ID | Tarefa | Dependência | Critério de aceite |
| --- | --- | --- | --- |
| SR-23 | Modelar catálogo e plataformas do perfil | SR-08 | Usuário pode ter várias plataformas, atividade e veículo separados; API pública não expõe campos privados |
| SR-24 | Criar edição de perfil em React | SR-23 | Selecionar Uber e iFood, salvar, recarregar, editar e remover; tratar erros e seleção vazia |
| SR-25 | Apresentar perfil nas contribuições e verificar permissões | SR-24, SR-09 | Nome e plataformas atualizados nos relatos; outro usuário não consegue editar o perfil; informação identificada como autodeclarada |

Incluir no roteiro de apresentação a edição de um perfil fictício com duas plataformas e sua identificação em relatos, publicações e comentários.

### Entregas de feed e comentários

O MVP local inclui conversas gerais da profissão, dicas, dúvidas e experiências territoriais, conforme o [plano da comunidade](06-comunidade-perfis.md).

| ID | Tarefa | Dependência | Critério de aceite |
| --- | --- | --- | --- |
| SR-26 | Modelar publicações, comentários e APIs | SR-08, SR-23 | Persistência, localização opcional, paginação, autoria da sessão e permissões verificadas |
| SR-27 | Criar feed e conversa em React | SR-24, SR-26 | Publicar dúvida sem local, filtrar, comentar, editar, excluir e recarregar; preservar rascunho em erro |
| SR-28 | Ampliar denúncias e moderação | SR-10, SR-26 | Ocultar post bloqueia consulta direta e comentários; restaurar respeita exclusões individuais e registra motivo |
| SR-29 | Verificar jornada da comunidade | SR-25, SR-27, SR-28 | Duas contas fictícias conversam; testar autorização, paginação, reenvio, moderação e ausência de marcador automático |

SR-29 integra os critérios da demonstração, junto de SR-11 e SR-18. Revisar divisão e prazo considerando esse acréscimo de escopo.

### Responsabilidades por frente

| Frente | Responsabilidade | Entrega compartilhável |
| --- | --- | --- |
| Produto e pesquisa | Escopo, entrevistas e validação | Decisões e resultados dos testes |
| Experiência e interface | Protótipo, telas e acessibilidade | Fluxo navegável e interface |
| Mapas e dados | Endereços, rotas, consultas espaciais e fontes | Consulta com cobertura e datas verificáveis |
| API e comunidade | Autenticação, persistência e moderação | Ciclo completo dos relatos |
| Integração e qualidade | Integração, testes e demonstração | Versão demonstrável e roteiro de uso |

Pessoas podem acumular frentes. Kaio Fernandes, Caio Meira e Lethicia aparecem no roteiro como apresentadores; isso não define automaticamente suas funções no desenvolvimento. Cada tarefa deve ter um responsável e um revisor.

## Rotina do grupo

Usar um quadro com A fazer, Em andamento, Em revisão e Concluído. Limitar a uma tarefa principal por pessoa. Fazer uma revisão curta semanal com demonstração do que funciona, bloqueios e próximo objetivo. Registrar alterações de escopo em decisões e atualizar o backlog.

Uma tarefa está concluída quando atende ao critério de aceite, passou por revisão, foi verificada no fluxo afetado e teve sua documentação atualizada. Uma tela isolada sem dados ou tratamento de erro não encerra uma funcionalidade integrada.

## Roteiro de demonstração

1. Mostrar uma consulta de origem e destino dentro da área piloto.
2. Abrir o percurso e um registro de pavimento com fonte e data.
3. Mostrar uma área sem registros e explicar o significado desse estado.
4. Enviar um relato com usuário de teste e verificar que permanece pendente.
5. Aprovar com o moderador e conferir sua exibição na consulta.
6. Explicar quais dados são fictícios ou reais, limitações e próximos testes.
7. Atualizar notícias automaticamente e mostrar fontes, datas e lista regional.
8. Simular falha na coleta e demonstrar fontes alternativas ou notícias salvas com aviso.
9. Demonstrar ausência de cache com exemplos separados, desativar a simulação e verificar a recuperação sem duplicações.
10. Publicar uma dúvida profissional sem localização, comentar com outra conta e mostrar nome e plataformas dos autores.
11. Editar o próprio texto, denunciar e ocultar como moderador; demonstrar que a conversa não cria ocorrência no mapa.

## Principais dependências

| Dependência | Como reduzir o impacto |
| --- | --- |
| Ausência de fonte pública útil | Validar cedo; usar demonstração marcada sem prometer cobertura real |
| Custo ou limite dos mapas e rotas | Comparar fornecedores e fixar teto antes de contratar |
| Poucos relatos | Limitar área piloto; nunca gerar relatos fictícios como se fossem reais |
| Falta de moderação | Definir responsável antes de abrir contribuições |
| Prazo curto | Preservar a jornada completa e reduzir categorias e área coberta |
