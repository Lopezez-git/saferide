# Solicitações de tapa-buraco do SP156

O protótipo consulta pedidos públicos de **tapa-buraco** num raio de 1 km do ponto selecionado. São solicitações de serviço, não uma vistoria da via nem a quantidade de buracos existentes. A API `GET /api/v1/pavement/requests?latitude=...&longitude=...` devolve contagem, status, datas e até 12 pedidos recentes com endereço aproximado.

## Fonte escolhida

O [conjunto oficial Dados do SP156](https://dados.prefeitura.sp.gov.br/dataset/dados-do-sp156) publica CSVs trimestrais. Para o protótipo, usamos o [CSV do 3º trimestre de 2026](https://dados.prefeitura.sp.gov.br/dataset/dados-do-sp156/resource/f67fcc12-8da4-485f-92a3-d2af40cc771e), com publicação atualizada em **13/10/2026**. Ele inclui latitude, longitude, data de abertura, data de finalização, serviço, status, logradouro e número. A Prefeitura esclarece que pedidos podem ser duplicados para o mesmo problema e que serviços podem ocorrer mesmo sem pedido.

A camada WFS `geoportal:sac_tapa_buraco` do GeoSampa foi testada, mas os registros encontrados no entorno piloto eram de 2020. Por isso ela não foi usada para sugerir condições atuais. A fonte integrada é o CSV SP156 mais recente verificado. O download bruto não é versionado.

## Importação e consulta

```powershell
python scripts/import_sp156_pavement.py --output services/api/src/main/resources/data/sp156-pavement.json
```

O importador lê o CSV em fluxo, seleciona apenas serviços cujo nome contém `Tapa-buraco`, limita as datas ao trimestre do recurso, valida coordenadas em São Paulo e grava um agregado JSON sem identificadores de protocolo ou dados pessoais. Se a fonte falhar ou não houver pedidos elegíveis, mantém o arquivo anterior. O atualizador automático descobre o CSV do trimestre mais recente no catálogo oficial e a API recarrega a fotografia externa sem reinício.

Nesta importação, 484.232 linhas foram lidas e 29.958 solicitações elegíveis ficaram no agregado, com abertura entre 01/07 e 30/09/2026. O raio de 1 km do Morumbi Shopping contém **66 pedidos**: 34 `Aberto` e 32 `Finalizada` na publicação de 13/10. Isso não quer dizer 66 buracos distintos nem 34 problemas ainda ativos hoje.

O CSV não fornece um identificador de protocolo nessa publicação. Por isso as contagens representam linhas de solicitações, sem deduplicação entre pessoas ou pedidos. Na lista do app, registros com os mesmos campos publicados são agrupados visualmente e identificados; o total bruto não é alterado.

O app mostra a data da publicação e distingue os pedidos de relatos da comunidade e notícias. Uma solicitação `Finalizada` indica encerramento do protocolo, sem comprovar a qualidade atual do reparo. **Zero pedidos também não significa pavimento bom.** A base não cobre denúncias que ninguém abriu, pedidos sem coordenadas válidas nem serviços executados sem solicitação. O campo `stale` é ativado 45 dias após a data da fonte; o backend verifica novas publicações a cada 6 horas. Veja [atualização automática](15-atualizacao-dados-publicos.md).
