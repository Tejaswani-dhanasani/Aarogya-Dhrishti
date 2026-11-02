-- Table 54 of 58: tbl_notifications

CREATE TABLE tbl_notifications (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_user_id UUID REFERENCES tbl_users(id),
    patient_id        UUID REFERENCES tbl_patients(id),
    template_id       BIGINT NOT NULL REFERENCES mst_notification_templates(id),
    channel           notification_channel NOT NULL DEFAULT 'IN_APP',
    language_id       BIGINT REFERENCES mst_languages(id),
    status            notification_status NOT NULL DEFAULT 'PENDING',
    payload           JSONB NOT NULL DEFAULT '{}'::jsonb,  -- no diagnosis or sensitive details
    related_task_id   UUID REFERENCES tbl_followup_tasks(id),
    scheduled_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at           TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_notification_recipient CHECK (num_nonnulls(recipient_user_id, patient_id) >= 1)
);

-- indexes
CREATE INDEX idx_notif_recipient         ON tbl_notifications (recipient_user_id, status);
CREATE INDEX idx_notif_patient           ON tbl_notifications (patient_id);
