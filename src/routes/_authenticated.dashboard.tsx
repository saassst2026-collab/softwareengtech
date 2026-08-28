import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, lazy, Suspense, useEffect } from "react";
import {
  Building2,
  FileCheck2,
  AlertTriangle,
  CalendarClock,
  ShieldCheck,
  FileBadge,
  Send,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { supabase } from "@/integrations/supabase/client";
import { PageHero } from "@/components/PageHero";
import { KpiCard } from "@/components/KpiCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserRole } from "@/lib/useUserRole";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Upload } from "lucide-react";
import {
  setDocumentosSituacaoPreset,
  setAsosSituacaoPreset,
  setSelectedEmpresaId,
} from "@/lib/companyContext";
import { parseLocalDate, daysFromToday } from "@/lib/dateUtils";
import { DOC_TIPOS_ORDENADOS, tipoLabel } from "@/lib/documentoLabels";
import { computarConformidade, computarConformidadeDocumental } from "@/lib/conformidade";
import { computarStatusRegularizacao } from "@/lib/documentoStatus";

const SITUACAO_LABELS: Record<string, string> = {
  em_dia: "Em dia",
  concluido: "Concluído",
  proximo_vencimento: "Próx. vencimento",
  vencido: "Vencido",
  pendente: "Indeterminado",
};
const situacaoLabel = (s: string) => SITUACAO_LABELS[s] ?? s;

// Lazy-load dos gráficos (recharts é pesado) para acelerar o first paint
const TiposChart = lazy(() =>
  import("@/components/dashboard/DashboardCharts").then((m) => ({ default: m.TiposChart })),
);
const StatusPieChart = lazy(() =>
  import("@/components/dashboard/DashboardCharts").then((m) => ({ default: m.StatusPieChart })),
);
const ElaboracaoMensalChart = lazy(() =>
  import("@/components/dashboard/DashboardCharts").then((m) => ({
    default: m.ElaboracaoMensalChart,
  })),
);
const ContabChart = lazy(() =>
  import("@/components/dashboard/DashboardCharts").then((m) => ({ default: m.ContabChart })),
);
const EmpresasConcluidasChart = lazy(() =>
  import("@/components/dashboard/DashboardCharts").then((m) => ({
    default: m.EmpresasConcluidasChart,
  })),
);

const ChartSkeleton = ({ h = "h-72" }: { h?: string }) => (
  <div className={`${h} flex items-end gap-2 px-2 pb-2`}>
    {Array.from({ length: 7 }).map((_, i) => (
      <Skeleton key={i} className="flex-1" style={{ height: `${30 + ((i * 13) % 60)}%` }} />
    ))}
  </div>
);

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { isAdmin } = useUserRole();
  const queryClient = useQueryClient();
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedTipo, setSelectedTipo] = useState<string>("todos");
  const [selectedSituacao, setSelectedSituacao] = useState<string>("todas");
  const [concAno, setConcAno] = useState<number>(new Date().getFullYear());
  const [concMes, setConcMes] = useState<string>("todos");
  const [concContab, setConcContab] = useState<string>("todas");
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-sst"],
    queryFn: async () => {
      const [empresasRes, docsRes, contabsRes, asosRes] = await Promise.all([
        supabase.from("empresas").select("*"),
        supabase.from("documentos_sst").select("*"),
        supabase.from("contabilidades").select("*"),
        supabase.from("asos").select("id,data_aso,tipo_aso,eventos_esocial"),
      ]);
      if (empresasRes.error) throw empresasRes.error;
      if (docsRes.error) throw docsRes.error;
      if (contabsRes.error) throw contabsRes.error;
      if (asosRes.error) throw asosRes.error;
      return {
        empresas: empresasRes.data ?? [],
        documentos: docsRes.data ?? [],
        contabilidades: contabsRes.data ?? [],
        asos: asosRes.data ?? [],
      };
    },
  });

  const empresas = data?.empresas ?? [];
  const documentos = data?.documentos ?? [];
  const contabilidades = data?.contabilidades ?? [];
  const asos = data?.asos ?? [];

  const conformidadeBreakdown = useMemo(() => computarConformidade(documentos), [documentos]);
  const conformidadeDocumental = useMemo(
    () => computarConformidadeDocumental(documentos),
    [documentos],
  );

  useEffect(() => {
    const channel = supabase
      .channel("dashboard-live-data")
      .on("postgres_changes", { event: "*", schema: "public", table: "empresas" }, () =>
        queryClient.invalidateQueries({ queryKey: ["dashboard-sst"] }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "documentos_sst" }, () =>
        queryClient.invalidateQueries({ queryKey: ["dashboard-sst"] }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "contabilidades" }, () =>
        queryClient.invalidateQueries({ queryKey: ["dashboard-sst"] }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "asos" }, () =>
        queryClient.invalidateQueries({ queryKey: ["dashboard-sst"] }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const totalEmpresas = empresas.length;
  const totalDocs = documentos.length;
  // KPIs de prazo recalculados em tempo real — mesma fonte da % de conformidade.
  const kpiPrazo = useMemo(() => {
    let emDia = 0,
      proximoVenc = 0,
      vencidos = 0,
      indeterminados = 0;
    documentos.forEach((d) => {
      const status = computarStatusRegularizacao(d);
      if (status === "vencido") {
        vencidos++;
        return;
      }
      if (status === "indeterminado") {
        indeterminados++;
        return;
      }
      const dias = daysFromToday(d.data_vencimento);
      if (dias !== null && dias >= 0 && dias <= 60) {
        proximoVenc++;
        return;
      }
      if (status === "regularizado" || status === "em_dia") {
        emDia++;
        return;
      }
      // pendente_anexos / parcialmente_regular sem prazo iminente
      indeterminados++;
    });
    return { emDia, proximoVenc, vencidos, indeterminados };
  }, [documentos]);
  const { emDia, proximoVenc, vencidos, indeterminados } = kpiPrazo;

  // Indicadores de ASO
  const totalAsos = asos.length;
  const asosVencidos = asos.filter((a) => {
    if (!a.data_aso) return false;
    if (a.tipo_aso === "demissional") return false;
    const venc = parseLocalDate(a.data_aso);
    if (!venc) return false;
    venc.setDate(venc.getDate() + 365);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    venc.setHours(0, 0, 0, 0);
    return venc.getTime() < hoje.getTime();
  }).length;
  const eventosLancados = asos.reduce(
    (acc, a) => acc + ((a.eventos_esocial as string[] | null)?.length ?? 0),
    0,
  );

  // Conformidade única — mesma regra usada nas demais abas.
  const conformidade = conformidadeBreakdown.percentual;

  // Anos disponíveis a partir das datas de elaboração/criação
  const anosDisponiveis = useMemo(() => {
    const anos = new Set<number>();
    documentos.forEach((d) => {
      const ref = d.data_conclusao ?? d.created_at;
      if (ref) {
        const ano = new Date(ref).getFullYear();
        if (!isNaN(ano)) anos.add(ano);
      }
    });
    const anoAtual = new Date().getFullYear();
    anos.add(anoAtual);
    return Array.from(anos).sort((a, b) => b - a);
  }, [documentos]);

  // Elaboração mensal de documentos no ano selecionado
  const elaboracaoMensal = useMemo(() => {
    const meses = [
      "Jan",
      "Fev",
      "Mar",
      "Abr",
      "Mai",
      "Jun",
      "Jul",
      "Ago",
      "Set",
      "Out",
      "Nov",
      "Dez",
    ];
    const counts = new Array(12).fill(0);
    documentos.forEach((d) => {
      if (selectedTipo !== "todos" && d.tipo !== selectedTipo) return;
      if (selectedSituacao !== "todas" && d.situacao !== selectedSituacao) return;
      const ref = d.data_conclusao ?? d.created_at;
      if (!ref) return;
      const dt = new Date(ref);
      if (isNaN(dt.getTime())) return;
      if (dt.getFullYear() === selectedYear) {
        counts[dt.getMonth()] += 1;
      }
    });
    return meses.map((mes, i) => ({ mes, qtd: counts[i] }));
  }, [documentos, selectedYear, selectedTipo, selectedSituacao]);

  // Distribuição por tipo de documento
  const tiposCount = documentos.reduce<Record<string, number>>((acc, d) => {
    acc[d.tipo] = (acc[d.tipo] ?? 0) + 1;
    return acc;
  }, {});
  const tiposData = Object.entries(tiposCount)
    .map(([nome, qtd]) => ({ nome, qtd }))
    .sort((a, b) => b.qtd - a.qtd)
    .slice(0, 7);

  // Distribuição por contabilidade
  const contabData = contabilidades.map((c) => ({
    nome: c.nome.length > 18 ? c.nome.slice(0, 18) + "…" : c.nome,
    empresas: empresas.filter((e) => e.contabilidade_id === c.id).length,
  }));

  // Empresas concluídas por mês: empresa cuja conformidade atual é 100%
  // (todos os docs regularizados, incluindo conferência manual nos tipos
  // que exigem) e cuja data de conclusão mais recente cai no mês.
  const empresasConcluidasMensal = useMemo(() => {
    const meses = [
      "Jan",
      "Fev",
      "Mar",
      "Abr",
      "Mai",
      "Jun",
      "Jul",
      "Ago",
      "Set",
      "Out",
      "Nov",
      "Dez",
    ];
    const counts = new Array(12).fill(0);

    empresas.forEach((emp) => {
      if (concContab !== "todas" && emp.contabilidade_id !== concContab) return;
      const docsEmp = documentos.filter((d) => d.empresa_id === emp.id);
      if (docsEmp.length === 0) return;
      const breakdown = computarConformidade(docsEmp);
      const totalRelevante = breakdown.total - breakdown.indeterminados;
      if (totalRelevante === 0 || breakdown.regularizados !== totalRelevante) return;

      // Data de conclusão mais recente entre os documentos da empresa
      let maisRecente: Date | null = null;
      docsEmp.forEach((d) => {
        const ref = d.data_conclusao ?? d.updated_at;
        if (!ref) return;
        const dt = new Date(ref);
        if (isNaN(dt.getTime())) return;
        if (!maisRecente || dt > maisRecente) maisRecente = dt;
      });
      if (!maisRecente) return;
      if ((maisRecente as Date).getFullYear() !== concAno) return;
      const m = (maisRecente as Date).getMonth();
      if (concMes !== "todos" && m !== Number(concMes)) return;
      counts[m] += 1;
    });

    return meses.map((mes, i) => ({ mes, qtd: counts[i] }));
  }, [empresas, documentos, concAno, concMes, concContab]);

  const anosConclusao = useMemo(() => {
    const anos = new Set<number>();
    documentos.forEach((d) => {
      const ref = d.data_conclusao ?? d.updated_at;
      if (!ref) return;
      const dt = new Date(ref);
      if (!isNaN(dt.getTime())) anos.add(dt.getFullYear());
    });
    anos.add(new Date().getFullYear());
    return Array.from(anos).sort((a, b) => b - a);
  }, [documentos]);

  // Próximos vencimentos (top 5)
  const proximosVenc = documentos
    .filter((d) => d.data_vencimento && d.situacao !== "concluido")
    .map((d) => ({
      ...d,
      dias: daysFromToday(d.data_vencimento) ?? 0,
      empresa: empresas.find((e) => e.id === d.empresa_id)?.nome ?? "—",
    }))
    .filter((d) => d.dias >= 0)
    .sort((a, b) => a.dias - b.dias)
    .slice(0, 6);

  // Pie de status — apenas Em Dia, Próx. Vencimento e Vencidos
  // (Indeterminados não entram no gráfico por não representarem prazo)
  const statusPie = [
    { name: "Em Dia", value: emDia, color: "oklch(0.62 0.15 145)" },
    { name: "Próx. Vencimento", value: proximoVenc, color: "oklch(0.82 0.16 85)" },
    { name: "Vencidos", value: vencidos, color: "oklch(0.6 0.22 27)" },
  ].filter((s) => s.value > 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title="Dashboard SST"
        subtitle="Indicadores de conformidade documental, vencimentos e obrigações legais da carteira de empresas atendidas."
        actions={
          <button className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-info shadow-elegant">
            Hoje · {format(new Date(), "dd 'de' MMM", { locale: ptBR })}
          </button>
        }
      />

      {!isLoading && totalDocs === 0 && totalEmpresas === 0 && (
        <section className="rounded-3xl border border-info/30 bg-info/5 p-6 text-center">
          <p className="text-sm font-bold text-foreground">Nenhuma base ativa no momento.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {isAdmin
              ? "Cadastre empresas e documentos para alimentar o painel em tempo real."
              : "Aguarde o Administrador Principal cadastrar a base de dados."}
          </p>
          {isAdmin && (
            <Link
              to="/empresas"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-glow"
            >
              <Upload className="h-4 w-4" /> Cadastrar empresas
            </Link>
          )}
        </section>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Empresas atendidas"
          value={totalEmpresas}
          sub={`${contabilidades.length} contabilidades`}
          icon={Building2}
          tone="primary"
          to="/empresas"
          onNavigate={() => setSelectedEmpresaId(null)}
        />
        <KpiCard
          label="Documentos SST"
          value={totalDocs}
          sub={`${emDia} em dia`}
          icon={FileCheck2}
          tone="success"
          to="/documentos"
          onNavigate={() => {
            setSelectedEmpresaId(null);
            setDocumentosSituacaoPreset(null);
          }}
        />
        <KpiCard
          label="Próx. vencimento"
          value={proximoVenc}
          sub="Atenção em 60 dias"
          icon={CalendarClock}
          tone="warning"
          to="/documentos"
          onNavigate={() => {
            setSelectedEmpresaId(null);
            setDocumentosSituacaoPreset("proximo_vencimento");
          }}
        />
        <KpiCard
          label="Vencidos"
          value={vencidos}
          sub={`${indeterminados} indeterminados`}
          icon={AlertTriangle}
          tone={vencidos > 0 ? "warning" : "info"}
          to="/documentos"
          onNavigate={() => {
            setSelectedEmpresaId(null);
            setDocumentosSituacaoPreset("vencido");
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Conformidade documental"
          value={`${conformidadeDocumental.percentual.toFixed(0)}%`}
          sub={`${conformidadeDocumental.conferidos}/${conformidadeDocumental.totalObrigatorios} anexos obrigatórios conferidos`}
          icon={ShieldCheck}
          tone={conformidadeDocumental.pendentes > 0 ? "warning" : "success"}
          to="/documentos"
          onNavigate={() => {
            setSelectedEmpresaId(null);
            setDocumentosSituacaoPreset(null);
          }}
        />
        <KpiCard
          label="ASOs cadastrados"
          value={totalAsos}
          sub="Atestados de Saúde Ocupacional"
          icon={FileBadge}
          tone="primary"
          to="/esocial"
          onNavigate={() => {
            setSelectedEmpresaId(null);
            setAsosSituacaoPreset(null);
          }}
        />
        <KpiCard
          label="ASOs vencidos"
          value={asosVencidos}
          sub="Renovação necessária"
          icon={AlertTriangle}
          tone={asosVencidos > 0 ? "warning" : "success"}
          to="/esocial"
          onNavigate={() => {
            setSelectedEmpresaId(null);
            setAsosSituacaoPreset("vencido");
          }}
        />
        <KpiCard
          label="Eventos eSocial lançados"
          value={eventosLancados}
          sub="S-2210, S-2220, S-2240, S-2221"
          icon={Send}
          tone="info"
          to="/esocial"
          onNavigate={() => {
            setSelectedEmpresaId(null);
            setAsosSituacaoPreset(null);
          }}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-elegant">
          <header className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">Documentos por tipo</h2>
              <p className="text-xs text-muted-foreground">Distribuição da carteira documental</p>
            </div>
          </header>
          {isLoading ? (
            <ChartSkeleton h="h-72" />
          ) : tiposData.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-8 text-center text-sm text-muted-foreground">
              Sem documentos cadastrados.
            </div>
          ) : (
            <Suspense fallback={<ChartSkeleton h="h-72" />}>
              <TiposChart data={tiposData} />
            </Suspense>
          )}
        </section>

        <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-elegant">
          <header className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">Status geral</h2>
              <p className="text-xs text-muted-foreground">
                Conformidade: {conformidade.toFixed(0)}%
              </p>
            </div>
            <ShieldCheck className="h-5 w-5 text-success" />
          </header>
          {statusPie.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-8 text-center text-sm text-muted-foreground">
              Sem dados.
            </div>
          ) : (
            <Suspense fallback={<ChartSkeleton h="h-64" />}>
              <StatusPieChart data={statusPie} />
            </Suspense>
          )}
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-elegant">
          <header className="mb-4 flex flex-col gap-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Elaboração Mensal de Documentos
                </h2>
                <p className="text-xs text-muted-foreground">
                  Total elaborado por mês em {selectedYear}
                  {selectedTipo !== "todos" && ` · ${tipoLabel(selectedTipo)}`}
                  {selectedSituacao !== "todas" && ` · ${situacaoLabel(selectedSituacao)}`}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                aria-label="Filtrar por ano"
              >
                {anosDisponiveis.map((ano) => (
                  <option key={ano} value={ano}>
                    {ano}
                  </option>
                ))}
              </select>
              <select
                value={selectedTipo}
                onChange={(e) => setSelectedTipo(e.target.value)}
                className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                aria-label="Filtrar por tipo de documento"
              >
                <option value="todos">Todos os tipos</option>
                {DOC_TIPOS_ORDENADOS.map((t) => (
                  <option key={t} value={t}>
                    {tipoLabel(t)}
                  </option>
                ))}
              </select>
              <select
                value={selectedSituacao}
                onChange={(e) => setSelectedSituacao(e.target.value)}
                className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                aria-label="Filtrar por situação"
              >
                <option value="todas">Todas as situações</option>
                <option value="em_dia">Em dia</option>
                <option value="concluido">Concluído</option>
                <option value="proximo_vencimento">Próx. vencimento</option>
                <option value="vencido">Vencido</option>
                <option value="pendente">Indeterminado</option>
              </select>
            </div>
          </header>
          {isLoading ? (
            <ChartSkeleton h="h-60" />
          ) : elaboracaoMensal.every((m) => m.qtd === 0) ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-8 text-center text-sm text-muted-foreground">
              Nenhum documento elaborado em {selectedYear}.
            </div>
          ) : (
            <Suspense fallback={<ChartSkeleton h="h-60" />}>
              <ElaboracaoMensalChart data={elaboracaoMensal} />
            </Suspense>
          )}
        </section>

        <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-elegant">
          <header className="mb-4">
            <h2 className="text-base font-bold text-foreground">Empresas por contabilidade</h2>
            <p className="text-xs text-muted-foreground">Carteira por parceiro contábil</p>
          </header>
          {contabData.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-8 text-center text-sm text-muted-foreground">
              Sem contabilidades cadastradas.
            </div>
          ) : (
            <Suspense fallback={<ChartSkeleton h="h-60" />}>
              <ContabChart data={contabData} />
            </Suspense>
          )}
        </section>
      </div>

      <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-elegant">
        <header className="mb-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-foreground">Empresas concluídas por mês</h2>
              <p className="text-xs text-muted-foreground">
                Empresas com documentação 100% em dia (incluindo conferências) em {concAno}
                {concContab !== "todas" &&
                  ` · ${contabilidades.find((c) => c.id === concContab)?.nome ?? ""}`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={concAno}
              onChange={(e) => setConcAno(Number(e.target.value))}
              className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              aria-label="Filtrar por ano"
            >
              {anosConclusao.map((ano) => (
                <option key={ano} value={ano}>
                  {ano}
                </option>
              ))}
            </select>
            <select
              value={concMes}
              onChange={(e) => setConcMes(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              aria-label="Filtrar por mês"
            >
              <option value="todos">Todos os meses</option>
              {[
                "Janeiro",
                "Fevereiro",
                "Março",
                "Abril",
                "Maio",
                "Junho",
                "Julho",
                "Agosto",
                "Setembro",
                "Outubro",
                "Novembro",
                "Dezembro",
              ].map((m, i) => (
                <option key={m} value={String(i)}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={concContab}
              onChange={(e) => setConcContab(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              aria-label="Filtrar por contabilidade"
            >
              <option value="todas">Todas contabilidades</option>
              {contabilidades.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
        </header>
        {isLoading ? (
          <ChartSkeleton h="h-64" />
        ) : empresasConcluidasMensal.every((m) => m.qtd === 0) ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-8 text-center text-sm text-muted-foreground">
            Nenhuma empresa concluída em {concAno}.
          </div>
        ) : (
          <Suspense fallback={<ChartSkeleton h="h-64" />}>
            <EmpresasConcluidasChart data={empresasConcluidasMensal} />
          </Suspense>
        )}
      </section>

      <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-elegant">
        <header className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">Próximos vencimentos</h2>
            <p className="text-xs text-muted-foreground">Documentos que requerem ação</p>
          </div>
        </header>
        {/* Desktop table */}
        <div className="-mx-5 hidden overflow-x-auto px-5 lg:block">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="pb-3 pr-3">Empresa</th>
                <th className="pb-3 pr-3">Documento</th>
                <th className="pb-3 pr-3">Situação</th>
                <th className="pb-3 pr-3">Vencimento</th>
                <th className="pb-3">Dias restantes</th>
              </tr>
            </thead>
            <tbody>
              {proximosVenc.map((d) => (
                <tr key={d.id} className="border-t border-border/60">
                  <td className="py-3 pr-3 font-semibold text-foreground">{d.empresa}</td>
                  <td className="py-3 pr-3 text-muted-foreground">{d.titulo ?? d.tipo}</td>
                  <td className="py-3 pr-3">
                    <StatusBadge status={d.situacao} />
                  </td>
                  <td className="py-3 pr-3 text-muted-foreground">
                    {format(parseLocalDate(d.data_vencimento)!, "dd/MM/yyyy")}
                  </td>
                  <td className="py-3">
                    <span
                      className={`text-xs font-extrabold ${d.dias <= 30 ? "text-warning-foreground" : d.dias <= 60 ? "text-info" : "text-success"}`}
                    >
                      {d.dias === 0
                        ? "vence hoje"
                        : `${d.dias} ${d.dias === 1 ? "dia" : "dias"} restantes`}
                    </span>
                  </td>
                </tr>
              ))}
              {proximosVenc.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-muted-foreground">
                    Sem vencimentos próximos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile card view */}
        <div className="flex flex-col gap-2 lg:hidden">
          {proximosVenc.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Sem vencimentos próximos.
            </p>
          ) : (
            proximosVenc.map((d) => (
              <div key={d.id} className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-semibold text-foreground">
                    {d.empresa}
                  </p>
                  <StatusBadge status={d.situacao} />
                </div>
                <p className="truncate text-xs text-muted-foreground">{d.titulo ?? d.tipo}</p>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {format(parseLocalDate(d.data_vencimento)!, "dd/MM/yyyy")}
                  </span>
                  <span
                    className={`font-extrabold ${d.dias <= 30 ? "text-warning-foreground" : d.dias <= 60 ? "text-info" : "text-success"}`}
                  >
                    {d.dias === 0
                      ? "vence hoje"
                      : `${d.dias} ${d.dias === 1 ? "dia" : "dias"} restantes`}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
