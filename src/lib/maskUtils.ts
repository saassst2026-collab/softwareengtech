/**
 * Máscaras de CPF e CNPJ.
 *
 * - `maskCpf`: 000.000.000-00
 * - `maskCnpj`: 00.000.000/0000-00
 * - `maskCpfCnpj`: aplica CPF se ≤ 11 dígitos, senão CNPJ.
 */

function onlyDigits(value: string): string {
  return (value || "").replace(/\D+/g, "");
}

export function maskCpf(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function maskCnpj(value: string): string {
  const d = onlyDigits(value).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function maskCpfCnpj(value: string): string {
  const d = onlyDigits(value);
  return d.length <= 11 ? maskCpf(value) : maskCnpj(value);
}
