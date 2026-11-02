# SafeRide

Mais informação para decidir melhor.

Projeto independente do grupo, destinado à conta pessoal `lopezez-git`. Não possui vínculo com a Advanced e não deve utilizar suas credenciais, infraestrutura ou dados.

## O que vamos construir

Uma aplicação para motoristas consultarem contexto sobre o embarque, o destino e o percurso antes de avaliar uma corrida. A primeira versão reúne mapa, relatos da comunidade, consulta de trajetos e painel contextual.

O SafeRide complementa a avaliação de valor, distância e tempo. Não garante segurança, não determina quais corridas aceitar e não classifica bairros como seguros ou perigosos.

## Situação atual

Planejamento inicial em 2 de novembro de 2026. Este repositório contém documentação e organização do trabalho; ainda não existe aplicação executável. As decisões técnicas e operacionais propostas precisam ser revisadas pelo grupo.

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
apps/web/             Aplicação responsiva, quando implementada
services/api/         API, se a stack escolhida exigir serviço separado
data/demo/            Exemplos fictícios identificados
```

As pastas de código serão criadas com a escolha da stack. Nenhuma implantação ou serviço pago faz parte desta preparação.
