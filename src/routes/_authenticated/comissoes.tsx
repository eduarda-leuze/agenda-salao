import { createFileRoute } from "@tanstack/react-router";
import { salonQuery, pageHead } from "@/lib/salon";
import { SalonError, SalonNotFound } from "@/components/salon/route-error";
import { Commissions } from "@/components/salon/finance";
import { dataLocal, inicioMes, fimMes } from "@/lib/br";
export const Route = createFileRoute("/_authenticated/comissoes")({
  validateSearch: (s: Record<string, unknown>) => ({
    from: typeof s["from"] === "string" ? s["from"] : inicioMes(dataLocal()),
    to: typeof s["to"] === "string" ? s["to"] : fimMes(dataLocal()),
  }),
  head: () => pageHead("Comissões", "Comissões da equipe por período."),
  loader: ({ context }) => context.queryClient.ensureQueryData(salonQuery),
  errorComponent: SalonError,
  notFoundComponent: SalonNotFound,
  component: Page,
});
function Page() {
  const s = Route.useSearch();
  return <Commissions {...s} />;
}
