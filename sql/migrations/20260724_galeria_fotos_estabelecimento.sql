-- Galeria de fotos do estabelecimento (ate 8 fotos por prestador).
-- Independente do campo Prestador.foto, que continua sendo a foto de
-- capa/logo exibida nos cards da Home e da Busca.

CREATE TABLE IF NOT EXISTS foto_estabelecimento (
    id            SERIAL PRIMARY KEY,
    prestador_id  INTEGER NOT NULL REFERENCES prestador(id) ON DELETE CASCADE,
    foto          VARCHAR(500) NOT NULL,
    ordem         INTEGER NOT NULL DEFAULT 0,
    criado_em     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_foto_estabelecimento_prestador
    ON foto_estabelecimento(prestador_id);

CREATE OR REPLACE TRIGGER trg_auditoria_foto_estabelecimento
    AFTER INSERT OR UPDATE OR DELETE ON foto_estabelecimento
    FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
