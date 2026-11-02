import { createFileRoute } from "@tanstack/react-router";
import { salonQuery, pageHead } from "@/lib/salon";
import { SalonError, SalonNotFound } from "@/components/salon/route-error";
import { Finance } from "@/components/salon/finance";
import { dataLocal, inicioMes, fimMes } from "@/lib/br";
export const Route = createFileRoute("/_authenticated/financeiro")({
  validateSearch: (s: Record<string, unknown>) => ({
    date: typeof s["date"] === "string" ? s["date"] : dataLocal(),
    from: typeof s["from"] === "string" ? s["from"] : inicioMes(dataLocal()),
    to: typeof s["to"] === "string" ? s["to"] : fimMes(dataLocal()),
    tab:
      s["tab"] === "despesas"
        ? ("despesas" as const)
        : s["tab"] === "relatorio"
          ? ("relatorio" as const)
          : ("caixa" as const),
  }),
  head: () => pageHead("Financeiro", "Caixa, despesas e relatório financeiro do salão."),
  loader: ({ context }) => context.queryClient.ensureQueryData(salonQuery),
  errorComponent: SalonError,
  notFoundComponent: SalonNotFound,
  component: Page,
});
function Page() {
  const s = Route.useSearch();
  return <Finance {...s} />;
}
