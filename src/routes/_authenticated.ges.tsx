import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, Plus, Pencil, Trash2, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { PageHero } from "@/components/PageHero";
import { ReportButton } from "@/components/ReportButton";
import { opcoesRelatoriosGes } from "@/lib/gesRelatorios";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { GesFormDialog, type GesItem } from "@/components/GesFormDialog";
import { GerarPgrDialog } from "@/components/GerarPgrDialog";

export const Route = createFileRoute("/_authenticated/ges")({
  component: GesPage,
});

type Empresa = { id: string; nome: string; razao_social: string | null; cnpj?: string | null };

function GesPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [empresaId, setEmpresaId] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [pgrOpen, setPgrOpen] = useState(false);
  const [editing, setEditing] = useState<GesItem | null>(null);

  const { data: empresas = [] } = useQuery({
    queryKey: ["empresas-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresas")
        .select("id, nome, razao_social, cnpj")
        .order("nome");
      if (error) throw error;
      return (data ?? []) as Empresa[];
    },
  });

  const { data: lista, isLoading } = useQuery({
    queryKey: ["ges", empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ges" as never)
        .select("*")
        .eq("empresa_id", empresaId)
        .order("cargo");
      if (error) throw error;
      return (data ?? []) as unknown as GesItem[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return lista ?? [];
    return (lista ?? []).filter(
      (g) =>
        g.cargo.toLowerCase().includes(q) ||
        (g.setor ?? "").toLowerCase().includes(q) ||
        (g.codigo_ges ?? "").toLowerCase().includes(q),
    );
  }, [lista, search]);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ges" as never)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("GES excluído com sucesso");
      qc.invalidateQueries({ queryKey: ["ges"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao excluir"),
  });

  const sel =
    "h-10 rounded-xl border border-input bg-background px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title="GES — Grupos de Exposição Similar"
        subtitle="Cadastre grupos homogêneos, riscos ocupacionais, responsáveis técnicos, medidas de proteção e funções vinculadas."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
              disabled={!empresaId}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Cadastrar novo GES
            </button>
            {empresaId && (
              <ReportButton
                titulo="Relatórios do GES"
                modulo="ges"
                getOpcoes={() =>
                  opcoesRelatoriosGes(
                    empresaId,
                    (empresas ?? []).find((e) => e.id === empresaId)?.razao_social ||
                      (empresas ?? []).find((e) => e.id === empresaId)?.nome ||
                      "—",
                    () => setPgrOpen(true),
                  )
                }
              />
            )}
          </div>
        }
      />

      <section className="grid gap-3 rounded-3xl border border-border/60 bg-card p-4 shadow-elegant sm:grid-cols-2">
        <label className="grid gap-1.5 text-xs font-bold uppercase text-muted-foreground">
          Empregador
          <select value={empresaId} onChange={(e) => setEmpresaId(e.target.value)} className={sel}>
            <option value="">Selecione uma empresa</option>
            {(empresas ?? []).map((e) => (
              <option key={e.id} value={e.id}>
                {e.razao_social || e.nome} {e.cnpj ? `(${e.cnpj})` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-bold uppercase text-muted-foreground">
          Buscar GES
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar GES..."
              className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </label>
      </section>

      {!empresaId ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
          <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-bold">Selecione uma empresa para gerenciar os GES.</p>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center p-10">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
          <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-bold">Nenhum GES cadastrado para os filtros selecionados.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-elegant">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">GES / Cargo</th>
                <th className="p-3">Setor</th>
                <th className="p-3">Código</th>
                <th className="p-3">Colaboradores</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => (
                <tr key={g.id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-3">
                    <p className="font-semibold">{g.cargo}</p>
                    {g.atividade && <p className="text-xs text-muted-foreground">{g.atividade}</p>}
                  </td>
                  <td className="p-3 text-muted-foreground">{g.setor ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{g.codigo_ges ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{g.qtd_colaboradores}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(g);
                          setOpen(true);
                        }}
                        className="rounded-lg border border-border px-2 py-1 text-[11px] font-bold hover:border-primary/40 hover:text-primary"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("Excluir este GES?")) remove.mutate(g.id);
                        }}
                        className="rounded-lg border border-destructive/30 bg-destructive/5 px-2 py-1 text-[11px] font-bold text-destructive hover:bg-destructive/10"
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

      <GesFormDialog
        open={open}
        onOpenChange={setOpen}
        empresaId={empresaId}
        empresas={empresas}
        editingGes={editing}
        userId={user?.id ?? null}
      />

      <GerarPgrDialog
        open={pgrOpen}
        onOpenChange={setPgrOpen}
        empresaId={empresaId}
        userId={user?.id ?? null}
      />
    </div>
  );
}
