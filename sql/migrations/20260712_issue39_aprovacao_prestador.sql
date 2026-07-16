-- Issue 39: fluxo de solicitacao e aprovacao de prestadores.
-- Preserva registros existentes: nenhum status atual e rebaixado.
-- A Issue 40 deve complementar a regra de categoria com PrestadorCategoria.

ALTER TABLE Prestador
    ALTER COLUMN status SET DEFAULT 'rascunho';

ALTER TABLE Prestador
    ADD COLUMN IF NOT EXISTS enviado_em TIMESTAMP,
    ADD COLUMN IF NOT EXISTS aprovado_em TIMESTAMP,
    ADD COLUMN IF NOT EXISTS aprovado_por VARCHAR(50),
    ADD COLUMN IF NOT EXISTS motivo_rejeicao TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_prestador_status_aprovacao'
    ) THEN
        ALTER TABLE Prestador
            ADD CONSTRAINT chk_prestador_status_aprovacao
            CHECK (status IN ('rascunho', 'pendente', 'ativo', 'rejeitado', 'suspenso'))
            NOT VALID;
    END IF;
END;
$$;
