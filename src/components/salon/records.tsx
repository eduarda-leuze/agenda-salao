import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Pencil, Search, ArrowRight } from "lucide-react";
import { Modal, PageTitle, Field, SelectField, Empty } from "./common";
import { useSalon } from "@/lib/salon";
import { supabase, createAnonClient } from "@/integrations/supabase/client";
import { fmtBRL, fmtData, mascaraTelefone, telefoneValido, erroMsg, DIAS, STATUS } from "@/lib/br";
import { toast } from "sonner";
import { BookingLinkCard, BrandSettings } from "./brand";
import { WhatsAppSettings } from "./whatsapp";
type RecordKind = "clientes" | "servicos" | "profissionais";
export function Records({ kind }: { kind: RecordKind }) {
  const d = useSalon();
  const [search, setSearch] = useState(""),
    [edit, setEdit] = useState<string | null>(null),
    [history, setHistory] = useState<string | null>(null),
    [access, setAccess] = useState<string | null>(null);
  const labels = {
    clientes: ["Clientes", "Relações que florescem a cada visita.", "Nova cliente"],
    servicos: ["Serviços", "Seu talento, em cada detalhe.", "Novo serviço"],
    profissionais: ["Profissionais", "Quem faz a beleza acontecer.", "Nova profissional"],
  };
  const label = labels[kind];
  const rows = (
    kind === "clientes" ? d.clients : kind === "servicos" ? d.services : d.professionals
  ).filter((r) => r.nome.toLowerCase().includes(search.toLowerCase()));
  if (!d.isAdmin) return <Empty>Esta área é exclusiva da administradora.</Empty>;
  return (
    <>
      <PageTitle
        title={label[0] ?? ""}
        subtitle={label[1] ?? ""}
        label={label[2] ?? "Adicionar"}
        action={() => setEdit("new")}
      />
      <div className="mb-5 flex flex-wrap gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
          <input
            className="form-input form-input-icon"
            aria-label="Buscar cadastro"
            placeholder="Buscar pelo nome"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {kind === "profissionais" && (
          <Button asChild variant="outline">
            <a href="/servicos">Serviços</a>
          </Button>
        )}
      </div>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              {kind === "clientes" ? (
                <>
                  <th>Telefone / WhatsApp</th>
                  <th>Total gasto</th>
                </>
              ) : kind === "servicos" ? (
                <>
                  <th>Categoria</th>
                  <th>Duração</th>
                  <th>Preço</th>
                </>
              ) : (
                <>
                  <th>Telefone</th>
                  <th>Comissão</th>
                  <th>Acesso</th>
                </>
              )}
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="font-medium">{r.nome}</td>
                {kind === "clientes" ? (
                  <>
                    <td>{d.clients.find((c) => c.id === r.id)?.telefone}</td>
                    <td>
                      {fmtBRL(
                        d.payments
                          .filter(
                            (p) =>
                              d.appointments.find((a) => a.id === p.agendamento_id)?.cliente_id ===
                              r.id,
                          )
                          .reduce((n, p) => n + p.valor_total, 0),
                      )}
                    </td>
                  </>
                ) : kind === "servicos" ? (
                  <>
                    <td>{d.services.find((s) => s.id === r.id)?.categoria}</td>
                    <td>{d.services.find((s) => s.id === r.id)?.duracao_min} min</td>
                    <td>{fmtBRL(d.services.find((s) => s.id === r.id)?.preco)}</td>
                  </>
                ) : (
                  <>
                    <td>{d.professionals.find((p) => p.id === r.id)?.telefone}</td>
                    <td>{d.professionals.find((p) => p.id === r.id)?.comissao_padrao}%</td>
                    <td>
                      {d.professionals.find((p) => p.id === r.id)?.user_id ? (
                        <span className="text-xs text-success">Vinculado</span>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setAccess(r.id)}>
                          Criar acesso
                        </Button>
                      )}
                    </td>
                  </>
                )}
                <td>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Editar ${r.nome}`}
                      onClick={() => setEdit(r.id)}
                    >
                      <Pencil />
                    </Button>
                    {kind === "clientes" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Histórico de ${r.nome}`}
                        onClick={() => setHistory(r.id)}
                      >
                        <ArrowRight />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <Empty>Nenhum cadastro encontrado.</Empty>}
      </div>
      {edit && <RecordForm kind={kind} id={edit} close={() => setEdit(null)} />}{" "}
      {history && (
        <Modal
          open
          title={`Histórico · ${d.clients.find((c) => c.id === history)?.nome}`}
          close={() => setHistory(null)}
        >
          <div className="grid gap-4">
            <p className="text-sm text-muted-foreground">
              {d.clients.find((c) => c.id === history)?.observacoes || "Sem observações."}
            </p>
            {d.appointments
              .filter((a) => a.cliente_id === history)
              .map((a) => (
                <div key={a.id} className="border-b pb-3 text-sm">
                  <p>
                    {fmtData(a.inicio)} · {STATUS[a.status].label}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {d.items
                      .filter((i) => i.agendamento_id === a.id)
                      .map((i) => d.services.find((s) => s.id === i.servico_id)?.nome)
                      .join(" + ")}
                  </p>
                  <p className="mt-2">
                    {fmtBRL(d.payments.find((p) => p.agendamento_id === a.id)?.valor_total)}
                  </p>
                </div>
              ))}
          </div>
        </Modal>
      )}
      {access && <AccessForm id={access} close={() => setAccess(null)} />}
    </>
  );
}
function RecordForm({ kind, id, close }: { kind: RecordKind; id: string; close: () => void }) {
  const d = useSalon();
  const qc = useQueryClient();
  const c = d.clients.find((c) => c.id === id),
    s = d.services.find((s) => s.id === id),
    p = d.professionals.find((p) => p.id === id);
  const [name, setName] = useState(c?.nome ?? s?.nome ?? p?.nome ?? ""),
    [phone, setPhone] = useState(c?.telefone ?? p?.telefone ?? ""),
    [birthday, setBirthday] = useState(c?.aniversario ?? ""),
    [notes, setNotes] = useState(c?.observacoes ?? ""),
    [category, setCategory] = useState(s?.categoria ?? "cabelo"),
    [duration, setDuration] = useState(s?.duracao_min ?? 60),
    [price, setPrice] = useState(s?.preco ?? 0),
    [commission, setCommission] = useState(String(s?.comissao_pct ?? p?.comissao_padrao ?? "")),
    [color, setColor] = useState(p?.cor ?? "#c98b8b"),
    [active, setActive] = useState(s?.ativo ?? p?.ativa ?? true),
    [assigned, setAssigned] = useState(
      d.assignments.filter((a) => a.servico_id === id).map((a) => a.profissional_id),
    ),
    [hours, setHours] = useState(
      DIAS.map((_, i) => {
        const h = d.hours.find((h) => h.profissional_id === id && h.dia_semana === i);
        return {
          day: i,
          enabled: !!h,
          start: h?.inicio.slice(0, 5) ?? "09:00",
          end: h?.fim.slice(0, 5) ?? "18:00",
        };
      }),
    ),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (kind === "clientes") {
        if (!telefoneValido(phone)) throw new Error("Informe um telefone brasileiro válido.");
        const value = {
          nome: name,
          telefone: phone,
          aniversario: birthday || null,
          observacoes: notes || null,
        };
        const r =
          id === "new"
            ? await supabase.from("clientes").insert(value)
            : await supabase.from("clientes").update(value).eq("id", id);
        if (r.error) throw r.error;
      } else if (kind === "servicos") {
        const value = {
          nome: name,
          categoria: category,
          duracao_min: duration,
          preco: price,
          comissao_pct: commission === "" ? null : Number(commission),
          ativo: active,
        };
        const r =
          id === "new"
            ? await supabase.from("servicos").insert(value).select("id").single()
            : await supabase.from("servicos").update(value).eq("id", id).select("id").single();
        if (r.error) throw r.error;
        if (r.data) {
          const del = await supabase
            .from("servico_profissionais")
            .delete()
            .eq("servico_id", r.data.id);
          if (del.error) throw del.error;
          if (assigned.length) {
            const a = await supabase
              .from("servico_profissionais")
              .insert(
                assigned.map((profissional_id) => ({ servico_id: r.data.id, profissional_id })),
              );
            if (a.error) throw a.error;
          }
        }
      } else {
        if (hours.some((h) => h.enabled && h.end <= h.start))
          throw new Error("Confira os horários de trabalho.");
        const value = {
          nome: name,
          telefone: phone,
          comissao_padrao: Number(commission || 40),
          cor: color,
          ativa: active,
        };
        const r =
          id === "new"
            ? await supabase.from("profissionais").insert(value).select("id").single()
            : await supabase.from("profissionais").update(value).eq("id", id).select("id").single();
        if (r.error) throw r.error;
        if (r.data) {
          const del = await supabase
            .from("horarios_profissional")
            .delete()
            .eq("profissional_id", r.data.id);
          if (del.error) throw del.error;
          const list = hours
            .filter((h) => h.enabled)
            .map((h) => ({
              profissional_id: r.data.id,
              dia_semana: h.day,
              inicio: h.start,
              fim: h.end,
            }));
          if (list.length) {
            const a = await supabase.from("horarios_profissional").insert(list);
            if (a.error) throw a.error;
          }
        }
      }
      toast.success("Cadastro salvo.");
      await qc.invalidateQueries({ queryKey: ["salon"] });
      close();
    } catch (e) {
      toast.error(erroMsg(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal open title={`${id === "new" ? "Novo cadastro" : "Editar cadastro"}`} close={close}>
      <form onSubmit={submit} className="grid gap-4">
        <Field label="Nome" value={name} onChange={(e) => setName(e.target.value)} required />
        {kind !== "servicos" && (
          <Field
            label="Telefone / WhatsApp"
            value={phone}
            onChange={(e) => setPhone(mascaraTelefone(e.target.value))}
            required={kind === "clientes"}
          />
        )}{" "}
        {kind === "clientes" && (
          <>
            <Field
              label="Data de aniversário"
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
            />
            <label className="field">
              Observações
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
          </>
        )}
        {kind === "servicos" && (
          <>
            <SelectField
              label="Categoria"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {["cabelo", "unhas", "estética"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </SelectField>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Duração (minutos)"
                type="number"
                min="1"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                required
              />
              <Field
                label="Preço (R$)"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                required
              />
            </div>
            <p className="text-xs font-medium">Profissionais que realizam</p>
            {d.professionals.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={assigned.includes(p.id)}
                  onChange={() =>
                    setAssigned(
                      assigned.includes(p.id)
                        ? assigned.filter((x) => x !== p.id)
                        : [...assigned, p.id],
                    )
                  }
                />
                {p.nome}
              </label>
            ))}
          </>
        )}
        {kind !== "clientes" && (
          <>
            <Field
              label={
                kind === "servicos"
                  ? "Comissão (%) · vazio usa a da profissional"
                  : "Comissão padrão (%)"
              }
              type="number"
              min="0"
              max="100"
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              Ativa
            </label>
          </>
        )}
        {kind === "profissionais" && (
          <>
            <label className="field">
              Cor na agenda
              <input
                type="color"
                aria-label="Cor na agenda"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </label>
            <p className="text-xs font-semibold">DIAS E HORÁRIOS DE TRABALHO</p>
            {hours.map((h, i) => (
              <div key={i} className="grid grid-cols-[1fr_90px_90px] items-center gap-2">
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={h.enabled}
                    onChange={(e) =>
                      setHours(
                        hours.map((x, j) => (j === i ? { ...x, enabled: e.target.checked } : x)),
                      )
                    }
                  />
                  {DIAS[i]}
                </label>
                <input
                  aria-label={`Início ${DIAS[i]}`}
                  className="form-input"
                  type="time"
                  disabled={!h.enabled}
                  value={h.start}
                  onChange={(e) =>
                    setHours(hours.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))
                  }
                />
                <input
                  aria-label={`Fim ${DIAS[i]}`}
                  className="form-input"
                  type="time"
                  disabled={!h.enabled}
                  value={h.end}
                  onChange={(e) =>
                    setHours(hours.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))
                  }
                />
              </div>
            ))}
          </>
        )}
        <Button disabled={busy}>Salvar cadastro</Button>
      </form>
    </Modal>
  );
}
/**
 * Cria o login da profissional: o cadastro é feito com um cliente sem sessão
 * (para não trocar o login da administradora) e depois vinculado por uma função
 * segura do banco que só a administradora pode chamar.
 */
function AccessForm({ id, close }: { id: string; close: () => void }) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const anon = createAnonClient();
      const { error: se } = await anon.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth` },
      });
      if (se) throw new Error("Não foi possível criar o acesso. Verifique se o e-mail já está cadastrado.");
      const { error } = await supabase.rpc("vincular_acesso_profissional", {
        p_profissional_id: id,
        p_email: email,
      });
      if (error) throw error;
      toast.success("Acesso criado. A profissional recebe um e-mail para confirmar a conta.");
      await qc.invalidateQueries({ queryKey: ["salon"] });
      close();
    } catch (e) {
      toast.error(erroMsg(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Criar acesso da profissional" open close={close}>
      <form onSubmit={submit} className="grid gap-4">
        <Field
          label="E-mail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Field
          label="Senha inicial"
          type="password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">
          A profissional deve confirmar o e-mail antes de entrar.
        </p>
        <Button disabled={busy}>Criar acesso</Button>
      </form>
    </Modal>
  );
}
export function Settings() {
  const d = useSalon();
  const qc = useQueryClient();
  const [name, setName] = useState(d.config?.nome ?? ""),
    [interval, setInterval] = useState(d.config?.intervalo_min ?? 0),
    [autoConfirm, setAutoConfirm] = useState(d.config?.online_auto_confirmar ?? false),
    [minHours, setMinHours] = useState(d.config?.online_antecedencia_horas ?? 2),
    [maxDays, setMaxDays] = useState(d.config?.online_dias_max ?? 30),
    [hours, setHours] = useState(d.salonHours),
    [busy, setBusy] = useState(false);
  if (!d.isAdmin) return <Empty>Esta área é exclusiva da administradora.</Empty>;
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (hours.some((h) => h.aberto && h.fim <= h.inicio))
        throw new Error("Confira os horários de funcionamento.");
      const a = await supabase
        .from("salao_config")
        .update({
          nome: name,
          intervalo_min: interval,
          online_auto_confirmar: autoConfirm,
          online_antecedencia_horas: minHours,
          online_dias_max: maxDays,
        })
        .eq("id", 1);
      if (a.error) throw a.error;
      const b = await supabase.from("horarios_salao").upsert(hours);
      if (b.error) throw b.error;
      toast.success("Configurações salvas.");
      await qc.invalidateQueries({ queryKey: ["salon"] });
    } catch (e) {
      toast.error(erroMsg(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle title="Configurações" subtitle="O ritmo e a identidade do seu salão." />
      <div className="mb-6 flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <a href="/profissionais">Profissionais</a>
        </Button>
        <Button asChild variant="outline">
          <a href="/servicos">Serviços</a>
        </Button>
        <Button asChild variant="outline">
          <a href="/comissoes">Comissões</a>
        </Button>
        <Button asChild variant="outline">
          <a href="/whatsapp">WhatsApp</a>
        </Button>
      </div>
      <BookingLinkCard />
      <BrandSettings config={d.config} />
      <WhatsAppSettings />
      <form onSubmit={submit} className="grid max-w-2xl gap-6">
        <Field
          label="Nome do salão"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Field
          label="Intervalo entre atendimentos (minutos)"
          type="number"
          min="0"
          max="120"
          value={interval}
          onChange={(e) => setInterval(Number(e.target.value))}
        />
        <h2 className="text-2xl">Agendamento online</h2>
        <p className="-mt-3 text-xs text-muted-foreground">
          Regras da página pública de agendamento (link em /agendar) e do robô do WhatsApp.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={autoConfirm}
            onChange={(e) => setAutoConfirm(e.target.checked)}
          />
          Confirmar automaticamente agendamentos online
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Antecedência mínima (horas)"
            type="number"
            min="0"
            max="72"
            value={minHours}
            onChange={(e) => setMinHours(Number(e.target.value))}
          />
          <Field
            label="Agendar até quantos dias à frente"
            type="number"
            min="1"
            max="90"
            value={maxDays}
            onChange={(e) => setMaxDays(Number(e.target.value))}
          />
        </div>
        <h2 className="text-2xl">Horário de funcionamento</h2>
        {hours.map((h, i) => (
          <div
            key={h.dia_semana}
            className="grid grid-cols-[minmax(0,1fr)_92px_92px] items-center gap-2 border-b pb-3 sm:gap-3"
          >
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={h.aberto}
                onChange={(e) =>
                  setHours(hours.map((x, j) => (j === i ? { ...x, aberto: e.target.checked } : x)))
                }
              />
              {DIAS[h.dia_semana]}
            </label>
            <input
              className="form-input"
              aria-label={`Abertura ${DIAS[h.dia_semana]}`}
              type="time"
              disabled={!h.aberto}
              value={h.inicio.slice(0, 5)}
              onChange={(e) =>
                setHours(hours.map((x, j) => (j === i ? { ...x, inicio: e.target.value } : x)))
              }
            />
            <input
              className="form-input"
              aria-label={`Fechamento ${DIAS[h.dia_semana]}`}
              type="time"
              disabled={!h.aberto}
              value={h.fim.slice(0, 5)}
              onChange={(e) =>
                setHours(hours.map((x, j) => (j === i ? { ...x, fim: e.target.value } : x)))
              }
            />
          </div>
        ))}
        <Button disabled={busy} className="w-fit">
          Salvar configurações
        </Button>
      </form>
    </>
  );
}
