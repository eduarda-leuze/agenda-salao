import { createFileRoute } from "@tanstack/react-router";
import { salonQuery, pageHead } from "@/lib/salon";
import { SalonError, SalonNotFound } from "@/components/salon/route-error";
import { Settings } from "@/components/salon/records";
export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => pageHead("Configurações", "Configurações, aparência e funcionamento do salão."),
  loader: ({ context }) => context.queryClient.ensureQueryData(salonQuery),
  errorComponent: SalonError,
  notFoundComponent: SalonNotFound,
  component: Settings,
});
