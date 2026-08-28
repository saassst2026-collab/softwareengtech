import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Calculator, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { PageHero } from "@/components/PageHero";
import { ProgressBar } from "@/components/ProgressBar";
import { useUserRole } from "@/lib/useUserRole";
import { ContabilidadeFormDialog } from "@/components/ContabilidadeFormDialog";
import { setContabilidadeFilterPreset } from "@/lib/companyContext";
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
import { ReportButton } from "@/components/ReportButton";
import type { RelatorioOpcao } from "@/components/RelatorioDialog";

export const Route = createFileRoute("/_authenticated/contabilidades")({
  component: ContabilidadesPage,
});

type EditableContabilidade = {
  id: string;
  nome: string;
  cnpj: string | null;
  cidade: string | null;
  contato: string | null;
  responsavel: string | null;
  observacoes: string | null;
};

function ContabilidadesPage() {
  const { isAdmin } = useUserRole();
  const [novaContabilidadeOpen, setNovaContabilidadeOpen] = useState(false);
  const [editingContabilidade, setEditingContabilidade] = useState<EditableContabilidade | null>(
    null,
  );
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["contabilidades-page"],
    queryFn: async () => {
      const [contabRes, empRes, docsRes] = await Promise.all([
        supabase.from("contabilidades").select("*").order("nome"),
        supabase.from("empresas").select("id,contabilidade_id"),
        supabase
          .from("documentos_sst")
          .select("id,tipo,empresa_id,situacao,data_vencimento,data_conclusao,conferencia_ok"),
      ]);
      if (contabRes.error) throw contabRes.error;
      if (empRes.error) throw empRes.error;
      if (docsRes.error) throw docsRes.error;
      return {
        contabilidades: contabRes.data ?? [],
        empresas: empRes.data ?? [],
        documentos: docsRes.data ?? [],
      };
    },
  });

  const contabilidades = data?.contabilidades ?? [];
  const empresas = data?.empresas ?? [];
  const documentos = data?.documentos ?? [];

  const deleteContabilidade = async () => {
    if (!deleteId) return;
    const empresaIds = empresas
      .filter((empresa) => empresa.contabilidade_id === deleteId)
      .map((empresa) => empresa.id);
    if (empresaIds.length > 0) {
      await supabase.from("documentos_sst").delete().in("empresa_id", empresaIds);
      await supabase.from("eventos_esocial").delete().in("empresa_id", empresaIds);
      await supabase.from("empresas").delete().in("id", empresaIds);
    }
    const { error } = await supabase.from("contabilidades").delete().eq("id", deleteId);
    if (error) toast.error(error.message);
    else {
      toast.success("Contabilidade excluída.");
      setDeleteId(null);
      await queryClient.invalidateQueries();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title="Contabilidades parceiras"
        subtitle="Acompanhe o desempenho dos escritórios contábeis que indicam empresas para a consultoria SST."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ReportButton
              modulo="outros"
              getOpcoes={() => buildContabOpcoes({ contabilidades, empresas, documentos })}
            />
            {isAdmin && (
              <button
                onClick={() => setNovaContabilidadeOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-glow"
              >
                <Plus className="h-4 w-4" /> Nova contabilidade
              </button>
            )}
          </div>
        }
      />

      <ContabilidadeFormDialog
        open={novaContabilidadeOpen}
        onOpenChange={setNovaContabilidadeOpen}
      />
      <ContabilidadeFormDialog
        open={Boolean(editingContabilidade)}
        onOpenChange={(open) => !open && setEditingContabilidade(null)}
        editingContabilidade={editingContabilidade}
      />

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir contabilidade</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este item? Essa ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteContabilidade}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isLoading && <p className="text-center text-sm text-muted-foreground">Carregando…</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {contabilidades.map((c) => {
          const empresasVinc = empresas.filter((e) => e.contabilidade_id === c.id);
          const empresasIds = new Set(empresasVinc.map((e) => e.id));
          const docsVinc = documentos.filter((d) => empresasIds.has(d.empresa_id));
          const breakdown = computarConformidade(docsVinc);
          const totalDocs = breakdown.total;
          const emDia = breakdown.regularizados;
          const indeterminados = breakdown.indeterminados;
          const atrasados = breakdown.vencidos + breakdown.pendentes + breakdown.parciais;
          const desempenho = breakdown.percentual;

          return (
            <article
              key={c.id}
              className="rounded-3xl border border-border/60 bg-card p-5 shadow-elegant"
            >
              <header className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-brand text-primary-foreground">
                    <Calculator className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-foreground">{c.nome}</h3>
                    <p className="text-xs text-muted-foreground">
                      {c.cidade ?? "—"} · {c.cnpj ?? "Sem CNPJ"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to="/empresas"
                    onClick={() => setContabilidadeFilterPreset(c.id)}
                    title="Ver empresas desta contabilidade"
                    className="rounded-full bg-info/15 px-3 py-1 text-[11px] font-bold text-info underline-offset-2 transition hover:bg-info/25 hover:underline"
                  >
                    {empresasVinc.length} empresa{empresasVinc.length !== 1 && "s"}
                  </Link>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => setEditingContabilidade(c)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-primary/10 hover:text-primary"
                        aria-label="Editar contabilidade"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(c.id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Excluir contabilidade"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </header>

              <dl className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-2xl bg-muted/40 p-3 text-center">
                  <dt className="text-[10px] font-bold uppercase text-muted-foreground">
                    Documentos
                  </dt>
                  <dd className="text-lg font-extrabold text-foreground">{totalDocs}</dd>
                </div>
                <div className="rounded-2xl bg-success/10 p-3 text-center">
                  <dt className="text-[10px] font-bold uppercase text-success">Regulares</dt>
                  <dd className="text-lg font-extrabold text-success">{emDia}</dd>
                </div>
                <div className="rounded-2xl bg-muted/60 p-3 text-center">
                  <dt className="text-[10px] font-bold uppercase text-muted-foreground">
                    Indeterminados
                  </dt>
                  <dd className="text-lg font-extrabold text-foreground">{indeterminados}</dd>
                </div>
                <div className="rounded-2xl bg-destructive/10 p-3 text-center">
                  <dt className="text-[10px] font-bold uppercase text-destructive">Pendentes</dt>
                  <dd className="text-lg font-extrabold text-destructive">{atrasados}</dd>
                </div>
              </dl>

              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-bold text-muted-foreground">Conformidade geral</span>
                <span className="font-extrabold text-primary">{desempenho.toFixed(0)}%</span>
              </div>
              <ProgressBar value={desempenho} />

              {c.responsavel && (
                <p className="mt-4 text-xs text-muted-foreground">
                  Responsável: <span className="font-bold text-foreground">{c.responsavel}</span>
                  {c.contato && <> · {c.contato}</>}
                </p>
              )}
            </article>
          );
        })}
      </div>

      {!isLoading && contabilidades.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-10 text-center text-sm text-muted-foreground">
          Nenhuma contabilidade cadastrada.
        </div>
      )}
    </div>
  );
}

type ContabRow = { id: string; nome: string; cidade: string | null; cnpj: string | null };
type EmpVinc = { id: string; contabilidade_id: string | null };
type DocVinc = {
  id: string;
  empresa_id: string;
  tipo: string;
  situacao: string;
  data_vencimento: string | null;
  data_conclusao: string | null;
  conferencia_ok: boolean | null;
};

function buildContabOpcoes(args: {
  contabilidades: ContabRow[];
  empresas: EmpVinc[];
  documentos: DocVinc[];
}): RelatorioOpcao[] {
  const { contabilidades, empresas, documentos } = args;
  const stats = (id: string) => {
    const emp = empresas.filter((e) => e.contabilidade_id === id);
    const ids = new Set(emp.map((e) => e.id));
    const docs = documentos.filter((d) => ids.has(d.empresa_id));
    const c = computarConformidade(docs);
    return {
      empresas: emp.length,
      total: c.total,
      regulares: c.regularizados,
      pendentes: c.vencidos + c.pendentes + c.parciais,
      percentual: c.percentual,
    };
  };
  const colunas = [
    { header: "Contabilidade" },
    { header: "Cidade" },
    { header: "Empresas", align: "right" as const },
    { header: "Documentos", align: "right" as const },
    { header: "Regulares", align: "right" as const },
    { header: "Pendentes", align: "right" as const },
    { header: "Conformidade", align: "right" as const },
  ];
  const toLinha = (c: ContabRow): Array<string | number> => {
    const s = stats(c.id);
    return [
      c.nome,
      c.cidade ?? "—",
      s.empresas,
      s.total,
      s.regulares,
      s.pendentes,
      s.total === 0 ? "—" : `${s.percentual.toFixed(0)}%`,
    ];
  };
  const make = (
    id: string,
    label: string,
    list: ContabRow[],
    descricao?: string,
  ): RelatorioOpcao => ({
    id,
    label,
    descricao,
    build: () => ({
      titulo: label,
      colunas,
      linhas: list.map(toLinha),
      totalizadores: [
        { label: "Total de contabilidades", value: String(list.length) },
        {
          label: "Total de empresas vinculadas",
          value: String(list.reduce((acc, c) => acc + stats(c.id).empresas, 0)),
        },
      ],
    }),
  });
  const comVinculo = contabilidades.filter((c) => stats(c.id).empresas > 0);
  const ranking = [...contabilidades].sort((a, b) => stats(b.id).empresas - stats(a.id).empresas);
  const comPendentes = contabilidades.filter((c) => stats(c.id).pendentes > 0);
  return [
    make("todas", "Todas as contabilidades", contabilidades),
    make("com-empresas", "Contabilidades com empresas vinculadas", comVinculo),
    make(
      "ranking",
      "Ranking por volume de empresas",
      ranking,
      "Ordenado por nº de empresas vinculadas",
    ),
    make("pendentes", "Contabilidades com empresas pendentes", comPendentes),
  ];
}
