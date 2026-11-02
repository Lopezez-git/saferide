INSERT INTO professional_profile VALUES (1, 'Alex · perfil fictício', 'Transporte e entregas', 'Moto', TRUE);
INSERT INTO platform VALUES ('uber','Uber'), ('99','99'), ('ifood','iFood');
INSERT INTO profile_platform VALUES (1,'uber'), (1,'ifood');
INSERT INTO community_post VALUES
(1,1,'DICA','Exemplo: antes de sair, confira pneus, iluminação e os documentos necessários.','2026-11-02 09:00:00','PUBLISHED',TRUE),
(2,1,'DUVIDA','Exemplo de conversa: como vocês organizam as pausas entre entregas?','2026-11-02 10:00:00','PUBLISHED',TRUE),
(3,1,'DICA','Conteúdo oculto para verificar a moderação.','2026-11-02 11:00:00','HIDDEN',TRUE);
INSERT INTO community_comment VALUES (1,2,1,'Exemplo: separo uma pausa no meio do turno.','2026-11-02 10:10:00','PUBLISHED');
INSERT INTO information_source VALUES (1,'Fonte de demonstração — não é uma notícia real','DEMO',NULL,TRUE);
INSERT INTO occurrence VALUES
(1,1,'Obra na Rua Exemplo','Bloqueio parcial fictício para demonstrar o painel.','OBRA',-23.5505,-46.6333,'Ponto fictício','2026-11-02 08:00:00','2026-11-02 08:30:00','PUBLISHED',TRUE),
(2,1,'Pavimento irregular','Registro fictício de irregularidade no pavimento.','PAVIMENTO',-23.5520,-46.6360,'Ponto fictício','2026-11-02 09:00:00','2026-11-02 09:30:00','PUBLISHED',TRUE),
(3,1,'Registro pendente','Não deve ser exibido.','OBRA',-23.5510,-46.6320,'Ponto fictício','2026-11-02 09:00:00','2026-11-02 09:30:00','PENDING',TRUE);
