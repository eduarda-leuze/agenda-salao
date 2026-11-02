import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getSalon } from "./salon.functions";
import { dataLocal, addDias } from "./br";
export const salonQuery = queryOptions({
  queryKey: ["salon"],
  queryFn: () => getSalon(),
  staleTime: 30_000,
});
export const useSalon = () => useSuspenseQuery(salonQuery).data;
export type Salon = Awaited<ReturnType<typeof getSalon>>;
export function allowedSections(admin: boolean) {
  return admin
    ? [
        "painel",
        "agenda",
        "clientes",
        "servicos",
        "profissionais",
        "financeiro",
        "comissoes",
        "whatsapp",
        "configuracoes",
      ]
    : ["agenda", "comissoes"];
}
export function serviceTotals(services: { preco: number; duracao_min: number }[]) {
  return {
    price: services.reduce((n, s) => n + s.preco, 0),
    minutes: services.reduce((n, s) => n + s.duracao_min, 0),
  };
}
export function paymentValid(total: number, values: number[]) {
  return (
    total >= 0 &&
    values.every((v) => v >= 0) &&
    Math.abs(values.reduce((a, b) => a + b, 0) - total) < 0.009
  );
}
export function returningClients(
  clients: { id: string; created_at: string }[],
  appointments: { cliente_id: string; inicio: string; status: string }[],
  today: string,
) {
  return clients.filter((c) => {
    const visits = appointments
      .filter((a) => a.cliente_id === c.id && a.status === "concluido")
      .map((a) => dataLocal(a.inicio))
      .sort();
    const last = visits.at(-1) ?? dataLocal(c.created_at);
    return last < addDias(today, -60);
  });
}
export const pageHead = (title: string, description: string) => ({
  meta: [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ],
});
