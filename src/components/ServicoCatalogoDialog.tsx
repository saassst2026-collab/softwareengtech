import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import type { ServicoCatalogo } from "@/lib/useServicosCatalogo";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  servico?: ServicoCatalogo | null;
};

export function ServicoCatalogoDialog({ open, onOpenChange, servico }: Props) {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("");
  const [descricao, setDescricao] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [textoComp, setTextoComp] = useState("");
  const [valor, setValor] = useState("0");
  const [ativo, setAtivo] = useState(true);
  const [ordem, setOrdem] = useState("0");

  useEffect(() => {
    if (!open) return;
    setNome(servico?.nome ?? "");
    setCategoria(servico?.categoria ?? "");
    setDescricao(servico?.descricao_curta ?? "");
    setObjetivo(servico?.objetivo ?? "");
    setTextoComp(servico?.texto_complementar ?? "");
    setValor(String(servico?.valor_padrao ?? 0));
    setAtivo(servico?.ativo ?? true);
    setOrdem(String(servico?.ordem ?? 0));
  }, [open, servico?.id]);

  const save = useMutation({
    mutationFn: async () => {
      if (!nome.trim()) throw new Error("Informe o nome do serviço");
      const payload = {
        nome: nome.trim(),
        categoria: categoria || null,
        descricao_curta: descricao || null,
        objetivo: objetivo || null,
        texto_complementar: textoComp || null,
        valor_padrao: Number(valor.replace(",", ".")) || 0,
        ativo,
        ordem: Number(ordem) || 0,
      };
      const tbl = supabase.from("servicos_catalogo" as never) as unknown as {
        update: (v: unknown) => {
          eq: (k: string, val: string) => Promise<{ error: { message: string } | null }>;
        };
        insert: (v: unknown) => Promise<{ error: { message: string } | null }>;
      };
      if (servico) {
        const { error } = await tbl.update(payload).eq("id", servico.id);
        if (error) throw new Error(error.message);
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { error } = await tbl.insert({ ...payload, created_by: u.user?.id });
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      toast.success(servico ? "Serviço atualizado" : "Serviço criado");
      qc.invalidateQueries({ queryKey: ["servicos_catalogo"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[95vw] max-w-2xl overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{servico ? "Editar serviço" : "Novo serviço"}</DialogTitle>
          <DialogDescription>
            Cadastre serviços que poderão ser usados na proposta completa.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <Field label="Nome do serviço *">
            <input value={nome} onChange={(e) => setNome(e.target.value)} className={inputCls} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Categoria">
              <input
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Valor padrão (R$)">
              <input
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                inputMode="decimal"
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Descrição curta (apresentação)">
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={2}
              className={inputCls}
            />
          </Field>
          <Field label="Objetivo do serviço">
            <textarea
              value={objetivo}
              onChange={(e) => setObjetivo(e.target.value)}
              rows={3}
              className={inputCls}
            />
          </Field>
          <Field label="Texto complementar">
            <textarea
              value={textoComp}
              onChange={(e) => setTextoComp(e.target.value)}
              rows={2}
              className={inputCls}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Ordem">
              <input
                value={ordem}
                onChange={(e) => setOrdem(e.target.value)}
                type="number"
                className={inputCls}
              />
            </Field>
            <label className="mt-5 flex items-center gap-2 text-sm font-semibold text-foreground">
              <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
              Serviço ativo
            </label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-xl border border-border px-4 py-2 text-sm font-bold"
          >
            Cancelar
          </button>
          <button
            disabled={save.isPending}
            onClick={() => save.mutate()}
            className="inline-flex items-center gap-1 rounded-xl bg-gradient-brand px-4 py-2 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-60"
          >
            {save.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
            Salvar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const inputCls = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-xs font-semibold text-muted-foreground">
      {label}
      {children}
    </label>
  );
}
