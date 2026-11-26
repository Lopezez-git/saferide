# Notificações Android na simulação

A proposta é mostrar notificações do SafeRide com o contexto da oferta simulada, sem janela sobre outros aplicativos. A aceitação acontece na interface da própria simulação; não existe integração com Uber, 99 ou iFood.

Em Ajustes, o motorista ativa o serviço e autoriza notificações no Android. Durante a oferta, o aviso compacto mostra o histórico de veículos e o resumo de trânsito. Ao expandi-lo, o motorista também vê o recorte horário dos BOs, quando disponível, e os pedidos pendentes de tapa-buraco. Os relatos de trajetos semelhantes ficam nos detalhes da oferta no aplicativo. O serviço mantém a simulação ativa em segundo plano sem acompanhar o GPS nessa etapa.

A notificação usa os mesmos critérios dos cards para segurança, pavimento e trânsito. Na ausência de uma medição de trânsito ao vivo, o círculo amarelo indica horário típico de pico e o azul indica fora do pico típico. No teste das 18h, apenas o relógio do emulador foi ajustado. A faixa dos BOs veio do servidor e seguiu o horário dele. [Critérios de trânsito](14-transito-da-viagem.md) · [Captura fora do pico](docs/evidencias/transito-fora-do-pico.png) · [Captura no pico](docs/evidencias/transito-no-pico.png)

Quando a viagem simulada termina, o histórico é salvo e uma notificação pergunta sobre o trajeto. Ela oferece respostas rápidas para insegurança, buraco e via ruim; ao abri-la, há outras opções no app. As respostas são gravadas na base da comunidade com a corrida e sem inventar um ponto exato. Se não houver resposta, o aviso expira após 30 segundos, nenhum relato é criado e o feedback continua pendente no histórico.

No emulador Android, foram verificados o ciclo de ofertas em segundo plano, a conclusão da corrida, o envio de feedback pela notificação e a consulta desse feedback em uma oferta semelhante. Falta validar em aparelho físico e testar a expiração sem resposta de ponta a ponta. O sistema pode encerrar o processo; uma parada forçada encerra o serviço. Não há retomada automática após o encerramento. O Expo Go não inclui este módulo nativo: é necessária uma versão Android de desenvolvimento.
