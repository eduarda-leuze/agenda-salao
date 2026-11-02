import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function exigirAdmin(context: { supabase: { rpc: (fn: "is_admin") => PromiseLike<{ data: unknown }> } }) {
  const { data } = await context.supabase.rpc("is_admin");
  if (!data) throw new Error("Apenas a administradora pode usar esta área.");
}

/** Mostra o que já está configurado na Vercel (sem revelar nenhuma chave). */
export const statusIntegracao = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await exigirAdmin(context);
    const e = process.env;
    return {
      banco: !!e["BOT_TOKEN"],
      ia: e["ANTHROPIC_API_KEY"] ? "Claude" : e["OPENAI_API_KEY"] ? "OpenAI" : null,
      birdChave: !!e["BIRD_API_KEY"],
      birdNumero: e["BIRD_WHATSAPP_FROM"] ? e["BIRD_WHATSAPP_FROM"].replace(/\d(?=\d{4})/g, "•") : null,
      birdSegredo: !!e["BIRD_WEBHOOK_SECRET"],
    };
  });

/** Área de teste: conversa com o robô sem enviar nada pelo WhatsApp e sem gravar agendamentos. */
export const simularRobo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      telefone: z.string().max(30).optional(),
      historico: z
        .array(z.object({ papel: z.enum(["cliente", "robo"]), texto: z.string().max(4000) }))
        .max(40),
    }),
  )
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const { createDb } = await import("./bot/db");
    const { criarExecutor, historicoParaMensagens, responder } = await import("./bot/atendente");
    const db = createDb();
    const telefone = data.telefone?.trim() || "+5500000000000";
    const ctx = await db.contexto(telefone);
    const acoes: { nome: string; args: Record<string, unknown> }[] = [];
    const executar = criarExecutor({ db, telefone, ctx, simulacao: true, acoes });
    const resposta = await responder({ ctx, mensagens: historicoParaMensagens(data.historico), executar });
    return { resposta, acoes: acoes.map((a) => a.nome) };
  });
