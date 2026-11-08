# Simulação de ofertas e viagens

O botão **Simular corrida**, no canto inferior direito da aba **Mapa**, ativa uma simulação no mesmo mapa já montado na aba, sem modal de tela, navegação, troca de estilo ou criação de outro mapa. Adiciona um bonequinho de passageiro azul, o destino, os dois percursos e o cartão com categoria, valor, avaliação, origem/destino e botão Aceitar. Uma notificação visual SafeRide, recolhível, aparece no topo do mapa junto à oferta. Mostra três indicadores compactos do destino; tocar nela abre fontes, datas e limites. É uma notificação dentro do aplicativo, não um push do sistema operacional.

## Fluxo

1. Toque em **Simular corrida** no Mapa. São duas etapas consecutivas: **5 segundos de intro** com a marca e os temas do SafeRide; depois **5 segundos de busca**, em um painel sobre o mapa. Só ao final dos cerca de **10 segundos de uso ativo** aparecem passageiro, trajetos, notificação SafeRide e oferta com som e contagem própria de 10 segundos. A intro entra com deslocamento vertical e fade; a oferta sobe e a notificação desce suavemente. As consultas de contexto podem carregar em paralelo. O caminho até o cliente aparece azul tracejado; a viagem aparece em traço escuro. O controle **Som/Mudo** não solicita acesso ao microfone.
2. A oferta fica disponível por **10 segundos**. Sem aceite, desaparece e inicia automaticamente outra busca de **5 segundos**, seguida da próxima oferta. Recusar também retorna à busca. Os três cenários se alternam em ciclo; a intro só acontece na entrada da simulação.
3. Ao aceitar, o prazo da oferta para imediatamente enquanto o registro é criado. O motorista percorre o caminho até o cliente (14 segundos de demonstração), para por 3 segundos com **Embarque confirmado / Passageiro a bordo** e depois segue até o destino (28 segundos). O passageiro deixa de aparecer esperando no mapa e o marcador do motorista recebe um sinal de confirmação. É possível pausar ou cancelar; os minutos estimados da viagem são diferentes desse tempo acelerado.
4. Ao chegar, o sistema grava a conclusão antes de voltar automaticamente à busca de 5 segundos. Se o servidor estiver indisponível, uma gravação local pendente permite continuar; falha no armazenamento local exige **Salvar e continuar**, para não perder o registro. Cancelar uma corrida aceita também grava o cancelamento antes de retornar à busca. Ofertas recusadas ou vencidas não viram viagens no histórico.
5. O botão **Encerrar simulação** interrompe o ciclo. A troca de aba ou ida para segundo plano pausa os temporizadores.

Os temporizadores param quando a aba perde foco ou o aplicativo vai para segundo plano. Não há notificações reais em segundo plano nem aceite de corridas nas plataformas.

O botão **Encerrar simulação** remove os elementos simulados e restaura a posição/zoom e a consulta anterior do mapa. A simulação não ocupa mais uma aba própria.

## Aparência

A aba **Ajustes** abre **Configurações**, onde o usuário escolhe **Claro** ou **Escuro**, com prévia. A escolha altera intro, oferta e notificação (incluindo os detalhes) e é persistida por dispositivo. O mapa conserva o estilo atual. O painel de viagem é menor que o de oferta para liberar espaço ao trajeto; ações permanecem fixas, com conteúdo rolável em telas pequenas.

## Movimento do motorista

O mapa interpola o marcador a cada quadro com `requestAnimationFrame`, seguindo os segmentos da rota, inclusive curvas, entre as atualizações de estado a cada 250 ms. A geometria é preparada uma vez por trecho, sem recriar o marcador a cada quadro. Pausar, trocar de aba, embarcar e sair cancelam a interpolação; a preferência por movimento reduzido mantém posições discretas. A taxa visual acompanha o dispositivo, sem garantia de 60 fps em todos os aparelhos.

As barras da oferta e do percurso também têm transição contínua. O painel prioriza valor, duração e os dois locais; mensagens de gravação bem-sucedida ficam no histórico, enquanto falhas e envio pendente continuam visíveis. Fontes e datas permanecem acessíveis ao tocar no aviso SafeRide.

## Movimento da câmera

Durante os últimos dois segundos da intro, a câmera calcula o enquadramento a partir da geometria completa da corrida e da área disponível entre os painéis. O zoom final usa precisão fracionária, sem afastar um nível inteiro por arredondamento, e margem lateral de 26 px. A vista inicial fica apenas 0,65 nível mais próxima, no mesmo centro da vista final. Ao revelar a oferta, a abertura leva cerca de 0,9 segundo: percursos curtos permanecem próximos e percursos extensos recebem o espaço necessário. A animação ocorre uma vez por oferta; atualizações do motorista não a reiniciam. Sair interrompe o movimento e restaura a vista e o ajuste de zoom anteriores.

Ao aceitar, o **mesmo mapa Leaflet** entra na visão do motorista: zoom 16,8, inclinação de 38°, orientação acompanhando o sentido do percurso e seta na parte inferior da área livre entre os painéis. A posição percorre os segmentos da geometria OSRM, com quadros intermediários via `requestAnimationFrame`; a câmera acompanha a seta e suaviza mudanças de direção. Não há troca de página ou de instância do mapa.

A visão próxima continua durante os três segundos de embarque. O ponto do passageiro desaparece e a seta recebe um sinal de confirmação; o painel mostra “Passageiro a bordo”. Depois do embarque, apenas o trecho até o destino permanece destacado. Ao voltar à busca, a câmera sai da perspectiva e retoma o enquadramento da próxima oferta. Ao encerrar a simulação, restaura a vista anterior do mapa. Pausar, trocar de aba ou colocar o aplicativo em segundo plano interrompe o movimento.

A perspectiva usa [leaflet-rotate 0.5.3](https://github.com/Raruto/leaflet-rotate), carregado por CDN com versão fixa, sob licença **GPL-3.0**. Se esse script não carregar, a simulação mantém acompanhamento em vista superior. A renderização de navegação desenha os mesmos vetores z14 em blocos SVG de 1024 px no z16; isso preserva a escala geográfica e reduz a ampliação de texturas pequenas na perspectiva. A vista comum mantém seu renderizador anterior. Os componentes dependem de conexão para carregar scripts e mapas; não há garantia de FPS fixo em todos os celulares.

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
node --test tests/simulation.test.cjs tests/simulation-camera.test.cjs tests/rideHistory.test.cjs tests/simulation-context.test.cjs
npm run typecheck
npm run lint
```

O áudio usa `expo-audio` compatível com o SDK 58. Expo Go inclui o módulo; uma development build criada antes da instalação precisa ser recompilada para incluí-lo. O som só é disparado quando a oferta chega. O navegador pode limitar reprodução automática; o controle Som continua disponível.

## Histórico

Ao aceitar, a corrida é registrada no banco. O progresso e o encerramento alimentam a aba Histórico, incluindo nomes fictícios dos passageiros. Consulte [persistência e métricas](17-historico-corridas.md).
