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
