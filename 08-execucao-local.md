# Executar o protótipo funcional

## Escopo disponível

React Native/Expo SDK 58, Expo Router e TypeScript; Spring Boot 3.5.7/Java 21; MySQL 8 com Flyway. Região piloto escolhida pelo proprietário: São Paulo.

- Cadastro/login/logout; senha com BCrypt e sessão opaca, armazenada como hash no banco, com validade de 24 horas.
- Perfil editável, atividade, veículo e múltiplas plataformas autodeclaradas.
- Feed com categorias, publicação, comentários e exclusão pelo autor; dados persistem no MySQL.
- Mapa OpenStreetMap/Leaflet com seleção de pontos, filtros e lista de relatos revisados.
- Histórico SSP-SP de veículos subtraídos no raio de 1 km, agregado pela hora declarada do fato. O card usa automaticamente a hora atual de São Paulo, sem seletor; BOs sem horário confiável aparecem separados. É histórico, não alerta em tempo real ou classificação de segurança. O backend precisa ser reiniciado após reimportar a base.
- Consulta de rota para carro via serviço de demonstração OSRM; distância e duração estimadas, sem trânsito ao vivo.
- Envio de relato observado agora, pendência de revisão, aprovação/rejeição/retirada pelo moderador e trilha da decisão.
- Contexto próximo à rota: distância aproximada de até 300 m; não comprova que o registro é na mesma via.
- Notícias RSS automáticas: Agência Brasil com filtro regional/temático; se falhar ou não tiver itens elegíveis, busca RSS do Google Notícias com lista de veículos permitidos. Exige São Paulo ou capital paulista no título e aceita somente publicações dos últimos sete dias, com data válida e não futura. Links agregados são identificados como via Google Notícias. Filtro é preliminar: pode abranger o estado/região; não confirma município, não verifica o fato nem geolocaliza a notícia. O RSS regional antigo do g1 foi descartado após retornar matéria de 2018.
- Coleta na inicialização e a cada 15 minutos; dados salvos continuam disponíveis se a fonte falhar. Exemplo fictício de notícia depende de botão explícito e nunca entra no mapa.
- Simulação da caixinha dentro do app, vinculada à rota selecionada, com minimizar/expandir/fechar. Não é uma janela sobre Uber/99/iFood.

## Executar com MySQL

Criar o banco usando data/mysql/create-database.sql e configurar usuário exclusivo com acesso somente a saferide.*. Não usar root como usuário da API e não versionar senhas.

No PowerShell, a partir da raiz do repositório:

```powershell
$env:SPRING_PROFILES_ACTIVE='mysql,prototype'
$env:DB_HOST='127.0.0.1'
$env:DB_PORT='3306'
$env:DB_USER='saferide_app'
# Defina DB_PASSWORD localmente, sem publicar o valor.
mvn -f services/api/pom.xml spring-boot:run
```

API em 127.0.0.1:8080. Flyway aplica as migrações automaticamente somente no banco saferide. Arquivos .env.example são referências; o Spring não carrega .env automaticamente.

Nesta máquina foi preparada uma instância separada em localhost:3307. A pasta privada work/, fora do repositório, contém mysql-local.ps1 (variáveis), start-saferide-mysql.ps1 (inicialização), mysql-client.ini e mysql-saferide/ (dados). Não compartilhar essa pasta nem reiniciar uma instância já ativa. Para iniciar a API usando a configuração privada: carregar mysql-local.ps1 no processo e depois definir SPRING_PROFILES_ACTIVE como mysql,prototype. Não há infraestrutura da Advanced envolvida.

## App e prévia

```powershell
cd apps/mobile
npm ci
npm run web
```

A prévia para apresentação fica em http://localhost:8081. É a interface React Native renderizada no navegador, não uma build Android instalada. API aceita CORS somente dessa origem local e 127.0.0.1:8081; não exige liberar o MySQL na rede.

No Android, configurar o SDK e dispositivo autorizado, depois:

```powershell
adb reverse tcp:8080 tcp:8080
adb reverse tcp:8081 tcp:8081
npm run android:build
```

O app consulta http://127.0.0.1:8080 por padrão. Para outra topologia, configurar EXPO_PUBLIC_API_URL em .env, sem incluir segredos. Android guarda o token com SecureStore; a prévia usa sessionStorage e não persiste a senha. Em instalação pública, HTTPS, endurecimento de autenticação e revisão de dependências são obrigatórios antes de operação real.

O mapa é um componente Leaflet isolado, em iframe na prévia e WebView no Android; as demais telas são componentes React Native. Esse componente provisório não transforma o app inteiro em uma WebView. Os tiles, scripts de mapa, RSS e cálculo de rota precisam de internet. Não há download offline de mapas ou garantia de disponibilidade dos serviços públicos.

## Apresentação

1. Criar uma conta de teste em Perfil e selecionar plataformas.
2. Publicar uma dica na Comunidade, abrir comentários e comentar.
3. No Mapa, marcar origem e destino por toque ou pelos pontos de referência, e consultar a rota.
4. Escolher Novo relato, marcar local e enviar um texto explicitamente fictício. Ele fica pendente, fora do mapa.
5. Usar uma conta moderadora para revisar. O papel MODERATOR é atribuído somente por administração local do banco; cadastro público sempre cria MEMBER.
6. Atualizar mapa e relatos, consultar a rota e abrir a simulação da caixinha.
7. Consultar Notícias, abrir a fonte original ou ativar explicitamente o exemplo fictício.

A conta fictícia usada na verificação desta máquina está conectada na prévia. Ela foi promovida a moderadora apenas no banco local para exercitar a apresentação; não existe senha de administrador ou concessão automática de moderação no código. Novos ambientes começam sem essa conta.

## Dados e limites

As tabelas sr_* da migração V3 sustentam os fluxos funcionais e usam UUIDs. As tabelas da V1 e o perfil demo foram preservados somente para o exemplo inicial de leitura e seus testes; não são usadas pelos novos fluxos. Não combinar os perfis demo e prototype na apresentação. O perfil demo usa H2 temporário e só oferece os endpoints antigos /demo.

Relatos de alagamento têm janela inicial de 6 horas e os demais de 24 horas, contadas da observação; são parâmetros provisórios de apresentação. Aprovação antiga é recusada e consultas excluem registros vencidos. Expiração não comprova resolução, e ocorrência de segurança não significa crime em andamento. Revisão humana não comprova o fato. O usuário deve atualizar a consulta para receber novas revisões; não há push em tempo real.

A busca textual consulta lugares e endereços pelo endpoint /api/v1/places, usando Photon/OpenStreetMap na região piloto. Digite ao menos três caracteres: sugestões aparecem após uma pausa de 500 ms, respeitando intervalo mínimo de 1,2 segundo por dispositivo. Escolha um resultado para origem/destino. Consultas anteriores são canceladas e respostas antigas são descartadas. Os quatro pontos de referência continuam como atalhos. O cálculo de rota é para carro, mesmo quando o perfil indica moto ou bicicleta; não usá-lo como orientação específica para esses veículos. Não há navegação curva a curva.

Ainda faltam: edição de posts/comentários, denúncias e moderação completa do feed, verificação de e-mail/recuperação de senha, limites de abuso, paginação além dos primeiros 100 registros, promoção revisada de notícias a ocorrências, sobreposição nativa Android, eventos de ofertas e integração real com plataformas. Esta entrega é um protótipo local, não um serviço pronto para produção.

## Verificações

```powershell
mvn -f services/api/pom.xml test
cd apps/mobile
npm run typecheck
npm run lint
npx expo install --check
npx expo export --platform android
```

Testes de API: registro, login inválido, perfil, publicação, comentários, propriedade na exclusão, logout, autorização de moderação, bloqueio de relato pendente, expiração e exemplo legado. O relatório da verificação manual fica em 09-prototipo-funcional.md.

A exportação Android produz bundle JavaScript/Hermes, não um APK. Instalação e teste no aparelho ainda não foram realizados. A instalação npm anterior reportou avisos moderados de dependências, cuja revisão continua pendente; não houve upgrade forçado incompatível com Expo.

## Fontes técnicas

[Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/), [WebView](https://docs.expo.dev/versions/v58.0.0/sdk/webview/), [SecureStore](https://docs.expo.dev/versions/v58.0.0/sdk/securestore/), [Leaflet](https://leafletjs.com/), [política de tiles OSM](https://operations.osmfoundation.org/policies/tiles/) e [OSRM](https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server). Atribuição OSM permanece visível; sem pré-carregamento ou download em massa.

## Localização do dispositivo

Ao abrir ou voltar à aba Mapa, o app solicita automaticamente a localização, respeitando a permissão do sistema. Quando disponível, centraliza no ponto azul e desenha o círculo de precisão. Não existe botão de localização. A consulta é pontual ao entrar na aba; não acompanha deslocamentos em segundo plano. O horário da leitura fica visível.

A primeira posição válida dentro da região piloto preenche a origem se ela ainda não foi definida. Uma origem escolhida manualmente é preservada. Fora dos limites da região piloto, a posição continua visível, mas trajetos e relatos permanecem restritos à área de São Paulo.

A tela do mapa usa cabeçalho compacto e altura proporcional à janela (entre 280 e 560 pixels). Telas abaixo de 480 pixels usam margens e espaçamentos reduzidos; os controles preservam áreas de toque de pelo menos 44 pixels. Verificado em prévia de 390 pixels, sem transbordamento horizontal.

No navegador usamos Geolocation API (localhost ou HTTPS). Em computador, a posição pode ser aproximada, sem sensor GPS. No Android/iOS usamos expo-location com permissão de uso em primeiro plano; a nova dependência exige reconstruir o development build. Se o navegador integrado não responder, abra localhost:8081 no Chrome/Edge, permita a localização e verifique também a configuração do sistema operacional. Recusa, indisponibilidade e timeout exibem erro, sem substituir por coordenadas fictícias.

A posição fica em memória; não criamos histórico de GPS no banco. O mapa carrega tiles externos da área visualizada. Ao consultar um trajeto, as coordenadas de origem/destino são enviadas à API local e ao OSRM, como no fluxo manual. O envio de relato continua sendo uma ação separada do usuário.

Referência: [Expo Location SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/location/).

## Mapa dedicado e busca de lugares

A aba Mapa abre apenas com o mapa e o campo de busca flutuante. O painel de detalhes fica oculto e aparece ao selecionar um lugar, tocar em um ponto ou em um relato; pode ser fechado novamente. Não há atalhos de trajeto/relatar/alertas na tela inicial. Comunidade, Notícias e Perfil continuam em abas próprias. O estilo visual é inspirado em aplicativos de mobilidade, com identidade SafeRide; não representa integração oficial com a Uber.

A busca envia o texto ao backend e ao Photon público. O servidor restringe os resultados à região piloto, limita novas chamadas a uma por 1,1 segundo, mantém cache em memória por uma hora (até 200 termos) e aplica timeout. O provedor pode ser trocado com a propriedade places.url. A busca usa sugestões automáticas com debounce; não há trânsito ao vivo ou garantia de cobertura equivalente ao Google Maps. Falhas exibem mensagem; selecionar no mapa continua disponível. Fonte: [Photon e condições do servidor público](https://github.com/komoot/photon#demo-server).

Verificado: busca real por Paulista, seleção na interface, rota de demonstração desde a Sé (aproximadamente 4,4 km), testes existentes da API, TypeScript e ESLint. GPS real no aparelho continua dependendo da permissão e do provedor de localização.

## Estilo visual do mapa

A base usa tiles vetoriais OpenFreeMap/OpenMapTiles desenhados em SVG com Leaflet.VectorGrid (sem ampliar imagens canvas), com fundo cinza claro e ruas brancas, sem rótulos de ruas e pontos comerciais. O trajeto calculado é preto, as extremidades são quadradas e a chegada mostra a estimativa do OSRM. Atribuições permanecem visíveis. Fonte: https://openfreemap.org/quick_start/.

Um marcador circular verde representa a última posição obtida do dispositivo. Sem GPS disponível, um círculo vazado escuro aparece somente quando há origem escolhida, com identificação de origem manual no tooltip; isso não representa rastreamento ao vivo. O círculo tracejado mostra a precisão informada pelo dispositivo quando disponível. Foi verificado no navegador um trajeto real Paulista–Sé, com o painel recolhido após o cálculo. Teste físico Android/iOS ainda pendente.
