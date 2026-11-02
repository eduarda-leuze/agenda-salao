import { createFileRoute } from "@tanstack/react-router";
import { salonQuery, pageHead } from "@/lib/salon";
import { SalonError, SalonNotFound } from "@/components/salon/route-error";
import { Records } from "@/components/salon/records";
export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => pageHead("Clientes", "Clientes, histórico e total gasto."),
  loader: ({ context }) => context.queryClient.ensureQueryData(salonQuery),
  errorComponent: SalonError,
  notFoundComponent: SalonNotFound,
  component: () => <Records kind="clientes" />,
});
