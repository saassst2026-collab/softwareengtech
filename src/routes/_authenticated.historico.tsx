import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, History as HistoryIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { supabase } from "@/integrations/supabase/client";
import { PageHero } from "@/components/PageHero";
import { useUserRole } from "@/lib/useUserRole";
import { cn } from "@/lib/utils";
import { ReportButton } from "@/components/ReportButton";
import type { RelatorioOpcao } from "@/components/RelatorioDialog";

export const Route = createFileRoute("/_authenticated/historico")({
  component: HistoricoPage,
});

const MODULO_COLOR: Record<string, string> = {
  empresas: "bg-blue-50 text-blue-700 border-blue-200",
  documentos: "bg-emerald-50 text-emerald-700 border-emerald-200",
  asos: "bg-violet-50 text-violet-700 border-violet-200",
  esocial: "bg-cyan-50 text-cyan-700 border-cyan-200",
  tarefas: "bg-amber-50 text-amber-700 border-amber-200",
  usuarios: "bg-rose-50 text-rose-700 border-rose-200",
  auth: "bg-slate-100 text-slate-700 border-slate-200",
  propostas: "bg-indigo-50 text-indigo-700 border-indigo-200",
  outros: "bg-muted text-muted-foreground border-border",
};

function HistoricoPage() {
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const [filtroModulo, setFiltroModulo] = useState<string>("todos");
  const [filtroUsuario, setFiltroUsuario] = useState<string>("todos");
  const [busca, setBusca] = useState("");
  const [periodo, setPeriodo] = useState<"7d" | "30d" | "90d" | "todos">("30d");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-log", periodo],
    enabled: isAdmin,
    queryFn: async () => {
      let q = (supabase as any)
        .from("system_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (periodo !== "todos") {
        const days = periodo === "7d" ? 7 : periodo === "30d" ? 30 : 90;
        const since = new Date();
        since.setDate(since.getDate() - days);
        q = q.gte("created_at", since.toISOString());
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const usuarios = useMemo(() => {
    const set = new Map<string, string>();
    logs.forEach((l) => l.user_id && set.set(l.user_id, l.user_name || l.user_id));
    return Array.from(set.entries()).map(([id, nome]) => ({ id, nome }));
  }, [logs]);

  const filtrados = useMemo(() => {
    return logs.filter((l) => {
      if (filtroModulo !== "todos" && l.modulo !== filtroModulo) return false;
      if (filtroUsuario !== "todos" && l.user_id !== filtroUsuario) return false;
      if (busca) {
        const q = busca.toLowerCase();
        const txt = `${l.acao} ${l.descricao ?? ""} ${l.user_name ?? ""}`.toLowerCase();
        if (!txt.includes(q)) return false;
      }
      return true;
    });
  }, [logs, filtroModulo, filtroUsuario, busca]);

  if (roleLoading) return null;
  if (!isAdmin) {
    return (
      <div className="rounded-3xl border border-border bg-card p-10 text-center">
        <p className="text-sm font-bold text-foreground">
          Acesso restrito ao Administrador Principal.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title="Histórico do Sistema"
        subtitle="Auditoria completa das ações realizadas pelos usuários da plataforma."
        actions={
          <ReportButton
            modulo="outros"
            getOpcoes={() => buildHistoricoOpcoes({ logs, filtrados })}
          />
        }
      />

      <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-elegant">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar ação, descrição ou usuário…"
              className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value as any)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold"
          >
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
            <option value="todos">Todos</option>
          </select>
          <select
            value={filtroModulo}
            onChange={(e) => setFiltroModulo(e.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold"
          >
            <option value="todos">Todos os módulos</option>
            {Object.keys(MODULO_COLOR).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={filtroUsuario}
            onChange={(e) => setFiltroUsuario(e.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold"
          >
            <option value="todos">Todos os usuários</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Carregando histórico…
          </div>
        ) : filtrados.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 py-16 text-center">
            <HistoryIcon className="mx-auto h-10 w-10 text-muted-foreground/60" />
            <p className="mt-3 text-sm font-semibold text-foreground">Nenhum evento encontrado</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Ajuste os filtros ou aguarde novas ações no sistema.
            </p>
          </div>
        ) : (
          <ol className="relative ml-3 border-l-2 border-border/70">
            {filtrados.map((l) => (
              <li key={l.id} className="mb-4 ml-5">
                <span className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full border-2 border-card bg-primary" />
                <div className="rounded-2xl border border-border bg-background p-3 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase",
                        MODULO_COLOR[l.modulo] ?? MODULO_COLOR.outros,
                      )}
                    >
                      {l.modulo}
                    </span>
                    <span className="text-sm font-bold text-foreground">{l.acao}</span>
                    <span className="ml-auto text-[11px] text-muted-foreground">
                      {format(new Date(l.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                    </span>
                  </div>
                  {l.descricao && <p className="mt-1 text-xs text-foreground/80">{l.descricao}</p>}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    por <strong className="text-foreground">{l.user_name ?? "—"}</strong>
                    {l.entidade_tipo && <span> · {l.entidade_tipo}</span>}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function buildHistoricoOpcoes(args: { logs: any[]; filtrados: any[] }): RelatorioOpcao[] {
  const { logs, filtrados } = args;
  const colunas = [
    { header: "Data/Hora" },
    { header: "Módulo" },
    { header: "Ação" },
    { header: "Usuário" },
    { header: "Descrição" },
  ];
  const toLinha = (l: any): Array<string | number> => [
    format(new Date(l.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR }),
    l.modulo ?? "—",
    l.acao ?? "—",
    l.user_name ?? "—",
    l.descricao ?? "",
  ];
  const make = (id: string, label: string, list: any[], descricao?: string): RelatorioOpcao => ({
    id,
    label,
    descricao,
    build: () => ({
      titulo: label,
      colunas,
      linhas: list.map(toLinha),
      totalizadores: [{ label: "Total de eventos", value: String(list.length) }],
    }),
  });
  return [
    make("todos", "Todas as ações do período", logs),
    make(
      "filtrados",
      "Ações conforme filtros atuais",
      filtrados,
      "Usa os filtros já aplicados na tela",
    ),
    make(
      "criticas",
      "Ações críticas (exclusões e revogações)",
      logs.filter((l) => /excluiu|revogou|delete|removeu/i.test(l.acao ?? "")),
    ),
  ];
}
