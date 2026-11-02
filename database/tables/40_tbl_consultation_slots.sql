-- Table 40 of 58: tbl_consultation_slots

CREATE TABLE tbl_consultation_slots (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    specialist_id UUID NOT NULL REFERENCES tbl_users(id),
    hospital_id   BIGINT REFERENCES mst_hospitals(id),
    slot_start    TIMESTAMPTZ NOT NULL,
    slot_end      TIMESTAMPTZ NOT NULL,
    mode          consult_mode NOT NULL DEFAULT 'VIDEO',
    is_booked     BOOLEAN NOT NULL DEFAULT FALSE,
    created_by    UUID NOT NULL REFERENCES tbl_users(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_slot_range CHECK (slot_end > slot_start),
    CONSTRAINT ex_no_overlapping_slots EXCLUDE USING gist
        (specialist_id WITH =, tstzrange(slot_start, slot_end) WITH &&)
);

-- indexes
CREATE INDEX idx_slots_specialist        ON tbl_consultation_slots (specialist_id, slot_start);
