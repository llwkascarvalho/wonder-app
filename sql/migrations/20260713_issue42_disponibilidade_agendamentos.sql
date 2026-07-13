-- Indice auxiliar para calculo de disponibilidade e bloqueio de horarios.

CREATE INDEX IF NOT EXISTS idx_agendamento_prestador_inicio_status
    ON Agendamento (prestador_id, inicio, status);
