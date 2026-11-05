# Histórico policial da SSP-SP

Implementado no protótipo: o card Segurança consulta `GET /api/v1/safety/police?latitude=...&longitude=...` e calcula contagens por distância geográfica de até 1.000 metros do ponto selecionado, inclusive quando escolhido por toque no mapa. As notícias e os relatos da comunidade permanecem separados.

## Fonte e alcance

Arquivo público da SSP-SP: [Veículos subtraídos, 2026](https://www.ssp.sp.gov.br/assets/estatistica/transparencia/baseDados/veiculosSub/VeiculosSubtraidos_2026.xlsx), disponível no [portal de consultas](https://www.ssp.sp.gov.br/estatistica/consultas).

A importação inicial contém fatos de janeiro a setembro de 2026, localizados no município de São Paulo. É uma fotografia importada da publicação oficial, consultável localmente, e não uma conexão ao sistema operacional da polícia. A base bruta de transparência, conforme sua metodologia, não equivale aos indicadores estatísticos oficiais da SSP. Não cobre todos os crimes, subnotificação ou ocorrências sem coordenadas válidas. Zero nessa consulta não significa região segura.

## Tratamento reproduzível

- Extrair a aba de dados pela identificação dos cabeçalhos, sem depender da ordem das abas.
- Usar NOME_DELEGACIA + ANO_BO + NUM_BO para identificar o BO; selecionar a última VERSAO antes de contar. Esses identificadores não são exportados.
- Selecionar veículos marcados como roubados ou furtados. Excluir os classificados como localizados/entregues. Um BO com mais de um veículo é contado uma única vez.
- Usar CIDADE e coordenadas do local do fato, nunca o endereço da delegacia de registro. Filtrar São Paulo e datas dos fatos no ano do arquivo, sem datas futuras.
- Usar `HORA_OCORRENCIA` (hora declarada do fato), nunca `DATAHORA_REGISTRO_BO`. Converter a fração de dia do Excel na hora cheia de 00 a 23, no horário de São Paulo. Hora ausente, inválida ou conflitante permanece como desconhecida; esses BOs continuam no total, mas não são atribuídos a uma hora.
- Excluir coordenadas ausentes/inválidas e BOs com posições/meses conflitantes. Arredondar coordenadas a quatro casas e agregar por mês e natureza. Há imprecisão de alguns metros no limite do raio.
- Exportar apenas coordenadas agregadas, mês, categoria, hora cheia e contagem, com origem, hash do arquivo e momento de importação. Não exportar nomes, placas, endereços, números de BO ou minuto do fato.

Na importação foram lidas 154.159 linhas, resultando em 24.861 BOs elegíveis; 86 BOs com localização/mês ambíguos foram excluídos. Dos elegíveis, 7.326 ficaram sem hora confiável. O diagnóstico também registra 2.675 linhas candidatas excluídas por data/coordenadas; esse número é de linhas, não de BOs.

## Atualização

A fotografia agregada está incluída em `services/api/src/main/resources/data/ssp-vehicles.json`. A API usa essa base como fallback e recarrega automaticamente o agregado externo atualizado. A consulta não depende de a SSP estar online; o indicador de defasagem considera o fim do período dos fatos (mais de 60 dias), não a data do download. O período dos fatos aparece sempre, independentemente dessa marca.

Para baixar novamente a publicação e reconstruir a base, na raiz do repositório:

```powershell
python scripts/import_ssp_vehicles.py --year 2026 --output services/api/src/main/resources/data/ssp-vehicles.json
```

A rotina automática consulta a fonte ao iniciar o backend e a cada 6 horas. A base externa é recarregada nas consultas, sem reiniciar. Veja [atualização automática](15-atualizacao-dados-publicos.md). O comando substitui o agregado somente depois de uma importação válida; falha de download não apaga a base anterior. O XLSX bruto fica em diretório temporário, fora do repositório. Python usa somente biblioteca padrão.

## Validação

Testes cobrem deduplicação, última versão, veículos recuperados, coordenadas ambíguas/inválidas, distância em metros, isolamento do raio e acesso pelo navegador. Teste real inicial: ponto do Morumbi Shopping (-23.6234167, -46.6985436), 97 BOs elegíveis em 1 km (94 furto, 3 roubo). Trata-se do entorno, não de 97 fatos dentro do shopping nem de risco previsto.

Nesse ponto, 76 BOs têm hora declarada e 21 têm horário desconhecido. Cada hora pode ser consultada separadamente, mas o aplicativo mostra somente a hora atual. A concentração de BOs não é uma taxa de risco: faltam denominadores por circulação de veículos e comparação metodologicamente equivalente entre horários e lugares.


### Leitura no aplicativo

O card mostra a contagem histórica da faixa selecionada, o raio e o período. A divisão por natureza e o total completo aparecem no detalhe. A cor é neutra porque a contagem bruta não é uma nota de perigo. No exemplo do Morumbi Shopping, o geocodificador situa o estabelecimento na Vila Cordeiro; a contagem é do entorno de 1 km, não do shopping ou de todo o bairro Morumbi. Sem denominador de circulação e comparação válida entre áreas, não classificamos a região como segura ou perigosa.

O aplicativo recebe do backend a hora atual em `America/Sao_Paulo`, mostra o histórico dessa hora assim que o local é selecionado e atualiza ao mudar a hora. Não há seletor manual. A hora atual filtra fatos **históricos**, não monitora crimes em andamento. BOs sem horário aparecem separados; zero na hora atual não quer dizer ausência de risco. A interface mostra origem, período dos fatos e data da importação.
