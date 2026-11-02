-- Table 2 of 58: mst_permissions

CREATE TABLE mst_permissions (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code        TEXT NOT NULL UNIQUE,            -- e.g. review.sign
    resource    TEXT NOT NULL,
    action      TEXT NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
