import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Activity,
  Building2,
  FileCheck2,
  FolderOpen,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import { PageHero } from "@/components/PageHero";
import { StatusBadge } from "@/components/StatusBadge";
import { ProgressBar } from "@/components/ProgressBar";
import { DocumentFormDialog } from "@/components/DocumentFormDialog";
import { EmpresaDiagnostico } from "@/components/EmpresaDiagnostico";
import { cn } from "@/lib/utils";
import { tipoLabel } from "@/lib/documentoLabels";
import { useUserRole } from "@/lib/useUserRole";
import { parseLocalDate, daysFromToday } from "@/lib/dateUtils";

export const Route = createFileRoute("/_authenticated/empresas/$empresaId")({
  component: EmpresaDetalhePage,
});

function EmpresaDetalhePage() {
  const { empresaId } = Route.useParams();
  const { isAdmin } = useUserRole();
  const [novoDocumentoOpen, setNovoDocumentoOpen] = useState(false);
  const [tab, setTab] = useState<"resumo" | "diagnostico">("resumo");

  const { data, isLoading } = useQuery({
    queryKey: ["empresa-detalhe", empresaId],
    queryFn: async () => {
      const [empresaRes, docsRes, contabRes] = await Promise.all([
        supabase.from("empresas").select("*").eq("id", empresaId).single(),
        supabase
          .from("documentos_sst")
          .select("*")
          .eq("empresa_id", empresaId)
          .order("data_vencimento", { ascending: true, nullsFirst: false }),
        supabase.from("contabilidades").select("id,nome"),
      ]);
      if (empresaRes.error) throw empresaRes.error;
      if (docsRes.error) throw docsRes.error;
      if (contabRes.error) throw contabRes.error;
      return {
        empresa: empresaRes.data,
        documentos: docsRes.data ?? [],
        contabilidades: contabRes.data ?? [],
      };
    },
  });

  const empresa = data?.empresa;
  const documentos = data?.documentos ?? [];
  const contabilidades = data?.contabilidades ?? [];
  const contabilidadeNome =
    contabilidades.find((c) => c.id === empresa?.contabilidade_id)?.nome ?? "Sem contabilidade";
  const emDia = documentos.filter(
    (d) => d.situacao === "em_dia" || d.situacao === "concluido",
  ).length;
  const proximoVenc = documentos.filter((d) => d.situacao === "proximo_vencimento").length;
  const vencidos = documentos.filter((d) => d.situacao === "vencido").length;
  const comPrazo = emDia + proximoVenc + vencidos;
  const conformidade = comPrazo > 0 ? (emDia / comPrazo) * 100 : 0;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const detalhesVencimento = (dataVencimento: string | null) => {
    if (!dataVencimento) return "Não aplicável";
    const dias = daysFromToday(dataVencimento) ?? 0;
    if (dias < 0)
      return `${Math.abs(dias)} dia${Math.abs(dias) === 1 ? "" : "s"} vencido${Math.abs(dias) === 1 ? "" : "s"}`;
    if (dias === 0) return "Vence hoje";
    return `${dias} dia${dias === 1 ? "" : "s"} restante${dias === 1 ? "" : "s"}`;
  };
  const statusVisual = (doc: (typeof documentos)[number]) => {
    if (doc.situacao === "vencido")
      return { label: "❌ Vencido", className: "bg-destructive/15 text-destructive" };
    if (doc.situacao === "proximo_vencimento")
      return {
        label: "⚠️ Próximo do vencimento",
        className: "bg-warning/30 text-warning-foreground",
      };
    if (!doc.data_vencimento)
      return { label: "✅ Regular", className: "bg-success/15 text-success" };
    const dias = daysFromToday(doc.data_vencimento) ?? 0;
    if (dias < 0) return { label: "❌ Vencido", className: "bg-destructive/15 text-destructive" };
    if (dias <= 30)
      return {
        label: "⚠️ Próximo do vencimento",
        className: "bg-warning/30 text-warning-foreground",
      };
    return { label: "✅ Regular", className: "bg-success/15 text-success" };
  };

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/empresas"
        className="inline-flex w-fit items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Empresas atendidas
      </Link>

      <PageHero
        title={empresa?.nome ?? "Pasta da empresa"}
        subtitle={`Pasta documental · ${empresa?.cidade ?? "—"}${empresa?.uf ? `/${empresa.uf}` : ""} · ${contabilidadeNome}`}
        actions={
          isAdmin ? (
            <button
              onClick={() => setNovoDocumentoOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-glow"
            >
              <Plus className="h-4 w-4" /> Novo documento
            </button>
          ) : null
        }
      />

      <DocumentFormDialog
        open={novoDocumentoOpen}
        onOpenChange={setNovoDocumentoOpen}
        empresas={
          empresa
            ? [{ id: empresa.id, nome: empresa.nome, contabilidade_id: empresa.contabilidade_id }]
            : []
        }
        contabilidades={contabilidades}
        preselectedEmpresaId={empresaId}
      />

      <div className="inline-flex w-fit items-center gap-1 rounded-2xl border border-border bg-card p-1 shadow-elegant">
        {(
          [
            { id: "resumo", label: "Resumo", icon: FolderOpen },
            { id: "diagnostico", label: "Diagnóstico", icon: Activity },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition",
                active
                  ? "bg-gradient-brand text-primary-foreground shadow-glow"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "diagnostico" && empresa ? <EmpresaDiagnostico empresaId={empresaId} /> : null}
      {tab === "resumo" && (
        <>
          {isLoading ? (
            <section className="rounded-3xl border border-border/60 bg-card p-8 text-center text-sm text-muted-foreground shadow-elegant">
              Carregando…
            </section>
          ) : !empresa ? (
            <section className="rounded-3xl border border-border/60 bg-card p-8 text-center text-sm text-muted-foreground shadow-elegant">
              Empresa não encontrada.
            </section>
          ) : (
            <>
              <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-elegant">
                  <Building2 className="mb-3 h-5 w-5 text-primary" />
                  <p className="text-xs font-bold uppercase text-muted-foreground">CNPJ</p>
                  <p className="mt-1 text-lg font-extrabold text-foreground">
                    {empresa.cnpj ?? "—"}
                  </p>
                </div>
                <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-elegant">
                  <FileCheck2 className="mb-3 h-5 w-5 text-info" />
                  <p className="text-xs font-bold uppercase text-muted-foreground">Documentos</p>
                  <p className="mt-1 text-lg font-extrabold text-foreground">{documentos.length}</p>
                </div>
                <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-elegant">
                  <ShieldCheck className="mb-3 h-5 w-5 text-success" />
                  <p className="text-xs font-bold uppercase text-muted-foreground">Conformidade</p>
                  <p className="mt-1 text-lg font-extrabold text-foreground">
                    {conformidade.toFixed(0)}%
                  </p>
                </div>
                <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-elegant">
                  <p className="text-xs font-bold uppercase text-muted-foreground">
                    Status documental
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-bold text-success">
                      {emDia} em dia
                    </span>
                    <span className="rounded-full bg-warning/30 px-3 py-1 text-xs font-bold text-warning-foreground">
                      {proximoVenc} próximos
                    </span>
                    <span className="rounded-full bg-destructive/15 px-3 py-1 text-xs font-bold text-destructive">
                      {vencidos} vencidos
                    </span>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-elegant">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-bold text-muted-foreground">Resumo de conformidade</span>
                  <span className="font-extrabold text-primary">{conformidade.toFixed(0)}%</span>
                </div>
                <ProgressBar value={conformidade} />
              </section>

              <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-elegant">
                <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-5 w-5 text-primary" />
                      <h2 className="text-base font-bold text-foreground">Documentos da Empresa</h2>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Arquivos vinculados exclusivamente a esta empresa.
                    </p>
                  </div>
                </header>

                <div className="grid max-h-[58vh] gap-3 overflow-y-auto pr-1 md:hidden">
                  {documentos.map((doc) => (
                    <article
                      key={doc.id}
                      className="rounded-2xl border border-border bg-background p-4 shadow-sm"
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-extrabold text-foreground">
                            {doc.titulo ?? tipoLabel(doc.tipo)}
                          </h3>
                          <p className="text-xs font-bold text-muted-foreground">
                            {tipoLabel(doc.tipo)}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-extrabold ${statusVisual(doc).className}`}
                        >
                          {statusVisual(doc).label}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Data de validade:{" "}
                        {doc.data_vencimento
                          ? format(parseLocalDate(doc.data_vencimento)!, "dd/MM/yyyy")
                          : "Sem prazo"}
                      </p>
                      <p className="text-sm font-bold text-foreground">
                        Dias restantes: {detalhesVencimento(doc.data_vencimento)}
                      </p>
                    </article>
                  ))}
                </div>

                <div className="-mx-5 hidden max-h-[58vh] overflow-auto px-5 md:block">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead>
                      <tr className="sticky top-0 bg-card text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                        <th className="pb-3 pr-3">Documento</th>
                        <th className="pb-3 pr-3">Tipo</th>
                        <th className="pb-3 pr-3">Data de validade</th>
                        <th className="pb-3 pr-3">Dias restantes</th>
                        <th className="pb-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documentos.map((doc) => (
                        <tr key={doc.id} className="border-t border-border/60 hover:bg-muted/30">
                          <td className="py-3 pr-3">
                            <div className="flex items-center gap-2 font-bold text-foreground">
                              <FileCheck2 className="h-4 w-4 text-primary" />
                              {doc.titulo ?? tipoLabel(doc.tipo)}
                            </div>
                          </td>
                          <td className="py-3 pr-3 text-muted-foreground">{tipoLabel(doc.tipo)}</td>
                          <td className="py-3 pr-3 text-muted-foreground">
                            {doc.data_vencimento
                              ? format(parseLocalDate(doc.data_vencimento)!, "dd/MM/yyyy")
                              : "Sem prazo"}
                          </td>
                          <td className="py-3 pr-3 font-bold text-foreground">
                            {detalhesVencimento(doc.data_vencimento)}
                          </td>
                          <td className="py-3">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-extrabold ${statusVisual(doc).className}`}
                            >
                              {statusVisual(doc).label}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {documentos.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-8 text-center text-sm text-muted-foreground">
                    Nenhum documento cadastrado para esta empresa.
                  </div>
                )}
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
