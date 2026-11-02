-- Table 3 of 58: mst_languages

CREATE TABLE mst_languages (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code        TEXT NOT NULL UNIQUE,            -- 'te', 'en'
    name_en     TEXT NOT NULL,
    native_name TEXT NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE
);
