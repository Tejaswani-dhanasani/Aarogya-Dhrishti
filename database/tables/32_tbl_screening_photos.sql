-- Table 32 of 58: tbl_screening_photos

CREATE TABLE tbl_screening_photos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    screening_id    UUID NOT NULL,
    patient_id      UUID NOT NULL,
    view_type       oral_view NOT NULL,
    private_key     TEXT NOT NULL UNIQUE,                -- object-store key, never a public URL
    checksum_sha256 CHAR(64) NOT NULL,
    mime_type       TEXT NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/webp')),
    size_bytes      INT NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760),
    width_px        INT CHECK (width_px > 0),
    height_px       INT CHECK (height_px > 0),
    status          photo_status NOT NULL DEFAULT 'UPLOADED',
    captured_by     UUID NOT NULL REFERENCES tbl_users(id),
    captured_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    idempotency_key TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- composite FK: a photo can only belong to a screening of the SAME patient
    FOREIGN KEY (screening_id, patient_id) REFERENCES tbl_screenings (id, patient_id),
    UNIQUE (screening_id, checksum_sha256),               -- no duplicate image on retry
    UNIQUE (captured_by, idempotency_key),
    CONSTRAINT ck_photo_key_private CHECK (private_key !~* '^(https?:)?//')
);

-- indexes
CREATE INDEX idx_photos_screening        ON tbl_screening_photos (screening_id);

-- triggers
CREATE TRIGGER trg_photo_requires_consent BEFORE INSERT ON tbl_screening_photos
    FOR EACH ROW EXECUTE FUNCTION fn_require_consent_for_photo();
