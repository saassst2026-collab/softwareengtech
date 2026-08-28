import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileCheck2,
  Calendar,
  UserCheck,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Building2,
  Layers,
  Briefcase,
  AlertCircle,
} from "lucide-react";
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
import { logAudit } from "@/lib/audit";
import { gerarPgrPDF, downloadPgrPDF, type PgrDocumentData } from "@/lib/pgrPdf";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresaId: string;
  userId?: string | null;
};

type Profissional = {
  id: string;
  nome: string;
  cargo: string | null;
  registro: string | null;
  tipo_registro: string | null;
  cpf: string | null;
  email: string | null;
  ativo: boolean;
};

function formatDateToInput(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateBR(isoDate: string): string {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoDate;
}

export function GerarPgrDialog({ open, onOpenChange, empresaId, userId }: Props) {
  const { settings } = useAppSettings();

  // Datas padrão: hoje e daqui a 2 anos (conforme NR-01.5.4.4.6)
  const hoje = useMemo(() => new Date(), []);
  const doisAnosDepois = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 2);
    return d;
  }, []);

  const [vigenciaInicio, setVigenciaInicio] = useState(() => formatDateToInput(hoje));
  const [vigenciaFim, setVigenciaFim] = useState(() => formatDateToInput(doisAnosDepois));
  const [responsavelId, setResponsavelId] = useState("");
  const [revisao, setRevisao] = useState("00");
  const [localEmissao, setLocalEmissao] = useState("");
  const [gerando, setGerando] = useState(false);

  // 1. Carrega dados da empresa
  const { data: empresa, isLoading: loadingEmpresa } = useQuery({
    queryKey: ["empresa-pgr", empresaId],
    enabled: !!empresaId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresas")
        .select("*")
        .eq("id", empresaId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Atualiza local de emissão com base na cidade da empresa quando carregado
  useMemo(() => {
    if (empresa && !localEmissao) {
      const loc = [empresa.cidade, empresa.uf].filter(Boolean).join(" - ");
      if (loc) setLocalEmissao(loc);
    }
  }, [empresa, localEmissao]);

  // 2. Carrega lista de profissionais cadastrados no sistema
  const { data: profissionais = [], isLoading: loadingProfissionais } = useQuery({
    queryKey: ["profissionais-pgr"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profissionais")
        .select("*")
        .order("nome");
      if (error) throw error;
      return (data ?? []) as Profissional[];
    },
  });

  // 3. Carrega GES e vínculos da empresa para validação e geração
  const { data: gesData = [], isLoading: loadingGes } = useQuery({
    queryKey: ["ges-pgr", empresaId],
    enabled: !!empresaId && open,
    queryFn: async () => {
      const { data: gesList, error: errGes } = await supabase
        .from("ges" as never)
        .select("*")
        .eq("empresa_id", empresaId)
        .order("cargo");
      if (errGes) throw errGes;

      const gesItems = (gesList ?? []) as Array<Record<string, any>>;
      if (gesItems.length === 0) return [];

      const gesIds = gesItems.map((g) => g.id);

      // Carrega Funções vinculadas aos GES
      const { data: gesFuncoes } = await supabase
        .from("ges_funcoes" as never)
        .select("ges_id, funcao_id, funcoes(id, nome, descricao_atividades)")
        .in("ges_id", gesIds);

      // Carrega Riscos vinculados aos GES
      const { data: gesRiscos } = await supabase
        .from("ges_riscos" as never)
        .select("*, riscos_ocupacionais(id, nome, tipo, codigo, descricao_risco)")
        .in("ges_id", gesIds);

      // Carrega Medidas de Proteção / EPI vinculadas aos GES
      const { data: gesMedidas } = await supabase
        .from("ges_medidas" as never)
        .select("ges_id, medida_id, observacao, medidas_controle(id, nome, tipo, ca, fabricante)")
        .in("ges_id", gesIds);

      // Mapeia estrutura completa de cada GES
      return gesItems.map((g) => {
        const funcoes = (gesFuncoes ?? [])
          .filter((gf: any) => gf.ges_id === g.id && gf.funcoes)
          .map((gf: any) => ({
            id: gf.funcoes.id,
            nome: gf.funcoes.nome,
            descricao_atividades: gf.funcoes.descricao_atividades,
          }));

        const riscos = (gesRiscos ?? [])
          .filter((gr: any) => gr.ges_id === g.id)
          .map((gr: any) => ({
            id: gr.id,
            nome_risco: gr.riscos_ocupacionais?.nome || "Risco Ocupacional",
            tipo_risco: gr.riscos_ocupacionais?.tipo || "não especificado",
            codigo_esocial: gr.riscos_ocupacionais?.codigo,
            fontes_geradoras: gr.fontes_geradoras,
            trajetoria: gr.trajetoria,
            freq_exposicao: gr.freq_exposicao,
            metodologia: gr.metodologia,
            severidade: gr.severidade,
            probabilidade: gr.probabilidade,
            classificacao: gr.classificacao,
            tipo_avaliacao: gr.tipo_avaliacao,
            avaliacao: gr.avaliacao,
            data_avaliacao: gr.data_avaliacao,
            intensidade: gr.intensidade,
            equipamento: gr.equipamento,
            recomendacao_medidas: gr.recomendacao_medidas,
            utiliza_epc: gr.utiliza_epc,
            epc_eficaz: gr.epc_eficaz,
            utiliza_epi: gr.utiliza_epi,
            gerar_pgr_pcmso: gr.gerar_pgr_pcmso,
            obs_pgr: gr.obs_pgr,
            insalubre: gr.insalubre,
            periculoso: gr.periculoso,
            aposentadoria_especial: gr.aposentadoria_especial,
          }));

        const medidas = (gesMedidas ?? [])
          .filter((gm: any) => gm.ges_id === g.id && gm.medidas_controle)
          .map((gm: any) => ({
            id: gm.medidas_controle.id,
            nome_medida: gm.medidas_controle.nome,
            tipo: gm.medidas_controle.tipo,
            ca: gm.medidas_controle.ca,
            fabricante: gm.medidas_controle.fabricante,
            observacao: gm.observacao,
          }));

        return {
          ...g,
          funcoes,
          riscos,
          medidas,
        };
      });
    },
  });

  // 4. Carrega contagem de trabalhadores da empresa
  const { data: totalTrabalhadores = 0 } = useQuery({
    queryKey: ["trabalhadores-count", empresaId],
    enabled: !!empresaId && open,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("trabalhadores" as never)
        .select("*", { count: "exact", head: true })
        .eq("empresa_id", empresaId);
      if (error) return 0;
      return count ?? 0;
    },
  });

  // Métricas agregadas
  const totalGes = gesData.length;
  const totalFuncoes = useMemo(
    () => gesData.reduce((acc, g) => acc + (g.funcoes?.length || 0), 0),
    [gesData],
  );
  const totalRiscos = useMemo(
    () => gesData.reduce((acc, g) => acc + (g.riscos?.length || 0), 0),
    [gesData],
  );

  // Validações obrigatórias
  const validacao = useMemo(() => {
    if (!empresaId || !empresa) {
      return { ok: false, motivo: "Nenhuma empresa selecionada para a geração do PGR." };
    }
    if (totalGes === 0) {
      return {
        ok: false,
        motivo: "Nenhum Grupo de Exposição Similar (GES) cadastrado para esta empresa.",
      };
    }
    if (totalFuncoes === 0) {
      return {
        ok: false,
        motivo: "Nenhuma função vinculada aos Grupos de Exposição Similar (GES).",
      };
    }
    if (!responsavelId) {
      return {
        ok: false,
        motivo: "Nenhum responsável técnico selecionado para a elaboração do PGR.",
      };
    }
    if (!vigenciaInicio || !vigenciaFim) {
      return {
        ok: false,
        motivo: "Período de vigência do PGR incompleto ou não informado.",
      };
    }
    if (new Date(vigenciaFim) <= new Date(vigenciaInicio)) {
      return {
        ok: false,
        motivo: "A data final de vigência deve ser posterior à data inicial.",
      };
    }
    return { ok: true, motivo: "" };
  }, [empresaId, empresa, totalGes, totalFuncoes, responsavelId, vigenciaInicio, vigenciaFim]);

  const profissionalSelecionado = useMemo(
    () => profissionais.find((p) => p.id === responsavelId),
    [profissionais, responsavelId],
  );

  const handleGerarPgr = async () => {
    if (!validacao.ok) {
      toast.error(`Não foi possível gerar o PGR. ${validacao.motivo}`);
      return;
    }
    if (!empresa || !profissionalSelecionado) return;

    setGerando(true);
    try {
      const pgrPayload: PgrDocumentData = {
        empresa: {
          id: empresa.id,
          nome: empresa.nome,
          razao_social: empresa.razao_social,
          cnpj: empresa.cnpj,
          inscricao_estadual: (empresa as any).inscricao_estadual ?? null,
          endereco: (empresa as any).endereco ?? null,
          bairro: (empresa as any).bairro ?? null,
          cidade: (empresa as any).cidade ?? null,
          uf: (empresa as any).uf ?? null,
          cep: (empresa as any).cep ?? null,
          cnae: (empresa as any).cnae ?? null,
          grau_risco: (empresa as any).grau_risco ?? null,
          email: (empresa as any).email ?? null,
          contato: (empresa as any).contato ?? (empresa as any).telefone ?? null,
        },
        vigencia: {
          inicio: formatDateBR(vigenciaInicio),
          fim: formatDateBR(vigenciaFim),
          revisao: revisao.trim() || "00",
          localEmissao: localEmissao.trim() || "Brasil",
          dataEmissao: formatDateBR(formatDateToInput(new Date())),
        },
        responsavel: {
          id: profissionalSelecionado.id,
          nome: profissionalSelecionado.nome,
          cargo: profissionalSelecionado.cargo,
          registro: profissionalSelecionado.registro,
          tipo_registro: profissionalSelecionado.tipo_registro,
          cpf: profissionalSelecionado.cpf,
          email: profissionalSelecionado.email,
        },
        gesList: gesData,
        totalTrabalhadores,
        logoUrl: settings?.app_icon_url ?? settings?.proposta_logo_url ?? null,
        appName: settings?.app_name ?? "EngTech SST",
      };

      // Gera o documento técnico em PDF
      const doc = await gerarPgrPDF(pgrPayload);
      downloadPgrPDF(
        doc,
        empresa.razao_social || empresa.nome,
        pgrPayload.vigencia.revisao,
      );

      // Registra persistência na tabela pgr_documentos
      try {
        await supabase.from("pgr_documentos" as never).insert({
          empresa_id: empresa.id,
          codigo: `PGR-${empresa.id.slice(0, 4).toUpperCase()}`,
          revisao: pgrPayload.vigencia.revisao,
          vigencia_inicio: vigenciaInicio,
          vigencia_fim: vigenciaFim,
          gerado_em: new Date().toISOString(),
          gerado_por: userId || null,
        } as never);
      } catch (errDb) {
        console.warn("Aviso ao salvar histórico em pgr_documentos:", errDb);
      }

      // Sincroniza tabela documentos_sst (PGR)
      try {
        const { data: docExistente } = await supabase
          .from("documentos_sst")
          .select("id")
          .eq("empresa_id", empresa.id)
          .eq("tipo", "PGR")
          .maybeSingle();

        if (docExistente) {
          await supabase
            .from("documentos_sst")
            .update({
              situacao: "em_dia",
              data_vencimento: vigenciaFim,
              responsavel: profissionalSelecionado.nome,
              titulo: `PGR - Rev ${pgrPayload.vigencia.revisao}`,
            })
            .eq("id", docExistente.id);
        } else {
          await supabase.from("documentos_sst").insert({
            empresa_id: empresa.id,
            tipo: "PGR",
            titulo: `PGR - Rev ${pgrPayload.vigencia.revisao}`,
            situacao: "em_dia",
            data_vencimento: vigenciaFim,
            responsavel: profissionalSelecionado.nome,
          });
        }
      } catch (errDoc) {
        console.warn("Aviso ao atualizar documentos_sst:", errDoc);
      }

      await logAudit({
        acao: "gerar_relatorio",
        modulo: "ges",
        descricao: `Gerou o documento oficial PGR para a empresa "${empresa.razao_social || empresa.nome}" (Rev ${pgrPayload.vigencia.revisao})`,
      });

      toast.success("PGR gerado e baixado com sucesso!");
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Falha ao gerar o documento PGR em PDF.",
      );
    } finally {
      setGerando(false);
    }
  };

  const inputCls =
    "h-10 w-full rounded-xl border border-input bg-background px-3 text-sm font-medium outline-none transition focus:ring-2 focus:ring-ring disabled:opacity-50";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <FileCheck2 className="h-5 w-5" />
            <DialogTitle className="text-lg font-bold">
              Gerar PGR — Programa de Gerenciamento de Riscos
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Emissão oficial do PGR em conformidade estrita com a Norma Regulamentadora nº 01
            (NR-01). O documento é construído exclusivamente a partir dos dados reais cadastrados no
            sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[68vh] gap-4 overflow-y-auto pr-1 py-1">
          {/* Card da Empresa */}
          <div className="rounded-2xl border border-border/80 bg-muted/30 p-3.5">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Empregador Selecionado
              </p>
            </div>
            {loadingEmpresa ? (
              <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando dados da empresa...
              </div>
            ) : empresa ? (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {empresa.razao_social || empresa.nome}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    CNPJ: {empresa.cnpj || "Não informado"} · Cidade:{" "}
                    {empresa.cidade ? `${empresa.cidade}/${empresa.uf || ""}` : "Não informada"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-[11px] font-bold text-foreground">
                    <Layers className="h-3 w-3 text-primary" /> {totalGes} GES
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-[11px] font-bold text-foreground">
                    <Briefcase className="h-3 w-3 text-primary" /> {totalFuncoes} Funções
                  </span>
                </div>
              </div>
            ) : (
              <p className="mt-1 text-xs text-destructive">Nenhuma empresa encontrada.</p>
            )}
          </div>

          {/* Formulário de Configuração do PGR */}
          <div className="grid gap-3">
            <label className="grid gap-1.5 text-xs font-bold text-foreground">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <UserCheck className="h-3.5 w-3.5 text-primary" /> Responsável Técnico pela Elaboração *
              </span>
              <select
                value={responsavelId}
                onChange={(e) => setResponsavelId(e.target.value)}
                className={inputCls}
                disabled={loadingProfissionais}
              >
                <option value="">Selecione um profissional habilitado...</option>
                {profissionais.map((p) => {
                  const reg = p.registro
                    ? ` (${p.tipo_registro ? p.tipo_registro + " " : ""}${p.registro})`
                    : "";
                  return (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                      {p.cargo ? ` — ${p.cargo}` : ""}
                      {reg}
                    </option>
                  );
                })}
              </select>
              {profissionais.length === 0 && !loadingProfissionais && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  Nenhum profissional cadastrado no sistema. Cadastre ao menos um profissional em
                  Profissionais SST para emitir o PGR.
                </p>
              )}
            </label>

            {/* Vigência do PGR */}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-xs font-bold text-foreground">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 text-primary" /> Início da Vigência *
                </span>
                <input
                  type="date"
                  value={vigenciaInicio}
                  onChange={(e) => setVigenciaInicio(e.target.value)}
                  className={inputCls}
                />
              </label>

              <label className="grid gap-1.5 text-xs font-bold text-foreground">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 text-primary" /> Término da Vigência *
                </span>
                <input
                  type="date"
                  value={vigenciaFim}
                  onChange={(e) => setVigenciaFim(e.target.value)}
                  className={inputCls}
                />
              </label>
            </div>

            {/* Revisão e Local */}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-xs font-bold text-foreground">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Revisão do Documento
                </span>
                <input
                  type="text"
                  value={revisao}
                  onChange={(e) => setRevisao(e.target.value)}
                  placeholder="00"
                  maxLength={10}
                  className={inputCls}
                />
              </label>

              <label className="grid gap-1.5 text-xs font-bold text-foreground">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Local de Emissão
                </span>
                <input
                  type="text"
                  value={localEmissao}
                  onChange={(e) => setLocalEmissao(e.target.value)}
                  placeholder="Ex.: Curitiba - PR"
                  className={inputCls}
                />
              </label>
            </div>
          </div>

          {/* Painel de Validação e Pré-Requisitos */}
          <div className="rounded-2xl border border-border/80 bg-card p-3.5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Checklist de Dados Reais do PGR
            </p>
            <div className="mt-2.5 grid gap-2 text-xs">
              <div className="flex items-center gap-2">
                {empresa ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                )}
                <span>Empresa selecionada ({empresa?.razao_social || empresa?.nome || "Pendente"})</span>
              </div>

              <div className="flex items-center gap-2">
                {totalGes > 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                )}
                <span>
                  Grupos de Exposição Similar cadastrados:{" "}
                  <strong>{totalGes} GES</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                {totalFuncoes > 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                )}
                <span>
                  Funções vinculadas aos GES: <strong>{totalFuncoes} função(ões)</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                {responsavelId ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                )}
                <span>
                  Responsável Técnico:{" "}
                  <strong>
                    {profissionalSelecionado ? profissionalSelecionado.nome : "Pendente de seleção"}
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                {vigenciaInicio && vigenciaFim && new Date(vigenciaFim) > new Date(vigenciaInicio) ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                )}
                <span>
                  Período de Vigência:{" "}
                  <strong>
                    {vigenciaInicio && vigenciaFim
                      ? `${formatDateBR(vigenciaInicio)} a ${formatDateBR(vigenciaFim)}`
                      : "Pendente"}
                  </strong>
                </span>
              </div>
            </div>

            {/* Aviso quando não for possível gerar */}
            {!validacao.ok && (
              <div className="mt-3.5 flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-bold">Não foi possível gerar o PGR.</p>
                  <p className="mt-0.5">{validacao.motivo}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={gerando}
            className="h-10 rounded-xl border border-border bg-background px-4 text-sm font-bold text-foreground hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleGerarPgr}
            disabled={!validacao.ok || gerando || loadingGes}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-brand px-5 text-sm font-bold text-primary-foreground shadow-glow transition hover:opacity-90 disabled:opacity-50"
          >
            {gerando ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Gerando Documento PGR...
              </>
            ) : (
              <>
                <FileCheck2 className="h-4 w-4" /> Gerar e Baixar PGR (PDF)
              </>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
