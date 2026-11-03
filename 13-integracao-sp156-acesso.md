# Solicitações do SP156 para Trânsito e acesso

## Fonte e recorte

Usamos o [CSV oficial do SP156 do 3º trimestre de 2026](https://dados.prefeitura.sp.gov.br/dataset/dados-do-sp156/resource/f67fcc12-8da4-485f-92a3-d2af40cc771e), atualizado em **13/10/2026**, para complementar o card **Trânsito e acesso**. O arquivo contém pedidos feitos à Prefeitura, não um monitoramento do trânsito em tempo real. A consulta usa um raio de 1 km ao redor do ponto selecionado em São Paulo.

O importador aceita somente serviços com relação direta ao contexto da via: **alagamento**, **queda de árvore ou galho**, **risco de queda de árvore**, **avaliação de circulação e acesso de veículos e pessoas** e **reparos em pontes, viadutos e túneis**. Pedidos de tapa-buraco permanecem no card Pavimento. Outros serviços do SP156 não entram automaticamente no card.

O snapshot local guarda latitude e longitude aproximadas, rua, número, serviço, categoria, data de abertura e finalização e status publicado. Não guarda o CSV bruto, dados pessoais nem protocolo. O script valida datas, coordenadas e a área piloto antes de incluir um pedido.

```powershell
python scripts/import_sp156_access.py --output services/api/src/main/resources/data/sp156-access.json
```

O backend carrega esse arquivo ao iniciar e expõe `GET /api/v1/access/requests?latitude=...&longitude=...`. A resposta traz contagem total, contagens por categoria e status, até oito solicitações recentes, período, fonte e data de publicação. Pedidos publicados com os mesmos detalhes são agrupados apenas na lista; a contagem original é preservada. A atualização do CSV ainda é manual; após 45 dias da publicação, a API marca o snapshot como pendente de atualização.

## Interpretação

No raio de 1 km do Morumbi Shopping, o snapshot inicial contém **18 solicitações**: 6 sobre circulação/acesso, 1 sobre alagamento, 8 sobre árvore ou galho e 3 sobre reparos estruturais. Na publicação de 13/10/2026, 4 constavam abertas, 2 em andamento e 12 finalizadas. Esses números descrevem **pedidos e seus status naquela data**. Não significam 18 impedimentos atuais, nem que os seis pedidos não finalizados ainda afetam a circulação. Pedidos podem se repetir; um problema pode existir sem solicitação. A localização do pedido também não define o trecho exato afetado.

Notícias locais e relatos comunitários revisados aparecem separadamente no mesmo card, com suas próprias datas e fontes. O SafeRide não infere que uma interdição está ativa a partir desses dados. Para alertas atuais de bloqueio seria necessária outra fonte validada, com início, término e localização do trecho.
