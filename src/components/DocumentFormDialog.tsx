import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import {
  DOC_TIPOS_ORDENADOS,
  DOCUMENTOS_SEM_VALIDADE,
  getValidadePadraoDias,
  tipoLabel,
} from "@/lib/documentoLabels";
import { addDaysLocalIso, daysFromToday } from "@/lib/dateUtils";
import { getLastFormSelections, setLastFormSelections } from "@/lib/companyContext";
import { conferenciaLabel, tipoExigeConferencia } from "@/lib/documentoStatus";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type EmpresaOption = {
  id: string;
  nome: string;
  contabilidade_id?: string | null;
};

type ContabilidadeOption = {
  id: string;
  nome: string;
};

type DocumentoSituacao = "em_dia" | "proximo_vencimento" | "vencido" | "pendente" | "concluido";

type DocumentFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresas: EmpresaOption[];
  contabilidades: ContabilidadeOption[];
  preselectedEmpresaId?: string;
  editingDocument?: {
    id: string;
    empresa_id: string;
    tipo: string;
    data_conclusao: string | null;
    data_vencimento: string | null;
    situacao: DocumentoSituacao;
    observacoes: string | null;
    conferencia_ok?: boolean | null;
  } | null;
};

function calculateSituacao(vencimento: string): DocumentoSituacao {
  if (!vencimento) return "pendente";
  const dias = daysFromToday(vencimento) ?? 0;
  if (dias < 0) return "vencido";
  if (dias <= 60) return "proximo_vencimento";
  return "em_dia";
}

export function DocumentFormDialog({
  open,
  onOpenChange,
  empresas,
  contabilidades,
  preselectedEmpresaId,
  editingDocument,
}: DocumentFormDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [empresaId, setEmpresaId] = useState(preselectedEmpresaId ?? "");
  const [contabilidadeId, setContabilidadeId] = useState("");
  const [tipo, setTipo] = useState<string>(DOC_TIPOS_ORDENADOS[0]);
  const [dataConclusao, setDataConclusao] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");
  const [vencimentoManual, setVencimentoManual] = useState(false);
  const [situacaoManual, setSituacaoManual] = useState<DocumentoSituacao>("pendente");
  const [observacoes, setObservacoes] = useState("");
  const [conferenciaOk, setConferenciaOk] = useState(false);

  const isEditing = Boolean(editingDocument);

  useEffect(() => {
    if (open) {
      const last = getLastFormSelections();
      const initialEmpresaId =
        editingDocument?.empresa_id ??
        preselectedEmpresaId ??
        (last.empresaId && empresas.some((e) => e.id === last.empresaId) ? last.empresaId : "") ??
        empresas[0]?.id ??
        "";
      const initialEmpresa = empresas.find((empresa) => empresa.id === initialEmpresaId);
      const initialContabId =
        initialEmpresa?.contabilidade_id ??
        (last.contabilidadeId && contabilidades.some((c) => c.id === last.contabilidadeId)
          ? last.contabilidadeId
          : "") ??
        contabilidades[0]?.id ??
        "";
      setEmpresaId(initialEmpresaId);
      setContabilidadeId(initialContabId);
      setTipo(editingDocument?.tipo ?? DOC_TIPOS_ORDENADOS[0]);
      setDataConclusao(editingDocument?.data_conclusao ?? "");
      setDataVencimento(editingDocument?.data_vencimento ?? "");
      setSituacaoManual(editingDocument?.situacao ?? "pendente");
      setObservacoes(editingDocument?.observacoes ?? "");
      setConferenciaOk(Boolean(editingDocument?.conferencia_ok));
      setVencimentoManual(Boolean(editingDocument?.data_vencimento));
    }
  }, [contabilidades, editingDocument, empresas, open, preselectedEmpresaId]);

  useEffect(() => {
    if (dataConclusao && !vencimentoManual) {
      setDataVencimento(addDaysLocalIso(dataConclusao, getValidadePadraoDias(tipo)));
    }
  }, [dataConclusao, tipo, vencimentoManual]);

  useEffect(() => {
    if (DOCUMENTOS_SEM_VALIDADE.has(tipo)) {
      setDataVencimento("");
      setVencimentoManual(false);
    }
  }, [tipo]);

  const diasRestantes = useMemo(() => {
    if (DOCUMENTOS_SEM_VALIDADE.has(tipo)) return null;
    if (!dataVencimento) return null;
    return daysFromToday(dataVencimento);
  }, [dataVencimento, tipo]);

  const validadeIndeterminada = DOCUMENTOS_SEM_VALIDADE.has(tipo);

  const empresasFiltradas = empresas.filter(
    (empresa) => !contabilidadeId || empresa.contabilidade_id === contabilidadeId,
  );

  const reset = () => {
    setTipo(DOC_TIPOS_ORDENADOS[0]);
    setDataConclusao("");
    setDataVencimento("");
    setVencimentoManual(false);
    setSituacaoManual("pendente");
    setObservacoes("");
    setConferenciaOk(false);
  };

  const exigeConferencia = tipoExigeConferencia(tipo);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!empresaId || !user) return;

    setIsSaving(true);
    const confMarcada = exigeConferencia && conferenciaOk;
    const payload = {
      empresa_id: empresaId,
      tipo: tipo as any,
      titulo: tipoLabel(tipo),
      data_conclusao: dataConclusao || null,
      data_vencimento: validadeIndeterminada ? null : dataVencimento || null,
      situacao: (validadeIndeterminada
        ? "pendente"
        : isEditing
          ? situacaoManual
          : calculateSituacao(dataVencimento)) as any,
      observacoes: observacoes.trim() || null,
      conferencia_ok: confMarcada,
      conferencia_ok_at: confMarcada ? new Date().toISOString() : null,
      conferencia_ok_by: confMarcada ? user.id : null,
    };

    let docId: string | null = editingDocument?.id ?? null;
    let error: { message: string } | null = null;
    if (isEditing) {
      const r = await supabase.from("documentos_sst").update(payload).eq("id", editingDocument!.id);
      error = r.error;
    } else {
      const r = await supabase
        .from("documentos_sst")
        .insert({ ...payload, created_by: user.id })
        .select("id")
        .single();
      error = r.error;
      docId = (r.data as any)?.id ?? null;
    }
    setIsSaving(false);

    if (!error) {
      await logAudit({
        acao: isEditing ? "editou_documento" : "cadastrou_documento",
        modulo: "documentos",
        entidade_id: docId,
        entidade_tipo: "documento_sst",
        empresa_id: empresaId,
        descricao: `${isEditing ? "Editou" : "Cadastrou"} ${tipoLabel(tipo)}`,
      });
      if (!isEditing) setLastFormSelections({ contabilidadeId, empresaId });
      await queryClient.invalidateQueries();
      toast.success(
        isEditing ? "Documento atualizado com sucesso." : "Documento salvo com sucesso.",
      );
      reset();
      onOpenChange(false);
    } else {
      toast.error(error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar documento SST" : "Novo documento SST"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações do documento selecionado."
              : "Cadastre o documento diretamente no banco interno do sistema."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-bold text-foreground">
              Contabilidade
              <select
                value={contabilidadeId}
                onChange={(e) => {
                  setContabilidadeId(e.target.value);
                  setEmpresaId("");
                }}
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-ring"
                required
              >
                <option value="">Selecione</option>
                {contabilidades.map((contabilidade) => (
                  <option key={contabilidade.id} value={contabilidade.id}>
                    {contabilidade.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5 text-sm font-bold text-foreground">
              Empresa
              <select
                value={empresaId}
                onChange={(e) => setEmpresaId(e.target.value)}
                disabled={Boolean(preselectedEmpresaId)}
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-ring disabled:opacity-70"
                required
              >
                <option value="">Selecione</option>
                {empresasFiltradas.map((empresa) => (
                  <option key={empresa.id} value={empresa.id}>
                    {empresa.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-bold text-foreground">
              Tipo de Documento
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-ring"
                required
              >
                {DOC_TIPOS_ORDENADOS.map((item) => (
                  <option key={item} value={item}>
                    {tipoLabel(item)}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-bold text-foreground">
              Data de conclusão
              <Input
                type="date"
                value={dataConclusao}
                onChange={(e) => setDataConclusao(e.target.value)}
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-bold text-foreground">
              Data de vencimento
              <Input
                type="date"
                value={dataVencimento}
                disabled={validadeIndeterminada}
                onChange={(e) => {
                  setVencimentoManual(true);
                  setDataVencimento(e.target.value);
                }}
              />
            </label>
            {isEditing && !validadeIndeterminada && (
              <label className="grid gap-1.5 text-sm font-bold text-foreground">
                Status
                <select
                  value={situacaoManual}
                  onChange={(e) => setSituacaoManual(e.target.value as DocumentoSituacao)}
                  className="h-10 rounded-xl border border-input bg-background px-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="em_dia">Em dia</option>
                  <option value="proximo_vencimento">Próx. vencimento</option>
                  <option value="vencido">Vencido</option>
                  <option value="pendente">Indeterminado</option>
                  <option value="concluido">Concluído</option>
                </select>
              </label>
            )}
          </div>

          {exigeConferencia && (
            <label className="flex items-start gap-3 rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm font-bold text-foreground">
              <input
                type="checkbox"
                checked={conferenciaOk}
                onChange={(e) => setConferenciaOk(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-input accent-[hsl(var(--primary))]"
              />
              <span className="grid gap-0.5">
                {conferenciaLabel(tipo)}
                <span className="text-xs font-medium text-muted-foreground">
                  Marque quando o anexo obrigatório deste documento já estiver conferido.
                </span>
              </span>
            </label>
          )}

          <label className="grid gap-1.5 text-sm font-bold text-foreground">
            Observações{" "}
            <span className="text-xs font-medium text-muted-foreground">(opcional)</span>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Informações complementares do documento"
            />
          </label>

          <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            Dias restantes:{" "}
            <span className="font-extrabold text-foreground">
              {validadeIndeterminada
                ? "Indeterminado"
                : diasRestantes === null
                  ? "Sem prazo"
                  : diasRestantes < 0
                    ? `${Math.abs(diasRestantes)} dias vencido`
                    : `${diasRestantes} dias`}
            </span>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSaving || !empresaId}
              className="rounded-xl bg-gradient-brand text-primary-foreground shadow-glow"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {isEditing ? "Salvar alterações" : "Salvar documento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
