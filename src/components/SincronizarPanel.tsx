import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  CloudOff,
  RefreshCw,
  Loader2,
  CheckCircle2,
  TriangleAlert,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";

import { syncPending, usePendingOps, useOnlineStatus } from "@/lib/offline";

const TABELA_LABEL: Record<string, string> = {
  empresas: "Empresas",
  trabalhadores: "Trabalhadores",
  documentos_sst: "Documentos SST",
  inspecoes: "Inspeções",
  inspecao_itens: "Itens de inspeção",
  levantamentos_risco: "Levantamentos de risco",
  levantamento_riscos: "Riscos levantados",
  ordens_servico: "Ordens de serviço",
  tarefas: "Tarefas",
  asos: "ASO / eSocial",
};

const ACAO_LABEL: Record<string, string> = {
  insert: "Cadastro",
  update: "Alteração",
  delete: "Exclusão",
};

export function SincronizarPanel() {
  const online = useOnlineStatus();
  const { ops, count } = usePendingOps();
  const [syncing, setSyncing] = useState(false);
  const qc = useQueryClient();

  const handleSync = async () => {
    if (!online) {
      toast.error("Sem internet. Conecte-se e tente novamente.");
      return;
    }
    setSyncing(true);
    try {
      const r = await syncPending();
      await qc.invalidateQueries();
      if (r.erros === 0) {
        toast.success(
          r.enviados === 0
            ? "Nada pendente. Tudo já está sincronizado."
            : `${r.enviados} registro(s) enviados com sucesso.`,
        );
      } else {
        toast.error(`${r.erros} registro(s) não puderam ser enviados. ${r.mensagens[0] ?? ""}`);
      }
    } finally {
      setSyncing(false);
    }
  };

  return (
    <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-elegant sm:p-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <RefreshCw className="h-4 w-4 shrink-0 text-primary" />
          <h2 className="truncate text-base font-bold text-foreground">Sincronizar</h2>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold ${
            online ? "bg-primary/10 text-primary" : "bg-amber-500/15 text-amber-600"
          }`}
        >
          {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {online ? "Online" : "Offline"}
        </span>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        O app funciona sem internet: os cadastros feitos em campo ficam guardados no aparelho. Ao
        voltar a ter conexão, toque em “Sincronizar agora” para enviar tudo para a nuvem.
      </p>

      {count > 0 ? (
        <div className="mt-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3">
          <div className="flex items-center gap-2">
            <TriangleAlert className="h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
              {count} registro(s) pendente(s) de sincronização
            </p>
          </div>
          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-[11px] text-muted-foreground">
            {ops.slice(0, 30).map((o) => (
              <li key={o.id}>
                • {ACAO_LABEL[o.type] ?? o.type} em{" "}
                <strong className="text-foreground">{TABELA_LABEL[o.table] ?? o.table}</strong> ·{" "}
                {new Date(o.createdAt).toLocaleString("pt-BR")}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border bg-muted/40 p-3">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
          <p className="text-xs font-semibold text-muted-foreground">
            Nenhum dado pendente. Tudo sincronizado.
          </p>
        </div>
      )}

      <button
        onClick={handleSync}
        disabled={syncing}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-brand px-5 py-3 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-60 sm:w-auto"
      >
        {syncing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : online ? (
          <RefreshCw className="h-4 w-4" />
        ) : (
          <CloudOff className="h-4 w-4" />
        )}
        Sincronizar agora
      </button>
    </section>
  );
}
