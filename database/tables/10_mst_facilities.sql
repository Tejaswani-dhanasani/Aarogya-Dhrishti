-- Table 10 of 58: mst_facilities

CREATE TABLE mst_facilities (                    -- unified facility used for assignments/reporting
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    district_id   BIGINT NOT NULL REFERENCES mst_districts(id),
    facility_type facility_type NOT NULL,
    phc_id        BIGINT REFERENCES mst_phcs(id),
    hospital_id   BIGINT REFERENCES mst_hospitals(id),
    code          TEXT NOT NULL UNIQUE,
    name_en       TEXT NOT NULL,
    name_te       TEXT,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_facility_one_parent CHECK (phc_id IS NULL OR hospital_id IS NULL)
);

-- indexes
CREATE INDEX idx_facilities_district     ON mst_facilities (district_id, facility_type);
