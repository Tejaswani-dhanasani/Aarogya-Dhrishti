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
