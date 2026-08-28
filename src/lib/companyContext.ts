const COMPANY_CONTEXT_KEY = "engtech:selectedEmpresaId";
const DOCUMENTOS_SITUACAO_PRESET_KEY = "engtech:documentosSituacaoPreset";
const ASOS_SITUACAO_PRESET_KEY = "engtech:asosSituacaoPreset";
const LAST_FORM_SELECTIONS_KEY = "engtech:lastFormSelections";
const CONTABILIDADE_FILTER_PRESET_KEY = "engtech:contabilidadeFilterPreset";

export function getSelectedEmpresaId(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(COMPANY_CONTEXT_KEY);
}

export function setSelectedEmpresaId(empresaId: string | null) {
  if (typeof window === "undefined") return;
  if (empresaId) window.sessionStorage.setItem(COMPANY_CONTEXT_KEY, empresaId);
  else window.sessionStorage.removeItem(COMPANY_CONTEXT_KEY);
}

export function consumeDocumentosSituacaoPreset(): string | null {
  if (typeof window === "undefined") return null;
  const v = window.sessionStorage.getItem(DOCUMENTOS_SITUACAO_PRESET_KEY);
  if (v) window.sessionStorage.removeItem(DOCUMENTOS_SITUACAO_PRESET_KEY);
  return v;
}

export function setDocumentosSituacaoPreset(value: string | null) {
  if (typeof window === "undefined") return;
  if (value) window.sessionStorage.setItem(DOCUMENTOS_SITUACAO_PRESET_KEY, value);
  else window.sessionStorage.removeItem(DOCUMENTOS_SITUACAO_PRESET_KEY);
}

export function consumeAsosSituacaoPreset(): string | null {
  if (typeof window === "undefined") return null;
  const v = window.sessionStorage.getItem(ASOS_SITUACAO_PRESET_KEY);
  if (v) window.sessionStorage.removeItem(ASOS_SITUACAO_PRESET_KEY);
  return v;
}

export function setAsosSituacaoPreset(value: string | null) {
  if (typeof window === "undefined") return;
  if (value) window.sessionStorage.setItem(ASOS_SITUACAO_PRESET_KEY, value);
  else window.sessionStorage.removeItem(ASOS_SITUACAO_PRESET_KEY);
}

type LastFormSelections = {
  contabilidadeId?: string;
  empresaId?: string;
};

export function getLastFormSelections(): LastFormSelections {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(LAST_FORM_SELECTIONS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function setLastFormSelections(values: LastFormSelections) {
  if (typeof window === "undefined") return;
  const current = getLastFormSelections();
  window.localStorage.setItem(LAST_FORM_SELECTIONS_KEY, JSON.stringify({ ...current, ...values }));
}

/** Filtro pré-aplicado de contabilidade quando o usuário navega da tela de
 *  contabilidades para a tela de empresas. */
export function consumeContabilidadeFilterPreset(): string | null {
  if (typeof window === "undefined") return null;
  const v = window.sessionStorage.getItem(CONTABILIDADE_FILTER_PRESET_KEY);
  if (v) window.sessionStorage.removeItem(CONTABILIDADE_FILTER_PRESET_KEY);
  return v;
}

export function setContabilidadeFilterPreset(value: string | null) {
  if (typeof window === "undefined") return;
  if (value) window.sessionStorage.setItem(CONTABILIDADE_FILTER_PRESET_KEY, value);
  else window.sessionStorage.removeItem(CONTABILIDADE_FILTER_PRESET_KEY);
}
