# Resumo de trânsito da viagem

## Finalidade

O card **Trânsito e acesso** deve responder rapidamente se a viagem entre origem e destino tende a ter **trânsito leve, moderado ou congestionado**. Na caixinha sobre uma plataforma parceira, essa consulta deve usar a origem e o destino da oferta recebida; no protótipo atual, usa os pontos escolhidos manualmente no SafeRide. Sem os dois pontos, o card pede para traçar o percurso.

## Implementação do protótipo

Depois de traçar a rota, o React Native chama `POST /api/v1/traffic/route` com origem e destino. O Spring Boot consulta o [TomTom Orbis Routing API v2](https://docs.tomtom.com/routing-api/documentation/tomtom-orbis-maps/v2/calculate-route) com `traffic=live` e `travelMode=car`. A resposta fornece duração estimada e `trafficDelayInSeconds`, o atraso estimado em relação ao fluxo livre. O backend guarda a resposta por até 60 segundos para os mesmos pontos. Não há atualização contínua nem consulta automática a cada minuto; uma nova rota provoca nova avaliação.

O card mostra uma das três frases, sempre acompanhada de duração e atraso estimados:

| Condição | Critério provisório do protótipo |
| --- | --- |
| Trânsito tranquilo na viagem | Abaixo dos limites de atraso moderado |
| Trânsito moderado na viagem | Atraso de pelo menos 1 minuto e 8% do tempo sem esse atraso |
| Viagem congestionada | Atraso de pelo menos 3 minutos e 20% do tempo sem esse atraso |

Esses limites são uma regra de apresentação do SafeRide, **não uma classificação fornecida pela TomTom**. Precisam ser testados com motoristas. A avaliação fala apenas do trânsito e não significa que a viagem seja segura, confortável ou rentável.

A rota desenhada no mapa ainda vem do OSRM; a estimativa de trânsito é calculada pela TomTom entre os mesmos pontos e pode seguir um traçado diferente. Por isso, o detalhe informa que o tempo se refere à rota do provedor, sem prometer que descreve cada trecho da linha desenhada. Antes de usar em uma oferta real, a rota e o resumo precisam se referir ao mesmo percurso.

## Ativação local e falhas

É necessária uma chave de API criada na **conta pessoal do projeto**, com acesso à Routing API. Configure `SAFERIDE_TOMTOM_API_KEY` no ambiente do processo do Spring Boot antes de iniciá-lo. O valor não deve ser salvo no repositório ou enviado em mensagens. Sem chave, timeout, resposta inválida ou limite do provedor, a API retorna `UNAVAILABLE` e o card diz **“Trânsito ao vivo indisponível”**, sem classificar a viagem. O histórico SP156, relatos e notícias continuam disponíveis nos detalhes, separados do estado ao vivo.

A [tabela de preços atual da TomTom](https://docs.tomtom.com/pricing) informa franquia gratuita mensal para a Routing API; limites e condições devem ser conferidos na conta antes de ativar consultas mais frequentes. O protótipo faz uma consulta por rota traçada, sem monitoramento contínuo.
