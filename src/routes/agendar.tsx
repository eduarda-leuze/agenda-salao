import { createFileRoute } from "@tanstack/react-router";
import { OnlineBooking, onlineCatalogQuery } from "@/components/salon/online-booking";
import { SalonError, SalonNotFound } from "@/components/salon/route-error";
import { pageHead } from "@/lib/salon";
export const Route = createFileRoute("/agendar")({
  head: () =>
    pageHead("Agende seu cuidado", "Escolha seu serviço, profissional e horário para agendar no salão."),
  loader: ({ context }) => context.queryClient.ensureQueryData(onlineCatalogQuery),
  component: OnlineBooking,
  errorComponent: SalonError,
  notFoundComponent: SalonNotFound,
});
