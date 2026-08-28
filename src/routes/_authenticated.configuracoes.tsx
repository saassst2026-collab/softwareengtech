import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  HardHat,
  ShieldCheck,
  Siren,
  Stethoscope,
  Upload,
  Loader2,
  ShieldAlert,
  CheckCircle2,
  FileText,
  Moon,
  CalendarClock,
  Wrench,
  History,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

import { PageHero } from "@/components/PageHero";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/lib/useUserRole";
import { useAppSettings, type BrandPreset } from "@/lib/useAppSettings";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SincronizarPanel } from "@/components/SincronizarPanel";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: ConfiguracoesPage,
});

const PRESETS: { id: Exclude<BrandPreset, "custom">; label: string; icon: typeof HardHat }[] = [
  { id: "hardhat", label: "Capacete (padrão EngTech)", icon: HardHat },
  { id: "shield", label: "Escudo de Conformidade", icon: ShieldCheck },
  { id: "siren", label: "Alerta de Segurança", icon: Siren },
  { id: "stethoscope", label: "Saúde Ocupacional", icon: Stethoscope },
];

const QUICK_LINKS = [
  {
    to: "/vencimentos",
    label: "Vencimentos",
    desc: "Acompanhe documentos próximos do vencimento.",
    icon: CalendarClock,
  },
  {
    to: "/servicos-catalogo",
    label: "Catálogo de Serviços",
    desc: "Gerencie os serviços oferecidos.",
    icon: Wrench,
  },
  {
    to: "/importacao",
    label: "Importação de Base",
    desc: "Importe dados de empresas e documentos.",
    icon: Upload,
  },
  {
    to: "/historico",
    label: "Histórico do Sistema",
    desc: "Auditoria e log de ações.",
    icon: History,
  },
] as const;

function ConfiguracoesPage() {
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const { settings } = useAppSettings();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [appName, setAppName] = useState(settings?.app_name ?? "EngTech SST");
  const [preset, setPreset] = useState<BrandPreset>(settings?.brand_preset ?? "hardhat");
  const [customUrl, setCustomUrl] = useState<string | null>(settings?.app_icon_url ?? null);
  const [uploading, setUploading] = useState(false);

  // Propostas
  const propLogoRef = useRef<HTMLInputElement>(null);
  const propAssinRef = useRef<HTMLInputElement>(null);
  const [propLogoUrl, setPropLogoUrl] = useState<string | null>(null);
  const [propAssinUrl, setPropAssinUrl] = useState<string | null>(null);
  const [propWhats, setPropWhats] = useState("");
  const [propEmails, setPropEmails] = useState("");
  const [propAssinW, setPropAssinW] = useState<string>("72");
  const [propAssinH, setPropAssinH] = useState<string>("26");
  const [propAssinOffY, setPropAssinOffY] = useState<string>("0");

  useEffect(() => {
    if (settings) {
      setAppName(settings.app_name);
      setPreset(settings.brand_preset);
      setCustomUrl(settings.app_icon_url);
      setPropLogoUrl(settings.proposta_logo_url ?? null);
      setPropAssinUrl(settings.proposta_assinatura_url ?? null);
      setPropWhats(settings.proposta_whatsapp ?? "");
      setPropEmails(settings.proposta_emails ?? "");
      setPropAssinW(
        settings.proposta_assinatura_largura_mm != null
          ? String(settings.proposta_assinatura_largura_mm)
          : "72",
      );
      setPropAssinH(
        settings.proposta_assinatura_altura_max_mm != null
          ? String(settings.proposta_assinatura_altura_max_mm)
          : "26",
      );
      setPropAssinOffY(
        settings.proposta_assinatura_offset_y_mm != null
          ? String(settings.proposta_assinatura_offset_y_mm)
          : "0",
      );
    }
  }, [settings]);

  const save = useMutation({
    mutationFn: async () => {
      // upsert do singleton
      const { data: existing } = await supabase
        .from("app_settings")
        .select("id")
        .limit(1)
        .maybeSingle();
      const propPayload = {
        proposta_logo_url: propLogoUrl,
        proposta_assinatura_url: propAssinUrl,
        proposta_whatsapp: propWhats || null,
        proposta_emails: propEmails || null,
        proposta_assinatura_largura_mm: parseFloat(propAssinW.replace(",", ".")) || null,
        proposta_assinatura_altura_max_mm: parseFloat(propAssinH.replace(",", ".")) || null,
        proposta_assinatura_offset_y_mm:
          propAssinOffY === "" ? null : parseFloat(propAssinOffY.replace(",", ".")) || 0,
      };
      if (existing) {
        const { error } = await supabase
          .from("app_settings")
          .update({
            app_name: appName,
            brand_preset: preset,
            app_icon_url: customUrl,
            ...propPayload,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("app_settings").insert({
          app_name: appName,
          brand_preset: preset,
          app_icon_url: customUrl,
          ...propPayload,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Configurações salvas. A logo será atualizada para todos os usuários.");
      qc.invalidateQueries({ queryKey: ["app-settings"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  const onFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Arquivo excede 2 MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `logo/app-icon-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("app-assets")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("app-assets").getPublicUrl(path);
      setCustomUrl(pub.publicUrl);
      setPreset("custom");
      toast.success("Logo enviada. Clique em Salvar para aplicar.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no upload");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onPropAssetUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    kind: "logo" | "assinatura",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Arquivo excede 3 MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${kind}/default-${kind}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("propostas-assets")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("propostas-assets").getPublicUrl(path);
      if (kind === "logo") setPropLogoUrl(pub.publicUrl);
      else setPropAssinUrl(pub.publicUrl);
      toast.success("Imagem enviada. Clique em Salvar para aplicar.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no upload");
    } finally {
      setUploading(false);
      e.target.value = "";
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
        <PageHero title="Configurações" subtitle="Área restrita ao Administrador Principal." />
        <SincronizarPanel />
        <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-elegant">
          <div className="mb-3 flex items-center gap-2">
            <Moon className="h-4 w-4 text-primary" />
            <h2 className="text-base font-bold text-foreground">Aparência</h2>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            Escolha entre tema claro, escuro ou seguir a preferência do sistema.
          </p>
          <ThemeToggle />
        </section>
        <section className="rounded-3xl border border-warning/40 bg-warning/10 p-8 text-center">
          <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-warning-foreground" />
          <p className="text-sm font-bold text-warning-foreground">Acesso restrito</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Apenas o Administrador Principal pode personalizar a identidade visual do sistema.
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
        title="Configurações da plataforma"
        subtitle="Personalize a identidade visual exibida em toda a equipe. As alterações refletem imediatamente para todos os usuários."
      />

      <SincronizarPanel />

      <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-elegant">
        <h2 className="mb-1 text-base font-bold text-foreground">Módulos do sistema</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Acesso rápido às áreas operacionais e administrativas do EngTech SST.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_LINKS.map(({ to, label, desc, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="group flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/50 hover:shadow-glow"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand text-primary-foreground shadow-glow">
                  <Icon className="h-5 w-5" />
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
              </div>
              <p className="text-sm font-bold text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-elegant">
        <div className="mb-3 flex items-center gap-2">
          <Moon className="h-4 w-4 text-primary" />
          <h2 className="text-base font-bold text-foreground">Aparência (Modo Noturno)</h2>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Alterne entre tema claro, escuro ou siga a preferência do sistema. A escolha fica salva no
          seu dispositivo.
        </p>
        <ThemeToggle />
      </section>

      <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-elegant">
        <h2 className="mb-4 text-base font-bold text-foreground">Nome do sistema</h2>
        <input
          value={appName}
          onChange={(e) => setAppName(e.target.value)}
          maxLength={50}
          className="w-full max-w-md rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          placeholder="EngTech SST"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Aparece no menu lateral e na tela de login.
        </p>
      </section>

      <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-elegant">
        <h2 className="mb-1 text-base font-bold text-foreground">Ícone do app</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Escolha um ícone da galeria SST ou envie a logo oficial da EngTech.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PRESETS.map((p) => {
            const Icon = p.icon;
            const active = preset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPreset(p.id)}
                className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition ${
                  active
                    ? "border-primary bg-primary/10 shadow-glow"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-brand text-primary-foreground shadow-glow">
                  <Icon className="h-7 w-7" />
                </div>
                <span className="text-xs font-bold text-foreground">{p.label}</span>
                {active && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary">
                    <CheckCircle2 className="h-3 w-3" /> selecionado
                  </span>
                )}
              </button>
            );
          })}

          {/* Custom */}
          <div
            className={`flex flex-col items-center gap-2 rounded-2xl border p-4 ${
              preset === "custom"
                ? "border-primary bg-primary/10 shadow-glow"
                : "border-dashed border-border bg-card"
            }`}
          >
            {customUrl ? (
              <img
                src={customUrl}
                alt="Logo customizada"
                className="h-14 w-14 rounded-xl border border-border object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Upload className="h-6 w-6" />
              </div>
            )}
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-info/10 px-3 py-1.5 text-[11px] font-bold text-info hover:bg-info/20">
              {uploading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Upload className="h-3 w-3" />
              )}
              {customUrl ? "Trocar logo" : "Enviar logo"}
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                className="hidden"
                onChange={onFileUpload}
                disabled={uploading}
              />
            </label>
            {customUrl && (
              <button
                onClick={() => setPreset("custom")}
                className={`text-[10px] font-bold ${
                  preset === "custom" ? "text-primary" : "text-muted-foreground hover:text-primary"
                }`}
              >
                {preset === "custom" ? "✓ usando logo enviada" : "usar logo enviada"}
              </button>
            )}
          </div>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Formatos aceitos: PNG, JPG, SVG, WEBP · até 2 MB.
        </p>
      </section>

      {/* ============== Propostas Comerciais ============== */}
      <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-elegant">
        <div className="mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold text-foreground">Propostas comerciais</h2>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Configurações padrão usadas ao criar novas propostas. Cada proposta pode ter logo e
          assinatura próprios.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-bold text-foreground">Logo padrão</p>
            {propLogoUrl ? (
              <img
                src={propLogoUrl}
                alt="Logo padrão"
                className="mb-2 h-20 w-auto rounded-lg border border-border bg-white p-1"
              />
            ) : (
              <div className="mb-2 flex h-20 w-32 items-center justify-center rounded-lg border border-dashed border-border bg-muted text-muted-foreground">
                <Upload className="h-5 w-5" />
              </div>
            )}
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-info/10 px-3 py-1.5 text-xs font-bold text-info hover:bg-info/20">
              {uploading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Upload className="h-3 w-3" />
              )}
              {propLogoUrl ? "Trocar logo" : "Enviar logo"}
              <input
                ref={propLogoRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => onPropAssetUpload(e, "logo")}
              />
            </label>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold text-foreground">Assinatura digital padrão</p>
            {propAssinUrl ? (
              <img
                src={propAssinUrl}
                alt="Assinatura padrão"
                className="mb-2 h-20 w-auto rounded-lg border border-border bg-white p-1"
              />
            ) : (
              <div className="mb-2 flex h-20 w-32 items-center justify-center rounded-lg border border-dashed border-border bg-muted text-muted-foreground">
                <Upload className="h-5 w-5" />
              </div>
            )}
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-info/10 px-3 py-1.5 text-xs font-bold text-info hover:bg-info/20">
              {uploading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Upload className="h-3 w-3" />
              )}
              {propAssinUrl ? "Trocar assinatura" : "Enviar assinatura"}
              <input
                ref={propAssinRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => onPropAssetUpload(e, "assinatura")}
              />
            </label>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <label className="text-[11px] font-bold text-foreground">
                Largura (mm)
                <input
                  type="number"
                  min={10}
                  max={120}
                  step={1}
                  value={propAssinW}
                  onChange={(e) => setPropAssinW(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-2 py-1.5 text-xs font-normal"
                />
              </label>
              <label className="text-[11px] font-bold text-foreground">
                Altura máx. (mm)
                <input
                  type="number"
                  min={6}
                  max={60}
                  step={1}
                  value={propAssinH}
                  onChange={(e) => setPropAssinH(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-2 py-1.5 text-xs font-normal"
                />
              </label>
              <label className="text-[11px] font-bold text-foreground">
                Deslocamento Y (mm)
                <input
                  type="number"
                  step={0.5}
                  value={propAssinOffY}
                  onChange={(e) => setPropAssinOffY(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-2 py-1.5 text-xs font-normal"
                />
              </label>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Valores positivos em “Deslocamento Y” movem a assinatura para baixo.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p className="font-bold text-foreground">Profissional responsável (fixo)</p>
            <p className="mt-1">Gilson das Neves Souza</p>
            <p>
              Engenheiro de Segurança do Trabalho | Engenheiro Civil | Técnico em Segurança do
              Trabalho
            </p>
            <p>CREA/BA: 052037174-7</p>
          </div>
          <label className="text-xs font-bold text-foreground">
            WhatsApp / Telefone
            <input
              value={propWhats}
              onChange={(e) => setPropWhats(e.target.value)}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-normal"
            />
          </label>
          <label className="text-xs font-bold text-foreground">
            E-mails (separados por /)
            <input
              value={propEmails}
              onChange={(e) => setPropEmails(e.target.value)}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-normal"
            />
          </label>
          <div className="sm:col-span-2 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p className="font-bold text-foreground">Textos da proposta (fixos)</p>
            <p className="mt-1">
              O texto introdutório, apresentação, condições e responsabilidades de
              contratante/contratada são padronizados e gerados automaticamente em todas as
              propostas.
            </p>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-6 py-3 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-60"
        >
          {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Salvar configurações
        </button>
      </div>
    </div>
  );
}
