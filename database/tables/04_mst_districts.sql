-- Table 4 of 58: mst_districts

CREATE TABLE mst_districts (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code       TEXT NOT NULL UNIQUE,
    name_en    TEXT NOT NULL,
    name_te    TEXT,
    state_name TEXT NOT NULL DEFAULT 'Andhra Pradesh',
    is_active  BOOLEAN NOT NULL DEFAULT TRUE
);
