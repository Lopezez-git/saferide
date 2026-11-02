# Verificação do protótipo — 02/11/2026

## Fluxos verificados no navegador com MySQL

- Cadastro de conta fictícia pela interface, restauração da sessão e edição das plataformas Uber/iFood.
- Publicação e comentário persistidos, com autor e plataformas visíveis.
- Mapa real carregado; seleção de origem Sé e destino MASP/Paulista.
- OSRM retornou percurso de aproximadamente 3,8 km e 7 minutos na verificação. É estimativa, não promessa de duração.
- Relato fictício enviado e mantido pendente fora da consulta pública.
- Conta de apresentação habilitada como moderadora por administração local; revisão registrada e relato publicado.
- Atualização do mapa e nova consulta de trajeto retornaram um relato próximo ao percurso.
- Simulação de caixinha exibiu o relato, com aviso de simulação dentro do SafeRide.
- RSS público coletado automaticamente, com pelo menos uma notícia elegível persistida. Não houve geolocalização automática ou alerta derivado dela.
- API reiniciada durante a verificação: conta e dados mantidos no MySQL; sessão restaurada na prévia.

## Testes automatizados

DemoApiTest verifica três cenários legados. PrototypeFlowTest verifica três fluxos compostos de conta/comunidade/propriedade/logout, relato/moderação/expiração e entradas inválidas. O banco dos testes é H2 em modo MySQL; migração V3 também foi aplicada no MySQL local real.

TypeScript e ESLint verificam a interface; exportação Android valida o bundle, não uma instalação. Teste físico Android e sobreposição real continuam pendentes.

## Dados de teste

Conta e publicações de apresentação são fictícias. O relato aprovado tem DEMONSTRAÇÃO no título e explicita que não representa uma ocorrência real. Esses dados ficam apenas no banco local, não são seeds de produção nem exportados com credenciais para o Git. Notícias preservam origem e datas e não se confundem com exemplos fictícios da apresentação.

A revisão visual identificou RSS regional desatualizado. O coletor foi substituído por Agência Brasil e busca RSS do Google Notícias com veículos permitidos. NewsDateTest cobre rejeição de data antiga, futura e desconhecida. Notícias salvas fora da janela de sete dias são excluídas também na leitura.
