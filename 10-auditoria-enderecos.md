# Auditoria de endereços e usabilidade — 02/11/2026

Amostra consultada na API real: Paulista, Avenida Paulista, Avenida Paulista 1578, Rua Augusta 1500 e Praça da Sé. Esta auditoria verifica seleção e apresentação dos dados; não certifica todos os endereços da base.

## Problemas e correções

- Paulista agora é um atalho explícito para Avenida Paulista, conforme a decisão do projeto.
- A busca numerada retornava primeiro um título com 1578 e endereço estruturado com 1600. O número estruturado tem prioridade: o MASP em Av. Paulista 1578 aparece antes; o resultado divergente fica marcado como aproximado.
- Pesquisas por rua filtram candidatos por logradouro quando existe correspondência, evitando usar só o nome do bairro ou estabelecimento como prova de correspondência da rua.
- O endereço exibido conserva logradouro e número, mesmo quando o nome do resultado já contém a rua.
- Duplicatas próximas (mesmo nome/endereço, menos de 150 metros) são agrupadas. Pontos distantes e entradas distintas permanecem disponíveis.
- Resultados indicam número presente na base, aproximação ou trecho de via. Isso não equivale a verificar fisicamente a entrada do imóvel.
- A origem e o destino mostram também o endereço selecionado. O botão Ver trajeto reabre os detalhes. Tocar no mapa com um percurso calculado não substitui o destino; use Marcar origem/destino para editar. Durante uma busca, o primeiro toque no mapa fecha as sugestões.

## Verificação

Testes unitários cobrem prioridade do número estruturado, exclusão de ruas irrelevantes, endereço completo, duplicatas e limites geográficos. Validação no navegador: Paulista retorna Avenida Paulista; consulta de 1578 mostra o MASP primeiro; seleção e cálculo de percurso, reabertura dos detalhes preservando os pontos.

## Limitações

Photon/OpenStreetMap pode ter dados ausentes ou conflitantes. Sem número, o ponto retornado pode representar um trecho da avenida; não é necessariamente o destino final desejado. GPS e ergonomia com teclado físico do celular precisam ser validados em aparelho real.
