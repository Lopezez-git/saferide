# Atualização automática de segurança e pavimento

Com o perfil `prototype`, o Spring Boot executa `scripts/refresh_public_data.py` 10 segundos após iniciar e a cada 6 horas depois da conclusão da execução anterior. É necessário Python 3 no PATH, acesso HTTPS às fontes e manter o backend ligado. Não requer bibliotecas Python adicionais.

- SSP: baixa a publicação anual oficial de veículos subtraídos do ano corrente. Se o ano ainda não existir (HTTP 404), tenta o ano anterior. Mantém deduplicação, filtro da cidade e horário do fato. Não abrange todos os crimes.
- SP156: consulta `package_show` do catálogo Dados do SP156, seleciona o CSV do trimestre mais recente e usa as datas daquele trimestre. A data de edição de um arquivo antigo não o torna mais recente que um trimestre novo. Suporta CSV UTF-8 e Windows-1252, vírgula e ponto e vírgula.
- Os arquivos brutos ficam em diretório temporário. Os agregados são escritos atomicamente em `data/private/public-data/`, fora do Git. A API percebe a alteração na próxima consulta e recarrega a base sem recompilar.
- Falha de rede, arquivo vazio/inválido ou regressão de período preserva a base anterior. Cada fonte é independente. Sem agregado externo válido, usa o arquivo empacotado no projeto.
- O hash evita reprocessar conteúdo idêntico. `importedAt` só muda quando há uma importação; `lastCheckedAt` registra consulta bem-sucedida. A data da fonte e o período dos fatos continuam distintos. Baixar novamente não rejuvenesce os dados.

## Operação

Execução imediata, na raiz do repositório:

```sh
python scripts/refresh_public_data.py
```

Diagnóstico: `data/private/public-data/refresh-status.json` guarda sucesso/erro por fonte, última consulta bem-sucedida e última tentativa com erro. `refresh.log` contém a saída da última execução agendada. O processo tem limite de 30 minutos. As consultas do aplicativo continuam atendidas durante a importação.

Configuração: `SAFERIDE_PYTHON` define o executável Python; `SAFERIDE_PUBLIC_DATA_DIR` define o diretório persistente de agregados; `SAFERIDE_PUBLIC_DATA_REFRESH_ENABLED=false` desativa a coleta. A propriedade Spring `saferide.public-data.refresh-ms` define o intervalo (padrão 21600000). Ao distribuir um JAR, disponibilize também a pasta `scripts` na raiz de execução e Python instalado.

## Limites

As fontes publicam históricos; o agendamento não produz dados em tempo real. SP156 continua representando solicitações, não inspeções atuais. A base de pavimento usa o trimestre mais recente publicado, sem somar trimestres que poderiam sobrepor pedidos. A integração de trânsito/acesso possui seu próprio agregado e não é alterada por esta rotina.

Na verificação de 05/11/2026, a SSP permaneceu até setembro de 2026 e o CSV mais recente do SP156 foi o terceiro trimestre de 2026, com atualização de 13/10/2026.
