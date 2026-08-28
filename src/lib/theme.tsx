import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeMode = "light" | "dark" | "system";
const STORAGE_KEY = "engtech-theme";

interface ThemeCtx {
  mode: ThemeMode;
  resolved: "light" | "dark";
  setMode: (m: ThemeMode) => void;
  toggle: () => void;
}

const Ctx = createContext<ThemeCtx | undefined>(undefined);

function applyTheme(mode: ThemeMode): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const resolved: "light" | "dark" = mode === "system" ? (prefersDark ? "dark" : "light") : mode;
  const root = document.documentElement;
  if (resolved === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  root.style.colorScheme = resolved;
  return resolved;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("light");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved =
      (typeof localStorage !== "undefined"
        ? (localStorage.getItem(STORAGE_KEY) as ThemeMode | null)
        : null) ?? "system";
    setModeState(saved);
    setResolved(applyTheme(saved));

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if ((localStorage.getItem(STORAGE_KEY) ?? "system") === "system") {
        setResolved(applyTheme("system"));
      }
    };
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    localStorage.setItem(STORAGE_KEY, m);
    setModeState(m);
    setResolved(applyTheme(m));
  }, []);

  const toggle = useCallback(() => {
    setMode(resolved === "dark" ? "light" : "dark");
  }, [resolved, setMode]);

  return <Ctx.Provider value={{ mode, resolved, setMode, toggle }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme deve ser usado dentro de ThemeProvider");
  return ctx;
}
