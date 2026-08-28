import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  Copy,
  FileDown,
  Search,
  Loader2,
  Share2,
  FileSignature,
} from "lucide-react";
import { toast } from "sonner";

import { PageHero } from "@/components/PageHero";
import { supabase } from "@/integrations/supabase/client";
import { useAppSettings } from "@/lib/useAppSettings";
import { parseLocalDate } from "@/lib/dateUtils";
import { PropostaFormDialog, type PropostaRecord } from "@/components/PropostaFormDialog";
import {
  downloadPropostaPdf,
  gerarPropostaPdf,
  compartilharPropostaPdf,
  gerarPropostaPdfCompleta,
} from "@/lib/propostaPdf";
import { parseBRLToNumber } from "@/lib/moneyUtils";
import { ReportButton } from "@/components/ReportButton";
import type { RelatorioOpcao } from "@/components/RelatorioDialog";
import { ContratoDialog } from "@/components/ContratoDialog";

export const Route = createFileRoute("/_authenticated/propostas")({
  component: PropostasPage,
});

const STATUS_LABEL: Record<PropostaRecord["status"], { label: string; className: string }> = {
  rascunho: { label: "Rascunho", className: "bg-muted text-muted-foreground" },
  enviada: { label: "Enviada", className: "bg-info/15 text-info" },
  aprovada: { label: "Aprovada", className: "bg-success/15 text-success" },
  recusada: { label: "Recusada", className: "bg-destructive/15 text-destructive" },
};

function PropostasPage() {
  const qc = useQueryClient();
  const { settings } = useAppSettings();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todas");
  const [editing, setEditing] = useState<PropostaRecord | null>(null);
  const [open, setOpen] = useState(false);
  const [contrato, setContrato] = useState<PropostaRecord | null>(null);
  const [contratoAvulso, setContratoAvulso] = useState(false);

  const { data: propostas, isLoading } = useQuery({
    queryKey: ["propostas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("propostas")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PropostaRecord[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (propostas ?? []).filter((p) => {
      if (statusFilter !== "todas" && p.status !== statusFilter) return false;
      if (!q) return true;
      return (
        p.cliente_nome.toLowerCase().includes(q) ||
        (p.cliente_responsavel ?? "").toLowerCase().includes(q) ||
        String(p.numero ?? "").includes(q)
      );
    });
  }, [propostas, search, statusFilter]);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("propostas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Proposta excluída");
      qc.invalidateQueries({ queryKey: ["propostas"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao excluir"),
  });

  const duplicate = useMutation({
    mutationFn: async (p: PropostaRecord) => {
      const { data: user } = await supabase.auth.getUser();
      const { id, numero, ...rest } = p;
      void id;
      void numero;
      const insertPayload = {
        ...rest,
        status: "rascunho",
        cliente_nome: `${p.cliente_nome} (cópia)`,
        created_by: user.user?.id,
      } as never;
      const { error } = await supabase.from("propostas").insert(insertPayload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Proposta duplicada");
      qc.invalidateQueries({ queryKey: ["propostas"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao duplicar"),
  });

  const buildDoc = async (p: PropostaRecord) => {
    const empresa_header = {
      nome: "EngTech Serviços e Consultorias",
      subtitulo: "Saúde e Segurança do Trabalho",
      whatsapp: settings?.proposta_whatsapp ?? "(77) 99848-1869",
      emails: settings?.proposta_emails ?? "engtechsst@gmail.com / engtst.souza@gmail.com",
    };
    if (p.tipo === "completa") {
      const objs = p.objetivos_servicos ?? [];
      const objMap = new Map(objs.map((o) => [o.nome, o.objetivo]));
      const servicosCompleto = (p.servicos ?? []).map((s) => {
        const sx = s as typeof s & {
          valor_unitario?: number;
          valor_total_manual?: number | null;
        };
        const valor =
          typeof sx.valor_unitario === "number" ? sx.valor_unitario : parseBRLToNumber(s.valor);
        const manual = sx.valor_total_manual == null ? null : Number(sx.valor_total_manual) || null;
        return {
          nome: s.nome,
          objetivo: objMap.get(s.nome) ?? "",
          quantidade: Number(s.quantidade) || 1,
          valor_unitario: isFinite(valor) ? valor : 0,
          valor_total_manual: manual,
        };
      });
      return gerarPropostaPdfCompleta({
        numero: p.numero,
        cliente_nome: p.cliente_nome,
        cliente_responsavel: p.cliente_responsavel,
        cliente_cidade: p.cliente_cidade,
        cliente_uf: p.cliente_uf,
        cliente_cnpj: p.cliente_cnpj ?? null,
        cliente_razao_social: p.cliente_razao_social ?? null,
        cliente_nome_fantasia: p.cliente_nome_fantasia ?? null,
        data_proposta: p.data_proposta,
        servicos: servicosCompleto,
        desconto: p.desconto ?? 0,
        total_manual: (() => {
          // Se o total salvo divergir do calculado, considera total manual
          const subtotal = servicosCompleto.reduce((acc, s) => {
            const linha =
              s.valor_total_manual != null
                ? Number(s.valor_total_manual) || 0
                : (Number(s.quantidade) || 1) * (Number(s.valor_unitario) || 0);
            return acc + linha;
          }, 0);
          const calc = Math.max(subtotal - (Number(p.desconto) || 0), 0);
          const salvo = parseBRLToNumber(p.total_texto ?? "");
          return salvo > 0 && Math.abs(salvo - calc) > 0.01 ? salvo : null;
        })(),
        forma_pagamento: p.forma_pagamento ?? null,
        validade_dias: p.validade_dias ?? 7,
        informacoes_complementares: p.informacoes_complementares ?? null,
        logo_url: p.logo_url ?? settings?.proposta_logo_url ?? null,
        assinatura_url: p.assinatura_url ?? settings?.proposta_assinatura_url ?? null,
        assinatura_largura_mm: settings?.proposta_assinatura_largura_mm ?? null,
        assinatura_altura_max_mm: settings?.proposta_assinatura_altura_max_mm ?? null,
        assinatura_offset_y_mm: settings?.proposta_assinatura_offset_y_mm ?? null,
        empresa_header,
      });
    }
    return gerarPropostaPdf({
      numero: p.numero,
      cliente_nome: p.cliente_nome,
      cliente_responsavel: p.cliente_responsavel,
      cliente_cidade: p.cliente_cidade,
      cliente_uf: p.cliente_uf,
      data_proposta: p.data_proposta,
      servicos: p.servicos ?? [],
      total_texto: p.total_texto,
      logo_url: p.logo_url ?? settings?.proposta_logo_url ?? null,
      assinatura_url: p.assinatura_url ?? settings?.proposta_assinatura_url ?? null,
      assinatura_largura_mm: settings?.proposta_assinatura_largura_mm ?? null,
      assinatura_altura_max_mm: settings?.proposta_assinatura_altura_max_mm ?? null,
      assinatura_offset_y_mm: settings?.proposta_assinatura_offset_y_mm ?? null,
      empresa_header,
    });
  };

  const handleGerarPdf = async (p: PropostaRecord) => {
    try {
      const doc = await buildDoc(p);
      downloadPropostaPdf(doc, p.cliente_nome);
      toast.success("PDF gerado com sucesso");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar PDF");
    }
  };

  const handleCompartilhar = async (p: PropostaRecord) => {
    try {
      const doc = await buildDoc(p);
      await compartilharPropostaPdf(doc, p.cliente_nome);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao compartilhar PDF");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title="Propostas Comerciais"
        subtitle="Crie, edite e gere propostas em PDF padronizadas EngTech."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ReportButton
              modulo="propostas"
              getOpcoes={() => buildPropostasOpcoes({ propostas: propostas ?? [], filtered })}
            />
            <button
              onClick={() => setContratoAvulso(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-foreground hover:border-primary/40 hover:text-primary"
            >
              <FileSignature className="h-4 w-4" /> Novo contrato
            </button>
            <button
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-glow"
            >
              <Plus className="h-4 w-4" /> Nova proposta
            </button>
          </div>
        }
      />

      <section className="flex flex-col gap-3 rounded-3xl border border-border/60 bg-card p-4 shadow-elegant sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente, responsável ou nº..."
            className="w-full rounded-xl border border-input bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
        >
          <option value="todas">Todas as situações</option>
          <option value="rascunho">Rascunho</option>
          <option value="enviada">Enviada</option>
          <option value="aprovada">Aprovada</option>
          <option value="recusada">Recusada</option>
        </select>
      </section>

      {isLoading ? (
        <div className="flex items-center justify-center p-10">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
          <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-bold text-foreground">Nenhuma proposta encontrada</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Clique em “Nova proposta” para começar.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden overflow-x-auto rounded-3xl border border-border bg-card shadow-elegant lg:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">Nº</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Responsável</th>
                  <th className="p-3">Local</th>
                  <th className="p-3">Data</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const st = STATUS_LABEL[p.status];
                  return (
                    <tr key={p.id} className="border-t border-border hover:bg-muted/30">
                      <td className="p-3 font-mono text-xs">
                        {String(p.numero ?? "").padStart(4, "0")}
                      </td>
                      <td className="p-3 font-semibold">{p.cliente_nome}</td>
                      <td className="p-3 text-muted-foreground">{p.cliente_responsavel ?? "—"}</td>
                      <td className="p-3 text-muted-foreground">
                        {[p.cliente_cidade, p.cliente_uf].filter(Boolean).join(" / ") || "—"}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {parseLocalDate(p.data_proposta)?.toLocaleDateString("pt-BR") ?? "—"}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${st.className}`}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-1">
                          <ActionBtn onClick={() => handleGerarPdf(p)} title="Gerar PDF">
                            <FileDown className="h-3.5 w-3.5" />
                          </ActionBtn>
                          <ActionBtn onClick={() => handleCompartilhar(p)} title="Compartilhar PDF">
                            <Share2 className="h-3.5 w-3.5" />
                          </ActionBtn>
                          <ActionBtn onClick={() => setContrato(p)} title="Gerar contrato">
                            <FileSignature className="h-3.5 w-3.5" />
                          </ActionBtn>
                          <ActionBtn
                            onClick={() => {
                              setEditing(p);
                              setOpen(true);
                            }}
                            title="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </ActionBtn>
                          <ActionBtn onClick={() => duplicate.mutate(p)} title="Duplicar">
                            <Copy className="h-3.5 w-3.5" />
                          </ActionBtn>
                          <ActionBtn
                            onClick={() => {
                              if (confirm("Excluir esta proposta?")) remove.mutate(p.id);
                            }}
                            title="Excluir"
                            danger
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </ActionBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="flex flex-col gap-3 lg:hidden">
            {filtered.map((p) => {
              const st = STATUS_LABEL[p.status];
              return (
                <div
                  key={p.id}
                  className="rounded-2xl border border-border bg-card p-3 shadow-elegant"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-mono text-muted-foreground">
                        Nº {String(p.numero ?? "").padStart(4, "0")}
                      </p>
                      <p className="truncate text-sm font-bold">{p.cliente_nome}</p>
                      {p.cliente_responsavel && (
                        <p className="truncate text-xs text-muted-foreground">
                          {p.cliente_responsavel}
                        </p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${st.className}`}
                    >
                      {st.label}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {[p.cliente_cidade, p.cliente_uf].filter(Boolean).join(" / ") || "—"} ·{" "}
                    {parseLocalDate(p.data_proposta)?.toLocaleDateString("pt-BR") ?? "—"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <ActionBtn onClick={() => handleGerarPdf(p)} title="PDF">
                      <FileDown className="h-3.5 w-3.5" /> PDF
                    </ActionBtn>
                    <ActionBtn onClick={() => handleCompartilhar(p)} title="Compartilhar">
                      <Share2 className="h-3.5 w-3.5" /> Compartilhar
                    </ActionBtn>
                    <ActionBtn onClick={() => setContrato(p)} title="Contrato">
                      <FileSignature className="h-3.5 w-3.5" /> Contrato
                    </ActionBtn>
                    <ActionBtn
                      onClick={() => {
                        setEditing(p);
                        setOpen(true);
                      }}
                      title="Editar"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </ActionBtn>
                    <ActionBtn onClick={() => duplicate.mutate(p)} title="Duplicar">
                      <Copy className="h-3.5 w-3.5" /> Duplicar
                    </ActionBtn>
                    <ActionBtn
                      onClick={() => {
                        if (confirm("Excluir esta proposta?")) remove.mutate(p.id);
                      }}
                      title="Excluir"
                      danger
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Excluir
                    </ActionBtn>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <PropostaFormDialog open={open} onOpenChange={setOpen} proposta={editing} />
      <ContratoDialog
        open={!!contrato || contratoAvulso}
        onOpenChange={(v) => {
          if (!v) {
            setContrato(null);
            setContratoAvulso(false);
          }
        }}
        proposta={contrato}
      />
    </div>
  );
}

function ActionBtn({
  children,
  onClick,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold transition ${
        danger
          ? "border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10"
          : "border-border bg-card text-foreground hover:border-primary/40 hover:text-primary"
      }`}
    >
      {children}
    </button>
  );
}

function buildPropostasOpcoes(args: {
  propostas: PropostaRecord[];
  filtered: PropostaRecord[];
}): RelatorioOpcao[] {
  const { propostas, filtered } = args;
  const STATUS_PT: Record<PropostaRecord["status"], string> = {
    rascunho: "Rascunho",
    enviada: "Enviada",
    aprovada: "Aprovada",
    recusada: "Recusada",
  };
  const colunas = [
    { header: "Nº", align: "right" as const },
    { header: "Cliente" },
    { header: "Responsável" },
    { header: "Local" },
    { header: "Data" },
    { header: "Status" },
    { header: "Total", align: "right" as const },
  ];
  const toLinha = (p: PropostaRecord): Array<string | number> => [
    String(p.numero ?? "").padStart(4, "0"),
    p.cliente_nome,
    p.cliente_responsavel ?? "—",
    [p.cliente_cidade, p.cliente_uf].filter(Boolean).join(" / ") || "—",
    parseLocalDate(p.data_proposta)?.toLocaleDateString("pt-BR") ?? "—",
    STATUS_PT[p.status],
    p.total_texto ?? "—",
  ];
  const total = (list: PropostaRecord[]) =>
    list.reduce((acc, p) => acc + (parseBRLToNumber(p.total_texto ?? "") || 0), 0);
  const make = (
    id: string,
    label: string,
    list: PropostaRecord[],
    descricao?: string,
  ): RelatorioOpcao => ({
    id,
    label,
    descricao,
    build: () => ({
      titulo: label,
      colunas,
      linhas: list.map(toLinha),
      totalizadores: [
        { label: "Total de propostas", value: String(list.length) },
        {
          label: "Soma dos totais (R$)",
          value: total(list).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
        },
      ],
    }),
  });
  const byStatus = (s: PropostaRecord["status"]) => propostas.filter((p) => p.status === s);
  return [
    make("todas", "Todas as propostas", propostas),
    make(
      "filtradas",
      "Propostas conforme filtros atuais",
      filtered,
      "Usa os filtros já aplicados na tela",
    ),
    make("aprovadas", "Propostas aprovadas", byStatus("aprovada")),
    make("enviadas", "Propostas enviadas (pendentes)", byStatus("enviada")),
    make("rascunhos", "Propostas em rascunho", byStatus("rascunho")),
    make("recusadas", "Propostas recusadas", byStatus("recusada")),
    make(
      "com-desconto",
      "Propostas com desconto",
      propostas.filter((p) => Number((p as unknown as { desconto?: number }).desconto ?? 0) > 0),
    ),
  ];
}
