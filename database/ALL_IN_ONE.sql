-- COMBINED (generated from the individual files, same order)
BEGIN;

-- >>> 00_extensions_and_types.sql
-- Run first. Extensions and ENUM types.
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE user_status          AS ENUM ('ACTIVE','SUSPENDED','DISABLED');
CREATE TYPE sex_type             AS ENUM ('FEMALE','MALE','OTHER','UNDISCLOSED');
CREATE TYPE facility_type        AS ENUM ('PHC','HOSPITAL','SCREENING_SITE','DISTRICT_OFFICE');
CREATE TYPE case_state           AS ENUM ('DRAFT','CONSENTED','SCREENED','AWAITING_CLINICIAN','REVIEWED',
                                          'REFERRAL_PLANNED','APPOINTED','ASSESSED','DIAGNOSTICS_PENDING',
                                          'RESULT_REVIEWED','CARE_LINKED','CLOSED',
                                          'RESCHEDULED','MISSED','DECLINED','LOST_CONTACT');
CREATE TYPE finding_type         AS ENUM ('SYMPTOM','EXAM');
CREATE TYPE oral_view            AS ENUM ('CHEEK_LINING','TONGUE','PALATE','GUMS','FLOOR_OF_MOUTH','OTHER');
CREATE TYPE photo_status         AS ENUM ('UPLOADED','QUALITY_FAILED','ACCEPTED','SUPERSEDED');
CREATE TYPE quality_status       AS ENUM ('ACCEPTABLE','RECAPTURE');
CREATE TYPE ai_status            AS ENUM ('QUEUED','COMPLETED','FAILED','UNAVAILABLE');
CREATE TYPE review_decision      AS ENUM ('NO_ACTION','FOLLOW_UP','RESCREEN','REFER');
CREATE TYPE referral_status      AS ENUM ('PLANNED','SENT','ACCEPTED','COMPLETED','DECLINED','CANCELLED');
CREATE TYPE consult_mode         AS ENUM ('VIDEO','IN_PERSON');
CREATE TYPE attendance_status    AS ENUM ('PENDING','ATTENDED','NO_SHOW');
CREATE TYPE diagnosis_category   AS ENUM ('BENIGN','PRE_MALIGNANT','MALIGNANT','INCONCLUSIVE');
CREATE TYPE linkage_status       AS ENUM ('PLANNED','CONFIRMED','STARTED','COMPLETED','DECLINED','LOST');
CREATE TYPE followup_task_type   AS ENUM ('MISSED_APPOINTMENT','REMINDER','TRANSPORT','RESULT_COLLECTION','LOST_CONTACT','OTHER');
CREATE TYPE contact_channel      AS ENUM ('PHONE','HOME_VISIT','SMS','IN_PERSON','OTHER');
CREATE TYPE contact_outcome      AS ENUM ('REACHED','NOT_REACHED','WRONG_NUMBER','REFUSED','RESCHEDULED');
CREATE TYPE transport_status     AS ENUM ('REQUESTED','ARRANGED','COMPLETED','CANCELLED');
CREATE TYPE escalation_status    AS ENUM ('OPEN','ACKNOWLEDGED','RESOLVED');
CREATE TYPE notification_channel AS ENUM ('IN_APP','SMS','PUSH');
CREATE TYPE notification_status  AS ENUM ('PENDING','SENT','FAILED','CANCELLED');
CREATE TYPE sync_status          AS ENUM ('PENDING','UPLOADING','CONFIRMED','FAILED');
CREATE TYPE sync_operation       AS ENUM ('CREATE','UPDATE');
CREATE TYPE conflict_resolution  AS ENUM ('OPEN','KEPT_LOCAL','KEPT_SERVER','MERGED');
CREATE TYPE error_severity       AS ENUM ('DEBUG','INFO','WARNING','ERROR','CRITICAL');

-- >>> 01_trigger_functions.sql
-- Run second. Shared trigger functions (bodies reference tables only at run time).

CREATE FUNCTION fn_set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

CREATE FUNCTION fn_block_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only: % not allowed', TG_TABLE_NAME, TG_OP
        USING ERRCODE = 'integrity_constraint_violation';
END $$;

CREATE FUNCTION fn_require_consent_for_photo() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c UUID; g BOOLEAN;
BEGIN
  SELECT s.consent_id INTO c FROM tbl_screenings s WHERE s.id = NEW.screening_id;
  SELECT pc.granted INTO g FROM tbl_patient_consents pc WHERE pc.id = c;
  IF c IS NULL OR g IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'image upload rejected: no granted consent on screening %', NEW.screening_id
          USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION fn_require_role() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE uid UUID; rcode TEXT;
BEGIN
  uid := (to_jsonb(NEW) ->> TG_ARGV[0])::uuid;
  IF uid IS NULL THEN RETURN NEW; END IF;
  SELECT r.code INTO rcode FROM tbl_users u JOIN mst_roles r ON r.id = u.role_id WHERE u.id = uid;
  IF rcode IS NULL OR NOT (rcode = ANY (string_to_array(TG_ARGV[1], ','))) THEN
    RAISE EXCEPTION '%.% must be a user with role in (%), got %',
          TG_TABLE_NAME, TG_ARGV[0], TG_ARGV[1], COALESCE(rcode, 'unknown')
          USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION fn_review_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.version <> OLD.version + 1 THEN
    RAISE EXCEPTION 'version conflict on review %: expected %, got %', OLD.id, OLD.version + 1, NEW.version
          USING ERRCODE = 'serialization_failure';
  END IF;
  IF OLD.signed_at IS NOT NULL AND NEW.doctor_id <> OLD.doctor_id THEN
    RAISE EXCEPTION 'a signed review cannot be rewritten by another user'
          USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION fn_review_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO tbl_clinical_review_versions (review_id, version_no, snapshot, edited_by)
  VALUES (NEW.id, NEW.version, to_jsonb(NEW), NEW.doctor_id);
  RETURN NEW;
END $$;

CREATE FUNCTION fn_check_case_transition() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE ok BOOLEAN;
BEGIN
  IF NEW.case_state IS NOT DISTINCT FROM OLD.case_state THEN RETURN NEW; END IF;

  SELECT EXISTS (
      SELECT 1 FROM (VALUES
        ('DRAFT','CONSENTED'),('CONSENTED','SCREENED'),('SCREENED','AWAITING_CLINICIAN'),
        ('AWAITING_CLINICIAN','REVIEWED'),('REVIEWED','REFERRAL_PLANNED'),('REVIEWED','CLOSED'),
        ('REFERRAL_PLANNED','APPOINTED'),('APPOINTED','ASSESSED'),('ASSESSED','DIAGNOSTICS_PENDING'),
        ('ASSESSED','CLOSED'),('DIAGNOSTICS_PENDING','RESULT_REVIEWED'),
        ('RESULT_REVIEWED','CARE_LINKED'),('RESULT_REVIEWED','CLOSED'),('CARE_LINKED','CLOSED')
      ) AS t(a, b)
      WHERE a = OLD.case_state::text AND b = NEW.case_state::text)
    OR (NEW.case_state IN ('RESCHEDULED','MISSED','DECLINED','LOST_CONTACT') AND OLD.case_state <> 'DRAFT')
    OR (OLD.case_state IN ('RESCHEDULED','MISSED','DECLINED','LOST_CONTACT')
        AND NEW.case_state IN ('REFERRAL_PLANNED','APPOINTED','CLOSED'))
  INTO ok;

  IF NOT ok THEN
    RAISE EXCEPTION 'invalid case transition % -> %', OLD.case_state, NEW.case_state
          USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.case_state = 'REVIEWED' AND NOT EXISTS (
        SELECT 1 FROM tbl_clinical_reviews cr WHERE cr.screening_id = NEW.id AND cr.signed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'case cannot be REVIEWED without a signed clinician review'
          USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

-- >>> tables/01_mst_roles.sql
-- Table 1 of 58: mst_roles

CREATE TABLE mst_roles (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code        TEXT NOT NULL UNIQUE,
    name_en     TEXT NOT NULL,
    name_te     TEXT,
    description TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- >>> tables/02_mst_permissions.sql
-- Table 2 of 58: mst_permissions

CREATE TABLE mst_permissions (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code        TEXT NOT NULL UNIQUE,            -- e.g. review.sign
    resource    TEXT NOT NULL,
    action      TEXT NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- >>> tables/03_mst_languages.sql
-- Table 3 of 58: mst_languages

CREATE TABLE mst_languages (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code        TEXT NOT NULL UNIQUE,            -- 'te', 'en'
    name_en     TEXT NOT NULL,
    native_name TEXT NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

-- >>> tables/04_mst_districts.sql
-- Table 4 of 58: mst_districts

CREATE TABLE mst_districts (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code       TEXT NOT NULL UNIQUE,
    name_en    TEXT NOT NULL,
    name_te    TEXT,
    state_name TEXT NOT NULL DEFAULT 'Andhra Pradesh',
    is_active  BOOLEAN NOT NULL DEFAULT TRUE
);

-- >>> tables/05_mst_mandals.sql
-- Table 5 of 58: mst_mandals

CREATE TABLE mst_mandals (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    district_id BIGINT NOT NULL REFERENCES mst_districts(id),
    code        TEXT NOT NULL UNIQUE,
    name_en     TEXT NOT NULL,
    name_te     TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

-- indexes
CREATE INDEX idx_mandals_district        ON mst_mandals (district_id);

-- >>> tables/06_mst_gram_panchayats.sql
-- Table 6 of 58: mst_gram_panchayats

CREATE TABLE mst_gram_panchayats (
    id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mandal_id BIGINT NOT NULL REFERENCES mst_mandals(id),
    code      TEXT NOT NULL UNIQUE,
    name_en   TEXT NOT NULL,
    name_te   TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- indexes
CREATE INDEX idx_gp_mandal               ON mst_gram_panchayats (mandal_id);

-- >>> tables/07_mst_villages.sql
-- Table 7 of 58: mst_villages

CREATE TABLE mst_villages (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    gram_panchayat_id BIGINT NOT NULL REFERENCES mst_gram_panchayats(id),
    code              TEXT NOT NULL UNIQUE,
    name_en           TEXT NOT NULL,
    name_te           TEXT,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE
);

-- indexes
CREATE INDEX idx_villages_gp             ON mst_villages (gram_panchayat_id);

-- >>> tables/08_mst_phcs.sql
-- Table 8 of 58: mst_phcs

CREATE TABLE mst_phcs (
    id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mandal_id BIGINT NOT NULL REFERENCES mst_mandals(id),
    code      TEXT NOT NULL UNIQUE,
    name_en   TEXT NOT NULL,
    name_te   TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- >>> tables/09_mst_hospitals.sql
-- Table 9 of 58: mst_hospitals

CREATE TABLE mst_hospitals (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    district_id BIGINT NOT NULL REFERENCES mst_districts(id),
    code        TEXT NOT NULL UNIQUE,
    name_en     TEXT NOT NULL,
    name_te     TEXT,
    level       TEXT,                            -- CHC / AH / DH / TERTIARY
    is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

-- >>> tables/10_mst_facilities.sql
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

-- >>> tables/11_mst_screening_sites.sql
-- Table 11 of 58: mst_screening_sites

CREATE TABLE mst_screening_sites (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    village_id  BIGINT REFERENCES mst_villages(id),
    facility_id BIGINT REFERENCES mst_facilities(id),
    code        TEXT NOT NULL UNIQUE,
    name_en     TEXT NOT NULL,
    name_te     TEXT,
    site_type   TEXT NOT NULL DEFAULT 'CAMP',    -- CAMP / PHC / HOME / MOBILE_UNIT
    is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

-- >>> tables/12_mst_specialties.sql
-- Table 12 of 58: mst_specialties

CREATE TABLE mst_specialties (
    id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code      TEXT NOT NULL UNIQUE,
    name_en   TEXT NOT NULL,
    name_te   TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- >>> tables/13_mst_consent_purposes.sql
-- Table 13 of 58: mst_consent_purposes

CREATE TABLE mst_consent_purposes (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code        TEXT NOT NULL UNIQUE,            -- SCREENING, IMAGE_CAPTURE, AI_RESEARCH, TELECONSULT
    name_en     TEXT NOT NULL,
    name_te     TEXT,
    text_en     TEXT NOT NULL,
    text_te     TEXT,
    version     TEXT NOT NULL DEFAULT 'v1',
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

-- >>> tables/14_mst_symptoms.sql
-- Table 14 of 58: mst_symptoms

CREATE TABLE mst_symptoms (
    id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code      TEXT NOT NULL UNIQUE,
    name_en   TEXT NOT NULL,
    name_te   TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- >>> tables/15_mst_exposure_types.sql
-- Table 15 of 58: mst_exposure_types

CREATE TABLE mst_exposure_types (
    id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code      TEXT NOT NULL UNIQUE,
    name_en   TEXT NOT NULL,
    name_te   TEXT,
    category  TEXT NOT NULL DEFAULT 'TOBACCO',   -- TOBACCO / ARECA / ALCOHOL / OTHER
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- >>> tables/16_mst_referral_priorities.sql
-- Table 16 of 58: mst_referral_priorities

CREATE TABLE mst_referral_priorities (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code        TEXT NOT NULL UNIQUE,
    name_en     TEXT NOT NULL,
    name_te     TEXT,
    priority_rank SMALLINT NOT NULL UNIQUE,        -- 1 = most urgent
    target_days INT,                             -- configurable by clinical protocol
    is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

-- >>> tables/17_mst_investigation_types.sql
-- Table 17 of 58: mst_investigation_types

CREATE TABLE mst_investigation_types (
    id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code      TEXT NOT NULL UNIQUE,
    name_en   TEXT NOT NULL,
    name_te   TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- >>> tables/18_mst_appointment_statuses.sql
-- Table 18 of 58: mst_appointment_statuses

CREATE TABLE mst_appointment_statuses (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code        TEXT NOT NULL UNIQUE,
    name_en     TEXT NOT NULL,
    name_te     TEXT,
    is_terminal BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order  SMALLINT NOT NULL DEFAULT 0
);

-- >>> tables/19_mst_investigation_statuses.sql
-- Table 19 of 58: mst_investigation_statuses

CREATE TABLE mst_investigation_statuses (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code        TEXT NOT NULL UNIQUE,
    name_en     TEXT NOT NULL,
    name_te     TEXT,
    is_terminal BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order  SMALLINT NOT NULL DEFAULT 0
);

-- >>> tables/20_mst_followup_statuses.sql
-- Table 20 of 58: mst_followup_statuses

CREATE TABLE mst_followup_statuses (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code        TEXT NOT NULL UNIQUE,
    name_en     TEXT NOT NULL,
    name_te     TEXT,
    is_terminal BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order  SMALLINT NOT NULL DEFAULT 0
);

-- >>> tables/21_mst_notification_templates.sql
-- Table 21 of 58: mst_notification_templates

CREATE TABLE mst_notification_templates (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code        TEXT NOT NULL,
    language_id BIGINT NOT NULL REFERENCES mst_languages(id),
    channel     notification_channel NOT NULL DEFAULT 'IN_APP',
    subject     TEXT,
    body        TEXT NOT NULL,                   -- must contain NO diagnosis / sensitive detail
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (code, language_id, channel)
);

-- >>> tables/22_mst_ai_models.sql
-- Table 22 of 58: mst_ai_models

CREATE TABLE mst_ai_models (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    provider          TEXT NOT NULL,             -- mock / research
    model_version     TEXT NOT NULL,
    description       TEXT,
    dataset_card_ref  TEXT,
    model_card_ref    TEXT,
    is_research_only  BOOLEAN NOT NULL DEFAULT TRUE,
    clinical_use      BOOLEAN NOT NULL DEFAULT FALSE,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (provider, model_version),
    CONSTRAINT ck_model_never_clinical CHECK (clinical_use = FALSE AND is_research_only = TRUE)
);

-- >>> tables/23_tbl_users.sql
-- Table 23 of 58: tbl_users

CREATE TABLE tbl_users (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username             TEXT NOT NULL,
    auth_id              TEXT UNIQUE,            -- external identity provider id (optional)
    password_hash        TEXT NOT NULL,          -- argon2id/bcrypt hash, never plaintext
    full_name            TEXT NOT NULL,
    role_id              BIGINT NOT NULL REFERENCES mst_roles(id),
    status               user_status NOT NULL DEFAULT 'ACTIVE',
    mfa_enabled          BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_secret_encrypted TEXT,
    failed_login_count   INT NOT NULL DEFAULT 0,
    locked_until         TIMESTAMPTZ,
    last_login_at        TIMESTAMPTZ,
    password_changed_at  TIMESTAMPTZ,
    is_synthetic         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at           TIMESTAMPTZ
);

-- indexes
CREATE UNIQUE INDEX uq_users_username ON tbl_users (lower(username));
CREATE INDEX idx_users_role              ON tbl_users (role_id) WHERE deleted_at IS NULL;

-- triggers
CREATE TRIGGER trg_tbl_users_updated_at BEFORE UPDATE ON tbl_users
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- >>> tables/24_tbl_user_facility_assignments.sql
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

-- >>> tables/25_tbl_role_permissions.sql
-- Table 25 of 58: tbl_role_permissions

CREATE TABLE tbl_role_permissions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id       BIGINT NOT NULL REFERENCES mst_roles(id),
    permission_id BIGINT NOT NULL REFERENCES mst_permissions(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (role_id, permission_id)
);

-- >>> tables/26_tbl_user_language_preferences.sql
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

-- >>> tables/27_tbl_patients.sql
-- Table 27 of 58: tbl_patients

CREATE TABLE tbl_patients (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    synthetic_code         TEXT NOT NULL UNIQUE,         -- e.g. DEMO-P-001
    full_name              TEXT NOT NULL,
    sex                    sex_type NOT NULL DEFAULT 'UNDISCLOSED',
    date_of_birth          DATE,
    age_years              SMALLINT CHECK (age_years BETWEEN 0 AND 120),
    village_id             BIGINT REFERENCES mst_villages(id),
    address_line           TEXT,
    contact_phone          TEXT,                         -- synthetic numbers only; encrypt in app layer
    preferred_language_id  BIGINT REFERENCES mst_languages(id),
    registered_facility_id BIGINT NOT NULL REFERENCES mst_facilities(id),
    registered_by          UUID NOT NULL REFERENCES tbl_users(id),
    duplicate_hint         TEXT,                         -- normalized hash for duplicate warning
    idempotency_key        TEXT,
    is_synthetic           BOOLEAN NOT NULL DEFAULT TRUE CHECK (is_synthetic),   -- blocks real data
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at             TIMESTAMPTZ,
    CONSTRAINT ck_patient_age_known CHECK (date_of_birth IS NOT NULL OR age_years IS NOT NULL),
    UNIQUE (registered_by, idempotency_key)
);

-- indexes
CREATE INDEX idx_patients_facility       ON tbl_patients (registered_facility_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_patients_village        ON tbl_patients (village_id);
CREATE INDEX idx_patients_duplicate      ON tbl_patients (duplicate_hint);

-- triggers
CREATE TRIGGER trg_tbl_patients_updated_at BEFORE UPDATE ON tbl_patients
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- >>> tables/28_tbl_patient_medical_histories.sql
-- Table 28 of 58: tbl_patient_medical_histories

CREATE TABLE tbl_patient_medical_histories (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id        UUID NOT NULL REFERENCES tbl_patients(id),
    exposure_type_id  BIGINT REFERENCES mst_exposure_types(id),
    condition_text    TEXT,
    duration_years    NUMERIC(4,1) CHECK (duration_years >= 0),
    frequency_per_day SMALLINT CHECK (frequency_per_day >= 0),
    is_current        BOOLEAN,
    recorded_by       UUID NOT NULL REFERENCES tbl_users(id),
    recorded_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_history_has_content CHECK (exposure_type_id IS NOT NULL OR condition_text IS NOT NULL)
);

-- indexes
CREATE INDEX idx_history_patient         ON tbl_patient_medical_histories (patient_id);

-- >>> tables/29_tbl_patient_consents.sql
-- Table 29 of 58: tbl_patient_consents

CREATE TABLE tbl_patient_consents (                      -- APPEND-ONLY: withdrawal = new row, granted=false
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id      UUID NOT NULL REFERENCES tbl_patients(id),
    purpose_id      BIGINT NOT NULL REFERENCES mst_consent_purposes(id),
    language_id     BIGINT NOT NULL REFERENCES mst_languages(id),
    consent_version TEXT NOT NULL,
    granted         BOOLEAN NOT NULL,
    captured_by     UUID NOT NULL REFERENCES tbl_users(id),
    witness_name    TEXT,
    captured_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (id, patient_id)
);

-- indexes
CREATE INDEX idx_consents_patient        ON tbl_patient_consents (patient_id, purpose_id, captured_at DESC);

-- triggers
CREATE TRIGGER trg_tbl_patient_consents_append_only BEFORE UPDATE OR DELETE ON tbl_patient_consents
    FOR EACH ROW EXECUTE FUNCTION fn_block_mutation();

-- >>> tables/30_tbl_screenings.sql
-- Table 30 of 58: tbl_screenings

CREATE TABLE tbl_screenings (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id        UUID NOT NULL REFERENCES tbl_patients(id),
    examiner_id       UUID NOT NULL REFERENCES tbl_users(id),
    facility_id       BIGINT NOT NULL REFERENCES mst_facilities(id),
    screening_site_id BIGINT REFERENCES mst_screening_sites(id),
    screening_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    case_state        case_state NOT NULL DEFAULT 'DRAFT',
    consent_id        UUID,
    tobacco_current   BOOLEAN,
    chief_complaint   TEXT,
    notes             TEXT,
    version           INT NOT NULL DEFAULT 1,
    idempotency_key   TEXT,
    client_created_at TIMESTAMPTZ,                        -- device time for offline drafts
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (id, patient_id),
    UNIQUE (examiner_id, idempotency_key),
    FOREIGN KEY (consent_id, patient_id) REFERENCES tbl_patient_consents (id, patient_id),  -- same patient only
    CONSTRAINT ck_consent_gate CHECK (case_state = 'DRAFT' OR consent_id IS NOT NULL)
);

-- indexes
CREATE INDEX idx_screenings_patient      ON tbl_screenings (patient_id, screening_date DESC);
CREATE INDEX idx_screenings_facility     ON tbl_screenings (facility_id, case_state);
CREATE INDEX idx_screenings_examiner     ON tbl_screenings (examiner_id);

-- triggers
CREATE TRIGGER trg_tbl_screenings_updated_at BEFORE UPDATE ON tbl_screenings
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_screening_state BEFORE UPDATE OF case_state ON tbl_screenings
    FOR EACH ROW EXECUTE FUNCTION fn_check_case_transition();

-- >>> tables/31_tbl_screening_findings.sql
-- Table 31 of 58: tbl_screening_findings

CREATE TABLE tbl_screening_findings (                    -- clinician/health-worker findings (separate from AI)
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    screening_id    UUID NOT NULL REFERENCES tbl_screenings(id),
    finding_kind    finding_type NOT NULL,
    symptom_id      BIGINT REFERENCES mst_symptoms(id),
    oral_site       oral_view,
    description     TEXT,
    duration_days   INT CHECK (duration_days >= 0),
    recorded_by     UUID NOT NULL REFERENCES tbl_users(id),
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_finding_content CHECK (symptom_id IS NOT NULL OR description IS NOT NULL)
);

-- indexes
CREATE INDEX idx_findings_screening      ON tbl_screening_findings (screening_id);

-- >>> tables/32_tbl_screening_photos.sql
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

-- >>> tables/33_tbl_image_quality_results.sql
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

-- >>> tables/34_tbl_ai_assessments.sql
-- Table 34 of 58: tbl_ai_assessments

CREATE TABLE tbl_ai_assessments (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_code            TEXT NOT NULL UNIQUE,        -- e.g. DEMO-AI-009
    photo_id                 UUID NOT NULL REFERENCES tbl_screening_photos(id),
    ai_model_id              BIGINT NOT NULL REFERENCES mst_ai_models(id),
    status                   ai_status NOT NULL DEFAULT 'QUEUED',
    research_label           TEXT,                        -- e.g. suspicious_example
    score                    NUMERIC(5,4) CHECK (score BETWEEN 0 AND 1),   -- NOT a probability of cancer
    clinical_use             BOOLEAN NOT NULL DEFAULT FALSE CHECK (clinical_use = FALSE),
    requires_clinician_review BOOLEAN NOT NULL DEFAULT TRUE CHECK (requires_clinician_review),
    warning                  TEXT NOT NULL DEFAULT 'NOT FOR CLINICAL USE',
    requested_by             UUID NOT NULL REFERENCES tbl_users(id),
    requested_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at             TIMESTAMPTZ
);

-- indexes
CREATE INDEX idx_ai_photo                ON tbl_ai_assessments (photo_id);

-- >>> tables/35_tbl_ai_assessment_logs.sql
-- Table 35 of 58: tbl_ai_assessment_logs

CREATE TABLE tbl_ai_assessment_logs (                    -- APPEND-ONLY, no image content / PHI
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES tbl_ai_assessments(id),
    event         TEXT NOT NULL,                          -- QUEUED / CALLED / TIMEOUT / FAILED / COMPLETED
    http_status   INT,
    latency_ms    INT CHECK (latency_ms >= 0),
    error_code    TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- indexes
CREATE INDEX idx_ai_logs_assessment      ON tbl_ai_assessment_logs (assessment_id);

-- triggers
CREATE TRIGGER trg_tbl_ai_assessment_logs_append_only BEFORE UPDATE OR DELETE ON tbl_ai_assessment_logs
    FOR EACH ROW EXECUTE FUNCTION fn_block_mutation();

-- >>> tables/36_tbl_clinical_reviews.sql
-- Table 36 of 58: tbl_clinical_reviews

CREATE TABLE tbl_clinical_reviews (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    screening_id        UUID NOT NULL UNIQUE REFERENCES tbl_screenings(id),
    doctor_id           UUID NOT NULL REFERENCES tbl_users(id),
    finding             TEXT NOT NULL,
    impression          TEXT,
    ai_assessment_id    UUID REFERENCES tbl_ai_assessments(id),
    ai_discrepancy_note TEXT,                             -- clinician may disagree with AI
    decision            review_decision,
    version             INT NOT NULL DEFAULT 1,
    signed_at           TIMESTAMPTZ,
    signature_hash      TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_sign_needs_decision CHECK (signed_at IS NULL OR decision IS NOT NULL)
);

-- indexes
CREATE INDEX idx_reviews_doctor          ON tbl_clinical_reviews (doctor_id, signed_at);

-- triggers
CREATE TRIGGER trg_tbl_clinical_reviews_updated_at BEFORE UPDATE ON tbl_clinical_reviews
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_review_doctor_role BEFORE INSERT OR UPDATE ON tbl_clinical_reviews
    FOR EACH ROW EXECUTE FUNCTION fn_require_role('doctor_id', 'MEDICAL_OFFICER');
CREATE TRIGGER trg_review_guard BEFORE UPDATE ON tbl_clinical_reviews
    FOR EACH ROW EXECUTE FUNCTION fn_review_guard();
CREATE TRIGGER trg_review_snapshot AFTER INSERT OR UPDATE ON tbl_clinical_reviews
    FOR EACH ROW EXECUTE FUNCTION fn_review_snapshot();

-- >>> tables/37_tbl_clinical_review_versions.sql
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

-- >>> tables/38_tbl_referrals.sql
-- Table 38 of 58: tbl_referrals

CREATE TABLE tbl_referrals (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id        UUID NOT NULL REFERENCES tbl_clinical_reviews(id),
    patient_id       UUID NOT NULL REFERENCES tbl_patients(id),
    from_facility_id BIGINT NOT NULL REFERENCES mst_facilities(id),
    to_hospital_id   BIGINT NOT NULL REFERENCES mst_hospitals(id),
    specialty_id     BIGINT NOT NULL REFERENCES mst_specialties(id),
    priority_id      BIGINT NOT NULL REFERENCES mst_referral_priorities(id),
    status           referral_status NOT NULL DEFAULT 'PLANNED',
    reason           TEXT,
    created_by       UUID NOT NULL REFERENCES tbl_users(id),
    idempotency_key  TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (created_by, idempotency_key)
);

-- indexes
CREATE INDEX idx_referrals_patient       ON tbl_referrals (patient_id);
CREATE INDEX idx_referrals_hospital      ON tbl_referrals (to_hospital_id, status);
CREATE INDEX idx_referrals_review        ON tbl_referrals (review_id);

-- triggers
CREATE TRIGGER trg_tbl_referrals_updated_at BEFORE UPDATE ON tbl_referrals
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_referral_author_role BEFORE INSERT ON tbl_referrals
    FOR EACH ROW EXECUTE FUNCTION fn_require_role('created_by', 'MEDICAL_OFFICER');

-- >>> tables/39_tbl_referral_status_history.sql
-- Table 39 of 58: tbl_referral_status_history

CREATE TABLE tbl_referral_status_history (               -- APPEND-ONLY
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id UUID NOT NULL REFERENCES tbl_referrals(id),
    from_status referral_status,
    to_status   referral_status NOT NULL,
    changed_by  UUID NOT NULL REFERENCES tbl_users(id),
    reason      TEXT,
    changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- indexes
CREATE INDEX idx_ref_hist_referral       ON tbl_referral_status_history (referral_id, changed_at);

-- triggers
CREATE TRIGGER trg_tbl_referral_status_history_append_only BEFORE UPDATE OR DELETE ON tbl_referral_status_history
    FOR EACH ROW EXECUTE FUNCTION fn_block_mutation();

-- >>> tables/40_tbl_consultation_slots.sql
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

-- >>> tables/41_tbl_video_consultations.sql
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

-- >>> tables/42_tbl_hospital_appointments.sql
-- Table 42 of 58: tbl_hospital_appointments

CREATE TABLE tbl_hospital_appointments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id         UUID NOT NULL REFERENCES tbl_referrals(id),
    hospital_id         BIGINT NOT NULL REFERENCES mst_hospitals(id),
    specialty_id        BIGINT NOT NULL REFERENCES mst_specialties(id),
    scheduled_at        TIMESTAMPTZ NOT NULL,
    status_id           BIGINT NOT NULL REFERENCES mst_appointment_statuses(id),
    attendance          attendance_status NOT NULL DEFAULT 'PENDING',
    clinician_outcome   TEXT,
    outcome_recorded_by UUID REFERENCES tbl_users(id),
    booked_by           UUID NOT NULL REFERENCES tbl_users(id),
    rescheduled_from_id UUID REFERENCES tbl_hospital_appointments(id),
    idempotency_key     TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (booked_by, idempotency_key)
);

-- indexes
CREATE INDEX idx_appt_referral           ON tbl_hospital_appointments (referral_id);
CREATE INDEX idx_appt_sched              ON tbl_hospital_appointments (scheduled_at, status_id);

-- triggers
CREATE TRIGGER trg_tbl_hospital_appointments_updated_at BEFORE UPDATE ON tbl_hospital_appointments
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- >>> tables/43_tbl_appointment_status_history.sql
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

-- >>> tables/44_tbl_investigation_orders.sql
-- Table 44 of 58: tbl_investigation_orders

CREATE TABLE tbl_investigation_orders (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id           UUID NOT NULL REFERENCES tbl_referrals(id),
    patient_id            UUID NOT NULL REFERENCES tbl_patients(id),
    investigation_type_id BIGINT NOT NULL REFERENCES mst_investigation_types(id),
    status_id             BIGINT NOT NULL REFERENCES mst_investigation_statuses(id),
    hospital_id           BIGINT REFERENCES mst_hospitals(id),
    ordered_by            UUID NOT NULL REFERENCES tbl_users(id),
    ordered_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    due_date              DATE,
    idempotency_key       TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (ordered_by, idempotency_key)
);

-- indexes
CREATE INDEX idx_inv_orders_referral     ON tbl_investigation_orders (referral_id);
CREATE INDEX idx_inv_orders_patient      ON tbl_investigation_orders (patient_id);

-- triggers
CREATE TRIGGER trg_tbl_investigation_orders_updated_at BEFORE UPDATE ON tbl_investigation_orders
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- >>> tables/45_tbl_investigation_status_history.sql
-- Table 45 of 58: tbl_investigation_status_history

CREATE TABLE tbl_investigation_status_history (          -- APPEND-ONLY
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id       UUID NOT NULL REFERENCES tbl_investigation_orders(id),
    from_status_id BIGINT REFERENCES mst_investigation_statuses(id),
    to_status_id   BIGINT NOT NULL REFERENCES mst_investigation_statuses(id),
    changed_by     UUID NOT NULL REFERENCES tbl_users(id),
    reason         TEXT,
    changed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- indexes
CREATE INDEX idx_inv_hist_order          ON tbl_investigation_status_history (order_id, changed_at);

-- triggers
CREATE TRIGGER trg_tbl_investigation_status_history_append_only BEFORE UPDATE OR DELETE ON tbl_investigation_status_history
    FOR EACH ROW EXECUTE FUNCTION fn_block_mutation();

-- >>> tables/46_tbl_pathology_reports.sql
-- Table 46 of 58: tbl_pathology_reports

CREATE TABLE tbl_pathology_reports (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID NOT NULL REFERENCES tbl_investigation_orders(id),
    report_key      TEXT NOT NULL UNIQUE,                  -- private object key
    checksum_sha256 CHAR(64) NOT NULL,
    mime_type       TEXT NOT NULL CHECK (mime_type IN ('application/pdf','image/jpeg','image/png')),
    is_simulated    BOOLEAN NOT NULL DEFAULT TRUE CHECK (is_simulated),
    summary_text    TEXT,
    uploaded_by     UUID NOT NULL REFERENCES tbl_users(id),
    reported_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_report_key_private CHECK (report_key !~* '^(https?:)?//')
);

-- indexes
CREATE INDEX idx_path_reports_order      ON tbl_pathology_reports (order_id);

-- >>> tables/47_tbl_pathology_reviews.sql
-- Table 47 of 58: tbl_pathology_reviews

CREATE TABLE tbl_pathology_reviews (                     -- diagnosis is ENTERED BY A CLINICIAN, never by AI
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id          UUID NOT NULL REFERENCES tbl_pathology_reports(id),
    reviewer_id        UUID NOT NULL REFERENCES tbl_users(id),
    diagnosis_text     TEXT NOT NULL,
    diagnosis_category diagnosis_category NOT NULL,
    signed_at          TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- indexes
CREATE INDEX idx_path_reviews_report     ON tbl_pathology_reviews (report_id);

-- triggers
CREATE TRIGGER trg_pathology_reviewer_role BEFORE INSERT OR UPDATE ON tbl_pathology_reviews
    FOR EACH ROW EXECUTE FUNCTION fn_require_role('reviewer_id', 'MEDICAL_OFFICER,SPECIALIST');

-- >>> tables/48_tbl_treatment_linkages.sql
-- Table 48 of 58: tbl_treatment_linkages

CREATE TABLE tbl_treatment_linkages (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id         UUID NOT NULL REFERENCES tbl_referrals(id),
    patient_id          UUID NOT NULL REFERENCES tbl_patients(id),
    pathology_review_id UUID REFERENCES tbl_pathology_reviews(id),
    hospital_id         BIGINT REFERENCES mst_hospitals(id),
    linkage_type        TEXT NOT NULL CHECK (linkage_type IN
                          ('SURGERY','RADIOTHERAPY','CHEMOTHERAPY','PALLIATIVE','OBSERVATION','OTHER')),
    status              linkage_status NOT NULL DEFAULT 'PLANNED',
    planned_date        DATE,
    linked_by           UUID NOT NULL REFERENCES tbl_users(id),
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- indexes
CREATE INDEX idx_treatment_referral      ON tbl_treatment_linkages (referral_id);

-- triggers
CREATE TRIGGER trg_tbl_treatment_linkages_updated_at BEFORE UPDATE ON tbl_treatment_linkages
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- >>> tables/49_tbl_followup_tasks.sql
-- Table 49 of 58: tbl_followup_tasks

CREATE TABLE tbl_followup_tasks (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id   UUID NOT NULL REFERENCES tbl_referrals(id),
    patient_id    UUID NOT NULL REFERENCES tbl_patients(id),
    owner_id      UUID NOT NULL REFERENCES tbl_users(id),   -- navigator
    task_type     followup_task_type NOT NULL,
    trigger_event TEXT,                                     -- e.g. appointment missed
    due_at        TIMESTAMPTZ NOT NULL,
    status_id     BIGINT NOT NULL REFERENCES mst_followup_statuses(id),
    closed_at     TIMESTAMPTZ,
    closure_reason TEXT,
    created_by    UUID REFERENCES tbl_users(id),            -- NULL = system generated
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- indexes
CREATE INDEX idx_followup_owner_due      ON tbl_followup_tasks (owner_id, due_at) WHERE closed_at IS NULL;
CREATE INDEX idx_followup_patient        ON tbl_followup_tasks (patient_id);

-- triggers
CREATE TRIGGER trg_tbl_followup_tasks_updated_at BEFORE UPDATE ON tbl_followup_tasks
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- >>> tables/50_tbl_patient_contact_history.sql
-- Table 50 of 58: tbl_patient_contact_history

CREATE TABLE tbl_patient_contact_history (               -- APPEND-ONLY
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id   UUID NOT NULL REFERENCES tbl_patients(id),
    task_id      UUID REFERENCES tbl_followup_tasks(id),
    contacted_by UUID NOT NULL REFERENCES tbl_users(id),
    channel      contact_channel NOT NULL,
    outcome      contact_outcome NOT NULL,
    notes        TEXT,
    contacted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- indexes
CREATE INDEX idx_contact_patient         ON tbl_patient_contact_history (patient_id, contacted_at DESC);

-- triggers
CREATE TRIGGER trg_tbl_patient_contact_history_append_only BEFORE UPDATE OR DELETE ON tbl_patient_contact_history
    FOR EACH ROW EXECUTE FUNCTION fn_block_mutation();

-- >>> tables/51_tbl_transport_support_records.sql
-- Table 51 of 58: tbl_transport_support_records

CREATE TABLE tbl_transport_support_records (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id          UUID REFERENCES tbl_followup_tasks(id),
    referral_id      UUID NOT NULL REFERENCES tbl_referrals(id),
    patient_id       UUID NOT NULL REFERENCES tbl_patients(id),
    from_village_id  BIGINT REFERENCES mst_villages(id),
    to_hospital_id   BIGINT REFERENCES mst_hospitals(id),
    travel_date      DATE,
    mode             TEXT,
    status           transport_status NOT NULL DEFAULT 'REQUESTED',
    amount_inr       NUMERIC(10,2) CHECK (amount_inr >= 0),
    arranged_by      UUID REFERENCES tbl_users(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- indexes
CREATE INDEX idx_transport_referral      ON tbl_transport_support_records (referral_id);

-- triggers
CREATE TRIGGER trg_tbl_transport_support_records_updated_at BEFORE UPDATE ON tbl_transport_support_records
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- >>> tables/52_tbl_case_escalations.sql
-- Table 52 of 58: tbl_case_escalations

CREATE TABLE tbl_case_escalations (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id      UUID NOT NULL REFERENCES tbl_followup_tasks(id),
    referral_id  UUID NOT NULL REFERENCES tbl_referrals(id),
    level        SMALLINT NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 5),
    escalated_by UUID REFERENCES tbl_users(id),            -- NULL = overdue rule fired
    escalated_to UUID REFERENCES tbl_users(id),
    reason       TEXT NOT NULL,
    status       escalation_status NOT NULL DEFAULT 'OPEN',
    escalated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at  TIMESTAMPTZ
);

-- indexes
CREATE INDEX idx_escalations_task        ON tbl_case_escalations (task_id, status);

-- >>> tables/53_tbl_audit_logs.sql
-- Table 53 of 58: tbl_audit_logs

CREATE TABLE tbl_audit_logs (                            -- APPEND-ONLY; metadata must not contain PHI
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    actor_id      UUID REFERENCES tbl_users(id),
    actor_role    TEXT,
    event         TEXT NOT NULL,                           -- IMAGE_VIEW, REVIEW_SIGNED, DIAGNOSIS_ENTERED, PERMISSION_CHANGED ...
    resource_type TEXT NOT NULL,
    resource_id   TEXT,
    patient_id    UUID,                                    -- no FK: audit must outlive record changes
    ip_address    INET,
    request_id    TEXT,
    metadata      JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- indexes
CREATE INDEX idx_audit_resource          ON tbl_audit_logs (resource_type, resource_id);
CREATE INDEX idx_audit_actor_time        ON tbl_audit_logs (actor_id, occurred_at DESC);
CREATE INDEX idx_audit_patient           ON tbl_audit_logs (patient_id, occurred_at DESC);

-- triggers
CREATE TRIGGER trg_tbl_audit_logs_append_only BEFORE UPDATE OR DELETE ON tbl_audit_logs
    FOR EACH ROW EXECUTE FUNCTION fn_block_mutation();

-- >>> tables/54_tbl_notifications.sql
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

-- >>> tables/55_tbl_offline_sync_queue.sql
-- Table 55 of 58: tbl_offline_sync_queue

CREATE TABLE tbl_offline_sync_queue (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID NOT NULL REFERENCES tbl_users(id),
    device_id          TEXT NOT NULL,
    idempotency_key    TEXT NOT NULL,
    entity_type        TEXT NOT NULL,
    operation          sync_operation NOT NULL,
    payload            JSONB NOT NULL,
    status             sync_status NOT NULL DEFAULT 'PENDING',
    attempts           INT NOT NULL DEFAULT 0,
    last_error         TEXT,
    client_created_at  TIMESTAMPTZ NOT NULL,
    server_ack_at      TIMESTAMPTZ,                        -- set ONLY on server acknowledgement
    resulting_entity_id UUID,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, idempotency_key),                     -- replays create exactly one record
    CONSTRAINT ck_confirmed_has_ack CHECK (status <> 'CONFIRMED' OR server_ack_at IS NOT NULL)
);

-- indexes
CREATE INDEX idx_sync_status             ON tbl_offline_sync_queue (user_id, status);

-- >>> tables/56_tbl_sync_conflicts.sql
-- Table 56 of 58: tbl_sync_conflicts

CREATE TABLE tbl_sync_conflicts (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_id       UUID REFERENCES tbl_offline_sync_queue(id),
    entity_type    TEXT NOT NULL,
    entity_id      UUID NOT NULL,
    local_version  INT,
    server_version INT,
    local_payload  JSONB,
    server_payload JSONB,
    resolution     conflict_resolution NOT NULL DEFAULT 'OPEN',
    resolved_by    UUID REFERENCES tbl_users(id),
    resolved_at    TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()      -- both payloads kept: clinician notes never discarded
);

-- indexes
CREATE INDEX idx_conflicts_open          ON tbl_sync_conflicts (resolution) WHERE resolution = 'OPEN';

-- >>> tables/57_tbl_demo_datasets.sql
-- Table 57 of 58: tbl_demo_datasets

CREATE TABLE tbl_demo_datasets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            TEXT NOT NULL UNIQUE,                  -- e.g. JURY_12_CASES
    description     TEXT,
    expected_counts JSONB NOT NULL DEFAULT '{}'::jsonb,    -- e.g. {"cases":12,"referrals":4}
    seeded_by       UUID REFERENCES tbl_users(id),
    seeded_at       TIMESTAMPTZ,
    last_reset_at   TIMESTAMPTZ,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE
);

-- >>> tables/58_tbl_system_error_logs.sql
-- Table 58 of 58: tbl_system_error_logs

CREATE TABLE tbl_system_error_logs (                     -- sanitized; no PHI, no secrets
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    service     TEXT NOT NULL,                             -- api / ai / web / sync
    severity    error_severity NOT NULL DEFAULT 'ERROR',
    error_code  TEXT,
    message     TEXT NOT NULL,
    request_id  TEXT,
    user_id     UUID REFERENCES tbl_users(id),
    context     JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- indexes
CREATE INDEX idx_errors_time             ON tbl_system_error_logs (occurred_at DESC, severity);

-- >>> 98_view_dashboard.sql
-- Run after all tables. Aggregates only; no patient identifiers.
CREATE VIEW vw_district_dashboard_summary AS
SELECT f.district_id,
       date_trunc('month', s.screening_date)::date                AS month_start,
       COUNT(DISTINCT s.id)                                       AS screenings_total,
       COUNT(DISTINCT s.id) FILTER (WHERE s.case_state NOT IN ('DRAFT','CONSENTED')) AS screened,
       COUNT(DISTINCT r.id)                                       AS referrals_total
FROM tbl_screenings s
JOIN mst_facilities f            ON f.id = s.facility_id
LEFT JOIN tbl_clinical_reviews c ON c.screening_id = s.id
LEFT JOIN tbl_referrals r        ON r.review_id = c.id
GROUP BY f.district_id, date_trunc('month', s.screening_date);

-- >>> 99_seed_masters.sql
-- AAROGYA DRISHTI - master seed data (synthetic demo). Run after 01_schema.sql.
-- name_te is left NULL where a verified Telugu translation is not yet supplied:
-- fill it from your translation dictionary and have a Telugu speaker check it.

INSERT INTO mst_languages (code, name_en, native_name) VALUES
 ('en','English','English'),
 ('te','Telugu','తెలుగు');

INSERT INTO mst_roles (code, name_en, description) VALUES
 ('HEALTH_WORKER','Health worker','Registers patients, screening intake, image capture, assigned follow-up'),
 ('MEDICAL_OFFICER','Medical Officer','Reviews findings independently of AI, signs review, decides referral'),
 ('SPECIALIST','Specialist','Sees referred cases, consultations, simulated investigation reports'),
 ('NAVIGATOR','Navigator','Appointments, contacts, transport, missed-visit workflow'),
 ('DISTRICT_ADMIN','District admin','Aggregated trends only; no default access to identifiable records');

INSERT INTO mst_permissions (code, resource, action, description) VALUES
 ('patient.register','patient','create','Register synthetic patient'),
 ('patient.read_assigned','patient','read','Read patients within own facility / assigned or referred cases'),
 ('consent.record','consent','create','Record purpose-specific consent'),
 ('screening.create','screening','create','Create screening and history'),
 ('image.upload','image','create','Upload oral photo for assigned screening'),
 ('image.view','image','read','View image via short-lived signed access (audited)'),
 ('ai.analyze','ai','create','Queue non-clinical AI analysis'),
 ('review.create','review','create','Save clinician observations'),
 ('review.sign','review','sign','Sign clinical review'),
 ('referral.create','referral','create','Create specialist referral'),
 ('appointment.book','appointment','create','Book or request appointment'),
 ('appointment.view','appointment','read','View appointments'),
 ('video.join','video','join','Join authorised video consultation'),
 ('investigation.record','investigation','create','Record biopsy/pathology simulation'),
 ('pathology.review','pathology','review','Enter diagnosis on a pathology report'),
 ('navigation.update','navigation','update','Track contact and attendance'),
 ('dashboard.view_aggregate','dashboard','read','View aggregate reporting'),
 ('user.manage','user','manage','Manage users and assignments'),
 ('audit.view','audit','read','View audit trail');

INSERT INTO tbl_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM (VALUES
 ('HEALTH_WORKER','patient.register'),('HEALTH_WORKER','patient.read_assigned'),
 ('HEALTH_WORKER','consent.record'),('HEALTH_WORKER','screening.create'),
 ('HEALTH_WORKER','image.upload'),('HEALTH_WORKER','image.view'),('HEALTH_WORKER','ai.analyze'),
 ('MEDICAL_OFFICER','patient.read_assigned'),('MEDICAL_OFFICER','image.view'),
 ('MEDICAL_OFFICER','review.create'),('MEDICAL_OFFICER','review.sign'),
 ('MEDICAL_OFFICER','referral.create'),('MEDICAL_OFFICER','appointment.book'),
 ('MEDICAL_OFFICER','video.join'),('MEDICAL_OFFICER','investigation.record'),
 ('SPECIALIST','patient.read_assigned'),('SPECIALIST','image.view'),
 ('SPECIALIST','appointment.view'),('SPECIALIST','video.join'),
 ('SPECIALIST','investigation.record'),('SPECIALIST','pathology.review'),
 ('NAVIGATOR','patient.read_assigned'),('NAVIGATOR','appointment.book'),
 ('NAVIGATOR','appointment.view'),('NAVIGATOR','navigation.update'),
 ('DISTRICT_ADMIN','dashboard.view_aggregate'),('DISTRICT_ADMIN','user.manage'),
 ('DISTRICT_ADMIN','audit.view')
) AS m(role_code, perm_code)
JOIN mst_roles r ON r.code = m.role_code
JOIN mst_permissions p ON p.code = m.perm_code;

INSERT INTO mst_appointment_statuses (code, name_en, is_terminal, sort_order) VALUES
 ('REQUESTED','Requested',FALSE,1),('CONFIRMED','Confirmed',FALSE,2),
 ('RESCHEDULED','Rescheduled',FALSE,3),('COMPLETED','Completed',TRUE,4),
 ('MISSED','Missed',TRUE,5),('CANCELLED','Cancelled',TRUE,6);

INSERT INTO mst_investigation_statuses (code, name_en, is_terminal, sort_order) VALUES
 ('ORDERED','Ordered',FALSE,1),('SAMPLE_COLLECTED','Sample collected',FALSE,2),
 ('REPORT_UPLOADED','Report uploaded',FALSE,3),('REVIEWED','Reviewed by clinician',TRUE,4),
 ('CANCELLED','Cancelled',TRUE,5);

INSERT INTO mst_followup_statuses (code, name_en, is_terminal, sort_order) VALUES
 ('OPEN','Open',FALSE,1),('IN_PROGRESS','In progress',FALSE,2),
 ('ESCALATED','Escalated',FALSE,3),('CLOSED','Closed',TRUE,4);

INSERT INTO mst_referral_priorities (code, name_en, priority_rank, target_days) VALUES   -- target_days: set by clinical protocol
 ('URGENT','Urgent',1,NULL),('SOON','Soon',2,NULL),('ROUTINE','Routine',3,NULL);

INSERT INTO mst_consent_purposes (code, name_en, text_en, is_required) VALUES
 ('SCREENING','Oral screening','I agree to a demonstration oral screening using synthetic data.',TRUE),
 ('IMAGE_CAPTURE','Photograph capture','I agree to oral photographs being taken for this demonstration.',TRUE),
 ('AI_RESEARCH','Research AI demo','I understand the AI output is a research demo, not a diagnosis.',FALSE),
 ('TELECONSULT','Video consultation','I agree to a video consultation with a specialist (not recorded).',FALSE);

INSERT INTO mst_exposure_types (code, name_en, category) VALUES
 ('SMOKED_TOBACCO','Smoked tobacco','TOBACCO'),('SMOKELESS_TOBACCO','Smokeless tobacco','TOBACCO'),
 ('ARECA_NUT','Areca nut / betel quid','ARECA'),('ALCOHOL','Alcohol','ALCOHOL');

INSERT INTO mst_symptoms (code, name_en) VALUES
 ('MOUTH_ULCER','Non-healing mouth ulcer'),('WHITE_PATCH','White patch'),
 ('RED_PATCH','Red patch'),('PAIN','Pain in mouth'),
 ('DIFFICULTY_SWALLOWING','Difficulty swallowing'),('LIMITED_MOUTH_OPENING','Limited mouth opening'),
 ('NECK_SWELLING','Neck swelling');

INSERT INTO mst_investigation_types (code, name_en) VALUES
 ('BIOPSY','Biopsy'),('PATHOLOGY','Pathology report'),('IMAGING','Imaging');

INSERT INTO mst_specialties (code, name_en) VALUES
 ('ORAL_MEDICINE','Oral medicine'),('ORAL_SURGERY','Oral & maxillofacial surgery'),
 ('ENT','ENT'),('ONCOLOGY','Oncology'),('PATHOLOGY','Pathology');

INSERT INTO mst_ai_models (provider, model_version, description, is_research_only, clinical_use) VALUES
 ('mock','mock-v1','Mock adapter returning fixed example labels. NOT FOR CLINICAL USE',TRUE,FALSE);

-- Geography (demo subset)
INSERT INTO mst_districts (code, name_en) VALUES ('ASR','Alluri Sitharama Raju');
INSERT INTO mst_mandals (district_id, code, name_en)
SELECT d.id, m.code, m.name FROM mst_districts d,
 (VALUES ('PADERU','Paderu'),('G_MADUGULA','G. Madugula'),('HUKUMPETA','Hukumpeta')) AS m(code,name)
WHERE d.code = 'ASR';

COMMIT;
