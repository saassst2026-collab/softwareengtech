import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2, HardHat, UserCog, Crown } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { EngTechLogo } from "@/components/EngTechLogo";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

const CARGOS = [
  { value: "Técnico de Segurança do Trabalho", label: "Técnico de Segurança", icon: HardHat },
  { value: "Engenheiro de Segurança do Trabalho", label: "Engenheiro de Segurança", icon: UserCog },
];

function LoginPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [cargo, setCargo] = useState(CARGOS[0].value);
  const [busy, setBusy] = useState(false);
  const [isFirstAccount, setIsFirstAccount] = useState<boolean | null>(null);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  useEffect(() => {
    // Verifica se já existem administradores ou usuários cadastrados no sistema
    let mounted = true;
    async function checkFirstAccount() {
      try {
        const { count, error } = await supabase
          .from("user_roles")
          .select("id", { count: "exact", head: true })
          .eq("role", "admin");

        if (!error && mounted) {
          setIsFirstAccount(count === 0 || count === null);
        }
      } catch {
        if (mounted) setIsFirstAccount(true);
      }
    }
    checkFirstAccount();
    return () => {
      mounted = false;
    };
  }, [mode]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data: signUpData, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              display_name: name || email.split("@")[0],
              cargo,
            },
          },
        });
        if (error) throw error;

        // Se for a primeira conta criada, garante atribuição do papel de Administrador Principal
        const createdUserId = signUpData?.user?.id;
        if (createdUserId) {
          try {
            const { count: adminCount } = await supabase
              .from("user_roles")
              .select("id", { count: "exact", head: true })
              .eq("role", "admin");

            if (adminCount === 0 || adminCount === null) {
              await supabase.from("user_roles").insert({
                user_id: createdUserId,
                role: "admin",
              });
              toast.success("Conta de Administrador Principal criada com sucesso!");
            } else {
              toast.success("Conta criada! Você já está logado.");
            }
          } catch {
            toast.success("Conta criada! Você já está logado.");
          }
        } else {
          toast.success("Conta criada! Você já está logado.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
      }
      navigate({ to: "/dashboard" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro inesperado";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <EngTechLogo size={64} />
          <div>
            <h1 className="text-2xl font-extrabold text-primary">EngTech SST</h1>
            <p className="text-sm text-info">
              Plataforma de Gestão em Saúde e Segurança do Trabalho
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-border/60 bg-card p-7 shadow-elegant">
          <div className="mb-5 flex rounded-xl bg-muted p-1">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold transition ${
                mode === "signin" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold transition ${
                mode === "signup" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
              }`}
            >
              Criar conta
            </button>
          </div>

          {mode === "signup" && isFirstAccount && (
            <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-primary/30 bg-primary/10 p-3 text-xs text-primary">
              <Crown className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <strong className="font-bold">Primeira conta do sistema:</strong> você será
                automaticamente configurado como <strong>Administrador Principal</strong> com acesso
                total a todos os recursos.
              </div>
            </div>
          )}

          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            {mode === "signup" && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Nome completo
                  </label>
                  <input
                    className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Perfil profissional
                  </label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {CARGOS.map(({ value, label, icon: Icon }) => (
                      <button
                        type="button"
                        key={value}
                        onClick={() => setCargo(value)}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition ${
                          cargo === value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-input bg-background text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
                E-mail
              </label>
              <input
                type="email"
                autoComplete="email"
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Senha
              </label>
              <input
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-brand px-5 py-3 text-sm font-bold text-primary-foreground shadow-glow transition hover:opacity-95 disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Entrar" : "Criar conta"}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            Acesso restrito a consultores e equipe técnica de SST.
          </p>
        </div>

        <Link
          to="/dashboard"
          className="mt-4 block text-center text-xs text-muted-foreground hover:text-primary"
        >
          ← Voltar ao painel
        </Link>
      </div>
    </div>
  );
}

