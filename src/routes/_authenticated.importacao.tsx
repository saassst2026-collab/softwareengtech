import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  History,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { PageHero } from "@/components/PageHero";
import { supabase } from "@/integrations/supabase/client";
import { importPlanilhaSST, type ImportRow } from "@/lib/import.functions";
import { useAuth } from "@/lib/auth";
import { useUserRole } from "@/lib/useUserRole";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  COLUMN_DEFINITIONS,
  REQUIRED_COLUMNS,
  buildColumnMap,
  normalizeHeader,
  type CanonicalField,
} from "@/lib/columnMapping";

export const Route = createFileRoute("/_authenticated/importacao")({
  component: ImportacaoPage,
});

const PAGE_SIZE = 25;

type ParsedState = {
  fileName: string;
  headers: string[];
  rows: ImportRow[];
  matchedFields: CanonicalField[];
  missingRequired: CanonicalField[];
  columnMap: Partial<Record<CanonicalField, string>>;
  extraColumns: string[];
};

type ImportMode = "replace" | "merge";

function ImportacaoPage() {
  const { session, user } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedState | null>(null);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>("merge");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const importFn = useServerFn(importPlanilhaSST);
  const qc = useQueryClient();

  const { data: historico } = useQuery({
    queryKey: ["import-history"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("import_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  const lastImport = historico?.[0];

  const onDeleteHistorico = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("import_history").delete().eq("id", deleteId);
      if (error) throw error;
      toast.success("Registro do histórico removido.");
      setDeleteId(null);
      await qc.invalidateQueries({ queryKey: ["import-history"] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao excluir registro";
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = parsed ? Math.max(1, Math.ceil(parsed.rows.length / PAGE_SIZE)) : 0;
  const pageRows = useMemo(() => {
    if (!parsed) return [];
    const start = page * PAGE_SIZE;
    return parsed.rows.slice(start, start + PAGE_SIZE);
  }, [parsed, page]);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false });
      if (aoa.length < 2) {
        throw new Error("Planilha precisa ter cabeçalho + ao menos 1 linha de dados.");
      }
      const headers = (aoa[0] as unknown[]).map((h) => String(h ?? "").trim()).filter(Boolean);
      const { map, missingRequired, matchedFields } = buildColumnMap(headers);

      // Colunas extras = headers da planilha que não foram mapeados a nenhum campo canônico
      const mappedRawHeaders = new Set(Object.values(map));
      const extraColumns = headers.filter((h) => !mappedRawHeaders.has(h));

      const dataRows = aoa.slice(1) as unknown[][];
      const rows: ImportRow[] = dataRows
        .map((arr) => {
          const obj: Record<string, string> = {};
          headers.forEach((h, i) => {
            obj[normalizeHeader(h)] = arr[i] == null ? "" : String(arr[i]);
          });
          const get = (field: CanonicalField): string => {
            const header = map[field];
            if (!header) return "";
            return obj[normalizeHeader(header)] ?? "";
          };
          return {
            empresa: get("empresa"),
            cnpj: get("cnpj"),
            cidade: get("cidade"),
            uf: get("uf"),
            contabilidade: get("contabilidade"),
            responsavel: get("responsavel"),
            contato: get("contato"),
            tipo_documento: get("tipo_documento"),
            titulo: get("titulo"),
            data_conclusao: get("data_conclusao"),
            data_vencimento: get("data_vencimento"),
            situacao: get("situacao"),
            status: get("status"),
            observacoes: get("observacoes"),
          } as ImportRow;
        })
        .filter((r) => (r.empresa ?? "").trim().length > 0);

      setParsed({
        fileName: file.name,
        headers,
        rows,
        matchedFields,
        missingRequired,
        columnMap: map,
        extraColumns,
      });
      setPage(0);
      setConfirmReplace(false);
      setImportMode("merge");

      if (missingRequired.length > 0) {
        toast.error(
          `Faltam colunas obrigatórias: ${missingRequired
            .map((f) => COLUMN_DEFINITIONS.find((d) => d.field === f)?.label)
            .join(", ")}`,
        );
      } else {
        toast.success(`${rows.length} linhas válidas detectadas. Confira a pré-visualização.`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao ler arquivo";
      toast.error(msg);
      setParsed(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const reset = () => {
    setParsed(null);
    setPage(0);
    setConfirmReplace(false);
    setImportMode("merge");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onConfirm = async () => {
    if (
      !parsed ||
      (importMode === "replace" && !confirmReplace) ||
      parsed.missingRequired.length > 0
    )
      return;
    if (!session?.access_token) {
      toast.error("Sua sessão expirou. Entre novamente para importar a base.");
      return;
    }
    setBusy(true);
    try {
      const result = await importFn({
        data: {
          fileName: parsed.fileName,
          rows: parsed.rows,
          accessToken: session.access_token,
          mode: importMode,
          extraColumns: parsed.extraColumns,
          importedByName:
            (user?.user_metadata?.display_name as string | undefined) ?? user?.email ?? undefined,
        },
      });
      toast.success(
        `${importMode === "replace" ? "Base substituída" : "Base atualizada"}: ${result.totalImportados} documentos · ${result.empresasCriadas} empresas · ${result.contabilidadesCriadas} contabilidades` +
          (result.totalErros > 0 ? ` (${result.totalErros} linhas ignoradas)` : ""),
      );
      reset();
      await qc.invalidateQueries();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao importar";
      toast.error(msg);
    } finally {
      setBusy(false);
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
          title="Importação de Base SST"
          subtitle="Área restrita ao Administrador Principal."
        />
        <section className="rounded-3xl border border-warning/40 bg-warning/10 p-8 text-center">
          <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-warning-foreground" />
          <p className="text-sm font-bold text-warning-foreground">Acesso restrito</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Apenas o Administrador Principal pode importar planilhas e atualizar a base ativa de
            SST.
          </p>
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
        title="Importação de Base SST"
        subtitle="Faça o upload da planilha mestra e escolha se deseja substituir a base ativa ou manter os dados atuais e apenas adicionar/atualizar registros."
        actions={
          lastImport ? (
            <div className="rounded-xl border border-border bg-card px-4 py-2.5 text-xs text-muted-foreground shadow-elegant">
              <span className="font-bold text-foreground">Última base ativa:</span>{" "}
              {lastImport.file_name} ·{" "}
              {format(new Date(lastImport.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
            </div>
          ) : null
        }
      />

      {/* Passo 1: upload + colunas esperadas */}
      <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-elegant">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-base font-bold text-foreground">1. Selecione a planilha SST</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Formatos aceitos: <strong>.xlsx, .xls, .csv</strong>. A primeira aba é lida
              automaticamente.
            </p>
            <div className="mt-3 rounded-2xl border border-dashed border-border bg-muted/40 p-4 text-xs">
              <p className="mb-2 font-bold text-foreground">
                Colunas reconhecidas (cabeçalho na 1ª linha):
              </p>
              <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {COLUMN_DEFINITIONS.map((d) => (
                  <li key={d.field} className="flex items-center gap-2 text-muted-foreground">
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full ${
                        d.required ? "bg-destructive" : "bg-info/60"
                      }`}
                    />
                    <span className="font-semibold text-foreground">{d.label}</span>
                    {d.required && (
                      <span className="text-[10px] font-bold text-destructive">obrigatória</span>
                    )}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-muted-foreground">
                Datas em <strong>DD/MM/AAAA</strong> ou <strong>AAAA-MM-DD</strong>. Tipos válidos:
                PGR, PGRTR, PCMSO, LTCAT, LTI, LTP, AET, AEP, PPP, OS_SST, FICHA_EPI, TREINAMENTO,
                S_2240, S_2220, S_2210.
              </p>
            </div>
          </div>

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-brand px-5 py-3 text-sm font-bold text-primary-foreground shadow-glow transition hover:opacity-95">
            <Upload className="h-4 w-4" />
            Escolher planilha
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={onFileChange}
              className="hidden"
            />
          </label>
        </div>
      </section>

      {/* Passo 2: validação + preview */}
      {parsed && (
        <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-elegant">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-5 w-5 text-info" />
              <div>
                <p className="text-sm font-bold text-foreground">{parsed.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {parsed.rows.length} linhas válidas · {parsed.headers.length} colunas detectadas
                </p>
              </div>
            </div>
            <button
              onClick={reset}
              className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </button>
          </header>

          {/* Validação de colunas */}
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Colunas reconhecidas ({parsed.matchedFields.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {parsed.matchedFields.map((f) => {
                  const def = COLUMN_DEFINITIONS.find((d) => d.field === f)!;
                  return (
                    <span
                      key={f}
                      className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-bold text-success"
                    >
                      <CheckCircle2 className="h-3 w-3" /> {def.label}
                    </span>
                  );
                })}
              </div>
            </div>
            <div
              className={`rounded-2xl border p-4 ${
                parsed.missingRequired.length > 0
                  ? "border-destructive/40 bg-destructive/5"
                  : "border-border/60 bg-muted/30"
              }`}
            >
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Obrigatórias ({REQUIRED_COLUMNS.length})
              </p>
              {parsed.missingRequired.length === 0 ? (
                <p className="flex items-center gap-2 text-xs font-bold text-success">
                  <CheckCircle2 className="h-4 w-4" /> Todas as colunas obrigatórias presentes.
                </p>
              ) : (
                <div>
                  <p className="mb-1 flex items-center gap-2 text-xs font-bold text-destructive">
                    <AlertTriangle className="h-4 w-4" /> Colunas faltando:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {parsed.missingRequired.map((f) => {
                      const def = COLUMN_DEFINITIONS.find((d) => d.field === f)!;
                      return (
                        <span
                          key={f}
                          className="rounded-full bg-destructive/15 px-2.5 py-1 text-[11px] font-bold text-destructive"
                        >
                          {def.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Colunas extras detectadas (flexíveis) */}
          {parsed.extraColumns.length > 0 && (
            <div className="mt-3 rounded-2xl border border-info/30 bg-info/5 p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-info">
                Colunas adicionais detectadas ({parsed.extraColumns.length})
              </p>
              <p className="mb-2 text-[11px] text-muted-foreground">
                Estas colunas foram reconhecidas na planilha além das padrão. Ficarão registradas no
                histórico para uso em indicadores futuros.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {parsed.extraColumns.map((c) => (
                  <span
                    key={c}
                    className="rounded-full bg-info/15 px-2.5 py-1 text-[11px] font-bold text-info"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Preview paginado */}
          <div className="mt-5">
            <header className="mb-3 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Pré-visualização (página {page + 1} de {totalPages})
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="rounded-lg border border-border bg-card p-1.5 text-muted-foreground disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="rounded-lg border border-border bg-card p-1.5 text-muted-foreground disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </header>
            <div className="overflow-x-auto rounded-2xl border border-border/60">
              <table className="w-full min-w-[760px] text-xs">
                <thead className="bg-muted/40">
                  <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Empresa</th>
                    <th className="px-3 py-2">Documento</th>
                    <th className="px-3 py-2">Vencimento</th>
                    <th className="px-3 py-2">Conclusão</th>
                    <th className="px-3 py-2">Situação</th>
                    <th className="px-3 py-2">Responsável</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r, i) => (
                    <tr key={i} className="border-t border-border/60">
                      <td className="px-3 py-2 text-muted-foreground">
                        {page * PAGE_SIZE + i + 1}
                      </td>
                      <td className="px-3 py-2 font-semibold text-foreground">
                        {r.empresa || "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{r.tipo_documento || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {r.data_vencimento || "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{r.data_conclusao || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {r.situacao || r.status || "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{r.responsavel || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-border/60 bg-muted/30 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Deseja substituir toda a base de dados ou manter os dados atuais e adicionar/atualizar
              as informações da planilha?
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <label
                className={`cursor-pointer rounded-2xl border p-4 transition ${importMode === "replace" ? "border-destructive/50 bg-destructive/5" : "border-border bg-card"}`}
              >
                <input
                  type="radio"
                  name="import-mode"
                  value="replace"
                  checked={importMode === "replace"}
                  onChange={() => setImportMode("replace")}
                  className="sr-only"
                />
                <span className="block text-sm font-bold text-foreground">Substituir tudo</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Apaga dados atuais e importa apenas os dados da planilha.
                </span>
              </label>
              <label
                className={`cursor-pointer rounded-2xl border p-4 transition ${importMode === "merge" ? "border-success/50 bg-success/10" : "border-border bg-card"}`}
              >
                <input
                  type="radio"
                  name="import-mode"
                  value="merge"
                  checked={importMode === "merge"}
                  onChange={() => setImportMode("merge")}
                  className="sr-only"
                />
                <span className="block text-sm font-bold text-foreground">Manter e atualizar</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Mantém dados existentes, atualiza registros correspondentes e adiciona novos.
                </span>
              </label>
            </div>
          </div>

          {importMode === "replace" && (
            <div className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                <div className="flex-1 text-xs text-foreground">
                  <p className="font-bold text-destructive">Atenção: ação irreversível</p>
                  <p className="mt-1 text-muted-foreground">
                    Toda a base SST atual (empresas, contabilidades, documentos e eventos do
                    eSocial) será apagada e substituída pelo conteúdo desta planilha. Os indicadores
                    serão atualizados imediatamente para todos os usuários.
                  </p>
                </div>
              </div>
              <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs font-semibold text-foreground">
                <input
                  type="checkbox"
                  checked={confirmReplace}
                  onChange={(e) => setConfirmReplace(e.target.checked)}
                  disabled={parsed.missingRequired.length > 0}
                  className="h-4 w-4 rounded border-input"
                />
                Confirmo que desejo substituir integralmente a base ativa de SST.
              </label>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={onConfirm}
              disabled={
                (importMode === "replace" && !confirmReplace) ||
                busy ||
                parsed.missingRequired.length > 0
              }
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-glow transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {importMode === "replace" ? "Substituir base agora" : "Manter e atualizar"}
            </button>
            <button
              onClick={reset}
              disabled={busy}
              className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </button>
          </div>
        </section>
      )}

      {/* Histórico */}
      <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-elegant">
        <header className="mb-4 flex items-center gap-2">
          <History className="h-4 w-4 text-info" />
          <h2 className="text-base font-bold text-foreground">Histórico de importações</h2>
        </header>
        {!historico || historico.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
            Nenhuma importação realizada ainda.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 pr-3">Arquivo</th>
                  <th className="pb-3 pr-3">Data/Hora</th>
                  <th className="pb-3 pr-3">Enviado por</th>
                  <th className="pb-3 pr-3">Linhas</th>
                  <th className="pb-3 pr-3">Importados</th>
                  <th className="pb-3 pr-3">Erros</th>
                  <th className="pb-3 pr-3">Colunas extras</th>
                  <th className="pb-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {historico.map((h) => (
                  <tr key={h.id} className="border-t border-border/60">
                    <td className="py-3 pr-3 font-semibold text-foreground">{h.file_name}</td>
                    <td className="py-3 pr-3 text-muted-foreground">
                      {format(new Date(h.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </td>
                    <td className="py-3 pr-3 text-muted-foreground">
                      {(h as { imported_by_name?: string | null }).imported_by_name ?? "—"}
                    </td>
                    <td className="py-3 pr-3 text-muted-foreground">{h.total_linhas}</td>
                    <td className="py-3 pr-3 font-bold text-success">{h.total_importados}</td>
                    <td className="py-3 pr-3">
                      {h.total_erros > 0 ? (
                        <span className="font-bold text-destructive">{h.total_erros}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                    <td className="py-3 pr-3 text-muted-foreground">
                      {(() => {
                        const ec = (h as { extra_columns?: unknown }).extra_columns;
                        const arr = Array.isArray(ec) ? (ec as string[]) : [];
                        return arr.length > 0 ? (
                          <span className="rounded-full bg-info/10 px-2 py-0.5 text-[11px] font-bold text-info">
                            {arr.length}
                          </span>
                        ) : (
                          "—"
                        );
                      })()}
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => setDeleteId(h.id)}
                        title="Excluir registro do histórico"
                        className="inline-flex items-center gap-1 rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-[11px] font-bold text-destructive transition hover:bg-destructive/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro do histórico?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove apenas o registro deste histórico de importação. A base ativa de SST
              (empresas, contabilidades e documentos) não será afetada. Esta operação é
              irreversível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                onDeleteHistorico();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Excluindo…
                </span>
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
