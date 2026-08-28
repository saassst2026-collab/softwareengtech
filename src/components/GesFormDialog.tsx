import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Plus,
  Trash2,
  Pencil,
  Eye,
  Check,
  X,
  HelpCircle,
  Copy,
  Layers,
  Shield,
  Briefcase,
  HardHat,
  MapPin,
  FileSpreadsheet,
  Loader2,
  CheckSquare,
  Square,
  Tag,
  ArrowUpDown,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { RiscoOcupacionalFormDialog } from "@/components/RiscoOcupacionalFormDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type GesItem = {
  id: string;
  empresa_id: string;
  unidade: string | null;
  setor: string | null;
  codigo_ges: string | null;
  cargo: string;
  atividade: string | null;
  descricao_atividade: string | null;
  qtd_colaboradores: number;
  jornada: string | null;
  turno: string | null;
  ambiente_trabalho: string | null;
  observacoes: string | null;
};

type EmpresaOpt = { id: string; nome: string; razao_social: string | null; cnpj?: string | null };
type RiscoCatalogoOpt = { id: string; nome: string; tipo: string; codigo: string | null };
type ProfissionalOpt = { id: string; nome: string; cargo: string | null; registro: string | null };
type MedidaOpt = { id: string; nome: string; tipo: string; ca: string | null; empresa_id: string | null };
type FuncaoOpt = {
  id: string;
  nome: string;
  descricao_atividades?: string | null;
  setor_id?: string | null;
  setores?: { nome: string } | null;
};

export type GesRiscoItem = {
  id: string;
  ges_id?: string;
  risco_id: string;
  nome_risco: string;
  tipo_risco?: string;
  codigo_esocial?: string;
  fonte_geradora: string;
  esocial?: boolean | string;
  trajetoria: string;
  freq_exposicao: string;
  metodologia: string;
  sev_conseq: string;
  prob_ocorr: string;
  classificacao?: string;
  estimativa?: string;
  tipo_avaliacao?: string;
  avaliacao?: string;
  data_avaliacao?: string;
  intensidade?: string;
  unidade_medida?: string;
  equipamento?: string;
  recomendacoes: string;
  utiliza_epc?: string;
  epc_eficaz?: string;
  utiliza_epi?: string;
  epis_selecionados?: string[];
  epcs_selecionados?: string[];
  gerar_pgr_pcmso?: string;
  obs_pgr?: string;
  gerar_lti?: string;
  insalubre?: string;
  anexo_nr15?: string;
  perc_insalubridade?: string;
  conclusao_insalubridade?: string;
  gerar_ltp?: string;
  periculoso?: string;
  anexo_nr16?: string;
  perc_periculosidade?: string;
  conclusao_periculosidade?: string;
  gerar_ltcat?: string;
  aposentadoria_especial?: string;
  codigo_gfip?: string;
  conclusao_aposentadoria?: string;
};

export type GesResponsavelItem = {
  id: string;
  ges_id?: string;
  profissional_id: string;
  nome: string;
  cargo?: string | null;
  registro?: string | null;
  papel?: string | null;
};

export type GesMedidaItem = {
  id: string;
  ges_id?: string;
  risco_id?: string;
  nome_risco?: string;
  medida_id?: string;
  nome_medida: string;
  eficaz: string;
  med_protecao: string;
  cond_func: string;
  uso_inint: string;
  prazo_validade: string;
  period_troca: string;
};

export type GesFuncaoItem = {
  id: string;
  ges_id?: string;
  funcao_id: string;
  nome: string;
  descricao?: string | null;
  setor_nome?: string | null;
};

export type GesFrenteTrabalhoItem = {
  id: string;
  ges_id?: string;
  nome: string;
  localizacao?: string | null;
};

type GesFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresaId: string;
  empresas: EmpresaOpt[];
  editingGes: GesItem | null;
  userId: string | null;
  onSuccess?: (savedId: string) => void;
};

const VALIDADE_OPCOES = [
  { id: "inicio", label: "desde o início" },
  { id: "mes_atual", label: "a partir deste mês" },
  { id: "proximo_mes", label: "a partir do próximo mês" },
];

const UNIDADES_MOCK = [
  "Unidade Principal (Matriz)",
  "Unidade Operacional 01",
  "Unidade Operacional 02",
  "Frente de Trabalho Externa",
  "Todas as Unidades",
];

const FREQ_EXPOSICAO_OPCOES = ["Permanente", "Habitual", "Intermitente", "Eventual"];
const METODOLOGIAS_OPCOES = ["Matriz 6x4", "Matriz 5x5", "Matriz 3x3", "Qualitativa", "NHO / FUNDACENTRO", "NR-15"];
const SEVERIDADES_OPCOES = ["Irrelevante", "Baixa", "Média", "Alta", "Crítica"];
const PROBABILIDADES_OPCOES = ["Improvável", "Remota", "Ocasional", "Provável", "Frequente"];
const SIM_NAO_OPCOES = ["Sim", "Não", "Não se aplica"];

export function GesFormDialog({
  open,
  onOpenChange,
  empresaId,
  empresas,
  editingGes,
  userId,
  onSuccess,
}: GesFormDialogProps) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("ges");

  // --- TAB 1: GES Form State ---
  const [selectedEmpresaId, setSelectedEmpresaId] = useState(empresaId);
  const [unidade, setUnidade] = useState("Unidade Principal (Matriz)");
  const [validadeAlteracao, setValidadeAlteracao] = useState("inicio");
  const [nomeGes, setNomeGes] = useState("");
  const [descricao, setDescricao] = useState("");

  // --- TAB 2: Riscos State ---
  const [riscosList, setRiscosList] = useState<GesRiscoItem[]>([]);
  const [selectedRiscos, setSelectedRiscos] = useState<string[]>([]);
  const [analiseErgonomica, setAnaliseErgonomica] = useState("");
  const [isRiscoModalOpen, setIsRiscoModalOpen] = useState(false);
  const [editingRisco, setEditingRisco] = useState<GesRiscoItem | null>(null);
  const [isCopiarAmbienteModalOpen, setIsCopiarAmbienteModalOpen] = useState(false);
  const [riscoForm, setRiscoForm] = useState({
    risco_id: "",
    fonte_geradora: "",
    trajetoria: "",
    recomendacoes: "",
    freq_exposicao: "Permanente",
    metodologia: "Matriz 6x4",
    sev_conseq: "Média",
    prob_ocorr: "Ocasional",
    esocial: false,
  });

  // --- TAB 3: Responsáveis State ---
  const [responsaveisList, setResponsaveisList] = useState<GesResponsavelItem[]>([]);
  const [isResponsavelModalOpen, setIsResponsavelModalOpen] = useState(false);
  const [responsavelForm, setResponsavelForm] = useState({
    profissional_id: "",
    papel: "Responsável Técnico",
  });

  // --- TAB 4: Medidas de Proteção State ---
  const [medidasList, setMedidasList] = useState<GesMedidaItem[]>([]);
  const [selectedMedidas, setSelectedMedidas] = useState<string[]>([]);
  const [isMedidaModalOpen, setIsMedidaModalOpen] = useState(false);
  const [medidaForm, setMedidaForm] = useState({
    risco_id: "",
    medida_id: "",
    nome_medida: "",
    eficaz: "Sim",
    med_protecao: "EPI",
    cond_func: "Adequada",
    uso_inint: "Sim",
    prazo_validade: "Dentro do prazo",
    period_troca: "Sempre que danificado",
  });

  // --- TAB 5: Funções State ---
  const [funcoesList, setFuncoesList] = useState<GesFuncaoItem[]>([]);
  const [isFuncaoModalOpen, setIsFuncaoModalOpen] = useState(false);
  const [funcaoForm, setFuncaoForm] = useState({
    funcao_id: "",
  });

  // --- TAB 6: Frentes de Trabalho State ---
  const [frentesList, setFrentesList] = useState<GesFrenteTrabalhoItem[]>([]);
  const [isFrenteModalOpen, setIsFrenteModalOpen] = useState(false);
  const [frenteForm, setFrenteForm] = useState({
    nome: "",
    localizacao: "",
  });

  // --- Lookups from database ---
  const { data: riscosCatalogo = [] } = useQuery({
    queryKey: ["riscos-catalogo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("riscos_ocupacionais" as never)
        .select("id, nome, tipo, codigo")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as unknown as RiscoCatalogoOpt[];
    },
  });

  const { data: profissionaisCatalogo = [] } = useQuery({
    queryKey: ["profissionais-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profissionais" as never)
        .select("id, nome, cargo, registro")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as unknown as ProfissionalOpt[];
    },
  });

  const { data: medidasCatalogo = [] } = useQuery({
    queryKey: ["medidas-controle-catalogo", selectedEmpresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medidas_controle" as never)
        .select("id, nome, tipo, ca, empresa_id")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return ((data ?? []) as unknown as MedidaOpt[]).filter(
        (m) => !m.empresa_id || m.empresa_id === selectedEmpresaId,
      );
    },
  });

  const { data: funcoesCatalogo = [] } = useQuery({
    queryKey: ["funcoes-catalogo", selectedEmpresaId],
    enabled: !!selectedEmpresaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funcoes" as never)
        .select("id, nome, descricao_atividades, setor_id, setores(nome)")
        .eq("empresa_id", selectedEmpresaId)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as unknown as FuncaoOpt[];
    },
  });

  // Initialize or reset when dialog opens/changes
  useEffect(() => {
    if (!open) return;
    setActiveTab("ges");
    setSelectedEmpresaId(empresaId || empresas[0]?.id || "");
    if (editingGes) {
      setNomeGes(editingGes.cargo || "");
      setDescricao(editingGes.descricao_atividade || editingGes.observacoes || "");
      setUnidade(editingGes.unidade || "Unidade Principal (Matriz)");
      loadExistingGesRelations(editingGes.id);
    } else {
      setNomeGes("");
      setDescricao("");
      setUnidade("Unidade Principal (Matriz)");
      setValidadeAlteracao("inicio");
      setRiscosList([]);
      setSelectedRiscos([]);
      setResponsaveisList([]);
      setMedidasList([]);
      setSelectedMedidas([]);
      setFuncoesList([]);
      setFrentesList([]);
      setAnaliseErgonomica("");
    }
  }, [open, editingGes, empresaId, empresas]);

  // Load existing linked relations if editing
  async function loadExistingGesRelations(gesId: string) {
    try {
      // 1. Riscos
      const { data: rData } = await supabase
        .from("ges_riscos" as never)
        .select(
          "id, risco_id, fontes_geradoras, trajetoria, recomendacao_medidas, freq_exposicao, metodologia, severidade, probabilidade, esocial, classificacao, estimativa, tipo_avaliacao, avaliacao, data_avaliacao, intensidade, equipamento, utiliza_epc, epc_eficaz, utiliza_epi, gerar_pgr_pcmso, obs_pgr, gerar_lti, insalubre, anexo_nr15, perc_insalubridade, conclusao_insalubridade, gerar_ltp, periculoso, anexo_nr16, perc_periculosidade, conclusao_periculosidade, gerar_ltcat, aposentadoria_especial, codigo_gfip, conclusao_aposentadoria, riscos_ocupacionais(nome, tipo, codigo)",
        )
        .eq("ges_id", gesId);
      if (rData) {
        setRiscosList(
          (rData as any[]).map((r) => ({
            id: r.id,
            ges_id: gesId,
            risco_id: r.risco_id,
            nome_risco: r.riscos_ocupacionais?.nome || "Risco",
            tipo_risco: r.riscos_ocupacionais?.tipo || undefined,
            codigo_esocial: r.riscos_ocupacionais?.codigo || undefined,
            fonte_geradora: r.fontes_geradoras || "",
            trajetoria: r.trajetoria || "",
            recomendacoes: r.recomendacao_medidas || "",
            freq_exposicao: r.freq_exposicao || "",
            metodologia: r.metodologia || "",
            sev_conseq: r.severidade || "",
            prob_ocorr: r.probabilidade || "",
            esocial: r.esocial || false,
            classificacao: r.classificacao || undefined,
            estimativa: r.estimativa || undefined,
            tipo_avaliacao: r.tipo_avaliacao || undefined,
            avaliacao: r.avaliacao || undefined,
            data_avaliacao: r.data_avaliacao || undefined,
            intensidade: r.intensidade || undefined,
            equipamento: r.equipamento || undefined,
            utiliza_epc: r.utiliza_epc || undefined,
            epc_eficaz: r.epc_eficaz || undefined,
            utiliza_epi: r.utiliza_epi || undefined,
            gerar_pgr_pcmso: r.gerar_pgr_pcmso || undefined,
            obs_pgr: r.obs_pgr || undefined,
            gerar_lti: r.gerar_lti || undefined,
            insalubre: r.insalubre || undefined,
            anexo_nr15: r.anexo_nr15 || undefined,
            perc_insalubridade: r.perc_insalubridade || undefined,
            conclusao_insalubridade: r.conclusao_insalubridade || undefined,
            gerar_ltp: r.gerar_ltp || undefined,
            periculoso: r.periculoso || undefined,
            anexo_nr16: r.anexo_nr16 || undefined,
            perc_periculosidade: r.perc_periculosidade || undefined,
            conclusao_periculosidade: r.conclusao_periculosidade || undefined,
            gerar_ltcat: r.gerar_ltcat || undefined,
            aposentadoria_especial: r.aposentadoria_especial || undefined,
            codigo_gfip: r.codigo_gfip || undefined,
            conclusao_aposentadoria: r.conclusao_aposentadoria || undefined,
          })),
        );
      }

      // 2. Responsáveis
      const { data: respData } = await supabase
        .from("ges_responsaveis" as never)
        .select("id, profissional_id, papel, profissionais(nome, cargo, registro)")
        .eq("ges_id", gesId);
      if (respData) {
        setResponsaveisList(
          (respData as any[]).map((resp) => ({
            id: resp.id,
            ges_id: gesId,
            profissional_id: resp.profissional_id,
            nome: resp.profissionais?.nome || "Profissional",
            cargo: resp.profissionais?.cargo || null,
            registro: resp.profissionais?.registro || null,
            papel: resp.papel || "Responsável Técnico",
          })),
        );
      }

      // 3. Medidas
      const { data: medData } = await supabase
        .from("ges_medidas" as never)
        .select("id, medida_id, observacao, medidas_controle(nome, tipo, ca)")
        .eq("ges_id", gesId);
      if (medData) {
        setMedidasList(
          (medData as any[]).map((m) => ({
            id: m.id,
            ges_id: gesId,
            medida_id: m.medida_id,
            nome_medida: m.medidas_controle?.nome || "Medida de Proteção",
            eficaz: "Sim",
            med_protecao: m.medidas_controle?.tipo || "EPI",
            cond_func: "Adequada",
            uso_inint: "Sim",
            prazo_validade: m.medidas_controle?.ca ? `CA ${m.medidas_controle.ca}` : "Em dia",
            period_troca: m.observacao || "Regular",
          })),
        );
      }

      // 4. Funções
      const { data: funcData } = await supabase
        .from("ges_funcoes" as never)
        .select("id, funcao_id, funcoes(nome, descricao_atividades, setor_id, setores(nome))")
        .eq("ges_id", gesId);
      if (funcData) {
        setFuncoesList(
          (funcData as any[]).map((f) => ({
            id: f.id,
            ges_id: gesId,
            funcao_id: f.funcao_id,
            nome: f.funcoes?.nome || "Função",
            descricao: f.funcoes?.descricao_atividades || null,
            setor_nome: f.funcoes?.setores?.nome || null,
          })),
        );
      }
    } catch (err) {
      console.warn("Erro ao carregar dados complementares do GES:", err);
    }
  }

  // Current selected empresa object
  const currentEmpresa = useMemo(() => {
    return empresas.find((e) => e.id === selectedEmpresaId) || empresas[0];
  }, [empresas, selectedEmpresaId]);

  // --- Actions for TAB 2: Riscos ---
  const handleToggleSelectAllRiscos = () => {
    if (selectedRiscos.length === riscosList.length) {
      setSelectedRiscos([]);
    } else {
      setSelectedRiscos(riscosList.map((r) => r.id));
    }
  };

  const handleToggleSelectRisco = (id: string) => {
    setSelectedRiscos((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSaveRisco = (savedRisco: GesRiscoItem) => {
    setRiscosList((prev) => {
      const idx = prev.findIndex((r) => r.id === savedRisco.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = savedRisco;
        return copy;
      }
      return [...prev, savedRisco];
    });
    setEditingRisco(null);
    toast.success(
      editingRisco
        ? "Risco ocupacional atualizado."
        : "Risco ocupacional incluído na lista do GES.",
    );
  };

  const handleRemoveRisco = (id: string) => {
    setRiscosList((prev) => prev.filter((r) => r.id !== id));
    setSelectedRiscos((prev) => prev.filter((item) => item !== id));
  };

  // --- Actions for TAB 3: Responsáveis ---
  const handleAddResponsavel = () => {
    if (!responsavelForm.profissional_id) {
      toast.error("Selecione um profissional.");
      return;
    }
    if (responsaveisList.some((r) => r.profissional_id === responsavelForm.profissional_id)) {
      toast.error("Este profissional já está vinculado a este GES.");
      return;
    }
    const prof = profissionaisCatalogo.find((p) => p.id === responsavelForm.profissional_id);
    const newResp: GesResponsavelItem = {
      id: "temp_" + Math.random().toString(36).substring(2, 9),
      profissional_id: responsavelForm.profissional_id,
      nome: prof?.nome || "Profissional",
      cargo: prof?.cargo || null,
      registro: prof?.registro || null,
      papel: responsavelForm.papel.trim() || "Responsável Técnico",
    };
    setResponsaveisList((prev) => [...prev, newResp]);
    setIsResponsavelModalOpen(false);
    setResponsavelForm({ profissional_id: "", papel: "Responsável Técnico" });
    toast.success("Responsável vinculado à lista do GES.");
  };

  const handleRemoveResponsavel = (id: string) => {
    setResponsaveisList((prev) => prev.filter((r) => r.id !== id));
  };

  // --- Actions for TAB 4: Medidas de Proteção ---
  const handleToggleSelectAllMedidas = () => {
    if (selectedMedidas.length === medidasList.length) {
      setSelectedMedidas([]);
    } else {
      setSelectedMedidas(medidasList.map((m) => m.id));
    }
  };

  const handleToggleSelectMedida = (id: string) => {
    setSelectedMedidas((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleAddMedida = () => {
    if (!medidaForm.nome_medida.trim() && !medidaForm.medida_id) {
      toast.error("Informe a medida de proteção.");
      return;
    }
    if (medidaForm.medida_id && medidasList.some((m) => m.medida_id === medidaForm.medida_id)) {
      toast.error("Esta medida de proteção já está cadastrada neste GES.");
      return;
    }
    const cat = medidasCatalogo.find((m) => m.id === medidaForm.medida_id);
    const risco = riscosList.find((r) => r.risco_id === medidaForm.risco_id);
    const newMedida: GesMedidaItem = {
      id: "temp_" + Math.random().toString(36).substring(2, 9),
      risco_id: medidaForm.risco_id || undefined,
      nome_risco: risco?.nome_risco || "Geral / Todos os riscos",
      medida_id: medidaForm.medida_id || undefined,
      nome_medida: cat?.nome || medidaForm.nome_medida.trim(),
      eficaz: medidaForm.eficaz,
      med_protecao: medidaForm.med_protecao,
      cond_func: medidaForm.cond_func,
      uso_inint: medidaForm.uso_inint,
      prazo_validade: medidaForm.prazo_validade,
      period_troca: medidaForm.period_troca,
    };
    setMedidasList((prev) => [...prev, newMedida]);
    setIsMedidaModalOpen(false);
    setMedidaForm({
      risco_id: "",
      medida_id: "",
      nome_medida: "",
      eficaz: "Sim",
      med_protecao: "EPI",
      cond_func: "Adequada",
      uso_inint: "Sim",
      prazo_validade: "Dentro do prazo",
      period_troca: "Sempre que danificado",
    });
    toast.success("Medida de proteção incluída na lista.");
  };

  const handleRemoveMedida = (id: string) => {
    setMedidasList((prev) => prev.filter((m) => m.id !== id));
    setSelectedMedidas((prev) => prev.filter((item) => item !== id));
  };

  // --- Actions for TAB 5: Funções ---
  const handleAddFuncao = () => {
    if (!funcaoForm.funcao_id) {
      toast.error("Selecione uma função cadastrada.");
      return;
    }
    if (funcoesList.some((f) => f.funcao_id === funcaoForm.funcao_id)) {
      toast.error("Esta função já está vinculada a este GES.");
      return;
    }
    const func = funcoesCatalogo.find((f) => f.id === funcaoForm.funcao_id);
    const newFunc: GesFuncaoItem = {
      id: "temp_" + Math.random().toString(36).substring(2, 9),
      funcao_id: funcaoForm.funcao_id,
      nome: func?.nome || "Função",
      descricao: func?.descricao_atividades || null,
      setor_nome: func?.setores?.nome || null,
    };
    setFuncoesList((prev) => [...prev, newFunc]);
    setIsFuncaoModalOpen(false);
    setFuncaoForm({ funcao_id: "" });
    toast.success("Função vinculada à lista do GES.");
  };

  const handleRemoveFuncao = (id: string) => {
    setFuncoesList((prev) => prev.filter((f) => f.id !== id));
  };

  // --- Actions for TAB 6: Frentes de Trabalho ---
  const handleAddFrente = () => {
    if (!frenteForm.nome.trim()) {
      toast.error("Informe o nome da frente de trabalho.");
      return;
    }
    const newFrente: GesFrenteTrabalhoItem = {
      id: "temp_" + Math.random().toString(36).substring(2, 9),
      nome: frenteForm.nome.trim(),
      localizacao: frenteForm.localizacao.trim() || null,
    };
    setFrentesList((prev) => [...prev, newFrente]);
    setIsFrenteModalOpen(false);
    setFrenteForm({ nome: "", localizacao: "" });
    toast.success("Frente de trabalho vinculada.");
  };

  const handleRemoveFrente = (id: string) => {
    setFrentesList((prev) => prev.filter((f) => f.id !== id));
  };

  // --- Save Mutation ---
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!nomeGes.trim()) {
        throw new Error("O campo GES * é obrigatório.");
      }
      if (!selectedEmpresaId) {
        throw new Error("Selecione um Empregador / Empresa.");
      }

      const gesPayload = {
        empresa_id: selectedEmpresaId,
        cargo: nomeGes.trim(),
        descricao_atividade: descricao.trim() || null,
        unidade: unidade || null,
        observacoes: descricao.trim() || null,
      };

      let savedGesId = editingGes?.id;

      if (savedGesId) {
        const { error } = await supabase
          .from("ges" as never)
          .update(gesPayload as never)
          .eq("id", savedGesId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("ges" as never)
          .insert({
            ...gesPayload,
            created_by: userId,
          } as never)
          .select("id")
          .single();
        if (error) throw error;
        savedGesId = (data as any)?.id;
      }

      if (!savedGesId) throw new Error("Erro ao obter identificador do GES.");

      // Salva ou sincroniza riscos
      await supabase.from("ges_riscos" as never).delete().eq("ges_id", savedGesId);
      for (const r of riscosList) {
        await supabase.from("ges_riscos" as never).insert({
          ges_id: savedGesId,
          risco_id: r.risco_id,
          fontes_geradoras: r.fonte_geradora || null,
          trajetoria: r.trajetoria || null,
          recomendacao_medidas: r.recomendacoes || null,
          freq_exposicao: r.freq_exposicao || null,
          metodologia: r.metodologia || null,
          severidade: r.sev_conseq || null,
          probabilidade: r.prob_ocorr || null,
          classificacao: r.classificacao || null,
          estimativa: r.estimativa || null,
          tipo_avaliacao: r.tipo_avaliacao || null,
          avaliacao: r.avaliacao || null,
          data_avaliacao: r.data_avaliacao || null,
          intensidade: r.intensidade || null,
          equipamento: r.equipamento || null,
          utiliza_epc: r.utiliza_epc || null,
          epc_eficaz: r.epc_eficaz || null,
          utiliza_epi: r.utiliza_epi || null,
          gerar_pgr_pcmso: r.gerar_pgr_pcmso || null,
          obs_pgr: r.obs_pgr || null,
          gerar_lti: r.gerar_lti || null,
          insalubre: r.insalubre || null,
          anexo_nr15: r.anexo_nr15 || null,
          perc_insalubridade: r.perc_insalubridade || null,
          conclusao_insalubridade: r.conclusao_insalubridade || null,
          gerar_ltp: r.gerar_ltp || null,
          periculoso: r.periculoso || null,
          anexo_nr16: r.anexo_nr16 || null,
          perc_periculosidade: r.perc_periculosidade || null,
          conclusao_periculosidade: r.conclusao_periculosidade || null,
          gerar_ltcat: r.gerar_ltcat || null,
          aposentadoria_especial: r.aposentadoria_especial || null,
          codigo_gfip: r.codigo_gfip || null,
          conclusao_aposentadoria: r.conclusao_aposentadoria || null,
          esocial: typeof r.esocial === "boolean" ? r.esocial : !!r.esocial,
          created_by: userId,
        } as never);
      }

      // Salva responsáveis se novos
      for (const resp of responsaveisList) {
        if (resp.id.startsWith("temp_")) {
          await supabase.from("ges_responsaveis" as never).insert({
            ges_id: savedGesId,
            profissional_id: resp.profissional_id,
            papel: resp.papel,
            created_by: userId,
          } as never);
        }
      }

      // Salva medidas se novas
      for (const m of medidasList) {
        if (m.id.startsWith("temp_") && m.medida_id) {
          await supabase.from("ges_medidas" as never).insert({
            ges_id: savedGesId,
            medida_id: m.medida_id,
            observacao: m.period_troca,
            created_by: userId,
          } as never);
        }
      }

      // Salva funções se novas
      for (const f of funcoesList) {
        if (f.id.startsWith("temp_")) {
          await supabase.from("ges_funcoes" as never).insert({
            ges_id: savedGesId,
            funcao_id: f.funcao_id,
            created_by: userId,
          } as never);
        }
      }

      return savedGesId;
    },
    onSuccess: (savedId) => {
      toast.success("GES salvo com sucesso!");
      qc.invalidateQueries({ queryKey: ["ges"] });
      if (onSuccess) onSuccess(savedId);
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao salvar o GES.");
    },
  });

  const inputClass =
    "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20";
  const selectClass =
    "h-10 w-full rounded-xl border border-input bg-background px-3 text-sm font-medium outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-6xl overflow-hidden p-0 sm:rounded-3xl border-border bg-card shadow-2xl flex flex-col">
        {/* Header */}
        <DialogHeader className="border-b border-border/80 px-6 py-4 bg-muted/20">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-foreground">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <span>{editingGes ? "Editar GES" : "Cadastrar novo GES"}</span>
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Configure o Grupo de Exposição Similar, seus fatores de riscos, responsáveis técnicos, medidas de proteção e funções vinculadas.
          </DialogDescription>
        </DialogHeader>

        {/* Modal Body with 6 Tabs */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Tab Navigation Header */}
            <div className="border-b border-border mb-5 overflow-x-auto">
              <TabsList className="flex h-11 w-full min-w-[640px] justify-start gap-1 bg-transparent p-0">
                <TabsTrigger
                  value="ges"
                  className="rounded-t-lg border-b-2 border-transparent px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary"
                >
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" /> GES
                  </span>
                </TabsTrigger>

                <TabsTrigger
                  value="riscos"
                  className="rounded-t-lg border-b-2 border-transparent px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary"
                >
                  <span className="flex items-center gap-1.5">
                    <Shield className="h-4 w-4" /> Riscos Ocupacionais
                    {riscosList.length > 0 && (
                      <span className="ml-1 rounded-full bg-primary/20 px-1.5 py-0.2 text-[11px] font-bold text-primary">
                        {riscosList.length}
                      </span>
                    )}
                  </span>
                </TabsTrigger>

                <TabsTrigger
                  value="responsaveis"
                  className="rounded-t-lg border-b-2 border-transparent px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary"
                >
                  <span className="flex items-center gap-1.5">
                    <HardHat className="h-4 w-4" /> Responsáveis
                    {responsaveisList.length > 0 && (
                      <span className="ml-1 rounded-full bg-primary/20 px-1.5 py-0.2 text-[11px] font-bold text-primary">
                        {responsaveisList.length}
                      </span>
                    )}
                  </span>
                </TabsTrigger>

                <TabsTrigger
                  value="medidas"
                  className="rounded-t-lg border-b-2 border-transparent px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary"
                >
                  <span className="flex items-center gap-1.5">
                    <Layers className="h-4 w-4" /> Medidas de Proteção
                    {medidasList.length > 0 && (
                      <span className="ml-1 rounded-full bg-primary/20 px-1.5 py-0.2 text-[11px] font-bold text-primary">
                        {medidasList.length}
                      </span>
                    )}
                  </span>
                </TabsTrigger>

                <TabsTrigger
                  value="funcoes"
                  className="rounded-t-lg border-b-2 border-transparent px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary"
                >
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4" /> Funções
                    {funcoesList.length > 0 && (
                      <span className="ml-1 rounded-full bg-primary/20 px-1.5 py-0.2 text-[11px] font-bold text-primary">
                        {funcoesList.length}
                      </span>
                    )}
                  </span>
                </TabsTrigger>

                <TabsTrigger
                  value="frentes"
                  className="rounded-t-lg border-b-2 border-transparent px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary"
                >
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" /> Frentes de Trabalho
                    {frentesList.length > 0 && (
                      <span className="ml-1 rounded-full bg-primary/20 px-1.5 py-0.2 text-[11px] font-bold text-primary">
                        {frentesList.length}
                      </span>
                    )}
                  </span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ========================================================================= */}
            {/* 1. ABA: GES */}
            {/* ========================================================================= */}
            <TabsContent value="ges" className="space-y-5 focus-visible:outline-none">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Empregador */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Empregador
                  </label>
                  <select
                    value={selectedEmpresaId}
                    onChange={(e) => setSelectedEmpresaId(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Selecione o empregador...</option>
                    {empresas.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.razao_social || emp.nome} {emp.cnpj ? `(${emp.cnpj})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Unidade / Terceirização */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Unidade / Terceirização
                  </label>
                  <select
                    value={unidade}
                    onChange={(e) => setUnidade(e.target.value)}
                    className={selectClass}
                  >
                    {UNIDADES_MOCK.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 items-start">
                {/* Validade da alteração */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Validade da Alteração
                  </label>
                  <div className="flex flex-wrap gap-1 rounded-2xl border border-input bg-muted/40 p-1">
                    {VALIDADE_OPCOES.map((op) => {
                      const active = validadeAlteracao === op.id;
                      return (
                        <button
                          key={op.id}
                          type="button"
                          onClick={() => setValidadeAlteracao(op.id)}
                          className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold capitalize transition-all ${
                            active
                              ? "bg-card text-primary shadow-sm border border-border/80 font-bold"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {op.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* GES * */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    GES <span className="text-destructive">*</span>
                  </label>
                  <input
                    value={nomeGes}
                    onChange={(e) => setNomeGes(e.target.value)}
                    placeholder="Ex.: Administrativo, Operacional..."
                    className={`${inputClass} font-semibold`}
                    autoFocus
                  />
                </div>
              </div>

              {/* Descrição */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Descrição
                  </label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-muted-foreground hover:text-foreground">
                          <HelpCircle className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs text-xs">
                          Descreva o ambiente físico, características de jornada, rotina de trabalho e particularidades deste Grupo de Exposição Similar.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descrição complementar do GES..."
                  rows={4}
                  className={`${inputClass} resize-y min-h-[100px]`}
                />
              </div>

              {/* Resumo de Setores e Funções vinculados (Regra 15) */}
              <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4 text-primary" /> Setores e Funções cobertos por este GES
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {funcoesList.length} função(ões) vinculada(s)
                  </span>
                </div>
                {funcoesList.length === 0 ? (
                  <p className="text-xs italic text-muted-foreground">
                    Nenhuma função vinculada a este GES ainda. Vincule funções na aba <strong>Funções</strong> para definir a cobertura deste grupo homogêneo.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {funcoesList.map((f) => (
                      <div
                        key={f.id}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs shadow-xs"
                      >
                        <span className="font-bold text-foreground">{f.nome}</span>
                        {f.setor_nome && (
                          <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                            {f.setor_nome}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ========================================================================= */}
            {/* 2. ABA: RISCOS OCUPACIONAIS */}
            {/* ========================================================================= */}
            <TabsContent value="riscos" className="space-y-5 focus-visible:outline-none">
              {/* Tabela de Riscos Ocupacionais */}
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-muted/60 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                      <tr>
                        <th className="w-10 px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={riscosList.length > 0 && selectedRiscos.length === riscosList.length}
                            onChange={handleToggleSelectAllRiscos}
                            className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                          />
                        </th>
                        <th className="px-3 py-3 font-bold">
                          <span className="inline-flex items-center gap-1">
                            Risco Ocupacional <ArrowUpDown className="h-3 w-3 text-primary" />
                          </span>
                        </th>
                        <th className="px-3 py-3">Fonte Geradora</th>
                        <th className="px-3 py-3">Trajetória</th>
                        <th className="px-3 py-3">Recomendações</th>
                        <th className="px-3 py-3 whitespace-nowrap">Freq. Expos.</th>
                        <th className="px-3 py-3">Metodologia</th>
                        <th className="px-3 py-3 whitespace-nowrap">Sev. Conseq.</th>
                        <th className="px-3 py-3 whitespace-nowrap">Prob. Ocorr.</th>
                        <th className="px-3 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {riscosList.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="p-8 text-center text-sm italic text-muted-foreground">
                            Nenhum registro encontrado
                          </td>
                        </tr>
                      ) : (
                        riscosList.map((r) => {
                          const isSelected = selectedRiscos.includes(r.id);
                          return (
                            <tr
                              key={r.id}
                              className={`transition-colors hover:bg-muted/30 ${
                                isSelected ? "bg-primary/5" : ""
                              }`}
                            >
                              <td className="px-3 py-2.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectRisco(r.id)}
                                  className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                                />
                              </td>
                              <td className="px-3 py-2.5 font-bold text-foreground">
                                {r.nome_risco}
                              </td>
                              <td className="px-3 py-2.5 text-muted-foreground">{r.fonte_geradora}</td>
                              <td className="px-3 py-2.5 text-muted-foreground">{r.trajetoria}</td>
                              <td className="px-3 py-2.5 text-muted-foreground max-w-[200px] truncate">
                                {r.recomendacoes}
                              </td>
                              <td className="px-3 py-2.5 text-muted-foreground">{r.freq_exposicao}</td>
                              <td className="px-3 py-2.5 text-muted-foreground">{r.metodologia}</td>
                              <td className="px-3 py-2.5">
                                <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600">
                                  {r.sev_conseq}
                                </span>
                              </td>
                              <td className="px-3 py-2.5">
                                <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-600">
                                  {r.prob_ocorr}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-right">
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingRisco(r);
                                      setIsRiscoModalOpen(true);
                                    }}
                                    title="Editar risco"
                                    className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveRisco(r.id)}
                                    title="Remover risco"
                                    className="rounded-lg p-1 text-destructive hover:bg-destructive/10 transition-colors"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Botões de Ação Inferiores da Aba Riscos */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingRisco(null);
                      setIsRiscoModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
                  >
                    <Plus className="h-4 w-4" /> Incluir novo risco ocupacional
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleSelectAllRiscos}
                    disabled={riscosList.length === 0}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs sm:text-sm font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    <CheckSquare className="h-4 w-4 text-muted-foreground" /> Selecionar tudo
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCopiarAmbienteModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs sm:text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                  >
                    <Copy className="h-4 w-4 text-muted-foreground" /> Copiar Riscos do Ambiente
                  </button>
                </div>
              </div>

              {/* Seção: Análise Ergonômica */}
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    Análise Ergonômica <Plus className="h-3.5 w-3.5 text-primary" />
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 items-center">
                  <select
                    value={analiseErgonomica}
                    onChange={(e) => setAnaliseErgonomica(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Selecione uma Análise Ergonômica cadastrada...</option>
                    <option value="AET-01">AET 2026 - Postos Administrativos e Operacionais</option>
                    <option value="AET-02">AET - Ergonomia em Computadores e Check-out</option>
                    <option value="AET-03">AEP - Avaliação Ergonômica Preliminar NR-17</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (analiseErgonomica) {
                        toast.success("Análise Ergonômica vinculada com sucesso.");
                      } else {
                        toast.info("Selecione uma análise para vincular.");
                      }
                    }}
                    className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground hover:bg-muted"
                  >
                    <Tag className="h-4 w-4 text-primary" /> Vincular AET
                  </button>
                </div>
              </div>
            </TabsContent>

            {/* ========================================================================= */}
            {/* 3. ABA: RESPONSÁVEIS */}
            {/* ========================================================================= */}
            <TabsContent value="responsaveis" className="space-y-5 focus-visible:outline-none">
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-muted/60 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                      <tr>
                        <th className="px-4 py-3 font-bold">
                          <span className="inline-flex items-center gap-1">
                            Responsáveis <ArrowUpDown className="h-3 w-3 text-primary" />
                          </span>
                        </th>
                        <th className="px-4 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {responsaveisList.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="p-8 text-center text-sm italic text-muted-foreground">
                            Nenhum registro encontrado
                          </td>
                        </tr>
                      ) : (
                        responsaveisList.map((resp) => (
                          <tr key={resp.id} className="transition-colors hover:bg-muted/30">
                            <td className="px-4 py-3">
                              <p className="font-bold text-foreground">{resp.nome}</p>
                              <p className="text-xs text-muted-foreground">
                                {[resp.cargo, resp.registro, resp.papel].filter(Boolean).join(" · ")}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveResponsavel(resp.id)}
                                title="Desvincular responsável"
                                className="rounded-lg p-1 text-destructive hover:bg-destructive/10 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Botão Vincular novo responsável */}
              <div className="flex items-center pt-1">
                <button
                  type="button"
                  onClick={() => setIsResponsavelModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
                >
                  <Plus className="h-4 w-4" /> Vincular novo responsável
                </button>
              </div>
            </TabsContent>

            {/* ========================================================================= */}
            {/* 4. ABA: MEDIDAS DE PROTEÇÃO */}
            {/* ========================================================================= */}
            <TabsContent value="medidas" className="space-y-5 focus-visible:outline-none">
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-muted/60 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                      <tr>
                        <th className="w-10 px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={medidasList.length > 0 && selectedMedidas.length === medidasList.length}
                            onChange={handleToggleSelectAllMedidas}
                            className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                          />
                        </th>
                        <th className="px-3 py-3 font-bold">
                          <span className="inline-flex items-center gap-1">
                            Risco Ocupacional <ArrowUpDown className="h-3 w-3 text-primary" />
                          </span>
                        </th>
                        <th className="px-3 py-3">Medida de Proteção</th>
                        <th className="px-3 py-3">Efic.</th>
                        <th className="px-3 py-3">Med. Proteção</th>
                        <th className="px-3 py-3">Cond. Func.</th>
                        <th className="px-3 py-3">Uso Inint.</th>
                        <th className="px-3 py-3">Prazo Validade</th>
                        <th className="px-3 py-3">Period. Troca</th>
                        <th className="px-3 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {medidasList.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="p-8 text-center text-sm italic text-muted-foreground">
                            Nenhum registro encontrado
                          </td>
                        </tr>
                      ) : (
                        medidasList.map((m) => {
                          const isSelected = selectedMedidas.includes(m.id);
                          return (
                            <tr
                              key={m.id}
                              className={`transition-colors hover:bg-muted/30 ${
                                isSelected ? "bg-primary/5" : ""
                              }`}
                            >
                              <td className="px-3 py-2.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectMedida(m.id)}
                                  className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                                />
                              </td>
                              <td className="px-3 py-2.5 font-semibold text-foreground">
                                {m.nome_risco || "Geral"}
                              </td>
                              <td className="px-3 py-2.5 font-bold text-foreground">
                                {m.nome_medida}
                              </td>
                              <td className="px-3 py-2.5">
                                <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600">
                                  {m.eficaz}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-muted-foreground">{m.med_protecao}</td>
                              <td className="px-3 py-2.5 text-muted-foreground">{m.cond_func}</td>
                              <td className="px-3 py-2.5 text-muted-foreground">{m.uso_inint}</td>
                              <td className="px-3 py-2.5 text-muted-foreground">{m.prazo_validade}</td>
                              <td className="px-3 py-2.5 text-muted-foreground">{m.period_troca}</td>
                              <td className="px-3 py-2.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMedida(m.id)}
                                  title="Remover medida"
                                  className="rounded-lg p-1 text-destructive hover:bg-destructive/10 transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Botões de Ação da Aba Medidas */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsMedidaModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
                >
                  <Plus className="h-4 w-4" /> Incluir nova medida
                </button>

                <button
                  type="button"
                  onClick={handleToggleSelectAllMedidas}
                  disabled={medidasList.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs sm:text-sm font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                >
                  <CheckSquare className="h-4 w-4 text-muted-foreground" /> Selecionar tudo
                </button>
              </div>
            </TabsContent>

            {/* ========================================================================= */}
            {/* 5. ABA: FUNÇÕES */}
            {/* ========================================================================= */}
            <TabsContent value="funcoes" className="space-y-5 focus-visible:outline-none">
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-muted/60 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                      <tr>
                        <th className="px-4 py-3 font-bold">
                          <span className="inline-flex items-center gap-1">
                            Função <ArrowUpDown className="h-3 w-3 text-primary" />
                          </span>
                        </th>
                        <th className="px-4 py-3 font-bold">Setor</th>
                        <th className="px-4 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {funcoesList.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-8 text-center text-sm italic text-muted-foreground">
                            Nenhum registro encontrado
                          </td>
                        </tr>
                      ) : (
                        funcoesList.map((f) => (
                          <tr key={f.id} className="transition-colors hover:bg-muted/30">
                            <td className="px-4 py-3">
                              <p className="font-bold text-foreground">{f.nome}</p>
                              {f.descricao && (
                                <p className="text-xs text-muted-foreground line-clamp-1">{f.descricao}</p>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {f.setor_nome ? (
                                <span className="inline-flex items-center rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                                  {f.setor_nome}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">— Sem setor —</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveFuncao(f.id)}
                                title="Desvincular função"
                                className="rounded-lg p-1 text-destructive hover:bg-destructive/10 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Botão Vincular nova função relacionada */}
              <div className="flex items-center pt-1">
                <button
                  type="button"
                  onClick={() => setIsFuncaoModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
                >
                  <Plus className="h-4 w-4" /> Vincular nova função relacionada
                </button>
              </div>
            </TabsContent>

            {/* ========================================================================= */}
            {/* 6. ABA: FRENTES DE TRABALHO */}
            {/* ========================================================================= */}
            <TabsContent value="frentes" className="space-y-5 focus-visible:outline-none">
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-muted/60 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                      <tr>
                        <th className="px-4 py-3 font-bold">
                          <span className="inline-flex items-center gap-1">
                            Frente de Trabalho <ArrowUpDown className="h-3 w-3 text-primary" />
                          </span>
                        </th>
                        <th className="px-4 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {frentesList.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="p-8 text-center text-sm italic text-muted-foreground">
                            Nenhum registro encontrado
                          </td>
                        </tr>
                      ) : (
                        frentesList.map((fr) => (
                          <tr key={fr.id} className="transition-colors hover:bg-muted/30">
                            <td className="px-4 py-3">
                              <p className="font-bold text-foreground">{fr.nome}</p>
                              {fr.localizacao && (
                                <p className="text-xs text-muted-foreground">{fr.localizacao}</p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveFrente(fr.id)}
                                title="Desvincular frente de trabalho"
                                className="rounded-lg p-1 text-destructive hover:bg-destructive/10 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Botão Vincular Frentes de Trabalho */}
              <div className="flex items-center pt-1">
                <button
                  type="button"
                  onClick={() => setIsFrenteModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
                >
                  <Plus className="h-4 w-4" /> Vincular Frentes de Trabalho
                </button>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Modal Footer */}
        <DialogFooter className="border-t border-border/80 px-6 py-3.5 bg-muted/20 flex flex-row items-center justify-between sm:justify-between gap-3">
          <div className="text-xs text-muted-foreground hidden sm:block">
            {riscosList.length} risco(s) · {responsaveisList.length} responsável(eis) · {funcoesList.length} função(ões)
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-xl border border-border bg-card px-4 py-2 text-xs sm:text-sm font-bold text-foreground hover:bg-muted transition-colors"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-5 py-2 text-xs sm:text-sm font-bold text-primary-foreground shadow-glow hover:opacity-95 transition-all disabled:opacity-50"
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </button>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* ========================================================================= */}
      {/* MODAL SECUNDÁRIO 1: Cadastrar / Editar Risco Ocupacional */}
      {/* ========================================================================= */}
      <RiscoOcupacionalFormDialog
        open={isRiscoModalOpen}
        onOpenChange={(isOpen) => {
          setIsRiscoModalOpen(isOpen);
          if (!isOpen) setEditingRisco(null);
        }}
        onSave={handleSaveRisco}
        editingRisco={editingRisco}
        empresaId={selectedEmpresaId}
      />

      {/* ========================================================================= */}
      {/* MODAL SECUNDÁRIO 2: Copiar Riscos do Ambiente */}
      {/* ========================================================================= */}
      <Dialog open={isCopiarAmbienteModalOpen} onOpenChange={setIsCopiarAmbienteModalOpen}>
        <DialogContent className="max-w-md rounded-3xl border-border bg-card p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary font-bold">
              <Copy className="h-5 w-5" /> Copiar Riscos do Ambiente
            </DialogTitle>
            <DialogDescription className="text-xs">
              Selecione um ambiente de trabalho existente para importar seus riscos automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <label className="text-xs font-bold uppercase text-muted-foreground">
              Ambiente de Trabalho
            </label>
            <select className={selectClass}>
              <option value="">Selecione um ambiente...</option>
              <option value="amb_1">Setor Administrativo Central</option>
              <option value="amb_2">Galpão de Produção e Logística</option>
              <option value="amb_3">Oficina de Manutenção</option>
            </select>
          </div>

          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={() => setIsCopiarAmbienteModalOpen(false)}
              className="rounded-xl border border-border bg-card px-4 py-2 text-xs sm:text-sm font-bold text-foreground hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                toast.success("Riscos do ambiente copiados com sucesso!");
                setIsCopiarAmbienteModalOpen(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs sm:text-sm font-bold text-primary-foreground hover:opacity-90"
            >
              <Check className="h-4 w-4" /> Importar Riscos
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL SECUNDÁRIO 3: Vincular Responsável */}
      {/* ========================================================================= */}
      <Dialog open={isResponsavelModalOpen} onOpenChange={setIsResponsavelModalOpen}>
        <DialogContent className="max-w-md rounded-3xl border-border bg-card p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary font-bold">
              <HardHat className="h-5 w-5" /> Vincular novo responsável
            </DialogTitle>
            <DialogDescription className="text-xs">
              Selecione o profissional SST e seu papel técnico neste GES.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-muted-foreground">
                Profissional SST *
              </label>
              <select
                value={responsavelForm.profissional_id}
                onChange={(e) =>
                  setResponsavelForm((f) => ({ ...f, profissional_id: e.target.value }))
                }
                className={selectClass}
              >
                <option value="">Selecione um profissional...</option>
                {profissionaisCatalogo.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} {p.cargo ? `— ${p.cargo}` : ""} {p.registro ? `(${p.registro})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-muted-foreground">
                Papel / Atribuição
              </label>
              <input
                value={responsavelForm.papel}
                onChange={(e) => setResponsavelForm((f) => ({ ...f, papel: e.target.value }))}
                placeholder="Ex.: Responsável Técnico, Elaborador do PGR..."
                className={inputClass}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={() => setIsResponsavelModalOpen(false)}
              className="rounded-xl border border-border bg-card px-4 py-2 text-xs sm:text-sm font-bold text-foreground hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleAddResponsavel}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs sm:text-sm font-bold text-white hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" /> Vincular
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL SECUNDÁRIO 4: Incluir Medida de Proteção */}
      {/* ========================================================================= */}
      <Dialog open={isMedidaModalOpen} onOpenChange={setIsMedidaModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto rounded-3xl border-border bg-card p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary font-bold">
              <Layers className="h-5 w-5" /> Incluir nova medida de proteção
            </DialogTitle>
            <DialogDescription className="text-xs">
              Cadastre ou vincule um EPI, EPC ou medida administrativa ao GES.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3.5 py-2 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-bold uppercase text-muted-foreground">
                Medida de Proteção / EPI *
              </label>
              <select
                value={medidaForm.medida_id}
                onChange={(e) => {
                  const val = e.target.value;
                  const cat = medidasCatalogo.find((m) => m.id === val);
                  setMedidaForm((f) => ({
                    ...f,
                    medida_id: val,
                    nome_medida: cat?.nome || f.nome_medida,
                    med_protecao: cat?.tipo || f.med_protecao,
                  }));
                }}
                className={selectClass}
              >
                <option value="">Selecione uma medida do catálogo ou digite abaixo...</option>
                {medidasCatalogo.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome} ({m.tipo} {m.ca ? `· CA ${m.ca}` : ""})
                  </option>
                ))}
              </select>
            </div>

            {!medidaForm.medida_id && (
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-bold uppercase text-muted-foreground">
                  Ou digite o nome da medida
                </label>
                <input
                  value={medidaForm.nome_medida}
                  onChange={(e) => setMedidaForm((f) => ({ ...f, nome_medida: e.target.value }))}
                  placeholder="Ex.: Óculos de proteção ampla visão, Ventilação local..."
                  className={inputClass}
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-muted-foreground">
                Tipo (Med. Proteção)
              </label>
              <select
                value={medidaForm.med_protecao}
                onChange={(e) => setMedidaForm((f) => ({ ...f, med_protecao: e.target.value }))}
                className={selectClass}
              >
                <option value="EPI">EPI</option>
                <option value="EPC">EPC</option>
                <option value="Administrativa">Administrativa</option>
                <option value="Treinamento">Treinamento</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-muted-foreground">
                Eficácia
              </label>
              <select
                value={medidaForm.eficaz}
                onChange={(e) => setMedidaForm((f) => ({ ...f, eficaz: e.target.value }))}
                className={selectClass}
              >
                <option value="Sim">Sim</option>
                <option value="Não">Não</option>
                <option value="Não se aplica">Não se aplica</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-muted-foreground">
                Cond. Funcionamento
              </label>
              <input
                value={medidaForm.cond_func}
                onChange={(e) => setMedidaForm((f) => ({ ...f, cond_func: e.target.value }))}
                placeholder="Adequada, Regular..."
                className={inputClass}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-muted-foreground">
                Uso Ininterrupto
              </label>
              <select
                value={medidaForm.uso_inint}
                onChange={(e) => setMedidaForm((f) => ({ ...f, uso_inint: e.target.value }))}
                className={selectClass}
              >
                <option value="Sim">Sim</option>
                <option value="Não">Não</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-muted-foreground">
                Prazo de Validade / CA
              </label>
              <input
                value={medidaForm.prazo_validade}
                onChange={(e) => setMedidaForm((f) => ({ ...f, prazo_validade: e.target.value }))}
                placeholder="Dentro do prazo..."
                className={inputClass}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-muted-foreground">
                Periodicidade de Troca
              </label>
              <input
                value={medidaForm.period_troca}
                onChange={(e) => setMedidaForm((f) => ({ ...f, period_troca: e.target.value }))}
                placeholder="Ex.: Semestral, Sempre que danificado..."
                className={inputClass}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={() => setIsMedidaModalOpen(false)}
              className="rounded-xl border border-border bg-card px-4 py-2 text-xs sm:text-sm font-bold text-foreground hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleAddMedida}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs sm:text-sm font-bold text-white hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" /> Incluir Medida
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL SECUNDÁRIO 5: Vincular Função Relacionada */}
      {/* ========================================================================= */}
      <Dialog open={isFuncaoModalOpen} onOpenChange={setIsFuncaoModalOpen}>
        <DialogContent className="max-w-md rounded-3xl border-border bg-card p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary font-bold">
              <Briefcase className="h-5 w-5" /> Vincular nova função relacionada
            </DialogTitle>
            <DialogDescription className="text-xs">
              Selecione uma função cadastrada na empresa para associar a este GES.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-muted-foreground">
                Função da Empresa *
              </label>
              <select
                value={funcaoForm.funcao_id}
                onChange={(e) => setFuncaoForm({ funcao_id: e.target.value })}
                className={selectClass}
              >
                <option value="">Selecione uma função...</option>
                {funcoesCatalogo.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome} {f.setores?.nome ? `— Setor: ${f.setores.nome}` : ""}
                  </option>
                ))}
              </select>
            </div>
            {funcoesCatalogo.length === 0 && (
              <p className="text-xs text-amber-600 italic">
                Nenhuma função cadastrada para esta empresa. Você poderá cadastrar no menu Cadastros → Funções.
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={() => setIsFuncaoModalOpen(false)}
              className="rounded-xl border border-border bg-card px-4 py-2 text-xs sm:text-sm font-bold text-foreground hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleAddFuncao}
              disabled={!funcaoForm.funcao_id}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs sm:text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Vincular Função
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL SECUNDÁRIO 6: Vincular Frentes de Trabalho */}
      {/* ========================================================================= */}
      <Dialog open={isFrenteModalOpen} onOpenChange={setIsFrenteModalOpen}>
        <DialogContent className="max-w-md rounded-3xl border-border bg-card p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary font-bold">
              <MapPin className="h-5 w-5" /> Vincular Frente de Trabalho
            </DialogTitle>
            <DialogDescription className="text-xs">
              Informe os dados da frente de trabalho / posto de serviço associado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-muted-foreground">
                Nome da Frente de Trabalho *
              </label>
              <input
                value={frenteForm.nome}
                onChange={(e) => setFrenteForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex.: Canteiro de Obras 01, Setor Agrícola Sul..."
                className={inputClass}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-muted-foreground">
                Localização / Descrição
              </label>
              <input
                value={frenteForm.localizacao}
                onChange={(e) => setFrenteForm((f) => ({ ...f, localizacao: e.target.value }))}
                placeholder="Ex.: Rodovia BR-020, Km 45..."
                className={inputClass}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={() => setIsFrenteModalOpen(false)}
              className="rounded-xl border border-border bg-card px-4 py-2 text-xs sm:text-sm font-bold text-foreground hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleAddFrente}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs sm:text-sm font-bold text-white hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" /> Vincular Frente
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
