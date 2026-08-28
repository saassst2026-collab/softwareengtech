import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  ShieldAlert,
  Building2,
  HardHat,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

import { PageHero } from "@/components/PageHero";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useUserRole } from "@/lib/useUserRole";

export const Route = createFileRoute("/_authenticated/importacao-cadastros")({
  component: ImportacaoCadastrosPage,
});

type Row = Record<string, unknown>;

function normStr(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function parseDate(v: unknown): string | null {
  const s = normStr(v);
  if (!s) return null;
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

async function readSheet(file: File): Promise<Row[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Row>(sheet, { defval: "", raw: false });
}

function pick(row: Row, ...keys: string[]): string {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
  const map = new Map<string, unknown>();
  for (const [k, v] of Object.entries(row)) map.set(norm(k), v);
  for (const k of keys) {
    const v = map.get(norm(k));
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

const TIPOS_AGENTE: Record<string, "fisico" | "quimico" | "biologico" | "ergonomico" | "acidente"> =
  {
    fisico: "fisico",
    quimico: "quimico",
    biologico: "biologico",
    ergonomico: "ergonomico",
    acidente: "acidente",
    acidentes: "acidente",
    deacidente: "acidente",
    mecanico: "acidente",
    mecanicoacidente: "acidente",
    psicossocial: "ergonomico",
  };

function normalizeTipoAgente(raw: string) {
  const k = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "");
  return TIPOS_AGENTE[k] ?? null;
}

function ImportacaoCadastrosPage() {
  const { user } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const empresasFileRef = useRef<HTMLInputElement>(null);
  const trabFileRef = useRef<HTMLInputElement>(null);
  const riscosFileRef = useRef<HTMLInputElement>(null);
  const [empresaBusy, setEmpresaBusy] = useState(false);
  const [trabBusy, setTrabBusy] = useState(false);
  const [riscoBusy, setRiscoBusy] = useState(false);
  const [trabEmpresaId, setTrabEmpresaId] = useState<string>("");
  const [empresaResult, setEmpresaResult] = useState<{ criadas: number; ignoradas: number } | null>(
    null,
  );
  const [trabResult, setTrabResult] = useState<{ criados: number; ignorados: number } | null>(null);
  const [riscoResult, setRiscoResult] = useState<{
    criados: number;
    atualizados: number;
    invalidos: number;
  } | null>(null);

  const onRiscosFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setRiscoBusy(true);
    setRiscoResult(null);
    try {
      const rows = await readSheet(file);
      let invalidos = 0;
      const chave = (s: string) =>
        s
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim();
      const mapa = new Map<
        string,
        {
          nome: string;
          tipo: string;
          circunstancias: string | null;
          possiveis_lesoes: string | null;
        }
      >();

      for (const r of rows) {
        const nome = pick(r, "Fator de Risco", "Fator de risco", "Risco", "Nome");
        const tipo = normalizeTipoAgente(
          pick(r, "Tipo de Agente", "Tipo do Agente", "Agente", "Tipo"),
        );
        if (!nome || !tipo) {
          if (nome || pick(r, "Tipo de Agente")) invalidos++;
          continue;
        }
        mapa.set(chave(nome), {
          nome,
          tipo,
          circunstancias:
            pick(
              r,
              "Trajetória / meios de propagação",
              "Trajetoria / meios de propagacao",
              "Trajetória",
              "Trajetoria",
              "Meios de propagação",
            ) || null,
          possiveis_lesoes:
            pick(
              r,
              "Possíveis lesões ou danos à saúde",
              "Possiveis lesoes ou danos a saude",
              "Possíveis lesões",
              "Danos à saúde",
            ) || null,
        });
      }

      const itens = Array.from(mapa.values());
      if (itens.length === 0) {
        toast.error("Nenhuma linha válida encontrada na planilha de riscos.");
        return;
      }

      const { data: existentes, error: exErr } = await supabase
        .from("riscos_ocupacionais" as never)
        .select("id,nome");
      if (exErr) throw exErr;
      const existentesMap = new Map<string, string>(
        ((existentes as { id: string; nome: string }[] | null) ?? []).map((x) => [
          chave(x.nome),
          x.id,
        ]),
      );

      const novos = itens.filter((i) => !existentesMap.has(chave(i.nome)));
      const atualizar = itens.filter((i) => existentesMap.has(chave(i.nome)));

      let criados = 0;
      for (let i = 0; i < novos.length; i += 300) {
        const chunk = novos
          .slice(i, i + 300)
          .map((n) => ({ ...n, ativo: true, created_by: user.id }));
        const { data, error } = await supabase
          .from("riscos_ocupacionais" as never)
          .insert(chunk as never)
          .select("id");
        if (error) throw error;
        criados += (data as { id: string }[] | null)?.length ?? 0;
      }

      let atualizados = 0;
      for (const item of atualizar) {
        const id = existentesMap.get(chave(item.nome));
        if (!id) continue;
        const { error } = await supabase
          .from("riscos_ocupacionais" as never)
          .update({
            tipo: item.tipo,
            circunstancias: item.circunstancias,
            possiveis_lesoes: item.possiveis_lesoes,
          } as never)
          .eq("id", id);
        if (!error) atualizados++;
      }

      setRiscoResult({ criados, atualizados, invalidos });
      toast.success(
        `${criados} riscos cadastrados` +
          (atualizados ? ` · ${atualizados} atualizados` : "") +
          (invalidos ? ` · ${invalidos} linhas inválidas` : ""),
      );
      await qc.invalidateQueries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao importar riscos ocupacionais");
    } finally {
      setRiscoBusy(false);
      if (riscosFileRef.current) riscosFileRef.current.value = "";
    }
  };

  const { data: empresas } = useQuery({
    queryKey: ["empresas-simple-list"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("empresas").select("id,nome").order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const onEmpresasFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setEmpresaBusy(true);
    setEmpresaResult(null);
    try {
      const rows = await readSheet(file);
      const payloads = rows
        .map((r) => {
          const razao = pick(r, "Razão Social", "razao social", "razao_social");
          const fantasia = pick(r, "Nome Fantasia", "nome fantasia", "nome_fantasia");
          const nome = razao || fantasia;
          if (!nome) return null;
          return {
            nome,
            razao_social: razao || null,
            nome_fantasia: fantasia || null,
            cnpj: pick(r, "CNPJ") || null,
            endereco: pick(r, "Endereço", "Endereco") || null,
            bairro: pick(r, "Bairro/Distrito", "Bairro", "Distrito") || null,
            cidade: pick(r, "Cidade") || null,
            uf: pick(r, "UF").toUpperCase().slice(0, 2) || null,
            cep: pick(r, "CEP") || null,
            cnae: pick(r, "CNAE") || null,
            grau_risco: pick(r, "Grau de Risco", "Grau Risco") || null,
            contato: pick(r, "Telefone") || null,
            email: pick(r, "email", "e-mail", "email empresa") || null,
            status: "ativa" as const,
            created_by: user.id,
          };
        })
        .filter((p): p is NonNullable<typeof p> => !!p);

      if (payloads.length === 0) {
        toast.error("Nenhuma linha válida encontrada.");
        setEmpresaBusy(false);
        if (empresasFileRef.current) empresasFileRef.current.value = "";
        return;
      }

      // Evita duplicatas por CNPJ
      const cnpjs = payloads.map((p) => p.cnpj).filter((v): v is string => !!v);
      const { data: existentes } = await supabase
        .from("empresas")
        .select("cnpj")
        .in("cnpj", cnpjs.length > 0 ? cnpjs : ["__none__"]);
      const existentesSet = new Set((existentes ?? []).map((e) => e.cnpj));
      const novos = payloads.filter((p) => !p.cnpj || !existentesSet.has(p.cnpj));
      const ignoradas = payloads.length - novos.length;

      let criadas = 0;
      if (novos.length > 0) {
        const { data, error } = await supabase.from("empresas").insert(novos).select("id");
        if (error) throw error;
        criadas = data?.length ?? 0;
      }
      setEmpresaResult({ criadas, ignoradas });
      toast.success(
        `${criadas} empresas cadastradas${ignoradas ? ` · ${ignoradas} já existiam` : ""}`,
      );
      await qc.invalidateQueries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao importar empresas");
    } finally {
      setEmpresaBusy(false);
      if (empresasFileRef.current) empresasFileRef.current.value = "";
    }
  };

  const onTrabalhadoresFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!trabEmpresaId) {
      toast.error("Selecione a empresa destinatária antes de enviar a planilha.");
      if (trabFileRef.current) trabFileRef.current.value = "";
      return;
    }
    setTrabBusy(true);
    setTrabResult(null);
    try {
      const rows = await readSheet(file);
      const payloads = rows
        .map((r) => {
          const nome = pick(r, "Nome");
          if (!nome) return null;
          return {
            empresa_id: trabEmpresaId,
            nome,
            cpf: pick(r, "CPF") || null,
            sexo: pick(r, "Sexo") || null,
            data_nascimento: parseDate(pick(r, "Data de Nascimento", "Nascimento")),
            setor: pick(r, "Setor") || null,
            funcao: pick(r, "Função", "Funcao") || null,
            data_admissao: parseDate(pick(r, "Data de Admissão", "Admissão", "Admissao")),
            telefone: pick(r, "Telefone") || null,
            email: pick(r, "email", "e-mail") || null,
            created_by: user.id,
          };
        })
        .filter((p): p is NonNullable<typeof p> => !!p);

      if (payloads.length === 0) {
        toast.error("Nenhuma linha válida encontrada.");
        setTrabBusy(false);
        if (trabFileRef.current) trabFileRef.current.value = "";
        return;
      }

      const { data, error } = await supabase
        .from("trabalhadores" as never)
        .insert(payloads as never)
        .select("id");
      if (error) throw error;
      const criados = (data as { id: string }[] | null)?.length ?? 0;

      // Cadastra automaticamente setores e funções encontrados na planilha
      const chave = (s: string) =>
        s
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim();

      const setoresPlanilha = Array.from(
        new Map(
          payloads
            .map((p) => p.setor)
            .filter((s): s is string => !!s && s.trim() !== "")
            .map((s) => [chave(s), s.trim()]),
        ).entries(),
      );

      const { data: setoresExistentes } = await supabase
        .from("setores" as never)
        .select("id,nome")
        .eq("empresa_id", trabEmpresaId);
      const setorMap = new Map<string, string>(
        ((setoresExistentes as { id: string; nome: string }[] | null) ?? []).map((s) => [
          chave(s.nome),
          s.id,
        ]),
      );

      const novosSetores = setoresPlanilha.filter(([k]) => !setorMap.has(k));
      if (novosSetores.length > 0) {
        const { data: inseridos, error: setErr } = await supabase
          .from("setores" as never)
          .insert(
            novosSetores.map(([, nome]) => ({
              empresa_id: trabEmpresaId,
              nome,
              created_by: user.id,
            })) as never,
          )
          .select("id,nome");
        if (setErr) throw setErr;
        for (const s of (inseridos as { id: string; nome: string }[] | null) ?? []) {
          setorMap.set(chave(s.nome), s.id);
        }
      }

      const funcoesPlanilha = Array.from(
        new Map(
          payloads
            .filter((p) => p.funcao && p.funcao.trim() !== "")
            .map((p) => [
              `${chave(p.funcao as string)}|${p.setor ? chave(p.setor) : ""}`,
              { nome: (p.funcao as string).trim(), setor: p.setor ?? null },
            ]),
        ).values(),
      );

      const { data: funcoesExistentes } = await supabase
        .from("funcoes" as never)
        .select("id,nome")
        .eq("empresa_id", trabEmpresaId);
      const funcoesSet = new Set(
        ((funcoesExistentes as { id: string; nome: string }[] | null) ?? []).map((f) =>
          chave(f.nome),
        ),
      );

      const novasFuncoes = funcoesPlanilha.filter((f) => !funcoesSet.has(chave(f.nome)));
      if (novasFuncoes.length > 0) {
        const { error: funcErr } = await supabase.from("funcoes" as never).insert(
          novasFuncoes.map((f) => ({
            empresa_id: trabEmpresaId,
            setor_id: f.setor ? (setorMap.get(chave(f.setor)) ?? null) : null,
            nome: f.nome,
            created_by: user.id,
          })) as never,
        );
        if (funcErr) throw funcErr;
      }

      setTrabResult({ criados, ignorados: payloads.length - criados });
      toast.success(
        `${criados} trabalhadores cadastrados` +
          (novosSetores.length ? ` · ${novosSetores.length} setores criados` : "") +
          (novasFuncoes.length ? ` · ${novasFuncoes.length} funções criadas` : ""),
      );
      await qc.invalidateQueries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao importar trabalhadores");
    } finally {
      setTrabBusy(false);
      if (trabFileRef.current) trabFileRef.current.value = "";
    }
  };

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center p-10">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col gap-6">
        <PageHero
          title="Importação de Cadastros"
          subtitle="Área restrita ao Administrador Principal."
        />
        <section className="rounded-3xl border border-warning/40 bg-warning/10 p-8 text-center">
          <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-warning-foreground" />
          <p className="text-sm font-bold text-warning-foreground">Acesso restrito</p>
          <button
            onClick={() => navigate({ to: "/dashboard" })}
            className="mt-4 rounded-xl bg-card px-4 py-2 text-sm font-bold text-primary shadow-elegant"
          >
            Voltar ao painel
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title="Importação de Cadastros"
        subtitle="Cadastre empresas e trabalhadores em lote usando as planilhas padrão da EngTech."
      />

      {/* RISCOS OCUPACIONAIS */}
      <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-elegant">
        <header className="mb-4 flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2 text-primary">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Importar Riscos Ocupacionais</h2>
            <p className="text-xs text-muted-foreground">
              Planilha padrão: <strong>RISCOS_OCUPACIONAIS.xlsx</strong> — Fator de Risco, Tipo de
              Agente, Trajetória / meios de propagação, Possíveis lesões ou danos à saúde. O
              catálogo é global e serve para todas as empresas — não é necessário selecionar
              empresa.
            </p>
          </div>
        </header>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-brand px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-glow hover:opacity-95">
            {riscoBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Selecionar planilha de riscos
            <input
              ref={riscosFileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={onRiscosFile}
              disabled={riscoBusy}
              className="hidden"
            />
          </label>
          {riscoResult && (
            <div className="inline-flex items-center gap-2 rounded-xl border border-success/40 bg-success/10 px-3 py-2 text-xs font-bold text-success">
              <CheckCircle2 className="h-4 w-4" />
              {riscoResult.criados} criados
              {riscoResult.atualizados > 0 && ` · ${riscoResult.atualizados} atualizados`}
              {riscoResult.invalidos > 0 && ` · ${riscoResult.invalidos} inválidos`}
            </div>
          )}
        </div>
      </section>

      {/* EMPRESAS */}
      <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-elegant">
        <header className="mb-4 flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Importar Empresas</h2>
            <p className="text-xs text-muted-foreground">
              Planilha padrão: <strong>EMPRESAS.xlsx</strong> — Razão Social, Nome Fantasia, CNPJ,
              Endereço, Bairro/Distrito, Cidade, UF, CEP, CNAE, Grau de Risco, Telefone, e-mail.
            </p>
          </div>
        </header>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-brand px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-glow hover:opacity-95">
            {empresaBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Selecionar planilha de empresas
            <input
              ref={empresasFileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={onEmpresasFile}
              disabled={empresaBusy}
              className="hidden"
            />
          </label>
          {empresaResult && (
            <div className="inline-flex items-center gap-2 rounded-xl border border-success/40 bg-success/10 px-3 py-2 text-xs font-bold text-success">
              <CheckCircle2 className="h-4 w-4" />
              {empresaResult.criadas} criadas
              {empresaResult.ignoradas > 0 && ` · ${empresaResult.ignoradas} já existentes`}
            </div>
          )}
        </div>
      </section>

      {/* TRABALHADORES */}
      <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-elegant">
        <header className="mb-4 flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2 text-primary">
            <HardHat className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Importar Trabalhadores</h2>
            <p className="text-xs text-muted-foreground">
              Planilha padrão: <strong>TRABALHADORES.xlsx</strong> — Nome, CPF, Sexo, Data de
              Nascimento, Setor, Função, Data de Admissão, Telefone, e-mail.
            </p>
          </div>
        </header>

        <div className="mb-3">
          <label className="mb-1 block text-xs font-bold text-foreground">
            Empresa destinatária *
          </label>
          <select
            value={trabEmpresaId}
            onChange={(e) => setTrabEmpresaId(e.target.value)}
            className="w-full max-w-md rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
          >
            <option value="">Selecione a empresa…</option>
            {(empresas ?? []).map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Todos os trabalhadores desta planilha serão vinculados à empresa selecionada.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label
            className={`inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-glow transition ${
              trabEmpresaId ? "cursor-pointer hover:opacity-95" : "cursor-not-allowed opacity-50"
            }`}
          >
            {trabBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Selecionar planilha de trabalhadores
            <input
              ref={trabFileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={onTrabalhadoresFile}
              disabled={trabBusy || !trabEmpresaId}
              className="hidden"
            />
          </label>
          {trabResult && (
            <div className="inline-flex items-center gap-2 rounded-xl border border-success/40 bg-success/10 px-3 py-2 text-xs font-bold text-success">
              <CheckCircle2 className="h-4 w-4" />
              {trabResult.criados} cadastrados
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-info/30 bg-info/5 p-4 text-xs text-info">
        <div className="flex items-start gap-2">
          <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-bold">Dicas</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-muted-foreground">
              <li>Use os modelos padrão da EngTech — a primeira aba é lida automaticamente.</li>
              <li>
                Datas em <strong>DD/MM/AAAA</strong> ou <strong>AAAA-MM-DD</strong>.
              </li>
              <li>Empresas com CNPJ já cadastrado são ignoradas automaticamente.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
