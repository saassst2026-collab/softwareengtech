/**
 * Utilitários de data para evitar bugs de timezone.
 *
 * Datas armazenadas no banco como `YYYY-MM-DD` (tipo `date` do Postgres) NÃO
 * possuem componente de horário. Quando fazemos `new Date("2026-04-08")` o
 * JavaScript interpreta como UTC midnight e, em fusos negativos (ex.: BRT
 * UTC-3), o `Date` resultante representa o dia anterior no horário local.
 *
 * Estas funções tratam strings `YYYY-MM-DD` sempre como datas locais.
 */

/** Converte "YYYY-MM-DD" em Date local (00:00 no fuso do navegador). */
export function parseLocalDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!iso) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const [, y, m, d] = iso;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Diferença em dias entre uma data armazenada (YYYY-MM-DD) e hoje (local). */
export function daysFromToday(value: string | null | undefined): number | null {
  const date = parseLocalDate(value);
  if (!date) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const ms = date.getTime() - hoje.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/** Soma `days` a uma data (YYYY-MM-DD) preservando o dia local. */
export function addDaysLocalIso(value: string, days: number): string {
  const date = parseLocalDate(value);
  if (!date) return value;
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
