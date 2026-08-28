import { supabase } from "@/integrations/supabase/client";

export type AuditModulo =
  | "empresas"
  | "documentos"
  | "asos"
  | "esocial"
  | "tarefas"
  | "usuarios"
  | "auth"
  | "propostas"
  | "ges"
  | "outros";

export interface AuditPayload {
  acao: string;
  modulo: AuditModulo;
  descricao?: string;
  entidade_id?: string | null;
  entidade_tipo?: string | null;
  empresa_id?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Registra uma ação no log de auditoria do sistema. Erros são silenciados
 * para não interromper a operação principal do usuário.
 */
export async function logAudit(payload: AuditPayload): Promise<void> {
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes.user;
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();

    await (supabase as any).from("system_audit_log").insert({
      user_id: user.id,
      user_name: profile?.display_name ?? user.email ?? "—",
      acao: payload.acao,
      modulo: payload.modulo,
      entidade_id: payload.entidade_id ?? null,
      entidade_tipo: payload.entidade_tipo ?? null,
      empresa_id: payload.empresa_id ?? null,
      descricao: payload.descricao ?? null,
      metadata: payload.metadata ?? {},
    });
  } catch (e) {
    // silencioso por design
    console.warn("[audit] falha ao registrar log:", e);
  }
}

/** Cria notificação para um usuário-alvo. */
export async function criarNotificacao(args: {
  user_id: string;
  tipo: string;
  titulo: string;
  mensagem?: string;
  link?: string;
  ref_id?: string;
  ref_tipo?: string;
}): Promise<void> {
  try {
    await (supabase as any).from("notificacoes").insert({
      user_id: args.user_id,
      tipo: args.tipo,
      titulo: args.titulo,
      mensagem: args.mensagem ?? null,
      link: args.link ?? null,
      ref_id: args.ref_id ?? null,
      ref_tipo: args.ref_tipo ?? null,
    });
  } catch (e) {
    console.warn("[notificacao] falha:", e);
  }
}
