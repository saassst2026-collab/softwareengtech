import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Loader2, Wrench } from "lucide-react";
import { toast } from "sonner";

import { PageHero } from "@/components/PageHero";
import { supabase } from "@/integrations/supabase/client";
import { useServicosCatalogo, type ServicoCatalogo } from "@/lib/useServicosCatalogo";
import { ServicoCatalogoDialog } from "@/components/ServicoCatalogoDialog";
import { ReportButton } from "@/components/ReportButton";
import type { RelatorioOpcao } from "@/components/RelatorioDialog";

export const Route = createFileRoute("/_authenticated/servicos-catalogo")({
  component: ServicosCatalogoPage,
});

function ServicosCatalogoPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useServicosCatalogo();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ServicoCatalogo | null>(null);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const tbl = supabase.from("servicos_catalogo" as never) as unknown as {
        delete: () => {
          eq: (k: string, v: string) => Promise<{ error: { message: string } | null }>;
        };
      };
      const { error } = await tbl.delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Serviço removido");
      qc.invalidateQueries({ queryKey: ["servicos_catalogo"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao remover"),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title="Catálogo de Serviços"
        subtitle="Cadastre os serviços usados nas propostas. Os campos são preenchidos automaticamente ao montar uma proposta completa."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ReportButton modulo="outros" getOpcoes={() => buildServicosOpcoes(data ?? [])} />
            <button
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-glow"
            >
              <Plus className="h-4 w-4" /> Novo serviço
            </button>
          </div>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center p-10">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : !data || data.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
          <Wrench className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-bold text-foreground">Nenhum serviço cadastrado</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-elegant">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Nome</th>
                <th className="p-3">Categoria</th>
                <th className="p-3 text-right">Valor padrão</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {data.map((s) => (
                <tr key={s.id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-3 font-semibold">{s.nome}</td>
                  <td className="p-3 text-muted-foreground">{s.categoria ?? "—"}</td>
                  <td className="p-3 text-right font-mono text-xs">
                    {Number(s.valor_padrao ?? 0).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        s.ativo ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {s.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => {
                          setEditing(s);
                          setOpen(true);
                        }}
                        className="rounded-lg border border-border bg-card px-2 py-1 text-xs font-bold hover:border-primary/40 hover:text-primary"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Remover este serviço do catálogo?")) remove.mutate(s.id);
                        }}
                        className="rounded-lg border border-destructive/30 bg-destructive/5 px-2 py-1 text-xs font-bold text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ServicoCatalogoDialog open={open} onOpenChange={setOpen} servico={editing} />
    </div>
  );
}

function buildServicosOpcoes(servicos: ServicoCatalogo[]): RelatorioOpcao[] {
  const colunas = [
    { header: "Nome" },
    { header: "Categoria" },
    { header: "Valor padrão", align: "right" as const },
    { header: "Status" },
  ];
  const toLinha = (s: ServicoCatalogo): Array<string | number> => [
    s.nome,
    s.categoria ?? "—",
    Number(s.valor_padrao ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
    s.ativo ? "Ativo" : "Inativo",
  ];
  const make = (id: string, label: string, list: ServicoCatalogo[]): RelatorioOpcao => ({
    id,
    label,
    build: () => ({
      titulo: label,
      colunas,
      linhas: list.map(toLinha),
      totalizadores: [{ label: "Total de serviços", value: String(list.length) }],
    }),
  });
  return [
    make("todos", "Todos os serviços", servicos),
    make(
      "ativos",
      "Serviços ativos",
      servicos.filter((s) => s.ativo),
    ),
    make(
      "inativos",
      "Serviços inativos",
      servicos.filter((s) => !s.ativo),
    ),
    make(
      "por-valor",
      "Serviços ordenados por valor (maior → menor)",
      [...servicos].sort((a, b) => Number(b.valor_padrao ?? 0) - Number(a.valor_padrao ?? 0)),
    ),
  ];
}
