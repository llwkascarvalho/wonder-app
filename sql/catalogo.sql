-- ─── TABELAS PRINCIPAIS ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS Categoria (
    id      SERIAL PRIMARY KEY,
    nome    VARCHAR(100) NOT NULL,
    foto    VARCHAR(500)
);

CREATE TABLE IF NOT EXISTS Prestador (
    id          SERIAL PRIMARY KEY,
    usuario_id  INTEGER NOT NULL UNIQUE,
    nome_estab  VARCHAR(255) NOT NULL,
    documento   VARCHAR(20),
    status      VARCHAR(20) NOT NULL DEFAULT 'rascunho',
    enviado_em  TIMESTAMP,
    aprovado_em TIMESTAMP,
    aprovado_por VARCHAR(50),
    motivo_rejeicao TEXT,
    criado_em   TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK (status IN ('rascunho', 'pendente', 'ativo', 'rejeitado', 'suspenso'))
);

CREATE TABLE IF NOT EXISTS Servico (
    id            SERIAL PRIMARY KEY,
    prestador_id  INTEGER NOT NULL REFERENCES Prestador(id) ON DELETE CASCADE,
    categoria_id  INTEGER REFERENCES Categoria(id),
    nome          VARCHAR(150) NOT NULL,
    preco         DECIMAL(10,2) NOT NULL,
    duracao_min   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS HorarioFuncionamento (
    id            SERIAL PRIMARY KEY,
    prestador_id  INTEGER NOT NULL REFERENCES Prestador(id) ON DELETE CASCADE,
    dia_semana    INTEGER NOT NULL,
    hora_inicio   TIME NOT NULL,
    hora_fim      TIME NOT NULL
);

CREATE TABLE IF NOT EXISTS FotoEstabelecimento (
    id            SERIAL PRIMARY KEY,
    prestador_id  INTEGER NOT NULL REFERENCES Prestador(id) ON DELETE CASCADE,
    url_foto      VARCHAR(500) NOT NULL
);

CREATE TABLE IF NOT EXISTS Avaliacao (
    id              SERIAL PRIMARY KEY,
    agendamento_id  INTEGER NOT NULL UNIQUE,
    prestador_id    INTEGER NOT NULL REFERENCES Prestador(id),
    nota            SMALLINT NOT NULL CHECK (nota BETWEEN 1 AND 5),
    criado_em       TIMESTAMP NOT NULL DEFAULT NOW()
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

-- ─── TRIGGERS APLICADOS ────────────────────────────────────────────────────

CREATE OR REPLACE TRIGGER trg_auditoria_prestador
    AFTER INSERT OR UPDATE OR DELETE ON Prestador
    FOR EACH ROW EXECUTE FUNCTION fn_auditoria();

CREATE OR REPLACE TRIGGER trg_auditoria_servico
    AFTER INSERT OR UPDATE OR DELETE ON Servico
    FOR EACH ROW EXECUTE FUNCTION fn_auditoria();

CREATE OR REPLACE TRIGGER trg_auditoria_horario
    AFTER INSERT OR UPDATE OR DELETE ON HorarioFuncionamento
    FOR EACH ROW EXECUTE FUNCTION fn_auditoria();

CREATE OR REPLACE TRIGGER trg_auditoria_avaliacao
    AFTER INSERT OR UPDATE OR DELETE ON Avaliacao
    FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
