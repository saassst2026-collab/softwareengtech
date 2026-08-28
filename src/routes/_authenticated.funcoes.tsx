import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Briefcase, Plus, Pencil, Trash2, Loader2, Search } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/funcoes")({
  component: FuncoesPage,
});

type Setor = { id: string; empresa_id: string; nome: string };
type Empresa = { id: string; nome: string; razao_social: string | null };

type Funcao = {
  id: string;
  empresa_id: string;
  setor_id: string | null;
  nome: string;
  descricao_atividades: string | null;
  riscos_fisicos: string | null;
  riscos_quimicos: string | null;
  riscos_biologicos: string | null;
  riscos_ergonomicos: string | null;
  riscos_acidentes: string | null;
};

function FuncoesPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [empresaId, setEmpresaId] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Funcao | null>(null);

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

  const { data: setores } = useQuery({
    queryKey: ["setores", empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("setores" as never)
        .select("id, empresa_id, nome")
        .eq("empresa_id", empresaId)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as unknown as Setor[];
    },
  });

  const { data: funcoes, isLoading } = useQuery({
    queryKey: ["funcoes", empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funcoes" as never)
        .select("*")
        .eq("empresa_id", empresaId)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as unknown as Funcao[];
    },
  });

  const setorMap = useMemo(() => new Map((setores ?? []).map((s) => [s.id, s.nome])), [setores]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return funcoes ?? [];
    return (funcoes ?? []).filter((f) => f.nome.toLowerCase().includes(q));
  }, [funcoes, search]);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("funcoes" as never)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Função excluída");
      qc.invalidateQueries({ queryKey: ["funcoes"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao excluir"),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title="Funções"
        subtitle="Cadastre as funções de cada empresa com descrição das atividades e riscos — reutilizadas na emissão de Ordens de Serviço."
        actions={
          <button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            disabled={!empresaId}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Nova função
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
          Buscar função
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
          <Briefcase className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-bold">Selecione uma empresa para gerenciar suas funções.</p>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center p-10">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
          <Briefcase className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-bold">Nenhuma função cadastrada ainda.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-elegant">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Função</th>
                <th className="p-3">Setor</th>
                <th className="p-3">Atividades</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f) => (
                <tr key={f.id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-3 font-semibold">{f.nome}</td>
                  <td className="p-3 text-muted-foreground">
                    {f.setor_id ? (setorMap.get(f.setor_id) ?? "—") : "—"}
                  </td>
                  <td className="max-w-md p-3 text-xs text-muted-foreground">
                    <p className="line-clamp-2">{f.descricao_atividades ?? "—"}</p>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(f);
                          setOpen(true);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-bold hover:border-primary/40 hover:text-primary"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("Excluir esta função?")) remove.mutate(f.id);
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

      <FuncaoDialog
        open={open}
        onOpenChange={setOpen}
        empresaId={empresaId}
        setores={setores ?? []}
        funcao={editing}
        userId={user?.id ?? null}
      />
    </div>
  );
}

function FuncaoDialog({
  open,
  onOpenChange,
  empresaId,
  setores,
  funcao,
  userId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  empresaId: string;
  setores: Setor[];
  funcao: Funcao | null;
  userId: string | null;
}) {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [setorId, setSetorId] = useState<string>("");
  const [desc, setDesc] = useState("");

  useEffect(() => {
    if (!open) return;
    setNome(funcao?.nome ?? "");
    setSetorId(funcao?.setor_id ?? "");
    setDesc(funcao?.descricao_atividades ?? "");
  }, [open, funcao]);

  const save = useMutation({
    mutationFn: async () => {
      if (!nome.trim()) throw new Error("Informe o nome da função");
      const payload = {
        empresa_id: empresaId,
        setor_id: setorId || null,
        nome: nome.trim(),
        descricao_atividades: desc.trim() || null,
        // Preserva valores anteriores para compatibilidade e integridade histórica
        riscos_fisicos: funcao?.riscos_fisicos ?? null,
        riscos_quimicos: funcao?.riscos_quimicos ?? null,
        riscos_biologicos: funcao?.riscos_biologicos ?? null,
        riscos_ergonomicos: funcao?.riscos_ergonomicos ?? null,
        riscos_acidentes: funcao?.riscos_acidentes ?? null,
      };
      if (funcao?.id) {
        const { error } = await supabase
          .from("funcoes" as never)
          .update(payload as never)
          .eq("id", funcao.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("funcoes" as never)
          .insert({ ...payload, created_by: userId } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(funcao?.id ? "Função atualizada" : "Função cadastrada");
      qc.invalidateQueries({ queryKey: ["funcoes"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  const inp =
    "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-primary">
            {funcao?.id ? "Editar função" : "Nova função"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-bold text-foreground">Nome da função *</span>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className={inp}
                placeholder="Ex.: Auxiliar Técnico em Refrigeração"
                autoFocus
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-bold text-foreground">Setor</span>
              <select value={setorId} onChange={(e) => setSetorId(e.target.value)} className={inp}>
                <option value="">— Sem setor —</option>
                {setores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-bold text-foreground">
              Descrição das atividades (conforme PGR)
            </span>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className={`${inp} min-h-[140px] resize-y`}
              placeholder="Descreva detalhadamente a rotina e as atividades desempenhadas nesta função..."
            />
          </label>

          <div className="rounded-xl border border-border/80 bg-muted/40 p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Nota de Arquitetura SST:</p>
            <p className="mt-0.5">
              A função define quem executa determinada atividade e em qual setor. O levantamento de riscos ocupacionais, agentes ambientais e medidas de proteção são gerenciados centralizadamente através do <strong>GES (Grupo de Exposição Similar)</strong>.
            </p>
          </div>
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
