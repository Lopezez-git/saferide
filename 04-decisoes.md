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
| Modelo do produto | Proposta integrada com caixinha flutuante | Contrato com parceiro real e obtenção dos dados ainda não definidos |
| Protótipo | React Native + Spring Boot | Android como alvo inicial proposto; suporte a iOS a definir |
| Cobertura | Uma cidade ou área piloto | Região escolhida pelo grupo |
| Repositório | saferide, público por enquanto por solicitação do proprietário | Visibilidade futura e licença a definir |
| Consulta | Sem autenticação | Regras de acesso ao piloto |
| Relatos | Login e revisão antes de publicar | Operação e capacidade de moderação |
| Fontes públicas | Importação revisada | Fonte e periodicidade após validação |
| Atualidade | Validade inicial de 30 dias para relatos | Ajustes por categoria e testes |

## Decisão adotada: proposta integrada com caixinha flutuante

O proprietário definiu a proposta integrada à experiência de Uber/99/iFood e escolheu a caixinha flutuante sobre o app, em vez de cartão incorporado à interface da plataforma. O [plano de alertas](07-caixinha-alertas.md) substitui a discussão anterior em aberto.

A apresentação acadêmica simula uma integração autorizada e ofertas fictícias. Não existe parceria ou acesso real autorizado às empresas. A sobreposição é um recurso do Android e não fornece, sozinha, os dados da oferta. React Native e Spring Boot permanecem; um módulo Kotlin e um app de ofertas de teste são propostos para demonstrar o overlay real. Comunidade e detalhes ficam no SafeRide.

Notícias e relatos revisados podem informar situações do trajeto e assaltos registrados, com fonte, data e precisão; não há detecção de crimes em tempo real nem classificação de segurança de bairros.

## Pendências que afetam o desenvolvimento

Definir versões, ferramenta de build e emulador/dispositivo de apresentação. Android é o alvo da prova de conceito de sobreposição; iOS fica fora dessa demonstração. Publicação em lojas não faz parte da entrega local.

1. Qual é o prazo da entrega e existem exigências adicionais de versões, ferramentas ou banco, além de React Native e Spring Boot?
2. Quem compõe o grupo, quais são os usuários do GitHub e quantas horas cada pessoa pode dedicar?
3. Qual cidade ou área deve ser usada no piloto?
4. Qual é a experiência de cada integrante com React Native e Spring Boot, para dividir as tarefas?
5. Há orçamento para serviços? Qual o teto mensal autorizado?
6. Qual fonte pública concreta atende à área piloto e pode ser reutilizada?
7. Quem revisará os relatos e com qual frequência?
8. Onde estão o questionário e os resultados anonimizados da pesquisa?
9. Qual licença será adotada? O repositório está público por enquanto.
10. Quais janelas temporais e prioridades serão usadas para alertas, quem revisará ocorrências de segurança e qual versão Android será usada para o overlay?

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
| 2026-11-02 | Adotar proposta integrada com caixinha flutuante, ofertas simuladas e alertas revisados de notícias, assaltos e condições do trajeto; substitui a decisão em aberto | Definição do proprietário |
| 2026-11-02 | Tornar repositório público por enquanto | Solicitação do proprietário, já aplicada no GitHub |

## Início da implementação

Após autorização do proprietário, a base local usa Expo SDK 58/TypeScript/Expo Router, Spring Boot 3.5.7/Java 21, MySQL 8 e Flyway. Perfil demo explícito usa H2 e dados fictícios de leitura. O proprietário solicitou banco separado para SafeRide. Mapa é a tela inicial; desenho atual é ilustrativo. Código inicial não inclui a caixinha nem integração real.

## Evolução para protótipo funcional

São Paulo escolhida pelo proprietário como região piloto. Perfil mysql,prototype ativa contas, comunidade, relatos revisados, coleta RSS e consulta de rota. Mapa temporariamente com Leaflet (iframe na prévia/WebView no Android), sem geocodificação geral. Janelas provisórias de relatos: 6 horas para alagamentos e 24 horas para demais categorias; precisam de validação antes de uso real. A caixinha continua como simulação interna, sem alegar sobreposição Android pronta. Escopo e limites em 08-execucao-local.md.
