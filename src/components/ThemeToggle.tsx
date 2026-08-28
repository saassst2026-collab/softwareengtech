import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type ThemeMode } from "@/lib/theme";
import { cn } from "@/lib/utils";

const OPTS: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Claro", icon: Sun },
  { id: "dark", label: "Escuro", icon: Moon },
  { id: "system", label: "Sistema", icon: Monitor },
];

export function ThemeToggle() {
  const { mode, setMode } = useTheme();
  return (
    <div className="inline-flex items-center gap-1 rounded-2xl border border-border bg-background p-1">
      {OPTS.map((o) => {
        const Icon = o.icon;
        const active = mode === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => setMode(o.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition",
              active
                ? "bg-gradient-brand text-primary-foreground shadow-glow"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            aria-pressed={active}
          >
            <Icon className="h-3.5 w-3.5" />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
