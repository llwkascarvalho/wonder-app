import {
  listarCategoriasPrestador,
  listarHorariosPrestador,
} from '../services/catalogo';
import { Categoria, Horario, Prestador } from '../types/catalogo';

export type ProviderCardModel = {
  prestador: Prestador;
  categorias: Categoria[];
  disponivelHoje: boolean;
};

const APP_TIMEZONE = 'America/Fortaleza';

function getLocalNow() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    month: '2-digit',
    timeZone: APP_TIMEZONE,
    weekday: 'short',
    year: 'numeric',
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const localDate = new Date(
    `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:00`
  );
  const jsDay = localDate.getDay();

  return {
    diaSemana: jsDay === 0 ? 7 : jsDay,
    minutos: Number(values.hour) * 60 + Number(values.minute),
  };
}

function parseTimeMinutes(value: string) {
  const [hour, minute] = value.slice(0, 5).split(':').map(Number);
  return hour * 60 + minute;
}

export function estaDisponivelHoje(horarios: Horario[]) {
  const agora = getLocalNow();

  return horarios.some((horario) => {
    if (horario.dia_semana !== agora.diaSemana) {
      return false;
    }

    return parseTimeMinutes(horario.hora_fim) > agora.minutos;
  });
}

async function carregarDadosCard(prestador: Prestador): Promise<ProviderCardModel> {
  const [categoriasResult, horariosResult] = await Promise.allSettled([
    listarCategoriasPrestador(prestador.id),
    listarHorariosPrestador(prestador.id),
  ]);

  const categorias = categoriasResult.status === 'fulfilled' ? categoriasResult.value : [];
  const horarios = horariosResult.status === 'fulfilled' ? horariosResult.value : [];

  return {
    prestador,
    categorias,
    disponivelHoje: estaDisponivelHoje(horarios),
  };
}

export async function carregarCardsPrestadores(prestadores: Prestador[]) {
  const resultados = await Promise.all(prestadores.map(carregarDadosCard));

  return resultados.sort((a, b) => {
    if (a.disponivelHoje !== b.disponivelHoje) {
      return a.disponivelHoje ? -1 : 1;
    }

    return a.prestador.nome_estab.localeCompare(b.prestador.nome_estab);
  });
}
