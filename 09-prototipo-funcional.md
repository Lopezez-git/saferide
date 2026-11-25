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

## Atualização: localização do dispositivo

Adicionados consulta de localização mediante permissão, ponto azul, círculo de precisão, centralização e uso como origem dentro da região piloto. TypeScript e ESLint passaram. Verificação isolada do adaptador web cobriu retorno de coordenadas, navegador sem suporte, permissão recusada e timeout; script Leaflet passou pela validação de sintaxe. A prévia integrada não retornou coordenadas reais durante a verificação; não houve validação do GPS em aparelho Android/iOS. Nenhuma posição fictícia foi usada para representar a posição do usuário.


## Painel do local no mapa

Ao selecionar um lugar, o painel prioriza segurança, pavimento e relatos revisados em até 1 km, com distância aproximada, data e fonte. Relatos fora da validade são excluídos. Exemplos identificados como demonstração/fictícios não entram nos resumos das condições reais. Ausência de informações não representa segurança ou pavimento em bom estado.

As três primeiras notícias disponíveis da coleta regional aparecem com link à fonte; não são tratadas como notícias da rua selecionada. A vinculação geográfica de notícias ainda não está implementada.

O formulário de relato só abre sob demanda. Foram retirados deste painel os atalhos de pontos fixos, filtros e simulação de oferta. O trajeto permanece como informação secundária quando origem e destino estão selecionados. O teste foi feito no navegador; validação física no celular continua pendente.

## Auditoria de 24 de novembro de 2026

| Fluxo | Resultado observado |
|---|---|
| Oferta e simulação web | A oferta de R$ 11,03 mostrou embarque em 6 min e estimativas brutas de R$ 1,39/km, R$ 50,99/h e R$ 0,85/min. Os divisores incluem ambos os trechos e usam metros e segundos antes do arredondamento. A viagem foi concluída e o feedback “Buraco” apareceu no histórico. |
| Histórico | Uma segunda corrida concluída de R$ 32,70 mostrou 12,55 km e o feedback “Via em mau estado”. Outra tentativa ficou cancelada e seu valor foi excluído dos recebimentos. O histórico diferencia itens retornados pelo servidor, pendências e cópias mantidas no dispositivo. |
| Comparação de rotas | Do Museu de Arte de São Paulo ao Aeroporto de Congonhas, o serviço retornou 9,4 km em 15 min e 9,3 km em 16 min. A troca de opção atualizou o traçado e o tempo no mapa. Também foi exercitado o caso de um único caminho. As contagens abrangem a faixa de 300 m de cada rota. |
| Conta e comunidade | Em uma instância isolada do MySQL 8.4, três contas de teste exercitaram cadastro, login, logout, publicação, comentário, moderação e confirmação. Confirmar duas vezes preservou uma confirmação. O voto do autor foi recusado. Uma confirmação de outra conta levou a pontuação do autor de 1 para 2, a retirada do voto a reduziu para 1 e a retirada do relato pela moderação a reduziu para 0. |
| Notícias | A auditoria detectou data de coleta inválida no navegador com H2. Após a correção, a matéria consultada mostrou publicação em 22/11 e coleta em 24/11. O contrato dos campos de data também foi verificado no MySQL. |
| Verificações | 36 testes da API, 25 do aplicativo e 10 dos importadores aprovados. TypeScript e ESLint aprovados. Exportações web e do bundle Android concluídas. |

O grupo ainda não dispõe de credenciais para ofertas de plataformas, chave TomTom ou aparelho Android para validação. Trânsito, recebimento de ofertas reais e exibição da notificação sobre outro app em aparelho físico continuam pendentes de verificação. O bundle Android precisa de um build nativo para instalação no celular.
