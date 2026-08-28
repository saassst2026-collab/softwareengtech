import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileSignature, Loader2, Plus, X } from "lucide-react";
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
import { useAppSettings } from "@/lib/useAppSettings";
import { downloadContratoPdf, gerarContratoPdf } from "@/lib/contratoPdf";
import { formatBRLCurrency, parseBRLToNumber } from "@/lib/moneyUtils";
import { SERVICOS_PADRAO, ordenarServicos } from "@/lib/propostaServicos";
import { useServicosCatalogo } from "@/lib/useServicosCatalogo";
import type { PropostaRecord } from "@/components/PropostaFormDialog";

/** Dados fixos da CONTRATADA (EngTech) conforme contrato padrão. */
export const ENGTECH_CONTRATO = {
  razao_social: "ENGTECH MEDICINA E SEGURANCA DO TRABALHO LTDA",
  endereco:
    "situada na Rua Exuperio Pereira, nº 199, Bairro São Félix, CEP 46.650-000, Barra da Estiva - BA",
  cnpj: "49.561.045/0001-24",
  representante: "Gilson das Neves Souza",
  representante_cpf: "025.387.855-10",
  cidade: "Barra da Estiva",
  uf: "BA",
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposta: PropostaRecord | null;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-bold text-muted-foreground">
      {label}
      {children}
    </label>
  );
}

const inputCls =
  "rounded-xl border border-input bg-background px-3 py-2 text-sm font-normal text-foreground outline-none focus:ring-2 focus:ring-ring";

export function ContratoDialog({ open, onOpenChange, proposta }: Props) {
  const { settings } = useAppSettings();
  const { data: catalogo } = useServicosCatalogo({ onlyActive: true });
  const [gerando, setGerando] = useState(false);

  const { data: empresa } = useQuery({
    queryKey: ["empresa-contrato", proposta?.empresa_id],
    enabled: open && !!proposta?.empresa_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresas")
        .select("*")
        .eq("id", proposta!.empresa_id!)
        .maybeSingle();
      if (error) throw error;
      return data as Record<string, unknown> | null;
    },
  });

  const [razaoSocial, setRazaoSocial] = useState("");
  const [endereco, setEndereco] = useState("");
  const [docTipo, setDocTipo] = useState<"CNPJ" | "CPF">("CNPJ");
  const [documento, setDocumento] = useState("");
  const [representante, setRepresentante] = useState("");
  const [valorTexto, setValorTexto] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [prazoMeses, setPrazoMeses] = useState(12);
  const [foro, setForo] = useState(`${ENGTECH_CONTRATO.cidade} - ${ENGTECH_CONTRATO.uf}`);
  const [cidadeAssinatura, setCidadeAssinatura] = useState(ENGTECH_CONTRATO.cidade);
  const [dataContrato, setDataContrato] = useState(() => new Date().toISOString().slice(0, 10));
  const [observacoes, setObservacoes] = useState("");

  const [servicos, setServicos] = useState<string[]>([]);
  const [novoServico, setNovoServico] = useState("");

  const toggleServico = (nome: string) =>
    setServicos((prev) => (prev.includes(nome) ? prev.filter((s) => s !== nome) : [...prev, nome]));

  useEffect(() => {
    if (!open) return;
    setNovoServico("");
    if (!proposta) {
      setRazaoSocial("");
      setEndereco("");
      setDocTipo("CNPJ");
      setDocumento("");
      setRepresentante("");
      setValorTexto("");
      setFormaPagamento("");
      setPrazoMeses(12);
      setForo(`${ENGTECH_CONTRATO.cidade} - ${ENGTECH_CONTRATO.uf}`);
      setCidadeAssinatura(ENGTECH_CONTRATO.cidade);
      setDataContrato(new Date().toISOString().slice(0, 10));
      setObservacoes("");
      setServicos([]);
      return;
    }
    const e = (empresa ?? {}) as Record<string, string | number | null>;
    const partes = [
      e.endereco ? `situada na ${e.endereco}` : null,
      e.bairro ? `Bairro ${e.bairro}` : null,
      e.cep ? `CEP ${e.cep}` : null,
      [e.cidade ?? proposta.cliente_cidade, e.uf ?? proposta.cliente_uf]
        .filter(Boolean)
        .join(" - "),
    ].filter(Boolean);
    setRazaoSocial(
      String(
        proposta.cliente_razao_social || (e.razao_social as string) || proposta.cliente_nome || "",
      ).toUpperCase(),
    );
    setEndereco(partes.join(", "));
    const cnpj = proposta.cliente_cnpj || (e.cnpj as string) || "";
    setDocTipo(cnpj.replace(/\D/g, "").length === 11 ? "CPF" : "CNPJ");
    setDocumento(cnpj);
    setRepresentante(proposta.cliente_responsavel || String(e.responsavel ?? ""));
    const total =
      parseBRLToNumber(proposta.total_texto ?? "") || Number(proposta.total_final_manual ?? 0) || 0;
    setValorTexto(total > 0 ? formatBRLCurrency(total) : "");
    setFormaPagamento(proposta.forma_pagamento ?? "");
    setObservacoes("");
    setServicos((proposta.servicos ?? []).map((s) => String(s.nome ?? "").trim()).filter(Boolean));
  }, [open, proposta, empresa]);

  const opcoes = ordenarServicos(
    Array.from(
      new Set([...SERVICOS_PADRAO, ...(catalogo ?? []).map((c) => c.nome), ...servicos]),
    ).map((nome) => ({ nome })),
  ).map((s) => s.nome);

  const handleGerar = async () => {
    if (servicos.length === 0) {
      toast.error("Selecione ao menos um serviço para o contrato");
      return;
    }
    if (!razaoSocial.trim()) {
      toast.error("Informe a razão social do contratante");
      return;
    }
    setGerando(true);
    try {
      const doc = await gerarContratoPdf({
        contratada_razao_social: ENGTECH_CONTRATO.razao_social,
        contratada_endereco: ENGTECH_CONTRATO.endereco,
        contratada_cnpj: ENGTECH_CONTRATO.cnpj,
        contratada_representante: ENGTECH_CONTRATO.representante,
        contratada_representante_cpf: ENGTECH_CONTRATO.representante_cpf,
        contratada_whatsapp: settings?.proposta_whatsapp ?? "(77) 99848-1869",
        contratada_email: settings?.proposta_emails ?? "engtst.souza@gmail.com",
        cliente_razao_social: razaoSocial || proposta?.cliente_nome || "",
        cliente_endereco: endereco,
        cliente_documento_tipo: docTipo,
        cliente_documento: documento || "—",
        cliente_representante: representante,
        servicos: ordenarServicos(servicos.map((nome) => ({ nome }))).map((s) => s.nome),
        valor_mensal_texto: valorTexto || "a combinar entre as partes",
        forma_pagamento: formaPagamento || null,
        prazo_meses: Number(prazoMeses) || 12,
        foro_comarca: foro,
        cidade_assinatura: cidadeAssinatura,
        data_contrato: dataContrato,
        observacoes: observacoes || null,
        logo_url: proposta?.logo_url ?? settings?.proposta_logo_url ?? null,
        numero_proposta: proposta?.numero,
      });
      downloadContratoPdf(doc, razaoSocial || proposta?.cliente_nome || "contrato");
      toast.success("Contrato gerado com sucesso");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar contrato");
    } finally {
      setGerando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-primary" /> Gerar contrato de prestação de
            serviços
          </DialogTitle>
          <DialogDescription>
            {proposta
              ? `Os dados da EngTech e do cliente são preenchidos automaticamente a partir da proposta nº ${String(proposta.numero).padStart(4, "0")}. Ajuste os campos e os serviços se necessário.`
              : "Contrato avulso: preencha os dados do contratante e selecione os serviços que farão parte da Cláusula I."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <p className="font-bold text-foreground">CONTRATADA</p>
            <p>
              {ENGTECH_CONTRATO.razao_social} — CNPJ {ENGTECH_CONTRATO.cnpj}
            </p>
            <p>{ENGTECH_CONTRATO.endereco}</p>
            <p>
              Representante: {ENGTECH_CONTRATO.representante} — CPF{" "}
              {ENGTECH_CONTRATO.representante_cpf}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Razão social do contratante">
              <input
                className={inputCls}
                value={razaoSocial}
                onChange={(e) => setRazaoSocial(e.target.value)}
              />
            </Field>
            <Field label="Representante legal do contratante">
              <input
                className={inputCls}
                value={representante}
                onChange={(e) => setRepresentante(e.target.value)}
              />
            </Field>
            <Field label="Endereço completo do contratante">
              <input
                className={inputCls}
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-[100px_1fr] gap-2">
              <Field label="Tipo">
                <select
                  className={inputCls}
                  value={docTipo}
                  onChange={(e) => setDocTipo(e.target.value as "CNPJ" | "CPF")}
                >
                  <option value="CNPJ">CNPJ</option>
                  <option value="CPF">CPF</option>
                </select>
              </Field>
              <Field label="Documento">
                <input
                  className={inputCls}
                  value={documento}
                  onChange={(e) => setDocumento(e.target.value)}
                />
              </Field>
            </div>
            <Field label="Valor contratado (texto exibido no contrato)">
              <input
                className={inputCls}
                value={valorTexto}
                onChange={(e) => setValorTexto(e.target.value)}
                placeholder="Ex.: R$ 150,00 mensais"
              />
            </Field>
            <Field label="Forma de pagamento">
              <input
                className={inputCls}
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value)}
              />
            </Field>
            <Field label="Prazo de vigência (meses)">
              <input
                type="number"
                min={1}
                className={inputCls}
                value={prazoMeses}
                onChange={(e) => setPrazoMeses(Number(e.target.value))}
              />
            </Field>
            <Field label="Foro da comarca">
              <input className={inputCls} value={foro} onChange={(e) => setForo(e.target.value)} />
            </Field>
            <Field label="Cidade de assinatura">
              <input
                className={inputCls}
                value={cidadeAssinatura}
                onChange={(e) => setCidadeAssinatura(e.target.value)}
              />
            </Field>
            <Field label="Data do contrato">
              <input
                type="date"
                className={inputCls}
                value={dataContrato}
                onChange={(e) => setDataContrato(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Disposições gerais (opcional)">
            <textarea
              rows={2}
              className={inputCls}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </Field>

          <div className="rounded-2xl border border-border bg-card p-3">
            <p className="text-xs font-bold text-foreground">
              Serviços que entrarão na Cláusula I ({servicos.length} selecionados)
            </p>
            <div className="mt-2 max-h-56 space-y-1 overflow-y-auto pr-1">
              {opcoes.map((nome) => {
                const checked = servicos.includes(nome);
                return (
                  <label
                    key={nome}
                    className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1 text-xs text-foreground hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-3.5 w-3.5"
                      checked={checked}
                      onChange={() => toggleServico(nome)}
                    />
                    <span className={checked ? "font-semibold" : "text-muted-foreground"}>
                      {nome}
                    </span>
                    {!SERVICOS_PADRAO.includes(nome as (typeof SERVICOS_PADRAO)[number]) && (
                      <button
                        type="button"
                        onClick={(ev) => {
                          ev.preventDefault();
                          setServicos((prev) => prev.filter((s) => s !== nome));
                        }}
                        className="ml-auto text-muted-foreground hover:text-destructive"
                        title="Remover"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </label>
                );
              })}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                className={`${inputCls} flex-1`}
                placeholder="Adicionar serviço personalizado"
                value={novoServico}
                onChange={(e) => setNovoServico(e.target.value)}
              />
              <button
                type="button"
                onClick={() => {
                  const nome = novoServico.trim();
                  if (!nome) return;
                  if (!servicos.includes(nome)) setServicos((prev) => [...prev, nome]);
                  setNovoServico("");
                }}
                className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-xs font-bold"
              >
                <Plus className="h-3.5 w-3.5" /> Incluir
              </button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl border border-border px-4 py-2 text-sm font-bold"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleGerar()}
            disabled={gerando}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-4 py-2 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-60"
          >
            {gerando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSignature className="h-4 w-4" />
            )}
            Gerar contrato em PDF
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
