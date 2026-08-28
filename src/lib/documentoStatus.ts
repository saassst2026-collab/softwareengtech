import { daysFromToday } from "./dateUtils";

export type RegularizacaoStatus =
  | "regularizado"
  | "em_dia"
  | "parcialmente_regular"
  | "pendente_anexos"
  | "vencido"
  | "indeterminado";

export type DocumentoBase = {
  id: string;
  tipo: string;
  data_vencimento: string | null;
  data_conclusao?: string | null;
  conferencia_ok?: boolean | null;
};

/** Documentos que exigem conferência manual de anexo/registro complementar. */
export const TIPOS_EXIGEM_CONFERENCIA = new Set(["PGR", "PGRTR", "PCMSO", "LTCAT", "LTI", "LTP"]);

/** Pergunta exibida ao usuário no toggle de conferência, por tipo. */
export const CONFERENCIA_LABELS: Record<string, string> = {
  PGR: "Registro Profissional conferido?",
  PGRTR: "Registro Profissional conferido?",
  PCMSO: "Declaração conferida?",
  LTCAT: "ART conferida?",
  LTI: "ART conferida?",
  LTP: "ART conferida?",
};

export const CONFERENCIA_ITEM_LABELS: Record<string, string> = {
  PGR: "Registro Profissional",
  PGRTR: "Registro Profissional",
  PCMSO: "Declaração",
  LTCAT: "ART",
  LTI: "ART",
  LTP: "ART",
};

export function conferenciaItemLabel(tipo: string) {
  return CONFERENCIA_ITEM_LABELS[tipo] ?? "Anexo obrigatório";
}

export function tipoExigeConferencia(tipo: string) {
  return TIPOS_EXIGEM_CONFERENCIA.has(tipo);
}

export function conferenciaLabel(tipo: string) {
  return CONFERENCIA_LABELS[tipo] ?? "Conferência/anexo finalizado?";
}

export function computarStatusRegularizacao(doc: DocumentoBase): RegularizacaoStatus {
  const dias = daysFromToday(doc.data_vencimento);
  const vencido = dias !== null && dias < 0;
  if (vencido) return "vencido";

  const exige = tipoExigeConferencia(doc.tipo);

  if (exige) {
    if (!doc.conferencia_ok) return "pendente_anexos";
    if (doc.data_vencimento || doc.data_conclusao) return "regularizado";
    return "indeterminado";
  }

  // Demais tipos (Ficha de EPI, OS, AET, AEP, PPP, Treinamentos, ASO, etc.)
  // não usam conferência/anexo: a situação depende apenas da validade.
  if (doc.data_vencimento) return "em_dia";
  return "indeterminado";
}

export const STATUS_REG_LABEL: Record<RegularizacaoStatus, string> = {
  regularizado: "Regularizado",
  em_dia: "Em dia",
  parcialmente_regular: "Parcialmente regular",
  pendente_anexos: "Pendente de conferência",
  vencido: "Vencido",
  indeterminado: "Indeterminado",
};

export const STATUS_REG_CLASS: Record<RegularizacaoStatus, string> = {
  regularizado: "bg-success/15 text-success",
  em_dia: "bg-success/15 text-success",
  parcialmente_regular: "bg-warning/30 text-warning-foreground",
  pendente_anexos: "bg-warning/30 text-warning-foreground",
  vencido: "bg-destructive/15 text-destructive",
  indeterminado: "bg-muted text-muted-foreground",
};
