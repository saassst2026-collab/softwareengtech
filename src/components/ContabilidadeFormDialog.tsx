import { useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
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
import { maskCnpj } from "@/lib/maskUtils";

type ContabilidadeFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingContabilidade?: {
    id: string;
    nome: string;
    cnpj: string | null;
    cidade: string | null;
    contato: string | null;
    responsavel: string | null;
    observacoes: string | null;
  } | null;
};

export function ContabilidadeFormDialog({
  open,
  onOpenChange,
  editingContabilidade,
}: ContabilidadeFormDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [cidade, setCidade] = useState("");
  const [contato, setContato] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const isEditing = Boolean(editingContabilidade);

  useEffect(() => {
    if (!open) return;
    setNome(editingContabilidade?.nome ?? "");
    setCnpj(maskCnpj(editingContabilidade?.cnpj ?? ""));
    setCidade(editingContabilidade?.cidade ?? "");
    setContato(editingContabilidade?.contato ?? "");
    setResponsavel(editingContabilidade?.responsavel ?? "");
    setObservacoes(editingContabilidade?.observacoes ?? "");
  }, [editingContabilidade, open]);

  const reset = () => {
    setNome("");
    setCnpj("");
    setCidade("");
    setContato("");
    setResponsavel("");
    setObservacoes("");
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !nome.trim()) return;

    setIsSaving(true);
    const payload = {
      nome: nome.trim(),
      cnpj: cnpj.trim() || null,
      cidade: cidade.trim() || null,
      contato: contato.trim() || null,
      responsavel: responsavel.trim() || null,
      observacoes: observacoes.trim() || null,
    };
    const { error } = isEditing
      ? await supabase.from("contabilidades").update(payload).eq("id", editingContabilidade!.id)
      : await supabase.from("contabilidades").insert({
          ...payload,
          created_by: user.id,
        });
    setIsSaving(false);

    if (!error) {
      await queryClient.invalidateQueries();
      toast.success(
        isEditing ? "Contabilidade atualizada com sucesso." : "Contabilidade salva com sucesso.",
      );
      reset();
      onOpenChange(false);
    } else {
      toast.error(error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar contabilidade" : "Nova contabilidade"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações do escritório parceiro."
              : "Cadastre o escritório parceiro para vincular empresas atendidas."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-5">
          <label className="grid gap-1.5 text-sm font-bold text-foreground">
            Nome
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome do escritório"
              required
            />
          </label>

          <label className="grid gap-1.5 text-sm font-bold text-foreground">
            CNPJ <span className="text-xs font-medium text-muted-foreground">(opcional)</span>
            <Input
              value={cnpj}
              onChange={(e) => setCnpj(maskCnpj(e.target.value))}
              placeholder="00.000.000/0000-00"
              inputMode="numeric"
              maxLength={18}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-bold text-foreground">
              Cidade
              <Input value={cidade} onChange={(e) => setCidade(e.target.value)} />
            </label>
            <label className="grid gap-1.5 text-sm font-bold text-foreground">
              Contato
              <Input value={contato} onChange={(e) => setContato(e.target.value)} />
            </label>
            <label className="grid gap-1.5 text-sm font-bold text-foreground">
              Responsável
              <Input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
            </label>
            <label className="grid gap-1.5 text-sm font-bold text-foreground">
              Observações
              <Input value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
            </label>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSaving || !nome.trim()}
              className="rounded-xl bg-gradient-brand text-primary-foreground shadow-glow"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {isEditing ? "Salvar alterações" : "Salvar contabilidade"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
