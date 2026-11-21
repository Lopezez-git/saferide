# Notificações Android na simulação

A proposta é mostrar notificações do SafeRide com o contexto da oferta simulada, sem janela sobre outros aplicativos. A aceitação acontece na interface da própria simulação; não existe integração com Uber, 99 ou iFood.

Em Ajustes, o usuário ativa o serviço e autoriza notificações no Android. A oferta mostra segurança, pavimento e relatos disponíveis, identificando sua origem e limitações. O serviço mantém uma notificação de atividade e tenta manter a simulação em segundo plano. Não acompanha GPS em segundo plano.

Quando a viagem simulada termina, o histórico é salvo e uma notificação pergunta sobre o trajeto. Ela oferece respostas rápidas para insegurança, buraco e via ruim; ao abri-la, há outras opções no app. As respostas são gravadas na base da comunidade com a corrida e sem inventar um ponto exato. Se não houver resposta, o aviso expira após 30 segundos, nenhum relato é criado e o feedback continua pendente no histórico.

No emulador Android, foram verificados o ciclo de ofertas em segundo plano, a conclusão da corrida, o envio de feedback pela notificação e a consulta desse feedback em uma oferta semelhante. Falta validar em aparelho físico e testar a expiração sem resposta de ponta a ponta. O sistema pode encerrar o processo; uma parada forçada encerra o serviço. Não há retomada automática após o encerramento. O Expo Go não inclui este módulo nativo: é necessária uma versão Android de desenvolvimento.
