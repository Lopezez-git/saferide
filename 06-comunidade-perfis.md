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

Isso se aplica aos relatos previstos no MVP. Caso publicações de feed e comentários sejam aprovados, reutilizar o mesmo componente de identificação do autor. Não expor email, identificador de autenticação ou credenciais nas respostas públicas.

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

O React fornece seleção múltipla acessível, campos independentes, aviso de visibilidade e confirmação de salvamento. Preservar os valores digitados quando houver erro e não apresentar como salva uma alteração que falhou. Contas demonstrativas usam dados fictícios, com identificação de demonstração.

## Critérios de aceite

- Selecionar Uber e iFood ao mesmo tempo, salvar e recuperar as duas opções após recarregar.
- Editar ou remover plataformas sem alterar atividade, veículo ou relatos existentes.
- Aceitar trabalho independente junto com uma plataforma e permitir informar outra plataforma.
- Impedir que um usuário altere o perfil de outro ou atribua a si mesmo o papel de moderador.
- Exibir apenas campos públicos e indicar que as informações são autodeclaradas.
- Refletir a edição na identificação do autor, sem criar cópias desatualizadas do perfil nas contribuições.
- Tratar seleção vazia, valor desconhecido e falha da API sem perda silenciosa de dados.
- Permitir operação por teclado e em tela de celular.

## Funções da comunidade ainda em discussão

Feed, publicações gerais, comentários, reação “Foi útil” e filtros por plataforma foram propostos, mas ainda precisam de definição de escopo. Chat privado, seguidores e fotos também não estão aprovados para a primeira entrega. Os relatos vinculados ao mapa e sua moderação continuam conforme o plano do produto; informar uma plataforma no perfil não aumenta automaticamente a confiabilidade de um relato.
