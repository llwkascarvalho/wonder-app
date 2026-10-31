import {
  listarCategoriasPrestador,
  listarHorariosPrestador,
} from '../services/catalogo';
import { Categoria, Horario, Prestador } from '../types/catalogo';

export type ProviderCardModel = {
  prestador: Prestador;
  categorias: Categoria[];
  atendeHoje: boolean | null;
};

const APP_TIMEZONE = 'America/Fortaleza';

function getLocalNow(data: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    month: '2-digit',
    timeZone: APP_TIMEZONE,
    weekday: 'short',
    year: 'numeric',
  }).formatToParts(data);

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

export function atendeHoje(horarios: Horario[], data = new Date()) {
  const agora = getLocalNow(data);

  return horarios.some((horario) => {
    if (horario.dia_semana !== agora.diaSemana) {
      return false;
    }

    return parseTimeMinutes(horario.hora_fim) > agora.minutos;
  });
}

async function carregarDadosCard(prestador: Prestador, signal?: AbortSignal): Promise<ProviderCardModel> {
  const [categoriasResult, horariosResult] = await Promise.allSettled([
    listarCategoriasPrestador(prestador.id, signal),
    listarHorariosPrestador(prestador.id, signal),
  ]);

  if (signal?.aborted) throw new Error('Consulta cancelada.');

  const categorias = categoriasResult.status === 'fulfilled' ? categoriasResult.value : [];

  return {
    prestador,
    categorias,
    atendeHoje: horariosResult.status === 'fulfilled' ? atendeHoje(horariosResult.value) : null,
  };
}

export async function carregarCardsPrestadores(prestadores: Prestador[], signal?: AbortSignal) {
  const resultados = await Promise.all(prestadores.map((prestador) => carregarDadosCard(prestador, signal)));

  return resultados.sort((a, b) => {
    const prioridade = (valor: boolean | null) => valor === true ? 0 : valor === false ? 1 : 2;
    if (a.atendeHoje !== b.atendeHoje) {
      return prioridade(a.atendeHoje) - prioridade(b.atendeHoje);
    }

    return a.prestador.nome_estab.localeCompare(b.prestador.nome_estab);
  });
}
