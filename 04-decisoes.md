# Decisões do grupo

## Base confirmada

- Feed com publicações e comentários, incluindo conversas gerais da profissão, dicas e dúvidas, além de experiências sobre locais e trajetos; localização opcional.

- Perfil com plataformas de trabalho autodeclaradas e editáveis, permitindo múltipla seleção e opções de outra plataforma e trabalho independente; atividade e veículo ficam separados.

- Entrega focada em protótipo local para apresentação, sem exigir implantação pública.
- Busca automática de notícias na primeira versão, sem cadastro manual obrigatório.
- Fallback com fontes alternativas, notícias salvas e modo demonstrativo explicitamente identificado.

- Stack obrigatória: React Native no frontend e Java com Spring Boot no backend.

- Nome do produto: SafeRide.
- Objetivo: oferecer contexto de região e percurso para apoiar a avaliação da corrida.
- Quatro funções: mapa, relatos, trajetos e painel contextual.
- Pesquisa exploratória: 14 respostas, conforme roteiro fornecido.
- Projeto independente da Advanced, na conta pessoal `lopezez-git`.

## Propostas adotadas neste planejamento

| Tema | Ponto de partida | O que pode mudar |
| --- | --- | --- |
| Plataforma | Aplicativo mobile independente | Android como alvo inicial proposto; suporte a iOS a definir |
| Cobertura | Uma cidade ou área piloto | Região escolhida pelo grupo |
| Repositório | Nome saferide, privado inicialmente | Preferência do proprietário e necessidades de entrega |
| Consulta | Sem autenticação | Regras de acesso ao piloto |
| Relatos | Login e revisão antes de publicar | Operação e capacidade de moderação |
| Fontes públicas | Importação revisada | Fonte e periodicidade após validação |
| Atualidade | Validade inicial de 30 dias para relatos | Ajustes por categoria e testes |

## Pendências que afetam o desenvolvimento

Definir versões, uso ou não de Expo, emulador/dispositivo de apresentação e suporte a iOS. Android é o alvo inicial proposto. Publicação em lojas não faz parte da entrega local.

1. Qual é o prazo da entrega e existem exigências adicionais de versões, ferramentas ou banco, além de React Native e Spring Boot?
2. Quem compõe o grupo, quais são os usuários do GitHub e quantas horas cada pessoa pode dedicar?
3. Qual cidade ou área deve ser usada no piloto?
4. Qual é a experiência de cada integrante com React Native e Spring Boot, para dividir as tarefas?
5. Há orçamento para serviços? Qual o teto mensal autorizado?
6. Qual fonte pública concreta atende à área piloto e pode ser reutilizada?
7. Quem revisará os relatos e com qual frequência?
8. Onde estão o questionário e os resultados anonimizados da pesquisa?
9. O repositório será mantido privado ou poderá ser publicado depois? Qual licença será adotada se for aberto?

## Registro de mudanças

Os detalhes de perfil estão em [Comunidade e perfis](06-comunidade-perfis.md). Feed, publicações e comentários estão incluídos, com conversas gerais, dicas e dúvidas. Ordem cronológica, filtros, limites e moderação posterior do feed são o funcionamento proposto; detalhes técnicos ainda podem ser ajustados pelo grupo.

Para cada decisão relevante, adicionar data, contexto, decisão, responsável e consequência. Não transformar sugestão em requisito sem registrar a decisão do grupo.

| Data | Decisão | Origem |
| --- | --- | --- |
| 2026-11-02 | Incluir feed com publicações e comentários, conversas gerais da profissão, dicas e dúvidas; localização opcional | Solicitação do proprietário |
| 2026-11-02 | Manter SafeRide separado de projetos e recursos da Advanced | Solicitação do proprietário |
| 2026-11-02 | Usar a conta pessoal lopezez-git como destino do repositório | Confirmação do proprietário |
| 2026-11-02 | Usar inicialmente React no frontend e Spring Boot no backend | Decisão histórica; frontend substituído pela decisão mobile abaixo |
| 2026-11-02 | Construir aplicativo mobile independente em React Native com backend Spring Boot; substituir a proposta de site responsivo | Correção e autorização do proprietário |
| 2026-11-02 | Planejar busca automática RSS/API e fallback já na primeira versão local; cadastro manual torna-se apenas auxiliar | Requisito atualizado do proprietário; substitui o planejamento inicial de coleta manual em 05-integracao-noticias.md |
