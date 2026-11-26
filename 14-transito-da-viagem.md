# Resumo de trânsito da viagem

## Finalidade

Ao selecionar um destino no mapa, o card **Trânsito e acesso** estima a duração a partir da posição GPS disponível na região piloto ou da partida marcada pelo motorista. Na simulação, a oferta apresenta separadamente os minutos até o embarque e os minutos do embarque ao destino. A condição do trânsito da oferta se refere a esse segundo trecho.

## Implementação do protótipo

Com origem e destino disponíveis, o painel consulta `POST /api/v1/route` para o percurso e `POST /api/v1/traffic/route` para a condição ao vivo. O Spring Boot solicita uma rota de carro com trânsito ao vivo e guarda a resposta por até 60 segundos para os mesmos pontos. A resposta inclui a duração e o atraso em relação ao fluxo livre. [Documentação da TomTom](https://docs.tomtom.com/routing-api/documentation/tomtom-orbis-maps/v2/calculate-route)

O card mostra uma das três frases, sempre acompanhada de duração e atraso estimados:

| Condição | Critério provisório do protótipo |
| --- | --- |
| Trânsito tranquilo na viagem | Abaixo dos limites de atraso moderado |
| Trânsito moderado na viagem | Atraso de pelo menos 1 minuto e 8% do tempo sem esse atraso |
| Viagem congestionada | Atraso de pelo menos 3 minutos e 20% do tempo sem esse atraso |

Esses limites são uma regra de apresentação do SafeRide, **não uma classificação fornecida pela TomTom**. Precisam ser testados com motoristas. A avaliação fala apenas do trânsito e não significa que a viagem seja segura, confortável ou rentável.

A rota desenhada no mapa ainda vem do OSRM; a estimativa de trânsito é calculada pela TomTom entre os mesmos pontos e pode seguir um traçado diferente. Por isso, o detalhe informa que o tempo se refere à rota do provedor, sem prometer que descreve cada trecho da linha desenhada. Antes de usar em uma oferta real, a rota e o resumo precisam se referir ao mesmo percurso.

## Ativação local e falhas

Para habilitar a medição ao vivo, configure `SAFERIDE_TOMTOM_API_KEY` no ambiente do Spring Boot com uma chave da conta pessoal do projeto autorizada para a Routing API. Guarde a chave fora do repositório.

Sem resposta ao vivo, o app usa o relógio no fuso `America/Sao_Paulo` na região piloto. De segunda a sexta, das 07h até antes das 10h e das 17h até antes das 20h, exibe 🟡 **Horário típico de pico**. Nos demais horários exibe 🔵 **Fora do pico típico**. A regra usa as janelas de referência da CET e não consulta um calendário de feriados nem considera eventos locais. O texto identifica a estimativa e a cor muda na virada da faixa. [Referência da CET](https://ssl.cetsp.com.br/perguntas-frequentes.aspx)

Essa estimativa pode aparecer mesmo antes de o GPS localizar a partida. O cálculo de minutos exige um percurso. Sem medição ao vivo, o mapa usa a duração calculada pelo OSRM, sem acrescentar atraso presumido. Na simulação, os tempos do embarque e da corrida vêm dos respectivos trechos. Fora da região piloto, a regra de horário fica desativada.

A [tabela de preços atual da TomTom](https://docs.tomtom.com/pricing) informa franquia gratuita mensal para a Routing API; limites e condições devem ser conferidos na conta antes de ativar consultas mais frequentes. O protótipo faz uma consulta por rota traçada, sem monitoramento contínuo.
