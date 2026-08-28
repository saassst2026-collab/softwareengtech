import { useEffect, useState } from "react";
import { Loader2, Plus, Upload, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
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

type ContabilidadeOption = {
  id: string;
  nome: string;
};

type EmpresaFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contabilidades: ContabilidadeOption[];
  editingEmpresa?: {
    id: string;
    nome: string;
    cnpj: string | null;
    contabilidade_id: string | null;
    cidade: string | null;
    uf: string | null;
    contato: string | null;
    responsavel: string | null;
    observacoes: string | null;
    logo_url?: string | null;
  } | null;
};

export function EmpresaFormDialog({
  open,
  onOpenChange,
  contabilidades,
  editingEmpresa,
}: EmpresaFormDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [contabilidadeId, setContabilidadeId] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [contato, setContato] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const isEditing = Boolean(editingEmpresa);

  useEffect(() => {
    if (!open) return;
    setNome(editingEmpresa?.nome ?? "");
    setCnpj(maskCnpj(editingEmpresa?.cnpj ?? ""));
    setContabilidadeId(editingEmpresa?.contabilidade_id ?? "");
    setCidade(editingEmpresa?.cidade ?? "");
    setUf(editingEmpresa?.uf ?? "");
    setContato(editingEmpresa?.contato ?? "");
    setResponsavel(editingEmpresa?.responsavel ?? "");
    setObservacoes(editingEmpresa?.observacoes ?? "");
    setLogoUrl(editingEmpresa?.logo_url ?? null);
  }, [editingEmpresa, open]);

  const reset = () => {
    setNome("");
    setCnpj("");
    setContabilidadeId("");
    setCidade("");
    setUf("");
    setContato("");
    setResponsavel("");
    setObservacoes("");
    setLogoUrl(null);
  };

  const handleLogoUpload = async (file: File) => {
    if (!user) return;
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop() ?? "png";
      const path = `empresa-logos/${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("app-assets")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("app-assets").getPublicUrl(path);
      setLogoUrl(data.publicUrl);
      toast.success("Logo enviada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !nome.trim() || !contabilidadeId) return;

    setIsSaving(true);
    const payload = {
      nome: nome.trim(),
      cnpj: cnpj.trim() || null,
      contabilidade_id: contabilidadeId,
      cidade: cidade.trim() || null,
      uf: uf.trim().toUpperCase() || null,
      contato: contato.trim() || null,
      responsavel: responsavel.trim() || null,
      observacoes: observacoes.trim() || null,
      logo_url: logoUrl,
    };
    let savedId: string | null = editingEmpresa?.id ?? null;
    let error: { message: string } | null = null;
    if (isEditing) {
      const r = await supabase
        .from("empresas")
        .update(payload as never)
        .eq("id", editingEmpresa!.id);
      error = r.error;
    } else {
      const r = await supabase
        .from("empresas")
        .insert({ ...payload, status: "ativa", created_by: user.id } as never)
        .select("id")
        .single();
      error = r.error;
      savedId = (r.data as any)?.id ?? null;
    }
    setIsSaving(false);

    if (!error) {
      await logAudit({
        acao: isEditing ? "editou_empresa" : "cadastrou_empresa",
        modulo: "empresas",
        entidade_id: savedId,
        entidade_tipo: "empresa",
        empresa_id: savedId,
        descricao: `${isEditing ? "Editou" : "Cadastrou"} a empresa "${payload.nome}"`,
      });
      await queryClient.invalidateQueries();
      toast.success(isEditing ? "Empresa atualizada com sucesso." : "Empresa salva com sucesso.");
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
          <DialogTitle>{isEditing ? "Editar empresa" : "Nova empresa"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize os dados cadastrais da empresa."
              : "Cadastre empresas diretamente no banco interno e vincule à contabilidade parceira."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-5">
          <label className="grid gap-1.5 text-sm font-bold text-foreground">
            Nome da empresa
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Razão social ou nome fantasia"
              required
            />
          </label>

          <label className="grid gap-1.5 text-sm font-bold text-foreground">
            Contabilidade
            <select
              value={contabilidadeId}
              onChange={(e) => setContabilidadeId(e.target.value)}
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-ring"
              required
            >
              <option value="">Selecione uma contabilidade</option>
              {contabilidades.map((contabilidade) => (
                <option key={contabilidade.id} value={contabilidade.id}>
                  {contabilidade.nome}
                </option>
              ))}
            </select>
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
              UF
              <Input value={uf} onChange={(e) => setUf(e.target.value)} maxLength={2} />
            </label>
            <label className="grid gap-1.5 text-sm font-bold text-foreground">
              Responsável
              <Input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
            </label>
            <label className="grid gap-1.5 text-sm font-bold text-foreground">
              Contato
              <Input value={contato} onChange={(e) => setContato(e.target.value)} />
            </label>
          </div>
          <label className="grid gap-1.5 text-sm font-bold text-foreground">
            Observações
            <Input value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </label>

          <div className="grid gap-2">
            <span className="text-sm font-bold text-foreground">
              Logo da empresa{" "}
              <span className="text-xs font-medium text-muted-foreground">
                (aparece nas Ordens de Serviço)
              </span>
            </span>
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <div className="relative">
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="h-16 w-auto rounded-lg border border-border bg-white object-contain p-1"
                  />
                  <button
                    type="button"
                    onClick={() => setLogoUrl(null)}
                    className="absolute -right-2 -top-2 rounded-full bg-destructive p-0.5 text-destructive-foreground shadow"
                    aria-label="Remover logo"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : null}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-foreground hover:border-primary/40 hover:text-primary">
                {uploadingLogo ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {logoUrl ? "Trocar logo" : "Enviar logo"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingLogo}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleLogoUpload(f);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSaving || !nome.trim() || !contabilidadeId}
              className="rounded-xl bg-gradient-brand text-primary-foreground shadow-glow"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {isEditing ? "Salvar alterações" : "Salvar empresa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
