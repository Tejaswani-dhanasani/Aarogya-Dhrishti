-- Table 5 of 58: mst_mandals

CREATE TABLE mst_mandals (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    district_id BIGINT NOT NULL REFERENCES mst_districts(id),
    code        TEXT NOT NULL UNIQUE,
    name_en     TEXT NOT NULL,
    name_te     TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

-- indexes
CREATE INDEX idx_mandals_district        ON mst_mandals (district_id);
