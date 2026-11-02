import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "@/components/salon/auth";
import { pageHead } from "@/lib/salon";
export const Route = createFileRoute("/auth")({
  head: () => pageHead("Entrar", "Entre ou crie sua conta no salão."),
  component: AuthScreen,
});
