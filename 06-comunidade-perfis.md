# Comunidade e perfis profissionais

## Escopo confirmado

O SafeRide terá uma comunidade de profissionais de transporte e entregas. O perfil deve informar para quais plataformas a pessoa trabalha, permitindo múltipla seleção, pois um mesmo profissional pode atuar em vários serviços.

Os dados são autodeclarados e editáveis. Selecionar Uber ou iFood não comprova vínculo profissional e não exige acesso à conta externa. Este documento descreve o planejamento; o recurso ainda não foi implementado.

## Campos do perfil

| Campo | Comportamento planejado |
| --- | --- |
| Nome público | Nome exibido na comunidade; separado do email de autenticação |
| Plataformas em que trabalha | Múltipla seleção, com opções iniciais Uber, 99, iFood, Rappi e Mercado Livre / entregas |
| Outra plataforma | Permite informar nome curto, tratado como texto, sem links ou HTML |
| Trabalho independente | Opção que pode coexistir com plataformas selecionadas |
| Tipo de atividade | Transporte de passageiros, entregas ou ambos |
| Veículo | Carro, moto, bicicleta ou outro; formato de seleção a validar com o grupo |

Plataformas, atividade e veículo são informações separadas: não inferir automaticamente a atividade ou veículo a partir da plataforma. O catálogo inicial pode ser ajustado antes da implementação. Cadastro simples, obrigatoriedade dos campos e limites de texto ainda serão definidos; informação ausente deve aparecer como não informada, nunca ser inventada.

## Exemplo de perfil

Exemplo fictício:

> João Silva — Carro  
> Atividade: passageiros e entregas  
> Plataformas: Uber · 99 · iFood  
> Informações profissionais autodeclaradas.

No formulário de edição, explicar que esses campos serão visíveis à comunidade. O usuário pode adicionar e remover plataformas ou atualizar sua atividade e veículo. A alteração deve refletir no perfil público e nas identificações do autor nas contribuições existentes. Não alterar o texto ou a localização dos relatos ao editar o perfil.

## Apresentação na comunidade

Identificar o autor com nome público e plataformas em que trabalha para contextualizar a experiência. Usar etiquetas de texto, sem selos de verificação ou indicação de parceria com as empresas. Exibir atividade e veículo no perfil; nas contribuições, manter uma apresentação compacta com acesso ao perfil.

Isso se aplica aos relatos, publicações do feed e comentários previstos no MVP, reutilizando o mesmo componente de identificação do autor. Não expor email, identificador de autenticação ou credenciais nas respostas públicas.

## Modelo de dados e API propostos

| Entidade | Dados |
| --- | --- |
| Perfil | ID, usuário autenticado, nome público, atividade, veículo, trabalho independente, outra plataforma e atualização |
| Plataforma | ID estável, nome de exibição e status ativo |
| Plataforma do perfil | Perfil e plataforma; combinação única para evitar duplicação |

As plataformas selecionadas formam uma relação muitos para muitos. Não guardar senhas, tokens ou contas de Uber, iFood ou outros serviços. O cadastro existente de perfil da arquitetura é ampliado, não duplicado.

| Método e rota | Finalidade |
| --- | --- |
| GET /api/v1/plataformas | Retornar catálogo habilitado para seleção |
| GET /api/v1/perfis/{id} | Retornar apenas os campos públicos do perfil |
| GET /api/v1/me/perfil | Consultar o próprio perfil autenticado |
| PATCH /api/v1/me/perfil | Atualizar campos permitidos do próprio perfil; lista de plataformas enviada substitui a seleção anterior |

O Spring Boot valida opções do catálogo, limites de texto e autorização. O ID do proprietário vem da sessão, não de um campo livre enviado pelo cliente. A atualização deve ser atômica; omitir um campo mantém seu valor, enviar lista vazia remove todas as plataformas. Remover “Outra plataforma” também limpa o texto correspondente. Rejeitar IDs desconhecidos, sem gravar parte da alteração.

O React Native fornece seleção múltipla acessível, campos independentes, aviso de visibilidade e confirmação de salvamento. Preservar os valores digitados quando houver erro e não apresentar como salva uma alteração que falhou. Contas demonstrativas usam dados fictícios, com identificação de demonstração.

## Critérios de aceite

- Selecionar Uber e iFood ao mesmo tempo, salvar e recuperar as duas opções após recarregar.
- Editar ou remover plataformas sem alterar atividade, veículo ou relatos existentes.
- Aceitar trabalho independente junto com uma plataforma e permitir informar outra plataforma.
- Impedir que um usuário altere o perfil de outro ou atribua a si mesmo o papel de moderador.
- Exibir apenas campos públicos e indicar que as informações são autodeclaradas.
- Refletir a edição na identificação do autor, sem criar cópias desatualizadas do perfil nas contribuições.
- Tratar seleção vazia, valor desconhecido e falha da API sem perda silenciosa de dados.
- Permitir operação por toque, leitor de tela e teclado externo quando disponível.

## Feed, publicações e comentários

O escopo confirmado inclui conversas gerais da profissão, dicas e dúvidas, além de experiências sobre locais e trajetos. O profissional pode participar sem associar sua publicação a um lugar. O feed reúne motoristas e entregadores de diferentes plataformas na mesma comunidade.

### Funcionamento planejado para o MVP local

- Feed em ordem de criação, do mais recente para o mais antigo, com paginação e botão “Carregar mais”. Editar ou comentar não muda essa ordem.
- Publicação de texto com categoria obrigatória e localização opcional. Categorias iniciais: condições da via, trânsito e interdições, pontos de apoio, dicas de trabalho, dúvidas da profissão e conversa geral.
- Exibir nome e plataformas do autor, categoria, data, indicação de edição e quantidade de comentários visíveis. Atividade e veículo ficam acessíveis pelo perfil.
- Comentários em lista simples, do mais antigo para o mais recente, paginados, sem respostas aninhadas. Comentar exige conta autenticada, assim como publicar, editar, excluir e denunciar.
- Consulta do feed e comentários pode ser pública, conforme a proposta de acesso do produto. Não exigir uma plataforma específica para participar.
- Filtros por categoria e cidade/região. Sem filtro territorial, incluir também publicações sem localização; com esse filtro, mostrar apenas as associadas à área selecionada e explicar esse comportamento.
- Autor pode editar e excluir seu próprio conteúdo. Moderador pode ocultar e restaurar conteúdo, com motivo e histórico; não pode reescrever o texto do autor.
- Denúncias de publicações e comentários entram na fila de moderação. A denúncia sozinha não confirma falsidade nem oculta automaticamente o conteúdo.

Parâmetros iniciais propostos: publicação de 1 a 2.000 caracteres, comentário de 1 a 1.000 caracteres, descontando espaços nas extremidades; páginas de 20 itens, com máximo de 50 na API. Validar no Spring Boot e apresentar os limites no React Native. Texto simples, sem HTML. Valores podem ser ajustados pelo grupo antes da implementação.

### Jornada e exemplos

1. Usuário abre a comunidade, lê publicações e escolhe uma categoria ou região, se desejar.
2. Entra na conta, seleciona uma categoria, escreve e opcionalmente associa uma localização.
3. Publica e abre a conversa; outro participante pode comentar.
4. O autor pode corrigir seu texto ou excluí-lo; qualquer participante autenticado pode denunciar conteúdo inadequado.

Exemplos fictícios: “Como vocês organizam as pausas durante o trabalho?” em conversa geral; “Que cuidados ajudam a conservar a bicicleta nas entregas?” em dúvidas; “Minha dica é conferir os pontos de retirada antes de sair” em dicas de trabalho. Nenhum exige localização. Um relato de buracos pode indicar rua e data da observação.

### Publicação no feed e informação no mapa

Proposta de moderação: publicações e comentários válidos aparecem imediatamente no feed, sujeitos a denúncia e revisão posterior. Os relatos territoriais continuam exigindo revisão antes de entrar no mapa. Esta diferença deve ser explícita na interface e no backend.

Uma publicação localizada não cria automaticamente um marcador ou ocorrência. No MVP, o autor usa o fluxo existente de envio de relato para propor informação ao mapa; não haverá conversão automática do post. Conversas gerais e comentários não alimentam o painel territorial. Moderação e plataformas do perfil não equivalem a comprovação factual.

Quando o texto tratar de uma situação temporária observada, permitir informar a data da observação separadamente da data de publicação, rejeitando datas futuras. Se não informada, mostrar “Data da observação não informada”. Uma publicação antiga não confirma a situação atual, e comentários não renovam sua data.

### Estados, exclusão e permissões

Publicações e comentários têm estados publicado, oculto pela moderação e excluído pelo autor. Conteúdo oculto ou excluído não aparece nas consultas comuns, inclusive por acesso direto ao ID. Ocultar ou excluir a publicação também impede a leitura e novos comentários nela; comentários existentes não são expostos isoladamente. Restaurar a publicação não restaura comentários que tenham sido ocultados ou excluídos individualmente.

Autor pode editar conteúdo publicado; editar não torna visível um conteúdo ocultado. Exclusão pelo autor não pode ser revertida pelo moderador. A política de retenção e remoção definitiva deve ser definida antes de um piloto público. Registrar ações de moderação com acesso restrito.

Não permitir exposição de dados pessoais de passageiros ou terceiros, assédio, discriminação, spam ou acusações pessoais. A interface explica as regras e oferece denúncia. Limites de frequência serão configurados no servidor; definir seus valores na implementação.

### Modelo e contratos propostos do feed

| Entidade | Dados essenciais |
| --- | --- |
| Publicação comunitária | ID, autor, texto, categoria, localização opcional, data da observação opcional, criação, edição e estado |
| Comentário | ID, publicação, autor, texto, criação, edição e estado |
| Denúncia | Solicitante, alvo (relato, publicação ou comentário), motivo, criação e status |
| Ação de moderação | Moderador, alvo, ação, motivo e data |

Publicação comunitária é distinta de notícia coletada e de relato territorial. Ampliar denúncia e ação de moderação existentes, garantindo exatamente um alvo válido e preservando o fluxo dos relatos.

| Método e rota proposta | Finalidade |
| --- | --- |
| GET /api/v1/publicacoes | Feed com filtros e cursor estável por criação e ID |
| POST /api/v1/publicacoes | Criar publicação com autor obtido da sessão |
| GET /api/v1/publicacoes/{id} | Consultar publicação visível |
| PATCH ou DELETE /api/v1/publicacoes/{id} | Editar ou excluir como proprietário |
| GET ou POST /api/v1/publicacoes/{id}/comentarios | Listar comentários visíveis ou criar comentário |
| PATCH ou DELETE /api/v1/comentarios/{id} | Editar ou excluir como proprietário |
| POST /api/v1/denuncias | Denunciar um alvo válido com motivo |
| POST /api/v1/moderacao/acoes | Ocultar ou restaurar com motivo; exclusivo de moderador |

Validar autorização e visibilidade no servidor em toda operação, inclusive comentário de publicação oculta e leitura direta. Nome e plataformas vêm do perfil público, sem email. Contagem de comentários inclui apenas os visíveis. Aplicar paginação também aos comentários, mantendo a ordem por criação e ID.

O React Native apresenta carregamento, lista vazia, falha com nova tentativa e confirmação de exclusão. Em falha de envio, preservar o rascunho e não afirmar que publicou. Desabilitar envio enquanto houver requisição pendente; usar chave de idempotência por tentativa lógica no servidor para evitar duplicatas em reenvios após perda de resposta. A demonstração usa contas e conversas fictícias identificadas.

### Critérios de aceite do feed

- Publicar uma dúvida sem localização e encontrá-la no feed após recarregar.
- Publicar uma dica e uma observação territorial; filtrar por categoria e região com comportamento explícito para posts sem local.
- Comentar com outro usuário, recarregar e conferir autor, plataformas, ordem e contagem.
- Editar e excluir conteúdo próprio; impedir alterações de terceiros por chamadas diretas à API.
- Denunciar, ocultar e restaurar como moderador, registrando motivo; usuário comum não executa essas ações.
- Não expor post oculto ou seus comentários por ID; não criar marcador no mapa ao publicar ou comentar.
- Paginar sem repetir itens e tratar erros sem perder o texto digitado ou duplicar envios.
- Demonstrar o fluxo em celular, com toque e leitor de tela.

### Fora do escopo inicial

Fotos, curtidas ou reação “Foi útil”, seguidores, chat privado, respostas aninhadas, notificações em tempo real, ranking e filtros por plataforma ficam para evolução posterior. O feed e os comentários fazem parte do planejamento do MVP; ainda não foram implementados.
