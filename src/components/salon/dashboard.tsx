import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight, Plus, CalendarDays, Gift, Heart, Flower2, Clock } from "lucide-react";
import { useSalon, returningClients } from "@/lib/salon";
import { dataLocal, addDias, fmtBRL, horaLocal, STATUS, fmtData, linkWhatsApp } from "@/lib/br";
import { PageTitle, Metric, Empty } from "./common";
import { BookingRequests } from "./requests";
import { BookingLinkCard } from "./brand";
import { WhatsAppAttention } from "./whatsapp";
export function Dashboard() {
  const d = useSalon();
  const today = dataLocal();
  const appointments = d.appointments.filter((a) => dataLocal(a.inicio) === today);
  const dayRevenue = d.payments
    .filter((p) => dataLocal(p.pago_em) === today)
    .reduce((n, p) => n + p.valor_total, 0);
  const monthRevenue = d.payments
    .filter((p) => dataLocal(p.pago_em).slice(0, 7) === today.slice(0, 7))
    .reduce((n, p) => n + p.valor_total, 0);
  const birthdays = d.clients.filter(
    (c) =>
      c.aniversario &&
      Array.from({ length: 7 }, (_, i) => addDias(today, i).slice(5)).includes(
        c.aniversario.slice(5),
      ),
  );
  const returns = returningClients(d.clients, d.appointments, today);
  const upcoming = d.appointments
    .filter(
      (a) =>
        a.inicio > new Date().toISOString() &&
        !["cancelado", "nao_compareceu", "concluido"].includes(a.status),
    )
    .slice(0, 4);
  if (!d.isAdmin) return <Empty>Seu acesso permite consultar sua agenda e suas comissões.</Empty>;
  return (
    <>
      <PageTitle
        title="Um lindo dia começa aqui."
        subtitle={`${new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Sao_Paulo" }).format(new Date())}`}
      />
      <WhatsAppAttention />
      <BookingRequests />
      <BookingLinkCard />
      <div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="AGENDAMENTOS DE HOJE"
          value={appointments.length}
          note={`${appointments.filter((a) => a.status === "confirmado").length} confirmados`}
        />
        <Metric
          label="FATURAMENTO DO DIA"
          value={fmtBRL(dayRevenue)}
          note="Pagamentos recebidos hoje"
        />
        <Metric
          label="FATURAMENTO DO MÊS"
          value={fmtBRL(monthRevenue)}
          note="Um cuidado de cada vez"
        />
        <Metric
          label="CLIENTES DO SALÃO"
          value={d.clients.length}
          note={`${birthdays.length} aniversariantes nesta semana`}
        />
      </div>
      <div className="grid gap-8 xl:grid-cols-[1.6fr_1fr]">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl">A agenda de hoje</h2>
            <Button asChild variant="link">
              <Link to="/agenda" search={{ date: today, view: "dia" }}>
                Ver agenda
                <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Horário</th>
                  <th>Cliente / serviço</th>
                  <th>Profissional</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((a) => (
                  <tr key={a.id}>
                    <td className="font-semibold">{horaLocal(a.inicio)}</td>
                    <td>
                      <p className="font-medium">
                        {d.clients.find((c) => c.id === a.cliente_id)?.nome}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {d.items
                          .filter((i) => i.agendamento_id === a.id)
                          .map((i) => d.services.find((s) => s.id === i.servico_id)?.nome)
                          .join(" + ")}
                      </p>
                    </td>
                    <td>
                      {d.professionals.find((p) => p.id === a.profissional_id)?.nome.split(" ")[0]}
                    </td>
                    <td>
                      <span className="inline-flex items-center gap-2 text-xs">
                        <span className={`size-1.5 rounded-full ${STATUS[a.status].cls}`} />
                        {STATUS[a.status].label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!appointments.length && <Empty>Sua agenda está livre hoje.</Empty>}
          </div>
          <div className="mt-7 flex items-center justify-between">
            <h2 className="text-2xl">Próximos cuidados</h2>
            <CalendarDays className="size-4 text-muted-foreground" />
          </div>
          <div className="mt-3 divide-y">
            {upcoming.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-secondary">
                    <Clock className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">
                      {d.clients.find((c) => c.id === a.cliente_id)?.nome}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {d.professionals.find((p) => p.id === a.profissional_id)?.nome}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {fmtData(a.inicio)} · {horaLocal(a.inicio)}
                </p>
              </div>
            ))}
            {!upcoming.length && <Empty>Nenhum próximo agendamento.</Empty>}
          </div>
        </section>
        <div>
          <section className="mb-7 border-b pb-6">
            <div className="mb-5 flex items-center gap-2">
              <Gift className="size-4 text-rose" />
              <h2 className="text-2xl">A semana delas</h2>
            </div>
            {birthdays.map((c) => (
              <div key={c.id} className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{c.nome}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Aniversário em {fmtData(c.aniversario).slice(0, 5)}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <a href={linkWhatsApp(c.telefone)} target="_blank" rel="noreferrer">
                    Parabenizar
                    <ArrowRight />
                  </a>
                </Button>
              </div>
            ))}
            {!birthdays.length && (
              <p className="text-xs text-muted-foreground">
                Nenhum aniversário nos próximos 7 dias.
              </p>
            )}
          </section>
          <section>
            <div className="mb-2 flex items-center gap-2">
              <Heart className="size-4 text-rose" />
              <h2 className="text-2xl">Vamos matar a saudade?</h2>
            </div>
            <p className="mb-5 text-xs text-muted-foreground">
              Clientes sem atendimento há mais de 60 dias.
            </p>
            {returns.map((c) => (
              <div key={c.id} className="mb-4 flex items-center justify-between">
                <p className="text-sm">{d.clients.find((x) => x.id === c.id)?.nome}</p>
                <Button asChild variant="ghost" size="sm">
                  <a
                    href={linkWhatsApp(d.clients.find((x) => x.id === c.id)?.telefone ?? "")}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Chamar
                    <ArrowRight />
                  </a>
                </Button>
              </div>
            ))}
            {!returns.length && (
              <p className="text-xs text-muted-foreground">Todos os clientes estão em dia.</p>
            )}
          </section>
          <div className="mt-7 border-t pt-6">
            <Flower2 className="mb-3 size-7 text-rose" />
            <p className="font-display text-2xl">O cuidado transforma.</p>
            <Button className="mt-4" asChild>
              <Link to="/agenda" search={{ date: today, view: "dia" }}>
                <Plus />
                Abrir agenda
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
