import { useState, type FormEvent } from "react";
import { queryOptions, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, ArrowLeft, Check, Clock, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "./brand";
import { brandQuery } from "@/lib/brand";
import { Field, SelectField } from "./common";
import { publicCatalog, publicSlots, publicBook } from "@/lib/online-booking.functions";
import { bookingSchema, type resultSchema } from "@/lib/online-booking";
import type { z } from "zod";
import { addDias, fmtBRL, fmtData, horaLocal, mascaraTelefone, erroMsg } from "@/lib/br";
export const onlineCatalogQuery = queryOptions({
  queryKey: ["online-catalog"],
  queryFn: () => publicCatalog(),
  staleTime: 30_000,
});
export function OnlineBooking() {
  const { data: c } = useSuspenseQuery(onlineCatalogQuery);
  const { data: brand } = useQuery(brandQuery);
  const [service, setService] = useState(""),
    [prof, setProf] = useState(""),
    [day, setDay] = useState(c.hoje),
    [slot, setSlot] = useState(""),
    [step, setStep] = useState(0),
    [name, setName] = useState(""),
    [phone, setPhone] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState<z.infer<typeof resultSchema> | null>(null);
  const book = useServerFn(publicBook);
  const serviceData = c.servicos.find((s) => s.id === service);
  const {
    data: slots = [],
    isFetching,
    error: slotsError,
    refetch,
  } = useQuery({
    queryKey: ["online-slots", service, prof, day],
    enabled: !!service,
    queryFn: () =>
      publicSlots({ data: { data: day, servicoId: service, ...(prof ? { profissionalId: prof } : {}) } }),
  });
  const chosen = slots.find((s) => `${s.profissional_id}|${s.inicio}` === slot);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!chosen) return;
    const parsed = bookingSchema.safeParse({
      nome: name,
      telefone: phone,
      servicoId: service,
      profissionalId: chosen.profissional_id,
      inicio: chosen.inicio,
    });
    if (!parsed.success) {
      setError("Confira seu nome e WhatsApp com DDD e 9 dígitos.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      setResult(await book({ data: parsed.data }));
    } catch (e) {
      setError(erroMsg(e));
      void refetch();
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="min-h-dvh bg-background">
      <header className="border-b bg-card px-5 py-5">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <BrandLogo className="size-9" />
          <div className="min-w-0">
            <p className="truncate font-display text-3xl">{brand?.nome ?? c.nome}</p>
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              SEU MOMENTO DE CUIDADO
            </p>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-5 py-9 md:py-12">
        {result ? (
          <section className="mx-auto max-w-lg py-8">
            <span className="mb-6 flex size-16 items-center justify-center rounded-full bg-success/15 text-success">
              <Check className="size-8" />
            </span>
            <h1 className="font-display text-4xl">
              {result.confirmado ? "Seu horário está confirmado." : "Solicitação recebida!"}
            </h1>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {result.confirmado
                ? "Esperamos você para esse momento de cuidado."
                : "Seu horário está reservado e será confirmado pelo salão. Aguarde a confirmação antes de vir."}
            </p>
            <div className="my-7 space-y-3 border-y py-5 text-sm">
              <p className="font-semibold">{result.servico}</p>
              <p>{result.profissional}</p>
              <p>
                {fmtData(result.inicio)} · {horaLocal(result.inicio)} – {horaLocal(result.fim)}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setResult(null);
                setStep(0);
                setSlot("");
                void refetch();
              }}
            >
              Voltar ao agendamento
            </Button>
          </section>
        ) : (
          <>
            <p className="mb-3 text-xs uppercase tracking-[0.15em] text-muted-foreground">
              AGENDAMENTO ONLINE
            </p>
            <h1 className="font-display text-4xl md:text-5xl">Um tempo só para você.</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              {brand?.subtitulo || "Escolha seu cuidado e encontre o melhor horário."}
            </p>
            <div className="my-7 flex flex-wrap items-center gap-x-3 gap-y-2 border-b pb-5 text-xs">
              {["Seu cuidado", "Data e horário", "Seus dados"].map((label, i) => (
                <span
                  key={label}
                  className={`flex items-center gap-2 ${step === i ? "font-semibold text-primary" : "text-muted-foreground"}`}
                >
                  <span
                    className={`flex size-6 items-center justify-center rounded-full ${step >= i ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                  >
                    {i + 1}
                  </span>
                  {label}
                </span>
              ))}
            </div>
            {step === 0 && (
              <section>
                <h2 className="mb-4 text-2xl">O que vamos cuidar hoje?</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {c.servicos.map((s) => (
                    <Button
                      key={s.id}
                      variant="outline"
                      className={`h-auto min-h-24 justify-start whitespace-normal p-4 text-left ${service === s.id ? "border-primary bg-secondary" : "bg-card"}`}
                      onClick={() => {
                        setService(s.id);
                        setSlot("");
                        setProf("");
                      }}
                    >
                      <div className="w-full">
                        <div className="flex justify-between gap-3">
                          <span className="text-sm font-semibold">{s.nome}</span>
                          {service === s.id && <Check />}
                        </div>
                        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="size-3" />
                          {s.duracao_min} min
                          <span className="ml-auto font-semibold text-foreground">
                            {fmtBRL(s.preco)}
                          </span>
                        </p>
                      </div>
                    </Button>
                  ))}
                </div>
                {!c.servicos.length && (
                  <p className="text-sm text-muted-foreground">
                    Não há serviços disponíveis no momento.
                  </p>
                )}
                <div className="mt-6">
                  <SelectField
                    label="Profissional"
                    value={prof}
                    onChange={(e) => {
                      setProf(e.target.value);
                      setSlot("");
                    }}
                  >
                    <option value="">Qualquer profissional</option>
                    {c.profissionais
                      .filter((p) =>
                        c.vinculos.some((v) => v.servico_id === service && v.profissional_id === p.id),
                      )
                      .map((p) => (
                        <option value={p.id} key={p.id}>
                          {p.nome}
                        </option>
                      ))}
                  </SelectField>
                </div>
                <Button className="mt-6 h-12 w-full" disabled={!service} onClick={() => setStep(1)}>
                  Escolher horário
                  <ArrowRight />
                </Button>
              </section>
            )}
            {step === 1 && (
              <section>
                <div className="mb-5 border-b pb-4">
                  <p className="font-semibold">{serviceData?.nome}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {serviceData?.duracao_min} min · {fmtBRL(serviceData?.preco)}
                  </p>
                </div>
                <Field
                  label="Data"
                  type="date"
                  min={c.hoje}
                  max={addDias(c.hoje, c.diasMax)}
                  value={day}
                  onChange={(e) => {
                    setDay(e.target.value);
                    setSlot("");
                  }}
                />
                <h2 className="mb-4 mt-6 text-2xl">Horários disponíveis</h2>
                {isFetching ? (
                  <p className="text-sm text-muted-foreground">Consultando horários…</p>
                ) : slotsError ? (
                  <p role="alert" className="text-sm text-destructive">
                    Não foi possível consultar.{" "}
                    <Button variant="link" onClick={() => void refetch()}>
                      Tentar novamente
                    </Button>
                  </p>
                ) : !slots.length ? (
                  <p className="py-6 text-sm text-muted-foreground">
                    Não há horários livres nesta data. Escolha outro dia.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {slots.map((s) => {
                      const key = `${s.profissional_id}|${s.inicio}`;
                      return (
                        <Button
                          key={key}
                          className="h-auto min-h-16 flex-col py-3"
                          variant={slot === key ? "default" : "outline"}
                          onClick={() => setSlot(key)}
                        >
                          {horaLocal(s.inicio)}
                          {!prof && (
                            <span className="text-[10px] font-normal">
                              {s.profissional_nome.split(" ")[0]}
                            </span>
                          )}
                        </Button>
                      );
                    })}
                  </div>
                )}
                <div className="mt-7 flex gap-3">
                  <Button variant="outline" onClick={() => setStep(0)} aria-label="Voltar">
                    <ArrowLeft />
                  </Button>
                  <Button className="h-12 flex-1" disabled={!chosen} onClick={() => setStep(2)}>
                    Continuar
                    <ArrowRight />
                  </Button>
                </div>
              </section>
            )}
            {step === 2 && (
              <form onSubmit={submit} className="grid gap-5">
                <div className="border-y py-4 text-sm">
                  <p className="font-semibold">
                    {serviceData?.nome} · {fmtBRL(serviceData?.preco)}
                  </p>
                  <p className="mt-2 text-muted-foreground">{chosen?.profissional_nome}</p>
                  <p className="mt-2 flex items-center gap-2 text-muted-foreground">
                    <CalendarDays className="size-4" />
                    {fmtData(day)} · {chosen ? horaLocal(chosen.inicio) : ""}
                  </p>
                </div>
                <Field
                  label="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  minLength={2}
                  maxLength={100}
                  autoComplete="name"
                  required
                />
                <Field
                  label="WhatsApp com DDD"
                  value={phone}
                  onChange={(e) => setPhone(mascaraTelefone(e.target.value))}
                  placeholder="(11) 91234-5678"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                />
                {error && (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                )}
                <p className="text-xs leading-5 text-muted-foreground">
                  {c.autoConfirmar
                    ? "Seu horário será confirmado automaticamente se estiver disponível."
                    : "O salão confirmará seu horário após receber a solicitação."}
                </p>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" aria-label="Voltar" onClick={() => setStep(1)}>
                    <ArrowLeft />
                  </Button>
                  <Button className="h-12 flex-1" disabled={busy || !chosen}>
                    {busy
                      ? "Enviando…"
                      : c.autoConfirmar
                        ? "Confirmar agendamento"
                        : "Solicitar agendamento"}
                    <Check />
                  </Button>
                </div>
              </form>
            )}
          </>
        )}
        <footer className="mt-10 border-t pt-6 text-center text-xs text-muted-foreground">
          {c.nome} · Beleza nos detalhes.
        </footer>
      </div>
    </main>
  );
}
