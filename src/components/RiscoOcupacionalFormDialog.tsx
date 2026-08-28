import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Shield,
  Layers,
  Activity,
  FileCheck,
  Scale,
  Building,
  CheckCircle2,
  AlertTriangle,
  Info,
  Wrench,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GesRiscoItem } from "@/components/GesFormDialog";
import {
  getPontosProbabilidade,
  getPontosSeveridade,
  getCorClassificacaoRisco,
} from "@/lib/pgrPdfMatriz";
import { listarEquipamentos } from "@/lib/equipamentosStorage";

export type RiscoCatalogoItem = {
  id: string;
  nome: string;
  tipo: string;
  codigo: string | null;
  descricao_risco?: string | null;
};

type RiscoOcupacionalFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (risco: GesRiscoItem) => void;
  editingRisco?: GesRiscoItem | null;
  empresaId?: string;
};

const AGENTES_RISCO = [
  { id: "fisico", label: "Físico" },
  { id: "quimico", label: "Químico" },
  { id: "biologico", label: "Biológico" },
  { id: "ergonomico", label: "Ergonômico" },
  { id: "acidente", label: "Acidente" },
] as const;

const FREQ_EXPOSICAO_OPCOES = ["Permanente", "Habitual", "Intermitente", "Eventual"];
const METODOLOGIA_OPCOES = [
  "Matriz 6x4 (AIHA Adaptada)",
  "Matriz 5x5 (BS 8800)",
  "Matriz 3x3",
  "Qualitativa",
  "NHO / FUNDACENTRO",
  "NR-15",
  "Outra",
];

const SEVERIDADE_OPCOES = [
  { value: "Irrelevante", label: "Irrelevante (1 pt)", pontos: 1 },
  { value: "Marginal", label: "Marginal (3 pts)", pontos: 3 },
  { value: "Crítico", label: "Crítico (6 pts)", pontos: 6 },
  { value: "Catastrófico", label: "Catastrófico (9 pts)", pontos: 9 },
];

const PROBABILIDADE_OPCOES = [
  { value: "Impossível", label: "Impossível (0 pts)", pontos: 0 },
  { value: "Raro", label: "Raro (1 pt)", pontos: 1 },
  { value: "Incomum", label: "Incomum (2 pts)", pontos: 2 },
  { value: "Ocasional", label: "Ocasional (4 pts)", pontos: 4 },
  { value: "Frequente", label: "Frequente (6 pts)", pontos: 6 },
  { value: "Contínuo", label: "Contínuo (8 pts)", pontos: 8 },
];

const TIPO_AVALIACAO_OPCOES = ["Qualitativa", "Quantitativa", "Quali-quantitativa"];
const SIM_NAO_OPCOES = ["Sim", "Não"];
const SIM_NAO_NA_OPCOES = ["Sim", "Não", "Não se aplica"];

function normalizeAgent(agent?: string | null): string {
  if (!agent) return "";
  const a = agent.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (a.includes("fisic")) return "fisico";
  if (a.includes("quimic")) return "quimico";
  if (a.includes("biolog")) return "biologico";
  if (a.includes("ergonom")) return "ergonomico";
  if (a.includes("acident") || a.includes("mecanic")) return "acidente";
  return a;
}

export function RiscoOcupacionalFormDialog({
  open,
  onOpenChange,
  onSave,
  editingRisco,
  empresaId,
}: RiscoOcupacionalFormDialogProps) {
  // 1. Identificação do Risco
  const [agenteRisco, setAgenteRisco] = useState<string>("");
  const [riscoId, setRiscoId] = useState("");
  const [fonteGeradora, setFonteGeradora] = useState("");
  const [esocialCodigo, setEsocialCodigo] = useState("");
  const [trajetoria, setTrajetoria] = useState("");
  const [freqExposicao, setFreqExposicao] = useState("");

  // 2. Avaliação e Classificação do Risco
  const [metodologia, setMetodologia] = useState("Matriz 6x4 (AIHA Adaptada)");
  const [severidade, setSeveridade] = useState("");
  const [probabilidade, setProbabilidade] = useState("");
  const [classificacao, setClassificacao] = useState("");
  const [estimativa, setEstimativa] = useState("");

  // 3. Avaliação Técnica
  const [tipoAvaliacao, setTipoAvaliacao] = useState("Qualitativa");
  const [avaliacaoRealizada, setAvaliacaoRealizada] = useState("");
  const [dataAvaliacao, setDataAvaliacao] = useState("");
  const [intensidade, setIntensidade] = useState("");
  const [unidadeMedida, setUnidadeMedida] = useState("");
  const [equipamento, setEquipamento] = useState("");

  // 4. Enquadramentos Legais / Laudos
  const [gerarPgrPcmso, setGerarPgrPcmso] = useState("Sim");
  const [obsPgr, setObsPgr] = useState("");

  const [gerarLti, setGerarLti] = useState("Não");
  const [insalubre, setInsalubre] = useState("Não");
  const [anexoNr15, setAnexoNr15] = useState("");
  const [percInsalubridade, setPercInsalubridade] = useState("");
  const [conclusaoInsalubridade, setConclusaoInsalubridade] = useState("");

  const [gerarLtp, setGerarLtp] = useState("Não");
  const [periculoso, setPericuloso] = useState("Não");
  const [anexoNr16, setAnexoNr16] = useState("");
  const [percPericulosidade, setPercPericulosidade] = useState("");
  const [conclusaoPericulosidade, setConclusaoPericulosidade] = useState("");

  const [gerarLtcat, setGerarLtcat] = useState("Não");
  const [aposentadoriaEspecial, setAposentadoriaEspecial] = useState("Não");
  const [codigoGfip, setCodigoGfip] = useState("");
  const [conclusaoAposentadoria, setConclusaoAposentadoria] = useState("");

  // Catálogo de Riscos do Banco Real
  const { data: catalogoRiscos = [] } = useQuery({
    queryKey: ["riscos-catalogo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("riscos_ocupacionais" as never)
        .select("id, nome, tipo, codigo, descricao_risco")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as unknown as RiscoCatalogoItem[];
    },
  });

  // Equipamentos Reais do Cadastro
  const { data: listaEquipamentos = [] } = useQuery({
    queryKey: ["equipamentos"],
    queryFn: listarEquipamentos,
  });

  // Filtragem estrita do Fator de Risco por Agente selecionado
  const fatoresFiltrados = useMemo(() => {
    if (!agenteRisco) return [];
    const normAgente = normalizeAgent(agenteRisco);
    return catalogoRiscos.filter((r) => normalizeAgent(r.tipo) === normAgente);
  }, [catalogoRiscos, agenteRisco]);

  // Cálculo Automático da Classificação do Risco (Matriz EngTech)
  const calculoRisco = useMemo(() => {
    if (!severidade || !probabilidade) return null;
    const sevPts = getPontosSeveridade(severidade);
    const probPts = getPontosProbabilidade(probabilidade);
    const score = sevPts * probPts;
    const corInfo = getCorClassificacaoRisco(score);
    return {
      score,
      sevPts,
      probPts,
      label: corInfo.label,
      isBaixo: score <= 12,
      isMedio: score > 12 && score <= 24,
      isAlto: score > 24,
    };
  }, [severidade, probabilidade]);

  // Atualiza campo de classificação automaticamente
  useEffect(() => {
    if (calculoRisco) {
      setClassificacao(calculoRisco.label);
    } else if (!editingRisco) {
      setClassificacao("");
    }
  }, [calculoRisco, editingRisco]);

  // Inicialização e Carga dos Dados
  useEffect(() => {
    if (!open) return;

    if (editingRisco) {
      const itemRisco = catalogoRiscos.find((r) => r.id === editingRisco.risco_id);
      const tipo = editingRisco.tipo_risco || itemRisco?.tipo || "";
      setAgenteRisco(normalizeAgent(tipo));

      setRiscoId(editingRisco.risco_id || "");
      setFonteGeradora(editingRisco.fonte_geradora || "");
      setEsocialCodigo(
        typeof editingRisco.esocial === "string"
          ? editingRisco.esocial
          : editingRisco.codigo_esocial || "",
      );
      setTrajetoria(editingRisco.trajetoria || "");
      setFreqExposicao(editingRisco.freq_exposicao || "");
      setMetodologia(editingRisco.metodologia || "Matriz 6x4 (AIHA Adaptada)");
      setSeveridade(editingRisco.sev_conseq || "");
      setProbabilidade(editingRisco.prob_ocorr || "");
      setClassificacao(editingRisco.classificacao || "");
      setEstimativa(editingRisco.estimativa || "");
      setTipoAvaliacao(editingRisco.tipo_avaliacao || "Qualitativa");
      setAvaliacaoRealizada(editingRisco.avaliacao || "");
      setDataAvaliacao(editingRisco.data_avaliacao || "");
      setIntensidade(editingRisco.intensidade || "");
      setUnidadeMedida(editingRisco.unidade_medida || "");
      setEquipamento(editingRisco.equipamento || "");
      setGerarPgrPcmso(editingRisco.gerar_pgr_pcmso || "Sim");
      setObsPgr(editingRisco.obs_pgr || "");
      setGerarLti(editingRisco.gerar_lti || "Não");
      setInsalubre(editingRisco.insalubre || "Não");
      setAnexoNr15(editingRisco.anexo_nr15 || "");
      setPercInsalubridade(editingRisco.perc_insalubridade || "");
      setConclusaoInsalubridade(editingRisco.conclusao_insalubridade || "");
      setGerarLtp(editingRisco.gerar_ltp || "Não");
      setPericuloso(editingRisco.periculoso || "Não");
      setAnexoNr16(editingRisco.anexo_nr16 || "");
      setPercPericulosidade(editingRisco.perc_periculosidade || "");
      setConclusaoPericulosidade(editingRisco.conclusao_periculosidade || "");
      setGerarLtcat(editingRisco.gerar_ltcat || "Não");
      setAposentadoriaEspecial(editingRisco.aposentadoria_especial || "Não");
      setCodigoGfip(editingRisco.codigo_gfip || "");
      setConclusaoAposentadoria(editingRisco.conclusao_aposentadoria || "");
    } else {
      setAgenteRisco("");
      setRiscoId("");
      setFonteGeradora("");
      setEsocialCodigo("");
      setTrajetoria("");
      setFreqExposicao("Habitual");
      setMetodologia("Matriz 6x4 (AIHA Adaptada)");
      setSeveridade("");
      setProbabilidade("");
      setClassificacao("");
      setEstimativa("");
      setTipoAvaliacao("Qualitativa");
      setAvaliacaoRealizada("");
      setDataAvaliacao(new Date().toISOString().split("T")[0]);
      setIntensidade("");
      setUnidadeMedida("");
      setEquipamento("");
      setGerarPgrPcmso("Sim");
      setObsPgr("");
      setGerarLti("Não");
      setInsalubre("Não");
      setAnexoNr15("");
      setPercInsalubridade("");
      setConclusaoInsalubridade("");
      setGerarLtp("Não");
      setPericuloso("Não");
      setAnexoNr16("");
      setPercPericulosidade("");
      setConclusaoPericulosidade("");
      setGerarLtcat("Não");
      setAposentadoriaEspecial("Não");
      setCodigoGfip("");
      setConclusaoAposentadoria("");
    }
  }, [open, editingRisco, catalogoRiscos]);

  // Ao selecionar um fator de risco, preencher eSocial caso cadastrado
  const handleSelectFatorRisco = (id: string) => {
    setRiscoId(id);
    const item = catalogoRiscos.find((r) => r.id === id);
    if (item?.codigo && !esocialCodigo) {
      setEsocialCodigo(item.codigo);
    }
  };

  const handleSave = () => {
    if (!agenteRisco) {
      toast.error("Selecione o Agente de Risco.");
      return;
    }
    if (!riscoId) {
      toast.error("Selecione o Fator de Risco.");
      return;
    }

    const cat = catalogoRiscos.find((r) => r.id === riscoId);
    const scoreVal = calculoRisco ? String(calculoRisco.score) : undefined;

    const savedRisco: GesRiscoItem = {
      id: editingRisco?.id || "temp_" + Math.random().toString(36).substring(2, 9),
      ges_id: editingRisco?.ges_id,
      risco_id: riscoId,
      nome_risco: cat?.nome || "Fator de Risco",
      tipo_risco: cat?.tipo || agenteRisco,
      codigo_esocial: esocialCodigo.trim() || undefined,
      fonte_geradora: fonteGeradora.trim(),
      esocial: !!esocialCodigo.trim(),
      trajetoria: trajetoria.trim(),
      freq_exposicao: freqExposicao,
      metodologia: metodologia,
      sev_conseq: severidade,
      prob_ocorr: probabilidade,
      classificacao: classificacao.trim() || undefined,
      cr: scoreVal,
      estimativa: estimativa.trim() || undefined,
      tipo_avaliacao: tipoAvaliacao || undefined,
      avaliacao: avaliacaoRealizada.trim() || undefined,
      data_avaliacao: dataAvaliacao || undefined,
      intensidade: intensidade.trim() || undefined,
      unidade_medida: unidadeMedida.trim() || undefined,
      equipamento: equipamento.trim() || undefined,
      // Preservar dados históricos para não violar integridade do banco
      recomendacoes: editingRisco?.recomendacoes || "",
      utiliza_epc: editingRisco?.utiliza_epc,
      epc_eficaz: editingRisco?.epc_eficaz,
      utiliza_epi: editingRisco?.utiliza_epi,
      epis_selecionados: editingRisco?.epis_selecionados || [],
      epcs_selecionados: editingRisco?.epcs_selecionados || [],
      // Enquadramentos
      gerar_pgr_pcmso: gerarPgrPcmso || undefined,
      obs_pgr: obsPgr.trim() || undefined,
      gerar_lti: gerarLti || undefined,
      insalubre: insalubre || undefined,
      anexo_nr15: anexoNr15.trim() || undefined,
      perc_insalubridade: percInsalubridade.trim() || undefined,
      conclusao_insalubridade: conclusaoInsalubridade.trim() || undefined,
      gerar_ltp: gerarLtp || undefined,
      periculoso: periculoso || undefined,
      anexo_nr16: anexoNr16.trim() || undefined,
      perc_periculosidade: percPericulosidade.trim() || undefined,
      conclusao_periculosidade: conclusaoPericulosidade.trim() || undefined,
      gerar_ltcat: gerarLtcat || undefined,
      aposentadoria_especial: aposentadoriaEspecial || undefined,
      codigo_gfip: codigoGfip.trim() || undefined,
      conclusao_aposentadoria: conclusaoAposentadoria.trim() || undefined,
    };

    onSave(savedRisco);
    onOpenChange(false);
  };

  const inputClass =
    "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20";
  const selectClass =
    "h-10 w-full rounded-xl border border-input bg-background px-3 text-sm font-medium outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20";
  const textareaClass =
    "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 resize-y";
  const labelClass =
    "text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-[1280px] max-h-[90vh] overflow-hidden p-0 sm:rounded-3xl border-border bg-card shadow-2xl flex flex-col">
        {/* Header */}
        <DialogHeader className="border-b border-border/80 px-6 sm:px-8 py-4 sm:py-5 bg-muted/20">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3 text-lg sm:text-xl font-bold text-foreground">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                <Shield className="h-5 w-5" />
              </div>
              <span>{editingRisco ? "Editar Risco Ocupacional" : "Incluir Risco Ocupacional no GES"}</span>
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
            Identifique o agente, caracterize a exposição e realize a avaliação técnica e classificação automática do risco.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-6">
          {/* SEÇÃO 1: IDENTIFICAÇÃO DO RISCO */}
          <div className="space-y-4 rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-sm">
            <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold">
                1
              </div>
              <h3 className="text-sm sm:text-base font-bold text-foreground tracking-tight">
                Identificação do Risco
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Agente de Risco (Filtro obrigatório) */}
              <div className="space-y-1.5 lg:col-span-1">
                <label className={labelClass}>
                  Agente de Risco <span className="text-destructive">*</span>
                </label>
                <select
                  value={agenteRisco}
                  onChange={(e) => {
                    const novoAgente = e.target.value;
                    setAgenteRisco(novoAgente);
                    // Reseta seleção de fator se não corresponder ao novo agente
                    setRiscoId("");
                  }}
                  className={`${selectClass} font-semibold border-primary/40`}
                >
                  <option value="">Selecione o agente...</option>
                  {AGENTES_RISCO.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fator de Risco (Filtrado estritamente) */}
              <div className="space-y-1.5 md:col-span-1 lg:col-span-3">
                <label className={labelClass}>
                  Fator de Risco <span className="text-destructive">*</span>
                  {agenteRisco && (
                    <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                      (Filtrado por: {AGENTES_RISCO.find((a) => a.id === agenteRisco)?.label})
                    </span>
                  )}
                </label>
                <select
                  value={riscoId}
                  onChange={(e) => handleSelectFatorRisco(e.target.value)}
                  disabled={!agenteRisco}
                  className={`${selectClass} font-semibold ${
                    !agenteRisco ? "bg-muted/50 cursor-not-allowed text-muted-foreground" : ""
                  }`}
                >
                  {!agenteRisco ? (
                    <option value="">⚠️ Selecione primeiro o Agente de Risco ao lado...</option>
                  ) : fatoresFiltrados.length === 0 ? (
                    <option value="" disabled>
                      Nenhum fator de risco cadastrado para este agente no catálogo
                    </option>
                  ) : (
                    <>
                      <option value="">Selecione o fator de risco do catálogo...</option>
                      {fatoresFiltrados.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.nome} {r.codigo ? `(eSocial: ${r.codigo})` : ""}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              {/* Fonte Geradora */}
              <div className="space-y-1.5 md:col-span-1 lg:col-span-2">
                <label className={labelClass}>Fonte Geradora</label>
                <input
                  value={fonteGeradora}
                  onChange={(e) => setFonteGeradora(e.target.value)}
                  placeholder="Ex.: Máquinas rotativas, compressores, solventes..."
                  className={inputClass}
                />
              </div>

              {/* Código eSocial */}
              <div className="space-y-1.5 md:col-span-1 lg:col-span-1">
                <label className={labelClass}>eSocial (Tabela 24)</label>
                <input
                  value={esocialCodigo}
                  onChange={(e) => setEsocialCodigo(e.target.value)}
                  placeholder="Ex.: 01.01.001..."
                  className={inputClass}
                />
              </div>

              {/* Frequência de Exposição */}
              <div className="space-y-1.5 md:col-span-1 lg:col-span-1">
                <label className={labelClass}>Frequência de Exposição</label>
                <select
                  value={freqExposicao}
                  onChange={(e) => setFreqExposicao(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Selecione...</option>
                  {FREQ_EXPOSICAO_OPCOES.map((op) => (
                    <option key={op} value={op}>
                      {op}
                    </option>
                  ))}
                </select>
              </div>

              {/* Trajetória */}
              <div className="space-y-1.5 md:col-span-2 lg:col-span-4">
                <label className={labelClass}>Trajetória / Meio de Propagação</label>
                <input
                  value={trajetoria}
                  onChange={(e) => setTrajetoria(e.target.value)}
                  placeholder="Ex.: Ar atmosférico, contato direto com epiderme, vibração localizada..."
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: AVALIAÇÃO E CLASSIFICAÇÃO DO RISCO */}
          <div className="space-y-4 rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-sm">
            <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold">
                2
              </div>
              <h3 className="text-sm sm:text-base font-bold text-foreground tracking-tight">
                Avaliação e Classificação do Risco (Matriz EngTech)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Metodologia */}
              <div className="space-y-1.5 lg:col-span-1">
                <label className={labelClass}>Metodologia</label>
                <select
                  value={metodologia}
                  onChange={(e) => setMetodologia(e.target.value)}
                  className={selectClass}
                >
                  {METODOLOGIA_OPCOES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Severidade da Consequência */}
              <div className="space-y-1.5 lg:col-span-1">
                <label className={labelClass}>
                  Severidade da Consequência <span className="text-destructive">*</span>
                </label>
                <select
                  value={severidade}
                  onChange={(e) => setSeveridade(e.target.value)}
                  className={`${selectClass} font-semibold`}
                >
                  <option value="">Selecione...</option>
                  {SEVERIDADE_OPCOES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Probabilidade de Ocorrência */}
              <div className="space-y-1.5 lg:col-span-1">
                <label className={labelClass}>
                  Probabilidade de Ocorrência <span className="text-destructive">*</span>
                </label>
                <select
                  value={probabilidade}
                  onChange={(e) => setProbabilidade(e.target.value)}
                  className={`${selectClass} font-semibold`}
                >
                  <option value="">Selecione...</option>
                  {PROBABILIDADE_OPCOES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Estimativa / Grau de Certeza */}
              <div className="space-y-1.5 lg:col-span-1">
                <label className={labelClass}>Estimativa / Grau de Certeza</label>
                <input
                  value={estimativa}
                  onChange={(e) => setEstimativa(e.target.value)}
                  placeholder="Ex.: Alta certeza, Estimativa técnica..."
                  className={inputClass}
                />
              </div>

              {/* Classificação do Risco (Resultado Automático) */}
              <div className="md:col-span-2 lg:col-span-4 rounded-xl border border-border p-4 bg-muted/30">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-primary" /> Classificação Automática do Risco
                    </span>
                    <p className="text-xs text-muted-foreground">
                      Calculado automaticamente: <strong>Severidade ({calculoRisco ? calculoRisco.sevPts : "—"})</strong> × <strong>Probabilidade ({calculoRisco ? calculoRisco.probPts : "—"})</strong>
                    </p>
                  </div>

                  {calculoRisco ? (
                    <div className="flex items-center gap-2">
                      {calculoRisco.isBaixo && (
                        <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-4 py-2 text-emerald-700 dark:text-emerald-300 font-bold text-sm shadow-sm">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>CR {calculoRisco.score} — Baixo (Aceitável)</span>
                        </div>
                      )}
                      {calculoRisco.isMedio && (
                        <div className="inline-flex items-center gap-2 rounded-xl bg-amber-500/15 border border-amber-500/30 px-4 py-2 text-amber-700 dark:text-amber-300 font-bold text-sm shadow-sm">
                          <AlertTriangle className="h-4 w-4" />
                          <span>CR {calculoRisco.score} — Médio (Moderado)</span>
                        </div>
                      )}
                      {calculoRisco.isAlto && (
                        <div className="inline-flex items-center gap-2 rounded-xl bg-rose-500/15 border border-rose-500/30 px-4 py-2 text-rose-700 dark:text-rose-300 font-bold text-sm shadow-sm">
                          <AlertTriangle className="h-4 w-4" />
                          <span>CR {calculoRisco.score} — Alto (Crítico / Ação Imediata)</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs italic text-muted-foreground">
                      Selecione a Severidade e a Probabilidade para calcular
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SEÇÃO 3: AVALIAÇÃO TÉCNICA */}
          <div className="space-y-4 rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-sm">
            <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold">
                3
              </div>
              <h3 className="text-sm sm:text-base font-bold text-foreground tracking-tight">
                Avaliação Técnica
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Tipo de Avaliação */}
              <div className="space-y-1.5 lg:col-span-1">
                <label className={labelClass}>Tipo de Avaliação</label>
                <select
                  value={tipoAvaliacao}
                  onChange={(e) => setTipoAvaliacao(e.target.value)}
                  className={selectClass}
                >
                  {TIPO_AVALIACAO_OPCOES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Data da Avaliação */}
              <div className="space-y-1.5 lg:col-span-1">
                <label className={labelClass}>Data da Avaliação</label>
                <input
                  type="date"
                  value={dataAvaliacao}
                  onChange={(e) => setDataAvaliacao(e.target.value)}
                  className={inputClass}
                />
              </div>

              {/* Intensidade / Valor */}
              <div className="space-y-1.5 lg:col-span-1">
                <label className={labelClass}>Intensidade / Valor</label>
                <input
                  value={intensidade}
                  onChange={(e) => setIntensidade(e.target.value)}
                  placeholder="Ex.: 82.4, 0.05, NA..."
                  className={inputClass}
                />
              </div>

              {/* Unidade de Medida */}
              <div className="space-y-1.5 lg:col-span-1">
                <label className={labelClass}>Unidade de Medida</label>
                <input
                  value={unidadeMedida}
                  onChange={(e) => setUnidadeMedida(e.target.value)}
                  placeholder="Ex.: dB(A), ppm, mg/m³, lux..."
                  className={inputClass}
                />
              </div>

              {/* Equipamento (Seletor com dados reais) */}
              <div className="space-y-1.5 md:col-span-2 lg:col-span-4">
                <label className={labelClass}>
                  <Wrench className="h-3.5 w-3.5 text-primary" /> Equipamento Utilizado
                  <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                    (Alimentado por: Cadastro → Equipamentos)
                  </span>
                </label>
                <select
                  value={equipamento}
                  onChange={(e) => setEquipamento(e.target.value)}
                  className={`${selectClass} font-medium`}
                >
                  <option value="">Selecione o equipamento utilizado...</option>
                  {/* Se houver dado anterior que não esteja na lista, mantém para compatibilidade */}
                  {equipamento && !listaEquipamentos.some((eq) => eq.nome === equipamento) && (
                    <option value={equipamento}>{equipamento}</option>
                  )}
                  {listaEquipamentos.map((eq) => (
                    <option key={eq.id} value={eq.nome}>
                      {eq.nome}
                      {eq.modelo ? ` — Mod.: ${eq.modelo}` : ""}
                      {eq.numero_serie ? ` (N/S: ${eq.numero_serie})` : ""}
                      {eq.fabricante ? ` — Fabr.: ${eq.fabricante}` : ""}
                    </option>
                  ))}
                  {listaEquipamentos.length === 0 && (
                    <option value="" disabled>
                      Nenhum equipamento cadastrado em Cadastro → Equipamentos
                    </option>
                  )}
                </select>
              </div>

              {/* Avaliação Realizada */}
              <div className="space-y-1.5 md:col-span-2 lg:col-span-4">
                <label className={labelClass}>Avaliação Realizada (Parecer Descritivo)</label>
                <textarea
                  value={avaliacaoRealizada}
                  onChange={(e) => setAvaliacaoRealizada(e.target.value)}
                  placeholder="Registro descritivo da avaliação técnica ambiental realizada in loco..."
                  rows={3}
                  className={textareaClass}
                />
              </div>
            </div>
          </div>

          {/* SEÇÃO 4: ENQUADRAMENTOS LEGAIS & LAUDOS */}
          <div className="space-y-4 rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-sm">
            <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold">
                4
              </div>
              <h3 className="text-sm sm:text-base font-bold text-foreground tracking-tight">
                Enquadramentos Técnicos e Laudos Ocupacionais
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* PGR / PCMSO */}
              <div className="rounded-xl border border-border/80 p-4 space-y-3 bg-muted/20">
                <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Building className="h-4 w-4 text-primary" /> PGR / PCMSO
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Gerar no PGR/PCMSO?</label>
                    <select
                      value={gerarPgrPcmso}
                      onChange={(e) => setGerarPgrPcmso(e.target.value)}
                      className={selectClass}
                    >
                      {SIM_NAO_OPCOES.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground">Observação PGR</label>
                    <input
                      value={obsPgr}
                      onChange={(e) => setObsPgr(e.target.value)}
                      placeholder="Observação específica para o PGR..."
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              {/* Insalubridade NR-15 */}
              <div className="rounded-xl border border-border/80 p-4 space-y-3 bg-muted/20">
                <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Scale className="h-4 w-4 text-primary" /> Insalubridade (NR-15)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Insalubre?</label>
                    <select
                      value={insalubre}
                      onChange={(e) => setInsalubre(e.target.value)}
                      className={selectClass}
                    >
                      {SIM_NAO_OPCOES.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Anexo NR-15</label>
                    <input
                      value={anexoNr15}
                      onChange={(e) => setAnexoNr15(e.target.value)}
                      placeholder="Ex.: Anexo 1, Anexo 11..."
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              {/* Periculosidade NR-16 */}
              <div className="rounded-xl border border-border/80 p-4 space-y-3 bg-muted/20">
                <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-500" /> Periculosidade (NR-16)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Periculoso?</label>
                    <select
                      value={periculoso}
                      onChange={(e) => setPericuloso(e.target.value)}
                      className={selectClass}
                    >
                      {SIM_NAO_OPCOES.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Anexo NR-16</label>
                    <input
                      value={anexoNr16}
                      onChange={(e) => setAnexoNr16(e.target.value)}
                      placeholder="Ex.: Anexo 2 (Inflamáveis)..."
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              {/* LTCAT / Aposentadoria Especial */}
              <div className="rounded-xl border border-border/80 p-4 space-y-3 bg-muted/20">
                <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <FileCheck className="h-4 w-4 text-primary" /> LTCAT / Aposentadoria Especial
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Aposentadoria Especial?</label>
                    <select
                      value={aposentadoriaEspecial}
                      onChange={(e) => setAposentadoriaEspecial(e.target.value)}
                      className={selectClass}
                    >
                      {SIM_NAO_OPCOES.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Código GFIP</label>
                    <input
                      value={codigoGfip}
                      onChange={(e) => setCodigoGfip(e.target.value)}
                      placeholder="Ex.: 04 (25 anos)..."
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="border-t border-border/80 px-6 sm:px-8 py-4 bg-muted/20 gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-bold text-foreground hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-glow transition-all hover:opacity-95"
          >
            <CheckCircle2 className="h-4 w-4" />
            {editingRisco ? "Salvar Alterações" : "Adicionar Risco ao GES"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
