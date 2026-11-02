import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Field, SelectField, Modal, PageTitle, Metric, Empty } from "./common";
import { useSalon } from "@/lib/salon";
import {
  fmtBRL,
  dataLocal,
  FORMAS,
  CATEGORIAS_DESPESA,
  fmtData,
  erroMsg,
  type Forma,
} from "@/lib/br";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
export function Finance({
  date,
  from,
  to,
  tab,
}: {
  date: string;
  from: string;
  to: string;
  tab: "caixa" | "despesas" | "relatorio";
}) {
  const d = useSalon();
  const navigate = useNavigate();
  const [expense, setExpense] = useState(false);
  if (!d.isAdmin) return <Empty>Esta área é exclusiva da administradora.</Empty>;
  const payments = d.payments.filter((p) => {
    const day = dataLocal(p.pago_em);
    return tab === "caixa" ? day === date : day >= from && day <= to;
  });
  const expenses = d.expenses.filter((e) =>
    tab === "caixa" ? e.data === date : e.data >= from && e.data <= to,
  );
  const revenue = payments.reduce((n, p) => n + p.valor_total, 0);
  const costs = expenses.reduce((n, e) => n + e.valor, 0);
  const methods = d.paymentMethods.filter((f) => payments.some((p) => p.id === f.pagamento_id));
  function update(values: Partial<{ date: string; from: string; to: string; tab: typeof tab }>) {
    void navigate({ to: "/financeiro", search: { date, from, to, tab, ...values } });
  }
  const services = d.services
    .map((s) => ({
      s,
      count: d.items.filter(
        (i) => i.servico_id === s.id && payments.some((p) => p.agendamento_id === i.agendamento_id),
      ).length,
    }))
    .filter((s) => s.count)
    .sort((a, b) => b.count - a.count);
  return (
    <>
      <PageTitle
        title="Financeiro"
        subtitle="Clareza para o seu salão crescer."
        action={() => setExpense(true)}
        label="Nova despesa"
      />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-full overflow-x-auto border-b [&>*]:shrink-0">
          {(["caixa", "despesas", "relatorio"] as const).map((t) => (
            <Button
              key={t}
              variant="ghost"
              className={`rounded-none ${tab === t ? "border-b-2 border-primary" : "text-muted-foreground"}`}
              onClick={() => update({ tab: t })}
            >
              {t === "caixa" ? "Caixa do dia" : t === "despesas" ? "Despesas" : "Relatório do mês"}
            </Button>
          ))}
        </div>
        {tab === "caixa" ? (
          <Field
            label="Dia"
            type="date"
            value={date}
            onChange={(e) => update({ date: e.target.value })}
          />
        ) : (
          <div className="flex gap-3">
            <Field
              label="De"
              type="date"
              value={from}
              onChange={(e) => update({ from: e.target.value })}
            />
            <Field
              label="Até"
              type="date"
              value={to}
              onChange={(e) => update({ to: e.target.value })}
            />
          </div>
        )}
      </div>
      <div className="mb-7 grid gap-4 sm:grid-cols-3">
        <Metric label="ENTRADAS" value={fmtBRL(revenue)} />
        <Metric label="SAÍDAS" value={fmtBRL(costs)} />
        <Metric
          label={tab === "caixa" ? "SALDO DO DIA" : "LUCRO DO PERÍODO"}
          value={fmtBRL(revenue - costs)}
        />
      </div>
      {tab !== "despesas" && (
        <>
          <h2 className="mb-4 text-2xl">Recebimentos por forma de pagamento</h2>
          <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Object.entries(FORMAS).map(([k, label]) => (
              <Metric
                key={k}
                label={label}
                value={fmtBRL(
                  methods.filter((f) => f.forma === k).reduce((n, f) => n + f.valor, 0),
                )}
              />
            ))}
          </div>
        </>
      )}
      {tab === "relatorio" && (
        <>
          <div className="mb-7 grid gap-5 lg:grid-cols-2">
            <section>
              <h2 className="mb-4 text-2xl">Serviços mais vendidos</h2>
              {services.map(({ s, count }) => (
                <div key={s.id} className="flex justify-between border-b py-3 text-sm">
                  <span>{s.nome}</span>
                  <span>{count} atendimentos</span>
                </div>
              ))}
              {!services.length && <Empty>Sem serviços pagos neste período.</Empty>}
            </section>
            <section>
              <h2 className="mb-4 text-2xl">Resultado por profissional</h2>
              {d.professionals.map((p) => (
                <div className="border-b py-3" key={p.id}>
                  <p className="text-sm font-medium">{p.nome}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Faturamento{" "}
                    {fmtBRL(
                      payments
                        .filter(
                          (pay) =>
                            d.appointments.find((a) => a.id === pay.agendamento_id)
                              ?.profissional_id === p.id,
                        )
                        .reduce((n, p) => n + p.valor_total, 0),
                    )}{" "}
                    · Comissão{" "}
                    {fmtBRL(
                      d.commissions
                        .filter(
                          (c) =>
                            c.profissional_id === p.id &&
                            dataLocal(c.data) >= from &&
                            dataLocal(c.data) <= to,
                        )
                        .reduce((n, c) => n + c.valor, 0),
                    )}
                  </p>
                </div>
              ))}
            </section>
          </div>
          <Metric
            label="TICKET MÉDIO"
            value={fmtBRL(payments.length ? revenue / payments.length : 0)}
          />
        </>
      )}
      {tab !== "relatorio" && (
        <>
          <h2 className="mb-4 text-2xl">
            {tab === "caixa" ? "Saídas do dia" : "Despesas do período"}
          </h2>
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Forma</th>
                  <th>Valor</th>
                  <th>Recorrente</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td>{fmtData(e.data)}</td>
                    <td>{e.descricao}</td>
                    <td>{CATEGORIAS_DESPESA[e.categoria]}</td>
                    <td>{FORMAS[e.forma]}</td>
                    <td>{fmtBRL(e.valor)}</td>
                    <td>{e.recorrente ? "Mensal" : "Não"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!expenses.length && <Empty>Nenhuma despesa neste período.</Empty>}
          </div>
        </>
      )}
      {expense && <ExpenseForm close={() => setExpense(false)} />}
    </>
  );
}
function ExpenseForm({ close }: { close: () => void }) {
  const qc = useQueryClient();
  const [description, setDescription] = useState(""),
    [category, setCategory] =
      useState<Database["public"]["Enums"]["categoria_despesa"]>("produtos"),
    [amount, setAmount] = useState(""),
    [day, setDay] = useState(dataLocal()),
    [method, setMethod] = useState<Forma>("pix"),
    [recurring, setRecurring] = useState(false),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("despesas").insert({
      descricao: description,
      categoria: category,
      valor: Number(amount),
      data: day,
      forma: method,
      recorrente: recurring,
    });
    setBusy(false);
    if (error) toast.error(erroMsg(error));
    else {
      toast.success("Despesa registrada.");
      await qc.invalidateQueries({ queryKey: ["salon"] });
      close();
    }
  }
  return (
    <Modal title="Nova despesa" open close={close}>
      <form onSubmit={submit} className="grid gap-4">
        <Field
          label="Descrição"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
        <SelectField
          label="Categoria"
          value={category}
          onChange={(e) => setCategory(e.target.value as typeof category)}
        >
          {Object.entries(CATEGORIAS_DESPESA).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </SelectField>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Valor (R$)"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <Field
            label="Data"
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            required
          />
        </div>
        <SelectField
          label="Forma de pagamento"
          value={method}
          onChange={(e) => setMethod(e.target.value as Forma)}
        >
          {Object.entries(FORMAS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </SelectField>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={recurring}
            onChange={(e) => setRecurring(e.target.checked)}
          />
          Recorrente mensal
        </label>
        <Button disabled={busy}>Registrar despesa</Button>
      </form>
    </Modal>
  );
}
export function Commissions({ from, to }: { from: string; to: string }) {
  const d = useSalon();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const rows = d.commissions.filter(
    (c) =>
      dataLocal(c.data) >= from &&
      dataLocal(c.data) <= to &&
      (d.isAdmin || c.profissional_id === d.ownId),
  );
  async function paid(ids: string[]) {
    if (!ids.length) return;
    setBusy(true);
    const { error } = await supabase
      .from("comissoes")
      .update({ paga: true, paga_em: new Date().toISOString() })
      .in("id", ids);
    setBusy(false);
    if (error) toast.error(erroMsg(error));
    else {
      toast.success("Comissões marcadas como pagas.");
      await qc.invalidateQueries({ queryKey: ["salon"] });
    }
  }
  return (
    <>
      <PageTitle title="Comissões" subtitle="O reconhecimento de cada cuidado." />
      <div className="mb-7 flex flex-wrap gap-3">
        <Field
          label="De"
          type="date"
          value={from}
          onChange={(e) =>
            void navigate({ to: "/comissoes", search: { from: e.target.value, to } })
          }
        />
        <Field
          label="Até"
          type="date"
          value={to}
          onChange={(e) =>
            void navigate({ to: "/comissoes", search: { from, to: e.target.value } })
          }
        />
      </div>
      <div className="mb-7 grid gap-4 sm:grid-cols-3">
        <Metric label="TOTAL DO PERÍODO" value={fmtBRL(rows.reduce((n, c) => n + c.valor, 0))} />
        <Metric
          label="A RECEBER"
          value={fmtBRL(rows.filter((c) => !c.paga).reduce((n, c) => n + c.valor, 0))}
        />
        <Metric
          label="JÁ PAGO"
          value={fmtBRL(rows.filter((c) => c.paga).reduce((n, c) => n + c.valor, 0))}
        />
      </div>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Profissional</th>
              <th>Comissão do período</th>
              <th>A receber</th>
              {d.isAdmin && <th />}
            </tr>
          </thead>
          <tbody>
            {d.professionals
              .filter((p) => d.isAdmin || p.id === d.ownId)
              .map((p) => {
                const own = rows.filter((c) => c.profissional_id === p.id);
                const unpaid = own.filter((c) => !c.paga);
                return (
                  <tr key={p.id}>
                    <td>{p.nome}</td>
                    <td>{fmtBRL(own.reduce((n, c) => n + c.valor, 0))}</td>
                    <td>{fmtBRL(unpaid.reduce((n, c) => n + c.valor, 0))}</td>
                    {d.isAdmin && (
                      <td>
                        <Button
                          variant="outline"
                          disabled={busy || !unpaid.length}
                          onClick={() => void paid(unpaid.map((c) => c.id))}
                        >
                          <Check />
                          Marcar como pago
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </>
  );
}
