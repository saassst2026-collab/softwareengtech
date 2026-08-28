import { useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Building2,
  Calculator,
  FileCheck2,
  FileBadge,
  LogOut,
  ShieldCheck,
  Users,
  Settings,
  FileText,
  ClipboardList,
  HardHat,
  Upload,
  Layers3,
  Briefcase,
  UsersRound,
  BadgeCheck,
  ShieldPlus,
  AlertTriangle,
  FolderPlus,
  ChevronDown,
  Wrench,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useUserRole } from "@/lib/useUserRole";
import engtechLogo from "@/assets/engtech-logo.jpeg.asset.json";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", label: "Dashboard SST", icon: LayoutDashboard, adminOnly: false },
  { to: "/empresas", label: "Empresas Atendidas", icon: Building2, adminOnly: false },
  { to: "/contabilidades", label: "Contabilidades", icon: Calculator, adminOnly: false },
  { to: "/documentos", label: "Documentos SST", icon: FileCheck2, adminOnly: false },
  { to: "/esocial", label: "ASO / eSocial", icon: FileBadge, adminOnly: false },
  { to: "/propostas", label: "Propostas", icon: FileText, adminOnly: false },
  { to: "/usuarios", label: "Usuários", icon: Users, adminOnly: true },
  { to: "/configuracoes", label: "Configurações", icon: Settings, adminOnly: true },
  { to: "/importacao-cadastros", label: "Importação de Cadastros", icon: Upload, adminOnly: true },
] as const;

const cadastroItems = [
  { to: "/trabalhadores", label: "Trabalhadores", icon: HardHat },
  { to: "/setores", label: "Setores", icon: Layers3 },
  { to: "/funcoes", label: "Funções", icon: Briefcase },
  { to: "/ges", label: "GES", icon: UsersRound },
  { to: "/riscos-ocupacionais", label: "Riscos Ocupacionais", icon: AlertTriangle },
  { to: "/equipamentos", label: "Equipamentos", icon: Wrench },
  { to: "/profissionais", label: "Profissionais", icon: BadgeCheck },
  { to: "/medidas-controle", label: "Medidas de Controle", icon: ShieldPlus },
  { to: "/ordens-servico", label: "Ordens de Serviço", icon: ClipboardList },
] as const;

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { role, isAdmin } = useUserRole();
  const navigate = useNavigate();
  const cadastroAtivo = cadastroItems.some(
    (i) => location.pathname === i.to || location.pathname.startsWith(i.to + "/"),
  );
  const [cadastroAberto, setCadastroAberto] = useState(cadastroAtivo);

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  const visibleItems = navItems.filter((i) => !i.adminOnly || isAdmin);

  const cargoLabel = isAdmin
    ? "Administrador Principal"
    : role === "engenheiro"
      ? "Engenheiro de Segurança"
      : role === "tecnico"
        ? "Técnico de Segurança"
        : "Visualização";

  return (
    <aside className="flex h-full w-[280px] flex-col gap-6 border-r border-sidebar-border bg-sidebar p-5">
      <div className="rounded-2xl bg-white p-3">
        <img
          src={engtechLogo.url}
          alt="EngTech - Serviços e Consultorias em Saúde e Segurança do Trabalho"
          className="h-auto w-full object-contain"
        />
      </div>

      <nav className="flex flex-col gap-1.5">
        {visibleItems.map(({ to, label, icon: Icon }, idx) => {
          const active = location.pathname === to || location.pathname.startsWith(to + "/");
          return (
            <div key={to} className="contents">
              <Link
                to={to}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all",
                  active
                    ? "bg-gradient-hero text-primary shadow-elegant"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
              {idx === 1 && (
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCadastroAberto((v) => !v)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all",
                      cadastroAtivo && !cadastroAberto
                        ? "bg-gradient-hero text-primary shadow-elegant"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                    aria-expanded={cadastroAberto}
                  >
                    <FolderPlus className="h-4 w-4" />
                    Cadastro
                    <ChevronDown
                      className={cn(
                        "ml-auto h-4 w-4 transition-transform",
                        cadastroAberto && "rotate-180",
                      )}
                    />
                  </button>
                  {cadastroAberto && (
                    <div className="ml-3 flex flex-col gap-1 border-l border-sidebar-border pl-2">
                      {cadastroItems.map(({ to: sub, label: subLabel, icon: SubIcon }) => {
                        const subActive =
                          location.pathname === sub || location.pathname.startsWith(sub + "/");
                        return (
                          <Link
                            key={sub}
                            to={sub}
                            onClick={onNavigate}
                            className={cn(
                              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition-all",
                              subActive
                                ? "bg-gradient-hero text-primary shadow-elegant"
                                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                            )}
                          >
                            <SubIcon className="h-3.5 w-3.5" />
                            {subLabel}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="mt-auto rounded-2xl bg-secondary/60 p-4 text-sm text-secondary-foreground">
        <div className="mb-1 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <p className="font-semibold leading-tight">Conformidade SST</p>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Acompanhe vencimentos de PGR, PCMSO, LTCAT e eventos do eSocial em tempo real.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-sidebar-border bg-card p-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-foreground">{user?.email ?? "—"}</p>
          <p className="text-[11px] text-muted-foreground">{cargoLabel}</p>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-lg p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
          aria-label="Sair"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
