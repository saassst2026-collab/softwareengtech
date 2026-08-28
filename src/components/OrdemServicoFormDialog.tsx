import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { useAuth } from "@/lib/auth";
import { maskCpf } from "@/lib/maskUtils";
import { OS_DEFAULTS } from "@/lib/ordemServicoPdf";

export type OrdemServicoRecord = {
  id: string;
  empresa_id: string | null;
  empregador_razao_social: string;
  funcionario_nome: string;
  funcionario_cpf: string | null;
  funcionario_cargo: string;
  funcionario_setor: string | null;
  data_admissao: string | null;
  descricao_atividades: string | null;
  riscos_fisicos: string | null;
  riscos_quimicos: string | null;
  riscos_biologicos: string | null;
  riscos_ergonomicos: string | null;
  riscos_acidentes: string | null;
  medidas_preventivas: string | null;
  treinamentos_obrigatorios: string | null;
  proibicoes: string | null;
  responsavel_nome: string | null;
  responsavel_titulo: string | null;
  responsavel_registro: string | null;
  local_emissao: string | null;
  data_emissao: string | null;
  revisao: string | null;
  observacoes: string | null;
  created_at: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ordem?: OrdemServicoRecord | null;
};

type EmpresaOpt = {
  id: string;
  nome: string;
  razao_social: string | null;
  cidade: string | null;
  uf: string | null;
  logo_url?: string | null;
};

type SetorOpt = { id: string; empresa_id: string; nome: string };
type FuncaoOpt = {
  id: string;
  empresa_id: string;
  setor_id: string | null;
  nome: string;
  descricao_atividades: string | null;
  riscos_fisicos: string | null;
  riscos_quimicos: string | null;
  riscos_biologicos: string | null;
  riscos_ergonomicos: string | null;
  riscos_acidentes: string | null;
};

type TrabalhadorOpt = {
  id: string;
  empresa_id: string;
  nome: string;
  cpf: string | null;
  funcao: string | null;
  setor: string | null;
  data_admissao: string | null;
};

type GesOpt = { id: string; cargo: string; setor: string | null; codigo_ges: string | null };
type ProfissionalOpt = {
  id: string;
  nome: string;
  cargo: string | null;
  registro: string | null;
  tipo_registro: string | null;
};
type MedidaOpt = {
  id: string;
  nome: string;
  tipo: string;
  ca: string | null;
  empresa_id: string | null;
};

const RISCO_FIELD: Record<string, keyof typeof EMPTY> = {
  fisico: "riscos_fisicos",
  quimico: "riscos_quimicos",
  biologico: "riscos_biologicos",
  ergonomico: "riscos_ergonomicos",
  acidente: "riscos_acidentes",
};

const EMPTY: Omit<OrdemServicoRecord, "id" | "created_at"> = {
  empresa_id: null,
  empregador_razao_social: "",
  funcionario_nome: "",
  funcionario_cpf: "",
  funcionario_cargo: "",
  funcionario_setor: "Operacional",
  data_admissao: "",
  descricao_atividades: "",
  riscos_fisicos: "Não aplicável.",
  riscos_quimicos: "Não aplicável.",
  riscos_biologicos: "Não aplicável.",
  riscos_ergonomicos: "Não aplicável.",
  riscos_acidentes: "Não aplicável.",
  medidas_preventivas: OS_DEFAULTS.medidas,
  treinamentos_obrigatorios: OS_DEFAULTS.treinamentos,
  proibicoes: OS_DEFAULTS.proibicoes,
  responsavel_nome: "Juliene Das Neves Souza",
  responsavel_titulo: "Técnico em Segurança do Trabalho",
  responsavel_registro: "MTE: 0026987/BA",
  local_emissao: "",
  data_emissao: new Date().toISOString().slice(0, 10),
  revisao: "00",
  observacoes: "",
};

export function OrdemServicoFormDialog({ open, onOpenChange, ordem }: Props) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY);

  const { data: empresas } = useQuery({
    queryKey: ["empresas-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresas")
        .select("id, nome, razao_social, cidade, uf, logo_url")
        .order("nome");
      if (error) throw error;
      return (data ?? []) as EmpresaOpt[];
    },
  });

  const { data: setores } = useQuery({
    queryKey: ["setores", form.empresa_id],
    enabled: !!form.empresa_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("setores" as never)
        .select("id, empresa_id, nome")
        .eq("empresa_id", form.empresa_id!)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as unknown as SetorOpt[];
    },
  });

  const { data: funcoes } = useQuery({
    queryKey: ["funcoes", form.empresa_id],
    enabled: !!form.empresa_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funcoes" as never)
        .select("*")
        .eq("empresa_id", form.empresa_id!)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as unknown as FuncaoOpt[];
    },
  });

  const { data: trabalhadores } = useQuery({
    queryKey: ["trabalhadores-os", form.empresa_id],
    enabled: !!form.empresa_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trabalhadores" as never)
        .select("id, empresa_id, nome, cpf, funcao, setor, data_admissao")
        .eq("empresa_id", form.empresa_id!)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as unknown as TrabalhadorOpt[];
    },
  });

  const { data: gesList } = useQuery({
    queryKey: ["ges-os", form.empresa_id],
    enabled: !!form.empresa_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ges" as never)
        .select("id, cargo, setor, codigo_ges")
        .eq("empresa_id", form.empresa_id!)
        .order("cargo");
      if (error) throw error;
      return (data ?? []) as unknown as GesOpt[];
    },
  });

  const { data: profissionais } = useQuery({
    queryKey: ["profissionais-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profissionais" as never)
        .select("id, nome, cargo, registro, tipo_registro")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as unknown as ProfissionalOpt[];
    },
  });

  const { data: medidasCatalogo } = useQuery({
    queryKey: ["medidas-controle-os", form.empresa_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medidas_controle" as never)
        .select("id, nome, tipo, ca, empresa_id")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return ((data ?? []) as unknown as MedidaOpt[]).filter(
        (m) => !m.empresa_id || m.empresa_id === form.empresa_id,
      );
    },
  });

  useEffect(() => {
    if (!open) return;
    if (ordem) {
      setForm({
        empresa_id: ordem.empresa_id,
        empregador_razao_social: ordem.empregador_razao_social,
        funcionario_nome: ordem.funcionario_nome,
        funcionario_cpf: ordem.funcionario_cpf ?? "",
        funcionario_cargo: ordem.funcionario_cargo,
        funcionario_setor: ordem.funcionario_setor ?? "",
        data_admissao: ordem.data_admissao ?? "",
        descricao_atividades: ordem.descricao_atividades ?? "",
        riscos_fisicos: ordem.riscos_fisicos ?? "",
        riscos_quimicos: ordem.riscos_quimicos ?? "",
        riscos_biologicos: ordem.riscos_biologicos ?? "",
        riscos_ergonomicos: ordem.riscos_ergonomicos ?? "",
        riscos_acidentes: ordem.riscos_acidentes ?? "",
        medidas_preventivas: ordem.medidas_preventivas ?? "",
        treinamentos_obrigatorios: ordem.treinamentos_obrigatorios ?? "",
        proibicoes: ordem.proibicoes ?? "",
        responsavel_nome: ordem.responsavel_nome ?? "",
        responsavel_titulo: ordem.responsavel_titulo ?? "",
        responsavel_registro: ordem.responsavel_registro ?? "",
        local_emissao: ordem.local_emissao ?? "",
        data_emissao: ordem.data_emissao ?? new Date().toISOString().slice(0, 10),
        revisao: ordem.revisao ?? "00",
        observacoes: ordem.observacoes ?? "",
      });
    } else {
      setForm(EMPTY);
    }
  }, [open, ordem]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleEmpresa = (id: string) => {
    if (!id) {
      set("empresa_id", null);
      return;
    }
    const emp = empresas?.find((e) => e.id === id);
    set("empresa_id", id);
    if (emp) {
      const razao = emp.razao_social || emp.nome;
      set("empregador_razao_social", razao);
      const local = [emp.cidade, emp.uf].filter(Boolean).join(" - ");
      if (local && !form.local_emissao) set("local_emissao", local);
    }
  };

  const handleFuncao = (id: string) => {
    if (!id) return;
    const f = funcoes?.find((x) => x.id === id);
    if (!f) return;
    set("funcionario_cargo", f.nome);
    if (f.descricao_atividades) set("descricao_atividades", f.descricao_atividades);
    if (f.riscos_fisicos) set("riscos_fisicos", f.riscos_fisicos);
    if (f.riscos_quimicos) set("riscos_quimicos", f.riscos_quimicos);
    if (f.riscos_biologicos) set("riscos_biologicos", f.riscos_biologicos);
    if (f.riscos_ergonomicos) set("riscos_ergonomicos", f.riscos_ergonomicos);
    if (f.riscos_acidentes) set("riscos_acidentes", f.riscos_acidentes);
    if (f.setor_id) {
      const s = setores?.find((x) => x.id === f.setor_id);
      if (s) set("funcionario_setor", s.nome);
    }
  };

  const handleTrabalhador = (id: string) => {
    if (!id) return;
    const t = trabalhadores?.find((x) => x.id === id);
    if (!t) return;
    setForm((f) => ({
      ...f,
      funcionario_nome: t.nome,
      funcionario_cpf: t.cpf ?? "",
      funcionario_setor: t.setor ?? f.funcionario_setor,
      data_admissao: t.data_admissao ?? f.data_admissao,
    }));
    // Se houver função cadastrada com mesmo nome, aplica descrição/riscos
    if (t.funcao) {
      const match = funcoes?.find(
        (x) => x.nome.trim().toLowerCase() === t.funcao!.trim().toLowerCase(),
      );
      if (match) {
        handleFuncao(match.id);
      } else {
        set("funcionario_cargo", t.funcao);
      }
    }
  };

  const handleGes = async (gesId: string) => {
    if (!gesId) return;
    const { data, error } = await supabase
      .from("ges_riscos" as never)
      .select("fontes_geradoras, medidas_preventivas, riscos_ocupacionais(nome, tipo)")
      .eq("ges_id", gesId);
    if (error) {
      toast.error("Erro ao carregar riscos do GES");
      return;
    }
    const rows = (data ?? []) as unknown as Array<{
      fontes_geradoras: string | null;
      medidas_preventivas: string | null;
      riscos_ocupacionais: { nome: string; tipo: string } | null;
    }>;
    const buckets: Record<string, string[]> = {};
    const medidas: string[] = [];
    rows.forEach((r) => {
      const tipo = r.riscos_ocupacionais?.tipo;
      if (tipo && r.riscos_ocupacionais) {
        const txt = r.fontes_geradoras
          ? `${r.riscos_ocupacionais.nome} (${r.fontes_geradoras})`
          : r.riscos_ocupacionais.nome;
        (buckets[tipo] ??= []).push(txt);
      }
      if (r.medidas_preventivas) medidas.push(r.medidas_preventivas);
    });

    const { data: gm } = await supabase
      .from("ges_medidas" as never)
      .select("observacao, medidas_controle(nome, tipo, ca)")
      .eq("ges_id", gesId);
    (
      (gm ?? []) as unknown as Array<{
        observacao: string | null;
        medidas_controle: { nome: string; tipo: string; ca: string | null } | null;
      }>
    ).forEach((m) => {
      if (!m.medidas_controle) return;
      medidas.push(
        `Utilizar ${m.medidas_controle.nome}${m.medidas_controle.ca ? ` (CA ${m.medidas_controle.ca})` : ""}${m.observacao ? ` — ${m.observacao}` : ""}`,
      );
    });

    setForm((f) => {
      const next = { ...f };
      Object.entries(RISCO_FIELD).forEach(([tipo, field]) => {
        const vals = buckets[tipo];
        (next[field] as string) = vals?.length ? vals.join("; ") + "." : "Não aplicável.";
      });
      if (medidas.length) {
        const atuais = (f.medidas_preventivas ?? "").split("\n").filter(Boolean);
        const novas = medidas.filter((m) => !atuais.includes(m));
        next.medidas_preventivas = [...atuais, ...novas].join("\n");
      }
      return next;
    });
    toast.success("Riscos e medidas do GES aplicados");
  };

  const handleProfissional = (id: string) => {
    const p = profissionais?.find((x) => x.id === id);
    if (!p) return;
    setForm((f) => ({
      ...f,
      responsavel_nome: p.nome,
      responsavel_titulo: p.cargo ?? f.responsavel_titulo,
      responsavel_registro: p.registro
        ? `${p.tipo_registro ? p.tipo_registro + ": " : ""}${p.registro}`
        : f.responsavel_registro,
    }));
  };

  const addMedida = (id: string) => {
    const m = medidasCatalogo?.find((x) => x.id === id);
    if (!m) return;
    const linha = `Utilizar ${m.nome}${m.ca ? ` (CA ${m.ca})` : ""}`;
    setForm((f) => {
      const atuais = (f.medidas_preventivas ?? "").split("\n").filter(Boolean);
      if (atuais.includes(linha)) return f;
      return { ...f, medidas_preventivas: [...atuais, linha].join("\n") };
    });
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!form.funcionario_nome.trim()) throw new Error("Informe o nome do funcionário");
      if (!form.funcionario_cargo.trim()) throw new Error("Informe o cargo");
      if (!form.empregador_razao_social.trim()) throw new Error("Informe o empregador");

      const payload = {
        ...form,
        funcionario_cpf: form.funcionario_cpf || null,
        funcionario_setor: form.funcionario_setor || null,
        data_admissao: form.data_admissao || null,
        data_emissao: form.data_emissao || null,
        created_by: user?.id ?? null,
      };

      if (ordem?.id) {
        const { error } = await supabase
          .from("ordens_servico" as never)
          .update(payload as never)
          .eq("id", ordem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ordens_servico" as never).insert(payload as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(ordem?.id ? "Ordem de serviço atualizada" : "Ordem de serviço criada");
      qc.invalidateQueries({ queryKey: ["ordens-servico"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-primary">
            {ordem?.id ? "Editar Ordem de Serviço" : "Nova Ordem de Serviço"}
          </DialogTitle>
          <DialogDescription>
            Preencha os dados do empregador e do funcionário. Os textos institucionais (obrigações,
            medicina do trabalho e procedimentos de acidentes) são incluídos automaticamente no PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Empresa / Empregador */}
          <fieldset className="grid gap-3 rounded-2xl border border-border p-4">
            <legend className="px-2 text-xs font-bold uppercase text-primary">Empregador</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Empresa cadastrada (opcional)">
                <select
                  value={form.empresa_id ?? ""}
                  onChange={(e) => handleEmpresa(e.target.value)}
                  className={inp}
                >
                  <option value="">— Selecionar —</option>
                  {(empresas ?? []).map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.razao_social || e.nome}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Razão social do empregador *">
                <input
                  value={form.empregador_razao_social}
                  onChange={(e) => set("empregador_razao_social", e.target.value)}
                  className={inp}
                  placeholder="J DA S SANTOS REGRIFERACAO LTDA"
                />
              </Field>
            </div>
          </fieldset>

          {/* Funcionário */}
          <fieldset className="grid gap-3 rounded-2xl border border-border p-4">
            <legend className="px-2 text-xs font-bold uppercase text-primary">Funcionário</legend>
            {(trabalhadores ?? []).length > 0 && (
              <Field label="Funcionário cadastrado (auto-preenche nome, CPF, setor, função)">
                <select
                  value={
                    (trabalhadores ?? []).find((t) => t.nome === form.funcionario_nome)?.id ?? ""
                  }
                  onChange={(e) => handleTrabalhador(e.target.value)}
                  className={inp}
                >
                  <option value="">— Selecionar trabalhador —</option>
                  {(trabalhadores ?? []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome}
                      {t.funcao ? ` — ${t.funcao}` : ""}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome completo *">
                <input
                  value={form.funcionario_nome}
                  onChange={(e) => set("funcionario_nome", e.target.value)}
                  className={inp}
                />
              </Field>
              <Field label="CPF">
                <input
                  value={form.funcionario_cpf ?? ""}
                  onChange={(e) => set("funcionario_cpf", maskCpf(e.target.value))}
                  className={inp}
                  placeholder="000.000.000-00"
                />
              </Field>
              <Field label="Cargo / Função *">
                {(funcoes ?? []).length > 0 ? (
                  <select
                    value={(funcoes ?? []).find((f) => f.nome === form.funcionario_cargo)?.id ?? ""}
                    onChange={(e) => {
                      if (e.target.value) handleFuncao(e.target.value);
                      else set("funcionario_cargo", "");
                    }}
                    className={inp}
                  >
                    <option value="">— Selecionar função cadastrada —</option>
                    {(funcoes ?? []).map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nome}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={form.funcionario_cargo}
                    onChange={(e) => set("funcionario_cargo", e.target.value)}
                    className={inp}
                    placeholder="Auxiliar Técnico em Refrigeração"
                  />
                )}
              </Field>
              <Field label="Setor">
                {(setores ?? []).length > 0 ? (
                  <select
                    value={form.funcionario_setor ?? ""}
                    onChange={(e) => set("funcionario_setor", e.target.value)}
                    className={inp}
                  >
                    <option value="">— Selecionar setor —</option>
                    {(setores ?? []).map((s) => (
                      <option key={s.id} value={s.nome}>
                        {s.nome}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={form.funcionario_setor ?? ""}
                    onChange={(e) => set("funcionario_setor", e.target.value)}
                    className={inp}
                    placeholder="Operacional"
                  />
                )}
              </Field>
              <Field label="Data de admissão">
                <input
                  type="date"
                  value={form.data_admissao ?? ""}
                  onChange={(e) => set("data_admissao", e.target.value)}
                  className={inp}
                />
              </Field>
              <Field label="Data de emissão">
                <input
                  type="date"
                  value={form.data_emissao ?? ""}
                  onChange={(e) => set("data_emissao", e.target.value)}
                  className={inp}
                />
              </Field>
            </div>
          </fieldset>

          {/* Atividades e Riscos */}
          <fieldset className="grid gap-3 rounded-2xl border border-border p-4">
            <legend className="px-2 text-xs font-bold uppercase text-primary">
              Atividades e Riscos
            </legend>
            {(gesList ?? []).length > 0 && (
              <Field label="GES da empresa (preenche riscos e medidas automaticamente)">
                <select
                  defaultValue=""
                  onChange={(e) => {
                    void handleGes(e.target.value);
                  }}
                  className={inp}
                >
                  <option value="">— Selecionar GES —</option>
                  {(gesList ?? []).map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.cargo}
                      {g.setor ? ` — ${g.setor}` : ""}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Descrição das atividades (conforme PGR)">
              <textarea
                value={form.descricao_atividades ?? ""}
                onChange={(e) => set("descricao_atividades", e.target.value)}
                className={`${inp} min-h-[100px]`}
                placeholder="Descreva as atividades desempenhadas pelo funcionário..."
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Riscos Físicos">
                <input
                  value={form.riscos_fisicos ?? ""}
                  onChange={(e) => set("riscos_fisicos", e.target.value)}
                  className={inp}
                  placeholder="Ex.: Vibração de mãos e braços (VMB)."
                />
              </Field>
              <Field label="Riscos Químicos">
                <input
                  value={form.riscos_quimicos ?? ""}
                  onChange={(e) => set("riscos_quimicos", e.target.value)}
                  className={inp}
                  placeholder="Ex.: Fumos metálicos."
                />
              </Field>
              <Field label="Riscos Biológicos">
                <input
                  value={form.riscos_biologicos ?? ""}
                  onChange={(e) => set("riscos_biologicos", e.target.value)}
                  className={inp}
                />
              </Field>
              <Field label="Riscos Ergonômicos">
                <input
                  value={form.riscos_ergonomicos ?? ""}
                  onChange={(e) => set("riscos_ergonomicos", e.target.value)}
                  className={inp}
                  placeholder="Ex.: Postura inadequada."
                />
              </Field>
              <Field label="Riscos de Acidentes">
                <input
                  value={form.riscos_acidentes ?? ""}
                  onChange={(e) => set("riscos_acidentes", e.target.value)}
                  className={inp}
                  placeholder="Ex.: Queda de mesmo nível."
                />
              </Field>
            </div>
          </fieldset>

          {/* Textos personalizáveis */}
          <fieldset className="grid gap-3 rounded-2xl border border-border p-4">
            <legend className="px-2 text-xs font-bold uppercase text-primary">
              Medidas, Treinamentos e Proibições
            </legend>
            <p className="text-xs text-muted-foreground">
              Uma medida por linha. Os textos padrão EngTech já estão preenchidos.
            </p>
            {(medidasCatalogo ?? []).length > 0 && (
              <Field label="Adicionar medida de controle / EPI cadastrado">
                <select value="" onChange={(e) => addMedida(e.target.value)} className={inp}>
                  <option value="">— Selecionar medida cadastrada —</option>
                  {(medidasCatalogo ?? []).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome} ({m.tipo}
                      {m.ca ? ` · CA ${m.ca}` : ""})
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Medidas preventivas">
              <textarea
                value={form.medidas_preventivas ?? ""}
                onChange={(e) => set("medidas_preventivas", e.target.value)}
                className={`${inp} min-h-[120px] font-mono text-xs`}
              />
            </Field>
            <Field label="Treinamentos obrigatórios">
              <textarea
                value={form.treinamentos_obrigatorios ?? ""}
                onChange={(e) => set("treinamentos_obrigatorios", e.target.value)}
                className={`${inp} min-h-[80px] font-mono text-xs`}
              />
            </Field>
            <Field label="Proibições">
              <textarea
                value={form.proibicoes ?? ""}
                onChange={(e) => set("proibicoes", e.target.value)}
                className={`${inp} min-h-[100px] font-mono text-xs`}
              />
            </Field>
          </fieldset>

          {/* Responsável */}
          <fieldset className="grid gap-3 rounded-2xl border border-border p-4">
            <legend className="px-2 text-xs font-bold uppercase text-primary">
              Responsável pelo Treinamento
            </legend>
            {(profissionais ?? []).length > 0 && (
              <Field label="Profissional SST cadastrado">
                <select
                  value={
                    (profissionais ?? []).find((p) => p.nome === form.responsavel_nome)?.id ?? ""
                  }
                  onChange={(e) => handleProfissional(e.target.value)}
                  className={inp}
                >
                  <option value="">— Selecionar profissional —</option>
                  {(profissionais ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                      {p.cargo ? ` — ${p.cargo}` : ""}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Nome">
                <input
                  value={form.responsavel_nome ?? ""}
                  onChange={(e) => set("responsavel_nome", e.target.value)}
                  className={inp}
                />
              </Field>
              <Field label="Título / Cargo">
                <input
                  value={form.responsavel_titulo ?? ""}
                  onChange={(e) => set("responsavel_titulo", e.target.value)}
                  className={inp}
                />
              </Field>
              <Field label="Registro (MTE / CREA)">
                <input
                  value={form.responsavel_registro ?? ""}
                  onChange={(e) => set("responsavel_registro", e.target.value)}
                  className={inp}
                />
              </Field>
              <Field label="Local de emissão">
                <input
                  value={form.local_emissao ?? ""}
                  onChange={(e) => set("local_emissao", e.target.value)}
                  className={inp}
                  placeholder="Cidade - UF"
                />
              </Field>
              <Field label="Revisão">
                <input
                  value={form.revisao ?? ""}
                  onChange={(e) => set("revisao", e.target.value)}
                  className={inp}
                  placeholder="00"
                />
              </Field>
            </div>
          </fieldset>
        </div>

        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold text-foreground"
          >
            Cancelar
          </button>
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-4 py-2 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-60"
          >
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {ordem?.id ? "Salvar alterações" : "Criar Ordem de Serviço"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const inp =
  "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-xs font-bold text-foreground">{label}</span>
      {children}
    </label>
  );
}
