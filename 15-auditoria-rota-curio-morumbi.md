# Auditoria da rota: Avenida Curió → Morumbi Shopping

Consulta feita em 3 de novembro de 2026 no protótipo local. O ponto de partida solicitado é a **Avenida Curió, Campanário, Diadema**. A busca também encontra trechos chamados Avenida Curió em Taboão (Diadema) e Cursino (São Paulo); selecionar apenas o nome da avenida pode mudar a rota.

| Ponto | Coordenadas usadas | Precisão |
| --- | --- | --- |
| Avenida Curió, Campanário | -23.6633585, -46.6201785 | Representa um trecho da via, não um número específico. |
| Morumbi Shopping, Av. Roque Petroni Júnior, 1089 | -23.6234167, -46.6985436 | Ponto cadastrado do estabelecimento. |

O backend consultou o OSRM público com perfil de carro. Para esses dois pontos, retornou **14,18 km e cerca de 24 min**, com 532 coordenadas na geometria. A consulta direta ao serviço de rotas retornou o mesmo resultado. O percurso começa na Avenida Curió, passa pela Avenida Brasília, Avenida Paranapanema e Avenida Maria Leonor e chega à região da Avenida Roque Petroni Júnior.

O OSRM encaixa o destino em uma via acessível a carros cerca de **75 m** distante do ponto cadastrado do shopping. Isso não comprova que esse seja o melhor portão de entrada ou o ponto de embarque do shopping; deve ser confirmado no local. A duração do OSRM **não inclui trânsito ao vivo** e pode divergir da estimativa da Uber, 99 ou iFood.

Como comparação de desambiguação, a Avenida Curió de Taboão gerou 15,21 km e 23,7 min; a de Cursino, 11,27 km e 18,6 min. Essas estimativas partem de pontos diferentes. Para uma viagem real, o motorista deve escolher o trecho correto e, quando possível, o número ou ponto exato de origem.

Os detalhes do trajeto identificam a origem aproximada, mostram a duração como estimativa sem trânsito ao vivo e explicam a distância entre a via final e o ponto cadastrado do destino.
