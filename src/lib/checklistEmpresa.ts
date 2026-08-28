import { daysFromToday } from "./dateUtils";

export type ChecklistStatus =
  | "cadastrado"
  | "proximo_vencimento"
  | "vencido"
  | "pendente"
  | "isento"
  | "opcional";

export type IsencaoCampo = "isencao_pgr" | "isencao_pcmso" | "isencao_ficha_epi";

export type ChecklistRequisito = {
  /** Identificador estável do requisito. */
  id: string;
  /** Rótulo amigável (ex.: "LTCAT", "PGR ou PGRTR", "Ficha de EPI"). */
  label: string;
  /** Requisito atendido (cadastrado válido, isento ou opcional)? */
  ok: boolean;
  /** Status visual do item. */
  status: ChecklistStatus;
  /** Motivo da pendência, quando `ok=false`. */
  motivo?: "ausente" | "anexo_pendente" | "vencido";
  /** Detalhe textual (qual anexo está pendente, etc.). */
  detalhe?: string;
  /** Campo de isenção individual em `empresas`, quando o documento é isentável. */
  isencaoCampo?: IsencaoCampo;
  /** Documento cadastrado ao qual a conferência de anexo se aplica. */
  conferenciaDocId?: string;
  /** Item conferido (ART, Declaração, Registro Profissional). */
  conferenciaItem?: string;
  /** Conferência já marcada? */
  conferenciaOk?: boolean;
};

export type EmpresaChecklist = {
  pronta: boolean;
  requisitos: ChecklistRequisito[];
  /** Apenas requisitos não atendidos (pendentes). */
  faltando: ChecklistRequisito[];
  /** Empresa marcada como simplificada (equivale à isenção de PGR/PGRTR, PCMSO e Ficha de EPI). */
  simplificada: boolean;
};

export type DocChecklist = {
  id?: string;
  tipo: string;
  conferencia_ok?: boolean | null;
  data_vencimento?: string | null;
  situacao?: string | null;
};

export type EmpresaChecklistFlags = {
  isencao_simplificada?: boolean | null;
  isencao_pgr?: boolean | null;
  isencao_pcmso?: boolean | null;
  isencao_ficha_epi?: boolean | null;
};

/** Tipos sem controle de validade — nunca entram como vencidos/próximos. */
const TIPOS_SEM_VALIDADE = new Set(["LTCAT", "LTI", "LTP", "FICHA_EPI", "OS_SST", "PPP"]);

function isVencido(doc: DocChecklist): boolean {
  if (TIPOS_SEM_VALIDADE.has(doc.tipo)) return false;
  if (doc.situacao === "vencido") return true;
  const dias = daysFromToday(doc.data_vencimento);
  return dias !== null && dias < 0;
}

function isProximo(doc: DocChecklist): boolean {
  if (TIPOS_SEM_VALIDADE.has(doc.tipo)) return false;
  const dias = daysFromToday(doc.data_vencimento);
  return dias !== null && dias >= 0 && dias <= 30;
}

type AvaliacaoArgs = {
  id: string;
  label: string;
  docs: DocChecklist[];
  /** Exige conferência de anexo (ART/Declaração/Registro Profissional). */
  exigeConferencia?: boolean;
  /** Nome do item conferido (ART, Declaração, Registro Profissional). */
  itemConferencia?: string;
  /** Detalhe exibido quando a conferência está pendente. */
  detalheConferencia?: string;
  /** Isenção aplicável (individual ou via empresa simplificada). */
  isento?: boolean;
  isencaoCampo?: IsencaoCampo;
};

function avaliar(args: AvaliacaoArgs): ChecklistRequisito {
  const {
    id,
    label,
    docs,
    exigeConferencia,
    itemConferencia,
    detalheConferencia,
    isento,
    isencaoCampo,
  } = args;

  if (docs.length === 0) {
    if (isento)
      return { id, label, ok: true, status: "isento", detalhe: "Isenção marcada", isencaoCampo };
    return {
      id,
      label,
      ok: false,
      status: "pendente",
      motivo: "ausente",
      detalhe: "Documento não cadastrado",
      isencaoCampo,
    };
  }

  const validos = docs.filter((d) => !isVencido(d));
  if (validos.length === 0) {
    return {
      id,
      label,
      ok: false,
      status: "vencido",
      motivo: "vencido",
      detalhe: "Documento vencido — renovar",
      isencaoCampo,
    };
  }

  // Documento de referência para a conferência de anexo: o já conferido, se houver.
  const docConferencia = exigeConferencia
    ? (validos.find((d) => Boolean(d.conferencia_ok)) ?? validos[0])
    : undefined;
  const extraConf = docConferencia
    ? {
        conferenciaDocId: docConferencia.id,
        conferenciaItem: itemConferencia,
        conferenciaOk: Boolean(docConferencia.conferencia_ok),
      }
    : {};

  if (exigeConferencia && !validos.some((d) => Boolean(d.conferencia_ok))) {
    return {
      id,
      label,
      ok: false,
      status: "pendente",
      motivo: "anexo_pendente",
      detalhe: detalheConferencia,
      isencaoCampo,
      ...extraConf,
    };
  }

  if (validos.some(isProximo)) {
    return {
      id,
      label,
      ok: true,
      status: "proximo_vencimento",
      detalhe: "Vence em até 30 dias",
      isencaoCampo,
      ...extraConf,
    };
  }

  return { id, label, ok: true, status: "cadastrado", isencaoCampo, ...extraConf };
}

function avaliarOpcional(id: string, label: string, docs: DocChecklist[]): ChecklistRequisito {
  if (docs.length === 0) {
    return {
      id,
      label,
      ok: true,
      status: "opcional",
      detalhe: "Documento opcional — não cadastrado",
    };
  }
  const docConf = docs.find((d) => Boolean(d.conferencia_ok)) ?? docs[0];
  const extraConf = {
    conferenciaDocId: docConf?.id,
    conferenciaItem: "ART",
    conferenciaOk: Boolean(docConf?.conferencia_ok),
  };
  if (docs.some(isProximo)) {
    return {
      id,
      label,
      ok: true,
      status: "proximo_vencimento",
      detalhe: "Vence em até 30 dias",
      ...extraConf,
    };
  }
  return { id, label, ok: true, status: "cadastrado", ...extraConf };
}

/**
 * Calcula a situação documental da empresa, documento a documento.
 *
 * Regras:
 *  - Sempre obrigatórios: LTCAT (com ART conferida), AEP e Ordem de Serviço.
 *  - Obrigatórios salvo isenção individual: PGR ou PGRTR (Registro
 *    Profissional conferido), PCMSO (Declaração conferida) e Ficha de EPI.
 *    A "empresa simplificada" equivale à isenção dos três.
 *  - Opcionais: LTI e LTP — a ausência nunca gera pendência.
 *  - Documento obrigatório vencido conta como pendência.
 */
export function computarChecklistEmpresa(
  empresa: EmpresaChecklistFlags,
  documentos: DocChecklist[],
): EmpresaChecklist {
  const simplificada = Boolean(empresa.isencao_simplificada);
  const porTipo = (tipos: string[]) => documentos.filter((d) => tipos.includes(d.tipo));

  const docsPgr = porTipo(["PGR", "PGRTR"]);
  const labelPgr = docsPgr.some((d) => d.tipo === "PGR")
    ? "PGR"
    : docsPgr.some((d) => d.tipo === "PGRTR")
      ? "PGRTR"
      : "PGR ou PGRTR";

  const requisitos: ChecklistRequisito[] = [
    avaliar({
      id: "LTCAT",
      label: "LTCAT",
      docs: porTipo(["LTCAT"]),
      exigeConferencia: true,
      itemConferencia: "ART",
      detalheConferencia: "ART não conferida",
    }),
    avaliar({ id: "AEP", label: "AEP", docs: porTipo(["AEP"]) }),
    avaliar({ id: "OS_SST", label: "Ordem de Serviço", docs: porTipo(["OS_SST"]) }),
    avaliar({
      id: "PGR_PGRTR",
      label: labelPgr,
      docs: docsPgr,
      exigeConferencia: true,
      itemConferencia: "Registro Profissional",
      detalheConferencia: "Registro Profissional não conferido",

      isento: simplificada || Boolean(empresa.isencao_pgr),
      isencaoCampo: "isencao_pgr",
    }),
    avaliar({
      id: "PCMSO",
      label: "PCMSO",
      docs: porTipo(["PCMSO"]),
      exigeConferencia: true,
      itemConferencia: "Declaração",
      detalheConferencia: "Declaração não conferida",

      isento: simplificada || Boolean(empresa.isencao_pcmso),
      isencaoCampo: "isencao_pcmso",
    }),
    avaliar({
      id: "FICHA_EPI",
      label: "Ficha de EPI",
      docs: porTipo(["FICHA_EPI"]),
      isento: simplificada || Boolean(empresa.isencao_ficha_epi),
      isencaoCampo: "isencao_ficha_epi",
    }),
    avaliarOpcional("LTI", "LTI (opcional)", porTipo(["LTI"])),
    avaliarOpcional("LTP", "LTP (opcional)", porTipo(["LTP"])),
  ];

  const faltando = requisitos.filter((r) => !r.ok);
  return { pronta: faltando.length === 0, requisitos, faltando, simplificada };
}

export function motivoLabel(motivo: ChecklistRequisito["motivo"]): string {
  if (motivo === "ausente") return "Documento ausente";
  if (motivo === "anexo_pendente") return "Anexo/conferência pendente";
  if (motivo === "vencido") return "Documento vencido";
  return "—";
}

/** Rótulo e classes visuais de cada status do checklist (sempre com texto, não só cor). */
export const CHECKLIST_STATUS_META: Record<ChecklistStatus, { label: string; cls: string }> = {
  cadastrado: { label: "Cadastrado", cls: "bg-success/15 text-success" },
  proximo_vencimento: {
    label: "Próximo do vencimento",
    cls: "bg-warning/30 text-warning-foreground",
  },
  vencido: { label: "Vencido", cls: "bg-destructive/15 text-destructive" },
  pendente: { label: "Pendente", cls: "bg-destructive/15 text-destructive" },
  isento: { label: "Isento", cls: "bg-info/15 text-info" },
  opcional: { label: "Opcional — não cadastrado", cls: "bg-muted text-muted-foreground" },
};
