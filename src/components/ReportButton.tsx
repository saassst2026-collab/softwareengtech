import { useState } from "react";
import { FileText } from "lucide-react";

import { RelatorioDialog, type RelatorioOpcao } from "@/components/RelatorioDialog";
import type { AuditModulo } from "@/lib/audit";

type Props = {
  /** Título exibido no modal. */
  titulo?: string;
  /** Módulo para o log de auditoria. */
  modulo: AuditModulo;
  /** Função executada ao abrir o modal para montar as opções com dados atuais. */
  getOpcoes: () => RelatorioOpcao[];
};

/**
 * Botão "Relatório" padronizado: aparece ao lado do botão principal de cadastro
 * de cada aba e abre o modal de geração de PDF.
 */
export function ReportButton({ titulo = "Gerar Relatório", modulo, getOpcoes }: Props) {
  const [open, setOpen] = useState(false);
  const [opcoes, setOpcoes] = useState<RelatorioOpcao[]>([]);

  const handleOpen = () => {
    setOpcoes(getOpcoes());
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-card px-4 py-2.5 text-sm font-bold text-primary shadow-sm transition hover:bg-primary/10"
      >
        <FileText className="h-4 w-4" /> Relatório
      </button>
      <RelatorioDialog
        open={open}
        onOpenChange={setOpen}
        titulo={titulo}
        modulo={modulo}
        opcoes={opcoes}
      />
    </>
  );
}
