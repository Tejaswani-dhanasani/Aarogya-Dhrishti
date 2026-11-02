-- Table 9 of 58: mst_hospitals

CREATE TABLE mst_hospitals (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    district_id BIGINT NOT NULL REFERENCES mst_districts(id),
    code        TEXT NOT NULL UNIQUE,
    name_en     TEXT NOT NULL,
    name_te     TEXT,
    level       TEXT,                            -- CHC / AH / DH / TERTIARY
    is_active   BOOLEAN NOT NULL DEFAULT TRUE
);
