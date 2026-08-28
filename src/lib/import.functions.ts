import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type ImportRow = {
  empresa?: string;
  cnpj?: string;
  cidade?: string;
  uf?: string;
  contabilidade?: string;
  responsavel?: string;
  contato?: string;
  tipo_documento?: string;
  titulo?: string;
  data_conclusao?: string | null;
  data_vencimento?: string | null;
  situacao?: string;
  status?: string;
  observacoes?: string;
};

type ImportMode = "replace" | "merge";

const TIPOS_VALIDOS = new Set([
  "PGR",
  "PGRTR",
  "PCMSO",
  "LTCAT",
  "LTI",
  "LTP",
  "AET",
  "AEP",
  "PPP",
  "OS_SST",
  "FICHA_EPI",
  "TREINAMENTO",
  "S_2240",
  "S_2220",
  "S_2210",
]);

const SITUACOES_VALIDAS = new Set([
  "em_dia",
  "proximo_vencimento",
  "vencido",
  "pendente",
  "concluido",
]);

const DOCUMENTOS_SEM_VALIDADE = new Set(["LTCAT", "LTI", "LTP", "FICHA_EPI", "OS_SST", "PPP"]);

function normalizeTipo(raw?: string): string | null {
  if (!raw) return null;
  // remove acentos, normaliza separadores, força MAIÚSCULAS
  const v = raw
    .toString()
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s./-]+/g, "_")
    .replace(/_+/g, "_");
  const map: Record<string, string> = {
    // Ordem de Serviço (OS de SST)
    ORDEM_DE_SERVICO: "OS_SST",
    ORDEM_SERVICO: "OS_SST",
    OS: "OS_SST",
    OS_SST: "OS_SST",
    OS_DE_SST: "OS_SST",
    OSSST: "OS_SST",
    // Ficha de EPI
    FICHA_DE_EPI: "FICHA_EPI",
    FICHA_EPI: "FICHA_EPI",
    EPI: "FICHA_EPI",
    // Treinamentos
    TREINAMENTOS: "TREINAMENTO",
    TREINAMENTO: "TREINAMENTO",
    // eSocial
    S2240: "S_2240",
    S2220: "S_2220",
    S2210: "S_2210",
    CAT: "S_2210",
  };
  const candidate = map[v] ?? v;
  return TIPOS_VALIDOS.has(candidate) ? candidate : null;
}

function normalizeSituacao(raw?: string, vencimento?: string | null): string {
  if (raw) {
    const v = raw
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[\s.-]+/g, "_")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const map: Record<string, string> = {
      em_dia: "em_dia",
      ok: "em_dia",
      proximo: "proximo_vencimento",
      proximo_vencimento: "proximo_vencimento",
      proximo_de_vencer: "proximo_vencimento",
      atencao: "proximo_vencimento",
      vencido: "vencido",
      atrasado: "vencido",
      pendente: "pendente",
      concluido: "concluido",
      finalizado: "concluido",
    };
    if (map[v] && SITUACOES_VALIDAS.has(map[v])) return map[v];
  }
  if (vencimento) {
    const d = new Date(vencimento);
    if (!isNaN(d.getTime())) {
      const diff = Math.floor((d.getTime() - Date.now()) / 86400000);
      if (diff < 0) return "vencido";
      if (diff <= 60) return "proximo_vencimento";
      return "em_dia";
    }
  }
  return "pendente";
}

function normalizeDate(raw?: string | null): string | null {
  if (!raw) return null;
  const s = raw.toString().trim();
  if (!s) return null;
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

export const importPlanilhaSST = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      fileName: string;
      rows: ImportRow[];
      accessToken: string;
      extraColumns?: string[];
      importedByName?: string;
      mode?: ImportMode;
    }) => {
      if (!input?.fileName || typeof input.fileName !== "string") {
        throw new Error("Nome do arquivo inválido");
      }
      if (!input?.accessToken || typeof input.accessToken !== "string") {
        throw new Error("Sessão inválida para importar a base");
      }
      if (!Array.isArray(input.rows)) throw new Error("Linhas inválidas");
      if (input.rows.length === 0) throw new Error("Planilha vazia");
      if (input.rows.length > 20000) throw new Error("Planilha excede 20.000 linhas");
      return { ...input, mode: input.mode ?? "replace" };
    },
  )
  .handler(async ({ data }) => {
    const {
      data: { user: authUser },
      error: authError,
    } = await supabaseAdmin.auth.getUser(data.accessToken);

    if (authError || !authUser) {
      throw new Error("Sessão expirada. Entre novamente para importar a base.");
    }

    const userId = authUser.id;

    const { data: roles, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (rolesError) {
      throw new Error(`Erro ao validar permissões: ${rolesError.message}`);
    }

    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    if (!isAdmin) {
      throw new Error("Apenas o Administrador Principal pode importar a base.");
    }

    const replaceAll = data.mode === "replace";

    if (replaceAll) {
      await supabaseAdmin.from("documentos_sst").delete().not("id", "is", null);
      await supabaseAdmin.from("eventos_esocial").delete().not("id", "is", null);
      await supabaseAdmin.from("empresas").delete().not("id", "is", null);
      await supabaseAdmin.from("contabilidades").delete().not("id", "is", null);
    }

    // 2. Contabilidades únicas
    const contabMap = new Map<string, string>();
    let totalContabilidadesCriadas = 0;
    const contabNames = Array.from(
      new Set(
        data.rows
          .map((r) => r.contabilidade?.toString().trim())
          .filter((v): v is string => !!v && v.length > 0),
      ),
    );
    if (!replaceAll) {
      const { data: existingContabs, error: existingContabsError } = await supabaseAdmin
        .from("contabilidades")
        .select("id,nome")
        .in("nome", contabNames.length > 0 ? contabNames : ["__sem_contabilidade__"]);
      if (existingContabsError)
        throw new Error(`Erro ao consultar contabilidades: ${existingContabsError.message}`);
      for (const c of existingContabs ?? []) contabMap.set(c.nome, c.id);
    }
    const contabNamesToInsert = contabNames.filter((nome) => !contabMap.has(nome));
    if (contabNamesToInsert.length > 0) {
      totalContabilidadesCriadas = contabNamesToInsert.length;
      const { data: insertedContabs, error: errC } = await supabaseAdmin
        .from("contabilidades")
        .insert(contabNamesToInsert.map((nome) => ({ nome, created_by: userId })))
        .select("id, nome");
      if (errC) throw new Error(`Erro ao importar contabilidades: ${errC.message}`);
      for (const c of insertedContabs ?? []) contabMap.set(c.nome, c.id);
    }

    // 3. Empresas únicas
    const empresaMap = new Map<string, string>();
    let totalEmpresasCriadas = 0;
    const empresasUnicas = new Map<
      string,
      {
        nome: string;
        cnpj: string | null;
        cidade: string | null;
        uf: string | null;
        responsavel: string | null;
        contato: string | null;
        contabilidade_id: string | null;
      }
    >();

    for (const r of data.rows) {
      const nome = r.empresa?.toString().trim();
      if (!nome) continue;
      const cnpj = r.cnpj?.toString().trim() || null;
      const key = `${nome}::${cnpj ?? ""}`;
      if (empresasUnicas.has(key)) continue;
      const contabId = r.contabilidade
        ? (contabMap.get(r.contabilidade.toString().trim()) ?? null)
        : null;
      empresasUnicas.set(key, {
        nome,
        cnpj,
        cidade: r.cidade?.toString().trim() || null,
        uf: r.uf?.toString().trim().toUpperCase().slice(0, 2) || null,
        responsavel: r.responsavel?.toString().trim() || null,
        contato: r.contato?.toString().trim() || null,
        contabilidade_id: contabId,
      });
    }

    if (empresasUnicas.size > 0) {
      if (!replaceAll) {
        const nomes = Array.from(new Set(Array.from(empresasUnicas.values()).map((e) => e.nome)));
        const { data: existingEmps, error: existingEmpsError } = await supabaseAdmin
          .from("empresas")
          .select("id,nome,cnpj")
          .in("nome", nomes.length > 0 ? nomes : ["__sem_empresa__"]);
        if (existingEmpsError)
          throw new Error(`Erro ao consultar empresas: ${existingEmpsError.message}`);
        for (const e of existingEmps ?? []) empresaMap.set(`${e.nome}::${e.cnpj ?? ""}`, e.id);
      }
      const empresasParaInserir = Array.from(empresasUnicas.entries()).filter(
        ([key]) => !empresaMap.has(key),
      );
      totalEmpresasCriadas = empresasParaInserir.length;
      if (empresasParaInserir.length > 0) {
        const { data: insertedEmps, error: errE } = await supabaseAdmin
          .from("empresas")
          .insert(
            empresasParaInserir.map(([_key, e]) => ({
              ...e,
              created_by: userId,
            })),
          )
          .select("id, nome, cnpj");
        if (errE) throw new Error(`Erro ao importar empresas: ${errE.message}`);
        for (const e of insertedEmps ?? []) {
          empresaMap.set(`${e.nome}::${e.cnpj ?? ""}`, e.id);
        }
      }
    }

    // 4. Documentos
    type DocTipo =
      | "PGR"
      | "PGRTR"
      | "PCMSO"
      | "LTCAT"
      | "LTI"
      | "LTP"
      | "AET"
      | "AEP"
      | "PPP"
      | "OS_SST"
      | "FICHA_EPI"
      | "TREINAMENTO"
      | "S_2240"
      | "S_2220"
      | "S_2210";
    type DocSituacao = "em_dia" | "proximo_vencimento" | "vencido" | "pendente" | "concluido";
    let totalErros = 0;
    const docsParaInserir: Array<{
      empresa_id: string;
      tipo: DocTipo;
      titulo: string | null;
      data_conclusao: string | null;
      data_vencimento: string | null;
      situacao: DocSituacao;
      responsavel: string | null;
      observacoes: string | null;
      created_by: string;
    }> = [];

    for (const r of data.rows) {
      const nome = r.empresa?.toString().trim();
      const cnpj = r.cnpj?.toString().trim() || null;
      const empresaId = nome ? empresaMap.get(`${nome}::${cnpj ?? ""}`) : null;
      const tipo = normalizeTipo(r.tipo_documento);

      if (!empresaId || !tipo) {
        totalErros++;
        continue;
      }

      const venc = DOCUMENTOS_SEM_VALIDADE.has(tipo) ? null : normalizeDate(r.data_vencimento);
      const sitRaw = r.situacao || r.status;
      docsParaInserir.push({
        empresa_id: empresaId,
        tipo: tipo as DocTipo,
        titulo: tipo,
        data_conclusao: normalizeDate(r.data_conclusao),
        data_vencimento: venc,
        situacao: (DOCUMENTOS_SEM_VALIDADE.has(tipo)
          ? "pendente"
          : normalizeSituacao(sitRaw, venc)) as DocSituacao,
        responsavel: r.responsavel?.toString().trim() || null,
        observacoes: r.observacoes?.toString().trim() || null,
        created_by: userId,
      });
    }

    let totalImportados = 0;
    if (docsParaInserir.length > 0) {
      const docsUnicos = Array.from(
        new Map(docsParaInserir.map((doc) => [`${doc.empresa_id}::${doc.tipo}`, doc])).values(),
      );
      const existingDocMap = new Map<string, string>();
      if (!replaceAll) {
        const empresaIds = Array.from(new Set(docsUnicos.map((doc) => doc.empresa_id)));
        const { data: existingDocs, error: existingDocsError } = await supabaseAdmin
          .from("documentos_sst")
          .select("id,empresa_id,tipo")
          .in("empresa_id", empresaIds);
        if (existingDocsError)
          throw new Error(`Erro ao consultar documentos: ${existingDocsError.message}`);
        for (const doc of existingDocs ?? [])
          existingDocMap.set(`${doc.empresa_id}::${doc.tipo}`, doc.id);
      }

      const docsNovos = docsUnicos.filter(
        (doc) => !existingDocMap.has(`${doc.empresa_id}::${doc.tipo}`),
      );
      const docsAtualizar = docsUnicos.filter((doc) =>
        existingDocMap.has(`${doc.empresa_id}::${doc.tipo}`),
      );

      for (const doc of docsAtualizar) {
        const id = existingDocMap.get(`${doc.empresa_id}::${doc.tipo}`);
        if (!id) continue;
        const { error: updateError } = await supabaseAdmin
          .from("documentos_sst")
          .update(doc)
          .eq("id", id);
        if (updateError) totalErros++;
        else totalImportados++;
      }

      for (let i = 0; i < docsNovos.length; i += 500) {
        const chunk = docsNovos.slice(i, i + 500);
        const { error: errD, data: ins } = await supabaseAdmin
          .from("documentos_sst")
          .insert(chunk)
          .select("id");
        if (errD) {
          totalErros += chunk.length;
        } else {
          totalImportados += ins?.length ?? 0;
        }
      }
    }

    // 5. Histórico
    await supabaseAdmin.from("import_history").insert({
      file_name: data.fileName,
      total_linhas: data.rows.length,
      total_importados: totalImportados,
      total_erros: totalErros,
      escopo: replaceAll ? "substituir_tudo" : "manter_atualizar",
      imported_by: userId,
      imported_by_name: data.importedByName ?? authUser.email ?? null,
      extra_columns: data.extraColumns ?? [],
    });

    return {
      success: true,
      totalLinhas: data.rows.length,
      totalImportados,
      totalErros,
      empresasCriadas: totalEmpresasCriadas,
      contabilidadesCriadas: totalContabilidadesCriadas,
      mode: data.mode,
    };
  });
