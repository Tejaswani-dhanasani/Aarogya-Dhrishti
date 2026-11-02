-- Table 24 of 58: tbl_user_facility_assignments

CREATE TABLE tbl_user_facility_assignments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES tbl_users(id),
    facility_id BIGINT NOT NULL REFERENCES mst_facilities(id),
    is_primary  BOOLEAN NOT NULL DEFAULT FALSE,
    valid_from  DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_to    DATE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, facility_id, valid_from),
    CONSTRAINT ck_assignment_dates CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

-- indexes
CREATE INDEX idx_ufa_user                ON tbl_user_facility_assignments (user_id);
CREATE INDEX idx_ufa_facility            ON tbl_user_facility_assignments (facility_id);
