import * as XLSX from "xlsx";

import { tipoLabel, DOCUMENTO_ORDEM } from "@/lib/documentoLabels";
import { parseLocalDate, daysFromToday } from "@/lib/dateUtils";

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const SITUACAO_LABEL: Record<string, string> = {
  em_dia: "Em dia",
  proximo_vencimento: "Próximo do vencimento",
  vencido: "Vencido",
  pendente: "Pendente",
  concluido: "Concluído",
};

type Doc = {
  id: string;
  empresa_id: string;
  tipo: string;
  data_conclusao: string | null;
  data_vencimento: string | null;
  situacao: string;
};
type Empresa = { id: string; nome: string; contabilidade_id?: string | null };
type Contab = { id: string; nome: string };

function fmtBR(iso: string | null): string {
  if (!iso) return "";
  const d = parseLocalDate(iso);
  if (!d) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export function exportarDocumentosExcel(params: {
  documentos: Doc[];
  empresas: Empresa[];
  contabilidades: Contab[];
}) {
  const { documentos, empresas, contabilidades } = params;
  const empMap = new Map(empresas.map((e) => [e.id, e]));
  const contMap = new Map(contabilidades.map((c) => [c.id, c.nome]));

  const rows = documentos.map((d, idx) => {
    const emp = empMap.get(d.empresa_id);
    const contNome = emp?.contabilidade_id ? (contMap.get(emp.contabilidade_id) ?? "") : "";
    const venc = d.data_vencimento ? parseLocalDate(d.data_vencimento) : null;
    const concl = d.data_conclusao ? parseLocalDate(d.data_conclusao) : null;
    const dias = d.data_vencimento ? daysFromToday(d.data_vencimento) : null;
    const indeterminado = !d.data_vencimento ? "Sim" : "Não";
    const ano = venc ? venc.getFullYear() : concl ? concl.getFullYear() : "";
    const mesNum = venc ? venc.getMonth() + 1 : concl ? concl.getMonth() + 1 : "";
    const mes = typeof mesNum === "number" ? MESES[mesNum - 1] : "";
    const anoMes = ano && mesNum ? `${ano}-${String(mesNum).padStart(2, "0")}` : "";

    return {
      ID: idx + 1,
      Contabilidade: contNome,
      Empresa: emp?.nome ?? "",
      Documento: tipoLabel(d.tipo),
      Data_Conclusao: fmtBR(d.data_conclusao),
      Data_Vencimento: fmtBR(d.data_vencimento),
      Indeterminado: indeterminado,
      Dias_para_Vencer: dias ?? "",
      Situação: SITUACAO_LABEL[d.situacao] ?? d.situacao,
      Ordem: DOCUMENTO_ORDEM[d.tipo] ?? 999,
      Ano: ano,
      Mês: mes,
      Mes_Num: mesNum,
      AnoMes: anoMes,
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows, {
    header: [
      "ID",
      "Contabilidade",
      "Empresa",
      "Documento",
      "Data_Conclusao",
      "Data_Vencimento",
      "Indeterminado",
      "Dias_para_Vencer",
      "Situação",
      "Ordem",
      "Ano",
      "Mês",
      "Mes_Num",
      "AnoMes",
    ],
  });

  ws["!cols"] = [
    { wch: 6 },
    { wch: 28 },
    { wch: 32 },
    { wch: 26 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 22 },
    { wch: 8 },
    { wch: 8 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Planilha1");

  const d = new Date();
  const stamp = `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
  XLSX.writeFile(wb, `EngTech_Documentos_${stamp}.xlsx`);
}
