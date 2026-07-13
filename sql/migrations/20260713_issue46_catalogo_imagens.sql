-- Issue 46: imagens principais do Catalogo.
-- Categoria.foto ja existe no schema inicial; adiciona apenas campos ausentes.

ALTER TABLE Prestador
    ADD COLUMN IF NOT EXISTS foto VARCHAR(500);

ALTER TABLE Servico
    ADD COLUMN IF NOT EXISTS foto VARCHAR(500);
