import { useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { getLastFormSelections, setLastFormSelections } from "@/lib/companyContext";
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
import { maskCpf } from "@/lib/maskUtils";

export type AsoTipo =
  | "admissional"
  | "demissional"
  | "periodico"
  | "mudanca_risco"
  | "retorno_trabalho";

export const ASO_TIPO_LABELS: Record<AsoTipo, string> = {
  admissional: "Admissional",
  demissional: "Demissional",
  periodico: "Periódico",
  mudanca_risco: "Mudança de Risco Ocupacional",
  retorno_trabalho: "Retorno ao Trabalho",
};

export type EditableAso = {
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

type EmpresaOption = { id: string; nome: string; contabilidade_id?: string | null };
type ContabilidadeOption = { id: string; nome: string };

type AsoFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresas: EmpresaOption[];
  contabilidades: ContabilidadeOption[];
  editingAso?: EditableAso | null;
};

export function AsoFormDialog({
  open,
  onOpenChange,
  empresas,
  contabilidades,
  editingAso,
}: AsoFormDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [contabilidadeId, setContabilidadeId] = useState("");
  const [empresaId, setEmpresaId] = useState("");
  const [funcionarioNome, setFuncionarioNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [funcao, setFuncao] = useState("");
  const [dataAso, setDataAso] = useState("");
  const [tipoAso, setTipoAso] = useState<AsoTipo>("periodico");
  const [observacoes, setObservacoes] = useState("");
  const isEditing = Boolean(editingAso);

  useEffect(() => {
    if (!open) return;
    const last = getLastFormSelections();
    const initialEmpresaId =
      editingAso?.empresa_id ??
      (last.empresaId && empresas.some((e) => e.id === last.empresaId) ? last.empresaId : "") ??
      empresas[0]?.id ??
      "";
    const initialEmpresa = empresas.find((e) => e.id === initialEmpresaId);
    const initialContabId =
      initialEmpresa?.contabilidade_id ??
      (last.contabilidadeId && contabilidades.some((c) => c.id === last.contabilidadeId)
        ? last.contabilidadeId
        : "") ??
      contabilidades[0]?.id ??
      "";
    setEmpresaId(initialEmpresaId);
    setContabilidadeId(initialContabId);
    setFuncionarioNome(editingAso?.funcionario_nome ?? "");
    setCpf(maskCpf(editingAso?.cpf ?? ""));
    setDataNascimento(editingAso?.data_nascimento ?? "");
    setFuncao(editingAso?.funcao ?? "");
    setDataAso(editingAso?.data_aso ?? "");
    setTipoAso(editingAso?.tipo_aso ?? "periodico");
    setObservacoes(editingAso?.observacoes ?? "");
  }, [open, editingAso, empresas, contabilidades]);

  const empresasFiltradas = empresas.filter(
    (e) => !contabilidadeId || e.contabilidade_id === contabilidadeId,
  );

  const reset = () => {
    setFuncionarioNome("");
    setCpf("");
    setDataNascimento("");
    setFuncao("");
    setDataAso("");
    setTipoAso("periodico");
    setObservacoes("");
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !empresaId || !funcionarioNome || !dataAso) return;

    setIsSaving(true);
    const payload = {
      empresa_id: empresaId,
      funcionario_nome: funcionarioNome.trim(),
      cpf: cpf.trim() || null,
      data_nascimento: dataNascimento || null,
      funcao: funcao.trim() || null,
      data_aso: dataAso,
      tipo_aso: tipoAso,
      observacoes: observacoes.trim() || null,
    };

    const { error } = isEditing
      ? await supabase.from("asos").update(payload).eq("id", editingAso!.id)
      : await supabase
          .from("asos")
          .insert({ ...payload, created_by: user.id, eventos_esocial: [] });
    setIsSaving(false);

    if (!error) {
      if (!isEditing) setLastFormSelections({ contabilidadeId, empresaId });
      await queryClient.invalidateQueries();
      toast.success(isEditing ? "ASO atualizado com sucesso." : "ASO cadastrado com sucesso.");
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
          <DialogTitle>{isEditing ? "Editar ASO" : "Novo ASO"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações do ASO selecionado."
              : "Cadastre um novo Atestado de Saúde Ocupacional."}
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
                {contabilidades.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-bold text-foreground">
              Empresa
              <select
                value={empresaId}
                onChange={(e) => setEmpresaId(e.target.value)}
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-ring"
                required
              >
                <option value="">Selecione</option>
                {empresasFiltradas.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
            <p className="mb-3 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
              Dados do funcionário
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-bold text-foreground sm:col-span-2">
                Nome do funcionário
                <Input
                  value={funcionarioNome}
                  onChange={(e) => setFuncionarioNome(e.target.value)}
                  placeholder="Nome completo"
                  required
                />
              </label>
              <label className="grid gap-1.5 text-sm font-bold text-foreground">
                CPF
                <Input
                  value={cpf}
                  onChange={(e) => setCpf(maskCpf(e.target.value))}
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                  maxLength={14}
                />
              </label>
              <label className="grid gap-1.5 text-sm font-bold text-foreground">
                Data de nascimento
                <Input
                  type="date"
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                />
              </label>
              <label className="grid gap-1.5 text-sm font-bold text-foreground sm:col-span-2">
                Função
                <Input
                  value={funcao}
                  onChange={(e) => setFuncao(e.target.value)}
                  placeholder="Ex.: Auxiliar de produção"
                />
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
            <p className="mb-3 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
              Dados do ASO
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-bold text-foreground">
                Data de elaboração do ASO
                <Input
                  type="date"
                  value={dataAso}
                  onChange={(e) => setDataAso(e.target.value)}
                  required
                />
              </label>
              <label className="grid gap-1.5 text-sm font-bold text-foreground">
                Tipo de ASO
                <select
                  value={tipoAso}
                  onChange={(e) => setTipoAso(e.target.value as AsoTipo)}
                  className="h-10 rounded-xl border border-input bg-background px-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-ring"
                  required
                >
                  {(Object.keys(ASO_TIPO_LABELS) as AsoTipo[]).map((t) => (
                    <option key={t} value={t}>
                      {ASO_TIPO_LABELS[t]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <label className="grid gap-1.5 text-sm font-bold text-foreground">
            Observações{" "}
            <span className="text-xs font-medium text-muted-foreground">(opcional)</span>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Informações complementares"
            />
          </label>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSaving || !empresaId || !funcionarioNome || !dataAso}
              className="rounded-xl bg-gradient-brand text-primary-foreground shadow-glow"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {isEditing ? "Salvar alterações" : "Salvar ASO"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
