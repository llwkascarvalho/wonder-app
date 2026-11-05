import { Avaliacao } from '../types/avaliacao';

export function podeAvaliarAgendamento(
  status: string,
  consultaConcluida: boolean,
  avaliacao?: Avaliacao
): boolean {
  return status === 'concluido' && consultaConcluida && !avaliacao;
}

export function calcularMediaAvaliacoes(avaliacoes: Avaliacao[]): number {
  if (avaliacoes.length === 0) return 0;
  return avaliacoes.reduce((total, avaliacao) => total + avaliacao.nota, 0) / avaliacoes.length;
}
