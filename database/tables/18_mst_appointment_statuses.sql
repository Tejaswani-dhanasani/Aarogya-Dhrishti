-- Table 18 of 58: mst_appointment_statuses

CREATE TABLE mst_appointment_statuses (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code        TEXT NOT NULL UNIQUE,
    name_en     TEXT NOT NULL,
    name_te     TEXT,
    is_terminal BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order  SMALLINT NOT NULL DEFAULT 0
);
