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
