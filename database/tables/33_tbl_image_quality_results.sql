-- Table 33 of 58: tbl_image_quality_results

CREATE TABLE tbl_image_quality_results (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_id       UUID NOT NULL REFERENCES tbl_screening_photos(id),
    checker_version TEXT NOT NULL,
    status         quality_status NOT NULL,
    reason         TEXT CHECK (reason IN ('invalid_image','blurry','underexposed','overexposed','glare')),
    blur_score     NUMERIC(10,3),
    brightness_mean NUMERIC(6,2),
    glare_ratio    NUMERIC(5,4),
    checked_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_quality_reason CHECK ((status = 'ACCEPTABLE' AND reason IS NULL)
                                     OR (status = 'RECAPTURE' AND reason IS NOT NULL))
);

-- indexes
CREATE INDEX idx_quality_photo           ON tbl_image_quality_results (photo_id);
