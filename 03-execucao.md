# Plano de execução

## Organização das entregas

Sequência proposta, sem datas fechadas: prazo, disponibilidade e integrantes ainda precisam ser informados. As etapas podem virar milestones; cada linha do backlog pode virar uma issue.

| Etapa | Entrega verificável | Condição para avançar |
| --- | --- | --- |
| 1 Alinhamento | Cidade piloto, stack, responsáveis, fontes candidatas e escopo revisado | Grupo registra as decisões |
| 2 Protótipo | Telas navegáveis com dados fictícios | Jornada de consulta compreensível e revisada |
| 3 Consulta funcional | Mapa, endereços, rota e contexto com base demonstrativa | Percurso completo e estados de erro funcionando |
| 4 Comunidade | Autenticação, relato e moderação persistidos | Controle de acesso e publicação verificados |
| 5 Piloto e avaliação | Fonte real validada, teste com motoristas e ajustes | Evidências de uso e limitações documentadas |

## Backlog inicial

P0 é necessário para a demonstração completa. P1 é necessário para o piloto com dados reais. IDs são identificadores de planejamento, não números de issues já criadas.

| ID | Prioridade | Tarefa | Dependência | Critério de aceite |
| --- | --- | --- | --- | --- |
| SR-01 | P0 | Fechar decisões iniciais | — | Cidade, stack, integrantes e prazo registrados |
| SR-02 | P0 | Desenhar telas e estados | SR-01 | Jornada de consulta, envio e revisão navegável |
| SR-03 | P0 | Preparar projeto e configuração | SR-01 | Outro integrante consegue iniciar o projeto seguindo README, sem segredos no Git |
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

## Divisão sugerida por frente

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

## Principais dependências

| Dependência | Como reduzir o impacto |
| --- | --- |
| Ausência de fonte pública útil | Validar cedo; usar demonstração marcada sem prometer cobertura real |
| Custo ou limite dos mapas e rotas | Comparar fornecedores e fixar teto antes de contratar |
| Poucos relatos | Limitar área piloto; nunca gerar relatos fictícios como se fossem reais |
| Falta de moderação | Definir responsável antes de abrir contribuições |
| Prazo curto | Preservar a jornada completa e reduzir categorias e área coberta |
