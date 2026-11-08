# Simulação de ofertas e viagens

O botão **Simular corrida**, no canto inferior direito da aba **Mapa**, ativa uma simulação no mesmo mapa já montado na aba, sem modal de tela, navegação, troca de estilo ou criação de outro mapa. Adiciona um bonequinho de passageiro azul, o destino, os dois percursos e o cartão com categoria, valor, avaliação, origem/destino e botão Aceitar. Uma notificação visual SafeRide, recolhível, aparece no topo do mapa junto à oferta. Mostra o destino e os três indicadores; tocar nela abre fontes, datas e limites. É uma notificação dentro do aplicativo, não um push do sistema operacional.

## Fluxo

1. Toque em **Simular corrida** no Mapa. São duas etapas consecutivas: **5 segundos de intro** com a marca e os temas do SafeRide; depois **5 segundos de busca**, em um painel sobre o mapa. Só ao final dos cerca de **10 segundos de uso ativo** aparecem passageiro, trajetos, notificação SafeRide e oferta com som e contagem própria de 10 segundos. A intro entra com deslocamento vertical e fade; a oferta sobe e a notificação desce suavemente. As consultas de contexto podem carregar em paralelo. O caminho até o cliente aparece azul tracejado; a viagem aparece em traço escuro. O controle **Som/Mudo** não solicita acesso ao microfone.
2. A oferta fica disponível por **10 segundos**. Sem aceite, desaparece e inicia automaticamente outra busca de **5 segundos**, seguida da próxima oferta. Recusar também retorna à busca. Os três cenários se alternam em ciclo; a intro só acontece na entrada da simulação.
3. Ao aceitar, o prazo da oferta para imediatamente enquanto o registro é criado. O motorista percorre o caminho até o cliente (14 segundos de demonstração) e depois até o destino (28 segundos). É possível pausar ou cancelar; os minutos estimados da viagem são diferentes desse tempo acelerado.
4. Ao chegar, o sistema grava a conclusão antes de voltar automaticamente à busca de 5 segundos. Se o servidor estiver indisponível, uma gravação local pendente permite continuar; falha no armazenamento local exige **Salvar e continuar**, para não perder o registro. Cancelar uma corrida aceita também grava o cancelamento antes de retornar à busca. Ofertas recusadas ou vencidas não viram viagens no histórico.
5. O botão **Encerrar simulação** interrompe o ciclo. A troca de aba ou ida para segundo plano pausa os temporizadores.

Os temporizadores param quando a aba perde foco ou o aplicativo vai para segundo plano. Não há notificações reais em segundo plano nem aceite de corridas nas plataformas.

O botão **Encerrar simulação** remove os elementos simulados e restaura a posição/zoom e a consulta anterior do mapa. A simulação não ocupa mais uma aba própria.

## Aparência

A aba **Ajustes** abre **Configurações**, onde o usuário escolhe **Claro** ou **Escuro**, com prévia. A escolha altera intro, oferta e notificação (incluindo os detalhes) e é persistida por dispositivo. O mapa conserva o estilo atual. O painel de viagem é menor que o de oferta para liberar espaço ao trajeto; ações permanecem fixas, com conteúdo rolável em telas pequenas.

## Movimento da câmera

Durante os últimos dois segundos da intro, a câmera calcula o enquadramento a partir da geometria completa da corrida e da área disponível entre os painéis. O zoom final usa precisão fracionária, sem afastar um nível inteiro por arredondamento, e margem lateral de 26 px. A vista inicial fica apenas 0,65 nível mais próxima, no mesmo centro da vista final. Ao revelar a oferta, a abertura leva cerca de 0,9 segundo: percursos curtos permanecem próximos e percursos extensos recebem o espaço necessário. A animação ocorre uma vez por oferta; atualizações do motorista não a reiniciam. Sair interrompe o movimento e restaura a vista e o ajuste de zoom anteriores.

As transições de interface usam opacidade e deslocamento, com driver nativo no celular. A preferência de acessibilidade por movimento reduzido desativa os deslocamentos e o voo da câmera.

## Dados

- Ofertas, valores, avaliações e posição inicial do motorista são fictícios e identificados como demonstração.
- As geometrias, distâncias e durações foram obtidas do OSRM através do backend em 05/11/2026 e salvas em `apps/mobile/src/lib/simulation-routes.json`. São rotas pré-carregadas sem trânsito ao vivo. Os pontos são referências aproximadas, não entradas de embarque validadas. O cenário Socorro usa o trecho da rua encontrado, sem afirmar a localização do número 371 da imagem.
- Segurança consulta `/safety/police` ao redor do destino (1 km), usando o recorte da hora atual devolvido pelo backend; exibe histórico de BOs de veículos e período da base.
- Pavimento consulta `/pavement/requests` no mesmo raio e mostra pedidos abertos/em andamento na publicação SP156, com data nos detalhes.
- Trânsito consulta `/traffic/route` entre embarque e destino. Sem resposta válida do provedor, mostra indisponível; não transforma tempo OSRM em avaliação de congestionamento.
- O mapa usa vetores OpenFreeMap com atribuição OpenMapTiles/OpenStreetMap e renderização SVG no Leaflet, compatível com iframe web e WebView do aplicativo.

A caixa é uma sobreposição **dentro do protótipo**. Não aparece por cima de aplicativos reais como Uber/99/iFood. Essa integração Android continua sendo uma etapa distinta.

## Verificação

```sh
cd apps/mobile
node --test tests/simulation.test.cjs
npm run typecheck
npm run lint
```

O áudio usa `expo-audio` compatível com o SDK 58. Expo Go inclui o módulo; uma development build criada antes da instalação precisa ser recompilada para incluí-lo. O som só é disparado quando a oferta chega. O navegador pode limitar reprodução automática; o controle Som continua disponível.

## Histórico

Ao aceitar, a corrida é registrada no banco. O progresso e o encerramento alimentam a aba Histórico, incluindo nomes fictícios dos passageiros. Consulte [persistência e métricas](17-historico-corridas.md).
