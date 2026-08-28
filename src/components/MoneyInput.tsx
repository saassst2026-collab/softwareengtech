import { useEffect, useRef, useState } from "react";
import { formatBRL, parseBRLToNumber } from "@/lib/moneyUtils";

type Props = {
  value: number | null | undefined;
  onChange: (n: number | null) => void;
  /** Permite valor vazio (emite null). Caso contrário, vazio = 0. */
  nullable?: boolean;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
};

/**
 * Campo monetário pt-BR. Aceita "1000", "1.000", "1.000,00", "99,90" etc.
 * - Mostra o que o usuário digita (não bloqueia digitação).
 * - Emite o número correto durante a digitação.
 * - Reformata para "1.250,30" ao perder o foco.
 */
export function MoneyInput({
  value,
  onChange,
  nullable,
  className,
  placeholder,
  disabled,
  ariaLabel,
}: Props) {
  const [text, setText] = useState<string>(() => (value == null ? "" : formatBRL(value)));
  const focused = useRef(false);

  // Sincroniza quando o valor externo muda (ex.: reset do form) sem
  // atrapalhar a digitação em andamento.
  useEffect(() => {
    if (focused.current) return;
    const cur = parseBRLToNumber(text);
    const ext = value ?? 0;
    if (value == null && text === "") return;
    if (Math.abs(cur - ext) < 0.0001 && (text !== "" || value != null)) return;
    setText(value == null ? "" : formatBRL(value));
  }, [value, text]);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      placeholder={placeholder ?? "0,00"}
      className={className}
      disabled={disabled}
      aria-label={ariaLabel}
      onFocus={() => {
        focused.current = true;
      }}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        if (raw.trim() === "") {
          onChange(nullable ? null : 0);
          return;
        }
        onChange(parseBRLToNumber(raw));
      }}
      onBlur={() => {
        focused.current = false;
        if (text.trim() === "") {
          if (!nullable) setText(formatBRL(0));
          return;
        }
        const n = parseBRLToNumber(text);
        setText(formatBRL(n));
        onChange(nullable && n === 0 && text.trim() === "" ? null : n);
      }}
    />
  );
}
