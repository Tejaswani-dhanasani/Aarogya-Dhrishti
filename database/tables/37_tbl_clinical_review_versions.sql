-- Table 37 of 58: tbl_clinical_review_versions

CREATE TABLE tbl_clinical_review_versions (              -- APPEND-ONLY, filled automatically by trigger
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id  UUID NOT NULL REFERENCES tbl_clinical_reviews(id),
    version_no INT NOT NULL,
    snapshot   JSONB NOT NULL,
    edited_by  UUID NOT NULL REFERENCES tbl_users(id),
    edited_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (review_id, version_no)
);

-- triggers
CREATE TRIGGER trg_tbl_clinical_review_versions_append_only BEFORE UPDATE OR DELETE ON tbl_clinical_review_versions
    FOR EACH ROW EXECUTE FUNCTION fn_block_mutation();
