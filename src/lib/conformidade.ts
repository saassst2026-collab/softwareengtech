import {
  computarStatusRegularizacao,
  tipoExigeConferencia,
  type DocumentoBase,
  type RegularizacaoStatus,
} from "./documentoStatus";
import { daysFromToday } from "./dateUtils";

export type ConformidadeBreakdown = {
  total: number;
  regularizados: number;
  pendentes: number;
  vencidos: number;
  indeterminados: number;
  parciais: number;
  percentual: number;
};

export type ConformidadeDocumentalBreakdown = {
  totalObrigatorios: number;
  conferidos: number;
  pendentes: number;
  percentual: number;
};

/**
 * Cálculo único de conformidade documental usado em Dashboard, Empresas
 * Atendidas, Contabilidades e Documentos SST. A conformidade considera
 * apenas documentos relevantes (com validade definida ou que exigem
 * conferência), e o percentual representa quantos estão totalmente
 * regularizados.
 */
export function computarConformidade(documentos: DocumentoBase[]): ConformidadeBreakdown {
  const statuses: RegularizacaoStatus[] = documentos.map((d) => computarStatusRegularizacao(d));

  let regularizados = 0;
  let pendentes = 0;
  let vencidos = 0;
  let indeterminados = 0;
  let parciais = 0;

  statuses.forEach((s) => {
    switch (s) {
      case "regularizado":
        regularizados++;
        break;
      case "em_dia":
        regularizados++;
        break;
      case "pendente_anexos":
        pendentes++;
        break;
      case "vencido":
        vencidos++;
        break;
      case "parcialmente_regular":
        parciais++;
        break;
      case "indeterminado":
        indeterminados++;
        break;
    }
  });

  const total = documentos.length;
  // Indeterminados não entram na conta — não há prazo nem conferência exigida.
  const base = total - indeterminados;
  const percentual = base > 0 ? (regularizados / base) * 100 : 0;

  return { total, regularizados, pendentes, vencidos, indeterminados, parciais, percentual };
}

export function computarConformidadeDocumental(
  documentos: DocumentoBase[],
): ConformidadeDocumentalBreakdown {
  const obrigatorios = documentos.filter((doc) => tipoExigeConferencia(doc.tipo));
  const conferidos = obrigatorios.filter((doc) => doc.conferencia_ok).length;
  const pendentes = obrigatorios.length - conferidos;
  const percentual = obrigatorios.length > 0 ? (conferidos / obrigatorios.length) * 100 : 0;

  return { totalObrigatorios: obrigatorios.length, conferidos, pendentes, percentual };
}

export type ResumoEmpresa = {
  percentual: number;
  total: number;
  pendentes: number; // pendente de conferência/anexo
  vencidos: number; // data_vencimento < hoje
  semAnexo: number; // tipo exige conferência e !conferencia_ok
  proximos: number; // vence em até 30 dias (>=0)
  temAlertas: boolean;
};

/**
 * Resumo rápido por empresa — reúne os mesmos números usados em todos os
 * dashboards/relatórios, garantindo cálculo único.
 */
export function computarResumoEmpresa(documentos: DocumentoBase[]): ResumoEmpresa {
  const conf = computarConformidade(documentos);
  let proximos = 0;
  let semAnexo = 0;
  documentos.forEach((d) => {
    const dias = daysFromToday(d.data_vencimento);
    if (dias !== null && dias >= 0 && dias <= 30) proximos++;
    if (tipoExigeConferencia(d.tipo) && !d.conferencia_ok) semAnexo++;
  });
  const temAlertas = conf.vencidos > 0 || conf.pendentes > 0 || semAnexo > 0 || proximos > 0;
  return {
    percentual: conf.percentual,
    total: conf.total,
    pendentes: conf.pendentes,
    vencidos: conf.vencidos,
    semAnexo,
    proximos,
    temAlertas,
  };
}
