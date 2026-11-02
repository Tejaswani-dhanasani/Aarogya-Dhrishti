-- Table 12 of 58: mst_specialties

CREATE TABLE mst_specialties (
    id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code      TEXT NOT NULL UNIQUE,
    name_en   TEXT NOT NULL,
    name_te   TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);
