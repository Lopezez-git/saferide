CREATE TABLE sr_ride_feedback (
 ride_id VARCHAR(36) NOT NULL,
 category VARCHAR(20) NOT NULL,
 created_at TIMESTAMP NOT NULL,
 PRIMARY KEY (ride_id,category),
 FOREIGN KEY (ride_id) REFERENCES sr_simulated_ride(id)
);
