import { createFileRoute } from "@tanstack/react-router";
import { salonQuery, pageHead } from "@/lib/salon";
import { SalonError, SalonNotFound } from "@/components/salon/route-error";
import { Records } from "@/components/salon/records";
export const Route = createFileRoute("/_authenticated/profissionais")({
  head: () => pageHead("Profissionais", "Equipe, horários e acessos."),
  loader: ({ context }) => context.queryClient.ensureQueryData(salonQuery),
  errorComponent: SalonError,
  notFoundComponent: SalonNotFound,
  component: () => <Records kind="profissionais" />,
});
