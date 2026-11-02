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
