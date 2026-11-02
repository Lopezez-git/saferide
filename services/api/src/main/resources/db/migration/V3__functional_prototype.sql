CREATE TABLE sr_account (
 id VARCHAR(36) PRIMARY KEY, email VARCHAR(200) NOT NULL UNIQUE, password_hash VARCHAR(100) NOT NULL,
 name VARCHAR(80) NOT NULL, activity VARCHAR(60) NOT NULL, vehicle VARCHAR(40) NOT NULL,
 platforms VARCHAR(200) NOT NULL, role VARCHAR(20) NOT NULL DEFAULT 'MEMBER', created_at TIMESTAMP NOT NULL
);
CREATE TABLE sr_session (
 token_hash VARCHAR(64) PRIMARY KEY, account_id VARCHAR(36) NOT NULL, expires_at TIMESTAMP NOT NULL,
 FOREIGN KEY(account_id) REFERENCES sr_account(id)
);
CREATE TABLE sr_post (
 id VARCHAR(36) PRIMARY KEY, author_id VARCHAR(36) NOT NULL, category VARCHAR(30) NOT NULL,
 body VARCHAR(2000) NOT NULL, created_at TIMESTAMP NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED',
 FOREIGN KEY(author_id) REFERENCES sr_account(id)
);
CREATE INDEX idx_sr_post_date ON sr_post(status,created_at);
CREATE TABLE sr_comment (
 id VARCHAR(36) PRIMARY KEY, post_id VARCHAR(36) NOT NULL, author_id VARCHAR(36) NOT NULL,
 body VARCHAR(1000) NOT NULL, created_at TIMESTAMP NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED',
 FOREIGN KEY(post_id) REFERENCES sr_post(id), FOREIGN KEY(author_id) REFERENCES sr_account(id)
);
CREATE INDEX idx_sr_comment_post ON sr_comment(post_id,status);
CREATE TABLE sr_report (
 id VARCHAR(36) PRIMARY KEY, author_id VARCHAR(36) NOT NULL, title VARCHAR(120) NOT NULL,
 body VARCHAR(1000) NOT NULL, category VARCHAR(30) NOT NULL,
 latitude DOUBLE NOT NULL, longitude DOUBLE NOT NULL, observed_at TIMESTAMP NOT NULL,
 created_at TIMESTAMP NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
 reviewed_at TIMESTAMP NULL, valid_until TIMESTAMP NULL,
 FOREIGN KEY(author_id) REFERENCES sr_account(id),
 CHECK(latitude BETWEEN -90 AND 90), CHECK(longitude BETWEEN -180 AND 180)
);
CREATE INDEX idx_sr_report_status ON sr_report(status,valid_until);
CREATE TABLE sr_moderation (
 id VARCHAR(36) PRIMARY KEY, moderator_id VARCHAR(36) NOT NULL, target_id VARCHAR(36) NOT NULL,
 action VARCHAR(30) NOT NULL, reason VARCHAR(300) NOT NULL, created_at TIMESTAMP NOT NULL,
 FOREIGN KEY(moderator_id) REFERENCES sr_account(id)
);
CREATE TABLE sr_news (
 id VARCHAR(64) PRIMARY KEY, title VARCHAR(300) NOT NULL, url VARCHAR(1000) NOT NULL,
 source VARCHAR(120) NOT NULL, published_at VARCHAR(100), collected_at TIMESTAMP NOT NULL
);
