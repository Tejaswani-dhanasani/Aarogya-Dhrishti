-- Table 43 of 58: tbl_appointment_status_history

CREATE TABLE tbl_appointment_status_history (            -- APPEND-ONLY; exactly one parent
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_consultation_id    UUID REFERENCES tbl_video_consultations(id),
    hospital_appointment_id  UUID REFERENCES tbl_hospital_appointments(id),
    from_status_id           BIGINT REFERENCES mst_appointment_statuses(id),
    to_status_id             BIGINT NOT NULL REFERENCES mst_appointment_statuses(id),
    changed_by               UUID NOT NULL REFERENCES tbl_users(id),
    reason                   TEXT,
    changed_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_one_appointment_parent CHECK (num_nonnulls(video_consultation_id, hospital_appointment_id) = 1)
);

-- indexes
CREATE INDEX idx_appt_hist_video         ON tbl_appointment_status_history (video_consultation_id);
CREATE INDEX idx_appt_hist_hosp          ON tbl_appointment_status_history (hospital_appointment_id);

-- triggers
CREATE TRIGGER trg_tbl_appointment_status_history_append_only BEFORE UPDATE OR DELETE ON tbl_appointment_status_history
    FOR EACH ROW EXECUTE FUNCTION fn_block_mutation();
