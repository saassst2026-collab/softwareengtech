import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Plus, Pencil, Trash2, Loader2, Search } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/profissionais")({
  component: ProfissionaisPage,
});

export type Profissional = {
  id: string;
  nome: string;
  cargo: string | null;
  registro: string | null;
  tipo_registro: string | null;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
};

const TIPOS = ["MTE", "CREA", "CRM", "COREN", "CRF", "Outro"];

function ProfissionaisPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Profissional | null>(null);

  const { data: profissionais, isLoading } = useQuery({
    queryKey: ["profissionais"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profissionais" as never)
        .select("*")
        .order("nome");
      if (error) throw error;
      return (data ?? []) as unknown as Profissional[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profissionais ?? [];
    return (profissionais ?? []).filter(
      (p) =>
        p.nome.toLowerCase().includes(q) ||
        (p.cargo ?? "").toLowerCase().includes(q) ||
        (p.registro ?? "").toLowerCase().includes(q),
    );
  }, [profissionais, search]);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("profissionais" as never)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profissional excluído");
      qc.invalidateQueries({ queryKey: ["profissionais"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao excluir"),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title="Profissionais SST"
        subtitle="Cadastre engenheiros, técnicos e médicos do trabalho para vincular como responsáveis nos GES e nas Ordens de Serviço."
        actions={
          <button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-glow"
          >
            <Plus className="h-4 w-4" /> Novo profissional
          </button>
        }
      />

      <section className="rounded-3xl border border-border/60 bg-card p-4 shadow-elegant">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, cargo ou registro..."
            className="w-full rounded-xl border border-input bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </section>

      {isLoading ? (
        <div className="flex items-center justify-center p-10">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
          <BadgeCheck className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-bold">Nenhum profissional cadastrado ainda.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-elegant">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Profissional</th>
                <th className="p-3">Cargo / Título</th>
                <th className="p-3">Registro</th>
                <th className="p-3">Contato</th>
                <th className="p-3">Situação</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-3 font-semibold">{p.nome}</td>
                  <td className="p-3 text-muted-foreground">{p.cargo ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">
                    {p.registro
                      ? `${p.tipo_registro ? p.tipo_registro + ": " : ""}${p.registro}`
                      : "—"}
                  </td>
                  <td className="p-3 text-muted-foreground">{p.email || p.telefone || "—"}</td>
                  <td className="p-3">
                    <span
                      className={`rounded-lg px-2 py-1 text-[11px] font-bold ${p.ativo ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                    >
                      {p.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(p);
                          setOpen(true);
                        }}
                        className="rounded-lg border border-border px-2 py-1 text-[11px] font-bold hover:border-primary/40 hover:text-primary"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("Excluir este profissional?")) remove.mutate(p.id);
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

      <ProfissionalDialog
        open={open}
        onOpenChange={setOpen}
        profissional={editing}
        userId={user?.id ?? null}
      />
    </div>
  );
}

function ProfissionalDialog({
  open,
  onOpenChange,
  profissional,
  userId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  profissional: Profissional | null;
  userId: string | null;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nome: "",
    cargo: "",
    registro: "",
    tipo_registro: "MTE",
    cpf: "",
    email: "",
    telefone: "",
    observacoes: "",
    ativo: true,
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      nome: profissional?.nome ?? "",
      cargo: profissional?.cargo ?? "",
      registro: profissional?.registro ?? "",
      tipo_registro: profissional?.tipo_registro ?? "MTE",
      cpf: profissional?.cpf ?? "",
      email: profissional?.email ?? "",
      telefone: profissional?.telefone ?? "",
      observacoes: profissional?.observacoes ?? "",
      ativo: profissional?.ativo ?? true,
    });
  }, [open, profissional]);

  const set = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      if (!form.nome.trim()) throw new Error("Informe o nome do profissional");
      const payload = {
        nome: form.nome.trim(),
        cargo: form.cargo.trim() || null,
        registro: form.registro.trim() || null,
        tipo_registro: form.tipo_registro || null,
        cpf: form.cpf.trim() || null,
        email: form.email.trim() || null,
        telefone: form.telefone.trim() || null,
        observacoes: form.observacoes.trim() || null,
        ativo: form.ativo,
      };
      if (profissional?.id) {
        const { error } = await supabase
          .from("profissionais" as never)
          .update(payload as never)
          .eq("id", profissional.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("profissionais" as never)
          .insert({ ...payload, created_by: userId } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(profissional?.id ? "Profissional atualizado" : "Profissional cadastrado");
      qc.invalidateQueries({ queryKey: ["profissionais"] });
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
            {profissional?.id ? "Editar profissional" : "Novo profissional SST"}
          </DialogTitle>
          <DialogDescription>
            Os profissionais cadastrados aqui alimentam os responsáveis do GES e da Ordem de
            Serviço.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2 sm:grid-cols-2">
          <label className="grid gap-1 text-sm sm:col-span-2">
            <span className="text-xs font-bold">Nome completo *</span>
            <input
              value={form.nome}
              onChange={(e) => set("nome", e.target.value)}
              className={inp}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-bold">Cargo / Título</span>
            <input
              value={form.cargo}
              onChange={(e) => set("cargo", e.target.value)}
              className={inp}
              placeholder="Técnico em Segurança do Trabalho"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-bold">Conselho / Órgão</span>
            <select
              value={form.tipo_registro}
              onChange={(e) => set("tipo_registro", e.target.value)}
              className={inp}
            >
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-bold">Nº de registro</span>
            <input
              value={form.registro}
              onChange={(e) => set("registro", e.target.value)}
              className={inp}
              placeholder="0026987/BA"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-bold">CPF</span>
            <input value={form.cpf} onChange={(e) => set("cpf", e.target.value)} className={inp} />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-bold">E-mail</span>
            <input
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              className={inp}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-bold">Telefone</span>
            <input
              value={form.telefone}
              onChange={(e) => set("telefone", e.target.value)}
              className={inp}
            />
          </label>
          <label className="grid gap-1 text-sm sm:col-span-2">
            <span className="text-xs font-bold">Observações</span>
            <textarea
              value={form.observacoes}
              onChange={(e) => set("observacoes", e.target.value)}
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
            <span className="text-xs font-bold">Profissional ativo</span>
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
