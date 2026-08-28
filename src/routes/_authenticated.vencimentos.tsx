import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarClock, AlertTriangle, CheckCircle2, Clock, HelpCircle } from "lucide-react";
import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { PageHero } from "@/components/PageHero";
import { StatusBadge } from "@/components/StatusBadge";
import { getSelectedEmpresaId, setSelectedEmpresaId } from "@/lib/companyContext";
import { parseLocalDate, daysFromToday } from "@/lib/dateUtils";
import { tipoLabel, DOC_TIPOS_ORDENADOS } from "@/lib/documentoLabels";

export const Route = createFileRoute("/_authenticated/vencimentos")({
  component: VencimentosPage,
});

function VencimentosPage() {
  const [empresaFiltro, setEmpresaFiltro] = useState(() => getSelectedEmpresaId() ?? "todas");
  const [contabFiltro, setContabFiltro] = useState<string>("todas");
  const [tipoFiltro, setTipoFiltro] = useState<string>("todos");
  const [situacaoFiltro, setSituacaoFiltro] = useState<string>("todas");

  const { data, isLoading } = useQuery({
    queryKey: ["vencimentos"],
    queryFn: async () => {
      const [docsRes, empRes, contabRes] = await Promise.all([
        supabase.from("documentos_sst").select("*").order("data_vencimento", { nullsFirst: false }),
        supabase.from("empresas").select("id,nome,contabilidade_id"),
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

  const empresas = data?.empresas ?? [];
  const contabilidades = data?.contabilidades ?? [];
  const empresaMap = new Map(empresas.map((e) => [e.id, e]));
  const empresasFiltradas = empresas.filter(
    (e) => contabFiltro === "todas" || e.contabilidade_id === contabFiltro,
  );

  const docsBase = (data?.documentos ?? []).filter((doc) => {
    const empresa = empresaMap.get(doc.empresa_id);
    if (contabFiltro !== "todas" && empresa?.contabilidade_id !== contabFiltro) return false;
    if (empresaFiltro !== "todas" && doc.empresa_id !== empresaFiltro) return false;
    if (tipoFiltro !== "todos" && doc.tipo !== tipoFiltro) return false;
    return true;
  });

  const enriched = docsBase.map((d) => ({
    ...d,
    empresa: empresaMap.get(d.empresa_id)?.nome ?? "—",
    dias: daysFromToday(d.data_vencimento),
  }));

  // Buckets por situação calculada
  const indeterminados = enriched.filter((d) => d.dias === null);
  const vencidos = enriched.filter((d) => d.dias !== null && d.dias < 0);
  const urgentes = enriched.filter((d) => d.dias !== null && d.dias >= 0 && d.dias <= 30);
  const proximos = enriched.filter((d) => d.dias !== null && d.dias > 30 && d.dias <= 90);
  const emDia = enriched.filter((d) => d.dias !== null && d.dias > 90);

  // Aplica filtro de situação às seções
  const showSit = (key: string) => situacaoFiltro === "todas" || situacaoFiltro === key;

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title="Gestão de vencimentos"
        subtitle="Acompanhe prazos de PGR, PCMSO, LTCAT e demais documentos SST. Atue antes do vencimento e mantenha conformidade."
      />

      <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-elegant">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <select
            value={contabFiltro}
            onChange={(e) => {
              setContabFiltro(e.target.value);
              setEmpresaFiltro("todas");
            }}
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
          >
            <option value="todas">Todas as contabilidades</option>
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
            {empresasFiltradas.map((empresa) => (
              <option key={empresa.id} value={empresa.id}>
                {empresa.nome}
              </option>
            ))}
          </select>
          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value)}
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
            value={situacaoFiltro}
            onChange={(e) => setSituacaoFiltro(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
          >
            <option value="todas">Todas as situações</option>
            <option value="vencidos">Vencidos</option>
            <option value="urgentes">Vencem em ≤ 30 dias</option>
            <option value="proximos">Vencem em 31–90 dias</option>
            <option value="em_dia">Em dia (&gt; 90 dias)</option>
            <option value="indeterminados">Indeterminados</option>
          </select>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Bucket
          icon={AlertTriangle}
          label="Vencidos"
          qtd={vencidos.length}
          cls="bg-destructive/12 text-destructive"
        />
        <Bucket
          icon={Clock}
          label="≤ 30 dias"
          qtd={urgentes.length}
          cls="bg-warning/30 text-warning-foreground"
        />
        <Bucket
          icon={CalendarClock}
          label="31–90 dias"
          qtd={proximos.length}
          cls="bg-info/12 text-info"
        />
        <Bucket
          icon={CheckCircle2}
          label="Em dia"
          qtd={emDia.length}
          cls="bg-success/12 text-success"
        />
        <Bucket
          icon={HelpCircle}
          label="Indeterminados"
          qtd={indeterminados.length}
          cls="bg-muted text-muted-foreground"
        />
      </div>

      {isLoading && <p className="text-center text-sm text-muted-foreground">Carregando…</p>}

      {showSit("vencidos") && (
        <BucketSection title="Vencidos — ação imediata" docs={vencidos} accent="destructive" />
      )}
      {showSit("urgentes") && (
        <BucketSection title="Vencem em até 30 dias" docs={urgentes} accent="warning" />
      )}
      {showSit("proximos") && (
        <BucketSection title="Vencem em 31 a 90 dias" docs={proximos} accent="info" />
      )}
      {showSit("em_dia") && <BucketSection title="Em dia" docs={emDia} accent="info" />}
      {showSit("indeterminados") && <IndeterminadosSection docs={indeterminados} />}
    </div>
  );
}

function Bucket({
  icon: Icon,
  label,
  qtd,
  cls,
}: {
  icon: typeof CalendarClock;
  label: string;
  qtd: number;
  cls: string;
}) {
  return (
    <div className={`rounded-3xl border border-border/60 p-5 shadow-elegant ${cls}`}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide opacity-80">{label}</p>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-3xl font-extrabold">{qtd}</p>
      <p className="mt-1 text-xs opacity-70">documento{qtd !== 1 && "s"}</p>
    </div>
  );
}

type DocItem = {
  id: string;
  empresa: string;
  tipo: string;
  titulo: string | null;
  data_vencimento: string | null;
  situacao: string;
  dias: number | null;
};

function BucketSection({
  title,
  docs,
  accent,
}: {
  title: string;
  docs: DocItem[];
  accent: "destructive" | "warning" | "info";
}) {
  if (docs.length === 0) return null;
  const accentCls = {
    destructive: "border-l-destructive",
    warning: "border-l-warning",
    info: "border-l-info",
  }[accent];

  return (
    <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-elegant">
      <h2 className="mb-4 text-base font-bold text-foreground">
        {title}{" "}
        <span className="ml-2 text-xs font-normal text-muted-foreground">({docs.length})</span>
      </h2>
      <div className="flex flex-col gap-2">
        {docs.map((d) => (
          <div
            key={d.id}
            className={`grid grid-cols-1 gap-3 rounded-2xl border-l-4 bg-muted/30 p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center ${accentCls}`}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground">
                {d.titulo ?? d.tipo.replace("_", "-")}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {d.empresa} · {d.tipo.replace("_", "-")}
              </p>
            </div>
            <div className="flex flex-col sm:items-end">
              <p className="text-xs text-muted-foreground">
                {d.data_vencimento
                  ? format(parseLocalDate(d.data_vencimento)!, "dd 'de' MMM yyyy", { locale: ptBR })
                  : "—"}
              </p>
              <p
                className={`text-sm font-extrabold ${d.dias === null ? "text-muted-foreground" : d.dias < 0 ? "text-destructive" : d.dias <= 30 ? "text-warning-foreground" : "text-info"}`}
              >
                {d.dias === null
                  ? "indeterminado"
                  : d.dias < 0
                    ? `${Math.abs(d.dias)} dias em atraso`
                    : `em ${d.dias} dias`}
              </p>
            </div>
            <div className="justify-self-start sm:justify-self-end">
              <StatusBadge status={d.situacao} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function IndeterminadosSection({ docs }: { docs: DocItem[] }) {
  if (docs.length === 0) return null;
  return (
    <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-elegant">
      <h2 className="mb-4 text-base font-bold text-foreground">
        Validade indeterminada{" "}
        <span className="ml-2 text-xs font-normal text-muted-foreground">({docs.length})</span>
      </h2>
      <div className="flex flex-col gap-2">
        {docs.map((d) => (
          <div
            key={d.id}
            className="grid grid-cols-1 gap-3 rounded-2xl border-l-4 border-l-muted-foreground/40 bg-muted/30 p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground">
                {d.titulo ?? d.tipo.replace("_", "-")}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {d.empresa} · {d.tipo.replace("_", "-")}
              </p>
            </div>
            <p className="text-xs text-muted-foreground sm:text-right">Sem prazo definido</p>
            <div className="justify-self-start sm:justify-self-end">
              <StatusBadge status={d.situacao} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
