# SafeRide

Mais informação para decidir melhor.

Projeto independente do grupo, destinado à conta pessoal `lopezez-git`. Não possui vínculo com a Advanced e não deve utilizar suas credenciais, infraestrutura ou dados.

## O que vamos construir

Uma solução de contexto territorial, com protótipo mobile e uma comunidade de profissionais que utilizam veículos para trabalhar com transporte e entregas. O SafeRide permite consultar e compartilhar informações sobre regiões, pontos de embarque ou retirada, destinos e percursos antes de avaliar uma corrida ou entrega. A primeira versão reúne mapa, relatos da comunidade, consulta de trajetos e painel contextual.

O SafeRide complementa a avaliação de valor, distância e tempo. Não garante segurança, não determina quais corridas ou entregas aceitar e não classifica bairros como seguros ou perigosos.

O protótipo consulta um histórico de veículos subtraídos da SSP-SP no entorno do ponto selecionado. O card usa automaticamente a **hora atual de São Paulo** para mostrar BOs registrados nessa mesma hora em meses anteriores, sem exigir escolha de horário. Registros sem hora confiável aparecem à parte. São dados históricos, sem taxa de risco ou aviso policial em tempo real. Veja [fonte, método e limitações](11-integracao-ssp.md).

O card **Pavimento** também consulta solicitações públicas de tapa-buraco do SP156 no raio de 1 km. Mostra quantos pedidos constavam abertos ou finalizados na data da publicação, com rua, data e fonte. Pedido não comprova um buraco ativo; ausência de pedidos não comprova via em boas condições. Veja [fonte, importação e limitações do SP156](12-integracao-sp156.md).

O painel do mapa reúne quatro assuntos: **Segurança, Pavimento, Trânsito e acesso, Comunidade**. Após traçar uma viagem, o card **Trânsito e acesso** consulta uma estimativa de atraso entre origem e destino pela TomTom e resume o resultado como trânsito tranquilo, moderado ou congestionado, com duração, atraso e horário da consulta. Isso exige uma chave pessoal configurada no backend; sem ela ou com falha, o card informa indisponibilidade, sem inventar um estado de trânsito. Veja [fonte, critérios e configuração](14-transito-da-viagem.md). Nos detalhes, continuam separados os pedidos históricos do SP156 sobre circulação, alagamentos, árvores e reparos estruturais, os relatos revisados e as notícias locais. Essas fontes não confirmam bloqueio ativo; veja [fonte e limites do SP156](13-integracao-sp156-acesso.md).

A linha do trajeto usa OSRM e sua duração não inclui trânsito ao vivo. Para vias com o mesmo nome em bairros diferentes, o usuário precisa escolher o trecho correto. O mapa distingue o ponto cadastrado do destino do fim da via acessível a carros. Veja a [auditoria da rota Avenida Curió, Campanário → Morumbi Shopping](15-auditoria-rota-curio-morumbi.md).

## Modelo do produto e caixinha flutuante

A proposta escolhida é fornecer contexto junto de ofertas de plataformas como Uber, 99 e iFood por uma caixinha flutuante do SafeRide sobre o aplicativo utilizado. O cartão pode ser movido, minimizado ou fechado, sem bloquear aceitar/recusar. Comunidade e detalhes ficam no app SafeRide.

Para a faculdade, demonstrar integração autorizada simulada com ofertas fictícias, React Native, módulo Android em Kotlin para sobreposição e Spring Boot. Sobrepor uma janela não significa parceria oficial nem acesso automático aos dados da corrida. Não há conexão real implementada com as plataformas. O [plano de caixinha e alertas](07-caixinha-alertas.md) define fluxo, estados, dados e critérios de aceite.

Os alertas incluem obras, pavimento, alagamentos, obstáculos, acesso e ocorrências de assalto registradas em notícias ou relatos revisados. Exibir fonte, data e precisão. Notícia de assalto passado não significa crime em andamento, e ausência de registros não significa segurança.

## Para quem é o SafeRide

O público inclui motoristas de aplicativos como Uber e 99, entregadores de serviços como iFood, motofretistas e outros profissionais de transporte e entregas. A proposta pode atender diferentes veículos, incluindo carros, motos e bicicletas, considerando as necessidades de cada atividade.

Uber, 99 e iFood são exemplos de serviços utilizados por esse público. A participação na comunidade não depende de integração com essas plataformas e não implica parceria com elas.

## Comunidade dentro do aplicativo

A comunidade é uma parte central do SafeRide: os próprios profissionais contribuem com experiências e consultam informações compartilhadas por outros membros. Esse conhecimento complementa os dados geoespaciais e as informações públicas disponíveis.

No MVP, a participação acontece por relatos associados a locais e percursos, com autenticação para envio, fonte, data e moderação. Os relatos podem abordar condições do pavimento, obras, acesso a estabelecimentos, pontos de embarque e retirada e dificuldades no caminho.

O perfil informará as plataformas em que o profissional trabalha, com múltipla seleção: por exemplo, Uber, 99 e iFood no mesmo perfil. Haverá opções para outra plataforma e trabalho independente, além de atividade e veículo em campos separados. Essas informações serão autodeclaradas e editáveis, sem conexão com as contas externas. Consulte o [plano de comunidade e perfis](06-comunidade-perfis.md).

As plataformas serão exibidas junto à identificação do autor. O MVP também terá feed com publicações e comentários: experiências sobre locais e trajetos, conversas gerais da profissão, dicas de trabalho e dúvidas. A localização será opcional, permitindo conversar sem vincular o assunto a uma região. O plano prevê ordem cronológica, filtros por categoria e região, edição e exclusão pelo autor e denúncias para moderação. Publicar no feed não cria automaticamente um alerta no mapa.

O levantamento inicial de 14 respostas foi realizado com motoristas. A ampliação para entregadores e outras atividades deverá incluir validação das necessidades desses públicos. Os documentos detalhados vinculados abaixo ainda partem desse recorte inicial e deverão acompanhar a ampliação do produto.

## Notícias e informações locais

Nos cards de assunto do mapa, o protótipo consulta sob demanda o RSS do Google Notícias para o lugar selecionado e, quando disponíveis, a rua e o bairro. O backend faz buscas separadas por cada referência, aceita apenas veículos definidos no código e filtra títulos sobre segurança, trânsito, alagamentos, obras e pavimento publicados nos últimos 30 dias. Cada matéria traz fonte, data, link e a referência geográfica encontrada no título. O resultado fica em cache por 15 minutos; zero significa apenas que essa busca não encontrou matéria recente elegível. A aba geral de notícias tem uma coleta distinta e ainda não acompanha a seleção do mapa.

Cada ocorrência poderá reunir várias notícias como evidências, evitando marcadores duplicados. No mapa e no painel, o usuário verá resumo, localização com sua precisão, fonte, data do acontecimento e última verificação. Informação desatualizada será sinalizada; o vencimento de um prazo não confirma que o problema terminou.

O Spring Boot executa a consulta local; o React Native exibe as matérias dentro dos cards de assunto. A busca por título não confirma que a ocorrência seja no ponto exato ou esteja ativa. Veja a [integração de notícias](05-integracao-noticias.md) para o que já funciona e o que ainda está planejado.

## Execução local e fallback

O foco é um protótipo funcional para apresentação, com React Native, Spring Boot e banco local. O app roda em celular Android ou emulador, com backend e banco no computador da apresentação. Android é o alvo da prova de conceito de sobreposição; a ferramenta de build ainda será definida. Não se presume o mesmo mecanismo no iOS. Publicação em lojas fica para uma etapa posterior. Não é necessário contratar hospedagem para essa entrega. Buscar notícias novas exige internet; os custos e limites de fontes e mapas precisam ser verificados antes da escolha.

Em caso de falha, o sistema tenta fontes alternativas com limite de tempo e tentativas. Se todas falharem, mostra as últimas notícias salvas localmente, indicando a data e a indisponibilidade da atualização. Sem dados salvos, oferece ativação explícita de um modo de demonstração com exemplos identificados e separados dos dados reais.

O perfil de demonstração terá um botão administrativo para simular falha na coleta e mostrar a recuperação. Uma notícia sem localização precisa pode permanecer na lista regional, sem marcador inventado. Para apresentar sem internet, preparar também mapa e percursos demonstrativos locais; o fallback das notícias não substitui os serviços externos de mapas e rotas.

## Situação atual

Planejamento inicial em 2 de novembro de 2026. O repositório já tem um protótipo funcional local React Native e Spring Boot, com MySQL, contas, perfil, publicações, comentários, mapa, consulta de rotas, relatos e coleta RSS. Consulte [execução local e limites da primeira entrega](08-execucao-local.md). A integração real com plataformas e a sobreposição nativa ainda não estão implementadas; a caixinha tem uma simulação interna identificada. React Native na interface do protótipo e Spring Boot no backend são requisitos confirmados. As demais decisões técnicas e operacionais propostas precisam ser revisadas pelo grupo.

## Por onde começar

1. [Plano do produto e funcionamento](01-produto.md): problema, pesquisa, jornada, telas e escopo.
2. [Arquitetura e dados](02-arquitetura.md): componentes, entidades, regras e integrações.
3. [Plano de execução](03-execucao.md): entregas, tarefas e critérios de aceite.
4. [Decisões do grupo](04-decisoes.md): perguntas que faltam resolver.
5. [Como colaborar](CONTRIBUTING.md): rotina de branches, revisão e entregas.
6. [Integração de notícias](05-integracao-noticias.md): busca automática, fontes alternativas, dados locais, demonstração e ocorrências no mapa.
7. [Comunidade e perfis](06-comunidade-perfis.md): perfis, feed, conversas gerais, dicas, dúvidas, comentários e moderação.
8. [Caixinha flutuante e alertas](07-caixinha-alertas.md): ofertas simuladas, sobreposição Android, notícias, assaltos e situações do trajeto.

## Primeiro objetivo

Demonstrar uma oferta fictícia recebida, consulta de contexto e caixinha flutuante com informações revisadas, fonte e datas; trocar de oferta sem reaproveitar resposta antiga. Complementar com mapa, envio/revisão de relato e participação na comunidade.

Dados fictícios devem ser identificados como demonstração. A aplicação só será apresentada como piloto com dados reais depois da validação das fontes e do fluxo de moderação.

## Organização prevista

```text
01-*.md a 07-*.md    Planejamento, notícias e comunidade
.github/              Modelos de tarefas e revisão
apps/mobile/             Frontend React Native, quando implementado
services/api/         Backend Java com Spring Boot
data/demo/            Exemplos fictícios identificados
```

As pastas apps/mobile e services/api contêm a base inicial. Nenhuma implantação ou serviço pago faz parte desta preparação.

## Começar a desenvolver

Consulte [08-execucao-local.md](08-execucao-local.md) para executar API, app e configurar o MySQL. Mapa é a tela inicial, agora interativo, com seleção de pontos e rota. Comunidade e Perfil têm ações persistentes; veja [fluxos verificados](09-prototipo-funcional.md).


### Histórico policial no mapa

O card Segurança já consulta uma base agregada de boletins da SSP-SP sobre veículos roubados/furtados em São Paulo, por raio de 1 km. Exibe período dos fatos, contagens e fonte, sem classificar automaticamente o local como seguro/perigoso. A fotografia inicial cobre janeiro–setembro de 2026 e não é um alerta em tempo real. Consulte [integração SSP, metodologia e atualização](11-integracao-ssp.md).
