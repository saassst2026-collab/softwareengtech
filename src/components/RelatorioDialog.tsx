import { useState } from "react";
import { FileText, Loader2, Download, Sparkles } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppSettings } from "@/lib/useAppSettings";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { logAudit, type AuditModulo } from "@/lib/audit";
import { downloadRelatorioPDF, gerarRelatorioPDF, type ReportData } from "@/lib/reportPdf";

export type RelatorioOpcao = {
  id: string;
  label: string;
  descricao?: string;
  badge?: string;
  isDestaque?: boolean;
  onSelect?: () => void;
  /** Constrói os dados do relatório no momento do clique. */
  build?: () => ReportData | Promise<ReportData>;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo: string;
  modulo: AuditModulo;
  opcoes: RelatorioOpcao[];
};

export function RelatorioDialog({ open, onOpenChange, titulo, modulo, opcoes }: Props) {
  const { settings } = useAppSettings();
  const { user } = useAuth();
  const [gerando, setGerando] = useState<string | null>(null);

  const handleGerar = async (op: RelatorioOpcao) => {
    if (op.onSelect) {
      onOpenChange(false);
      op.onSelect();
      return;
    }
    if (!op.build) return;

    setGerando(op.id);
    try {
      const dados = await op.build();
      const usuario = user
        ? await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", user.id)
            .maybeSingle()
            .then((r) => r.data?.display_name ?? user.email ?? null)
        : null;
      const doc = await gerarRelatorioPDF({
        ...dados,
        usuario: dados.usuario ?? usuario,
        logoUrl: dados.logoUrl ?? settings?.app_icon_url ?? settings?.proposta_logo_url ?? null,
        appName: dados.appName ?? settings?.app_name ?? "EngTech SST",
      });
      downloadRelatorioPDF(doc, dados.titulo);
      await logAudit({
        acao: "gerar_relatorio",
        modulo,
        descricao: `Gerou o relatório "${dados.titulo}"`,
      });
      toast.success("Relatório gerado.");
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Falha ao gerar relatório");
    } finally {
      setGerando(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <FileText className="h-5 w-5" /> {titulo}
          </DialogTitle>
          <DialogDescription>
            Escolha o relatório que deseja gerar. O PDF será baixado automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[60vh] gap-2 overflow-y-auto py-2">
          {opcoes.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              Sem opções disponíveis.
            </p>
          ) : (
            opcoes.map((op) => (
              <button
                key={op.id}
                disabled={gerando !== null}
                onClick={() => handleGerar(op)}
                className={`group flex items-start gap-3 rounded-xl border border-border bg-card px-3 py-3 text-left transition hover:border-primary/40 hover:bg-primary/5 disabled:opacity-60 ${
                  op.isDestaque ? "border-primary/50 bg-primary/5 shadow-sm hover:bg-primary/10" : ""
                }`}
              >
                <div
                  className={`mt-0.5 rounded-lg p-2 ${
                    op.isDestaque
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {gerando === op.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : op.isDestaque ? (
                    <Sparkles className="h-4 w-4" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-foreground">{op.label}</p>
                    {op.badge && (
                      <span className="rounded-md bg-emerald-600/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                        {op.badge}
                      </span>
                    )}
                  </div>
                  {op.descricao && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{op.descricao}</p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold text-foreground"
          >
            Fechar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
