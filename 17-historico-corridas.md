# Histórico das corridas simuladas

O MVP apresenta as abas Mapa, Histórico e Notícias. Comunidade e Perfil foram retiradas da navegação; os dados e endpoints anteriores não foram apagados.

## Registro

Uma corrida é criada ao **aceitar** a oferta. Recusar ou deixar uma oferta expirar não cria uma viagem. As ofertas incluem nomes fictícios de passageiros. Ao aceitar, o app obtém um identificador único e grava o início antes de mover o motorista.

O histórico registra passageiro, origem/embarque, destino, coordenadas, valor ofertado, distância planejada, distância percorrida, tempo simulado de viagem, tempo ativo de execução, criação, última atualização, encerramento e status. Valores são armazenados em reais e exibidos com duas casas decimais. Distâncias são armazenadas em metros; tempos em segundos.

- **Em andamento**: atualizações a cada quatro segundos ativos e nas mudanças de etapa. Ao fechar abruptamente o app, permanece o último progresso salvo; aparece como em andamento/interrompida. Não há retomada automática após reiniciar.
- **Concluída**: inclui deslocamento até o cliente e viagem até o destino; soma o valor fictício ao resumo de recebimentos simulados.
- **Cancelada**: preserva a distância e o tempo percorridos até cancelar ou encerrar a simulação. O valor ofertado aparece, mas não é somado a recebimentos.

O percurso roda acelerado (14 segundos para o embarque e 28 para o destino). O tempo de viagem usa proporcionalmente a duração OSRM de cada trecho. O tempo ativo do teste é mostrado separadamente. Pausas e segundo plano não incrementam esses tempos. Não são medidas de GPS nem registros de uma corrida real.

## Persistência e isolamento

Migração Flyway `V4__simulated_rides.sql`, tabela MySQL `sr_simulated_ride`. Endpoints:

- `POST /api/v1/rides/key`: gera UUID aleatório para identificação anônima do dispositivo ou de uma corrida.
- `PUT /api/v1/rides/{id}`: grava/atualiza uma fotografia validada da corrida; requer a chave do dispositivo como Bearer.
- `GET /api/v1/rides`: lista até 100 corridas mais recentes da chave apresentada.

A chave persistente fica em SecureStore no aplicativo e localStorage no navegador. Não usa o token de login anterior. Cada instalação/navegador tem seu próprio histórico; não há sincronização entre dispositivos sem implementar contas posteriormente. Limpar o armazenamento local perde a chave de acesso, mesmo que os registros continuem no banco.

As gravações usam ID único: reenviar não duplica a corrida. Finalizações não são reabertas por um checkpoint atrasado. Contagens não retrocedem e a chave de outro dispositivo não pode ler/alterar o registro.

Cada fotografia é salva localmente antes do envio. Sem conexão, fica marcada como pendente; novas gravações e a atualização da aba Histórico tentam sincronizar. Um novo aceite precisa de conexão para gerar os identificadores. O histórico tem estados de carregamento, vazio, offline e erro; não diz que está salvo no banco quando só existe localmente.

## Validação

`RideHistoryTest` valida migração/persistência, isolamento entre chaves, idempotência, proteção do estado final e entrada inválida. A simulação foi testada com gravação no MySQL e consulta pela aba Histórico.
