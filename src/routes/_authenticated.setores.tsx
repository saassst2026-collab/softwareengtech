import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers3, Plus, Pencil, Trash2, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { PageHero } from "@/components/PageHero";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/setores")({
  component: SetoresPage,
});

type Setor = {
  id: string;
  empresa_id: string;
  nome: string;
  descricao: string | null;
  created_at: string;
};

type Empresa = { id: string; nome: string; razao_social: string | null };

function SetoresPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [empresaId, setEmpresaId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Setor | null>(null);

  const { data: empresas } = useQuery({
    queryKey: ["empresas-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresas")
        .select("id, nome, razao_social")
        .order("nome");
      if (error) throw error;
      return (data ?? []) as Empresa[];
    },
  });

  const { data: setores, isLoading } = useQuery({
    queryKey: ["setores", empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("setores" as never)
        .select("*")
        .eq("empresa_id", empresaId)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as unknown as Setor[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return setores ?? [];
    return (setores ?? []).filter((s) => s.nome.toLowerCase().includes(q));
  }, [setores, search]);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("setores" as never)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Setor excluído");
      qc.invalidateQueries({ queryKey: ["setores"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao excluir"),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title="Setores"
        subtitle="Cadastre os setores de cada empresa atendida para vincular às funções e às Ordens de Serviço."
        actions={
          <button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            disabled={!empresaId}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Novo setor
          </button>
        }
      />

      <section className="grid gap-3 rounded-3xl border border-border/60 bg-card p-4 shadow-elegant sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <label className="grid gap-1.5 text-xs font-bold uppercase text-muted-foreground">
          Empresa
          <select
            value={empresaId}
            onChange={(e) => setEmpresaId(e.target.value)}
            className="h-10 rounded-xl border border-input bg-background px-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Selecione uma empresa</option>
            {(empresas ?? []).map((e) => (
              <option key={e.id} value={e.id}>
                {e.razao_social || e.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-bold uppercase text-muted-foreground">
          Buscar setor
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </label>
      </section>

      {!empresaId ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
          <Layers3 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-bold">Selecione uma empresa para gerenciar seus setores.</p>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center p-10">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
          <Layers3 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-bold">Nenhum setor cadastrado ainda.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-elegant">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Setor</th>
                <th className="p-3">Descrição</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-3 font-semibold">{s.nome}</td>
                  <td className="p-3 text-muted-foreground">{s.descricao ?? "—"}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(s);
                          setOpen(true);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-bold hover:border-primary/40 hover:text-primary"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("Excluir este setor?")) remove.mutate(s.id);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-destructive/30 bg-destructive/5 px-2 py-1 text-[11px] font-bold text-destructive hover:bg-destructive/10"
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

      <SetorDialog
        open={open}
        onOpenChange={setOpen}
        empresaId={empresaId}
        setor={editing}
        userId={user?.id ?? null}
      />
    </div>
  );
}

function SetorDialog({
  open,
  onOpenChange,
  empresaId,
  setor,
  userId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  empresaId: string;
  setor: Setor | null;
  userId: string | null;
}) {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");

  useEffect(() => {
    if (!open) return;
    setNome(setor?.nome ?? "");
    setDescricao(setor?.descricao ?? "");
  }, [open, setor]);

  const save = useMutation({
    mutationFn: async () => {
      if (!nome.trim()) throw new Error("Informe o nome do setor");
      const payload = {
        empresa_id: empresaId,
        nome: nome.trim(),
        descricao: descricao.trim() || null,
      };
      if (setor?.id) {
        const { error } = await supabase
          .from("setores" as never)
          .update(payload as never)
          .eq("id", setor.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("setores" as never)
          .insert({ ...payload, created_by: userId } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(setor?.id ? "Setor atualizado" : "Setor cadastrado");
      qc.invalidateQueries({ queryKey: ["setores"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-primary">
            {setor?.id ? "Editar setor" : "Novo setor"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-bold">Nome *</span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="Ex.: Operacional"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-bold">Descrição</span>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="min-h-[80px] rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
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
