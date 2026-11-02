import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { brandQuery } from "@/lib/brand";
import { BrandLogo } from "./brand";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Field } from "./common";
import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { erroMsg } from "@/lib/br";
export function AuthScreen() {
  const [mode, setMode] = useState<"entrar" | "criar" | "esqueci">("entrar"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [show, setShow] = useState(false),
    [busy, setBusy] = useState(false),
    [sent, setSent] = useState<"" | "confirmar" | "senha">(""),
    [error, setError] = useState("");
  const signup = mode === "criar";
  const navigate = useNavigate();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: brand } = useQuery(brandQuery);
  const nome = brand?.nome ?? "Studio Rosé";
  useEffect(() => {
    void supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        const { data: admin } = await supabase.rpc("is_admin");
        await navigate({ to: admin ? "/painel" : "/agenda", replace: true });
      }
    });
  }, [navigate]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "esqueci") {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
        });
        if (err) throw err;
        setSent("senha");
      } else if (signup) {
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth` },
        });
        if (err) throw err;
        setSent("confirmar");
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        qc.clear();
        const { data: admin } = await supabase.rpc("is_admin");
        await router.invalidate();
        await navigate({ to: admin ? "/painel" : "/agenda" });
      }
    } catch (err) {
      const m = erroMsg(err);
      setError(
        m.includes("Invalid login")
          ? "E-mail ou senha incorretos."
          : m.includes("Email not confirmed")
            ? "Confirme seu e-mail antes de entrar (veja sua caixa de entrada)."
            : m,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1fr_1fr]">
      <section className="flex min-w-0 flex-col px-5 py-8 sm:px-16 lg:px-20">
        <div className="flex items-center gap-3">
          <BrandLogo className="size-10" />
          <div className="min-w-0">
            <p className="truncate font-display text-3xl">{nome}</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              BELEZA & CUIDADO
            </p>
          </div>
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-16">
          <p className="mb-4 text-xs uppercase tracking-[0.16em] text-muted-foreground">
            SEU SALÃO, EM HARMONIA
          </p>
          <h1 className="text-4xl font-medium sm:text-5xl">
            {sent
              ? "Confira seu e-mail"
              : mode === "esqueci"
                ? "Vamos recuperar."
                : signup
                  ? "Um novo começo."
                  : "Que bom ter você aqui."}
          </h1>
          <p className="mb-8 mt-4 text-sm leading-6 text-muted-foreground">
            {sent === "confirmar"
              ? "Enviamos um link para confirmar sua conta. Confirme antes de entrar."
              : sent === "senha"
                ? "Enviamos um link para você criar uma nova senha."
                : mode === "esqueci"
                  ? "Informe seu e-mail para receber o link de nova senha."
                  : signup
                    ? "Crie sua conta para começar."
                    : "Entre para cuidar de mais um dia de beleza."}
          </p>
          {!sent && (
            <>
              {mode !== "esqueci" && (
                <div className="mb-7 flex border-b">
                  <Button
                    variant="ghost"
                    className={`flex-1 rounded-none ${!signup ? "border-b-2 border-primary" : "text-muted-foreground"}`}
                    onClick={() => setMode("entrar")}
                  >
                    Entrar
                  </Button>
                  <Button
                    variant="ghost"
                    className={`flex-1 rounded-none ${signup ? "border-b-2 border-primary" : "text-muted-foreground"}`}
                    onClick={() => setMode("criar")}
                  >
                    Criar conta
                  </Button>
                </div>
              )}
              <form onSubmit={submit} className="grid gap-5">
                <Field
                  label="E-mail"
                  type="email"
                  autoComplete="email"
                  placeholder="seuemail@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                {mode !== "esqueci" && (
                  <div className="relative">
                    <Field
                      label="Senha"
                      type={show ? "text" : "password"}
                      autoComplete={signup ? "new-password" : "current-password"}
                      minLength={signup ? 8 : 1}
                      placeholder="Sua senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute bottom-1 right-1"
                      aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                      onClick={() => setShow(!show)}
                    >
                      {show ? <EyeOff /> : <Eye />}
                    </Button>
                  </div>
                )}
                {error && (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                )}
                <Button size="lg" className="h-12 w-full" disabled={busy}>
                  {busy ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <>
                      {mode === "esqueci"
                        ? "Enviar link"
                        : signup
                          ? "Criar minha conta"
                          : "Entrar no salão"}
                      <ArrowRight />
                    </>
                  )}
                </Button>
              </form>
              <Button
                variant="link"
                className="mt-4 self-center text-muted-foreground"
                onClick={() => {
                  setError("");
                  setMode(mode === "esqueci" ? "entrar" : "esqueci");
                }}
              >
                {mode === "esqueci" ? "Voltar para entrar" : "Esqueci minha senha"}
              </Button>
            </>
          )}
          {sent && (
            <Button
              variant="outline"
              onClick={() => {
                setSent("");
                setMode("entrar");
              }}
            >
              Voltar para entrar
            </Button>
          )}
        </div>
        <p className="text-center text-xs text-muted-foreground">
          {nome} · Um cuidado de cada vez.
        </p>
      </section>
      <section className="auth-photo relative hidden overflow-hidden lg:block">
        {brand?.imagem ? (
          <img
            src={brand.imagem}
            width={1024}
            height={1536}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="auth-photo-fallback absolute inset-0" aria-hidden="true" />
        )}
        <div className="absolute bottom-16 left-14 right-14 z-10 text-primary-foreground">
          <div className="mb-5">
            <BrandLogo className="size-10" />
          </div>
          <p className="font-display text-5xl leading-tight">
            {brand?.slogan || "Beleza nos detalhes. Leveza no seu dia."}
          </p>
          <p className="mt-5 text-sm opacity-80">Seu espaço para fazer florescer.</p>
        </div>
      </section>
    </main>
  );
}
