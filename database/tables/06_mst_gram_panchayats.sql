-- Table 6 of 58: mst_gram_panchayats

CREATE TABLE mst_gram_panchayats (
    id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mandal_id BIGINT NOT NULL REFERENCES mst_mandals(id),
    code      TEXT NOT NULL UNIQUE,
    name_en   TEXT NOT NULL,
    name_te   TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- indexes
CREATE INDEX idx_gp_mandal               ON mst_gram_panchayats (mandal_id);
