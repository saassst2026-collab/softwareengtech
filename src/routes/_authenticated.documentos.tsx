import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  FileCheck2,
  FileSpreadsheet,
  Pencil,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { differenceInDays, format } from "date-fns";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { PageHero } from "@/components/PageHero";
import { tipoLabel, DOC_TIPOS_ORDENADOS, DOCUMENTO_ORDEM } from "@/lib/documentoLabels";
import { useUserRole } from "@/lib/useUserRole";
import { DocumentFormDialog } from "@/components/DocumentFormDialog";
import {
  getSelectedEmpresaId,
  setSelectedEmpresaId,
  consumeDocumentosSituacaoPreset,
} from "@/lib/companyContext";
import { parseLocalDate, daysFromToday } from "@/lib/dateUtils";
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
import {
  computarStatusRegularizacao,
  conferenciaItemLabel,
  conferenciaLabel,
  tipoExigeConferencia,
  STATUS_REG_LABEL,
  STATUS_REG_CLASS,
} from "@/lib/documentoStatus";
import { ReportButton } from "@/components/ReportButton";
import type { RelatorioOpcao } from "@/components/RelatorioDialog";
import { exportarDocumentosExcel } from "@/lib/excelExport";
import { logAudit } from "@/lib/audit";
import {
  computarChecklistEmpresa,
  CHECKLIST_STATUS_META,
  motivoLabel,
  type EmpresaChecklist,
  type EmpresaChecklistFlags,
  type IsencaoCampo,
} from "@/lib/checklistEmpresa";
import { computarResumoEmpresa, type ResumoEmpresa } from "@/lib/conformidade";

const EXPANDED_DOC_GROUPS_KEY = "engtech:documentosExpandedEmpresas";

type EditableDocumento = {
  id: string;
  empresa_id: string;
  tipo: string;
  data_conclusao: string | null;
  data_vencimento: string | null;
  situacao: "em_dia" | "proximo_vencimento" | "vencido" | "pendente" | "concluido";
  observacoes: string | null;
  conferencia_ok?: boolean | null;
};

export const Route = createFileRoute("/_authenticated/documentos")({
  component: DocumentosPage,
});

function DocumentosPage() {
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState<string>("todos");
  const [situacao, setSituacao] = useState<string>(
    () => consumeDocumentosSituacaoPreset() ?? "todos",
  );
  const [contabilidadeFiltro, setContabilidadeFiltro] = useState<string>("todas");
  const [empresaFiltro, setEmpresaFiltro] = useState<string>(
    () => getSelectedEmpresaId() ?? "todas",
  );
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");
  const [periodoRapido, setPeriodoRapido] = useState<string>("todos");
  const [novoDocumentoOpen, setNovoDocumentoOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<EditableDocumento | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [conferenciaFiltro, setConferenciaFiltro] = useState<string>("todos");
  const [expandedEmpresas, setExpandedEmpresas] = useState<Set<string>>(() =>
    readExpandedEmpresas(),
  );
  const { isAdmin } = useUserRole();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["documentos-page"],
    queryFn: async () => {
      const [docsRes, empRes, contabRes] = await Promise.all([
        supabase
          .from("documentos_sst")
          .select("*")
          .order("data_vencimento", { ascending: true, nullsFirst: false }),
        supabase
          .from("empresas")
          .select(
            "id,nome,contabilidade_id,isencao_simplificada,isencao_pgr,isencao_pcmso,isencao_ficha_epi",
          )
          .order("nome"),
        supabase.from("contabilidades").select("id,nome").order("nome"),
      ]);
      if (docsRes.error) throw docsRes.error;
      if (empRes.error) throw empRes.error;
      if (contabRes.error) throw contabRes.error;
      return {
        documentos: docsRes.data ?? [],
        empresas: empRes.data ?? [],
        contabilidades: contabRes.data ?? [],
      };
    },
  });

  const empresaMap = new Map((data?.empresas ?? []).map((e) => [e.id, e.nome]));
  const empresaFullMap = new Map((data?.empresas ?? []).map((e) => [e.id, e]));
  const docs = data?.documentos ?? [];
  const empresas = data?.empresas ?? [];
  const contabilidades = data?.contabilidades ?? [];
  const empresasFiltradas = empresas.filter(
    (empresa) =>
      contabilidadeFiltro === "todas" || empresa.contabilidade_id === contabilidadeFiltro,
  );

  const periodoLimites = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const fimDoDia = new Date(hoje);
    fimDoDia.setHours(23, 59, 59, 999);
    switch (periodoRapido) {
      case "hoje": {
        return { inicio: hoje.toISOString(), fim: fimDoDia.toISOString() };
      }
      case "7dias": {
        const inicio = new Date(hoje);
        inicio.setDate(hoje.getDate() - 7);
        return { inicio: inicio.toISOString(), fim: fimDoDia.toISOString() };
      }
      case "30dias": {
        const inicio = new Date(hoje);
        inicio.setDate(hoje.getDate() - 30);
        return { inicio: inicio.toISOString(), fim: fimDoDia.toISOString() };
      }
      case "mes_atual": {
        const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59, 999);
        return { inicio: inicio.toISOString(), fim: fim.toISOString() };
      }
      case "mes_passado": {
        const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
        const fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0, 23, 59, 59, 999);
        return { inicio: inicio.toISOString(), fim: fim.toISOString() };
      }
      case "ano_atual": {
        const inicio = new Date(hoje.getFullYear(), 0, 1);
        return { inicio: inicio.toISOString(), fim: fimDoDia.toISOString() };
      }
      default:
        return null;
    }
  }, [periodoRapido]);

  function dataDentroDoPeriodo(dataIso: string | null | undefined): boolean {
    if (!dataIso) return false;
    const data = new Date(dataIso);
    if (Number.isNaN(data.getTime())) return false;
    if (dataInicio) {
      const inicio = new Date(dataInicio);
      inicio.setHours(0, 0, 0, 0);
      if (data < inicio) return false;
    }
    if (dataFim) {
      const fim = new Date(dataFim);
      fim.setHours(23, 59, 59, 999);
      if (data > fim) return false;
    }
    if (periodoLimites) {
      const inicio = new Date(periodoLimites.inicio);
      const fim = new Date(periodoLimites.fim);
      if (data < inicio || data > fim) return false;
    }
    return true;
  }

  const filtered = docs.filter((d) => {
    const empresaNome = empresaMap.get(d.empresa_id) ?? "";
    const okQ =
      q === "" ||
      empresaNome.toLowerCase().includes(q.toLowerCase()) ||
      (d.titulo ?? "").toLowerCase().includes(q.toLowerCase());
    const okT = tipo === "todos" || d.tipo === tipo;
    const okS = situacao === "todos" || d.situacao === situacao;
    const empresa = empresas.find((item) => item.id === d.empresa_id);
    const okC =
      contabilidadeFiltro === "todas" || empresa?.contabilidade_id === contabilidadeFiltro;
    const okE = empresaFiltro === "todas" || d.empresa_id === empresaFiltro;
    const okD = dataDentroDoPeriodo(d.created_at);
    let okConferencia = true;
    if (conferenciaFiltro !== "todos") {
      const exige = tipoExigeConferencia(d.tipo);
      if (conferenciaFiltro === "conferidos") okConferencia = exige && Boolean(d.conferencia_ok);
      else if (conferenciaFiltro === "pendentes") okConferencia = exige && !d.conferencia_ok;
    }
    return okQ && okT && okS && okC && okE && okD && okConferencia;
  });

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    filtered.forEach((doc) => {
      const list = map.get(doc.empresa_id) ?? [];
      list.push(doc);
      map.set(doc.empresa_id, list);
    });

    return Array.from(map.entries())
      .map(([empresaId, documentos]) => {
        const empresa = empresaFullMap.get(empresaId);
        // O checklist sempre considera TODOS os documentos da empresa,
        // independentemente dos filtros aplicados na tela.
        const docsEmpresa = docs.filter((d) => d.empresa_id === empresaId);
        return {
          empresaId,
          empresaNome: empresaMap.get(empresaId) ?? "—",
          empresa: empresa ?? null,
          documentos: [...documentos].sort(
            (a, b) =>
              documentPriority(a) - documentPriority(b) ||
              (DOCUMENTO_ORDEM[a.tipo] ?? 999) - (DOCUMENTO_ORDEM[b.tipo] ?? 999),
          ),
          summary: getEmpresaSummary(documentos),
          conferenciaResumo: getConferenciaResumo(documentos),
          resumo: computarResumoEmpresa(documentos as any),
          checklist: computarChecklistEmpresa(
            (empresa ?? {}) as EmpresaChecklistFlags,
            docsEmpresa,
          ),
        };
      })
      .sort((a, b) => a.empresaNome.localeCompare(b.empresaNome, "pt-BR", { sensitivity: "base" }));
  }, [filtered, empresaMap]);

  const toggleEmpresa = (empresaId: string) => {
    setExpandedEmpresas((current) => {
      const next = new Set(current);
      if (next.has(empresaId)) next.delete(empresaId);
      else next.add(empresaId);
      saveExpandedEmpresas(next);
      return next;
    });
  };

  const openEmpresaFilter = (empresaId: string) => {
    setSelectedEmpresaId(empresaId);
    setEmpresaFiltro(empresaId);
  };

  const deleteDocumento = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("documentos_sst").delete().eq("id", deleteId);
    if (error) toast.error(error.message);
    else {
      toast.success("Documento excluído.");
      setDeleteId(null);
      await queryClient.invalidateQueries();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title="Documentos SST"
        subtitle="Controle de PGR, PCMSO, LTCAT, LTI, LTP, AET, AEP, PPP, treinamentos, ASOs e demais obrigações documentais."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ReportButton
              modulo="documentos"
              getOpcoes={() => buildDocumentosOpcoes({ docs, filtered, empresaMap, empresas })}
            />
            <button
              type="button"
              onClick={async () => {
                try {
                  exportarDocumentosExcel({ documentos: docs as any, empresas, contabilidades });
                  await logAudit({
                    acao: "exportar_excel",
                    modulo: "documentos",
                    descricao: "Exportou documentos para Excel",
                  });
                  toast.success("Planilha exportada.");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Falha ao exportar");
                }
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-card px-4 py-2.5 text-sm font-bold text-primary shadow-sm transition hover:bg-primary/10"
            >
              <FileSpreadsheet className="h-4 w-4" /> Exportar Excel
            </button>
            {isAdmin && (
              <button
                onClick={() => setNovoDocumentoOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-glow"
              >
                <Plus className="h-4 w-4" /> Novo documento
              </button>
            )}
          </div>
        }
      />

      <DocumentFormDialog
        open={novoDocumentoOpen}
        onOpenChange={setNovoDocumentoOpen}
        empresas={empresas}
        contabilidades={contabilidades}
      />
      <DocumentFormDialog
        open={Boolean(editingDocument)}
        onOpenChange={(open) => !open && setEditingDocument(null)}
        empresas={empresas}
        contabilidades={contabilidades}
        editingDocument={editingDocument}
      />

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir documento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este item? Essa ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteDocumento}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <section className="rounded-3xl border border-border/60 bg-card p-4 shadow-elegant sm:p-5">
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="relative sm:col-span-2 xl:col-span-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por empresa ou título"
              className="w-full rounded-xl border border-input bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
          >
            <option value="todos">Todos os tipos</option>
            {DOC_TIPOS_ORDENADOS.map((t) => (
              <option key={t} value={t}>
                {tipoLabel(t)}
              </option>
            ))}
          </select>
          <select
            value={contabilidadeFiltro}
            onChange={(e) => {
              setContabilidadeFiltro(e.target.value);
              setEmpresaFiltro("todas");
            }}
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
          >
            <option value="todas">Todas contabilidades</option>
            {contabilidades.map((contabilidade) => (
              <option key={contabilidade.id} value={contabilidade.id}>
                {contabilidade.nome}
              </option>
            ))}
          </select>
          <select
            value={empresaFiltro}
            onChange={(e) => {
              setEmpresaFiltro(e.target.value);
              setSelectedEmpresaId(e.target.value === "todas" ? null : e.target.value);
            }}
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
          >
            <option value="todas">Todas empresas</option>
            {empresasFiltradas.map((empresa) => (
              <option key={empresa.id} value={empresa.id}>
                {empresa.nome}
              </option>
            ))}
          </select>
          <select
            value={situacao}
            onChange={(e) => setSituacao(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
          >
            <option value="todos">Todas situações</option>
            <option value="em_dia">Em dia</option>
            <option value="proximo_vencimento">Próx. vencimento</option>
            <option value="vencido">Vencido</option>
            <option value="pendente">Indeterminado</option>
            <option value="concluido">Concluído</option>
          </select>
          <select
            value={conferenciaFiltro}
            onChange={(e) => setConferenciaFiltro(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
          >
            <option value="todos">Todos</option>
            <option value="conferidos">Conferidos</option>
            <option value="pendentes">Pendentes</option>
          </select>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <select
            value={periodoRapido}
            onChange={(e) => {
              setPeriodoRapido(e.target.value);
              if (e.target.value !== "personalizado") {
                setDataInicio("");
                setDataFim("");
              }
            }}
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
          >
            <option value="todos">Período de cadastro: todos</option>
            <option value="hoje">Hoje</option>
            <option value="7dias">Últimos 7 dias</option>
            <option value="30dias">Últimos 30 dias</option>
            <option value="mes_atual">Este mês</option>
            <option value="mes_passado">Mês passado</option>
            <option value="ano_atual">Este ano</option>
            <option value="personalizado">Personalizado</option>
          </select>
          {periodoRapido === "personalizado" && (
            <>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                placeholder="Data inicial"
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
              />
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                placeholder="Data final"
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
              />
            </>
          )}
          <button
            type="button"
            onClick={() => {
              setPeriodoRapido("todos");
              setDataInicio("");
              setDataFim("");
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-input bg-background px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" /> Limpar datas
          </button>
        </div>

        {/* Desktop table */}
        <div className="-mx-4 hidden overflow-x-auto px-4 sm:-mx-5 sm:px-5 lg:block">
          <table className="w-full min-w-[780px] text-sm">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="pb-3 pr-3">Documento SST</th>
                <th className="pb-3 pr-3">Cadastro</th>
                <th className="pb-3 pr-3">Conclusão</th>
                <th className="pb-3 pr-3">Vencimento</th>
                <th className="pb-3 pr-3">Situação</th>
                <th className="pb-3 pr-3">Conferência de Anexos</th>
                <th className="pb-3 pr-3">Pendências</th>
                <th className="pb-3 pr-3">Prazo</th>
                {isAdmin && <th className="pb-3 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="py-8 text-center text-muted-foreground">
                    Carregando…
                  </td>
                </tr>
              ) : grouped.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="py-8 text-center text-muted-foreground">
                    Nenhum documento encontrado.
                  </td>
                </tr>
              ) : (
                grouped.map((group) => {
                  const expanded = expandedEmpresas.has(group.empresaId);
                  return (
                    <Fragment key={group.empresaId}>
                      <tr
                        key={group.empresaId}
                        className="border-t border-border/70 bg-muted/35 hover:bg-muted/55"
                      >
                        <td className="py-3 pr-3" colSpan={isAdmin ? 9 : 8}>
                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              onClick={() => toggleEmpresa(group.empresaId)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground"
                              aria-label={expanded ? "Recolher empresa" : "Expandir empresa"}
                            >
                              {expanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              onClick={() => openEmpresaFilter(group.empresaId)}
                              className="font-extrabold text-foreground underline-offset-4 hover:text-primary hover:underline"
                            >
                              {group.empresaNome}
                            </button>
                            <PendenciasEmpresaBadge
                              checklist={group.checklist}
                              resumo={group.resumo}
                            />
                            <EmpresaSummaryBadge
                              summary={group.summary}
                              temPendencias={!group.checklist.pronta}
                            />
                            <span className="text-xs font-semibold text-muted-foreground">
                              {group.documentos.length} documento
                              {group.documentos.length === 1 ? "" : "s"}
                            </span>
                          </div>
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="border-t border-border/50 bg-background/60">
                          <td colSpan={isAdmin ? 9 : 8} className="py-3 pl-4 pr-3 sm:pl-14">
                            <ChecklistEmpresaPanel
                              checklist={group.checklist}
                              empresa={group.empresa}
                              empresaId={group.empresaId}
                              isAdmin={isAdmin}
                            />
                          </td>
                        </tr>
                      )}
                      {expanded &&
                        group.documentos.map((d) => {
                          const reg = computarStatusRegularizacao(d);
                          return (
                            <tr key={d.id} className="border-t border-border/50 hover:bg-muted/25">
                              <td className="py-3 pr-3 pl-14">
                                <div className="flex flex-wrap items-center gap-2">
                                  <FileCheck2 className="h-4 w-4 text-primary" />
                                  <span className="font-bold text-foreground">
                                    {tipoLabel(d.tipo)}
                                  </span>
                                  <DocIndicadores doc={d} />
                                </div>
                              </td>
                              <td className="py-3 pr-3 text-muted-foreground">
                                {d.created_at
                                  ? format(
                                      parseLocalDate(d.created_at.split("T")[0])!,
                                      "dd/MM/yyyy",
                                    )
                                  : "—"}
                              </td>
                              <td className="py-3 pr-3 text-muted-foreground">
                                {d.data_conclusao
                                  ? format(parseLocalDate(d.data_conclusao)!, "dd/MM/yyyy")
                                  : "—"}
                              </td>
                              <td className="py-3 pr-3 text-muted-foreground">
                                {d.data_vencimento
                                  ? format(parseLocalDate(d.data_vencimento)!, "dd/MM/yyyy")
                                  : "—"}
                              </td>
                              <td className="py-3 pr-3">
                                <span
                                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${STATUS_REG_CLASS[reg]}`}
                                >
                                  {STATUS_REG_LABEL[reg]}
                                </span>
                              </td>
                              <td className="py-3 pr-3">
                                <ConferenciaChecklist
                                  documentoId={d.id}
                                  tipo={d.tipo}
                                  value={Boolean(d.conferencia_ok)}
                                  disabled={!isAdmin}
                                />
                              </td>
                              <td className="py-3 pr-3">
                                <PendenciaBadge doc={d} />
                              </td>
                              <td className="py-3 pr-3">
                                <PrazoBadge vencimento={d.data_vencimento} />
                              </td>
                              {isAdmin && (
                                <td className="py-3 text-right">
                                  <button
                                    onClick={() => setEditingDocument(d)}
                                    className="mr-2 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-primary/10 hover:text-primary"
                                    aria-label="Editar documento"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteId(d.id)}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                    aria-label="Excluir documento"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                    </Fragment>
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
          ) : grouped.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum documento encontrado.
            </p>
          ) : (
            grouped.map((group) => {
              const expanded = expandedEmpresas.has(group.empresaId);
              return (
                <div
                  key={group.empresaId}
                  className="rounded-2xl border border-border/70 bg-muted/25"
                >
                  <button
                    onClick={() => toggleEmpresa(group.empresaId)}
                    className="flex w-full items-center gap-2 rounded-2xl px-3 py-3 text-left"
                    aria-label={expanded ? "Recolher empresa" : "Expandir empresa"}
                  >
                    {expanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    )}
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-extrabold text-foreground">
                        {group.empresaNome}
                      </span>
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        {group.documentos.length} documento
                        {group.documentos.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <PendenciasEmpresaBadge checklist={group.checklist} resumo={group.resumo} />
                    <EmpresaSummaryBadge
                      summary={group.summary}
                      temPendencias={!group.checklist.pronta}
                    />
                  </button>
                  {expanded && (
                    <div className="flex flex-col gap-2 border-t border-border/60 p-3">
                      <ChecklistEmpresaPanel
                        checklist={group.checklist}
                        empresa={group.empresa}
                        empresaId={group.empresaId}
                        isAdmin={isAdmin}
                      />
                      {group.documentos.map((d) => (
                        <div key={d.id} className="rounded-xl border border-border/60 bg-card p-3">
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <FileCheck2 className="h-4 w-4 shrink-0 text-primary" />
                              <span className="truncate font-bold text-foreground">
                                {tipoLabel(d.tipo)}
                              </span>
                              <DocIndicadores doc={d} />
                            </div>
                            {(() => {
                              const reg = computarStatusRegularizacao(d);
                              return (
                                <span
                                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${STATUS_REG_CLASS[reg]}`}
                                >
                                  {STATUS_REG_LABEL[reg]}
                                </span>
                              );
                            })()}
                          </div>
                          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                            <div>
                              <dt className="font-bold uppercase text-muted-foreground">
                                Cadastro
                              </dt>
                              <dd className="text-foreground">
                                {d.created_at
                                  ? format(
                                      parseLocalDate(d.created_at.split("T")[0])!,
                                      "dd/MM/yyyy",
                                    )
                                  : "—"}
                              </dd>
                            </div>
                            <div>
                              <dt className="font-bold uppercase text-muted-foreground">
                                Conclusão
                              </dt>
                              <dd className="text-foreground">
                                {d.data_conclusao
                                  ? format(parseLocalDate(d.data_conclusao)!, "dd/MM/yyyy")
                                  : "—"}
                              </dd>
                            </div>
                            <div className="col-span-2">
                              <dt className="font-bold uppercase text-muted-foreground">
                                Vencimento
                              </dt>
                              <dd className="text-foreground">
                                {d.data_vencimento
                                  ? format(parseLocalDate(d.data_vencimento)!, "dd/MM/yyyy")
                                  : "—"}
                              </dd>
                            </div>
                          </dl>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <PrazoBadge vencimento={d.data_vencimento} />
                              <ConferenciaChecklist
                                documentoId={d.id}
                                tipo={d.tipo}
                                value={Boolean(d.conferencia_ok)}
                                disabled={!isAdmin}
                              />
                              <PendenciaBadge doc={d} />
                            </div>
                            {isAdmin && (
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => setEditingDocument(d)}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-primary/10 hover:text-primary"
                                  aria-label="Editar documento"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => setDeleteId(d.id)}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                  aria-label="Excluir documento"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
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

function DocIndicadores({
  doc,
}: {
  doc: { tipo: string; data_vencimento: string | null; conferencia_ok?: boolean | null };
}) {
  const dias = daysFromToday(doc.data_vencimento);
  const indicadores: { icon: string; title: string; cls: string }[] = [];
  if (tipoExigeConferencia(doc.tipo)) {
    indicadores.push(
      doc.conferencia_ok
        ? {
            icon: "✅",
            title: `${conferenciaItemLabel(doc.tipo)} conferido`,
            cls: "bg-success/15 text-success",
          }
        : {
            icon: "❌",
            title: `${conferenciaItemLabel(doc.tipo)} não conferido`,
            cls: "bg-destructive/15 text-destructive",
          },
    );
  }
  if (dias != null) {
    if (dias < 0)
      indicadores.push({
        icon: "🔴",
        title: `Vencido há ${Math.abs(dias)}d`,
        cls: "bg-destructive/15 text-destructive",
      });
    else if (dias <= 30)
      indicadores.push({
        icon: "🟡",
        title: `Vence em ${dias}d`,
        cls: "bg-warning/30 text-warning-foreground",
      });
    else indicadores.push({ icon: "🟢", title: "Em dia", cls: "bg-success/15 text-success" });
  }
  if (indicadores.length === 0) return null;
  return (
    <span className="flex flex-wrap items-center gap-1">
      {indicadores.map((i, idx) => (
        <span
          key={idx}
          title={i.title}
          className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${i.cls}`}
          aria-label={i.title}
        >
          {i.icon}
        </span>
      ))}
    </span>
  );
}

function PrazoBadge({ vencimento }: { vencimento: string | null }) {
  if (!vencimento) return <span className="text-muted-foreground">—</span>;

  const dias = daysFromToday(vencimento) ?? 0;
  if (dias < 0) {
    return (
      <span className="rounded-full bg-destructive/15 px-3 py-1 text-xs font-extrabold text-destructive">
        Vencido há {Math.abs(dias)} dias
      </span>
    );
  }

  return (
    <span className="rounded-full bg-info/12 px-3 py-1 text-xs font-extrabold text-info">
      Faltam {dias} dias
    </span>
  );
}

function PendenciaBadge({ doc }: { doc: { tipo: string; conferencia_ok?: boolean | null } }) {
  if (!tipoExigeConferencia(doc.tipo)) {
    return <span className="text-muted-foreground">—</span>;
  }

  if (doc.conferencia_ok) {
    return (
      <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-extrabold text-success">
        🟢 Completo
      </span>
    );
  }

  return (
    <span className="rounded-full bg-destructive/15 px-3 py-1 text-xs font-extrabold text-destructive">
      🔴 Anexo obrigatório não conferido
    </span>
  );
}

function PendenciasEmpresaBadge({
  checklist,
  resumo,
}: {
  checklist: EmpresaChecklist;
  resumo: ResumoEmpresa;
}) {
  const n = checklist.faltando.length;
  if (n > 0) {
    const nomes = checklist.faltando.map(
      (f) => `• ${f.label} — ${f.detalhe ?? motivoLabel(f.motivo)}`,
    );
    const tooltip = `Documentos pendentes:\n${nomes.join("\n")}`;
    return (
      <span
        title={tooltip}
        aria-label={tooltip}
        className="inline-flex items-center gap-1.5 rounded-full bg-destructive/15 px-3 py-1 text-xs font-extrabold text-destructive ring-1 ring-destructive/30"
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        {n} documento{n === 1 ? "" : "s"} pendente{n === 1 ? "" : "s"}
      </span>
    );
  }
  // Sem pendências obrigatórias: manter apenas avisos de validade (vencidos/próximos).
  if (resumo.vencidos > 0 || resumo.proximos > 0) {
    const partes: string[] = [];
    if (resumo.vencidos > 0)
      partes.push(`${resumo.vencidos} vencido${resumo.vencidos === 1 ? "" : "s"}`);
    if (resumo.proximos > 0)
      partes.push(`${resumo.proximos} próximo${resumo.proximos === 1 ? "" : "s"} do vencimento`);
    const tooltip = `⚠ Alertas de validade: ${partes.join(" · ")}`;
    return (
      <span
        title={tooltip}
        aria-label={tooltip}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-warning/25 text-warning-foreground ring-1 ring-warning/40"
      >
        <AlertTriangle className="h-3.5 w-3.5" />
      </span>
    );
  }
  return null;
}

function ChecklistEmpresaPanel({
  checklist,
  empresa,
  empresaId,
  isAdmin,
}: {
  checklist: EmpresaChecklist;
  empresa: EmpresaChecklistFlags | null;
  empresaId: string;
  isAdmin: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-3 shadow-elegant sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
          Situação documental da empresa
        </p>
        {checklist.pronta ? (
          <span className="rounded-full bg-success/15 px-3 py-1 text-[11px] font-extrabold text-success">
            ✓ Documentação completa
          </span>
        ) : (
          <span className="rounded-full bg-destructive/15 px-3 py-1 text-[11px] font-extrabold text-destructive">
            {checklist.faltando.length} documento{checklist.faltando.length === 1 ? "" : "s"}{" "}
            pendente{checklist.faltando.length === 1 ? "" : "s"}
          </span>
        )}
      </div>
      <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {checklist.requisitos.map((r) => {
          const meta = CHECKLIST_STATUS_META[r.status];
          const isencaoIndividual = r.isencaoCampo ? Boolean(empresa?.[r.isencaoCampo]) : false;
          return (
            <li
              key={r.id}
              className="flex flex-col gap-1.5 rounded-xl border border-border/60 bg-background px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-foreground">{r.label}</span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${meta.cls}`}
                >
                  {meta.label}
                </span>
              </div>
              {r.detalhe && r.status !== "cadastrado" && (
                <p className="text-[10px] font-semibold text-muted-foreground">{r.detalhe}</p>
              )}
              {r.conferenciaDocId && r.conferenciaItem && (
                <ConferenciaMini
                  documentoId={r.conferenciaDocId}
                  item={r.conferenciaItem}
                  value={Boolean(r.conferenciaOk)}
                  disabled={!isAdmin}
                />
              )}
              {isAdmin &&
                r.isencaoCampo &&
                (checklist.simplificada && !isencaoIndividual ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold italic text-muted-foreground">
                    <ShieldCheck className="h-3 w-3" /> Isento via empresa simplificada
                  </span>
                ) : (
                  <IsencaoDocToggle
                    empresaId={empresaId}
                    campo={r.isencaoCampo}
                    ativa={isencaoIndividual}
                    label={r.label}
                  />
                ))}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ConferenciaMini({
  documentoId,
  item,
  value,
  disabled,
}: {
  documentoId: string;
  item: string;
  value: boolean;
  disabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (next: boolean) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("documentos_sst")
        .update({
          conferencia_ok: next,
          conferencia_ok_at: next ? new Date().toISOString() : null,
          conferencia_ok_by: next ? (u.user?.id ?? null) : null,
        })
        .eq("id", documentoId);
      if (error) throw error;
    },
    onSuccess: (_d, next) => {
      toast.success(next ? `${item} conferido.` : `${item} desmarcado.`);
      queryClient.invalidateQueries({ queryKey: ["documentos-page"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-sst"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Falha ao atualizar."),
  });

  const base =
    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold transition";
  return (
    <div className="flex flex-wrap items-center gap-1.5" title={`${item} conferido?`}>
      <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        {item}
      </span>
      <button
        type="button"
        onClick={() => !disabled && !mutation.isPending && !value && mutation.mutate(true)}
        disabled={disabled || mutation.isPending}
        className={`${base} ${value ? "bg-success/15 text-success ring-1 ring-success/25" : "bg-muted text-muted-foreground hover:bg-success/10 hover:text-success"}`}
      >
        <Check className="h-3 w-3" /> Sim
      </button>
      <button
        type="button"
        onClick={() => !disabled && !mutation.isPending && value && mutation.mutate(false)}
        disabled={disabled || mutation.isPending}
        className={`${base} ${!value ? "bg-destructive/15 text-destructive ring-1 ring-destructive/25" : "bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive"}`}
      >
        <X className="h-3 w-3" /> Não
      </button>
    </div>
  );
}

function IsencaoDocToggle({
  empresaId,
  campo,
  ativa,
  label,
}: {
  empresaId: string;
  campo: IsencaoCampo;
  ativa: boolean;
  label: string;
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (nova: boolean) => {
      const { error } = await supabase
        .from("empresas")
        .update({ [campo]: nova } as never)
        .eq("id", empresaId);
      if (error) throw error;
      await logAudit({
        acao: nova ? "marcar_isencao_documento" : "remover_isencao_documento",
        modulo: "documentos",
        entidade_tipo: "empresa",
        entidade_id: empresaId,
        empresa_id: empresaId,
        descricao: `${nova ? "Marcou" : "Removeu"} a isenção de ${label}`,
      });
    },
    onSuccess: () => {
      toast.success("Isenção atualizada.");
      queryClient.invalidateQueries();
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Falha ao atualizar isenção"),
  });
  const Icon = ativa ? ShieldCheck : Shield;
  return (
    <button
      type="button"
      onClick={() => !mutation.isPending && mutation.mutate(!ativa)}
      disabled={mutation.isPending}
      title={
        ativa ? `Remover a isenção de ${label}` : `Marcar ${label} como isento para esta empresa`
      }
      className={`inline-flex w-fit items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide transition disabled:opacity-60 ${
        ativa
          ? "border-info/40 bg-info/10 text-info hover:bg-info/20"
          : "border-border bg-background text-muted-foreground hover:bg-muted/60"
      }`}
    >
      <Icon className="h-3 w-3" />
      {ativa ? "Remover isenção" : "Marcar isenção"}
    </button>
  );
}

function ConferenciaChecklist({
  documentoId,
  tipo,
  value,
  disabled,
}: {
  documentoId: string;
  tipo: string;
  value: boolean;
  disabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const exige = tipoExigeConferencia(tipo);
  const tooltip = exige ? conferenciaLabel(tipo) : "Não aplicável a este tipo de documento";

  const mutation = useMutation({
    mutationFn: async (next: boolean) => {
      const { data: u } = await supabase.auth.getUser();
      const payload = {
        conferencia_ok: next,
        conferencia_ok_at: next ? new Date().toISOString() : null,
        conferencia_ok_by: next ? (u.user?.id ?? null) : null,
      };
      const { error } = await supabase.from("documentos_sst").update(payload).eq("id", documentoId);
      if (error) throw error;
    },
    onSuccess: (_d, next) => {
      toast.success(next ? "Marcado como conferido." : "Conferência desmarcada.");
      queryClient.invalidateQueries({ queryKey: ["documentos-page"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-sst"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Falha ao atualizar."),
  });

  if (!exige) {
    return (
      <span className="text-xs font-semibold text-muted-foreground" title={tooltip}>
        —
      </span>
    );
  }

  const base =
    "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-extrabold transition";
  const onCls = "bg-success/15 text-success ring-1 ring-success/20";
  const offCls = "bg-destructive/15 text-destructive ring-1 ring-destructive/20";
  return (
    <div className="flex flex-wrap items-center gap-2" title={tooltip}>
      <span className="rounded-full bg-muted px-3 py-1 text-xs font-extrabold text-foreground">
        {conferenciaItemLabel(tipo)}
      </span>
      <button
        type="button"
        onClick={() => !disabled && !mutation.isPending && !value && mutation.mutate(true)}
        disabled={disabled || mutation.isPending}
        className={`${base} ${value ? onCls : "bg-muted text-muted-foreground hover:bg-success/10 hover:text-success"} ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
      >
        <Check className="h-3 w-3" /> Sim
      </button>
      <button
        type="button"
        onClick={() => !disabled && !mutation.isPending && value && mutation.mutate(false)}
        disabled={disabled || mutation.isPending}
        className={`${base} ${!value ? offCls : "bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive"} ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
      >
        <X className="h-3 w-3" /> Não
      </button>
    </div>
  );
}

type DocumentoItem = {
  data_vencimento: string | null;
  situacao: string;
  tipo: string;
  conferencia_ok?: boolean | null;
};

function getConferenciaResumo(documentos: DocumentoItem[]) {
  const obrigatorios = documentos.filter((doc) => tipoExigeConferencia(doc.tipo));
  const conferidos = obrigatorios.filter((doc) => doc.conferencia_ok).length;
  const pendentes = obrigatorios.length - conferidos;
  const detalhe = obrigatorios
    .filter((doc) => !doc.conferencia_ok)
    .map((doc) => `${tipoLabel(doc.tipo)}: ${conferenciaItemLabel(doc.tipo)}`)
    .join("\n");

  return { total: obrigatorios.length, conferidos, pendentes, detalhe };
}

type EmpresaSummary = {
  tone: "danger" | "warning" | "success" | "muted";
  label: string;
  detail: string;
};

function documentPriority(doc: Pick<DocumentoItem, "situacao" | "data_vencimento">) {
  if (doc.situacao === "vencido") return 0;
  const dias = daysFromToday(doc.data_vencimento);
  if (dias !== null && dias >= 0 && dias <= 30) return 1;
  if (doc.situacao === "em_dia" || doc.situacao === "concluido") return 2;
  return 3;
}

function getEmpresaSummary(documentos: DocumentoItem[]): EmpresaSummary {
  const vencidos = documentos.filter((doc) => {
    if (doc.situacao === "vencido") return true;
    const dias = daysFromToday(doc.data_vencimento);
    return dias !== null && dias < 0;
  });
  const proximos = documentos.filter((doc) => {
    const dias = daysFromToday(doc.data_vencimento);
    return dias !== null && dias >= 0 && dias <= 30;
  });
  const comValidade = documentos.filter((doc) => Boolean(doc.data_vencimento));

  if (vencidos.length > 0)
    return {
      tone: "danger",
      label: `🔴 ${vencidos.length} vencido${vencidos.length === 1 ? "" : "s"}`,
      detail: tooltipDetail(vencidos),
    };
  if (proximos.length > 0)
    return {
      tone: "warning",
      label: `🟡 ${proximos.length} próximo${proximos.length === 1 ? "" : "s"}`,
      detail: tooltipDetail(proximos),
    };
  if (comValidade.length === 0)
    return {
      tone: "muted",
      label: "⚪ Indeterminado",
      detail: "Apenas documentos sem vencimento.",
    };
  return {
    tone: "success",
    label: "🟢 100% em dia",
    detail: "Todos os documentos com validade estão em dia.",
  };
}

function tooltipDetail(documentos: DocumentoItem[]) {
  return documentos
    .map((doc) => `${tipoLabel(doc.tipo)}: ${prazoText(doc.data_vencimento)}`)
    .join("\n");
}

function prazoText(vencimento: string | null) {
  if (!vencimento) return "indeterminado";
  const dias = daysFromToday(vencimento) ?? 0;
  if (dias < 0) return `vencido há ${Math.abs(dias)} dias`;
  return `vence em ${dias} dias`;
}

function EmpresaSummaryBadge({
  summary,
  temPendencias,
}: {
  summary: EmpresaSummary;
  temPendencias?: boolean;
}) {
  // Empresa com documentos obrigatórios pendentes nunca aparece como "100% em dia".
  const eff: EmpresaSummary =
    temPendencias && summary.tone === "success"
      ? {
          tone: "warning",
          label: "🟡 Com pendências",
          detail: "Há documentos obrigatórios pendentes.",
        }
      : summary;
  const cls = {
    danger: "bg-destructive/15 text-destructive",
    warning: "bg-warning/30 text-warning-foreground",
    success: "bg-success/15 text-success",
    muted: "bg-muted text-muted-foreground",
  }[eff.tone];

  return (
    <span
      title={eff.detail}
      className={`whitespace-pre-line rounded-full px-3 py-1 text-xs font-extrabold ${cls}`}
    >
      {eff.label}
    </span>
  );
}

type DocRow = {
  id: string;
  empresa_id: string;
  tipo: string;
  data_conclusao: string | null;
  data_vencimento: string | null;
  situacao: string;
  conferencia_ok?: boolean | null;
};

function buildDocumentosOpcoes(args: {
  docs: DocRow[];
  filtered: DocRow[];
  empresaMap: Map<string, string>;
  empresas: Array<{ id: string; nome: string } & EmpresaChecklistFlags>;
}): RelatorioOpcao[] {
  const { docs, filtered, empresaMap, empresas } = args;
  const colunas = [
    { header: "Empresa" },
    { header: "Tipo" },
    { header: "Conclusão" },
    { header: "Vencimento" },
    { header: "Situação" },
    { header: "Conferência de Anexos" },
    { header: "Pendências" },
    { header: "Prazo (dias)", align: "right" as const },
  ];
  const toLinha = (d: DocRow): Array<string | number> => {
    const dias = daysFromToday(d.data_vencimento);
    return [
      empresaMap.get(d.empresa_id) ?? "—",
      tipoLabel(d.tipo),
      d.data_conclusao ? format(parseLocalDate(d.data_conclusao)!, "dd/MM/yyyy") : "—",
      d.data_vencimento ? format(parseLocalDate(d.data_vencimento)!, "dd/MM/yyyy") : "—",
      d.situacao,
      tipoExigeConferencia(d.tipo)
        ? `${conferenciaItemLabel(d.tipo)}: ${d.conferencia_ok ? "Sim" : "Não"}`
        : "Não aplicável",
      tipoExigeConferencia(d.tipo)
        ? d.conferencia_ok
          ? "Completo"
          : "Anexo obrigatório não conferido"
        : "—",
      dias == null ? "—" : dias,
    ];
  };
  const make = (id: string, label: string, list: DocRow[], descricao?: string): RelatorioOpcao => ({
    id,
    label,
    descricao,
    build: () => ({
      titulo: label,
      colunas,
      linhas: list.map(toLinha),
      totalizadores: [{ label: "Total de documentos", value: String(list.length) }],
    }),
  });
  const hojeMs = Date.now();
  const venciveis = docs.filter((d) => d.data_vencimento);

  // Relatório: documentos sem anexo obrigatório (ART/Declaração/Registro Profissional)
  const semAnexoLinhas: Array<Array<string | number>> = docs
    .filter((d) => tipoExigeConferencia(d.tipo) && !d.conferencia_ok)
    .sort((a, b) => {
      const ea = empresaMap.get(a.empresa_id) ?? "";
      const eb = empresaMap.get(b.empresa_id) ?? "";
      return ea.localeCompare(eb, "pt-BR", { sensitivity: "base" });
    })
    .map((d) => [
      empresaMap.get(d.empresa_id) ?? "—",
      tipoLabel(d.tipo),
      conferenciaItemLabel(d.tipo),
      d.data_conclusao ? format(parseLocalDate(d.data_conclusao)!, "dd/MM/yyyy") : "—",
      d.data_vencimento ? format(parseLocalDate(d.data_vencimento)!, "dd/MM/yyyy") : "—",
    ]);
  const semAnexoEmpresasUnicas = new Set(
    docs.filter((d) => tipoExigeConferencia(d.tipo) && !d.conferencia_ok).map((d) => d.empresa_id),
  ).size;

  // Relatório: empresas 100% prontas
  const prontasLinhas: Array<Array<string | number>> = empresas
    .map((emp) => {
      const docsEmp = docs.filter((d) => d.empresa_id === emp.id);
      const checklist = computarChecklistEmpresa(emp, docsEmp);
      return { emp, checklist };
    })
    .filter((x) => x.checklist.pronta)
    .sort((a, b) => a.emp.nome.localeCompare(b.emp.nome, "pt-BR", { sensitivity: "base" }))
    .map(({ emp, checklist }) => [
      emp.nome,
      checklist.simplificada ? "Simplificada" : "Completa",
      checklist.requisitos.map((r) => r.label).join(" • "),
    ]);

  return [
    make("todos", "Todos os documentos", docs),
    make(
      "filtrados",
      "Documentos conforme filtros atuais",
      filtered,
      "Usa os filtros já aplicados na tela",
    ),
    make(
      "em-dia",
      "Documentos em dia",
      venciveis.filter((d) => {
        const dt = parseLocalDate(d.data_vencimento)!.getTime();
        return dt - hojeMs > 30 * 86400000;
      }),
    ),
    make(
      "proximos",
      "Documentos próximos do vencimento",
      venciveis.filter((d) => {
        const dias = daysFromToday(d.data_vencimento) ?? 0;
        return dias >= 0 && dias <= 30;
      }),
      "Vencem em até 30 dias",
    ),
    make(
      "vencidos",
      "Documentos vencidos",
      venciveis.filter((d) => (daysFromToday(d.data_vencimento) ?? 0) < 0),
    ),
    make(
      "sem-conferencia",
      "Documentos pendentes de conferência",
      docs.filter((d) => tipoExigeConferencia(d.tipo) && !d.conferencia_ok),
    ),
    {
      id: "sem-anexo-obrigatorio",
      label: "Documentos sem anexo obrigatório",
      descricao:
        "PGR, PGRTR, PCMSO, LTCAT, LTI e LTP sem ART/Declaração/Registro Profissional conferido — com a empresa correspondente",
      build: () => ({
        titulo: "Documentos sem anexo obrigatório",
        colunas: [
          { header: "Empresa" },
          { header: "Documento" },
          { header: "Anexo pendente" },
          { header: "Conclusão" },
          { header: "Vencimento" },
        ],
        linhas: semAnexoLinhas,
        totalizadores: [
          { label: "Documentos pendentes", value: String(semAnexoLinhas.length) },
          { label: "Empresas envolvidas", value: String(semAnexoEmpresasUnicas) },
        ],
      }),
    },
    {
      id: "empresas-100-prontas",
      label: "Empresas 100% prontas",
      descricao:
        "Empresas com LTCAT (ART), AEP e Ordem de Serviço — mais PGR/PGRTR, PCMSO e Ficha de EPI quando não isentos. LTI e LTP são opcionais.",
      build: () => ({
        titulo: "Empresas 100% prontas",
        colunas: [{ header: "Empresa" }, { header: "Tipo" }, { header: "Requisitos atendidos" }],
        linhas: prontasLinhas,
        totalizadores: [
          { label: "Total de empresas prontas", value: String(prontasLinhas.length) },
        ],
      }),
    },
  ];
}

function readExpandedEmpresas() {
  if (typeof window === "undefined") return new Set<string>();
  try {
    return new Set<string>(
      JSON.parse(window.sessionStorage.getItem(EXPANDED_DOC_GROUPS_KEY) ?? "[]"),
    );
  } catch {
    return new Set<string>();
  }
}

function saveExpandedEmpresas(empresas: Set<string>) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(EXPANDED_DOC_GROUPS_KEY, JSON.stringify(Array.from(empresas)));
}
