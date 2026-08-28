import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, Building2, Pencil, Shield, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { PageHero } from "@/components/PageHero";
import { useUserRole } from "@/lib/useUserRole";
import { EmpresaFormDialog } from "@/components/EmpresaFormDialog";
import { setSelectedEmpresaId } from "@/lib/companyContext";
import { consumeContabilidadeFilterPreset } from "@/lib/companyContext";
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
import { computarConformidade } from "@/lib/conformidade";
import { logAudit } from "@/lib/audit";
import { ReportButton } from "@/components/ReportButton";
import type { RelatorioOpcao } from "@/components/RelatorioDialog";
import { computarChecklistEmpresa, motivoLabel } from "@/lib/checklistEmpresa";

export const Route = createFileRoute("/_authenticated/empresas")({
  component: EmpresasPage,
});

function ConformidadeBadge({ percentual, total }: { percentual: number; total: number }) {
  if (total === 0) {
    return (
      <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
        Sem documentos
      </span>
    );
  }
  const cls =
    percentual >= 80
      ? "bg-success/15 text-success"
      : percentual >= 50
        ? "bg-warning/30 text-warning-foreground"
        : "bg-destructive/15 text-destructive";
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${cls}`}>
      {percentual.toFixed(0)}% conforme
    </span>
  );
}

type EditableEmpresa = {
  id: string;
  nome: string;
  cnpj: string | null;
  contabilidade_id: string | null;
  cidade: string | null;
  uf: string | null;
  contato: string | null;
  responsavel: string | null;
  observacoes: string | null;
  logo_url?: string | null;
};

function EmpresasPage() {
  const [q, setQ] = useState("");
  const [contabFiltro, setContabFiltro] = useState<string>(
    () => consumeContabilidadeFilterPreset() ?? "todas",
  );
  const [cidadeFiltro, setCidadeFiltro] = useState<string>("todas");
  const [novaEmpresaOpen, setNovaEmpresaOpen] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<EditableEmpresa | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { isAdmin } = useUserRole();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["empresas-list"],
    queryFn: async () => {
      const [empRes, contabRes, docsRes] = await Promise.all([
        supabase.from("empresas").select("*").order("nome"),
        supabase.from("contabilidades").select("id,nome"),
        supabase
          .from("documentos_sst")
          .select("id,tipo,empresa_id,situacao,data_vencimento,data_conclusao,conferencia_ok"),
      ]);
      if (empRes.error) throw empRes.error;
      if (contabRes.error) throw contabRes.error;
      if (docsRes.error) throw docsRes.error;
      return {
        empresas: empRes.data ?? [],
        contabilidades: contabRes.data ?? [],
        documentos: docsRes.data ?? [],
      };
    },
  });

  const empresas = data?.empresas ?? [];
  const contabMap = new Map((data?.contabilidades ?? []).map((c) => [c.id, c.nome]));
  const contabilidades = data?.contabilidades ?? [];

  const filtered = empresas.filter((e) => {
    const okQ =
      q === "" || e.nome.toLowerCase().includes(q.toLowerCase()) || (e.cnpj ?? "").includes(q);
    const okC =
      contabFiltro === "todas" ||
      (contabFiltro === "sem" ? !e.contabilidade_id : e.contabilidade_id === contabFiltro);
    const okCidade =
      cidadeFiltro === "todas" ||
      (cidadeFiltro === "sem" ? !e.cidade : (e.cidade ?? "") === cidadeFiltro);
    return okQ && okC && okCidade;
  });

  const cidadesDisponiveis = Array.from(
    new Set(empresas.map((e) => e.cidade).filter((c): c is string => Boolean(c))),
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  const docsByEmpresa = (id: string) => (data?.documentos ?? []).filter((d) => d.empresa_id === id);

  const conformidadeEmpresa = (id: string) => computarConformidade(docsByEmpresa(id));

  const deleteEmpresa = async () => {
    if (!deleteId) return;
    const alvo = empresas.find((e) => e.id === deleteId);
    await supabase.from("documentos_sst").delete().eq("empresa_id", deleteId);
    await supabase.from("eventos_esocial").delete().eq("empresa_id", deleteId);
    const { error } = await supabase.from("empresas").delete().eq("id", deleteId);
    if (error) toast.error(error.message);
    else {
      await logAudit({
        acao: "excluiu_empresa",
        modulo: "empresas",
        entidade_id: deleteId,
        entidade_tipo: "empresa",
        empresa_id: deleteId,
        descricao: `Excluiu a empresa "${alvo?.nome ?? deleteId}"`,
      });
      toast.success("Empresa excluída.");
      setDeleteId(null);
      await queryClient.invalidateQueries();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title="Empresas atendidas"
        subtitle="Gestão das empresas clientes da consultoria SST com vínculos de contabilidade e status contratual."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ReportButton
              modulo="empresas"
              getOpcoes={() =>
                buildEmpresasOpcoes({
                  empresas,
                  filtered,
                  contabMap,
                  conformidadeEmpresa,
                  docsByEmpresa,
                })
              }
            />
            {isAdmin && (
              <button
                onClick={() => setNovaEmpresaOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-glow"
              >
                <Plus className="h-4 w-4" /> Nova empresa
              </button>
            )}
          </div>
        }
      />

      <EmpresaFormDialog
        open={novaEmpresaOpen}
        onOpenChange={setNovaEmpresaOpen}
        contabilidades={contabilidades}
      />
      <EmpresaFormDialog
        open={Boolean(editingEmpresa)}
        onOpenChange={(open) => !open && setEditingEmpresa(null)}
        contabilidades={contabilidades}
        editingEmpresa={editingEmpresa}
      />

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir empresa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este item? Essa ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteEmpresa}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-elegant">
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome ou CNPJ"
              className="w-full rounded-xl border border-input bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select
            value={contabFiltro}
            onChange={(e) => setContabFiltro(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
          >
            <option value="todas">Todas as contabilidades</option>
            <option value="sem">Sem contabilidade</option>
            {contabilidades
              .slice()
              .sort((a, b) => a.nome.localeCompare(b.nome))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
          </select>
          <select
            value={cidadeFiltro}
            onChange={(e) => setCidadeFiltro(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
          >
            <option value="todas">Todas as cidades</option>
            <option value="sem">Sem cidade</option>
            {cidadesDisponiveis.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Desktop table */}
        <div className="-mx-5 hidden overflow-x-auto px-5 lg:block">
          <table className="w-full min-w-[780px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="pb-3 pr-3">Empresa</th>
                <th className="pb-3 pr-3">CNPJ</th>
                <th className="pb-3 pr-3">Cidade/UF</th>
                <th className="pb-3 pr-3">Contabilidade</th>
                <th className="pb-3 pr-3">Conformidade</th>
                {isAdmin && <th className="pb-3 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="py-8 text-center text-muted-foreground">
                    Carregando…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="py-8 text-center text-muted-foreground">
                    Nenhuma empresa encontrada.
                  </td>
                </tr>
              ) : (
                filtered.map((e) => {
                  const conf = conformidadeEmpresa(e.id);
                  return (
                    <tr key={e.id} className="border-t border-border/60 hover:bg-muted/30">
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <Link
                            to="/documentos"
                            onClick={() => setSelectedEmpresaId(e.id)}
                            className="font-bold text-foreground underline-offset-4 hover:text-primary hover:underline"
                          >
                            {e.nome}
                          </Link>
                          <IsencaoToggle
                            empresaId={e.id}
                            ativa={Boolean(e.isencao_simplificada)}
                            disabled={!isAdmin}
                          />
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-muted-foreground">{e.cnpj ?? "—"}</td>
                      <td className="py-3 pr-3 text-muted-foreground">
                        {e.cidade ? `${e.cidade}/${e.uf ?? "—"}` : "—"}
                      </td>
                      <td className="py-3 pr-3 text-muted-foreground">
                        {e.contabilidade_id ? (contabMap.get(e.contabilidade_id) ?? "—") : "—"}
                      </td>
                      <td className="py-3 pr-3">
                        <ConformidadeBadge percentual={conf.percentual} total={conf.total} />
                      </td>
                      {isAdmin && (
                        <td className="py-3 text-right">
                          <button
                            onClick={() => setEditingEmpresa(e)}
                            className="mr-2 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-primary/10 hover:text-primary"
                            aria-label="Editar empresa"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteId(e.id)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            aria-label="Excluir empresa"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile card view */}
        <div className="flex flex-col gap-3 lg:hidden">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Carregando…</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma empresa encontrada.
            </p>
          ) : (
            filtered.map((e) => {
              const conf = conformidadeEmpresa(e.id);
              return (
                <div key={e.id} className="rounded-2xl border border-border/60 bg-card p-3">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <Link
                        to="/documentos"
                        onClick={() => setSelectedEmpresaId(e.id)}
                        className="truncate font-bold text-foreground underline-offset-4 hover:text-primary hover:underline"
                      >
                        {e.nome}
                      </Link>
                    </div>
                    <ConformidadeBadge percentual={conf.percentual} total={conf.total} />
                  </div>
                  <div className="mb-2">
                    <IsencaoToggle
                      empresaId={e.id}
                      ativa={Boolean(e.isencao_simplificada)}
                      disabled={!isAdmin}
                    />
                  </div>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                    <div className="col-span-2">
                      <dt className="font-bold uppercase text-muted-foreground">CNPJ</dt>
                      <dd className="text-foreground">{e.cnpj ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="font-bold uppercase text-muted-foreground">Cidade/UF</dt>
                      <dd className="text-foreground">
                        {e.cidade ? `${e.cidade}/${e.uf ?? "—"}` : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-bold uppercase text-muted-foreground">Contabilidade</dt>
                      <dd className="truncate text-foreground">
                        {e.contabilidade_id ? (contabMap.get(e.contabilidade_id) ?? "—") : "—"}
                      </dd>
                    </div>
                  </dl>
                  {isAdmin && (
                    <div className="mt-2 flex items-center justify-end gap-2">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setEditingEmpresa(e)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-primary/10 hover:text-primary"
                          aria-label="Editar empresa"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(e.id)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Excluir empresa"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

type EmpresaRow = {
  id: string;
  nome: string;
  cnpj: string | null;
  cidade: string | null;
  uf: string | null;
  contabilidade_id: string | null;
  isencao_simplificada?: boolean | null;
  isencao_pgr?: boolean | null;
  isencao_pcmso?: boolean | null;
  isencao_ficha_epi?: boolean | null;
};

function buildEmpresasOpcoes(args: {
  empresas: EmpresaRow[];
  filtered: EmpresaRow[];
  contabMap: Map<string, string>;
  conformidadeEmpresa: (id: string) => { total: number; percentual: number };
  docsByEmpresa: (
    id: string,
  ) => Array<{
    tipo: string;
    conferencia_ok?: boolean | null;
    data_vencimento?: string | null;
    situacao?: string | null;
  }>;
}): RelatorioOpcao[] {
  const { empresas, filtered, contabMap, conformidadeEmpresa, docsByEmpresa } = args;
  const colunas = [
    { header: "Empresa" },
    { header: "CNPJ" },
    { header: "Cidade/UF" },
    { header: "Contabilidade" },
    { header: "Conformidade", align: "right" as const },
  ];
  const toLinha = (e: EmpresaRow): Array<string | number> => {
    const conf = conformidadeEmpresa(e.id);
    return [
      e.nome,
      e.cnpj ?? "—",
      e.cidade ? `${e.cidade}/${e.uf ?? "—"}` : "—",
      e.contabilidade_id ? (contabMap.get(e.contabilidade_id) ?? "—") : "—",
      conf.total === 0 ? "—" : `${conf.percentual.toFixed(0)}%`,
    ];
  };
  const make = (
    id: string,
    label: string,
    list: EmpresaRow[],
    descricao?: string,
  ): RelatorioOpcao => ({
    id,
    label,
    descricao,
    build: () => ({
      titulo: label,
      colunas,
      linhas: list.map(toLinha),
      totalizadores: [{ label: "Total de empresas", value: String(list.length) }],
    }),
  });
  return [
    make("todas", "Todas as empresas", empresas),
    make(
      "filtradas",
      "Empresas conforme filtros atuais",
      filtered,
      "Usa os filtros já aplicados na tela",
    ),
    make(
      "criticas",
      "Empresas com pendências críticas",
      empresas.filter((e) => {
        const c = conformidadeEmpresa(e.id);
        return c.total > 0 && c.percentual < 50;
      }),
      "Conformidade abaixo de 50%",
    ),
    make(
      "concluidas",
      "Empresas concluídas (100% conformes)",
      empresas.filter((e) => {
        const c = conformidadeEmpresa(e.id);
        return c.total > 0 && c.percentual >= 100;
      }),
    ),
    make(
      "atrasadas",
      "Empresas com documentos vencidos",
      empresas.filter((e) => {
        const c = conformidadeEmpresa(e.id);
        return c.total > 0 && c.percentual < 100;
      }),
    ),
    make(
      "sem-doc",
      "Empresas sem documentos cadastrados",
      empresas.filter((e) => conformidadeEmpresa(e.id).total === 0),
    ),
    {
      id: "pendencias-por-empresa",
      label: "Pendências por empresa (o que falta)",
      descricao:
        "Lista, para cada empresa, quais documentos obrigatórios faltam ou estão sem anexo conferido.",
      build: () => {
        const linhas: Array<Array<string | number>> = [];
        let empresasPendentes = 0;
        for (const e of empresas
          .slice()
          .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }))) {
          const checklist = computarChecklistEmpresa(e, docsByEmpresa(e.id));
          if (checklist.pronta) continue;
          empresasPendentes++;
          const faltando = checklist.faltando
            .map(
              (r) => `${r.label} (${motivoLabel(r.motivo)}${r.detalhe ? ` — ${r.detalhe}` : ""})`,
            )
            .join(" • ");
          linhas.push([
            e.nome,
            checklist.simplificada ? "Simplificada" : "Completa",
            String(checklist.faltando.length),
            faltando,
          ]);
        }
        return {
          titulo: "Pendências por empresa",
          colunas: [
            { header: "Empresa" },
            { header: "Tipo" },
            { header: "Pendências", align: "right" as const },
            { header: "O que falta" },
          ],
          linhas,
          totalizadores: [
            { label: "Empresas com pendências", value: String(empresasPendentes) },
            {
              label: "Empresas 100% prontas",
              value: String(empresas.length - empresasPendentes),
            },
          ],
        };
      },
    },
  ];
}

function IsencaoToggle({
  empresaId,
  ativa,
  disabled,
}: {
  empresaId: string;
  ativa: boolean;
  disabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (nova: boolean) => {
      const { error } = await supabase
        .from("empresas")
        .update({ isencao_simplificada: nova })
        .eq("id", empresaId);
      if (error) throw error;
      await logAudit({
        acao: nova ? "marcar_empresa_simplificada" : "desmarcar_empresa_simplificada",
        modulo: "empresas",
        entidade_tipo: "empresa",
        entidade_id: empresaId,
        empresa_id: empresaId,
        descricao: nova
          ? "Marcou a empresa como simplificada (isenta de PGR/PGRTR, PCMSO e Ficha de EPI)"
          : "Removeu a isenção simplificada da empresa",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao atualizar isenção"),
  });
  const handle = () => {
    if (disabled) return;
    mutation.mutate(!ativa);
  };
  const cls = ativa
    ? "border-success/40 bg-success/10 text-success"
    : "border-border bg-background text-muted-foreground hover:bg-muted/60";
  const Icon = ativa ? ShieldCheck : Shield;
  return (
    <button
      type="button"
      onClick={handle}
      disabled={disabled || mutation.isPending}
      title={
        ativa
          ? "Empresa simplificada (isenta de PGR/PGRTR, PCMSO e Ficha de EPI). Clique para remover."
          : "Marcar como Empresa simplificada (isenta de PGR/PGRTR, PCMSO e Ficha de EPI)"
      }
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide transition disabled:opacity-60 ${cls}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {ativa ? "Simplificada" : "Marcar isenção"}
    </button>
  );
}
