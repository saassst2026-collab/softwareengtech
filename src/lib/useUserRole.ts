import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type AppRole = "admin" | "engenheiro" | "tecnico" | "viewer";

export function useUserRole() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["user-role", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<AppRole | null> => {
      if (!user?.id) return null;

      // 1. Consulta os papéis cadastrados para o usuário atual
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (!error && data && data.length > 0) {
        const roles = data.map((r) => r.role as AppRole);
        if (roles.includes("admin")) return "admin";
        if (roles.includes("engenheiro")) return "engenheiro";
        if (roles.includes("tecnico")) return "tecnico";
        return roles[0] ?? "viewer";
      }

      // 2. Se o usuário ainda não possui papel atribuído, verifica se há algum admin no sistema
      try {
        const { count: adminCount } = await supabase
          .from("user_roles")
          .select("id", { count: "exact", head: true })
          .eq("role", "admin");

        // Se for a primeira conta ou não houver nenhum admin no sistema, define como administrador principal
        if (adminCount === 0 || adminCount === null) {
          await supabase.from("user_roles").insert({
            user_id: user.id,
            role: "admin",
          });
          return "admin";
        }
      } catch (err) {
        console.warn("[useUserRole] Erro ao verificar ou atribuir administrador principal:", err);
      }

      return "viewer";
    },
  });
  return { role: data ?? null, isAdmin: data === "admin", isLoading };
}

