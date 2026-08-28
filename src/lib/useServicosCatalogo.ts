import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ServicoCatalogo = {
  id: string;
  nome: string;
  categoria: string | null;
  descricao_curta: string | null;
  objetivo: string | null;
  texto_complementar: string | null;
  valor_padrao: number | null;
  ativo: boolean;
  ordem: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export function useServicosCatalogo(opts?: { onlyActive?: boolean }) {
  return useQuery({
    queryKey: ["servicos_catalogo", opts?.onlyActive ?? false],
    queryFn: async (): Promise<ServicoCatalogo[]> => {
      let q = supabase
        .from("servicos_catalogo" as never)
        .select("*")
        .order("ordem", { ascending: true })
        .order("nome", { ascending: true });
      if (opts?.onlyActive) q = q.eq("ativo", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as ServicoCatalogo[];
    },
    staleTime: 30_000,
  });
}
