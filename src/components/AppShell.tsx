import { useEffect, useState, type ReactNode } from "react";
import { Menu, X, WifiOff, CloudUpload } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { AppSidebar } from "./AppSidebar";
import engtechLogo from "@/assets/engtech-logo.jpeg.asset.json";
import { useOfflineRuntime } from "@/lib/offlinePersist";
import { useOnlineStatus, usePendingCount } from "@/lib/offline";
import { registerAppServiceWorker } from "@/lib/registerSW";

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  useOfflineRuntime();
  const online = useOnlineStatus();
  const pendentes = usePendingCount();

  useEffect(() => {
    registerAppServiceWorker();
  }, []);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar desktop */}
      <div className="sticky top-0 hidden h-screen lg:block">
        <AppSidebar />
      </div>

      {/* Sidebar mobile (drawer) */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" />
          <div
            className="absolute left-0 top-0 h-full max-w-[86vw] overflow-y-auto shadow-elegant"
            onClick={(e) => e.stopPropagation()}
          >
            <AppSidebar onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar mobile */}
        <header className="safe-top sticky top-0 z-40 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border bg-card/80 px-3 py-2.5 backdrop-blur lg:hidden">
          <img
            src={engtechLogo.url}
            alt="EngTech - Saúde e Segurança do Trabalho"
            className="h-8 w-auto min-w-0 object-contain"
          />
          <div className="flex shrink-0 items-center gap-2">
            {!online && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/15 px-2 py-1 text-[10px] font-bold text-amber-600">
                <WifiOff className="h-3.5 w-3.5" /> Offline
              </span>
            )}
            {pendentes > 0 && (
              <Link
                to="/configuracoes"
                className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary"
                aria-label="Dados pendentes de sincronização"
              >
                <CloudUpload className="h-3.5 w-3.5" /> {pendentes}
              </Link>
            )}
            <button
              onClick={() => setOpen((v) => !v)}
              className="rounded-lg border border-border bg-card p-2 text-foreground"
              aria-label="Menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </header>

        <main className="safe-bottom w-full min-w-0 flex-1 p-3 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
