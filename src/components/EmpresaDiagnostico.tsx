import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FileWarning,
  ListChecks,
  Send,
  Stethoscope,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { gerarDiagnostico, STATUS_META } from "@/lib/diagnostico";
import { ProgressBar } from "@/components/ProgressBar";
import { cn } from "@/lib/utils";

const PRI_COLOR: Record<string, string> = {
  urgente: "border-l-destructive bg-destructive/5",
  alta: "border-l-warning bg-warning/10",
  media: "border-l-info bg-info/5",
  baixa: "border-l-success bg-success/5",
};

export function EmpresaDiagnostico({ empresaId }: { empresaId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["diagnostico-empresa", empresaId],
    queryFn: async () => {
      const [docs, asos, eventos, tarefas, propostas] = await Promise.all([
        supabase
          .from("documentos_sst")
          .select("id,tipo,situacao,data_vencimento,data_conclusao,conferencia_ok")
          .eq("empresa_id", empresaId),
        supabase.from("asos").select("id,data_aso,tipo_aso").eq("empresa_id", empresaId),
        supabase.from("eventos_esocial").select("id,status").eq("empresa_id", empresaId),
        (supabase as any).from("tarefas").select("id,status,prazo").eq("empresa_id", empresaId),
        supabase.from("propostas").select("id,status").eq("empresa_id", empresaId),
      ]);
      return {
        documentos: docs.data ?? [],
        asos: asos.data ?? [],
        eventos: eventos.data ?? [],
        tarefas: tarefas.data ?? [],
        propostas: propostas.data ?? [],
      };
    },
  });

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-border/60 bg-card p-8 text-center text-sm text-muted-foreground">
        Analisando empresa…
      </div>
    );
  }

  const diag = gerarDiagnostico(data as any);
  const meta = STATUS_META[diag.status];

  return (
    <div className="flex flex-col gap-5">
      <section
        className={cn(
          "rounded-3xl border border-border/60 bg-card p-6 shadow-elegant ring-2",
          meta.ring,
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-2xl",
                meta.bg,
                meta.text,
              )}
            >
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Status geral
              </p>
              <p className={cn("text-2xl font-extrabold", meta.text)}>{meta.label}</p>
            </div>
          </div>
          <div className="min-w-[200px] flex-1 sm:max-w-md">
            <div className="mb-1 flex items-center justify-between text-xs font-bold">
              <span className="text-muted-foreground">Conformidade</span>
              <span className="text-foreground">{diag.percentualConformidade.toFixed(0)}%</span>
            </div>
            <ProgressBar value={diag.percentualConformidade} />
          </div>
        </div>
        {diag.pendenciasTop.length > 0 && (
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {diag.pendenciasTop.map((p, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-xl border border-border/60 bg-background px-3 py-2 text-xs"
              >
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                <span className="text-foreground">{p}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DiagCard
          icon={FileWarning}
          tone="warning"
          label="Documentos"
          main={`${diag.documentos.vencidos} vencidos`}
          sub={`${diag.documentos.proximos} próximos · ${diag.documentos.total} no total`}
        />
        <DiagCard
          icon={Stethoscope}
          tone="info"
          label="ASOs"
          main={`${diag.asos.vencidos} vencidos`}
          sub={`${diag.asos.total} cadastrados`}
        />
        <DiagCard
          icon={Send}
          tone="primary"
          label="eSocial"
          main={`${diag.eventos.pendentes} pendentes`}
          sub="Eventos S-2210/2220/2240"
        />
        <DiagCard
          icon={ListChecks}
          tone="success"
          label="Tarefas"
          main={`${diag.tarefas.abertas} abertas`}
          sub={`${diag.tarefas.vencidas} vencidas`}
        />
      </section>

      {diag.documentos.ausentes.length > 0 && (
        <section className="rounded-3xl border border-destructive/30 bg-destructive/5 p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <h3 className="text-sm font-bold text-destructive">Documentos obrigatórios ausentes</h3>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {diag.documentos.ausentes.map((d) => (
              <span
                key={d}
                className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-extrabold text-destructive"
              >
                {d}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-elegant">
        <div className="mb-3 flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Recomendações inteligentes</h3>
        </div>
        <ul className="flex flex-col gap-2">
          {diag.recomendacoes.map((r, i) => (
            <li
              key={i}
              className={cn(
                "flex items-start gap-3 rounded-xl border-l-4 bg-background px-3 py-2.5 text-sm",
                PRI_COLOR[r.prioridade],
              )}
            >
              {r.prioridade === "baixa" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              ) : (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              )}
              <div className="flex-1">
                <p className="text-foreground">{r.texto}</p>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  Prioridade {r.prioridade}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function DiagCard({
  icon: Icon,
  tone,
  label,
  main,
  sub,
}: {
  icon: any;
  tone: "primary" | "info" | "warning" | "success";
  label: string;
  main: string;
  sub: string;
}) {
  const map = {
    primary: "from-primary/15 to-primary/0 text-primary",
    info: "from-info/15 to-info/0 text-info",
    warning: "from-warning/20 to-warning/0 text-warning-foreground",
    success: "from-success/15 to-success/0 text-success",
  } as const;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-4 shadow-elegant transition hover:-translate-y-0.5 hover:shadow-glow">
      <div
        className={cn(
          "pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br opacity-80",
          map[tone],
        )}
      />
      <div className="relative flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 text-xl font-extrabold text-foreground">{main}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>
        </div>
        <div className={cn("rounded-xl bg-background/80 p-2", map[tone].split(" ").pop())}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}
