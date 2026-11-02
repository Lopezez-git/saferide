# Caixinha flutuante e alertas do SafeRide

## Proposta adotada

O SafeRide será apresentado como solução complementar integrada à experiência de plataformas como Uber, 99 e iFood. A interface escolhida é uma caixinha flutuante sobre o aplicativo de ofertas, semelhante na forma de exibição a ferramentas auxiliares de motoristas. A finalidade é fornecer contexto territorial, não calcular ganhos.

Uma sobreposição no dispositivo não é, por si só, uma integração oficial. Para a faculdade, a premissa é uma integração autorizada simulada: ofertas e dados de conexão são fictícios e identificados. Não existe parceria, autorização efetiva ou conexão real implementada com essas empresas. Este documento é planejamento, não uma funcionalidade pronta.

## Experiência visual

- Cartão compacto com identidade SafeRide sobre a área do mapa, sem imitar um aviso oficial da plataforma.
- Título da situação, resumo curto, tipo da fonte, data da observação e indicação de atualização; detalhes mostram as referências completas.
- Permitir mover, minimizar, fechar e desativar a sobreposição. Não bloquear botões de aceitar/recusar, navegação ou diálogos do sistema.
- Mostrar um destaque e a quantidade de outros registros relevantes; “Ver detalhes” abre a consulta no SafeRide. Não prometer que a oferta ficará disponível durante essa consulta.
- O cartão não aceita nem recusa corridas, não altera a rota e não faz decisões pelo profissional.
- A comunidade permanece no app SafeRide; publicações e comentários não aparecem automaticamente como alertas. O acesso à comunidade deve ser separado da decisão rápida sobre a oferta.

Exemplo fictício:

> SafeRide · Demonstração
> Obra próxima ao destino
> Bloqueio parcial informado na Rua Exemplo.
> Comunicado público fictício · observado hoje às 08h
> Ver detalhes · Minimizar · Fechar

## Categorias e linguagem

Notícia é uma origem da informação, não uma categoria de incidente. Diferenciar comunicado público, notícia jornalística e relato comunitário, mantendo fonte e datas.

| Situação | Apresentação proposta | Limite |
| --- | --- | --- |
| Pavimento | Buracos ou irregularidades relatadas no trecho | Não extrapolar para toda a região |
| Obras e interdições | Bloqueio informado, trecho e período quando conhecido | Prazo vencido não prova liberação |
| Alagamentos e obstáculos | Registro de água na pista, árvore caída ou obstrução | Informar data; não assumir persistência |
| Acesso, retirada e embarque | Entrada alterada ou dificuldade de acesso localizada | Não expor residências ou pessoas |
| Assalto e outras ocorrências de segurança | Notícia de ocorrência registrada na região, com data e fonte | Nunca converter notícia passada em “assalto em andamento” |

Não classificar bairro como perigoso ou seguro, não gerar pontuação de risco e não prometer prevenção de crimes. Não expor vítimas, suspeitos, placas ou acusações pessoais. O serviço não é monitoramento policial nem atendimento de emergência.

Para assaltos: notícia e relato exigem revisão humana antes do alerta, inclusive relevância, data, localização e remoção de dados pessoais. Usar “relato comunitário revisado” quando essa for a origem; revisão não comprova o fato. Alegação individual sem informação suficiente permanece pendente. Não exigir boletim de ocorrência ou documentos pessoais no protótipo.

Se a fonte mencionar apenas um bairro, usar contexto regional e explicitar a precisão; não inventar ponto na rua nem afirmar que o incidente ocorreu no trajeto. Data desconhecida impede destaque temporal como atual. Notícias recém-publicadas sobre fatos antigos mantêm a data do acontecimento.

## Da informação ao alerta

1. Coletar notícias automaticamente conforme o módulo de notícias, ou receber um relato territorial autenticado.
2. Validar procedência, datas, região e conteúdo. Agrupar evidências de um mesmo acontecimento sem duplicar alertas.
3. Moderador revisa localização, redação, situação e próxima revisão. Notícias na lista regional não são automaticamente elegíveis para a caixinha.
4. Receber uma oferta identificada e consultar registros revisados relacionados à origem, destino e ao percurso disponível.
5. Devolver contexto e exibir somente se a oferta ainda for a mesma e estiver válida.
6. Remover o cartão associado quando a oferta terminar, mudar ou for dispensada. Resposta antiga nunca substitui a informação de uma oferta nova.

Conversas gerais do feed, comentários e quantidade de curtidas não confirmam incidentes. Relatos retirados, rejeitados ou pendentes ficam fora da consulta; encerrados ficam no histórico. Relatos comunitários seguem seu ciclo de revisão; ocorrências de notícias seguem os estados de 05-integracao-noticias.md. O cartão normaliza a apresentação sem apagar essas diferenças.

Ao vencer o prazo de revisão, retirar o registro do destaque de situações atuais. Pode aparecer nos detalhes como informação anterior com situação atual desconhecida, sem contagem como incidente atual. Encerrar requer evidência; o relógio sozinho não confirma resolução. Para assaltos, o fato é histórico desde o início: a janela de relevância controla sua exibição, não a duração de um suposto crime em andamento. Janelas por categoria serão definidas pelo grupo antes da implementação.

Contradições materiais em uma ocorrência suspendem seu destaque até revisão. Não somar republicações como confirmações independentes. A prioridade proposta considera relevância espacial, atualidade e impacto informado no deslocamento; assaltos não ganham prioridade automática. Pesos e limites finais ainda precisam ser definidos, sem criar uma nota de segurança.

## Estados da caixinha e falhas

| Estado | Comportamento |
| --- | --- |
| Consultando | Indicador discreto; a oferta continua utilizável |
| Contexto disponível | Mostrar resumo revisado com fonte, datas e precisão |
| Sem registros | “Sem informações disponíveis para este percurso”; não significa ausência de problemas |
| Origem/destino insuficientes | “Dados insuficientes para consultar esta oferta”; não adivinhar endereço |
| Sem geometria de rota | Consultar pontos/regiões conhecidos, identificando cobertura parcial; não afirmar cobertura do percurso inteiro |
| Coleta indisponível, API disponível | Consultar base salva com aviso e datas originais; não destacar informação vencida como atual |
| API indisponível ou timeout | “Contexto indisponível no momento”; não reutilizar resultado de outra oferta |
| Oferta encerrada ou substituída | Cancelar/ignorar consulta anterior e remover seu cartão |
| Permissão negada/revogada | Não criar sobreposição; consulta continua disponível dentro do app |

Proposta inicial: até 3 segundos por consulta de oferta, configurável após medição; não aguardar coleta de notícias nesse caminho. Oferta expirada invalida a resposta mesmo que chegue dentro do timeout. Reconsulta é explícita e somente para oferta ainda válida. O fallback de demonstração exige ativação explícita e aviso permanente; nunca introduzir incidentes fictícios em uma consulta apresentada como real.

## Implementação proposta

React Native cuida do app, perfis, comunidade e detalhes. Um módulo Android em Kotlin gerencia a janela flutuante e seu ciclo de vida; Spring Boot consulta e organiza o contexto. Android é o alvo da prova de conceito de sobreposição. Não prometer o mesmo mecanismo no iOS; compatibilidade e ferramenta de build devem ser validadas.

O Android oferece TYPE_APPLICATION_OVERLAY com autorização SYSTEM_ALERT_WINDOW. O sistema pode controlar sua visibilidade; testar no dispositivo escolhido, inclusive telas que impeçam sobreposição. A permissão de exibir sobre outros apps não concede acesso à oferta. Referências: [janelas Android](https://developer.android.com/reference/android/view/WindowManager.LayoutParams#TYPE_APPLICATION_OVERLAY) e [permissão de sobreposição](https://developer.android.com/reference/android/Manifest.permission#SYSTEM_ALERT_WINDOW).

No protótipo, um aplicativo de ofertas de teste fornece os eventos ao SafeRide e permite demonstrar uma sobreposição real entre apps. Não basta desenhar um cartão dentro da mesma tela e chamá-lo de sobreposição entre aplicativos. A primeira etapa técnica valida o módulo nativo, permissões, execução enquanto outro app está visível e limitações do Android. O mecanismo de serviço necessário será definido conforme a versão alvo, sem contornar restrições do sistema.

Em um produto real, contrato com o parceiro definiria acesso e campos disponíveis. Leitura de tela, acessibilidade, captura/OCR e automação de toques não fazem parte desta primeira entrega. Simular autorização não concede autorização real. As imagens conceituais de Uber são apenas referências fictícias; o aplicativo de teste terá identidade própria e identificação acadêmica.

### Contrato de consulta proposto

Reutilizar POST /api/v1/contexto/consulta, sem criar outro motor de contexto. Entrada: requestId, offerId, versão da oferta, validade, origem, destino e geometria opcional, com indicação de demonstração. Validar coordenadas e tamanho da geometria. Autorizar o solicitante; no protótipo usar sessão demonstrativa, sem embutir segredos de parceiro no app.

Resposta: mesmos IDs e versão, instante da consulta, cobertura, estado de atualização e alertas com ID, origem (notícia/relato), categoria, resumo, fonte, datas, precisão, situação e necessidade de revisão. Se faltarem campos obrigatórios, retornar erro explícito. Usar identificadores sintéticos no demo; não persistir ofertas ou percursos pessoais por padrão.

O cliente compara requestId, offerId, versão e validade com a oferta ativa antes de exibir. Fechar manualmente o cartão impede que uma resposta tardia o reabra para a mesma oferta. Registrar apenas diagnósticos mínimos, sem texto de tela, dados de passageiros ou coordenadas pessoais em logs.

## Critérios de aceite da demonstração

- Oferta fictícia recebida dispara consulta e cartão sobre o app de teste, com fonte, datas e identificação demo.
- Mover, minimizar e fechar funciona; aceitar/recusar no simulador continua acessível, sem clique automático pelo SafeRide.
- Trocar rapidamente de oferta e atrasar respostas não exibe dados da oferta anterior; fechar impede reabertura tardia.
- Permissão negada ou revogada, API indisponível, timeout e falta de rota têm estados próprios.
- Notícia antiga de assalto aparece como ocorrência passada, nunca como incidente em andamento ou nota de risco do bairro.
- Informação limitada a bairro não produz marcador exato; conteúdo pendente, retirado ou contraditório não vira destaque.
- Coleta indisponível preserva datas e alerta de atualização; exemplo fictício não é inserido silenciosamente.
- Demonstrar o fluxo com toque e leitor de tela no Android escolhido, incluindo retorno ao app e desativação da sobreposição.

## Pendências

Definir cidade, fontes para cada categoria, responsáveis pela revisão, janelas temporais, prioridade final, versão Android, execução do módulo nativo e protocolo de eventos do simulador. A comunidade, notícias automáticas e fallback permanecem no escopo. Integrações reais e publicação em lojas exigem estudo posterior.
