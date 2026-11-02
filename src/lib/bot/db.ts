// Acesso do robô ao banco pelas funções seguras "bot_*". Toda chamada leva o BOT_TOKEN.
export type Env = Record<string, string | undefined>;
export type FetchLike = typeof fetch;

export type Contexto = {
  nome: string;
  antecedenciaHoras: number;
  diasMax: number;
  robo_ativo: boolean;
  info_salao: string;
  servicos: { id: string; nome: string; preco: number; duracao_min: number }[];
  profissionais: { id: string; nome: string }[];
  vinculos: { servico_id: string; profissional_id: string }[];
  horario_funcionamento?: { dia_semana: number; aberto: boolean; inicio: string; fim: string }[];
  cliente: { nome: string } | null;
  conversa?: { pausado: boolean; precisa_atencao?: boolean };
  historico: { papel: "cliente" | "robo" | "salao"; texto: string }[];
};

export type Horario = { profissional_id: string; profissional: string; inicio: string; hora: string };

export function createDb(env: Env = process.env, fetchImpl: FetchLike = fetch) {
  const url = (env["SALAO_DB_URL"] || env["SUPABASE_URL"] || env["VITE_SUPABASE_URL"])?.replace(/\/$/, "");
  const key = env["SALAO_DB_KEY"] || env["SUPABASE_PUBLISHABLE_KEY"] || env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  const token = env["BOT_TOKEN"];
  if (!url || !key || !token) throw new Error("Faltam as variáveis do banco ou o BOT_TOKEN.");

  async function rpc<T = unknown>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
    const res = await fetchImpl(`${url}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { apikey: key!, "Content-Type": "application/json" },
      body: JSON.stringify({ p_token: token, ...args }),
    });
    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    if (!res.ok) {
      const m = data && typeof data === "object" && "message" in data ? (data as { message: unknown }).message : null;
      throw new Error(m ? String(m) : String(text).slice(0, 300));
    }
    return data as T;
  }

  return {
    contexto: (telefone: string) => rpc<Contexto>("bot_contexto", { p_telefone: telefone }),
    horarios: (data: string, servicoId: string, profissionalId?: string) =>
      rpc<Horario[]>("bot_horarios", {
        p_data: data,
        p_servico_id: servicoId,
        p_profissional_id: profissionalId || null,
      }),
    criar: (telefone: string, nome: string | undefined, servicoId: string, profissionalId: string, inicio: string) =>
      rpc("bot_criar", {
        p_telefone: telefone,
        p_nome: nome || "Cliente",
        p_servico_id: servicoId,
        p_profissional_id: profissionalId,
        p_inicio: inicio,
      }),
    meusAgendamentos: (telefone: string) => rpc("bot_meus_agendamentos", { p_telefone: telefone }),
    cancelar: (telefone: string, id: string) =>
      rpc("bot_cancelar", { p_telefone: telefone, p_agendamento_id: id }),
    registrar: (
      telefone: string,
      nome: string | null | undefined,
      papel: "cliente" | "robo" | "salao",
      texto: string,
      webhookId?: string | null,
      whatsappId?: string | null,
    ) =>
      rpc<boolean>("bot_registrar", {
        p_telefone: telefone,
        p_nome: nome || null,
        p_papel: papel,
        p_texto: texto || "",
        p_webhook_id: webhookId || null,
        p_whatsapp_id: whatsappId || null,
      }),
    pausar: (telefone: string, horas: number, atencao: boolean) =>
      rpc("bot_pausar", { p_telefone: telefone, p_horas: horas, p_atencao: atencao }),
  };
}
export type Db = ReturnType<typeof createDb>;
