import { useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

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

type EmpresaOption = { id: string; nome: string };
type EventoStatus = "pendente" | "enviado" | "retificado" | "rejeitado";

type EsocialEventFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresas: EmpresaOption[];
};

const EVENTOS = [
  { value: "S-2210", label: "S-2210 (CAT)" },
  { value: "S-2220", label: "S-2220 (Monitoramento da Saúde)" },
  { value: "S-2240", label: "S-2240 (Condições Ambientais)" },
];

export function EsocialEventFormDialog({
  open,
  onOpenChange,
  empresas,
}: EsocialEventFormDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [empresaId, setEmpresaId] = useState("");
  const [tipo, setTipo] = useState(EVENTOS[0].value);
  const [dataEvento, setDataEvento] = useState("");
  const [status, setStatus] = useState<EventoStatus>("pendente");

  useEffect(() => {
    if (open) setEmpresaId(empresas[0]?.id ?? "");
  }, [empresas, open]);

  const reset = () => {
    setTipo(EVENTOS[0].value);
    setDataEvento("");
    setStatus("pendente");
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !empresaId) return;
    const evento = EVENTOS.find((item) => item.value === tipo);

    setIsSaving(true);
    const { error } = await supabase.from("eventos_esocial").insert({
      empresa_id: empresaId,
      tipo,
      descricao: evento?.label ?? tipo,
      data_evento: dataEvento || null,
      status,
      created_by: user.id,
    });
    setIsSaving(false);

    if (!error) {
      await queryClient.invalidateQueries();
      reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo evento eSocial</DialogTitle>
          <DialogDescription>
            Registre eventos SST para consulta por empresa e futura integração de envio.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-5">
          <label className="grid gap-1.5 text-sm font-bold text-foreground">
            Empresa
            <select
              value={empresaId}
              onChange={(e) => setEmpresaId(e.target.value)}
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-ring"
              required
            >
              <option value="">Selecione</option>
              {empresas.map((empresa) => (
                <option key={empresa.id} value={empresa.id}>
                  {empresa.nome}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-bold text-foreground">
              Tipo de evento
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-ring"
                required
              >
                {EVENTOS.map((evento) => (
                  <option key={evento.value} value={evento.value}>
                    {evento.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-bold text-foreground">
              Status
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as EventoStatus)}
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-ring"
                required
              >
                <option value="pendente">Pendente</option>
                <option value="enviado">Enviado</option>
                <option value="retificado">Retificado</option>
                <option value="rejeitado">Rejeitado</option>
              </select>
            </label>
          </div>

          <label className="grid gap-1.5 text-sm font-bold text-foreground">
            Data do evento
            <Input type="date" value={dataEvento} onChange={(e) => setDataEvento(e.target.value)} />
          </label>

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
              Salvar evento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
