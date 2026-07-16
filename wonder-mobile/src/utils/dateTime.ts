const BACKEND_TIME_ZONE = 'America/Fortaleza';
const HAS_TIMEZONE_PATTERN = /(?:Z|[+-]\d{2}:?\d{2})$/;

export function parseBackendDate(value: string): Date {
  const normalized = HAS_TIMEZONE_PATTERN.test(value) ? value : `${value}Z`;
  return new Date(normalized);
}

export function formatBackendDateTime(
  value?: string | null,
  fallback = '-',
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!value) {
    return fallback;
  }

  const date = parseBackendDate(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('pt-BR', {
    timeZone: BACKEND_TIME_ZONE,
    ...options,
  });
}
