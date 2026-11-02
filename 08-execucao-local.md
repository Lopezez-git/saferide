# Executar a base local

## O que já existe

Primeira base técnica: React Native com Expo SDK 58, Expo Router e TypeScript; Spring Boot 3.5.7 com Java 21; MySQL 8 e migrações Flyway. Mapa é a aba inicial. O desenho atual é ilustrativo, sem geolocalização, pesquisa ou cálculo de rota. Comunidade e perfil são prévias de leitura. Tocar em uma ocorrência abre seus detalhes abaixo da lista.

Ainda não implementados: autenticação, cadastro, escritas da comunidade, busca de notícias, cálculo espacial real, simulador de ofertas e módulo Kotlin de sobreposição. Expo Go não valida a caixinha; ela exige development build e módulo nativo. As APIs /demo usam exclusivamente exemplos fictícios e não são as APIs autenticadas finais.

## API de demonstração (sem configurar MySQL)

Na raiz do repositório, PowerShell:

```powershell
$env:SPRING_PROFILES_ACTIVE='demo'
mvn -f services/api/pom.xml spring-boot:run
```

Esse perfil usa H2 em memória, recriado a cada execução, com exemplos fixos de 02/11/2026. Não há fallback automático entre MySQL e H2. O perfil demo deve ser escolhido explicitamente. A API fica em 127.0.0.1:8080, sem exposição à rede.

- GET /api/v1/status: verifica conexão com o banco.
- GET /api/v1/demo/occurrences: exemplos revisados.
- GET /api/v1/demo/posts: feed fictício publicado.
- GET /api/v1/demo/profile: perfil fictício e plataformas.

Os endpoints demo não aceitam escrita. O perfil mysql não disponibiliza esses endpoints. Esta versão não deve ser publicada como serviço real sem autenticação, autorização, limites e revisão de dependências.

## App

```powershell
cd apps/mobile
npm ci
npm start
```

O app consulta a API em http://127.0.0.1:8080. Para Android por USB ou emulador, com ADB instalado:

```powershell
adb reverse tcp:8080 tcp:8080
adb reverse tcp:8081 tcp:8081
```

Isso permite manter a API no loopback do computador. O dispositivo deve estar autorizado no ADB. Para outra topologia, copiar .env.example para .env e ajustar EXPO_PUBLIC_API_URL. Não colocar segredos em EXPO_PUBLIC_*. Preferir USB/ADB; não expor MySQL ao celular.

Com ambiente Android compatível configurado, gerar a development build:

```powershell
npm run android:build
```

O bundle JavaScript não é um APK. A instalação e validação em aparelho/emulador ainda precisam ser realizadas. O alvo é Android; suporte web instalado apenas para compatibilidade e inspeção não altera a proposta para um site.

## MySQL separado

Executar data/mysql/create-database.sql no MySQL local como administrador. Criar usuário exclusivo com senha local e acesso apenas a saferide.*. A aplicação não usa root. Definir no processo, sem versionar senha:

```powershell
$env:SPRING_PROFILES_ACTIVE='mysql'
$env:DB_USER='saferide_app'
$env:DB_HOST='127.0.0.1'
$env:DB_PORT='3306'
# Defina DB_PASSWORD localmente por um mecanismo seguro.
mvn -f services/api/pom.xml spring-boot:run
```

Spring não carrega .env automaticamente; services/api/.env.example é uma referência. O Flyway cria as tabelas apenas no banco saferide. Perfil mysql não insere exemplos. Não combinar mysql e demo. O schema inicial contém perfis, plataformas, vínculo de plataformas, posts, comentários, fontes e ocorrências. IDs ainda são fornecidos explicitamente pois não há operações de cadastro; geração de IDs, autenticação, geometrias, revisão completa e índices espaciais pertencem às próximas migrações.

## Verificação

```powershell
mvn -f services/api/pom.xml test
cd apps/mobile
npm run typecheck
npm run lint
npx expo install --check
npx expo export --platform android
```

Testes da API cobrem conexão, exclusão de registros pendentes/ocultos e recusa de escrita nas rotas demo. Falha da API gera mensagem e botão para tentar novamente; o app não inventa dados offline. Ainda falta teste visual no dispositivo e integração completa React Native → HTTP → API → banco no aparelho.

## Fontes técnicas

[Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/), [Expo Router](https://docs.expo.dev/router/installation/) e [development builds](https://docs.expo.dev/develop/development-builds/introduction/).

## Validação desta entrega — 02/11/2026

- Três testes de integração da API passaram no perfil demo com H2.
- TypeScript, ESLint e compatibilidade Expo passaram.
- Exportação Android/Hermes concluída; isso não valida instalação ou aparência no aparelho.
- MySQL 8.0.41 separado inicializado em localhost:3307, banco saferide e usuário exclusivo. API respondeu UP por HTTP usando esse banco e Flyway criou as oito tabelas (incluindo histórico), sem inserir dados demo.
- A conexão inicialmente falhou no isolamento de execução; validada ao executar os processos locais fora desse isolamento, sem alterar firewall ou outros bancos.
- Revisão React aplicada: componentes fora de funções de renderização, estado de erro/carregamento, cancelamento de requisições, descarte após desmontagem e controles acessíveis. Teste visual no dispositivo continua pendente.

Os arquivos privados da instalação desta máquina ficam em work/ fora do repositório, incluindo mysql-local.ps1 (variáveis locais), mysql-client.ini e mysql-saferide/ (dados). Não compartilhar essa pasta. Para outros integrantes, usar o procedimento de criação acima com suas próprias credenciais. Não há dependência de infraestrutura da Advanced.

Na instalação local desta máquina, work/start-saferide-mysql.ps1 inicia a instância dedicada (não executar novamente se já estiver ativa). Carregar work/mysql-local.ps1 no PowerShell define as variáveis para a API. Essas configurações privadas não são incluídas no ZIP nem no Git.

A instalação npm reportou 24 avisos de severidade moderada na árvore de dependências. A revisão das correções permanece pendente; não foi aplicado upgrade forçado que pudesse quebrar a compatibilidade do Expo. Esta base é local, não uma release para produção.
