-- Issue 40: categorias administrativas e vinculo com prestadores.
-- Mantem Servico.categoria_id como categoria do servico.
-- PrestadorCategoria representa as categorias do estabelecimento.

ALTER TABLE Categoria
    ADD COLUMN IF NOT EXISTS descricao TEXT,
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ativa';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_categoria_status'
    ) THEN
        ALTER TABLE Categoria
            ADD CONSTRAINT chk_categoria_status
            CHECK (status IN ('ativa', 'inativa'))
            NOT VALID;
    END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_categoria_nome_lower
    ON Categoria (LOWER(nome));

CREATE TABLE IF NOT EXISTS prestador_categoria (
    id            SERIAL PRIMARY KEY,
    prestador_id  INTEGER NOT NULL REFERENCES Prestador(id) ON DELETE CASCADE,
    categoria_id  INTEGER NOT NULL REFERENCES Categoria(id),
    UNIQUE (prestador_id, categoria_id)
);

CREATE OR REPLACE TRIGGER trg_auditoria_categoria
    AFTER INSERT OR UPDATE OR DELETE ON Categoria
    FOR EACH ROW EXECUTE FUNCTION fn_auditoria();

CREATE OR REPLACE TRIGGER trg_auditoria_prestador_categoria
    AFTER INSERT OR UPDATE OR DELETE ON prestador_categoria
    FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
