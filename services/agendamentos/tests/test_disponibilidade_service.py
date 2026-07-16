import os
import sys
import types
import unittest
from contextlib import ExitStack
from datetime import date, datetime, time, timedelta
from pathlib import Path
from unittest.mock import patch


os.environ.setdefault("AGENDAMENTOS_DB_HOST", "localhost")
os.environ.setdefault("AGENDAMENTOS_DB_PORT", "5432")
os.environ.setdefault("AGENDAMENTOS_DB_NAME", "test")
os.environ.setdefault("AGENDAMENTOS_DB_USER", "test")
os.environ.setdefault("AGENDAMENTOS_DB_PASSWORD", "test")

SERVICE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVICE_ROOT))


class DummyHTTPException(Exception):
    def __init__(self, status_code: int, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


fastapi_module = types.ModuleType("fastapi")
fastapi_module.HTTPException = DummyHTTPException
sys.modules.setdefault("fastapi", fastapi_module)

sqlalchemy_module = types.ModuleType("sqlalchemy")
sqlalchemy_module.text = lambda value: value
sys.modules.setdefault("sqlalchemy", sqlalchemy_module)

sqlalchemy_orm_module = types.ModuleType("sqlalchemy.orm")
sqlalchemy_orm_module.Session = object
sys.modules.setdefault("sqlalchemy.orm", sqlalchemy_orm_module)

config_module = types.ModuleType("src.main.core.config")
config_module.settings = types.SimpleNamespace(
    CATALOGO_URL="http://catalogo:8002",
    APP_TIMEZONE="America/Fortaleza",
)
sys.modules["src.main.core.config"] = config_module

model_module = types.ModuleType("src.main.models.agendamento_model")
model_module.Agendamento = object
sys.modules["src.main.models.agendamento_model"] = model_module

from src.main.services import disponibilidade_service as svc  # noqa: E402


def first_date_for_iso_weekday(year: int, month: int, iso_weekday: int) -> date:
    current = date(year, month, 1)
    while current.isoweekday() != iso_weekday:
        current = current.replace(day=current.day + 1)
    return current


class DisponibilidadeDiaSemanaTest(unittest.TestCase):
    def setUp(self):
        self.db = object()
        self.prestador_id = 1
        self.servico_id = 10
        self.servico = svc.ServicoCatalogo(
            id=self.servico_id,
            prestador_id=self.prestador_id,
            duracao_min=60,
        )
        self.horarios = [
            svc.HorarioFuncionamentoCatalogo(1, time(8, 0), time(10, 0)),
            svc.HorarioFuncionamentoCatalogo(2, time(9, 0), time(11, 0)),
            svc.HorarioFuncionamentoCatalogo(7, time(14, 0), time(16, 0)),
        ]

    def patches(self):
        stack = ExitStack()
        stack.enter_context(patch.object(svc, "buscar_servicos_catalogo", return_value=[self.servico]))
        stack.enter_context(patch.object(svc, "buscar_horarios_catalogo", return_value=self.horarios))
        stack.enter_context(patch.object(svc, "listar_agendamentos_bloqueadores_do_dia", return_value=[]))
        stack.enter_context(patch.object(svc, "agora_local", return_value=datetime(2098, 1, 1, 0, 0)))
        return stack

    def test_endpoint_diario_respeita_convencao_catalogo(self):
        casos = [
            (1, first_date_for_iso_weekday(2099, 1, 1), time(8, 0)),
            (2, first_date_for_iso_weekday(2099, 1, 2), time(9, 0)),
            (7, first_date_for_iso_weekday(2099, 1, 7), time(14, 0)),
        ]

        with self.patches():
            for dia_semana, data, hora_inicio in casos:
                with self.subTest(dia_semana=dia_semana):
                    _, slots = svc.calcular_disponibilidade(
                        self.db,
                        self.prestador_id,
                        self.servico_id,
                        data,
                        headers={},
                    )

                    self.assertGreater(len(slots), 0)
                    self.assertEqual(slots[0].inicio.date(), data)
                    self.assertEqual(slots[0].inicio.time(), hora_inicio)

    def test_endpoint_mensal_respeita_convencao_catalogo(self):
        segunda = first_date_for_iso_weekday(2099, 1, 1)
        terca = first_date_for_iso_weekday(2099, 1, 2)
        domingo = first_date_for_iso_weekday(2099, 1, 7)

        with self.patches():
            _, dias = svc.calcular_dias_disponiveis(
                self.db,
                self.prestador_id,
                self.servico_id,
                "2099-01",
                headers={},
            )

        self.assertIn(segunda, dias)
        self.assertIn(terca, dias)
        self.assertIn(domingo, dias)

    def test_revalidacao_criacao_respeita_convencao_catalogo(self):
        casos = [
            (first_date_for_iso_weekday(2099, 1, 1), time(8, 0)),
            (first_date_for_iso_weekday(2099, 1, 2), time(9, 0)),
            (first_date_for_iso_weekday(2099, 1, 7), time(14, 0)),
        ]

        with self.patches():
            for data, hora_inicio in casos:
                with self.subTest(data=data):
                    servico = svc.validar_intervalo_para_criacao(
                        self.db,
                        self.prestador_id,
                        self.servico_id,
                        inicio=svc.datetime.combine(data, hora_inicio),
                        headers={},
                    )

                    self.assertEqual(servico.id, self.servico_id)


class DisponibilidadeTimezoneTest(unittest.TestCase):
    def setUp(self):
        self.db = object()
        self.prestador_id = 1
        self.servico_id = 20
        self.data = first_date_for_iso_weekday(2099, 1, 1)
        self.servico = svc.ServicoCatalogo(
            id=self.servico_id,
            prestador_id=self.prestador_id,
            duracao_min=30,
        )
        self.horarios = [
            svc.HorarioFuncionamentoCatalogo(
                self.data.isoweekday(),
                time(8, 0),
                time(23, 0),
            )
        ]

    def patches(self, agora: datetime):
        stack = ExitStack()
        stack.enter_context(patch.object(svc, "buscar_servicos_catalogo", return_value=[self.servico]))
        stack.enter_context(patch.object(svc, "buscar_horarios_catalogo", return_value=self.horarios))
        stack.enter_context(patch.object(svc, "listar_agendamentos_bloqueadores_do_dia", return_value=[]))
        stack.enter_context(patch.object(svc, "agora_local", return_value=agora))
        return stack

    def test_horario_local_define_primeiro_slot_disponivel(self):
        agora = datetime.combine(self.data, time(18, 30))

        with self.patches(agora):
            _, slots = svc.calcular_disponibilidade(
                self.db,
                self.prestador_id,
                self.servico_id,
                self.data,
                headers={},
            )

        self.assertGreater(len(slots), 0)
        self.assertEqual(slots[0].inicio.time(), time(19, 0))
        self.assertTrue(all(slot.inicio > agora for slot in slots))

    def test_data_futura_mantem_slots_normais(self):
        agora = datetime.combine(self.data, time(18, 30))
        data_futura = self.data + timedelta(days=7)
        self.horarios = [
            svc.HorarioFuncionamentoCatalogo(
                data_futura.isoweekday(),
                time(8, 0),
                time(23, 0),
            )
        ]

        with self.patches(agora):
            _, slots = svc.calcular_disponibilidade(
                self.db,
                self.prestador_id,
                self.servico_id,
                data_futura,
                headers={},
            )

        self.assertGreater(len(slots), 0)
        self.assertEqual(slots[0].inicio.time(), time(8, 0))

    def test_depois_do_fim_do_expediente_retorna_vazio(self):
        agora = datetime.combine(self.data, time(23, 0))

        with self.patches(agora):
            _, slots = svc.calcular_disponibilidade(
                self.db,
                self.prestador_id,
                self.servico_id,
                self.data,
                headers={},
            )

        self.assertEqual(slots, [])

    def test_endpoint_mensal_usa_horario_local(self):
        agora = datetime.combine(self.data, time(18, 30))

        with self.patches(agora):
            _, dias = svc.calcular_dias_disponiveis(
                self.db,
                self.prestador_id,
                self.servico_id,
                "2099-01",
                headers={},
            )

        self.assertIn(self.data, dias)

    def test_revalidacao_criacao_usa_horario_local(self):
        agora = datetime.combine(self.data, time(18, 30))

        with self.patches(agora):
            servico = svc.validar_intervalo_para_criacao(
                self.db,
                self.prestador_id,
                self.servico_id,
                inicio=datetime.combine(self.data, time(19, 0)),
                headers={},
            )

        self.assertEqual(servico.id, self.servico_id)


if __name__ == "__main__":
    unittest.main()
