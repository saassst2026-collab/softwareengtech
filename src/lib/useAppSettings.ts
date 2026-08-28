import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BrandPreset = "hardhat" | "shield" | "siren" | "stethoscope" | "custom";

export type AppSettings = {
  app_name: string;
  app_icon_url: string | null;
  brand_preset: BrandPreset;
  updated_at: string;
  // Propostas
  proposta_logo_url?: string | null;
  proposta_assinatura_url?: string | null;
  proposta_profissional_nome?: string | null;
  proposta_profissional_titulos?: string | null;
  proposta_profissional_crea?: string | null;
  proposta_whatsapp?: string | null;
  proposta_emails?: string | null;
  proposta_texto_intro?: string | null;
  proposta_texto_apresentacao?: string | null;
  proposta_responsabilidades_contratante?: string | null;
  proposta_responsabilidades_contratada?: string | null;
  proposta_condicoes?: string | null;
  proposta_assinatura_largura_mm?: number | null;
  proposta_assinatura_altura_max_mm?: number | null;
  proposta_assinatura_offset_y_mm?: number | null;
};

export function useAppSettings() {
  const { data, isLoading } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async (): Promise<AppSettings> => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? {
        app_name: "EngTech SST",
        app_icon_url: null,
        brand_preset: "hardhat",
        updated_at: new Date().toISOString(),
      }) as AppSettings;
    },
    staleTime: 60_000,
  });
  return { settings: data, isLoading };
}
