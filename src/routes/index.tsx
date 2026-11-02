import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "@/components/salon/auth";
import { pageHead } from "@/lib/salon";
export const Route = createFileRoute("/")({
  head: () =>
    pageHead("Entrar", "Entre no seu salão: agenda, clientes e gestão em um só lugar."),
  component: AuthScreen,
});
