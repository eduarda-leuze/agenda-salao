import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  List,
  Plus,
  LockKeyhole,
  Clock,
  Check,
  Trash2,
  ArrowRight,
  MessageCircle,
} from "lucide-react";
import { Field, SelectField, Modal, PageTitle, Empty } from "./common";
import { BookingRequests } from "./requests";
import { useSalon, serviceTotals, paymentValid } from "@/lib/salon";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import {
  addDias,
  dataLocal,
  fmtData,
  fmtDiaLongo,
  horaLocal,
  localParaISO,
  STATUS,
  FORMAS,
  fmtBRL,
  mascaraTelefone,
  telefoneValido,
  erroMsg,
  inicioSemana,
  minParaHora,
  type Forma,
  type Status,
} from "@/lib/br";
import { toast } from "sonner";
import { notificarAgendamento } from "@/lib/salon.functions";
type Appointment = Tables<"agendamentos">;
export function Agenda({ date, view }: { date: string; view: "dia" | "semana" | "lista" }) {
  const d = useSalon();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false),
    [blocking, setBlocking] = useState(false),
    [selected, setSelected] = useState<Appointment | null>(null),
    [payment, setPayment] = useState<Appointment | null>(null),
    [editing, setEditing] = useState<Appointment | null>(null);
  const professionals = d.professionals.filter((p) => p.ativa && (d.isAdmin || p.id === d.ownId));
  const start = view === "semana" ? inicioSemana(date) : date;
  const dates = view === "semana" ? Array.from({ length: 7 }, (_, i) => addDias(start, i)) : [date];
  const appointments = d.appointments.filter((a) => dates.includes(dataLocal(a.inicio)));
  const refresh = () => qc.invalidateQueries({ queryKey: ["salon"] });
  const changeDate = (next: string) =>
    navigate({ to: "/agenda", search: (prev) => ({ ...prev, date: next, view }) });
  async function status(a: Appointment, next: Status) {
    if (next === "concluido" && d.isAdmin) {
      setSelected(null);
      setPayment(a);
      return;
    }
    const { error } = await supabase.from("agendamentos").update({ status: next }).eq("id", a.id);
    if (error) toast.error(erroMsg(error));
    else {
      toast.success("Status atualizado.");
      setSelected(null);
      void refresh();
    }
  }
  async function move(id: string, professionalId: string, day: string, hour: number) {
    const a = d.appointments.find((a) => a.id === id);
    if (!a) return;
    const services = d.items.filter((i) => i.agendamento_id === id).map((i) => i.servico_id);
    const { data: slots, error } = await supabase.rpc("horarios_livres", {
      p_data: day,
      p_servico_ids: services,
      p_profissional_id: professionalId,
    });
    const slot = slots?.find((s) => horaLocal(s.inicio) === minParaHora(hour * 60));
    if (error || !slot) {
      toast.error("Esse horário não está livre para os serviços selecionados.");
      return;
    }
    const { error: err } = await supabase
      .from("agendamentos")
      .update({ inicio: slot.inicio, fim: slot.fim, profissional_id: professionalId })
      .eq("id", id);
    if (err) toast.error(erroMsg(err));
    else {
      toast.success("Agendamento remarcado.");
      void refresh();
    }
  }
  function entry(a: Appointment) {
    const client = d.clients.find((c) => c.id === a.cliente_id);
    const items = d.items.filter((i) => i.agendamento_id === a.id);
    const prof = professionals.find((p) => p.id === a.profissional_id);
    return (
      <Button
        key={a.id}
        variant="ghost"
        className="calendar-entry mb-1"
        data-tone={
          a.status === "solicitado"
            ? "solicitado"
            : professionals.indexOf(prof as (typeof professionals)[number]) % 2
              ? "cool"
              : "rose"
        }
        draggable={view === "dia" && a.status !== "solicitado"}
        onDragStart={(e) => e.dataTransfer.setData("appointment", a.id)}
        onClick={() => setSelected(a)}
      >
        <div className="w-full">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[10px] font-medium">
              {horaLocal(a.inicio)} – {horaLocal(a.fim)}
            </span>
            <span className="flex items-center gap-1">
              {a.origem === "whatsapp" && (
                <MessageCircle className="size-3 text-success" aria-label="Marcado pelo WhatsApp" />
              )}
              <span
                className={`size-1.5 rounded-full ${STATUS[a.status].cls}`}
                title={STATUS[a.status].label}
              />
            </span>
          </div>
          <p className="mt-1 text-xs font-semibold">{client?.nome || "Cliente"}</p>
          <p className="mt-1 text-[10px] font-normal text-muted-foreground">
            {items.map((i) => d.services.find((s) => s.id === i.servico_id)?.nome).join(" + ")}
          </p>
        </div>
      </Button>
    );
  }
  const hours = Array.from({ length: 13 }, (_, i) => i + 8);
  return (
    <>
      <PageTitle
        title="Agenda"
        subtitle="Cada horário, um cuidado especial."
        action={() => setCreating(true)}
        label="Novo agendamento"
      />
      <BookingRequests />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => changeDate(dataLocal())}>
            Hoje
          </Button>
          <Button
            aria-label="Dia anterior"
            variant="ghost"
            size="icon"
            onClick={() => changeDate(addDias(date, view === "semana" ? -7 : -1))}
          >
            <ChevronLeft />
          </Button>
          <Button
            aria-label="Próximo dia"
            variant="ghost"
            size="icon"
            onClick={() => changeDate(addDias(date, view === "semana" ? 7 : 1))}
          >
            <ChevronRight />
          </Button>
          <label className="relative">
            <span className="text-sm font-medium capitalize">{fmtDiaLongo(date)}</span>
            <input
              aria-label="Data da agenda"
              type="date"
              className="absolute inset-0 w-full cursor-pointer opacity-0"
              value={date}
              onChange={(e) => changeDate(e.target.value)}
            />
          </label>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBlocking(true)}>
            <LockKeyhole />
            <span className="hidden sm:inline">Bloquear horário</span>
          </Button>
          <div className="flex rounded-md border bg-card p-1">
            {(["dia", "semana", "lista"] as const).map((v) => (
              <Button
                size="sm"
                key={v}
                variant={view === v ? "secondary" : "ghost"}
                aria-label={`Ver ${v}`}
                onClick={() => navigate({ to: "/agenda", search: { date, view: v } })}
              >
                {v === "lista" ? <List /> : <CalendarDays />}
                <span className="hidden sm:inline">
                  {v === "dia" ? "Dia" : v === "semana" ? "Semana" : "Lista"}
                </span>
              </Button>
            ))}
          </div>
        </div>
      </div>
      <div className="mb-4 flex flex-wrap gap-4 text-[10px] text-muted-foreground">
        {Object.entries(STATUS).map(([k, s]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={`size-1.5 rounded-full ${s.cls}`} />
            {s.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <MessageCircle className="size-3 text-success" />
          Marcado pelo WhatsApp
        </span>
      </div>
      {view === "lista" ? (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Horário</th>
                <th>Cliente</th>
                <th>Serviços</th>
                <th>Profissional</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a.id}>
                  <td>{horaLocal(a.inicio)}</td>
                  <td className="font-medium">
                    {d.clients.find((c) => c.id === a.cliente_id)?.nome}
                    {a.origem === "whatsapp" && (
                      <MessageCircle
                        className="ml-1 inline size-3 text-success"
                        aria-label="Marcado pelo WhatsApp"
                      />
                    )}
                  </td>
                  <td>
                    {d.items
                      .filter((i) => i.agendamento_id === a.id)
                      .map((i) => d.services.find((s) => s.id === i.servico_id)?.nome)
                      .join(", ")}
                  </td>
                  <td>{d.professionals.find((p) => p.id === a.profissional_id)?.nome}</td>
                  <td>
                    <span className="inline-flex items-center gap-2 text-xs">
                      <span className={`size-2 rounded-full ${STATUS[a.status].cls}`} />
                      {STATUS[a.status].label}
                    </span>
                  </td>
                  <td>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Abrir agendamento"
                      onClick={() => setSelected(a)}
                    >
                      <ArrowRight />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!appointments.length && <Empty>Nenhum agendamento para este dia.</Empty>}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <div className={view === "semana" ? "min-w-[1050px]" : "min-w-[500px]"}>
            <div className="flex border-b">
              <div className="w-16 shrink-0" />
              {(view === "dia" ? professionals : dates).map((p, i) => (
                <div
                  className="flex-1 border-l px-4 py-4 text-center"
                  key={typeof p === "string" ? p : p.id}
                >
                  {typeof p === "string" ? (
                    <>
                      <p className="text-xs text-muted-foreground">
                        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][i]}
                      </p>
                      <p className="font-display text-2xl">{fmtData(p).slice(0, 5)}</p>
                    </>
                  ) : (
                    <div className="flex items-center justify-center gap-3">
                      <span
                        className={`flex size-9 shrink-0 items-center justify-center rounded-full font-display text-xl ${i % 2 ? "bg-chart-2/15 text-chart-2" : "bg-accent text-primary"}`}
                      >
                        {p.nome[0]}
                      </span>
                      <div className="text-left">
                        <p className="text-xs font-semibold">{p.nome}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {appointments.filter((a) => a.profissional_id === p.id).length}{" "}
                          agendamentos
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {hours.map((hour) => (
              <div className="flex" key={hour}>
                <div className="w-16 shrink-0 py-3 text-center text-[10px] text-muted-foreground">
                  {minParaHora(hour * 60)}
                </div>
                {(view === "dia" ? professionals : dates).map((p) => {
                  const day = typeof p === "string" ? p : date;
                  const pro = typeof p === "string" ? null : p.id;
                  const own = appointments.filter(
                    (a) =>
                      dataLocal(a.inicio) === day &&
                      (!pro || a.profissional_id === pro) &&
                      Number(horaLocal(a.inicio).slice(0, 2)) === hour,
                  );
                  const blocks = d.blocks.filter(
                    (b) =>
                      dataLocal(b.inicio) === day &&
                      (!pro || b.profissional_id === pro) &&
                      Number(horaLocal(b.inicio).slice(0, 2)) === hour,
                  );
                  return (
                    <div
                      key={typeof p === "string" ? p : p.id}
                      className="calendar-cell flex-1"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const id = e.dataTransfer.getData("appointment");
                        if (id && pro) void move(id, pro, day, hour);
                      }}
                    >
                      {own.map(entry)}
                      {blocks.map((b) => (
                        <Button
                          key={b.id}
                          variant="ghost"
                          className="calendar-entry mb-1"
                          data-tone="blocked"
                          onClick={async () => {
                            if (!window.confirm("Remover este bloqueio?")) return;
                            const { error } = await supabase
                              .from("bloqueios")
                              .delete()
                              .eq("id", b.id);
                            if (error) toast.error(erroMsg(error));
                            else void refresh();
                          }}
                        >
                          <LockKeyhole />
                          <div>
                            <p className="text-xs">{b.motivo}</p>
                            <p className="text-[10px]">
                              {horaLocal(b.inicio)} – {horaLocal(b.fim)}
                            </p>
                          </div>
                        </Button>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="size-3.5" />
        {appointments.length} agendamentos · {professionals.length} profissionais
      </p>
      {(creating || editing) && (
        <AppointmentForm
          date={date}
          existing={editing}
          close={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
      {blocking && <BlockForm date={date} close={() => setBlocking(false)} />}
      {selected && (
        <Modal title="Detalhes do agendamento" open close={() => setSelected(null)}>
          <div className="space-y-4">
            <p className="font-display text-2xl">
              {d.clients.find((c) => c.id === selected.cliente_id)?.nome}
            </p>
            <p className="text-sm text-muted-foreground">
              {fmtData(selected.inicio)} · {horaLocal(selected.inicio)} – {horaLocal(selected.fim)}
              {selected.origem === "whatsapp" && " · marcado pelo WhatsApp"}
            </p>
            <p className="text-sm">
              {d.items
                .filter((i) => i.agendamento_id === selected.id)
                .map((i) => d.services.find((s) => s.id === i.servico_id)?.nome)
                .join(" + ")}
            </p>
            <SelectField
              label="Status"
              value={selected.status}
              onChange={(e) => void status(selected, e.target.value as Status)}
            >
              {Object.entries(STATUS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </SelectField>
            {selected.observacoes && <p className="text-sm">{selected.observacoes}</p>}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(selected);
                  setSelected(null);
                }}
              >
                Remarcar
              </Button>
              {d.isAdmin && (
                <Button
                  onClick={() => {
                    setPayment(selected);
                    setSelected(null);
                  }}
                >
                  <Check />
                  Registrar pagamento
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
      {payment && <PaymentForm appointment={payment} close={() => setPayment(null)} />}
    </>
  );
}
function AppointmentForm({
  date,
  existing,
  close,
}: {
  date: string;
  existing: Appointment | null;
  close: () => void;
}) {
  const d = useSalon();
  const qc = useQueryClient();
  const [day, setDay] = useState(date),
    [prof, setProf] = useState(existing?.profissional_id ?? (d.isAdmin ? "" : (d.ownId ?? ""))),
    [client, setClient] = useState(existing?.cliente_id ?? ""),
    [search, setSearch] = useState(""),
    [quick, setQuick] = useState(false),
    [name, setName] = useState(""),
    [phone, setPhone] = useState(""),
    [services, setServices] = useState<string[]>(
      existing
        ? d.items.filter((i) => i.agendamento_id === existing.id).map((i) => i.servico_id)
        : [],
    ),
    [slot, setSlot] = useState(""),
    [notes, setNotes] = useState(existing?.observacoes ?? ""),
    [duracaoMin, setDuracaoMin] = useState<number | null>(null),
    [busy, setBusy] = useState(false);
  const totals = serviceTotals(d.services.filter((s) => services.includes(s.id)));
  const {
    data: slots = [],
    isFetching,
    error,
  } = useQuery({
    queryKey: ["slots", day, prof, services],
    enabled: !!day && !!services.length,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("horarios_livres", {
        p_data: day,
        p_servico_ids: services,
        ...(prof ? { p_profissional_id: prof } : {}),
      });
      if (error) throw error;
      return (data ?? []).filter((s) => d.isAdmin || s.profissional_id === d.ownId);
    },
  });
  async function submit(e: FormEvent) {
    e.preventDefault();
    const chosen = slots.find((s) => `${s.profissional_id}|${s.inicio}` === slot);
    if (!chosen) {
      toast.error("Selecione um horário livre.");
      return;
    }
    const duracaoFinal = duracaoMin ?? totals.minutes;
    const fimCustom = new Date(new Date(chosen.inicio).getTime() + duracaoFinal * 60_000).toISOString();
    setBusy(true);
    try {
      let cid = client;
      if (quick) {
        if (!telefoneValido(phone)) throw new Error("Informe um telefone brasileiro válido.");
        const { data, error } = await supabase
          .from("clientes")
          .insert({ nome: name, telefone: phone })
          .select("id")
          .single();
        if (error) throw error;
        if (!data) throw new Error("Cliente não cadastrado.");
        cid = data.id;
      }
      if (!cid) throw new Error("Selecione um cliente.");
      if (existing) {
        const { error } = await supabase
          .from("agendamentos")
          .update({
            inicio: chosen.inicio,
            fim: fimCustom,
            profissional_id: chosen.profissional_id,
            observacoes: notes,
            cliente_id: cid,
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { data: a, error } = await supabase
          .from("agendamentos")
          .insert({
            cliente_id: cid,
            profissional_id: chosen.profissional_id,
            inicio: chosen.inicio,
            fim: fimCustom,
            observacoes: notes,
          })
          .select("id")
          .single();
        if (error) throw error;
        if (!a) throw new Error("Agendamento não criado.");
        const { error: ie } = await supabase.from("agendamento_servicos").insert(
          d.services
            .filter((s) => services.includes(s.id))
            .map((s) => ({
              agendamento_id: a.id,
              servico_id: s.id,
              preco: s.preco,
              duracao_min: s.duracao_min,
            })),
        );
        if (ie) {
          await supabase.from("agendamentos").delete().eq("id", a.id);
          throw ie;
        }
        // Envia confirmação via WhatsApp (fire-and-forget)
        notificarAgendamento({ data: { agendamentoId: a.id } }).catch(() => {});
      }
      toast.success(existing ? "Agendamento remarcado." : "Agendamento criado.");
      await qc.invalidateQueries({ queryKey: ["salon"] });
      close();
    } catch (e) {
      toast.error(erroMsg(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal open title={existing ? "Remarcar agendamento" : "Novo agendamento"} close={close}>
      <form onSubmit={submit} className="grid gap-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold">CLIENTE</p>
          <Button variant="ghost" size="sm" type="button" onClick={() => setQuick(!quick)}>
            <Plus />
            {quick ? "Buscar cliente" : "Novo cliente"}
          </Button>
        </div>
        {quick ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome" value={name} onChange={(e) => setName(e.target.value)} required />
            <Field
              label="Telefone / WhatsApp"
              value={phone}
              onChange={(e) => setPhone(mascaraTelefone(e.target.value))}
              required
            />
          </div>
        ) : (
          <>
            <Field
              label="Buscar cliente"
              placeholder="Nome ou telefone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <SelectField
              label="Cliente"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              required
            >
              <option value="">Selecione</option>
              {d.clients
                .filter((c) =>
                  `${c.nome} ${c.telefone}`.toLowerCase().includes(search.toLowerCase()),
                )
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} · {c.telefone}
                  </option>
                ))}
            </SelectField>
          </>
        )}
        <div>
          <p className="mb-3 text-xs font-semibold">SERVIÇOS</p>
          <div className="grid gap-2">
            {d.services
              .filter((s) => s.ativo)
              .map((s) => (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md border px-3 py-3 text-xs"
                >
                  <input
                    type="checkbox"
                    checked={services.includes(s.id)}
                    disabled={!!existing}
                    onChange={() => {
                      setServices((prev) =>
                        prev.includes(s.id) ? prev.filter((id) => id !== s.id) : [...prev, s.id],
                      );
                      setSlot("");
                      setDuracaoMin(null);
                    }}
                  />
                  <span className="flex-1">
                    {s.nome}
                    <span className="ml-2 text-muted-foreground">{s.duracao_min} min</span>
                  </span>
                  <span>{fmtBRL(s.preco)}</span>
                </label>
              ))}
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-muted-foreground">
              <Clock className="size-3.5" />
              <input
                type="number"
                min={5}
                max={480}
                value={duracaoMin ?? totals.minutes}
                onChange={(e) => setDuracaoMin(Number(e.target.value) || totals.minutes)}
                className="w-16 rounded border bg-background px-1.5 py-0.5 text-center text-sm"
              />
              min
              {duracaoMin !== null && duracaoMin !== totals.minutes && (
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline"
                  onClick={() => setDuracaoMin(null)}
                >
                  padrão ({totals.minutes})
                </button>
              )}
            </label>
            <strong>{fmtBRL(totals.price)}</strong>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Data"
            type="date"
            min={dataLocal()}
            value={day}
            onChange={(e) => {
              setDay(e.target.value);
              setSlot("");
            }}
            required
          />
          <SelectField
            label="Profissional"
            value={prof}
            onChange={(e) => {
              setProf(e.target.value);
              setSlot("");
            }}
            disabled={!d.isAdmin}
          >
            <option value="">Qualquer profissional</option>
            {d.professionals
              .filter((p) => p.ativa && (d.isAdmin || p.id === d.ownId))
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
          </SelectField>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold">HORÁRIOS LIVRES</p>
          {!services.length ? (
            <p className="text-xs text-muted-foreground">Selecione os serviços.</p>
          ) : isFetching ? (
            <p className="text-xs text-muted-foreground">Consultando horários…</p>
          ) : error ? (
            <p role="alert" className="text-sm text-destructive">
              Não foi possível consultar horários.
            </p>
          ) : !slots.length ? (
            <p className="text-xs text-muted-foreground">
              Nenhum horário livre para esta combinação.
            </p>
          ) : (
            <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto">
              {slots.map((s) => {
                const key = `${s.profissional_id}|${s.inicio}`;
                return (
                  <Button
                    type="button"
                    size="sm"
                    key={key}
                    variant={slot === key ? "default" : "outline"}
                    onClick={() => setSlot(key)}
                  >
                    {horaLocal(s.inicio)}
                    {!prof && (
                      <span className="text-[9px]">{s.profissional_nome.split(" ")[0]}</span>
                    )}
                  </Button>
                );
              })}
            </div>
          )}
        </div>
        <label className="field">
          Observações
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <Button size="lg" disabled={busy || !slot} type="submit">
          {busy ? "Salvando…" : existing ? "Salvar remarcação" : "Confirmar agendamento"}
        </Button>
      </form>
    </Modal>
  );
}
function BlockForm({ date, close }: { date: string; close: () => void }) {
  const d = useSalon();
  const qc = useQueryClient();
  const [day, setDay] = useState(date),
    [prof, setProf] = useState(d.isAdmin ? (d.professionals[0]?.id ?? "") : (d.ownId ?? "")),
    [start, setStart] = useState("12:00"),
    [end, setEnd] = useState("13:00"),
    [reason, setReason] = useState("Almoço"),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (end <= start) {
      toast.error("O fim deve ser depois do início.");
      return;
    }
    const ini = localParaISO(day, start),
      fim = localParaISO(day, end);
    if (
      d.appointments.some(
        (a) =>
          a.profissional_id === prof &&
          !["cancelado", "nao_compareceu"].includes(a.status) &&
          a.inicio < fim &&
          a.fim > ini,
      )
    ) {
      toast.error("Existe um agendamento neste horário.");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("bloqueios")
      .insert({ profissional_id: prof, inicio: ini, fim, motivo: reason });
    setBusy(false);
    if (error) toast.error(erroMsg(error));
    else {
      toast.success("Horário bloqueado.");
      await qc.invalidateQueries({ queryKey: ["salon"] });
      close();
    }
  }
  return (
    <Modal title="Bloquear horário" open close={close}>
      <form onSubmit={submit} className="grid gap-4">
        <SelectField label="Profissional" value={prof} onChange={(e) => setProf(e.target.value)}>
          {d.professionals
            .filter((p) => d.isAdmin || p.id === d.ownId)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
        </SelectField>
        <Field
          label="Data"
          type="date"
          value={day}
          onChange={(e) => setDay(e.target.value)}
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Início"
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            required
          />
          <Field
            label="Fim"
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            required
          />
        </div>
        <Field label="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} required />
        <Button disabled={busy}>Bloquear horário</Button>
      </form>
    </Modal>
  );
}
function PaymentForm({ appointment, close }: { appointment: Appointment; close: () => void }) {
  const d = useSalon();
  const qc = useQueryClient();
  const gross = d.items
    .filter((i) => i.agendamento_id === appointment.id)
    .reduce((n, i) => n + i.preco, 0);
  const [discount, setDiscount] = useState(0),
    [forms, setForms] = useState<{ forma: Forma; valor: number }[]>([
      { forma: "pix", valor: gross },
    ]),
    [busy, setBusy] = useState(false);
  const total = gross - discount;
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (
      discount < 0 ||
      !paymentValid(
        total,
        forms.map((f) => f.valor),
      )
    ) {
      toast.error("A soma dos pagamentos deve corresponder ao total.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc("registrar_pagamento", {
      p_agendamento_id: appointment.id,
      p_desconto: discount,
      p_formas: forms,
    });
    setBusy(false);
    if (error) toast.error(erroMsg(error));
    else {
      toast.success("Pagamento registrado e atendimento concluído.");
      await qc.invalidateQueries({ queryKey: ["salon"] });
      close();
    }
  }
  return (
    <Modal open title="Registrar pagamento" close={close}>
      <form onSubmit={submit} className="grid gap-4">
        <p className="text-sm">{d.clients.find((c) => c.id === appointment.cliente_id)?.nome}</p>
        <div className="flex justify-between border-b pb-4 text-sm">
          <span>Valor dos serviços</span>
          <strong>{fmtBRL(gross)}</strong>
        </div>
        <Field
          label="Desconto (R$)"
          type="number"
          min="0"
          max={gross}
          step="0.01"
          value={discount}
          onChange={(e) => {
            const v = Number(e.target.value);
            setDiscount(v);
            if (forms.length === 1)
              setForms([{ forma: forms[0]?.forma ?? "pix", valor: gross - v }]);
          }}
        />
        <div className="flex justify-between text-lg">
          <span>Total a receber</span>
          <strong>{fmtBRL(total)}</strong>
        </div>
        {forms.map((f, i) => (
          <div key={i} className="flex items-end gap-2">
            <div className="flex-1">
              <SelectField
                label="Forma de pagamento"
                value={f.forma}
                onChange={(e) =>
                  setForms(
                    forms.map((x, j) => (j === i ? { ...x, forma: e.target.value as Forma } : x)),
                  )
                }
              >
                {Object.entries(FORMAS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </SelectField>
            </div>
            <div className="w-28">
              <Field
                label="Valor (R$)"
                type="number"
                min="0"
                step="0.01"
                value={f.valor}
                onChange={(e) =>
                  setForms(
                    forms.map((x, j) => (j === i ? { ...x, valor: Number(e.target.value) } : x)),
                  )
                }
              />
            </div>
            {forms.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remover forma"
                onClick={() => setForms(forms.filter((_, j) => j !== i))}
              >
                <Trash2 />
              </Button>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setForms([
              ...forms,
              {
                forma: "dinheiro",
                valor: Math.max(0, total - forms.reduce((n, f) => n + f.valor, 0)),
              },
            ])
          }
        >
          <Plus />
          Dividir pagamento
        </Button>
        <Button
          disabled={
            busy ||
            !paymentValid(
              total,
              forms.map((f) => f.valor),
            )
          }
        >
          <Check />
          Receber e concluir
        </Button>
      </form>
    </Modal>
  );
}
