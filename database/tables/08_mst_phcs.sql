-- Table 8 of 58: mst_phcs

CREATE TABLE mst_phcs (
    id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mandal_id BIGINT NOT NULL REFERENCES mst_mandals(id),
    code      TEXT NOT NULL UNIQUE,
    name_en   TEXT NOT NULL,
    name_te   TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);
