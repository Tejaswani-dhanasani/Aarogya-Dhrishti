-- Table 7 of 58: mst_villages

CREATE TABLE mst_villages (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    gram_panchayat_id BIGINT NOT NULL REFERENCES mst_gram_panchayats(id),
    code              TEXT NOT NULL UNIQUE,
    name_en           TEXT NOT NULL,
    name_te           TEXT,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE
);

-- indexes
CREATE INDEX idx_villages_gp             ON mst_villages (gram_panchayat_id);
