CREATE TABLE sr_simulated_ride (
 id VARCHAR(36) PRIMARY KEY,
 owner_key VARCHAR(36) NOT NULL,
 status VARCHAR(20) NOT NULL,
 payload TEXT NOT NULL,
 created_at TIMESTAMP NOT NULL,
 updated_at TIMESTAMP NOT NULL,
 finished_at TIMESTAMP NULL
);
CREATE INDEX idx_simulated_ride_owner ON sr_simulated_ride(owner_key,created_at);
