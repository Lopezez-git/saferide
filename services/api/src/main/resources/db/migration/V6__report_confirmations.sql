CREATE TABLE sr_report_confirmation (
    report_id VARCHAR(36) NOT NULL,
    account_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    PRIMARY KEY (report_id, account_id),
    FOREIGN KEY (report_id) REFERENCES sr_report(id),
    FOREIGN KEY (account_id) REFERENCES sr_account(id)
);
