/**
 * Catálogo padrão de serviços EngTech.
 * A ordem deste array é a ordem CANÔNICA usada no PDF — independentemente
 * da ordem em que o usuário marca os checkboxes.
 */
export const SERVICOS_PADRAO = [
  "Elaboração do PGR / PGRTR – Programa de Gerenciamento de Riscos.",
  "Elaboração do PCMSO – Programa de Controle Médico de Saúde.",
  "Elaboração do LTCAT – Laudo Técnico das Condições Ambientais de Trabalho.",
  "Elaboração do LTI – Laudo Técnico de Insalubridade (Caso Necessário).",
  "Elaboração do LTP – Laudo Técnico de Periculosidade (Caso Necessário).",
  "Aplicação do Questionário de Avaliação dos Fatores de Riscos Psicossociais.",
  "Elaboração do AEP - Análise Ergonômica Preliminar (Fatores de Riscos Psicossociais).",
  "Agendamento de Exames Ocupacionais: ADMISSIONAL, DEMISSIONAL, PERIÓDICO, RETORNO AO TRABALHO E MUDANÇA DE FUNÇÃO.",
  "Envios dos eventos, S-2210 (CAT) Caso Necessário.",
  "Envios dos eventos, S-2220 (Monitoramento da Saúde do Trabalhador).",
  "Envios dos eventos, S-2240 (Condições Ambientais do Trabalho – Agentes Nocivos).",
  "Realizar Gestão de SST-Saúde e Segurança do Trabalho para o e-Social.",
  "Elaboração de Ordens de Serviço de Segurança do Trabalho.",
  "Orientações a Respeito das Fichas de EPI.",
  "Assistência Durante os 12 Meses a Partir da Assinatura da Proposta.",
] as const;

/** Mapa de ordem para reordenação canônica antes da renderização. */
export const SERVICOS_ORDEM: Record<string, number> = SERVICOS_PADRAO.reduce(
  (acc, nome, idx) => {
    acc[nome] = idx;
    return acc;
  },
  {} as Record<string, number>,
);

/** Ordena uma lista de serviços conforme a ordem canônica. Itens fora do
 *  catálogo (personalizados) vão para o final na ordem em que vieram. */
export function ordenarServicos<T extends { nome: string }>(items: T[]): T[] {
  const padrao = items
    .filter((s) => s.nome in SERVICOS_ORDEM)
    .sort((a, b) => SERVICOS_ORDEM[a.nome] - SERVICOS_ORDEM[b.nome]);
  const custom = items.filter((s) => !(s.nome in SERVICOS_ORDEM));
  return [...padrao, ...custom];
}

/** Constantes fixas (não-editáveis) do profissional responsável. */
export const PROFISSIONAL_FIXO = {
  nome: "Gilson das Neves Souza",
  titulos:
    "Engenheiro de Segurança do Trabalho | Engenheiro Civil | Técnico em Segurança do Trabalho",
  crea: "CREA/BA: 052037174-7",
  // Versão curta para o bloco de assinatura
  tituloAssinatura: "Engº de Segurança do Trabalho",
} as const;

/** Textos fixos (não-editáveis) usados em toda proposta. */
export const TEXTOS_FIXOS = {
  intro:
    "Prezado (a); atendendo a sua solicitação, encaminhamos abaixo nossa proposta para apreciação. Desde já nos colocamos a sua disposição para qualquer esclarecimento que se faça necessário.",
  apresentacao: "A seguinte proposta refere-se à realização dos seguintes serviços:",
  condicoes:
    "Essa proposta tem validade de 07 (sete) dias, contando a partir da entrega da mesma.\nOs serviços serão agendados após o aceite desta Proposta que deverá ser assinada e enviada via e-mail.\nCaso tenha necessidade da emissão de NF-Nota Fiscal, será acrescido no valor total da proposta 6%.",
  responsabilidadesContratante:
    "Fornecer informações necessárias para elaboração dos documentos.\nDisponibilizar suporte e acesso aos sistemas para envios dos eventos de SST para o e-Social.",
  responsabilidadesContratada:
    "Realizar serviços conforme escopo.\nAtender normas internas da contratante.\nSer imparcial na conclusão dos programas/laudos, respeitando as normas técnicas e as leis vigentes.\nApresentar o programa/laudo para o Responsável.\nManter a confidencialidade das informações recebidas e dos laudos elaborados.\nRealizar a elaboração dos documentos conforme as normas e legislação vigentes.",
} as const;

export type ServicoItem = {
  nome: string;
  quantidade: string; // mantido como string para flexibilidade ("12", "12x", "----")
  valor: string; // "----", "R$ 180,00", etc.
};
