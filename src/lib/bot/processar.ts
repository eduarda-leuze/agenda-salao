// Processa cada evento que o Bird manda para o webhook /api/whatsapp.
import { createDb, type Db, type Env, type FetchLike } from "./db";
import { createBird, type Bird } from "./bird";
import { criarExecutor, historicoParaMensagens, responder } from "./atendente";
import { msgNovoPedido, msgConfirmadoPorCliente, msgCanceladoPorCliente, formatarTelefone } from "../notificacoes";

const EVENTOS_SAIDA = new Set(["whatsapp.accepted", "whatsapp.sent", "whatsapp.delivered"]);
const MSG_SO_TEXTO = "Oi! Por aqui eu consigo ler só mensagens de texto 😊 Pode me escrever o que você precisa?";
const MSG_ERRO =
  "Tive um probleminha para responder agora. Já avisei a equipe do salão e alguém vai te responder em breve.";

const esperarPadrao = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

type Endereco = { phone_number?: string; display_name?: string };
export type EventoBird = {
  type?: string;
  data?: {
    whatsapp_id?: string;
    direction?: string;
    origin?: string;
    from?: Endereco;
    to?: Endereco;
    text?: { body?: string };
    interactive?: Record<string, unknown>;
    interactive_reply?: Record<string, unknown>;
    button?: Record<string, unknown>;
    [k: string]: unknown;
  };
};

/** Extrai o texto de uma mensagem recebida (texto digitado ou toque em botão/lista). */
export function extrairTexto(data: EventoBird["data"]): string {
  if (data?.text?.body && String(data.text.body).trim()) return String(data.text.body).trim();
  const i = (data?.interactive || data?.interactive_reply || data?.button) as
    | { button_reply?: { title?: string }; list_reply?: { title?: string }; title?: string; text?: string; payload?: string }
    | undefined;
  const titulo = i?.button_reply?.title || i?.list_reply?.title || i?.title || i?.text || i?.payload;
  return titulo && String(titulo).trim() ? String(titulo).trim() : "";
}

type Deps = {
  env?: Env;
  db?: Pick<
    Db,
    "registrar" | "contexto" | "pausar" | "horarios" | "criar" | "meusAgendamentos" | "cancelar" | "proximoAgendamento" | "confirmarAgendamento"
  >;
  bird?: Bird;
  fetchImpl?: FetchLike;
  esperar?: (ms: number) => Promise<void>;
  log?: Pick<Console, "warn" | "error">;
};

export async function processarEvento(evento: EventoBird, webhookId: string | null, deps: Deps = {}) {
  const env = deps.env || process.env;
  const db = deps.db || createDb(env, deps.fetchImpl);
  const bird = deps.bird || createBird(env, deps.fetchImpl);
  const espera = deps.esperar || esperarPadrao;
  const log = deps.log || console;
  const data = evento?.data || {};

  // 1) Mensagem da cliente
  if (evento?.type === "whatsapp.received" && data.direction !== "outbound") {
    const tel = data.from?.phone_number;
    if (!tel) {
      log.warn("Mensagem sem número de telefone (usuário com username); ignorada.");
      return "sem-telefone";
    }
    const texto = extrairTexto(data);
    const registro = texto || "[mensagem sem texto]";
    const novo = await db.registrar(tel, data.from?.display_name, "cliente", registro, webhookId, data.whatsapp_id);
    if (!novo) return "duplicado";

    // Espera alguns segundos: se a cliente mandar várias mensagens seguidas, responde uma vez só.
    await espera(Number(env["DEBOUNCE_MS"] ?? 4000));
    const ctx = await db.contexto(tel);
    if (!ctx.robo_ativo) return "robo-desligado";
    if (ctx.conversa?.pausado) return "pausado";
    const ultima = (ctx.historico || [])[ctx.historico.length - 1];
    if (!ultima || ultima.papel !== "cliente" || ultima.texto !== registro) return "mensagem-mais-nova-assume";

    let resposta: string;
    if (!texto) {
      resposta = MSG_SO_TEXTO;
    } else if (texto === "1" || texto === "2") {
      // Confirmação ou cancelamento rápido via lembrete
      const proximo = await db.proximoAgendamento(tel).catch(() => null);
      const ag = proximo?.[0];
      if (ag) {
        const nomeCliente = ctx.cliente?.nome || "Cliente";
        if (texto === "1") {
          await db.confirmarAgendamento(tel, ag.id).catch(() => {});
          resposta = msgConfirmadoPorCliente(nomeCliente, ag.servico_nome, ag.inicio);
        } else {
          await db.cancelar(tel, ag.id).catch(() => {});
          resposta = msgCanceladoPorCliente(nomeCliente);
        }
        const ids = await bird.enviarTexto(formatarTelefone(tel), resposta);
        await db.registrar(tel, null, "robo", resposta, null, ids[0] || null);
        return texto === "1" ? "confirmado" : "cancelado";
      }
      // Sem agendamento futuro: cai no bot de IA abaixo
      try {
        const ownerPhone = env["OWNER_PHONE"];
        const executar = criarExecutor({
          db,
          telefone: tel,
          ctx,
          ...(ownerPhone
            ? {
                onAgendar: (info) => {
                  bird
                    .enviarTexto(formatarTelefone(ownerPhone), msgNovoPedido(info.nomeCliente, tel, info.servicoNome, info.profissionalNome, info.inicio))
                    .catch(() => {});
                },
              }
            : {}),
        });
        resposta = await responder({
          ctx,
          mensagens: historicoParaMensagens(ctx.historico),
          executar,
          env,
          ...(deps.fetchImpl ? { fetchImpl: deps.fetchImpl } : {}),
        });
      } catch (e) {
        log.error("Falha na IA:", e);
        resposta = MSG_ERRO;
        await db.pausar(tel, 12, true).catch(() => {});
      }
    } else {
      try {
        const ownerPhone = env["OWNER_PHONE"];
        const executar = criarExecutor({
          db,
          telefone: tel,
          ctx,
          ...(ownerPhone
            ? {
                onAgendar: (info) => {
                  bird
                    .enviarTexto(formatarTelefone(ownerPhone), msgNovoPedido(info.nomeCliente, tel, info.servicoNome, info.profissionalNome, info.inicio))
                    .catch(() => {});
                },
              }
            : {}),
        });
        resposta = await responder({
          ctx,
          mensagens: historicoParaMensagens(ctx.historico),
          executar,
          env,
          ...(deps.fetchImpl ? { fetchImpl: deps.fetchImpl } : {}),
        });
      } catch (e) {
        log.error("Falha na IA:", e);
        resposta = MSG_ERRO;
        await db.pausar(tel, 12, true).catch(() => {});
      }
    }
    if (!resposta) return "sem-resposta";
    const ids = await bird.enviarTexto(formatarTelefone(tel), resposta);
    await db.registrar(tel, null, "robo", resposta, null, ids[0] || null);
    for (const extra of ids.slice(1)) await db.registrar(tel, null, "robo", "", null, extra);
    return "respondido";
  }

  // 2) Mensagem que saiu do número do salão: se não foi o robô, foi alguém pelo app -> pausa o robô 12h.
  if (evento?.type && EVENTOS_SAIDA.has(evento.type) && data.direction === "outbound") {
    const tel = data.to?.phone_number;
    if (!tel || !data.whatsapp_id) return "ignorado";
    if (data.origin && data.origin !== "business_app_echo") return "ignorado";
    if (data.origin !== "business_app_echo") await espera(Number(env["ECHO_WAIT_MS"] ?? 3000));
    const texto = extrairTexto(data) || "(mensagem enviada pelo salão)";
    const novo = await db.registrar(tel, null, "salao", texto, webhookId, data.whatsapp_id);
    return novo ? "salao-respondeu" : "ja-registrado";
  }

  return "ignorado";
}
