import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, FileBadge, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { PageHero } from "@/components/PageHero";
import { useUserRole } from "@/lib/useUserRole";
import {
  AsoFormDialog,
  ASO_TIPO_LABELS,
  type AsoTipo,
  type EditableAso,
} from "@/components/AsoFormDialog";
import {
  getSelectedEmpresaId,
  setSelectedEmpresaId,
  consumeAsosSituacaoPreset,
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
import { ReportButton } from "@/components/ReportButton";
import type { RelatorioOpcao } from "@/components/RelatorioDialog";

const EXPANDED_ASO_GROUPS_KEY = "engtech:asoExpandedEmpresas";
const ESOCIAL_EVENTOS = ["S-2210", "S-2220", "S-2240", "S-2221"] as const;
const VALIDADE_DIAS = 365;

type AsoRow = {
  id: string;
  empresa_id: string;
  funcionario_nome: string;
  cpf: string | null;
  data_nascimento: string | null;
  funcao: string | null;
  data_aso: string;
  tipo_aso: AsoTipo;
  eventos_esocial: string[];
  observacoes: string | null;
};

export const Route = createFileRoute("/_authenticated/esocial")({
  component: EsocialAsoPage,
});

function EsocialAsoPage() {
  const { isAdmin } = useUserRole();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<string>("todos");
  const [situacaoFiltro, setSituacaoFiltro] = useState<string>(
    () => consumeAsosSituacaoPreset() ?? "todos",
  );
  const [contabilidadeFiltro, setContabilidadeFiltro] = useState<string>("todas");
  const [empresaFiltro, setEmpresaFiltro] = useState<string>(
    () => getSelectedEmpresaId() ?? "todas",
  );
  const [novoAsoOpen, setNovoAsoOpen] = useState(false);
  const [editingAso, setEditingAso] = useState<EditableAso | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedEmpresas, setExpandedEmpresas] = useState<Set<string>>(() =>
    readExpandedEmpresas(),
  );

  const { data, isLoading } = useQuery({
    queryKey: ["asos-page"],
    queryFn: async () => {
      const [asoRes, empRes, contabRes] = await Promise.all([
        supabase.from("asos").select("*").order("data_aso", { ascending: false }),
        supabase.from("empresas").select("id,nome,contabilidade_id").order("nome"),
        supabase.from("contabilidades").select("id,nome").order("nome"),
      ]);
      if (asoRes.error) throw asoRes.error;
      if (empRes.error) throw empRes.error;
      if (contabRes.error) throw contabRes.error;
      return {
        asos: (asoRes.data ?? []) as AsoRow[],
        empresas: empRes.data ?? [],
        contabilidades: contabRes.data ?? [],
      };
    },
  });

  const empresaMap = new Map((data?.empresas ?? []).map((e) => [e.id, e]));
  const empresas = data?.empresas ?? [];
  const contabilidades = data?.contabilidades ?? [];
  const asos = data?.asos ?? [];
  const empresasFiltradas = empresas.filter(
    (e) => contabilidadeFiltro === "todas" || e.contabilidade_id === contabilidadeFiltro,
  );

  const filtered = asos.filter((a) => {
    const empresa = empresaMap.get(a.empresa_id);
    const empresaNome = empresa?.nome ?? "";
    const okQ =
      q === "" ||
      empresaNome.toLowerCase().includes(q.toLowerCase()) ||
      a.funcionario_nome.toLowerCase().includes(q.toLowerCase());
    const okT = tipoFiltro === "todos" || a.tipo_aso === tipoFiltro;
    const sit = computeSituacao(a.data_aso, a.tipo_aso);
    const okS = situacaoFiltro === "todos" || sit.key === situacaoFiltro;
    const okC =
      contabilidadeFiltro === "todas" || empresa?.contabilidade_id === contabilidadeFiltro;
    const okE = empresaFiltro === "todas" || a.empresa_id === empresaFiltro;
    return okQ && okT && okS && okC && okE;
  });

  const grouped = useMemo(() => {
    const map = new Map<string, AsoRow[]>();
    filtered.forEach((aso) => {
      const list = map.get(aso.empresa_id) ?? [];
      list.push(aso);
      map.set(aso.empresa_id, list);
    });
    return Array.from(map.entries())
      .map(([empresaId, asoList]) => ({
        empresaId,
        empresaNome: empresaMap.get(empresaId)?.nome ?? "—",
        asos: [...asoList].sort(
          (a, b) =>
            asoPriority(a) - asoPriority(b) ||
            a.funcionario_nome.localeCompare(b.funcionario_nome, "pt-BR"),
        ),
        summary: getEmpresaAsoSummary(asoList),
      }))
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

  const deleteAso = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("asos").delete().eq("id", deleteId);
    if (error) toast.error(error.message);
    else {
      toast.success("ASO excluído.");
      setDeleteId(null);
      await queryClient.invalidateQueries();
    }
  };

  const toggleEvento = async (aso: AsoRow, evento: string) => {
    const atuais = new Set(aso.eventos_esocial ?? []);
    if (atuais.has(evento)) atuais.delete(evento);
    else atuais.add(evento);
    const novos = Array.from(atuais);

    // Otimismo: atualiza cache antes da resposta
    queryClient.setQueryData(["asos-page"], (old: any) => {
      if (!old) return old;
      return {
        ...old,
        asos: old.asos.map((x: AsoRow) => (x.id === aso.id ? { ...x, eventos_esocial: novos } : x)),
      };
    });

    const { error } = await supabase
      .from("asos")
      .update({ eventos_esocial: novos })
      .eq("id", aso.id);
    if (error) {
      toast.error(error.message);
      await queryClient.invalidateQueries({ queryKey: ["asos-page"] });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title="ASO / eSocial"
        subtitle="Gestão de Atestados de Saúde Ocupacional por funcionário e controle dos eventos S-2210, S-2220, S-2240 e S-2221."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ReportButton
              modulo="asos"
              getOpcoes={() => buildAsoOpcoes({ asos, filtered, empresaMap })}
            />
            {isAdmin && (
              <button
                onClick={() => setNovoAsoOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-glow"
              >
                <Plus className="h-4 w-4" /> Novo ASO
              </button>
            )}
          </div>
        }
      />

      <AsoFormDialog
        open={novoAsoOpen}
        onOpenChange={setNovoAsoOpen}
        empresas={empresas}
        contabilidades={contabilidades}
      />
      <AsoFormDialog
        open={Boolean(editingAso)}
        onOpenChange={(open) => !open && setEditingAso(null)}
        empresas={empresas}
        contabilidades={contabilidades}
        editingAso={editingAso}
      />

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ASO</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este ASO? Essa ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteAso}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <section className="rounded-3xl border border-border/60 bg-card p-4 shadow-elegant sm:p-5">
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="relative sm:col-span-2 xl:col-span-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por empresa ou funcionário"
              className="w-full rounded-xl border border-input bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
          >
            <option value="todos">Todos os tipos</option>
            {(Object.keys(ASO_TIPO_LABELS) as AsoTipo[]).map((t) => (
              <option key={t} value={t}>
                {ASO_TIPO_LABELS[t]}
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
            {contabilidades.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
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
            {empresasFiltradas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </select>
          <select
            value={situacaoFiltro}
            onChange={(e) => setSituacaoFiltro(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
          >
            <option value="todos">Todas situações</option>
            <option value="em_dia">Em dia</option>
            <option value="proximo_vencimento">Próx. vencimento</option>
            <option value="vencido">Vencido</option>
            <option value="indeterminado">Indeterminado</option>
          </select>
        </div>

        {/* Desktop table */}
        <div className="-mx-4 hidden overflow-x-auto px-4 sm:-mx-5 sm:px-5 lg:block">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="pb-3 pr-3">Funcionário</th>
                <th className="pb-3 pr-3">CPF</th>
                <th className="pb-3 pr-3">Nascimento</th>
                <th className="pb-3 pr-3">Função</th>
                <th className="pb-3 pr-3">ASO</th>
                <th className="pb-3 pr-3">Tipo</th>
                <th className="pb-3 pr-3">Situação</th>
                <th className="pb-3 pr-3">e-Social</th>
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
                    Nenhum ASO encontrado.
                  </td>
                </tr>
              ) : (
                grouped.map((group) => {
                  const expanded = expandedEmpresas.has(group.empresaId);
                  return (
                    <Fragment key={group.empresaId}>
                      <tr className="border-t border-border/70 bg-muted/35 hover:bg-muted/55">
                        <td className="py-3 pr-3" colSpan={isAdmin ? 9 : 8}>
                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              onClick={() => toggleEmpresa(group.empresaId)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground"
                              aria-label={expanded ? "Recolher" : "Expandir"}
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
                            <EmpresaAsoSummaryBadge summary={group.summary} />
                            <span className="text-xs font-semibold text-muted-foreground">
                              {group.asos.length} ASO{group.asos.length === 1 ? "" : "s"}
                            </span>
                          </div>
                        </td>
                      </tr>
                      {expanded &&
                        group.asos.map((a) => {
                          const sit = computeSituacao(a.data_aso, a.tipo_aso);
                          return (
                            <tr key={a.id} className="border-t border-border/50 hover:bg-muted/25">
                              <td className="py-3 pr-3 pl-14">
                                <div className="flex items-center gap-2">
                                  <FileBadge className="h-4 w-4 text-primary" />
                                  <span className="font-bold text-foreground">
                                    {a.funcionario_nome}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 pr-3 text-muted-foreground">{a.cpf ?? "—"}</td>
                              <td className="py-3 pr-3 text-muted-foreground">
                                {a.data_nascimento
                                  ? format(parseLocalDate(a.data_nascimento)!, "dd/MM/yyyy")
                                  : "—"}
                              </td>
                              <td className="py-3 pr-3 text-muted-foreground">{a.funcao ?? "—"}</td>
                              <td className="py-3 pr-3 text-muted-foreground">
                                {format(parseLocalDate(a.data_aso)!, "dd/MM/yyyy")}
                              </td>
                              <td className="py-3 pr-3">
                                <span className="rounded-md bg-info/10 px-2 py-1 text-[11px] font-extrabold text-info">
                                  {ASO_TIPO_LABELS[a.tipo_aso]}
                                </span>
                              </td>
                              <td className="py-3 pr-3">
                                <SituacaoBadge sit={sit} />
                              </td>
                              <td className="py-3 pr-3">
                                <div className="flex flex-wrap gap-1.5">
                                  {ESOCIAL_EVENTOS.map((ev) => {
                                    const ativo = (a.eventos_esocial ?? []).includes(ev);
                                    return (
                                      <button
                                        key={ev}
                                        type="button"
                                        onClick={() => toggleEvento(a, ev)}
                                        title={
                                          ativo
                                            ? `${ev} lançado — clique para desmarcar`
                                            : `Marcar ${ev} como lançado`
                                        }
                                        className={`rounded-md border px-2 py-1 text-[10.5px] font-extrabold transition ${ativo ? "border-success/40 bg-success/15 text-success" : "border-border bg-background text-muted-foreground hover:bg-muted"}`}
                                      >
                                        {ev}
                                      </button>
                                    );
                                  })}
                                </div>
                              </td>
                              {isAdmin && (
                                <td className="py-3 text-right">
                                  <button
                                    onClick={() =>
                                      setEditingAso({
                                        id: a.id,
                                        empresa_id: a.empresa_id,
                                        funcionario_nome: a.funcionario_nome,
                                        cpf: a.cpf,
                                        data_nascimento: a.data_nascimento,
                                        funcao: a.funcao,
                                        data_aso: a.data_aso,
                                        tipo_aso: a.tipo_aso,
                                        eventos_esocial: a.eventos_esocial ?? [],
                                        observacoes: a.observacoes,
                                      })
                                    }
                                    className="mr-2 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-primary/10 hover:text-primary"
                                    aria-label="Editar ASO"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteId(a.id)}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                    aria-label="Excluir ASO"
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
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum ASO encontrado.</p>
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
                    aria-label={expanded ? "Recolher" : "Expandir"}
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
                        {group.asos.length} ASO{group.asos.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <EmpresaAsoSummaryBadge summary={group.summary} />
                  </button>
                  {expanded && (
                    <div className="flex flex-col gap-2 border-t border-border/60 p-3">
                      {group.asos.map((a) => {
                        const sit = computeSituacao(a.data_aso, a.tipo_aso);
                        return (
                          <div
                            key={a.id}
                            className="rounded-xl border border-border/60 bg-card p-3"
                          >
                            <div className="mb-2 flex items-start justify-between gap-2">
                              <div className="flex min-w-0 items-center gap-2">
                                <FileBadge className="h-4 w-4 shrink-0 text-primary" />
                                <span className="truncate font-bold text-foreground">
                                  {a.funcionario_nome}
                                </span>
                              </div>
                              <SituacaoBadge sit={sit} />
                            </div>
                            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                              <div>
                                <dt className="font-bold uppercase text-muted-foreground">CPF</dt>
                                <dd className="text-foreground">{a.cpf ?? "—"}</dd>
                              </div>
                              <div>
                                <dt className="font-bold uppercase text-muted-foreground">
                                  Nascimento
                                </dt>
                                <dd className="text-foreground">
                                  {a.data_nascimento
                                    ? format(parseLocalDate(a.data_nascimento)!, "dd/MM/yyyy")
                                    : "—"}
                                </dd>
                              </div>
                              <div>
                                <dt className="font-bold uppercase text-muted-foreground">
                                  Função
                                </dt>
                                <dd className="truncate text-foreground">{a.funcao ?? "—"}</dd>
                              </div>
                              <div>
                                <dt className="font-bold uppercase text-muted-foreground">ASO</dt>
                                <dd className="text-foreground">
                                  {format(parseLocalDate(a.data_aso)!, "dd/MM/yyyy")}
                                </dd>
                              </div>
                              <div className="col-span-2">
                                <dt className="font-bold uppercase text-muted-foreground">Tipo</dt>
                                <dd>
                                  <span className="rounded-md bg-info/10 px-2 py-0.5 text-[10px] font-extrabold text-info">
                                    {ASO_TIPO_LABELS[a.tipo_aso]}
                                  </span>
                                </dd>
                              </div>
                            </dl>
                            <div className="mt-2">
                              <p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">
                                e-Social
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {ESOCIAL_EVENTOS.map((ev) => {
                                  const ativo = (a.eventos_esocial ?? []).includes(ev);
                                  return (
                                    <button
                                      key={ev}
                                      type="button"
                                      onClick={() => toggleEvento(a, ev)}
                                      className={`rounded-md border px-2 py-1 text-[10.5px] font-extrabold transition ${ativo ? "border-success/40 bg-success/15 text-success" : "border-border bg-background text-muted-foreground hover:bg-muted"}`}
                                    >
                                      {ev}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                            {isAdmin && (
                              <div className="mt-2 flex justify-end gap-1.5">
                                <button
                                  onClick={() =>
                                    setEditingAso({
                                      id: a.id,
                                      empresa_id: a.empresa_id,
                                      funcionario_nome: a.funcionario_nome,
                                      cpf: a.cpf,
                                      data_nascimento: a.data_nascimento,
                                      funcao: a.funcao,
                                      data_aso: a.data_aso,
                                      tipo_aso: a.tipo_aso,
                                      eventos_esocial: a.eventos_esocial ?? [],
                                      observacoes: a.observacoes,
                                    })
                                  }
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-primary/10 hover:text-primary"
                                  aria-label="Editar ASO"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => setDeleteId(a.id)}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                  aria-label="Excluir ASO"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
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

// ─── Helpers ──────────────────────────────────────────

type SituacaoKey = "em_dia" | "proximo_vencimento" | "vencido" | "indeterminado";
type Situacao = { dias: number; key: SituacaoKey; indeterminado: boolean };

function computeSituacao(dataAso: string, tipoAso?: AsoTipo): Situacao {
  if (tipoAso === "demissional") {
    return { dias: 0, key: "indeterminado", indeterminado: true };
  }
  const elaboracao = parseLocalDate(dataAso);
  if (!elaboracao) return { dias: 0, key: "indeterminado", indeterminado: true };
  const vencimento = new Date(elaboracao);
  vencimento.setDate(vencimento.getDate() + VALIDADE_DIAS);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  vencimento.setHours(0, 0, 0, 0);
  const dias = Math.round((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  let key: SituacaoKey;
  if (dias < 0) key = "vencido";
  else if (dias <= 30) key = "proximo_vencimento";
  else key = "em_dia";
  return { dias, key, indeterminado: false };
}

function asoPriority(a: AsoRow) {
  const sit = computeSituacao(a.data_aso, a.tipo_aso);
  if (sit.key === "vencido") return 0;
  if (sit.key === "proximo_vencimento") return 1;
  if (sit.key === "em_dia") return 2;
  return 3;
}

function SituacaoBadge({ sit }: { sit: Situacao }) {
  if (sit.indeterminado) {
    return (
      <span className="rounded-full bg-muted px-3 py-1 text-xs font-extrabold text-muted-foreground">
        Indeterminado
      </span>
    );
  }
  const dias = sit.dias;
  if (dias < 0) {
    return (
      <span className="rounded-full bg-destructive/15 px-3 py-1 text-xs font-extrabold text-destructive">
        Vencido há {Math.abs(dias)} dias
      </span>
    );
  }
  if (dias <= 30) {
    return (
      <span className="rounded-full bg-warning/30 px-3 py-1 text-xs font-extrabold text-warning-foreground">
        Faltam {dias} dias
      </span>
    );
  }
  return (
    <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-extrabold text-success">
      Em dia · {dias} dias
    </span>
  );
}

type EmpresaAsoSummary = {
  tone: "danger" | "warning" | "success" | "muted";
  label: string;
  detail: string;
};

function getEmpresaAsoSummary(list: AsoRow[]): EmpresaAsoSummary {
  if (list.length === 0) return { tone: "muted", label: "⚪ Sem ASOs", detail: "" };
  const sits = list.map((a) => computeSituacao(a.data_aso, a.tipo_aso));
  const vencidos = sits.filter((s) => s.key === "vencido").length;
  const proximos = sits.filter((s) => s.key === "proximo_vencimento").length;
  if (vencidos > 0)
    return {
      tone: "danger",
      label: `🔴 ${vencidos} vencido${vencidos === 1 ? "" : "s"}`,
      detail: `${vencidos} ASO(s) vencido(s)`,
    };
  if (proximos > 0)
    return {
      tone: "warning",
      label: `🟡 ${proximos} próximo${proximos === 1 ? "" : "s"}`,
      detail: `${proximos} ASO(s) a vencer em até 30 dias`,
    };
  return { tone: "success", label: "🟢 100% em dia", detail: "Todos os ASOs em dia." };
}

function EmpresaAsoSummaryBadge({ summary }: { summary: EmpresaAsoSummary }) {
  const cls = {
    danger: "bg-destructive/15 text-destructive",
    warning: "bg-warning/30 text-warning-foreground",
    success: "bg-success/15 text-success",
    muted: "bg-muted text-muted-foreground",
  }[summary.tone];
  return (
    <span
      title={summary.detail}
      className={`whitespace-pre-line rounded-full px-3 py-1 text-xs font-extrabold ${cls}`}
    >
      {summary.label}
    </span>
  );
}

function readExpandedEmpresas() {
  if (typeof window === "undefined") return new Set<string>();
  try {
    return new Set<string>(
      JSON.parse(window.sessionStorage.getItem(EXPANDED_ASO_GROUPS_KEY) ?? "[]"),
    );
  } catch {
    return new Set<string>();
  }
}

function saveExpandedEmpresas(empresas: Set<string>) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(EXPANDED_ASO_GROUPS_KEY, JSON.stringify(Array.from(empresas)));
}

function buildAsoOpcoes(args: {
  asos: AsoRow[];
  filtered: AsoRow[];
  empresaMap: Map<string, { id: string; nome: string; contabilidade_id: string | null }>;
}): RelatorioOpcao[] {
  const { asos, filtered, empresaMap } = args;
  const colunas = [
    { header: "Empresa" },
    { header: "Funcionário" },
    { header: "CPF" },
    { header: "Função" },
    { header: "Data ASO" },
    { header: "Tipo" },
    { header: "Situação" },
    { header: "eSocial" },
  ];
  const toLinha = (a: AsoRow): Array<string | number> => {
    const sit = computeSituacao(a.data_aso, a.tipo_aso);
    const sitTxt = sit.indeterminado
      ? "Indeterminado"
      : sit.key === "vencido"
        ? `Vencido há ${Math.abs(sit.dias)} dias`
        : sit.key === "proximo_vencimento"
          ? `Vence em ${sit.dias} dias`
          : `Em dia (${sit.dias} dias)`;
    return [
      empresaMap.get(a.empresa_id)?.nome ?? "—",
      a.funcionario_nome,
      a.cpf ?? "—",
      a.funcao ?? "—",
      format(parseLocalDate(a.data_aso)!, "dd/MM/yyyy"),
      ASO_TIPO_LABELS[a.tipo_aso],
      sitTxt,
      (a.eventos_esocial ?? []).join(", ") || "—",
    ];
  };
  const make = (id: string, label: string, list: AsoRow[], descricao?: string): RelatorioOpcao => ({
    id,
    label,
    descricao,
    build: () => ({
      titulo: label,
      colunas,
      linhas: list.map(toLinha),
      totalizadores: [{ label: "Total de ASOs", value: String(list.length) }],
    }),
  });
  const porSituacao = (key: "em_dia" | "proximo_vencimento" | "vencido") =>
    asos.filter((a) => computeSituacao(a.data_aso, a.tipo_aso).key === key);
  const porEvento = (ev: string) => asos.filter((a) => (a.eventos_esocial ?? []).includes(ev));
  return [
    make("todos", "Todos os ASOs", asos),
    make(
      "filtrados",
      "ASOs conforme filtros atuais",
      filtered,
      "Usa os filtros já aplicados na tela",
    ),
    make("em-dia", "ASOs em dia", porSituacao("em_dia")),
    make(
      "proximos",
      "ASOs próximos do vencimento",
      porSituacao("proximo_vencimento"),
      "Vencem em até 30 dias",
    ),
    make("vencidos", "ASOs vencidos", porSituacao("vencido")),
    make("s2210", "Eventos eSocial S-2210", porEvento("S-2210")),
    make("s2220", "Eventos eSocial S-2220", porEvento("S-2220")),
    make("s2240", "Eventos eSocial S-2240", porEvento("S-2240")),
    make("s2221", "Eventos eSocial S-2221", porEvento("S-2221")),
    make(
      "sem-evento",
      "ASOs sem evento eSocial lançado",
      asos.filter((a) => !a.eventos_esocial || a.eventos_esocial.length === 0),
    ),
  ];
}
