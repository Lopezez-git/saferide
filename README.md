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

Como evolução proposta, o perfil e os relatos poderão identificar o tipo de atividade e veículo, permitindo filtrar informações relevantes para cada profissional. Feed, comentários e outras interações entre membros ainda precisam ter seu escopo definido pelo grupo.

O levantamento inicial de 14 respostas foi realizado com motoristas. A ampliação para entregadores e outras atividades deverá incluir validação das necessidades desses públicos. Os documentos detalhados vinculados abaixo ainda partem desse recorte inicial e deverão acompanhar a ampliação do produto.

## Situação atual

Planejamento inicial em 2 de novembro de 2026. Este repositório contém documentação e organização do trabalho; ainda não existe aplicação executável. React no frontend e Spring Boot no backend são requisitos confirmados. As demais decisões técnicas e operacionais propostas precisam ser revisadas pelo grupo.

## Por onde começar

1. [Plano do produto e funcionamento](01-produto.md): problema, pesquisa, jornada, telas e escopo.
2. [Arquitetura e dados](02-arquitetura.md): componentes, entidades, regras e integrações.
3. [Plano de execução](03-execucao.md): entregas, tarefas e critérios de aceite.
4. [Decisões do grupo](04-decisoes.md): perguntas que faltam resolver.
5. [Como colaborar](CONTRIBUTING.md): rotina de branches, revisão e entregas.

## Primeiro objetivo

Demonstrar uma jornada completa em uma área piloto: selecionar origem e destino, visualizar um trajeto, consultar informações com fonte e data e enviar um relato que passe por revisão antes de aparecer no mapa.

Dados fictícios devem ser identificados como demonstração. A aplicação só será apresentada como piloto com dados reais depois da validação das fontes e do fluxo de moderação.

## Organização prevista

```text
01-*.md a 04-*.md    Planejamento e decisões
.github/              Modelos de tarefas e revisão
apps/web/             Frontend React, quando implementado
services/api/         Backend Java com Spring Boot
data/demo/            Exemplos fictícios identificados
```

As pastas de código serão criadas na implementação da base React e Spring Boot. Nenhuma implantação ou serviço pago faz parte desta preparação.
