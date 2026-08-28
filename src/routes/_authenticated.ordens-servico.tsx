import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Plus, Pencil, Trash2, Copy, FileDown, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { PageHero } from "@/components/PageHero";
import { supabase } from "@/integrations/supabase/client";
import { useAppSettings } from "@/lib/useAppSettings";
import { useAuth } from "@/lib/auth";
import { parseLocalDate } from "@/lib/dateUtils";
import {
  OrdemServicoFormDialog,
  type OrdemServicoRecord,
} from "@/components/OrdemServicoFormDialog";
import { downloadOrdemServicoPDF, gerarOrdemServicoPDF } from "@/lib/ordemServicoPdf";
import engtechLogo from "@/assets/engtech-logo.jpeg.asset.json";

export const Route = createFileRoute("/_authenticated/ordens-servico")({
  component: OrdensServicoPage,
});

function OrdensServicoPage() {
  const qc = useQueryClient();
  const { settings } = useAppSettings();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<OrdemServicoRecord | null>(null);
  const [open, setOpen] = useState(false);

  const { data: ordens, isLoading } = useQuery({
    queryKey: ["ordens-servico"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ordens_servico" as never)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as OrdemServicoRecord[];
    },
  });

  const { data: empresasLogo } = useQuery({
    queryKey: ["empresas-logos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("empresas").select("id, logo_url");
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; logo_url: string | null }>;
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ordens ?? [];
    return (ordens ?? []).filter(
      (o) =>
        o.funcionario_nome.toLowerCase().includes(q) ||
        o.empregador_razao_social.toLowerCase().includes(q) ||
        o.funcionario_cargo.toLowerCase().includes(q) ||
        (o.funcionario_cpf ?? "").includes(q),
    );
  }, [ordens, search]);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ordens_servico" as never)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ordem de serviço excluída");
      qc.invalidateQueries({ queryKey: ["ordens-servico"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao excluir"),
  });

  const duplicate = useMutation({
    mutationFn: async (o: OrdemServicoRecord) => {
      const { id, created_at, ...rest } = o;
      void id;
      void created_at;
      const payload = {
        ...rest,
        funcionario_nome: `${o.funcionario_nome} (cópia)`,
        created_by: user?.id ?? null,
      };
      const { error } = await supabase.from("ordens_servico" as never).insert(payload as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ordem de serviço duplicada");
      qc.invalidateQueries({ queryKey: ["ordens-servico"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao duplicar"),
  });

  const handleGerarPdf = async (o: OrdemServicoRecord) => {
    try {
      const empresaLogo = o.empresa_id
        ? (empresasLogo?.find((e) => e.id === o.empresa_id)?.logo_url ?? null)
        : null;
      const doc = await gerarOrdemServicoPDF({
        empregador_razao_social: o.empregador_razao_social,
        funcionario_nome: o.funcionario_nome,
        funcionario_cpf: o.funcionario_cpf,
        funcionario_cargo: o.funcionario_cargo,
        funcionario_setor: o.funcionario_setor,
        data_admissao: o.data_admissao,
        descricao_atividades: o.descricao_atividades,
        riscos_fisicos: o.riscos_fisicos,
        riscos_quimicos: o.riscos_quimicos,
        riscos_biologicos: o.riscos_biologicos,
        riscos_ergonomicos: o.riscos_ergonomicos,
        riscos_acidentes: o.riscos_acidentes,
        medidas_preventivas: o.medidas_preventivas,
        treinamentos_obrigatorios: o.treinamentos_obrigatorios,
        proibicoes: o.proibicoes,
        responsavel_nome: o.responsavel_nome,
        responsavel_titulo: o.responsavel_titulo,
        responsavel_registro: o.responsavel_registro,
        local_emissao: o.local_emissao,
        data_emissao: o.data_emissao,
        revisao: o.revisao,
        logo_url:
          empresaLogo ?? settings?.app_icon_url ?? settings?.proposta_logo_url ?? engtechLogo.url,
      });
      downloadOrdemServicoPDF(doc, `${o.funcionario_nome}_${o.funcionario_cargo}`);
      toast.success("PDF gerado com sucesso");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar PDF");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title="Ordens de Serviço"
        subtitle="Emita OS de segurança do trabalho no modelo EngTech em poucos cliques."
        actions={
          <button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-glow"
          >
            <Plus className="h-4 w-4" /> Nova Ordem de Serviço
          </button>
        }
      />

      <section className="rounded-3xl border border-border/60 bg-card p-4 shadow-elegant">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por funcionário, empresa, cargo ou CPF..."
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
          <ClipboardList className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-bold text-foreground">Nenhuma ordem de serviço encontrada</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Clique em "Nova Ordem de Serviço" para começar.
          </p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-3xl border border-border bg-card shadow-elegant lg:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">Funcionário</th>
                  <th className="p-3">Cargo</th>
                  <th className="p-3">Empresa</th>
                  <th className="p-3">Setor</th>
                  <th className="p-3">Emissão</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3 font-semibold">{o.funcionario_nome}</td>
                    <td className="p-3 text-muted-foreground">{o.funcionario_cargo}</td>
                    <td className="p-3 text-muted-foreground">{o.empregador_razao_social}</td>
                    <td className="p-3 text-muted-foreground">{o.funcionario_setor ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">
                      {parseLocalDate(o.data_emissao ?? "")?.toLocaleDateString("pt-BR") ?? "—"}
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        <ActionBtn onClick={() => handleGerarPdf(o)} title="Gerar PDF">
                          <FileDown className="h-3.5 w-3.5" />
                        </ActionBtn>
                        <ActionBtn
                          onClick={() => {
                            setEditing(o);
                            setOpen(true);
                          }}
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </ActionBtn>
                        <ActionBtn onClick={() => duplicate.mutate(o)} title="Duplicar">
                          <Copy className="h-3.5 w-3.5" />
                        </ActionBtn>
                        <ActionBtn
                          onClick={() => {
                            if (confirm("Excluir esta ordem de serviço?")) remove.mutate(o.id);
                          }}
                          title="Excluir"
                          danger
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </ActionBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 lg:hidden">
            {filtered.map((o) => (
              <div
                key={o.id}
                className="rounded-2xl border border-border bg-card p-3 shadow-elegant"
              >
                <p className="text-sm font-bold">{o.funcionario_nome}</p>
                <p className="text-xs text-muted-foreground">{o.funcionario_cargo}</p>
                <p className="mt-1 text-xs text-muted-foreground">{o.empregador_razao_social}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <ActionBtn onClick={() => handleGerarPdf(o)} title="PDF">
                    <FileDown className="h-3.5 w-3.5" /> PDF
                  </ActionBtn>
                  <ActionBtn
                    onClick={() => {
                      setEditing(o);
                      setOpen(true);
                    }}
                    title="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </ActionBtn>
                  <ActionBtn onClick={() => duplicate.mutate(o)} title="Duplicar">
                    <Copy className="h-3.5 w-3.5" /> Duplicar
                  </ActionBtn>
                  <ActionBtn
                    onClick={() => {
                      if (confirm("Excluir esta ordem de serviço?")) remove.mutate(o.id);
                    }}
                    title="Excluir"
                    danger
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </ActionBtn>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <OrdemServicoFormDialog open={open} onOpenChange={setOpen} ordem={editing} />
    </div>
  );
}

function ActionBtn({
  children,
  onClick,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold transition ${
        danger
          ? "border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10"
          : "border-border bg-card text-foreground hover:border-primary/40 hover:text-primary"
      }`}
    >
      {children}
    </button>
  );
}
