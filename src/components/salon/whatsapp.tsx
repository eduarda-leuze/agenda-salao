import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  CircleDashed,
  Copy,
  MessageCircle,
  Pause,
  Play,
  RotateCcw,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Empty, PageTitle } from "./common";
import { supabase } from "@/integrations/supabase/client";
import { useSalon } from "@/lib/salon";
import { erroMsg, fmtDataHora, mascaraTelefone } from "@/lib/br";
import { simularRobo, statusIntegracao } from "@/lib/whatsapp.functions";

const conversasQuery = {
  queryKey: ["whatsapp", "conversas"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("whatsapp_conversas")
      .select("*")
      .order("atualizado_em", { ascending: false })
      .limit(200);
    if (error) throw error;
    return data ?? [];
  },
  refetchInterval: 15_000,
} as const;

const pausada = (ate: string | null) => !!ate && new Date(ate) > new Date();
const telBonito = (t: string) => mascaraTelefone(t.replace(/^55/, ""));

/** Aviso no painel quando há conversas pedindo atenção. */
export function WhatsAppAttention() {
  const { data = [] } = useQuery(conversasQuery);
  const n = data.filter((c) => c.precisa_atencao).length;
  if (!n) return null;
  return (
    <section className="mb-7 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/50 bg-warning/10 p-4">
      <p className="flex items-center gap-2 text-sm">
        <AlertTriangle className="size-4 text-warning" />
        {n === 1 ? "1 cliente pediu" : `${n} clientes pediram`} para falar com alguém no WhatsApp.
      </p>
      <Button asChild size="sm">
        <Link to="/whatsapp">Ver conversas</Link>
      </Button>
    </section>
  );
}

export function WhatsAppPage() {
  const d = useSalon();
  const qc = useQueryClient();
  const { data: conversas = [], isLoading } = useQuery(conversasQuery);
  const [sel, setSel] = useState<string | null>(null);
  const [tab, setTab] = useState<"conversas" | "teste">("conversas");
  const atual = conversas.find((c) => c.telefone === sel) ?? null;
  const { data: mensagens = [] } = useQuery({
    queryKey: ["whatsapp", "mensagens", sel],
    enabled: !!sel,
    refetchInterval: 10_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_mensagens")
        .select("*")
        .eq("telefone", sel ?? "")
        .order("criado_em", { ascending: true })
        .limit(300);
      if (error) throw error;
      return (data ?? []).filter((m) => m.texto);
    },
  });
  async function pausar(telefone: string, horas: number) {
    const { error } = await supabase
      .from("whatsapp_conversas")
      .update({
        pausado_ate: horas > 0 ? new Date(Date.now() + horas * 3600_000).toISOString() : null,
        precisa_atencao: false,
      })
      .eq("telefone", telefone);
    if (error) toast.error(erroMsg(error));
    else {
      toast.success(horas > 0 ? "Robô pausado nesta conversa." : "Robô retomado nesta conversa.");
      await qc.invalidateQueries({ queryKey: ["whatsapp"] });
    }
  }
  if (!d.isAdmin) return <Empty>Esta área é exclusiva da administradora.</Empty>;
  return (
    <>
      <PageTitle title="WhatsApp" subtitle="O robô atende, você acompanha." />
      <div className="mb-6 flex max-w-full overflow-x-auto border-b [&>*]:shrink-0">
        {(["conversas", "teste"] as const).map((t) => (
          <Button
            key={t}
            variant="ghost"
            className={`rounded-none ${tab === t ? "border-b-2 border-primary" : "text-muted-foreground"}`}
            onClick={() => setTab(t)}
          >
            {t === "conversas" ? "Conversas" : "Testar o robô"}
          </Button>
        ))}
      </div>
      {tab === "teste" ? (
        <Simulador />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
          <section className={`rounded-lg border bg-card ${sel ? "hidden lg:block" : ""}`}>
            {isLoading ? (
              <Empty>Carregando…</Empty>
            ) : !conversas.length ? (
              <Empty>
                Nenhuma conversa ainda. Quando as clientes escreverem no WhatsApp do salão, elas
                aparecem aqui.
              </Empty>
            ) : (
              <ul className="divide-y">
                {conversas.map((c) => (
                  <li key={c.telefone}>
                    <button
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted ${sel === c.telefone ? "bg-secondary" : ""}`}
                      onClick={() => setSel(c.telefone)}
                    >
                      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-accent font-display text-lg">
                        {(c.nome || "?").slice(0, 1)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {c.nome || telBonito(c.telefone)}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {telBonito(c.telefone)} · {fmtDataHora(c.atualizado_em)}
                        </span>
                      </span>
                      {c.precisa_atencao ? (
                        <AlertTriangle className="size-4 text-warning" aria-label="Precisa de atenção" />
                      ) : pausada(c.pausado_ate) ? (
                        <Pause className="size-4 text-muted-foreground" aria-label="Robô pausado" />
                      ) : (
                        <Bot className="size-4 text-success" aria-label="Robô ativo" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className={`min-w-0 rounded-lg border bg-card ${sel ? "" : "hidden lg:block"}`}>
            {!atual ? (
              <Empty>Escolha uma conversa para ver as mensagens.</Empty>
            ) : (
              <div className="flex h-full flex-col">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
                  <div className="min-w-0">
                    <Button variant="link" className="h-auto p-0 text-xs lg:hidden" onClick={() => setSel(null)}>
                      ← Voltar
                    </Button>
                    <p className="truncate font-semibold">{atual.nome || telBonito(atual.telefone)}</p>
                    <p className="text-xs text-muted-foreground">
                      {atual.precisa_atencao
                        ? "Pediu para falar com alguém — robô pausado"
                        : pausada(atual.pausado_ate)
                          ? `Robô pausado até ${fmtDataHora(atual.pausado_ate!)}`
                          : "Robô respondendo"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm">
                      <a href={`https://wa.me/${atual.telefone.replace(/\D/g, "").replace(/^(?!55)/, "55")}`} target="_blank" rel="noreferrer">
                        <MessageCircle />
                        Abrir no WhatsApp
                      </a>
                    </Button>
                    {pausada(atual.pausado_ate) || atual.precisa_atencao ? (
                      <Button size="sm" onClick={() => void pausar(atual.telefone, 0)}>
                        <Play />
                        Retomar robô
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => void pausar(atual.telefone, 24)}>
                        <Pause />
                        Pausar 24h
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex max-h-[60dvh] min-h-64 flex-col gap-2 overflow-y-auto bg-muted/50 p-4">
                  {mensagens.map((m) => (
                    <div
                      key={m.id}
                      className={`chat-bubble ${m.papel === "cliente" ? "self-start bg-card" : m.papel === "salao" ? "self-end bg-accent" : "self-end bg-success/15"}`}
                    >
                      <p className="mb-1 text-[10px] text-muted-foreground">
                        {m.papel === "cliente" ? "Cliente" : m.papel === "salao" ? "Salão (celular)" : "Robô"} ·{" "}
                        {fmtDataHora(m.criado_em)}
                      </p>
                      {m.texto}
                    </div>
                  ))}
                  {!mensagens.length && <Empty>Sem mensagens.</Empty>}
                </div>
                <p className="border-t p-3 text-xs text-muted-foreground">
                  Para responder, use o WhatsApp Business no celular. Quando você responde por lá, o
                  robô pausa sozinho nesta conversa por 12 horas.
                </p>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}

function Simulador() {
  const simular = useServerFn(simularRobo);
  const [historico, setHistorico] = useState<{ papel: "cliente" | "robo"; texto: string }[]>([]);
  const [acoes, setAcoes] = useState<string[][]>([]);
  const [texto, setTexto] = useState("");
  const [telefone, setTelefone] = useState("");
  const [busy, setBusy] = useState(false);
  const fim = useRef<HTMLDivElement>(null);
  useEffect(() => fim.current?.scrollIntoView({ block: "end" }), [historico]);
  const NOMES: Record<string, string> = {
    ver_horarios: "consultou horários livres",
    agendar: "agendaria (simulação)",
    meus_agendamentos: "consultou os agendamentos da cliente",
    cancelar_agendamento: "cancelaria (simulação)",
    chamar_atendente: "chamaria a equipe e pausaria (simulação)",
  };
  async function enviar(e: FormEvent) {
    e.preventDefault();
    const t = texto.trim();
    if (!t || busy) return;
    const novo = [...historico, { papel: "cliente" as const, texto: t }];
    setHistorico(novo);
    setTexto("");
    setBusy(true);
    try {
      const r = await simular({ data: { historico: novo, ...(telefone ? { telefone } : {}) } });
      setAcoes((a) => [...a, r.acoes]);
      if (r.resposta) setHistorico([...novo, { papel: "robo", texto: r.resposta }]);
    } catch (err) {
      setHistorico(historico);
      setTexto(t);
      toast.error(erroMsg(err));
    } finally {
      setBusy(false);
    }
  }
  let rodada = 0;
  return (
    <section className="max-w-2xl">
      <p className="mb-4 text-sm text-muted-foreground">
        Converse como se fosse uma cliente. Nada é enviado pelo WhatsApp e nenhum agendamento é
        gravado — o robô só consulta os horários livres de verdade.
      </p>
      <label className="field mb-4 max-w-xs">
        Telefone da cliente (opcional, para testar como cliente cadastrada)
        <input value={telefone} inputMode="tel" placeholder="+55 11 99123-4567" onChange={(e) => setTelefone(e.target.value)} />
      </label>
      <div className="flex min-h-72 flex-col gap-2 rounded-lg border bg-muted/50 p-4">
        {historico.map((m, i) => {
          const linhas = m.papel === "robo" ? (acoes[rodada++] ?? []) : [];
          return (
            <div key={i} className="contents">
              {linhas.map((a, j) => (
                <p key={j} className="self-center text-[11px] text-muted-foreground">
                  ⚙️ Robô {NOMES[a] ?? a}
                </p>
              ))}
              <div className={`chat-bubble ${m.papel === "cliente" ? "self-end bg-success/15" : "self-start bg-card"}`}>
                {m.texto}
              </div>
            </div>
          );
        })}
        {busy && <p className="self-start text-xs text-muted-foreground">Robô digitando…</p>}
        {!historico.length && !busy && <Empty>Escreva a primeira mensagem, por exemplo: "Oi, queria marcar unha amanhã".</Empty>}
        <div ref={fim} />
      </div>
      <form onSubmit={enviar} className="mt-3 flex gap-2">
        <input
          className="form-input flex-1"
          aria-label="Mensagem"
          placeholder="Escreva como a cliente…"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <Button className="h-11" disabled={busy || !texto.trim()}>
          <Send />
          <span className="hidden sm:inline">Enviar</span>
        </Button>
      </form>
      <Button
        variant="ghost"
        className="mt-2"
        onClick={() => {
          setHistorico([]);
          setAcoes([]);
        }}
      >
        <RotateCcw />
        Nova conversa
      </Button>
    </section>
  );
}

/** Seção em Configurações: liga/desliga o robô, informações para ele e status da conexão. */
export function WhatsAppSettings() {
  const qc = useQueryClient();
  const status = useServerFn(statusIntegracao);
  const { data: st } = useQuery({ queryKey: ["whatsapp", "status"], queryFn: () => status() });
  const { data: cfg } = useQuery({
    queryKey: ["whatsapp", "config"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bot_config").select("ativo, info_salao").eq("id", 1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const [ativo, setAtivo] = useState(true);
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (cfg) {
      setAtivo(cfg.ativo);
      setInfo(cfg.info_salao);
    }
  }, [cfg]);
  useEffect(() => setUrl(`${window.location.origin}/api/whatsapp`), []);
  async function salvar(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("bot_config").update({ ativo, info_salao: info }).eq("id", 1);
    setBusy(false);
    if (error) toast.error(erroMsg(error));
    else {
      toast.success("Robô do WhatsApp salvo.");
      await qc.invalidateQueries({ queryKey: ["whatsapp"] });
    }
  }
  const item = (ok: boolean, label: string, detalhe?: string | null) => (
    <li className="flex items-center gap-2 text-sm">
      {ok ? <CheckCircle2 className="size-4 text-success" /> : <CircleDashed className="size-4 text-muted-foreground" />}
      <span>{label}</span>
      {detalhe && <span className="text-xs text-muted-foreground">({detalhe})</span>}
    </li>
  );
  return (
    <form onSubmit={salvar} className="mb-10 grid max-w-2xl gap-6 border-b pb-10">
      <h2 className="text-2xl">Robô do WhatsApp</h2>
      <ul className="grid gap-2 rounded-lg border bg-card p-4">
        {item(!!st?.banco, "Ligação com a agenda")}
        {item(!!st?.ia, "Inteligência artificial", st?.ia)}
        {item(!!st?.birdChave && !!st?.birdNumero, "Número do WhatsApp (Bird)", st?.birdNumero)}
        {item(!!st?.birdSegredo, "Aviso de mensagens novas (webhook)")}
      </ul>
      <div className="grid gap-2 text-sm font-medium">
        Endereço do webhook (para colar no Bird)
        <div className="flex flex-wrap gap-2">
          <code className="min-w-0 flex-1 break-all rounded bg-muted px-3 py-2 text-xs">{url || "…"}</code>
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                toast.success("Endereço copiado.");
              } catch {
                toast.error(url);
              }
            }}
          >
            <Copy />
            Copiar
          </Button>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
        Robô respondendo as clientes no WhatsApp
      </label>
      <label className="field">
        Informações para o robô (endereço, formas de pagamento, políticas, perguntas frequentes)
        <textarea
          className="!h-48"
          value={info}
          onChange={(e) => setInfo(e.target.value)}
          maxLength={6000}
          placeholder={
            "Endereço: Rua ..., nº ..., bairro, cidade\nEstacionamento: ...\nFormas de pagamento: Pix, dinheiro, débito e crédito\nAtrasos: tolerância de 15 minutos\nCancelamento: avisar com 24h de antecedência"
          }
        />
      </label>
      <Button disabled={busy} className="h-11 w-fit">
        Salvar robô
      </Button>
    </form>
  );
}
