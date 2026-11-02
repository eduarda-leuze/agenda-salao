import { createFileRoute } from "@tanstack/react-router";
import { salonQuery, pageHead } from "@/lib/salon";
import { SalonError, SalonNotFound } from "@/components/salon/route-error";
import { Dashboard } from "@/components/salon/dashboard";
export const Route = createFileRoute("/_authenticated/painel")({
  head: () => pageHead("Visão geral", "Painel do salão com agenda e resultados."),
  loader: ({ context }) => context.queryClient.ensureQueryData(salonQuery),
  errorComponent: SalonError,
  notFoundComponent: SalonNotFound,
  component: Dashboard,
});
