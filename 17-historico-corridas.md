# Histórico das corridas simuladas

## Feedback ao finalizar

Ao concluir uma corrida simulada, o app oferece botões para buraco, via em mau estado, alagamento, assalto, sensação de insegurança, problema de acesso ou nenhum problema. Responder é opcional; ao fechar, a corrida concluída fica com feedback pendente no Histórico. O envio exige conexão e grava no servidor; em caso de falha, a tela permite tentar novamente ou responder depois. Uma resposta já enviada não pode ser alterada nesta versão.

Os relatos com problemas são gravados no banco e alimentam uma lista compartilhada de demonstração, identificada como simulada. É possível selecionar mais de uma situação; `Nenhum problema` é exclusivo e não gera ocorrência, enquanto ausência de resposta não é tratada como resposta. Em ofertas seguintes, são exibidos relatos das últimas 100 respostas cujo embarque e destino estejam cada um a até 1 km dos pontos da oferta. Essa comparação de extremos não garante que as rotas sejam iguais, nem identifica o local exato da ocorrência. Não são misturados com relatos reais revisados ou os dados oficiais. Passageiro e valor não são expostos na lista compartilhada. A integração com corridas reais ainda não existe.

O MVP apresenta as abas Mapa, Histórico e Notícias. Comunidade e Perfil foram retiradas da navegação; os dados e endpoints anteriores não foram apagados.

## Registro

Uma corrida é criada ao **aceitar** a oferta. Recusar ou deixar uma oferta expirar não cria uma viagem. As ofertas incluem nomes fictícios de passageiros. Ao aceitar, o app obtém um identificador único e grava o início antes de mover o motorista.

O histórico registra passageiro, origem/embarque, destino, coordenadas, valor ofertado, distância planejada, distância percorrida, tempo simulado de viagem, tempo ativo de execução, criação, última atualização, encerramento e status. Valores são armazenados em reais e exibidos com duas casas decimais. Distâncias são armazenadas em metros; tempos em segundos.

- **Em andamento**: atualizações a cada quatro segundos ativos e nas mudanças de etapa. Ao fechar abruptamente o app, permanece o último progresso salvo; aparece como em andamento/interrompida. Não há retomada automática após reiniciar.
- **Concluída**: inclui deslocamento até o cliente e viagem até o destino; soma o valor fictício ao resumo de recebimentos simulados.
- **Cancelada**: preserva a distância e o tempo percorridos até cancelar ou encerrar a simulação. O valor ofertado aparece, mas não é somado a recebimentos.

O percurso roda acelerado (14 segundos para o embarque e 28 para o destino). O tempo de viagem usa proporcionalmente a duração OSRM de cada trecho. O tempo ativo do teste é mostrado separadamente. Pausas não incrementam esses tempos. Em segundo plano, a continuidade com o serviço de notificações Android ativo ainda precisa ser validada. Não são medidas de GPS nem registros de uma corrida real.

## Persistência e isolamento

Migração Flyway `V4__simulated_rides.sql`, tabela MySQL `sr_simulated_ride`. Endpoints:

- `POST /api/v1/rides/key`: gera UUID aleatório para identificação anônima do dispositivo ou de uma corrida.
- `PUT /api/v1/rides/{id}`: grava/atualiza uma fotografia validada da corrida; requer a chave do dispositivo como Bearer.
- `GET /api/v1/rides` retorna até 100 corridas da chave apresentada por página. Para continuar, envie `beforeCreatedAt` e `beforeId` do último registro. O app percorre as páginas para carregar também corridas antigas antes de calcular o resumo mensal. A ordenação usa data de criação e ID, inclusive para corridas com a mesma data.

A chave persistente fica em SecureStore no aplicativo e localStorage no navegador. Não usa o token de login anterior. Cada instalação/navegador tem seu próprio histórico; não há sincronização entre dispositivos sem implementar contas posteriormente. Limpar o armazenamento local perde a chave de acesso, mesmo que os registros continuem no banco.

As gravações usam ID único: reenviar não duplica a corrida. Finalizações não são reabertas por um checkpoint atrasado. Contagens não retrocedem e a chave de outro dispositivo não pode ler/alterar o registro.

Cada fotografia é salva localmente antes do envio. Sem conexão, fica marcada como pendente; novas gravações e a atualização da aba Histórico tentam sincronizar. Um novo aceite precisa de conexão para gerar os identificadores. O histórico tem estados de carregamento, vazio, offline e erro; não diz que está salvo no banco quando só existe localmente.

## Validação

O resumo mensal e a lista usam a data de encerramento no fuso `America/Sao_Paulo`. Em corridas em andamento ou registros antigos sem encerramento, usam a data de criação. O total e os quilômetros somam apenas corridas concluídas naquele mês. As datas de aceite e encerramento ficam nos detalhes. O filtro por status e feedback se aplica ao período selecionado.

O seletor oferece rolagem horizontal, encaixe por mês e botões de navegação. Começa no mês atual e permite voltar a períodos anteriores. Meses sem corridas mostram total zero e estado vazio. A atualização da tela tenta sincronizar os registros locais e lê novamente o histórico. Sem conexão, os totais consideram a cópia disponível no dispositivo.

Os testes do mobile cobrem viradas de mês e ano em São Paulo, datas antigas, exclusão de canceladas e corridas em andamento do total, precisão em centavos, paginação de 101 registros e sincronização offline. O teste do backend cobre páginas com datas iguais, isolamento entre dispositivos e cursor inválido.

`RideHistoryTest` valida migração/persistência, isolamento entre chaves, idempotência, proteção do estado final e entrada inválida. A simulação foi testada com gravação no MySQL e consulta pela aba Histórico.


## Retorno automático à busca

A oferta tem 10 segundos para aceite. Ofertas vencidas ou recusadas retornam à busca sem criar histórico. Depois de uma viagem aceita, a conclusão (ou cancelamento) é persistida antes de iniciar outra busca. O ciclo não repete a intro e mantém cada viagem com ID próprio. Uma falha na gravação local bloqueia o avanço até uma nova tentativa; indisponibilidade do servidor mantém o registro local pendente.

O tempo ativo da simulação inclui a parada de 3 segundos para confirmar o embarque (14 s de aproximação + 3 s de embarque + 28 s de trajeto = 45 s em uma execução contínua). A parada não acrescenta quilômetros nem altera os minutos de rota estimados pelo OSRM.
