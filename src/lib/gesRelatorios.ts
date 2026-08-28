import { supabase } from "@/integrations/supabase/client";
import type { ReportData } from "@/lib/reportPdf";
import type { RelatorioOpcao } from "@/components/RelatorioDialog";
import { CLASSIFICACAO_LABEL, type ClassificacaoRisco } from "@/lib/matrizRisco";

const TIPO_LABEL: Record<string, string> = {
  fisico: "Físico",
  quimico: "Químico",
  biologico: "Biológico",
  ergonomico: "Ergonômico",
  acidente: "Acidente",
};

type GesRow = {
  id: string;
  cargo: string;
  setor: string | null;
  codigo_ges: string | null;
  descricao_atividade: string | null;
  qtd_colaboradores: number | null;
};

type RiscoRow = {
  id: string;
  ges_id: string;
  fontes_geradoras: string | null;
  trajetoria: string | null;
  medidas_preventivas: string | null;
  recomendacao_medidas: string | null;
  classificacao: string | null;
  severidade: string | null;
  probabilidade: string | null;
  freq_exposicao: string | null;
  utiliza_epi: string | null;
  utiliza_epc: string | null;
  gerar_ltcat: string | null;
  gerar_lti: string | null;
  gerar_ltp: string | null;
  gerar_pgr_pcmso: string | null;
  insalubre: string | null;
  periculoso: string | null;
  aposentadoria_especial: string | null;
  anexo_nr15: string | null;
  anexo_nr16: string | null;
  codigo_gfip: string | null;
  riscos_ocupacionais?: { nome: string; tipo: string } | null;
};

type FuncaoRow = { id: string; nome: string; setor_id: string | null };
type VinculoRow = { ges_id: string; funcao_id: string };
type TrabalhadorRow = { nome: string; funcao: string | null; setor: string | null };

export type GesReportBase = {
  empresaNome: string;
  ges: GesRow[];
  riscos: RiscoRow[];
  funcoes: FuncaoRow[];
  vinculos: VinculoRow[];
  trabalhadores: TrabalhadorRow[];
};

export async function carregarBaseGes(
  empresaId: string,
  empresaNome: string,
): Promise<GesReportBase> {
  const [gesRes, funcoesRes, trabRes] = await Promise.all([
    supabase
      .from("ges" as never)
      .select("id, cargo, setor, codigo_ges, descricao_atividade, qtd_colaboradores")
      .eq("empresa_id", empresaId)
      .order("cargo"),
    supabase
      .from("funcoes" as never)
      .select("id, nome, setor_id")
      .eq("empresa_id", empresaId)
      .order("nome"),
    supabase
      .from("trabalhadores" as never)
      .select("nome, funcao, setor")
      .eq("empresa_id", empresaId)
      .order("nome"),
  ]);
  if (gesRes.error) throw gesRes.error;
  const ges = (gesRes.data ?? []) as unknown as GesRow[];
  const gesIds = ges.map((g) => g.id);

  const [riscosRes, vincRes] = await Promise.all([
    gesIds.length
      ? supabase
          .from("ges_riscos" as never)
          .select(
            "id, ges_id, fontes_geradoras, trajetoria, medidas_preventivas, recomendacao_medidas, classificacao, severidade, probabilidade, freq_exposicao, utiliza_epi, utiliza_epc, gerar_ltcat, gerar_lti, gerar_ltp, gerar_pgr_pcmso, insalubre, periculoso, aposentadoria_especial, anexo_nr15, anexo_nr16, codigo_gfip, riscos_ocupacionais(nome, tipo)",
          )
          .in("ges_id", gesIds)
      : Promise.resolve({ data: [], error: null } as never),
    gesIds.length
      ? supabase
          .from("ges_funcoes" as never)
          .select("ges_id, funcao_id")
          .in("ges_id", gesIds)
      : Promise.resolve({ data: [], error: null } as never),
  ]);

  return {
    empresaNome,
    ges,
    riscos: ((riscosRes as { data: unknown }).data ?? []) as RiscoRow[],
    funcoes: (funcoesRes.data ?? []) as unknown as FuncaoRow[],
    vinculos: ((vincRes as { data: unknown }).data ?? []) as VinculoRow[],
    trabalhadores: (trabRes.data ?? []) as unknown as TrabalhadorRow[],
  };
}

const dash = (v: unknown) => (v == null || v === "" ? "—" : String(v));
const nomeRisco = (r: RiscoRow) => r.riscos_ocupacionais?.nome ?? "—";
const agente = (r: RiscoRow) => TIPO_LABEL[r.riscos_ocupacionais?.tipo ?? ""] ?? "—";
const classif = (r: RiscoRow) =>
  r.classificacao
    ? (CLASSIFICACAO_LABEL[r.classificacao as ClassificacaoRisco] ?? r.classificacao)
    : "—";

function base(b: GesReportBase, titulo: string): Pick<ReportData, "titulo" | "filtrosAplicados"> {
  return { titulo, filtrosAplicados: [`Empresa: ${b.empresaNome}`] };
}

/** Reports "GHE / Segurança do Trabalho" */
function riscosPorFuncao(b: GesReportBase): ReportData {
  const gesById = new Map(b.ges.map((g) => [g.id, g]));
  const funcById = new Map(b.funcoes.map((f) => [f.id, f]));
  const linhas: Array<Array<string | number>> = [];
  for (const v of b.vinculos) {
    const f = funcById.get(v.funcao_id);
    const g = gesById.get(v.ges_id);
    if (!f || !g) continue;
    for (const r of b.riscos.filter((x) => x.ges_id === g.id)) {
      linhas.push([f.nome, g.cargo, nomeRisco(r), agente(r), dash(r.fontes_geradoras), classif(r)]);
    }
  }
  linhas.sort((a, b2) => String(a[0]).localeCompare(String(b2[0])));
  return {
    ...base(b, "Riscos por Função"),
    colunas: [
      { header: "Função" },
      { header: "GHE" },
      { header: "Fator de risco" },
      { header: "Agente" },
      { header: "Fonte geradora" },
      { header: "Classificação" },
    ],
    linhas,
    totalizadores: [{ label: "Total de registros", value: String(linhas.length) }],
  };
}

function ghesPorFuncao(b: GesReportBase): ReportData {
  const gesById = new Map(b.ges.map((g) => [g.id, g]));
  const linhas = b.funcoes.map((f) => {
    const ghes = b.vinculos
      .filter((v) => v.funcao_id === f.id)
      .map((v) => gesById.get(v.ges_id)?.cargo)
      .filter(Boolean);
    return [f.nome, ghes.length ? ghes.join("; ") : "—", String(ghes.length)];
  });
  return {
    ...base(b, "GHEs por Função - Segurança do Trabalho"),
    colunas: [
      { header: "Função" },
      { header: "GHEs vinculados" },
      { header: "Qtd.", align: "center" },
    ],
    linhas,
    totalizadores: [{ label: "Funções", value: String(b.funcoes.length) }],
  };
}

function funcoesSemGhe(b: GesReportBase): ReportData {
  const comGhe = new Set(b.vinculos.map((v) => v.funcao_id));
  const linhas = b.funcoes
    .filter((f) => !comGhe.has(f.id))
    .map((f) => [f.nome, "Sem GHE vinculado"]);
  return {
    ...base(b, "Funções sem GHE"),
    colunas: [{ header: "Função" }, { header: "Situação" }],
    linhas,
    totalizadores: [{ label: "Funções sem GHE", value: String(linhas.length) }],
  };
}

function funcoesERiscosPorGhe(b: GesReportBase): ReportData {
  const funcById = new Map(b.funcoes.map((f) => [f.id, f]));
  const linhas: Array<Array<string | number>> = [];
  for (const g of b.ges) {
    const funcs =
      b.vinculos
        .filter((v) => v.ges_id === g.id)
        .map((v) => funcById.get(v.funcao_id)?.nome)
        .filter(Boolean)
        .join("; ") || "—";
    const riscos = b.riscos.filter((r) => r.ges_id === g.id);
    if (riscos.length === 0) linhas.push([g.cargo, funcs, "—", "—", "—"]);
    for (const r of riscos) linhas.push([g.cargo, funcs, nomeRisco(r), agente(r), classif(r)]);
  }
  return {
    ...base(b, "Funções e Riscos por GHE"),
    colunas: [
      { header: "GHE" },
      { header: "Funções" },
      { header: "Fator de risco" },
      { header: "Agente" },
      { header: "Classificação" },
    ],
    linhas,
  };
}

function ghesPorVinculos(b: GesReportBase): ReportData {
  const funcById = new Map(b.funcoes.map((f) => [f.id, f]));
  const chave = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  const linhas = b.ges.map((g) => {
    const funcs = b.vinculos
      .filter((v) => v.ges_id === g.id)
      .map((v) => funcById.get(v.funcao_id)?.nome)
      .filter((x): x is string => !!x);
    const set = new Set(funcs.map(chave));
    const trabs = b.trabalhadores.filter((t) => t.funcao && set.has(chave(t.funcao)));
    return [g.cargo, dash(g.setor), String(funcs.length), String(trabs.length)];
  });
  return {
    ...base(b, "GHEs por Vínculos"),
    colunas: [
      { header: "GHE" },
      { header: "Setor" },
      { header: "Funções vinculadas", align: "center" },
      { header: "Trabalhadores", align: "center" },
    ],
    linhas,
    totalizadores: [
      {
        label: "Trabalhadores vinculados",
        value: String(linhas.reduce((a, r) => a + Number(r[3]), 0)),
      },
    ],
  };
}

function inventarioRiscos(b: GesReportBase): ReportData {
  const linhas = b.riscos.map((r) => {
    const g = b.ges.find((x) => x.id === r.ges_id);
    return [
      g?.cargo ?? "—",
      nomeRisco(r),
      agente(r),
      dash(r.fontes_geradoras),
      dash(r.trajetoria),
      dash(r.freq_exposicao),
      `${dash(r.severidade)} / ${dash(r.probabilidade)}`,
      classif(r),
      dash(r.medidas_preventivas),
    ];
  });
  return {
    ...base(b, "Inventário de Riscos por GHE"),
    colunas: [
      { header: "GHE" },
      { header: "Fator de risco" },
      { header: "Agente" },
      { header: "Fonte geradora" },
      { header: "Trajetória" },
      { header: "Frequência" },
      { header: "Sev./Prob." },
      { header: "Classificação" },
      { header: "Medidas de controle" },
    ],
    linhas,
    totalizadores: [{ label: "Riscos inventariados", value: String(linhas.length) }],
  };
}

function resumoGhes(b: GesReportBase): ReportData {
  const linhas = b.ges.map((g) => {
    const riscos = b.riscos.filter((r) => r.ges_id === g.id);
    const criticos = riscos.filter(
      (r) => r.classificacao === "alto" || r.classificacao === "critico",
    ).length;
    const funcs = b.vinculos.filter((v) => v.ges_id === g.id).length;
    return [
      g.cargo,
      dash(g.setor),
      dash(g.codigo_ges),
      String(g.qtd_colaboradores ?? 0),
      String(funcs),
      String(riscos.length),
      String(criticos),
    ];
  });
  return {
    ...base(b, "Resumo dos GHEs"),
    colunas: [
      { header: "GHE" },
      { header: "Setor" },
      { header: "Código" },
      { header: "Colab.", align: "center" },
      { header: "Funções", align: "center" },
      { header: "Riscos", align: "center" },
      { header: "Alto/Crítico", align: "center" },
    ],
    linhas,
    totalizadores: [{ label: "Total de GHEs", value: String(b.ges.length) }],
  };
}

/** Documentos técnicos: inventário filtrado pelos indicadores legais do risco. */
type DocDef = {
  id: string;
  label: string;
  filtro: (r: RiscoRow) => boolean;
  extras?: Array<{ header: string; get: (r: RiscoRow) => string }>;
};

const sim = (v: string | null) => (v ?? "").toLowerCase() === "sim";

const DOCUMENTOS: DocDef[] = [
  {
    id: "ltcat",
    label: "LTCAT - Laudo Técnico das Condições Ambientais do Trabalho",
    filtro: (r) => sim(r.gerar_ltcat),
    extras: [
      { header: "Apos. especial", get: (r) => dash(r.aposentadoria_especial) },
      { header: "Cód. GFIP", get: (r) => dash(r.codigo_gfip) },
    ],
  },
  {
    id: "lti",
    label: "LTI - Laudo Técnico de Insalubridade",
    filtro: (r) => sim(r.gerar_lti) || sim(r.insalubre),
    extras: [
      { header: "Insalubre", get: (r) => dash(r.insalubre) },
      { header: "Anexo NR-15", get: (r) => dash(r.anexo_nr15) },
    ],
  },
  {
    id: "ltp",
    label: "LTP - Laudo Técnico de Periculosidade",
    filtro: (r) => sim(r.gerar_ltp) || sim(r.periculoso),
    extras: [
      { header: "Periculoso", get: (r) => dash(r.periculoso) },
      { header: "Anexo NR-16", get: (r) => dash(r.anexo_nr16) },
    ],
  },
  {
    id: "pgr",
    label: "PGR - Programa de Gerenciamento de Riscos",
    filtro: (r) => sim(r.gerar_pgr_pcmso),
  },
  {
    id: "pgrtr",
    label: "PGRTR - Programa de Gerenciamento de Riscos no Trabalho Rural",
    filtro: (r) => sim(r.gerar_pgr_pcmso),
  },
  {
    id: "pgrcc",
    label: "PGRCC - Programa de Gerenciamento de Riscos na Construção Civil",
    filtro: (r) => sim(r.gerar_pgr_pcmso),
  },
  {
    id: "pgrmin",
    label: "PGRMIN - Programa de Gerenciamento de Riscos na Mineração",
    filtro: (r) => sim(r.gerar_pgr_pcmso),
  },
  {
    id: "pgr_nr32",
    label: "PGR - NR 32",
    filtro: (r) => sim(r.gerar_pgr_pcmso) && r.riscos_ocupacionais?.tipo === "biologico",
  },
  {
    id: "pca",
    label: "PCA - Programa de Conservação Auditiva",
    filtro: (r) => /ru[ií]do/i.test(r.riscos_ocupacionais?.nome ?? ""),
  },
];

function documentoReport(b: GesReportBase, def: DocDef): ReportData {
  const extras = def.extras ?? [];
  const linhas = b.riscos.filter(def.filtro).map((r) => {
    const g = b.ges.find((x) => x.id === r.ges_id);
    return [
      g?.cargo ?? "—",
      nomeRisco(r),
      agente(r),
      dash(r.fontes_geradoras),
      classif(r),
      dash(r.medidas_preventivas),
      ...extras.map((e) => e.get(r)),
    ];
  });
  return {
    ...base(b, def.label),
    colunas: [
      { header: "GHE" },
      { header: "Fator de risco" },
      { header: "Agente" },
      { header: "Fonte geradora" },
      { header: "Classificação" },
      { header: "Medidas de controle" },
      ...extras.map((e) => ({ header: e.header })),
    ],
    linhas,
    totalizadores: [{ label: "Riscos considerados", value: String(linhas.length) }],
  };
}

function adendoReport(b: GesReportBase, def: DocDef): ReportData {
  const linhas = b.riscos
    .filter(def.filtro)
    .filter((r) => (r.recomendacao_medidas ?? "").trim() !== "")
    .map((r) => {
      const g = b.ges.find((x) => x.id === r.ges_id);
      return [g?.cargo ?? "—", nomeRisco(r), classif(r), dash(r.recomendacao_medidas)];
    });
  return {
    ...base(b, `Adendos ao ${def.label.split(" - ")[0]}`),
    colunas: [
      { header: "GHE" },
      { header: "Fator de risco" },
      { header: "Classificação" },
      { header: "Recomendação de novas medidas de controle" },
    ],
    linhas,
    totalizadores: [{ label: "Recomendações", value: String(linhas.length) }],
  };
}

const ADENDOS = ["ltcat", "lti", "ltp", "pgr", "pgrtr", "pgrcc", "pgrmin", "pgr_nr32"];

export function opcoesRelatoriosGes(
  empresaId: string,
  empresaNome: string,
  onGerarPgr?: () => void,
): RelatorioOpcao[] {
  let cache: GesReportBase | null = null;
  const load = async () => {
    if (!cache) cache = await carregarBaseGes(empresaId, empresaNome);
    return cache;
  };

  const opcoes: RelatorioOpcao[] = [];

  if (onGerarPgr) {
    opcoes.push({
      id: "gerar-pgr-oficial",
      label: "Gerar PGR — Programa de Gerenciamento de Riscos",
      descricao:
        "Emissão oficial completa do documento PGR conforme NR-01 com capa, identificação, inventário de riscos e plano de ação.",
      badge: "NR-01 Oficial",
      isDestaque: true,
      onSelect: onGerarPgr,
    });
  }

  const analiticos: Array<{
    id: string;
    label: string;
    descricao: string;
    fn: (b: GesReportBase) => ReportData;
  }> = [
    {
      id: "riscos-funcao",
      label: "Riscos por Função",
      descricao: "Fatores de risco de cada função a partir dos GHEs vinculados.",
      fn: riscosPorFuncao,
    },
    {
      id: "ghes-funcao",
      label: "GHEs por Função - Segurança do Trabalho",
      descricao: "Relação de GHEs vinculados a cada função.",
      fn: ghesPorFuncao,
    },
    {
      id: "funcoes-sem-ghe",
      label: "Funções sem GHE",
      descricao: "Funções da empresa ainda não vinculadas a nenhum GHE.",
      fn: funcoesSemGhe,
    },
    {
      id: "funcoes-riscos-ghe",
      label: "Funções e Riscos por GHE",
      descricao: "Visão consolidada por GHE com funções e riscos.",
      fn: funcoesERiscosPorGhe,
    },
    {
      id: "ghes-vinculos",
      label: "GHEs por Vínculos",
      descricao: "Quantidade de funções e trabalhadores vinculados a cada GHE.",
      fn: ghesPorVinculos,
    },
    {
      id: "inventario",
      label: "Inventário de Riscos por GHE",
      descricao: "Inventário completo de riscos com severidade, probabilidade e controles.",
      fn: inventarioRiscos,
    },
    {
      id: "resumo",
      label: "Resumo dos GHEs",
      descricao: "Resumo quantitativo dos grupos de exposição similar.",
      fn: resumoGhes,
    },
  ];

  for (const a of analiticos) {
    opcoes.push({
      id: a.id,
      label: a.label,
      descricao: a.descricao,
      build: async () => a.fn(await load()),
    });
  }

  for (const def of DOCUMENTOS) {
    if (def.id === "pgr" && onGerarPgr) {
      opcoes.push({
        id: `doc-${def.id}`,
        label: `${def.label} (Tabela Rápida)`,
        descricao: "Planilha analítica dos fatores de risco mapeados para o PGR.",
        build: async () => documentoReport(await load(), def),
      });
    } else {
      opcoes.push({
        id: `doc-${def.id}`,
        label: def.label,
        descricao: "Documento técnico gerado a partir dos riscos dos GHEs.",
        build: async () => documentoReport(await load(), def),
      });
    }
  }

  for (const id of ADENDOS) {
    const def = DOCUMENTOS.find((d) => d.id === id)!;
    opcoes.push({
      id: `adendo-${id}`,
      label: `Adendos ao ${def.label.split(" - ")[0]}`,
      descricao: "Recomendações de novas medidas de controle registradas nos riscos.",
      build: async () => adendoReport(await load(), def),
    });
  }

  return opcoes;
}
