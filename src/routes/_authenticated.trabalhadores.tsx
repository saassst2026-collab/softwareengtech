import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, Pencil, Trash2, HardHat, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { PageHero } from "@/components/PageHero";
import { useAuth } from "@/lib/auth";
import { useUserRole } from "@/lib/useUserRole";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { maskCpf } from "@/lib/maskUtils";

export const Route = createFileRoute("/_authenticated/trabalhadores")({
  component: TrabalhadoresPage,
});

type Trabalhador = {
  id: string;
  empresa_id: string;
  nome: string;
  cpf: string | null;
  sexo: string | null;
  data_nascimento: string | null;
  setor: string | null;
  funcao: string | null;
  data_admissao: string | null;
  telefone: string | null;
  email: string | null;
};

function TrabalhadoresPage() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [empresaFiltro, setEmpresaFiltro] = useState<string>("todas");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Trabalhador | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["trabalhadores-list"],
    queryFn: async () => {
      const [tRes, eRes] = await Promise.all([
        supabase
          .from("trabalhadores" as never)
          .select("*")
          .order("nome"),
        supabase.from("empresas").select("id,nome").order("nome"),
      ]);
      if (tRes.error) throw tRes.error;
      if (eRes.error) throw eRes.error;
      return {
        trabalhadores: (tRes.data ?? []) as unknown as Trabalhador[],
        empresas: eRes.data ?? [],
      };
    },
  });

  const empresasMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of data?.empresas ?? []) map.set(e.id, e.nome);
    return map;
  }, [data?.empresas]);

  const filtered = useMemo(() => {
    const list = data?.trabalhadores ?? [];
    const term = q.trim().toLowerCase();
    return list.filter((t) => {
      if (empresaFiltro !== "todas" && t.empresa_id !== empresaFiltro) return false;
      if (!term) return true;
      return (
        t.nome.toLowerCase().includes(term) ||
        (t.cpf ?? "").toLowerCase().includes(term) ||
        (t.funcao ?? "").toLowerCase().includes(term) ||
        (t.setor ?? "").toLowerCase().includes(term)
      );
    });
  }, [data?.trabalhadores, q, empresaFiltro]);

  const onDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase
      .from("trabalhadores" as never)
      .delete()
      .eq("id", deleteId);
    if (error) toast.error(error.message);
    else {
      toast.success("Trabalhador removido.");
      await qc.invalidateQueries({ queryKey: ["trabalhadores-list"] });
    }
    setDeleteId(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title="Trabalhadores"
        subtitle="Cadastro individual de trabalhadores vinculados às empresas atendidas."
        actions={
          <button
            onClick={() => {
              setEditing(null);
              setOpenForm(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-glow hover:opacity-95"
          >
            <Plus className="h-4 w-4" /> Novo Trabalhador
          </button>
        }
      />

      <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-elegant">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome, CPF, função ou setor…"
              className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm"
            />
          </div>
          <select
            value={empresaFiltro}
            onChange={(e) => setEmpresaFiltro(e.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
          >
            <option value="todas">Todas as empresas</option>
            {data?.empresas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="rounded-3xl border border-border/60 bg-card shadow-elegant">
        {isLoading ? (
          <div className="flex items-center justify-center p-10">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
            <HardHat className="h-8 w-8 text-primary/60" />
            <p className="text-sm">Nenhum trabalhador encontrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="p-3 font-bold">Nome</th>
                  <th className="p-3 font-bold">CPF</th>
                  <th className="p-3 font-bold">Empresa</th>
                  <th className="p-3 font-bold">Função</th>
                  <th className="p-3 font-bold">Setor</th>
                  <th className="p-3 font-bold">Admissão</th>
                  <th className="p-3 font-bold text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-border/40 last:border-0 hover:bg-muted/30"
                  >
                    <td className="p-3 font-semibold text-foreground">{t.nome}</td>
                    <td className="p-3 text-muted-foreground">{t.cpf ? maskCpf(t.cpf) : "—"}</td>
                    <td className="p-3 text-muted-foreground">
                      {empresasMap.get(t.empresa_id) ?? "—"}
                    </td>
                    <td className="p-3 text-muted-foreground">{t.funcao ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">{t.setor ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">
                      {t.data_admissao
                        ? new Date(t.data_admissao).toLocaleDateString("pt-BR")
                        : "—"}
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditing(t);
                            setOpenForm(true);
                          }}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => setDeleteId(t.id)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            aria-label="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {openForm && (
        <TrabalhadorFormDialog
          open={openForm}
          onOpenChange={setOpenForm}
          empresas={data?.empresas ?? []}
          editing={editing}
          userId={user?.id}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir trabalhador?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function normalizeText(text: string) {
  return text
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function TrabalhadorFormDialog({
  open,
  onOpenChange,
  empresas,
  editing,
  userId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  empresas: { id: string; nome: string }[];
  editing: Trabalhador | null;
  userId?: string;
}) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    empresa_id: editing?.empresa_id ?? "",
    nome: editing?.nome ?? "",
    cpf: editing?.cpf ?? "",
    sexo: editing?.sexo ?? "",
    data_nascimento: editing?.data_nascimento ?? "",
    setor: editing?.setor ?? "",
    funcao: editing?.funcao ?? "",
    data_admissao: editing?.data_admissao ?? "",
    telefone: editing?.telefone ?? "",
    email: editing?.email ?? "",
  });

  // Sugestões de Setores da empresa selecionada
  const { data: setoresEmpresa = [] } = useQuery({
    queryKey: ["setores-sugestoes", form.empresa_id],
    enabled: open && !!form.empresa_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("setores" as never)
        .select("id, nome")
        .eq("empresa_id", form.empresa_id)
        .order("nome");
      return (data ?? []) as { id: string; nome: string }[];
    },
  });

  // Sugestões de Funções da empresa selecionada
  const { data: funcoesEmpresa = [] } = useQuery({
    queryKey: ["funcoes-sugestoes", form.empresa_id],
    enabled: open && !!form.empresa_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("funcoes" as never)
        .select("id, nome, setor_id")
        .eq("empresa_id", form.empresa_id)
        .order("nome");
      return (data ?? []) as { id: string; nome: string; setor_id: string | null }[];
    },
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.empresa_id || !form.nome.trim()) {
      toast.error("Empresa e nome são obrigatórios.");
      return;
    }
    setSaving(true);

    let finalSetorNome = form.setor.trim() || null;
    let finalFuncaoNome = form.funcao.trim() || null;
    let resolvedSetorId: string | null = null;

    // 1. Sincronização Inteligente do Setor
    if (finalSetorNome) {
      try {
        const { data: dbSetores } = await supabase
          .from("setores" as never)
          .select("id, nome")
          .eq("empresa_id", form.empresa_id);

        const normInputSetor = normalizeText(finalSetorNome);
        const existingSetor = (dbSetores as any[])?.find(
          (s) => normalizeText(s.nome) === normInputSetor
        );

        if (existingSetor) {
          // Reutiliza setor existente evitando duplicidade
          resolvedSetorId = existingSetor.id;
          finalSetorNome = existingSetor.nome;
        } else {
          // Cadastra automaticamente o novo setor para esta empresa
          const { data: novoSetor, error: errSetor } = await supabase
            .from("setores" as never)
            .insert({
              empresa_id: form.empresa_id,
              nome: finalSetorNome,
              created_by: userId ?? null,
            } as never)
            .select("id, nome")
            .single();

          if (!errSetor && novoSetor) {
            resolvedSetorId = (novoSetor as any).id;
            finalSetorNome = (novoSetor as any).nome;
            qc.invalidateQueries({ queryKey: ["setores"] });
          }
        }
      } catch (err) {
        console.warn("Aviso ao sincronizar setor:", err);
      }
    }

    // 2. Sincronização Inteligente da Função
    if (finalFuncaoNome) {
      try {
        const { data: dbFuncoes } = await supabase
          .from("funcoes" as never)
          .select("id, nome, setor_id")
          .eq("empresa_id", form.empresa_id);

        const normInputFuncao = normalizeText(finalFuncaoNome);
        const existingFuncao = (dbFuncoes as any[])?.find(
          (f) =>
            normalizeText(f.nome) === normInputFuncao &&
            (!resolvedSetorId || !f.setor_id || f.setor_id === resolvedSetorId)
        );

        if (existingFuncao) {
          // Reutiliza função existente
          finalFuncaoNome = existingFuncao.nome;
        } else {
          // Cadastra automaticamente a nova função vinculada à empresa e ao setor
          const { data: novaFuncao, error: errFuncao } = await supabase
            .from("funcoes" as never)
            .insert({
              empresa_id: form.empresa_id,
              setor_id: resolvedSetorId ?? null,
              nome: finalFuncaoNome,
              created_by: userId ?? null,
            } as never)
            .select("id, nome")
            .single();

          if (!errFuncao && novaFuncao) {
            finalFuncaoNome = (novaFuncao as any).nome;
            qc.invalidateQueries({ queryKey: ["funcoes"] });
          }
        }
      } catch (err) {
        console.warn("Aviso ao sincronizar função:", err);
      }
    }

    const payload = {
      empresa_id: form.empresa_id,
      nome: form.nome.trim(),
      cpf: form.cpf.trim() || null,
      sexo: form.sexo.trim() || null,
      data_nascimento: form.data_nascimento || null,
      setor: finalSetorNome,
      funcao: finalFuncaoNome,
      data_admissao: form.data_admissao || null,
      telefone: form.telefone.trim() || null,
      email: form.email.trim() || null,
    };

    let error;
    if (editing) {
      const r = await supabase
        .from("trabalhadores" as never)
        .update(payload as never)
        .eq("id", editing.id);
      error = r.error;
    } else {
      const r = await supabase
        .from("trabalhadores" as never)
        .insert({ ...payload, created_by: userId ?? null } as never);
      error = r.error;
    }
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(
      editing
        ? "Trabalhador atualizado. Setor e função sincronizados."
        : "Trabalhador cadastrado. Setor e função sincronizados com sucesso."
    );
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["trabalhadores-list"] }),
      qc.invalidateQueries({ queryKey: ["setores"] }),
      qc.invalidateQueries({ queryKey: ["funcoes"] }),
    ]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar Trabalhador" : "Novo Trabalhador"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-bold text-foreground">Empresa *</label>
            <select
              value={form.empresa_id}
              onChange={(e) => setForm({ ...form, empresa_id: e.target.value })}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
              required
            >
              <option value="">Selecione…</option>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-bold text-foreground">Nome *</label>
            <Input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-foreground">CPF</label>
            <Input
              value={form.cpf}
              onChange={(e) => setForm({ ...form, cpf: maskCpf(e.target.value) })}
              placeholder="000.000.000-00"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-foreground">Sexo</label>
            <select
              value={form.sexo}
              onChange={(e) => setForm({ ...form, sexo: e.target.value })}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
            >
              <option value="">—</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-foreground">
              Data de Nascimento
            </label>
            <Input
              type="date"
              value={form.data_nascimento}
              onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-foreground">Data de Admissão</label>
            <Input
              type="date"
              value={form.data_admissao}
              onChange={(e) => setForm({ ...form, data_admissao: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-foreground">
              Setor
              <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                (Selecione ou digite um novo)
              </span>
            </label>
            <Input
              value={form.setor}
              onChange={(e) => setForm({ ...form, setor: e.target.value })}
              list="sugestoes-setores"
              placeholder="Ex.: Administrativo, Operacional, Produção..."
            />
            <datalist id="sugestoes-setores">
              {setoresEmpresa.map((s) => (
                <option key={s.id} value={s.nome} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-foreground">
              Função
              <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                (Selecione ou digite uma nova)
              </span>
            </label>
            <Input
              value={form.funcao}
              onChange={(e) => setForm({ ...form, funcao: e.target.value })}
              list="sugestoes-funcoes"
              placeholder="Ex.: Auxiliar Administrativo, Operador..."
            />
            <datalist id="sugestoes-funcoes">
              {funcoesEmpresa.map((f) => (
                <option key={f.id} value={f.nome} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-foreground">Telefone</label>
            <Input
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-foreground">E-mail</label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
