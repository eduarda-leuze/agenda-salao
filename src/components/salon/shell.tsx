import { Link, Outlet, useNavigate, useRouter, useLocation } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useMe } from "@/lib/me";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Scissors,
  UserRound,
  Wallet,
  Settings,
  LogOut,
  BadgePercent,
  ChevronRight,
  Link2,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { BrandLogo, useBrandName } from "./brand";
const links = [
  ["/painel", "Visão geral", LayoutDashboard],
  ["/agenda", "Agenda", CalendarDays],
  ["/clientes", "Clientes", Users],
  ["/servicos", "Serviços", Scissors],
  ["/profissionais", "Profissionais", UserRound],
  ["/financeiro", "Financeiro", Wallet],
  ["/comissoes", "Comissões", BadgePercent],
  ["/whatsapp", "WhatsApp", MessageCircle],
  ["/configuracoes", "Configurações", Settings],
] as const;
export function SalonShell() {
  const { data: me } = useMe();
  const pathname = useLocation().pathname;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const router = useRouter();
  const brandName = useBrandName();
  const visible = links.filter((l) => me?.isAdmin || ["/agenda", "/comissoes"].includes(l[0]));
  async function copyBookingLink() {
    const url = `${window.location.origin}/agendar`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link de agendamento copiado!");
    } catch {
      toast.error(`Não foi possível copiar. Link: ${url}`);
    }
  }
  async function logout() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
    await router.invalidate();
  }
  return (
    <div className="min-h-dvh">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col overflow-y-auto border-r bg-sidebar px-5 py-8 md:flex">
        <Link to="/" className="mb-12 flex items-center gap-2 px-3">
          <BrandLogo className="size-9" />
          <div className="min-w-0">
            <p className="truncate font-display text-3xl">{brandName}</p>
            <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
              BELEZA & CUIDADO
            </p>
          </div>
        </Link>
        <p className="mb-4 px-3 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          MEU SALÃO
        </p>
        <nav className="grid gap-1.5">
          {visible.map(([to, label, Icon]) => (
            <Button
              key={to}
              asChild
              variant="ghost"
              className={`h-11 justify-start px-3 ${pathname === to ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground"}`}
            >
              <Link to={to}>
                <Icon />
                {label}
                {pathname === to && <ChevronRight className="ml-auto" />}
              </Link>
            </Button>
          ))}
        </nav>
        {me?.isAdmin && (
          <Button variant="outline" className="mt-6 w-full justify-start" onClick={copyBookingLink}>
            <Link2 />
            Copiar link de agendamento
          </Button>
        )}
        <div className="mt-auto border-t pt-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-accent font-display text-xl">
              {me?.nome.slice(0, 1) || "R"}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">{me?.nome || "Minha conta"}</p>
              <p className="text-[10px] text-muted-foreground">
                {me?.isAdmin ? "Administradora" : "Profissional"}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground"
            onClick={logout}
          >
            <LogOut />
            Sair da conta
          </Button>
        </div>
      </aside>
      <div className="md:ml-60">
        <header className="flex h-20 items-center justify-between gap-3 border-b bg-card px-4 md:px-10">
          <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            <span className="md:hidden">
              <BrandLogo className="size-7" />
            </span>
            <span className="hidden md:inline">Meu salão / </span>
            <span className="font-medium text-foreground">
              {links.find((l) => l[0] === pathname)?.[1]}
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-3">
            <span className="hidden items-center gap-2 text-[11px] text-muted-foreground sm:flex">
              <span className="size-1.5 rounded-full bg-success" />
              Seu salão conectado
            </span>
            {me?.isAdmin && (
              <>
                <Button asChild variant="ghost" size="icon" className="md:hidden" aria-label="WhatsApp">
                  <Link to="/whatsapp">
                    <MessageCircle />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  aria-label="Copiar link de agendamento"
                  onClick={copyBookingLink}
                >
                  <Link2 />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Sair da conta"
              onClick={logout}
            >
              <LogOut />
            </Button>
          </div>
        </header>
        <main className="mx-auto max-w-[1600px] px-5 py-7 pb-28 md:px-10 md:py-9">
          <Outlet />
        </main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around overflow-x-auto border-t bg-card px-2 pb-3 pt-2 md:hidden">
        {visible
          .filter((l) =>
            me?.isAdmin
              ? ["/painel", "/agenda", "/clientes", "/financeiro", "/configuracoes"].includes(l[0])
              : true,
          )
          .map(([to, label, Icon]) => (
            <Button
              key={to}
              asChild
              variant="ghost"
              className={`h-14 min-w-14 flex-col gap-1 px-2 text-[9px] ${pathname === to ? "bg-secondary text-primary" : "text-muted-foreground"}`}
            >
              <Link to={to}>
                <Icon />
                {label}
              </Link>
            </Button>
          ))}
      </nav>
    </div>
  );
}
