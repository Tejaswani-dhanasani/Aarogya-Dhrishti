-- Table 13 of 58: mst_consent_purposes

CREATE TABLE mst_consent_purposes (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code        TEXT NOT NULL UNIQUE,            -- SCREENING, IMAGE_CAPTURE, AI_RESEARCH, TELECONSULT
    name_en     TEXT NOT NULL,
    name_te     TEXT,
    text_en     TEXT NOT NULL,
    text_te     TEXT,
    version     TEXT NOT NULL DEFAULT 'v1',
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE
);
