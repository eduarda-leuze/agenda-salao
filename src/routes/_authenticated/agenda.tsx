import { createFileRoute } from "@tanstack/react-router";
import { salonQuery, pageHead } from "@/lib/salon";
import { SalonError, SalonNotFound } from "@/components/salon/route-error";
import { Agenda } from "@/components/salon/agenda";
import { dataLocal } from "@/lib/br";
export const Route = createFileRoute("/_authenticated/agenda")({
  validateSearch: (s: Record<string, unknown>) => ({
    date:
      typeof s["date"] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s["date"])
        ? s["date"]
        : dataLocal(),
    view:
      s["view"] === "semana"
        ? ("semana" as const)
        : s["view"] === "lista"
          ? ("lista" as const)
          : ("dia" as const),
  }),
  head: () => pageHead("Agenda", "Agenda do salão por dia, semana e lista."),
  loader: ({ context }) => context.queryClient.ensureQueryData(salonQuery),
  errorComponent: SalonError,
  notFoundComponent: SalonNotFound,
  component: Page,
});
function Page() {
  const s = Route.useSearch();
  return <Agenda {...s} />;
}
