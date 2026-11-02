-- Table 15 of 58: mst_exposure_types

CREATE TABLE mst_exposure_types (
    id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code      TEXT NOT NULL UNIQUE,
    name_en   TEXT NOT NULL,
    name_te   TEXT,
    category  TEXT NOT NULL DEFAULT 'TOBACCO',   -- TOBACCO / ARECA / ALCOHOL / OTHER
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);
