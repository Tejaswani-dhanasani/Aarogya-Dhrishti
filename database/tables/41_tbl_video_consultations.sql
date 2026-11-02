-- Table 41 of 58: tbl_video_consultations

CREATE TABLE tbl_video_consultations (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id       UUID NOT NULL REFERENCES tbl_referrals(id),
    slot_id           UUID NOT NULL UNIQUE REFERENCES tbl_consultation_slots(id),
    specialist_id     UUID NOT NULL REFERENCES tbl_users(id),
    requested_by      UUID NOT NULL REFERENCES tbl_users(id),
    status_id         BIGINT NOT NULL REFERENCES mst_appointment_statuses(id),
    provider          TEXT,
    room_ref          TEXT,                                -- opaque id; tokens are minted per join, short-lived
    token_expires_at  TIMESTAMPTZ,
    started_at        TIMESTAMPTZ,
    ended_at          TIMESTAMPTZ,
    recording_enabled BOOLEAN NOT NULL DEFAULT FALSE,      -- no recording by default
    attendance        attendance_status NOT NULL DEFAULT 'PENDING',
    clinician_outcome TEXT,                                -- stored separately from attendance
    idempotency_key   TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (requested_by, idempotency_key),
    CONSTRAINT ck_room_not_public_link CHECK (room_ref IS NULL OR room_ref !~* '^(https?:)?//'),
    CONSTRAINT ck_call_times CHECK (ended_at IS NULL OR started_at IS NULL OR ended_at >= started_at)
);

-- indexes
CREATE INDEX idx_video_referral          ON tbl_video_consultations (referral_id);
CREATE INDEX idx_video_specialist        ON tbl_video_consultations (specialist_id);

-- triggers
CREATE TRIGGER trg_tbl_video_consultations_updated_at BEFORE UPDATE ON tbl_video_consultations
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
