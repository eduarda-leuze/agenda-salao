import { createFileRoute } from "@tanstack/react-router";
import { salonQuery, pageHead } from "@/lib/salon";
import { SalonError, SalonNotFound } from "@/components/salon/route-error";
import { WhatsAppPage } from "@/components/salon/whatsapp";
export const Route = createFileRoute("/_authenticated/whatsapp")({
  head: () => pageHead("WhatsApp", "Conversas do robô de atendimento no WhatsApp."),
  loader: ({ context }) => context.queryClient.ensureQueryData(salonQuery),
  errorComponent: SalonError,
  notFoundComponent: SalonNotFound,
  component: WhatsAppPage,
});
