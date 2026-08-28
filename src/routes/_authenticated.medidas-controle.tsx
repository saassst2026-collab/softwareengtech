import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HardHat, Plus, Pencil, Trash2, Loader2, Search, ShieldCheck } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/medidas-controle")({
  component: MedidasControlePage,
});

export type MedidaControle = {
  id: string;
  empresa_id: string | null;
  nome: string;
  tipo: string;
  ca: string | null;
  fabricante: string | null;
  descricao: string | null;
  risco_associado: string | null;
  validade_meses: number | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
};

export const TIPOS_MEDIDA = ["EPI", "EPC", "Administrativa", "Treinamento", "Engenharia"];

type Empresa = { id: string; nome: string; razao_social: string | null };

function MedidasControlePage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [empresaId, setEmpresaId] = useState<string>("");
  const [tipo, setTipo] = useState<string>("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MedidaControle | null>(null);

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

  const { data: medidas, isLoading } = useQuery({
    queryKey: ["medidas-controle"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medidas_controle" as never)
        .select("*")
        .order("nome");
      if (error) throw error;
      return (data ?? []) as unknown as MedidaControle[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (medidas ?? []).filter((m) => {
      if (empresaId === "__geral__" && m.empresa_id) return false;
      if (empresaId && empresaId !== "__geral__" && m.empresa_id !== empresaId) return false;
      if (tipo && m.tipo !== tipo) return false;
      if (!q) return true;
      return (
        m.nome.toLowerCase().includes(q) ||
        (m.ca ?? "").toLowerCase().includes(q) ||
        (m.fabricante ?? "").toLowerCase().includes(q)
      );
    });
  }, [medidas, empresaId, tipo, search]);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("medidas_controle" as never)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Medida excluída");
      qc.invalidateQueries({ queryKey: ["medidas-controle"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao excluir"),
  });

  const empresaLabel = (id: string | null) =>
    id
      ? empresas?.find((e) => e.id === id)?.razao_social ||
        empresas?.find((e) => e.id === id)?.nome ||
        "—"
      : "Geral (todas)";

  const sel =
    "h-10 rounded-xl border border-input bg-background px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title="Medidas de Controle"
        subtitle="Cadastro de EPIs, EPCs e medidas administrativas por empresa, usados nos GES e nas Ordens de Serviço."
        actions={
          <button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-glow"
          >
            <Plus className="h-4 w-4" /> Nova medida / EPI
          </button>
        }
      />

      <section className="grid gap-3 rounded-3xl border border-border/60 bg-card p-4 shadow-elegant sm:grid-cols-3">
        <label className="grid gap-1.5 text-xs font-bold uppercase text-muted-foreground">
          Empresa
          <select value={empresaId} onChange={(e) => setEmpresaId(e.target.value)} className={sel}>
            <option value="">Todas</option>
            <option value="__geral__">Somente itens gerais</option>
            {(empresas ?? []).map((e) => (
              <option key={e.id} value={e.id}>
                {e.razao_social || e.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-bold uppercase text-muted-foreground">
          Tipo
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={sel}>
            <option value="">Todos</option>
            {TIPOS_MEDIDA.map((t) => (
              <option key={t} value={t}>
                {t}
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
              placeholder="Nome, CA ou fabricante..."
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
          <HardHat className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-bold">Nenhuma medida de controle cadastrada.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-elegant">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Medida / EPI</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">CA</th>
                <th className="p-3">Empresa</th>
                <th className="p-3">Validade</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-3">
                    <p className="font-semibold">{m.nome}</p>
                    {m.risco_associado && (
                      <p className="text-xs text-muted-foreground">Risco: {m.risco_associado}</p>
                    )}
                  </td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-[11px] font-bold text-primary">
                      <ShieldCheck className="h-3 w-3" /> {m.tipo}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground">{m.ca ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{empresaLabel(m.empresa_id)}</td>
                  <td className="p-3 text-muted-foreground">
                    {m.validade_meses ? `${m.validade_meses} meses` : "—"}
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(m);
                          setOpen(true);
                        }}
                        className="rounded-lg border border-border px-2 py-1 text-[11px] font-bold hover:border-primary/40 hover:text-primary"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("Excluir esta medida?")) remove.mutate(m.id);
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

      <MedidaDialog
        open={open}
        onOpenChange={setOpen}
        medida={editing}
        empresas={empresas ?? []}
        userId={user?.id ?? null}
      />
    </div>
  );
}

function MedidaDialog({
  open,
  onOpenChange,
  medida,
  empresas,
  userId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  medida: MedidaControle | null;
  empresas: Empresa[];
  userId: string | null;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    empresa_id: "",
    nome: "",
    tipo: "EPI",
    ca: "",
    fabricante: "",
    descricao: "",
    risco_associado: "",
    validade_meses: "",
    observacoes: "",
    ativo: true,
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      empresa_id: medida?.empresa_id ?? "",
      nome: medida?.nome ?? "",
      tipo: medida?.tipo ?? "EPI",
      ca: medida?.ca ?? "",
      fabricante: medida?.fabricante ?? "",
      descricao: medida?.descricao ?? "",
      risco_associado: medida?.risco_associado ?? "",
      validade_meses: medida?.validade_meses ? String(medida.validade_meses) : "",
      observacoes: medida?.observacoes ?? "",
      ativo: medida?.ativo ?? true,
    });
  }, [open, medida]);

  const set = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      if (!form.nome.trim()) throw new Error("Informe o nome da medida / EPI");
      const payload = {
        empresa_id: form.empresa_id || null,
        nome: form.nome.trim(),
        tipo: form.tipo,
        ca: form.ca.trim() || null,
        fabricante: form.fabricante.trim() || null,
        descricao: form.descricao.trim() || null,
        risco_associado: form.risco_associado.trim() || null,
        validade_meses: form.validade_meses ? Number(form.validade_meses) : null,
        observacoes: form.observacoes.trim() || null,
        ativo: form.ativo,
      };
      if (medida?.id) {
        const { error } = await supabase
          .from("medidas_controle" as never)
          .update(payload as never)
          .eq("id", medida.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("medidas_controle" as never)
          .insert({ ...payload, created_by: userId } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(medida?.id ? "Medida atualizada" : "Medida cadastrada");
      qc.invalidateQueries({ queryKey: ["medidas-controle"] });
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
            {medida?.id ? "Editar medida de controle" : "Nova medida de controle / EPI"}
          </DialogTitle>
          <DialogDescription>
            Deixe a empresa em branco para disponibilizar a medida para todas as empresas.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2 sm:grid-cols-2">
          <label className="grid gap-1 text-sm sm:col-span-2">
            <span className="text-xs font-bold">Nome *</span>
            <input
              value={form.nome}
              onChange={(e) => set("nome", e.target.value)}
              className={inp}
              placeholder="Ex.: Luva de vaqueta"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-bold">Tipo</span>
            <select value={form.tipo} onChange={(e) => set("tipo", e.target.value)} className={inp}>
              {TIPOS_MEDIDA.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-bold">Empresa</span>
            <select
              value={form.empresa_id}
              onChange={(e) => set("empresa_id", e.target.value)}
              className={inp}
            >
              <option value="">Geral (todas as empresas)</option>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.razao_social || e.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-bold">CA (Certificado de Aprovação)</span>
            <input value={form.ca} onChange={(e) => set("ca", e.target.value)} className={inp} />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-bold">Fabricante</span>
            <input
              value={form.fabricante}
              onChange={(e) => set("fabricante", e.target.value)}
              className={inp}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-bold">Risco associado</span>
            <input
              value={form.risco_associado}
              onChange={(e) => set("risco_associado", e.target.value)}
              className={inp}
              placeholder="Ex.: Corte, abrasão"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-bold">Validade (meses)</span>
            <input
              type="number"
              min={0}
              value={form.validade_meses}
              onChange={(e) => set("validade_meses", e.target.value)}
              className={inp}
            />
          </label>
          <label className="grid gap-1 text-sm sm:col-span-2">
            <span className="text-xs font-bold">Descrição</span>
            <textarea
              value={form.descricao}
              onChange={(e) => set("descricao", e.target.value)}
              className={`${inp} min-h-[70px]`}
            />
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={(e) => set("ativo", e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-xs font-bold">Medida ativa</span>
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
