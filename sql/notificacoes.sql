-- ─── TABELAS PRINCIPAIS ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS Notificacao (
    id          SERIAL PRIMARY KEY,
    usuario_id  INTEGER NOT NULL,
    mensagem    TEXT NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'pendente',
    criado_em   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── AUDITORIA ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS logs_auditoria (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id     INTEGER,
    operacao       VARCHAR(10) NOT NULL,
    tabela_afetada VARCHAR(100) NOT NULL,
    dados_antigos  JSONB,
    dados_novos    JSONB,
    data_hora      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── FUNÇÃO GENÉRICA DO TRIGGER ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_auditoria()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id INTEGER;
    v_row     JSONB;
BEGIN
    -- Define qual registro usar como referência
    IF (TG_OP = 'DELETE') THEN
        v_row := to_jsonb(OLD);
    ELSE
        v_row := to_jsonb(NEW);
    END IF;

    -- Tenta extrair usuario_id da linha (tabelas como Prestador, Agendamento, Notificacao)
    v_user_id := (v_row->>'usuario_id')::INTEGER;

    -- Regra especial: na tabela CustomUser o ator é o próprio registro
    IF TG_TABLE_NAME ILIKE 'customuser' THEN
        v_user_id := (v_row->>'id')::INTEGER;
    END IF;

    -- Registra o log
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO logs_auditoria (usuario_id, operacao, tabela_afetada, dados_antigos, dados_novos)
        VALUES (v_user_id, TG_OP, TG_TABLE_NAME, NULL, v_row);

    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO logs_auditoria (usuario_id, operacao, tabela_afetada, dados_antigos, dados_novos)
        VALUES (v_user_id, TG_OP, TG_TABLE_NAME, to_jsonb(OLD), v_row);

    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO logs_auditoria (usuario_id, operacao, tabela_afetada, dados_antigos, dados_novos)
        VALUES (v_user_id, TG_OP, TG_TABLE_NAME, v_row, NULL);
    END IF;

    -- Retorno ajustado
    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── TRIGGER APLICADO ──────────────────────────────────────────────────────

CREATE OR REPLACE TRIGGER trg_auditoria_notificacao
    AFTER INSERT OR UPDATE ON Notificacao
    FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
