import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHero } from "@/components/PageHero";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/riscos-ocupacionais")({
  component: RiscosOcupacionaisPage,
});

export const AGENTES = ["fisico", "quimico", "biologico", "ergonomico", "acidente"] as const;
export const AGENTE_LABEL: Record<string, string> = {
  fisico: "Físico",
  quimico: "Químico",
  biologico: "Biológico",
  ergonomico: "Ergonômico",
  acidente: "De Acidente",
};

type Risco = {
  id: string;
  nome: string;
  tipo: string;
  descricao_risco: string | null;
  possiveis_lesoes: string | null;
  ativo: boolean;
};

const inp =
  "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

function RiscosOcupacionaisPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [agente, setAgente] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Risco | null>(null);

  const { data: lista, isLoading } = useQuery({
    queryKey: ["riscos-ocupacionais-page"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("riscos_ocupacionais" as never)
        .select("id, nome, tipo, descricao_risco, possiveis_lesoes, ativo")
        .order("nome");
      if (error) throw error;
      return (data ?? []) as unknown as Risco[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (lista ?? []).filter(
      (r) =>
        (!agente || r.tipo === agente) &&
        (!q ||
          r.nome.toLowerCase().includes(q) ||
          (r.descricao_risco ?? "").toLowerCase().includes(q)),
    );
  }, [lista, search, agente]);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("riscos_ocupacionais" as never)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Risco excluído");
      qc.invalidateQueries({ queryKey: ["riscos-ocupacionais-page"] });
      qc.invalidateQueries({ queryKey: ["riscos-catalogo"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao excluir"),
  });

  const sel =
    "h-10 rounded-xl border border-input bg-background px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title="Riscos Ocupacionais"
        subtitle="Catálogo de riscos por agente, disponível para seleção na inclusão de riscos do GES."
        actions={
          <button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-glow"
          >
            <Plus className="h-4 w-4" /> Cadastrar risco
          </button>
        }
      />

      <section className="grid gap-3 rounded-3xl border border-border/60 bg-card p-4 shadow-elegant sm:grid-cols-2">
        <label className="grid gap-1.5 text-xs font-bold uppercase text-muted-foreground">
          Agente
          <select value={agente} onChange={(e) => setAgente(e.target.value)} className={sel}>
            <option value="">Todos os agentes</option>
            {AGENTES.map((a) => (
              <option key={a} value={a}>
                {AGENTE_LABEL[a]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-bold uppercase text-muted-foreground">
          Buscar
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar risco..."
              className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </label>
      </section>

      {isLoading ? (
        <div className="flex items-center justify-center p-10">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-bold">Nenhum risco ocupacional cadastrado.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-elegant">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Risco</th>
                <th className="p-3">Agente</th>
                <th className="p-3">Descrição do risco</th>
                <th className="p-3">Possíveis danos e agravos à saúde</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border align-top hover:bg-muted/30">
                  <td className="p-3 font-semibold">{r.nome}</td>
                  <td className="p-3">
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                      {AGENTE_LABEL[r.tipo] ?? r.tipo}
                    </span>
                  </td>
                  <td className="max-w-[280px] p-3 text-muted-foreground">
                    {r.descricao_risco ?? "—"}
                  </td>
                  <td className="max-w-[280px] p-3 text-muted-foreground">
                    {r.possiveis_lesoes ?? "—"}
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(r);
                          setOpen(true);
                        }}
                        className="rounded-lg border border-border px-2 py-1 text-[11px] font-bold hover:border-primary/40 hover:text-primary"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("Excluir este risco?")) remove.mutate(r.id);
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

      <RiscoDialog open={open} onOpenChange={setOpen} risco={editing} userId={user?.id ?? null} />
    </div>
  );
}

function RiscoDialog({
  open,
  onOpenChange,
  risco,
  userId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  risco: Risco | null;
  userId: string | null;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nome: "",
    tipo: "fisico",
    descricao_risco: "",
    possiveis_lesoes: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      nome: risco?.nome ?? "",
      tipo: risco?.tipo ?? "fisico",
      descricao_risco: risco?.descricao_risco ?? "",
      possiveis_lesoes: risco?.possiveis_lesoes ?? "",
    });
  }, [open, risco]);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      if (!form.nome.trim()) throw new Error("Informe o nome do risco");
      const payload = {
        nome: form.nome.trim(),
        tipo: form.tipo,
        descricao_risco: form.descricao_risco.trim() || null,
        possiveis_lesoes: form.possiveis_lesoes.trim() || null,
      };
      if (risco?.id) {
        const { error } = await supabase
          .from("riscos_ocupacionais" as never)
          .update(payload as never)
          .eq("id", risco.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("riscos_ocupacionais" as never)
          .insert({ ...payload, created_by: userId } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Risco salvo");
      qc.invalidateQueries({ queryKey: ["riscos-ocupacionais-page"] });
      qc.invalidateQueries({ queryKey: ["riscos-catalogo"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <AlertTriangle className="h-5 w-5" />{" "}
            {risco?.id ? "Editar risco ocupacional" : "Cadastrar risco ocupacional"}
          </DialogTitle>
          <DialogDescription>
            Selecione o agente, descreva o risco e os possíveis danos e agravos à saúde.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-bold">Nome do risco *</span>
            <input
              value={form.nome}
              onChange={(e) => set("nome", e.target.value)}
              className={inp}
              placeholder="Ex.: Ruído contínuo"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-bold">Agente *</span>
            <select value={form.tipo} onChange={(e) => set("tipo", e.target.value)} className={inp}>
              {AGENTES.map((a) => (
                <option key={a} value={a}>
                  {AGENTE_LABEL[a]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm sm:col-span-2">
            <span className="text-xs font-bold">Descrição do risco</span>
            <textarea
              value={form.descricao_risco}
              onChange={(e) => set("descricao_risco", e.target.value)}
              className={`${inp} min-h-[90px]`}
              placeholder="Descreva o risco ocupacional..."
            />
          </label>
          <label className="grid gap-1 text-sm sm:col-span-2">
            <span className="text-xs font-bold">Possíveis danos e agravos à saúde</span>
            <textarea
              value={form.possiveis_lesoes}
              onChange={(e) => set("possiveis_lesoes", e.target.value)}
              className={`${inp} min-h-[90px]`}
              placeholder="Ex.: Perda auditiva induzida por ruído, estresse, cefaleia..."
            />
          </label>
        </div>

        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold"
          >
            Cancelar
          </button>
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-4 py-2 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-60"
          >
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
