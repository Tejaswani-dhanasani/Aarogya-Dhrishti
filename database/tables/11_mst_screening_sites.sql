-- Table 11 of 58: mst_screening_sites

CREATE TABLE mst_screening_sites (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    village_id  BIGINT REFERENCES mst_villages(id),
    facility_id BIGINT REFERENCES mst_facilities(id),
    code        TEXT NOT NULL UNIQUE,
    name_en     TEXT NOT NULL,
    name_te     TEXT,
    site_type   TEXT NOT NULL DEFAULT 'CAMP',    -- CAMP / PHC / HOME / MOBILE_UNIT
    is_active   BOOLEAN NOT NULL DEFAULT TRUE
);
