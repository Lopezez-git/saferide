CREATE TABLE professional_profile (
 id BIGINT PRIMARY KEY, display_name VARCHAR(80) NOT NULL, activity VARCHAR(60) NOT NULL,
 vehicle VARCHAR(40) NOT NULL, demo BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE platform (id VARCHAR(30) PRIMARY KEY, name VARCHAR(60) NOT NULL);
CREATE TABLE profile_platform (
 profile_id BIGINT NOT NULL, platform_id VARCHAR(30) NOT NULL,
 PRIMARY KEY(profile_id, platform_id),
 FOREIGN KEY(profile_id) REFERENCES professional_profile(id),
 FOREIGN KEY(platform_id) REFERENCES platform(id)
);
CREATE TABLE community_post (
 id BIGINT PRIMARY KEY, author_id BIGINT NOT NULL, category VARCHAR(30) NOT NULL,
 body VARCHAR(2000) NOT NULL, created_at TIMESTAMP NOT NULL,
 status VARCHAR(30) NOT NULL, demo BOOLEAN NOT NULL DEFAULT FALSE,
 FOREIGN KEY(author_id) REFERENCES professional_profile(id)
);
CREATE INDEX idx_post_status_date ON community_post(status, created_at);
CREATE TABLE community_comment (
 id BIGINT PRIMARY KEY, post_id BIGINT NOT NULL, author_id BIGINT NOT NULL,
 body VARCHAR(1000) NOT NULL, created_at TIMESTAMP NOT NULL, status VARCHAR(30) NOT NULL,
 FOREIGN KEY(post_id) REFERENCES community_post(id),
 FOREIGN KEY(author_id) REFERENCES professional_profile(id)
);
CREATE TABLE information_source (
 id BIGINT PRIMARY KEY, name VARCHAR(120) NOT NULL, kind VARCHAR(30) NOT NULL,
 url VARCHAR(500), demo BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE occurrence (
 id BIGINT PRIMARY KEY, source_id BIGINT NOT NULL, title VARCHAR(120) NOT NULL,
 description VARCHAR(1000) NOT NULL, category VARCHAR(40) NOT NULL,
 latitude DECIMAL(10,7) NOT NULL, longitude DECIMAL(10,7) NOT NULL,
 precision_label VARCHAR(60) NOT NULL, occurred_at TIMESTAMP NOT NULL,
 reviewed_at TIMESTAMP NOT NULL, status VARCHAR(30) NOT NULL,
 demo BOOLEAN NOT NULL DEFAULT FALSE,
 FOREIGN KEY(source_id) REFERENCES information_source(id),
 CHECK(latitude BETWEEN -90 AND 90), CHECK(longitude BETWEEN -180 AND 180)
);
CREATE INDEX idx_occurrence_status ON occurrence(status);
