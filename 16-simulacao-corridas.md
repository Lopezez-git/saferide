# Simulação de ofertas e viagens

O botão **Simular corrida**, no canto inferior direito da aba **Mapa**, ativa uma simulação no mesmo mapa já montado na aba, sem modal de tela, navegação, troca de estilo ou criação de outro mapa. Adiciona um bonequinho de passageiro azul, o destino, os dois percursos e o cartão com categoria, valor, avaliação, origem/destino e botão Aceitar. Uma caixa SafeRide recolhível flutua acima do mapa; tocar nela abre fontes e limites dos indicadores.

## Fluxo

1. Toque em **Simular corrida** no Mapa para abrir diretamente uma oferta, com toque e contagem de 45 segundos. O caminho até o cliente aparece azul tracejado; a viagem do cliente aparece em traço escuro para contraste com o mapa claro. O botão **Som ligado/Sem som** controla o áudio, sem pedir acesso ao microfone.
2. Aceite a oferta ou use o X para recusar. Sem resposta, a oferta expira.
3. Ao aceitar, o marcador percorre a rota até o embarque (14 segundos de demonstração) e depois até o destino (28 segundos). A animação é acelerada, independente dos minutos da oferta. Pode ser pausada ou cancelada.
4. Após concluir, recusar ou expirar, **Próxima corrida** alterna entre os três cenários. A próxima oferta começa somente ao tocar em Receber corrida.

Os temporizadores param quando a aba perde foco ou o aplicativo vai para segundo plano. Não há notificações reais em segundo plano nem aceite de corridas nas plataformas.

O botão **Encerrar simulação** remove os elementos simulados e restaura a posição/zoom e a consulta anterior do mapa. A simulação não ocupa mais uma aba própria.

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

O áudio usa `expo-audio` compatível com o SDK 58. Expo Go inclui o módulo; uma development build criada antes da instalação precisa ser recompilada para incluí-lo. O navegador pode exigir a interação com Receber corrida para autorizar reprodução.

## Histórico

Ao aceitar, a corrida é registrada no banco. O progresso e o encerramento alimentam a aba Histórico, incluindo nomes fictícios dos passageiros. Consulte [persistência e métricas](17-historico-corridas.md).
