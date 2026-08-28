import { computarConformidade } from "@/lib/conformidade";
import { parseLocalDate, daysFromToday } from "@/lib/dateUtils";
import { tipoLabel } from "@/lib/documentoLabels";

// LTI e LTP são opcionais — a ausência nunca gera pendência ou alerta.
const DOCS_OBRIGATORIOS = ["PGR", "PCMSO", "LTCAT"];

export type StatusEmpresa = "critico" | "atencao" | "regular" | "conforme";

export interface DiagnosticoInput {
  documentos: Array<{
    id: string;
    tipo: string;
    situacao?: string | null;
    data_vencimento: string | null;
    data_conclusao?: string | null;
    conferencia_ok?: boolean | null;
  }>;
  asos: Array<{ id: string; data_aso: string | null; tipo_aso?: string | null }>;
  eventos: Array<{ id: string; status: string }>;
  tarefas: Array<{ id: string; status: string; prazo: string | null }>;
  propostas: Array<{ id: string; status: string }>;
}

export interface Recomendacao {
  prioridade: "urgente" | "alta" | "media" | "baixa";
  texto: string;
}

export interface DiagnosticoResultado {
  status: StatusEmpresa;
  percentualConformidade: number;
  documentos: {
    total: number;
    vencidos: number;
    proximos: number; // ≤ 60 dias
    ausentes: string[]; // tipos obrigatórios em falta
  };
  asos: { total: number; vencidos: number };
  eventos: { pendentes: number };
  tarefas: { abertas: number; vencidas: number };
  propostas: { total: number; rascunho: number };
  recomendacoes: Recomendacao[];
  pendenciasTop: string[];
}

export function gerarDiagnostico(input: DiagnosticoInput): DiagnosticoResultado {
  const conf = computarConformidade(input.documentos as any);

  // ASOs vencidos (>365 dias da data_aso, exceto demissional)
  const asosVencidos = input.asos.filter((a) => {
    if (!a.data_aso || a.tipo_aso === "demissional") return false;
    const dt = parseLocalDate(a.data_aso);
    if (!dt) return false;
    dt.setDate(dt.getDate() + 365);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    dt.setHours(0, 0, 0, 0);
    return dt.getTime() < hoje.getTime();
  }).length;

  // Documentos próximos / vencidos
  let vencidos = 0;
  let proximos = 0;
  input.documentos.forEach((d) => {
    if (!d.data_vencimento) return;
    const dias = daysFromToday(d.data_vencimento);
    if (dias === null) return;
    if (dias < 0) vencidos++;
    else if (dias <= 60) proximos++;
  });

  // Tipos obrigatórios ausentes
  const tiposExistentes = new Set(input.documentos.map((d) => d.tipo));
  const ausentes = DOCS_OBRIGATORIOS.filter((t) => !tiposExistentes.has(t));

  const tarefasAbertas = input.tarefas.filter(
    (t) => t.status !== "concluido" && t.status !== "cancelado",
  ).length;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const tarefasVencidas = input.tarefas.filter((t) => {
    if (t.status === "concluido" || t.status === "cancelado" || !t.prazo) return false;
    const d = parseLocalDate(t.prazo);
    return d ? d.getTime() < hoje.getTime() : false;
  }).length;

  const eventosPendentes = input.eventos.filter((e) => e.status === "pendente").length;
  const propostasRascunho = input.propostas.filter((p) => p.status === "rascunho").length;

  // Recomendações
  const rec: Recomendacao[] = [];
  ausentes.forEach((t) => {
    rec.push({
      prioridade: t === "PGR" || t === "PCMSO" ? "urgente" : "alta",
      texto: `Elaborar o documento ${tipoLabel(t)} (não cadastrado).`,
    });
  });
  if (vencidos > 0)
    rec.push({ prioridade: "urgente", texto: `Regularizar ${vencidos} documento(s) vencido(s).` });
  if (proximos > 0)
    rec.push({
      prioridade: "alta",
      texto: `Renovar ${proximos} documento(s) próximo(s) do vencimento (≤ 60 dias).`,
    });
  if (asosVencidos > 0)
    rec.push({ prioridade: "alta", texto: `Renovar ${asosVencidos} ASO(s) vencido(s).` });
  if (eventosPendentes > 0)
    rec.push({
      prioridade: "media",
      texto: `Lançar ${eventosPendentes} evento(s) do eSocial pendente(s).`,
    });
  if (tarefasVencidas > 0)
    rec.push({ prioridade: "alta", texto: `Concluir ${tarefasVencidas} tarefa(s) vencida(s).` });
  if (rec.length === 0)
    rec.push({
      prioridade: "baixa",
      texto: "Empresa em conformidade — manter monitoramento periódico.",
    });

  // Pendências top (resumo curto)
  const pendenciasTop: string[] = [];
  if (vencidos > 0) pendenciasTop.push(`${vencidos} documento(s) vencido(s)`);
  if (proximos > 0) pendenciasTop.push(`${proximos} próximo(s) do vencimento`);
  if (ausentes.length > 0) pendenciasTop.push(`Faltam: ${ausentes.map(tipoLabel).join(", ")}`);
  if (asosVencidos > 0) pendenciasTop.push(`${asosVencidos} ASO(s) vencido(s)`);
  if (eventosPendentes > 0) pendenciasTop.push(`${eventosPendentes} evento(s) eSocial pendente(s)`);
  if (tarefasVencidas > 0) pendenciasTop.push(`${tarefasVencidas} tarefa(s) vencida(s)`);

  // Status
  let status: StatusEmpresa = "conforme";
  if (vencidos > 0 || ausentes.length >= 2 || asosVencidos > 2) status = "critico";
  else if (proximos > 0 || ausentes.length === 1 || tarefasVencidas > 0 || eventosPendentes > 0)
    status = "atencao";
  else if (conf.percentual < 100) status = "regular";

  return {
    status,
    percentualConformidade: conf.percentual,
    documentos: { total: conf.total, vencidos, proximos, ausentes },
    asos: { total: input.asos.length, vencidos: asosVencidos },
    eventos: { pendentes: eventosPendentes },
    tarefas: { abertas: tarefasAbertas, vencidas: tarefasVencidas },
    propostas: { total: input.propostas.length, rascunho: propostasRascunho },
    recomendacoes: rec.slice(0, 8),
    pendenciasTop: pendenciasTop.slice(0, 5),
  };
}

export const STATUS_META: Record<
  StatusEmpresa,
  { label: string; bg: string; text: string; ring: string }
> = {
  critico: {
    label: "Crítico",
    bg: "bg-destructive/10",
    text: "text-destructive",
    ring: "ring-destructive/30",
  },
  atencao: {
    label: "Atenção",
    bg: "bg-warning/20",
    text: "text-warning-foreground",
    ring: "ring-warning/40",
  },
  regular: { label: "Regular", bg: "bg-info/10", text: "text-info", ring: "ring-info/30" },
  conforme: {
    label: "Conforme",
    bg: "bg-success/15",
    text: "text-success",
    ring: "ring-success/30",
  },
};
