# Decisões do grupo

## Base confirmada

- Feed com publicações e comentários, incluindo conversas gerais da profissão, dicas e dúvidas, além de experiências sobre locais e trajetos; localização opcional.

- Perfil com plataformas de trabalho autodeclaradas e editáveis, permitindo múltipla seleção e opções de outra plataforma e trabalho independente; atividade e veículo ficam separados.

- Entrega focada em protótipo local para apresentação, sem exigir implantação pública.
- Busca automática de notícias na primeira versão, sem cadastro manual obrigatório.
- Fallback com fontes alternativas, notícias salvas e modo demonstrativo explicitamente identificado.

- Stack do protótipo acadêmico: React Native na interface e Java com Spring Boot no backend.

- Nome do produto: SafeRide.
- Objetivo: oferecer contexto de região e percurso para apoiar a avaliação da corrida.
- Quatro funções: mapa, relatos, trajetos e painel contextual.
- Pesquisa exploratória: 14 respostas, conforme roteiro fornecido.
- Projeto independente da Advanced, na conta pessoal `lopezez-git`.

## Propostas adotadas neste planejamento

| Tema | Ponto de partida | O que pode mudar |
| --- | --- | --- |
| Modelo do produto | Em aberto: independente, integrado ou híbrido | Decisão conjunta do grupo antes de fechar o fluxo principal |
| Protótipo | React Native + Spring Boot | Android como alvo inicial proposto; suporte a iOS a definir |
| Cobertura | Uma cidade ou área piloto | Região escolhida pelo grupo |
| Repositório | Nome saferide, privado inicialmente | Preferência do proprietário e necessidades de entrega |
| Consulta | Sem autenticação | Regras de acesso ao piloto |
| Relatos | Login e revisão antes de publicar | Operação e capacidade de moderação |
| Fontes públicas | Importação revisada | Fonte e periodicidade após validação |
| Atualidade | Validade inicial de 30 dias para relatos | Ajustes por categoria e testes |

## Decisão pendente: independente ou integrado?

Status: **em aberto, para discussão com o grupo**. Não assumir integração real nem aplicativo independente como escolha definitiva.

| Alternativa | Benefício esperado | Ponto a resolver |
| --- | --- | --- |
| App independente | Autonomia e comunidade entre plataformas | Como consultar sem atrapalhar a decisão diante de uma oferta em outro app |
| Serviço integrado | Contexto junto da oferta de corrida ou entrega | Acesso autorizado aos dados e interface controlada pela plataforma; demonstração acadêmica pode ser simulada |
| Híbrido | Comunidade própria e possibilidade de integração | Escopo e esforço compatíveis com prazo e equipe |

O grupo deve escolher qual experiência pretende demonstrar, onde a comunidade fica, como origem e destino chegam ao serviço e quais partes serão simuladas. Registrar a escolha, participantes e justificativa antes de fechar telas, contratos específicos e tarefas de integração. O protótipo continua em React Native e Spring Boot em qualquer alternativa; uma plataforma real poderia consumir a API com sua própria tecnologia de interface.

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
| 2026-11-02 | Adotar protótipo mobile em React Native com backend Spring Boot, substituindo a proposta de site responsivo | Formato independente inicialmente proposto; reaberto na decisão abaixo |
| 2026-11-02 | Deixar o modelo independente, integrado ou híbrido em aberto para decisão do grupo | Solicitação do proprietário; mantém a stack do protótipo, sem aprovar integração ou simulador |
| 2026-11-02 | Planejar busca automática RSS/API e fallback já na primeira versão local; cadastro manual torna-se apenas auxiliar | Requisito atualizado do proprietário; substitui o planejamento inicial de coleta manual em 05-integracao-noticias.md |
