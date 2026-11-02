-- Table 21 of 58: mst_notification_templates

CREATE TABLE mst_notification_templates (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code        TEXT NOT NULL,
    language_id BIGINT NOT NULL REFERENCES mst_languages(id),
    channel     notification_channel NOT NULL DEFAULT 'IN_APP',
    subject     TEXT,
    body        TEXT NOT NULL,                   -- must contain NO diagnosis / sensitive detail
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (code, language_id, channel)
);
