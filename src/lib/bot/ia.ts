// Camada de IA: fala com Claude (Anthropic) ou OpenAI, com o mesmo formato de ferramentas.
// Se houver ANTHROPIC_API_KEY usa Claude; senão, se houver OPENAI_API_KEY usa OpenAI.
import type { Env, FetchLike } from "./db";

export type Ferramenta = { name: string; description: string; input_schema: Record<string, unknown> };
export type Mensagem = { role: "user" | "assistant"; content: string };
export type Executor = (nome: string, args: Record<string, unknown>) => Promise<unknown>;

export function escolherProvedor(env: Env = process.env) {
  if (env["ANTHROPIC_API_KEY"]) return { nome: "anthropic" as const, modelo: env["AI_MODEL"] || "claude-haiku-5-5" };
  if (env["OPENAI_API_KEY"]) return { nome: "openai" as const, modelo: env["AI_MODEL"] || "gpt-4.1-mini" };
  throw new Error("Configure ANTHROPIC_API_KEY ou OPENAI_API_KEY.");
}

type Params = {
  sistema: string;
  mensagens: Mensagem[];
  ferramentas: Ferramenta[];
  executar: Executor;
  env?: Env;
  fetchImpl?: FetchLike;
  maxPassos?: number;
};

export async function conversar({ env = process.env, fetchImpl = fetch, maxPassos = 8, ...p }: Params): Promise<string> {
  const prov = escolherProvedor(env);
  return prov.nome === "anthropic"
    ? conversarAnthropic(prov.modelo, p, env, fetchImpl, maxPassos)
    : conversarOpenAI(prov.modelo, p, env, fetchImpl, maxPassos);
}

async function rodarFerramenta(executar: Executor, nome: string, args: Record<string, unknown>) {
  try {
    return { ok: true, resultado: await executar(nome, args || {}) };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : String(e) };
  }
}

type Bloco = { type: string; id?: string; name?: string; input?: Record<string, unknown>; text?: string };

async function conversarAnthropic(
  modelo: string,
  { sistema, mensagens, ferramentas, executar }: Omit<Params, "env" | "fetchImpl" | "maxPassos">,
  env: Env,
  fetchImpl: FetchLike,
  maxPassos: number,
) {
  const msgs: { role: string; content: unknown }[] = mensagens.map((m) => ({ role: m.role, content: m.content }));
  for (let passo = 0; passo < maxPassos; passo++) {
    const res = await fetchImpl("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": env["ANTHROPIC_API_KEY"]!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({ model: modelo, max_tokens: 1024, system: sistema, tools: ferramentas, messages: msgs }),
    });
    const data = (await res.json()) as { content?: Bloco[]; stop_reason?: string };
    if (!res.ok) throw new Error(`Erro da IA (${res.status}): ${JSON.stringify(data).slice(0, 300)}`);
    const blocos = data.content || [];
    const usos = blocos.filter((b) => b.type === "tool_use");
    if (!usos.length || data.stop_reason !== "tool_use") {
      return blocos
        .filter((b) => b.type === "text")
        .map((b) => b.text ?? "")
        .join("\n")
        .trim();
    }
    msgs.push({ role: "assistant", content: blocos });
    const resultados = [];
    for (const u of usos) {
      const r = await rodarFerramenta(executar, u.name ?? "", u.input ?? {});
      resultados.push({ type: "tool_result", tool_use_id: u.id, content: JSON.stringify(r), is_error: !r.ok });
    }
    msgs.push({ role: "user", content: resultados });
  }
  throw new Error("A IA não concluiu a resposta a tempo.");
}

type MsgOpenAI = {
  role: string;
  content: string | null;
  tool_calls?: { id: string; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

async function conversarOpenAI(
  modelo: string,
  { sistema, mensagens, ferramentas, executar }: Omit<Params, "env" | "fetchImpl" | "maxPassos">,
  env: Env,
  fetchImpl: FetchLike,
  maxPassos: number,
) {
  const msgs: MsgOpenAI[] = [{ role: "system", content: sistema }, ...mensagens];
  const tools = ferramentas.map((f) => ({
    type: "function",
    function: { name: f.name, description: f.description, parameters: f.input_schema },
  }));
  for (let passo = 0; passo < maxPassos; passo++) {
    const res = await fetchImpl("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${env["OPENAI_API_KEY"]}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: modelo, messages: msgs, tools }),
    });
    const data = (await res.json()) as { choices: { message: MsgOpenAI }[] };
    if (!res.ok) throw new Error(`Erro da IA (${res.status}): ${JSON.stringify(data).slice(0, 300)}`);
    const msg = data.choices[0]!.message;
    const chamadas = msg.tool_calls || [];
    if (!chamadas.length) return (msg.content || "").trim();
    msgs.push(msg);
    for (const c of chamadas) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(c.function.arguments || "{}");
      } catch {
        /* argumentos inválidos */
      }
      const r = await rodarFerramenta(executar, c.function.name, args);
      msgs.push({ role: "tool", tool_call_id: c.id, content: JSON.stringify(r) });
    }
  }
  throw new Error("A IA não concluiu a resposta a tempo.");
}
