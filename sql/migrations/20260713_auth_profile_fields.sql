-- Campos comuns de perfil do usuario Wonder.
-- Mantem username como nome interno e reutiliza foto_perfil como foto_url na API.

ALTER TABLE customuser
    ADD COLUMN IF NOT EXISTS telefone VARCHAR(30),
    ADD COLUMN IF NOT EXISTS foto_perfil VARCHAR(500);
