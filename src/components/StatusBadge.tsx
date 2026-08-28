type Situacao = "em_dia" | "proximo_vencimento" | "vencido" | "pendente" | "concluido";
type EmpresaStatus = "ativa" | "inativa" | "suspensa" | "prospect";
type EventoStatus = "pendente" | "enviado" | "retificado" | "rejeitado";

type AnyStatus = Situacao | EmpresaStatus | EventoStatus | string;

const map: Record<string, { label: string; cls: string }> = {
  em_dia: { label: "Em dia", cls: "bg-success/15 text-success" },
  proximo_vencimento: { label: "Próx. vencimento", cls: "bg-warning/30 text-warning-foreground" },
  vencido: { label: "Vencido", cls: "bg-destructive/15 text-destructive" },
  pendente: { label: "Indeterminado", cls: "bg-muted text-muted-foreground" },
  indeterminado: { label: "Indeterminado", cls: "bg-muted text-muted-foreground" },
  concluido: { label: "Concluído", cls: "bg-primary/15 text-primary" },
  regularizado: { label: "Regularizado", cls: "bg-success/15 text-success" },
  parcialmente_regular: {
    label: "Parcialmente regular",
    cls: "bg-warning/30 text-warning-foreground",
  },
  pendente_anexos: {
    label: "Pendente de conferência",
    cls: "bg-warning/30 text-warning-foreground",
  },
  ativa: { label: "Ativa", cls: "bg-success/15 text-success" },
  inativa: { label: "Inativa", cls: "bg-muted text-muted-foreground" },
  suspensa: { label: "Suspensa", cls: "bg-warning/30 text-warning-foreground" },
  prospect: { label: "Prospect", cls: "bg-info/15 text-info" },
  enviado: { label: "Enviado", cls: "bg-success/15 text-success" },
  nao_enviado: { label: "Não enviado", cls: "bg-warning/20 text-warning-foreground" },
  retificado: { label: "Retificado", cls: "bg-warning/30 text-warning-foreground" },
  rejeitado: { label: "Rejeitado", cls: "bg-destructive/15 text-destructive" },
};

export function StatusBadge({ status }: { status: AnyStatus }) {
  const info = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${info.cls}`}
    >
      {info.label}
    </span>
  );
}
