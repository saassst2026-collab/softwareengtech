import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Wrench, Plus, Pencil, Trash2, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { PageHero } from "@/components/PageHero";
import { useAuth } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  listarEquipamentos,
  salvarEquipamento,
  excluirEquipamento,
  type Equipamento,
} from "@/lib/equipamentosStorage";

export const Route = createFileRoute("/_authenticated/equipamentos")({
  component: EquipamentosPage,
});

const inp =
  "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

function EquipamentosPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Equipamento | null>(null);

  const { data: lista, isLoading } = useQuery({
    queryKey: ["equipamentos"],
    queryFn: async () => {
      return await listarEquipamentos();
    },
  });

  // Atualizar quando houver mudanças emitidas externamente
  useEffect(() => {
    const handler = () => {
      qc.invalidateQueries({ queryKey: ["equipamentos"] });
    };
    window.addEventListener("engtech:equipamentos-updated", handler);
    return () => window.removeEventListener("engtech:equipamentos-updated", handler);
  }, [qc]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (lista ?? []).filter(
      (e) =>
        !q ||
        e.nome.toLowerCase().includes(q) ||
        (e.modelo ?? "").toLowerCase().includes(q) ||
        (e.numero_serie ?? "").toLowerCase().includes(q) ||
        (e.fabricante ?? "").toLowerCase().includes(q),
    );
  }, [lista, search]);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await excluirEquipamento(id);
    },
    onSuccess: () => {
      toast.success("Equipamento excluído com sucesso.");
      qc.invalidateQueries({ queryKey: ["equipamentos"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao excluir equipamento."),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title="Equipamentos"
        subtitle="Cadastro dos instrumentos e equipamentos utilizados nas medições e avaliações ocupacionais."
        actions={
          <button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-glow"
          >
            <Plus className="h-4 w-4" /> Cadastrar novo equipamento
          </button>
        }
      />

      <section className="rounded-3xl border border-border/60 bg-card p-4 shadow-elegant">
        <label className="grid gap-1.5 text-xs font-bold uppercase text-muted-foreground">
          Buscar Equipamento
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, modelo, número de série ou fabricante..."
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
          <Wrench className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-bold">Nenhum equipamento cadastrado.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Cadastre os instrumentos (como dosímetros, decibelímetros, termômetros de globo, luxímetros, etc.) para vincular às avaliações técnicas dos riscos ocupacionais.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-elegant">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 font-bold">Nome do Equipamento</th>
                <th className="p-3">Identificação / Modelo</th>
                <th className="p-3">Número de Série</th>
                <th className="p-3">Fabricante</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-3 font-semibold text-foreground">{item.nome}</td>
                  <td className="p-3 text-muted-foreground">{item.modelo || "—"}</td>
                  <td className="p-3 text-muted-foreground">{item.numero_serie || "—"}</td>
                  <td className="p-3 text-muted-foreground">{item.fabricante || "—"}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(item);
                          setOpen(true);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-bold hover:border-primary/40 hover:text-primary"
                        title="Editar equipamento"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Excluir o equipamento "${item.nome}"?`)) {
                            remove.mutate(item.id);
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-destructive/30 bg-destructive/5 px-2 py-1 text-[11px] font-bold text-destructive hover:bg-destructive/10"
                        title="Excluir equipamento"
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

      <EquipamentoDialog
        open={open}
        onOpenChange={setOpen}
        equipamento={editing}
        userId={user?.id ?? null}
      />
    </div>
  );
}

function EquipamentoDialog({
  open,
  onOpenChange,
  equipamento,
  userId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  equipamento: Equipamento | null;
  userId: string | null;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nome: "",
    modelo: "",
    numero_serie: "",
    fabricante: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      nome: equipamento?.nome ?? "",
      modelo: equipamento?.modelo ?? "",
      numero_serie: equipamento?.numero_serie ?? "",
      fabricante: equipamento?.fabricante ?? "",
    });
  }, [open, equipamento]);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      if (!form.nome.trim()) throw new Error("O nome do equipamento é obrigatório.");
      await salvarEquipamento(
        {
          id: equipamento?.id,
          nome: form.nome,
          modelo: form.modelo,
          numero_serie: form.numero_serie,
          fabricante: form.fabricante,
        },
        userId,
      );
    },
    onSuccess: () => {
      toast.success(equipamento?.id ? "Equipamento atualizado." : "Equipamento cadastrado.");
      qc.invalidateQueries({ queryKey: ["equipamentos"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar equipamento."),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Wrench className="h-5 w-5" />
            {equipamento?.id ? "Editar Equipamento" : "Cadastrar Equipamento"}
          </DialogTitle>
          <DialogDescription>
            Informe os dados do instrumento técnico utilizado nas avaliações e medições ocupacionais.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-bold text-foreground">
              Nome do Equipamento <span className="text-destructive">*</span>
            </span>
            <input
              value={form.nome}
              onChange={(e) => set("nome", e.target.value)}
              className={inp}
              placeholder="Ex.: Dosímetro de Ruído, Termômetro de Globo, Luxímetro..."
              autoFocus
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-bold text-foreground">Identificação / Modelo</span>
              <input
                value={form.modelo}
                onChange={(e) => set("modelo", e.target.value)}
                className={inp}
                placeholder="Ex.: DOS-500, TGD-400..."
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-xs font-bold text-foreground">Número de Série</span>
              <input
                value={form.numero_serie}
                onChange={(e) => set("numero_serie", e.target.value)}
                className={inp}
                placeholder="Ex.: SN-2023-8942..."
              />
            </label>
          </div>

          <label className="grid gap-1 text-sm">
            <span className="text-xs font-bold text-foreground">Fabricante</span>
            <input
              value={form.fabricante}
              onChange={(e) => set("fabricante", e.target.value)}
              className={inp}
              placeholder="Ex.: Instrutherm, Quest Technologies, 3M..."
            />
          </label>
        </div>

        <DialogFooter className="gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-4 py-2 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-50"
          >
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
