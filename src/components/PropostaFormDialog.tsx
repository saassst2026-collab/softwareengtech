import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload, Plus, Trash2, FileDown, ArrowUp, ArrowDown } from "lucide-react";
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
import {
  SERVICOS_PADRAO,
  PROFISSIONAL_FIXO,
  ordenarServicos,
  type ServicoItem,
} from "@/lib/propostaServicos";
import {
  downloadPropostaPdf,
  gerarPropostaPdf,
  gerarPropostaPdfCompleta,
  type ServicoCompleto,
} from "@/lib/propostaPdf";
import { useServicosCatalogo } from "@/lib/useServicosCatalogo";
import { MoneyInput } from "@/components/MoneyInput";
import { formatBRLCurrency, parseBRLToNumber } from "@/lib/moneyUtils";

export type PropostaRecord = {
  id: string;
  numero: number | null;
  empresa_id: string | null;
  cliente_nome: string;
  cliente_responsavel: string | null;
  cliente_cidade: string | null;
  cliente_uf: string | null;
  data_proposta: string;
  profissional_nome: string;
  profissional_titulos: string;
  profissional_crea: string | null;
  servicos: ServicoItem[];
  total_texto: string | null;
  texto_intro: string | null;
  texto_apresentacao: string | null;
  responsabilidades_contratante: string | null;
  responsabilidades_contratada: string | null;
  condicoes: string | null;
  logo_url: string | null;
  assinatura_url: string | null;
  status: "rascunho" | "enviada" | "aprovada" | "recusada";
  observacoes: string | null;
  tipo?: "simples" | "completa" | null;
  desconto?: number | null;
  forma_pagamento?: string | null;
  validade_dias?: number | null;
  informacoes_complementares?: string | null;
  objetivos_servicos?: Array<{ nome: string; objetivo: string }> | null;
  cliente_cnpj?: string | null;
  cliente_razao_social?: string | null;
  cliente_nome_fantasia?: string | null;
  subtotal_manual?: number | null;
  total_final_manual?: number | null;
  observacao_financeira?: string | null;
  total_manual?: boolean | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposta?: PropostaRecord | null;
};

export function PropostaFormDialog({ open, onOpenChange, proposta }: Props) {
  const qc = useQueryClient();
  const { settings } = useAppSettings();
  const fileLogoRef = useRef<HTMLInputElement>(null);
  const fileAssinRef = useRef<HTMLInputElement>(null);

  const [clienteNome, setClienteNome] = useState("");
  const [clienteResp, setClienteResp] = useState("");
  const [clienteCnpj, setClienteCnpj] = useState("");
  const [clienteRazaoSocial, setClienteRazaoSocial] = useState("");
  const [clienteNomeFantasia, setClienteNomeFantasia] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [dataProposta, setDataProposta] = useState(() => new Date().toISOString().slice(0, 10));
  const [servicos, setServicos] = useState<ServicoItem[]>([]);
  const [totalTexto, setTotalTexto] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [assinaturaUrl, setAssinaturaUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<PropostaRecord["status"]>("rascunho");
  const [observacoes, setObservacoes] = useState("");
  const [uploading, setUploading] = useState(false);

  // ----- Modo Completa -----
  const [tipo, setTipo] = useState<"simples" | "completa">("simples");
  const [servicosCompleta, setServicosCompleta] = useState<
    Array<{
      catalogo_id?: string | null;
      nome: string;
      objetivo: string;
      descricao_curta: string;
      quantidade: number;
      valor_unitario: number;
      valor_total_manual: number | null;
    }>
  >([]);
  const [desconto, setDesconto] = useState<number>(0);
  const [formaPagamento, setFormaPagamento] = useState("");
  const [validadeDias, setValidadeDias] = useState("7");
  const [infoComp, setInfoComp] = useState("");
  const { data: catalogo } = useServicosCatalogo({ onlyActive: true });
  const [seletorAberto, setSeletorAberto] = useState(false);
  const [catalogoBusca, setCatalogoBusca] = useState("");
  const [totalManual, setTotalManual] = useState<number | null>(null);
  const [observacaoFinanceira, setObservacaoFinanceira] = useState<string>("");

  // Reset/preencher quando abre
  useEffect(() => {
    if (!open) return;
    if (proposta) {
      setClienteNome(proposta.cliente_nome);
      setClienteResp(proposta.cliente_responsavel ?? "");
      setClienteCnpj(proposta.cliente_cnpj ?? "");
      setClienteRazaoSocial(proposta.cliente_razao_social ?? "");
      setClienteNomeFantasia(proposta.cliente_nome_fantasia ?? "");
      setCidade(proposta.cliente_cidade ?? "");
      setUf(proposta.cliente_uf ?? "");
      setDataProposta(proposta.data_proposta);
      setServicos(proposta.servicos ?? []);
      setTotalTexto(proposta.total_texto ?? "");
      setLogoUrl(proposta.logo_url ?? settings?.proposta_logo_url ?? null);
      setAssinaturaUrl(proposta.assinatura_url ?? settings?.proposta_assinatura_url ?? null);
      setStatus(proposta.status);
      setObservacoes(proposta.observacoes ?? "");
      setTipo(proposta.tipo === "completa" ? "completa" : "simples");
      setDesconto(Number(proposta.desconto ?? 0) || 0);
      setFormaPagamento(proposta.forma_pagamento ?? "");
      setValidadeDias(String(proposta.validade_dias ?? 7));
      setInfoComp(proposta.informacoes_complementares ?? "");
      setObservacaoFinanceira(proposta.observacao_financeira ?? "");
      // Total manual: se valor salvo divergir do calculado, considera manual
      // (será reconciliado após reconstruir os serviços abaixo)
      // reconstrói serviços completos a partir de servicos + objetivos_servicos
      if (proposta.tipo === "completa") {
        const objs = proposta.objetivos_servicos ?? [];
        const objMap = new Map(objs.map((o) => [o.nome, o.objetivo]));
        setServicosCompleta(
          (proposta.servicos ?? []).map((s) => {
            const sx = s as ServicoItem & {
              valor_unitario?: number;
              valor_total_manual?: number | null;
            };
            const unit =
              typeof sx.valor_unitario === "number" ? sx.valor_unitario : parseBRLToNumber(s.valor);
            const manual =
              sx.valor_total_manual == null ? null : Number(sx.valor_total_manual) || null;
            return {
              nome: s.nome,
              objetivo: objMap.get(s.nome) ?? "",
              descricao_curta: "",
              quantidade: Number(s.quantidade) || 1,
              valor_unitario: unit,
              valor_total_manual: manual,
            };
          }),
        );
      } else {
        setServicosCompleta([]);
      }
      // Reconcilia total manual após reconstrução
      if (proposta.tipo === "completa") {
        const subtotal = (proposta.servicos ?? []).reduce((acc, s) => {
          const sx = s as ServicoItem & {
            valor_unitario?: number;
            valor_total_manual?: number | null;
          };
          const unit =
            typeof sx.valor_unitario === "number" ? sx.valor_unitario : parseBRLToNumber(s.valor);
          const qtd = Number(s.quantidade) || 1;
          const linha =
            sx.valor_total_manual != null ? Number(sx.valor_total_manual) || 0 : qtd * unit;
          return acc + linha;
        }, 0);
        const desc = Number(proposta.desconto ?? 0) || 0;
        const calc = Math.max(subtotal - desc, 0);
        const salvo = parseBRLToNumber(proposta.total_texto ?? "");
        if (salvo > 0 && Math.abs(salvo - calc) > 0.01) {
          setTotalManual(salvo);
        } else {
          setTotalManual(null);
        }
      } else {
        setTotalManual(null);
      }
    } else {
      setClienteNome("");
      setClienteResp("");
      setClienteCnpj("");
      setClienteRazaoSocial("");
      setClienteNomeFantasia("");
      setCidade("");
      setUf("");
      setDataProposta(new Date().toISOString().slice(0, 10));
      setServicos([]);
      setTotalTexto("");
      setLogoUrl(settings?.proposta_logo_url ?? null);
      setAssinaturaUrl(settings?.proposta_assinatura_url ?? null);
      setStatus("rascunho");
      setObservacoes("");
      setTipo("simples");
      setServicosCompleta([]);
      setDesconto(0);
      setFormaPagamento("");
      setValidadeDias("7");
      setInfoComp("");
      setTotalManual(null);
      setObservacaoFinanceira("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, proposta?.id]);

  const toggleServico = (nome: string) => {
    setServicos((prev) => {
      const idx = prev.findIndex((s) => s.nome === nome);
      if (idx >= 0) return prev.filter((_, i) => i !== idx);
      return [...prev, { nome, quantidade: "1", valor: "----" }];
    });
  };

  // Verifica se TODOS os serviços do catálogo padrão estão selecionados
  const todosPadraoSelecionados = SERVICOS_PADRAO.every((nome) =>
    servicos.some((s) => s.nome === nome),
  );

  const toggleSelecionarTodos = () => {
    if (todosPadraoSelecionados) {
      // Remove apenas os serviços do catálogo padrão; mantém personalizados
      setServicos((prev) =>
        prev.filter((s) => !SERVICOS_PADRAO.includes(s.nome as (typeof SERVICOS_PADRAO)[number])),
      );
    } else {
      setServicos((prev) => {
        const faltantes = SERVICOS_PADRAO.filter((nome) => !prev.some((s) => s.nome === nome)).map(
          (nome) => ({ nome, quantidade: "1", valor: "----" }),
        );
        return [...prev, ...faltantes];
      });
    }
  };

  const updateServico = (idx: number, patch: Partial<ServicoItem>) => {
    setServicos((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const addServicoCustom = () => {
    setServicos((prev) => [...prev, { nome: "", quantidade: "1", valor: "----" }]);
  };

  const removeServico = (idx: number) => {
    setServicos((prev) => prev.filter((_, i) => i !== idx));
  };

  // ----- Helpers Completa -----
  const addServicoCompleta = (catId: string) => {
    const c = catalogo?.find((x) => x.id === catId);
    if (!c) return;
    setServicosCompleta((prev) => [
      ...prev,
      {
        catalogo_id: c.id,
        nome: c.nome,
        objetivo: c.objetivo ?? "",
        descricao_curta: c.descricao_curta ?? "",
        quantidade: 1,
        valor_unitario: Number(c.valor_padrao ?? 0),
        valor_total_manual: null,
      },
    ]);
    setSeletorAberto(false);
  };
  const updateServicoCompleta = (
    idx: number,
    patch: Partial<(typeof servicosCompleta)[number]>,
  ) => {
    setServicosCompleta((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };
  const moveServicoCompleta = (idx: number, dir: -1 | 1) => {
    setServicosCompleta((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  };
  const removeServicoCompleta = (idx: number) => {
    setServicosCompleta((prev) => prev.filter((_, i) => i !== idx));
  };

  const linhaTotal = (s: {
    quantidade: number;
    valor_unitario: number;
    valor_total_manual: number | null;
  }) => (s.valor_total_manual != null ? s.valor_total_manual : s.quantidade * s.valor_unitario);
  const subtotalCompleta = servicosCompleta.reduce((acc, s) => acc + linhaTotal(s), 0);
  const descontoNum = desconto;
  const totalCalculado = Math.max(subtotalCompleta - descontoNum, 0);
  const totalCompleta = totalManual != null ? totalManual : totalCalculado;
  const brl = (n: number) => formatBRLCurrency(n);

  const uploadAsset = async (file: File, kind: "logo" | "assinatura") => {
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Arquivo excede 3 MB");
      return null;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${kind}/${kind}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("propostas-assets")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("propostas-assets").getPublicUrl(path);
      const publicUrl = data.publicUrl;
      // Persiste como padrão global em app_settings (silencioso se RLS bloquear)
      try {
        const { data: existing } = await supabase
          .from("app_settings")
          .select("id")
          .limit(1)
          .maybeSingle();
        if (existing?.id) {
          const patch =
            kind === "logo"
              ? { proposta_logo_url: publicUrl }
              : { proposta_assinatura_url: publicUrl };
          await supabase.from("app_settings").update(patch).eq("id", existing.id);
        }
        qc.invalidateQueries({ queryKey: ["app-settings"] });
      } catch {
        // sem permissão ou sem registro — segue sem erro visível
      }
      return publicUrl;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no upload");
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Sempre persistimos os valores fixos para manter consistência mesmo se as
  // constantes mudarem futuramente.
  const buildPayload = () => {
    const base = {
      empresa_id: null,
      cliente_nome: clienteNome.trim(),
      cliente_responsavel: clienteResp || null,
      cliente_cnpj: clienteCnpj || null,
      cliente_razao_social: clienteRazaoSocial || null,
      cliente_nome_fantasia: clienteNomeFantasia || null,
      cliente_cidade: cidade || null,
      cliente_uf: uf || null,
      data_proposta: dataProposta,
      profissional_nome: PROFISSIONAL_FIXO.nome,
      profissional_titulos: PROFISSIONAL_FIXO.titulos,
      profissional_crea: PROFISSIONAL_FIXO.crea,
      texto_intro: null,
      texto_apresentacao: null,
      responsabilidades_contratante: null,
      responsabilidades_contratada: null,
      condicoes: null,
      logo_url: logoUrl,
      assinatura_url: assinaturaUrl,
      status,
      observacoes: observacoes || null,
      tipo,
    };
    if (tipo === "completa") {
      const validos = servicosCompleta.filter((s) => s.nome.trim());
      return {
        ...base,
        servicos: validos.map((s) => ({
          nome: s.nome,
          quantidade: String(s.quantidade),
          valor: brl(s.valor_unitario),
          // campos numéricos extras (jsonb aceita) — preservam precisão na recarga
          valor_unitario: s.valor_unitario,
          valor_total_manual: s.valor_total_manual,
        })),
        objetivos_servicos: validos.map((s) => ({ nome: s.nome, objetivo: s.objetivo })),
        total_texto: brl(totalCompleta),
        desconto: descontoNum,
        forma_pagamento: formaPagamento || null,
        validade_dias: Number(validadeDias) || 7,
        informacoes_complementares: infoComp || null,
        subtotal_manual: subtotalCompleta,
        total_final_manual: totalManual,
        total_manual: totalManual != null,
        observacao_financeira: observacaoFinanceira || null,
      };
    }
    return {
      ...base,
      servicos: ordenarServicos(servicos.filter((s) => s.nome.trim())),
      total_texto: totalTexto || null,
      objetivos_servicos: [],
    };
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!clienteNome.trim()) throw new Error("Informe o nome do cliente");
      const payload = buildPayload();
      if (proposta) {
        const { error } = await supabase.from("propostas").update(payload).eq("id", proposta.id);
        if (error) throw error;
        return proposta.id;
      }
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("propostas")
        .insert({ ...payload, created_by: user.user?.id })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      toast.success(proposta ? "Proposta atualizada" : "Proposta criada");
      qc.invalidateQueries({ queryKey: ["propostas"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  const gerarPdf = async () => {
    try {
      if (!clienteNome.trim()) {
        toast.error("Informe o nome do cliente antes de gerar o PDF");
        return;
      }
      const headerEmpresa = {
        nome: "EngTech Serviços e Consultorias",
        subtitulo: "Saúde e Segurança do Trabalho",
        whatsapp: settings?.proposta_whatsapp ?? "(77) 99848-1869",
        emails: settings?.proposta_emails ?? "engtechsst@gmail.com / engtst.souza@gmail.com",
      };
      let doc;
      if (tipo === "completa") {
        const servicosPdf: ServicoCompleto[] = servicosCompleta
          .filter((s) => s.nome.trim())
          .map((s) => ({
            nome: s.nome,
            descricao_curta: s.descricao_curta,
            objetivo: s.objetivo,
            quantidade: s.quantidade,
            valor_unitario: s.valor_unitario,
            valor_total_manual: s.valor_total_manual,
          }));
        doc = await gerarPropostaPdfCompleta({
          numero: proposta?.numero ?? null,
          cliente_nome: clienteNome,
          cliente_responsavel: clienteResp,
          cliente_cidade: cidade,
          cliente_uf: uf,
          cliente_cnpj: clienteCnpj,
          cliente_razao_social: clienteRazaoSocial,
          cliente_nome_fantasia: clienteNomeFantasia,
          data_proposta: dataProposta,
          servicos: servicosPdf,
          desconto: descontoNum,
          total_manual: totalManual,
          forma_pagamento: formaPagamento,
          validade_dias: Number(validadeDias) || 7,
          informacoes_complementares: infoComp,
          logo_url: logoUrl,
          assinatura_url: assinaturaUrl,
          empresa_header: headerEmpresa,
        });
      } else {
        doc = await gerarPropostaPdf({
          numero: proposta?.numero ?? null,
          cliente_nome: clienteNome,
          cliente_responsavel: clienteResp,
          cliente_cidade: cidade,
          cliente_uf: uf,
          data_proposta: dataProposta,
          servicos: ordenarServicos(servicos.filter((s) => s.nome.trim())),
          total_texto: totalTexto,
          logo_url: logoUrl,
          assinatura_url: assinaturaUrl,
          empresa_header: headerEmpresa,
        });
      }
      downloadPropostaPdf(doc, clienteNome || "Cliente");
      toast.success("PDF gerado com sucesso");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao gerar PDF");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[95vw] max-w-4xl overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">
            {proposta
              ? `Editar proposta nº ${String(proposta.numero ?? "").padStart(4, "0")}`
              : "Nova proposta"}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Preencha os dados do cliente e selecione os serviços. O PDF é gerado a qualquer momento,
            mesmo sem salvar.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:gap-5">
          {/* Tipo de proposta */}
          <section className="rounded-2xl border border-border/60 bg-muted/30 p-3 sm:p-4">
            <h3 className="text-sm font-bold text-foreground">Tipo de proposta</h3>
            <p className="mb-2 text-xs text-muted-foreground">
              <strong>Simples</strong> mantém o modelo padrão atual. <strong>Completa</strong>{" "}
              habilita catálogo de serviços, valores detalhados, objetivos e mais campos editáveis.
            </p>
            <div className="flex gap-2">
              {(["simples", "completa"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm font-bold transition ${
                    tipo === t
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {t === "simples" ? "Proposta Simples" : "Proposta Completa"}
                </button>
              ))}
            </div>
          </section>

          {/* Identificação */}
          <section className="grid gap-3 rounded-2xl border border-border/60 bg-muted/30 p-3 sm:p-4">
            <h3 className="text-sm font-bold text-foreground">Identificação do cliente</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="sm:col-span-2 text-xs font-semibold text-muted-foreground">
                Nome do cliente / empresa *
                <input
                  value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value)}
                  placeholder="Digite livremente o nome do cliente"
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-semibold text-muted-foreground">
                Razão Social
                <input
                  value={clienteRazaoSocial}
                  onChange={(e) => setClienteRazaoSocial(e.target.value)}
                  placeholder="Razão Social registrada"
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-semibold text-muted-foreground">
                Nome Fantasia
                <input
                  value={clienteNomeFantasia}
                  onChange={(e) => setClienteNomeFantasia(e.target.value)}
                  placeholder="Nome Fantasia"
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-semibold text-muted-foreground">
                CNPJ
                <input
                  value={clienteCnpj}
                  onChange={(e) => setClienteCnpj(e.target.value)}
                  placeholder="00.000.000/0000-00"
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-semibold text-muted-foreground">
                Responsável pelo cliente
                <input
                  value={clienteResp}
                  onChange={(e) => setClienteResp(e.target.value)}
                  placeholder="Nome de quem assina"
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-semibold text-muted-foreground">
                Data da proposta
                <input
                  type="date"
                  value={dataProposta}
                  onChange={(e) => setDataProposta(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </label>
              <div className="grid grid-cols-[1fr_70px] gap-2">
                <label className="text-xs font-semibold text-muted-foreground">
                  Cidade
                  <input
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs font-semibold text-muted-foreground">
                  UF
                  <input
                    value={uf}
                    maxLength={2}
                    onChange={(e) => setUf(e.target.value.toUpperCase())}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm uppercase"
                  />
                </label>
              </div>
            </div>
          </section>

          {/* Profissional (FIXO, somente leitura) */}
          <section className="grid gap-2 rounded-2xl border border-border/60 bg-muted/30 p-3 sm:p-4">
            <h3 className="text-sm font-bold text-foreground">Profissional responsável</h3>
            <p className="text-xs text-muted-foreground">
              Definido fixamente no sistema — não pode ser alterado por proposta.
            </p>
            <div className="rounded-lg border border-border bg-card p-3 text-sm">
              <p className="font-bold text-foreground">{PROFISSIONAL_FIXO.nome}</p>
              <p className="mt-1 text-xs text-muted-foreground">{PROFISSIONAL_FIXO.titulos}</p>
              <p className="mt-1 text-xs font-semibold text-foreground">{PROFISSIONAL_FIXO.crea}</p>
            </div>
          </section>

          {tipo === "simples" && (
            <section className="grid gap-3 rounded-2xl border border-border/60 bg-muted/30 p-3 sm:p-4">
              <h3 className="text-sm font-bold text-foreground">Serviços</h3>
              <p className="text-xs text-muted-foreground">
                No PDF os serviços aparecem sempre na ordem padrão, independentemente da ordem em
                que forem marcados.
              </p>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={toggleSelecionarTodos}
                  className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    todosPadraoSelecionados
                      ? "border border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10"
                      : "border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
                  }`}
                >
                  {todosPadraoSelecionados ? "Desmarcar Todos" : "Selecionar Todos os Serviços"}
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {SERVICOS_PADRAO.map((s) => {
                  const checked = servicos.some((x) => x.nome === s);
                  return (
                    <label
                      key={s}
                      className="flex cursor-pointer items-start gap-2 rounded-lg border border-border bg-card p-2 text-xs hover:border-primary/40"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleServico(s)}
                        className="mt-0.5"
                      />
                      <span className="leading-snug">{s}</span>
                    </label>
                  );
                })}
              </div>

              {servicos.length > 0 && (
                <div className="mt-2 overflow-x-auto rounded-xl border border-border bg-card">
                  <table className="w-full min-w-[480px] text-xs">
                    <thead className="bg-muted/60 text-left">
                      <tr>
                        <th className="p-2">Serviço</th>
                        <th className="w-20 p-2 text-center">Qtd.</th>
                        <th className="w-32 p-2 text-center">Valor</th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {servicos.map((s, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="p-1.5">
                            <input
                              value={s.nome}
                              onChange={(e) => updateServico(i, { nome: e.target.value })}
                              className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              value={s.quantidade}
                              onChange={(e) => updateServico(i, { quantidade: e.target.value })}
                              className="w-full rounded-md border border-input bg-background px-2 py-1 text-center text-xs"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              value={s.valor}
                              onChange={(e) => updateServico(i, { valor: e.target.value })}
                              className="w-full rounded-md border border-input bg-background px-2 py-1 text-center text-xs"
                            />
                          </td>
                          <td className="p-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => removeServico(i)}
                              className="text-destructive hover:opacity-70"
                              aria-label="Remover"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <button
                  type="button"
                  onClick={addServicoCustom}
                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/10"
                >
                  <Plus className="h-3 w-3" /> Adicionar serviço personalizado
                </button>
                <label className="text-xs font-semibold text-muted-foreground sm:ml-auto">
                  Total geral
                  <input
                    value={totalTexto}
                    onChange={(e) => setTotalTexto(e.target.value)}
                    placeholder="Ex.: 12x R$ 180,00"
                    className="ml-2 rounded-lg border border-input bg-background px-3 py-1.5 text-xs"
                  />
                </label>
              </div>
            </section>
          )}

          {tipo === "completa" && (
            <section className="grid gap-3 rounded-2xl border border-border/60 bg-muted/30 p-3 sm:p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Serviços (modo Completa)</h3>
                  <p className="text-xs text-muted-foreground">
                    Selecione do catálogo e ordene como deve aparecer no PDF.
                  </p>
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setSeletorAberto((v) => !v);
                      setCatalogoBusca("");
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-gradient-brand px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-glow"
                  >
                    <Plus className="h-3 w-3" /> Adicionar do catálogo
                  </button>
                  {seletorAberto && (
                    <div className="absolute right-0 z-20 mt-1 max-h-72 w-72 overflow-y-auto rounded-xl border border-border bg-card shadow-elegant">
                      <div className="sticky top-0 border-b border-border bg-card p-2">
                        <input
                          autoFocus
                          value={catalogoBusca}
                          onChange={(e) => setCatalogoBusca(e.target.value)}
                          placeholder="Pesquisar serviço..."
                          className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      {(catalogo ?? []).length === 0 ? (
                        <p className="p-3 text-xs text-muted-foreground">
                          Nenhum serviço ativo no catálogo. Cadastre em "Catálogo de Serviços".
                        </p>
                      ) : (
                        (() => {
                          const q = catalogoBusca.trim().toLowerCase();
                          const lista = (catalogo ?? []).filter((c) => {
                            if (!q) return true;
                            return (
                              c.nome.toLowerCase().includes(q) ||
                              (c.categoria ?? "").toLowerCase().includes(q) ||
                              (c.descricao_curta ?? "").toLowerCase().includes(q)
                            );
                          });
                          if (lista.length === 0) {
                            return (
                              <p className="p-3 text-xs text-muted-foreground">
                                Nenhum serviço encontrado para "{catalogoBusca}".
                              </p>
                            );
                          }
                          return lista.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => addServicoCompleta(c.id)}
                              className="block w-full border-b border-border px-3 py-2 text-left text-xs hover:bg-muted/50"
                            >
                              <span className="font-bold text-foreground">{c.nome}</span>
                              {c.categoria && (
                                <span className="ml-1 text-[10px] text-muted-foreground">
                                  · {c.categoria}
                                </span>
                              )}
                            </button>
                          ));
                        })()
                      )}
                    </div>
                  )}
                </div>
              </div>

              {servicosCompleta.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
                  Nenhum serviço adicionado.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {servicosCompleta.map((s, i) => (
                    <div key={i} className="rounded-xl border border-border bg-card p-3">
                      <div className="flex items-start gap-2">
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => moveServicoCompleta(i, -1)}
                            disabled={i === 0}
                            className="rounded-md border border-border bg-card p-1 text-muted-foreground hover:text-primary disabled:opacity-30"
                            aria-label="Subir"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveServicoCompleta(i, 1)}
                            disabled={i === servicosCompleta.length - 1}
                            className="rounded-md border border-border bg-card p-1 text-muted-foreground hover:text-primary disabled:opacity-30"
                            aria-label="Descer"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="flex-1 grid gap-2">
                          <input
                            value={s.nome}
                            onChange={(e) => updateServicoCompleta(i, { nome: e.target.value })}
                            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm font-semibold"
                            placeholder="Nome do serviço"
                          />
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            <label className="text-[11px] font-semibold text-muted-foreground">
                              Qtd.
                              <input
                                type="number"
                                min={1}
                                value={s.quantidade}
                                onChange={(e) =>
                                  updateServicoCompleta(i, {
                                    quantidade: Number(e.target.value) || 1,
                                  })
                                }
                                className="mt-0.5 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                                disabled={s.valor_total_manual != null}
                              />
                            </label>
                            <label className="text-[11px] font-semibold text-muted-foreground">
                              Valor unit. (R$)
                              <MoneyInput
                                value={s.valor_unitario}
                                onChange={(n) =>
                                  updateServicoCompleta(i, {
                                    valor_unitario: n ?? 0,
                                  })
                                }
                                disabled={s.valor_total_manual != null}
                                className="mt-0.5 w-full rounded-md border border-input bg-background px-2 py-1 text-xs disabled:opacity-50"
                              />
                            </label>
                            <div className="text-[11px] font-semibold text-muted-foreground">
                              Total
                              <p className="mt-0.5 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs font-mono">
                                {brl(linhaTotal(s))}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <label className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                              <input
                                type="checkbox"
                                checked={s.valor_total_manual != null}
                                onChange={(e) =>
                                  updateServicoCompleta(i, {
                                    valor_total_manual: e.target.checked
                                      ? s.quantidade * s.valor_unitario || 0
                                      : null,
                                  })
                                }
                              />
                              Usar valor total manual
                            </label>
                            {s.valor_total_manual != null && (
                              <label className="flex flex-1 items-center gap-2 text-[11px] font-semibold text-muted-foreground">
                                Valor total (R$)
                                <MoneyInput
                                  value={s.valor_total_manual}
                                  onChange={(n) =>
                                    updateServicoCompleta(i, {
                                      valor_total_manual: n ?? 0,
                                    })
                                  }
                                  className="w-40 rounded-md border border-input bg-background px-2 py-1 text-xs"
                                />
                              </label>
                            )}
                          </div>
                          <textarea
                            value={s.objetivo}
                            onChange={(e) => updateServicoCompleta(i, { objetivo: e.target.value })}
                            rows={2}
                            placeholder="Objetivo do serviço (aparece na seção Objetivos)"
                            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeServicoCompleta(i)}
                          className="rounded-md p-1 text-destructive hover:opacity-70"
                          aria-label="Remover"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Totais + condições */}
              <div className="grid gap-2 rounded-xl border border-border bg-card p-3 sm:grid-cols-2">
                <div className="grid gap-1 text-sm">
                  <Row label="Subtotal" value={brl(subtotalCompleta)} />
                  <Row label="Desconto" value={brl(descontoNum)} />
                  <Row label="Total" value={brl(totalCompleta)} bold />
                  {totalManual != null && (
                    <p className="text-[10px] italic text-muted-foreground">
                      Total definido manualmente (calculado: {brl(totalCalculado)})
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Desconto (R$)
                    <MoneyInput
                      value={desconto}
                      onChange={(n) => setDesconto(n ?? 0)}
                      className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                    />
                  </label>
                  <label className="text-xs font-semibold text-muted-foreground">
                    Validade (dias)
                    <input
                      type="number"
                      value={validadeDias}
                      onChange={(e) => setValidadeDias(e.target.value)}
                      className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                    />
                  </label>
                  <div className="rounded-md border border-dashed border-border bg-muted/30 p-2">
                    <label className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={totalManual != null}
                        onChange={(e) => setTotalManual(e.target.checked ? totalCalculado : null)}
                      />
                      Definir Total geral manualmente
                    </label>
                    {totalManual != null && (
                      <MoneyInput
                        value={totalManual}
                        onChange={(n) => setTotalManual(n ?? 0)}
                        className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                      />
                    )}
                  </div>
                </div>
              </div>
              <label className="text-xs font-semibold text-muted-foreground">
                Forma de pagamento
                <input
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value)}
                  placeholder="Ex.: 12x sem juros via boleto"
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-semibold text-muted-foreground">
                Informações complementares
                <textarea
                  value={infoComp}
                  onChange={(e) => setInfoComp(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-semibold text-muted-foreground">
                Observação financeira
                <textarea
                  value={observacaoFinanceira}
                  onChange={(e) => setObservacaoFinanceira(e.target.value)}
                  rows={2}
                  placeholder="Ex.: valores válidos por 30 dias, sujeito a reajuste após esse prazo."
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </label>
            </section>
          )}

          {/* Logo + Assinatura */}
          <section className="grid gap-3 rounded-2xl border border-border/60 bg-muted/30 p-3 sm:grid-cols-2 sm:p-4">
            <div>
              <h3 className="mb-2 text-sm font-bold text-foreground">Logo desta proposta</h3>
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="mb-2 h-20 w-auto rounded-lg border border-border bg-white p-1"
                />
              ) : (
                <p className="mb-2 text-xs text-muted-foreground">
                  Usando padrão das configurações (se houver).
                </p>
              )}
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-info/10 px-3 py-1.5 text-xs font-bold text-info hover:bg-info/20">
                {uploading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Upload className="h-3 w-3" />
                )}
                Trocar logo
                <input
                  ref={fileLogoRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const url = await uploadAsset(f, "logo");
                    if (url) setLogoUrl(url);
                    if (fileLogoRef.current) fileLogoRef.current.value = "";
                  }}
                />
              </label>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-bold text-foreground">Assinatura digital</h3>
              {assinaturaUrl ? (
                <img
                  src={assinaturaUrl}
                  alt="Assinatura"
                  className="mb-2 h-20 w-auto rounded-lg border border-border bg-white p-1"
                />
              ) : (
                <p className="mb-2 text-xs text-muted-foreground">
                  Usando padrão das configurações (se houver).
                </p>
              )}
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-info/10 px-3 py-1.5 text-xs font-bold text-info hover:bg-info/20">
                {uploading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Upload className="h-3 w-3" />
                )}
                Trocar assinatura
                <input
                  ref={fileAssinRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const url = await uploadAsset(f, "assinatura");
                    if (url) setAssinaturaUrl(url);
                    if (fileAssinRef.current) fileAssinRef.current.value = "";
                  }}
                />
              </label>
            </div>
          </section>

          {/* Status + obs */}
          <section className="grid gap-3 rounded-2xl border border-border/60 bg-muted/30 p-3 sm:grid-cols-2 sm:p-4">
            <label className="text-xs font-semibold text-muted-foreground">
              Status
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PropostaRecord["status"])}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="rascunho">Rascunho</option>
                <option value="enviada">Enviada</option>
                <option value="aprovada">Aprovada</option>
                <option value="recusada">Recusada</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              Observações internas
              <input
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
          </section>
        </div>

        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold text-foreground"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={gerarPdf}
            className="inline-flex items-center justify-center gap-1 rounded-xl border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-bold text-primary hover:bg-primary/20"
          >
            <FileDown className="h-4 w-4" /> Gerar PDF
          </button>
          <button
            type="button"
            disabled={save.isPending}
            onClick={() => save.mutate()}
            className="inline-flex items-center justify-center gap-1 rounded-xl bg-gradient-brand px-4 py-2 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-60"
          >
            {save.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
            {proposta ? "Salvar alterações" : "Criar proposta"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div
      className={`flex justify-between gap-2 ${bold ? "font-bold text-foreground" : "text-muted-foreground"}`}
    >
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
