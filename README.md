# SafeRide

Mais informação para decidir melhor.

Projeto independente do grupo, destinado à conta pessoal `lopezez-git`. Não possui vínculo com a Advanced e não deve utilizar suas credenciais, infraestrutura ou dados.

## O que vamos construir

Uma aplicação com uma comunidade de profissionais que utilizam veículos para trabalhar com transporte e entregas. O SafeRide permite consultar e compartilhar informações sobre regiões, pontos de embarque ou retirada, destinos e percursos antes de avaliar uma corrida ou entrega. A primeira versão reúne mapa, relatos da comunidade, consulta de trajetos e painel contextual.

O SafeRide complementa a avaliação de valor, distância e tempo. Não garante segurança, não determina quais corridas ou entregas aceitar e não classifica bairros como seguros ou perigosos.

## Para quem é o SafeRide

O público inclui motoristas de aplicativos como Uber e 99, entregadores de serviços como iFood, motofretistas e outros profissionais de transporte e entregas. A proposta pode atender diferentes veículos, incluindo carros, motos e bicicletas, considerando as necessidades de cada atividade.

Uber, 99 e iFood são exemplos de serviços utilizados por esse público. A participação na comunidade não depende de integração com essas plataformas e não implica parceria com elas.

## Comunidade dentro do site

A comunidade é uma parte central do SafeRide: os próprios profissionais contribuem com experiências e consultam informações compartilhadas por outros membros. Esse conhecimento complementa os dados geoespaciais e as informações públicas disponíveis.

No MVP, a participação acontece por relatos associados a locais e percursos, com autenticação para envio, fonte, data e moderação. Os relatos podem abordar condições do pavimento, obras, acesso a estabelecimentos, pontos de embarque e retirada e dificuldades no caminho.

O perfil informará as plataformas em que o profissional trabalha, com múltipla seleção: por exemplo, Uber, 99 e iFood no mesmo perfil. Haverá opções para outra plataforma e trabalho independente, além de atividade e veículo em campos separados. Essas informações serão autodeclaradas e editáveis, sem conexão com as contas externas. Consulte o [plano de comunidade e perfis](06-comunidade-perfis.md).

As plataformas serão exibidas junto à identificação do autor. O MVP também terá feed com publicações e comentários: experiências sobre locais e trajetos, conversas gerais da profissão, dicas de trabalho e dúvidas. A localização será opcional, permitindo conversar sem vincular o assunto a uma região. O plano prevê ordem cronológica, filtros por categoria e região, edição e exclusão pelo autor e denúncias para moderação. Publicar no feed não cria automaticamente um alerta no mapa.

O levantamento inicial de 14 respostas foi realizado com motoristas. A ampliação para entregadores e outras atividades deverá incluir validação das necessidades desses públicos. Os documentos detalhados vinculados abaixo ainda partem desse recorte inicial e deverão acompanhar a ampliação do produto.

## Notícias e informações locais

O SafeRide buscará automaticamente notícias e comunicados sobre obras, interdições e alagamentos em fontes RSS/API selecionadas para a região. A busca faz parte da primeira versão e não exige cadastro manual de links. Notícias elegíveis aparecem na lista regional; a associação a ocorrências no mapa exige localização suficiente e revisão.

Cada ocorrência poderá reunir várias notícias como evidências, evitando marcadores duplicados. No mapa e no painel, o usuário verá resumo, localização com sua precisão, fonte, data do acontecimento e última verificação. Informação desatualizada será sinalizada; o vencimento de um prazo não confirma que o problema terminou.

O Spring Boot cuidará da coleta, organização, revisão, permissões e consultas; o React apresentará notícias, estado da atualização, mapa e painel. As fontes e a cidade ainda precisam ser escolhidas e validadas. Consulte o [plano de integração de notícias](05-integracao-noticias.md) para fluxo, modelo de dados, API e critérios de aceite.

## Execução local e fallback

O foco é um protótipo funcional para apresentação, com React, Spring Boot e banco local. Não é necessário contratar hospedagem para essa entrega. Buscar notícias novas exige internet; os custos e limites de fontes e mapas precisam ser verificados antes da escolha.

Em caso de falha, o sistema tenta fontes alternativas com limite de tempo e tentativas. Se todas falharem, mostra as últimas notícias salvas localmente, indicando a data e a indisponibilidade da atualização. Sem dados salvos, oferece ativação explícita de um modo de demonstração com exemplos identificados e separados dos dados reais.

O perfil de demonstração terá um botão administrativo para simular falha na coleta e mostrar a recuperação. Uma notícia sem localização precisa pode permanecer na lista regional, sem marcador inventado. Para apresentar sem internet, preparar também mapa e percursos demonstrativos locais; o fallback das notícias não substitui os serviços externos de mapas e rotas.

## Situação atual

Planejamento inicial em 2 de novembro de 2026. Este repositório contém documentação e organização do trabalho; ainda não existe aplicação executável. React no frontend e Spring Boot no backend são requisitos confirmados. As demais decisões técnicas e operacionais propostas precisam ser revisadas pelo grupo.

## Por onde começar

1. [Plano do produto e funcionamento](01-produto.md): problema, pesquisa, jornada, telas e escopo.
2. [Arquitetura e dados](02-arquitetura.md): componentes, entidades, regras e integrações.
3. [Plano de execução](03-execucao.md): entregas, tarefas e critérios de aceite.
4. [Decisões do grupo](04-decisoes.md): perguntas que faltam resolver.
5. [Como colaborar](CONTRIBUTING.md): rotina de branches, revisão e entregas.
6. [Integração de notícias](05-integracao-noticias.md): busca automática, fontes alternativas, dados locais, demonstração e ocorrências no mapa.
7. [Comunidade e perfis](06-comunidade-perfis.md): perfis, feed, conversas gerais, dicas, dúvidas, comentários e moderação.

## Primeiro objetivo

Demonstrar uma jornada completa em uma área piloto: selecionar origem e destino, visualizar um trajeto, consultar informações com fonte e data e enviar um relato que passe por revisão antes de aparecer no mapa.

Dados fictícios devem ser identificados como demonstração. A aplicação só será apresentada como piloto com dados reais depois da validação das fontes e do fluxo de moderação.

## Organização prevista

```text
01-*.md a 06-*.md    Planejamento, notícias e comunidade
.github/              Modelos de tarefas e revisão
apps/web/             Frontend React, quando implementado
services/api/         Backend Java com Spring Boot
data/demo/            Exemplos fictícios identificados
```

As pastas de código serão criadas na implementação da base React e Spring Boot. Nenhuma implantação ou serviço pago faz parte desta preparação.
