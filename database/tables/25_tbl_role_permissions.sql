-- Table 25 of 58: tbl_role_permissions

CREATE TABLE tbl_role_permissions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id       BIGINT NOT NULL REFERENCES mst_roles(id),
    permission_id BIGINT NOT NULL REFERENCES mst_permissions(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (role_id, permission_id)
);
