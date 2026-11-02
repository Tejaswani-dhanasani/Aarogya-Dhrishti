-- Table 26 of 58: tbl_user_language_preferences

CREATE TABLE tbl_user_language_preferences (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL UNIQUE REFERENCES tbl_users(id),
    language_id BIGINT NOT NULL REFERENCES mst_languages(id),
    font_scale  NUMERIC(3,2) NOT NULL DEFAULT 1.00 CHECK (font_scale BETWEEN 0.75 AND 2.00),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- triggers
CREATE TRIGGER trg_tbl_user_language_preferences_updated_at BEFORE UPDATE ON tbl_user_language_preferences
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
