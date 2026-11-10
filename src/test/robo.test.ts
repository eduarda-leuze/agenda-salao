import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { verificarAssinatura, dividirTexto } from "@/lib/bot/bird";
import { calendario, historicoParaMensagens, montarInstrucoes } from "@/lib/bot/atendente";
import { processarEvento, extrairTexto, type EventoBird } from "@/lib/bot/processar";
import { conversar } from "@/lib/bot/ia";
import type { Contexto } from "@/lib/bot/db";

const SEGREDO = "whsec_" + Buffer.from("segredo-de-teste-123").toString("base64");
function assinar(raw: string, id = "msg_1", ts = Math.floor(Date.now() / 1000)) {
  const chave = Buffer.from(SEGREDO.slice(6), "base64");
  const sig = createHmac("sha256", chave).update(`${id}.${ts}.${raw}`).digest("base64");
  return { "webhook-id": id, "webhook-timestamp": String(ts), "webhook-signature": `v1,${sig}` };
}

describe("Bird", () => {
  it("assinatura válida, inválida e antiga", () => {
    const raw = '{"type":"whatsapp.received"}';
    expect(verificarAssinatura(raw, assinar(raw), SEGREDO)).toBe(true);
    expect(verificarAssinatura(raw + " ", assinar(raw), SEGREDO)).toBe(false);
    expect(verificarAssinatura(raw, assinar(raw, "m", Math.floor(Date.now() / 1000) - 1000), SEGREDO)).toBe(false);
    expect(verificarAssinatura(raw, assinar(raw), undefined)).toBe(false);
    const h = assinar(raw);
    h["webhook-signature"] = "v1,AAAA " + h["webhook-signature"];
    expect(verificarAssinatura(raw, new Headers(h), SEGREDO)).toBe(true);
  });
  it("divide textos longos", () => {
    const partes = dividirTexto("a ".repeat(3000), 4096);
    expect(partes.length).toBe(2);
    expect(partes.every((p) => p.length <= 4096)).toBe(true);
  });
});

describe("atendente", () => {
  it("calendário usa o fuso de São Paulo", () => {
    const cal = calendario(new Date("2026-10-27T01:30:00Z"), 2).split("\n");
    expect(cal[0]).toBe("segunda 26/10 = 2026-10-26 (hoje)");
    expect(cal[1]).toBe("terça 27/10 = 2026-10-27 (amanhã)");
  });
  it("histórico vira mensagens alternadas e termina na cliente", () => {
    const m = historicoParaMensagens([
      { papel: "robo", texto: "olá" },
      { papel: "cliente", texto: "oi" },
      { papel: "cliente", texto: "quero manicure" },
      { papel: "salao", texto: "pode vir às 10" },
      { papel: "cliente", texto: "ok" },
    ]);
    expect(m.map((x) => x.role)).toEqual(["user", "assistant", "user"]);
    expect(m[0]!.content).toBe("oi\nquero manicure");
    expect(m[1]!.content).toMatch(/^\[Equipe do salão\]/);
    expect(historicoParaMensagens([{ papel: "cliente", texto: "oi" }, { papel: "robo", texto: "olá" }])).toEqual([]);
  });
  it("extrai texto de mensagens e botões", () => {
    expect(extrairTexto({ text: { body: " oi " } })).toBe("oi");
    expect(extrairTexto({ interactive: { button_reply: { title: "Sim" } } })).toBe("Sim");
    expect(extrairTexto({ audio: {} })).toBe("");
  });
});

const CTX: Contexto = {
  nome: "Studio Teste",
  antecedenciaHoras: 2,
  diasMax: 30,
  robo_ativo: true,
  info_salao: "Rua das Flores, 10",
  servicos: [{ id: "s1", nome: "Manicure", preco: 35, duracao_min: 45 }],
  profissionais: [{ id: "p1", nome: "Camila" }],
  vinculos: [{ servico_id: "s1", profissional_id: "p1" }],
  horario_funcionamento: [{ dia_semana: 2, aberto: true, inicio: "09:00", fim: "19:00" }],
  cliente: null,
  conversa: { pausado: false },
  historico: [],
};

it("instruções trazem serviços, preço e regras", () => {
  const s = montarInstrucoes(CTX, new Date("2026-10-26T14:00:00Z"));
  expect(s).toMatch(/Manicure \| R\$\s?35,00 \| 45 min \| quem faz: Camila/);
  expect(s).toMatch(/pergunte o nome completo/);
  expect(s).toMatch(/Rua das Flores/);
});

type Resp = Record<string, unknown> | Error;
function mocks({ ctx = CTX, historico = [] as Contexto["historico"], registrarRetorno = true, ia = [] as Resp[] } = {}) {
  const ch = { registrar: [] as unknown[][], enviar: [] as string[][], pausar: [] as unknown[][], horarios: [] as unknown[][], ultimaIA: null as null | { messages: { role: string }[] } };
  const db = {
    registrar: async (...a: unknown[]) => { ch.registrar.push(a); return registrarRetorno; },
    contexto: async () => ({ ...ctx, historico }),
    pausar: async (...a: unknown[]) => { ch.pausar.push(a); return null; },
    horarios: async (...a: unknown[]) => { ch.horarios.push(a); return [{ profissional_id: "p1", profissional: "Camila", inicio: "2026-10-27T13:00:00+00:00", hora: "10:00" }]; },
    criar: async () => ({ confirmado: true }),
    meusAgendamentos: async () => [],
    cancelar: async () => ({ cancelado: true }),
    proximoAgendamento: async () => [],
    confirmarAgendamento: async () => null,
  };
  const bird = { enviarTexto: async (to: string, t: string) => { ch.enviar.push([to, t]); return ["wam_robo_1"]; } };
  const fila = [...ia];
  const fetchImpl = (async (_url: string, init: RequestInit) => {
    ch.ultimaIA = JSON.parse(String(init.body));
    const r = fila.shift();
    if (r instanceof Error) return { ok: false, status: 500, json: async () => ({ erro: r.message }) };
    return { ok: true, status: 200, json: async () => r };
  }) as unknown as typeof fetch;
  const deps = { db, bird, fetchImpl, env: { ANTHROPIC_API_KEY: "x", DEBOUNCE_MS: "0", ECHO_WAIT_MS: "0" }, esperar: async () => {}, log: { warn() {}, error() {} } };
  return { ch, deps };
}
const recebida = (texto = "quero marcar manicure amanhã"): EventoBird => ({
  type: "whatsapp.received",
  data: { whatsapp_id: "wam_in_1", direction: "inbound", from: { phone_number: "+5511999990001", display_name: "Maria" }, to: { phone_number: "+5511900000000" }, text: { body: texto } },
});

describe("webhook do WhatsApp", () => {
  it("consulta horários com a IA e responde pelo WhatsApp", async () => {
    const { ch, deps } = mocks({
      historico: [{ papel: "cliente", texto: "quero marcar manicure amanhã" }],
      ia: [
        { stop_reason: "tool_use", content: [{ type: "tool_use", id: "t1", name: "ver_horarios", input: { data: "2026-10-27", servico_id: "s1" } }] },
        { stop_reason: "end_turn", content: [{ type: "text", text: "Tenho amanhã às 10:00 com a Camila. Pode ser?" }] },
      ],
    });
    expect(await processarEvento(recebida(), "whk_1", deps)).toBe("respondido");
    expect(ch.horarios[0]).toEqual(["2026-10-27", "s1", undefined]);
    expect(ch.enviar[0]).toEqual(["+5511999990001", "Tenho amanhã às 10:00 com a Camila. Pode ser?"]);
    const ultimo = ch.registrar.at(-1)!;
    expect([ultimo[2], ultimo[5]]).toEqual(["robo", "wam_robo_1"]);
  });
  it("evento repetido não responde de novo", async () => {
    const { ch, deps } = mocks({ registrarRetorno: false });
    expect(await processarEvento(recebida(), "whk_1", deps)).toBe("duplicado");
    expect(ch.enviar.length).toBe(0);
  });
  it("conversa pausada não responde", async () => {
    const { ch, deps } = mocks({ ctx: { ...CTX, conversa: { pausado: true } }, historico: [{ papel: "cliente", texto: "oi" }] });
    expect(await processarEvento(recebida("oi"), "whk_2", deps)).toBe("pausado");
    expect(ch.enviar.length).toBe(0);
  });
  it("robô desligado não responde", async () => {
    const { deps } = mocks({ ctx: { ...CTX, robo_ativo: false }, historico: [{ papel: "cliente", texto: "oi" }] });
    expect(await processarEvento(recebida("oi"), "whk_2b", deps)).toBe("robo-desligado");
  });
  it("várias mensagens seguidas: só a última responde", async () => {
    const { ch, deps } = mocks({ historico: [{ papel: "cliente", texto: "oi" }, { papel: "cliente", texto: "tudo bem?" }] });
    expect(await processarEvento(recebida("oi"), "whk_3", deps)).toBe("mensagem-mais-nova-assume");
    expect(ch.enviar.length).toBe(0);
  });
  it("áudio ou imagem: pede texto sem chamar a IA", async () => {
    const { ch, deps } = mocks({ historico: [{ papel: "cliente", texto: "[mensagem sem texto]" }] });
    const ev = recebida();
    delete ev.data!.text;
    expect(await processarEvento(ev, "whk_4", deps)).toBe("respondido");
    expect(ch.enviar[0]![1]).toMatch(/só mensagens de texto/);
  });
  it("falha da IA: avisa a cliente e chama a equipe", async () => {
    const { ch, deps } = mocks({ historico: [{ papel: "cliente", texto: "oi" }], ia: [new Error("fora do ar")] });
    expect(await processarEvento(recebida("oi"), "whk_5", deps)).toBe("respondido");
    expect(ch.enviar[0]![1]).toMatch(/avisei a equipe/);
    expect(ch.pausar[0]).toEqual(["+5511999990001", 12, true]);
  });
  it("resposta do salão pelo app pausa o robô", async () => {
    const { ch, deps } = mocks();
    const ev: EventoBird = { type: "whatsapp.sent", data: { whatsapp_id: "wam_app_1", direction: "outbound", origin: "business_app_echo", to: { phone_number: "+5511999990001" } } };
    expect(await processarEvento(ev, "whk_6", deps)).toBe("salao-respondeu");
    expect(ch.registrar[0]![2]).toBe("salao");
  });
  it("mensagem enviada pelo próprio robô não pausa", async () => {
    const { deps } = mocks({ registrarRetorno: false });
    const ev: EventoBird = { type: "whatsapp.delivered", data: { whatsapp_id: "wam_robo_1", direction: "outbound", to: { phone_number: "+5511999990001" } } };
    expect(await processarEvento(ev, "whk_7", deps)).toBe("ja-registrado");
  });
});

it("também funciona com OpenAI", async () => {
  const fila = [
    { choices: [{ message: { role: "assistant", content: null, tool_calls: [{ id: "c1", type: "function", function: { name: "meus_agendamentos", arguments: "{}" } }] } }] },
    { choices: [{ message: { role: "assistant", content: "Você não tem horários marcados." } }] },
  ];
  const fetchImpl = (async () => ({ ok: true, json: async () => fila.shift() })) as unknown as typeof fetch;
  const chamadas: string[] = [];
  const r = await conversar({
    sistema: "s",
    mensagens: [{ role: "user", content: "tenho horário?" }],
    ferramentas: [{ name: "meus_agendamentos", description: "d", input_schema: { type: "object", properties: {} } }],
    executar: async (n) => { chamadas.push(n); return []; },
    env: { OPENAI_API_KEY: "k" },
    fetchImpl,
  });
  expect(r).toBe("Você não tem horários marcados.");
  expect(chamadas).toEqual(["meus_agendamentos"]);
});
