import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  ShieldAlert,
  ShieldCheck,
  HardHat,
  UserCog,
  Crown,
  ShieldX,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { PageHero } from "@/components/PageHero";
import { useUserRole } from "@/lib/useUserRole";
import { useAuth } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReportButton } from "@/components/ReportButton";
import type { RelatorioOpcao } from "@/components/RelatorioDialog";

export const Route = createFileRoute("/_authenticated/usuarios")({
  component: UsuariosPage,
});

const ROLE_INFO: Record<string, { label: string; cls: string; icon: typeof ShieldCheck }> = {
  admin: { label: "Administrador Principal", cls: "bg-primary/15 text-primary", icon: Crown },
  engenheiro: { label: "Engenheiro de Segurança", cls: "bg-info/15 text-info", icon: UserCog },
  tecnico: { label: "Técnico de Segurança", cls: "bg-success/15 text-success", icon: HardHat },
  viewer: { label: "Visualização", cls: "bg-muted text-muted-foreground", icon: Users },
};

type UserRow = {
  id: string;
  display_name: string | null;
  cargo: string | null;
  created_at: string;
  role: string;
  isAdmin: boolean;
};

function UsuariosPage() {
  const { isAdmin, isLoading } = useUserRole();
  const { user: currentUser } = useAuth();
  const qc = useQueryClient();
  const [confirmAction, setConfirmAction] = useState<{
    user: UserRow;
    action: "promote" | "revoke" | "set_role" | "delete";
    newRole?: "engenheiro" | "tecnico";
  } | null>(null);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editingName, setEditingName] = useState("");

  const { data: users } = useQuery({
    queryKey: ["usuarios-app"],
    enabled: isAdmin,
    queryFn: async (): Promise<UserRow[]> => {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;
      const rolesByUser = new Map<string, string[]>();
      for (const r of rolesRes.data ?? []) {
        const list = rolesByUser.get(r.user_id) ?? [];
        list.push(r.role);
        rolesByUser.set(r.user_id, list);
      }
      const order = ["admin", "engenheiro", "tecnico", "viewer"];
      return (profilesRes.data ?? []).map((p) => {
        const roles = rolesByUser.get(p.id) ?? ["viewer"];
        const principal = roles.sort((a, b) => order.indexOf(a) - order.indexOf(b))[0];
        return {
          id: p.id,
          display_name: p.display_name,
          cargo: p.cargo,
          created_at: p.created_at,
          role: principal,
          isAdmin: roles.includes("admin"),
        };
      });
    },
  });

  const promote = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc("promote_to_admin", { target_user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Usuário promovido a Administrador Principal.");
      qc.invalidateQueries({ queryKey: ["usuarios-app"] });
      setConfirmAction(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao promover"),
  });

  const revoke = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc("revoke_admin", { target_user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Permissão de Administrador removida.");
      qc.invalidateQueries({ queryKey: ["usuarios-app"] });
      setConfirmAction(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao revogar"),
  });

  const setRole = useMutation({
    mutationFn: async (vars: { userId: string; role: "engenheiro" | "tecnico" }) => {
      const { error } = await supabase.rpc("set_user_profile_role", {
        target_user_id: vars.userId,
        new_role: vars.role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Perfil profissional atualizado.");
      qc.invalidateQueries({ queryKey: ["usuarios-app"] });
      setConfirmAction(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao alterar perfil"),
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc(
        "delete_user_account" as never,
        { target_user_id: userId } as never,
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Usuário excluído da plataforma.");
      qc.invalidateQueries({ queryKey: ["usuarios-app"] });
      setConfirmAction(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao excluir usuário"),
  });

  const updateUserName = useMutation({
    mutationFn: async () => {
      if (!editingUser) return;
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: editingName.trim() || null })
        .eq("id", editingUser.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Usuário atualizado com sucesso.");
      qc.invalidateQueries({ queryKey: ["usuarios-app"] });
      setEditingUser(null);
      setEditingName("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao atualizar usuário"),
  });

  if (isLoading) return null;

  if (!isAdmin) {
    return (
      <div className="flex flex-col gap-6">
        <PageHero
          title="Usuários da plataforma"
          subtitle="Gestão da equipe técnica de SST. Acesso restrito ao Administrador Principal."
        />
        <section className="rounded-3xl border border-warning/40 bg-warning/10 p-8 text-center">
          <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-warning-foreground" />
          <p className="text-sm font-bold text-warning-foreground">Acesso restrito</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Apenas o Administrador Principal pode visualizar e gerenciar usuários da plataforma.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title="Usuários da plataforma"
        subtitle="Equipe técnica com acesso ao sistema. O Administrador Principal define perfis profissionais e pode eleger novos administradores."
        actions={
          <ReportButton modulo="usuarios" getOpcoes={() => buildUsuariosOpcoes(users ?? [])} />
        }
      />

      <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-elegant">
        {!users || users.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
            Nenhum usuário cadastrado.
          </p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="pb-3 pr-3">Nome</th>
                    <th className="pb-3 pr-3">Cargo informado</th>
                    <th className="pb-3 pr-3">Perfil de acesso</th>
                    <th className="pb-3 pr-3">Cadastrado em</th>
                    <th className="pb-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const info = ROLE_INFO[u.role] ?? ROLE_INFO.viewer;
                    const Icon = info.icon;
                    const isMe = u.id === currentUser?.id;
                    return (
                      <tr key={u.id} className="border-t border-border/60">
                        <td className="py-3 pr-3 font-semibold text-foreground">
                          {u.display_name ?? "—"}
                          {isMe && (
                            <span className="ml-2 rounded-full bg-info/15 px-2 py-0.5 text-[10px] font-bold text-info">
                              você
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-3 text-muted-foreground">{u.cargo ?? "—"}</td>
                        <td className="py-3 pr-3">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${info.cls}`}
                          >
                            <Icon className="h-3 w-3" />
                            {info.label}
                          </span>
                        </td>
                        <td className="py-3 pr-3 text-xs text-muted-foreground">
                          {format(new Date(u.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </td>
                        <td className="py-3">
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              onClick={() => {
                                setEditingUser(u);
                                setEditingName(u.display_name ?? "");
                              }}
                              className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-primary/20"
                            >
                              <Pencil className="h-3 w-3" /> Editar
                            </button>
                            {!u.isAdmin && (
                              <button
                                onClick={() => setConfirmAction({ user: u, action: "promote" })}
                                className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-primary/20"
                              >
                                <Crown className="h-3 w-3" /> Promover a Admin
                              </button>
                            )}
                            {u.isAdmin && !isMe && (
                              <button
                                onClick={() => setConfirmAction({ user: u, action: "revoke" })}
                                className="inline-flex items-center gap-1 rounded-lg bg-destructive/10 px-2.5 py-1 text-[11px] font-bold text-destructive hover:bg-destructive/20"
                              >
                                <ShieldX className="h-3 w-3" /> Revogar Admin
                              </button>
                            )}
                            {!isMe && u.role !== "engenheiro" && (
                              <button
                                onClick={() =>
                                  setConfirmAction({
                                    user: u,
                                    action: "set_role",
                                    newRole: "engenheiro",
                                  })
                                }
                                className="rounded-lg bg-info/10 px-2.5 py-1 text-[11px] font-bold text-info hover:bg-info/20"
                              >
                                Eng. Segurança
                              </button>
                            )}
                            {!isMe && u.role !== "tecnico" && (
                              <button
                                onClick={() =>
                                  setConfirmAction({
                                    user: u,
                                    action: "set_role",
                                    newRole: "tecnico",
                                  })
                                }
                                className="rounded-lg bg-success/10 px-2.5 py-1 text-[11px] font-bold text-success hover:bg-success/20"
                              >
                                Téc. Segurança
                              </button>
                            )}
                            {!isMe && (
                              <button
                                onClick={() => setConfirmAction({ user: u, action: "delete" })}
                                className="inline-flex items-center gap-1 rounded-lg bg-destructive/10 px-2.5 py-1 text-[11px] font-bold text-destructive hover:bg-destructive/20"
                              >
                                <Trash2 className="h-3 w-3" /> Excluir
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile card view */}
            <div className="flex flex-col gap-3 lg:hidden">
              {users.map((u) => {
                const info = ROLE_INFO[u.role] ?? ROLE_INFO.viewer;
                const Icon = info.icon;
                const isMe = u.id === currentUser?.id;
                return (
                  <div key={u.id} className="rounded-2xl border border-border/60 bg-card p-3">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">
                          {u.display_name ?? "—"}
                          {isMe && (
                            <span className="ml-2 rounded-full bg-info/15 px-2 py-0.5 text-[10px] font-bold text-info">
                              você
                            </span>
                          )}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {u.cargo ?? "—"}
                        </p>
                      </div>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${info.cls}`}
                      >
                        <Icon className="h-3 w-3" />
                        {info.label}
                      </span>
                    </div>
                    <p className="mb-2 text-[11px] text-muted-foreground">
                      Cadastrado em {format(new Date(u.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => {
                          setEditingUser(u);
                          setEditingName(u.display_name ?? "");
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-primary/20"
                      >
                        <Pencil className="h-3 w-3" /> Editar
                      </button>
                      {!u.isAdmin && (
                        <button
                          onClick={() => setConfirmAction({ user: u, action: "promote" })}
                          className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-primary/20"
                        >
                          <Crown className="h-3 w-3" /> Promover Admin
                        </button>
                      )}
                      {u.isAdmin && !isMe && (
                        <button
                          onClick={() => setConfirmAction({ user: u, action: "revoke" })}
                          className="inline-flex items-center gap-1 rounded-lg bg-destructive/10 px-2.5 py-1 text-[11px] font-bold text-destructive hover:bg-destructive/20"
                        >
                          <ShieldX className="h-3 w-3" /> Revogar Admin
                        </button>
                      )}
                      {!isMe && u.role !== "engenheiro" && (
                        <button
                          onClick={() =>
                            setConfirmAction({ user: u, action: "set_role", newRole: "engenheiro" })
                          }
                          className="rounded-lg bg-info/10 px-2.5 py-1 text-[11px] font-bold text-info hover:bg-info/20"
                        >
                          Eng. Segurança
                        </button>
                      )}
                      {!isMe && u.role !== "tecnico" && (
                        <button
                          onClick={() =>
                            setConfirmAction({ user: u, action: "set_role", newRole: "tecnico" })
                          }
                          className="rounded-lg bg-success/10 px-2.5 py-1 text-[11px] font-bold text-success hover:bg-success/20"
                        >
                          Téc. Segurança
                        </button>
                      )}
                      {!isMe && (
                        <button
                          onClick={() => setConfirmAction({ user: u, action: "delete" })}
                          className="inline-flex items-center gap-1 rounded-lg bg-destructive/10 px-2.5 py-1 text-[11px] font-bold text-destructive hover:bg-destructive/20"
                        >
                          <Trash2 className="h-3 w-3" /> Excluir
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* Modal confirmação */}
      <Dialog open={Boolean(editingUser)} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
            <DialogDescription>Atualize o nome exibido no sistema.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              updateUserName.mutate();
            }}
            className="grid gap-5"
          >
            <label className="grid gap-1.5 text-sm font-bold text-foreground">
              Nome do usuário
              <Input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                placeholder="Nome completo"
              />
            </label>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={updateUserName.isPending}
                className="rounded-xl bg-gradient-brand text-primary-foreground shadow-glow"
              >
                {updateUserName.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar alterações
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {confirmAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setConfirmAction(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-elegant"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-foreground">
              {confirmAction.action === "promote" && "Promover a Administrador Principal"}
              {confirmAction.action === "revoke" && "Revogar Administrador Principal"}
              {confirmAction.action === "delete" && "Excluir usuário da plataforma"}
              {confirmAction.action === "set_role" &&
                `Alterar perfil para ${
                  confirmAction.newRole === "engenheiro"
                    ? "Engenheiro de Segurança"
                    : "Técnico de Segurança"
                }`}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Usuário: <strong>{confirmAction.user.display_name ?? "—"}</strong>
            </p>
            {confirmAction.action === "promote" && (
              <p className="mt-3 rounded-xl bg-warning/10 p-3 text-xs text-warning-foreground">
                Este usuário poderá importar planilhas, substituir a base ativa, gerenciar usuários
                e eleger outros administradores.
              </p>
            )}
            {confirmAction.action === "revoke" && (
              <p className="mt-3 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
                O usuário perderá acesso à importação e gestão da plataforma. Deve restar ao menos 1
                administrador no sistema.
              </p>
            )}
            {confirmAction.action === "delete" && (
              <p className="mt-3 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
                Esta ação é <strong>irreversível</strong>. O usuário perderá acesso imediato à
                plataforma e seu cadastro será removido. Caso ele seja Administrador, é necessário
                restar ao menos 1 administrador no sistema.
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmAction(null)}
                className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (confirmAction.action === "promote") promote.mutate(confirmAction.user.id);
                  else if (confirmAction.action === "revoke") revoke.mutate(confirmAction.user.id);
                  else if (confirmAction.action === "delete")
                    deleteUser.mutate(confirmAction.user.id);
                  else if (confirmAction.action === "set_role" && confirmAction.newRole)
                    setRole.mutate({ userId: confirmAction.user.id, role: confirmAction.newRole });
                }}
                disabled={
                  promote.isPending || revoke.isPending || setRole.isPending || deleteUser.isPending
                }
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-50"
              >
                {(promote.isPending ||
                  revoke.isPending ||
                  setRole.isPending ||
                  deleteUser.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function buildUsuariosOpcoes(users: UserRow[]): RelatorioOpcao[] {
  const colunas = [
    { header: "Nome" },
    { header: "Cargo" },
    { header: "Perfil de acesso" },
    { header: "Cadastrado em" },
  ];
  const toLinha = (u: UserRow): Array<string | number> => [
    u.display_name ?? "—",
    u.cargo ?? "—",
    ROLE_INFO[u.role]?.label ?? u.role,
    format(new Date(u.created_at), "dd/MM/yyyy", { locale: ptBR }),
  ];
  const make = (id: string, label: string, list: UserRow[]): RelatorioOpcao => ({
    id,
    label,
    build: () => ({
      titulo: label,
      colunas,
      linhas: list.map(toLinha),
      totalizadores: [{ label: "Total de usuários", value: String(list.length) }],
    }),
  });
  return [
    make("todos", "Todos os usuários", users),
    make(
      "admins",
      "Administradores",
      users.filter((u) => u.isAdmin),
    ),
    make(
      "engenheiros",
      "Engenheiros de Segurança",
      users.filter((u) => u.role === "engenheiro"),
    ),
    make(
      "tecnicos",
      "Técnicos de Segurança",
      users.filter((u) => u.role === "tecnico"),
    ),
  ];
}
